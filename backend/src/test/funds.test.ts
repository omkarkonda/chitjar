import request from 'supertest';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../src/lib/config';
import { query, initializeDatabase, closePool } from '../../src/lib/db';
import { app } from '../../src/index';

// Test user data
const testUser = {
  email: 'fundstest@example.com',
  password: 'TestPass123',
  name: 'Funds Test User'
};

// Test fund data
const testFund = {
  name: 'Test Monthly Fund',
  chit_value: 100000,
  installment_amount: 10000,
  total_months: 12,
  start_month: '2024-01',
  end_month: '2024-12',
  notes: 'Test fund for unit testing'
};

describe('Funds API', () => {
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
    const fundResponse = await request(app)
      .post('/api/v1/funds')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(testFund)
      .expect(201);
    
    testFundId = fundResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testFundId) {
      await query('DELETE FROM monthly_entries WHERE fund_id = $1', [testFundId]);
      await query('DELETE FROM bids WHERE fund_id = $1', [testFundId]);
      await query('DELETE FROM funds WHERE id = $1', [testFundId]);
    }
    if (testUserId) {
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    
    // Close database connection
    await closePool();
  });

  describe('POST /api/v1/funds', () => {
    test('should create a new fund successfully', async () => {
      const response = await request(app)
        .post('/api/v1/funds')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testFund)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(testFund.name);
      expect(response.body.data.chit_value).toBe(testFund.chit_value.toString() + ".00");
      expect(response.body.data.installment_amount).toBe(testFund.installment_amount.toString() + ".00");
      expect(response.body.data.total_months).toBe(testFund.total_months);
      expect(response.body.data.start_month).toBe(testFund.start_month);
      expect(response.body.data.end_month).toBe(testFund.end_month);
      expect(response.body.data.notes).toBe(testFund.notes);
      expect(response.body.data.user_id).toBe(testUserId);
      
      // Store fund ID for later tests
      testFundId = response.body.data.id;
    });

    test('should reject fund creation without required fields', async () => {
      const invalidFund = {
        name: '', // Empty name
        chit_value: -1000, // Negative value
        installment_amount: 0, // Zero value
      };

      const response = await request(app)
        .post('/api/v1/funds')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidFund)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should reject fund creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/funds')
        .send(testFund)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/funds', () => {
    test('should retrieve list of funds for user', async () => {
      const response = await request(app)
        .get('/api/v1/funds')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.funds)).toBe(true);
      expect(response.body.data.funds.length).toBeGreaterThan(0);
      
      const fund = response.body.data.funds[0];
      expect(fund).toHaveProperty('id');
      expect(fund).toHaveProperty('name');
      expect(fund).toHaveProperty('chit_value');
      expect(fund).toHaveProperty('installment_amount');
      expect(fund).toHaveProperty('total_months');
      expect(fund).toHaveProperty('start_month');
      expect(fund).toHaveProperty('end_month');
    });

    test('should reject fund list retrieval without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/funds')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/funds/:id', () => {
    test('should retrieve specific fund details', async () => {
      const response = await request(app)
        .get(`/api/v1/funds/${testFundId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testFundId);
      expect(response.body.data.name).toBe(testFund.name);
      expect(response.body.data.chit_value).toBe(testFund.chit_value.toString() + ".00");
      expect(response.body.data.installment_amount).toBe(testFund.installment_amount.toString() + ".00");
      expect(response.body.data.total_months).toBe(testFund.total_months);
      expect(response.body.data.start_month).toBe(testFund.start_month);
      expect(response.body.data.end_month).toBe(testFund.end_month);
      expect(response.body.data.notes).toBe(testFund.notes);
    });

    test('should reject request for non-existent fund', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .get(`/api/v1/funds/${fakeId}`)
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
        .get(`/api/v1/funds/${testFundId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      // Clean up other user
      await query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });
  });

  describe('PUT /api/v1/funds/:id', () => {
    test('should update fund successfully', async () => {
      const updatedFund = {
        name: 'Updated Test Fund',
        chit_value: 150000,
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/v1/funds/${testFundId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedFund)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updatedFund.name);
      expect(response.body.data.chit_value).toBe(updatedFund.chit_value.toString() + ".00");
      expect(response.body.data.notes).toBe(updatedFund.notes);
      expect(response.body.data.installment_amount).toBe(testFund.installment_amount.toString() + ".00"); // Should remain unchanged
    });

    test('should reject update with invalid data', async () => {
      const invalidUpdate = {
        chit_value: -50000 // Negative value
      };

      const response = await request(app)
        .put(`/api/v1/funds/${testFundId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/v1/funds/:id', () => {
    test('should delete fund successfully', async () => {
      // Create another fund to delete (don't delete our main test fund yet)
      const fundToDelete = {
        name: 'Fund to Delete',
        chit_value: 50000,
        installment_amount: 5000,
        total_months: 10,
        start_month: '2024-01',
        end_month: '2024-10'
      };

      const createResponse = await request(app)
        .post('/api/v1/funds')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(fundToDelete)
        .expect(201);

      const fundToDeleteId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/v1/funds/${fundToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify fund is deleted
      await request(app)
        .get(`/api/v1/funds/${fundToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    test('should reject deletion of non-existent fund', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .delete(`/api/v1/funds/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});