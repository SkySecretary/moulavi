import { prisma } from '../config/database';

/**
 * Generate next sequential voucher number starting from "001"
 * Format: "001", "002", "003", ..., "695", etc.
 * Global sequence across all vouchers (not year-based) - used as reservation number.
 * Robust against non-numeric entries, out-of-order creation timestamps, and race conditions.
 */
export async function generateVoucherNumber(tx?: any): Promise<string> {
  const db = tx || prisma;
  try {
    let maxNumber = 0;

    // 1. Efficient SQLite query to find the absolute maximum numeric voucher number
    try {
      const result: any = await db.$queryRawUnsafe(
        `SELECT MAX(CAST(voucher_number AS INTEGER)) as maxNum FROM vouchers WHERE voucher_number GLOB '[0-9]*'`
      );
      if (result && result.length > 0 && result[0].maxNum !== null && result[0].maxNum !== undefined) {
        maxNumber = parseInt(String(result[0].maxNum), 10) || 0;
      }
    } catch (rawErr) {
      console.warn('[VOUCHER-SERVICE] Raw query fallback for voucher number:', rawErr);
      // Fallback: fetch all voucher numbers and compute max numeric value in JS
      const vouchers = await db.voucher.findMany({
        select: { voucherNumber: true },
      });
      for (const v of vouchers) {
        if (v.voucherNumber && /^\d+$/.test(v.voucherNumber.trim())) {
          const n = parseInt(v.voucherNumber.trim(), 10);
          if (!isNaN(n) && n > maxNumber) {
            maxNumber = n;
          }
        }
      }
    }

    let nextNumber = maxNumber + 1;
    let candidate = nextNumber.toString().padStart(3, '0');

    // 2. Collision safeguard loop to guarantee no unique constraint violations
    while (true) {
      const exists = await db.voucher.findUnique({
        where: { voucherNumber: candidate },
        select: { id: true },
      });
      if (!exists) {
        break;
      }
      nextNumber++;
      candidate = nextNumber.toString().padStart(3, '0');
    }

    return candidate;
  } catch (error) {
    console.error('Error generating voucher number:', error);
    throw new Error('Failed to generate voucher number');
  }
}

/**
 * Format time from DateTime to HH:MM string (UTC)
 */
export function formatTime(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return '';
  
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  if (isNaN(date.getTime())) return '';
  
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date to DD-MM-YYYY (UTC)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get the next route number from voucher_movements table
 * Route numbers are 5-digit, global across all vouchers, sequential
 * @returns The next route number to use (as string, padded to 5 digits)
 */
export async function getNextRouteNumber(tx?: any): Promise<string> {
  const db = tx || prisma;
  try {
    let maxNumber = 0;

    // 1. Efficient SQLite query to find the absolute maximum numeric route number
    try {
      const result: any = await db.$queryRawUnsafe(
        `SELECT MAX(CAST(route AS INTEGER)) as maxNum FROM voucher_movements WHERE route IS NOT NULL AND route GLOB '[0-9]*'`
      );
      if (result && result.length > 0 && result[0].maxNum !== null && result[0].maxNum !== undefined) {
        maxNumber = parseInt(String(result[0].maxNum), 10) || 0;
      }
    } catch (rawErr) {
      console.warn('[VOUCHER-SERVICE] Raw query fallback for route number:', rawErr);
      const movements = await db.voucherMovement.findMany({
        where: { route: { not: null } },
        select: { route: true },
      });
      for (const m of movements) {
        if (m.route && /^\d+$/.test(m.route.trim())) {
          const n = parseInt(m.route.trim(), 10);
          if (!isNaN(n) && n > maxNumber) {
            maxNumber = n;
          }
        }
      }
    }

    const nextRouteNumber = maxNumber + 1;
    return nextRouteNumber.toString().padStart(5, '0');
  } catch (error) {
    console.error('Error getting next route number:', error);
    // Default to 00001 if there's an error
    return '00001';
  }
}

/**
 * Generate sequential route numbers for voucher movements
 * @param count - Number of route numbers to generate
 * @param tx - Optional transaction client
 * @returns Array of route numbers (5-digit strings)
 */
export async function generateRouteNumbersForVoucher(count: number, tx?: any): Promise<string[]> {
  const db = tx || prisma;
  try {
    const nextRouteNumber = await getNextRouteNumber(db);
    const baseNumber = parseInt(nextRouteNumber, 10);
    
    const routes: string[] = [];
    for (let i = 0; i < count; i++) {
      routes.push((baseNumber + i).toString().padStart(5, '0'));
    }
    
    return routes;
  } catch (error) {
    console.error('Error generating route numbers for voucher:', error);
    throw new Error('Failed to generate route numbers');
  }
}
