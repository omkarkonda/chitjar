/**
 * Edge Case Handling Utilities for ChitJar Frontend
 * 
 * This module provides utilities for handling various edge cases in the application
 * including mid-year starts, early exits, editing past entries, multiple active funds,
 * and zero dividend months.
 */

/**
 * Check if a month key represents a mid-year start
 * @param {string} monthKey - Month key in YYYY-MM format
 * @returns {boolean} True if the month represents a mid-year start (April or later)
 */
export function isMidYearStart(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return false;
  
  const parts = monthKey.split('-');
  if (parts.length !== 2) return false;
  
  const month = parseInt(parts[1], 10);
  return month >= 4; // April (04) or later
}

/**
 * Check if a fund has an early exit
 * @param {Object} fund - Fund object with early_exit_month property
 * @returns {boolean} True if the fund has an early exit
 */
export function hasEarlyExit(fund) {
  return fund && fund.early_exit_month && fund.early_exit_month !== null;
}

/**
 * Get the effective end month for a fund (considering early exit)
 * @param {Object} fund - Fund object with end_month and early_exit_month properties
 * @returns {string} The effective end month
 */
export function getEffectiveEndMonth(fund) {
  if (!fund) return null;
  return fund.early_exit_month || fund.end_month;
}

/**
 * Check if a month is within the fund's active range
 * @param {string} monthKey - Month key in YYYY-MM format
 * @param {Object} fund - Fund object with start_month, end_month, and early_exit_month properties
 * @returns {boolean} True if the month is within the fund's active range
 */
export function isMonthInFundRange(monthKey, fund) {
  if (!monthKey || !fund) return false;
  
  // Check that monthKey is a valid format
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return false;
  
  const effectiveEndMonth = getEffectiveEndMonth(fund);
  
  return monthKey >= fund.start_month && monthKey <= effectiveEndMonth;
}

/**
 * Generate a series of months for a fund, considering early exit
 * @param {Object} fund - Fund object with start_month, end_month, and early_exit_month properties
 * @returns {Array<string>} Array of month keys in YYYY-MM format
 */
export function generateFundMonthSeries(fund) {
  if (!fund || !fund.start_month || !fund.end_month) return [];
  
  const startDate = new Date(fund.start_month + '-01');
  const endDate = new Date(getEffectiveEndMonth(fund) + '-01');
  
  // Validate that start is before end
  if (startDate > endDate) {
    throw new Error('Start month must be before end month');
  }
  
  const months = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    months.push(`${year}-${month}`);
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return months;
}

/**
 * Find missing months in a fund's entries
 * @param {Array} entries - Array of entry objects with month_key properties
 * @param {Object} fund - Fund object with start_month, end_month, and early_exit_month properties
 * @returns {Array<string>} Array of missing month keys
 */
export function findMissingMonths(entries, fund) {
  if (!entries || !fund) return [];
  
  const expectedMonths = generateFundMonthSeries(fund);
  const existingMonths = new Set(entries.map(entry => entry.month_key));
  
  return expectedMonths.filter(month => !existingMonths.has(month));
}

/**
 * Check if a month represents a zero dividend month
 * @param {Object} entry - Entry object with dividend_amount property
 * @returns {boolean} True if the entry represents a zero dividend month
 */
export function isZeroDividendMonth(entry) {
  return entry && (entry.dividend_amount === 0 || entry.dividend_amount === '0');
}

/**
 * Check if an entry is for a past month
 * @param {string} monthKey - Month key in YYYY-MM format
 * @returns {boolean} True if the month is in the past
 */
export function isPastMonth(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return false;
  
  const [year, month] = monthKey.split('-').map(Number);
  const entryDate = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
  const currentDate = new Date();
  const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  return entryDate < currentMonth;
}

/**
 * Check if a fund is active
 * @param {Object} fund - Fund object with is_active property
 * @returns {boolean} True if the fund is active
 */
export function isFundActive(fund) {
  return fund && fund.is_active !== false;
}

/**
 * Get active funds from a list of funds
 * @param {Array} funds - Array of fund objects
 * @returns {Array} Array of active funds
 */
export function getActiveFunds(funds) {
  if (!funds || !Array.isArray(funds)) return [];
  return funds.filter(isFundActive);
}

/**
 * Check if there are multiple active funds
 * @param {Array} funds - Array of fund objects
 * @returns {boolean} True if there are multiple active funds
 */
export function hasMultipleActiveFunds(funds) {
  const activeFunds = getActiveFunds(funds);
  return activeFunds.length > 1;
}

/**
 * Format a warning message for editing past entries
 * @param {string} monthKey - Month key in YYYY-MM format
 * @returns {string} Warning message
 */
export function formatPastEntryWarning(monthKey) {
  return `You are editing an entry for a past month (${monthKey}). Please ensure this change is intentional.`;
}

/**
 * Format a warning message for zero dividend months
 * @returns {string} Warning message
 */
export function formatZeroDividendWarning() {
  return 'This month has zero dividend. Please confirm this is correct.';
}

/**
 * Format a warning message for early exit funds
 * @param {Object} fund - Fund object with early_exit_month property
 * @returns {string} Warning message
 */
export function formatEarlyExitWarning(fund) {
  if (!fund || !fund.early_exit_month) return '';
  return `This fund exited early in ${fund.early_exit_month}. No further entries will be created after this month.`;
}

/**
 * Format a warning message for mid-year start funds
 * @param {Object} fund - Fund object with start_month property
 * @returns {string} Warning message
 */
export function formatMidYearStartWarning(fund) {
  if (!fund || !fund.start_month) return '';
  if (!isMidYearStart(fund.start_month)) return '';
  return `This fund started mid-year in ${fund.start_month}. The first few months may have special calculations.`;
}