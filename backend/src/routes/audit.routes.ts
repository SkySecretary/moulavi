
import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { AuditService } from '../services/auditService';
import { prisma } from '../config/database';

const router = Router();

// Get audit trail for a specific entity
router.get(
  '/trail/:entityType/:entityId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { entityType, entityId } = req.params;
    
    const auditTrail = await AuditService.getAuditTrail(entityType, entityId);
    
    res.json({
      auditTrail,
      entityType,
      entityId,
    });
  })
);

// Get status history for a booking
router.get(
  '/status-history/:bookingId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params;
    
    const statusHistory = await AuditService.getStatusHistory(bookingId);
    
    res.json({
      statusHistory,
      bookingId,
    });
  })
);

// Get audit logs with pagination and filters
router.get(
  '/logs',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      page = '1', 
      limit = '50',
      entityType,
      action,
      changedBy,
      dateFrom,
      dateTo
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const filters: any = {};
    
    if (entityType) filters.entityType = entityType as string;
    if (action) filters.action = action as string;
    if (changedBy) filters.changedBy = changedBy as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    
    const result = await AuditService.getAuditLogs(pageNum, limitNum, filters);
    
    res.json(result);
  })
);

// Get audit statistics
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dateFrom, dateTo } = req.query;
    
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.changedAt = {};
      if (dateFrom) {
        where.changedAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.changedAt.lte = new Date(dateTo as string);
      }
    }
    
    const [
      totalLogs,
      createLogs,
      updateLogs,
      deleteLogs,
      bookingLogs,
      passengerLogs,
      documentLogs
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, action: 'create' } }),
      prisma.auditLog.count({ where: { ...where, action: 'update' } }),
      prisma.auditLog.count({ where: { ...where, action: 'delete' } }),
      prisma.auditLog.count({ where: { ...where, entityType: 'booking' } }),
      prisma.auditLog.count({ where: { ...where, entityType: 'passenger' } }),
      prisma.auditLog.count({ where: { ...where, entityType: 'document' } })
    ]);
    
    res.json({
      stats: {
        totalLogs,
        actionBreakdown: {
          create: createLogs,
          update: updateLogs,
          delete: deleteLogs
        },
        entityBreakdown: {
          booking: bookingLogs,
          passenger: passengerLogs,
          document: documentLogs
        }
      }
    });
  })
);

// Comprehensive System Diagnostics Audit
router.get(
  '/system-health',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const fs = require('fs');
    const path = require('path');
    let totalAnomalies = 0;

    // 1. Database Health
    const startTime = Date.now();
    const integrity = (await prisma.$queryRawUnsafe('PRAGMA integrity_check;').catch(e => [{ integrity_check: e.message }])) as any[];
    const latency = Date.now() - startTime;
    const journal = (await prisma.$queryRawUnsafe('PRAGMA journal_mode;').catch(() => [{ journal_mode: 'unknown' }])) as any[];
    const fkCheck = (await prisma.$queryRawUnsafe('PRAGMA foreign_key_check;').catch(() => [])) as any[];

    const dbPath = path.join(__dirname, '..', '..', 'prisma', 'dev.db');
    const walPath = path.join(__dirname, '..', '..', 'prisma', 'dev.db-wal');

    let dbSizeMB = '0.00';
    let walSizeMB = '0.00';
    if (fs.existsSync(dbPath)) {
      dbSizeMB = (fs.statSync(dbPath).size / (1024 * 1024)).toFixed(2);
    }
    if (fs.existsSync(walPath)) {
      walSizeMB = (fs.statSync(walPath).size / (1024 * 1024)).toFixed(2);
    }

    // 2. Vouchers Audit
    const allVouchers = await prisma.voucher.findMany({
      select: {
        id: true,
        voucherNumber: true,
        groupCode: true,
        bookingId: true,
        bookingReference: true,
        createdAt: true,
        party: { select: { partyName: true } },
        generatedByUser: { select: { name: true } },
        _count: { select: { movements: true, hotels: true, flights: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const numericEntries = allVouchers.map(v => parseInt(v.voucherNumber, 10)).filter(n => !isNaN(n));
    const minNumber = numericEntries.length > 0 ? Math.min(...numericEntries) : 0;
    const maxNumber = numericEntries.length > 0 ? Math.max(...numericEntries) : 0;

    // Duplicate voucher numbers
    const numCountMap: Record<string, number> = {};
    for (const v of allVouchers) {
      numCountMap[v.voucherNumber] = (numCountMap[v.voucherNumber] || 0) + 1;
    }
    const duplicateNumbers = Object.entries(numCountMap).filter(([_, c]) => c > 1).map(([n]) => n);
    if (duplicateNumbers.length > 0) totalAnomalies += duplicateNumbers.length;

    // Duplicate group codes
    const groupCodeMap: Record<string, any[]> = {};
    for (const v of allVouchers) {
      if (v.groupCode) {
        const parts = v.groupCode.split(',').map(s => s.trim()).filter(Boolean);
        for (const code of parts) {
          if (!groupCodeMap[code]) groupCodeMap[code] = [];
          groupCodeMap[code].push({
            voucherNumber: v.voucherNumber,
            bookingReference: v.bookingReference,
            partyName: v.party?.partyName,
            createdBy: v.generatedByUser?.name,
            createdAt: v.createdAt,
          });
        }
      }
    }
    const duplicateGroupCodes = Object.entries(groupCodeMap)
      .filter(([_, list]) => list.length > 1)
      .map(([code, vouchers]) => ({ groupCode: code, vouchers }));
    if (duplicateGroupCodes.length > 0) totalAnomalies += duplicateGroupCodes.length;

    const quickVouchers = allVouchers.filter(v => !v.bookingId && v.groupCode);
    const emptyVouchers = allVouchers.filter(v => v._count.movements === 0 && v._count.hotels === 0);
    if (emptyVouchers.length > 0) totalAnomalies += emptyVouchers.length;

    // 3. Bookings Audit
    const allBookings = await prisma.umrahVisaBooking.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        bookingReference: true,
        groupNumber: true,
        status: true,
        passengerCount: true,
        voucherGeneratedAt: true,
        createdAt: true,
        party: { select: { partyName: true } },
        _count: { select: { passengers: true, vouchers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingVouchers = allBookings.filter(b => b.status === 'voucher');
    const billedWithoutVoucher = allBookings.filter(b => (b.status === 'bill' || b.status === 'booking_success') && b._count.vouchers === 0);
    if (billedWithoutVoucher.length > 0) totalAnomalies += billedWithoutVoucher.length;

    const stuckVoucherGenerated = allBookings.filter(b => b.status === 'voucher' && b.voucherGeneratedAt);
    if (stuckVoucherGenerated.length > 0) totalAnomalies += stuckVoucherGenerated.length;

    const passengerMismatches = allBookings.filter(b => b.passengerCount > 0 && b._count.passengers > 0 && b.passengerCount !== b._count.passengers);
    if (passengerMismatches.length > 0) totalAnomalies += passengerMismatches.length;

    // 4. Travel & Hotels Audit
    const travels = await prisma.umrahTravelDetails.findMany({
      where: { isAlternate: false },
      select: {
        bookingId: true,
        arrivalDateTime: true,
        departureDateTime: true,
        booking: { select: { bookingReference: true } },
      },
    });
    const invertedFlights = travels.filter(t => t.arrivalDateTime && t.departureDateTime && new Date(t.arrivalDateTime) > new Date(t.departureDateTime))
      .map(f => ({
        bookingReference: f.booking?.bookingReference || f.bookingId,
        arrival: f.arrivalDateTime,
        departure: f.departureDateTime,
      }));
    if (invertedFlights.length > 0) totalAnomalies += invertedFlights.length;

    const hotels = await prisma.umrahHotelBooking.findMany({
      where: { isAlternate: false },
      select: {
        bookingId: true,
        checkInDate: true,
        checkOutDate: true,
        brn: true,
        booking: { select: { bookingReference: true } },
      },
    });
    const invalidHotelStays = hotels.filter(h => h.checkInDate && h.checkOutDate && new Date(h.checkInDate) >= new Date(h.checkOutDate))
      .map(h => ({
        bookingReference: h.booking?.bookingReference || h.bookingId,
        checkIn: h.checkInDate,
        checkOut: h.checkOutDate,
      }));
    if (invalidHotelStays.length > 0) totalAnomalies += invalidHotelStays.length;

    // BRN Duplicates
    const brnMap: Record<string, string[]> = {};
    for (const h of hotels) {
      let brnList: any[] = [];
      if (Array.isArray(h.brn)) brnList = h.brn;
      else if (typeof h.brn === 'string' && h.brn) brnList = [h.brn];

      for (const b of brnList) {
        const cleanBrn = String(b).trim();
        if (!cleanBrn || cleanBrn === 'null' || cleanBrn.length < 5) continue;
        if (!brnMap[cleanBrn]) brnMap[cleanBrn] = [];
        brnMap[cleanBrn].push(h.booking?.bookingReference || h.bookingId);
      }
    }
    const duplicateBrns = Object.entries(brnMap)
      .filter(([_, list]) => Array.from(new Set(list)).length > 1)
      .map(([brn, refs]) => ({ brn, bookings: Array.from(new Set(refs)) }));

    // 5. Routes Audit
    const totalRoutes = await prisma.voucherMovement.count({ where: { route: { not: null } } });
    const latestMovement = await prisma.voucherMovement.findFirst({
      where: { route: { not: null } },
      select: { route: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const missingLocations = await prisma.voucherMovement.count({
      where: { OR: [{ from: '' }, { to: '' }, { fromLocation: '' }, { toLocation: '' }] },
    });
    if (missingLocations > 0) totalAnomalies += missingLocations;

    res.json({
      timestamp: new Date().toISOString(),
      totalAnomalies,
      database: {
        integrity: (integrity as any)[0]?.integrity_check || 'ok',
        latencyMs: latency,
        journalMode: (journal as any)[0]?.journal_mode || 'unknown',
        foreignKeyViolations: fkCheck.length,
        dbSizeMB,
        walSizeMB,
      },
      vouchers: {
        total: allVouchers.length,
        minNumber,
        maxNumber,
        duplicateNumbers,
        duplicateGroupCodes,
        quickVouchersCount: quickVouchers.length,
        emptyVouchersCount: emptyVouchers.length,
        recentVouchers: allVouchers.slice(0, 10),
      },
      bookings: {
        total: allBookings.length,
        pendingVouchersCount: pendingVouchers.length,
        pendingVouchersList: pendingVouchers.slice(0, 20),
        billedWithoutVoucherCount: billedWithoutVoucher.length,
        billedWithoutVoucherList: billedWithoutVoucher.slice(0, 10),
        stuckVoucherGeneratedCount: stuckVoucherGenerated.length,
        stuckVoucherGeneratedList: stuckVoucherGenerated.slice(0, 10),
        passengerMismatchesCount: passengerMismatches.length,
        passengerMismatchesList: passengerMismatches.slice(0, 10),
      },
      travel: {
        invertedFlightsCount: invertedFlights.length,
        invertedFlightsList: invertedFlights,
        invalidHotelStaysCount: invalidHotelStays.length,
        invalidHotelStaysList: invalidHotelStays,
        duplicateBrnsCount: duplicateBrns.length,
        duplicateBrnsList: duplicateBrns.slice(0, 20),
      },
      routes: {
        totalRoutes,
        latestRoute: latestMovement?.route || 'None',
        missingLocationsCount: missingLocations,
      },
    });
  })
);

// Deep Search Inspection API
router.get(
  '/inspect',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const term = query.trim();

    const [vouchers, bookings] = await Promise.all([
      prisma.voucher.findMany({
        where: {
          OR: [
            { voucherNumber: term },
            { groupCode: { contains: term } },
            { bookingReference: { contains: term } },
            { id: term },
            { guestName: { contains: term } },
            { party: { partyName: { contains: term } } },
          ],
        },
        include: {
          party: true,
          transportCompany: true,
          umrahCompany: true,
          generatedByUser: { select: { id: true, name: true, email: true } },
          movements: { orderBy: { sr: 'asc' } },
          hotels: { orderBy: { number: 'asc' } },
          flights: { orderBy: { date: 'asc' } },
          booking: true,
        },
        take: 10,
      }),
      prisma.umrahVisaBooking.findMany({
        where: {
          OR: [
            { bookingReference: { contains: term } },
            { groupNumber: { contains: term } },
            { id: term },
            { groupName: { contains: term } },
            { party: { partyName: { contains: term } } },
            { passengers: { some: { passportNumber: { contains: term } } } },
          ],
        },
        include: {
          party: true,
          statusHistory: { include: { user: { select: { name: true } } }, orderBy: { changedAt: 'asc' } },
          passengers: { take: 10 },
          vouchers: true,
        },
        take: 10,
      }),
    ]);

    res.json({ term, vouchers, bookings });
  })
);

// Safe Database WAL Checkpoint API
router.post(
  '/checkpoint',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
      res.json({ success: true, message: 'SQLite WAL checkpoint completed successfully', result });
    } catch (err: any) {
      res.status(500).json({ error: 'WAL checkpoint failed: ' + err.message });
    }
  })
);

export default router;
