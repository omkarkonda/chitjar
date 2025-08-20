// Debug test for formatINR algorithm
const debugFormatINR = (amount, decimals = 2) => {
  console.log(`Debugging formatINR(${amount}, ${decimals})`);
  
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
  const reversed = safeIntegerPart.split('').reverse();
  console.log(`Reversed digits:`, reversed);

  for (let i = 0; i < reversed.length; i++) {
    console.log(`Processing digit ${i}: ${reversed[i]}`);
    if (i === 3 && reversed.length > 3) {
      console.log(`  Adding comma at position 3`);
      formattedInteger = ',' + formattedInteger;
    } else if (i > 3 && i % 2 === 1 && i !== reversed.length - 1) {
      console.log(`  Adding comma at position ${i} (i > 3 && i % 2 === 1)`);
      formattedInteger = ',' + formattedInteger;
    }
    formattedInteger = reversed[i] + formattedInteger;
    console.log(`  Current formattedInteger: "${formattedInteger}"`);
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

// Test case that's failing
debugFormatINR(100000);