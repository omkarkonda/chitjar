/**
 * Fund Status Utility Functions for ChitJar Frontend
 * 
 * This module provides utility functions to determine fund status,
 * including whether a fund has ended, is active, etc.
 */

/**
 * Determine if a fund has ended based on its end_month or early_exit_month
 * @param {Object} fund - The fund object
 * @returns {boolean} True if the fund has ended, false otherwise
 */
export function isFundEnded(fund) {
  if (!fund) return false;

  // Get current month in YYYY-MM format
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Determine the effective end month (early_exit_month takes precedence)
  const effectiveEndMonth = fund.early_exit_month || fund.end_month;

  // If fund is explicitly marked as inactive, consider it ended
  if (fund.is_active === false) return true;

  // If there's no end month, assume it's not ended
  if (!effectiveEndMonth) return false;

  // Compare current month with the effective end month
  return currentMonth > effectiveEndMonth;
}

/**
 * Get the effective end month for a fund (early_exit_month or end_month)
 * @param {Object} fund - The fund object
 * @returns {string|null} The effective end month in YYYY-MM format, or null if not available
 */
export function getFundEffectiveEndMonth(fund) {
  if (!fund) return null;
  return fund.early_exit_month || fund.end_month || null;
}

/**
 * Determine if a fund is currently active (not ended and explicitly active)
 * @param {Object} fund - The fund object
 * @returns {boolean} True if the fund is active, false otherwise
 */
export function isFundActive(fund) {
  if (!fund) return false;
  
  // Must be explicitly marked as active and not ended
  return fund.is_active === true && !isFundEnded(fund);
}

/**
 * Get a human-readable status description for a fund
 * @param {Object} fund - The fund object
 * @returns {string} Status description
 */
export function getFundStatusDescription(fund) {
  if (!fund) return 'Unknown';

  if (fund.is_active === false) {
    return 'Inactive';
  }

  if (isFundEnded(fund)) {
    const effectiveEndMonth = getFundEffectiveEndMonth(fund);
    const endType = fund.early_exit_month ? 'Early Exit' : 'Completed';
    return `${endType} (${effectiveEndMonth})`;
  }

  return 'Active';
}

/**
 * Determine if new entries can be added to a fund
 * This considers both fund status and business rules
 * @param {Object} fund - The fund object
 * @returns {Object} Object with canAdd boolean and reason string
 */
export function canAddEntriesToFund(fund) {
  if (!fund) {
    return {
      canAdd: false,
      reason: 'Fund not found',
    };
  }

  if (fund.is_active === false) {
    return {
      canAdd: false,
      reason: 'Fund is inactive'
    };
  }

  if (isFundEnded(fund)) {
    const effectiveEndMonth = getFundEffectiveEndMonth(fund);
    const endType = fund.early_exit_month ? 'early exit' : 'completion';
    return {
      canAdd: false,
      reason: `Fund ended in ${effectiveEndMonth} (${endType})`
    };
  }

  return {
    canAdd: true,
    reason: 'Fund is active'
  };
}

/**
 * Calculate how many months are left in a fund
 * @param {Object} fund - The fund object
 * @returns {number|null} Number of months remaining, or null if cannot be calculated
 */
export function getMonthsRemainingInFund(fund) {
  if (!fund || isFundEnded(fund)) return 0;

  const effectiveEndMonth = getFundEffectiveEndMonth(fund);
  if (!effectiveEndMonth) return null;

  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Parse both dates
  const currentDateParsed = new Date(currentMonth + '-01');
  const endDateParsed = new Date(effectiveEndMonth + '-01');

  if (endDateParsed <= currentDateParsed) return 0;

  // Calculate difference in months
  return (endDateParsed.getFullYear() - currentDateParsed.getFullYear()) * 12 + 
         (endDateParsed.getMonth() - currentDateParsed.getMonth()) + 1;
}