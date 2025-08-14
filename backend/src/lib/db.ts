import { Pool, PoolClient, QueryResult } from 'pg';
import { databaseConfig } from './config';

// Database connection pool
let pool: Pool | null = null;

/**
 * Initialize the database connection pool
 */
export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = databaseConfig.url;
  
  pool = new Pool({
    connectionString,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  return pool;
}

/**
 * Get the database pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

/**
 * Execute a query with parameters
 */
export async function query(
  text: string,
  params?: any[]
): Promise<QueryResult> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute a query within a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T> // eslint-disable-line no-unused-vars
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function executeQueries(queries: Array<{ text: string; params?: any[] }>): Promise<void> {
  await transaction(async (client) => {
    for (const { text, params } of queries) {
      await client.query(text, params);
    }
  });
}

/**
 * Check if the database connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health_check');
    return result.rows[0]?.health_check === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Database schema helpers
 */
export const schema = {
  /**
   * Get all tables in the database
   */
  async getTables(): Promise<string[]> {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  },

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0]?.exists || false;
  },

  /**
   * Get table columns
   */
  async getTableColumns(tableName: string): Promise<Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>> {
    const result = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows;
  },

  /**
   * Get foreign key constraints
   */
  async getForeignKeys(tableName: string): Promise<Array<{
    constraint_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
  }>> {
    const result = await query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = $1
    `, [tableName]);
    return result.rows;
  }
};

// Export types for use in other modules
export type { Pool, PoolClient, QueryResult };
