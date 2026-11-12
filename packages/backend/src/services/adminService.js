import prisma from '../config/prisma.js';
import { accountService } from './accountService.js';
import { auditService } from './auditService.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Admin service — user management, onboarding review, audit log access.
 */

export const adminService = {
  async listUsers({ page = 1, pageSize = 50, role, status, search } = {}) {
    const where = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { accounts: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async getUserDetail(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          orderBy: { createdAt: 'desc' },
        },
        onboardingRequests: {
          orderBy: { submittedAt: 'desc' },
        },
      },
    });
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  async suspendUser(userId, adminId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'ADMIN') throw new ApiError(400, 'Cannot suspend an admin user');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });

    await auditService.log({
      userId: adminId,
      action: 'USER_SUSPENDED',
      targetType: 'USER',
      targetId: userId,
      metadata: { email: user.email },
    });

    return updated;
  },

  async reactivateUser(userId, adminId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    await auditService.log({
      userId: adminId,
      action: 'USER_REACTIVATED',
      targetType: 'USER',
      targetId: userId,
      metadata: { email: user.email },
    });

    return updated;
  },

  async listOnboarding({ page = 1, pageSize = 50, status } = {}) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.onboardingRequest.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, status: true },
          },
        },
      }),
      prisma.onboardingRequest.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async approveOnboarding(requestId, adminId, notes) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.onboardingRequest.findUnique({
        where: { id: requestId },
        include: { user: true },
      });
      if (!request) throw new ApiError(404, 'Onboarding request not found');
      if (request.status === 'APPROVED') throw new ApiError(409, 'Already approved');
      if (request.status === 'REJECTED') throw new ApiError(409, 'Already rejected');

      // Activate the user
      await tx.user.update({
        where: { id: request.userId },
        data: { status: 'ACTIVE' },
      });

      // Mark the request approved
      const updated = await tx.onboardingRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          processedById: adminId,
          reviewedAt: new Date(),
          notes: notes || null,
        },
      });

      // Create the user's first checking account
      const account = await tx.account.create({
        data: {
          userId: request.userId,
          type: 'CHECKING',
          status: 'ACTIVE',
          balance: 0,
          currency: 'USD',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'ONBOARDING_APPROVED',
          targetType: 'ONBOARDING_REQUEST',
          targetId: requestId,
          metadata: { approvedUserId: request.userId, accountId: account.id, notes: notes || null },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'ACCOUNT_CREATED',
          targetType: 'ACCOUNT',
          targetId: account.id,
          metadata: { userId: request.userId, type: 'CHECKING' },
        },
      });

      return { request: updated, account };
    });
  },

  async rejectOnboarding(requestId, adminId, notes) {
    const request = await prisma.onboardingRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new ApiError(404, 'Onboarding request not found');
    if (request.status === 'APPROVED' || request.status === 'REJECTED') {
      throw new ApiError(409, 'Already processed');
    }

    const updated = await prisma.onboardingRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        processedById: adminId,
        reviewedAt: new Date(),
        notes: notes || null,
      },
    });

    await auditService.log({
      userId: adminId,
      action: 'ONBOARDING_REJECTED',
      targetType: 'ONBOARDING_REQUEST',
      targetId: requestId,
      metadata: { rejectedUserId: request.userId, notes: notes || null },
    });

    return updated;
  },

  async getStats() {
    const [
      totalUsers,
      totalAccounts,
      totalTransactions,
      pendingOnboarding,
      admins,
      suspended,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.transaction.count(),
      prisma.onboardingRequest.count({ where: { status: 'SUBMITTED' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
    ]);

    // Sum of all balances (total managed value)
    const balanceResult = await prisma.account.aggregate({ _sum: { balance: true } });
    const totalBalance = balanceResult._sum.balance || 0;

    return {
      totalUsers,
      totalAccounts,
      totalTransactions,
      pendingOnboarding,
      admins,
      suspended,
      totalBalance: totalBalance.toString(),
    };
  },
};

export default adminService;
