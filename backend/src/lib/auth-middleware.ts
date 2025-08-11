/**
 * JWT Authentication Middleware for ChitJar Backend
 * 
 * This module provides:
 * - JWT token verification middleware
 * - User authentication and authorization
 * - Token extraction from headers
 * - User context injection into requests
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { 
  ApiError, 
  HTTP_STATUS, 
  ERROR_CODES, 
  AUTH_HEADERS 
} from './api-conventions';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * User context attached to request
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Extended Request interface with user context
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// ============================================================================
// Token Utilities
// ============================================================================

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith(AUTH_HEADERS.BEARER_PREFIX)) {
    return null;
  }

  return authHeader.substring(AUTH_HEADERS.BEARER_PREFIX.length);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload = {
    userId,
    email,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: 'chitjar-api',
    audience: 'chitjar-app',
  } as jwt.SignOptions);
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    config.jwtRefreshSecret,
    {
      expiresIn: config.jwtRefreshExpiresIn,
      issuer: 'chitjar-api',
      audience: 'chitjar-app',
    } as jwt.SignOptions
  );
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'chitjar-api',
      audience: 'chitjar-app',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_EXPIRED,
        'Access token has expired'
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
        'Invalid access token'
      );
    }

    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.TOKEN_INVALID,
      'Token verification failed'
    );
  }
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token: string): { userId: string; type: string } {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret, {
      issuer: 'chitjar-api',
      audience: 'chitjar-app',
    }) as { userId: string; type: string };

    if (decoded.type !== 'refresh') {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
        'Invalid token type'
      );
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token has expired'
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
        'Invalid refresh token'
      );
    }

    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.TOKEN_INVALID,
      'Refresh token verification failed'
    );
  }
}

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Middleware to authenticate JWT tokens
 * Extracts token from Authorization header and verifies it
 * Attaches user context to request object
 */
export function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers[AUTH_HEADERS.AUTHORIZATION.toLowerCase()] as string;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        'Access token is required'
      );
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user context to request
    (req as AuthenticatedRequest).user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Similar to authenticateToken but doesn't throw error if no token provided
 * Useful for endpoints that work with or without authentication
 */
export function optionalAuthentication(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers[AUTH_HEADERS.AUTHORIZATION.toLowerCase()] as string;
    const token = extractBearerToken(authHeader);

    if (token) {
      const payload = verifyAccessToken(token);
      (req as AuthenticatedRequest).user = {
        id: payload.userId,
        email: payload.email,
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors for invalid tokens
    // Just proceed without user context
    next();
  }
}

// ============================================================================
// Authorization Middleware
// ============================================================================

/**
 * Middleware to ensure user owns the resource
 * Checks if the authenticated user ID matches the resource owner
 */
export function requireResourceOwnership(userIdField: string = 'userId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      
      if (!authenticatedReq.user) {
        throw new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
          'Authentication required'
        );
      }

      // Check if user ID is in params, body, or query
      const resourceUserId = 
        req.params[userIdField] || 
        req.body[userIdField] || 
        req.query[userIdField];

      if (resourceUserId && resourceUserId !== authenticatedReq.user.id) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN,
          'Access denied: insufficient permissions'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to validate user exists and is active
 * This would typically query the database to ensure user is still valid
 */
export function validateUserStatus(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // TODO: Implement database check for user status
  // For now, we assume if token is valid, user is active
  // This will be implemented when we add the database layer
  
  const authenticatedReq = req as AuthenticatedRequest;
  
  if (!authenticatedReq.user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
      'Authentication required'
    );
  }

  next();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get authenticated user from request
 * Throws error if user is not authenticated
 */
export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  const authenticatedReq = req as AuthenticatedRequest;
  
  if (!authenticatedReq.user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
      'Authentication required'
    );
  }

  return authenticatedReq.user;
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(req: Request): boolean {
  const authenticatedReq = req as AuthenticatedRequest;
  return !!authenticatedReq.user;
}

/**
 * Create token response object
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export function createTokenResponse(
  userId: string,
  email: string
): TokenResponse {
  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken(userId);

  // Parse expiration time (handle different formats like '1h', '7d', '3600')
  const parseExpirationTime = (expiresIn: string): number => {
    const match = expiresIn.match(/^(\d+)([hdm]?)$/);
    if (!match || !match[1]) return 3600; // Default to 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2] || 's';
    
    switch (unit) {
      case 'h': return value * 3600;
      case 'd': return value * 24 * 3600;
      case 'm': return value * 60;
      default: return value;
    }
  };

  return {
    accessToken,
    refreshToken,
    expiresIn: parseExpirationTime(config.jwtExpiresIn),
    tokenType: 'Bearer',
  };
}