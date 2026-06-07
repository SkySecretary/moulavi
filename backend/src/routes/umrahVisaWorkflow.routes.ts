
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
import path from 'path';
const archiver = require('archiver');

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = Router();

// GET /api/umrah-visa/:bookingId/download-all-documents - Download all documents as ZIP
router.get('/:bookingId/download-all-documents', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

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
        include: { passenger: true }
      })
    ]);

    if (documents.length === 0) {
      return res.status(404).json({ error: 'No documents found for this booking' });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFileName = booking?.bookingReference 
      ? `documents-${booking.bookingReference}.zip`
      : `booking-documents-${bookingId}-${timestamp}.zip`;
      
    res.attachment(zipFileName);
    archive.pipe(res);

    archive.on('error', (err: any) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) res.status(500).send({ error: 'Failed to create ZIP archive' });
    });

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
        if (fs.existsSync(doc.filePath)) {
          archive.file(doc.filePath, { name: fileName });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error in bulk document download:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to download documents' });
  }
});

// POST /api/umrah-visa/:bookingId/add-group-data - Add group data (Admin/Staff only)
router.post('/:bookingId/add-group-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can add group data' });
    }

    const { groupNumber, groupName, umrahVisaProviderId } = req.body;

    if (!groupNumber || !groupName) {
      return res.status(400).json({ error: 'Group number and group name are required' });
    }

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    await prisma.$transaction(async (tx) => {
      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          groupNumber,
          groupName,
          hasGroupNumber: true,
          umrahVisaProviderId: umrahVisaProviderId || null,
          lastUpdatedBy: user.id,
        },
      });

      await syncBookingStatusInTx(bookingId, 'group_assigned', user.id, 'Group data added', tx);
    });
    
    res.json({ message: 'Group data added successfully' });
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

    if (user.role === 'party') return res.status(403).json({ error: 'Access denied' });

    const zipDocument = await prisma.document.findFirst({
      where: { bookingId, documentType: 'pan_card_zip', isDeleted: false },
    });

    if (!zipDocument) return res.status(404).json({ error: 'Zip file not found' });

    if (isS3Configured()) {
      try {
        const downloadUrl = await generateDownloadUrl(zipDocument.filePath);
        res.json({ downloadUrl, fileName: zipDocument.fileName });
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate download URL' });
      }
    } else {
      if (fs.existsSync(zipDocument.filePath)) {
        res.download(zipDocument.filePath, zipDocument.fileName);
      } else {
        res.status(404).json({ error: 'Zip file not found on server' });
      }
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to download zip file' });
  }
});

// POST /api/umrah-visa/:bookingId/download-documents - Download documents and track
router.post('/:bookingId/download-documents', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    if (user.role === 'party') return res.status(403).json({ error: 'Access denied' });

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.documentsDownloadCount > 0) {
      return res.status(400).json({ error: 'Documents already downloaded' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          documentsDownloadCount: { increment: 1 },
          documentsDownloadedBy: user.id,
          lastUpdatedBy: user.id,
        },
      });

      await syncBookingStatusInTx(bookingId, 'documents_downloaded', user.id, 'Documents downloaded', tx);
    });
    
    res.json({ message: 'Documents download tracked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track document download' });
  }
});

// POST /api/umrah-visa/:bookingId/upload-confirmation - Upload confirmation image
router.post('/:bookingId/upload-confirmation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;
    const { confirmationImagePath } = req.body;

    if (!confirmationImagePath) return res.status(400).json({ error: 'Path is required' });

    const booking = await prisma.umrahVisaBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let nextStatus: 'voucher' | 'bill' = booking.hasTransportation ? 'voucher' : 'bill';

    await prisma.$transaction(async (tx) => {
      await tx.umrahSponserIqamaDetails.update({
        where: {
          bookingId_isAlternate: { bookingId, isAlternate: false },
        },
        data: {
          confirmationImagePath,
          confirmationUploadedAt: new Date(),
        },
      });

      await syncBookingStatusInTx(bookingId, nextStatus, user.id, 'Confirmation image uploaded', tx);
    });
    
    res.json({ message: 'Confirmation uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload confirmation' });
  }
});

// GET /api/umrah-visa/:bookingId/download-confirmation - Download confirmation image
router.get('/:bookingId/download-confirmation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { sponsorIqamaDetails: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const mainIqama = booking.sponsorIqamaDetails?.find((i: any) => !i.isAlternate);
    if (!mainIqama?.confirmationImagePath) return res.status(404).json({ error: 'Image not found' });

    if (isS3Configured()) {
      const downloadUrl = await generateDownloadUrl(mainIqama.confirmationImagePath);
      res.json({ downloadUrl });
    } else {
      if (fs.existsSync(mainIqama.confirmationImagePath)) {
        res.download(mainIqama.confirmationImagePath);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/umrah-visa/:bookingId/mark-ready-for-voucher - Mark hotel booking as ready for voucher
router.post('/:bookingId/mark-ready-for-voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    const booking = await prisma.umrahVisaBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let nextStatus: 'voucher' | 'bill' = booking.hasTransportation ? 'voucher' : 'bill';

    await prisma.$transaction(async (tx) => {
      await tx.umrahVisaBooking.update({ where: { id: bookingId }, data: { lastUpdatedBy: user.id } });
      await syncBookingStatusInTx(bookingId, nextStatus, user.id, 'Marked as ready', tx);
    });
    
    res.json({ message: 'Booking marked as ready' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/umrah-visa/:bookingId/voucher-data - Get all data needed for voucher preview
router.get('/:bookingId/voucher-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: true,
        umrahVisaProvider: true,
        travelDetails: { include: { arrivalAirport: true, departureAirport: true } },
        hotelBookings: { include: { hotel: true, city: true }, orderBy: { checkInDate: 'asc' } },
        movementDetails: { include: { fromCity: true, fromLocation: true, toCity: true, toLocation: true }, orderBy: { travelDateTime: 'asc' } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let groupCode = booking.groupNumber || '';
    let paxCount = booking.passengerCount;
    if (booking.hasMultipleGroup && booking.multipleGroupDetails) {
      try {
        const details = booking.multipleGroupDetails as any[];
        groupCode = details.map(g => g.groupNumber).filter(n => n).join(', ');
        paxCount = details.reduce((sum, g) => sum + (g.passengerCount || 0), 0);
      } catch (e) {}
    }

    res.json({
      bookingId: booking.id,
      reservationDate: booking.createdAt,
      guestName: booking.party?.partyName || '',
      guestMobile: booking.party?.contactNumber || booking.party?.whatsappNumber || '',
      groupCode,
      paxCount,
      umrahVisaProvider: booking.umrahVisaProvider ? {
        partyName: booking.umrahVisaProvider.partyName,
        address: booking.umrahVisaProvider.address || '',
        contactNumber: booking.umrahVisaProvider.contactNumber || '',
        whatsappNumber: booking.umrahVisaProvider.whatsappNumber || '',
        email: booking.umrahVisaProvider.email || '',
        logoPath: booking.umrahVisaProvider.logoPath || '',
      } : null,
      hotelSchedules: booking.hotelBookings?.map((hb: any, idx: number) => ({
        number: idx + 1,
        location: hb.city.name,
        hotelName: hb.hotel.name,
        checkIn: hb.checkInDate,
        checkOut: hb.checkOutDate,
        days: Math.ceil((new Date(hb.checkOutDate).getTime() - new Date(hb.checkInDate).getTime()) / (1000 * 60 * 60 * 24)),
        brn: hb.brn || null,
      })) || [],
      movementDetails: (booking.movementDetails || []).map((md: any, idx: number) => ({
        sr: idx + 1,
        date: formatDate(md.travelDateTime),
        time: formatTime(md.travelDateTime),
        from: md.fromCity?.name || '',
        fromLocation: md.fromLocation?.name || '',
        fromCityId: md.fromCityId,
        fromLocationId: md.fromLocationId,
        to: md.toCity?.name || '',
        toLocation: md.toLocation?.name || '',
        toCityId: md.toCityId,
        toLocationId: md.toLocationId,
        viaBdr: !!md.viabadrOverride,
      })),
      flightDetails: (() => {
        const mainTravel = booking.travelDetails?.find((t: any) => !t.isAlternate);
        if (!mainTravel) return [];
        return [
          {
            type: 'AA',
            date: formatDate(mainTravel.arrivalDateTime),
            carrier: mainTravel.arrivalFlightNumber?.split('-')[0] || '',
            number: mainTravel.arrivalFlightNumber?.split('-')[1] || '',
            arrivalAirport: mainTravel.arrivalAirport?.name || '',
            eta: formatTime(mainTravel.arrivalDateTime),
          },
          {
            type: 'AD',
            date: formatDate(mainTravel.departureDateTime),
            carrier: mainTravel.departureFlightNumber?.split('-')[0] || '',
            number: mainTravel.departureFlightNumber?.split('-')[1] || '',
            departureAirport: mainTravel.departureAirport?.name || '',
            etd: formatTime(mainTravel.departureDateTime),
          },
        ];
      })(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/umrah-visa/:bookingId/generate-voucher - Generate transport voucher
router.post('/:bookingId/generate-voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;
    const voucherData = req.body;

    if (user.role === 'party') return res.status(403).json({ error: 'Access denied' });

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { umrahVisaProvider: true, party: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Handle multiple groups
    let groupCode = voucherData.groupCode || booking.groupNumber || '';
    let paxCount = voucherData.paxCount || booking.passengerCount;

    // Check existing voucher
    const existingVoucher = await prisma.voucher.findFirst({
      where: {
        guestName: voucherData.guestName || booking.party?.partyName || '',
        umrahVisaProviderId: booking.umrahVisaProviderId,
      },
      orderBy: { generatedAt: 'desc' },
    });

    const voucherNumber = existingVoucher ? existingVoucher.voucherNumber : await generateVoucherNumber();

    const voucherResultId = await prisma.$transaction(async (tx) => {
      let vRec;
      const dataToSave = {
        groupCode,
        paxCount,
        vehicleType: voucherData.vehicleType || null,
        transportCompanyId: voucherData.transportCompanyId || null,
        partyId: booking.partyId,
        umrahCompanyId: booking.umrahVisaProviderId,
      };

      if (existingVoucher) {
        vRec = await tx.voucher.update({
          where: { id: existingVoucher.id },
          data: { ...dataToSave, version: existingVoucher.version + 1, updatedAt: new Date() },
        });
        await tx.voucherMovement.deleteMany({ where: { voucherId: vRec.id } });
        await tx.voucherHotel.deleteMany({ where: { voucherId: vRec.id } });
        await tx.voucherFlight.deleteMany({ where: { voucherId: vRec.id } });
      } else {
        vRec = await tx.voucher.create({
          data: {
            ...dataToSave,
            voucherNumber,
            reservationDate: new Date(voucherData.reservationDate || booking.createdAt),
            guestName: voucherData.guestName || booking.party?.partyName || '',
            guestMobile: voucherData.guestMobile || '',
            generatedBy: user.id,
            umrahVisaProviderId: booking.umrahVisaProviderId || null,
          }
        });
      }

      if (voucherData.movementDetails) {
        for (const m of voucherData.movementDetails) {
          await tx.voucherMovement.create({
            data: {
              voucherId: vRec.id, sr: m.sr, date: new Date(m.date), time: m.time,
              from: m.from, fromLocation: m.fromLocation, to: m.to, toLocation: m.toLocation,
              vehicleType: m.vehicleType || null, viaBdr: !!m.viaBdr,
            }
          });
        }
      }
      
      if (voucherData.hotelSchedules) {
        for (const h of voucherData.hotelSchedules) {
          let brnValue = Array.isArray(h.brn) ? h.brn.join(', ') : (h.brn || null);
          await tx.voucherHotel.create({
            data: {
              voucherId: vRec.id, number: h.number, location: h.location, hotelName: h.hotelName,
              checkIn: new Date(h.checkIn), checkOut: new Date(h.checkOut), days: h.days, brn: brnValue,
            }
          });
        }
      }

      if (voucherData.flightDetails) {
        for (const f of voucherData.flightDetails) {
          const airport = f.type === 'AA' ? (f.arrivalAirport || f.from || '') : (f.departureAirport || f.to || '');
          await tx.voucherFlight.create({
            data: {
              voucherId: vRec.id, type: String(f.type || 'AA').substring(0, 2), carrier: String(f.carrier || '').substring(0, 10),
              number: String(f.number || '').substring(0, 20), date: new Date(f.date),
              from: f.type === 'AA' ? String(airport).substring(0, 10) : 'JED',
              to: f.type === 'AD' ? String(airport).substring(0, 10) : 'JED',
            }
          });
        }
      }

      await tx.umrahVisaBooking.update({ where: { id: bookingId }, data: { status: 'bill', voucherGeneratedAt: new Date() } });
      await syncBookingStatusInTx(bookingId, 'bill', user.id, 'Voucher generated/updated', tx);
      return vRec.id;
    });

    const fullV = await prisma.voucher.findUnique({
      where: { id: voucherResultId },
      include: { umrahCompany: true, transportCompany: true, movements: true, hotels: true, flights: true },
    });

    if (!fullV) return res.status(500).json({ error: 'Failed' });

    const pdfData: VoucherPdfData = {
      voucherNumber: fullV.voucherNumber,
      reservationDate: fullV.reservationDate.toISOString(),
      guestName: fullV.guestName,
      guestMobile: fullV.guestMobile || '',
      groupCode: fullV.groupCode || '',
      paxCount: fullV.paxCount,
      vehicleType: fullV.vehicleType || '',
      umrahCompany: fullV.umrahCompany ? {
        partyName: fullV.umrahCompany.partyName,
        address: fullV.umrahCompany.address || '',
        contactNumber: fullV.umrahCompany.contactNumber || '',
        whatsappNumber: fullV.umrahCompany.whatsappNumber || '',
        email: fullV.umrahCompany.email || '',
        logoPath: fullV.umrahCompany.logoPath || '',
      } : null,
      transportCompany: fullV.transportCompany ? { partyName: fullV.transportCompany.partyName } : null,
      hotelSchedules: fullV.hotels.map(h => ({
        number: h.number, location: h.location, hotelName: h.hotelName, days: h.days,
        checkIn: h.checkIn.toISOString(), checkOut: h.checkOut.toISOString(), brn: h.brn ? [h.brn] : [],
      })),
      movementDetails: fullV.movements.map(m => ({
        sr: m.sr, route: m.route || '', date: m.date.toISOString(), time: m.time, from: m.from, fromLocation: m.fromLocation,
        to: m.to, toLocation: m.toLocation, vehicleType: m.vehicleType || '', viaBdr: !!m.viaBdr,
      })),
      flightDetails: fullV.flights.map(f => ({
        type: f.type, date: f.date.toISOString(), carrier: f.carrier, number: f.number, from: f.from, to: f.to,
        etd: '', eta: '',
      })),
    };

    const pdfBuffer = await generateVoucherPDF(pdfData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Voucher_${fullV.voucherNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/umrah-visa/generate-pdf - Generate PDF from voucher data
router.post('/generate-pdf', authenticate, async (req, res) => {
  try {
    const pdfBuffer = await generateVoucherPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/umrah-visa/:bookingId/available-actions
router.get('/:bookingId/available-actions', authenticate, async (req, res) => {
  try {
    const booking = await prisma.umrahVisaBooking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking) return res.status(404).json({ error: 'Not found' });
    const user = (req as any).user;
    const isAdmin = ['admin', 'staff'].includes(user.role);
    let actions: any[] = [];
    if (isAdmin) {
      if (booking.status === 'pending') actions.push({ action: 'download_documents', label: 'Download Documents', endpoint: `/api/umrah-visa/${booking.id}/download-documents`, method: 'POST' });
      if (booking.status === 'documents_downloaded') actions.push({ action: 'add_group_data', label: 'Assign Group', endpoint: `/api/umrah-visa/${booking.id}/add-group-data`, method: 'POST' });
      if (booking.status === 'group_assigned') {
        if (booking.accommodationType === 'iqama') actions.push({ action: 'upload_confirmation', label: 'Upload Image', endpoint: `/api/umrah-visa/${booking.id}/upload-confirmation`, method: 'POST' });
        else actions.push({ action: 'mark_ready_for_voucher', label: 'Done', endpoint: `/api/umrah-visa/${booking.id}/mark-ready-for-voucher`, method: 'POST' });
      }
      if (['voucher', 'bill', 'booking_success'].includes(booking.status)) actions.push({ action: 'generate_voucher', label: 'Generate Voucher', endpoint: `/api/umrah-visa/${booking.id}/generate-voucher`, method: 'POST' });
      if (booking.status === 'bill') actions.push({ action: 'generate_bill', label: 'Generate Bill', endpoint: `/api/umrah-visa/${booking.id}/generate-bill`, method: 'POST' });
    }
    res.json({ availableActions: actions });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/umrah-visa/:bookingId/trip-info
router.get('/:bookingId/trip-info', authenticate, async (req, res) => {
  try {
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: req.params.bookingId },
      include: {
        party: true, travelDetails: { include: { arrivalAirport: true, departureAirport: true } },
        sponsorIqamaDetails: true, hotelBookings: { include: { city: true, hotel: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Not found' });
    res.json(booking);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// Movement routes
router.patch('/:bookingId/movement-details', authenticate, async (req, res) => {
  try {
    const { movementDetails } = req.body;
    for (const m of movementDetails) {
      const travelDateTime = combineDateTime(m.date, m.time) || new Date();
      const data = { travelDateTime, fromCityId: m.fromCityId, toCityId: m.toCityId, fromLocationId: m.fromLocationId, toLocationId: m.toLocationId, viabadrOverride: !!m.viabadrOverride };
      if (m.id && !m.id.startsWith('new-')) await prisma.umrahMovementDetail.update({ where: { id: m.id }, data });
      else await prisma.umrahMovementDetail.create({ data: { ...data, bookingId: req.params.bookingId } });
    }
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:bookingId/movement-details', authenticate, async (req, res) => {
  try {
    const travelDateTime = combineDateTime(req.body.date, req.body.time) || new Date();
    const m = await prisma.umrahMovementDetail.create({
      data: {
        bookingId: req.params.bookingId, travelDateTime, fromCityId: req.body.fromCityId,
        toCityId: req.body.toCityId, fromLocationId: req.body.fromLocationId, toLocationId: req.body.toLocationId,
        viabadrOverride: !!req.body.viabadrOverride
      }
    });
    res.json({ movementDetail: m });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
