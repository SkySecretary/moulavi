const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.umrahVisaBooking.updateMany({
    where: {
      status: 'bill'
    },
    data: {
      status: 'voucher'
    }
  });
  console.log(`Updated ${result.count} bookings to 'voucher' status.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
