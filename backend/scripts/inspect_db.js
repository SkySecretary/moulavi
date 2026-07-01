const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DATABASE INSPECTION ---');

  // Bookings count
  const bookingsCount = await prisma.umrahVisaBooking.count({
    where: { isDeleted: false }
  });
  console.log('Active Bookings Count:', bookingsCount);

  // Passengers count
  const systemPassengers = await prisma.umrahPassenger.count({
    where: { isDeleted: false }
  });
  console.log('Active Passengers Count:', systemPassengers);

  // Nusuk Passengers count
  const nusukPassengers = await prisma.umrahPassenger.count({
    where: {
      isDeleted: false,
      OR: [
        { mofaNumber: { not: null } },
        { visaNumber: { not: null } }
      ]
    }
  });
  console.log('Nusuk Passengers (Mofa/Visa not null):', nusukPassengers);

  // Visas Issued count
  const visasIssued = await prisma.umrahPassenger.count({
    where: {
      isDeleted: false,
      visaNumber: { not: null }
    }
  });
  console.log('Visas Issued Count:', visasIssued);

  // Mismatches count
  const mismatchesCount = await prisma.nusukMismatch.count();
  console.log('Nusuk Mismatches Count:', mismatchesCount);

  // Active settings
  const settings = await prisma.nusukSetting.findFirst();
  console.log('Nusuk Settings:', settings);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
