import Redis from 'ioredis';
import env from './env.js';

/**
 * Redis client singleton for rate limiting.
 * Gracefully degrades: if Redis is unavailable the app still starts
 * (rate limiter falls back to in-memory store).
 */
let redisClient = null;
let redisAvailable = false;

export function getRedisClient() {
  if (redisClient) return redisClient;

  redisClient = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > 5) {
        console.warn('[redis] max retries reached — rate limiter will use memory store');
        return null;
      }
      return Math.min(times * 500, 2000);
    },
  });

  redisClient.on('connect', () => {
    redisAvailable = true;
    console.info('[redis] connected');
  });

  redisClient.on('error', (err) => {
    redisAvailable = false;
    console.warn('[redis] error:', err.message);
  });

  return redisClient;
}

export function isRedisAvailable() {
  return redisAvailable;
}

export async function pingRedis() {
  if (!redisClient) return false;
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export default getRedisClient;
