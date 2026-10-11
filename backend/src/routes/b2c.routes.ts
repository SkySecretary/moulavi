import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { generateAccessToken } from '../utils/jwt';
import { InventoryService } from '../services/inventoryService';
import { sendCustomWhatsApp } from '../services/whatsappService';
import { FlightService } from '../services/flightService';
import { generateVoucherNumber } from '../services/voucherService';
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

    // Fetch ERP Calculator Master rates for consistent category-level pricing
    const calcMaster = await prisma.umrahCalculatorMaster.findFirst({ where: { isActive: true } });
    const hotelCategory = (req.body.hotelCategory || 'comfort').toLowerCase();

    let makkahPriceNight = 0;
    let madinahPriceNight = 0;

    if (calcMaster) {
      if (hotelCategory === 'luxury') {
        makkahPriceNight = Number(calcMaster.luxuryMakkahRateSAR) || 550;
        madinahPriceNight = Number(calcMaster.luxuryMadinahRateSAR) || 520;
      } else if (hotelCategory === 'economy') {
        makkahPriceNight = Number(calcMaster.economyMakkahRateSAR) || 220;
        madinahPriceNight = Number(calcMaster.economyMadinahRateSAR) || 200;
      } else {
        makkahPriceNight = Number(calcMaster.comfortMakkahRateSAR) || 360;
        madinahPriceNight = Number(calcMaster.comfortMadinahRateSAR) || 330;
      }
    } else {
      if (hotelCategory === 'luxury') {
        makkahPriceNight = 550;
        madinahPriceNight = 520;
      } else if (hotelCategory === 'economy') {
        makkahPriceNight = 220;
        madinahPriceNight = 200;
      } else {
        makkahPriceNight = 360;
        madinahPriceNight = 330;
      }
    }
    
    let routePrice = 0;
    const transportMasterId = req.body.transportMasterId;
    if (transportMasterId) {
      const tm = await prisma.transportMaster.findUnique({
        where: { id: transportMasterId }
      });
      if (tm) {
        routePrice = Number(tm.price) || 0;
      }
    } else if (transportOptionId) {
      if (transportOptionId === 'r-1' || transportOptionId === 'r-3') {
        routePrice = 600;
      } else if (transportOptionId === 'r-2') {
        routePrice = 400;
      } else {
        const tm = await prisma.transportMaster.findFirst({
          where: { id: transportOptionId }
        });
        if (tm) {
          routePrice = Number(tm.price) || 0;
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

    const processingFee = Math.round(totalSubtotal * 0.015);
    const grandTotal = totalSubtotal + processingFee;

    res.json({
      success: true,
      data: {
        subtotal: Math.round(totalSubtotal),
        processingFee,
        vat: processingFee, // Backward compatible field
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

    const fallbackEmail = email && email.trim() ? email.trim() : `${cleanMobile}@moulavi.in`;

    if (!consumer) {
      // Check if another consumer with the exact same email already exists to prevent unique constraint failure
      const existingEmailConsumer = await prisma.b2CConsumer.findUnique({
        where: { email: fallbackEmail }
      });

      if (existingEmailConsumer) {
        // Associate this existing record with the current mobile and update OTP
        consumer = await prisma.b2CConsumer.update({
          where: { id: existingEmailConsumer.id },
          data: {
            mobileNumber: cleanMobile,
            fullName: fullName || existingEmailConsumer.fullName,
            otpToken: code,
            otpExpiresAt: expiresAt,
          }
        });
      } else {
        consumer = await prisma.b2CConsumer.create({
          data: {
            mobileNumber: cleanMobile,
            email: fallbackEmail,
            fullName: fullName || 'Pilgrim',
            otpToken: code,
            otpExpiresAt: expiresAt,
          },
        });
      }
    } else {
      // If user provided a new email, verify it doesn't collide with another consumer before saving
      let targetEmail = consumer.email;
      if (email && email.trim() && email.trim() !== consumer.email) {
        const emailCollision = await prisma.b2CConsumer.findUnique({
          where: { email: email.trim() }
        });
        if (!emailCollision) {
          targetEmail = email.trim();
        }
      }

      consumer = await prisma.b2CConsumer.update({
        where: { id: consumer.id },
        data: {
          email: targetEmail,
          fullName: fullName || consumer.fullName,
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

    const voucherRef = await generateVoucherNumber(prisma);
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

    // Attach uploaded/provided documents if present
    if (req.body.documents && Array.isArray(req.body.documents) && req.body.documents.length > 0) {
      for (const doc of req.body.documents) {
        try {
          await prisma.document.create({
            data: {
              bookingId: booking.id,
              documentType: doc.documentType || 'passport_copy',
              fileName: doc.fileName || `doc-${Date.now()}.pdf`,
              filePath: doc.filePath || doc.url || '',
              fileSize: doc.fileSize || 0,
              mimeType: doc.mimeType || 'application/pdf',
            }
          });
        } catch (docErr: any) {
          console.warn('[B2C CHECKOUT] Document attach notice:', docErr.message);
        }
      }
    }

    try {
      const msg = `*Ministry of Hajj approved Umrah Voucher*\n\nDear ${fullName},\nYour booking is confirmed!\n\nBooking Ref: *${bookingRef}*\nVoucher Ref: *${voucherRef}*\nPassengers: *${travelersCount}* Pax\nType: *${(req.body.visaType || accommodationType || 'Umrah').toUpperCase()}*\n\nKaaba awaits you. Safe travels!`;
      await sendCustomWhatsApp(mobileNumber, msg);
    } catch (err: any) {
      console.error('[B2C CHECKOUT] WhatsApp dispatch failed:', err.message);
    }

    res.status(201).json({
      success: true,
      bookingReference: bookingRef,
      voucherNumber: voucherRef,
      id: booking.id,
      visaType: booking.visaType,
      accommodationType: booking.accommodationType,
      passengerCount: booking.passengerCount,
      message: 'B2C Booking completed, allotments locked, and WhatsApp voucher dispatched successfully',
    });
  })
);

// ==========================================
// 7. Dedicated B2C WhatsApp Automation Booking API
// ==========================================
router.post(
  '/whatsapp-booking',
  asyncHandler(async (req: any, res: Response) => {
    const {
      bookingType, // 're_entry' | 'individual' | 'group'
      guestName,
      guestMobile,
      passengerCount = 1,
      passengers = [],
      // Accommodation
      accommodationType = 'hotel', // 'hotel' | 'iqama'
      makkahHotelId,
      makkahHotelName,
      makkahNights = 4,
      madinahHotelId,
      madinahHotelName,
      madinahNights = 3,
      checkInDate = new Date().toISOString().split('T')[0],
      // Re-entry / Iqama Details
      iqamaNumber,
      iqamaSponserName,
      sponserDob,
      sponserMobileNumber,
      sponserNationalShortAddress,
      passportNumber,
      visaNumber,
      umrahVisaNumber,
      totalAmount,
      paymentStatus,
      paymentReceiptUrl,
      // Travel & Flight Details
      arrivalAirport,
      departureAirport,
      arrivalAirportCode = 'JED',
      arrivalAirportName,
      arrivalFlightNumber,
      arrivalDateTime,
      arrivalDate,
      arrivalTime,
      departureAirportCode = 'MED',
      departureAirportName,
      departureFlightNumber,
      departureDateTime,
      departureDate,
      departureTime,
      isWithoutTicket = false,
      isOneWay = false,
      // Movements / Transports
      movements = [],
      hasTransportation = false,
      vehicleType,
      // Group specifics
      groupNumber,
      groupName,
      // Documents
      documents = [],
    } = req.body;

    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) {
      return res.status(500).json({ success: false, error: 'Admin user configuration missing' });
    }

    let b2cParty = await prisma.party.findUnique({
      where: { email: 'b2c-direct@moulavi.in' },
    });

    if (!b2cParty) {
      const currency = await prisma.currencyMaster.findFirst();
      if (!currency) {
        return res.status(500).json({ success: false, error: 'Currency master seeding missing' });
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

    // Helper to resolve airport location by code, city or name
    const resolveAirport = async (codeOrName?: string) => {
      if (!codeOrName || !String(codeOrName).trim()) {
        const jed = await prisma.locationMaster.findFirst({
          where: { locationType: 'AIRPORT', code: 'JED' }
        });
        return jed || (await prisma.locationMaster.findFirst({ where: { locationType: 'AIRPORT' } }));
      }
      const clean = String(codeOrName).trim();
      const upper = clean.toUpperCase();
      let match = await prisma.locationMaster.findFirst({
        where: { locationType: 'AIRPORT', code: upper }
      });
      if (match) return match;
      match = await prisma.locationMaster.findFirst({
        where: {
          locationType: 'AIRPORT',
          OR: [
            { city: { contains: clean } },
            { name: { contains: clean } }
          ]
        }
      });
      if (match) return match;
      const jed = await prisma.locationMaster.findFirst({
        where: { locationType: 'AIRPORT', code: 'JED' }
      });
      return jed || (await prisma.locationMaster.findFirst({ where: { locationType: 'AIRPORT' } }));
    };

    const targetArrCode = arrivalAirport || arrivalAirportCode || 'JED';
    const targetDepCode = departureAirport || departureAirportCode || 'MED';

    const arrAirportLoc = await resolveAirport(targetArrCode);
    const depAirportLoc = await resolveAirport(targetDepCode);

    const defaultAirportId = arrAirportLoc?.id || (await prisma.locationMaster.findFirst())?.id || '';
    const departureAirportId = depAirportLoc?.id || defaultAirportId;

    // Resolve Makkah / Madinah Hotels
    let makkahHotel: any = null;
    if (makkahHotelId) {
      makkahHotel = await prisma.locationMaster.findUnique({ where: { id: makkahHotelId } });
    } else if (makkahHotelName) {
      makkahHotel = await prisma.locationMaster.findFirst({
        where: { name: { contains: makkahHotelName } }
      });
    }

    let madinahHotel: any = null;
    if (madinahHotelId) {
      madinahHotel = await prisma.locationMaster.findUnique({ where: { id: madinahHotelId } });
    } else if (madinahHotelName) {
      madinahHotel = await prisma.locationMaster.findFirst({
        where: { name: { contains: madinahHotelName } }
      });
    }

    const resolvedVisaType = bookingType === 're_entry' 
      ? 're_entry' 
      : bookingType === 'group' || (passengerCount > 10) 
      ? 'group_visa' 
      : 'individual_visa';

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const bookingRef = `UMR-2026-${randomSuffix}`;

    const numPax = parseInt(String(passengerCount), 10) || 1;
    const resolvedCheckIn = new Date(checkInDate);
    const numMakkahNights = parseInt(String(makkahNights), 10) || 0;
    const numMadinahNights = parseInt(String(madinahNights), 10) || 0;
    const totalNights = (numMakkahNights + numMadinahNights) || 7;

    // Format flight numbers cleanly
    const formatFlight = (raw?: string, fallback: string = 'SV-300') => {
      if (!raw || !String(raw).trim()) return fallback;
      const clean = String(raw).trim().toUpperCase();
      const m = clean.match(/^([A-Z0-9]{2,3})(\d{1,5})$/);
      return m ? `${m[1]}-${m[2]}` : clean;
    };

    const finalArrFlight = isWithoutTicket ? 'NT-0000' : formatFlight(arrivalFlightNumber, 'SV-300');
    const finalDepFlight = isWithoutTicket ? 'NT-0000' : formatFlight(departureFlightNumber, 'SV-301');

    // Parse arrival & departure datetimes
    let arrDateTime = new Date();
    if (arrivalDateTime) {
      arrDateTime = new Date(arrivalDateTime);
    } else if (arrivalDate) {
      const timePart = arrivalTime ? (arrivalTime.includes(':') ? arrivalTime : `${arrivalTime}:00`) : '12:00';
      const parsed = new Date(`${arrivalDate}T${timePart.length === 5 ? `${timePart}:00` : timePart}Z`);
      if (!isNaN(parsed.getTime())) arrDateTime = parsed;
    } else {
      arrDateTime = resolvedCheckIn;
    }

    let depDateTime = new Date(arrDateTime.getTime() + totalNights * 86400000);
    if (departureDateTime) {
      depDateTime = new Date(departureDateTime);
    } else if (departureDate) {
      const timePart = departureTime ? (departureTime.includes(':') ? departureTime : `${departureTime}:00`) : '12:00';
      const parsed = new Date(`${departureDate}T${timePart.length === 5 ? `${timePart}:00` : timePart}Z`);
      if (!isNaN(parsed.getTime())) depDateTime = parsed;
    }

    // Payment info for B2C whatsapp channel
    const paymentInfoJson = JSON.stringify({
      channel: 'whatsapp_b2c',
      orderId: `B2C-${bookingRef}`,
      amount: totalAmount ? Number(totalAmount) : 0,
      currency: 'INR',
      paymentStatus: paymentReceiptUrl ? 'PAID ONLINE' : (paymentStatus || 'PENDING'),
      paymentMethod: paymentReceiptUrl ? 'Receipt Uploaded / Verified' : 'B2C Channel',
      stayType: accommodationType === 'iqama' ? 'iqama' : 'hotel',
      paidAt: new Date().toISOString(),
    });

    const booking = await prisma.umrahVisaBooking.create({
      data: {
        partyId: b2cParty.id,
        bookingReference: bookingRef,
        passengerCount: numPax,
        visaType: resolvedVisaType,
        accommodationType: accommodationType === 'iqama' ? 'iqama' : 'hotel',
        isWithoutTicket: !!isWithoutTicket,
        isOneWay: !!isOneWay,
        guestName: guestName || 'B2C Pilgrim',
        guestMobile: guestMobile || '',
        status: resolvedVisaType === 're_entry' ? 'pending' : 'booking_success',
        requestNumber: resolvedVisaType === 're_entry' ? paymentInfoJson : null,
        groupNumber: groupNumber || (resolvedVisaType === 'group_visa' ? `GRP-${randomSuffix}` : null),
        groupName: groupName || `B2C-${(guestName || 'Pilgrim').split(' ')[0]}`,
        hasTransportation: hasTransportation || (movements && movements.length > 0),
        passengers: {
          create: (passengers && Array.isArray(passengers) && passengers.length > 0)
            ? passengers.map((p: any, idx: number) => ({
                fullName: p.fullName || guestName || 'Pilgrim',
                passportNumber: (idx === 0 && passportNumber) ? passportNumber : (p.passportNumber || ''),
                nationality: p.nationality || 'Saudi / Expat',
                gender: p.gender === 'female' || p.gender === 'FEMALE' ? 'female' : 'male',
                dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
                passportExpiry: p.passportExpiry ? new Date(p.passportExpiry) : null,
                phoneNumber: p.phoneNumber || guestMobile || '',
              }))
            : [
                {
                  fullName: guestName || 'Pilgrim',
                  passportNumber: passportNumber || '',
                  nationality: 'Saudi / Expat',
                  gender: 'male',
                }
              ]
        },
        travelDetails: {
          create: [
            {
              arrivalDateTime: arrDateTime,
              arrivalAirportId: defaultAirportId,
              arrivalFlightNumber: finalArrFlight,
              departureDateTime: depDateTime,
              departureAirportId: departureAirportId,
              departureFlightNumber: finalDepFlight,
            }
          ]
        }
      },
      include: {
        passengers: true,
      },
    });

    const leadPassenger = booking.passengers?.[0];

    // Handle Iqama Details for Re-Entry
    if (accommodationType === 'iqama' || bookingType === 're_entry') {
      await prisma.umrahSponserIqamaDetails.create({
        data: {
          bookingId: booking.id,
          iqamaSponserName: iqamaSponserName || guestName || 'Sponsor Name',
          iqamaNumber: iqamaNumber || '1000000000',
          sponserDob: sponserDob ? new Date(sponserDob) : new Date('1990-01-01'),
          sponserMobileNumber: sponserMobileNumber || guestMobile || '',
          sponserNationalShortAddress: sponserNationalShortAddress || 'KSA National Address',
          isAlternate: false,
          makkahHotelName: makkahHotelName || makkahHotel?.name || null,
          madinahHotelName: madinahHotelName || madinahHotel?.name || null,
        }
      });
    }

    // Handle Makkah Hotel
    if (makkahHotel && numMakkahNights > 0) {
      await prisma.umrahHotelBooking.create({
        data: {
          bookingId: booking.id,
          hotelId: makkahHotel.id,
          cityId: makkahHotel.cityId,
          checkInDate: resolvedCheckIn,
          checkOutDate: new Date(resolvedCheckIn.getTime() + numMakkahNights * 86400000),
          brn: 'B2C_AUTO_BRN_1',
          bedsQuantity: numPax,
        }
      });
      await InventoryService.recalculateInventory(makkahHotel.id, 'B2C_AUTO_BRN_1');
    }

    // Handle Madinah Hotel
    if (madinahHotel && numMadinahNights > 0) {
      const madinahCheckIn = new Date(resolvedCheckIn.getTime() + numMakkahNights * 86400000);
      await prisma.umrahHotelBooking.create({
        data: {
          bookingId: booking.id,
          hotelId: madinahHotel.id,
          cityId: madinahHotel.cityId,
          checkInDate: madinahCheckIn,
          checkOutDate: new Date(madinahCheckIn.getTime() + numMadinahNights * 86400000),
          brn: 'B2C_AUTO_BRN_2',
          bedsQuantity: numPax,
        }
      });
      await InventoryService.recalculateInventory(madinahHotel.id, 'B2C_AUTO_BRN_2');
    }

    // Handle Transport Movements
    if (movements && Array.isArray(movements) && movements.length > 0) {
      const defaultCity = await prisma.cityMaster.findFirst();
      const defaultCityId = defaultCity?.id || '';

      for (const m of movements) {
        let tDate = resolvedCheckIn;
        if (m.travelDateTime) {
          tDate = new Date(m.travelDateTime);
        } else if (m.date) {
          tDate = new Date(m.date);
        }

        await prisma.umrahMovementDetail.create({
          data: {
            bookingId: booking.id,
            travelDateTime: tDate,
            fromLocationId: m.fromLocationId || defaultAirportId,
            toLocationId: m.toLocationId || defaultAirportId,
            fromCityId: m.fromCityId || defaultCityId,
            toCityId: m.toCityId || defaultCityId,
            isAlternate: false,
          }
        });
      }
    }

    // Attach documents
    const docList = [...(Array.isArray(documents) ? documents : [])];
    if (paymentReceiptUrl) {
      docList.push({
        documentType: 'payment_receipt',
        fileName: `payment-receipt-${Date.now()}.png`,
        filePath: paymentReceiptUrl,
        fileSize: 1024,
        mimeType: 'image/png',
      });
    }
    if (req.body.visaCopyUrl || req.body.visa_copy_url) {
      docList.push({
        documentType: 'umrah_visa_copy',
        fileName: `${passportNumber || 'pilgrim'}_umrah_visa.jpg`,
        filePath: req.body.visaCopyUrl || req.body.visa_copy_url,
        fileSize: 1024,
        mimeType: 'image/jpeg',
      });
    }
    if (req.body.nusukCopyUrl || req.body.nusuk_copy_url) {
      docList.push({
        documentType: 'nusuk_booking_copy',
        fileName: `${passportNumber || 'pilgrim'}_nusuk_booking.jpg`,
        filePath: req.body.nusukCopyUrl || req.body.nusuk_copy_url,
        fileSize: 1024,
        mimeType: 'image/jpeg',
      });
    }

    if (docList.length > 0) {
      for (const doc of docList) {
        try {
          await prisma.document.create({
            data: {
              bookingId: booking.id,
              passengerId: leadPassenger?.id || null,
              documentType: doc.documentType || 'passport_copy',
              fileName: doc.fileName || `doc-${Date.now()}.pdf`,
              filePath: doc.filePath || doc.url || '',
              fileSize: doc.fileSize || 0,
              mimeType: doc.mimeType || 'application/pdf',
            }
          });
        } catch (docErr: any) {
          console.warn('[WHATSAPP BOOKING] Document upload notice:', docErr.message);
        }
      }
    }

    // Create Voucher (Skip for re_entry so it remains pending)
    let voucherRef: string | null = null;
    if (resolvedVisaType !== 're_entry') {
      voucherRef = await generateVoucherNumber(prisma);
      await prisma.voucher.create({
        data: {
          bookingId: booking.id,
          voucherNumber: voucherRef,
          reservationDate: new Date(),
          guestName: guestName || 'B2C Pilgrim',
          guestMobile: guestMobile || '',
          partyId: b2cParty.id,
          paxCount: numPax,
          generatedBy: adminUser.id,
          hotels: {
            create: [
              ...(makkahHotel ? [{
                number: 1,
                location: 'Makkah',
                hotelName: makkahHotel.name,
                checkIn: resolvedCheckIn,
                checkOut: new Date(resolvedCheckIn.getTime() + numMakkahNights * 86400000),
                days: numMakkahNights,
                brn: 'B2C_AUTO_BRN_1',
              }] : []),
              ...(madinahHotel ? [{
                number: 2,
                location: 'Madinah',
                hotelName: madinahHotel.name,
                checkIn: new Date(resolvedCheckIn.getTime() + numMakkahNights * 86400000),
                checkOut: new Date(resolvedCheckIn.getTime() + (numMakkahNights + numMadinahNights) * 86400000),
                days: numMadinahNights,
                brn: 'B2C_AUTO_BRN_2',
              }] : []),
            ]
          }
        }
      });
    }

    // Send WhatsApp Confirmation if mobile is provided
    if (guestMobile) {
      try {
        if (resolvedVisaType === 're_entry') {
          const msg = `*🕋 Moulavi Travels — Re-Entry Booking Registered*\n\nDear *${guestName || 'Pilgrim'}*,\nYour 1-Year Umrah Re-Entry booking details and documents have been received in NuSync ERP!\n\n📋 *Booking Reference:* ${bookingRef}\n📋 *Status:* ⏳ *Pending Verification*\n👥 *Pilgrims:* ${numPax} Pax\n\nOur operations desk is verifying your travel details and Ministry clearances. Have a blessed journey!`;
          await sendCustomWhatsApp(guestMobile, msg);
        } else {
          const typeLabel = resolvedVisaType === 'group_visa' ? 'Group Umrah Package' : 'Individual Umrah Package';
          const msg = `*🕋 Moulavi Travels — Booking Confirmation*\n\nDear *${guestName || 'Pilgrim'}*,\nYour booking has been received and confirmed!\n\n📋 *Booking Reference:* ${bookingRef}\n🎫 *Voucher Reference:* ${voucherRef}\n👥 *Pilgrims:* ${numPax} Pax\n🏷️ *Type:* ${typeLabel}\n\nOur team is finalizing your Ministry of Hajj approvals. Have a blessed journey!`;
          await sendCustomWhatsApp(guestMobile, msg);
        }
      } catch (waErr: any) {
        console.error('[WHATSAPP BOOKING] Confirmation send failed:', waErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      bookingReference: bookingRef,
      voucherNumber: voucherRef || undefined,
      bookingId: booking.id,
      visaType: resolvedVisaType,
      accommodationType: booking.accommodationType,
      passengerCount: numPax,
      status: resolvedVisaType === 're_entry' ? 'pending' : 'confirmed',
      message: resolvedVisaType === 're_entry'
        ? 'Re-Entry booking registered successfully in pending status'
        : 'Booking registered successfully in Moulavi ERP',
    });
  })
);

// ==========================================
// 8. B2C Booking Status Lookup (by Ref or Mobile)
// ==========================================
router.get(
  '/booking/status/:identifier',
  asyncHandler(async (req: any, res: Response) => {
    const { identifier } = req.params;
    const clean = identifier ? identifier.trim() : '';

    const booking = await prisma.umrahVisaBooking.findFirst({
      where: {
        OR: [
          { bookingReference: clean },
          { guestMobile: clean },
          { guestMobile: { contains: clean.replace(/\+/g, '') } },
          { vouchers: { some: { voucherNumber: clean } } }
        ]
      },
      include: {
        passengers: true,
        travelDetails: true,
        hotelBookings: { include: { hotel: true } },
        movementDetails: { include: { fromLocation: true, toLocation: true } },
        sponsorIqamaDetails: true,
        vouchers: true,
        documents: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `No booking found for identifier: ${identifier}`,
      });
    }

    res.json({
      success: true,
      data: {
        bookingReference: booking.bookingReference,
        status: booking.status,
        visaType: booking.visaType,
        accommodationType: booking.accommodationType,
        guestName: booking.guestName,
        guestMobile: booking.guestMobile,
        passengerCount: booking.passengerCount,
        passengers: booking.passengers.map(p => ({
          fullName: p.fullName,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
        })),
        travelDetails: booking.travelDetails[0] || null,
        hotels: booking.hotelBookings.map(h => ({
          hotelName: h.hotel?.name || 'Hotel',
          checkInDate: h.checkInDate,
          checkOutDate: h.checkOutDate,
        })),
        vouchers: booking.vouchers.map(v => ({
          voucherNumber: v.voucherNumber,
          reservationDate: v.reservationDate,
        })),
        documentsCount: booking.documents.length,
        submittedAt: booking.submittedAt,
      }
    });
  })
);

// ==========================================
// 9. B2C Master Catalogs (Hotels, Airports, Routes, Transports)
// ==========================================
router.get(
  '/masters',
  asyncHandler(async (_req: any, res: Response) => {
    const [hotels, airports, transportRoutes, transports] = await Promise.all([
      prisma.locationMaster.findMany({
        where: { locationType: 'HOTEL' },
        select: { id: true, name: true, cityId: true },
        take: 50,
      }),
      prisma.locationMaster.findMany({
        where: { locationType: 'AIRPORT' },
        select: { id: true, name: true, code: true },
        take: 50,
      }),
      prisma.transportRouteMaster.findMany({
        where: { isActive: true },
        include: {
          city1: { select: { id: true, name: true } },
          city2: { select: { id: true, name: true } },
          city3: { select: { id: true, name: true } },
          city4: { select: { id: true, name: true } },
        },
      }),
      prisma.transportMaster.findMany({
        where: { isActive: true },
        include: {
          route: {
            include: {
              city1: { select: { id: true, name: true } },
              city2: { select: { id: true, name: true } },
              city3: { select: { id: true, name: true } },
              city4: { select: { id: true, name: true } },
            }
          },
          vehicleType: {
            select: {
              id: true,
              vehicleName: true,
              paxCount: true,
            }
          }
        },
        orderBy: {
          price: 'asc'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        hotels,
        airports,
        transportRoutes,
        transports,
      }
    });
  })
);

router.get(
  '/transports',
  asyncHandler(async (req: any, res: Response) => {
    const { routeId } = req.query;
    const where: any = { isActive: true };
    if (routeId) {
      where.routeId = routeId;
    }

    const transports = await prisma.transportMaster.findMany({
      where,
      include: {
        route: {
          include: {
            city1: { select: { id: true, name: true } },
            city2: { select: { id: true, name: true } },
            city3: { select: { id: true, name: true } },
            city4: { select: { id: true, name: true } },
          }
        },
        vehicleType: {
          select: {
            id: true,
            vehicleName: true,
            paxCount: true,
          }
        }
      },
      orderBy: {
        price: 'asc'
      }
    });

    res.json({
      success: true,
      data: transports
    });
  })
);

// ==========================================
// 10. B2C Payment Integration (Cashfree & Bank Transfer)
// ==========================================
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '1459803f4e11788fdb072979bed3089541';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'cfsk_ma_prod_0748dc1ab618dafee874bffc1be58382_4a0b37e2';
const CASHFREE_BASE_URL = process.env.CASHFREE_BASE_URL || 'https://api.cashfree.com/pg';
const CASHFREE_API_VERSION = '2023-08-01';

async function callB2cCashfreeApi(method: 'GET' | 'POST', endpoint: string, data?: any) {
  const url = `${CASHFREE_BASE_URL}${endpoint}`;
  const response = await axios({
    method,
    url,
    headers: {
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'x-api-version': CASHFREE_API_VERSION,
      'Content-Type': 'application/json',
    },
    data,
    timeout: 15000,
  });
  return response.data;
}

router.get(
  '/payment/bank-details',
  asyncHandler(async (_req: any, res: Response) => {
    const reentryConfig = await prisma.reentryPricingMaster.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        bankName: 'Federal Bank',
        accountNumber: '14140200001234',
        ifscCode: 'FDRL0001414',
        accountHolder: 'Moulavi Travels & Logistics',
        branch: 'Calicut Main Branch',
        upiId: reentryConfig?.upiId || 'moulavi1414@fbl',
        upiMerchantName: reentryConfig?.upiMerchantName || 'Moulavi Travels',
        bankAccountDetails: reentryConfig?.bankAccountDetails || 'Bank: Federal Bank\nAccount: 14140200001234\nIFSC: FDRL0001414\nHolder: Moulavi Travels & Logistics',
        instructions: 'Please transfer the booking amount via IMPS / NEFT / RTGS / UPI and enter your Transaction UTR / Reference ID.'
      }
    });
  })
);

router.post(
  '/payment/cashfree-order',
  asyncHandler(async (req: any, res: Response) => {
    const { 
      amount, 
      currency = 'INR', 
      guestName, 
      guestMobile, 
      guestEmail,
      bookingRef,
      returnUrl 
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const cleanPhone = (guestMobile || '9946044897').replace(/\D/g, '').slice(-10) || '9946044897';
    const orderId = `B2C_${(bookingRef || 'ORD').replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now().toString().slice(-6)}`;
    // Cashfree production API strictly requires https:// scheme for return_url
    let targetReturnUrl = returnUrl || `https://umra.moulavi.in/b2c/book?order_id={order_id}&cf_return=1`;
    if (!targetReturnUrl.startsWith('https://')) {
      targetReturnUrl = `https://umra.moulavi.in/b2c/book?order_id={order_id}&cf_return=1&ref=${bookingRef || ''}`;
    }

    const payload = {
      order_id: orderId,
      order_amount: Number(Number(amount).toFixed(2)),
      order_currency: currency,
      customer_details: {
        customer_id: `CUST_${cleanPhone}`,
        customer_phone: cleanPhone,
        customer_name: (guestName || 'Pilgrim').slice(0, 50),
        customer_email: guestEmail || 'info@moulavi.com',
      },
      order_meta: {
        return_url: targetReturnUrl,
        notify_url: 'https://umra.moulavi.in/api/b2c/reentry-pricing/cashfree-webhook',
      },
      order_note: `Moulavi Travels Umrah Package Booking (${bookingRef || orderId})`,
      order_tags: {
        bookingRef: (bookingRef || '').slice(0, 50),
        channel: 'b2c_portal'
      }
    };

    try {
      const cfOrder = await callB2cCashfreeApi('POST', '/orders', payload);
      res.json({
        success: true,
        data: {
          orderId: cfOrder.order_id,
          paymentSessionId: cfOrder.payment_session_id,
          orderAmount: cfOrder.order_amount,
          orderCurrency: cfOrder.order_currency,
          cfOrder
        }
      });
    } catch (err: any) {
      console.error('[CASHFREE] B2C Order generation error:', err?.response?.data || err?.message);
      res.status(500).json({
        success: false,
        error: err?.response?.data?.message || 'Failed to initialize Cashfree payment session',
        details: err?.response?.data
      });
    }
  })
);

router.get(
  '/payment/order-status/:orderId',
  asyncHandler(async (req: any, res: Response) => {
    const { orderId } = req.params;
    try {
      const cfOrder = await callB2cCashfreeApi('GET', `/orders/${orderId}`);
      const isPaid = cfOrder.order_status === 'PAID';
      
      res.json({
        success: true,
        data: {
          orderId: cfOrder.order_id,
          orderStatus: cfOrder.order_status,
          orderAmount: cfOrder.order_amount,
          isPaid,
          cfOrder
        }
      });
    } catch (err: any) {
      console.error('[CASHFREE] B2C Order status check error:', err?.response?.data || err?.message);
      res.status(500).json({
        success: false,
        error: err?.response?.data?.message || 'Failed to verify Cashfree order status'
      });
    }
  })
);

export default router;
