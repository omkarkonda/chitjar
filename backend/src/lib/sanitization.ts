import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ERROR_CODES } from './api-conventions';
import { HTTP_STATUS } from './api-conventions';

// Custom sanitizer to prevent XSS
// Removes script tags, HTML tags, and dangerous attributes from strings
const sanitizeHtml = (value: string): string => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Validation error handler
// Checks for validation errors and sends appropriate error response
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  return next();
};

// Common sanitizers
// Sanitize string field in request body
export const sanitizeString = (field: string) => 
  body(field)
    .optional()
    .trim()
    .escape()
    .customSanitizer(sanitizeHtml);

// Sanitize string field in query parameters
export const sanitizeQueryString = (field: string) =>
  query(field)
    .optional()
    .trim()
    .escape()
    .customSanitizer(sanitizeHtml);

// Sanitize string field in route parameters
export const sanitizeParamString = (field: string) =>
  param(field)
    .trim()
    .escape()
    .customSanitizer(sanitizeHtml);

// Numeric validators
export const validatePositiveInteger = (field: string) =>
  body(field)
    .optional()
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`);

export const validatePositiveNumber = (field: string) =>
  body(field)
    .optional()
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`);

export const validateQueryPositiveInteger = (field: string) =>
  query(field)
    .optional()
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`);

// Date validators
export const validateDate = (field: string) =>
  body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} must be a valid ISO date`);

export const validateQueryDate = (field: string) =>
  query(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} must be a valid ISO date`);

// Email validation
export const validateEmail = (field: string) =>
  body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address');

// Password validation
export const validatePassword = (field: string) =>
  body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');

// UUID validation
export const validateUUID = (field: string) =>
  param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`);

// Array validation
export const validateArray = (field: string) =>
  body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array`);

// Boolean validation
export const validateBoolean = (field: string) =>
  body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean value`);

// URL validation
export const validateURL = (field: string) =>
  body(field)
    .optional()
    .isURL()
    .withMessage(`${field} must be a valid URL`);

// Combined validation chains for common use cases

// User registration validation
export const validateUserRegistration = [
  sanitizeString('name'),
  validateEmail('email'),
  validatePassword('password'),
  handleValidationErrors
];

// User login validation
export const validateUserLogin = [
  validateEmail('email'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Fund creation/update validation
export const validateFund = [
  sanitizeString('name'),
  sanitizeString('description'),
  validatePositiveNumber('totalAmount'),
  validatePositiveInteger('durationMonths'),
  validatePositiveInteger('totalMembers'),
  validateDate('startDate'),
  handleValidationErrors
];

// Monthly entry validation
export const validateMonthlyEntry = [
  validateUUID('fundId'),
  validatePositiveNumber('amount'),
  validateDate('month'),
  sanitizeString('notes'),
  handleValidationErrors
];

// Bid validation
export const validateBid = [
  validateUUID('fundId'),
  validatePositiveNumber('amount'),
  sanitizeString('notes'),
  handleValidationErrors
];

// Query parameter validation for pagination
export const validatePagination = [
  validateQueryPositiveInteger('page'),
  validateQueryPositiveInteger('limit'),
  sanitizeQueryString('sort'),
  sanitizeQueryString('order'),
  handleValidationErrors
];

// Query parameter validation for filtering
export const validateFilterParams = [
  sanitizeQueryString('search'),
  validateQueryDate('startDate'),
  validateQueryDate('endDate'),
  validateQueryPositiveInteger('minAmount'),
  validateQueryPositiveInteger('maxAmount'),
  handleValidationErrors
];

// Generic ID parameter validation
export const validateIdParam = [
  validateUUID('id'),
  handleValidationErrors
];