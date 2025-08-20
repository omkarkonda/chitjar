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
  const digits = safeIntegerPart.split('');
  const len = digits.length;
  
  console.log(`Digits:`, digits);
  console.log(`Length: ${len}`);

  let formattedInteger = '';
  
  // Process digits from right to left
  for (let i = len - 1; i >= 0; i--) {
    // Add the digit
    formattedInteger = digits[i] + formattedInteger;
    console.log(`  After adding digit ${digits[i]}: "${formattedInteger}"`);
    
    // Add comma if needed
    const positionFromRight = len - i;
    console.log(`    Position from right: ${positionFromRight}`);
    
    // For Indian numbering system:
    // - Add comma after 3 digits from right (position 3)
    // - Then add comma after every 2 digits (positions 5, 7, 9, ...)
    if (positionFromRight === 3 || (positionFromRight > 3 && positionFromRight % 2 === 1)) {
      if (i > 0) { // Don't add comma at the beginning
        formattedInteger = ',' + formattedInteger;
        console.log(`    Added comma: "${formattedInteger}"`);
      }
    }
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