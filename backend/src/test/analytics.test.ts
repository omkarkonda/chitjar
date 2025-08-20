import request from 'supertest';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../src/lib/config';
import { query, initializeDatabase, closePool } from '../../src/lib/db';
import { app } from '../../src/index';

// Test user data
const testUser = {
  email: 'analyticstest@example.com',
  password: 'TestPass123',
  name: 'Analytics Test User'
};

// Test fund data
const testFund = {
  name: 'Test Fund for Analytics',
  chit_value: 100000,
  installment_amount: 10000,
  total_months: 12,
  start_month: '2024-01',
  end_month: '2024-12'
};

describe('Analytics API', () => {
  let testUserId: string;
  let accessToken: string;
  let testFundId: string;

  beforeAll(async () => {
    // Initialize database
    initializeDatabase();
    
    // Create a test user
    const passwordHash = await bcrypt.hash(testUser.password, config.bcryptRounds);
    const userResult = await query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), true)
       RETURNING id`,
      [uuidv4(), testUser.email.toLowerCase(), passwordHash, testUser.name]
    );
    testUserId = userResult.rows[0].id;
    
    // Login to get access token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);
    
    accessToken = loginResponse.body.data.accessToken;
    
    // Create a test fund
    const fundResult = await query(
      `INSERT INTO funds (id, user_id, name, chit_value, installment_amount, total_months, start_month, end_month, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [uuidv4(), testUserId, testFund.name, testFund.chit_value, testFund.installment_amount, testFund.total_months, testFund.start_month, testFund.end_month, true]
    );
    testFundId = fundResult.rows[0].id;
    
    // Create some test entries for the fund
    await query(
      `INSERT INTO monthly_entries (id, fund_id, month_key, dividend_amount, prize_money, is_paid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [uuidv4(), testFundId, '2024-01', 1000, 0, true]
    );
    
    await query(
      `INSERT INTO monthly_entries (id, fund_id, month_key, dividend_amount, prize_money, is_paid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [uuidv4(), testFundId, '2024-02', 1200, 25000, true]
    );
    
    // Create some test bids for the fund
    await query(
      `INSERT INTO bids (id, fund_id, month_key, winning_bid, discount_amount, bidder_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [uuidv4(), testFundId, '2024-01', 95000, 5000, 'Bidder 1']
    );
    
    await query(
      `INSERT INTO bids (id, fund_id, month_key, winning_bid, discount_amount, bidder_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [uuidv4(), testFundId, '2024-02', 92000, 8000, 'Bidder 2']
    );
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM bids WHERE fund_id = $1', [testFundId]);
    await query('DELETE FROM monthly_entries WHERE fund_id = $1', [testFundId]);
    await query('DELETE FROM funds WHERE id = $1', [testFundId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
    
    // Close database connection
    await closePool();
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    test('should retrieve dashboard analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_profit');
      expect(response.body.data).toHaveProperty('funds');
      expect(response.body.data).toHaveProperty('fund_count');
      
      // Should have at least one fund
      expect(response.body.data.fund_count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(response.body.data.funds)).toBe(true);
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/funds/:id', () => {
    test('should retrieve fund-specific analytics', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/funds/${testFundId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('xirr');
      expect(response.body.data).toHaveProperty('cash_flow_series');
      expect(response.body.data).toHaveProperty('net_cash_flow_series');
      
      // Check that we have cash flow data
      expect(Array.isArray(response.body.data.cash_flow_series)).toBe(true);
      expect(Array.isArray(response.body.data.net_cash_flow_series)).toBe(true);
      
      // Should have data for our test entries
      expect(response.body.data.cash_flow_series.length).toBeGreaterThanOrEqual(2);
    });

    test('should reject request for non-existent fund', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .get(`/api/v1/analytics/funds/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should reject request for fund belonging to another user', async () => {
      // Create another user
      const otherUserEmail = `other-${uuidv4()}@example.com`;
      const passwordHash = await bcrypt.hash('OtherPass123', config.bcryptRounds);
      const otherUserResult = await query(
        `INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active)
         VALUES ($1, $2, $3, $4, NOW(), NOW(), true)
         RETURNING id`,
        [uuidv4(), otherUserEmail, passwordHash, 'Other User']
      );
      const otherUserId = otherUserResult.rows[0].id;
      
      // Login to get access token for other user
      const otherUserLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: otherUserEmail,
          password: 'OtherPass123'
        })
        .expect(200);
      
      const otherUserToken = otherUserLoginResponse.body.data.accessToken;

      const response = await request(app)
        .get(`/api/v1/analytics/funds/${testFundId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      // Clean up other user
      await query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });
  });

  describe('POST /api/v1/analytics/funds/:id/fd-comparison', () => {
    test('should compare fund XIRR with FD rate', async () => {
      const comparisonData = {
        fd_rate: 7.5
      };

      const response = await request(app)
        .post(`/api/v1/analytics/funds/${testFundId}/fd-comparison`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(comparisonData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fund_xirr');
      expect(response.body.data).toHaveProperty('fd_rate');
      expect(response.body.data).toHaveProperty('difference');
      expect(response.body.data).toHaveProperty('is_fund_better');
    });

    test('should reject request with invalid FD rate', async () => {
      const invalidData = {
        fd_rate: -5 // Negative rate
      };

      const response = await request(app)
        .post(`/api/v1/analytics/funds/${testFundId}/fd-comparison`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/insights', () => {
    test('should retrieve strategic bidding insights', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('insights');
      expect(Array.isArray(response.body.data.insights)).toBe(true);
      
      // Should contain our test fund
      const fundIds = response.body.data.insights.map((insight: any) => insight.fund_id);
      expect(fundIds).toContain(testFundId);
    });
  });
});