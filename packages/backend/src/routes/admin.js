import { Router } from 'express';
import { z } from 'zod';
import { adminService } from '../services/adminService.js';
import { auditService } from '../services/auditService.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

// ─── Users ────────────────────────────────────────

adminRouter.get('/users', async (req, res, next) => {
  try {
    const { page, pageSize, role, status, search } = req.query;
    const result = await adminService.listUsers({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50,
      role: role || undefined,
      status: status || undefined,
      search: search || undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const user = await adminService.getUserDetail(req.params.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/suspend', async (req, res, next) => {
  try {
    const user = await adminService.suspendUser(req.params.id, req.user.sub);
    res.json({ user, message: 'User suspended' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/reactivate', async (req, res, next) => {
  try {
    const user = await adminService.reactivateUser(req.params.id, req.user.sub);
    res.json({ user, message: 'User reactivated' });
  } catch (err) {
    next(err);
  }
});

// ─── Onboarding ────────────────────────────────────

adminRouter.get('/onboarding', async (req, res, next) => {
  try {
    const { page, pageSize, status } = req.query;
    const result = await adminService.listOnboarding({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50,
      status: status || undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const reviewSchema = z.object({
  notes: z.string().max(2000).optional(),
});

adminRouter.post('/onboarding/:id/approve', async (req, res, next) => {
  try {
    const result = reviewSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }
    const { request, account } = await adminService.approveOnboarding(
      req.params.id,
      req.user.sub,
      result.data.notes,
    );
    res.json({ request, account, message: 'Onboarding approved. Checking account created.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/onboarding/:id/reject', async (req, res, next) => {
  try {
    const result = reviewSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }
    const request = await adminService.rejectOnboarding(
      req.params.id,
      req.user.sub,
      result.data.notes,
    );
    res.json({ request, message: 'Onboarding rejected.' });
  } catch (err) {
    next(err);
  }
});

// ─── Audit logs ────────────────────────────────────

adminRouter.get('/audit-logs', async (req, res, next) => {
  try {
    const { page, pageSize, action, userId } = req.query;
    const result = await auditService.list({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50,
      action: action || undefined,
      userId: userId || undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Stats ────────────────────────────────────────

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const stats = await adminService.getStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

export default adminRouter;
