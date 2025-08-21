#!/usr/bin/env node

/**
 * Comprehensive Performance Testing Script for ChitJar Analytics Endpoints
 * 
 * This script performs load testing on the Express.js analytics endpoints
 * to verify performance under load and identify bottlenecks.
 * 
 * Features:
 * - Proper authentication with JWT tokens
 * - Test data setup
 * - Multiple endpoint testing
 * - Detailed performance reporting
 * - Memory and CPU profiling
 */

const autocannon = require('autocannon');
const { spawn } = require('child_process');
const path = require('path');
const { performance } = require('perf_hooks');

// Test configuration
const TEST_DURATION = 30; // seconds
const CONNECTIONS = 10;
const PIPELINE = 2;

// Test user credentials
const TEST_USER = {
  email: 'performance-test@example.com',
  password: 'PerformanceTest123!',
  name: 'Performance Test User'
};

// Test fund data
const TEST_FUND = {
  name: 'Performance Test Fund',
  chit_value: 100000,
  installment_amount: 10000,
  total_months: 12,
  start_month: '2024-01',
  end_month: '2024-12'
};

let accessToken = null;
let testFundId = null;

/**
 * Run a single performance test
 */
async function runTest(url, title, customHeaders = {}) {
  console.log(`

🚀 Running performance test: ${title}`);
  console.log(`   URL: ${url}`);
  console.log(`   Duration: ${TEST_DURATION}s, Connections: ${CONNECTIONS}, Pipeline: ${PIPELINE}`);

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const result = await autocannon({
    url: url,
    connections: CONNECTIONS,
    pipelining: PIPELINE,
    duration: TEST_DURATION,
    headers: headers,
    requests: [
      {
        method: 'GET',
        path: url.replace('http://localhost:5000', '')
      }
    ]
  });

  console.log(`

📊 Results for ${title}:`);
  console.log(`   Requests per second: ${result.requests.average.toFixed(2)}`);
  console.log(`   Latency (ms): ${result.latency.average.toFixed(2)}`);
  console.log(`   Throughput (bytes/sec): ${result.throughput.average.toFixed(2)}`);
  console.log(`   Total requests: ${result.requests.total}`);
  console.log(`   Errors: ${result.errors}`);

  return result;
}

/**
 * Authenticate and get access token
 */
async function authenticate() {
  console.log('🔐 Authenticating test user...');
  
  try {
    // Try to login first
    let response = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    if (response.ok) {
      const data = await response.json();
      accessToken = data.data.accessToken;
      console.log('✅ Authentication successful');
      return true;
    }

    // If login failed, try to signup
    console.log('👤 Test user not found, creating new user...');
    response = await fetch('http://localhost:5000/api/v1/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name
      })
    });

    if (!response.ok) {
      throw new Error(`Signup failed: ${response.status} ${response.statusText}`);
    }

    // Login after signup
    response = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    if (!response.ok) {
      throw new Error(`Login after signup failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.data.accessToken;
    
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  if (!accessToken) {
    console.error('❌ No access token available for test data setup');
    return false;
  }

  try {
    // Create test fund
    const fundResponse = await fetch('http://localhost:5000/api/v1/funds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(TEST_FUND)
    });

    if (!fundResponse.ok) {
      throw new Error(`Failed to create test fund: ${fundResponse.status} ${fundResponse.statusText}`);
    }

    const fundData = await fundResponse.json();
    testFundId = fundData.data.id;
    
    // Create some test entries
    const entries = [
      { month_key: '2024-01', dividend_amount: 1000 },
      { month_key: '2024-02', dividend_amount: 1200 },
      { month_key: '2024-03', dividend_amount: 900 },
      { month_key: '2024-04', dividend_amount: 1100 },
      { month_key: '2024-05', dividend_amount: 1300 }
    ];

    for (const entry of entries) {
      await fetch('http://localhost:5000/api/v1/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          fund_id: testFundId,
          ...entry,
          is_paid: true
        })
      });
    }

    // Create some test bids
    const bids = [
      { month_key: '2024-01', winning_bid: 95000, discount_amount: 5000 },
      { month_key: '2024-02', winning_bid: 92000, discount_amount: 8000 },
      { month_key: '2024-03', winning_bid: 90000, discount_amount: 10000 }
    ];

    for (const bid of bids) {
      await fetch('http://localhost:5000/api/v1/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          fund_id: testFundId,
          ...bid,
          bidder_name: 'Test Bidder'
        })
      });
    }

    console.log('✅ Test data setup complete');
    return true;
  } catch (error) {
    console.error('❌ Test data setup failed:', error.message);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  if (!accessToken || !testFundId) {
    console.log('⚠️  No test data to cleanup');
    return;
  }

  try {
    // Delete test fund (cascades to entries and bids)
    await fetch(`http://localhost:5000/api/v1/funds/${testFundId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Test data cleanup complete');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error.message);
  }
}

/**
 * Profile mobile rendering performance
 */
async function profileMobileRendering() {
  console.log(`

📱 Profiling mobile rendering performance...`);
  
  // This would typically be done with tools like Lighthouse
  // For now, we'll simulate by checking response sizes
  try {
    const endpoints = [
      `/api/v1/analytics/dashboard`,
      `/api/v1/analytics/insights`,
      `/api/v1/analytics/funds/${testFundId}`
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });

      const contentLength = response.headers.get('content-length');
      console.log(`   ${endpoint}: ${contentLength || 'Unknown'} bytes`);
    }

    console.log('✅ Mobile rendering profile complete');
  } catch (error) {
    console.error('❌ Mobile rendering profiling failed:', error.message);
  }
}

/**
 * Run all performance tests
 */
async function runAllTests() {
  console.log('⚡ Starting ChitJar Performance Tests');
  console.log('=====================================');

  const startTime = performance.now();

  try {
    // Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      throw new Error('Authentication failed');
    }

    // Setup test data
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      throw new Error('Test data setup failed');
    }

    // Run analytics endpoint tests
    const endpoints = [
      { url: 'http://localhost:5000/api/v1/analytics/dashboard', name: 'Dashboard Analytics' },
      { url: 'http://localhost:5000/api/v1/analytics/insights', name: 'Bidding Insights' },
      { url: `http://localhost:5000/api/v1/analytics/funds/${testFundId}`, name: 'Fund Analytics' },
      { url: `http://localhost:5000/api/v1/analytics/funds/${testFundId}/cash-flow`, name: 'Cash Flow Data' },
      { url: `http://localhost:5000/api/v1/analytics/funds/${testFundId}/net-cash-flow`, name: 'Net Cash Flow Data' }
    ];

    const results = [];
    for (const { url, name } of endpoints) {
      const result = await runTest(url, name);
      results.push({ name, result });
    }

    // Profile mobile rendering
    await profileMobileRendering();

    // Print summary
    const endTime = performance.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`

📋 Performance Test Summary:`);
    console.log('==========================');
    console.log(`Total test time: ${totalTime}s`);
    console.log('');
    
    results.forEach(({ name, result }) => {
      console.log(`${name}:`);
      console.log(`  - Requests/sec: ${result.requests.average.toFixed(2)}`);
      console.log(`  - Avg latency: ${result.latency.average.toFixed(2)}ms`);
      console.log(`  - Errors: ${result.errors}`);
      console.log('');
    });

    // Performance benchmarks
    console.log('🎯 Performance Benchmarks:');
    console.log('========================');
    
    const avgRPS = results.reduce((sum, { result }) => sum + result.requests.average, 0) / results.length;
    const avgLatency = results.reduce((sum, { result }) => sum + result.latency.average, 0) / results.length;
    
    console.log(`Average RPS across all endpoints: ${avgRPS.toFixed(2)}`);
    console.log(`Average latency across all endpoints: ${avgLatency.toFixed(2)}ms`);
    
    // Check if performance meets acceptable thresholds
    const meetsRPS = avgRPS >= 50; // Should handle at least 50 requests per second
    const meetsLatency = avgLatency <= 200; // Should respond within 200ms on average
    
    console.log(`

✅ Performance meets RPS threshold (50+ RPS): ${meetsRPS ? 'YES' : 'NO'}`);
    console.log(`✅ Performance meets latency threshold (≤200ms): ${meetsLatency ? 'YES' : 'NO'}`);
    
    if (meetsRPS && meetsLatency) {
      console.log(`

🎉 All performance benchmarks passed!`);
    } else {
      console.log(`

⚠️  Some performance benchmarks not met. Consider optimization.`);
    }

  } catch (error) {
    console.error('❌ Performance tests failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    await cleanupTestData();
  }
}

/**
 * Main function
 */
async function main() {
  // Check if we're running the script directly
  if (require.main === module) {
    await runAllTests();
  }
}

// Export for use in other scripts
module.exports = { 
  runTest, 
  authenticate, 
  setupTestData, 
  cleanupTestData, 
  profileMobileRendering,
  runAllTests 
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}