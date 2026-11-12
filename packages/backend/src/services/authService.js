import prisma from '../config/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
} from '../utils/jwt.js';
import { auditService } from './auditService.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Authentication service — register, login, refresh, logout.
 */

export const authService = {
  async register({ email, password, firstName, lastName }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'An account with that email already exists');
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ACCOUNT_HOLDER',
        status: 'PENDING',
        firstName: firstName || null,
        lastName: lastName || null,
      },
      select: { id: true, email: true, role: true, status: true, firstName: true, lastName: true },
    });

    // Create an onboarding request so the admin can review
    await prisma.onboardingRequest.create({
      data: { userId: user.id, status: 'SUBMITTED' },
    });

    await auditService.log({
      userId: user.id,
      action: 'USER_REGISTERED',
      targetType: 'USER',
      targetId: user.id,
      metadata: { email: user.email },
      ipAddress: null,
    });

    return user;
  },

  async login({ email, password, ipAddress }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await auditService.log({
        action: 'USER_LOGIN_FAILED',
        metadata: { email, reason: 'user_not_found' },
        ipAddress,
      });
      throw new ApiError(401, 'Invalid email or password');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await auditService.log({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        metadata: { reason: 'invalid_password' },
        ipAddress,
      });
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      await auditService.log({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        metadata: { reason: 'account_suspended' },
        ipAddress,
      });
      throw new ApiError(403, 'Account is suspended. Contact an administrator.');
    }

    const payload = buildTokenPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await auditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      accessToken,
      refreshToken,
    };
  },

  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status === 'SUSPENDED') {
      throw new ApiError(401, 'User no longer valid');
    }

    const payload = buildTokenPayload(user);
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  },

  async getMe(userId) {
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
      },
    });
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },
};

export default authService;
