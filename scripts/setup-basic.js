#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ChitJar basic development environment...\n');

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

// Create .env files BEFORE installing backend dependencies
console.log('\n📝 Creating environment files...');
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
const backendEnvExamplePath = path.join(__dirname, '..', 'backend', 'env.example');

if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendEnvExamplePath)) {
  fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
  console.log('✅ Backend .env file created from template');
} else if (fs.existsSync(backendEnvPath)) {
  console.log('✅ Backend .env file already exists');
} else {
  console.log('⚠️  Could not create backend .env file - template not found');
}

// Create frontend .env file
const frontendEnvPath = path.join(__dirname, '..', 'frontend', '.env');
const frontendEnvExamplePath = path.join(__dirname, '..', 'frontend', 'env.example');

if (!fs.existsSync(frontendEnvPath) && fs.existsSync(frontendEnvExamplePath)) {
  fs.copyFileSync(frontendEnvExamplePath, frontendEnvPath);
  console.log('✅ Frontend .env file created from template');
} else if (fs.existsSync(frontendEnvPath)) {
  console.log('✅ Frontend .env file already exists');
} else {
  console.log('⚠️  Could not create frontend .env file - template not found');
}

// Install backend dependencies (now that .env exists)
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

console.log('\n🎉 Basic development environment setup complete!');
console.log('\nNext steps:');
console.log('1. Install PostgreSQL if not already installed');
console.log('2. Start PostgreSQL service');
console.log('3. Run: npm run setup:db (to setup databases)');
console.log('4. Update DATABASE_URL in backend/.env with your PostgreSQL credentials');
console.log('5. Run: cd backend && npm run generate-secrets (to generate secure secrets)');
console.log('6. Start the development server: npm run dev');
console.log('\nAvailable commands:');
console.log('  npm run dev              - Start both backend and frontend');
console.log('  npm run dev:backend      - Start backend only');
console.log('  npm run dev:frontend     - Start frontend only');
console.log('  npm run test             - Run all tests');
console.log('  npm run lint             - Run linting');
console.log('  npm run format           - Format code');
console.log('  npm run setup:db         - Setup databases (requires PostgreSQL)');
console.log('  npm run check-env        - Check environment configuration');
