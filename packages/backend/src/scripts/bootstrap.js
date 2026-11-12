/**
 * BalanceVault — First-admin bootstrap script (DB-level path).
 *
 * Connects as bootstrap_login, SET ROLEs to bootstrap_operator,
 * hashes the password locally, and calls the bootstrap_first_admin()
 * SQL function.
 *
 * This mirrors the real Neon permission model:
 *   bootstrap_login (LOGIN, NOINHERIT)
 *     -> member of bootstrap_operator
 *        -> can SET ROLE bootstrap_operator
 *           -> has EXECUTE on bootstrap_first_admin()
 *
 * Usage:
 *   Set BOOTSTRAP_DATABASE_URL to the bootstrap_login connection string,
 *   then: npm run bootstrap
 *
 * If BOOTSTRAP_DATABASE_URL is empty, falls back to the HTTP endpoint path
 * and calls the REST API instead.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import env from '../config/env.js';

async function bootstrapViaDb() {
  if (!env.bootstrapDatabaseUrl) {
    console.error('[bootstrap] BOOTSTRAP_DATABASE_URL is not set.');
    console.error('[bootstrap] Set it to the bootstrap_login connection string,');
    console.error('[bootstrap] or use the HTTP endpoint: POST /api/bootstrap');
    process.exit(1);
  }

  const email = process.env.BOOTSTRAP_EMAIL || 'admin@balancevault.local';
  const password = process.env.BOOTSTRAP_PASSWORD || 'AdminPass123!';
  const firstName = process.env.BOOTSTRAP_FIRST_NAME || 'Admin';
  const lastName = process.env.BOOTSTRAP_LAST_NAME || 'User';

  console.info(`[bootstrap] connecting as bootstrap_login for email: ${email}`);

  // Use a raw Prisma client pointed at the bootstrap connection
  const bootstrapPrisma = new PrismaClient({
    datasources: { db: { url: env.bootstrapDatabaseUrl } },
  });

  try {
    // Hash password locally — the function never sees the plaintext
    const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

    // SET ROLE to bootstrap_operator (requires NOINHERIT membership)
    // Then call the bootstrap function
    const result = await bootstrapPrisma.$queryRawUnsafe(
      `
      SET ROLE bootstrap_operator;
      SELECT * FROM bootstrap_first_admin($1, $2, $3, $4);
      RESET ROLE;
      `,
      email,
      passwordHash,
      firstName,
      lastName,
    );

    console.info('[bootstrap] first admin created successfully!');
    console.info('[bootstrap] result:', result);
    console.info('');
    console.info(`  Email:    ${email}`);
    console.info(`  Password: ${password}`);
    console.info('  (Change this password after first login.)');
  } catch (err) {
    console.error('[bootstrap] failed:', err.message);
    if (err.message.includes('already exists')) {
      console.error('[bootstrap] an admin already exists — bootstrap is locked.');
    }
    process.exit(1);
  } finally {
    await bootstrapPrisma.$disconnect();
  }
}

async function bootstrapViaHttp() {
  const email = process.env.BOOTSTRAP_EMAIL || 'admin@balancevault.local';
  const password = process.env.BOOTSTRAP_PASSWORD || 'AdminPass123!';
  const firstName = process.env.BOOTSTRAP_FIRST_NAME || 'Admin';
  const lastName = process.env.BOOTSTRAP_LAST_NAME || 'User';

  const port = env.port;
  const url = `http://localhost:${port}/api/bootstrap`;

  console.info(`[bootstrap] no BOOTSTRAP_DATABASE_URL — using HTTP endpoint: ${url}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const body = await res.json();

    if (!res.ok) {
      console.error('[bootstrap] HTTP error:', res.status, body);
      process.exit(1);
    }

    console.info('[bootstrap] first admin created successfully!');
    console.info('');
    console.info(`  Email:    ${email}`);
    console.info(`  Password: ${password}`);
    console.info('  (Change this password after first login.)');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('[bootstrap] cannot reach backend. Is it running?');
      console.error('[bootstrap] start it with: npm run dev:backend');
    } else {
      console.error('[bootstrap] failed:', err.message);
    }
    process.exit(1);
  }
}

if (env.bootstrapDatabaseUrl) {
  bootstrapViaDb();
} else {
  bootstrapViaHttp();
}
