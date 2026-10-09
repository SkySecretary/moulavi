import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendWhatsAppMessage } from '../services/whatsappService';

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
  hotelFixedVisaFee: 2000,
  hotelPerDayCost: 200,
  iqamaFixedVisaFee: 2500,
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
  const returnUrl = params.returnUrl || `https://umra.moulavi.in/pay/reentry?order_id={order_id}`;

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
    order_tags: params.tags || undefined,
  };

  const cfOrder = await callCashfreeApi('POST', '/orders', payload);
  return cfOrder;
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
      arrivalDate,
      departureDate,
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
      bookingReference,
    } = req.body;

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
        orderId,
        paymentSessionId,
        cfOrderId,
        webPayUrl,
        bankAccountDetails: bankDetails,
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
    const existing = await prisma.umrahVisaBooking.findFirst({
      where: { bookingReference: { contains: orderId } },
    });

    if (existing && existing.status === 'booking_success') {
      return { alreadyProcessed: true, booking: existing };
    }

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

    const bookingRef = `UMR-RE-${orderId.replace('RE_', '')}`;
    const voucherRef = `VOU-RE-${orderId.replace('RE_', '')}`;

    // 2. Create / Update Booking in NuSync ERP in pending status
    const booking = await prisma.umrahVisaBooking.create({
      data: {
        partyId: b2cParty.id,
        bookingReference: bookingRef,
        passengerCount: 1,
        visaType: 're_entry',
        accommodationType: stayType === 'iqama' ? 'iqama' : 'hotel',
        guestName,
        guestMobile,
        status: 'pending',
        passengers: {
          create: [
            {
              fullName: guestName,
              passportNumber,
              nationality: 'Saudi / Expat',
              gender: 'male',
              phoneNumber: guestMobile,
            },
          ],
        },
      },
    });

    // 3. Create Iqama details if stayType is iqama
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

    // 4. Dispatch WhatsApp confirmation message to customer via Channel +91 22 4619 3365
    const stayTypeLabel = stayType === 'iqama' ? 'Saudi Iqama Holder Hosting' : 'Hotel Reservation (Package included)';
    const confirmationText = `🎉 *Moulavi Travels — Payment Confirmed & Re-Entry Registered!* 🕋\n\nDear *${guestName}*,\nWe have successfully received your payment of *₹${amount}* via Cashfree Gateway (Transaction Ref: *${cfPaymentId}*).\n\n📋 *Trip & Booking Summary:*\n• *Booking Reference:* ${bookingRef}\n• *Passport / Iqama No:* ${passportNumber || 'Submitted'}\n• *Visa No:* ${visaNumber || 'Active'}\n• *Arrangement:* ${stayTypeLabel}\n• *Status:* ⏳ *Pending Verification*\n\n✨ Your 1-Year Umrah Visa Re-entry package details and payment have been received. Our operations desk is verifying your travel details and Ministry clearances.\n\nMay Allah accept your Umrah!\n\n_Moulavi Travels & Logistics — NuSync ERP Desk_`;

    if (guestMobile) {
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
        console.log(`[ReentryPayment] ✅ Sent WhatsApp confirmation to ${guestMobile} for order ${orderId}`);
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
    const { amount, guestName, guestMobile, stayType, passportNumber, visaNumber, returnUrl } = req.body;

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `RE_${Date.now().toString().slice(-6)}_${randomSuffix}`;

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
