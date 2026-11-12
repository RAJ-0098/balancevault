import { auditService } from '../services/auditService.js';

/**
 * Audit logging middleware factory.
 * Logs an audit entry after the handler succeeds.
 * Usage: router.post('/users/:id/suspend', authenticate, requireAdmin, audit('USER_SUSPENDED'), handler)
 */

export function audit(action) {
  return async (req, res, next) => {
    // Hook into response finish to log only on success
    const originalSend = res.send.bind(res);
    res.send = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire-and-forget — don't block the response
        auditService
          .log({
            userId: req.user?.sub ?? null,
            action,
            targetType: req.params.id ? getResourceType(req.path) : null,
            targetId: req.params.id ?? null,
            metadata: { method: req.method, path: req.path, body: sanitizeBody(req.body) },
            ipAddress: req.ip,
          })
          .catch((err) => console.error('[audit] failed to log:', err.message));
      }
      return originalSend(body);
    };
    next();
  };
}

function getResourceType(path) {
  if (path.includes('/users/')) return 'USER';
  if (path.includes('/onboarding/')) return 'ONBOARDING_REQUEST';
  if (path.includes('/accounts/')) return 'ACCOUNT';
  return null;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const { password, passwordHash, ...safe } = body;
  return safe;
}
