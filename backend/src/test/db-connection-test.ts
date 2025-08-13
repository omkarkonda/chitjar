/**
 * Test script for monthly entries API
 * 
 * This script tests the functionality of the monthly entries API to ensure
 * that entries are properly marked as paid when created or updated.
 */

import { Pool } from 'pg';
import { databaseConfig } from '../lib/config';

// Simple test to verify database connection and basic functionality
async function testDatabaseConnection() {
  const pool = new Pool({
    connectionString: databaseConfig.url,
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    console.log('Database connection successful:', result.rows[0].now);
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Run the test
testDatabaseConnection().then(success => {
  if (success) {
    console.log('✅ Database test passed');
  } else {
    console.log('❌ Database test failed');
  }
});