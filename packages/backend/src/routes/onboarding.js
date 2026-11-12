import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

export const onboardingRouter = Router();

onboardingRouter.use(authenticate);

const submitSchema = z.object({
  notes: z.string().max(2000).optional(),
});

onboardingRouter.post('/submit', async (req, res, next) => {
  try {
    const result = submitSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }

    // Check if user already has an onboarding request
    const existing = await prisma.onboardingRequest.findFirst({
      where: { userId: req.user.sub },
    });

    if (existing && (existing.status === 'APPROVED' || existing.status === 'UNDER_REVIEW')) {
      throw new ApiError(409, 'Onboarding already submitted or approved');
    }

    let request;
    if (existing && existing.status === 'SUBMITTED') {
      // Allow resubmission — update notes
      request = await prisma.onboardingRequest.update({
        where: { id: existing.id },
        data: { notes: result.data.notes || null, submittedAt: new Date() },
      });
    } else if (existing && existing.status === 'REJECTED') {
      // Allow re-application after rejection
      request = await prisma.onboardingRequest.update({
        where: { id: existing.id },
        data: { status: 'SUBMITTED', notes: result.data.notes || null, submittedAt: new Date(), reviewedAt: null, processedById: null },
      });
    } else if (!existing) {
      request = await prisma.onboardingRequest.create({
        data: { userId: req.user.sub, status: 'SUBMITTED', notes: result.data.notes || null },
      });
    }

    res.status(201).json({ onboardingRequest: request, message: 'Onboarding submitted for review.' });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.get('/status', async (req, res, next) => {
  try {
    const request = await prisma.onboardingRequest.findFirst({
      where: { userId: req.user.sub },
      orderBy: { submittedAt: 'desc' },
    });

    if (!request) {
      return res.json({ status: 'NONE', message: 'No onboarding request submitted yet.' });
    }

    res.json({
      id: request.id,
      status: request.status,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      notes: request.notes,
    });
  } catch (err) {
    next(err);
  }
});

export default onboardingRouter;
