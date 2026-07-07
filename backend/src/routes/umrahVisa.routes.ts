
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma, findCityByName } from './umrahVisa/shared';
import { parseSafeDate } from '../utils/dateParser';

const router = Router();

// GET /api/umrah-visa/bookings - Get all bookings with pagination and filters
router.get('/bookings', authenticate, async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      status, 
      tripStatus,
      partyId, 
      search,
      arrivalDateFrom,
      arrivalDateTo,
      departureDateFrom,
      departureDateTo,
      bookingMode,
      accommodationType,
      visaType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      archived
    } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get the authenticated user
    const user = (req as any).user;

    const where: any = {
      isDeleted: archived === 'true'
    };
    
    // If user is a party, automatically filter by their partyId
    if (user && user.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      
      if (userParty) {
        where.partyId = userParty.id;
      } else {
        return res.json({
          bookings: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0, totalPassengers: 0 },
        });
      }
    } else if (partyId) {
      where.partyId = partyId;
    }
    
    if (status && status !== 'all') {
      if (Array.isArray(status)) where.status = { in: status };
      else where.status = status;
    }

    if (tripStatus && tripStatus !== 'all') {
      if (Array.isArray(tripStatus)) where.tripStatus = { in: tripStatus };
      else where.tripStatus = tripStatus;
    }

    if (bookingMode) where.bookingMode = bookingMode;
    if (accommodationType) where.accommodationType = accommodationType;
    if (visaType) where.visaType = visaType;

    const { missingReturnTicket } = req.query;
    if (missingReturnTicket === 'true') {
      where.isOneWay = true;
    }

    // Search by group number, reference, or name
    if (search && typeof search === 'string' && search.trim() !== '') {
      const query = search.trim();
      where.OR = [
        { groupNumber: { contains: query } },
        { bookingReference: { contains: query } },
        { groupName: { contains: query } },
        { party: { partyName: { contains: query } } },
      ];
    }

    // Date Filters (Arrival Date)
    if (arrivalDateFrom || arrivalDateTo) {
      const fromDate = arrivalDateFrom ? new Date(arrivalDateFrom as string) : undefined;
      if (fromDate) fromDate.setUTCHours(0, 0, 0, 0);
      const toDate = arrivalDateTo ? new Date(arrivalDateTo as string) : undefined;
      if (toDate) toDate.setUTCHours(23, 59, 59, 999);

      where.travelDetails = {
        some: {
          isAlternate: false,
          arrivalDateTime: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        }
      };
    }

    // Date Filters (Departure Date)
    if (departureDateFrom || departureDateTo) {
      const fromDate = departureDateFrom ? new Date(departureDateFrom as string) : undefined;
      if (fromDate) fromDate.setUTCHours(0, 0, 0, 0);
      const toDate = departureDateTo ? new Date(departureDateTo as string) : undefined;
      if (toDate) toDate.setUTCHours(23, 59, 59, 999);

      if (where.travelDetails) {
        where.travelDetails.some = {
          ...where.travelDetails.some,
          departureDateTime: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        };
      } else {
        where.travelDetails = {
          some: {
            isAlternate: false,
            departureDateTime: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            }
          }
        };
      }
    }

    // Create a separate where clause for stats that doesn't include the status filter
    const statsWhere = { ...where };
    delete statsWhere.status;

    const [bookings, total, totalPassengers, statusCounts] = await Promise.all([
      prisma.umrahVisaBooking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          vouchers: {
            select: {
              id: true,
              voucherNumber: true,
            },
          },
          party: {
            select: {
              id: true,
              partyName: true,
              partyCode: true,
              email: true,
              contactNumber: true,
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
          },
          sponsorIqamaDetails: true,
          umrahVisaProvider: {
            select: {
              id: true,
              partyName: true,
            },
          },
          passengers: {
            include: {
              documents: true,
            },
          },
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
      }),
      prisma.umrahVisaBooking.count({ where }),
      prisma.umrahVisaBooking.aggregate({
        where,
        _sum: {
          passengerCount: true
        }
      }),
      // Get global counts for filters (ignoring the 'status' filter but keeping others)
      Promise.all(['pending', 'documents_downloaded', 'group_assigned', 'voucher', 'bill', 'booking_success', 'cancelled'].map(s => 
        prisma.umrahVisaBooking.count({
          where: { ...statsWhere, status: s as any }
        })
      ))
    ]);

    const stats: any = {
      total: await prisma.umrahVisaBooking.count({ where: statsWhere }),
      totalPassengers: totalPassengers._sum.passengerCount || 0
    };
    
    ['pending', 'documents_downloaded', 'group_assigned', 'voucher', 'bill', 'booking_success', 'cancelled'].forEach((s, i) => {
      stats[s] = statusCounts[i];
    });

    const mappedBookings = bookings.map((b: any) => {
      const { vouchers, ...rest } = b;
      return {
        ...rest,
        voucher: vouchers && vouchers.length > 0 ? vouchers[0] : null,
      };
    });

    res.json({
      bookings: mappedBookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        totalPassengers: totalPassengers._sum.passengerCount || 0
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/umrah-visa/missing-brn - Get group hotel bookings with missing BRNs
router.get('/missing-brn', authenticate, authorize('admin', 'staff', 'party'), async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      arrivalDateFrom,
      arrivalDateTo,
      partyId
    } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;
 
    // Get the authenticated user
    const user = (req as any).user;
 
    const where: any = {
      visaType: 'group_visa',
      accommodationType: 'hotel',
      status: { not: 'cancelled' },
      isDeleted: false,
    };
 
    // If user is a party, automatically filter by their partyId
    if (user && user.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      
      if (userParty) {
        where.partyId = userParty.id;
      } else {
        return res.json({
          bookings: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
        });
      }
    } else if (partyId) {
      where.partyId = partyId as string;
    }

    // Date Filters (Arrival Date)
    if (arrivalDateFrom || arrivalDateTo) {
      const fromDate = arrivalDateFrom ? new Date(arrivalDateFrom as string) : undefined;
      if (fromDate) fromDate.setUTCHours(0, 0, 0, 0);
      const toDate = arrivalDateTo ? new Date(arrivalDateTo as string) : undefined;
      if (toDate) toDate.setUTCHours(23, 59, 59, 999);

      where.travelDetails = {
        some: {
          isAlternate: false,
          arrivalDateTime: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        }
      };
    }

    // Fetch all active group_visa bookings with hotel accommodation
    const bookings = await prisma.umrahVisaBooking.findMany({
      where,
      include: {
        party: {
          select: {
            partyName: true,
            contactNumber: true,
          },
        },
        travelDetails: {
          where: { isAlternate: false },
          orderBy: { arrivalDateTime: 'asc' },
          take: 1
        },
        hotelBookings: {
          where: { isAlternate: false },
          include: { city: true }
        }
      },
      orderBy: { travelDetails: { _count: 'desc' } }
    });

    // Filter in JS to find those with missing BRN
    const missingBrnBookings = bookings.filter((booking: any) => {
      // 1. If it has NO hotel bookings at all, it's missing.
      if (!booking.hotelBookings || booking.hotelBookings.length === 0) return true;

      // Helper to check if BRN is populated
      const isBrnFilled = (hotel: any) => {
        return hotel.brn && (Array.isArray(hotel.brn) ? hotel.brn.length > 0 : String(hotel.brn).trim() !== '');
      };

      // Check if there are any Makkah/Madinah hotels defined
      const hasMakkahHotel = booking.hotelBookings.some((hb: any) => {
        const cityName = (hb.city?.name || '').toLowerCase();
        return cityName.includes('makkah') || cityName.includes('mecca');
      });
      const hasMadinahHotel = booking.hotelBookings.some((hb: any) => {
        const cityName = (hb.city?.name || '').toLowerCase();
        return cityName.includes('madinah') || cityName.includes('medina');
      });

      if (hasMakkahHotel || hasMadinahHotel) {
        // Must have both Makkah and Madinah hotels filled
        const makkahHotel = booking.hotelBookings.find((hb: any) => {
          const cityName = (hb.city?.name || '').toLowerCase();
          return cityName.includes('makkah') || cityName.includes('mecca');
        });
        const madinahHotel = booking.hotelBookings.find((hb: any) => {
          const cityName = (hb.city?.name || '').toLowerCase();
          return cityName.includes('madinah') || cityName.includes('medina');
        });

        const makkahOk = makkahHotel && isBrnFilled(makkahHotel);
        const madinahOk = madinahHotel && isBrnFilled(madinahHotel);

        return !(makkahOk && madinahOk);
      } else {
        // Fallback: stay in list if ANY hotel booking is missing BRN
        return booking.hotelBookings.some((hotel: any) => !isBrnFilled(hotel));
      }
    });

    // Sort by arrival date if possible, otherwise by ID
    missingBrnBookings.sort((a: any, b: any) => {
      const dateA = a.travelDetails?.[0]?.arrivalDateTime?.getTime() || 0;
      const dateB = b.travelDetails?.[0]?.arrivalDateTime?.getTime() || 0;
      return dateA - dateB;
    });

    const paginatedBookings = missingBrnBookings.slice(skip, skip + limitNum);

    // Fetch vouchers for these paginated bookings
    const bookingIds = paginatedBookings.map((b: any) => b.id);
    const vouchers = await prisma.voucher.findMany({
      where: {
        bookingId: { in: bookingIds }
      },
      select: {
        bookingId: true,
        voucherNumber: true
      }
    });

    // Map vouchers to their bookings
    const bookingsWithVouchers = paginatedBookings.map((booking: any) => {
      const bookingVouchers = vouchers.filter((v: any) => v.bookingId === booking.id);
      return {
        ...booking,
        vouchers: bookingVouchers
      };
    });

    res.json({
      bookings: bookingsWithVouchers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: missingBrnBookings.length,
        totalPages: Math.ceil(missingBrnBookings.length / limitNum),
      }
    });
  } catch (error) {
    console.error('Error fetching missing BRN bookings:', error);
    res.status(500).json({ error: 'Failed to fetch missing BRN bookings' });
  }
});

// PATCH /api/umrah-visa/hotels/:hotelBookingId/brn - Update BRN for a specific hotel booking
router.patch('/hotels/:hotelBookingId/brn', authenticate, authorize('admin', 'staff', 'party'), async (req, res) => {
  try {
    const { hotelBookingId } = req.params;
    const { brn } = req.body;
    const user = (req as any).user;

    const existingHotel = await prisma.umrahHotelBooking.findUnique({
      where: { id: hotelBookingId },
    });

    if (!existingHotel) {
      return res.status(404).json({ error: 'Hotel booking not found' });
    }

    const updatedHotel = await prisma.umrahHotelBooking.update({
      where: { id: hotelBookingId },
      data: { brn },
    });

    await prisma.brnUpdateHistory.create({
      data: {
        hotelBookingId,
        bookingId: existingHotel.bookingId,
        oldBrn: existingHotel.brn === null ? undefined : existingHotel.brn,
        newBrn: brn,
        updatedBy: user.id,
      }
    });

    try {
      const { InventoryService } = require('../services/inventoryService');
      await InventoryService.recalculateAll();
    } catch (err) {
      console.error('Failed to recalculate inventories on BRN patch:', err);
    }

    res.json({ success: true, hotel: updatedHotel });
  } catch (error) {
    console.error('Error updating hotel BRN:', error);
    res.status(500).json({ error: 'Failed to update hotel BRN' });
  }
});

// GET /api/umrah-visa/brn-update-history - Get BRN update history
router.get('/brn-update-history', authenticate, authorize('admin', 'staff', 'party'), async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
    } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Get the authenticated user
    const user = (req as any).user;
    const where: any = {};

    // If user is a party, automatically filter by their partyId
    if (user && user.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      
      if (userParty) {
        where.booking = { partyId: userParty.id };
      } else {
        return res.json({
          history: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
        });
      }
    }

    const [history, total] = await Promise.all([
      prisma.brnUpdateHistory.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          booking: {
            select: {
              groupNumber: true,
              bookingReference: true,
              groupName: true,
              passengerCount: true,
              party: {
                select: {
                  partyName: true,
                  contactNumber: true,
                }
              }
            }
          },
          hotelBooking: {
            select: {
              city: {
                select: { name: true }
              },
              hotel: {
                select: { name: true }
              },
              checkInDate: true,
            }
          },
          user: {
            select: {
              name: true,
              email: true,
            }
          }
        }
      }),
      prisma.brnUpdateHistory.count(),
    ]);

    res.json({
      history,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  } catch (error) {
    console.error('Error fetching BRN update history:', error);
    res.status(500).json({ error: 'Failed to fetch BRN update history' });
  }
});

// POST /api/umrah-visa/:bookingId/notify-missing-brn - Send WhatsApp notification for missing BRN
router.post('/:bookingId/notify-missing-brn', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: true,
        travelDetails: { where: { isAlternate: false } }
      }
    });

    if (!booking || !booking.party) {
      return res.status(404).json({ error: 'Booking or Party not found' });
    }

    const { sendCustomWhatsApp } = await import('../services/whatsappService');
    const { sendMissingBrnEmail } = await import('../services/emailService');

    const agentName = booking.party.partyName;
    const voucherNo = booking.groupNumber || booking.bookingReference || booking.id.slice(0, 8);
    const arrivalDate = booking.travelDetails?.[0]?.arrivalDateTime 
      ? booking.travelDetails[0].arrivalDateTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
      : 'the scheduled date';

    let notificationSent = false;
    let errors = [];

    // 1. WhatsApp
    if (booking.party.contactNumber) {
      try {
        const message = `Dear ${agentName},

Greetings from Moulavi Travel.

Your Voucher No. ${voucherNo} is scheduled for travel from Makkah to Madinah on ${arrivalDate}.

We have not yet received your Madinah BRN. Please note that the transport company will not provide the bus service without a valid Madinah BRN.

Without the Madinah BRN, you will not be permitted to enter or visit Madinah City.

Kindly submit the Madinah BRN at least 5 days before the travel date to avoid any disruption to your transportation and travel arrangements.

Your prompt cooperation is highly appreciated.

Regards,
Moulavi Travel`;

        await sendCustomWhatsApp(booking.party.contactNumber, message);
        notificationSent = true;
      } catch (err: any) {
        errors.push(`WhatsApp: ${err.message}`);
      }
    } else {
      errors.push('No contact number for WhatsApp');
    }

    // 2. Email
    if (booking.party.email) {
      try {
        await sendMissingBrnEmail(booking.party.email, agentName, voucherNo, arrivalDate);
        notificationSent = true;
      } catch (err: any) {
        errors.push(`Email: ${err.message}`);
      }
    } else {
      errors.push('No email address available');
    }

    if (!notificationSent) {
      return res.status(500).json({ error: 'Failed to send notifications via all channels', details: errors });
    }

    res.json({ success: true, message: 'Notification(s) sent successfully' });
  } catch (error) {
    console.error('Error sending missing BRN notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// POST /api/umrah-visa/:bookingId/notify-missing-return-ticket - Send WhatsApp & Email notification for missing return ticket
router.post('/:bookingId/notify-missing-return-ticket', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: true,
        travelDetails: { where: { isAlternate: false } }
      }
    });

    if (!booking || !booking.party) {
      return res.status(404).json({ error: 'Booking or Party not found' });
    }

    const { sendCustomWhatsApp } = await import('../services/whatsappService');
    const { sendSingleMissingReturnTicketEmail } = await import('../services/emailService');

    const agentName = booking.party.partyName;
    const bookingRef = booking.groupNumber || booking.bookingReference || booking.id.slice(0, 8);
    const arrivalDate = booking.travelDetails?.[0]?.arrivalDateTime 
      ? booking.travelDetails[0].arrivalDateTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
      : 'the scheduled date';
    const contact = booking.oneWayContactName ? `${booking.oneWayContactName} (${booking.oneWayWhatsapp || ''})` : '';

    let notificationSent = false;
    let errors = [];

    // 1. WhatsApp
    if (booking.party.contactNumber) {
      try {
        const message = `Dear ${agentName},

Greetings from Moulavi Travel.

Your booking reference/group ${bookingRef} has return ticket details missing. Please note that return ticket details are required to complete your booking.

Kindly update the return ticket details (Departure Date, Flight Number, and Airport) as soon as possible.

Your prompt cooperation is highly appreciated.

Regards,
Moulavi Travel`;

        await sendCustomWhatsApp(booking.party.contactNumber, message);
        notificationSent = true;
      } catch (err: any) {
        errors.push(`WhatsApp: ${err.message}`);
      }
    } else {
      errors.push('No contact number for WhatsApp');
    }

    // 2. Email
    if (booking.party.email) {
      try {
        await sendSingleMissingReturnTicketEmail(
          booking.party.email, 
          agentName, 
          bookingRef, 
          arrivalDate, 
          contact
        );
        notificationSent = true;
      } catch (err: any) {
        errors.push(`Email: ${err.message}`);
      }
    } else {
      errors.push('No email address available');
    }

    if (!notificationSent) {
      return res.status(500).json({ error: 'Failed to send notifications via all channels', details: errors });
    }

    res.json({ success: true, message: 'Notification(s) sent successfully' });
  } catch (error) {
    console.error('Error sending missing return ticket notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// GET /api/umrah-visa/stats/pending-brn-load - Get date-wise mutammer count for bookings without BRN
router.get('/stats/pending-brn-load', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { accommodationType = 'hotel', basedOn = 'arrival' } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isDeparture = basedOn === 'departure';

    const bookings = await prisma.umrahVisaBooking.findMany({
      where: {
        accommodationType: accommodationType as any,
        status: { in: ['group_assigned', 'voucher', 'bill'] },
        tripStatus: 'pending',
      },
      include: {
        travelDetails: {
          where: { 
            isAlternate: false,
            ...(isDeparture 
              ? { departureDateTime: { gte: today } }
              : { arrivalDateTime: { gte: today } }
            )
          },
          orderBy: isDeparture 
            ? { departureDateTime: 'asc' }
            : { arrivalDateTime: 'asc' },
          take: 1
        },
        hotelBookings: {
          where: { isAlternate: false }
        },
        sponsorIqamaDetails: {
          where: { isAlternate: false }
        }
      }
    });

    const formatDateRangeLabel = (arrivalStr: Date, departureStr: Date) => {
      const arrival = new Date(arrivalStr);
      const departure = new Date(departureStr);
      const arrDay = arrival.getDate();
      const depDay = departure.getDate();
      const arrMonth = arrival.toLocaleDateString('en-GB', { month: 'short' });
      const depMonth = departure.toLocaleDateString('en-GB', { month: 'short' });
      if (arrMonth === depMonth) {
        return `${arrDay} - ${depDay} ${arrMonth}`;
      } else {
        return `${arrDay} ${arrMonth} - ${depDay} ${depMonth}`;
      }
    };

    const pendingLoadMap = new Map<string, { date: string; count: number; breakdowns: Map<string, { rangeLabel: string; arrivalDate: string; departureDate: string; count: number }> }>();

    bookings.forEach((booking: any) => {
      const travelDetail = booking.travelDetails?.[0];
      if (!travelDetail) return;

      const dateField = isDeparture ? travelDetail.departureDateTime : travelDetail.arrivalDateTime;
      if (!dateField) return;

      const dateKey = dateField.toISOString().split('T')[0];

      let hasAtLeastOneBrn = false;
      if (booking.accommodationType === 'hotel') {
        hasAtLeastOneBrn = booking.hotelBookings.some((h: any) => {
          return h.brn && (Array.isArray(h.brn) ? h.brn.length > 0 : String(h.brn).trim() !== '');
        });
      } else if (booking.accommodationType === 'iqama') {
        const iqama = booking.sponsorIqamaDetails?.[0];
        if (iqama) {
          hasAtLeastOneBrn = (iqama.makkahBrn && String(iqama.makkahBrn).trim() !== '') || 
                           (iqama.madinahBrn && String(iqama.madinahBrn).trim() !== '');
        }
      }

      // Only count if it has NO BRNs at all
      if (!hasAtLeastOneBrn) {
        if (!pendingLoadMap.has(dateKey)) {
          pendingLoadMap.set(dateKey, {
            date: dateKey,
            count: 0,
            breakdowns: new Map()
          });
        }

        const entry = pendingLoadMap.get(dateKey)!;
        entry.count += booking.passengerCount;

        // Populate breakdown if it is a hotel booking
        if (booking.accommodationType === 'hotel' && travelDetail.arrivalDateTime && travelDetail.departureDateTime) {
          const rangeLabel = formatDateRangeLabel(travelDetail.arrivalDateTime, travelDetail.departureDateTime);
          if (!entry.breakdowns.has(rangeLabel)) {
            entry.breakdowns.set(rangeLabel, {
              rangeLabel,
              arrivalDate: travelDetail.arrivalDateTime.toISOString().split('T')[0],
              departureDate: travelDetail.departureDateTime.toISOString().split('T')[0],
              count: 0
            });
          }
          entry.breakdowns.get(rangeLabel)!.count += booking.passengerCount;
        }
      }
    });

    const stats = Array.from(pendingLoadMap.values())
      .map(item => ({
        date: item.date,
        count: item.count,
        breakdowns: item.breakdowns.size > 0 
          ? Array.from(item.breakdowns.values()).sort((a, b) => a.rangeLabel.localeCompare(b.rangeLabel))
          : undefined
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching pending BRN load:', error);
    res.status(500).json({ error: 'Failed to fetch pending BRN load' });
  }
});

// GET /api/umrah-visa/stats - Get booking statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { arrivalDateFrom, arrivalDateTo, partyId } = req.query;
    const user = (req as any).user;

    const where: any = {};
    
    // User role filtering
    if (user && user.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      if (userParty) where.partyId = userParty.id;
      else return res.json({ stats: { total: 0, pending: 0, documents_downloaded: 0, group_assigned: 0, voucher: 0, bill: 0, booking_success: 0, cancelled: 0, totalPassengers: 0 } });
    } else if (partyId) {
      where.partyId = partyId;
    }

    // Date Filters
    if (arrivalDateFrom || arrivalDateTo) {
      const fromDate = arrivalDateFrom ? new Date(arrivalDateFrom as string) : undefined;
      if (fromDate) fromDate.setUTCHours(0, 0, 0, 0);
      const toDate = arrivalDateTo ? new Date(arrivalDateTo as string) : undefined;
      if (toDate) toDate.setUTCHours(23, 59, 59, 999);

      where.travelDetails = {
        some: {
          isAlternate: false,
          arrivalDateTime: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        }
      };
    }

    const statuses = ['pending', 'documents_downloaded', 'group_assigned', 'voucher', 'bill', 'booking_success', 'cancelled'];
    
    const [statusCounts, totalPassengers] = await Promise.all([
      Promise.all(statuses.map(status => 
        prisma.umrahVisaBooking.count({
          where: { ...where, status: status as any }
        })
      )),
      prisma.umrahVisaBooking.aggregate({
        where,
        _sum: {
          passengerCount: true
        }
      })
    ]);

    const stats: any = {
      total: statusCounts.reduce((a, b) => a + b, 0),
      totalPassengers: totalPassengers._sum.passengerCount || 0
    };

    statuses.forEach((status, index) => {
      stats[status] = statusCounts[index];
    });

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ error: 'Failed to fetch booking stats' });
  }
});

// GET /api/umrah-visa/ziyarath-counts - Get ziyarath counts per date
// IMPORTANT: This route must be defined BEFORE /:bookingId to avoid route conflicts
router.get('/ziyarath-counts', authenticate, async (req, res) => {
  try {
    const { dates, excludeBookingId } = req.query;
    
    if (!dates || typeof dates !== 'string') {
      return res.status(400).json({ error: 'dates parameter is required (comma-separated date strings)' });
    }

    // Parse dates from comma-separated string
    const dateArray = dates.split(',').map(d => d.trim()).filter(Boolean);
    
    if (dateArray.length === 0) {
      return res.json({});
    }

    // Convert dates to Date objects and find min/max for query range
    const dateObjects = dateArray.map(dateStr => {
      const date = parseSafeDate(dateStr);
      if (!date || isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      date.setHours(0, 0, 0, 0);
      return { date, dateStr };
    });

    if (dateObjects.length === 0) {
      return res.json({});
    }

    const timestamps = dateObjects.map(d => d.date.getTime());
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));
    maxDate.setHours(23, 59, 59, 999);

    // Build where clause - query all ziyarath movements in the date range
    const whereClause: any = {
      toLocation: {
        locationType: 'ZIYARAT',
      },
      travelDateTime: {
        gte: minDate,
        lte: maxDate,
      },
    };

    // Exclude current booking if provided (and is a valid UUID)
    if (excludeBookingId && typeof excludeBookingId === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(excludeBookingId)) {
        whereClause.bookingId = {
          not: excludeBookingId,
        };
      }
    }

    // Query all ziyarath movements for the date range
    const movements = await prisma.umrahMovementDetail.findMany({
      where: whereClause,
      select: {
        travelDateTime: true,
      },
    });

    // Count ziyaraths per date (only for requested dates)
    const counts: { [date: string]: number } = {};
    
    // Initialize all requested dates with 0
    dateArray.forEach(dateStr => {
      counts[dateStr] = 0;
    });

    // Count movements by date (only count if date matches one of the requested dates)
    movements.forEach(movement => {
      // Extract date in YYYY-MM-DD format, handling timezone correctly
      const date = new Date(movement.travelDateTime);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (counts.hasOwnProperty(dateStr)) {
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });

    res.json(counts);
  } catch (error) {
    console.error('Error fetching ziyarath counts:', error);
    res.status(500).json({ error: 'Failed to fetch ziyarath counts' });
  }
});

// GET /api/umrah-visa/:bookingId - Get complete booking details
router.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: true,
        travelDetails: {
          include: {
            arrivalAirport: true,
            departureAirport: true,
          },
        },
        hotelBookings: {
          include: {
            city: {
              select: {
                id: true,
                name: true,
              },
            },
            hotel: {
              select: {
                id: true,
                name: true,
                city: true,
                cityId: true,
                locationType: true,
              },
            },
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
        },
        movementDetails: {
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
          orderBy: {
            travelDateTime: 'asc',
          },
        },
        passengers: {
          include: {
            documents: true,
          },
        },
        statusHistory: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// DELETE /api/umrah-visa/booking/:id - Delete a booking (Admin only)
router.delete('/booking/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Soft delete
    await prisma.umrahVisaBooking.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// PATCH /api/umrah-visa/booking/:id/restore - Restore a soft-deleted booking
router.patch('/booking/:id/restore', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Restore booking
    await prisma.umrahVisaBooking.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    res.json({ message: 'Booking restored successfully', success: true });
  } catch (error) {
    console.error('Error restoring booking:', error);
    res.status(500).json({ error: 'Failed to restore booking' });
  }
});

// GET /api/umrah-visa/:bookingId/voucher - Get voucher for party users by booking ID
router.get('/:bookingId/voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    // Get booking to verify ownership and get group number
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        partyId: true,
        groupNumber: true,
        groupName: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify ownership for party users
    if (user.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
      });
      
      if (!userParty || booking.partyId !== userParty.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Find voucher by groupCode (groupNumber)
    if (!booking.groupNumber) {
      return res.status(404).json({ error: 'Voucher not found - no group number assigned' });
    }

    const voucher = await prisma.voucher.findFirst({
      where: {
        groupCode: {
          contains: booking.groupNumber,

        },
      },
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

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Transform normalized data to match frontend expectations (same format as voucher routes)
    const transformedVoucher = {
      ...voucher,
      hotelSchedules: voucher.hotels.map((h: any) => ({
        number: h.number,
        location: h.location,
        hotelName: h.hotelName,
        checkIn: h.checkIn ? h.checkIn.toISOString().split('T')[0] : '',
        checkOut: h.checkOut ? h.checkOut.toISOString().split('T')[0] : '',
        days: h.days,
        brn: h.brn,
      })),
      movementDetails: voucher.movements.map((m: any) => ({
        sr: m.sr,
        route: m.route || '',
        date: m.date ? m.date.toISOString().split('T')[0] : '',
        time: m.time,
        from: m.from,
        fromLocation: m.fromLocation,
        to: m.to,
        toLocation: m.toLocation,
      })),
      flightDetails: voucher.flights.map((f: any) => ({
        type: f.type,
        carrier: f.carrier,
        number: f.number,
        date: f.date ? f.date.toISOString().split('T')[0] : '',
        from: f.from,
        to: f.to,
        etd: f.etd,
        eta: f.eta,
      })),
    };

    res.json({ voucher: transformedVoucher });
  } catch (error) {
    console.error('Error fetching voucher:', error);
    res.status(500).json({ error: 'Failed to fetch voucher' });
  }
});

// GET /api/umrah-visa/transport-options/:airportId - Get transport options for airport
router.get('/transport-options/:airportId', authenticate, async (req, res) => {
  try {
    const { airportId } = req.params;

    // Get airport details from LocationMaster
    const airport = await prisma.locationMaster.findUnique({
      where: { 
        id: airportId,
        locationType: 'AIRPORT',
      },
    });

    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Check if this airport requires transport selection
    const needsTransport = ['JED', 'MED'].includes(airport.code);

    if (!needsTransport) {
      return res.json({
        requiresTransport: false,
        transportOptions: [],
      });
    }

    // Find the city that matches the airport's city
    const fromCity = await findCityByName(airport.city);

    if (!fromCity) {
      console.warn(`No city found for airport city: ${airport.city}`);
      return res.json({
        requiresTransport: true,
        airport,
        transportOptions: [],
        message: `No city found for airport city: ${airport.city}`,
      });
    }

    // TransportMaster has been removed - return empty transport options
    // TODO: Implement alternative transport options retrieval if needed
    res.json({
      requiresTransport: true,
      airport,
      fromCity: fromCity,
      transportOptions: [],
      message: 'Transport options not available - TransportMaster has been removed',
    });
  } catch (error) {
    console.error('Error fetching transport options:', error);
    res.status(500).json({ error: 'Failed to fetch transport options' });
  }
});

// Masters: GET destinations (locations) - Now uses LocationMaster only
router.get('/masters/destinations', authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    
    // Use CityMaster instead of DESTINATION locations
    const cityRows = await prisma.cityMaster.findMany({
      where: {
        isActive: true,
        ...(q ? { 
          OR: [
            { name: { contains: q } },
          ]
        } : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
    });
    
    // Convert to old format for backward compatibility
    const destinations = cityRows.map(city => ({
      id: city.id,
      destinationCode: city.name.substring(0, 3).toUpperCase(),
      destinationName: city.name,
      city: city.name,
      country: city.country?.countryName || 'Saudi Arabia',
      isActive: city.isActive,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
    }));
    
    res.json({ 
      destinations, // Backward compatible format
      cities: cityRows, // New city master format
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Masters: GET locations (unified LocationMaster - all types or filtered)
router.get('/masters/locations', authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const locationType = req.query.locationType as string | undefined;
    
    const where: any = {
      isActive: true,
    };
    
    if (locationType) {
      where.locationType = locationType as any;
    }
    
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { city: { contains: q } },
      ];
    }
    
    const locations = await prisma.locationMaster.findMany({
      where,
      orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
      take: 100,
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
    });
    
    res.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Masters: GET hotels by city
router.get('/masters/hotels', authenticate, async (req, res) => {
  try {
    const cityId = req.query.cityId as string | undefined;
    const q = (req.query.q as string) || '';
    const rows = await prisma.locationMaster.findMany({
      where: {
        locationType: 'HOTEL',
        isActive: true,
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
      include: {
        cityMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
    });
    res.json({ hotels: rows });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

// Masters: GET airports
router.get('/masters/airports', authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const rows = await prisma.locationMaster.findMany({
      where: {
        locationType: 'AIRPORT',
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
    res.json({ airports: rows });
  } catch (error) {
    console.error('Error fetching airports:', error);
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// Masters: GET Umrah Visa master dates
router.get('/masters/dates', authenticate, async (req, res) => {
  try {
    const master = await prisma.umrahVisaMaster.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!master) {
      return res.json({ umrahVisaMaster: null });
    }
    
    res.json({ 
      umrahVisaMaster: {
        id: master.id,
        lastArrivalDate: master.lastArrivalDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        lastDepartureDate: master.lastDepartureDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        isActive: master.isActive,
      }
    });
  } catch (error) {
    console.error('Error fetching Umrah visa master dates:', error);
    res.status(500).json({ error: 'Failed to fetch Umrah visa master dates' });
  }
});

// Masters: POST/PUT Umrah Visa master dates (admin only)
router.post('/masters/dates', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { lastArrivalDate, lastDepartureDate } = req.body;
    
    if (!lastArrivalDate || !lastDepartureDate) {
      return res.status(400).json({ error: 'Both lastArrivalDate and lastDepartureDate are required' });
    }
    
    // Validate dates
    const arrivalDate = new Date(lastArrivalDate);
    const departureDate = new Date(lastDepartureDate);
    
    if (isNaN(arrivalDate.getTime()) || isNaN(departureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Deactivate all existing masters
    await prisma.umrahVisaMaster.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    
    // Create new active master
    const master = await prisma.umrahVisaMaster.create({
      data: {
        lastArrivalDate: arrivalDate,
        lastDepartureDate: departureDate,
        isActive: true,
      },
    });
    
    res.json({ 
      umrahVisaMaster: {
        id: master.id,
        lastArrivalDate: master.lastArrivalDate.toISOString().split('T')[0],
        lastDepartureDate: master.lastDepartureDate.toISOString().split('T')[0],
        isActive: master.isActive,
      }
    });
  } catch (error) {
    console.error('Error creating/updating Umrah visa master dates:', error);
    res.status(500).json({ error: 'Failed to create/update Umrah visa master dates' });
  }
});

// GET /api/umrah-visa/hotels/:cityId - Get hotels by city
router.get('/hotels/:cityId', authenticate, async (req, res) => {
  try {
    const { cityId } = req.params;

    const hotels = await prisma.locationMaster.findMany({
      where: {
        cityId: cityId,
        locationType: 'HOTEL',
        isActive: true,
      },
      include: {
        cityMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    res.json(hotels);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

// POST /api/umrah-visa/seed-ziyarah-hotels - Seed Ziyarah hotels as LocationMaster entries
router.post('/seed-ziyarah-hotels', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Find Makkah and Madinah cities
    const makkahCity = await prisma.cityMaster.findFirst({
      where: {
        name: { in: ['Makkah', 'Mecca', 'Makkah Al Mukarramah'] },
        isActive: true,
      },
    });

    const madinahCity = await prisma.cityMaster.findFirst({
      where: {
        name: { in: ['Madinah', 'Medina', 'Al Madinah Al Munawwarah'] },
        isActive: true,
      },
    });

    if (!makkahCity) {
      return res.status(404).json({ error: 'Makkah city not found. Please create it in City Master first.' });
    }
    if (!madinahCity) {
      return res.status(404).json({ error: 'Madinah city not found. Please create it in City Master first.' });
    }

    // Get country for the cities
    const makkahCountry = await prisma.countryMaster.findUnique({
      where: { id: makkahCity.countryId },
    });

    const madinahCountry = await prisma.countryMaster.findUnique({
      where: { id: madinahCity.countryId },
    });

    if (!makkahCountry || !madinahCountry) {
      return res.status(404).json({ error: 'Country not found for cities' });
    }

    // Check if ziyarah hotels already exist
    const makZiyExists = await prisma.locationMaster.findFirst({
      where: {
        code: 'MAK_ZIY',
        locationType: 'HOTEL',
      },
    });

    const madZiyExists = await prisma.locationMaster.findFirst({
      where: {
        code: 'MAD_ZIY',
        locationType: 'HOTEL',
      },
    });

    const results: any[] = [];

    // Create Makkah Ziyarah if it doesn't exist
    if (!makZiyExists) {
      const makZiy = await prisma.locationMaster.create({
        data: {
          code: 'MAK_ZIY',
          name: 'Makkah Ziyarah',
          locationType: 'HOTEL',
          countryId: makkahCity.countryId,
          cityId: makkahCity.id,
          city: makkahCity.name,
          isActive: true,
        },
      });
      results.push({ action: 'created', hotel: makZiy });
    } else {
      results.push({ action: 'exists', hotel: makZiyExists });
    }

    // Create Madinah Ziyarah if it doesn't exist
    if (!madZiyExists) {
      const madZiy = await prisma.locationMaster.create({
        data: {
          code: 'MAD_ZIY',
          name: 'Madinah Ziyarah',
          locationType: 'HOTEL',
          countryId: madinahCity.countryId,
          cityId: madinahCity.id,
          city: madinahCity.name,
          isActive: true,
        },
      });
      results.push({ action: 'created', hotel: madZiy });
    } else {
      results.push({ action: 'exists', hotel: madZiyExists });
    }

    res.json({
      message: 'Ziyarah hotels seeded successfully',
      results,
    });
  } catch (error) {
    console.error('Error seeding ziyarah hotels:', error);
    res.status(500).json({ error: 'Failed to seed ziyarah hotels' });
  }
});

/**
 * PATCH /api/umrah-visa/:bookingId/alternate-info
 * Update alternate booking information (flights, hotels, transport, movements)
 */
router.patch('/:bookingId/alternate-info', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      travelDetails,
      hotelBookings,
      transportBookings,
      movementDetails,
      iqamaDetails
    } = req.body;

    console.log(`[DEBUG] Updating alternate info for booking ${bookingId}`);
    console.log(`[DEBUG] travelDetails: ${JSON.stringify(travelDetails)}`);

    const results = await prisma.$transaction(async (tx) => {
      // 1. Update Alternate Travel Details
      let updatedTravel = null;
      if (travelDetails) {
        updatedTravel = await tx.umrahTravelDetails.upsert({
          where: {
            bookingId_isAlternate: {
              bookingId,
              isAlternate: true,
            },
          },
          update: {
            arrivalDateTime: new Date(travelDetails.arrivalDateTime),
            arrivalAirportId: travelDetails.arrivalAirportId,
            arrivalFlightNumber: travelDetails.arrivalFlightNumber,
            departureDateTime: new Date(travelDetails.departureDateTime),
            departureAirportId: travelDetails.departureAirportId,
            departureFlightNumber: travelDetails.departureFlightNumber,
          },
          create: {
            bookingId,
            isAlternate: true,
            arrivalDateTime: new Date(travelDetails.arrivalDateTime),
            arrivalAirportId: travelDetails.arrivalAirportId,
            arrivalFlightNumber: travelDetails.arrivalFlightNumber,
            departureDateTime: new Date(travelDetails.departureDateTime),
            departureAirportId: travelDetails.departureAirportId,
            departureFlightNumber: travelDetails.departureFlightNumber,
          },
        });
      }

      // 2. Update Alternate Hotel Bookings
      if (hotelBookings) {
        // Remove existing alternate hotel bookings
        await tx.umrahHotelBooking.deleteMany({
          where: { bookingId, isAlternate: true },
        });

        // Create new ones
        if (hotelBookings.length > 0) {
          await tx.umrahHotelBooking.createMany({
            data: hotelBookings.map((h: any) => ({
              bookingId,
              isAlternate: true,
              cityId: h.cityId,
              hotelId: h.hotelId,
              checkInDate: new Date(h.checkInDate),
              checkOutDate: new Date(h.checkOutDate),
              brn: h.brn || null,
            })),
          });
        }
      }

      // 3. Update Alternate Transport Bookings
      if (transportBookings) {
        // Remove existing alternate transport bookings
        await tx.umrahTransportBooking.deleteMany({
          where: { bookingId, isAlternate: true },
        });

        // Create new ones
        if (transportBookings.length > 0) {
          await tx.umrahTransportBooking.createMany({
            data: transportBookings.map((t: any) => ({
              bookingId,
              isAlternate: true,
              transportMasterId: t.transportMasterId,
              travelDateTime: t.travelDateTime ? new Date(t.travelDateTime) : null,
            })),
          });
        }
      }

      // 4. Update Alternate Movement Details
      if (movementDetails) {
        // Remove existing alternate movement details
        await tx.umrahMovementDetail.deleteMany({
          where: { bookingId, isAlternate: true },
        });

        // Create new ones
        if (movementDetails.length > 0) {
          await tx.umrahMovementDetail.createMany({
            data: movementDetails.map((m: any) => ({
              bookingId,
              isAlternate: true,
              travelDateTime: new Date(m.travelDateTime),
              fromCityId: m.fromCityId,
              fromLocationId: m.fromLocationId,
              toCityId: m.toCityId,
              toLocationId: m.toLocationId,
            })),
          });
        }
      }

      // 5. Update Alternate Iqama Details
      if (iqamaDetails) {
        await tx.umrahSponserIqamaDetails.upsert({
          where: {
            bookingId_isAlternate: {
              bookingId,
              isAlternate: true,
            },
          },
          update: {
            iqamaSponserName: iqamaDetails.iqamaName || '',
            iqamaNumber: iqamaDetails.iqamaNumber || '',
            sponserDob: iqamaDetails.iqamaDob ? new Date(iqamaDetails.iqamaDob) : new Date(),
            sponserMobileNumber: iqamaDetails.iqamaMobile || '',
            sponserNationalShortAddress: iqamaDetails.iqamaNationalShortAddress || '',
          },
          create: {
            bookingId,
            isAlternate: true,
            iqamaSponserName: iqamaDetails.iqamaName || '',
            iqamaNumber: iqamaDetails.iqamaNumber || '',
            sponserDob: iqamaDetails.iqamaDob ? new Date(iqamaDetails.iqamaDob) : new Date(),
            sponserMobileNumber: iqamaDetails.iqamaMobile || '',
            sponserNationalShortAddress: iqamaDetails.iqamaNationalShortAddress || '',
          },
        });
      }

      return { updatedTravel };
    });

    res.json({ message: 'Alternate info updated successfully', results });
  } catch (error: any) {
    console.error('Error updating alternate info:', error);
    res.status(500).json({ error: 'Failed to update alternate info', message: error.message });
  }
});

// POST /api/umrah-visa/:bookingId/recreate - Recreate booking for selected passengers with new travel details
router.post('/:bookingId/recreate', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { 
      passengerIds, 
      arrivalDateTime, 
      departureDateTime, 
      arrivalAirportId, 
      arrivalFlightNumber, 
      departureAirportId, 
      departureFlightNumber, 
      brn,
      transportCompanyId,
      umrahVisaProviderId,
      partyId,
      hotels,
      movements
    } = req.body;

    if (!passengerIds || !Array.isArray(passengerIds) || passengerIds.length === 0) {
      return res.status(400).json({ error: 'At least one passenger must be selected' });
    }

    // Find parent booking
    const parentBooking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        passengers: {
          where: { isDeleted: false }
        },
        travelDetails: {
          where: { isAlternate: false }
        }
      }
    });

    if (!parentBooking) {
      return res.status(404).json({ error: 'Parent booking not found' });
    }

    const parentTravel = parentBooking.travelDetails?.[0];
    if (!parentTravel) {
      return res.status(400).json({ error: 'Parent booking travel details are missing' });
    }

    // Verify all passengerIds belong to parent booking
    const parentPassengerIds = parentBooking.passengers.map(p => p.id);
    const isValidPassengers = passengerIds.every(id => parentPassengerIds.includes(id));
    if (!isValidPassengers) {
      return res.status(400).json({ error: 'Some selected passengers do not belong to this booking' });
    }

    // Prepare Travel details variables mapping required schema properties
    const finalArrivalDateTime = arrivalDateTime ? new Date(arrivalDateTime) : parentTravel.arrivalDateTime;
    const finalDepartureDateTime = departureDateTime ? new Date(departureDateTime) : parentTravel.departureDateTime;
    const finalArrivalAirportId = arrivalAirportId || parentTravel.arrivalAirportId;
    const finalArrivalFlightNumber = arrivalFlightNumber || parentTravel.arrivalFlightNumber;
    const finalDepartureAirportId = departureAirportId || parentTravel.departureAirportId;
    const finalDepartureFlightNumber = departureFlightNumber || parentTravel.departureFlightNumber;

    const { generateBookingReference } = await import('../services/bookingService');
    const newBookingReference = await generateBookingReference();

    // Start a transaction to copy booking data and move passengers
    const newBooking = await prisma.$transaction(async (tx) => {
      // 1. Create the new booking
      const created = await tx.umrahVisaBooking.create({
        data: {
          partyId: partyId || parentBooking.partyId,
          groupNumber: parentBooking.groupNumber,
          groupName: parentBooking.groupName,
          passengerCount: passengerIds.length,
          status: parentBooking.status,
          umrahVisaProviderId: umrahVisaProviderId || parentBooking.umrahVisaProviderId,
          transportCompanyId: transportCompanyId || parentBooking.transportCompanyId,
          accommodationType: parentBooking.accommodationType,
          visaType: parentBooking.visaType,
          hasTransportation: parentBooking.hasTransportation,
          bookingReference: newBookingReference,
          brn: brn || parentBooking.brn,
          tripStatus: parentBooking.tripStatus
        }
      });

      // 2. Create Travel Details for new booking
      await tx.umrahTravelDetails.create({
        data: {
          bookingId: created.id,
          arrivalDateTime: finalArrivalDateTime,
          departureDateTime: finalDepartureDateTime,
          arrivalAirportId: finalArrivalAirportId,
          arrivalFlightNumber: finalArrivalFlightNumber,
          departureAirportId: finalDepartureAirportId,
          departureFlightNumber: finalDepartureFlightNumber,
          brn: brn || parentTravel.brn,
          isAlternate: false
        }
      });

      // 3. Move selected passengers to the new booking
      await tx.umrahPassenger.updateMany({
        where: { id: { in: passengerIds } },
        data: { bookingId: created.id }
      });

      // 4. Update passenger count on the parent booking
      await tx.umrahVisaBooking.update({
        where: { id: parentBooking.id },
        data: {
          passengerCount: {
            decrement: passengerIds.length
          }
        }
      });

      // 5. Copy sponsor/iqama details if accommodationType is iqama
      if (parentBooking.accommodationType === 'iqama') {
        const parentIqama = await tx.umrahSponserIqamaDetails.findMany({
          where: { bookingId: parentBooking.id }
        });
        for (const iq of parentIqama) {
          await tx.umrahSponserIqamaDetails.create({
            data: {
              bookingId: created.id,
              isAlternate: iq.isAlternate,
              iqamaNumber: iq.iqamaNumber,
              iqamaSponserName: iq.iqamaSponserName,
              sponserDob: iq.sponserDob,
              sponserMobileNumber: iq.sponserMobileNumber,
              sponserNationalShortAddress: iq.sponserNationalShortAddress,
              makkahHotelName: iq.makkahHotelName,
              makkahBrn: iq.makkahBrn,
              madinahHotelName: iq.madinahHotelName,
              madinahBrn: iq.madinahBrn,
              confirmationImagePath: iq.confirmationImagePath
            }
          });
        }
      }

      // 6. Create hotel bookings (either from payload or fall back to copying parent hotels)
      if (hotels && Array.isArray(hotels)) {
        for (const h of hotels) {
          await tx.umrahHotelBooking.create({
            data: {
              bookingId: created.id,
              cityId: h.cityId,
              hotelId: h.hotelId,
              checkInDate: new Date(h.checkInDate),
              checkOutDate: new Date(h.checkOutDate),
              brn: h.brn ?? undefined,
              isAlternate: h.isAlternate || false
            }
          });
        }
      } else {
        const parentHotels = await tx.umrahHotelBooking.findMany({
          where: { bookingId: parentBooking.id }
        });
        for (const h of parentHotels) {
          await tx.umrahHotelBooking.create({
            data: {
              bookingId: created.id,
              cityId: h.cityId,
              hotelId: h.hotelId,
              checkInDate: h.checkInDate,
              checkOutDate: h.checkOutDate,
              brn: h.brn ?? undefined,
              isAlternate: h.isAlternate
            }
          });
        }
      }

      // 7. Create movement details (either from payload or fall back to copying parent movements)
      if (movements && Array.isArray(movements)) {
        for (const m of movements) {
          await tx.umrahMovementDetail.create({
            data: {
              bookingId: created.id,
              travelDateTime: new Date(m.travelDateTime),
              fromCityId: m.fromCityId,
              fromLocationId: m.fromLocationId,
              toCityId: m.toCityId,
              toLocationId: m.toLocationId,
              isAlternate: m.isAlternate || false
            }
          });
        }
      } else {
        const parentMovements = await tx.umrahMovementDetail.findMany({
          where: { bookingId: parentBooking.id }
        });
        for (const m of parentMovements) {
          await tx.umrahMovementDetail.create({
            data: {
              bookingId: created.id,
              travelDateTime: m.travelDateTime,
              fromCityId: m.fromCityId,
              fromLocationId: m.fromLocationId,
              toCityId: m.toCityId,
              toLocationId: m.toLocationId,
              isAlternate: m.isAlternate
            }
          });
        }
      }

      return created;
    });

    res.json({
      message: 'Booking recreated successfully',
      bookingId: newBooking.id,
      bookingReference: newBooking.bookingReference
    });
  } catch (error: any) {
    console.error('Error recreating booking:', error);
    res.status(500).json({ error: error.message || 'Failed to recreate booking' });
  }
});

export default router;
