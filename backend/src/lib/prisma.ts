import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client across hot reloads and modules
const prisma = globalThis.__prisma || new PrismaClient({
  log: ['error'], // Only log errors, not queries
});

globalThis.__prisma = prisma;

export { prisma };
export default prisma;
