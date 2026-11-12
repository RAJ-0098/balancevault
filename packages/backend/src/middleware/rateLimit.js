import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';

/**
 * Rate limiter backed by Redis when available, memory store otherwise.
 * Applied per-IP and per-route-group.
 */

function makeLimiter(options) {
  const store = isRedisAvailable()
    ? new RedisStore({ sendCommand: (...args) => getRedisClient().call(...args) })
    : undefined;

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    ...options,
    ...(store ? { store } : {}),
  });
}

// General API rate limit
export const apiLimiter = makeLimiter({ max: 100 });

// Stricter limit for auth endpoints (prevents brute force)
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: { error: 'Too many authentication attempts, please try again later' },
});

// Very strict limit for the bootstrap endpoint
export const bootstrapLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Bootstrap attempts exhausted' },
});
