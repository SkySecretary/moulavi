import prisma from '../lib/prisma';
import { combineDateTime, formatTime } from './datetime';

/**
 * Syncs a Voucher's flights, hotels, and movements back to the matching active Booking (where isAlternate = false).
 */
export async function syncVoucherToBooking(tx: any, voucherId: string) {
  const db = tx || prisma;
  
  // Fetch the voucher with its related flights, hotels, and movements
  const voucher = await db.voucher.findUnique({
    where: { id: voucherId },
    include: {
      flights: true,
      hotels: { orderBy: { number: 'asc' } },
      movements: { orderBy: { sr: 'asc' } },
    },
  });

  if (!voucher || !voucher.bookingId) return;

  const bookingId = voucher.bookingId;

  // 1. Sync flights (VoucherFlight) -> Booking's UmrahTravelDetails
  const arrivalFlight = voucher.flights.find((f: any) => f.type === 'AA');
  const departureFlight = voucher.flights.find((f: any) => f.type === 'AD');

  if (arrivalFlight || departureFlight) {
    const existingTravel = await db.umrahTravelDetails.findUnique({
      where: { bookingId_isAlternate: { bookingId, isAlternate: false } },
    });

    const parseFlightDateTime = (flightDate: Date, timeStr?: string | null) => {
      if (!timeStr) return flightDate;
      const combined = combineDateTime(flightDate, timeStr);
      return combined || flightDate;
    };

    const arrivalDateTime = arrivalFlight 
      ? parseFlightDateTime(arrivalFlight.date, arrivalFlight.eta) 
      : (existingTravel?.arrivalDateTime || new Date());
      
    const departureDateTime = departureFlight 
      ? parseFlightDateTime(departureFlight.date, departureFlight.etd) 
      : (existingTravel?.departureDateTime || new Date());

    const getFlightNum = (flight: any) => {
      if (!flight) return '';
      const carrier = (flight.carrier || '').trim();
      const num = (flight.number || '').trim();
      if (!carrier) return num;
      if (!num) return carrier;
      if (num.startsWith(carrier)) return num;
      return `${carrier}-${num}`;
    };

    const arrivalFlightNumber = arrivalFlight ? getFlightNum(arrivalFlight) : (existingTravel?.arrivalFlightNumber || '');
    const departureFlightNumber = departureFlight ? getFlightNum(departureFlight) : (existingTravel?.departureFlightNumber || '');

    // Resolve airport LocationMaster IDs by code or name
    const findAirportId = async (codeOrName: string, fallbackId?: string | null) => {
      if (!codeOrName) return fallbackId || null;
      const cleanVal = codeOrName.trim().toUpperCase();
      
      let loc = await db.locationMaster.findFirst({
        where: { locationType: 'AIRPORT', code: cleanVal, isActive: true },
      });
      if (loc) return loc.id;
      
      loc = await db.locationMaster.findFirst({
        where: { locationType: 'AIRPORT', name: { contains: codeOrName }, isActive: true },
      });
      return loc ? loc.id : (fallbackId || null);
    };

    const arrivalAirportId = arrivalFlight 
      ? await findAirportId(arrivalFlight.from, existingTravel?.arrivalAirportId) 
      : existingTravel?.arrivalAirportId;
      
    const departureAirportId = departureFlight 
      ? await findAirportId(departureFlight.to, existingTravel?.departureAirportId) 
      : existingTravel?.departureAirportId;

    if (arrivalAirportId && departureAirportId) {
      await db.umrahTravelDetails.upsert({
        where: { bookingId_isAlternate: { bookingId, isAlternate: false } },
        update: {
          arrivalDateTime,
          arrivalFlightNumber,
          departureDateTime,
          departureFlightNumber,
          arrivalAirportId,
          departureAirportId,
        },
        create: {
          bookingId,
          isAlternate: false,
          arrivalDateTime,
          arrivalFlightNumber,
          departureDateTime,
          departureFlightNumber,
          arrivalAirportId,
          departureAirportId,
        },
      });
    }
  }

  // 2. Sync hotels (VoucherHotel) -> Booking's UmrahHotelBooking
  if (voucher.hotels.length > 0) {
    const existingHotels = await db.umrahHotelBooking.findMany({
      where: { bookingId, isAlternate: false },
      orderBy: { checkInDate: 'asc' },
    });

    for (let i = 0; i < voucher.hotels.length; i++) {
      const vHotel = voucher.hotels[i];
      const existingHotel = existingHotels[i];

      let hotelId = existingHotel?.hotelId;
      let cityId = existingHotel?.cityId;

      // Find hotel by name
      if (vHotel.hotelName) {
        const hotelLoc = await db.locationMaster.findFirst({
          where: { locationType: 'HOTEL', name: { contains: vHotel.hotelName }, isActive: true },
        });
        if (hotelLoc) {
          hotelId = hotelLoc.id;
          cityId = hotelLoc.cityId;
        }
      }

      // If we couldn't resolve cityId, check city name
      if (!cityId && vHotel.location) {
        const cityObj = await db.cityMaster.findFirst({
          where: { name: { contains: vHotel.location } },
        });
        if (cityObj) {
          cityId = cityObj.id;
        }
      }

      const brnJson = vHotel.brn ? vHotel.brn.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const cateringBrnJson = vHotel.cateringBrn ? vHotel.cateringBrn.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

      if (hotelId && cityId) {
        if (existingHotel) {
          await db.umrahHotelBooking.update({
            where: { id: existingHotel.id },
            data: {
              hotelId,
              cityId,
              checkInDate: vHotel.checkIn,
              checkOutDate: vHotel.checkOut,
              brn: brnJson,
              cateringBrn: cateringBrnJson,
            },
          });
        } else {
          await db.umrahHotelBooking.create({
            data: {
              bookingId,
              isAlternate: false,
              hotelId,
              cityId,
              checkInDate: vHotel.checkIn,
              checkOutDate: vHotel.checkOut,
              brn: brnJson,
              cateringBrn: cateringBrnJson,
            },
          });
        }
      }
    }

    // Delete extra hotel bookings
    if (existingHotels.length > voucher.hotels.length) {
      const idsToDelete = existingHotels.slice(voucher.hotels.length).map((h: any) => h.id);
      await db.umrahHotelBooking.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }

  // 3. Sync movements (VoucherMovement) -> Booking's UmrahMovementDetail
  if (voucher.movements.length > 0) {
    const existingMovements = await db.umrahMovementDetail.findMany({
      where: { bookingId, isAlternate: false },
      orderBy: { travelDateTime: 'asc' },
    });

    for (let i = 0; i < voucher.movements.length; i++) {
      const vMove = voucher.movements[i];
      const existingMove = existingMovements[i];

      const travelDateTime = combineDateTime(vMove.date, vMove.time || '12:00') || vMove.date;

      let fromLocationId = vMove.fromLocationId || existingMove?.fromLocationId;
      let toLocationId = vMove.toLocationId || existingMove?.toLocationId;

      let fromCityId = existingMove?.fromCityId;
      let toCityId = existingMove?.toCityId;

      // Look up city IDs from locations
      if (fromLocationId) {
        const loc = await db.locationMaster.findUnique({ where: { id: fromLocationId } });
        if (loc) fromCityId = loc.cityId;
      }
      if (toLocationId) {
        const loc = await db.locationMaster.findUnique({ where: { id: toLocationId } });
        if (loc) toCityId = loc.cityId;
      }

      // Fallbacks by name
      if (!fromLocationId && vMove.fromLocation) {
        const loc = await db.locationMaster.findFirst({
          where: { name: { contains: vMove.fromLocation }, isActive: true },
        });
        if (loc) {
          fromLocationId = loc.id;
          fromCityId = loc.cityId;
        }
      }
      if (!toLocationId && vMove.toLocation) {
        const loc = await db.locationMaster.findFirst({
          where: { name: { contains: vMove.toLocation }, isActive: true },
        });
        if (loc) {
          toLocationId = loc.id;
          toCityId = loc.cityId;
        }
      }

      if (fromLocationId && toLocationId && fromCityId && toCityId) {
        if (existingMove) {
          await db.umrahMovementDetail.update({
            where: { id: existingMove.id },
            data: {
              travelDateTime,
              fromLocationId,
              toLocationId,
              fromCityId,
              toCityId,
              viabadrOverride: vMove.viaBdr,
            },
          });
        } else {
          await db.umrahMovementDetail.create({
            data: {
              bookingId,
              isAlternate: false,
              travelDateTime,
              fromLocationId,
              toLocationId,
              fromCityId,
              toCityId,
              viabadrOverride: vMove.viaBdr,
            },
          });
        }
      }
    }

    // Delete extra movements
    if (existingMovements.length > voucher.movements.length) {
      const idsToDelete = existingMovements.slice(voucher.movements.length).map((m: any) => m.id);
      await db.umrahMovementDetail.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }
}

/**
 * Syncs an active Booking's travel details, hotels, and movements to its associated Voucher (if generated).
 */
export async function syncBookingToVoucher(tx: any, bookingId: string) {
  const db = tx || prisma;

  // Find associated voucher
  const voucher = await db.voucher.findFirst({
    where: { bookingId },
  });

  if (!voucher) return; // No voucher generated yet

  // Fetch complete booking details
  const booking = await db.umrahVisaBooking.findUnique({
    where: { id: bookingId },
    include: {
      travelDetails: {
        where: { isAlternate: false },
        include: { arrivalAirport: true, departureAirport: true },
      },
      hotelBookings: {
        where: { isAlternate: false },
        include: { hotel: true, city: true },
      },
      movementDetails: {
        where: { isAlternate: false },
        include: { fromLocation: true, toLocation: true, fromCity: true, toCity: true },
      },
    },
  });

  if (!booking) return;

  // 1. Sync flights (VoucherFlight)
  const mainTravel = booking.travelDetails?.[0];
  if (mainTravel) {
    await db.voucherFlight.deleteMany({ where: { voucherId: voucher.id } });

    const flightsToCreate = [];
    if (mainTravel.arrivalDateTime) {
      const carrier = mainTravel.arrivalFlightNumber?.includes('-') 
        ? mainTravel.arrivalFlightNumber.split('-')[0] 
        : (mainTravel.arrivalFlightNumber?.substring(0, 2) || '');
      const number = mainTravel.arrivalFlightNumber?.includes('-') 
        ? mainTravel.arrivalFlightNumber.split('-')[1] 
        : (mainTravel.arrivalFlightNumber?.substring(2) || '');
      
      flightsToCreate.push({
        voucherId: voucher.id,
        type: 'AA',
        carrier,
        number,
        date: mainTravel.arrivalDateTime,
        from: mainTravel.arrivalAirport?.code || mainTravel.arrivalAirport?.name || '',
        to: 'JED',
        eta: formatTime(mainTravel.arrivalDateTime),
        etd: '',
      });
    }

    if (mainTravel.departureDateTime) {
      const carrier = mainTravel.departureFlightNumber?.includes('-') 
        ? mainTravel.departureFlightNumber.split('-')[0] 
        : (mainTravel.departureFlightNumber?.substring(0, 2) || '');
      const number = mainTravel.departureFlightNumber?.includes('-') 
        ? mainTravel.departureFlightNumber.split('-')[1] 
        : (mainTravel.departureFlightNumber?.substring(2) || '');

      flightsToCreate.push({
        voucherId: voucher.id,
        type: 'AD',
        carrier,
        number,
        date: mainTravel.departureDateTime,
        from: 'JED',
        to: mainTravel.departureAirport?.code || mainTravel.departureAirport?.name || '',
        eta: '',
        etd: formatTime(mainTravel.departureDateTime),
      });
    }

    if (flightsToCreate.length > 0) {
      await db.voucherFlight.createMany({ data: flightsToCreate });
    }
  }

  // 2. Sync hotels (VoucherHotel)
  if (booking.hotelBookings && booking.hotelBookings.length > 0) {
    await db.voucherHotel.deleteMany({ where: { voucherId: voucher.id } });

    const hotelsToCreate = booking.hotelBookings.map((hb: any, idx: number) => {
      let brnValue: string | null = null;
      if (hb.brn) {
        if (Array.isArray(hb.brn)) {
          brnValue = hb.brn.join(', ');
        } else if (typeof hb.brn === 'string') {
          brnValue = hb.brn;
        }
      }

      let cateringBrnValue: string | null = null;
      if (hb.cateringBrn) {
        if (Array.isArray(hb.cateringBrn)) {
          cateringBrnValue = hb.cateringBrn.join(', ');
        } else if (typeof hb.cateringBrn === 'string') {
          cateringBrnValue = hb.cateringBrn;
        }
      }

      const days = Math.ceil((new Date(hb.checkOutDate).getTime() - new Date(hb.checkInDate).getTime()) / (1000 * 60 * 60 * 24));

      return {
        voucherId: voucher.id,
        number: idx + 1,
        location: hb.city?.name || '',
        hotelName: hb.hotel?.name || '',
        checkIn: hb.checkInDate,
        checkOut: hb.checkOutDate,
        days: days || 0,
        brn: brnValue,
        cateringBrn: cateringBrnValue,
      };
    });

    await db.voucherHotel.createMany({ data: hotelsToCreate });
  }

  // 3. Sync movements (VoucherMovement)
  if (booking.movementDetails && booking.movementDetails.length > 0) {
    const existingVoucherMovements = await db.voucherMovement.findMany({
      where: { voucherId: voucher.id },
      orderBy: { sr: 'asc' },
    });

    await db.voucherMovement.deleteMany({ where: { voucherId: voucher.id } });

    const movementsToCreate = booking.movementDetails.map((md: any, idx: number) => {
      const existing = existingVoucherMovements[idx];
      
      return {
        voucherId: voucher.id,
        sr: idx + 1,
        route: existing?.route || null,
        date: md.travelDateTime,
        time: formatTime(md.travelDateTime),
        from: md.fromCity?.name || '',
        fromLocation: md.fromLocation?.name || '',
        fromLocationId: md.fromLocationId || null,
        to: md.toCity?.name || '',
        toLocation: md.toLocation?.name || '',
        toLocationId: md.toLocationId || null,
        driverDetails1: existing?.driverDetails1 || null,
        driverDetails2: existing?.driverDetails2 || null,
        vehicleNumber: existing?.vehicleNumber || null,
        paxCount: existing?.paxCount || booking.passengerCount || null,
        price: existing?.price || null,
        vehicleType: existing?.vehicleType || null,
        viaBdr: md.viabadrOverride,
      };
    });

    if (movementsToCreate.length > 0) {
      await db.voucherMovement.createMany({ data: movementsToCreate });
    }
  }

  // Update main voucher attributes
  await db.voucher.update({
    where: { id: voucher.id },
    data: {
      paxCount: booking.passengerCount,
      groupCode: booking.groupNumber || null,
      groupName: booking.groupName || null,
      umrahVisaProviderId: booking.umrahVisaProviderId || null,
      umrahCompanyId: booking.umrahVisaProviderId || null,
      transportCompanyId: booking.transportCompanyId || null,
      version: voucher.version + 1,
    },
  });
}
