import request from 'supertest';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../src/lib/config';
import { query, initializeDatabase, closePool } from '../../src/lib/db';
import { app } from '../../src/index';

// Test user data
const testUser = {
  email: 'bidstest@example.com',
  password: 'TestPass123',
  name: 'Bids Test User'
};

// Test fund data
const testFund = {
  name: 'Test Fund for Bids',
  chit_value: 100000,
  installment_amount: 10000,
  total_months: 12,
  start_month: '2024-01',
  end_month: '2024-12'
};

describe('Bids API', () => {
  let testUserId: string;
  let accessToken: string;
  let testFundId: string;
  let testBidId: string;

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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
       RETURNING id`,
      [uuidv4(), testUserId, testFund.name, testFund.chit_value, testFund.installment_amount, testFund.total_months, testFund.start_month, testFund.end_month]
    );
    testFundId = fundResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testBidId) {
      await query('DELETE FROM bids WHERE id = $1', [testBidId]);
    }
    if (testFundId) {
      await query('DELETE FROM funds WHERE id = $1', [testFundId]);
    }
    if (testUserId) {
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    
    // Close database connection
    await closePool();
  });

  describe('POST /api/v1/bids', () => {
    test('should create a new bid successfully', async () => {
      const testBid = {
        fund_id: testFundId,
        month_key: '2024-01',
        winning_bid: 95000,
        discount_amount: 5000,
        bidder_name: 'Test Bidder',
        notes: 'Test bid entry'
      };

      const response = await request(app)
        .post('/api/v1/bids')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testBid)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.fund_id).toBe(testFundId);
      expect(response.body.data.month_key).toBe(testBid.month_key);
      expect(response.body.data.winning_bid).toBe(testBid.winning_bid.toString() + ".00");
      expect(response.body.data.discount_amount).toBe(testBid.discount_amount.toString() + ".00");
      expect(response.body.data.bidder_name).toBe(testBid.bidder_name);
      expect(response.body.data.notes).toBe(testBid.notes);
      
      // Store bid ID for later tests
      testBidId = response.body.data.id;
    });

    test('should reject bid creation with invalid data', async () => {
      const invalidBid = {
        fund_id: testFundId,
        month_key: '2024-13', // Invalid month
        winning_bid: 150000, // Exceeds chit_value
        discount_amount: -1000 // Negative value
      };

      const response = await request(app)
        .post('/api/v1/bids')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidBid)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should reject bid creation for fund belonging to another user', async () => {
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
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: otherUserEmail,
          password: 'OtherPass123'
        })
        .expect(200);
      
      // Create a fund for the other user
      const otherFundResult = await query(
        `INSERT INTO funds (id, user_id, name, chit_value, installment_amount, total_months, start_month, end_month, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING id`,
        [uuidv4(), otherUserId, 'Other User Fund', 100000, 10000, 12, '2024-01', '2024-12', true]
      );
      const otherFundId = otherFundResult.rows[0].id;
      
      const testBid = {
        fund_id: otherFundId,
        month_key: '2024-01',
        winning_bid: 95000,
        discount_amount: 5000
      };

      const response = await request(app)
        .post('/api/v1/bids')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testBid)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      // Clean up
      await query('DELETE FROM funds WHERE id = $1', [otherFundId]);
      await query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });
  });

  describe('GET /api/v1/bids', () => {
    test('should retrieve list of bids for user', async () => {
      const response = await request(app)
        .get('/api/v1/bids')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bids)).toBe(true);
      expect(response.body.data.bids.length).toBeGreaterThan(0);
      
      const bid = response.body.data.bids[0];
      expect(bid).toHaveProperty('id');
      expect(bid).toHaveProperty('fund_id');
      expect(bid).toHaveProperty('month_key');
      expect(bid).toHaveProperty('winning_bid');
      expect(bid).toHaveProperty('discount_amount');
      expect(bid).toHaveProperty('bidder_name');
    });
  });

  describe('GET /api/v1/bids/:id', () => {
    test('should retrieve specific bid details', async () => {
      const response = await request(app)
        .get(`/api/v1/bids/${testBidId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testBidId);
      expect(response.body.data.fund_id).toBe(testFundId);
      expect(response.body.data.month_key).toBe('2024-01');
      expect(response.body.data.winning_bid).toBe((95000).toString() + ".00");
      expect(response.body.data.discount_amount).toBe((5000).toString() + ".00");
      expect(response.body.data.bidder_name).toBe('Test Bidder');
    });

    test('should reject request for non-existent bid', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .get(`/api/v1/bids/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/v1/bids/:id', () => {
    test('should update bid successfully', async () => {
      const updatedBid = {
        winning_bid: 92000,
        discount_amount: 8000,
        notes: 'Updated bid notes'
      };

      const response = await request(app)
        .put(`/api/v1/bids/${testBidId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedBid)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.winning_bid).toBe(updatedBid.winning_bid.toString() + ".00");
      expect(response.body.data.discount_amount).toBe(updatedBid.discount_amount.toString() + ".00");
      expect(response.body.data.notes).toBe(updatedBid.notes);
    });

    test('should reject update with invalid data', async () => {
      const invalidUpdate = {
        winning_bid: 150000 // Exceeds chit_value
      };

      const response = await request(app)
        .put(`/api/v1/bids/${testBidId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/v1/bids/:id', () => {
    test('should delete bid successfully', async () => {
      // Create another bid to delete
      const bidToDelete = {
        fund_id: testFundId,
        month_key: '2024-02',
        winning_bid: 90000,
        discount_amount: 10000
      };

      const createResponse = await request(app)
        .post('/api/v1/bids')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bidToDelete)
        .expect(201);

      const bidToDeleteId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/v1/bids/${bidToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify bid is deleted
      await request(app)
        .get(`/api/v1/bids/${bidToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/funds/:fundId/bids', () => {
    test('should retrieve bids for specific fund', async () => {
      const response = await request(app)
        .get(`/api/v1/funds/${testFundId}/bids`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bids)).toBe(true);
      
      // Should contain our test bid
      const bidIds = response.body.data.bids.map((bid: any) => bid.id);
      expect(bidIds).toContain(testBidId);
    });
  });
});