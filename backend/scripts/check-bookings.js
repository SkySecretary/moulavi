const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.umrahVisaBooking.findMany({
    take: 5,
    select: { id: true, groupNumber: true, status: true }
  });
  console.log('Current Bookings:', JSON.stringify(bookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
