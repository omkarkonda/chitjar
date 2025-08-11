/**
 * Formatting Utilities for ChitJar Frontend
 *
 * This module provides utilities for formatting currency (INR with Indian digit grouping),
 * dates (DD/MM/YYYY format), and date handling.
 */

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format a number as INR with Indian digit grouping
 *
 * Examples:
 * formatINR(1000) => "1,000.00"
 * formatINR(100000) => "1,00,000.00"
 * formatINR(10000000) => "1,00,00,000.00"
 *
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted INR string
 */
export function formatINR(amount, decimals = 2) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }

  // Round to specified decimal places
  const rounded =
    Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);

  // Convert to string and split into integer and decimal parts
  const [integerPart, decimalPart = ''] = rounded.toString().split('.');

  // Handle case where integerPart might be undefined
  const safeIntegerPart = integerPart || '0';

  // Format integer part with Indian numbering system
  let formattedInteger = '';
  const reversed = safeIntegerPart.split('').reverse();

  for (let i = 0; i < reversed.length; i++) {
    if (i === 3 && reversed.length > 3) {
      formattedInteger = ',' + formattedInteger;
    } else if (i > 3 && i % 2 === 1 && i !== reversed.length - 1) {
      formattedInteger = ',' + formattedInteger;
    }
    formattedInteger = reversed[i] + formattedInteger;
  }

  // Add decimal part
  const paddedDecimal = decimalPart
    .padEnd(decimals, '0')
    .substring(0, decimals);

  return decimals > 0
    ? `${formattedInteger}.${paddedDecimal}`
    : formattedInteger;
}

/**
 * Parse INR formatted string back to number
 *
 * @param {string} formattedAmount - The formatted INR string
 * @returns {number} Parsed number
 */
export function parseINR(formattedAmount) {
  if (!formattedAmount) return 0;

  // Remove commas and other non-numeric characters except decimal point
  const cleaned = formattedAmount.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a date as DD/MM/YYYY
 *
 * @param {Date|string|number} date - The date to format (Date object, string, or timestamp)
 * @returns {string} Formatted date string in DD/MM/YYYY format
 */
export function formatDate(date) {
  let d;

  if (typeof date === 'string') {
    // Handle ISO date strings
    if (date.includes('T')) {
      d = new Date(date);
    } else {
      // Handle DD/MM/YYYY or YYYY-MM-DD strings
      const parts = date.includes('/') ? date.split('/') : date.split('-');
      if (parts.length === 3) {
        const part1 = parts[0] || '0';
        const part2 = parts[1] || '0';
        const part3 = parts[2] || '0';

        if (date.includes('/')) {
          // DD/MM/YYYY format
          d = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
        } else {
          // YYYY-MM-DD format
          d = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
        }
      } else {
        d = new Date(date);
      }
    }
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = date;
  }

  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return '';
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Parse DD/MM/YYYY formatted string to Date object
 *
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @returns {Date|null} Date object or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;

  const parts = dateString.split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0] || '0', 10);
  const month = parseInt(parts[1] || '0', 10) - 1; // JS months are 0-indexed
  const year = parseInt(parts[2] || '0', 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);

  // Check if date is valid
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get the month key (YYYY-MM) from a date
 *
 * @param {Date|string|number} date - The date to extract month key from
 * @returns {string} Month key in YYYY-MM format
 */
export function getMonthKey(date) {
  let d;

  if (typeof date === 'string') {
    const parsed = parseDate(date);
    if (!parsed) return '';
    d = parsed;
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = date;
  }

  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');

  return `${year}-${month}`;
}

/**
 * Get the start date of a month from month key (YYYY-MM)
 *
 * @param {string} monthKey - Month key in YYYY-MM format
 * @returns {Date|null} Date object representing the first day of the month
 */
export function getMonthStartDate(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return null;
  }

  const parts = monthKey.split('-');
  const year = parseInt(parts[0] || '0', 10);
  const month = parseInt(parts[1] || '0', 10) - 1; // JS months are 0-indexed

  return new Date(year, month, 1);
}

/**
 * Get the end date of a month from month key (YYYY-MM)
 *
 * @param {string} monthKey - Month key in YYYY-MM format
 * @returns {Date|null} Date object representing the last day of the month
 */
export function getMonthEndDate(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return null;
  }

  const parts = monthKey.split('-');
  const year = parseInt(parts[0] || '0', 10);
  const month = parseInt(parts[1] || '0', 10); // Don't subtract 1 here as we want next month

  // Create date for first day of next month, then subtract 1 day
  const nextMonth = new Date(year, month, 1);
  nextMonth.setDate(0); // This sets to last day of previous month

  return nextMonth;
}

/**
 * Add months to a date
 *
 * @param {Date} date - The date to add months to
 * @param {number} months - Number of months to add (can be negative)
 * @returns {Date} New Date object with months added
 */
export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calculate the difference in months between two dates
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of months between the dates
 */
export function monthsDifference(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();

  return months;
}
