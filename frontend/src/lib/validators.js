/**
 * Enhanced validation utilities with field-level error reporting
 * Mirrors server-side Zod validation rules for consistency
 */

/**
 * Validate a monetary value
 * @param {string|number} value - The value to validate
 * @param {string} fieldName - The name of the field being validated
 * @param {number} chitValue - Optional chit value for maximum validation
 * @returns {string|null} Error message or null if valid
 */
export function validateMonetaryValue(value, fieldName, chitValue = null) {
  // Check if value is provided
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }

  // Parse the value
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check if it's a valid number
  if (isNaN(numericValue)) {
    return `${fieldName} must be a valid number`;
  }

  // Check if it's positive (non-negative for some fields)
  if (fieldName === 'Dividend amount' || fieldName === 'Prize money') {
    if (numericValue < 0) {
      return `${fieldName} cannot be negative`;
    }
  } else {
    if (numericValue <= 0) {
      return `${fieldName} must be positive`;
    }
  }

  // Check maximum value
  if (numericValue > 99999999.99) {
    return `${fieldName} is too large`;
  }

  // Check if it exceeds chit value
  if (chitValue !== null && numericValue > chitValue) {
    return `${fieldName} cannot exceed chit value of ${chitValue}`;
  }

  // Check decimal places (should have at most 2)
  const stringValue = numericValue.toString();
  if (stringValue.includes('.')) {
    const decimalPlaces = stringValue.split('.')[1].length;
    if (decimalPlaces > 2) {
      return `${fieldName} can have at most 2 decimal places`;
    }
  }

  return null; // Valid
}

/**
 * Validate a month key (YYYY-MM format)
 * @param {string} value - The month key to validate
 * @param {string} fieldName - The name of the field being validated
 * @returns {string|null} Error message or null if valid
 */
export function validateMonthKey(value, fieldName) {
  // Check if value is provided
  if (!value) {
    return `${fieldName} is required`;
  }

  // Check format
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return `Invalid ${fieldName} format (YYYY-MM)`;
  }

  // Check year and month ranges
  const parts = value.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return `Invalid ${fieldName} format`;
  }
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  
  if (isNaN(year) || isNaN(month) || 
      year < 1900 || year > 2100 || 
      month < 1 || month > 12) {
    return `Invalid ${fieldName}: year must be 1900-2100, month must be 01-12`;
  }

  return null; // Valid
}

/**
 * Validate a positive integer
 * @param {string|number} value - The value to validate
 * @param {string} fieldName - The name of the field being validated
 * @param {number} maxValue - Optional maximum value
 * @returns {string|null} Error message or null if valid
 */
export function validatePositiveInteger(value, fieldName, maxValue = null) {
  // Check if value is provided
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }

  // Parse the value
  const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
  
  // Check if it's a valid integer
  if (isNaN(numericValue) || !Number.isInteger(numericValue)) {
    return `${fieldName} must be a valid integer`;
  }

  // Check if it's positive
  if (numericValue <= 0) {
    return `${fieldName} must be positive`;
  }

  // Check maximum value
  if (maxValue !== null && numericValue > maxValue) {
    return `${fieldName} cannot exceed ${maxValue}`;
  }

  return null; // Valid
}

/**
 * Validate a string field
 * @param {string} value - The value to validate
 * @param {string} fieldName - The name of the field being validated
 * @param {number} maxLength - Maximum length allowed
 * @param {boolean} required - Whether the field is required
 * @returns {string|null} Error message or null if valid
 */
export function validateString(value, fieldName, maxLength, required = true) {
  // Check if value is provided when required
  if (required && (!value || !value.trim())) {
    return `${fieldName} is required`;
  }

  // Check maximum length
  if (value && value.length > maxLength) {
    return `${fieldName} is too long (maximum ${maxLength} characters)`;
  }

  return null; // Valid
}

/**
 * Validate monthly entry data with fund-specific rules
 * @param {Object} data - The monthly entry data to validate
 * @param {Object} fund - The fund details for validation
 * @returns {Object} Validation result with isValid flag and field-specific errors
 */
export function validateMonthlyEntry(data, fund) {
  const errors = {};
  let isValid = true;

  // Validate dividend amount
  if (data.dividend_amount !== undefined) {
    const dividendError = validateMonetaryValue(data.dividend_amount, 'Dividend amount');
    if (dividendError) {
      errors.dividend_amount = dividendError;
      isValid = false;
    }
  }

  // Validate prize money
  if (data.prize_money !== undefined) {
    const prizeError = validateMonetaryValue(data.prize_money, 'Prize money');
    if (prizeError) {
      errors.prize_money = prizeError;
      isValid = false;
    }

    // Check if prize money exceeds chit value
    if (fund && !prizeError && data.prize_money > fund.chit_value) {
      errors.prize_money = `Prize money cannot exceed chit value of ${fund.chit_value}`;
      isValid = false;
    }
  }

  // Validate month key
  const monthError = validateMonthKey(data.month_key, 'Month');
  if (monthError) {
    errors.month_key = monthError;
    isValid = false;
  }

  // Validate notes length
  if (data.notes !== undefined) {
    const notesError = validateString(data.notes, 'Notes', 1000, false);
    if (notesError) {
      errors.notes = notesError;
      isValid = false;
    }
  }

  return {
    isValid,
    errors,
  };
}

/**
 * Validate fund creation data
 * @param {Object} data - The fund data to validate
 * @returns {Object} Validation result with isValid flag and field-specific errors
 */
export function validateFundCreation(data) {
  const errors = {};
  let isValid = true;

  // Validate name
  const nameError = validateString(data.name, 'Fund name', 255);
  if (nameError) {
    errors.name = nameError;
    isValid = false;
  }

  // Validate chit value
  const chitValueError = validateMonetaryValue(data.chit_value, 'Chit value');
  if (chitValueError) {
    errors.chit_value = chitValueError;
    isValid = false;
  }

  // Validate installment amount
  const installmentError = validateMonetaryValue(data.installment_amount, 'Installment amount');
  if (installmentError) {
    errors.installment_amount = installmentError;
    isValid = false;
  }

  // Validate total months
  const monthsError = validatePositiveInteger(data.total_months, 'Total months', 120);
  if (monthsError) {
    errors.total_months = monthsError;
    isValid = false;
  }

  // Validate start month
  const startMonthError = validateMonthKey(data.start_month, 'Start month');
  if (startMonthError) {
    errors.start_month = startMonthError;
    isValid = false;
  }

  // Validate end month
  const endMonthError = validateMonthKey(data.end_month, 'End month');
  if (endMonthError) {
    errors.end_month = endMonthError;
    isValid = false;
  }

  // Validate date range
  if (data.start_month && data.end_month && !startMonthError && !endMonthError) {
    if (data.start_month >= data.end_month) {
      errors.end_month = 'End month must be after start month';
      isValid = false;
    }
    
    // Validate that total months matches the difference between start and end months
    if (data.total_months && !monthsError) {
      const startDate = new Date(data.start_month + '-01');
      const endDate = new Date(data.end_month + '-01');
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (endDate.getMonth() - startDate.getMonth()) + 1;
      if (monthsDiff !== parseInt(data.total_months)) {
        errors.total_months = 'Total months must match the difference between start and end months';
        isValid = false;
      }
    }
  }

  // Validate notes length if provided
  if (data.notes !== undefined) {
    const notesError = validateString(data.notes, 'Notes', 1000, false);
    if (notesError) {
      errors.notes = notesError;
      isValid = false;
    }
  }

  return {
    isValid,
    errors,
  };
}

/**
 * Validate fund update data
 * @param {Object} data - The fund data to validate
 * @returns {Object} Validation result with isValid flag and field-specific errors
 */
export function validateFundUpdate(data) {
  const errors = {};
  let isValid = true;

  // Validate name if provided
  if (data.name !== undefined) {
    const nameError = validateString(data.name, 'Fund name', 255);
    if (nameError) {
      errors.name = nameError;
      isValid = false;
    }
  }

  // Validate chit value if provided
  if (data.chit_value !== undefined) {
    const chitValueError = validateMonetaryValue(data.chit_value, 'Chit value');
    if (chitValueError) {
      errors.chit_value = chitValueError;
      isValid = false;
    }
  }

  // Validate installment amount if provided
  if (data.installment_amount !== undefined) {
    const installmentError = validateMonetaryValue(data.installment_amount, 'Installment amount');
    if (installmentError) {
      errors.installment_amount = installmentError;
      isValid = false;
    }
  }

  // Validate total months if provided
  if (data.total_months !== undefined) {
    const monthsError = validatePositiveInteger(data.total_months, 'Total months', 120);
    if (monthsError) {
      errors.total_months = monthsError;
      isValid = false;
    }
  }

  // Validate start month if provided
  if (data.start_month !== undefined) {
    const startMonthError = validateMonthKey(data.start_month, 'Start month');
    if (startMonthError) {
      errors.start_month = startMonthError;
      isValid = false;
    }
  }

  // Validate end month if provided
  if (data.end_month !== undefined) {
    const endMonthError = validateMonthKey(data.end_month, 'End month');
    if (endMonthError) {
      errors.end_month = endMonthError;
      isValid = false;
    }
  }

  // Validate date range if both start and end months are provided
  if (data.start_month && data.end_month) {
    const startMonthError = errors.start_month;
    const endMonthError = errors.end_month;
    
    if (!startMonthError && !endMonthError && data.start_month >= data.end_month) {
      errors.end_month = 'End month must be after start month';
      isValid = false;
    }
  }

  // Validate early exit month if provided
  if (data.early_exit_month !== undefined) {
    if (data.early_exit_month !== null) {
      const earlyExitError = validateMonthKey(data.early_exit_month, 'Early exit month');
      if (earlyExitError) {
        errors.early_exit_month = earlyExitError;
        isValid = false;
      }
    }
  }

  // Validate notes length if provided
  if (data.notes !== undefined) {
    const notesError = validateString(data.notes, 'Notes', 1000, false);
    if (notesError) {
      errors.notes = notesError;
      isValid = false;
    }
  }

  return {
    isValid,
    errors,
  };
}
