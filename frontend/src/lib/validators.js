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
    errors,
  };
}

/**
 * Validate fund creation data
 * @param {Object} data - The fund data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateFundCreation(data) {
  const errors = [];

  // Validate name
  if (!data.name || !data.name.trim()) {
    errors.push('Fund name is required');
  } else if (data.name.trim().length > 255) {
    errors.push('Fund name is too long (maximum 255 characters)');
  }

  // Validate chit value
  if (!data.chit_value) {
    errors.push('Chit value is required');
  } else {
    const chitValue = parseFloat(data.chit_value);
    if (isNaN(chitValue) || chitValue <= 0) {
      errors.push('Chit value must be a positive number');
    }
  }

  // Validate installment amount
  if (!data.installment_amount) {
    errors.push('Installment amount is required');
  } else {
    const installmentAmount = parseFloat(data.installment_amount);
    if (isNaN(installmentAmount) || installmentAmount <= 0) {
      errors.push('Installment amount must be a positive number');
    }
  }

  // Validate total months
  if (!data.total_months) {
    errors.push('Total months is required');
  } else {
    const totalMonths = parseInt(data.total_months);
    if (isNaN(totalMonths) || totalMonths <= 0 || totalMonths > 120) {
      errors.push('Total months must be a positive integer between 1 and 120');
    }
  }

  // Validate start month
  if (!data.start_month) {
    errors.push('Start month is required');
  } else if (!/^\d{4}-\d{2}$/.test(data.start_month)) {
    errors.push('Invalid start month format (YYYY-MM)');
  }

  // Validate end month
  if (!data.end_month) {
    errors.push('End month is required');
  } else if (!/^\d{4}-\d{2}$/.test(data.end_month)) {
    errors.push('Invalid end month format (YYYY-MM)');
  }

  // Validate date range
  if (data.start_month && data.end_month) {
    if (data.start_month >= data.end_month) {
      errors.push('End month must be after start month');
    }
  }

  // Validate notes length if provided
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes are too long (maximum 1000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate fund update data
 * @param {Object} data - The fund data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateFundUpdate(data) {
  const errors = [];

  // Validate name if provided
  if (data.name !== undefined) {
    if (!data.name || !data.name.trim()) {
      errors.push('Fund name is required');
    } else if (data.name.trim().length > 255) {
      errors.push('Fund name is too long (maximum 255 characters)');
    }
  }

  // Validate chit value if provided
  if (data.chit_value !== undefined) {
    const chitValue = parseFloat(data.chit_value);
    if (isNaN(chitValue) || chitValue <= 0) {
      errors.push('Chit value must be a positive number');
    }
  }

  // Validate installment amount if provided
  if (data.installment_amount !== undefined) {
    const installmentAmount = parseFloat(data.installment_amount);
    if (isNaN(installmentAmount) || installmentAmount <= 0) {
      errors.push('Installment amount must be a positive number');
    }
  }

  // Validate total months if provided
  if (data.total_months !== undefined) {
    const totalMonths = parseInt(data.total_months);
    if (isNaN(totalMonths) || totalMonths <= 0 || totalMonths > 120) {
      errors.push('Total months must be a positive integer between 1 and 120');
    }
  }

  // Validate start month if provided
  if (data.start_month !== undefined) {
    if (!data.start_month) {
      errors.push('Start month is required');
    } else if (!/^\d{4}-\d{2}$/.test(data.start_month)) {
      errors.push('Invalid start month format (YYYY-MM)');
    }
  }

  // Validate end month if provided
  if (data.end_month !== undefined) {
    if (!data.end_month) {
      errors.push('End month is required');
    } else if (!/^\d{4}-\d{2}$/.test(data.end_month)) {
      errors.push('Invalid end month format (YYYY-MM)');
    }
  }

  // Validate date range if both start and end months are provided
  if (data.start_month && data.end_month) {
    if (data.start_month >= data.end_month) {
      errors.push('End month must be after start month');
    }
  }

  // Validate early exit month if provided
  if (data.early_exit_month !== undefined) {
    if (
      data.early_exit_month !== null &&
      !/^\d{4}-\d{2}$/.test(data.early_exit_month)
    ) {
      errors.push('Invalid early exit month format (YYYY-MM)');
    }
  }

  // Validate notes length if provided
  if (data.notes !== undefined && data.notes && data.notes.length > 1000) {
    errors.push('Notes are too long (maximum 1000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
