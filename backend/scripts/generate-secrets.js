#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating secure secrets for ChitJar...\n');

// Generate JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('✅ JWT Secret generated');

// Generate API key
const apiKey = crypto.randomBytes(32).toString('base64url');
console.log('✅ API Key generated');

// Generate database password (for local development)
const dbPassword = crypto.randomBytes(16).toString('base64url');
console.log('✅ Database password generated');

// Create secrets file
const secretsPath = path.join(__dirname, '..', 'secrets.json');
const secrets = {
  jwtSecret,
  apiKey,
  dbPassword,
  generatedAt: new Date().toISOString(),
  note: 'These are development secrets. Generate new ones for production.'
};

fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2));
console.log('✅ Secrets saved to backend/secrets.json');

// Update .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update JWT_SECRET
  if (envContent.includes('JWT_SECRET=')) {
    envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
  } else {
    envContent += `\nJWT_SECRET=${jwtSecret}`;
  }
  
  // Update DATABASE_URL with new password
  if (envContent.includes('DATABASE_URL=')) {
    const currentUrl = envContent.match(/DATABASE_URL=(.*)/)?.[1];
    if (currentUrl && currentUrl.includes('postgresql://')) {
      const newUrl = currentUrl.replace(/postgresql:\/\/[^:]+:[^@]+@/, `postgresql://postgres:${dbPassword}@`);
      envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${newUrl}`);
    }
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file with new secrets');
} else {
  console.log('⚠️  .env file not found. Please create it manually with:');
  console.log(`   JWT_SECRET=${jwtSecret}`);
  console.log(`   DATABASE_URL=postgresql://postgres:${dbPassword}@localhost:5432/chitjar_dev`);
}

console.log('\n🔐 Generated secrets:');
console.log(`   JWT Secret: ${jwtSecret.substring(0, 16)}...`);
console.log(`   API Key: ${apiKey.substring(0, 16)}...`);
console.log(`   DB Password: ${dbPassword.substring(0, 16)}...`);

console.log('\n⚠️  Security notes:');
console.log('   - Keep secrets.json secure and never commit it to version control');
console.log('   - Generate new secrets for production environments');
console.log('   - Use environment variables for production secrets');
console.log('   - Regularly rotate secrets in production');

// Add secrets.json to .gitignore if not already there
const gitignorePath = path.join(__dirname, '..', '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent.includes('secrets.json')) {
    fs.appendFileSync(gitignorePath, '\n# Generated secrets\nsecrets.json\n');
    console.log('✅ Added secrets.json to .gitignore');
  }
} else {
  fs.writeFileSync(gitignorePath, '# Generated secrets\nsecrets.json\n');
  console.log('✅ Created .gitignore with secrets.json');
}
