import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised environment configuration.
 * Fails fast on missing required values so the app never starts in a broken state.
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const optional = (name, fallback) => process.env[name] ?? fallback;
const int = (name, fallback) => {
  const raw = process.env[name];
  const parsed = raw ? parseInt(raw, 10) : fallback;
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  databaseUrl: required('DATABASE_URL'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
  jwtSecret: required('JWT_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  port: int('PORT', 3001),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
  nodeEnv: optional('NODE_ENV', 'development'),
  bcryptRounds: int('BCRYPT_ROUNDS', 12),
  bootstrapDatabaseUrl: optional('BOOTSTRAP_DATABASE_URL', ''),
  isProduction: optional('NODE_ENV', 'development') === 'production',
};

export default env;
