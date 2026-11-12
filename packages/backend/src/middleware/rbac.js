import { ApiError } from './errorHandler.js';

/**
 * Role-based access control.
 * Usage: router.get('/admin/users', authenticate, requireRole('ADMIN'), handler)
 */

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions for this action'));
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireAccountHolder = requireRole('ACCOUNT_HOLDER');
