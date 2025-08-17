/**
 * Validate monthly entry data with fund-specific rules
 * @param {Object} data - The monthly entry data to validate
 * @param {Object} fund - The fund details for validation
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateMonthlyEntry(data, fund) {
  const errors = [];
  
  // Validate dividend amount
  if (data.dividend_amount !== undefined) {
    const dividendAmount = parseFloat(data.dividend_amount);
    if (isNaN(dividendAmount) || dividendAmount < 0) {
      errors.push('Dividend amount must be a positive number');
    }
  }
  
  // Validate prize money
  if (data.prize_money !== undefined) {
    const prizeMoney = parseFloat(data.prize_money);
    if (isNaN(prizeMoney) || prizeMoney < 0) {
      errors.push('Prize money must be a positive number');
    }
    
    // Check if prize money exceeds chit value
    if (fund && prizeMoney > fund.chit_value) {
      errors.push(`Prize money cannot exceed chit value of ${fund.chit_value}`);
    }
  }
  
  // Validate month key
  if (!data.month_key) {
    errors.push('Month is required');
  } else if (!/^\d{4}-\d{2}$/.test(data.month_key)) {
    errors.push('Invalid month format (YYYY-MM)');
  }
  
  // Validate notes length
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes are too long (maximum 1000 characters)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}