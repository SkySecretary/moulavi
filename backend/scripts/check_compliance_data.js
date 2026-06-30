const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- SubAgentMetric Records ---');
  const metrics = await prisma.subAgentMetric.findMany({
    include: {
      subAgent: {
        select: {
          partyName: true,
          partyCode: true
        }
      }
    }
  });
  console.log(JSON.stringify(metrics, null, 2));

  console.log('\n--- Active Mismatches Count ---');
  const count = await prisma.nusukMismatch.count({ where: { resolved: false } });
  console.log('Total unresolved mismatches:', count);

  console.log('\n--- Sample Active Mismatches ---');
  const sample = await prisma.nusukMismatch.findMany({
    take: 5,
    include: {
      booking: {
        select: {
          bookingReference: true,
          partyId: true
        }
      }
    }
  });
  console.log(JSON.stringify(sample, null, 2));

  console.log('\n--- Sample Passenger Dates ---');
  const passengers = await prisma.umrahPassenger.findMany({
    take: 5,
    select: {
      id: true,
      fullName: true,
      entryDate: true,
      exitDate: true
    }
  });
  console.log(passengers);

  await prisma.$disconnect();
}

main().catch(console.error);
