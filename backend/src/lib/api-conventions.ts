/**
 * API Conventions for ChitJar Backend
 * 
 * This module defines standardized conventions for:
 * - REST API paths and structure
 * - Error response formats
 * - Success response formats
 * - HTTP status codes
 * - JWT authentication headers
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// ============================================================================
// REST API Path Conventions
// ============================================================================

/**
 * API Base Paths
 * All API endpoints are prefixed with /api/v1
 */
export const API_BASE = '/api/v1';

/**
 * Resource Endpoints
 * Following RESTful conventions with consistent naming
 */
export const API_PATHS = {
  // Authentication endpoints
  AUTH: {
    BASE: `${API_BASE}/auth`,
    SIGNUP: `${API_BASE}/auth/signup`,
    LOGIN: `${API_BASE}/auth/login`,
    LOGOUT: `${API_BASE}/auth/logout`,
    REFRESH: `${API_BASE}/auth/refresh`,
    PROFILE: `${API_BASE}/auth/profile`,
  },
  
  // Funds CRUD endpoints
  FUNDS: {
    BASE: `${API_BASE}/funds`,
    BY_ID: `${API_BASE}/funds/:id`,
    ANALYTICS: `${API_BASE}/funds/:id/analytics`,
  },
  
  // Monthly entries endpoints
  ENTRIES: {
    BASE: `${API_BASE}/entries`,
    BY_ID: `${API_BASE}/entries/:id`,
    BY_FUND: `${API_BASE}/funds/:fundId/entries`,
  },
  
  // Bids endpoints
  BIDS: {
    BASE: `${API_BASE}/bids`,
    BY_ID: `${API_BASE}/bids/:id`,
    BY_FUND: `${API_BASE}/funds/:fundId/bids`,
    IMPORT_CSV: `${API_BASE}/bids/import/csv`,
  },
  
  // Analytics endpoints
  ANALYTICS: {
    BASE: `${API_BASE}/analytics`,
    DASHBOARD: `${API_BASE}/analytics/dashboard`,
    FUND_DETAIL: `${API_BASE}/analytics/funds/:id`,
    INSIGHTS: `${API_BASE}/analytics/insights`,
  },
  
  // Import/Export endpoints
  IMPORT_EXPORT: {
    EXPORT_FUNDS: `${API_BASE}/export/funds`,
    EXPORT_ENTRIES: `${API_BASE}/export/entries`,
    EXPORT_BACKUP: `${API_BASE}/export/backup`,
    IMPORT_BACKUP: `${API_BASE}/import/backup`,
  },
  
  // System endpoints
  SYSTEM: {
    HEALTH: '/api/health',
    VERSION: '/api/version',
  },
} as const;

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard API Response Structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta?: ResponseMeta;
  timestamp: string;
}

/**
 * Error Response Structure
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string; // For validation errors
  stack?: string; // Only in development
}

/**
 * Response Metadata
 */
export interface ResponseMeta {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  requestId?: string;
  version?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource Errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Business Logic Errors
  FUND_INACTIVE: 'FUND_INACTIVE',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  
  // System Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ============================================================================
// JWT Authentication Headers
// ============================================================================

export const AUTH_HEADERS = {
  AUTHORIZATION: 'Authorization',
  BEARER_PREFIX: 'Bearer ',
  REFRESH_TOKEN: 'X-Refresh-Token',
} as const;

// ============================================================================
// Response Utilities
// ============================================================================

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: ResponseMeta
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  field?: string
): ApiResponse {
  const error: ApiErrorResponse = {
    code,
    message,
  };

  if (details) {
    error.details = details;
  }
  
  if (field) {
    error.field = field;
  }

  // Add stack trace in development
  if (process.env['NODE_ENV'] === 'development') {
    const stack = new Error().stack;
    if (stack) {
      error.stack = stack;
    }
  }

  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send a successful response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  meta?: ResponseMeta
): void {
  res.status(statusCode).json(createSuccessResponse(data, meta));
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>,
  field?: string
): void {
  const errorResponse = createErrorResponse(code, message, details, field);
  res.status(statusCode).json(errorResponse);
}

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any>;
  public field?: string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, any>,
    field?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    if (details) {
      this.details = details;
    }
    if (field) {
      this.field = field;
    }
    this.name = 'ApiError';
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    sendError(res, err.statusCode, err.code, err.message, err.details, err.field);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    err.issues.forEach((issue) => {
      const field = issue.path.join('.');
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    });

    sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      {
        fieldErrors,
        issues: err.issues,
        errorCount: err.issues.length
      }
    );
    return;
  }

  // Handle other validation errors
  if (err.name === 'ValidationError') {
    sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      { originalError: err.message }
    );
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.TOKEN_INVALID,
      'Invalid token'
    );
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.TOKEN_EXPIRED,
      'Token expired'
    );
    return;
  }

  // Handle database errors
  if (err.message.includes('database') || err.message.includes('connection')) {
    sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
      'Database error occurred'
    );
    return;
  }

  // Default to internal server error
  sendError(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_ERROR,
    'An unexpected error occurred'
  );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.RESOURCE_NOT_FOUND,
    `Route ${req.method} ${req.path} not found`
  );
}

// ============================================================================
// Request Validation Utilities
// ============================================================================

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => 
    body[field] === undefined || body[field] === null || body[field] === ''
  );

  if (missingFields.length > 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string, fieldName: string = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
      `Invalid ${fieldName} format`,
      { field: fieldName, value: id }
    );
  }
}