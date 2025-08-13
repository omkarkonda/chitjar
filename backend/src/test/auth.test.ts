import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../src/lib/config';
import { query, initializeDatabase, closePool } from '../../src/lib/db';
import { app } from '../../src/index';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'TestPass123',
  name: 'Test User'
};

// Invalid user data
const invalidUser = {
  email: 'invalid-email',
  password: 'short',
  name: ''
};

describe('Authentication and Security', () => {
  let testUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Initialize database
    initializeDatabase();
    
    // Create a test user
    const passwordHash = await bcrypt.hash(testUser.password, config.bcryptRounds);
    const result = await query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), true)
       RETURNING id`,
      [uuidv4(), testUser.email.toLowerCase(), passwordHash, testUser.name]
    );
    testUserId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    
    // Close database connection
    await closePool();
  });

  describe('POST /api/v1/auth/signup - User Registration', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'NewPass123',
        name: 'New User'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(newUser.email.toLowerCase());
      expect(response.body.data.user.name).toBe(newUser.name);

      // Clean up created user
      const userId = response.body.data.user.id;
      await query('DELETE FROM users WHERE id = $1', [userId]);
    });

    it('should reject registration with invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with existing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: testUser.email, // Existing email
          password: 'AnotherPass123',
          name: 'Another User'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_ALREADY_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login - User Login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testUser.email.toLowerCase());
      
      // Store tokens for subsequent tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/logout - User Logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });
  });

  describe('POST /api/v1/auth/refresh - Token Refresh', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject refresh with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });

    it('should reject refresh with expired refresh token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUserId },
        config.jwtRefreshSecret,
        { expiresIn: '0s' } // Expired immediately
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('GET /api/v1/auth/profile - Get User Profile', () => {
    // Re-login to get fresh tokens for these tests
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);
      
      accessToken = response.body.data.accessToken;
    });

    it('should get user profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(response.body.data.user.name).toBe(testUser.name);
    });

    it('should reject profile request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject profile request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });

    it('should reject profile request with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUserId },
        config.jwtSecret,
        { expiresIn: '0s' } // Expired immediately
      );

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('PUT /api/v1/auth/profile - Update User Profile', () => {
    it('should update user profile successfully with valid token', async () => {
      const updatedName = 'Updated Test User';
      
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: updatedName })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updatedName);
    });

    it('should reject profile update without token', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .send({ name: 'Another Update' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject profile update with invalid name', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' }) // Empty name
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });
  });
});