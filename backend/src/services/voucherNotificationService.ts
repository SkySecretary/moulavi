import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { generateVoucherPDF } from './pdfService';
import { sendVoucherAgencyEmail, sendVoucherSupplierEmail } from './emailService';
import { sendVoucherAgencyWhatsApp, sendVoucherSupplierWhatsApp } from './whatsappService';

/**
 * Save a voucher PDF buffer to the static uploads directory
 * and return its publicly accessible URL.
 */
export async function saveVoucherPdfToDisk(voucherNumber: string, pdfBuffer: Buffer): Promise<{ filePath: string; publicUrl: string }> {
  const uploadDir = path.join(process.cwd(), 'uploads', 'vouchers');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const safeVoucherNumber = voucherNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Voucher_${safeVoucherNumber}.pdf`;
  const filePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(filePath, pdfBuffer);

  const baseUrl = (process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://umra.moulavi.in').replace(/\/$/, '');
  const publicUrl = `${baseUrl}/uploads/vouchers/${filename}`;

  return { filePath, publicUrl };
}

/**
 * Format movement details into a readable string for notifications.
 */
export function formatMovementsSummary(movements?: any[]): string {
  if (!movements || !Array.isArray(movements) || movements.length === 0) {
    return 'No movement details specified';
  }

  return movements
    .map((m, idx) => {
      const dateStr = m.date
        ? new Date(m.date).toLocaleDateString('en-US', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
        : 'Date N/A';
      const timeStr = m.time ? ` @ ${m.time}` : '';
      const fromStr = m.fromLocation || m.from || 'From N/A';
      const toStr = m.toLocation || m.to || 'To N/A';
      const vehicle = m.vehicleType ? ` [${m.vehicleType}]` : '';
      return `${idx + 1}. 📅 ${dateStr}${timeStr}: ${fromStr} ➔ ${toStr}${vehicle}`;
    })
    .join('\n');
}

export interface DispatchVoucherOptions {
  voucherId?: string;
  voucherNumber?: string;
  voucherDataForPdf?: any;
  pdfBuffer?: Buffer;
  notifyAgency?: boolean;
  notifySupplier?: boolean;
}

/**
 * Centralized service to dispatch both Email and WhatsApp notifications with PDF attachment
 * to Agency and Transport Supplier.
 */
export async function dispatchVoucherIssuedAlerts(options: DispatchVoucherOptions): Promise<{
  agencyEmailSent: boolean;
  agencyWhatsAppSent: boolean;
  supplierEmailSent: boolean;
  supplierWhatsAppSent: boolean;
  publicPdfUrl?: string;
}> {
  const result = {
    agencyEmailSent: false,
    agencyWhatsAppSent: false,
    supplierEmailSent: false,
    supplierWhatsAppSent: false,
    publicPdfUrl: undefined as string | undefined,
  };

  const {
    voucherId,
    voucherNumber: inputVoucherNumber,
    voucherDataForPdf,
    pdfBuffer: inputPdfBuffer,
    notifyAgency = true,
    notifySupplier = true,
  } = options;

  try {
    // 1. Fetch full voucher if needed
    let voucher: any = null;
    if (voucherId) {
      voucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
        include: {
          party: true,
          transportCompany: true,
          umrahCompany: true,
          movements: { orderBy: { sr: 'asc' } },
          hotels: { orderBy: { number: 'asc' } },
          flights: { orderBy: { date: 'asc' } },
          booking: {
            include: {
              party: true,
            },
          },
        },
      });
    } else if (inputVoucherNumber) {
      voucher = await prisma.voucher.findUnique({
        where: { voucherNumber: inputVoucherNumber },
        include: {
          party: true,
          transportCompany: true,
          umrahCompany: true,
          movements: { orderBy: { sr: 'asc' } },
          hotels: { orderBy: { number: 'asc' } },
          flights: { orderBy: { date: 'asc' } },
          booking: {
            include: {
              party: true,
            },
          },
        },
      });
    }

    const voucherNumber = voucher?.voucherNumber || inputVoucherNumber || voucherDataForPdf?.voucherNumber || 'UNKNOWN';
    const groupCode = (voucher?.groupCode || voucherDataForPdf?.groupCode || '').replace(/\s+/g, '');
    const groupName = voucher?.groupName || voucherDataForPdf?.groupName || '';
    const guestName = voucher?.guestName || voucherDataForPdf?.guestName || '';
    const guestMobile = voucher?.guestMobile || voucherDataForPdf?.guestMobile || '';
    const paxCount = voucher?.paxCount || voucherDataForPdf?.paxCount || 1;
    const reservationDate = voucher?.reservationDate
      ? new Date(voucher.reservationDate).toLocaleDateString('en-US', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
      : voucherDataForPdf?.reservationDate || '';

    const movements = voucher?.movements || voucherDataForPdf?.movementDetails || [];
    const movementsSummary = formatMovementsSummary(movements);
    const firstRouteDate = movements.length > 0 && movements[0].date
      ? new Date(movements[0].date).toLocaleDateString('en-US', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    // Agency Party
    const agencyParty = voucher?.party || voucher?.booking?.party || voucherDataForPdf?.agentParty;
    // Transport Supplier Party
    const transportSupplierParty = voucher?.transportCompany || voucherDataForPdf?.transportCompany;
    const transportCompanyName = transportSupplierParty?.partyName || 'Assigned Transport Partner';

    // 2. Generate PDF Buffer if not provided
    let pdfBuffer = inputPdfBuffer;
    if (!pdfBuffer) {
      const pdfDataToGenerate = voucherDataForPdf || {
        voucherNumber,
        bookingReference: voucher?.bookingReference || '',
        reservationNumber: voucherNumber,
        reservationDate: voucher?.reservationDate?.toISOString() || new Date().toISOString(),
        guestName,
        guestMobile,
        groupCode,
        paxCount,
        vehicleType: voucher?.vehicleType || '',
        umrahCompany: voucher?.umrahCompany || null,
        agentParty: agencyParty || null,
        transportCompany: transportSupplierParty || null,
        hotelSchedules: (voucher?.hotels || []).map((h: any) => ({
          number: h.number,
          location: h.location,
          hotelName: h.hotelName,
          checkIn: h.checkIn?.toISOString?.() || h.checkIn,
          checkOut: h.checkOut?.toISOString?.() || h.checkOut,
          days: h.days,
          brn: h.brn ? [h.brn] : [],
        })),
        movementDetails: (voucher?.movements || []).map((m: any) => ({
          sr: m.sr,
          route: m.route || '',
          date: m.date?.toISOString?.() || m.date,
          time: m.time,
          from: m.from,
          fromLocation: m.fromLocation,
          to: m.to,
          toLocation: m.toLocation,
          vehicleType: m.vehicleType || '',
          driverDetails1: m.driverDetails1,
          driverDetails2: m.driverDetails2,
          vehicleNumber: m.vehicleNumber,
        })),
        flightDetails: (voucher?.flights || []).map((f: any) => ({
          type: f.type,
          carrier: f.carrier,
          number: f.number,
          date: f.date?.toISOString?.() || f.date,
          from: f.from,
          to: f.to,
          etd: f.etd || '',
          eta: f.eta || '',
        })),
      };

      pdfBuffer = await generateVoucherPDF(pdfDataToGenerate as any);
    }

    // 3. Save PDF to static disk to get accessible public URL
    let publicPdfUrl = '';
    if (pdfBuffer) {
      const saved = await saveVoucherPdfToDisk(voucherNumber, pdfBuffer);
      publicPdfUrl = saved.publicUrl;
      result.publicPdfUrl = publicPdfUrl;
    }

    // 4. Dispatch Agency Notifications (Email + WhatsApp with PDF)
    if (notifyAgency && agencyParty) {
      // Email
      if (agencyParty.email) {
        try {
          await sendVoucherAgencyEmail(
            agencyParty.email,
            agencyParty.partyName || 'Agency Partner',
            voucherNumber,
            groupCode,
            groupName,
            paxCount,
            pdfBuffer
          );
          result.agencyEmailSent = true;
        } catch (err) {
          console.error('[VOUCHER-NOTIFY] Agency email failed:', err);
        }
      }

      // WhatsApp
      try {
        await sendVoucherAgencyWhatsApp(
          agencyParty,
          {
            voucherNumber,
            groupCode,
            groupName,
            paxCount,
            guestName,
            guestMobile,
            transportCompany: transportCompanyName,
            reservationDate,
            firstRouteDate,
            movementsSummary,
          },
          publicPdfUrl
        );
        result.agencyWhatsAppSent = true;
      } catch (err) {
        console.error('[VOUCHER-NOTIFY] Agency WhatsApp failed:', err);
      }
    }

    // 5. Dispatch Transport Supplier Notifications (Email + WhatsApp with PDF)
    if (notifySupplier && transportSupplierParty) {
      // Email
      if (transportSupplierParty.email) {
        try {
          await sendVoucherSupplierEmail(
            transportSupplierParty.email,
            transportSupplierParty.partyName || 'Transport Supplier',
            voucherNumber,
            agencyParty?.partyName || 'NuSync Agency',
            groupCode,
            groupName,
            paxCount,
            movementsSummary,
            pdfBuffer
          );
          result.supplierEmailSent = true;
        } catch (err) {
          console.error('[VOUCHER-NOTIFY] Supplier email failed:', err);
        }
      }

      // WhatsApp
      try {
        await sendVoucherSupplierWhatsApp(
          transportSupplierParty,
          {
            voucherNumber,
            agencyName: agencyParty?.partyName || 'NuSync Agency',
            groupCode,
            groupName,
            paxCount,
            guestName,
            guestMobile,
            firstRouteDate,
            movementsSummary,
          },
          publicPdfUrl
        );
        result.supplierWhatsAppSent = true;
      } catch (err) {
        console.error('[VOUCHER-NOTIFY] Supplier WhatsApp failed:', err);
      }
    }

    console.log('[VOUCHER-NOTIFY] Dispatch completed:', result);
  } catch (error: any) {
    console.error('[VOUCHER-NOTIFY] Error dispatching voucher alerts:', error?.message || error);
  }

  return result;
}
