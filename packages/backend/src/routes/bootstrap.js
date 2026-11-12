import { Router } from 'express';
import { z } from 'zod';
import { bootstrapService } from '../services/bootstrapService.js';
import { bootstrapLimiter } from '../middleware/rateLimit.js';

export const bootstrapRouter = Router();

bootstrapRouter.use(bootstrapLimiter);

const bootstrapSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

/**
 * POST /api/bootstrap
 * Creates the first admin user. Locked after the first admin exists.
 * This endpoint should be disabled in production once bootstrap is complete.
 */
bootstrapRouter.post('/', async (req, res, next) => {
  try {
    const result = bootstrapSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }

    const admin = await bootstrapService.viaHttp(result.data);
    res.status(201).json({
      admin,
      message: 'First admin created successfully. Use these credentials to log in.',
    });
  } catch (err) {
    next(err);
  }
});

export default bootstrapRouter;
