const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const totalBookings = await prisma.umrahVisaBooking.count();
  console.log('Total bookings:', totalBookings);

  console.log('\n--- Sample Bookings ---');
  const samples = await prisma.umrahVisaBooking.findMany({
    take: 5,
    select: {
      id: true,
      bookingReference: true,
      groupNumber: true,
      partyId: true,
      passengerCount: true
    }
  });
  console.log(samples);

  console.log('\n--- Passengers Stats ---');
  const totalPassengers = await prisma.umrahPassenger.count();
  const passengersWithEntry = await prisma.umrahPassenger.count({
    where: { entryDate: { not: null } }
  });
  console.log('Total passengers:', totalPassengers);
  console.log('Passengers with entryDate:', passengersWithEntry);

  await prisma.$disconnect();
}

main().catch(console.error);
