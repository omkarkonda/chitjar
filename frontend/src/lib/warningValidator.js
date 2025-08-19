/**
 * Warning Validation Utilities for ChitJar Frontend
 * 
 * This module provides validation functions that generate warnings for
 * unrealistic inputs rather than blocking errors.
 */

/**
 * Check if dividend amount seems unrealistic compared to installment amount
 * @param {number} dividendAmount - The dividend amount
 * @param {number} installmentAmount - The installment amount
 * @returns {string|null} Warning message or null if reasonable
 */
export function checkDividendVsInstallment(dividendAmount, installmentAmount) {
  if (dividendAmount === undefined || installmentAmount === undefined) return null;
  if (dividendAmount <= 0 || installmentAmount <= 0) return null;
  
  // If dividend is more than 50% of installment, that might be unusual
  if (dividendAmount > installmentAmount * 0.5) {
    return 'Dividend amount is unusually high compared to installment amount. Please verify this is correct.';
  }
  
  // If dividend is zero, that might be unusual (but not always)
  if (dividendAmount === 0) {
    return 'Dividend amount is zero. Please confirm this is correct.';
  }
  
  return null;
}

/**
 * Check if prize money seems unusually low compared to chit value
 * @param {number} prizeMoney - The prize money amount
 * @param {number} chitValue - The chit value
 * @returns {string|null} Warning message or null if reasonable
 */
export function checkLowPrizeMoney(prizeMoney, chitValue) {
  if (prizeMoney === undefined || chitValue === undefined) return null;
  if (prizeMoney <= 0 || chitValue <= 0) return null;
  
  // If prize money is less than 1% of chit value, that might be unusually low
  if (prizeMoney < chitValue * 0.01) {
    return 'Prize money is unusually low compared to chit value. Please verify this is correct.';
  }
  
  return null;
}

/**
 * Check if early exit month is unusually early
 * @param {string} earlyExitMonth - Early exit month in YYYY-MM format
 * @param {string} startMonth - Fund start month in YYYY-MM format
 * @param {number} totalMonths - Total months in the fund
 * @returns {string|null} Warning message or null if reasonable
 */
export function checkEarlyExitTiming(earlyExitMonth, startMonth, totalMonths) {
  if (!earlyExitMonth || !startMonth || !totalMonths) return null;
  
  // Parse the dates
  const earlyExitDate = new Date(earlyExitMonth + '-01');
  const startDate = new Date(startMonth + '-01');
  
  // Calculate expected end date
  const expectedEndDate = new Date(startDate);
  expectedEndDate.setMonth(expectedEndDate.getMonth() + totalMonths - 1);
  
  // Calculate months from start to early exit
  const monthsToEarlyExit = 
    (earlyExitDate.getFullYear() - startDate.getFullYear()) * 12 + 
    (earlyExitDate.getMonth() - startDate.getMonth()) + 1;
  
  // If early exit is less than 25% of total duration, that might be unusually early
  if (monthsToEarlyExit < totalMonths * 0.25) {
    return 'Early exit is unusually early in the fund lifecycle. Please verify this is correct.';
  }
  
  return null;
}

/**
 * Check if total months seems unusually long
 * @param {number} totalMonths - Total months in the fund
 * @returns {string|null} Warning message or null if reasonable
 */
export function checkLongDuration(totalMonths) {
  if (totalMonths === undefined) return null;
  if (totalMonths <= 0) return null;
  
  // If more than 60 months (5 years), that might be unusually long
  if (totalMonths > 60) {
    return 'Fund duration is unusually long. Please verify this is correct.';
  }
  
  return null;
}

/**
 * Check if chit value seems unusually large
 * @param {number} chitValue - The chit value
 * @returns {string|null} Warning message or null if reasonable
 */
export function checkLargeChitValue(chitValue) {
  if (chitValue === undefined) return null;
  if (chitValue <= 0) return null;
  
  // If more than 1 crore (10 million), that might be unusually large
  if (chitValue > 10000000) {
    return 'Chit value is unusually large. Please verify this is correct.';
  }
  
  return null;
}

/**
 * Check if installment amount seems unusually small compared to chit value
 * @param {number} installmentAmount - The installment amount
 * @param {number} chitValue - The chit value
 * @param {number} totalMonths - Total months in the fund
 * @returns {string|null} Warning message or null if reasonable
 */
export function checkSmallInstallment(installmentAmount, chitValue, totalMonths) {
  if (installmentAmount === undefined || chitValue === undefined || totalMonths === undefined) return null;
  if (installmentAmount <= 0 || chitValue <= 0 || totalMonths <= 0) return null;
  
  // Calculate expected installment (chit value / total months)
  const expectedInstallment = chitValue / totalMonths;
  
  // If installment is less than 50% of expected, that might be unusually small
  if (installmentAmount < expectedInstallment * 0.5) {
    return 'Installment amount is unusually small compared to chit value and duration. Please verify this is correct.';
  }
  
  return null;
}

/**
 * Generate warnings for fund data
 * @param {Object} data - The fund data to validate
 * @returns {Array<string>} Array of warning messages
 */
export function generateFundWarnings(data) {
  const warnings = [];
  
  // Check dividend vs installment
  if (data.dividend_amount !== undefined && data.installment_amount !== undefined) {
    const dividendWarning = checkDividendVsInstallment(data.dividend_amount, data.installment_amount);
    if (dividendWarning) warnings.push(dividendWarning);
  }
  
  // Check low prize money
  if (data.prize_money !== undefined && data.chit_value !== undefined) {
    const prizeWarning = checkLowPrizeMoney(data.prize_money, data.chit_value);
    if (prizeWarning) warnings.push(prizeWarning);
  }
  
  // Check early exit timing
  if (data.early_exit_month && data.start_month && data.total_months) {
    const earlyExitWarning = checkEarlyExitTiming(data.early_exit_month, data.start_month, data.total_months);
    if (earlyExitWarning) warnings.push(earlyExitWarning);
  }
  
  // Check long duration
  if (data.total_months) {
    const durationWarning = checkLongDuration(data.total_months);
    if (durationWarning) warnings.push(durationWarning);
  }
  
  // Check large chit value
  if (data.chit_value) {
    const chitValueWarning = checkLargeChitValue(data.chit_value);
    if (chitValueWarning) warnings.push(chitValueWarning);
  }
  
  // Check small installment
  if (data.installment_amount && data.chit_value && data.total_months) {
    const installmentWarning = checkSmallInstallment(data.installment_amount, data.chit_value, data.total_months);
    if (installmentWarning) warnings.push(installmentWarning);
  }
  
  return warnings;
}

/**
 * Generate warnings for monthly entry data
 * @param {Object} data - The monthly entry data to validate
 * @param {Object} fund - The fund details for context
 * @returns {Array<string>} Array of warning messages
 */
export function generateMonthlyEntryWarnings(data, fund) {
  const warnings = [];
  
  // Check dividend vs installment
  if (data.dividend_amount !== undefined && fund && fund.installment_amount) {
    const dividendWarning = checkDividendVsInstallment(data.dividend_amount, fund.installment_amount);
    if (dividendWarning) warnings.push(dividendWarning);
  }
  
  // Check low prize money
  if (data.prize_money !== undefined && fund && fund.chit_value) {
    const prizeWarning = checkLowPrizeMoney(data.prize_money, fund.chit_value);
    if (prizeWarning) warnings.push(prizeWarning);
  }
  
  return warnings;
}