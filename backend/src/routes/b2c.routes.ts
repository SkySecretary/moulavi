import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { generateAccessToken } from '../utils/jwt';
import { InventoryService } from '../services/inventoryService';
import { sendCustomWhatsApp } from '../services/whatsappService';
import { FlightService } from '../services/flightService';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const router = Router();

// Validation helpers
const validateMobile = [
  body('mobileNumber').isString().notEmpty().withMessage('Mobile number is required'),
];

const validateOtpVerify = [
  body('mobileNumber').isString().notEmpty().withMessage('Mobile number is required'),
  body('otp').isString().isLength({ min: 4, max: 4 }).withMessage('Invalid OTP code'),
];

// ==========================================
// 1. Tour Packages Catalog & CRUD
// ==========================================
router.get(
  '/packages',
  asyncHandler(async (req: any, res: Response) => {
    const packages = await prisma.packageMaster.findMany({
      where: { isActive: true },
      include: {
        makkahHotel: true,
        madinahHotel: true,
        transportRoute: true,
      },
    });

    res.json({
      success: true,
      data: packages,
    });
  })
);

router.post(
  '/packages',
  asyncHandler(async (req: any, res: Response) => {
    const { 
      title, 
      description, 
      durationDays, 
      makkahNights, 
      madinahNights, 
      makkahHotelId, 
      madinahHotelId, 
      transportRouteId, 
      flightCost, 
      baseCost, 
      price 
    } = req.body;

    const tourPackage = await prisma.packageMaster.create({
      data: {
        title,
        description,
        durationDays: parseInt(durationDays, 10),
        makkahNights: parseInt(makkahNights, 10),
        madinahNights: parseInt(madinahNights, 10),
        makkahHotelId,
        madinahHotelId,
        transportRouteId,
        flightCost: Number(flightCost),
        baseCost: Number(baseCost),
        price: Number(price),
      },
    });

    res.status(201).json({
      success: true,
      data: tourPackage,
      message: 'B2C Tour Package created successfully',
    });
  })
);

router.put(
  '/packages/:id',
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { 
      title, 
      description, 
      durationDays, 
      makkahNights, 
      madinahNights, 
      makkahHotelId, 
      madinahHotelId, 
      transportRouteId, 
      flightCost, 
      baseCost, 
      price,
      isActive
    } = req.body;

    const tourPackage = await prisma.packageMaster.update({
      where: { id },
      data: {
        title,
        description,
        durationDays: durationDays !== undefined ? parseInt(durationDays, 10) : undefined,
        makkahNights: makkahNights !== undefined ? parseInt(makkahNights, 10) : undefined,
        madinahNights: madinahNights !== undefined ? parseInt(madinahNights, 10) : undefined,
        makkahHotelId,
        madinahHotelId,
        transportRouteId,
        flightCost: flightCost !== undefined ? Number(flightCost) : undefined,
        baseCost: baseCost !== undefined ? Number(baseCost) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({
      success: true,
      data: tourPackage,
      message: 'B2C Tour Package updated successfully',
    });
  })
);

router.delete(
  '/packages/:id',
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    await prisma.packageMaster.delete({ where: { id } });
    res.json({
      success: true,
      message: 'B2C Tour Package deleted successfully',
    });
  })
);

// ==========================================
// 2. Dynamic Markup Configurations CRUD
// ==========================================
router.get(
  '/configs',
  asyncHandler(async (req: any, res: Response) => {
    const configs = await prisma.b2CConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      success: true,
      data: configs,
    });
  })
);

router.post(
  '/configs',
  asyncHandler(async (req: any, res: Response) => {
    const { ruleName, markupType, value, targetService } = req.body;

    const config = await prisma.b2CConfig.create({
      data: {
        ruleName,
        markupType,
        value: Number(value),
        targetService,
      },
    });

    res.status(201).json({
      success: true,
      data: config,
      message: 'B2C Pricing Markup rule created successfully',
    });
  })
);

router.put(
  '/configs/:id',
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { ruleName, markupType, value, targetService, isActive } = req.body;

    const config = await prisma.b2CConfig.update({
      where: { id },
      data: {
        ruleName,
        markupType,
        value: value !== undefined ? Number(value) : undefined,
        targetService,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({
      success: true,
      data: config,
      message: 'B2C Pricing Markup rule updated successfully',
    });
  })
);

router.delete(
  '/configs/:id',
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    await prisma.b2CConfig.delete({ where: { id } });
    res.json({
      success: true,
      message: 'B2C Pricing Markup rule deleted successfully',
    });
  })
);

// ==========================================
// 3. Custom Package Pricing Quote Calculator
// ==========================================
router.post(
  '/builder/quote',
  asyncHandler(async (req: any, res: Response) => {
    const { 
      makkahHotelId, 
      madinahHotelId, 
      makkahNights, 
      madinahNights, 
      travelersCount, 
      transportOptionId, 
      flightOptionId,
      flightPrice: bodyFlightPrice,
      accommodationType
    } = req.body;

    // Fetch resources
    const makkahHotel = makkahHotelId ? await prisma.locationMaster.findUnique({ where: { id: makkahHotelId } }) : null;
    const madinahHotel = madinahHotelId ? await prisma.locationMaster.findUnique({ where: { id: madinahHotelId } }) : null;

    // Fetch dynamic markup configs
    const markups = await prisma.b2CConfig.findMany({ where: { isActive: true } });

    // Define base cost constants
    const makkahPriceNight = makkahHotel ? (Number((makkahHotel as any).pricePerNight || (makkahHotel as any).price) || (makkahHotel.name.includes("Swiss") ? 580 : makkahHotel.name.includes("Zamzam") ? 450 : 280)) : 0;
    const madinahPriceNight = madinahHotel ? (Number((madinahHotel as any).pricePerNight || (madinahHotel as any).price) || (madinahHotel.name.includes("Oberoi") ? 650 : madinahHotel.name.includes("Mövenpick") ? 390 : 240)) : 0;
    
    let routePrice = 0;
    if (transportOptionId) {
      if (transportOptionId === 'r-1' || transportOptionId === 'r-3') {
        routePrice = 600;
      } else if (transportOptionId === 'r-2') {
        routePrice = 400;
      } else {
        const rt = await prisma.transportRouteMaster.findUnique({
          where: { id: transportOptionId },
          include: { transports: true }
        });
        if (rt && rt.transports && rt.transports.length > 0) {
          routePrice = Number(rt.transports[0].price) || 500;
        } else {
          routePrice = 500;
        }
      }
    }

    let flightPrice = 0;
    if (flightOptionId !== 'none') {
      if (typeof bodyFlightPrice === 'number') {
        flightPrice = bodyFlightPrice;
      } else {
        flightPrice = flightOptionId === 'flt-nas' ? 650 : flightOptionId === 'flt-sv' ? 980 : 1450;
      }
    }

    const visaCost = accommodationType === 'iqama' ? 0 : 450;

    let totalSubtotal = 
      (makkahPriceNight * makkahNights) +
      (madinahPriceNight * madinahNights) +
      (flightPrice * travelersCount) +
      routePrice +
      (visaCost * travelersCount);

    // Apply active markups
    for (const markup of markups) {
      const val = Number(markup.value);
      if (markup.markupType === 'FIXED') {
        totalSubtotal += val;
      } else if (markup.markupType === 'PERCENTAGE') {
        totalSubtotal += totalSubtotal * (val / 100);
      }
    }

    const vat = Math.round(totalSubtotal * 0.15);
    const grandTotal = totalSubtotal + vat;

    res.json({
      success: true,
      data: {
        subtotal: Math.round(totalSubtotal),
        vat,
        total: Math.round(grandTotal),
      },
    });
  })
);

// ==========================================
// 3.5. Flight Lookup API
// ==========================================
router.get(
  '/flights/search',
  asyncHandler(async (req: any, res: Response) => {
    const origin = (req.query.origin as string) || 'JED';
    const destination = (req.query.destination as string) || 'DXB';
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const flights = await FlightService.searchFlights(origin, destination, date);
    res.json({
      success: true,
      data: flights
    });
  })
);

let airportsData: any = null;

function getAirportsData() {
  if (!airportsData) {
    try {
      const filePath = path.join(__dirname, '../data/airports.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        airportsData = JSON.parse(raw);
      } else {
        airportsData = {};
      }
    } catch (err) {
      console.error('Failed to load airports.json:', err);
      airportsData = {};
    }
  }
  return airportsData;
}

router.get(
  '/flights/airports',
  asyncHandler(async (req: any, res: Response) => {
    const search = (req.query.search as string || '').trim().toLowerCase();
    if (!search || search.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const data = getAirportsData();
    const results: any[] = [];

    for (const key of Object.keys(data)) {
      const apt = data[key];
      if (!apt.iata) continue;

      const name = (apt.name || '').toLowerCase();
      const city = (apt.city || '').toLowerCase();
      const iata = (apt.iata || '').toLowerCase();
      const country = (apt.country || '').toLowerCase();

      if (
        iata === search ||
        name.includes(search) ||
        city.includes(search) ||
        country.includes(search)
      ) {
        results.push({
          id: `apt-${apt.iata.toLowerCase()}`,
          name: `${apt.city || apt.name} - ${apt.name} (${apt.iata})`,
          city: apt.city || ''
        });
      }

      if (results.length >= 80) {
        break;
      }
    }

    res.json({ success: true, data: results });
  })
);

// ==========================================
// 4. Passwordless OTP Request (via WhatsApp)
// ==========================================
router.post(
  '/auth/otp-request',
  validateMobile,
  asyncHandler(async (req: any, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobileNumber, email, fullName } = req.body;
    const cleanMobile = mobileNumber.trim();
    
    const code = Math.floor(1000 + Math.random() * 9000).toString(); 
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    let consumer = await prisma.b2CConsumer.findUnique({
      where: { mobileNumber: cleanMobile },
    });

    if (!consumer) {
      consumer = await prisma.b2CConsumer.create({
        data: {
          mobileNumber: cleanMobile,
          email: email || `${cleanMobile}@moulavi.in`,
          fullName: fullName || 'Pilgrim',
          otpToken: code,
          otpExpiresAt: expiresAt,
        },
      });
    } else {
      consumer = await prisma.b2CConsumer.update({
        where: { id: consumer.id },
        data: {
          otpToken: code,
          otpExpiresAt: expiresAt,
        },
      });
    }

    try {
      const message = `*Moulavi Travels B2C Direct Portal*\n\nYour 4-digit verification code is: *${code}*.\nExpires in 15 minutes.`;
      await sendCustomWhatsApp(cleanMobile, message);
      console.log(`[B2C OTP] Verification code sent to ${cleanMobile}: ${code}`);
    } catch (err: any) {
      console.error('[B2C OTP] WhatsApp send failed:', err.message);
    }

    res.json({
      success: true,
      message: 'Verification OTP sent to WhatsApp successfully',
    });
  })
);

// ==========================================
// 5. Passwordless OTP Verify
// ==========================================
router.post(
  '/auth/otp-verify',
  validateOtpVerify,
  asyncHandler(async (req: any, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobileNumber, otp } = req.body;
    const cleanMobile = mobileNumber.trim();

    const consumer = await prisma.b2CConsumer.findUnique({
      where: { mobileNumber: cleanMobile },
    });

    if (!consumer || consumer.otpToken !== otp) {
      return res.status(401).json({ success: false, error: 'Invalid verification code' });
    }

    if (consumer.otpExpiresAt && consumer.otpExpiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Verification code expired' });
    }

    await prisma.b2CConsumer.update({
      where: { id: consumer.id },
      data: { otpToken: null, otpExpiresAt: null },
    });

    const tokenPayload = {
      id: consumer.id,
      email: consumer.email,
      name: consumer.fullName,
      role: 'consumer' as any,
    };

    const token = generateAccessToken(tokenPayload);

    res.json({
      success: true,
      data: {
        token,
        consumer: {
          id: consumer.id,
          fullName: consumer.fullName,
          email: consumer.email,
          mobileNumber: consumer.mobileNumber,
        },
      },
      message: 'OTP verified successfully',
    });
  })
);

// ==========================================
// 6. B2C Booking & Allotment Checkout
// ==========================================
router.post(
  '/booking/checkout',
  asyncHandler(async (req: any, res: Response) => {
    const { 
      consumerId, 
      fullName, 
      passportNumber, 
      nationality, 
      mobileNumber, 
      email, 
      checkInDate, 
      makkahNights, 
      madinahNights, 
      travelersCount, 
      makkahHotelId, 
      madinahHotelId,
      transportOptionId,
      accommodationType,
      isWithoutTicket,
      arrivalFlightNumber,
      arrivalDateTime,
      arrivalAirportId,
      departureFlightNumber,
      departureDateTime,
      departureAirportId,
      iqamaNumber,
      iqamaSponserName,
      sponserDob,
      sponserMobileNumber,
      movements,
      passengers
    } = req.body;

    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) {
      return res.status(500).json({ success: false, error: 'Admin user account missing' });
    }

    const airport = await prisma.locationMaster.findFirst({
      where: { locationType: 'AIRPORT' }
    });
    const defaultAirportId = airport?.id || (await prisma.locationMaster.findFirst())?.id;
    if (!defaultAirportId) {
      return res.status(500).json({ success: false, error: 'Location master seeding missing' });
    }

    let b2cParty = await prisma.party.findUnique({
      where: { email: 'b2c-direct@moulavi.in' },
    });

    if (!b2cParty) {
      const currency = await prisma.currencyMaster.findFirst();
      if (!currency) {
        return res.status(500).json({ success: false, error: 'Currency masters seeding missing' });
      }

      b2cParty = await prisma.party.create({
        data: {
          partyCode: 'B2C_DIRECT',
          partyName: 'B2C Consumer Channel',
          email: 'b2c-direct@moulavi.in',
          customerType: 'direct',
          isCustomer: true,
          isSupplier: false,
          createdBy: adminUser.id,
          accountCurrencyId: currency.id,
        },
      });
    }

    // Validate that the airport IDs exist in the database, otherwise fallback to default
    let validatedArrivalAirportId = defaultAirportId;
    if (arrivalAirportId) {
      const airportExists = await prisma.locationMaster.findUnique({ where: { id: arrivalAirportId } });
      if (airportExists) {
        validatedArrivalAirportId = arrivalAirportId;
      }
    }

    let validatedDepartureAirportId = defaultAirportId;
    if (departureAirportId) {
      const airportExists = await prisma.locationMaster.findUnique({ where: { id: departureAirportId } });
      if (airportExists) {
        validatedDepartureAirportId = departureAirportId;
      }
    }

    // Validate consumerId exists in B2CConsumer table
    let validatedConsumerId = null;
    if (consumerId) {
      const consumerExists = await prisma.b2CConsumer.findUnique({ where: { id: consumerId } });
      if (consumerExists) {
        validatedConsumerId = consumerId;
      }
    }

    const makkahHotel = makkahHotelId ? await prisma.locationMaster.findUnique({ where: { id: makkahHotelId } }) : null;
    const madinahHotel = madinahHotelId ? await prisma.locationMaster.findUnique({ where: { id: madinahHotelId } }) : null;

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const bookingRef = `UMR-2026-${randomSuffix}`;

    const booking = await prisma.umrahVisaBooking.create({
      data: {
        partyId: b2cParty.id,
        consumerId: validatedConsumerId,
        bookingReference: bookingRef,
        passengerCount: travelersCount || 1,
        visaType: 'individual_visa',
        accommodationType: accommodationType || 'hotel',
        isWithoutTicket: !!isWithoutTicket,
        status: 'booking_success', 
        groupName: `B2C-${fullName.split(' ')[0]}`,
        passengers: {
          create: (passengers && Array.isArray(passengers) && passengers.length > 0)
            ? passengers.map((p: any) => ({
                fullName: p.fullName || 'Pilgrim',
                passportNumber: p.passportNumber || '',
                nationality: p.nationality || 'US',
                gender: p.gender || 'MALE',
              }))
            : [
                {
                  fullName: fullName || 'Pilgrim',
                  passportNumber: passportNumber || '',
                  nationality: nationality || 'US',
                  gender: 'MALE',
                }
              ]
        },
        travelDetails: {
          create: [
            {
              arrivalDateTime: arrivalDateTime ? new Date(arrivalDateTime) : new Date(checkInDate),
              arrivalAirportId: validatedArrivalAirportId,
              arrivalFlightNumber: isWithoutTicket ? 'NT-0000' : (arrivalFlightNumber || 'SV-300'),
              departureDateTime: departureDateTime ? new Date(departureDateTime) : new Date(new Date(checkInDate).getTime() + (makkahNights + madinahNights) * 86400000),
              departureAirportId: validatedDepartureAirportId,
              departureFlightNumber: isWithoutTicket ? 'NT-0000' : (departureFlightNumber || 'SV-301'),
            }
          ]
        }
      }
    });

    if (accommodationType === 'iqama') {
      await prisma.umrahSponserIqamaDetails.create({
        data: {
          bookingId: booking.id,
          iqamaSponserName: iqamaSponserName || 'Sponsor Name',
          iqamaNumber: iqamaNumber || '1000000000',
          sponserDob: sponserDob ? new Date(sponserDob) : new Date(),
          sponserMobileNumber: sponserMobileNumber || mobileNumber,
          sponserNationalShortAddress: 'KSA Address',
          isAlternate: false,
          makkahHotelName: makkahHotel?.name || null,
          madinahHotelName: madinahHotel?.name || null,
        }
      });
    }

    if (makkahHotel) {
      await prisma.umrahHotelBooking.create({
        data: {
          bookingId: booking.id,
          hotelId: makkahHotel.id,
          cityId: makkahHotel.cityId,
          checkInDate: new Date(checkInDate),
          checkOutDate: new Date(new Date(checkInDate).getTime() + makkahNights * 86400000),
          brn: 'B2C_LOCK_BRN_1',
          bedsQuantity: travelersCount || 1,
        }
      });
      await InventoryService.recalculateInventory(makkahHotel.id, 'B2C_LOCK_BRN_1');
    }

    if (madinahHotel) {
      const madinahCheckIn = new Date(new Date(checkInDate).getTime() + makkahNights * 86400000);
      await prisma.umrahHotelBooking.create({
        data: {
          bookingId: booking.id,
          hotelId: madinahHotel.id,
          cityId: madinahHotel.cityId,
          checkInDate: madinahCheckIn,
          checkOutDate: new Date(madinahCheckIn.getTime() + madinahNights * 86400000),
          brn: 'B2C_LOCK_BRN_2',
          bedsQuantity: travelersCount || 1,
        }
      });
      await InventoryService.recalculateInventory(madinahHotel.id, 'B2C_LOCK_BRN_2');
    }

    if (movements && Array.isArray(movements)) {
      const defaultCity = await prisma.cityMaster.findFirst();
      const defaultCityId = defaultCity?.id || '';

      for (const m of movements) {
        const fromLocId = m.fromLocationId || makkahHotelId || defaultAirportId;
        const toLocId = m.toLocationId || madinahHotelId || defaultAirportId;
        
        const fromLoc = fromLocId ? await prisma.locationMaster.findUnique({ where: { id: fromLocId } }) : null;
        const toLoc = toLocId ? await prisma.locationMaster.findUnique({ where: { id: toLocId } }) : null;

        const resolvedFromLocId = fromLoc?.id || defaultAirportId;
        const resolvedToLocId = toLoc?.id || defaultAirportId;
        const fromCityId = fromLoc?.cityId || defaultCityId;
        const toCityId = toLoc?.cityId || defaultCityId;

        // Ensure dates are parsed correctly
        let travelDate = new Date(checkInDate);
        if (m.time) {
          const [hours, minutes] = m.time.split(':');
          travelDate.setUTCHours(parseInt(hours, 10) || 12);
          travelDate.setUTCMinutes(parseInt(minutes, 10) || 0);
        }

        await prisma.umrahMovementDetail.create({
          data: {
            bookingId: booking.id,
            travelDateTime: travelDate,
            fromLocationId: resolvedFromLocId,
            toLocationId: resolvedToLocId,
            fromCityId,
            toCityId,
            isAlternate: false,
          }
        });
      }
    }

    const voucherRef = `VCH-${randomSuffix}`;
    await prisma.voucher.create({
      data: {
        bookingId: booking.id,
        voucherNumber: voucherRef,
        reservationDate: new Date(),
        guestName: fullName,
        guestMobile: mobileNumber,
        partyId: b2cParty.id,
        paxCount: travelersCount || 1,
        generatedBy: adminUser.id,
        hotels: {
          create: [
            ...(makkahHotel ? [{
              number: 1,
              location: 'Makkah',
              hotelName: makkahHotel.name,
              checkIn: new Date(checkInDate),
              checkOut: new Date(new Date(checkInDate).getTime() + makkahNights * 86400000),
              days: makkahNights,
              brn: 'B2C_LOCK_BRN_1',
            }] : []),
            ...(madinahHotel ? [{
              number: 2,
              location: 'Madinah',
              hotelName: madinahHotel.name,
              checkIn: new Date(new Date(checkInDate).getTime() + makkahNights * 86400000),
              checkOut: new Date(new Date(checkInDate).getTime() + (makkahNights + madinahNights) * 86400000),
              days: madinahNights,
              brn: 'B2C_LOCK_BRN_2',
            }] : []),
          ]
        }
      }
    });

    try {
      const msg = `*Ministry of Hajj approved Umrah Voucher*\n\nDear ${fullName},\nYour booking is confirmed!\n\nBooking Ref: *${bookingRef}*\nVoucher Ref: *${voucherRef}*\nPassengers: *${travelersCount}* Pax\n\nKaaba awaits you. Safe travels!`;
      await sendCustomWhatsApp(mobileNumber, msg);
    } catch (err: any) {
      console.error('[B2C CHECKOUT] WhatsApp dispatch failed:', err.message);
    }

    res.status(201).json({
      success: true,
      bookingReference: bookingRef,
      message: 'B2C Booking completed, allotments locked, and WhatsApp voucher dispatched successfully',
    });
  })
);

export default router;
