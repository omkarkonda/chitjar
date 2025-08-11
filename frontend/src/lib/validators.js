/**
 * Client-side Validation Helpers for ChitJar Frontend
 * 
 * This module provides validation functions that mirror the server-side Zod schemas
 * ensuring consistent validation between frontend and backend.
 */

// ============================================================================
// Common Validation Utilities
// ============================================================================

/**
 * Check if a value is a valid UUID
 */
export function isValidUUID(value) {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if a value is a valid email
 */
export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) && value.length <= 255;
}

/**
 * Check if a value is a valid month key (YYYY-MM)
 */
export function isValidMonthKey(value) {
  if (typeof value !== 'string') return false;
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
 * Check if a value is a valid password
 */
export function isValidPassword(value) {
  if (typeof value !== 'string') return false;
  return value.length >= 8 && 
         value.length <= 128 &&
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value);
}

/**
 * Check if a value is a valid monetary amount
 */
export function isValidMonetaryAmount(value) {
  const num = parseFloat(value);
  return !isNaN(num) && 
         num >= 0 && 
         num <= 99999999.99 && 
         (num * 100) % 1 === 0; // Check for at most 2 decimal places
}

/**
 * Check if a value is a positive integer
 */
export function isPositiveInteger(value) {
  const num = parseInt(value);
  return !isNaN(num) && num > 0 && num === parseFloat(value);
}

// ============================================================================
// Validation Error Handling
// ============================================================================

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, field = null, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
  }
}

/**
 * Validation result class
 */
export class ValidationResult {
  constructor() {
    this.errors = {};
    this.isValid = true;
  }

  addError(field, message) {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(message);
    this.isValid = false;
  }

  hasError(field) {
    return this.errors[field] && this.errors[field].length > 0;
  }

  getErrors(field) {
    return this.errors[field] || [];
  }

  getFirstError(field) {
    const errors = this.getErrors(field);
    return errors.length > 0 ? errors[0] : null;
  }

  getAllErrors() {
    return this.errors;
  }

  clear() {
    this.errors = {};
    this.isValid = true;
  }
}

// ============================================================================
// User Validation
// ============================================================================

/**
 * Validate user registration data
 */
export function validateUserRegistration(data) {
  const result = new ValidationResult();

  // Email validation
  if (!data.email) {
    result.addError('email', 'Email is required');
  } else if (!isValidEmail(data.email)) {
    result.addError('email', 'Invalid email format');
  }

  // Password validation
  if (!data.password) {
    result.addError('password', 'Password is required');
  } else if (!isValidPassword(data.password)) {
    result.addError('password', 'Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  // Name validation
  if (!data.name || !data.name.trim()) {
    result.addError('name', 'Name is required');
  } else if (data.name.trim().length > 255) {
    result.addError('name', 'Name is too long');
  }

  return result;
}

/**
 * Validate user login data
 */
export function validateUserLogin(data) {
  const result = new ValidationResult();

  if (!data.email) {
    result.addError('email', 'Email is required');
  } else if (!isValidEmail(data.email)) {
    result.addError('email', 'Invalid email format');
  }

  if (!data.password) {
    result.addError('password', 'Password is required');
  }

  return result;
}

/**
 * Validate password change data
 */
export function validatePasswordChange(data) {
  const result = new ValidationResult();

  if (!data.currentPassword) {
    result.addError('currentPassword', 'Current password is required');
  }

  if (!data.newPassword) {
    result.addError('newPassword', 'New password is required');
  } else if (!isValidPassword(data.newPassword)) {
    result.addError('newPassword', 'Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  if (!data.confirmPassword) {
    result.addError('confirmPassword', 'Please confirm your password');
  } else if (data.newPassword !== data.confirmPassword) {
    result.addError('confirmPassword', 'Passwords do not match');
  }

  return result;
}

// ============================================================================
// Fund Validation
// ============================================================================

/**
 * Validate fund creation data
 */
export function validateFundCreation(data) {
  const result = new ValidationResult();

  // Name validation
  if (!data.name || !data.name.trim()) {
    result.addError('name', 'Fund name is required');
  } else if (data.name.trim().length > 255) {
    result.addError('name', 'Fund name is too long');
  }

  // Chit value validation
  if (!data.chit_value) {
    result.addError('chit_value', 'Chit value is required');
  } else if (!isValidMonetaryAmount(data.chit_value)) {
    result.addError('chit_value', 'Invalid chit value');
  }

  // Installment amount validation
  if (!data.installment_amount) {
    result.addError('installment_amount', 'Installment amount is required');
  } else if (!isValidMonetaryAmount(data.installment_amount)) {
    result.addError('installment_amount', 'Invalid installment amount');
  }

  // Total months validation
  if (!data.total_months) {
    result.addError('total_months', 'Total months is required');
  } else if (!isPositiveInteger(data.total_months) || data.total_months > 120) {
    result.addError('total_months', 'Total months must be a positive integer not exceeding 120');
  }

  // Start month validation
  if (!data.start_month) {
    result.addError('start_month', 'Start month is required');
  } else if (!isValidMonthKey(data.start_month)) {
    result.addError('start_month', 'Invalid start month format (YYYY-MM)');
  }

  // End month validation
  if (!data.end_month) {
    result.addError('end_month', 'End month is required');
  } else if (!isValidMonthKey(data.end_month)) {
    result.addError('end_month', 'Invalid end month format (YYYY-MM)');
  }

  // Date range validation
  if (data.start_month && data.end_month && data.start_month >= data.end_month) {
    result.addError('end_month', 'End month must be after start month');
  }

  // Total months consistency validation
  if (data.start_month && data.end_month && data.total_months) {
    const startDate = new Date(data.start_month + '-01');
    const endDate = new Date(data.end_month + '-01');
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       (endDate.getMonth() - startDate.getMonth()) + 1;
    
    if (monthsDiff !== parseInt(data.total_months)) {
      result.addError('total_months', 'Total months must match the difference between start and end months');
    }
  }

  // Notes validation
  if (data.notes && data.notes.length > 1000) {
    result.addError('notes', 'Notes are too long');
  }

  return result;
}

/**
 * Validate fund update data
 */
export function validateFundUpdate(data) {
  const result = new ValidationResult();

  // Only validate provided fields
  if (data.name !== undefined) {
    if (!data.name || !data.name.trim()) {
      result.addError('name', 'Fund name is required');
    } else if (data.name.trim().length > 255) {
      result.addError('name', 'Fund name is too long');
    }
  }

  if (data.chit_value !== undefined && !isValidMonetaryAmount(data.chit_value)) {
    result.addError('chit_value', 'Invalid chit value');
  }

  if (data.installment_amount !== undefined && !isValidMonetaryAmount(data.installment_amount)) {
    result.addError('installment_amount', 'Invalid installment amount');
  }

  if (data.total_months !== undefined) {
    if (!isPositiveInteger(data.total_months) || data.total_months > 120) {
      result.addError('total_months', 'Total months must be a positive integer not exceeding 120');
    }
  }

  if (data.start_month !== undefined && !isValidMonthKey(data.start_month)) {
    result.addError('start_month', 'Invalid start month format (YYYY-MM)');
  }

  if (data.end_month !== undefined && !isValidMonthKey(data.end_month)) {
    result.addError('end_month', 'Invalid end month format (YYYY-MM)');
  }

  if (data.early_exit_month !== undefined && data.early_exit_month !== null && !isValidMonthKey(data.early_exit_month)) {
    result.addError('early_exit_month', 'Invalid early exit month format (YYYY-MM)');
  }

  if (data.notes !== undefined && data.notes && data.notes.length > 1000) {
    result.addError('notes', 'Notes are too long');
  }

  return result;
}

// ============================================================================
// Monthly Entry Validation
// ============================================================================

/**
 * Validate monthly entry creation data
 */
export function validateMonthlyEntryCreation(data) {
  const result = new ValidationResult();

  if (!data.fund_id) {
    result.addError('fund_id', 'Fund ID is required');
  } else if (!isValidUUID(data.fund_id)) {
    result.addError('fund_id', 'Invalid fund ID format');
  }

  if (!data.month_key) {
    result.addError('month_key', 'Month key is required');
  } else if (!isValidMonthKey(data.month_key)) {
    result.addError('month_key', 'Invalid month key format (YYYY-MM)');
  }

  if (data.dividend_amount !== undefined && !isValidMonetaryAmount(data.dividend_amount)) {
    result.addError('dividend_amount', 'Invalid dividend amount');
  }

  if (data.prize_money !== undefined && !isValidMonetaryAmount(data.prize_money)) {
    result.addError('prize_money', 'Invalid prize money amount');
  }

  if (data.notes && data.notes.length > 1000) {
    result.addError('notes', 'Notes are too long');
  }

  return result;
}

// ============================================================================
// Bid Validation
// ============================================================================

/**
 * Validate bid creation data
 */
export function validateBidCreation(data) {
  const result = new ValidationResult();

  if (!data.fund_id) {
    result.addError('fund_id', 'Fund ID is required');
  } else if (!isValidUUID(data.fund_id)) {
    result.addError('fund_id', 'Invalid fund ID format');
  }

  if (!data.month_key) {
    result.addError('month_key', 'Month key is required');
  } else if (!isValidMonthKey(data.month_key)) {
    result.addError('month_key', 'Invalid month key format (YYYY-MM)');
  }

  if (!data.winning_bid) {
    result.addError('winning_bid', 'Winning bid is required');
  } else if (!isValidMonetaryAmount(data.winning_bid)) {
    result.addError('winning_bid', 'Invalid winning bid amount');
  }

  if (data.discount_amount !== undefined && !isValidMonetaryAmount(data.discount_amount)) {
    result.addError('discount_amount', 'Invalid discount amount');
  }

  if (data.bidder_name && data.bidder_name.length > 255) {
    result.addError('bidder_name', 'Bidder name is too long');
  }

  if (data.notes && data.notes.length > 1000) {
    result.addError('notes', 'Notes are too long');
  }

  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize string input
 */
export function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Format monetary amount for display
 */
export function formatMonetaryAmount(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

/**
 * Parse monetary amount from string
 */
export function parseMonetaryAmount(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/**
 * Validate form data and return errors object for easy integration with forms
 */
export function validateFormData(validator, data) {
  const result = validator(data);
  return {
    isValid: result.isValid,
    errors: result.getAllErrors(),
    getError: (field) => result.getFirstError(field),
    hasError: (field) => result.hasError(field)
  };
}

// ============================================================================
// Real-time Validation Helpers
// ============================================================================

/**
 * Debounced validation for real-time form validation
 */
export function createDebouncedValidator(validator, delay = 300) {
  let timeoutId;
  
  return function(data, callback) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(data);
      callback(result);
    }, delay);
  };
}

/**
 * Field-specific validators for real-time validation
 */
export const fieldValidators = {
  email: (value) => {
    if (!value) return 'Email is required';
    if (!isValidEmail(value)) return 'Invalid email format';
    return null;
  },
  
  password: (value) => {
    if (!value) return 'Password is required';
    if (!isValidPassword(value)) return 'Password must be at least 8 characters with uppercase, lowercase, and number';
    return null;
  },
  
  name: (value) => {
    if (!value || !value.trim()) return 'Name is required';
    if (value.trim().length > 255) return 'Name is too long';
    return null;
  },
  
  monthKey: (value) => {
    if (!value) return 'Month is required';
    if (!isValidMonthKey(value)) return 'Invalid month format (YYYY-MM)';
    return null;
  },
  
  monetaryAmount: (value) => {
    if (!value) return 'Amount is required';
    if (!isValidMonetaryAmount(value)) return 'Invalid amount';
    return null;
  },
  
  positiveInteger: (value) => {
    if (!value) return 'Value is required';
    if (!isPositiveInteger(value)) return 'Must be a positive integer';
    return null;
  }
};