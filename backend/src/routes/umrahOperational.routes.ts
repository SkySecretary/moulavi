
import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/umrah-visa/operational/daily-bookings
 * Get all bookings with arrival, departure, or movement on a specific date
 */
router.get(
  '/daily-bookings',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { date, arrivalAirportCode, departureAirportCode, umrahVisaProviderId, type = 'all' } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Set range for the entire day in UTC
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const orConditions: any[] = [];

    if (type === 'all' || type === 'arrival') {
      orConditions.push({
        travelDetails: {
          some: {
            isAlternate: false,
            arrivalDateTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      });
    }

    if (type === 'all' || type === 'departure') {
      orConditions.push({
        travelDetails: {
          some: {
            isAlternate: false,
            departureDateTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      });
    }

    if (type === 'all') {
      orConditions.push({
        movementDetails: {
          some: {
            isAlternate: false,
            travelDateTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      });
    }

    const where: any = {
      isDeleted: false,
      OR: orConditions.length > 0 ? orConditions : undefined,
    };

    if (umrahVisaProviderId) {
      where.umrahVisaProviderId = umrahVisaProviderId as string;
    }

    // Apply airport code filters if provided
    if (arrivalAirportCode || departureAirportCode) {
      const travelWhere: any = { isAlternate: false };
      
      if (arrivalAirportCode) {
        travelWhere.arrivalAirport = {
          code: {
            contains: arrivalAirportCode as string,
          }
        };
      }
      
      if (departureAirportCode) {
        travelWhere.departureAirport = {
          code: {
            contains: departureAirportCode as string,
          }
        };
      }

      where.travelDetails = {
        some: travelWhere
      };
    }

    const bookings = await prisma.umrahVisaBooking.findMany({
      where,
      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            partyCode: true,
            email: true,
          },
        },
        umrahVisaProvider: {
          select: {
            id: true,
            partyName: true,
            partyCode: true,
          },
        },
        travelDetails: {
          where: { isAlternate: false },
          include: {
            arrivalAirport: true,
            departureAirport: true,
          },
        },
        movementDetails: {
          where: { 
            isAlternate: false,
            travelDateTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            fromCity: true,
            toCity: true,
            fromLocation: true,
            toLocation: true,
          },
          orderBy: {
            travelDateTime: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        bookings,
        date: startOfDay.toISOString(),
      },
    });
  })
);

export default router;
