
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate next sequential voucher number starting from "001"
 * Format: "001", "002", "003", etc.
 * Global sequence across all vouchers (not year-based) - used as reservation number
 */
export async function generateVoucherNumber(): Promise<string> {
  try {
    // Find the highest voucher number across all vouchers (global, not year-based)
    const lastVoucher = await prisma.voucher.findFirst({
      orderBy: {
        voucherNumber: 'desc',
      },
      select: {
        voucherNumber: true,
      },
    });

    if (!lastVoucher) {
      return '001';
    }

    // Extract numeric part and increment
    const lastNumber = parseInt(lastVoucher.voucherNumber, 10);
    if (isNaN(lastNumber)) {
      return '001';
    }
    
    const nextNumber = lastNumber + 1;
    
    // Format as 3-digit string with leading zeros
    return nextNumber.toString().padStart(3, '0');
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
 * Get the last route number from voucher_movements table
 * Route numbers are 5-digit, global across all vouchers, sequential
 * @returns The next route number to use (as string, padded to 5 digits)
 */
export async function getNextRouteNumber(): Promise<string> {
  try {
    // Get the highest route number from voucher_movements
    const lastMovement = await prisma.voucherMovement.findFirst({
      where: {
        route: { not: null },
      },
      orderBy: {
        route: 'desc',
      },
      select: {
        route: true,
      },
    });

    // Start from 00001 if no route numbers exist, otherwise increment from the highest
    let nextRouteNumber = 1;
    if (lastMovement?.route) {
      const lastNumber = parseInt(lastMovement.route, 10);
      if (!isNaN(lastNumber)) {
        nextRouteNumber = lastNumber + 1;
      }
    }

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
 * @returns Array of route numbers (5-digit strings)
 */
export async function generateRouteNumbersForVoucher(count: number): Promise<string[]> {
  try {
    const nextRouteNumber = await getNextRouteNumber();
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
