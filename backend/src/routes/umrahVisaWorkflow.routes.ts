
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from './umrahVisa/shared';
import { syncBookingStatus, syncBookingStatusInTx } from '../services/statusSyncService';
import { generateVoucherNumber, formatTime, formatDate, generateRouteNumbersForVoucher } from '../services/voucherService';
import { generateVoucherPDF } from '../services/pdfService';
import { VoucherPdfData } from '../types/voucher';
import { isS3Configured, S3_CONFIG, generateDownloadUrl, s3Client, extractS3KeyFromUrl } from '../config/s3';
import { combineDateTime } from '../utils/datetime';
import fs from 'fs';
import * as archiverModule from 'archiver';
import path from 'path';

// Handle both default and namespace imports for archiver
const archiver = (archiverModule.default || archiverModule) as unknown as typeof archiverModule.default;
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = Router();

// GET /api/umrah-visa/:bookingId/download-all-documents - Download all documents as ZIP
router.get('/:bookingId/download-all-documents', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Get all documents for this booking
    // Documents can be linked directly to booking or via passengers
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { bookingId: bookingId },
          { passenger: { bookingId: bookingId } }
        ],
        isDeleted: false,
      },
      include: {
        passenger: true
      }
    });

    if (documents.length === 0) {
      return res.status(404).json({ error: 'No documents found for this booking' });
    }

    // Initialize archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.attachment(`booking-documents-${bookingId}-${timestamp}.zip`);

    // Pipe archive data to response
    archive.pipe(res);

    // Handle errors
    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to create ZIP archive' });
      }
    });

    // Add each document to the archive
    for (const doc of documents) {
      const fileName = doc.passenger 
        ? `${doc.passenger.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.fileName}`
        : doc.fileName;

      if (isS3Configured() && s3Client) {
        try {
          const s3Key = extractS3KeyFromUrl(doc.filePath) || doc.filePath;
          const command = new GetObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: s3Key,
          });
          const response = await s3Client.send(command);
          if (response.Body) {
            archive.append(response.Body as Readable, { name: fileName });
          }
        } catch (s3Error) {
          console.error(`Error fetching file from S3: ${doc.filePath}`, s3Error);
        }
      } else {
        // Local file storage
        if (fs.existsSync(doc.filePath)) {
          archive.file(doc.filePath, { name: fileName });
        } else {
          console.error(`Local file not found: ${doc.filePath}`);
        }
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    console.error('Error in bulk document download:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download documents' });
    }
  }
});

// POST /api/umrah-visa/:bookingId/add-group-data - Add group data (Admin/Staff only)
router.post('/:bookingId/add-group-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can add group data
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can add group data' });
    }

    const { groupNumber, groupName, umrahVisaProviderId } = req.body;

    if (!groupNumber || !groupName) {
      return res.status(400).json({ error: 'Group number and group name are required' });
    }

    // Log for debugging (can be removed later)
    console.log('Add group data - received umrahVisaProviderId:', umrahVisaProviderId);

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'documents_downloaded') {
      return res.status(400).json({ error: 'Group data can only be added when status is documents_downloaded' });
    }

    // Always set status to group_assigned after adding group data
    // For hotel bookings, admin will use "Done" button to transition to voucher
    // For iqama bookings, admin will upload confirmation to transition to voucher/bill
    const nextStatus = 'group_assigned';
    
    if (!booking.accommodationType) {
      return res.status(400).json({ error: 'Accommodation type not set for this booking' });
    }

    // Update booking - use sync function to ensure status consistency
    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        groupNumber,
        groupName,
        hasGroupNumber: true,
        lastUpdatedBy: user.id,
      };

      // Only update umrahVisaProviderId if it's provided (not undefined)
      if (umrahVisaProviderId !== undefined) {
        updateData.umrahVisaProviderId = umrahVisaProviderId || null;
      }

      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: updateData,
      });

      // Sync status separately (handles booking status + history)
      await syncBookingStatusInTx(bookingId, nextStatus, user.id, 'Group data added', tx);
    });
    
    // Re-fetch updated booking
    const finalBooking = await prisma.umrahVisaBooking.findUnique({ where: { id: bookingId } });

    res.json({
      message: 'Group data added successfully',
      data: {
        booking: finalBooking,
      },
    });
  } catch (error) {
    console.error('Error adding group data:', error);
    res.status(500).json({ error: 'Failed to add group data' });
  }
});

// GET /api/umrah-visa/:bookingId/download-zip - Download zip file for booking
router.get('/:bookingId/download-zip', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can download zip files
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can download zip files' });
    }

    // Find document with pan_card_zip type for this booking
    const zipDocument = await prisma.document.findFirst({
      where: {
        bookingId,
        documentType: 'pan_card_zip',
        isDeleted: false,
      },
    });

    if (!zipDocument) {
      return res.status(404).json({ error: 'Zip file not found for this booking' });
    }

    // Handle file download based on storage type
    if (isS3Configured()) {
      // Generate presigned URL for S3 file
      try {
        const downloadUrl = await generateDownloadUrl(zipDocument.filePath);
        res.json({
          downloadUrl,
          fileName: zipDocument.fileName,
          fileSize: zipDocument.fileSize,
          mimeType: zipDocument.mimeType,
        });
      } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
      }
    } else {
      // Serve local file
      if (fs.existsSync(zipDocument.filePath)) {
        res.download(zipDocument.filePath, zipDocument.fileName);
      } else {
        res.status(404).json({ error: 'File not found on server' });
      }
    }
  } catch (error) {
    console.error('Error downloading zip file:', error);
    res.status(500).json({ error: 'Failed to download zip file' });
  }
});

// POST /api/umrah-visa/:bookingId/download-documents - Download documents and track
router.post('/:bookingId/download-documents', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can download documents
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can download documents' });
    }

    // Get booking with all passenger documents
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        passengers: {
          include: {
            documents: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Documents can only be downloaded when status is pending',
        currentStatus: booking.status 
      });
    }

    // Check if documents have already been downloaded
    if (booking.documentsDownloadCount > 0) {
      return res.status(400).json({ 
        error: 'Documents have already been downloaded. Please request admin permission for re-download.',
        downloadCount: booking.documentsDownloadCount,
        lastDownloadedBy: booking.documentsDownloadedBy,
      });
    }

    // Collect all documents
    const allDocuments = booking.passengers.flatMap(p => p.documents);

    // For testing: Skip document check
    // if (allDocuments.length === 0) {
    //   return res.status(400).json({ error: 'No documents found for this booking' });
    // }

    // Update booking - mark as downloaded
    await prisma.$transaction(async (tx) => {
      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          documentsDownloadCount: { increment: 1 },
          documentsDownloadedBy: user.id,
          lastUpdatedBy: user.id,
        },
      });

      // Sync status separately (handles booking status + history)
      await syncBookingStatusInTx(bookingId, 'documents_downloaded', user.id, 'Documents downloaded', tx);
    });
    
    // Re-fetch updated booking
    const finalBooking = await prisma.umrahVisaBooking.findUnique({ where: { id: bookingId } });

    res.json({
      message: 'Documents download tracked successfully',
      data: {
        documents: allDocuments,
        booking: finalBooking,
      },
    });
  } catch (error) {
    console.error('Error tracking document download:', error);
    res.status(500).json({ error: 'Failed to track document download' });
  }
});

// POST /api/umrah-visa/:bookingId/upload-confirmation - Upload confirmation image
router.post('/:bookingId/upload-confirmation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can upload confirmation
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can upload confirmation' });
    }

    const { confirmationImagePath } = req.body;

    if (!confirmationImagePath) {
      return res.status(400).json({ error: 'Confirmation image path is required' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        sponsorIqamaDetails: true,
        umrahVisaProvider: {
          select: {
            email: true,
            whatsappNumber: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.accommodationType !== 'iqama') {
      return res.status(400).json({ 
        error: 'Confirmation can only be uploaded for iqama accommodation bookings'
      });
    }

    if (!booking.sponsorIqamaDetails) {
      return res.status(404).json({ error: 'Iqama details not found for this booking' });
    }

    if (booking.status !== 'group_assigned') {
      return res.status(400).json({ 
        error: 'Confirmation can only be uploaded when status is group_assigned',
        currentStatus: booking.status 
      });
    }

    // Determine next status based on hasTransportation
    let nextStatus: 'voucher' | 'bill';
    if (booking.hasTransportation) {
      nextStatus = 'voucher';
    } else {
      nextStatus = 'bill';
    }

    // Update iqama details with confirmation image
    await prisma.$transaction(async (tx) => {
      await tx.umrahSponserIqamaDetails.update({
        where: {
          bookingId_isAlternate: {
            bookingId,
            isAlternate: false,
          },
        },
        data: {
          confirmationImagePath,
          confirmationUploadedAt: new Date(),
        },
      });

      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          lastUpdatedBy: user.id,
        },
      });

      // Sync status separately (handles booking status + history)
      await syncBookingStatusInTx(bookingId, nextStatus, user.id, 'Confirmation image uploaded', tx);
    });
    
    // Re-fetch updated booking with iqama details
    const finalBooking = await prisma.umrahVisaBooking.findUnique({ 
      where: { id: bookingId },
      include: {
        sponsorIqamaDetails: true,
        umrahVisaProvider: {
          select: {
            email: true,
            whatsappNumber: true,
          },
        },
      },
    });

    // Send notification (email + WhatsApp) to iqama holder
    const mainIqama = finalBooking?.sponsorIqamaDetails?.find((i: any) => !i.isAlternate);
    if (mainIqama) {
      try {
        const { sendIqamaConfirmationEmail } = await import('../services/emailService');
        const iqamaHolderName = mainIqama.iqamaSponserName || 'Valued Customer';
        const iqamaHolderPhone = mainIqama.sponserMobileNumber || undefined;
        const confirmationImagePath = mainIqama.confirmationImagePath || undefined;
        
        // Use umrahVisaProvider email if available, otherwise skip email
        const recipientEmail = finalBooking?.umrahVisaProvider?.email || undefined;
        
        if (recipientEmail || iqamaHolderPhone) {
          await sendIqamaConfirmationEmail(
            recipientEmail,
            iqamaHolderName,
            confirmationImagePath,
            iqamaHolderPhone
          );
          console.log('✅ Iqama confirmation notification sent successfully');
        } else {
          console.log('⚠️ No email or phone number available for iqama confirmation notification');
        }
      } catch (error: any) {
        console.error('❌ Failed to send iqama confirmation notification:', error?.message || 'Unknown error');
        console.error('Error details:', error);
        // Don't fail the request if notification fails
      }
    }

    res.json({
      message: 'Confirmation uploaded successfully',
      data: {
        booking: finalBooking,
      },
    });
  } catch (error) {
    console.error('Error uploading confirmation:', error);
    res.status(500).json({ error: 'Failed to upload confirmation' });
  }
});

// GET /api/umrah-visa/:bookingId/download-confirmation - Download confirmation image
router.get('/:bookingId/download-confirmation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can download confirmation images
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can download confirmation images' });
    }

    // Get booking with iqama details
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        sponsorIqamaDetails: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.accommodationType !== 'iqama') {
      return res.status(400).json({ 
        error: 'Confirmation image is only available for iqama accommodation bookings'
      });
    }

    const mainIqama = booking.sponsorIqamaDetails?.find((i: any) => !i.isAlternate);
    if (!mainIqama) {
      return res.status(404).json({ error: 'Iqama details not found for this booking' });
    }

    const confirmationImagePath = mainIqama.confirmationImagePath;
    if (!confirmationImagePath) {
      return res.status(404).json({ error: 'Confirmation image not found for this booking' });
    }

    // Try to find the document with confirmation_image type
    const confirmationDoc = await prisma.document.findFirst({
      where: {
        bookingId,
        documentType: 'confirmation_image',
        isDeleted: false,
      },
    });

    // Use document filePath if found, otherwise use the path from iqama details
    const filePath = confirmationDoc?.filePath || confirmationImagePath;
    const fileName = confirmationDoc?.fileName || 'confirmation-image.jpg';

    // Handle file download based on storage type
    if (isS3Configured()) {
      // Generate presigned URL for S3 file
      try {
        const downloadUrl = await generateDownloadUrl(filePath);
        res.json({
          downloadUrl,
          fileName,
          fileSize: confirmationDoc?.fileSize || null,
          mimeType: confirmationDoc?.mimeType || 'image/jpeg',
        });
      } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
      }
    } else {
      // Serve local file
      if (fs.existsSync(filePath)) {
        res.download(filePath, fileName);
      } else {
        res.status(404).json({ error: 'File not found on server' });
      }
    }
  } catch (error) {
    console.error('Error downloading confirmation image:', error);
    res.status(500).json({ error: 'Failed to download confirmation image' });
  }
});

// POST /api/umrah-visa/:bookingId/mark-ready-for-voucher - Mark hotel booking as ready for voucher (Admin/Staff only)
router.post('/:bookingId/mark-ready-for-voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can mark as ready
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can mark booking as ready for voucher' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.accommodationType !== 'hotel') {
      return res.status(400).json({ 
        error: 'This action is only available for hotel accommodation bookings'
      });
    }

    if (booking.status !== 'group_assigned') {
      return res.status(400).json({ 
        error: 'Booking can only be marked as ready when status is group_assigned',
        currentStatus: booking.status 
      });
    }

    // Determine next status based on hasTransportation
    // If hasTransportation = true → voucher (needs transport voucher)
    // If hasTransportation = false → bill (no transport, skip voucher)
    let nextStatus: 'voucher' | 'bill';
    if (booking.hasTransportation) {
      nextStatus = 'voucher';
    } else {
      nextStatus = 'bill';
    }

    // Update status
    await prisma.$transaction(async (tx) => {
      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          lastUpdatedBy: user.id,
        },
      });

      // Sync status separately (handles booking status + history)
      const statusMessage = nextStatus === 'voucher' 
        ? 'Marked as ready for voucher generation'
        : 'Marked as ready for bill generation (no transportation)';
      await syncBookingStatusInTx(bookingId, nextStatus, user.id, statusMessage, tx);
    });
    
    // Re-fetch updated booking
    const finalBooking = await prisma.umrahVisaBooking.findUnique({ where: { id: bookingId } });

    res.json({
      message: nextStatus === 'voucher' 
        ? 'Booking marked as ready for voucher generation'
        : 'Booking marked as ready for bill generation (no transportation required)',
      data: {
        booking: finalBooking,
      },
    });
  } catch (error) {
    console.error('Error marking booking as ready for voucher:', error);
    res.status(500).json({ error: 'Failed to mark booking as ready for voucher' });
  }
});

// GET /api/umrah-visa/:bookingId/voucher-data - Get all data needed for voucher preview
router.get('/:bookingId/voucher-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can access voucher data
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can access voucher data' });
    }

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: {
          select: {
            partyName: true,
            contactNumber: true,
            whatsappNumber: true,
          },
        },
        umrahVisaProvider: {
          select: {
            id: true,
            partyName: true,
            address: true,
            contactNumber: true,
            whatsappNumber: true,
            email: true,
          },
        },
        travelDetails: {
          include: {
            arrivalAirport: true,
            departureAirport: true,
          },
        },
        hotelBookings: {
          include: {
            hotel: true,
            city: true,
          },
          orderBy: {
            checkInDate: 'asc',
          },
        },
        sponsorIqamaDetails: true,
        transportBookings: {
          include: {
            transportMaster: {
              include: {
                route: {
                  include: {
                    city1: true,
                    city2: true,
                    city3: true,
                    city4: true,
                  },
                },
                vehicleType: true,
              },
            },
          },
          orderBy: {
            travelDateTime: 'asc',
          },
        },
        passengers: {
          where: {
            isDeleted: false,
          },
        },
        movementDetails: {
          include: {
            fromCity: true,
            fromLocation: true,
            toCity: true,
            toLocation: true,
          },
          orderBy: {
            travelDateTime: 'asc',
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }


    // Handle multiple groups - combine group numbers and sum passengers
    let groupCode = booking.groupNumber || '';
    let paxCount = booking.passengerCount;
    
    if (booking.hasMultipleGroup && booking.multipleGroupDetails) {
      interface GroupDetail {
        groupNumber?: string;
        groupName?: string;
        passengerCount?: number;
        documentId?: string | null;
      }

      let multipleGroupDetails: GroupDetail[] = [];
      try {
        if (Array.isArray(booking.multipleGroupDetails)) {
          multipleGroupDetails = booking.multipleGroupDetails as unknown as GroupDetail[];
        }
      } catch (e) {
        console.error('Error parsing multipleGroupDetails:', e);
      }
      
      if (multipleGroupDetails.length > 0) {
        // Combine all group numbers
        groupCode = multipleGroupDetails
          .map((g) => g.groupNumber)
          .filter((gn): gn is string => !!gn)
          .join(', ');
        
        // Sum all passenger counts
        paxCount = multipleGroupDetails.reduce(
          (sum: number, g) => sum + (g.passengerCount || 0),
          0
        );
      }
    }

    // Format data for voucher preview
    // Note: Reservation number and route numbers are NOT included in preview
    // They will be generated only when the voucher is actually created
    const voucherData = {
      bookingId: booking.id,
      reservationDate: booking.createdAt,
      guestName: booking.party.partyName,
      guestMobile: booking.party.contactNumber || booking.party.whatsappNumber || '',
      groupCode: groupCode,
      groupName: booking.groupName || '',
      paxCount: paxCount,
      // Umrah Visa Provider details (for header section)
      umrahVisaProvider: booking.umrahVisaProvider ? {
        partyName: booking.umrahVisaProvider.partyName,
        address: booking.umrahVisaProvider.address || '',
        contactNumber: booking.umrahVisaProvider.contactNumber || '',
        whatsappNumber: booking.umrahVisaProvider.whatsappNumber || '',
        email: booking.umrahVisaProvider.email || '',
      } : null,
      hotelSchedules: booking.hotelBookings?.map((hb: any, idx: number) => ({
        number: idx + 1,
        location: hb.city.name,
        cityId: hb.cityId, // Include city ID
        hotelName: hb.hotel.name,
        hotelId: hb.hotelId, // Include hotel ID (LocationMaster ID)
        checkIn: hb.checkInDate,
        checkOut: hb.checkOutDate,
        days: Math.ceil((new Date(hb.checkOutDate).getTime() - new Date(hb.checkInDate).getTime()) / (1000 * 60 * 60 * 24)),
        brn: hb.brn && Array.isArray(hb.brn) ? hb.brn : null, // Include BRN if available
      })) || [],
      movementDetails: (booking.movementDetails || []).map((md: any, idx: number) => ({
        sr: idx + 1,
        route: '', // Empty - will be generated when voucher is created
        date: formatDate(md.travelDateTime), // DD-MM-YYYY format
        time: formatTime(md.travelDateTime), // HH:MM format
        from: md.fromCity?.name || '',
          fromCityId: md.fromCityId, // Include city ID
        fromLocation: md.fromLocation?.name || '',
        fromLocationId: md.fromLocationId,
        fromSpecificLocationId: '', // Not used in new schema
        to: md.toCity?.name || '',
          toCityId: md.toCityId, // Include city ID
        toLocation: md.toLocation?.name || '',
        toLocationId: md.toLocationId,
        toSpecificLocationId: '', // Not used in new schema
        vehicleType: '', // Not stored in movement details (only in transport bookings)
        paxCount: 0, // Not stored in movement details (only in transport bookings)
        price: 0, // Not stored in movement details (only in transport bookings)
      })),
      flightDetails: (() => {
        const mainTravel = booking.travelDetails?.find((t: any) => !t.isAlternate);
        if (!mainTravel) return [];
        return [
          {
            type: 'AA', // Arrival
            date: mainTravel.arrivalDateTime ? formatDate(mainTravel.arrivalDateTime) : '',
            carrier: mainTravel.arrivalFlightNumber?.split('-')[0] || '',
            number: mainTravel.arrivalFlightNumber?.split('-')[1] || '',
            arrivalAirportId: mainTravel.arrivalAirportId,
            arrivalAirport: mainTravel.arrivalAirport.name || mainTravel.arrivalAirport.code || '',
            etd: '',
            eta: mainTravel.arrivalDateTime ? formatTime(mainTravel.arrivalDateTime) : '',
          },
          {
            type: 'AD', // Departure
            date: mainTravel.departureDateTime ? formatDate(mainTravel.departureDateTime) : '',
            carrier: mainTravel.departureFlightNumber?.split('-')[0] || '',
            number: mainTravel.departureFlightNumber?.split('-')[1] || '',
            departureAirportId: mainTravel.departureAirportId,
            departureAirport: mainTravel.departureAirport.name || mainTravel.departureAirport.code || '',
            etd: mainTravel.departureDateTime ? formatTime(mainTravel.departureDateTime) : '',
            eta: '',
          },
        ];
      })(),
      // Aggregate transport bookings by transportMasterId to get quantity
      transportOptions: (() => {
        const transportMap = new Map<string, any>();
        
        (booking.transportBookings || []).forEach((tb: any) => {
          const transportMasterId = tb.transportMasterId;
          
          if (!transportMap.has(transportMasterId)) {
            // First occurrence - create entry
            transportMap.set(transportMasterId, {
              transportId: transportMasterId,
              routeId: tb.transportMaster?.routeId || '',
              route: tb.transportMaster?.route ? {
                id: tb.transportMaster.route.id,
                city1: tb.transportMaster.route.city1 ? { id: tb.transportMaster.route.city1.id, name: tb.transportMaster.route.city1.name } : null,
                city2: tb.transportMaster.route.city2 ? { id: tb.transportMaster.route.city2.id, name: tb.transportMaster.route.city2.name } : null,
                city3: tb.transportMaster.route.city3 ? { id: tb.transportMaster.route.city3.id, name: tb.transportMaster.route.city3.name } : null,
                city4: tb.transportMaster.route.city4 ? { id: tb.transportMaster.route.city4.id, name: tb.transportMaster.route.city4.name } : null,
                routeType: tb.transportMaster.route.routeType,
              } : null,
              vehicleType: tb.transportMaster?.vehicleType ? {
                id: tb.transportMaster.vehicleType.id,
                vehicleName: tb.transportMaster.vehicleType.vehicleName,
                paxCount: tb.transportMaster.vehicleType.paxCount,
              } : null,
              price: tb.transportMaster?.price || 0,
              quantity: 1, // Start with 1
            });
          } else {
            // Increment quantity for existing transport
            const existing = transportMap.get(transportMasterId);
            existing.quantity += 1;
          }
        });
        
        return Array.from(transportMap.values());
      })(),
    };

    res.json(voucherData);
  } catch (error) {
    console.error('Error fetching voucher data:', error);
    res.status(500).json({ error: 'Failed to fetch voucher data' });
  }
});

// POST /api/umrah-visa/:bookingId/generate-voucher - Generate transport voucher
router.post('/:bookingId/generate-voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;
    const voucherData = req.body; // Voucher data from preview form

    // Only admin/staff can generate voucher
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can generate voucher' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        umrahVisaProvider: {
          select: {
            id: true,
          },
        },
        party: {
          select: {
            partyName: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check status - must be voucher
    if (booking.status !== 'voucher') {
      return res.status(400).json({ 
        error: 'Voucher can only be generated when status is voucher',
        currentStatus: booking.status,
      });
    }

    // Fetch full booking details
    const fullBooking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!fullBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Handle multiple groups - combine group numbers as comma-separated string
    let groupCode = voucherData.groupCode || booking!.groupNumber || '';
    let groupName = voucherData.groupName || booking!.groupName || '';
    let paxCount = voucherData.paxCount || booking!.passengerCount;
    
      if (fullBooking.hasMultipleGroup && fullBooking.multipleGroupDetails) {
        try {
          if (Array.isArray(fullBooking.multipleGroupDetails)) {
          const multipleGroupDetails = fullBooking.multipleGroupDetails as any[];
          if (multipleGroupDetails.length > 0) {
            // Combine all group numbers
            const groupNumbers = multipleGroupDetails
              .map((g: any) => g.groupNumber)
              .filter((num: string) => num)
              .join(', ');
            if (groupNumbers) {
              groupCode = groupNumbers;
            }
            // Combine all group names
            const groupNames = multipleGroupDetails
              .map((g: any) => g.groupName)
              .filter((name: string) => name)
              .join(', ');
            if (groupNames) {
              groupName = groupNames;
            }
            // Sum all passenger counts
            const totalPassengers = multipleGroupDetails.reduce(
              (sum: number, g: any) => sum + (g.passengerCount || 0),
              0
            );
            if (totalPassengers > 0) {
              paxCount = totalPassengers;
            }
          }
          }
        } catch (e) {
          console.error('Error parsing multipleGroupDetails:', e);
        }
    }

    // Check if voucher already exists for this booking (when hasMultipleGroup is true)
    // Find existing voucher by matching guestName, umrahVisaProviderId, and voucherGeneratedAt
    let existingVoucher = null;
    if (fullBooking.hasMultipleGroup && fullBooking.voucherGeneratedAt) {
      const guestName = voucherData.guestName || booking!.party?.partyName || '';
      existingVoucher = await prisma.voucher.findFirst({
        where: {
          guestName: guestName,
          umrahVisaProviderId: booking!.umrahVisaProviderId || null,
          generatedAt: {
            gte: new Date(fullBooking.voucherGeneratedAt.getTime() - 60000), // Within 1 minute
            lte: new Date(fullBooking.voucherGeneratedAt.getTime() + 60000),
          },
        },
        orderBy: {
          generatedAt: 'desc',
        },
      });
    }

    // Generate voucher number only if creating new voucher
    const voucherNumber = existingVoucher 
      ? existingVoucher.voucherNumber 
      : await generateVoucherNumber();

    // Create or update voucher (standalone, no booking connection)
    const voucher = await prisma.$transaction(async (tx) => {
      let voucherRecord;
      
      if (existingVoucher) {
        // Update existing voucher with new group data
        const updateData: any = {
          groupCode,
          groupName: groupName || null,
          paxCount,
          // Increment version to track updates
          version: existingVoucher.version + 1,
        };
        voucherRecord = await tx.voucher.update({
          where: { id: existingVoucher.id },
          data: updateData,
        });
      } else {
        // Create new voucher
        const voucherDataToCreate: any = {
          voucherNumber, // Voucher number is used as reservation number
          reservationDate: new Date(voucherData.reservationDate || booking!.createdAt),
          guestName: voucherData.guestName || booking!.party?.partyName || '',
          guestMobile: voucherData.guestMobile || '',
          groupCode,
          groupName: groupName || null,
          umrahVisaProviderId: booking!.umrahVisaProviderId || null,
          paxCount,
          generatedBy: user.id,
        };
        
        voucherRecord = await tx.voucher.create({
          data: voucherDataToCreate,
        });
      }

      // Only create movements, hotels, flights if this is a new voucher
      // For existing vouchers, we only update groupCode, groupName, and paxCount
      if (!existingVoucher) {
        // Create movements, hotels, flights
        // Generate route numbers when creating voucher (not in preview)
        const movementCount = voucherData.movementDetails && Array.isArray(voucherData.movementDetails) 
          ? voucherData.movementDetails.length 
          : 0;
        const routeNumbers = movementCount > 0 
          ? await generateRouteNumbersForVoucher(movementCount)
          : [];

        // Create VoucherMovement records
        if (voucherData.movementDetails && Array.isArray(voucherData.movementDetails)) {
              await Promise.all(
            voucherData.movementDetails.map((movement: any, index: number) =>
              tx.voucherMovement.create({
                    data: {
                  voucherId: voucherRecord.id,
                  sr: movement.sr || index + 1,
                  route: routeNumbers[index] || null, // Use generated route number
                  date: new Date(movement.date),
                  time: movement.time || '',
                  from: movement.from || '',
                  fromLocation: movement.fromLocation || '',
                  fromLocationId: movement.fromLocationId || null,
                  to: movement.to || '',
                  toLocation: movement.toLocation || '',
                  toLocationId: movement.toLocationId || null,
                  driverDetails1: movement.driverDetails1 || null,
                  driverDetails2: movement.driverDetails2 || null,
                  vehicleNumber: movement.vehicleNumber || null,
                  paxCount: movement.paxCount || null,
                  price: movement.price ? parseFloat(movement.price) : null,
                  vehicleType: movement.vehicleType || null,
                    },
                  })
                )
              );
            }

        // Create VoucherHotel records
        if (voucherData.hotelSchedules && Array.isArray(voucherData.hotelSchedules)) {
          await Promise.all(
            voucherData.hotelSchedules.map((hotel: any) => {
              // Handle BRN: convert array to comma-separated string if needed
              let brnValue: string | null = null;
              if (hotel.brn) {
                if (Array.isArray(hotel.brn)) {
                  // If BRN is an array, join with comma or take first element
                  brnValue = hotel.brn.length > 0 ? hotel.brn.join(', ') : null;
                } else if (typeof hotel.brn === 'string') {
                  brnValue = hotel.brn;
                }
              }
              
              return tx.voucherHotel.create({
                    data: {
                  voucherId: voucherRecord.id,
                  number: hotel.number || 0,
                  location: hotel.location || '',
                  hotelName: hotel.hotelName || '',
                  checkIn: new Date(hotel.checkIn),
                  checkOut: new Date(hotel.checkOut),
                  days: hotel.days || 0,
                  brn: brnValue,
                    },
              });
            })
              );
            }

        // Create VoucherFlight records
        if (voucherData.flightDetails && Array.isArray(voucherData.flightDetails)) {
              await Promise.all(
            voucherData.flightDetails.map((flight: any) => {
              // For arrival (AA), airport is in arrivalAirport (or from as fallback)
              // For departure (AD), airport is in departureAirport (or to as fallback)
              const airport = flight.type === 'AA' 
                ? (flight.arrivalAirport || flight.from || '')
                : (flight.departureAirport || flight.to || '');
              
              return tx.voucherFlight.create({
                    data: {
                  voucherId: voucherRecord.id,
                  type: String(flight.type || 'AA').substring(0, 2),
                  carrier: String(flight.carrier || '').substring(0, 10),
                  number: String(flight.number || '').substring(0, 20),
                  date: new Date(flight.date),
                  // Store airport in 'from' for AA, in 'to' for AD (for PDF display)
                  from: flight.type === 'AA' ? String(airport).substring(0, 10) : 'JED',
                  to: flight.type === 'AD' ? String(airport).substring(0, 10) : 'JED',
                  etd: flight.etd ? String(flight.etd).substring(0, 10) : null,
                  eta: flight.eta ? String(flight.eta).substring(0, 10) : null,
                    },
              });
            })
              );
        }
            }

      // Update booking with voucher metadata
      if (!existingVoucher) {
        await tx.umrahVisaBooking.update({
          where: { id: bookingId },
                  data: {
            voucherGeneratedAt: new Date(),
            voucherGeneratedBy: user.id,
          },
        });
      } else {
        // For existing voucher, just update the timestamp
        await tx.umrahVisaBooking.update({
          where: { id: bookingId },
                  data: {
            voucherGeneratedAt: new Date(), // Update timestamp to reflect latest update
                  },
                });
              }

      // Sync status using helper (updates booking status + history)
      await syncBookingStatusInTx(bookingId, 'bill', user.id, existingVoucher ? 'Voucher updated with additional groups' : 'Voucher generated', tx);

      return voucherRecord.id;
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot
      timeout: 20000, // Maximum time the transaction can run (increased for safety)
    });

    // ========== DEBUG LOGGING: BOOKING DATA ==========
    const bookingWithMovements = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        movementDetails: {
          include: {
            fromCity: true,
            toCity: true,
          },
          orderBy: {
            travelDateTime: 'asc',
          },
        },
              },
            });

    console.log('========== VOUCHER GENERATION DEBUG ==========');
    console.log('📋 FROM BOOKING (UmrahVisaBooking):');
    console.log('  - Booking ID:', bookingId);
    console.log('  - Reservation Number: N/A (not stored in booking)');
    console.log('  - Route Numbers: N/A (route numbers removed from UmrahMovementDetail)');
    console.log('  - Movement Details Count:', bookingWithMovements?.movementDetails?.length || 0);
    if (bookingWithMovements?.movementDetails) {
      bookingWithMovements.movementDetails.forEach((md, idx) => {
        console.log(`    Movement ${idx + 1}: From ${md.fromCity?.name || 'N/A'} to ${md.toCity?.name || 'N/A'}`);
      });
    }

    // Fetch the complete voucher with all relations for PDF generation
    const fullVoucher = await prisma.voucher.findUnique({
      where: { id: voucher },
      include: {
        movements: {
          orderBy: {
            sr: 'asc',
          },
        },
        hotels: {
          orderBy: {
            number: 'asc',
          },
        },
        flights: {
          orderBy: {
            date: 'asc',
          },
        },
            },
          });

    if (!fullVoucher) {
      return res.status(500).json({ error: 'Failed to fetch created voucher' });
    }

    // ========== DEBUG LOGGING: VOUCHER DATA ==========
    console.log('📄 FROM VOUCHER TABLE:');
    console.log('  - Voucher ID:', fullVoucher.id);
    console.log('  - Voucher Number (Reservation Number):', fullVoucher.voucherNumber);
    const voucherRouteNumbers = fullVoucher.movements
      .map(m => m.route)
      .filter((r): r is string => !!r);
    console.log('  - Route Numbers:', voucherRouteNumbers.length > 0 ? voucherRouteNumbers : 'NONE');
    console.log('  - Movement Details Count:', fullVoucher.movements.length);
    fullVoucher.movements.forEach((m, idx) => {
      console.log(`    Movement ${idx + 1} (SR: ${m.sr}): Route="${m.route || 'NULL'}", From="${m.from}", To="${m.to}"`);
    });

    // Fetch umrah visa provider separately if needed
    let umrahVisaProvider = null;
    if (fullVoucher.umrahVisaProviderId) {
      const provider = await prisma.party.findUnique({
        where: { id: fullVoucher.umrahVisaProviderId },
        select: {
          partyName: true,
          address: true,
          contactNumber: true,
          whatsappNumber: true,
          email: true,
              },
            });
      umrahVisaProvider = provider;
    }

    // Transform voucher data to match PDF format
    const voucherForPdf = {
      ...fullVoucher,
      reservationNumber: fullVoucher.voucherNumber, // Use voucherNumber as reservation number
      reservationDate: fullVoucher.reservationDate.toISOString().split('T')[0],
      umrahVisaProvider,
      movementDetails: fullVoucher.movements.map((m) => ({
        sr: m.sr,
        route: m.route || '',
        date: m.date.toISOString().split('T')[0],
        time: m.time,
        from: m.from,
        fromLocation: m.fromLocation,
        to: m.to,
        toLocation: m.toLocation,
      })),
      hotelSchedules: fullVoucher.hotels.map((h) => ({
        number: h.number,
        location: h.location,
        hotelName: h.hotelName,
        checkIn: h.checkIn.toISOString().split('T')[0],
        checkOut: h.checkOut.toISOString().split('T')[0],
        days: h.days,
        brn: h.brn ? (h.brn.includes(',') ? h.brn.split(', ') : [h.brn]) : null,
      })),
      flightDetails: fullVoucher.flights.map((f) => ({
        type: f.type,
        carrier: f.carrier,
        number: f.number,
        date: f.date.toISOString().split('T')[0],
        // For arrival (AA), use 'from' as arrivalAirport; for departure (AD), use 'to' as departureAirport
        arrivalAirport: f.type === 'AA' ? (f.from || 'N/A') : undefined,
        departureAirport: f.type === 'AD' ? (f.to || 'N/A') : undefined,
        from: f.from, // Keep for backward compatibility
        to: f.to, // Keep for backward compatibility
        etd: f.etd || '',
        eta: f.eta || '',
      })),
    };

    // ========== DEBUG LOGGING: PDF DATA ==========
    console.log('📑 FROM PDF DATA (voucherForPdf):');
    console.log('  - Reservation Number (Voucher Number):', voucherForPdf.reservationNumber || 'NULL');
    const pdfRouteNumbers = voucherForPdf.movementDetails
      .map(m => m.route)
      .filter((r): r is string => !!r && r !== '');
    console.log('  - Route Numbers:', pdfRouteNumbers.length > 0 ? pdfRouteNumbers : 'NONE');
    console.log('  - Movement Details Count:', voucherForPdf.movementDetails.length);
    voucherForPdf.movementDetails.forEach((m, idx) => {
      console.log(`    Movement ${idx + 1} (SR: ${m.sr}): Route="${m.route || 'NULL'}", From="${m.from}", To="${m.to}"`);
    });
    console.log('==========================================');

    res.json({
      message: 'Voucher generated successfully',
      data: {
        voucher: voucherForPdf,
      },
    });
  } catch (error) {
    console.error('Error generating voucher:', error);
    res.status(500).json({ error: 'Failed to generate voucher' });
  }
});

// POST /api/umrah-visa/generate-pdf - Generate PDF from voucher data
router.post('/generate-pdf', authenticate, async (req, res) => {
  try {
    const voucherData: VoucherPdfData = req.body;

    // ========== DEBUG LOGGING: PDF GENERATION ==========
    console.log('========== PDF GENERATION DEBUG ==========');
    console.log('📑 PDF GENERATION - Received Data:');
    console.log('  - Voucher Number (Reservation Number):', voucherData.voucherNumber);
    console.log('  - Reservation Number:', voucherData.reservationNumber || voucherData.voucherNumber || 'NULL');
    const pdfRouteNumbers = voucherData.movementDetails
      .map(m => m.route)
      .filter((r): r is string => !!r && r !== '');
    console.log('  - Route Numbers:', pdfRouteNumbers.length > 0 ? pdfRouteNumbers : 'NONE');
    console.log('  - Movement Details Count:', voucherData.movementDetails.length);
    voucherData.movementDetails.forEach((m, idx) => {
      console.log(`    Movement ${idx + 1} (SR: ${m.sr}): Route="${m.route || 'NULL'}", From="${m.from}", To="${m.to}"`);
    });
    console.log('==========================================');

    // Validate required fields
    if (!voucherData.voucherNumber || !voucherData.reservationDate || !voucherData.guestName) {
      return res.status(400).json({ error: 'Missing required voucher data' });
    }

    // Generate PDF
    const pdfBuffer = await generateVoucherPDF(voucherData);

    // Set response headers
    const fileName = `Voucher_${voucherData.voucherNumber}_${voucherData.guestName
      .replace(/\s+/g, '_')
      .slice(0, 20)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/umrah-visa/:bookingId/available-actions - Get available actions based on status
router.get('/:bookingId/available-actions', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Get booking
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const status = booking.status;
    const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';

    let availableActions: any[] = [];

    switch (status) {
      case 'pending':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'download_documents',
            label: 'Download Documents',
            description: 'Download passenger documents',
            endpoint: `/api/umrah-visa/${bookingId}/download-documents`,
            method: 'POST',
            warning: booking.documentsDownloadCount > 0 
              ? 'Documents already downloaded. Contact admin for re-download.' 
              : null,
          });
        }
        break;

      case 'documents_downloaded':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'add_group_data',
            label: 'Assign Group',
            description: 'Assign group number and name to this booking',
            endpoint: `/api/umrah-visa/${bookingId}/add-group-data`,
            method: 'POST',
          });
        }
        break;

      case 'group_assigned':
        if (isAdminOrStaff) {
          // For iqama bookings: show upload confirmation
          if (booking.accommodationType === 'iqama') {
            availableActions.push({
              action: 'upload_confirmation',
              label: 'Upload Image',
              description: 'Upload confirmation image',
              endpoint: `/api/umrah-visa/${bookingId}/upload-confirmation`,
              method: 'POST',
            });
          }
          // For hotel bookings: show done button to transition to voucher
          else if (booking.accommodationType === 'hotel') {
            availableActions.push({
              action: 'mark_ready_for_voucher',
              label: 'Done',
              description: 'Mark booking as ready for voucher generation',
              endpoint: `/api/umrah-visa/${bookingId}/mark-ready-for-voucher`,
              method: 'POST',
            });
          }
        }
        break;

      case 'voucher':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'generate_voucher',
            label: 'Generate Voucher',
            description: 'Generate transport voucher',
            endpoint: `/api/umrah-visa/${bookingId}/generate-voucher`,
            method: 'POST',
          });
        }
        break;

      case 'bill':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'generate_bill',
            label: 'Generate Bill',
            description: 'Generate bill for this booking',
            endpoint: `/api/umrah-visa/${bookingId}/generate-bill`,
            method: 'POST',
          });
        }
        break;

      case 'booking_success':
        // Final success status - no more actions needed
        break;

      case 'cancelled':
        // No actions available for cancelled bookings
        break;
    }

    res.json({
      bookingId,
      currentStatus: status,
      availableActions,
      booking: {
        documentsDownloadCount: booking.documentsDownloadCount,
        documentsDownloadedBy: booking.documentsDownloadedBy,
        lastUpdatedBy: booking.lastUpdatedBy,
      },
    });
  } catch (error) {
    console.error('Error fetching available actions:', error);
    res.status(500).json({ error: 'Failed to fetch available actions' });
  }
});

// GET /api/umrah-visa/:bookingId/trip-info - Get booking details (replaces trip-info)
router.get('/:bookingId/trip-info', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            email: true,
            contactNumber: true,
            whatsappNumber: true,
          },
        },
        travelDetails: true,
        sponsorIqamaDetails: true,
        lastUpdatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documentsDownloadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking info:', error);
    res.status(500).json({ error: 'Failed to fetch booking info' });
  }
});

// PATCH /api/umrah-visa/:bookingId/transport-bookings - Bulk update transport rows
router.patch('/:bookingId/transport-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transportBookings } = req.body || {};
    if (Array.isArray(transportBookings)) {
      for (const t of transportBookings) {
        if (!t?.id) continue;
        
        // Parse travelDateTime if provided
        const travelDateTime = t.travelDateTime 
          ? (t.travelDateTime instanceof Date ? t.travelDateTime : new Date(t.travelDateTime))
          : undefined;
        
        // Build update data - only travelDateTime and transportMasterId can be updated
        // vehicleType, paxCount, and price come from TransportMaster and cannot be changed here
        const updateData: any = {};
        if (travelDateTime !== undefined) {
          updateData.travelDateTime = travelDateTime;
        }
        if (t.transportMasterId) {
          updateData.transportMasterId = t.transportMasterId;
        }
        
        // Only update if there's data to update
        if (Object.keys(updateData).length > 0) {
        await prisma.umrahTransportBooking.update({
          where: { id: t.id },
            data: updateData,
        });
        }
      }
    }

    const refreshed = await prisma.umrahTransportBooking.findMany({
      where: { bookingId },
      include: { 
        transportMaster: {
          include: {
            route: {
              include: {
                city1: true,
                city2: true,
                city3: true,
                city4: true,
              },
            },
            vehicleType: true,
          },
        },
      },
    });
    res.json({ transportBookings: refreshed });
  } catch (error) {
    console.error('Error updating transport bookings:', error);
    res.status(500).json({ error: 'Failed to update transport bookings' });
  }
});

// POST /api/umrah-visa/:bookingId/transport-bookings - create transport row
router.post('/:bookingId/transport-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transportMasterId, travelDateTime } = req.body || {};
    
    if (!transportMasterId) {
      return res.status(400).json({ error: 'transportMasterId is required' });
    }
    
    // Parse travelDateTime if provided
    const parsedDateTime = travelDateTime 
      ? (travelDateTime instanceof Date ? travelDateTime : new Date(travelDateTime))
      : undefined;
    
    const created = await prisma.umrahTransportBooking.create({
      data: {
        bookingId,
        transportMasterId,
        travelDateTime: parsedDateTime,
      },
      include: { 
        transportMaster: {
          include: {
            route: {
              include: {
                city1: true,
                city2: true,
                city3: true,
                city4: true,
              },
            },
            vehicleType: true,
          },
        },
      },
    });
    res.json({ transportBooking: created });
  } catch (error) {
    console.error('Error creating transport booking:', error);
    res.status(500).json({ error: 'Failed to create transport booking' });
  }
});

// DELETE /api/umrah-visa/transport-bookings/:id - delete transport row
router.delete('/transport-bookings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.umrahTransportBooking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting transport booking:', error);
    res.status(500).json({ error: 'Failed to delete transport booking' });
  }
});

// POST /api/umrah-visa/:bookingId/hotel-bookings - create hotel booking row
router.post('/:bookingId/hotel-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cityId, hotelId, checkInDate, checkOutDate } = req.body || {};
    
    // Verify booking exists and has hotel accommodation type
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: { accommodationType: true },
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.accommodationType !== 'hotel') {
      return res.status(400).json({ error: 'Booking accommodation type is not hotel' });
    }

    const created = await prisma.umrahHotelBooking.create({
      data: {
        bookingId,
        cityId,
        hotelId,
        checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
        checkOutDate: checkOutDate ? new Date(checkOutDate) : new Date(),
      },
      include: { hotel: true, city: true },
    });
    res.json({ hotelBooking: created });
  } catch (error) {
    console.error('Error creating hotel booking:', error);
    res.status(500).json({ error: 'Failed to create hotel booking' });
  }
});

// DELETE /api/umrah-visa/hotel-bookings/:id - delete hotel booking row
router.delete('/hotel-bookings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.umrahHotelBooking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting hotel booking:', error);
    res.status(500).json({ error: 'Failed to delete hotel booking' });
  }
});

// Helper function to get Viabadr city ID
const getViabadrCityId = async (countryId: string): Promise<string> => {
  const viabadrCity = await prisma.cityMaster.findFirst({
    where: {
      countryId,
      name: { equals: 'Viabadr' },
    },
  });
  if (!viabadrCity) {
    throw new Error(`Viabadr city not found for country ${countryId}`);
  }
  return viabadrCity.id;
};

// PATCH /api/umrah-visa/:bookingId/movement-details - Bulk update movement details
router.patch('/:bookingId/movement-details', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { movementDetails } = req.body || {};
    
    if (!Array.isArray(movementDetails)) {
      return res.status(400).json({ error: 'movementDetails must be an array' });
    }

    // Get existing movements
    const existingMovements = await prisma.umrahMovementDetail.findMany({
      where: { bookingId },
    });
    const existingIds = new Set(existingMovements.map(m => m.id));
    const incomingIds = new Set(movementDetails.filter((m: any) => m.id && !m.id.startsWith('new-')).map((m: any) => m.id));

    // Delete movements that are not in the incoming list
    const toDelete = existingMovements.filter(m => !incomingIds.has(m.id));
    if (toDelete.length > 0) {
      await prisma.umrahMovementDetail.deleteMany({
        where: { id: { in: toDelete.map(m => m.id) } },
      });
    }

    // Update or create movements
    for (const movement of movementDetails) {
      const timeToUse = movement.time && movement.time.trim() !== '' ? movement.time : '12:00';
      if (!movement.date) {
        continue; // Skip invalid movements
      }

      const travelDateTime = combineDateTime(movement.date, timeToUse);
      if (!travelDateTime) {
        continue; // Skip invalid date/time
      }

      // Get location details
      const fromLocation = await prisma.locationMaster.findUnique({
        where: { id: movement.fromLocationId },
        include: { cityMaster: true },
      });
      const toLocation = await prisma.locationMaster.findUnique({
        where: { id: movement.toLocationId },
        include: { cityMaster: true },
      });

      if (!fromLocation || !toLocation) {
        continue; // Skip invalid locations
      }

      let toCityId = toLocation.cityId;
      if (movement.viabadrOverride) {
        const toCity = await prisma.cityMaster.findUnique({
          where: { id: toLocation.cityId },
          select: { name: true, countryId: true },
        });
        if (toCity) {
          toCityId = await getViabadrCityId(toCity.countryId);
        }
      }

      if (movement.id && !movement.id.startsWith('new-') && existingIds.has(movement.id)) {
        // Update existing
        await prisma.umrahMovementDetail.update({
          where: { id: movement.id },
          data: {
            travelDateTime,
            fromCityId: fromLocation.cityId,
            fromLocationId: fromLocation.id,
            toCityId,
            toLocationId: toLocation.id,
          },
        });
      } else {
        // Create new
        await prisma.umrahMovementDetail.create({
          data: {
            bookingId,
            travelDateTime,
            fromCityId: fromLocation.cityId,
            fromLocationId: fromLocation.id,
            toCityId,
            toLocationId: toLocation.id,
          },
        });
      }
    }

    // Return refreshed movements
    const refreshed = await prisma.umrahMovementDetail.findMany({
      where: { bookingId },
      include: {
        fromCity: true,
        fromLocation: {
          select: {
            id: true,
            name: true,
            locationType: true,
            city: true,
            cityId: true,
          },
        },
        toCity: true,
        toLocation: {
          select: {
            id: true,
            name: true,
            locationType: true,
            city: true,
            cityId: true,
          },
        },
      },
      orderBy: { travelDateTime: 'asc' },
    });

    res.json({ movementDetails: refreshed });
  } catch (error) {
    console.error('Error updating movement details:', error);
    res.status(500).json({ error: 'Failed to update movement details' });
  }
});

// POST /api/umrah-visa/:bookingId/movement-details - Create a single movement detail
router.post('/:bookingId/movement-details', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, time, fromLocationId, toLocationId, viabadrOverride } = req.body || {};
    
    if (!date || !fromLocationId || !toLocationId) {
      return res.status(400).json({ error: 'date, fromLocationId, and toLocationId are required' });
    }

    const timeToUse = time && time.trim() !== '' ? time : '12:00';
    const travelDateTime = combineDateTime(date, timeToUse);
    if (!travelDateTime) {
      return res.status(400).json({ error: 'Invalid date/time' });
    }

    // Get location details
    const fromLocation = await prisma.locationMaster.findUnique({
      where: { id: fromLocationId },
      include: { cityMaster: true },
    });
    const toLocation = await prisma.locationMaster.findUnique({
      where: { id: toLocationId },
      include: { cityMaster: true },
    });

    if (!fromLocation || !toLocation) {
      return res.status(400).json({ error: 'Invalid location IDs' });
    }

    let toCityId = toLocation.cityId;
    if (viabadrOverride) {
      const toCity = await prisma.cityMaster.findUnique({
        where: { id: toLocation.cityId },
        select: { name: true, countryId: true },
      });
      if (toCity) {
        toCityId = await getViabadrCityId(toCity.countryId);
      }
    }

    const created = await prisma.umrahMovementDetail.create({
      data: {
        bookingId,
        travelDateTime,
        fromCityId: fromLocation.cityId,
        fromLocationId: fromLocation.id,
        toCityId,
        toLocationId: toLocation.id,
      },
      include: {
        fromCity: true,
        fromLocation: {
          select: {
            id: true,
            name: true,
            locationType: true,
            city: true,
            cityId: true,
          },
        },
        toCity: true,
        toLocation: {
          select: {
            id: true,
            name: true,
            locationType: true,
            city: true,
            cityId: true,
          },
        },
      },
    });

    res.json({ movementDetail: created });
  } catch (error) {
    console.error('Error creating movement detail:', error);
    res.status(500).json({ error: 'Failed to create movement detail' });
  }
});

// DELETE /api/umrah-visa/movement-details/:id - Delete a movement detail
router.delete('/movement-details/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.umrahMovementDetail.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting movement detail:', error);
    res.status(500).json({ error: 'Failed to delete movement detail' });
  }
});

export default router;
