#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking ChitJar environment configuration...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found');
  console.log('💡 Run: node scripts/setup-db.js to create it from template');
  process.exit(1);
}

console.log('✅ .env file exists');

// Load and validate environment variables
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=');
    }
  }
});

// Check required variables
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV'
];

const missingVars = [];
const invalidVars = [];

requiredVars.forEach(varName => {
  if (!envVars[varName]) {
    missingVars.push(varName);
  } else if (varName === 'JWT_SECRET' && envVars[varName].length < 32) {
    invalidVars.push(`${varName} (must be at least 32 characters)`);
  } else if (varName === 'DATABASE_URL' && !envVars[varName].includes('postgresql://')) {
    invalidVars.push(`${varName} (must be a valid PostgreSQL URL)`);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
}

if (invalidVars.length > 0) {
  console.error('❌ Invalid environment variables:');
  invalidVars.forEach(varName => console.error(`   - ${varName}`));
}

if (missingVars.length === 0 && invalidVars.length === 0) {
  console.log('✅ All required environment variables are set and valid');
  
  // Show current configuration
  console.log('\n📋 Current configuration:');
  console.log(`   NODE_ENV: ${envVars.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${envVars.PORT || '5000'}`);
  console.log(`   DATABASE_URL: ${envVars.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   JWT_SECRET: ${envVars.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   CORS_ORIGIN: ${envVars.CORS_ORIGIN || 'http://localhost:3000'}`);
  
  console.log('\n🎉 Environment configuration is ready!');
} else {
  console.log('\n💡 Please fix the issues above and run this script again');
  process.exit(1);
}
