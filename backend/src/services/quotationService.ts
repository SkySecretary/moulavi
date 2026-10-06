import { prisma } from '../lib/prisma';
import { QuotationPdfService, QuotationPdfData } from './quotationPdfService';
import { sendQuotationWhatsApp } from './whatsappService';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.bizmail.yahoo.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || (process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER || 'info@moulavi.com',
    pass: process.env.SMTP_PASSWORD || 'swokfyqwqpttwcvq',
  },
});

/**
 * Save a Quotation PDF buffer to the static uploads directory
 * and return its publicly accessible URL.
 */
export async function saveQuotationPdfToDisk(quotationNumber: string, pdfBuffer: Buffer): Promise<{ filePath: string; publicUrl: string }> {
  const uploadDir = path.join(process.cwd(), 'uploads', 'quotations');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const safeNumber = quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Quotation_${safeNumber}.pdf`;
  const filePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(filePath, pdfBuffer);

  const baseUrl = (process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://umra.moulavi.in').replace(/\/$/, '');
  const publicUrl = `${baseUrl}/uploads/quotations/${filename}`;

  return { filePath, publicUrl };
}

export class QuotationService {
  // Generate unique sequential quotation number e.g. QT-261005-001
  static async generateQuotationNumber(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `QT-${yy}${mm}${dd}`;

    const count = await prisma.quotation.count({
      where: {
        quotationNumber: { startsWith: datePrefix }
      }
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `${datePrefix}-${sequence}`;
  }

  // Create new Quotation
  static async createQuotation(data: any, userId?: string) {
    const quotationNumber = await this.generateQuotationNumber();

    const adultsCount = Number(data.adultsCount) || 1;
    const childrenCount = Number(data.childrenCount) || 0;
    const infantsCount = Number(data.infantsCount) || 0;
    const totalPax = adultsCount + childrenCount + infantsCount;

    const hotels = Array.isArray(data.hotels) ? data.hotels : [];
    const flights = Array.isArray(data.flights) ? data.flights : [];
    const transports = Array.isArray(data.transports) ? data.transports : [];
    const visas = data.visas || {};
    const additionalItems = Array.isArray(data.additionalItems) ? data.additionalItems : [];

    let totalHotelAmount = 0;
    let totalMealAmount = 0;
    let totalExtraBedAmount = 0;
    for (const h of hotels) {
      const roomCost = Number(h.hotelCost) || ((Number(h.roomPricePerNight) || 0) * (Number(h.roomCount) || 1) * (Number(h.nights) || 1));
      const extraBedTotal = h.hasExtraBed ? ((Number(h.extraBedCount) || 0) * (Number(h.extraBedPricePerNight) || 0) * (Number(h.nights) || 1)) : 0;
      const mealCost = Number(h.mealTotal) || 0;
      totalHotelAmount += (roomCost + extraBedTotal);
      totalMealAmount += mealCost;
      totalExtraBedAmount += extraBedTotal;
      h.hotelCost = roomCost;
      h.extraBedTotal = extraBedTotal;
      h.mealTotal = mealCost;
      h.totalHotelWithMeals = roomCost + extraBedTotal + mealCost;
    }

    let totalFlightAmount = 0;
    for (const f of flights) {
      totalFlightAmount += Number(f.price) || 0;
    }

    let totalTransportAmount = 0;
    for (const t of transports) {
      totalTransportAmount += Number(t.price) || 0;
    }

    const adultVisaCount = Number(visas.adultVisaCount) || 0;
    const adultVisaRate = Number(visas.adultVisaRate) || 0;
    const childVisaCount = Number(visas.childVisaCount) || 0;
    const childVisaRate = Number(visas.childVisaRate) || 0;
    const totalVisaAmount = (adultVisaCount * adultVisaRate) + (childVisaCount * childVisaRate);

    let totalAdditionalAmount = 0;
    for (const a of additionalItems) {
      const itemTotal = Number(a.total) || ((Number(a.quantity) || 1) * (Number(a.rate) || 0));
      a.total = itemTotal;
      totalAdditionalAmount += itemTotal;
    }

    const subtotal = totalHotelAmount + totalMealAmount + totalFlightAmount + totalTransportAmount + totalVisaAmount + totalAdditionalAmount;
    const discountAmount = Number(data.discountAmount) || 0;
    const taxAmount = Number(data.taxAmount) || 0;
    const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

    let pricePerAdult = Number(data.pricePerAdult) || 0;
    let pricePerChild = Number(data.pricePerChild) || 0;

    if (!pricePerAdult && adultsCount > 0) {
      if (childrenCount > 0) {
        const weight = adultsCount + (childrenCount * 0.7);
        pricePerAdult = Math.round(grandTotal / weight);
        pricePerChild = Math.round(pricePerAdult * 0.7);
      } else {
        pricePerAdult = Math.round(grandTotal / adultsCount);
        pricePerChild = 0;
      }
    }

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        title: data.title || null,
        status: data.status || 'DRAFT',
        validUntil: data.validUntil ? new Date(data.validUntil) : new Date(Date.now() + 7 * 86400000),
        
        customerType: data.customerType || (data.partyId ? 'B2B' : 'B2C'),
        partyId: data.partyId || null,
        guestName: data.guestName?.trim() || 'Valued Guest',
        guestEmail: data.guestEmail?.trim() || null,
        guestPhone: data.guestPhone?.trim() || null,
        guestCountry: data.guestCountry?.trim() || null,
        guestCity: data.guestCity?.trim() || null,

        adultsCount,
        childrenCount,
        infantsCount,
        totalPax,

        currency: data.currency || 'SAR',
        totalHotelAmount,
        totalMealAmount,
        totalFlightAmount,
        totalTransportAmount,
        totalVisaAmount,
        totalAdditionalAmount,
        subtotal,
        taxAmount,
        discountAmount,
        grandTotal,
        pricePerAdult,
        pricePerChild,

        hotels,
        flights,
        transports,
        visas,
        additionalItems,

        inclusions: data.inclusions || null,
        exclusions: data.exclusions || null,
        termsAndConditions: data.termsAndConditions || null,
        notes: data.notes || null,

        createdById: userId || null,
      },
      include: {
        party: {
          select: { id: true, partyName: true, partyCode: true, email: true, contactNumber: true, whatsappNumber: true, whatsappGroupId: true }
        }
      }
    });

    return quotation;
  }

  // Update Quotation
  static async updateQuotation(id: string, data: any, userId?: string) {
    const existing = await prisma.quotation.findUnique({
      where: { id, isDeleted: false }
    });

    if (!existing) {
      throw new Error('Quotation not found');
    }

    const adultsCount = Number(data.adultsCount) || existing.adultsCount || 1;
    const childrenCount = Number(data.childrenCount) ?? existing.childrenCount ?? 0;
    const infantsCount = Number(data.infantsCount) ?? existing.infantsCount ?? 0;
    const totalPax = adultsCount + childrenCount + infantsCount;

    const hotels = Array.isArray(data.hotels) ? data.hotels : (existing.hotels as any[]) || [];
    const flights = Array.isArray(data.flights) ? data.flights : (existing.flights as any[]) || [];
    const transports = Array.isArray(data.transports) ? data.transports : (existing.transports as any[]) || [];
    const visas = data.visas !== undefined ? data.visas : (existing.visas as any) || {};
    const additionalItems = Array.isArray(data.additionalItems) ? data.additionalItems : (existing.additionalItems as any[]) || [];

    let totalHotelAmount = 0;
    let totalMealAmount = 0;
    let totalExtraBedAmount = 0;
    for (const h of hotels) {
      const roomCost = Number(h.hotelCost) || ((Number(h.roomPricePerNight) || 0) * (Number(h.roomCount) || 1) * (Number(h.nights) || 1));
      const extraBedTotal = h.hasExtraBed ? ((Number(h.extraBedCount) || 0) * (Number(h.extraBedPricePerNight) || 0) * (Number(h.nights) || 1)) : 0;
      const mealCost = Number(h.mealTotal) || 0;
      totalHotelAmount += (roomCost + extraBedTotal);
      totalMealAmount += mealCost;
      totalExtraBedAmount += extraBedTotal;
      h.hotelCost = roomCost;
      h.extraBedTotal = extraBedTotal;
      h.mealTotal = mealCost;
      h.totalHotelWithMeals = roomCost + extraBedTotal + mealCost;
    }

    let totalFlightAmount = 0;
    for (const f of flights) {
      totalFlightAmount += Number(f.price) || 0;
    }

    let totalTransportAmount = 0;
    for (const t of transports) {
      totalTransportAmount += Number(t.price) || 0;
    }

    const adultVisaCount = Number(visas.adultVisaCount) || 0;
    const adultVisaRate = Number(visas.adultVisaRate) || 0;
    const childVisaCount = Number(visas.childVisaCount) || 0;
    const childVisaRate = Number(visas.childVisaRate) || 0;
    const totalVisaAmount = (adultVisaCount * adultVisaRate) + (childVisaCount * childVisaRate);

    let totalAdditionalAmount = 0;
    for (const a of additionalItems) {
      const itemTotal = Number(a.total) || ((Number(a.quantity) || 1) * (Number(a.rate) || 0));
      a.total = itemTotal;
      totalAdditionalAmount += itemTotal;
    }

    const subtotal = totalHotelAmount + totalMealAmount + totalFlightAmount + totalTransportAmount + totalVisaAmount + totalAdditionalAmount;
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : existing.discountAmount;
    const taxAmount = data.taxAmount !== undefined ? Number(data.taxAmount) : existing.taxAmount;
    const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

    let pricePerAdult = Number(data.pricePerAdult) || 0;
    let pricePerChild = Number(data.pricePerChild) || 0;

    if (!pricePerAdult && adultsCount > 0) {
      if (childrenCount > 0) {
        const weight = adultsCount + (childrenCount * 0.7);
        pricePerAdult = Math.round(grandTotal / weight);
        pricePerChild = Math.round(pricePerAdult * 0.7);
      } else {
        pricePerAdult = Math.round(grandTotal / adultsCount);
        pricePerChild = 0;
      }
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        status: data.status || existing.status,
        validUntil: data.validUntil ? new Date(data.validUntil) : existing.validUntil,

        customerType: data.customerType || existing.customerType,
        partyId: data.partyId !== undefined ? data.partyId : existing.partyId,
        guestName: data.guestName ? data.guestName.trim() : existing.guestName,
        guestEmail: data.guestEmail !== undefined ? (data.guestEmail ? data.guestEmail.trim() : null) : existing.guestEmail,
        guestPhone: data.guestPhone !== undefined ? (data.guestPhone ? data.guestPhone.trim() : null) : existing.guestPhone,
        guestCountry: data.guestCountry !== undefined ? data.guestCountry : existing.guestCountry,
        guestCity: data.guestCity !== undefined ? data.guestCity : existing.guestCity,

        adultsCount,
        childrenCount,
        infantsCount,
        totalPax,

        currency: data.currency || existing.currency,
        totalHotelAmount,
        totalMealAmount,
        totalFlightAmount,
        totalTransportAmount,
        totalVisaAmount,
        totalAdditionalAmount,
        subtotal,
        taxAmount,
        discountAmount,
        grandTotal,
        pricePerAdult,
        pricePerChild,

        hotels,
        flights,
        transports,
        visas,
        additionalItems,

        inclusions: data.inclusions !== undefined ? data.inclusions : existing.inclusions,
        exclusions: data.exclusions !== undefined ? data.exclusions : existing.exclusions,
        termsAndConditions: data.termsAndConditions !== undefined ? data.termsAndConditions : existing.termsAndConditions,
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
      include: {
        party: {
          select: { id: true, partyName: true, partyCode: true, email: true, contactNumber: true, whatsappNumber: true, whatsappGroupId: true }
        },
        convertedBooking: {
          select: { id: true, bookingReference: true, status: true }
        }
      }
    });

    return updated;
  }

  // Get Quotations list with search and pagination
  static async getQuotations(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerType?: string;
    partyId?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 15);
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }
    if (params.customerType && params.customerType !== 'all') {
      where.customerType = params.customerType;
    }
    if (params.partyId && params.partyId !== 'all') {
      where.partyId = params.partyId;
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { quotationNumber: { contains: q } },
        { guestName: { contains: q } },
        { guestEmail: { contains: q } },
        { guestPhone: { contains: q } },
        { title: { contains: q } },
        { party: { partyName: { contains: q } } }
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          party: {
            select: { id: true, partyName: true, partyCode: true, email: true, contactNumber: true, whatsappNumber: true, whatsappGroupId: true }
          },
          convertedBooking: {
            select: { id: true, bookingReference: true, status: true }
          }
        }
      }),
      prisma.quotation.count({ where })
    ]);

    const [totalDraft, totalSent, totalConverted, totalAccepted] = await Promise.all([
      prisma.quotation.count({ where: { isDeleted: false, status: 'DRAFT' } }),
      prisma.quotation.count({ where: { isDeleted: false, status: 'SENT' } }),
      prisma.quotation.count({ where: { isDeleted: false, status: 'CONVERTED' } }),
      prisma.quotation.count({ where: { isDeleted: false, status: 'ACCEPTED' } }),
    ]);

    return {
      quotations,
      stats: {
        total,
        totalDraft,
        totalSent,
        totalConverted,
        totalAccepted,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  // Get Quotation by ID
  static async getQuotationById(id: string) {
    const quotation = await prisma.quotation.findFirst({
      where: { id, isDeleted: false },
      include: {
        party: {
          select: { id: true, partyName: true, partyCode: true, email: true, contactNumber: true, whatsappNumber: true, whatsappGroupId: true }
        },
        convertedBooking: {
          select: { id: true, bookingReference: true, status: true, groupNumber: true, guestName: true }
        }
      }
    });

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    return quotation;
  }

  // Delete Quotation (Soft Delete)
  static async deleteQuotation(id: string) {
    return prisma.quotation.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  // Duplicate Quotation
  static async duplicateQuotation(id: string, userId?: string) {
    const original = await this.getQuotationById(id);
    const newNumber = await this.generateQuotationNumber();

    const duplicate = await prisma.quotation.create({
      data: {
        quotationNumber: newNumber,
        title: original.title ? `${original.title} (Copy)` : 'Quotation Copy',
        status: 'DRAFT',
        validUntil: new Date(Date.now() + 7 * 86400000),

        customerType: original.customerType,
        partyId: original.partyId,
        guestName: original.guestName,
        guestEmail: original.guestEmail,
        guestPhone: original.guestPhone,
        guestCountry: original.guestCountry,
        guestCity: original.guestCity,

        adultsCount: original.adultsCount,
        childrenCount: original.childrenCount,
        infantsCount: original.infantsCount,
        totalPax: original.totalPax,

        currency: original.currency,
        totalHotelAmount: original.totalHotelAmount,
        totalMealAmount: original.totalMealAmount,
        totalFlightAmount: original.totalFlightAmount,
        totalTransportAmount: original.totalTransportAmount,
        totalVisaAmount: original.totalVisaAmount,
        totalAdditionalAmount: original.totalAdditionalAmount,
        subtotal: original.subtotal,
        taxAmount: original.taxAmount,
        discountAmount: original.discountAmount,
        grandTotal: original.grandTotal,
        pricePerAdult: original.pricePerAdult,
        pricePerChild: original.pricePerChild,

        hotels: original.hotels as any,
        flights: original.flights as any,
        transports: original.transports as any,
        visas: original.visas as any,
        additionalItems: original.additionalItems as any,

        inclusions: original.inclusions,
        exclusions: original.exclusions,
        termsAndConditions: original.termsAndConditions,
        notes: original.notes,

        createdById: userId || null,
      },
      include: {
        party: {
          select: { id: true, partyName: true, partyCode: true, email: true, contactNumber: true, whatsappNumber: true, whatsappGroupId: true }
        }
      }
    });

    return duplicate;
  }

  // Generate Quotation PDF Buffer
  static async generatePdf(id: string, options?: { hideBreakdown?: boolean }): Promise<{ buffer: Buffer; quotation: any }> {
    const quotation = await this.getQuotationById(id);

    const pdfData: QuotationPdfData = {
      quotationNumber: quotation.quotationNumber,
      title: quotation.title,
      status: quotation.status,
      createdAt: quotation.createdAt,
      validUntil: quotation.validUntil,

      customerType: quotation.customerType,
      partyName: quotation.party?.partyName || null,
      guestName: quotation.guestName,
      guestEmail: quotation.guestEmail,
      guestPhone: quotation.guestPhone,
      guestCountry: quotation.guestCountry,
      guestCity: quotation.guestCity,

      adultsCount: quotation.adultsCount,
      childrenCount: quotation.childrenCount,
      infantsCount: quotation.infantsCount,
      totalPax: quotation.totalPax,

      currency: quotation.currency,
      totalHotelAmount: quotation.totalHotelAmount,
      totalMealAmount: quotation.totalMealAmount,
      totalFlightAmount: quotation.totalFlightAmount || 0,
      totalTransportAmount: quotation.totalTransportAmount,
      totalVisaAmount: quotation.totalVisaAmount,
      totalAdditionalAmount: quotation.totalAdditionalAmount,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      discountAmount: quotation.discountAmount,
      grandTotal: quotation.grandTotal,
      pricePerAdult: quotation.pricePerAdult,
      pricePerChild: quotation.pricePerChild,

      hotels: (quotation.hotels as any[]) || [],
      flights: (quotation.flights as any[]) || [],
      transports: (quotation.transports as any[]) || [],
      visas: quotation.visas as any,
      additionalItems: (quotation.additionalItems as any[]) || [],

      inclusions: quotation.inclusions,
      exclusions: quotation.exclusions,
      termsAndConditions: quotation.termsAndConditions,
      notes: quotation.notes,
      hideBreakdown: options?.hideBreakdown,
    };

    const buffer = await QuotationPdfService.generateQuotationPdf(pdfData);
    return { buffer, quotation };
  }

  // Send Email with PDF attachment
  static async sendEmail(id: string, options: {
    to?: string;
    subject?: string;
    message?: string;
  }) {
    const { buffer, quotation } = await this.generatePdf(id);
    const recipient = (options.to || quotation.guestEmail || quotation.party?.email || '').trim();
    if (!recipient) {
      throw new Error('No email address found for this guest or agency. Please enter an email address.');
    }

    const subject = options.subject || `Official Umrah Quotation ${quotation.quotationNumber} - Moulavi Travels`;
    const bodyMessage = options.message || 
      `Dear ${quotation.guestName},\n\nThank you for choosing Moulavi Travels. Please find attached your customized Umrah Package Quotation (${quotation.quotationNumber}).\n\nTotal Package Rate: ${quotation.currency} ${quotation.grandTotal.toLocaleString()}\nTotal Pilgrims: ${quotation.totalPax} (${quotation.adultsCount} Adults, ${quotation.childrenCount} Children)\n\nPlease review the attached document and feel free to contact us for any modifications or to proceed with the confirmation.\n\nWarm regards,\nMoulavi Travels Team`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #ED1C25; color: white; padding: 25px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">MOULAVI TRAVELS</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.95;">Hajj & Umrah Tour Operators | Saudi Ministry Approved</p>
        </div>
        <div style="padding: 25px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="color: #ED1C25; margin-top: 0;">Official Umrah Package Quotation</h3>
          <p style="white-space: pre-line; color: #475569; font-size: 14px;">${bodyMessage}</p>
          
          <div style="background: #FFF8F8; border: 1px solid #FECACA; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #64748b;">Quotation Reference:</span>
              <strong style="color: #0f172a;">${quotation.quotationNumber}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #64748b;">Grand Total:</span>
              <strong style="color: #ED1C25; font-size: 15px;">${quotation.currency} ${quotation.grandTotal.toLocaleString()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #64748b;">Total Pilgrims:</span>
              <strong style="color: #0f172a;">${quotation.totalPax} (${quotation.adultsCount} Adults, ${quotation.childrenCount} Children)</strong>
            </div>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 25px;">
            Moulavi Travel and Rec Agents Pvt Ltd | Web: www.moulavi.in | Email: info@moulavi.in
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: '"Moulavi Travels" <info@moulavi.com>',
      to: recipient,
      subject,
      text: bodyMessage,
      html: htmlContent,
      attachments: [
        {
          filename: `Quotation_${quotation.quotationNumber}.pdf`,
          content: buffer,
          contentType: 'application/pdf',
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    await prisma.quotation.update({
      where: { id },
      data: { status: 'SENT' }
    });

    return { success: true, message: `Quotation email successfully sent to ${recipient}` };
  }

  // Send WhatsApp message with PDF attachment
  static async sendWhatsApp(id: string, options?: {
    to?: string;
    message?: string;
  }) {
    const { buffer, quotation } = await this.generatePdf(id);
    const { publicUrl } = await saveQuotationPdfToDisk(quotation.quotationNumber, buffer);

    const result = await sendQuotationWhatsApp(quotation, {
      pdfUrl: publicUrl,
      customRecipient: options?.to,
      customMessage: options?.message,
    });

    await prisma.quotation.update({
      where: { id },
      data: { status: 'SENT' }
    });

    return {
      success: true,
      message: result.message,
      target: result.target,
      isGroup: result.isGroup,
      publicPdfUrl: publicUrl,
    };
  }

  // Convert Quotation into a Real Booking (UmrahVisaBooking)
  static async convertToBooking(id: string, userId?: string, options?: {
    partyId?: string;
    groupNumber?: string;
    groupName?: string;
    visaType?: 'individual_visa' | 'group_visa';
  }) {
    const quotation = await this.getQuotationById(id);

    if (quotation.status === 'CONVERTED' && quotation.convertedBookingId) {
      throw new Error(`Quotation has already been converted to booking #${quotation.convertedBooking?.bookingReference || quotation.convertedBookingId}`);
    }

    let partyId = options?.partyId || quotation.partyId;
    if (!partyId) {
      const defaultParty = await prisma.party.findFirst({
        orderBy: { createdAt: 'asc' }
      });
      if (!defaultParty) {
        throw new Error('No agency/party found in the system to assign booking');
      }
      partyId = defaultParty.id;
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = `UB-${yy}${mm}${dd}`;

    let refCount = await prisma.umrahVisaBooking.count({
      where: { bookingReference: { startsWith: prefix } }
    });
    let bookingReference = `${prefix}-${String(refCount + 1).padStart(3, '0')}`;

    let exists = await prisma.umrahVisaBooking.findUnique({ where: { bookingReference } });
    while (exists) {
      refCount++;
      bookingReference = `${prefix}-${String(refCount + 1).padStart(3, '0')}`;
      exists = await prisma.umrahVisaBooking.findUnique({ where: { bookingReference } });
    }

    const visaType = options?.visaType || (quotation.totalPax > 1 ? 'group_visa' : 'individual_visa');
    const groupNumber = options?.groupNumber || (visaType === 'group_visa' ? `G-${quotation.quotationNumber.replace('QT-', '')}` : null);
    const groupName = options?.groupName || (visaType === 'group_visa' ? (quotation.title || `${quotation.guestName} Group`) : null);

    const booking = await prisma.$transaction(async (tx) => {
      // 1. Create UmrahVisaBooking
      const newBooking = await tx.umrahVisaBooking.create({
        data: {
          bookingReference,
          partyId: partyId!,
          guestName: quotation.guestName,
          guestMobile: quotation.guestPhone || '',
          passengerCount: quotation.totalPax,
          hasGroupNumber: Boolean(groupNumber),
          groupNumber,
          groupName,
          visaType: visaType as any,
          status: 'pending',
          hasTransportation: ((quotation.transports as any[]) || []).length > 0,
        }
      });

      // 2. Create Passenger Slots
      const passengersData: any[] = [];

      passengersData.push({
        bookingId: newBooking.id,
        fullName: quotation.guestName,
        isLeadPassenger: true,
        gender: 'male' as any,
      });

      for (let i = 1; i < quotation.adultsCount; i++) {
        passengersData.push({
          bookingId: newBooking.id,
          fullName: `Adult Guest ${i + 1}`,
          isLeadPassenger: false,
          gender: 'male' as any,
        });
      }

      for (let i = 0; i < quotation.childrenCount; i++) {
        passengersData.push({
          bookingId: newBooking.id,
          fullName: `Child Guest ${i + 1}`,
          isLeadPassenger: false,
          gender: 'male' as any,
        });
      }

      for (let i = 0; i < quotation.infantsCount; i++) {
        passengersData.push({
          bookingId: newBooking.id,
          fullName: `Infant Guest ${i + 1}`,
          isLeadPassenger: false,
          gender: 'male' as any,
        });
      }

      if (passengersData.length > 0) {
        await tx.umrahPassenger.createMany({
          data: passengersData
        });
      }

      // 3. Create Travel Details from Quotation Flights if present
      const quotationFlights = Array.isArray(quotation.flights) ? (quotation.flights as any[]) : [];
      if (quotationFlights.length > 0) {
        const firstFlight = quotationFlights[0];
        const lastFlight = quotationFlights.length > 1 ? quotationFlights[quotationFlights.length - 1] : firstFlight;
        
        let arrivalAirportId = firstFlight.toAirportId || firstFlight.fromAirportId;
        let departureAirportId = lastFlight.fromAirportId || lastFlight.toAirportId;

        if (!arrivalAirportId && (firstFlight.toAirport || firstFlight.fromAirport)) {
          const matched = await tx.locationMaster.findFirst({
            where: {
              locationType: 'AIRPORT',
              OR: [
                { code: firstFlight.toAirport || firstFlight.fromAirport },
                { name: { contains: firstFlight.toAirport || firstFlight.fromAirport } }
              ]
            }
          });
          if (matched) arrivalAirportId = matched.id;
        }

        if (!departureAirportId && (lastFlight.fromAirport || lastFlight.toAirport)) {
          const matched = await tx.locationMaster.findFirst({
            where: {
              locationType: 'AIRPORT',
              OR: [
                { code: lastFlight.fromAirport || lastFlight.toAirport },
                { name: { contains: lastFlight.fromAirport || lastFlight.toAirport } }
              ]
            }
          });
          if (matched) departureAirportId = matched.id;
        }

        if (arrivalAirportId && departureAirportId) {
          const arrDateTime = firstFlight.arrivalDateTime ? new Date(firstFlight.arrivalDateTime) : (firstFlight.departureDateTime ? new Date(firstFlight.departureDateTime) : new Date());
          const depDateTime = lastFlight.departureDateTime ? new Date(lastFlight.departureDateTime) : (lastFlight.arrivalDateTime ? new Date(lastFlight.arrivalDateTime) : new Date());

          try {
            await tx.umrahTravelDetails.create({
              data: {
                bookingId: newBooking.id,
                arrivalAirportId,
                arrivalFlightNumber: firstFlight.flightNumber || 'TBD',
                arrivalDateTime: arrDateTime,
                departureAirportId,
                departureFlightNumber: lastFlight.flightNumber || 'TBD',
                departureDateTime: depDateTime,
                isAlternate: false,
              }
            });
          } catch (err) {
            console.warn('Could not auto-create travel details on conversion:', err);
          }
        }
      }

      // 4. Create Hotel Bookings & Stays
      const quotationHotels = Array.isArray(quotation.hotels) ? (quotation.hotels as any[]) : [];
      for (const h of quotationHotels) {
        let cityId = h.cityId;
        let hotelId = h.hotelId;

        if (!cityId && h.city) {
          const matchedCity = await tx.cityMaster.findFirst({
            where: { name: { contains: h.city.trim() } }
          });
          if (matchedCity) cityId = matchedCity.id;
        }

        if (!hotelId && h.hotelName) {
          const matchedHotel = await tx.locationMaster.findFirst({
            where: {
              name: { contains: h.hotelName.trim() },
              locationType: 'HOTEL',
              ...(cityId ? { cityId } : {})
            }
          });
          if (matchedHotel) {
            hotelId = matchedHotel.id;
            if (!cityId) cityId = matchedHotel.cityId;
          }
        }

        if (!cityId) {
          const defaultCity = await tx.cityMaster.findFirst({ where: { isActive: true } });
          if (defaultCity) cityId = defaultCity.id;
        }

        if (cityId && hotelId) {
          await tx.umrahHotelBooking.create({
            data: {
              bookingId: newBooking.id,
              cityId,
              hotelId,
              checkInDate: new Date(h.checkIn),
              checkOutDate: new Date(h.checkOut),
              bedsQuantity: h.hasExtraBed ? (Number(h.extraBedCount) || 1) : null,
              isAlternate: false,
              isCompanyBrn: false,
              isCompanyCateringBrn: false,
            }
          });
        }
      }

      // 4. Create Transport Bookings
      const quotationTransports = Array.isArray(quotation.transports) ? (quotation.transports as any[]) : [];
      for (const t of quotationTransports) {
        let transportMasterId = t.transportMasterId;
        if (!transportMasterId && t.routeId && t.vehicleTypeId) {
          const matchedTm = await tx.transportMaster.findFirst({
            where: {
              routeId: t.routeId,
              vehicleTypeId: t.vehicleTypeId,
              isActive: true,
            }
          });
          if (matchedTm) transportMasterId = matchedTm.id;
        }

        if (transportMasterId) {
          let travelDateTime: Date | null = null;
          if (t.date) {
            travelDateTime = new Date(`${t.date}T${t.time || '12:00'}`);
            if (isNaN(travelDateTime.getTime())) travelDateTime = new Date(t.date);
          }
          await tx.umrahTransportBooking.create({
            data: {
              bookingId: newBooking.id,
              transportMasterId,
              travelDateTime,
              isAlternate: false,
            }
          });
        }
      }

      // 5. Update Quotation Status
      await tx.quotation.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedBookingId: newBooking.id,
          convertedAt: new Date(),
        }
      });

      return newBooking;
    });

    return booking;
  }
}
