/**
 * Client-side CSV Parser for ChitJar
 * 
 * This module provides utilities for parsing CSV files on the client side
 * and mapping the data to the appropriate format for import.
 */

/**
 * Parse CSV string into array of objects
 * @param {string} csvString - The CSV data as a string
 * @param {Array<string>} headers - Optional array of headers to use instead of first row
 * @returns {Array<Object>} Array of objects representing the CSV data
 */
export function parseCsvString(csvString, headers = null) {
  // Split into lines
  const lines = csvString.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return [];
  }
  
  // Get headers from first line if not provided
  let actualHeaders = headers;
  let startIndex = 0;
  
  if (!headers) {
    actualHeaders = parseCsvRow(lines[0]);
    startIndex = 1;
  }
  
  // Parse data rows
  const data = [];
  for (let i = startIndex; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (row.length > 0) {
      const rowData = {};
      for (let j = 0; j < actualHeaders.length; j++) {
        const header = actualHeaders[j];
        const value = j < row.length ? row[j] : '';
        rowData[header] = value;
      }
      data.push(rowData);
    }
  }
  
  return data;
}

/**
 * Parse a single CSV row into an array of values
 * Handles quoted values and escaped quotes
 * @param {string} row - The CSV row as a string
 * @returns {Array<string>} Array of values from the row
 */
function parseCsvRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < row.length) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
        // Double quote inside quoted field - treat as single quote
        current += '"';
        i += 2; // Skip both quotes
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      // Regular character
      current += char;
    }
    
    i++;
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Read a CSV file and return its contents as a string
 * @param {File} file - The CSV file to read
 * @returns {Promise<string>} Promise that resolves to the file contents as a string
 */
export function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}

/**
 * Map CSV headers to standardized field names
 * @param {Array<string>} headers - Array of original headers
 * @param {string} type - Type of data ('funds', 'entries', or 'bids')
 * @returns {Array<string>} Array of mapped headers
 */
export function mapHeaders(headers, type) {
  return headers.map(header => {
    const cleanHeader = header.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, '');
    
    if (type === 'bids') {
      switch (cleanHeader) {
        case 'fundname': return 'fund_name';
        case 'monthkey':
        case 'month': return 'month_key';
        case 'winningbid':
        case 'winningBid':
        case 'winningBidAmount': return 'winning_bid';
        case 'discountamount':
        case 'discount': return 'discount_amount';
        case 'biddername': return 'bidder_name';
        default: return cleanHeader;
      }
    } else if (type === 'funds') {
      switch (cleanHeader) {
        case 'chitvalue': return 'chit_value';
        case 'installmentamount': return 'installment_amount';
        case 'totalmonths': return 'total_months';
        case 'startmonth': return 'start_month';
        case 'endmonth': return 'end_month';
        default: return cleanHeader;
      }
    } else if (type === 'entries') {
      switch (cleanHeader) {
        case 'fundname': return 'fund_name';
        case 'monthkey':
        case 'month': return 'month_key';
        case 'dividendamount': return 'dividend_amount';
        case 'prizemoney': return 'prize_money';
        case 'ispaid': return 'is_paid';
        default: return cleanHeader;
      }
    }
    
    return cleanHeader;
  });
}

/**
 * Validate CSV data based on type
 * @param {Array<Object>} data - Array of data objects
 * @param {string} type - Type of data ('funds', 'entries', or 'bids')
 * @returns {Array<Object>} Array of validation errors
 */
export function validateCsvData(data, type) {
  const errors = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const lineNumber = i + 2; // +1 for header, +1 for 1-based indexing
    
    if (type === 'bids') {
      // Validate required fields
      if (!row.fund_name || row.fund_name.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'fund_name',
          message: 'Fund name is required'
        });
      }
      
      if (!row.month_key || row.month_key.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'month_key',
          message: 'Month key is required'
        });
      } else if (!/^\d{4}-\d{2}$/.test(row.month_key)) {
        errors.push({
          line: lineNumber,
          field: 'month_key',
          message: 'Month key must be in YYYY-MM format'
        });
      }
      
      if (row.winning_bid === undefined || row.winning_bid === '') {
        errors.push({
          line: lineNumber,
          field: 'winning_bid',
          message: 'Winning bid is required'
        });
      } else {
        const winningBid = parseFloat(row.winning_bid);
        if (isNaN(winningBid) || winningBid <= 0) {
          errors.push({
            line: lineNumber,
            field: 'winning_bid',
            message: 'Winning bid must be a positive number'
          });
        }
      }
      
      if (row.discount_amount !== undefined && row.discount_amount !== '') {
        const discountAmount = parseFloat(row.discount_amount);
        if (isNaN(discountAmount) || discountAmount < 0) {
          errors.push({
            line: lineNumber,
            field: 'discount_amount',
            message: 'Discount amount must be a non-negative number'
          });
        }
      }
    } else if (type === 'funds') {
      // Validate required fields
      if (!row.name || row.name.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'name',
          message: 'Fund name is required'
        });
      }
      
      if (!row.chit_value || row.chit_value === '') {
        errors.push({
          line: lineNumber,
          field: 'chit_value',
          message: 'Chit value is required'
        });
      } else {
        const chitValue = parseFloat(row.chit_value);
        if (isNaN(chitValue) || chitValue <= 0) {
          errors.push({
            line: lineNumber,
            field: 'chit_value',
            message: 'Chit value must be a positive number'
          });
        }
      }
      
      if (!row.installment_amount || row.installment_amount === '') {
        errors.push({
          line: lineNumber,
          field: 'installment_amount',
          message: 'Installment amount is required'
        });
      } else {
        const installmentAmount = parseFloat(row.installment_amount);
        if (isNaN(installmentAmount) || installmentAmount <= 0) {
          errors.push({
            line: lineNumber,
            field: 'installment_amount',
            message: 'Installment amount must be a positive number'
          });
        }
      }
      
      if (!row.total_months || row.total_months === '') {
        errors.push({
          line: lineNumber,
          field: 'total_months',
          message: 'Total months is required'
        });
      } else {
        const totalMonths = parseInt(row.total_months);
        if (isNaN(totalMonths) || totalMonths <= 0 || totalMonths > 120) {
          errors.push({
            line: lineNumber,
            field: 'total_months',
            message: 'Total months must be a positive integer between 1 and 120'
          });
        }
      }
      
      if (!row.start_month || row.start_month.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'start_month',
          message: 'Start month is required'
        });
      } else if (!/^\d{4}-\d{2}$/.test(row.start_month)) {
        errors.push({
          line: lineNumber,
          field: 'start_month',
          message: 'Start month must be in YYYY-MM format'
        });
      }
      
      if (!row.end_month || row.end_month.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'end_month',
          message: 'End month is required'
        });
      } else if (!/^\d{4}-\d{2}$/.test(row.end_month)) {
        errors.push({
          line: lineNumber,
          field: 'end_month',
          message: 'End month must be in YYYY-MM format'
        });
      }
    } else if (type === 'entries') {
      // Validate required fields
      if (!row.fund_name || row.fund_name.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'fund_name',
          message: 'Fund name is required'
        });
      }
      
      if (!row.month_key || row.month_key.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'month_key',
          message: 'Month key is required'
        });
      } else if (!/^\d{4}-\d{2}$/.test(row.month_key)) {
        errors.push({
          line: lineNumber,
          field: 'month_key',
          message: 'Month key must be in YYYY-MM format'
        });
      }
      
      if (row.dividend_amount !== undefined && row.dividend_amount !== '') {
        const dividendAmount = parseFloat(row.dividend_amount);
        if (isNaN(dividendAmount) || dividendAmount < 0) {
          errors.push({
            line: lineNumber,
            field: 'dividend_amount',
            message: 'Dividend amount must be a non-negative number'
          });
        }
      }
      
      if (row.prize_money !== undefined && row.prize_money !== '') {
        const prizeMoney = parseFloat(row.prize_money);
        if (isNaN(prizeMoney) || prizeMoney < 0) {
          errors.push({
            line: lineNumber,
            field: 'prize_money',
            message: 'Prize money must be a non-negative number'
          });
        }
      }
    }
  }
  
  return errors;
}