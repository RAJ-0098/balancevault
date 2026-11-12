import env from '../config/env.js';

/**
 * Centralised error handler — last middleware in the chain.
 * Converts known errors to clean JSON responses.
 */

export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
}

export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Prisma known errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with that value already exists';
    details = { target: err.meta?.target };
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues || err.errors;
  }

  // Log unexpected errors
  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    error: message,
    ...(details ? { details } : {}),
    ...(env.nodeEnv === 'development' && statusCode >= 500
      ? { stack: err.stack }
      : {}),
  });
}
