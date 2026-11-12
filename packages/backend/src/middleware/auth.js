import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from './errorHandler.js';

/**
 * JWT authentication middleware.
 * Reads the bearer token from the Authorization header.
 * Attaches the decoded payload to req.user.
 */

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  const token = header.slice(7);
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { sub, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired'));
    }
    return next(new ApiError(401, 'Invalid access token'));
  }
}

export default authenticate;
