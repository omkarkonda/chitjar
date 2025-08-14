import fs from 'fs';
import path from 'path';
import { query, transaction, schema } from './db';

// Migration table to track applied migrations
const MIGRATION_TABLE = 'schema_migrations';

/**
 * Initialize the migration system
 */
async function initializeMigrationTable(): Promise<void> {
  const tableExists = await schema.tableExists(MIGRATION_TABLE);
  
  if (!tableExists) {
    await query(`
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
async function getAppliedMigrations(): Promise<string[]> {
  const result = await query(`SELECT version FROM ${MIGRATION_TABLE} ORDER BY version`);
  return result.rows.map(row => row.version);
}

/**
 * Apply a single migration
 */
async function applyMigration(version: string, name: string, sql: string): Promise<void> {
  await transaction(async (client) => {
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration as applied
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (version, name) VALUES ($1, $2)`,
      [version, name]
    );
  });
  
  console.log(`Applied migration: ${version} - ${name}`);
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...');
    
    // Initialize migration table
    await initializeMigrationTable();
    
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Define migrations in order
    const migrations = [
      {
        version: '001',
        name: 'Initial Schema',
        sql: fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
      },
      {
        version: '002',
        name: 'Add recalculation triggers',
        sql: fs.readFileSync(path.join(__dirname, '..', 'migrations', '002-add-recalculation-triggers.sql'), 'utf8')
      }
      // Future migrations can be added here
      // {
      //   version: '003',
      //   name: 'Add new feature',
      //   sql: 'ALTER TABLE funds ADD COLUMN new_column VARCHAR(255);'
      // }
    ];
    
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
  }
}

/**
 * Rollback the last migration
 */
export async function rollbackLastMigration(): Promise<void> {
  try {
    console.log('Rolling back last migration...');
    
    // Get the last applied migration
    const result = await query(
      `SELECT version, name FROM ${MIGRATION_TABLE} ORDER BY id DESC LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0];
    console.log(`Rolling back: ${lastMigration.version} - ${lastMigration.name}`);
    
    // Note: This is a simplified rollback. In a production system,
    // you would need to define rollback SQL for each migration
    await transaction(async (client) => {
      // Remove the migration record
      await client.query(
        `DELETE FROM ${MIGRATION_TABLE} WHERE version = $1`,
        [lastMigration.version]
      );
    });
    
    console.log('Rollback completed');
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * Show migration status
 */
export async function showMigrationStatus(): Promise<void> {
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
  }
}

/**
 * Reset database (drop all tables and re-run migrations)
 * WARNING: This will delete all data!
 */
export async function resetDatabase(): Promise<void> {
  try {
    console.log('WARNING: This will delete all data!');
    console.log('Resetting database...');
    
    // Get all tables
    const tables = await schema.getTables();
    
    // Drop all tables except migration table
    const tablesToDrop = tables.filter(table => table !== MIGRATION_TABLE);
    
    if (tablesToDrop.length > 0) {
      await query(`DROP TABLE IF EXISTS ${tablesToDrop.join(', ')} CASCADE`);
      console.log(`Dropped tables: ${tablesToDrop.join(', ')}`);
    }
    
    // Re-run migrations
    await runMigrations();
    
    console.log('Database reset completed');
    
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'rollback':
      rollbackLastMigration()
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
      console.log('  rollback  - Rollback last migration');
      console.log('  status    - Show migration status');
      console.log('  reset     - Reset database (WARNING: deletes all data)');
      process.exit(1);
  }
}
