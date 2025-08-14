import { Router } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../lib/config';
import { query, transaction } from '../lib/db';
import { 
  userRegistrationSchema, 
  userLoginSchema 
} from '../lib/validation';
import { validateBody } from '../lib/validation-utils';
import { authenticateToken } from '../lib/auth-utils';
import {
  sendSuccess,
  sendError,
  HTTP_STATUS,
  ERROR_CODES,
  ApiError
} from '../lib/api-conventions';

const router = Router();

// ============================================================================  
// Helper Functions
// ============================================================================

/**
 * Generate JWT tokens for a user
 */
function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { userId },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

/**
 * Hash a password
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptRounds);
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================  
// Routes
// ============================================================================

/**
 * POST /api/v1/auth/signup
 * User registration endpoint
 * @param req - Express request object containing user registration data in body
 * @param res - Express response object
 * @returns Promise that resolves when response is sent
 */
router.post('/signup', 
  validateBody(userRegistrationSchema),
  async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existingUser.rows.length > 0) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.RESOURCE_ALREADY_EXISTS,
          'User with this email already exists'
        );
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create user in database
      const result = await transaction(async (client) => {
        const userResult = await client.query(
          `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id, email, name, created_at, updated_at`,
          [uuidv4(), email.toLowerCase(), passwordHash, name]
        );
        
        // Update last login timestamp
        await client.query(
          'UPDATE users SET last_login_at = NOW() WHERE id = $1',
          [userResult.rows[0].id]
        );
        
        return userResult.rows[0];
      });
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(result.id);
      
      // Send success response
      sendSuccess(res, {
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          created_at: result.created_at,
          updated_at: result.updated_at
        },
        accessToken,
        refreshToken
      }, HTTP_STATUS.CREATED);
      
    } catch (error) {
      if (error instanceof ApiError) {
        sendError(res, error.statusCode, error.code, error.message, error.details);
      } else {
        console.error('Signup error:', error);
        sendError(
          res,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_ERROR,
          'An error occurred during signup'
        );
      }
    }
  }
);

/**
 * POST /api/v1/auth/login
 * User login endpoint
 * @param req - Express request object containing user credentials in body
 * @param res - Express response object
 * @returns Promise that resolves when response is sent
 */
router.post('/login',
  validateBody(userLoginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user by email
      const result = await query(
        `SELECT id, email, password_hash, name, is_active, created_at, updated_at, last_login_at
         FROM users 
         WHERE email = $1`,
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        throw new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
          'Invalid email or password'
        );
      }
      
      const user = result.rows[0];
      
      // Check if user is active
      if (!user.is_active) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN,
          'Account is deactivated'
        );
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
          'Invalid email or password'
        );
      }
      
      // Update last login timestamp
      await query(
        'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);
      
      // Send success response
      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login_at: user.last_login_at
        },
        accessToken,
        refreshToken
      });
      
    } catch (error) {
      if (error instanceof ApiError) {
        sendError(res, error.statusCode, error.code, error.message, error.details);
      } else {
        console.error('Login error:', error);
        sendError(
          res,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_ERROR,
          'An error occurred during login'
        );
      }
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * User logout endpoint
 * @param req - Express request object
 * @param res - Express response object
 * @returns Promise that resolves when response is sent
 */
router.post('/logout', authenticateToken, async (_req, res) => {
  try {
    // In a real implementation, you might want to invalidate the token
    // by adding it to a blacklist or using a different token strategy
    // For now, we'll just send a success response
    
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      'An error occurred during logout'
    );
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token endpoint
 * @param req - Express request object containing refresh token in body
 * @param res - Express response object
 * @returns Promise that resolves when response is sent
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (!refreshToken) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        'Refresh token is required'
      );
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string };
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    
    // Send success response
    sendSuccess(res, {
      accessToken,
      refreshToken: newRefreshToken
    });
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token expired'
      );
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
        'Invalid refresh token'
      );
    } else if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.code, error.message, error.details);
    } else {
      console.error('Token refresh error:', error);
      sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred during token refresh'
      );
    }
  }
});

/**
 * GET /api/v1/auth/profile
 * Get user profile endpoint
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // req.user is set by authenticateToken middleware
    const userId = (req as any).user.userId;
    
    const result = await query(
      `SELECT id, email, name, is_active, created_at, updated_at, last_login_at
       FROM users 
       WHERE id = $1 AND is_active = true`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'User not found'
      );
    }
    
    sendSuccess(res, {
      user: result.rows[0]
    });
    
  } catch (error) {
    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.code, error.message, error.details);
    } else {
      console.error('Profile fetch error:', error);
      sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while fetching profile'
      );
    }
  }
});

/**
 * PUT /api/v1/auth/profile
 * Update user profile endpoint
 * @param req - Express request object containing profile update data in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // req.user is set by authenticateToken middleware
    const userId = (req as any).user.userId;
    const { name } = req.body;
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Name is required'
      );
    }
    
    if (name.trim().length > 255) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Name must be less than 255 characters'
      );
    }
    
    const result = await query(
      `UPDATE users 
       SET name = $1, updated_at = NOW()
       WHERE id = $2 AND is_active = true
       RETURNING id, email, name, is_active, created_at, updated_at, last_login_at`,
      [name.trim(), userId]
    );
    
    if (result.rows.length === 0) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'User not found'
      );
    }
    
    sendSuccess(res, {
      user: result.rows[0]
    });
    
  } catch (error) {
    if (error instanceof ApiError) {
      sendError(res, error.statusCode, error.code, error.message, error.details);
    } else {
      console.error('Profile update error:', error);
      sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while updating profile'
      );
    }
  }
});

export { router };