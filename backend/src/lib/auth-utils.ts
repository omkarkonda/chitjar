import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { 
  sendError, 
  HTTP_STATUS, 
  ERROR_CODES
} from '../lib/api-conventions';
import { AUTH_HEADERS } from '../lib/api-conventions';

// ============================================================================  
// Authentication Middleware
// ============================================================================

/**
 * Authenticate JWT token from Authorization header
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers[AUTH_HEADERS.AUTHORIZATION.toLowerCase()];
    const token = authHeader && typeof authHeader === 'string' && authHeader.startsWith(AUTH_HEADERS.BEARER_PREFIX)
      ? authHeader.substring(AUTH_HEADERS.BEARER_PREFIX.length)
      : null;

    if (!token) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        'Access token required'
      );
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    
    // Attach user to request object
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_EXPIRED,
        'Token expired'
      );
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
        'Invalid token'
      );
    } else {
      console.error('Authentication error:', error);
      sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        'Authentication failed'
      );
    }
  }
}

/**
 * Authenticate optional JWT token - doesn't fail if token is missing
 */
export function authenticateOptionalToken(_req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = _req.headers[AUTH_HEADERS.AUTHORIZATION.toLowerCase()];
    const token = authHeader && typeof authHeader === 'string' && authHeader.startsWith(AUTH_HEADERS.BEARER_PREFIX)
      ? authHeader.substring(AUTH_HEADERS.BEARER_PREFIX.length)
      : null;

    if (token) {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      
      // Attach user to request object
      (_req as any).user = decoded;
    }
    
    next();
  } catch (error) {
    // For optional authentication, we ignore token errors
    // and continue without attaching user
    next();
  }
}