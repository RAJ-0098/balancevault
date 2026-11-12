import { Router } from 'express';
import { z } from 'zod';
import { accountService } from '../services/accountService.js';
import { authenticate } from '../middleware/auth.js';

export const accountsRouter = Router();

accountsRouter.use(authenticate);

const moneySchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n > 0;
    }, 'Amount must be a positive number')
    .transform((v) => {
      const n = Number(v);
      // Round to 4 decimal places to match DB precision
      return parseFloat(n.toFixed(4));
    }),
  description: z.string().max(500).optional(),
});

const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: moneySchema.shape.amount,
  description: z.string().max(500).optional(),
});

accountsRouter.get('/', async (req, res, next) => {
  try {
    const accounts = await accountService.listForUser(req.user.sub);
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
});

// IMPORTANT: /transfer must be declared before /:id routes so Express
// doesn't swallow "transfer" as an account ID parameter.
accountsRouter.post('/transfer', async (req, res, next) => {
  try {
    const result = transferSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }
    const transferResult = await accountService.transfer({
      ...result.data,
      userId: req.user.sub,
    });
    res.json(transferResult);
  } catch (err) {
    next(err);
  }
});

accountsRouter.get('/:id', async (req, res, next) => {
  try {
    // Admins can view any account; holders only their own
    const isAdmin = req.user.role === 'ADMIN';
    const account = isAdmin
      ? await accountService.getByIdAdmin(req.params.id)
      : await accountService.getById(req.params.id, req.user.sub);
    res.json({ account });
  } catch (err) {
    next(err);
  }
});

accountsRouter.post('/:id/deposit', async (req, res, next) => {
  try {
    const result = moneySchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }
    const account = await accountService.deposit({
      accountId: req.params.id,
      userId: req.user.sub,
      amount: result.data.amount,
      description: result.data.description,
    });
    res.json({ account });
  } catch (err) {
    next(err);
  }
});

accountsRouter.post('/:id/withdraw', async (req, res, next) => {
  try {
    const result = moneySchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }
    const account = await accountService.withdraw({
      accountId: req.params.id,
      userId: req.user.sub,
      amount: result.data.amount,
      description: result.data.description,
    });
    res.json({ account });
  } catch (err) {
    next(err);
  }
});


export default accountsRouter;
