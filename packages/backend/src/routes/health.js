import { Router } from 'express';
import prisma from '../config/prisma.js';
import { pingRedis } from '../config/redis.js';

/**
 * Health and readiness endpoints.
 *
 * /health — liveness: is the process alive? Always 200 if the server is up.
 * /ready  — readiness: can we serve traffic? Checks DB + Redis connectivity.
 */

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', async (_req, res) => {
  const checks = { database: false, redis: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    // leave as false
  }

  try {
    checks.redis = await pingRedis();
  } catch {
    // leave as false
  }

  const ready = checks.database; // Redis is optional for readiness
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
