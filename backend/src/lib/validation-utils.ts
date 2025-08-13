/**
 * Validation Utilities for ChitJar Backend
 * 
 * This module provides utilities for handling Zod validation errors,
 * request validation middleware, and error formatting for API responses.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { 
  ApiError, 
  HTTP_STATUS, 
  ERROR_CODES, 
  sendError 
} from './api-conventions';
import { authenticateToken, authenticateOptionalToken } from './auth-utils';

// ============================================================================
// Validation Error Handling
// ============================================================================

/**
 * Format Zod validation errors for API responses
 */
export function formatZodError(error: ZodError): {
  message: string;
  details: Record<string, any>;
} {
  const fieldErrors: Record<string, string[]> = {};
  const issues: Array<{
    field: string;
    message: string;
    code: string;
  }> = [];

  error.issues.forEach((issue) => {
    const field = issue.path.join('.');
    const message = issue.message;
    
    // Group errors by field
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(message);
    
    // Add to issues array
    issues.push({
      field,
      message,
      code: issue.code,
    });
  });

  return {
    message: 'Validation failed',
    details: {
      fieldErrors,
      issues,
      errorCount: error.issues.length,
    },
  };
}

/**
 * Convert Zod validation error to API error
 */
export function zodErrorToApiError(error: ZodError): ApiError {
  const formatted = formatZodError(error);
  return new ApiError(
    HTTP_STATUS.BAD_REQUEST,
    ERROR_CODES.VALIDATION_ERROR,
    formatted.message,
    formatted.details
  );
}

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = zodErrorToApiError(error);
        sendError(
          res,
          apiError.statusCode,
          apiError.code,
          apiError.message,
          apiError.details
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = zodErrorToApiError(error);
        sendError(
          res,
          apiError.statusCode,
          apiError.code,
          apiError.message,
          apiError.details
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = zodErrorToApiError(error);
        sendError(
          res,
          apiError.statusCode,
          apiError.code,
          apiError.message,
          apiError.details
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Combined validation middleware for body, query, and params
 */
export function validate<TBody = any, TQuery = any, TParams = any>(options: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate params first
      if (options.params) {
        req.params = options.params.parse(req.params) as any;
      }
      
      // Validate query
      if (options.query) {
        req.query = options.query.parse(req.query) as any;
      }
      
      // Validate body
      if (options.body) {
        req.body = options.body.parse(req.body);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = zodErrorToApiError(error);
        sendError(
          res,
          apiError.statusCode,
          apiError.code,
          apiError.message,
          apiError.details
        );
      } else {
        next(error);
      }
    }
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Safe validation that returns result or error
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ZodError } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Validate data and throw API error on failure
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw zodErrorToApiError(error);
    }
    throw error;
  }
}

/**
 * Partial validation - only validate provided fields
 * Note: This works with ZodObject schemas only
 */
export function validatePartial(
  schema: z.ZodObject<any>,
  data: unknown
): any {
  const partialSchema = schema.partial();
  return validateOrThrow(partialSchema, data);
}

// ============================================================================
// Common Parameter Schemas
// ============================================================================

/**
 * UUID parameter schema
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

/**
 * Fund ID parameter schema
 */
export const fundIdParamSchema = z.object({
  fundId: z.string().uuid('Invalid fund ID format'),
});

/**
 * User ID parameter schema
 */
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

/**
 * Month key parameter schema
 */
export const monthKeyParamSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month key format'),
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a value is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if a value is a valid month key (YYYY-MM)
 */
export function isValidMonthKey(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  
  const parts = value.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  
  return !isNaN(year) && !isNaN(month) && 
         year >= 1900 && year <= 2100 && 
         month >= 1 && month <= 12;
}

/**
 * Check if a value is a valid email
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) && value.length <= 255;
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Validate and sanitize monetary amount
 */
export function validateMonetaryAmount(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
      'Invalid monetary amount'
    );
  }
  
  if (value < 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
      'Monetary amount cannot be negative'
    );
  }
  
  if (value > 99999999.99) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
      'Monetary amount too large'
    );
  }
  
  // Round to 2 decimal places
  return Math.round(value * 100) / 100;
}

// ============================================================================
// Business Logic Validation
// ============================================================================

/**
 * Validate fund date range
 */
export function validateFundDateRange(
  startMonth: string,
  endMonth: string,
  totalMonths: number
): void {
  if (startMonth >= endMonth) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_DATE_RANGE,
      'End month must be after start month'
    );
  }
  
  const startDate = new Date(startMonth + '-01');
  const endDate = new Date(endMonth + '-01');
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth()) + 1;
  
  if (monthsDiff !== totalMonths) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
      'Total months must match the difference between start and end months'
    );
  }
}

/**
 * Validate early exit month
 */
export function validateEarlyExitMonth(
  earlyExitMonth: string,
  startMonth: string,
  endMonth: string
): void {
  if (earlyExitMonth < startMonth || earlyExitMonth > endMonth) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_DATE_RANGE,
      'Early exit month must be between start and end months'
    );
  }
}

/**
 * Validate month key is within fund range
 */
export function validateMonthInFundRange(
  monthKey: string,
  fundStartMonth: string,
  fundEndMonth: string,
  fundEarlyExitMonth?: string | null
): void {
  const effectiveEndMonth = fundEarlyExitMonth || fundEndMonth;
  
  if (monthKey < fundStartMonth || monthKey > effectiveEndMonth) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_DATE_RANGE,
      `Month key must be between ${fundStartMonth} and ${effectiveEndMonth}`
    );
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for checking if error is a ZodError
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Authentication middleware
 */
export { authenticateToken, authenticateOptionalToken };