// Test the actual formatINR function
import { formatINR } from './src/lib/formatters.js';

console.log('formatINR(0):', formatINR(0)); // Expected: "0.00"
console.log('formatINR(1000):', formatINR(1000)); // Expected: "1,000.00"
console.log('formatINR(100000):', formatINR(100000)); // Expected: "1,00,000.00"
console.log('formatINR(10000000):', formatINR(10000000)); // Expected: "1,00,00,000.00"
console.log('formatINR(123456789):', formatINR(123456789)); // Expected: "12,34,56,789.00"