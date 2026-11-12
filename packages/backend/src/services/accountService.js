import prisma from '../config/prisma.js';
import { auditService } from './auditService.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Account + transaction service.
 * All money movements run inside a Prisma transaction so the ledger
 * (balance + transaction record) is always consistent.
 */

export const accountService = {
  async listForUser(userId) {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(accountId, userId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!account) throw new ApiError(404, 'Account not found');
    // Account holders can only see their own accounts; admins can see any
    if (account.userId !== userId) {
      throw new ApiError(403, 'You do not have access to this account');
    }
    return account;
  },

  async getByIdAdmin(accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!account) throw new ApiError(404, 'Account not found');
    return account;
  },

  async createAccount({ userId, type = 'CHECKING', currency = 'USD' }) {
    const account = await prisma.account.create({
      data: { userId, type, currency, status: 'ACTIVE' },
    });
    await auditService.log({
      userId,
      action: 'ACCOUNT_CREATED',
      targetType: 'ACCOUNT',
      targetId: account.id,
      metadata: { type, currency },
    });
    return account;
  },

  async deposit({ accountId, userId, amount, description }) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) throw new ApiError(404, 'Account not found');
      if (account.userId !== userId) throw new ApiError(403, 'Access denied');
      if (account.status === 'FROZEN' || account.status === 'CLOSED') {
        throw new ApiError(409, `Account is ${account.status.toLowerCase()}`);
      }

      const newBalance = account.balance.plus(amount);
      const [updated] = await Promise.all([
        tx.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        }),
        tx.transaction.create({
          data: {
            accountId,
            type: 'DEPOSIT',
            amount,
            status: 'COMPLETED',
            description: description || 'Deposit',
            balanceAfter: newBalance,
          },
        }),
      ]);

      await auditService.log({
        userId,
        action: 'TRANSACTION_CREATED',
        targetType: 'ACCOUNT',
        targetId: accountId,
        metadata: { type: 'DEPOSIT', amount: amount.toString() },
      });

      return updated;
    });
  },

  async withdraw({ accountId, userId, amount, description }) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) throw new ApiError(404, 'Account not found');
      if (account.userId !== userId) throw new ApiError(403, 'Access denied');
      if (account.status === 'FROZEN' || account.status === 'CLOSED') {
        throw new ApiError(409, `Account is ${account.status.toLowerCase()}`);
      }

      const newBalance = account.balance.minus(amount);
      if (newBalance.lessThan(0)) {
        throw new ApiError(400, 'Insufficient funds');
      }

      const [updated] = await Promise.all([
        tx.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        }),
        tx.transaction.create({
          data: {
            accountId,
            type: 'WITHDRAWAL',
            amount,
            status: 'COMPLETED',
            description: description || 'Withdrawal',
            balanceAfter: newBalance,
          },
        }),
      ]);

      await auditService.log({
        userId,
        action: 'TRANSACTION_CREATED',
        targetType: 'ACCOUNT',
        targetId: accountId,
        metadata: { type: 'WITHDRAWAL', amount: amount.toString() },
      });

      return updated;
    });
  },

  async transfer({ fromAccountId, toAccountId, userId, amount, description }) {
    if (fromAccountId === toAccountId) {
      throw new ApiError(400, 'Cannot transfer to the same account');
    }

    return prisma.$transaction(async (tx) => {
      const fromAccount = await tx.account.findUnique({ where: { id: fromAccountId } });
      const toAccount = await tx.account.findUnique({ where: { id: toAccountId } });

      if (!fromAccount) throw new ApiError(404, 'Source account not found');
      if (!toAccount) throw new ApiError(404, 'Destination account not found');
      if (fromAccount.userId !== userId) throw new ApiError(403, 'Access denied to source account');
      if (fromAccount.status === 'FROZEN' || fromAccount.status === 'CLOSED') {
        throw new ApiError(409, `Source account is ${fromAccount.status.toLowerCase()}`);
      }
      if (toAccount.status === 'CLOSED') {
        throw new ApiError(409, 'Destination account is closed');
      }

      const fromBalance = fromAccount.balance.minus(amount);
      if (fromBalance.lessThan(0)) throw new ApiError(400, 'Insufficient funds');
      const toBalance = toAccount.balance.plus(amount);

      const ref = `TRF-${crypto.randomUUID()}`;

      await Promise.all([
        tx.account.update({ where: { id: fromAccountId }, data: { balance: fromBalance } }),
        tx.account.update({ where: { id: toAccountId }, data: { balance: toBalance } }),
      ]);

      // Create transfer records sequentially so the unique reference
      // constraint on the first row is committed before the second insert.
      await tx.transaction.create({
        data: {
          accountId: fromAccountId,
          type: 'TRANSFER_OUT',
          amount,
          status: 'COMPLETED',
          description: description || 'Transfer',
          reference: ref,
          balanceAfter: fromBalance,
        },
      });
      await tx.transaction.create({
        data: {
          accountId: toAccountId,
          type: 'TRANSFER_IN',
          amount,
          status: 'COMPLETED',
          description: description || 'Transfer received',
          reference: ref,
          balanceAfter: toBalance,
        },
      });

      await auditService.log({
        userId,
        action: 'TRANSACTION_TRANSFER',
        targetType: 'ACCOUNT',
        targetId: fromAccountId,
        metadata: { fromAccountId, toAccountId, amount: amount.toString(), reference: ref },
      });

      return { reference: ref };
    });
  },
};

export default accountService;
