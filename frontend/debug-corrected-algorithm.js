// Corrected formatINR algorithm for Indian numbering system
const correctedFormatINR = (amount, decimals = 2) => {
  console.log(`Debugging correctedFormatINR(${amount}, ${decimals})`);
  
  // Convert string to number if needed
  let numericAmount = amount;
  if (typeof amount === 'string') {
    numericAmount = parseFloat(amount);
  }

  if (typeof numericAmount !== 'number' || isNaN(numericAmount)) {
    return '0.00';
  }

  // Round to specified decimal places
  const rounded =
    Math.round(numericAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  console.log(`Rounded: ${rounded}`);

  // Convert to string and split into integer and decimal parts
  const [integerPart, decimalPart = ''] = rounded.toString().split('.');
  console.log(`Integer part: "${integerPart}", Decimal part: "${decimalPart}"`);

  // Handle case where integerPart might be undefined
  const safeIntegerPart = integerPart || '0';
  console.log(`Safe integer part: "${safeIntegerPart}"`);

  // Format integer part with Indian numbering system
  let formattedInteger = '';
  const digits = safeIntegerPart.split('');
  const len = digits.length;
  
  console.log(`Digits:`, digits);
  console.log(`Length: ${len}`);

  for (let i = 0; i < len; i++) {
    // Add comma before digit if needed
    if (i > 0) {
      // For Indian numbering system:
      // - First comma after 3 digits from right (len - i == 3)
      // - Then comma after every 2 digits (len - i == 5, 7, 9, ...)
      const positionFromRight = len - i;
      if (positionFromRight === 3 || (positionFromRight > 3 && positionFromRight % 2 === 1)) {
        console.log(`  Adding comma before digit at position ${i} (position from right: ${positionFromRight})`);
        formattedInteger = ',' + formattedInteger;
      }
    }
    formattedInteger = digits[len - 1 - i] + formattedInteger;
    console.log(`  After processing digit ${len - 1 - i}: "${formattedInteger}"`);
  }

  console.log(`Final formattedInteger: "${formattedInteger}"`);

  // Add decimal part
  const paddedDecimal = decimalPart
    .padEnd(decimals, '0')
    .substring(0, decimals);
  console.log(`Padded decimal: "${paddedDecimal}"`);

  const result = decimals > 0
    ? `${formattedInteger}.${paddedDecimal}`
    : formattedInteger;
    
  console.log(`Result: "${result}"`);
  return result;
};

// Test cases
console.log('\n=== Testing corrected algorithm ===');
correctedFormatINR(100000);
console.log('\n=== Expected: 1,00,000.00 ===\n');

correctedFormatINR(10000000);
console.log('\n=== Expected: 1,00,00,000.00 ===\n');