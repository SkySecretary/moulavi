
import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { generateVoucherNumber, generateRouteNumbersForVoucher } from '../services/voucherService';
import { sendMovementUpdateEmail } from '../services/emailService';
import { sendMovementUpdateWhatsApp } from '../services/whatsappService';

const router = Router();

// Get all vouchers with pagination and filters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search = '', dateFrom, dateTo } = req.query;
    const user = req.user!;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // If user is a party, only show their own vouchers
    if (user.role === 'party') {
      where.partyId = user.partyId;
    }

    if (search) {
      where.OR = [
        { voucherNumber: { contains: search as string } },
        { guestName: { contains: search as string } },
        { guestMobile: { contains: search as string } },
        { groupCode: { contains: search as string } },
        { bookingReference: { contains: search as string } },
      ];
    }

    if (dateFrom || dateTo) {
      where.reservationDate = {
        ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
        ...(dateTo ? { lte: new Date(dateTo as string) } : {}),
      };
    }

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
          umrahCompany: {
            select: { partyName: true, address: true, contactNumber: true, whatsappNumber: true, email: true }
          },
          party: {
            select: { partyName: true }
          },
          transportCompany: {
            select: { partyName: true }
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

    res.json({
      vouchers,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereVoucher: any = {};
    const whereMovement: any = {};

    if (user.role === 'party') {
      whereVoucher.partyId = user.partyId;
      whereMovement.voucher = { partyId: user.partyId };
    }

    const [totalVouchers, todayMovements, tomorrowMovements] = await Promise.all([
      prisma.voucher.count({ where: whereVoucher }),
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
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      totalVouchers,
      todayMovements,
      tomorrowMovements,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { from, to, page = '1', limit = '50', search = '' } = req.query;
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
      where.voucher = { partyId: user.partyId };
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
        include: { voucher: true },
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

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.guestName || 'N/A',
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: movement.voucher.paxCount,
        from: movement.from || '',
        fromLocation: movement.fromLocation || '',
        fromLocationId: movement.fromLocationId || null,
        to: movement.to || '',
        toLocation: movement.toLocation || '',
        toLocationId: movement.toLocationId || null,
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { from, to, page = '1', limit = '50', search = '' } = req.query;
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
      where.voucher = { partyId: user.partyId };
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
        include: { voucher: true },
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

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.guestName || 'N/A',
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: movement.voucher.paxCount,
        from: movement.from || '',
        fromLocation: movement.fromLocation || '',
        fromLocationId: movement.fromLocationId || null,
        to: movement.to || '',
        toLocation: movement.toLocation || '',
        toLocationId: movement.toLocationId || null,
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
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
      where.voucher = { partyId: user.partyId };
      whereTo.voucher = { partyId: user.partyId };
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      date: {
        gte: today,
        lt: tomorrow,
      },
      from: {
        not: '',
      },
      to: {
        not: '',
      },
    };

    if (user.role === 'party') {
      where.voucher = { partyId: user.partyId };
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
    movementsData.forEach((movement) => {
      const key = `${movement.from}|||${movement.to}`;
      statsMap.set(key, (statsMap.get(key) || 0) + 1);
    });

    const stats = Array.from(statsMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    });

    res.json({
      stats,
      totalEntries: movementsData.length,
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const where: any = {
      date: {
        gte: tomorrow,
        lt: dayAfterTomorrow,
      },
      from: {
        not: '',
      },
      to: {
        not: '',
      },
    };

    if (user.role === 'party') {
      where.voucher = { partyId: user.partyId };
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
    movementsData.forEach((movement) => {
      const key = `${movement.from}|||${movement.to}`;
      statsMap.set(key, (statsMap.get(key) || 0) + 1);
    });

    const stats = Array.from(statsMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    });

    res.json({
      stats,
      totalEntries: movementsData.length,
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
        umrahCompany: {
          select: { id: true, partyName: true, address: true, contactNumber: true, whatsappNumber: true, email: true, logoPath: true }
        },
        party: {
          select: { id: true, partyName: true }
        },
        transportCompany: {
          select: { id: true, partyName: true }
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
    if (user.role === 'party' && voucher.partyId !== user.partyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Transform normalized data to match frontend expectations (for backward compatibility)
    const voucherResponse = {
      ...voucher,
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

// Create quick voucher
router.post(
  '/quick',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // ... rest of create quick voucher
    const user = req.user!;
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
      transportOptions, // Optional - for reference, not stored in voucher
    } = req.body;

    if (!guestName || !paxCount) {
      return res.status(400).json({ error: 'Guest name and passenger count are required' });
    }

    const voucherNumber = await generateVoucherNumber(); // Voucher number is used as reservation number

    // Generate route numbers dynamically from the last route number in database
    const movementCount = movementDetails && Array.isArray(movementDetails) ? movementDetails.length : 0;
    const routeNumbers = movementCount > 0 
      ? await generateRouteNumbersForVoucher(movementCount)
      : [];

    const voucher = await prisma.$transaction(async (tx) => {
      // Create voucher
      const newVoucher = await tx.voucher.create({
        data: {
          voucherNumber, // Voucher number is used as reservation number
          reservationDate: reservationDate ? new Date(reservationDate) : new Date(),
          guestName,
          guestMobile: guestMobile || null,
          groupCode: groupCode || null,
          paxCount,
          partyId: partyId || null,
          umrahCompanyId: umrahCompanyId || null,
          transportCompanyId: transportCompanyId || null,
          generatedBy: user.id,
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
            // For arrival (AA), airport is in arrivalAirport (or from as fallback)
            // For departure (AD), airport is in departureAirport (or to as fallback)
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
                // Store airport in 'from' for AA, in 'to' for AD (for PDF display)
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

    res.status(201).json({ voucher });
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
    } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
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
    if (user.role === 'party' && voucher.partyId !== user.partyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const index = parseInt(movementIndex, 10);
    const movement = voucher.movements[index];

    if (!movement) {
      return res.status(400).json({ error: 'Invalid movement index' });
    }

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
      },
    });

    // Update voucher version
    await prisma.voucher.update({
      where: { id },
      data: {
        version: voucher.version + 1,
      },
    });

    // Send movement update notification (email + WhatsApp)
    if (updatedMovement.driverDetails1 || updatedMovement.driverDetails2 || updatedMovement.vehicleNumber) {
      try {
        // Get party (umrah visa provider) if voucher has umrahVisaProviderId
        let partyWhatsApp: string | undefined;
        let partyEmail = '';
        let partyName = voucher.guestName || 'Guest';
        
        if (voucher.umrahVisaProviderId) {
          const party = await prisma.party.findUnique({
            where: { id: voucher.umrahVisaProviderId },
            select: {
              partyName: true,
              whatsappNumber: true,
              email: true,
            },
          });
          
          if (party) {
            partyName = party.partyName;
            partyEmail = party.email || '';
            partyWhatsApp = party.whatsappNumber || undefined;
          }
        }
        
        const guestMobile = voucher.guestMobile || undefined;

        // Format date for display
        const formattedDate = updatedMovement.date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

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
          partyWhatsApp,
          guestMobile
        );
      } catch (error: any) {
        console.error('Failed to send movement update notification:', error);
        // Don't fail the request if notification fails
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

    // Vouchers are standalone - notifications removed as they required booking connection
    res.json({ message: 'Movement updated successfully' });
  })
);

export default router;
