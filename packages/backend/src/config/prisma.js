import { PrismaClient } from '@prisma/client';
import env from './env.js';

/**
 * Prisma client singleton.
 * In development, attach to globalThis to avoid creating new
 * clients on every hot-reload (node --watch).
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prismaClient ?? new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalForPrisma.__prismaClient = prisma;
}

export default prisma;
