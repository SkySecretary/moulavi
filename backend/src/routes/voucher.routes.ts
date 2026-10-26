
import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { generateVoucherNumber, generateRouteNumbersForVoucher } from '../services/voucherService';
import { sendMovementUpdateEmail } from '../services/emailService';
import { sendMovementUpdateWhatsApp } from '../services/whatsappService';
import { syncVoucherToBooking } from '../utils/bookingVoucherSync';

const router = Router();

const getUtcDayRange = (clientDate?: any, offsetDays = 0): { start: Date; end: Date } => {
  let baseDate: Date;
  if (clientDate && typeof clientDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(clientDate)) {
    const parts = clientDate.split('T')[0].split('-').map(Number);
    baseDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
  } else if (clientDate instanceof Date && !isNaN(clientDate.getTime())) {
    baseDate = new Date(Date.UTC(clientDate.getUTCFullYear(), clientDate.getUTCMonth(), clientDate.getUTCDate(), 0, 0, 0, 0));
  } else {
    const now = new Date();
    baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }
  const start = new Date(baseDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const getClientBaseDate = (clientDate?: any): Date => {
  return getUtcDayRange(clientDate, 0).start;
};

const resolveUserPartyId = async (user: any): Promise<string | undefined> => {
  if (user.partyId) return user.partyId;
  if (user.role === 'party') {
    let party = await prisma.party.findFirst({ where: { userId: user.id } });
    if (!party && user.email) {
      party = await prisma.party.findFirst({ where: { email: user.email } });
    }
    if (party) {
      user.partyId = party.id;
      return party.id;
    }
  }
  return undefined;
};

const getPartyVoucherCondition = (partyId?: string) => {
  if (!partyId) return {};
  return {
    OR: [
      { partyId },
      { umrahCompanyId: partyId },
      { transportCompanyId: partyId },
      { booking: { partyId } },
      { booking: { umrahVisaProviderId: partyId } },
      { booking: { transportCompanyId: partyId } },
    ],
  };
};

const isPartyAuthorizedForVoucher = (voucher: any, partyId?: string) => {
  if (!partyId) return false;
  return (
    voucher.partyId === partyId ||
    voucher.umrahCompanyId === partyId ||
    voucher.transportCompanyId === partyId ||
    voucher.booking?.partyId === partyId ||
    voucher.booking?.umrahVisaProviderId === partyId ||
    voucher.booking?.transportCompanyId === partyId
  );
};

// Get all vouchers with pagination and filters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search = '', voucherNumber = '', dateFrom, dateTo, status = 'all' } = req.query;
    const user = req.user!;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    // If user is a party, only show their own vouchers
    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        conditions.push(getPartyVoucherCondition(pId));
      }
    }

    if (voucherNumber && (voucherNumber as string).trim()) {
      conditions.push({ voucherNumber: { contains: (voucherNumber as string).trim() } });
    }

    if (search && (search as string).trim()) {
      const searchStr = (search as string).trim();
      conditions.push({
        OR: [
          { voucherNumber: { contains: searchStr } },
          { guestName: { contains: searchStr } },
          { guestMobile: { contains: searchStr } },
          { groupCode: { contains: searchStr } },
          { bookingReference: { contains: searchStr } },
          { umrahCompany: { partyName: { contains: searchStr } } },
          { transportCompany: { partyName: { contains: searchStr } } },
          { party: { partyName: { contains: searchStr } } },
          { booking: { umrahVisaProvider: { partyName: { contains: searchStr } } } },
          { booking: { transportCompany: { partyName: { contains: searchStr } } } },
        ],
      });
    }

    if (dateFrom || dateTo) {
      conditions.push({
        reservationDate: {
          ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
          ...(dateTo ? { lte: new Date(dateTo as string) } : {}),
        },
      });
    }

    if (status && status !== 'all') {
      conditions.push({ status: status as string });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          generatedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          cancelledByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          umrahCompany: {
            select: { id: true, partyName: true, address: true, contactNumber: true, whatsappNumber: true, email: true, logoPath: true, partyCode: true }
          },
          party: {
            select: { id: true, partyName: true, partyCode: true, whatsappNumber: true, contactNumber: true }
          },
          transportCompany: {
            select: { id: true, partyName: true, partyCode: true }
          },
          booking: {
            select: {
              id: true,
              umrahVisaProviderId: true,
              transportCompanyId: true,
              umrahVisaProvider: {
                select: { id: true, partyName: true, address: true, contactNumber: true, whatsappNumber: true, email: true, logoPath: true, partyCode: true }
              },
              transportCompany: {
                select: { id: true, partyName: true, partyCode: true }
              }
            }
          },
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
      }),
      prisma.voucher.count({ where }),
    ]);

    const formattedVouchers = vouchers.map((v) => {
      const umrahCompany = v.umrahCompany || v.booking?.umrahVisaProvider || null;
      const transportCompany = v.transportCompany || v.booking?.transportCompany || null;
      return {
        ...v,
        status: v.status || 'active',
        umrahCompany,
        transportCompany,
      };
    });

    res.json({
      vouchers: formattedVouchers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get voucher stats
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { clientDate } = req.query;
    const { start: today, end: tomorrow } = getUtcDayRange(clientDate, 0);
    const { start: tomorrowStart, end: tomorrowEnd } = getUtcDayRange(clientDate, 1);
    const { start: dayAfterTomorrowStart, end: dayAfterTomorrowEnd } = getUtcDayRange(clientDate, 2);

    const whereVoucher: any = {};
    const whereMovement: any = {};

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        const partyCond = getPartyVoucherCondition(pId);
        whereVoucher.AND = [partyCond];
        whereMovement.voucher = partyCond;
      }
    }

    const [
      totalVouchers,
      activeVouchers,
      cancelledCompleteVouchers,
      cancelledArrivalVouchers,
      cancelledDepartureVouchers,
      todayMovements,
      tomorrowMovements,
      dayAfterTomorrowMovements,
    ] = await Promise.all([
      prisma.voucher.count({ where: whereVoucher }),
      prisma.voucher.count({
        where: {
          ...whereVoucher,
          status: 'active',
        },
      }),
      prisma.voucher.count({
        where: {
          ...whereVoucher,
          status: 'cancelled_complete',
        },
      }),
      prisma.voucher.count({
        where: {
          ...whereVoucher,
          status: 'cancelled_arrival',
        },
      }),
      prisma.voucher.count({
        where: {
          ...whereVoucher,
          status: 'cancelled_departure',
        },
      }),
      prisma.voucherMovement.count({
        where: {
          ...whereMovement,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.voucherMovement.count({
        where: {
          ...whereMovement,
          date: {
            gte: tomorrowStart,
            lt: tomorrowEnd,
          },
        },
      }),
      prisma.voucherMovement.count({
        where: {
          ...whereMovement,
          date: {
            gte: dayAfterTomorrowStart,
            lt: dayAfterTomorrowEnd,
          },
        },
      }),
    ]);

    res.json({
      totalVouchers,
      activeVouchers,
      cancelledCompleteVouchers,
      cancelledArrivalVouchers,
      cancelledDepartureVouchers,
      todayMovements,
      tomorrowMovements,
      dayAfterTomorrowMovements,
    });
  })
);

// Get today's movements
router.get(
  '/movements/today',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { from, to, page = '1', limit = '50', search = '', clientDate } = req.query;
    const { start: today, end: tomorrow } = getUtcDayRange(clientDate, 0);
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
        date: {
          gte: today,
          lt: tomorrow,
        },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    if (from) where.from = from as string;
    if (to) where.to = to as string;
    if (search) {
      where.OR = [
        { route: { contains: search as string } },
        { voucher: { guestName: { contains: search as string } } },
        { voucher: { voucherNumber: { contains: search as string } } },
      ];
    }

    const [movementsData, total] = await Promise.all([
      prisma.voucherMovement.findMany({
        where,
        skip,
        take: limitNum,
        include: { 
          voucher: {
            include: {
              umrahCompany: true,
              transportCompany: true,
              party: true,
              booking: {
                include: {
                  umrahVisaProvider: true,
                  transportCompany: true,
                  party: true,
                }
              }
            }
          } 
        },
        orderBy: { date: 'asc' },
      }),
      prisma.voucherMovement.count({ where }),
    ]);

    // Get all movements for vouchers in the current page to calculate correct indices
    const voucherIds = [...new Set(movementsData.map(m => m.voucherId))];
    const allVoucherMovements = await prisma.voucherMovement.findMany({
      where: { voucherId: { in: voucherIds } },
      orderBy: { sr: 'asc' },
    });

    const movementsByVoucher = new Map<string, any[]>();
    allVoucherMovements.forEach((movement) => {
      if (!movementsByVoucher.has(movement.voucherId)) {
        movementsByVoucher.set(movement.voucherId, []);
      }
      movementsByVoucher.get(movement.voucherId)!.push(movement);
    });

    const movements = movementsData.map((movement) => {
      const voucherMovements = movementsByVoucher.get(movement.voucherId) || [];
      const movementIndex = voucherMovements.findIndex((m) => m.id === movement.id);
      const umrahCompanyName = movement.voucher.umrahCompany?.partyName || movement.voucher.booking?.umrahVisaProvider?.partyName || '—';
      const transportCompanyName = movement.voucher.transportCompany?.partyName || movement.voucher.booking?.transportCompany?.partyName || '—';
      const paxCount = movement.paxCount || movement.voucher.paxCount || 0;

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        status: movement.voucher.status || 'active',
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.guestName || 'N/A',
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: paxCount,
        qty: paxCount,
        umrahCompany: umrahCompanyName,
        transportCompany: transportCompanyName,
        from: movement.from || '',
        fromLocation: movement.fromLocation || '',
        fromLocationId: movement.fromLocationId || null,
        to: movement.to || '',
        toLocation: movement.toLocation || '',
        toLocationId: movement.toLocationId || null,
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
        whatsappSent: movement.whatsappSent,
        partyEmail: '', // Vouchers are standalone, no booking connection
        partyWhatsApp: '', // Vouchers are standalone, no booking connection
      };
    });

    res.json({ 
      movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  })
);

// Get tomorrow's movements
router.get(
  '/movements/tomorrow',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { from, to, page = '1', limit = '50', search = '', clientDate } = req.query;
    const { start: tomorrow, end: dayAfterTomorrow } = getUtcDayRange(clientDate, 1);
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
        date: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    if (from) where.from = from as string;
    if (to) where.to = to as string;
    if (search) {
      where.OR = [
        { route: { contains: search as string } },
        { voucher: { guestName: { contains: search as string } } },
        { voucher: { voucherNumber: { contains: search as string } } },
      ];
    }

    const [movementsData, total] = await Promise.all([
      prisma.voucherMovement.findMany({
        where,
        skip,
        take: limitNum,
        include: { 
          voucher: {
            include: {
              umrahCompany: true,
              transportCompany: true,
              party: true,
              booking: {
                include: {
                  umrahVisaProvider: true,
                  transportCompany: true,
                  party: true,
                }
              }
            }
          } 
        },
        orderBy: { date: 'asc' },
      }),
      prisma.voucherMovement.count({ where }),
    ]);

    // Get all movements for vouchers in the current page to calculate correct indices
    const voucherIds = [...new Set(movementsData.map(m => m.voucherId))];
    const allVoucherMovements = await prisma.voucherMovement.findMany({
      where: { voucherId: { in: voucherIds } },
      orderBy: { sr: 'asc' },
    });

    const movementsByVoucher = new Map<string, any[]>();
    allVoucherMovements.forEach((movement) => {
      if (!movementsByVoucher.has(movement.voucherId)) {
        movementsByVoucher.set(movement.voucherId, []);
      }
      movementsByVoucher.get(movement.voucherId)!.push(movement);
    });

    const movements = movementsData.map((movement) => {
      const voucherMovements = movementsByVoucher.get(movement.voucherId) || [];
      const movementIndex = voucherMovements.findIndex((m) => m.id === movement.id);
      const umrahCompanyName = movement.voucher.umrahCompany?.partyName || movement.voucher.booking?.umrahVisaProvider?.partyName || '—';
      const transportCompanyName = movement.voucher.transportCompany?.partyName || movement.voucher.booking?.transportCompany?.partyName || '—';
      const paxCount = movement.paxCount || movement.voucher.paxCount || 0;

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        status: movement.voucher.status || 'active',
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.guestName || 'N/A',
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: paxCount,
        qty: paxCount,
        umrahCompany: umrahCompanyName,
        transportCompany: transportCompanyName,
        from: movement.from || '',
        fromLocation: movement.fromLocation || '',
        fromLocationId: movement.fromLocationId || null,
        to: movement.to || '',
        toLocation: movement.toLocation || '',
        toLocationId: movement.toLocationId || null,
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
        whatsappSent: movement.whatsappSent,
        partyEmail: '', // Vouchers are standalone, no booking connection
        partyWhatsApp: '', // Vouchers are standalone, no booking connection
      };
    });

    res.json({ 
      movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  })
);

// Get day after tomorrow's movements
router.get(
  '/movements/after-tomorrow',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { from, to, page = '1', limit = '50', search = '', clientDate } = req.query;
    const { start: dayAfterTomorrow, end: threeDaysFromNow } = getUtcDayRange(clientDate, 2);
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
        date: {
          gte: dayAfterTomorrow,
          lt: threeDaysFromNow,
        },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    if (from) where.from = from as string;
    if (to) where.to = to as string;
    if (search) {
      where.OR = [
        { route: { contains: search as string } },
        { voucher: { guestName: { contains: search as string } } },
        { voucher: { voucherNumber: { contains: search as string } } },
      ];
    }

    const [movementsData, total] = await Promise.all([
      prisma.voucherMovement.findMany({
        where,
        skip,
        take: limitNum,
        include: { 
          voucher: {
            include: {
              umrahCompany: true,
              transportCompany: true,
              party: true,
              booking: {
                include: {
                  umrahVisaProvider: true,
                  transportCompany: true,
                  party: true,
                }
              }
            }
          } 
        },
        orderBy: { date: 'asc' },
      }),
      prisma.voucherMovement.count({ where }),
    ]);

    // Get all movements for vouchers in the current page to calculate correct indices
    const voucherIds = [...new Set(movementsData.map(m => m.voucherId))];
    const allVoucherMovements = await prisma.voucherMovement.findMany({
      where: { voucherId: { in: voucherIds } },
      orderBy: { sr: 'asc' },
    });

    const movementsByVoucher = new Map<string, any[]>();
    allVoucherMovements.forEach((movement) => {
      if (!movementsByVoucher.has(movement.voucherId)) {
        movementsByVoucher.set(movement.voucherId, []);
      }
      movementsByVoucher.get(movement.voucherId)!.push(movement);
    });

    const movements = movementsData.map((movement) => {
      const voucherMovements = movementsByVoucher.get(movement.voucherId) || [];
      const movementIndex = voucherMovements.findIndex((m) => m.id === movement.id);
      const umrahCompanyName = movement.voucher.umrahCompany?.partyName || movement.voucher.booking?.umrahVisaProvider?.partyName || '—';
      const transportCompanyName = movement.voucher.transportCompany?.partyName || movement.voucher.booking?.transportCompany?.partyName || '—';
      const paxCount = movement.paxCount || movement.voucher.paxCount || 0;

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        status: movement.voucher.status || 'active',
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.guestName || 'N/A',
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: paxCount,
        qty: paxCount,
        umrahCompany: umrahCompanyName,
        transportCompany: transportCompanyName,
        from: movement.from || '',
        fromLocation: movement.fromLocation || '',
        fromLocationId: movement.fromLocationId || null,
        to: movement.to || '',
        toLocation: movement.toLocation || '',
        toLocationId: movement.toLocationId || null,
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
        whatsappSent: movement.whatsappSent,
        partyEmail: '', // Vouchers are standalone, no booking connection
        partyWhatsApp: '', // Vouchers are standalone, no booking connection
      };
    });

    res.json({ 
      movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  })
);

// Get movements by specific date
router.get(
  '/movements/by-date',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { date, from, to, page = '1', limit = '50', search = '' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const { start: targetDate, end: nextDay } = getUtcDayRange(date as string, 0);
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
        date: {
          gte: targetDate,
          lt: nextDay,
        },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    if (from) where.from = from as string;
    if (to) where.to = to as string;
    if (search) {
      where.OR = [
        { route: { contains: search as string } },
        { voucher: { guestName: { contains: search as string } } },
        { voucher: { voucherNumber: { contains: search as string } } },
      ];
    }

    const [movementsData, total] = await Promise.all([
      prisma.voucherMovement.findMany({
        where,
        skip,
        take: limitNum,
        include: { 
          voucher: {
            include: {
              umrahCompany: true,
              transportCompany: true,
              party: true,
              booking: {
                include: {
                  umrahVisaProvider: true,
                  transportCompany: true,
                  party: true,
                }
              }
            }
          } 
        },
        orderBy: { date: 'asc' },
      }),
      prisma.voucherMovement.count({ where }),
    ]);

    // Get all movements for vouchers in the current page to calculate correct indices
    const voucherIds = [...new Set(movementsData.map(m => m.voucherId))];
    const allVoucherMovements = await prisma.voucherMovement.findMany({
      where: { voucherId: { in: voucherIds } },
      orderBy: { sr: 'asc' },
    });

    const movementsByVoucher = new Map<string, any[]>();
    allVoucherMovements.forEach((movement) => {
      if (!movementsByVoucher.has(movement.voucherId)) {
        movementsByVoucher.set(movement.voucherId, []);
      }
      movementsByVoucher.get(movement.voucherId)!.push(movement);
    });

    const movements = movementsData.map((movement) => {
      const voucherMovements = movementsByVoucher.get(movement.voucherId) || [];
      const movementIndex = voucherMovements.findIndex((m) => m.id === movement.id);
      const umrahCompanyName = movement.voucher.umrahCompany?.partyName || movement.voucher.booking?.umrahVisaProvider?.partyName || '—';
      const transportCompanyName = movement.voucher.transportCompany?.partyName || movement.voucher.booking?.transportCompany?.partyName || '—';
      const paxCount = movement.paxCount || movement.voucher.paxCount || 0;

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        status: movement.voucher.status || 'active',
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.guestName || 'N/A',
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: paxCount,
        qty: paxCount,
        umrahCompany: umrahCompanyName,
        transportCompany: transportCompanyName,
        from: movement.from || '',
        fromLocation: movement.fromLocation || '',
        fromLocationId: movement.fromLocationId || null,
        to: movement.to || '',
        toLocation: movement.toLocation || '',
        toLocationId: movement.toLocationId || null,
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
        whatsappSent: movement.whatsappSent,
        partyEmail: '', // Vouchers are standalone, no booking connection
        partyWhatsApp: '', // Vouchers are standalone, no booking connection
      };
    });

    res.json({ 
      movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  })
);

// Get filter options (unique from/to values)
router.get(
  '/movements/filter-options',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const where: any = { from: { not: '' } };
    const whereTo: any = { to: { not: '' } };
    
    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        const partyCond = getPartyVoucherCondition(pId);
        where.voucher = partyCond;
        whereTo.voucher = partyCond;
      }
    }

    const fromOptions = await prisma.voucherMovement.findMany({
      select: {
        from: true,
      },
      distinct: ['from'],
      where,
      orderBy: {
        from: 'asc',
      },
    });

    const toOptions = await prisma.voucherMovement.findMany({
      select: {
        to: true,
      },
      distinct: ['to'],
      where: whereTo,
      orderBy: {
        to: 'asc',
      },
    });

    res.json({
      fromOptions: fromOptions.map((item) => item.from).filter(Boolean),
      toOptions: toOptions.map((item) => item.to).filter(Boolean),
    });
  })
);

// Get today's movement statistics
router.get(
  '/movements/stats/today',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { clientDate } = req.query;
    const { start: today, end: tomorrow } = getUtcDayRange(clientDate, 0);

    const where: any = {
      date: {
        gte: today,
        lt: tomorrow,
      },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    const movementsData = await prisma.voucherMovement.findMany({
      where,
      select: {
        from: true,
        to: true,
      },
    });

    // Group by from/to combination and count
    const statsMap = new Map<string, number>();
    let makkahMovements = 0;
    let madinahMovements = 0;

    movementsData.forEach((movement) => {
      const fromStr = movement.from || 'N/A';
      const toStr = movement.to || 'N/A';
      const key = `${fromStr}|||${toStr}`;
      statsMap.set(key, (statsMap.get(key) || 0) + 1);
      
      const fromCity = fromStr.toUpperCase();
      const toCity = toStr.toUpperCase();
      if (fromCity.includes('MAKKAH') || toCity.includes('MAKKAH') || fromCity.includes('MECCA') || toCity.includes('MECCA')) {
        makkahMovements++;
      }
      if (fromCity.includes('MADINAH') || toCity.includes('MADINAH') || fromCity.includes('MEDINA') || toCity.includes('MEDINA')) {
        madinahMovements++;
      }
    });

    const stats = Array.from(statsMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    });

    res.json({
      stats,
      totalEntries: movementsData.length,
      makkahMovements,
      madinahMovements,
    });
  })
);

// Get tomorrow's movement statistics
router.get(
  '/movements/stats/tomorrow',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { clientDate } = req.query;
    const { start: tomorrow, end: dayAfterTomorrow } = getUtcDayRange(clientDate, 1);

    const where: any = {
      date: {
        gte: tomorrow,
        lt: dayAfterTomorrow,
      },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    const movementsData = await prisma.voucherMovement.findMany({
      where,
      select: {
        from: true,
        to: true,
      },
    });

    // Group by from/to combination and count
    const statsMap = new Map<string, number>();
    let makkahMovements = 0;
    let madinahMovements = 0;

    movementsData.forEach((movement) => {
      const fromStr = movement.from || 'N/A';
      const toStr = movement.to || 'N/A';
      const key = `${fromStr}|||${toStr}`;
      statsMap.set(key, (statsMap.get(key) || 0) + 1);
      
      const fromCity = fromStr.toUpperCase();
      const toCity = toStr.toUpperCase();
      if (fromCity.includes('MAKKAH') || toCity.includes('MAKKAH') || fromCity.includes('MECCA') || toCity.includes('MECCA')) {
        makkahMovements++;
      }
      if (fromCity.includes('MADINAH') || toCity.includes('MADINAH') || fromCity.includes('MEDINA') || toCity.includes('MEDINA')) {
        madinahMovements++;
      }
    });

    const stats = Array.from(statsMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    });

    res.json({
      stats,
      totalEntries: movementsData.length,
      makkahMovements,
      madinahMovements,
    });
  })
);

// Get day after tomorrow's movement statistics
router.get(
  '/movements/stats/after-tomorrow',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { clientDate } = req.query;
    const { start: dayAfterTomorrow, end: threeDaysFromNow } = getUtcDayRange(clientDate, 2);

    const where: any = {
      date: {
        gte: dayAfterTomorrow,
        lt: threeDaysFromNow,
      },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    const movementsData = await prisma.voucherMovement.findMany({
      where,
      select: {
        from: true,
        to: true,
      },
    });

    // Group by from/to combination and count
    const statsMap = new Map<string, number>();
    let makkahMovements = 0;
    let madinahMovements = 0;

    movementsData.forEach((movement) => {
      const fromStr = movement.from || 'N/A';
      const toStr = movement.to || 'N/A';
      const key = `${fromStr}|||${toStr}`;
      statsMap.set(key, (statsMap.get(key) || 0) + 1);
      
      const fromCity = fromStr.toUpperCase();
      const toCity = toStr.toUpperCase();
      if (fromCity.includes('MAKKAH') || toCity.includes('MAKKAH') || fromCity.includes('MECCA') || toCity.includes('MECCA')) {
        makkahMovements++;
      }
      if (fromCity.includes('MADINAH') || toCity.includes('MADINAH') || fromCity.includes('MEDINA') || toCity.includes('MEDINA')) {
        madinahMovements++;
      }
    });

    const stats = Array.from(statsMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    });

    res.json({
      stats,
      totalEntries: movementsData.length,
      makkahMovements,
      madinahMovements,
    });
  })
);

// Get movement statistics by specific date
router.get(
  '/movements/stats/by-date',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const { start: targetDate, end: nextDay } = getUtcDayRange(date as string, 0);

    const where: any = {
      date: {
        gte: targetDate,
        lt: nextDay,
      },
    };

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (pId) {
        where.voucher = getPartyVoucherCondition(pId);
      }
    }

    const movementsData = await prisma.voucherMovement.findMany({
      where,
      select: {
        from: true,
        to: true,
      },
    });

    // Group by from/to combination and count
    const statsMap = new Map<string, number>();
    let makkahMovements = 0;
    let madinahMovements = 0;

    movementsData.forEach((movement) => {
      const fromStr = movement.from || 'N/A';
      const toStr = movement.to || 'N/A';
      const key = `${fromStr}|||${toStr}`;
      statsMap.set(key, (statsMap.get(key) || 0) + 1);

      const fromCity = fromStr.toUpperCase();
      const toCity = toStr.toUpperCase();
      if (fromCity.includes('MAKKAH') || toCity.includes('MAKKAH') || fromCity.includes('MECCA') || toCity.includes('MECCA')) {
        makkahMovements++;
      }
      if (fromCity.includes('MADINAH') || toCity.includes('MADINAH') || fromCity.includes('MEDINA') || toCity.includes('MEDINA')) {
        madinahMovements++;
      }
    });

    const stats = Array.from(statsMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    });

    res.json({
      stats,
      totalEntries: movementsData.length,
      makkahMovements,
      madinahMovements,
    });
  })
);


// Generate unique request number for Quick Voucher Requests
const generateRequestNumber = async (tx: any = prisma): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `QVR-${currentYear}-`;

  const lastReq = await tx.quickVoucherRequest.findFirst({
    where: {
      requestNumber: { startsWith: prefix },
    },
    orderBy: { createdAt: 'desc' },
  });

  let nextSeq = 1;
  if (lastReq && lastReq.requestNumber) {
    const parts = lastReq.requestNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

// Create quick voucher (or quick voucher request if called by party / agency)
router.post(
  '/quick',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const isAgency = user.role === 'party';

    const {
      guestName,
      guestMobile,
      groupCode,
      paxCount,
      reservationDate,
      partyId,
      umrahCompanyId,
      transportCompanyId,
      hotelSchedules,
      movementDetails,
      flightDetails,
      transportOptions,
      notes,
    } = req.body;

    if (!guestName || !paxCount) {
      return res.status(400).json({ error: 'Guest name and passenger count are required' });
    }

    const cleanedGroupCode = typeof groupCode === 'string' ? groupCode.trim() : '';

    // If user is a party (customer / agency), create a Pending Request (DO NOT allocate voucher number)
    if (isAgency) {
      let party = await prisma.party.findFirst({
        where: { userId: user.id },
      });
      if (!party && user.email) {
        party = await prisma.party.findFirst({
          where: { email: user.email },
        });
      }

      if (!party) {
        return res.status(400).json({ error: 'Agency party profile not found for this account' });
      }

      const requestNumber = await generateRequestNumber();

      const newRequest = await prisma.quickVoucherRequest.create({
        data: {
          requestNumber,
          status: 'pending',
          guestName,
          guestMobile: guestMobile || null,
          groupCode: cleanedGroupCode || null,
          paxCount: parseInt(String(paxCount), 10) || 1,
          reservationDate: reservationDate ? new Date(reservationDate) : new Date(),
          partyId: party.id,
          umrahCompanyId: umrahCompanyId || null,
          transportCompanyId: transportCompanyId || null,
          hotelSchedules: hotelSchedules || [],
          movementDetails: movementDetails || [],
          flightDetails: flightDetails || [],
          transportOptions: transportOptions || [],
          notes: notes || null,
          requestedBy: user.id,
        },
        include: {
          party: {
            select: { id: true, partyName: true, partyCode: true, contactNumber: true, email: true },
          },
          transportCompany: {
            select: { id: true, partyName: true, partyCode: true },
          },
        },
      });

      return res.status(201).json({
        success: true,
        isRequest: true,
        message: `Quick voucher request #${requestNumber} submitted successfully. It is currently pending admin approval.`,
        request: newRequest,
      });
    }

    // Otherwise, user is admin/staff: generate confirmed Voucher immediately
    if (cleanedGroupCode) {
      // Validate that no voucher already exists with this group code
      const existingVoucherWithGroup = await prisma.voucher.findFirst({
        where: { groupCode: cleanedGroupCode },
        select: { id: true, voucherNumber: true, bookingReference: true },
      });

      if (existingVoucherWithGroup) {
        return res.status(400).json({
          error: `A voucher with Group Code "${cleanedGroupCode}" already exists (Voucher #${existingVoucherWithGroup.voucherNumber}${existingVoucherWithGroup.bookingReference ? ` for booking ${existingVoucherWithGroup.bookingReference}` : ''}). Duplicate vouchers on the same group code are not allowed.`,
        });
      }
    }

    // Auto-link to booking if a booking exists with this group code
    let matchingBooking: any = null;
    if (cleanedGroupCode) {
      matchingBooking = await prisma.umrahVisaBooking.findFirst({
        where: {
          groupNumber: cleanedGroupCode,
          isDeleted: false,
        },
        select: { id: true, bookingReference: true, partyId: true, umrahVisaProviderId: true },
      });
    }

    const voucher = await prisma.$transaction(async (tx) => {
      const voucherNumber = await generateVoucherNumber(tx); // Voucher number is used as reservation number

      // Generate route numbers dynamically from the last route number in database
      const movementCount = movementDetails && Array.isArray(movementDetails) ? movementDetails.length : 0;
      const routeNumbers = movementCount > 0 
        ? await generateRouteNumbersForVoucher(movementCount, tx)
        : [];

      // Create voucher
      const newVoucher = await tx.voucher.create({
        data: {
          voucherNumber,
          reservationDate: reservationDate ? new Date(reservationDate) : new Date(),
          guestName,
          guestMobile: guestMobile || null,
          groupCode: cleanedGroupCode || null,
          paxCount: parseInt(String(paxCount), 10) || 1,
          partyId: partyId || matchingBooking?.partyId || null,
          umrahCompanyId: umrahCompanyId || matchingBooking?.umrahVisaProviderId || null,
          transportCompanyId: transportCompanyId || null,
          generatedBy: user.id,
          bookingId: matchingBooking?.id || null,
          bookingReference: matchingBooking?.bookingReference || null,
          isQuickVoucher: true,
        },
      });

      // Create movements with dynamically generated route numbers
      if (movementDetails && Array.isArray(movementDetails)) {
        await Promise.all(
          movementDetails.map((movement: any, index: number) => {
            const moveDate = movement.date ? new Date(movement.date) : new Date();
            const validMoveDate = isNaN(moveDate.getTime()) ? new Date() : moveDate;

            return tx.voucherMovement.create({
              data: {
                voucherId: newVoucher.id,
                sr: movement.sr || index + 1,
                route: routeNumbers[index] || null, // Use generated route number
                date: validMoveDate,
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
            });
          })
        );
      }

      // Create hotels
      if (hotelSchedules && Array.isArray(hotelSchedules)) {
        await Promise.all(
          hotelSchedules.map((hotel: any) => {
            // Handle BRN: convert array to comma-separated string if needed
            let brnValue: string | null = null;
            if (hotel.brn) {
              if (Array.isArray(hotel.brn)) {
                brnValue = hotel.brn.length > 0 ? hotel.brn.join(', ') : null;
              } else if (typeof hotel.brn === 'string') {
                brnValue = hotel.brn;
              }
            }
            
            const inDate = hotel.checkIn ? new Date(hotel.checkIn) : new Date();
            const outDate = hotel.checkOut ? new Date(hotel.checkOut) : new Date();
            const validInDate = isNaN(inDate.getTime()) ? new Date() : inDate;
            const validOutDate = isNaN(outDate.getTime()) ? new Date() : outDate;

            return tx.voucherHotel.create({
              data: {
                voucherId: newVoucher.id,
                number: hotel.number || 0,
                location: hotel.location || '',
                hotelName: hotel.hotelName || '',
                checkIn: validInDate,
                checkOut: validOutDate,
                days: hotel.days || 0,
                brn: brnValue,
              },
            });
          })
        );
      }

      // Create flights
      if (flightDetails && Array.isArray(flightDetails)) {
        await Promise.all(
          flightDetails.map((flight: any) => {
            const airport = flight.type === 'AA' 
              ? (flight.arrivalAirport || flight.from || '')
              : (flight.departureAirport || flight.to || '');
            
            const flightDate = flight.date ? new Date(flight.date) : new Date();
            const validFlightDate = isNaN(flightDate.getTime()) ? new Date() : flightDate;

            return tx.voucherFlight.create({
              data: {
                voucherId: newVoucher.id,
                type: String(flight.type || 'AA').substring(0, 10),
                carrier: String(flight.carrier || '').substring(0, 50),
                number: String(flight.number || '').substring(0, 50),
                date: validFlightDate,
                from: flight.type === 'AA' ? String(airport).substring(0, 50) : 'JED',
                to: flight.type === 'AD' ? String(airport).substring(0, 50) : 'JED',
                etd: flight.etd ? String(flight.etd).substring(0, 20) : null,
                eta: flight.eta ? String(flight.eta).substring(0, 20) : null,
              },
            });
          })
        );
      }

      return newVoucher;
    });

    // Asynchronously dispatch notifications (Email + WhatsApp with PDF) to Agency and Supplier
    const { dispatchVoucherIssuedAlerts } = await import('../services/voucherNotificationService');
    dispatchVoucherIssuedAlerts({
      voucherId: voucher.id,
      notifyAgency: true,
      notifySupplier: true,
    }).catch(err => console.error('[VOUCHER-CREATE] Notification dispatch error:', err));

    res.status(201).json({ voucher });
  })
);

// Get Quick Voucher Requests (Pending / Approved / Rejected)
router.get(
  '/quick-requests',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const isAgency = user.role === 'party';
    const { status, search, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (isAgency) {
      let party = await prisma.party.findFirst({
        where: { userId: user.id },
      });
      if (!party && user.email) {
        party = await prisma.party.findFirst({
          where: { email: user.email },
        });
      }
      where.partyId = party ? party.id : 'no-party-found';
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = search.trim();
      where.OR = [
        { requestNumber: { contains: searchStr } },
        { guestName: { contains: searchStr } },
        { guestMobile: { contains: searchStr } },
        { groupCode: { contains: searchStr } },
        { party: { partyName: { contains: searchStr } } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.quickVoucherRequest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          party: {
            select: { id: true, partyName: true, partyCode: true, contactNumber: true, email: true },
          },
          transportCompany: {
            select: { id: true, partyName: true, partyCode: true },
          },
          requestedByUser: {
            select: { id: true, name: true, email: true },
          },
          reviewedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.quickVoucherRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  })
);

// Get single Quick Voucher Request by ID
router.get(
  '/quick-requests/:id',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const request = await prisma.quickVoucherRequest.findUnique({
      where: { id },
      include: {
        party: true,
        transportCompany: true,
        requestedByUser: { select: { id: true, name: true, email: true } },
        reviewedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Quick voucher request not found' });
    }

    if (user.role === 'party') {
      let party = await prisma.party.findFirst({ where: { userId: user.id } });
      if (!party && user.email) {
        party = await prisma.party.findFirst({ where: { email: user.email } });
      }
      if (!party || request.partyId !== party.id) {
        return res.status(403).json({ error: 'Unauthorized to view this request' });
      }
    }

    res.json({ success: true, request });
  })
);

// Approve Quick Voucher Request & Generate Voucher (Admin / Staff only)
router.post(
  '/quick-requests/:id/approve',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const existingRequest = await prisma.quickVoucherRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Quick voucher request not found' });
    }

    if (existingRequest.status === 'approved') {
      return res.status(400).json({ error: 'This request has already been approved' });
    }

    // Allow payload overrides if admin made edits in the review dialog
    const guestName = req.body.guestName || existingRequest.guestName;
    const guestMobile = req.body.guestMobile !== undefined ? req.body.guestMobile : existingRequest.guestMobile;
    const groupCode = req.body.groupCode !== undefined ? req.body.groupCode : existingRequest.groupCode;
    const paxCount = parseInt(String(req.body.paxCount || existingRequest.paxCount), 10) || 1;
    const reservationDate = req.body.reservationDate || existingRequest.reservationDate;
    const partyId = req.body.partyId || existingRequest.partyId;
    const umrahCompanyId = req.body.umrahCompanyId !== undefined ? req.body.umrahCompanyId : existingRequest.umrahCompanyId;
    const transportCompanyId = req.body.transportCompanyId || existingRequest.transportCompanyId;
    const hotelSchedules = req.body.hotelSchedules !== undefined ? req.body.hotelSchedules : existingRequest.hotelSchedules;
    const movementDetails = req.body.movementDetails !== undefined ? req.body.movementDetails : existingRequest.movementDetails;
    const flightDetails = req.body.flightDetails !== undefined ? req.body.flightDetails : existingRequest.flightDetails;

    const cleanedGroupCode = typeof groupCode === 'string' ? groupCode.trim() : '';

    if (cleanedGroupCode) {
      const existingVoucherWithGroup = await prisma.voucher.findFirst({
        where: { groupCode: cleanedGroupCode },
        select: { id: true, voucherNumber: true, bookingReference: true },
      });

      if (existingVoucherWithGroup) {
        return res.status(400).json({
          error: `A voucher with Group Code "${cleanedGroupCode}" already exists (Voucher #${existingVoucherWithGroup.voucherNumber}).`,
        });
      }
    }

    // Auto-link to booking if exists
    let matchingBooking: any = null;
    if (cleanedGroupCode) {
      matchingBooking = await prisma.umrahVisaBooking.findFirst({
        where: {
          groupNumber: cleanedGroupCode,
          isDeleted: false,
        },
        select: { id: true, bookingReference: true, partyId: true, umrahVisaProviderId: true },
      });
    }

    const { voucher, updatedRequest } = await prisma.$transaction(async (tx) => {
      const voucherNumber = await generateVoucherNumber(tx);

      const movementCount = movementDetails && Array.isArray(movementDetails) ? movementDetails.length : 0;
      const routeNumbers = movementCount > 0 
        ? await generateRouteNumbersForVoucher(movementCount, tx)
        : [];

      const newVoucher = await tx.voucher.create({
        data: {
          voucherNumber,
          reservationDate: reservationDate ? new Date(reservationDate) : new Date(),
          guestName,
          guestMobile: guestMobile || null,
          groupCode: cleanedGroupCode || null,
          paxCount,
          partyId: partyId || matchingBooking?.partyId || null,
          umrahCompanyId: umrahCompanyId || matchingBooking?.umrahVisaProviderId || null,
          transportCompanyId: transportCompanyId || null,
          generatedBy: user.id,
          bookingId: matchingBooking?.id || null,
          bookingReference: matchingBooking?.bookingReference || null,
          isQuickVoucher: true,
          quickVoucherRequestId: existingRequest.id,
        },
      });

      // Create movements
      if (movementDetails && Array.isArray(movementDetails)) {
        await Promise.all(
          movementDetails.map((movement: any, index: number) => {
            const moveDate = movement.date ? new Date(movement.date) : new Date();
            const validMoveDate = isNaN(moveDate.getTime()) ? new Date() : moveDate;

            return tx.voucherMovement.create({
              data: {
                voucherId: newVoucher.id,
                sr: movement.sr || index + 1,
                route: routeNumbers[index] || null,
                date: validMoveDate,
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
            });
          })
        );
      }

      // Create hotels
      if (hotelSchedules && Array.isArray(hotelSchedules)) {
        await Promise.all(
          hotelSchedules.map((hotel: any) => {
            let brnValue: string | null = null;
            if (hotel.brn) {
              if (Array.isArray(hotel.brn)) {
                brnValue = hotel.brn.length > 0 ? hotel.brn.join(', ') : null;
              } else if (typeof hotel.brn === 'string') {
                brnValue = hotel.brn;
              }
            }
            
            const inDate = hotel.checkIn ? new Date(hotel.checkIn) : new Date();
            const outDate = hotel.checkOut ? new Date(hotel.checkOut) : new Date();
            const validInDate = isNaN(inDate.getTime()) ? new Date() : inDate;
            const validOutDate = isNaN(outDate.getTime()) ? new Date() : outDate;

            return tx.voucherHotel.create({
              data: {
                voucherId: newVoucher.id,
                number: hotel.number || 0,
                location: hotel.location || '',
                hotelName: hotel.hotelName || '',
                checkIn: validInDate,
                checkOut: validOutDate,
                days: hotel.days || 0,
                brn: brnValue,
              },
            });
          })
        );
      }

      // Create flights
      if (flightDetails && Array.isArray(flightDetails)) {
        await Promise.all(
          flightDetails.map((flight: any) => {
            const airport = flight.type === 'AA' 
              ? (flight.arrivalAirport || flight.from || '')
              : (flight.departureAirport || flight.to || '');
            
            const flightDate = flight.date ? new Date(flight.date) : new Date();
            const validFlightDate = isNaN(flightDate.getTime()) ? new Date() : flightDate;

            return tx.voucherFlight.create({
              data: {
                voucherId: newVoucher.id,
                type: String(flight.type || 'AA').substring(0, 10),
                carrier: String(flight.carrier || '').substring(0, 50),
                number: String(flight.number || '').substring(0, 50),
                date: validFlightDate,
                from: flight.type === 'AA' ? String(airport).substring(0, 50) : 'JED',
                to: flight.type === 'AD' ? String(airport).substring(0, 50) : 'JED',
                etd: flight.etd ? String(flight.etd).substring(0, 20) : null,
                eta: flight.eta ? String(flight.eta).substring(0, 20) : null,
              },
            });
          })
        );
      }

      // Update QuickVoucherRequest
      const reqUpdated = await tx.quickVoucherRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: 'approved',
          voucherId: newVoucher.id,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          guestName,
          guestMobile: guestMobile || null,
          groupCode: cleanedGroupCode || null,
          paxCount,
          reservationDate: reservationDate ? new Date(reservationDate) : new Date(),
          partyId,
          transportCompanyId,
          umrahCompanyId: umrahCompanyId || null,
          hotelSchedules: hotelSchedules || [],
          movementDetails: movementDetails || [],
          flightDetails: flightDetails || [],
        },
      });

      return { voucher: newVoucher, updatedRequest: reqUpdated };
    });

    // Asynchronously dispatch notifications (Email + WhatsApp with PDF) to Agency and Supplier
    const { dispatchVoucherIssuedAlerts } = await import('../services/voucherNotificationService');
    dispatchVoucherIssuedAlerts({
      voucherId: voucher.id,
      notifyAgency: true,
      notifySupplier: true,
    }).catch(err => console.error('[QUICK-VOUCHER-APPROVE] Notification dispatch error:', err));

    res.json({
      success: true,
      message: `Quick Voucher #${voucher.voucherNumber} approved and finalized successfully!`,
      voucher,
      request: updatedRequest,
    });
  })
);

// Reject Quick Voucher Request (Admin / Staff only)
router.post(
  '/quick-requests/:id/reject',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const user = req.user!;

    const existing = await prisma.quickVoucherRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quick voucher request not found' });
    }

    const updated = await prisma.quickVoucherRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason || null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Quick voucher request #${existing.requestNumber} rejected`,
      request: updated,
    });
  })
);

// Delete / Cancel Quick Voucher Request
router.delete(
  '/quick-requests/:id',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const existing = await prisma.quickVoucherRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quick voucher request not found' });
    }

    if (user.role === 'party') {
      let party = await prisma.party.findFirst({ where: { userId: user.id } });
      if (!party && user.email) {
        party = await prisma.party.findFirst({ where: { email: user.email } });
      }
      if (!party || existing.partyId !== party.id) {
        return res.status(403).json({ error: 'Unauthorized to delete this request' });
      }
      if (existing.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      }
    }

    await prisma.quickVoucherRequest.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Quick voucher request deleted successfully',
    });
  })
);

// Get single voucher by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        generatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cancelledByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        umrahCompany: {
          select: { id: true, partyName: true, address: true, contactNumber: true, whatsappNumber: true, email: true, logoPath: true, partyCode: true }
        },
        party: {
          select: { id: true, partyName: true, partyCode: true, whatsappNumber: true, contactNumber: true }
        },
        transportCompany: {
          select: { id: true, partyName: true, partyCode: true }
        },
        booking: {
          select: {
            id: true,
            umrahVisaProviderId: true,
            transportCompanyId: true,
            umrahVisaProvider: {
              select: { id: true, partyName: true, address: true, contactNumber: true, whatsappNumber: true, email: true, logoPath: true, partyCode: true }
            },
            transportCompany: {
              select: { id: true, partyName: true, partyCode: true }
            }
          }
        },
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

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Access control for party role
    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (!isPartyAuthorizedForVoucher(voucher, pId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const umrahCompany = voucher.umrahCompany || voucher.booking?.umrahVisaProvider || null;
    const transportCompany = voucher.transportCompany || voucher.booking?.transportCompany || null;

    // Transform normalized data to match frontend expectations (for backward compatibility)
    const voucherResponse = {
      ...voucher,
      umrahCompany,
      transportCompany,
      bookingReference: voucher.bookingReference || '',
      movementDetails: voucher.movements.map((m) => ({
        sr: m.sr,
        route: m.route || '',
        date: m.date.toISOString().split('T')[0],
        time: m.time,
        from: m.from,
        fromLocation: m.fromLocation,
        fromLocationId: m.fromLocationId,
        to: m.to,
        toLocation: m.toLocation,
        toLocationId: m.toLocationId,
        driverDetails1: m.driverDetails1,
        driverDetails2: m.driverDetails2,
        vehicleNumber: m.vehicleNumber,
        whatsappSent: m.whatsappSent,
        paxCount: m.paxCount,
        price: m.price,
        vehicleType: m.vehicleType,
      })),
      hotelSchedules: voucher.hotels.map((h) => ({
        number: h.number,
        location: h.location,
        hotelName: h.hotelName,
        checkIn: h.checkIn.toISOString().split('T')[0],
        checkOut: h.checkOut.toISOString().split('T')[0],
        days: h.days,
        brn: h.brn,
      })),
      flightDetails: voucher.flights.map((f) => ({
        type: f.type,
        carrier: f.carrier,
        number: f.number,
        date: f.date.toISOString().split('T')[0],
        from: f.from,
        to: f.to,
        etd: f.etd,
        eta: f.eta,
      })),
    };

    res.json({ voucher: voucherResponse });
  })
);

// Update voucher
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      guestName,
      guestMobile,
      groupCode,
      paxCount,
      reservationDate,
      hotelSchedules,
      movementDetails,
      flightDetails,
      transportCompanyId,
      partyId,
      umrahCompanyId,
    } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const cleanedGroupCode = typeof groupCode === 'string' ? groupCode.trim() : (groupCode || '');
    if (cleanedGroupCode) {
      const duplicate = await prisma.voucher.findFirst({
        where: {
          groupCode: cleanedGroupCode,
          id: { not: id },
        },
        select: { id: true, voucherNumber: true, bookingReference: true },
      });
      if (duplicate) {
        return res.status(400).json({
          error: `Group Code "${cleanedGroupCode}" is already assigned to Voucher #${duplicate.voucherNumber}${duplicate.bookingReference ? ` (Booking: ${duplicate.bookingReference})` : ''}. Duplicate group codes are not allowed.`,
        });
      }
    }

    const updatedVoucher = await prisma.$transaction(async (tx) => {
      // Update voucher basic fields
      const updated = await tx.voucher.update({
        where: { id },
        data: {
          ...(guestName !== undefined && { guestName }),
          ...(guestMobile !== undefined && { guestMobile: guestMobile || null }),
          ...(groupCode !== undefined && { groupCode: groupCode || null }),
          ...(paxCount !== undefined && { paxCount }),
          ...(reservationDate !== undefined && { reservationDate: new Date(reservationDate) }),
          ...(transportCompanyId !== undefined && { transportCompanyId: transportCompanyId || null }),
          ...(partyId !== undefined && { partyId: partyId || null }),
          ...(umrahCompanyId !== undefined && { umrahCompanyId: umrahCompanyId || null }),
          version: voucher.version + 1,
        },
      });

      // Update movements if provided
      if (movementDetails !== undefined && Array.isArray(movementDetails)) {
        // Delete existing movements
        await tx.voucherMovement.deleteMany({ where: { voucherId: id } });
        // Create new movements
        await Promise.all(
          movementDetails.map((movement: any) => {
            const moveDate = movement.date ? new Date(movement.date) : new Date();
            const validMoveDate = isNaN(moveDate.getTime()) ? new Date() : moveDate;
            
            return tx.voucherMovement.create({
              data: {
                voucherId: id,
                sr: movement.sr || 0,
                route: movement.route || null,
                date: validMoveDate,
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
            });
          })
        );
      }

      // Update hotels if provided
      if (hotelSchedules !== undefined && Array.isArray(hotelSchedules)) {
        // Delete existing hotels
        await tx.voucherHotel.deleteMany({ where: { voucherId: id } });
        // Create new hotels
        await Promise.all(
          hotelSchedules.map((hotel: any) => {
            // Handle BRN: convert array to comma-separated string if needed
            let brnValue: string | null = null;
            if (hotel.brn) {
              if (Array.isArray(hotel.brn)) {
                brnValue = hotel.brn.length > 0 ? hotel.brn.join(', ') : null;
              } else if (typeof hotel.brn === 'string') {
                brnValue = hotel.brn;
              }
            }
            
            const inDate = hotel.checkIn ? new Date(hotel.checkIn) : new Date();
            const outDate = hotel.checkOut ? new Date(hotel.checkOut) : new Date();
            const validInDate = isNaN(inDate.getTime()) ? new Date() : inDate;
            const validOutDate = isNaN(outDate.getTime()) ? new Date() : outDate;

            return tx.voucherHotel.create({
              data: {
                voucherId: id,
                number: hotel.number || 0,
                location: hotel.location || '',
                hotelName: hotel.hotelName || '',
                checkIn: validInDate,
                checkOut: validOutDate,
                days: hotel.days || 0,
                brn: brnValue,
              },
            });
          })
        );
      }

      // Update flights if provided
      if (flightDetails !== undefined && Array.isArray(flightDetails)) {
        // Delete existing flights
        await tx.voucherFlight.deleteMany({ where: { voucherId: id } });
        // Create new flights
        await Promise.all(
          flightDetails.map((flight: any) => {
            const flightDate = flight.date ? new Date(flight.date) : new Date();
            const validFlightDate = isNaN(flightDate.getTime()) ? new Date() : flightDate;

            return tx.voucherFlight.create({
              data: {
                voucherId: id,
                type: String(flight.type || 'AA').substring(0, 10),
                carrier: String(flight.carrier || '').substring(0, 50),
                number: String(flight.number || '').substring(0, 50),
                date: validFlightDate,
                from: String(flight.from || '').substring(0, 50),
                to: String(flight.to || '').substring(0, 50),
                etd: flight.etd ? String(flight.etd).substring(0, 20) : null,
                eta: flight.eta ? String(flight.eta).substring(0, 20) : null,
              },
            });
          })
        );
      }

      // Sync Voucher edits back to the Booking in DB
      await syncVoucherToBooking(tx, id);

      return updated;
    });

    res.json({ voucher: updatedVoucher });
  })
);

// Update movement driver/vehicle details
router.put(
  '/:id/movement/:movementIndex',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, movementIndex } = req.params;
    const user = req.user!;
    const { 
      driverDetails1, 
      driverDetails2, 
      vehicleNumber,
      from,
      fromLocation,
      fromLocationId,
      to,
      toLocation,
      toLocationId,
    } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        party: true,
        transportCompany: true,
        umrahCompany: true,
        booking: {
          select: {
            partyId: true,
            umrahVisaProviderId: true,
            transportCompanyId: true,
          },
        },
        movements: {
          orderBy: {
            sr: 'asc',
          },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Access control for party role
    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (!isPartyAuthorizedForVoucher(voucher, pId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const index = parseInt(movementIndex, 10);
    const movement = voucher.movements[index];

    if (!movement) {
      return res.status(400).json({ error: 'Invalid movement index' });
    }

    // Check if driver details changed to reset notification status
    const driverDetailsChanged = 
      (driverDetails1 !== undefined && driverDetails1 !== movement.driverDetails1) ||
      (driverDetails2 !== undefined && driverDetails2 !== movement.driverDetails2) ||
      (vehicleNumber !== undefined && vehicleNumber !== movement.vehicleNumber);

    // Update the specific movement record
    const updatedMovement = await prisma.voucherMovement.update({
      where: { id: movement.id },
      data: {
        driverDetails1: driverDetails1 !== undefined ? driverDetails1 : movement.driverDetails1,
        driverDetails2: driverDetails2 !== undefined ? driverDetails2 : movement.driverDetails2,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : movement.vehicleNumber,
        from: from !== undefined ? from : movement.from,
        fromLocation: fromLocation !== undefined ? fromLocation : movement.fromLocation,
        fromLocationId: fromLocationId !== undefined ? fromLocationId : movement.fromLocationId,
        to: to !== undefined ? to : movement.to,
        toLocation: toLocation !== undefined ? toLocation : movement.toLocation,
        toLocationId: toLocationId !== undefined ? toLocationId : movement.toLocationId,
        whatsappSent: driverDetailsChanged ? false : movement.whatsappSent,
      },
    });

    // Update voucher version
    await prisma.voucher.update({
      where: { id },
      data: {
        version: voucher.version + 1,
      },
    });

    // Sync Voucher edits back to the Booking in DB
    await syncVoucherToBooking(prisma, id);

    // Send movement update notification (email + WhatsApp)
    if (updatedMovement.driverDetails1 || updatedMovement.driverDetails2 || updatedMovement.vehicleNumber) {
      try {
        // Send email update to umrah visa provider / party if configured
        let partyEmail = '';
        let partyName = voucher.guestName || 'Guest';
        
        if (voucher.umrahVisaProviderId) {
          const providerParty = await prisma.party.findUnique({
            where: { id: voucher.umrahVisaProviderId },
            select: {
              partyName: true,
              email: true,
            },
          });
          if (providerParty) {
            partyName = providerParty.partyName;
            partyEmail = providerParty.email || '';
          }
        }

        const formattedDate = updatedMovement.date ? updatedMovement.date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) : '';

        // Trigger email update
        await sendMovementUpdateEmail(
          partyEmail,
          partyName,
          voucher.voucherNumber,
          {
            date: formattedDate,
            time: updatedMovement.time || '',
            fromLocation: updatedMovement.fromLocation || updatedMovement.from || '',
            toLocation: updatedMovement.toLocation || updatedMovement.to || '',
            driverDetails1: updatedMovement.driverDetails1 || '',
            driverDetails2: updatedMovement.driverDetails2 || '',
            vehicleNumber: updatedMovement.vehicleNumber || '',
          },
          undefined, // partyWhatsApp is bypassed here since we send it in the new format below
          undefined  // guestMobile is bypassed
        );

        // Send the new WhatsApp notification to the B2B customer party automatically (matching exact requested template)
        let targetDestination = voucher.party?.whatsappNumber;
        if (voucher.party?.whatsappType === 'id') {
          targetDestination = voucher.party?.whatsappGroupId || voucher.party?.whatsappNumber;
        }
        if (!targetDestination) {
          targetDestination = voucher.party?.contactNumber;
        }

        if (targetDestination) {
          const voucherNumber = voucher.voucherNumber;
          const agencyName = voucher.party?.partyName || 'N/A';
          const routeName = `${updatedMovement.from} - ${updatedMovement.to}`;
          const rawDate = updatedMovement.date ? new Date(updatedMovement.date) : null;
          const date = rawDate ? rawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'N/A';
          const reportingTime = updatedMovement.time || 'N/A';
          const driverName = updatedMovement.driverDetails1 || 'N/A';
          const driverMobile = updatedMovement.driverDetails2 || 'N/A';
          const transportCompany = voucher.transportCompany?.partyName || '';

          const { sendDriverUpdateWhatsApp } = await import('../services/whatsappService');
          await sendDriverUpdateWhatsApp(targetDestination, {
            voucherNumber,
            agencyName,
            routeName,
            date,
            reportingTime,
            driverName,
            driverMobile,
            transportCompany,
          });

          // Mark notification as sent in DB
          await prisma.voucherMovement.update({
            where: { id: updatedMovement.id },
            data: { whatsappSent: true },
          });

          console.log('[AUTO-WHATSAPP] Automatically sent driver update WhatsApp notification to customer party:', targetDestination);
        }
      } catch (error: any) {
        console.error('Failed to send movement update notification:', error?.message);
      }
    }

    // Return updated voucher with updated movement
    const updatedMovements = voucher.movements.map(m => m.id === movement.id ? updatedMovement : m);
    res.json({ voucher: { ...voucher, movements: updatedMovements } });
  })
);

// Send notification for movement update
router.post(
  '/:id/movement/:movementIndex/notify',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, movementIndex } = req.params;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        party: true,
        transportCompany: true,
        umrahCompany: true,
        booking: {
          select: {
            partyId: true,
            umrahVisaProviderId: true,
            transportCompanyId: true,
          },
        },
        movements: {
          orderBy: {
            sr: 'asc',
          },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const index = parseInt(movementIndex, 10);
    const movement = voucher.movements[index];

    if (!movement) {
      return res.status(400).json({ error: 'Invalid movement index' });
    }

    let targetDestination = voucher.party?.whatsappNumber;
    if (voucher.party?.whatsappType === 'id') {
      targetDestination = voucher.party?.whatsappGroupId || voucher.party?.whatsappNumber;
    }
    if (!targetDestination) {
      targetDestination = voucher.party?.contactNumber;
    }

    if (!targetDestination) {
      return res.status(400).json({ error: 'Party (Agency) contact number/group ID is not configured' });
    }

    // Retrieve details for template
    const voucherNumber = voucher.voucherNumber;
    const agencyName = voucher.party?.partyName || 'N/A';
    const routeName = `${movement.from} - ${movement.to}`;
    const rawDate = movement.date ? new Date(movement.date) : null;
    const date = rawDate ? rawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'N/A';
    const reportingTime = movement.time || 'N/A';
    const driverName = movement.driverDetails1 || 'N/A';
    const driverMobile = movement.driverDetails2 || 'N/A';
    const transportCompany = voucher.transportCompany?.partyName || '';

    const { sendDriverUpdateWhatsApp } = await import('../services/whatsappService');

    await sendDriverUpdateWhatsApp(targetDestination, {
      voucherNumber,
      agencyName,
      routeName,
      date,
      reportingTime,
      driverName,
      driverMobile,
      transportCompany,
    });

    // Mark notification as sent in DB
    await prisma.voucherMovement.update({
      where: { id: movement.id },
      data: { whatsappSent: true },
    });

    res.json({ success: true, message: 'Driver update WhatsApp notification sent successfully' });
  })
);

// POST /api/vouchers/:id/upload-invoice - Upload invoice details to external API
router.post(
  '/:id/upload-invoice',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { qty, cost, rate } = req.body;

    if (qty === undefined || cost === undefined || rate === undefined) {
      return res.status(400).json({ error: 'Quantity, cost, and rate are required' });
    }

    const qtyNum = Number(qty);
    const costNum = Number(cost);
    const rateNum = Number(rate);

    if (isNaN(qtyNum) || isNaN(costNum) || isNaN(rateNum)) {
      return res.status(400).json({ error: 'Quantity, cost, and rate must be numbers' });
    }

    // Fetch voucher with relationships
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        party: true,
        umrahCompany: true,
        transportCompany: true,
        booking: {
          include: {
            party: true,
            umrahVisaProvider: true,
            transportCompany: true,
          }
        }
      }
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const party = voucher.party || voucher.booking?.party;
    const transportCompany = voucher.transportCompany || voucher.booking?.transportCompany;
    const umrahCompany = voucher.umrahCompany || voucher.booking?.umrahVisaProvider;

    if (!party?.partyCode) {
      return res.status(400).json({ error: 'Customer / Agency does not have a Party Code configured in Settings.' });
    }
    const partyID = Number(party.partyCode);
    if (isNaN(partyID) || partyID <= 0) {
      return res.status(400).json({ error: `Customer / Agency Party Code "${party.partyCode}" must be a numeric 3-digit ID.` });
    }

    if (!transportCompany?.partyCode) {
      return res.status(400).json({ error: 'Transport Company does not have a Party Code configured in Settings.' });
    }
    const umrahCompanyID = Number(transportCompany.partyCode);
    if (isNaN(umrahCompanyID) || umrahCompanyID <= 0) {
      return res.status(400).json({ error: `Transport Company Party Code "${transportCompany.partyCode}" must be a numeric 3-digit ID.` });
    }

    // Map external API fields as requested
    const remarks = voucher.groupCode || '';
    const groupCode = `Voucher No: ${voucher.voucherNumber}`;
    const amt = qtyNum * rateNum;
    const costAmt = qtyNum * costNum;

    // External API payload
    const payload = [
      {
        partyID,
        remarks,
        qty: qtyNum,
        rate: rateNum,
        amt,
        visaFileDetailID: 1,
        typ: 2,
        umrahCompanyID,
        groupCode,
        cost: costNum,
        costAmt,
        umrahType: 1
      }
    ];

    try {
      const axios = require('axios');
      console.log(`[DEBUG] Uploading invoice to external API for voucher ${voucher.voucherNumber}:`, JSON.stringify(payload, null, 2));
      const response = await axios.post('https://report.umrabus.com/api/passport/upload-invoices', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`[DEBUG] External API response:`, response.data);
      if (response.data && response.data.status === 'success') {
        const updateData: any = { invoiceGenerated: true };
        if (transportCompany?.id && !voucher.transportCompanyId) {
          updateData.transportCompanyId = transportCompany.id;
        }
        if (umrahCompany?.id && !voucher.umrahCompanyId) {
          updateData.umrahCompanyId = umrahCompany.id;
          updateData.umrahVisaProviderId = umrahCompany.id;
        }
        if (party?.id && !voucher.partyId) {
          updateData.partyId = party.id;
        }

        await prisma.voucher.update({
          where: { id },
          data: updateData,
        });
        res.json({ message: 'Invoice uploaded successfully to external API', externalResponse: response.data });
      } else {
        res.status(500).json({ error: 'Failed to upload invoice to external API', externalResponse: response.data });
      }
    } catch (error: any) {
      console.error('Error uploading invoice to external API:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.data);
        return res.status(500).json({ error: 'External API Error', details: error.response.data });
      }
      res.status(500).json({ error: error.message || 'Failed to upload invoice' });
    }
  })
);

// Manual trigger: Send Voucher alerts to Agency (WhatsApp & Email with PDF)
router.post(
  '/:id/notify-agency',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { dispatchVoucherIssuedAlerts } = await import('../services/voucherNotificationService');
    const result = await dispatchVoucherIssuedAlerts({
      voucherId: id,
      notifyAgency: true,
      notifySupplier: false,
    });

    res.json({
      success: true,
      message: 'Agency notifications dispatched successfully',
      data: result,
    });
  })
);

// Manual trigger: Send Voucher alerts to Transport Supplier (WhatsApp & Email with PDF)
router.post(
  '/:id/notify-supplier',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { dispatchVoucherIssuedAlerts } = await import('../services/voucherNotificationService');
    const result = await dispatchVoucherIssuedAlerts({
      voucherId: id,
      notifyAgency: false,
      notifySupplier: true,
    });

    res.json({
      success: true,
      message: 'Transport supplier notifications dispatched successfully',
      data: result,
    });
  })
);

// Manual trigger: Send Voucher alerts to Both Agency & Transport Supplier
router.post(
  '/:id/notify-all',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { dispatchVoucherIssuedAlerts } = await import('../services/voucherNotificationService');
    const result = await dispatchVoucherIssuedAlerts({
      voucherId: id,
      notifyAgency: true,
      notifySupplier: true,
    });

    res.json({
      success: true,
      message: 'All notifications dispatched successfully to Agency & Transport Supplier',
      data: result,
    });
  })
);

// Cancel or update cancellation status of a voucher
router.post(
  '/:id/cancel',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { cancelType, reason } = req.body;
    const user = req.user!;

    const validTypes = ['complete', 'arrival', 'departure', 'reactivate'];
    if (!cancelType || !validTypes.includes(cancelType)) {
      return res.status(400).json({
        error: `Invalid cancelType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const existingVoucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        booking: true,
      },
    });

    if (!existingVoucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const isReactivate = cancelType === 'reactivate';
    let newStatus = 'active';
    if (cancelType === 'complete') newStatus = 'cancelled_complete';
    else if (cancelType === 'arrival') newStatus = 'cancelled_arrival';
    else if (cancelType === 'departure') newStatus = 'cancelled_departure';

    const previousStatus = existingVoucher.status || 'active';
    const previousCancelType = existingVoucher.cancelType || null;

    const [updatedVoucher] = await prisma.$transaction([
      prisma.voucher.update({
        where: { id },
        data: {
          status: newStatus,
          cancelType: isReactivate ? null : cancelType,
          cancellationReason: isReactivate ? null : (reason?.trim() || null),
          cancelledAt: isReactivate ? null : new Date(),
          cancelledBy: isReactivate ? null : user.id,
        },
        include: {
          generatedByUser: {
            select: { id: true, name: true, email: true },
          },
          cancelledByUser: {
            select: { id: true, name: true, email: true },
          },
          umrahCompany: true,
          transportCompany: true,
          party: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          entityType: 'voucher',
          entityId: existingVoucher.id,
          action: isReactivate ? 'reactivate' : 'cancel',
          oldValues: {
            status: previousStatus,
            cancelType: previousCancelType,
            cancellationReason: existingVoucher.cancellationReason || null,
          },
          newValues: {
            status: newStatus,
            cancelType: isReactivate ? null : cancelType,
            cancellationReason: reason?.trim() || null,
            voucherNumber: existingVoucher.voucherNumber,
            guestName: existingVoucher.guestName,
            groupCode: existingVoucher.groupCode,
            paxCount: existingVoucher.paxCount,
          },
          changedBy: user.id,
          changedAt: new Date(),
          ipAddress: (req.ip || req.socket.remoteAddress || '') as string,
          userAgent: req.get('User-Agent') || '',
        },
      }),
    ]);

    // If linked to booking, log status history as well
    if (existingVoucher.bookingId) {
      try {
        const actionLabel = isReactivate
          ? `Voucher #${existingVoucher.voucherNumber} Reactivated`
          : `Voucher #${existingVoucher.voucherNumber} ${
              cancelType === 'complete'
                ? 'Completely Cancelled'
                : cancelType === 'arrival'
                ? 'Arrival Cancelled'
                : 'Departure Cancelled'
            }`;

        await prisma.bookingStatusHistory.create({
          data: {
            bookingId: existingVoucher.bookingId,
            oldStatus: previousStatus,
            newStatus: newStatus,
            changedBy: user.id,
            reason: `${actionLabel}${reason?.trim() ? `: ${reason.trim()}` : ''}`,
          },
        });
      } catch (histErr) {
        console.warn('[VOUCHER-CANCEL] Error creating booking status history:', histErr);
      }
    }

    const typeLabels: { [key: string]: string } = {
      complete: 'Completely Cancelled',
      arrival: 'Arrival Cancelled',
      departure: 'Departure Cancelled',
      reactivate: 'Active',
    };

    res.json({
      success: true,
      message: `Voucher #${existingVoucher.voucherNumber} marked as ${typeLabels[cancelType] || newStatus}`,
      voucher: updatedVoucher,
    });
  })
);

// Get activity log / audit history for a voucher
router.get(
  '/:id/activity-log',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      select: {
        id: true,
        voucherNumber: true,
        partyId: true,
        umrahCompanyId: true,
        transportCompanyId: true,
        booking: {
          select: {
            partyId: true,
            umrahVisaProviderId: true,
            transportCompanyId: true,
          },
        },
        guestName: true,
        groupCode: true,
        status: true,
        createdAt: true,
        generatedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    if (user.role === 'party') {
      const pId = await resolveUserPartyId(user);
      if (!isPartyAuthorizedForVoucher(voucher, pId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'voucher',
        entityId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    });

    res.json({
      success: true,
      voucher: {
        ...voucher,
        status: voucher.status || 'active',
      },
      logs,
    });
  })
);

export default router;
