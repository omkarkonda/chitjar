// Debug test for formatINR function
const formatINR = (amount, decimals = 2) => {
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
};

// Test cases
console.log('formatINR(0):', formatINR(0)); // Expected: "0.00"
console.log('formatINR(1000):', formatINR(1000)); // Expected: "1,000.00"
console.log('formatINR(100000):', formatINR(100000)); // Expected: "1,00,000.00"
console.log('formatINR(10000000):', formatINR(10000000)); // Expected: "1,00,00,000.00"
console.log('formatINR(123456789):', formatINR(123456789)); // Expected: "12,34,56,789.00"