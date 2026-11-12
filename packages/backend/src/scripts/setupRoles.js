/**
 * BalanceVault — Role setup helper.
 *
 * Reads the SQL files in prisma/sql/ and applies them to the DATABASE_URL.
 * This is a convenience wrapper around psql — if psql is available, prefer:
 *   psql "$DATABASE_URL" -f prisma/sql/01_roles.sql
 *   psql "$DATABASE_URL" -f prisma/sql/02_bootstrap_function.sql
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import env from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', '..', 'prisma', 'sql');

const sqlFiles = ['01_roles.sql', '02_bootstrap_function.sql'];

async function main() {
  const prisma = new PrismaClient();

  for (const file of sqlFiles) {
    const filePath = path.join(sqlDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[roles] ${file} not found, skipping`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    console.info(`[roles] applying ${file}...`);

    try {
      await prisma.$executeRawUnsafe(sql);
      console.info(`[roles] ${file} applied successfully`);
    } catch (err) {
      console.error(`[roles] ${file} failed:`, err.message);
      // Continue to next file — some statements may fail if roles already exist
    }
  }

  await prisma.$disconnect();
  console.info('[roles] done. Remember to set the bootstrap_login password:');
  console.info('  ALTER ROLE bootstrap_login PASSWORD \'your-strong-password\';');
}

main().catch((err) => {
  console.error('[roles] fatal:', err);
  process.exit(1);
});
