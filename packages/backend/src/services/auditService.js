import prisma from '../config/prisma.js';

/**
 * Audit log service.
 * Every significant action is recorded so you can prove what happened.
 */

export const auditService = {
  async log({ userId, action, targetType, targetId, metadata, ipAddress }) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          targetType: targetType || null,
          targetId: targetId || null,
          metadata: metadata || undefined,
          ipAddress: ipAddress || null,
        },
      });
    } catch (err) {
      // Never let audit logging break the request flow
      console.error('[audit] log failed:', err.message);
      return null;
    }
  },

  async list({ page = 1, pageSize = 50, action, userId } = {}) {
    const where = {
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
};

export default auditService;
