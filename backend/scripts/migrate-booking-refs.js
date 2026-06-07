const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateBookings() {
  try {
    const bookings = await prisma.umrahVisaBooking.findMany({
      where: {
        bookingReference: null
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${bookings.length} bookings without reference numbers.`);

    let nextNumber = 10001;
    
    // Find the current max to continue sequence if some exist
    const lastBooking = await prisma.umrahVisaBooking.findFirst({
      where: {
        bookingReference: { startsWith: 'UB-' }
      },
      orderBy: {
        bookingReference: 'desc',
      }
    });

    if (lastBooking && lastBooking.bookingReference) {
      const numericPart = lastBooking.bookingReference.replace('UB-', '');
      const lastNumber = parseInt(numericPart, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    for (const booking of bookings) {
      const ref = `UB-${nextNumber++}`;
      await prisma.umrahVisaBooking.update({
        where: { id: booking.id },
        data: { bookingReference: ref }
      });
      console.log(`Updated booking ${booking.id} with reference ${ref}`);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateBookings();
