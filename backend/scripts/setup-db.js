#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ChitJar database...\n');

// Check if PostgreSQL is installed
try {
  execSync('psql --version', { stdio: 'pipe' });
  console.log('✅ PostgreSQL is installed');
} catch (error) {
  console.error('❌ PostgreSQL is not installed or not in PATH');
  console.error('Please install PostgreSQL and ensure psql is in your PATH');
  process.exit(1);
}

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from template');
    console.log('⚠️  Please update the DATABASE_URL in .env with your PostgreSQL credentials');
  } else {
    console.error('❌ env.example file not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Create databases
const databases = ['chitjar_dev', 'chitjar_test'];

databases.forEach(dbName => {
  try {
    console.log(`📊 Creating database: ${dbName}`);
    execSync(`createdb ${dbName}`, { stdio: 'pipe' });
    console.log(`✅ Database ${dbName} created successfully`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`ℹ️  Database ${dbName} already exists`);
    } else {
      console.log(`⚠️  Failed to create database ${dbName}: ${error.message}`);
      console.log('💡 Make sure PostgreSQL is running and you have the right permissions');
      console.log('💡 You can create databases manually later');
    }
  }
});

console.log('\n🎉 Database setup complete!');
console.log('\nNext steps:');
console.log('1. Update DATABASE_URL in backend/.env with your PostgreSQL credentials');
console.log('2. Run: npm run db:migrate (after implementing migrations)');
console.log('3. Run: npm run db:seed (after implementing seed data)');
console.log('4. Start the development server: npm run dev');
