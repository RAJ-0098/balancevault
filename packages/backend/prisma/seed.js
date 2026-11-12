/**
 * BalanceVault — synthetic data seed.
 * Creates demo users, accounts, and transactions for hackathon demonstration.
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  console.info('[seed] clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.onboardingRequest.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ─── Admin ────────────────────────────────────────
  const adminPassword = await bcrypt.hash('AdminPass123!', BCRYPT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@balancevault.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      firstName: 'Sarah',
      lastName: 'Admin',
    },
  });
  console.info('[seed] created admin:', admin.email);

  // ─── Account holders ───────────────────────────────
  const holders = [
    { email: 'alice@demo.com', firstName: 'Alice', lastName: 'Chen', status: 'ACTIVE' },
    { email: 'bob@demo.com', firstName: 'Bob', lastName: 'Smith', status: 'ACTIVE' },
    { email: 'carol@demo.com', firstName: 'Carol', lastName: 'Johnson', status: 'PENDING' },
  ];

  for (const h of holders) {
    const pw = await bcrypt.hash('DemoPass123!', BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: h.email,
        passwordHash: pw,
        role: 'ACCOUNT_HOLDER',
        status: h.status,
        firstName: h.firstName,
        lastName: h.lastName,
      },
    });

    // Create onboarding request for each
    const onboarding = await prisma.onboardingRequest.create({
      data: {
        userId: user.id,
        status: h.status === 'ACTIVE' ? 'APPROVED' : 'SUBMITTED',
        processedById: h.status === 'ACTIVE' ? admin.id : null,
        reviewedAt: h.status === 'ACTIVE' ? new Date() : null,
      },
    });

    // Active users get accounts with transactions
    if (h.status === 'ACTIVE') {
      const checking = await prisma.account.create({
        data: {
          userId: user.id,
          type: 'CHECKING',
          status: 'ACTIVE',
          balance: 0,
          currency: 'USD',
        },
      });

      const savings = await prisma.account.create({
        data: {
          userId: user.id,
          type: 'SAVINGS',
          status: 'ACTIVE',
          balance: 0,
          currency: 'USD',
        },
      });

      // Seed some transactions
      const deposit1 = await prisma.transaction.create({
        data: {
          accountId: checking.id,
          type: 'DEPOSIT',
          amount: 5000,
          status: 'COMPLETED',
          description: 'Initial deposit',
          balanceAfter: 5000,
        },
      });
      await prisma.account.update({ where: { id: checking.id }, data: { balance: 5000 } });

      const deposit2 = await prisma.transaction.create({
        data: {
          accountId: savings.id,
          type: 'DEPOSIT',
          amount: 10000,
          status: 'COMPLETED',
          description: 'Savings initial deposit',
          balanceAfter: 10000,
        },
      });
      await prisma.account.update({ where: { id: savings.id }, data: { balance: 10000 } });

      // A withdrawal
      const withdraw = await prisma.transaction.create({
        data: {
          accountId: checking.id,
          type: 'WITHDRAWAL',
          amount: 500,
          status: 'COMPLETED',
          description: 'ATM withdrawal',
          balanceAfter: 4500,
        },
      });
      await prisma.account.update({ where: { id: checking.id }, data: { balance: 4500 } });

      console.info(`[seed] created user ${user.email} with 2 accounts and transactions`);
    } else {
      console.info(`[seed] created user ${user.email} (pending onboarding)`);
    }
  }

  // ─── Audit logs ───────────────────────────────────
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'ADMIN_BOOTSTRAP',
      targetType: 'USER',
      targetId: admin.id,
      metadata: { method: 'seed' },
    },
  });

  console.info('[seed] done!');
  console.info('');
  console.info('Demo credentials:');
  console.info('  Admin:     admin@balancevault.local / AdminPass123!');
  console.info('  Holder:   alice@demo.com / DemoPass123!');
  console.info('  Pending:   carol@demo.com / DemoPass123!');
}

main()
  .catch((err) => {
    console.error('[seed] error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
