import bcrypt from 'bcrypt';
import env from '../config/env.js';

/**
 * Password hashing and verification using bcrypt.
 */

export async function hashPassword(plain) {
  return bcrypt.hash(plain, env.bcryptRounds);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
