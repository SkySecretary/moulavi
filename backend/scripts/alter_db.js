const { PrismaClient } = require('@prisma/client');
// Initialize with explicit path to the correct DB
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function alterDb() {
  const queries = [
    "ALTER TABLE parties ADD COLUMN logo_path TEXT;",
    "ALTER TABLE vouchers ADD COLUMN vehicle_type TEXT;",
    "ALTER TABLE voucher_movements ADD COLUMN via_bdr BOOLEAN NOT NULL DEFAULT 0;",
    "ALTER TABLE umrah_movement_details ADD COLUMN viabadr_override BOOLEAN NOT NULL DEFAULT 0;"
  ];

  for (const q of queries) {
    try {
      await prisma.$executeRawUnsafe(q);
      console.log(`Successfully executed: ${q}`);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log(`Column already exists: ${q}`);
      } else {
        console.error(`Error executing ${q}:`, e.message);
      }
    }
  }
}

alterDb().finally(() => prisma.$disconnect());
