/**
 * Authentication API Routes
 * 
 * This module implements user authentication endpoints including:
 * - User signup with email/password
 * - User login with email/password
 * - User logout
 * - Token refresh
 * - User profile retrieval
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  sendSuccess, 
  sendError, 
  HTTP_STATUS, 
  ERROR_CODES 
} from '../lib/api-conventions';
import { 
  validateBody
} from '../lib/validation-utils';
import {
  verifyRefreshToken,
  createTokenResponse
} from '../lib/auth-middleware';
import { query } from '../lib/db';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * User registration schema
 */
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one digit'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').trim()
});

/**
 * User login schema
 */
export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Token refresh schema
 */
export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if email is already registered
 */
async function isEmailRegistered(email: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Create a new user
 */
async function createUser(email: string, password: string, name: string): Promise<any> {
  // Hash password using the secrets utility
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Insert user
  const result = await query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at, updated_at, last_login_at, is_active`,
    [email.toLowerCase(), hashedPassword, name]
  );
  
  return result.rows[0];
}

/**
 * Get user by email
 */
async function getUserByEmail(email: string): Promise<any> {
  const result = await query(
    `SELECT id, email, password_hash, name, created_at, updated_at, last_login_at, is_active
     FROM users 
     WHERE email = $1`,
    [email.toLowerCase()]
  );
  
  return result.rows[0] || null;
}

/**
 * Update user's last login timestamp
 */
async function updateLastLogin(userId: string): Promise<void> {
  await query(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * User signup endpoint
 * POST /api/v1/auth/signup
 */
export async function signupHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body;
    
    // Check if email is already registered
    const emailExists = await isEmailRegistered(email);
    if (emailExists) {
      sendError(
        res,
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.VALIDATION_ERROR,
        'Email already registered',
        { field: 'email' }
      );
      return;
    }
    
    // Create user
    const user = await createUser(email, password, name);
    
    // Update last login
    await updateLastLogin(user.id);
    
    // Send success response
    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
        is_active: user.is_active
      },
      ...createTokenResponse(user.id, user.email)
    }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
}

/**
 * User login endpoint
 * POST /api/v1/auth/login
 */
export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    
    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid email or password'
      );
      return;
    }
    
    // Verify password
    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid email or password'
      );
      return;
    }
    
    // Check if user is active
    if (!user.is_active) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.VALIDATION_ERROR,
        'Account is disabled'
      );
      return;
    }
    
    // Update last login
    await updateLastLogin(user.id);
    
    // Send success response
    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
        is_active: user.is_active
      },
      ...createTokenResponse(user.id, user.email)
    }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
}

/**
 * User logout endpoint
 * POST /api/v1/auth/logout
 */
export async function logoutHandler(_req: Request, res: Response): Promise<void> {
  // For JWT tokens, logout is primarily handled on the client side
  // by removing the tokens from storage.
  // We could implement token blacklisting here if needed.
  
  sendSuccess(res, null, HTTP_STATUS.OK);
}

/**
 * Token refresh endpoint
 * POST /api/v1/auth/refresh
 */
export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    
    // Verify refresh token
    const decoded: any = verifyRefreshToken(refreshToken);
    
    // Get user
    const user = await getUserByEmail(decoded.email || decoded.userId);
    if (!user) {
      sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid refresh token'
      );
      return;
    }
    
    // Check if user is active
    if (!user.is_active) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.VALIDATION_ERROR,
        'Account is disabled'
      );
      return;
    }
    
    // Send success response
    sendSuccess(res, {
      ...createTokenResponse(user.id, user.email)
    }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
}

/**
 * Get user profile endpoint
 * GET /api/v1/auth/profile
 */
export async function profileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get authenticated user from request (added by authenticateToken middleware)
    const authenticatedReq = req as any;
    const user = authenticatedReq.user;
    
    // Send success response
    sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      is_active: user.is_active
    }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Router Setup
// ============================================================================

export const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', validateBody(userRegistrationSchema), signupHandler);

// POST /api/v1/auth/login
router.post('/login', validateBody(userLoginSchema), loginHandler);

// POST /api/v1/auth/logout
router.post('/logout', logoutHandler);

// POST /api/v1/auth/refresh
router.post