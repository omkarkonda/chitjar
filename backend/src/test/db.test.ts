import { initializeDatabase, query, healthCheck, schema, closePool } from '../lib/db';

describe('Database Setup', () => {
  beforeAll(async () => {
    // Initialize database connection
    initializeDatabase();
  });

  afterAll(async () => {
    // Close database connection
    await closePool();
  });

  describe('Connection', () => {
    it('should connect to the database successfully', async () => {
      const isHealthy = await healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should execute a simple query', async () => {
      const result = await query('SELECT 1 as test_value');
      expect(result.rows[0].test_value).toBe(1);
    });
  });

  describe('Schema', () => {
    it('should have the required tables', async () => {
      const tables = await schema.getTables();
      
      // Check for required tables
      expect(tables).toContain('users');
      expect(tables).toContain('funds');
      expect(tables).toContain('monthly_entries');
      expect(tables).toContain('bids');
      expect(tables).toContain('settings');
      expect(tables).toContain('schema_migrations');
    });

    it('should have correct users table structure', async () => {
      const columns = await schema.getTableColumns('users');
      const columnNames = columns.map(col => col.column_name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password_hash');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should have correct funds table structure', async () => {
      const columns = await schema.getTableColumns('funds');
      const columnNames = columns.map(col => col.column_name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('chit_value');
      expect(columnNames).toContain('installment_amount');
      expect(columnNames).toContain('total_months');
      expect(columnNames).toContain('start_month');
      expect(columnNames).toContain('end_month');
    });

    it('should have foreign key constraints', async () => {
      const foreignKeys = await schema.getForeignKeys('funds');
      
      // Check that funds.user_id references users.id
      const userForeignKey = foreignKeys.find(fk => 
        fk.column_name === 'user_id' && fk.foreign_table_name === 'users'
      );
      expect(userForeignKey).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should enforce month_key format validation', async () => {
      // This test assumes we have a fund to work with
      // In a real scenario, you'd create test data first
      
      // Test valid month_key format
      const validResult = await query(`
        SELECT validate_month_key('2024-01') as is_valid
      `);
      expect(validResult.rows[0].is_valid).toBe(true);
      
      // Test invalid month_key format
      const invalidResult = await query(`
        SELECT validate_month_key('2024-13') as is_valid
      `);
      expect(invalidResult.rows[0].is_valid).toBe(false);
    });
  });
});
