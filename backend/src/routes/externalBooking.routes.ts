import { Router, Response } from 'express';
import { partnerAuthenticate, PartnerAuthRequest } from '../middleware/partnerAuth';
import { ExternalBookingService } from '../services/externalBookingService';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure local storage for document uploads via External / Partner API
const uploadDir = path.join(process.cwd(), 'uploads/partner-docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `doc-${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

/**
 * All routes require External Authentication (Admin Master API Key, Partner Agency API Key, or Bearer Token)
 */
router.use(partnerAuthenticate);

/**
 * POST /api/v1/external/bookings
 * Create a new Booking Request (Individual, Group, or Re-Entry)
 * Supports both Admin credentials (with optional partyId/partyCode routing) and Partner Agency credentials.
 */
router.post('/bookings', async (req: PartnerAuthRequest, res: Response) => {
  try {
    const party = req.party;
    const isAdmin = Boolean(req.isAdmin || req.user?.role === 'admin');

    if (!party && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'No associated partner agency found for this credential.',
        code: 'PARTY_NOT_FOUND'
      });
    }

    const payload = req.body;
    const booking: any = await ExternalBookingService.createBooking(
      payload,
      party,
      req.user?.id,
      isAdmin
    );

    return res.status(201).json({
      success: true,
      message: 'Booking request created successfully and queued for processing.',
      data: {
        bookingReference: booking.bookingReference,
        id: booking.id,
        status: booking.status,
        visaType: booking.visaType,
        groupNumber: booking.groupNumber,
        groupName: booking.groupName,
        guestName: booking.guestName,
        passengerCount: booking.passengerCount,
        passengers: booking.passengers?.map((p: any) => ({
          id: p.id,
          fullName: p.fullName,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          isLeadPassenger: p.isLeadPassenger
        })),
        travelDetails: booking.travelDetails?.[0] || null,
        hotelBookings: booking.hotelBookings || [],
        sponsorIqamaDetails: booking.sponsorIqamaDetails || null,
        submittedAt: booking.submittedAt,
        party: booking.party ? {
          id: booking.party.id,
          partyCode: booking.party.partyCode,
          partyName: booking.party.partyName
        } : null
      }
    });
  } catch (error: any) {
    console.error('[EXTERNAL BOOKING CREATE ERROR]:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create booking request',
      code: error.code || 'BOOKING_CREATE_FAILED',
      errors: error.errors || undefined,
      warnings: error.warnings || undefined,
    });
  }
});

/**
 * POST /api/v1/external/bookings/validate
 * Dry-run validation of a booking payload without writing to the database
 */
router.post('/bookings/validate', async (req: PartnerAuthRequest, res: Response) => {
  try {
    const party = req.party;
    const isAdmin = Boolean(req.isAdmin || req.user?.role === 'admin');
    const result = await ExternalBookingService.validateBookingPayload(req.body, party, isAdmin);

    return res.status(result.valid ? 200 : 422).json({
      success: result.valid,
      message: result.valid ? 'Payload passed all validation checks' : 'Payload contains validation errors',
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Validation execution failed',
    });
  }
});

/**
 * GET /api/v1/external/bookings
 * List bookings created in the system.
 * - Admin credentials: List all bookings or filter by specific agency (?partyId=...)
 * - Agency credentials: Only list bookings owned by the authenticated agency.
 */
router.get('/bookings', async (req: PartnerAuthRequest, res: Response) => {
  try {
    const party = req.party;
    const isAdmin = Boolean(req.isAdmin || req.user?.role === 'admin');
    const { status, visaType, search, fromDate, toDate, page, limit, partyId } = req.query;

    const resolvedPartyId = isAdmin
      ? (partyId as string | undefined)
      : (party ? party.id : undefined);

    const result = await ExternalBookingService.listBookings({
      partyId: resolvedPartyId,
      status: status as string,
      visaType: visaType as string,
      search: search as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    return res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('[EXTERNAL BOOKINGS LIST ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to list bookings',
    });
  }
});

/**
 * GET /api/v1/external/bookings/:idOrReference
 * Fetch single booking full details
 */
router.get('/bookings/:idOrReference', async (req: PartnerAuthRequest, res: Response) => {
  try {
    const { idOrReference } = req.params;
    const party = req.party;
    const isAdmin = Boolean(req.isAdmin || req.user?.role === 'admin');

    const booking = await ExternalBookingService.getBookingByIdOrReference(
      idOrReference,
      isAdmin ? undefined : (party ? party.id : undefined)
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Booking '${idOrReference}' not found.`,
        code: 'BOOKING_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: booking
    });
  } catch (error: any) {
    console.error('[EXTERNAL BOOKING GET ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve booking',
    });
  }
});

/**
 * POST /api/v1/external/bookings/:idOrReference/documents
 * Upload / Attach documents to an existing booking
 */
router.post(
  '/bookings/:idOrReference/documents',
  upload.array('files', 20),
  async (req: PartnerAuthRequest, res: Response) => {
    try {
      const { idOrReference } = req.params;
      const party = req.party;
      const isAdmin = Boolean(req.isAdmin || req.user?.role === 'admin');
      const { documentType = 'passport_copy', passengerId } = req.body;

      const booking = await ExternalBookingService.getBookingByIdOrReference(
        idOrReference,
        isAdmin ? undefined : (party ? party.id : undefined)
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided for upload',
        });
      }

      const createdDocs = await Promise.all(
        files.map(async (f) => {
          return prisma.document.create({
            data: {
              bookingId: booking.id,
              passengerId: passengerId || null,
              documentType,
              fileName: f.originalname,
              filePath: `/uploads/partner-docs/${f.filename}`,
              fileSize: f.size,
              mimeType: f.mimetype,
            }
          });
        })
      );

      return res.status(201).json({
        success: true,
        message: `Successfully attached ${createdDocs.length} document(s).`,
        data: createdDocs,
      });
    } catch (error: any) {
      console.error('[EXTERNAL DOC UPLOAD ERROR]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload documents',
      });
    }
  }
);

/**
 * POST /api/v1/external/bookings/:idOrReference/cancel
 * Request cancellation of a pending booking
 */
router.post('/bookings/:idOrReference/cancel', async (req: PartnerAuthRequest, res: Response) => {
  try {
    const { idOrReference } = req.params;
    const { reason = 'Cancelled via External API request' } = req.body;
    const party = req.party;
    const isAdmin = Boolean(req.isAdmin || req.user?.role === 'admin');

    const booking = await ExternalBookingService.getBookingByIdOrReference(
      idOrReference,
      isAdmin ? undefined : (party ? party.id : undefined)
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    if (['voucher_generated', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot automatically cancel booking in status '${booking.status}'. Please contact support/admin directly.`,
        code: 'CANNOT_CANCEL_ISSUED_VOUCHER'
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.umrahVisaBooking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          lastUpdatedBy: req.user?.id || party?.userId,
        }
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: booking.status,
          newStatus: 'cancelled',
          changedBy: req.user?.id || party?.userId || 'api-system',
          reason: `External API Cancellation Request: ${reason}`,
        }
      });

      return b;
    });

    return res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('[EXTERNAL CANCEL ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel booking',
    });
  }
});

/**
 * GET /api/v1/external/masters/lookup
 * Catalog lookup for developer integrations (Hotels, Airports, Cities, Transport Routes, Providers, Parties)
 */
router.get('/masters/lookup', async (req: PartnerAuthRequest, res: Response) => {
  try {
    const lookups = await ExternalBookingService.getMasterLookups();
    const isAdmin = Boolean(req.isAdmin || req.user?.role === 'admin');

    // If Admin, also include list of all customer agencies for easy partyId routing in external tools
    let customerAgencies: any[] = [];
    if (isAdmin) {
      customerAgencies = await prisma.party.findMany({
        where: { isCustomer: true },
        select: { id: true, partyCode: true, partyName: true, email: true, contactNumber: true }
      });
    }

    return res.json({
      success: true,
      data: {
        ...lookups,
        customerAgencies: isAdmin ? customerAgencies : undefined
      }
    });
  } catch (error: any) {
    console.error('[MASTER LOOKUP ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve master catalogs',
    });
  }
});

export default router;
