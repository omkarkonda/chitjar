#!/usr/bin/env node

/**
 * Simple setup script for performance testing
 * 
 * This script outputs instructions for setting up a test user for performance testing.
 */

console.log('🔧 Performance Test Setup Instructions');
console.log('=====================================');
console.log('');
console.log('1. Start the backend server:');
console.log('   cd backend && npm run dev');
console.log('');
console.log('2. In another terminal, create a test user via the API:');
console.log('   curl -X POST http://localhost:5000/api/v1/auth/signup \\');
console.log('        -H "Content-Type: application/json" \\');
console.log('        -d \'{"email":"performance-test@example.com","password":"PerformanceTest123!","name":"Performance Test User"}\'');
console.log('');
console.log('3. Run the performance tests:');
console.log('   cd backend && npm run perf:test');
console.log('');
console.log('Note: The performance test script will handle authentication automatically.');
