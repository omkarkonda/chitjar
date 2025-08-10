#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ChitJar development environment...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error('❌ Node.js 18+ is required. Current version:', nodeVersion);
  process.exit(1);
}
console.log(`✅ Node.js version: ${nodeVersion}`);

// Install root dependencies
console.log('\n📦 Installing root dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Root dependencies installed');
} catch (error) {
  console.error('❌ Failed to install root dependencies');
  process.exit(1);
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
  execSync('cd backend && npm install', { stdio: 'inherit' });
  console.log('✅ Backend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  execSync('cd frontend && npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Setup database
console.log('\n🗄️  Setting up database...');
try {
  execSync('cd backend && npm run setup', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to setup database');
  console.log('💡 Make sure PostgreSQL is installed and running');
}

// Setup environment configuration
console.log('\n🔍 Setting up environment configuration...');
try {
  execSync('cd backend && npm run setup', { stdio: 'inherit' });
  console.log('✅ Environment configuration setup complete');
} catch (error) {
  console.log('⚠️  Environment configuration setup failed');
  console.log('💡 You may need to manually create the .env file');
}

console.log('\n🎉 Development environment setup complete!');
console.log('\nNext steps:');
console.log('1. Update DATABASE_URL in backend/.env with your PostgreSQL credentials');
console.log('2. Start the development server: npm run dev');
console.log('3. Backend will be available at: http://localhost:5000');
console.log('4. Frontend will be available at: http://localhost:3000');
console.log('\nAvailable commands:');
console.log('  npm run dev              - Start both backend and frontend');
console.log('  npm run dev:backend      - Start backend only');
console.log('  npm run dev:frontend     - Start frontend only');
console.log('  npm run test             - Run all tests');
console.log('  npm run lint             - Run linting');
console.log('  npm run format           - Format code');
