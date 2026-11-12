import prisma from '../config/prisma.js';
import { hashPassword } from '../utils/password.js';
import { auditService } from './auditService.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * First-admin bootstrap.
 *
 * Two paths:
 * 1. HTTP endpoint (default) — works when the DATABASE_URL role can INSERT into users.
 * 2. DB-level bootstrap (Neon role model) — connects as bootstrap_login, SET ROLEs
 *    to bootstrap_operator, and calls the bootstrap_first_admin() SQL function.
 *    This path requires BOOTSTRAP_DATABASE_URL and the role SQL in prisma/sql/.
 */

export const bootstrapService = {
  /**
   * HTTP bootstrap — the simple path. Only works if no admin exists yet.
   */
  async viaHttp({ email, password, firstName, lastName }) {
    const existing = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existing) {
      throw new ApiError(409, 'An admin already exists. Bootstrap is locked.');
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ApiError(409, 'A user with that email already exists');
    }

    const passwordHash = await hashPassword(password);
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        firstName: firstName || null,
        lastName: lastName || null,
      },
      select: { id: true, email: true, role: true, status: true, firstName: true, lastName: true },
    });

    await auditService.log({
      userId: admin.id,
      action: 'ADMIN_BOOTSTRAP',
      targetType: 'USER',
      targetId: admin.id,
      metadata: { method: 'http', email: admin.email },
    });

    return admin;
  },
};

export default bootstrapService;
