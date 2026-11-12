import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import env from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import onboardingRouter from './routes/onboarding.js';
import accountsRouter from './routes/accounts.js';
import adminRouter from './routes/admin.js';
import bootstrapRouter from './routes/bootstrap.js';

import { getRedisClient } from './config/redis.js';

export function createApp() {
  const app = express();

  // ─── Security middleware ──────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ─── Logging ──────────────────────────────────────
  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  // ─── Trust proxy (for accurate req.ip behind reverse proxy) ──
  app.set('trust proxy', 1);

  // ─── Global rate limit ────────────────────────────
  app.use('/api', apiLimiter);

  // ─── Routes ──────────────────────────────────────
  app.use(healthRouter);          // /health, /ready (no prefix)
  app.use('/api/bootstrap', bootstrapRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/accounts', accountsRouter);
  app.use('/api/admin', adminRouter);

  // ─── 404 + error handling ─────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

// Initialize Redis connection (non-blocking — app works without Redis)
getRedisClient();

export default createApp;
