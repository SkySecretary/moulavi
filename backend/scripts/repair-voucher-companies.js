const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:' + path.resolve(__dirname, '../prisma/dev.db'),
    },
  },
});

async function repairVouchers() {
  console.log('--- Starting Voucher Company Link Audit & Repair ---');

  const vouchers = await prisma.voucher.findMany({
    include: {
      booking: {
        include: {
          umrahVisaProvider: true,
          transportCompany: true,
          party: true,
        },
      },
      movements: true,
    },
  });

  let repairedCount = 0;

  for (const v of vouchers) {
    const updates = {};

    // 1. Umrah Company
    if (!v.umrahCompanyId) {
      const providerId = v.umrahVisaProviderId || v.booking?.umrahVisaProviderId;
      if (providerId) {
        updates.umrahCompanyId = providerId;
        if (!v.umrahVisaProviderId) {
          updates.umrahVisaProviderId = providerId;
        }
      }
    } else if (!v.umrahVisaProviderId && v.umrahCompanyId) {
      updates.umrahVisaProviderId = v.umrahCompanyId;
    }

    // 2. Transport Company
    if (!v.transportCompanyId) {
      const transportId = v.booking?.transportCompanyId;
      if (transportId) {
        updates.transportCompanyId = transportId;
      }
    }

    // 3. Party
    if (!v.partyId && v.booking?.partyId) {
      updates.partyId = v.booking.partyId;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.voucher.update({
        where: { id: v.id },
        data: updates,
      });
      repairedCount++;
      console.log(`[REPAIRED] Voucher #${v.voucherNumber} (ID: ${v.id}):`, updates);
    }
  }

  console.log(`Audit complete. Repaired ${repairedCount} voucher records.`);
}

repairVouchers()
  .catch((e) => {
    console.error('Repair failed:', e);
  })
  .finally(() => prisma.$disconnect());
