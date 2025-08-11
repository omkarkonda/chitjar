#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? 'env.test' : '.env';
require('dotenv').config({ path: envFile });

// Database connection
const getDatabaseUrl = () => {
  if (process.env.NODE_ENV === 'test' && process.env.DATABASE_TEST_URL) {
    return process.env.DATABASE_TEST_URL;
  }
  return process.env.DATABASE_URL;
};

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Migration table to track applied migrations
const MIGRATION_TABLE = 'schema_migrations';

/**
 * Initialize the migration system
 */
async function initializeMigrationTable() {
  const tableExists = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )
  `, [MIGRATION_TABLE]);
  
  if (!tableExists.rows[0].exists) {
    await pool.query(`
      CREATE TABLE ${MIGRATION_TABLE} (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created migration tracking table');
  }
}

/**
 * Get all applied migrations
 */
async function getAppliedMigrations() {
  const result = await pool.query(`SELECT version FROM ${MIGRATION_TABLE} ORDER BY version`);
  return result.rows.map(row => row.version);
}

/**
 * Apply a single migration
 */
async function applyMigration(version, name, sql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration as applied
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (version, name) VALUES ($1, $2)`,
      [version, name]
    );
    
    await client.query('COMMIT');
    console.log(`Applied migration: ${version} - ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if a table exists in the current database
 */
async function tableExists(tableName) {
  const result = await pool.query(
    `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    )
    `,
    [tableName]
  );
  return result.rows[0]?.exists === true;
}

/**
 * Ensure the base schema is present (repair if needed).
 * Some environments may have an inconsistent migration table.
 */
async function ensureBaseSchema(schemaSQL) {
  const hasUsers = await tableExists('users');
  if (!hasUsers) {
    console.log('Base schema missing. Applying initial schema for repair...');
    await pool.query(schemaSQL);
    console.log('Base schema applied.');
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Initialize migration table
    await initializeMigrationTable();
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Ensure base schema exists before applying additional migrations
    await ensureBaseSchema(schemaSQL);

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Define migrations in order (dynamic)
    const migrations = [];
    migrations.push({
      version: '001',
      name: 'Initial Schema',
      sql: schemaSQL,
    });

    // Load additional .sql migrations from src/lib/migrations
    const migrationsDir = path.join(__dirname, '..', 'src', 'lib', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        const fullPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(fullPath, 'utf8');
        const versionMatch = file.match(/^(\d+)_/);
        const version = versionMatch ? versionMatch[1] : path.parse(file).name;
        const name = file
          .replace(/^\d+_/, '')
          .replace(/\.sql$/, '')
          .replace(/[-_]/g, ' ')
          || 'Migration';
        // Skip 001 if someone added it to the folder
        if (version === '001') {
          continue;
        }
        migrations.push({ version, name, sql });
      }
    }
    
    // Apply pending migrations
    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        await applyMigration(migration.version, migration.name, migration.sql);
      } else {
        console.log(`Migration ${migration.version} already applied`);
      }
    }
    
    console.log('All migrations completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Show migration status
 */
async function showMigrationStatus() {
  try {
    const appliedMigrations = await getAppliedMigrations();
    
    console.log('Migration Status:');
    console.log('================');
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations applied');
    } else {
      console.log('Applied migrations:');
      appliedMigrations.forEach(version => {
        console.log(`  - ${version}`);
      });
    }
    
  } catch (error) {
    console.error('Failed to show migration status:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Reset database (drop all tables and re-run migrations)
 * WARNING: This will delete all data!
 */
async function resetDatabase() {
  try {
    console.log('WARNING: This will delete all data!');
    console.log('Resetting database...');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != $1
    `, [MIGRATION_TABLE]);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    if (tables.length > 0) {
      await pool.query(`DROP TABLE IF EXISTS ${tables.join(', ')} CASCADE`);
      console.log(`Dropped tables: ${tables.join(', ')}`);
    }
    
    // Re-run migrations
    await runMigrations();
    
    console.log('Database reset completed');
    
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    runMigrations()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
    
  case 'status':
    showMigrationStatus()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
    
  case 'reset':
    resetDatabase()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
    
  default:
    console.log('Usage:');
    console.log('  migrate   - Run pending migrations');
    console.log('  status    - Show migration status');
    console.log('  reset     - Reset database (WARNING: deletes all data)');
    process.exit(1);
}
