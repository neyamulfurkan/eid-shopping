// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient instance with hot-reload protection for development.
 * In development, the instance is stored on globalThis to prevent multiple
 * connections during Next.js hot module replacement.
 * @returns PrismaClient singleton instance
 */
const prisma: PrismaClient =
  process.env.NODE_ENV === 'development'
    ? (globalThis.prisma ?? new PrismaClient({ log: ['query'] }))
    : new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.prisma = prisma;
}

export { prisma };
export default prisma;