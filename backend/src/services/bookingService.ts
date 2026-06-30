import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate next unique booking reference number
 * Format: "UB-10001", "UB-10002", etc.
 */
export async function generateBookingReference(): Promise<string> {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `UB-${dateStr}-`;

    // Find the latest booking reference for today
    const lastBooking = await prisma.umrahVisaBooking.findFirst({
      where: {
        bookingReference: { startsWith: prefix },
        isDuplicate: false
      },
      orderBy: {
        bookingReference: 'desc',
      },
      select: {
        bookingReference: true,
      },
    });

    let nextNumber = 1;
    if (lastBooking && lastBooking.bookingReference) {
      const parts = lastBooking.bookingReference.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating booking reference:', error);
    // Fallback to random timestamp-based if DB fetch fails
    return `UB-${Date.now().toString().slice(-6)}`;
  }
}
