import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma || new PrismaClient({
  log: ['error'], // Only log errors, not queries
});

(prisma as any).$use(async (params: any, next: (params: any) => Promise<any>) => {
  const result = await next(params);
  
  const affectedModels = ['UmrahHotelBooking', 'UmrahVisaBooking', 'UmrahPassenger', 'HotelInventory'];
  const writeActions = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany', 'upsert'];
  
  if (affectedModels.includes(params.model || '') && writeActions.includes(params.action)) {
    try {
      const { InventoryService } = require('../services/inventoryService');
      InventoryService.recalculateAll().catch((err: any) => 
        console.error('[PRISMA MIDDLEWARE] Inventory recalculation error:', err)
      );
    } catch (err) {
      // Ignore dynamic require errors on startup / build
    }
  }
  
  return result;
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export { prisma };
export default prisma;
