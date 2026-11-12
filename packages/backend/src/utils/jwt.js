import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * JWT helpers — access tokens are short-lived, refresh tokens are long-lived.
 * Both are signed with separate secrets.
 */

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

/**
 * Build the token payload (keep it small — no secrets, just identity + role).
 */
export function buildTokenPayload(user) {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
}
