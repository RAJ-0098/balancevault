import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

export const authRouter = Router();

authRouter.use(authLimiter);

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      return next(err);
    }
    req.body = result.data;
    next();
  };
}

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user, message: 'Registration successful. Submit onboarding for review.' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login({ ...req.body, ipAddress: req.ip });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', authenticate, (_req, res) => {
  // JWT is stateless — logout is a client-side action.
  // The client should discard both tokens.
  res.json({ message: 'Logged out successfully' });
});

export default authRouter;
