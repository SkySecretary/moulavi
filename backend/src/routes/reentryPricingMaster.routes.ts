import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendWhatsAppMessage, getFallbackChannel } from '../services/whatsappService';

const router = Router();

// ==========================================
// CASHFREE PAYMENT GATEWAY CONFIGURATION
// ==========================================
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '1459803f4e11788fdb072979bed3089541';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'cfsk_ma_prod_0748dc1ab618dafee874bffc1be58382_4a0b37e2';
const CASHFREE_BASE_URL = process.env.CASHFREE_BASE_URL || 'https://api.cashfree.com/pg';
const CASHFREE_API_VERSION = '2023-08-01';

/**
 * Helper to call Cashfree API with credentials
 */
async function callCashfreeApi(method: 'GET' | 'POST', endpoint: string, data?: any) {
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

/**
 * Default fallback values for Re-Entry Pricing
 */
const DEFAULT_REENTRY_CONFIG = {
  hotelFixedVisaFee: 1,
  hotelPerDayCost: 0,
  iqamaFixedVisaFee: 1,
  iqamaPerDayCost: 0,
  currency: 'INR',
  upiId: 'moulavi1414@fbl',
  upiMerchantName: 'Moulavi Travels',
  bankAccountDetails:
    'Bank: Federal Bank\nAccount: 14140200001234\nIFSC: FDRL0001414\nHolder: Moulavi Travels & Logistics',
  isActive: true,
};

/**
 * GET /api/reentry-pricing-master
 * Public & Admin: Get current active Re-Entry Visa Pricing configuration
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    let config = await prisma.reentryPricingMaster.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      config = await prisma.reentryPricingMaster.create({
        data: DEFAULT_REENTRY_CONFIG,
      });
    }

    res.json({
      success: true,
      data: config,
    });
  })
);

/**
 * PUT /api/reentry-pricing-master
 * Admin/Staff: Update or create Re-Entry Pricing configuration
 */
router.put(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  [
    body('hotelFixedVisaFee').isFloat({ min: 0 }).optional(),
    body('hotelPerDayCost').isFloat({ min: 0 }).optional(),
    body('iqamaFixedVisaFee').isFloat({ min: 0 }).optional(),
    body('iqamaPerDayCost').isFloat({ min: 0 }).optional(),
    body('currency').isString().optional(),
    body('upiId').isString().optional(),
    body('upiMerchantName').isString().optional(),
    body('bankAccountDetails').isString().optional(),
    body('isActive').isBoolean().optional(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const {
      hotelFixedVisaFee,
      hotelPerDayCost,
      iqamaFixedVisaFee,
      iqamaPerDayCost,
      currency = 'INR',
      upiId = 'moulavi1414@fbl',
      upiMerchantName = 'Moulavi Travels',
      bankAccountDetails,
      isActive = true,
    } = req.body;

    const existing = await prisma.reentryPricingMaster.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    let updated;
    if (existing) {
      updated = await prisma.reentryPricingMaster.update({
        where: { id: existing.id },
        data: {
          hotelFixedVisaFee: hotelFixedVisaFee !== undefined ? Number(hotelFixedVisaFee) : undefined,
          hotelPerDayCost: hotelPerDayCost !== undefined ? Number(hotelPerDayCost) : undefined,
          iqamaFixedVisaFee: iqamaFixedVisaFee !== undefined ? Number(iqamaFixedVisaFee) : undefined,
          iqamaPerDayCost: iqamaPerDayCost !== undefined ? Number(iqamaPerDayCost) : undefined,
          currency,
          upiId,
          upiMerchantName,
          bankAccountDetails: bankAccountDetails !== undefined ? bankAccountDetails : undefined,
          isActive,
        },
      });
    } else {
      updated = await prisma.reentryPricingMaster.create({
        data: {
          hotelFixedVisaFee: Number(hotelFixedVisaFee ?? DEFAULT_REENTRY_CONFIG.hotelFixedVisaFee),
          hotelPerDayCost: Number(hotelPerDayCost ?? DEFAULT_REENTRY_CONFIG.hotelPerDayCost),
          iqamaFixedVisaFee: Number(iqamaFixedVisaFee ?? DEFAULT_REENTRY_CONFIG.iqamaFixedVisaFee),
          iqamaPerDayCost: Number(iqamaPerDayCost ?? DEFAULT_REENTRY_CONFIG.iqamaPerDayCost),
          currency,
          upiId,
          upiMerchantName,
          bankAccountDetails: bankAccountDetails ?? DEFAULT_REENTRY_CONFIG.bankAccountDetails,
          isActive,
        },
      });
    }

    res.json({
      success: true,
      message: 'Re-entry pricing settings saved successfully',
      data: updated,
    });
  })
);

/**
 * Helper to create a Cashfree Order
 */
async function createCashfreeOrder(params: {
  amount: number;
  currency: string;
  orderId: string;
  guestName: string;
  guestMobile: string;
  tags?: Record<string, string>;
  returnUrl?: string;
}) {
  const cleanPhone = (params.guestMobile || '9946044897').replace(/\D/g, '').slice(-10) || '9946044897';
  const cleanCustId = `CUST_${cleanPhone}`;
  const returnUrl = params.returnUrl || `https://umra.moulavi.in/pay/reentry?order_id={order_id}&cf_return=1`;

  const cleanTags: Record<string, string> = {};
  if (params.tags) {
    for (const [k, v] of Object.entries(params.tags)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        cleanTags[k] = String(v).trim().slice(0, 100);
      }
    }
  }

  const payload = {
    order_id: params.orderId,
    order_amount: Number(params.amount.toFixed(2)),
    order_currency: params.currency || 'INR',
    customer_details: {
      customer_id: cleanCustId,
      customer_phone: cleanPhone,
      customer_name: params.guestName || 'Pilgrim',
      customer_email: 'info@moulavi.com',
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: 'https://umra.moulavi.in/api/b2c/reentry-pricing/cashfree-webhook',
    },
    order_note: `Moulavi Travels 1-Year Umrah Re-Entry Fee (${params.orderId})`,
    order_tags: Object.keys(cleanTags).length > 0 ? cleanTags : undefined,
  };

  const cfOrder = await callCashfreeApi('POST', '/orders', payload);
  return cfOrder;
}

/**
 * Helper to resolve airport location by code or city name with fallback to JED
 */
async function resolveAirportLocation(codeOrName?: string) {
  if (!codeOrName || !String(codeOrName).trim()) {
    const jed = await prisma.locationMaster.findFirst({
      where: { locationType: 'AIRPORT', code: 'JED' },
    });
    if (jed) return jed;
    return await prisma.locationMaster.findFirst({ where: { locationType: 'AIRPORT' } });
  }

  const clean = String(codeOrName).trim();
  const upper = clean.toUpperCase();

  // 1. Direct code match (e.g. "JED", "MED", "RUH", "DMM")
  let airport = await prisma.locationMaster.findFirst({
    where: {
      locationType: 'AIRPORT',
      code: upper,
    },
  });
  if (airport) return airport;

  // 2. City or Name match
  airport = await prisma.locationMaster.findFirst({
    where: {
      locationType: 'AIRPORT',
      OR: [
        { city: { contains: clean } },
        { name: { contains: clean } },
      ],
    },
  });
  if (airport) return airport;

  // Fallback to JED or any airport
  const jed = await prisma.locationMaster.findFirst({
    where: { locationType: 'AIRPORT', code: 'JED' },
  });
  return jed || (await prisma.locationMaster.findFirst({ where: { locationType: 'AIRPORT' } }));
}

function normalizeTimeString(timeStr?: string, defaultTime: string = '12:00'): string {
  if (!timeStr || !String(timeStr).trim()) return defaultTime;
  const str = String(timeStr).trim().toUpperCase();

  // 1. Check for 12-hour AM/PM format (e.g., "2:30 PM", "02:30PM", "11:45 AM")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2];
    const modifier = ampmMatch[3];
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${mins}`;
  }

  // 2. Check for 24-hour HH:mm:ss or HH:mm (e.g., "14:30", "9:05", "14:30:00")
  const hhmmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const mins = hhmmMatch[2];
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:${mins}`;
    }
  }

  // 3. Raw 3-4 digit time (e.g. "1430" -> "14:30", "930" -> "09:30")
  const digitsMatch = str.match(/^(\d{1,2})(\d{2})$/);
  if (digitsMatch) {
    const hours = parseInt(digitsMatch[1], 10);
    const mins = digitsMatch[2];
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:${mins}`;
    }
  }

  return defaultTime;
}

function parseFlightDateTime(dateStr?: string, timeStr?: string, fallbackDate?: Date): Date {
  if (!dateStr || !String(dateStr).trim()) return fallbackDate || new Date();
  const cleanDate = String(dateStr).trim().split('T')[0];
  const cleanTime = normalizeTimeString(timeStr, '12:00');
  const isoStr = `${cleanDate}T${cleanTime}:00Z`;
  const parsed = new Date(isoStr);
  if (!isNaN(parsed.getTime())) return parsed;

  const fallbackParsed = new Date(cleanDate);
  if (!isNaN(fallbackParsed.getTime())) return fallbackParsed;
  return fallbackDate || new Date();
}

/**
 * Format flight code to standard uppercase with hyphen if missing (e.g. "SV300" -> "SV-300", "ai965" -> "AI-965")
 */
function formatFlightCode(raw?: string, defaultCode: string = 'SV-300'): string {
  if (!raw || !String(raw).trim()) return defaultCode;
  let clean = String(raw).trim().toUpperCase();

  const match = clean.match(/^([A-Z0-9]{2,3})(\d{1,5})$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return clean;
}

/**
 * POST /api/reentry-pricing-master/calculate
 * Calculate total fees for re-entry booking dynamically & create Cashfree Order Session
 */
router.post(
  '/calculate',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      stayType = 'hotel', // 'hotel' | 'iqama'
      accommodationType,
      arrivalAirport,
      departureAirport,
      arrivalAirportCode,
      departureAirportCode,
      arrivalDate,
      departureDate,
      arrivalTime,
      departureTime,
      numberOfDays: rawDays,
      passengerCount = 1,
      guestName = 'Pilgrim',
      guestMobile = '',
      contactPhone = '',
      passportNumber = '',
      visaNumber = '',
      sponsorIqama = '',
      pilgrimDob = '',
      arrivalFlight = '',
      departureFlight = '',
      visaCopyUrl: rawVisaCopyUrl = '',
      nusukCopyUrl: rawNusukCopyUrl = '',
      visa_copy_url: altVisaCopyUrl = '',
      nusuk_copy_url: altNusukCopyUrl = '',
      bookingReference,
    } = req.body;

    // Helper to sanitize media URL from either string or object payload
    const extractMediaUrl = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '{{visa_copy_url}}' || trimmed === '{{nusuk_copy_url}}' || trimmed === '[object Object]') return '';
        return trimmed;
      }
      if (typeof val === 'object') {
        return val.url || val.mediaUrl || val.filePath || '';
      }
      return '';
    };

    const visaCopyUrl = extractMediaUrl(rawVisaCopyUrl) || extractMediaUrl(altVisaCopyUrl);
    const nusukCopyUrl = extractMediaUrl(rawNusukCopyUrl) || extractMediaUrl(altNusukCopyUrl);

    const resolvedStayType = (stayType || accommodationType || 'hotel').toLowerCase();
    const isIqama = resolvedStayType.includes('iqama');
    const resolvedMobile = guestMobile || contactPhone || '';

    // Retrieve active config
    let config = await prisma.reentryPricingMaster.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      config = DEFAULT_REENTRY_CONFIG as any;
    }

    const pax = Math.max(1, parseInt(String(passengerCount), 10) || 1);

    // Calculate days
    let days = 1;
    if (rawDays && !isNaN(parseInt(String(rawDays), 10))) {
      days = Math.max(1, parseInt(String(rawDays), 10));
    } else if (arrivalDate && departureDate) {
      try {
        const arr = new Date(arrivalDate);
        const dep = new Date(departureDate);
        const diffTime = Math.abs(dep.getTime() - arr.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        days = Math.max(1, diffDays);
      } catch {
        days = 7;
      }
    } else {
      days = 7;
    }

    let fixedFee = 0;
    let perDayRate = 0;
    let daysCost = 0;

    if (isIqama) {
      fixedFee = Number(config!.iqamaFixedVisaFee);
      perDayRate = Number(config!.iqamaPerDayCost || 0);
      daysCost = days * perDayRate;
    } else {
      fixedFee = Number(config!.hotelFixedVisaFee);
      perDayRate = Number(config!.hotelPerDayCost);
      daysCost = days * perDayRate;
    }

    const pricePerPax = fixedFee + daysCost;
    const totalAmount = pricePerPax * pax;
    const currency = config!.currency || 'INR';

    const ref = bookingReference || `RE-${Date.now().toString().slice(-6)}`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `RE_${Date.now().toString().slice(-6)}_${randomSuffix}`;
    const bookingRef = `UMR-RE-${orderId.replace('RE_', '')}`;

    // 1. Pre-create Draft UmrahVisaBooking with full Travel Details & Documents
    try {
      const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      let b2cParty = await prisma.party.findUnique({ where: { email: 'b2c-direct@moulavi.in' } });
      if (!b2cParty) {
        const curr = await prisma.currencyMaster.findFirst();
        b2cParty = await prisma.party.create({
          data: {
            partyCode: 'B2C_DIRECT',
            partyName: 'B2C Consumer Channel',
            email: 'b2c-direct@moulavi.in',
            customerType: 'direct',
            isCustomer: true,
            isSupplier: false,
            createdBy: adminUser?.id || '',
            accountCurrencyId: curr?.id || '',
          },
        });
      }

      // Resolve airports for travel details
      const reqArrAirport = arrivalAirport || arrivalAirportCode || 'JED';
      const reqDepAirport = departureAirport || departureAirportCode || (isIqama ? 'JED' : 'MED');

      const arrAirportLoc = await resolveAirportLocation(reqArrAirport);
      const depAirportLoc = await resolveAirportLocation(reqDepAirport);

      const resolvedArrAirportId = arrAirportLoc?.id || (await prisma.locationMaster.findFirst())?.id || '';
      const resolvedDepAirportId = depAirportLoc?.id || resolvedArrAirportId;

      const formattedArrFlight = formatFlightCode(arrivalFlight, 'SV-300');
      const formattedDepFlight = formatFlightCode(departureFlight, 'SV-301');

      // Parse arrival & departure datetimes with resilient normalizeTimeString
      const arrDateTime = parseFlightDateTime(arrivalDate, arrivalTime, new Date());
      const defaultDepDate = new Date(arrDateTime.getTime() + days * 24 * 60 * 60 * 1000);
      const depDateTime = parseFlightDateTime(departureDate, departureTime, defaultDepDate);

      const initialRequestNumber = JSON.stringify({
        channel: 'whatsapp_b2c',
        orderId,
        amount: totalAmount,
        currency,
        paymentStatus: 'PENDING',
        stayType: isIqama ? 'iqama' : 'hotel',
      });

      const draftBooking = await prisma.umrahVisaBooking.create({
        data: {
          partyId: b2cParty.id,
          bookingReference: bookingRef,
          passengerCount: 1,
          visaType: 're_entry',
          accommodationType: isIqama ? 'iqama' : 'hotel',
          guestName,
          guestMobile: resolvedMobile,
          status: 'pending',
          umrahVisaNumber: visaNumber || null,
          requestNumber: initialRequestNumber,
          passengers: {
            create: [
              {
                fullName: guestName,
                passportNumber: passportNumber || null,
                visaNumber: visaNumber || null,
                nationality: 'Saudi / Expat',
                gender: 'male',
                phoneNumber: resolvedMobile,
              },
            ],
          },
        },
        include: {
          passengers: true,
        },
      });

      const leadPassenger = draftBooking.passengers?.[0];

      // Travel details with resolved airport locations and formatted flight numbers
      if (resolvedArrAirportId) {
        await prisma.umrahTravelDetails.create({
          data: {
            bookingId: draftBooking.id,
            isAlternate: false,
            arrivalAirportId: resolvedArrAirportId,
            arrivalFlightNumber: formattedArrFlight,
            arrivalDateTime: arrDateTime,
            departureAirportId: resolvedDepAirportId,
            departureFlightNumber: formattedDepFlight,
            departureDateTime: depDateTime,
          },
        });
      }

      // Attach Documents (linked to both bookingId and passengerId like ERP form)
      if (visaCopyUrl) {
        await prisma.document.create({
          data: {
            bookingId: draftBooking.id,
            passengerId: leadPassenger?.id || null,
            documentType: 'umrah_visa_copy',
            fileName: `${passportNumber || guestName.replace(/[^a-zA-Z0-9]/g, '_')}_umrah_visa.jpg`,
            filePath: visaCopyUrl,
            mimeType: 'image/jpeg',
          },
        });
      }

      if (nusukCopyUrl) {
        await prisma.document.create({
          data: {
            bookingId: draftBooking.id,
            passengerId: leadPassenger?.id || null,
            documentType: 'nusuk_booking_copy',
            fileName: `${passportNumber || guestName.replace(/[^a-zA-Z0-9]/g, '_')}_nusuk_booking.jpg`,
            filePath: nusukCopyUrl,
            mimeType: 'image/jpeg',
          },
        });
      }

      // Sponsor Iqama
      if (isIqama) {
        await prisma.umrahSponserIqamaDetails.create({
          data: {
            bookingId: draftBooking.id,
            iqamaSponserName: guestName,
            iqamaNumber: sponsorIqama || '1000000000',
            sponserDob: new Date('1990-01-01'),
            sponserMobileNumber: resolvedMobile,
            sponserNationalShortAddress: 'KSA National Address',
            isAlternate: false,
          },
        });
      }

      console.log(`[ReentryPricing] 📋 Pre-created Draft Booking ${draftBooking.id} (${bookingRef}) with travel details & documents`);
    } catch (draftErr: any) {
      console.error(`[ReentryPricing] ⚠️ Error pre-creating draft booking:`, draftErr?.message);
    }

    // Create Cashfree Order
    let paymentSessionId = '';
    let cfOrderId = '';
    try {
      const cfOrder = await createCashfreeOrder({
        amount: totalAmount,
        currency,
        orderId,
        guestName,
        guestMobile: resolvedMobile,
        returnUrl: `https://umra.moulavi.in/pay/reentry?order_id={order_id}&cf_return=1&am=${totalAmount}&ref=${encodeURIComponent(ref)}&stay=${isIqama ? 'iqama' : 'hotel'}&phone=${encodeURIComponent(resolvedMobile)}&name=${encodeURIComponent(guestName)}`,
        tags: {
          stay_type: isIqama ? 'iqama' : 'hotel',
          guest_name: String(guestName).slice(0, 100),
          guest_mobile: String(resolvedMobile).slice(0, 20),
          passport_number: String(passportNumber).slice(0, 50),
          visa_number: String(visaNumber).slice(0, 50),
          sponsor_iqama: String(sponsorIqama).slice(0, 50),
          arrival_flight: String(arrivalFlight).slice(0, 50),
          departure_flight: String(departureFlight).slice(0, 50),
        },
      });
      paymentSessionId = cfOrder.payment_session_id || '';
      cfOrderId = String(cfOrder.cf_order_id || '');
    } catch (cfErr: any) {
      console.error('[Cashfree] Order creation error:', cfErr?.response?.data || cfErr.message);
    }

    // Web payment gateway portal link with Cashfree payment session
    const webPayUrl = `https://umra.moulavi.in/pay/reentry?order_id=${encodeURIComponent(orderId)}&session_id=${encodeURIComponent(paymentSessionId)}&am=${totalAmount}&cu=${currency}&ref=${encodeURIComponent(ref)}&stay=${isIqama ? 'iqama' : 'hotel'}&phone=${encodeURIComponent(resolvedMobile)}&name=${encodeURIComponent(guestName)}`;

    const bankDetails = config!.bankAccountDetails || 'Bank: Federal Bank\nAccount: 14140200001234\nIFSC: FDRL0001414\nHolder: Moulavi Travels & Logistics';
    const paymentMessage = `📋 *Moulavi Travels — Payment & Bank Transfer* 🕋\n\n💰 *Total Amount:* ₹${totalAmount}\n\n👉 *Pay Online (Cashfree Gateway):*\n${webPayUrl}\n\n🏦 *Direct Bank Transfer Details:*\n${bankDetails}`;

    res.json({
      success: true,
      data: {
        stayType: isIqama ? 'iqama' : 'hotel',
        stayTypeLabel: isIqama ? 'Saudi Iqama Holder Hosting' : 'Hotel Reservation (Package included)',
        passengerCount: pax,
        numberOfDays: days,
        fixedFee,
        perDayRate,
        daysCost,
        pricePerPax,
        totalAmount,
        currency,
        bookingReference: ref,
        ref,
        orderId,
        paymentSessionId,
        cfOrderId,
        webPayUrl,
        bankAccountDetails: bankDetails,
        upiId: config!.upiId || 'moulavi1414@fbl',
        paymentMessage,
        breakdownText: isIqama
          ? `Fixed Iqama Re-entry Visa Fee: ₹${fixedFee} (Total: ₹${totalAmount})`
          : `Fixed Re-entry Visa Fee: ₹${fixedFee} + (₹${perDayRate}/day × ${days} Days = ₹${daysCost}) = Total: ₹${totalAmount}`,
      },
    });
  })
);

/**
 * Helper to confirm a B2C Booking in NuSync ERP & trigger WhatsApp Voucher
 */
async function confirmReentryBookingAndSendWhatsApp(orderId: string, orderData: any, paymentData?: any) {
  try {
    const bookingRef = `UMR-RE-${orderId.replace('RE_', '')}`;
    const tags = orderData?.order_tags || {};
    const guestName = orderData?.customer_details?.customer_name || tags?.guest_name || 'Pilgrim';
    const guestMobile = orderData?.customer_details?.customer_phone || tags?.guest_mobile || '';
    const stayType = tags?.stay_type || 'hotel';
    const passportNumber = tags?.passport_number || '';
    const visaNumber = tags?.visa_number || '';
    const sponsorIqama = tags?.sponsor_iqama || '';
    const arrivalFlight = tags?.arrival_flight || '';
    const departureFlight = tags?.departure_flight || '';
    const amount = orderData?.order_amount || 2000;
    const cfPaymentId = paymentData?.cf_payment_id || orderData?.cf_order_id || `CF-${Date.now()}`;
    const paymentMethod = paymentData?.payment_group || paymentData?.payment_method || 'Cashfree Gateway';

    const paymentInfoJson = JSON.stringify({
      channel: 'whatsapp_b2c',
      orderId,
      cfPaymentId,
      amount,
      currency: orderData?.order_currency || 'INR',
      paymentStatus: 'PAID',
      paymentMethod,
      stayType: stayType === 'iqama' ? 'iqama' : 'hotel',
      paidAt: new Date().toISOString(),
    });

    const existing = await prisma.umrahVisaBooking.findFirst({
      where: {
        OR: [
          { bookingReference: bookingRef },
          { bookingReference: { contains: orderId } },
        ],
      },
    });

    let booking = existing;

    if (existing) {
      // Update existing draft booking with payment status and info
      booking = await prisma.umrahVisaBooking.update({
        where: { id: existing.id },
        data: {
          requestNumber: paymentInfoJson,
          status: 'pending', // or 'booking_success' if paid
          guestName: existing.guestName || guestName,
          guestMobile: existing.guestMobile || guestMobile,
        },
      });
      console.log(`[ReentryPayment] ✅ Updated existing Draft Booking ${booking.id} with PAID status & txn ${cfPaymentId}`);
    } else {
      // 1. Find Admin and B2C Party
      const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      let b2cParty = await prisma.party.findUnique({ where: { email: 'b2c-direct@moulavi.in' } });
      if (!b2cParty) {
        const currency = await prisma.currencyMaster.findFirst();
        b2cParty = await prisma.party.create({
          data: {
            partyCode: 'B2C_DIRECT',
            partyName: 'B2C Consumer Channel',
            email: 'b2c-direct@moulavi.in',
            customerType: 'direct',
            isCustomer: true,
            isSupplier: false,
            createdBy: adminUser?.id || '',
            accountCurrencyId: currency?.id || '',
          },
        });
      }

      booking = await prisma.umrahVisaBooking.create({
        data: {
          partyId: b2cParty.id,
          bookingReference: bookingRef,
          passengerCount: 1,
          visaType: 're_entry',
          accommodationType: stayType === 'iqama' ? 'iqama' : 'hotel',
          guestName,
          guestMobile,
          status: 'pending',
          requestNumber: paymentInfoJson,
          umrahVisaNumber: visaNumber || null,
          passengers: {
            create: [
              {
                fullName: guestName,
                passportNumber: passportNumber || null,
                visaNumber: visaNumber || null,
                nationality: 'Saudi / Expat',
                gender: 'male',
                phoneNumber: guestMobile,
              },
            ],
          },
        },
      });

      // Airport & travel details
      const airport = await prisma.locationMaster.findFirst({ where: { locationType: 'AIRPORT' } });
      const defaultAirportId = airport?.id || (await prisma.locationMaster.findFirst())?.id;
      if (defaultAirportId) {
        await prisma.umrahTravelDetails.create({
          data: {
            bookingId: booking.id,
            isAlternate: false,
            arrivalAirportId: defaultAirportId,
            arrivalFlightNumber: arrivalFlight || 'ARR-FLIGHT',
            arrivalDateTime: new Date(),
            departureAirportId: defaultAirportId,
            departureFlightNumber: departureFlight || 'DEP-FLIGHT',
            departureDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      if (stayType === 'iqama') {
        await prisma.umrahSponserIqamaDetails.create({
          data: {
            bookingId: booking.id,
            iqamaSponserName: guestName,
            iqamaNumber: sponsorIqama || '1000000000',
            sponserDob: new Date('1990-01-01'),
            sponserMobileNumber: guestMobile,
            sponserNationalShortAddress: 'KSA National Address',
            isAlternate: false,
          },
        });
      }
    }

    // 4. Dispatch WhatsApp confirmation message to customer via Channel +91 22 4619 3365
    // First, check if the customer has an active waiting automation flow in Linalapro and resume it
    let flowResumed = false;
    if (guestMobile) {
      try {
        const channel = await getFallbackChannel();
        if (channel && channel.baseUrl && channel.apiKey) {
          const apiBaseUrl = channel.baseUrl.trim().replace(/\/messages\/?$/, '').replace(/\/$/, '');
          const paymentCompletedUrl = `${apiBaseUrl}/automations/payment-completed`;
          console.log(`[ReentryPayment] Notifying Linala flow engine at ${paymentCompletedUrl} for ${guestMobile}`);
          
          const flowRes = await axios.post(
            paymentCompletedUrl,
            {
              phone: guestMobile,
              orderId,
              bookingReference: bookingRef,
              bookingId: booking.id,
              amount,
              status: 'PAID',
            },
            {
              headers: {
                'x-api-key': channel.apiKey.trim(),
                'x-channel-id': channel.channelId.trim(),
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          if (flowRes.data && flowRes.data.resumed) {
            flowResumed = true;
            console.log(`[ReentryPayment] 🎯 Successfully resumed active flow on canvas for ${guestMobile}! Skipping standalone message.`);
          }
        }
      } catch (flowErr: any) {
        console.warn(`[ReentryPayment] Flow resume notification skipped or returned error (${flowErr.message}). Falling back to direct WhatsApp message.`);
      }
    }

    if (guestMobile && !flowResumed) {
      const stayTypeLabel = stayType === 'iqama' ? 'Saudi Iqama Holder Hosting' : 'Hotel Reservation (Package included)';
      const confirmationText = `🎉 *Moulavi Travels — Payment Confirmed & Re-Entry Registered!* 🕋\n\nDear *${guestName}*,\nWe have successfully received your payment of *₹${amount}* via Cashfree Gateway (Transaction Ref: *${cfPaymentId}*).\n\n📋 *Trip & Booking Summary:*\n• *Booking ID:* ${booking.id}\n• *Booking Reference:* ${bookingRef}\n• *Passport / Iqama No:* ${passportNumber || 'Submitted'}\n• *Visa No:* ${visaNumber || 'Active'}\n• *Arrangement:* ${stayTypeLabel}\n• *Status:* ⏳ *Pending Verification*\n\n✨ Your 1-Year Umrah Visa Re-entry package details and payment have been received. Our operations desk is verifying your travel details and Ministry clearances. You will receive your confirmed Ministry travel voucher shortly!\n\nMay Allah accept your Umrah!\n\n_Moulavi Travels & Logistics — NuSync ERP Desk_`;

      try {
        await sendWhatsAppMessage(
          guestMobile,
          confirmationText,
          'booking_confirmation',
          {
            guestName,
            bookingRef,
            voucherRef: '',
            amount,
          }
        );
        console.log(`[ReentryPayment] ✅ Sent fallback WhatsApp confirmation to ${guestMobile} for order ${orderId}`);
      } catch (waErr) {
        console.error(`[ReentryPayment] WhatsApp message dispatch error:`, waErr);
      }
    }

    return { alreadyProcessed: false, booking };
  } catch (err) {
    console.error(`[ReentryPayment] Error confirming booking for ${orderId}:`, err);
    throw err;
  }
}

/**
 * GET /api/reentry-pricing-master/order-status/:orderId
 * Check order status with Cashfree and automatically finalize booking if PAID
 */
router.get(
  '/order-status/:orderId',
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    try {
      const cfOrder = await callCashfreeApi('GET', `/orders/${orderId}`);
      let payments = [];
      try {
        payments = await callCashfreeApi('GET', `/orders/${orderId}/payments`);
      } catch {
        // Payments array may be empty if no attempt
      }

      const isPaid = cfOrder.order_status === 'PAID';
      let bookingData = null;

      if (isPaid) {
        const successfulPayment = Array.isArray(payments)
          ? payments.find((p: any) => p.payment_status === 'SUCCESS')
          : payments;

        const result = await confirmReentryBookingAndSendWhatsApp(orderId, cfOrder, successfulPayment);
        bookingData = result;
      }

      res.json({
        success: true,
        data: {
          orderId,
          orderStatus: cfOrder.order_status,
          isPaid,
          amount: cfOrder.order_amount,
          currency: cfOrder.order_currency,
          customerDetails: cfOrder.customer_details,
          payments,
          booking: bookingData,
        },
      });
    } catch (err: any) {
      console.error(`[Cashfree] Error fetching order status for ${orderId}:`, err?.response?.data || err.message);
      res.status(500).json({
        success: false,
        error: 'Failed to verify Cashfree order status',
        details: err?.response?.data || err.message,
      });
    }
  })
);

/**
 * POST /api/reentry-pricing-master/create-order
 * Create a Cashfree Order on demand from Checkout Portal
 */
router.post(
  '/create-order',
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, guestName, guestMobile, stayType, passportNumber, visaNumber, returnUrl, orderId: reqOrderId } = req.body;

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = reqOrderId || `RE_${Date.now().toString().slice(-6)}_${randomSuffix}`;

    try {
      const cfOrder = await createCashfreeOrder({
        amount: Number(amount),
        currency: 'INR',
        orderId,
        guestName: guestName || 'Pilgrim',
        guestMobile: guestMobile || '',
        returnUrl,
        tags: {
          stay_type: stayType || 'hotel',
          guest_name: String(guestName || 'Pilgrim').slice(0, 100),
          guest_mobile: String(guestMobile || '').slice(0, 20),
          passport_number: String(passportNumber || '').slice(0, 50),
          visa_number: String(visaNumber || '').slice(0, 50),
        },
      });

      res.json({
        success: true,
        data: {
          orderId: cfOrder.order_id,
          paymentSessionId: cfOrder.payment_session_id,
          cfOrderId: cfOrder.cf_order_id,
          orderStatus: cfOrder.order_status,
          amount: cfOrder.order_amount,
          currency: cfOrder.order_currency,
        },
      });
    } catch (err: any) {
      console.error('[Cashfree] Create order error:', err?.response?.data || err.message);
      res.status(500).json({
        success: false,
        error: 'Failed to create Cashfree payment order',
        details: err?.response?.data || err.message,
      });
    }
  })
);

/**
 * POST /api/reentry-pricing-master/cashfree-webhook
 * Cashfree Webhook callback handler
 */
router.post(
  '/cashfree-webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body;
    console.log('[Cashfree Webhook] Received event:', JSON.stringify(body, null, 2));

    const eventType = body?.type;
    const orderData = body?.data?.order;
    const paymentData = body?.data?.payment;

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || orderData?.order_status === 'PAID') {
      const orderId = orderData?.order_id;
      if (orderId) {
        console.log(`[Cashfree Webhook] Processing successful payment for order: ${orderId}`);
        await confirmReentryBookingAndSendWhatsApp(orderId, orderData, paymentData);
      }
    }

    res.json({ success: true, message: 'Webhook received' });
  })
);

export default router;
