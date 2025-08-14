/**
 * Rate Limiting Configuration for ChitJar Backend
 * 
 * This module provides rate limiting middleware for different types of endpoints
 * to prevent abuse and ensure API stability.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError, HTTP_STATUS, ERROR_CODES } from './api-conventions';
import { isProduction } from './config';

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Create a rate limiter with custom configuration
 * @param options - Configuration options for the rate limiter
 * @param options.windowMs - Window size in milliseconds
 * @param options.max - Maximum number of requests in the window
 * @param options.message - Custom error message
 * @param options.skipSuccessfulRequests - Whether to skip successful requests
 * @param options.skipFailedRequests - Whether to skip failed requests
 * @param options.standardHeaders - Whether to enable standard headers
 * @param options.legacyHeaders - Whether to enable legacy headers
 * @param options.keyGenerator - Function to generate keys for rate limiting (default: IP address)
 * @returns Express rate limiting middleware
 */
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  keyGenerator?: (req: Request) => string; // eslint-disable-line no-unused-vars
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later',
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
    keyGenerator: options.keyGenerator ?? ((req: Request) => {
      // Use IP address as the key, considering proxy headers
      const xff = req.headers['x-forwarded-for'];
      const xffStr = Array.isArray(xff) ? xff[0] : xff;
      const ip = xffStr || req.ip || req.connection.remoteAddress || 'unknown';
      return ip.toString();
    }),
    handler: (_req: Request, res: Response) => {
      sendError(
        res,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        options.message || 'Too many requests, please try again later',
        {
          retryAfter: Math.ceil(options.windowMs / 1000),
          limit: options.max,
          windowMs: options.windowMs
        }
      );
    }
  });
}

// ============================================================================
// Endpoint-Specific Rate Limiters
// ============================================================================

/**
 * Strict rate limiter for authentication endpoints (signup, login)
 * - 5 requests per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

/**
 * Moderate rate limiter for token refresh
 * - 10 requests per 15 minutes per IP
 */
export const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many token refresh attempts, please try again later'
});

/**
 * General API rate limiter for authenticated endpoints
 * - 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many API requests, please try again later'
});

/**
 * Rate limiter for data modification endpoints (lower limits)
 * Allows 20 requests per minute for data modification operations
 */
export const dataModificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: 'Too many data modification requests, please try again later',
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Rate limiter for read-only endpoints (higher limits)
 * Allows 100 requests per minute for read operations
 */
export const readOnlyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many read requests, please try again later',
  skipSuccessfulRequests: true
});

/**
 * File upload rate limiter
 * - 10 file uploads per hour per IP
 */
export const fileUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many file uploads, please try again later'
});

/**
 * Health check rate limiter (very relaxed)
 * - 1000 requests per hour per IP
 */
export const healthCheckRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'Too many health check requests'
});

// ============================================================================
// User-Based Rate Limiting (for authenticated users)
// ============================================================================

/**
 * Create a user-based rate limiter that uses user ID instead of IP
 */
export function createUserRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req: Request) => {
      // Use authenticated user ID as the key
      const authenticatedReq = req as any;
      return authenticatedReq.user?.id || 'anonymous';
    }
  });
}

/**
 * User-specific rate limiter for authenticated endpoints
 * - 500 requests per 15 minutes per user
 */
export const userApiRateLimiter = createUserRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Too many requests for this user account, please try again later'
});

// ============================================================================
// Conditional Rate Limiting Based on Environment
// ============================================================================

/**
 * Get appropriate rate limiter based on environment
 */
export function getRateLimiter(limiter: any) {
  // In development, use more relaxed limits
  if (!isProduction()) {
    return createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Very high limit for development
      message: 'Rate limit exceeded (development mode)'
    });
  }
  return limiter;
}

// ============================================================================
// Method-Specific Rate Limiters
// ============================================================================

/**
 * Rate limiter based on HTTP method
 * Applies different rate limits based on the HTTP method used
 * @param limits - Object mapping HTTP methods to rate limiters
 * @returns Express middleware that applies method-specific rate limiting
 */
export function methodRateLimiter(options: {
  get?: any;
  post?: any;
  put?: any;
  delete?: any;
  patch?: any;
}) {
  return (req: Request, res: Response, next: any) => {
    const method = req.method.toLowerCase();
    const limiter = options[method as keyof typeof options];
    
    if (limiter) {
      return limiter(req, res, next);
    }
    
    next();
  };
}