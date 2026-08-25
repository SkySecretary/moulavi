
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from './umrahVisa/shared';
import { syncBookingStatus, syncBookingStatusInTx } from '../services/statusSyncService';
import { generateVoucherNumber, formatTime, formatDate, generateRouteNumbersForVoucher } from '../services/voucherService';
import { generateVoucherPDF } from '../services/pdfService';
import { sendIqamaConfirmationEmail } from '../services/emailService';
import { VoucherPdfData } from '../types/voucher';
import { isS3Configured, S3_CONFIG, generateDownloadUrl, s3Client, extractS3KeyFromUrl } from '../config/s3';
import { combineDateTime } from '../utils/datetime';
import { syncVoucherToBooking, syncBookingToVoucher } from '../utils/bookingVoucherSync';
import { appendBookingAttachments } from '../utils/bookingPdfAttachments';
import fs from 'fs';
import path from 'path';
const archiver = require('archiver');

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const getCategoryDir = (documentType: string): string => {
  switch (documentType) {
    case 'passport_copy':
      return 'Passports';
    case 'passenger_photo':
      return 'Photos';
    case 'pan_card':
    case 'pan_card_zip':
      return 'PAN Cards';
    case 'iqama':
      return 'Iqamas';
    case 'onward_ticket':
      return 'Onward Tickets';
    case 'return_ticket':
      return 'Return Tickets';
    case 'national_address':
      return 'National Address';
    case 'umrah_visa_copy':
      return 'Umrah Visa Copies';
    case 'nusuk_booking_copy':
      return 'Nusuk Booking Copies';
    default:
      return 'Other';
  }
};

const router = Router();

// GET /api/umrah-visa/:bookingId/download-all-documents - Download all documents as ZIP
router.get('/:bookingId/download-all-documents', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Get all documents for this booking
    // Documents can be linked directly to booking or via passengers
    const [booking, documents] = await Promise.all([
      prisma.umrahVisaBooking.findUnique({
        where: { id: bookingId },
        select: { bookingReference: true }
      }),
      prisma.document.findMany({
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
      })
    ]);

    if (documents.length === 0) {
      return res.status(404).json({ error: 'No documents found for this booking' });
    }

    // Initialize archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers
    const zipFileName = booking?.bookingReference 
      ? `${booking.bookingReference}-all-docs.zip`
      : `${bookingId}-all-docs.zip`;
      
    res.attachment(zipFileName);

    // Pipe archive data to response
    archive.pipe(res);

    // Handle errors
    archive.on('error', (err: any) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to create ZIP archive' });
      }
    });

    // Add each document to the archive
    for (const doc of documents) {
      // Skip the pan_card_zip itself in the dynamic ZIP to avoid nested ZIPs
      if (doc.documentType === 'pan_card_zip') continue;

      let fileName = doc.fileName;
      if (doc.passenger) {
        const passportNo = doc.passenger.passportNumber;
        const ext = path.extname(doc.fileName);
        if (doc.documentType === 'passport_copy' || doc.documentType === 'passenger_photo') {
          if (passportNo) {
            fileName = `${passportNo}${ext}`;
          } else {
            const cleanName = doc.passenger.fullName.replace(/[^a-zA-Z0-9]/g, '_');
            fileName = `${cleanName}${ext}`;
          }
        } else {
          const cleanName = doc.passenger.fullName.replace(/[^a-zA-Z0-9]/g, '_');
          const passportPart = passportNo ? `_${passportNo}` : '';
          fileName = `${cleanName}${passportPart}_${doc.fileName}`;
        }
      }

      const categoryDir = getCategoryDir(doc.documentType);
      const zipFilePath = `${categoryDir}/${fileName}`;

      const isS3File = doc.filePath.startsWith('http://') || doc.filePath.startsWith('https://');

      if (fs.existsSync(doc.filePath) && !isS3File) {
        // Local file storage
        archive.file(doc.filePath, { name: zipFilePath });
      } else if (isS3Configured() && s3Client) {
        // Fetch from S3
        try {
          const s3Key = extractS3KeyFromUrl(doc.filePath) || doc.filePath;
          const command = new GetObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: s3Key,
          });
          const response = await s3Client.send(command);
          if (response.Body) {
            archive.append(response.Body as Readable, { name: zipFilePath });
          }
        } catch (s3Error) {
          console.error(`Error fetching file from S3: ${doc.filePath}`, s3Error);
        }
      } else {
        console.error(`File not found: ${doc.filePath}`);
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

    if (booking.status !== 'pending' && booking.status !== 'documents_downloaded') {
      return res.status(400).json({ error: 'Group data can only be added when status is pending or documents_downloaded' });
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

    // Find all documents for this booking
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

    // Check if we should dynamically generate the ZIP or serve pre-uploaded ZIP directly.
    // If the only document is a 'pan_card_zip', we can serve it directly for performance.
    // Otherwise, we dynamically generate a ZIP containing all split documents.
    const nonZipDocs = documents.filter(d => d.documentType !== 'pan_card_zip');
    const zipDocument = documents.find(d => d.documentType === 'pan_card_zip');

    if (nonZipDocs.length === 0 && zipDocument) {
      // Serve the uploaded PAN ZIP directly (performance optimization for legacy group bookings)
      const isS3File = zipDocument.filePath.startsWith('http://') || zipDocument.filePath.startsWith('https://');

      if (isS3File && isS3Configured()) {
        try {
          const downloadUrl = await generateDownloadUrl(zipDocument.filePath);
          return res.json({
            downloadUrl,
            fileName: zipDocument.fileName,
            fileSize: zipDocument.fileSize,
            mimeType: zipDocument.mimeType,
          });
        } catch (error) {
          console.error('Error generating download URL:', error);
          return res.status(500).json({ error: 'Failed to generate download URL' });
        }
      } else {
        // Serve local file
        const absolutePath = path.resolve(process.cwd(), zipDocument.filePath);
        console.log(`Attempting to download local ZIP:
          - DB Path: ${zipDocument.filePath}
          - Absolute Path: ${absolutePath}
          - Exists: ${fs.existsSync(zipDocument.filePath)}
          - Process CWD: ${process.cwd()}
        `);

        if (fs.existsSync(zipDocument.filePath)) {
          return res.download(zipDocument.filePath, zipDocument.fileName);
        } else if (isS3Configured()) {
          // Fallback: try S3
          try {
            const downloadUrl = await generateDownloadUrl(zipDocument.filePath);
            return res.json({
              downloadUrl,
              fileName: zipDocument.fileName,
              fileSize: zipDocument.fileSize,
              mimeType: zipDocument.mimeType,
            });
          } catch (error) {
            console.error('Error generating download URL for S3 fallback:', error);
            return res.status(404).json({ error: 'Zip file not found' });
          }
        } else {
          console.error(`File not found at path: ${zipDocument.filePath}`);
          return res.status(404).json({ error: 'Zip file not found on server disk' });
        }
      }
    }

    // Otherwise: Fallback/generate dynamic ZIP containing ALL booking files
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: { bookingReference: true }
    });

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const zipFileName = booking?.bookingReference 
      ? `${booking.bookingReference}-all-docs.zip`
      : `${bookingId}-all-docs.zip`;
      
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    archive.pipe(res);

    archive.on('error', (err: any) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to create ZIP archive' });
      }
    });

    for (const doc of documents) {
      // Skip the pan_card_zip itself in the dynamic ZIP to avoid nested ZIPs
      if (doc.documentType === 'pan_card_zip') continue;

      let fileName = doc.fileName;
      if (doc.passenger) {
        const passportNo = doc.passenger.passportNumber;
        const ext = path.extname(doc.fileName);
        if (doc.documentType === 'passport_copy' || doc.documentType === 'passenger_photo') {
          if (passportNo) {
            fileName = `${passportNo}${ext}`;
          } else {
            const cleanName = doc.passenger.fullName.replace(/[^a-zA-Z0-9]/g, '_');
            fileName = `${cleanName}${ext}`;
          }
        } else {
          const cleanName = doc.passenger.fullName.replace(/[^a-zA-Z0-9]/g, '_');
          const passportPart = passportNo ? `_${passportNo}` : '';
          fileName = `${cleanName}${passportPart}_${doc.fileName}`;
        }
      }

      const categoryDir = getCategoryDir(doc.documentType);
      const zipFilePath = `${categoryDir}/${fileName}`;

      const isS3File = doc.filePath.startsWith('http://') || doc.filePath.startsWith('https://');

      if (fs.existsSync(doc.filePath) && !isS3File) {
        // Local file storage
        archive.file(doc.filePath, { name: zipFilePath });
      } else if (isS3Configured() && s3Client) {
        // Fetch from S3
        try {
          const s3Key = extractS3KeyFromUrl(doc.filePath) || doc.filePath;
          const command = new GetObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: s3Key,
          });
          const response = await s3Client.send(command);
          if (response.Body) {
            archive.append(response.Body as Readable, { name: zipFilePath });
          }
        } catch (s3Error) {
          console.error(`Error fetching file from S3: ${doc.filePath}`, s3Error);
        }
      } else {
        console.error(`File not found: ${doc.filePath}`);
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('Error downloading zip file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download zip file' });
    }
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
    
    // Re-fetch updated booking with iqama and party details
    const finalBooking = await prisma.umrahVisaBooking.findUnique({ 
      where: { id: bookingId },
      include: {
        sponsorIqamaDetails: true,
        party: {
          select: {
            partyName: true,
            email: true,
          },
        },
        passengers: {
          where: { isDeleted: false },
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!finalBooking) {
      console.log('⚠️ Booking not found for sending notifications');
      return res.json({
        message: 'Confirmation uploaded successfully but booking not found for notifications',
        data: { booking: null }
      });
    }

    // Send notification (email to Agency/Party + WhatsApp to Iqama holder mobile)
    const mainIqama = finalBooking.sponsorIqamaDetails?.find((i: any) => !i.isAlternate);
    if (mainIqama) {
      try {
        const { sendIqamaConfirmationEmail } = await import('../services/emailService');
        const iqamaHolderName = mainIqama.iqamaSponserName || 'Valued Customer';
        const iqamaHolderPhone = mainIqama.sponserMobileNumber || undefined;
        const confirmationImagePath = mainIqama.confirmationImagePath || undefined;
        
        // Use agency/party email for the email notification
        const recipientEmail = finalBooking.party?.email || undefined;
        
        const bookingDetails = {
          bookingReference: finalBooking.bookingReference || undefined,
          groupNumber: finalBooking.groupNumber || undefined,
          groupName: finalBooking.groupName || undefined,
          passengerCount: finalBooking.passengerCount,
          passengers: finalBooking.passengers?.map((p: any) => p.fullName.trim()) || [],
          partyName: finalBooking.party?.partyName,
        };
        
        if (recipientEmail || iqamaHolderPhone) {
          await sendIqamaConfirmationEmail(
            recipientEmail,
            iqamaHolderName,
            confirmationImagePath,
            iqamaHolderPhone,
            bookingDetails
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
    const isS3File = filePath.startsWith('http://') || filePath.startsWith('https://');

    if (isS3File && isS3Configured()) {
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
      } else if (isS3Configured()) {
        // Fallback: try S3
        try {
          const downloadUrl = await generateDownloadUrl(filePath);
          res.json({
            downloadUrl,
            fileName,
            fileSize: confirmationDoc?.fileSize || null,
            mimeType: confirmationDoc?.mimeType || 'image/jpeg',
          });
        } catch (error) {
          console.error('Error generating download URL for S3 fallback:', error);
          res.status(404).json({ error: 'Confirmation image not found' });
        }
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
    if (booking.isDuplicate) {
      nextStatus = 'bill';
    } else if (booking.hasTransportation) {
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
            id: true,
            partyName: true,
            contactNumber: true,
            whatsappNumber: true,
            accountCurrency: true,
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
            logoPath: true,
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
      bookingReference: booking.bookingReference || '',
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
        logoPath: booking.umrahVisaProvider.logoPath || '', // Ensure logoPath is included
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
        date: md.travelDateTime ? md.travelDateTime.toISOString() : '', 
        time: md.travelDateTime ? md.travelDateTime.toISOString() : '', 
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
        // vehicleType: '', // Not stored in movement details (only in transport bookings) - REMOVED, will be pulled from transportBookings
        paxCount: 0, // Not stored in movement details (only in transport bookings)
        price: 0, // Not stored in movement details (only in transport bookings)
        viaBdr: !!md.viabadrOverride,
      })),
      flightDetails: (() => {
        const mainTravel = booking.travelDetails?.find((t: any) => !t.isAlternate);
        if (!mainTravel) return [];
        return [
          {
            type: 'AA', // Arrival
            date: mainTravel.arrivalDateTime ? mainTravel.arrivalDateTime.toISOString() : '',
            carrier: mainTravel.arrivalFlightNumber?.includes('-') ? mainTravel.arrivalFlightNumber.split('-')[0] : (mainTravel.arrivalFlightNumber?.substring(0, 2) || ''),
            number: mainTravel.arrivalFlightNumber?.includes('-') ? mainTravel.arrivalFlightNumber.split('-')[1] : (mainTravel.arrivalFlightNumber?.substring(2) || ''),
            arrivalAirportId: mainTravel.arrivalAirportId,
            arrivalAirport: mainTravel.arrivalAirport.code || mainTravel.arrivalAirport.name || '',
            etd: '',
            eta: mainTravel.arrivalDateTime ? mainTravel.arrivalDateTime.toISOString() : '',
          },
          {
            type: 'AD', // Departure
            date: mainTravel.departureDateTime ? mainTravel.departureDateTime.toISOString() : '',
            carrier: mainTravel.departureFlightNumber?.includes('-') ? mainTravel.departureFlightNumber.split('-')[0] : (mainTravel.departureFlightNumber?.substring(0, 2) || ''),
            number: mainTravel.departureFlightNumber?.includes('-') ? mainTravel.departureFlightNumber.split('-')[1] : (mainTravel.departureFlightNumber?.substring(2) || ''),
            departureAirportId: mainTravel.departureAirportId,
            departureAirport: mainTravel.departureAirport.code || mainTravel.departureAirport.name || '',
            etd: mainTravel.departureDateTime ? mainTravel.departureDateTime.toISOString() : '',
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
      // Extract unique vehicle types from transport bookings for the main voucher header
      vehicleType: Array.from(new Set(
        (booking.transportBookings || [])
          .map(tb => tb.transportMaster?.vehicleType?.vehicleName)
          .filter((name): name is string => !!name)
      )).join(', '),
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
            email: true, // Explicitly select email
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!voucherData.transportCompanyId) {
      return res.status(400).json({ error: 'Transport Company is required for voucher generation.' });
    }

    // Check status - allow voucher generation in appropriate stages
    const validStatuses = ['voucher', 'ready_for_voucher', 'bill', 'booking_success'];
    if (!validStatuses.includes(booking.status)) {
      return res.status(400).json({ 
        error: `Voucher cannot be generated when status is ${booking.status}`,
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
          guestName: voucherData.guestName !== undefined ? voucherData.guestName : existingVoucher.guestName,
          guestMobile: voucherData.guestMobile !== undefined ? voucherData.guestMobile : existingVoucher.guestMobile,
          reservationDate: voucherData.reservationDate ? new Date(voucherData.reservationDate) : existingVoucher.reservationDate,
          groupCode,
          groupName: groupName || null,
          paxCount,
          partyId: booking!.partyId,
          umrahCompanyId: booking!.umrahVisaProviderId,
          transportCompanyId: voucherData.transportCompanyId || existingVoucher.transportCompanyId || null,
          vehicleType: voucherData.vehicleType || existingVoucher.vehicleType || null,
          bookingId: booking!.id,
          bookingReference: booking!.bookingReference || null,
          // Increment version to track updates
          version: existingVoucher.version + 1,
        };
        voucherRecord = await tx.voucher.update({
          where: { id: existingVoucher.id },
          data: updateData,
        });

        // Delete existing related records associated with this voucher so we can recreate them
        await tx.voucherMovement.deleteMany({ where: { voucherId: existingVoucher.id } });
        await tx.voucherHotel.deleteMany({ where: { voucherId: existingVoucher.id } });
        await tx.voucherFlight.deleteMany({ where: { voucherId: existingVoucher.id } });
      } else {
        // Create new voucher
        const voucherDataToCreate: any = {
          voucherNumber, // Voucher number is used as reservation number
          reservationDate: new Date(voucherData.reservationDate || booking!.createdAt),
          guestName: voucherData.guestName || (booking && booking.party ? booking.party.partyName : ''),
          guestMobile: voucherData.guestMobile || '',
          groupCode,
          groupName: groupName || null,
          umrahVisaProviderId: booking!.umrahVisaProviderId || null,
          partyId: booking!.partyId,
          umrahCompanyId: booking!.umrahVisaProviderId,
          transportCompanyId: voucherData.transportCompanyId || null,
          paxCount,
          generatedBy: user.id,
          vehicleType: voucherData.vehicleType || null,
          bookingId: booking!.id,
          bookingReference: booking!.bookingReference || null,
        };
        
        voucherRecord = await tx.voucher.create({
          data: voucherDataToCreate,
        });
      }

      // Create movements, hotels, flights for both new and updated vouchers
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
                route: movement.route || routeNumbers[index] || null, // Use route if present, else generate
                date: movement.date ? (isNaN(new Date(movement.date).getTime()) ? new Date() : new Date(movement.date)) : new Date(),
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
                checkIn: hotel.checkIn ? (isNaN(new Date(hotel.checkIn).getTime()) ? new Date() : new Date(hotel.checkIn)) : new Date(),
                checkOut: hotel.checkOut ? (isNaN(new Date(hotel.checkOut).getTime()) ? new Date() : new Date(hotel.checkOut)) : new Date(),
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
            const airport = flight.type === 'AA' 
              ? (flight.arrivalAirport || flight.from || '')
              : (flight.departureAirport || flight.to || '');
            
            return tx.voucherFlight.create({
              data: {
                voucherId: voucherRecord.id,
                type: String(flight.type || 'AA').substring(0, 10),
                carrier: String(flight.carrier || '').substring(0, 50),
                number: String(flight.number || '').substring(0, 50),
                date: flight.date ? (isNaN(new Date(flight.date).getTime()) ? new Date() : new Date(flight.date)) : new Date(),
                from: flight.type === 'AA' ? String(airport).substring(0, 50) : 'JED',
                to: flight.type === 'AD' ? String(airport).substring(0, 50) : 'JED',
                etd: flight.etd ? String(flight.etd).substring(0, 20) : null,
                eta: flight.eta ? String(flight.eta).substring(0, 20) : null,
              },
            });
          })
        );
      }

      // Update booking with voucher metadata
      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          voucherGeneratedAt: new Date(),
          voucherGeneratedBy: user.id,
        },
      });

      // Sync status using helper (updates booking status + history)
      await syncBookingStatusInTx(bookingId, 'bill', user.id, existingVoucher ? 'Voucher updated with additional groups' : 'Voucher generated', tx);

      // Re-sync Voucher -> Booking details in database
      await syncVoucherToBooking(tx, voucherRecord.id);

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
        movements: { orderBy: { sr: 'asc' } },
        hotels: { orderBy: { number: 'asc' } },
        flights: { orderBy: { date: 'asc' } },
        party: {
          select: {
            id: true,
            partyName: true,
            address: true,
            contactNumber: true,
            whatsappNumber: true,
            email: true,
          },
        },
        umrahCompany: {
          select: {
            id: true,
            partyName: true,
            address: true,
            contactNumber: true,
            whatsappNumber: true,
            email: true,
            logoPath: true,
          },
        },
        transportCompany: {
          select: {
            id: true,
            partyName: true,
          },
        },
      },
    });

    if (!fullVoucher) {
      return res.status(500).json({ error: 'Failed to fetch created voucher' });
    }

    // Fetch umrah visa provider separately if needed (fallback if relation not populated)
    let umrahVisaProvider = fullVoucher.umrahCompany;
    if (!umrahVisaProvider && fullVoucher.umrahVisaProviderId) {
      umrahVisaProvider = await prisma.party.findUnique({
        where: { id: fullVoucher.umrahVisaProviderId },
        select: {
          id: true,
          partyName: true,
          address: true,
          contactNumber: true,
          whatsappNumber: true,
          email: true,
          logoPath: true,
        },
      }) as any;
    }

    // Transform voucher data to match PDF format explicitly
    const voucherForPdf: any = {
      id: fullVoucher.id,
      voucherNumber: fullVoucher.voucherNumber,
      bookingReference: fullVoucher.bookingReference || '',
      reservationNumber: fullVoucher.voucherNumber, // Use voucherNumber as reservation number
      reservationDate: fullVoucher.reservationDate.toISOString(),
      guestName: fullVoucher.guestName,
      guestMobile: fullVoucher.guestMobile || '',
      groupCode: fullVoucher.groupCode || '',
      groupName: fullVoucher.groupName || '',
      paxCount: fullVoucher.paxCount,
      vehicleType: fullVoucher.vehicleType || '',
      umrahCompany: umrahVisaProvider,
      agentParty: fullVoucher.party,
      transportCompany: fullVoucher.transportCompany,
      movementDetails: fullVoucher.movements.map((m) => ({
        sr: m.sr,
        route: m.route || '',
        date: m.date.toISOString(),
        time: m.time,
        from: m.from,
        fromLocation: m.fromLocation,
        to: m.to,
        toLocation: m.toLocation,
        vehicleType: m.vehicleType || '',
        viaBdr: !!(m as any).viaBdr,
      })),
      hotelSchedules: fullVoucher.hotels.map((h) => ({
        number: h.number,
        location: h.location,
        hotelName: h.hotelName,
        checkIn: h.checkIn.toISOString(),
        checkOut: h.checkOut.toISOString(),
        days: h.days,
        brn: h.brn ? (h.brn.includes(',') ? h.brn.split(',').map(s => s.trim()) : [h.brn]) : [],
      })),
      flightDetails: fullVoucher.flights.map((f) => ({
        type: f.type,
        carrier: f.carrier,
        number: f.number,
        date: f.date.toISOString(),
        from: f.from,
        to: f.to,
        arrivalAirport: f.type === 'AA' ? f.from : undefined,
        departureAirport: f.type === 'AD' ? f.to : undefined,
        etd: f.etd || '',
        eta: f.eta || '',
      })),
    };

    // ========== DEBUG LOGGING: PDF DATA ==========
    console.log('📑 FROM PDF DATA (voucherForPdf):');
    console.log('  - Reservation Number (Voucher Number):', voucherForPdf.reservationNumber || 'NULL');
    const pdfRouteNumbers = voucherForPdf.movementDetails
      .map((m: any) => m.route)
      .filter((r: any): r is string => !!r && r !== '');
    console.log('  - Route Numbers:', pdfRouteNumbers.length > 0 ? pdfRouteNumbers : 'NONE');
    console.log('  - Movement Details Count:', voucherForPdf.movementDetails.length);
    voucherForPdf.movementDetails.forEach((m: any) => {
      console.log(`    Movement (SR: ${m.sr}): Route="${m.route || 'NULL'}", From="${m.from}", To="${m.to}"`);
    });
    console.log('==========================================');

    // Generate PDF and send email to agency
    try {
      if (booking.party?.email) {
        console.log(`Sending voucher email to agency: ${booking.party.email}`);
        const pdfBuffer = await generateVoucherPDF(voucherForPdf as any);
        const { sendVoucherGeneratedEmail } = await import('../services/emailService');
        await sendVoucherGeneratedEmail(
          booking.party.email,
          booking.party.partyName,
          fullVoucher.voucherNumber,
          pdfBuffer
        );
        console.log('✅ Voucher email sent to agency successfully');
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send voucher email to agency:', emailError);
      // Don't fail the request if email fails
    }

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
    const fileName = `Voucher-${voucherData.voucherNumber}.pdf`;

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

// GET /api/umrah-visa/:bookingId/generate-booking-pdf - Generate PDF for a booking
router.get('/:bookingId/generate-booking-pdf', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Fetch booking with all related data
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: true,
        umrahVisaProvider: true,
        sponsorIqamaDetails: true,
        passengers: {
          where: { isLeadPassenger: true, isDeleted: false },
          take: 1
        },
        travelDetails: {
          where: { isAlternate: false },
          include: {
            arrivalAirport: true,
            departureAirport: true
          }
        },
        hotelBookings: {
          where: { isAlternate: false },
          include: {
            hotel: true,
            city: true
          },
          orderBy: {
            checkInDate: 'asc'
          }
        },
        movementDetails: {
          where: { isAlternate: false },
          include: {
            fromCity: true,
            fromLocation: true,
            toCity: true,
            toLocation: true
          },
          orderBy: {
            travelDateTime: 'asc'
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const leadPassenger = booking.passengers[0];
    const travel = booking.travelDetails[0];
    const iqama = booking.sponsorIqamaDetails?.find((i: any) => !i.isAlternate);

    // Map to VoucherPdfData
    const pdfData: VoucherPdfData & { isBookingVoucher?: boolean } = {
      isBookingVoucher: true,
      voucherNumber: booking.bookingReference || booking.id.slice(0, 8),
      reservationDate: booking.createdAt.toISOString(),
      guestName: leadPassenger?.fullName || 'N/A',
      guestMobile: leadPassenger?.phoneNumber || 'N/A',
      groupCode: booking.groupNumber || 'N/A',
      groupName: booking.groupName || undefined,
      paxCount: booking.passengerCount,
      iqamaDetails: booking.accommodationType === 'iqama' && iqama ? {
        name: iqama.iqamaSponserName || 'N/A',
        number: iqama.iqamaNumber || 'N/A',
        address: iqama.sponserNationalShortAddress || 'N/A',
        dob: iqama.sponserDob ? iqama.sponserDob.toISOString() : ''
      } : null,
      umrahCompany: booking.umrahVisaProvider ? {
        partyName: booking.umrahVisaProvider.partyName,
        address: booking.umrahVisaProvider.address || undefined,
        contactNumber: booking.umrahVisaProvider.contactNumber || undefined,
        whatsappNumber: booking.umrahVisaProvider.whatsappNumber || undefined,
        email: booking.umrahVisaProvider.email || undefined,
        logoPath: booking.umrahVisaProvider.logoPath || undefined,
      } : null,
      agentParty: {
        partyName: booking.party.partyName
      },
      transportCompany: null,
      hotelSchedules: booking.hotelBookings.map((h, i) => ({
        number: i + 1,
        location: h.city.name,
        hotelName: h.hotel.name,
        days: Math.ceil((new Date(h.checkOutDate).getTime() - new Date(h.checkInDate).getTime()) / (1000 * 60 * 60 * 24)),
        checkIn: h.checkInDate.toISOString(),
        checkOut: h.checkOutDate.toISOString(),
        brn: h.brn ? (Array.isArray(h.brn) ? h.brn as string[] : [h.brn as string]) : undefined
      })),
      movementDetails: booking.movementDetails.map((m, i) => ({
        sr: i + 1,
        route: 'Auto',
        date: m.travelDateTime ? m.travelDateTime.toISOString() : '',
        time: m.travelDateTime ? m.travelDateTime.toISOString() : '',
        from: m.fromCity?.name || 'N/A',
        fromLocation: m.fromLocation?.name || '',
        to: m.toCity?.name || 'N/A',
        toLocation: m.toLocation?.name || '',
        viaBdr: m.viabadrOverride
      })),
      flightDetails: travel ? [
        {
          type: 'AA',
          date: travel.arrivalDateTime ? travel.arrivalDateTime.toISOString() : '',
          carrier: travel.arrivalFlightNumber?.includes('-') ? travel.arrivalFlightNumber.split('-')[0] : (travel.arrivalFlightNumber?.substring(0, 2) || ''),
          number: travel.arrivalFlightNumber?.includes('-') ? travel.arrivalFlightNumber.split('-').slice(1).join('-') : (travel.arrivalFlightNumber?.substring(2) || travel.arrivalFlightNumber || ''),
          from: travel.arrivalAirport?.city || '',
          to: travel.arrivalAirport?.name || '',
          arrivalAirport: travel.arrivalAirport?.code || travel.arrivalAirport?.name || '',
          etd: travel.arrivalDateTime ? travel.arrivalDateTime.toISOString() : '',
          eta: travel.arrivalDateTime ? travel.arrivalDateTime.toISOString() : '',
        },
        {
          type: 'AD',
          date: travel.departureDateTime ? travel.departureDateTime.toISOString() : '',
          carrier: travel.departureFlightNumber?.includes('-') ? travel.departureFlightNumber.split('-')[0] : (travel.departureFlightNumber?.substring(0, 2) || ''),
          number: travel.departureFlightNumber?.includes('-') ? travel.departureFlightNumber.split('-').slice(1).join('-') : (travel.departureFlightNumber?.substring(2) || travel.departureFlightNumber || ''),
          from: travel.departureAirport?.name || '',
          to: travel.departureAirport?.city || '',
          departureAirport: travel.departureAirport?.code || travel.departureAirport?.name || '',
          etd: travel.departureDateTime ? travel.departureDateTime.toISOString() : '',
          eta: travel.departureDateTime ? travel.departureDateTime.toISOString() : '',
        }
      ] : []
    };

    // Generate PDF
    let pdfBuffer = await generateVoucherPDF(pdfData);

    // Merge attachments if this is an individual iqama booking
    pdfBuffer = await appendBookingAttachments(bookingId, pdfBuffer);

    const fileName = `Voucher-${booking.bookingReference || booking.id.slice(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating booking PDF:', error);
    res.status(500).json({ error: 'Failed to generate booking PDF' });
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
            role: true,
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
    const { cityId, hotelId, checkInDate, checkOutDate, brn, cateringBrn, additionalBrns, bedsQuantity } = req.body || {};
    
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
        brn: brn ?? null,
        cateringBrn: cateringBrn ?? null,
        additionalBrns: additionalBrns ? (additionalBrns as any) : null,
        bedsQuantity: bedsQuantity !== undefined && bedsQuantity !== null ? parseInt(bedsQuantity, 10) : null,
      },
      include: { hotel: true, city: true },
    });

    // Sync hotel booking changes to voucher
    await syncBookingToVoucher(prisma, bookingId);

    try {
      const { InventoryService } = require('../services/inventoryService');
      await InventoryService.recalculateAll();
    } catch (err) {
      console.error('Failed to recalculate inventories on create:', err);
    }

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
    
    // Find hotel booking first to get bookingId
    const hotelBooking = await prisma.umrahHotelBooking.findUnique({
      where: { id },
      select: { bookingId: true },
    });
    
    if (hotelBooking) {
      await prisma.umrahHotelBooking.delete({ where: { id } });
      // Sync changes back to voucher
      await syncBookingToVoucher(prisma, hotelBooking.bookingId);

      try {
        const { InventoryService } = require('../services/inventoryService');
        await InventoryService.recalculateAll();
      } catch (err) {
        console.error('Failed to recalculate inventories on delete:', err);
      }
    }
    
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
      if (!movement.date) {
        continue; // Skip invalid movements
      }

      const timeToUse = movement.time && movement.time.trim() !== '' ? movement.time : '12:00';
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

    // Sync movements to voucher
    await syncBookingToVoucher(prisma, bookingId);

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

    // Sync movements to voucher
    await syncBookingToVoucher(prisma, bookingId);

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
    
    // Find movement first to get bookingId
    const movement = await prisma.umrahMovementDetail.findUnique({
      where: { id },
      select: { bookingId: true },
    });
    
    if (movement) {
      await prisma.umrahMovementDetail.delete({ where: { id } });
      // Sync changes back to voucher
      await syncBookingToVoucher(prisma, movement.bookingId);
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting movement detail:', error);
    res.status(500).json({ error: 'Failed to delete movement detail' });
  }
});

// PATCH /api/umrah-visa/booking/:id/group-number - Update group number, name, BRN, and companies
router.patch('/booking/:id/group-number', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { groupNumber, groupName, brn, umrahVisaProviderId, transportCompanyId, passengerCount, partyId } = req.body;
    const user = (req as any).user;

    const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';

    const updateData: any = {
      groupNumber,
      groupName,
      brn,
      umrahVisaProviderId: umrahVisaProviderId || undefined,
      transportCompanyId: transportCompanyId || undefined,
      lastUpdatedBy: user.id,
    };

    if (passengerCount !== undefined) {
      updateData.passengerCount = Number(passengerCount);
    }

    if (partyId && isAdminOrStaff) {
      updateData.partyId = partyId;
    }

    const booking = await prisma.umrahVisaBooking.update({
      where: { id },
      data: updateData,
    });

    // Sync booking metadata changes to voucher
    await syncBookingToVoucher(prisma, id);

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error updating group number:', error);
    res.status(500).json({ error: 'Failed to update group number' });
  }
});

// PATCH /api/umrah-visa/booking/:id/status - Update booking status
router.patch('/booking/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = (req as any).user;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins are authorized to manually change booking status' });
    }

    const oldBooking = await prisma.umrahVisaBooking.findUnique({
      where: { id },
      select: { status: true },
    });

    const booking = await prisma.umrahVisaBooking.update({
      where: { id },
      data: {
        status,
        lastUpdatedBy: user.id,
      },
    });

    // Create status history
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: id,
        oldStatus: oldBooking?.status || null,
        newStatus: status,
        changedBy: user.id,
        reason: notes || 'Status updated during edit',
      },
    });

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/umrah-visa/booking/:id - Delete a booking
router.delete('/booking/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete
    await prisma.umrahVisaBooking.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// PATCH /api/umrah-visa/:bookingId/trip-status - Update trip status (pending/hosting/completed)
router.patch('/:bookingId/trip-status', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { tripStatus } = req.body;
    const user = (req as any).user;

    if (!['pending', 'hosting', 'completed'].includes(tripStatus)) {
      return res.status(400).json({ error: 'Invalid trip status' });
    }

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { 
        sponsorIqamaDetails: { where: { isAlternate: false } },
        party: true,
        passengers: {
          where: { isDeleted: false },
          select: {
            fullName: true,
          },
        },
        travelDetails: {
          include: {
            arrivalAirport: true,
            departureAirport: true,
          }
        },
        movementDetails: {
          include: {
            fromCity: true,
            toCity: true,
            fromLocation: true,
            toLocation: true,
          }
        }
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    let targetBookingStatus: 'voucher' | 'bill' | null = null;
    let transitionReason = '';

    if (tripStatus === 'completed' && 
        (booking.visaType === 'individual_visa' || booking.visaType === 're_entry') && 
        booking.accommodationType === 'hotel' && 
        (booking.status === 'group_assigned' || booking.status === 'documents_downloaded' || booking.status === 'pending')) {
      
      let isJeddahMadinah = false;
      
      // Check travel details airports
      if (booking.travelDetails) {
        for (const t of booking.travelDetails) {
          const arrCode = t.arrivalAirport?.code?.toLowerCase() || '';
          const depCode = t.departureAirport?.code?.toLowerCase() || '';
          const arrName = t.arrivalAirport?.name?.toLowerCase() || '';
          const depName = t.departureAirport?.name?.toLowerCase() || '';
          const arrCity = t.arrivalAirport?.city?.toLowerCase() || '';
          const depCity = t.departureAirport?.city?.toLowerCase() || '';
          
          if (arrCode.includes('jed') || arrCode.includes('med') ||
              depCode.includes('jed') || depCode.includes('med') ||
              arrName.includes('jeddah') || arrName.includes('madina') || arrName.includes('madinah') ||
              depName.includes('jeddah') || depName.includes('madina') || depName.includes('madinah') ||
              arrCity.includes('jeddah') || arrCity.includes('madina') || arrCity.includes('madinah') ||
              depCity.includes('jeddah') || depCity.includes('madina') || depCity.includes('madinah')) {
            isJeddahMadinah = true;
            break;
          }
        }
      }

      // Check movement details locations/cities
      if (!isJeddahMadinah && booking.movementDetails) {
        for (const m of booking.movementDetails) {
          const fromCityName = m.fromCity?.name?.toLowerCase() || '';
          const toCityName = m.toCity?.name?.toLowerCase() || '';
          const fromLocName = m.fromLocation?.name?.toLowerCase() || '';
          const toLocName = m.toLocation?.name?.toLowerCase() || '';
          if (fromCityName.includes('jeddah') || fromCityName.includes('madina') || fromCityName.includes('madinah') ||
              toCityName.includes('jeddah') || toCityName.includes('madina') || toCityName.includes('madinah') ||
              fromLocName.includes('jeddah') || fromLocName.includes('madina') || fromLocName.includes('madinah') ||
              toLocName.includes('jeddah') || toLocName.includes('madina') || toLocName.includes('madinah')) {
            isJeddahMadinah = true;
            break;
          }
        }
      }

      if (isJeddahMadinah) {
        targetBookingStatus = 'voucher';
        transitionReason = 'Trip completed (individual hotel booking involving Jeddah/Madina, transitioned to voucher pending)';
      } else {
        targetBookingStatus = 'bill';
        transitionReason = 'Trip completed (individual hotel booking, transitioned to bill ready)';
      }
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const ub = await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          tripStatus,
          lastUpdatedBy: user.id,
        },
      });

      if (targetBookingStatus) {
        await syncBookingStatusInTx(bookingId, targetBookingStatus, user.id, transitionReason, tx);
      }

      return ub;
    });

    // If status changed to hosting, send notifications
    if (tripStatus === 'hosting') {
      const iqama = booking.sponsorIqamaDetails?.[0];
      if (iqama) {
        try {
           const bookingDetails = {
             bookingReference: booking.bookingReference || undefined,
             groupNumber: booking.groupNumber || undefined,
             groupName: booking.groupName || undefined,
             passengerCount: booking.passengerCount,
             passengers: booking.passengers?.map((p: any) => p.fullName.trim()) || [],
             partyName: booking.party?.partyName,
           };

           // Pass party email and iqama holder mobile for dual notification
           await sendIqamaConfirmationEmail(
             booking.party.email,
             iqama.iqamaSponserName,
             iqama.confirmationImagePath || '',
             iqama.sponserMobileNumber || undefined,
             bookingDetails
           );
        } catch (err) {
           console.error('Error sending hosting notification:', err);
        }
      }
    }

    res.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error('Error updating trip status:', error);
    res.status(500).json({ error: 'Failed to update trip status' });
  }
});

export default router;
