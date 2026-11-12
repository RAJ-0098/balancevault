
import rateLimit from 'express-rate-limit';

/**
 * In-memory rate limiter.
 * Applied per-IP and per-route-group.
 */

function makeLimiter(options) {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    ...options,
  });
}

// General API rate limit
export const apiLimiter = makeLimiter({ max: 100 });

// Stricter limit for auth endpoints (prevents brute force)
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
});

// Very strict limit for the bootstrap endpoint
export const bootstrapLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Bootstrap attempts exhausted' },
});
