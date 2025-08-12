/**
 * Funds API Routes
 * 
 * This module implements CRUD operations for funds with per-user authorization
 * and row-level ownership enforcement.
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
  validateBody,
  validateParams,
  validateQuery
} from '../lib/validation-utils';
import { sanitizeString, sanitizeQueryString, sanitizeParamString } from '../lib/sanitization';
import {
  fundCreationSchema,
  fundUpdateSchema,
  fundListQuerySchema,
  uuidSchema
} from '../lib/validation';
import {
  authenticateToken,
  
  
} from '../lib/auth-middleware';
import { query, transaction } from '../lib/db';
import {
  apiRateLimiter,
  dataModificationRateLimiter,
  readOnlyRateLimiter,
  methodRateLimiter
} from '../lib/rate-limiting';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply user ID injection middleware to all routes for automatic filtering


// ============================================================================
// Validation Schemas
// ============================================================================

const uuidParamSchema = z.object({
  id: uuidSchema
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get funds with user filtering
 */
async function getUserFunds(userId: string, filters: any = {}): Promise<any[]> {
  const { page = 1, limit = 20, is_active, search } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE f.user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (typeof is_active === 'boolean') {
    whereClause += ` AND f.is_active = $${paramIndex}`;
    params.push(is_active);
    paramIndex++;
  }
  
  if (search && typeof search === 'string') {
    whereClause += ` AND f.name ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  const result = await query(`
    SELECT 
      f.id, f.user_id, f.name, f.chit_value, f.installment_amount, 
      f.total_months, f.start_month, f.end_month, f.is_active, 
      f.early_exit_month, f.notes, f.created_at, f.updated_at,
      COUNT(me.id) as entries_count,
      COUNT(b.id) as bids_count
    FROM funds f
    LEFT JOIN monthly_entries me ON f.id = me.fund_id
    LEFT JOIN bids b ON f.id = b.fund_id
    ${whereClause}
    GROUP BY f.id
    ORDER BY f.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);
  
  return result.rows;
}

/**
 * Get fund by ID with user ownership check
 */
async function getUserFundById(userId: string, fundId: string): Promise<any> {
  const result = await query(`
    SELECT 
      f.id, f.user_id, f.name, f.chit_value, f.installment_amount, 
      f.total_months, f.start_month, f.end_month, f.is_active, 
      f.early_exit_month, f.notes, f.created_at, f.updated_at
    FROM funds f
    WHERE f.id = $1 AND f.user_id = $2
  `, [fundId, userId]);
  
  return result.rows[0] || null;
}

/**
 * Count funds with user filtering
 */
async function countUserFunds(userId: string, filters: any = {}): Promise<number> {
  let whereClause = 'WHERE f.user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (typeof filters.is_active === 'boolean') {
    whereClause += ` AND f.is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }
  
  if (filters.search && typeof filters.search === 'string') {
    whereClause += ` AND f.name ILIKE $${paramIndex}`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  const result = await query(`
    SELECT COUNT(*) as count
    FROM funds f
    ${whereClause}
  `, params);
  
  return parseInt(result.rows[0].count);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Create a new fund
 * POST /api/v1/funds
 */
async function createFundHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, chit_value, installment_amount, total_months, start_month, end_month, notes } = req.body;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.userId;
    
    // Create fund in transaction
    const result = await transaction(async (client) => {
      const fundResult = await client.query(`
        INSERT INTO funds (
          user_id, name, chit_value, installment_amount, 
          total_months, start_month, end_month, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, user_id, name, chit_value, installment_amount, 
                  total_months, start_month, end_month, is_active, 
                  early_exit_month, notes, created_at, updated_at
      `, [userId, name, chit_value, installment_amount, total_months, start_month, end_month, notes || null]);
      
      return fundResult.rows[0];
    });
    
    sendSuccess(res, result, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all funds for the authenticated user
 * GET /api/v1/funds
 */
async function getFundsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.userId;
    const { page, limit, is_active, search } = req.query as any;
    
    const filters = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      search: search || undefined
    };
    
    // Ensure limit is within bounds
    filters.limit = Math.min(filters.limit, 100);
    
    const funds = await getUserFunds(userId, filters);
    const total = await countUserFunds(userId, filters);
    const totalPages = Math.ceil(total / filters.limit);
    
    sendSuccess(res, {
      funds,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific fund by ID
 * GET /api/v1/funds/:id
 */
async function getFundHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.userId;
    
    // Check ownership
    const fund = await getUserFundById(userId, id!);
    
    if (!fund) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Fund not found'
      );
      return;
    }
    
    sendSuccess(res, fund);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a fund
 * PUT /api/v1/funds/:id
 */
async function updateFundHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.userId;
    const updateData = req.body;
    
    // Check ownership
    const fund = await getUserFundById(userId, id!);
    
    if (!fund) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Fund not found'
      );
      return;
    }
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let index = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== 'id' && key !== 'user_id') {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }
    
    if (fields.length === 0) {
      sendSuccess(res, fund);
      return;
    }
    
    values.push(id, userId); // Add fund ID and user ID for WHERE clause
    
    const result = await query(`
      UPDATE funds 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${index} AND user_id = $${index + 1}
      RETURNING id, user_id, name, chit_value, installment_amount, 
                total_months, start_month, end_month, is_active, 
                early_exit_month, notes, created_at, updated_at
    `, values);
    
    if (result.rowCount === 0) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Fund not found'
      );
      return;
    }
    
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a fund
 * DELETE /api/v1/funds/:id
 */
async function deleteFundHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.userId;
    
    // Check ownership
    const fund = await getUserFundById(userId, id!);
    
    if (!fund) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Fund not found'
      );
      return;
    }
    
    // Delete fund (cascades to entries and bids)
    const result = await query(
      'DELETE FROM funds WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (result.rowCount === 0) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Fund not found'
      );
      return;
    }
    
    sendSuccess(res, null, HTTP_STATUS.NO_CONTENT);
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Route Definitions
// ============================================================================

// Apply method-based rate limiting to all routes
router.use(methodRateLimiter({
  get: readOnlyRateLimiter,
  post: dataModificationRateLimiter,
  put: dataModificationRateLimiter,
  delete: dataModificationRateLimiter
}));

// POST /api/v1/funds
router.post('/',
  sanitizeString('name'),
  sanitizeString('notes'),
  validateBody(fundCreationSchema),
  createFundHandler
);

// GET /api/v1/funds
router.get('/',
  sanitizeQueryString('search'),
  validateQuery(fundListQuerySchema),
  getFundsHandler
);

// GET /api/v1/funds/:id
router.get('/:id',
  sanitizeParamString('id'),
  validateParams(uuidParamSchema),
  getFundHandler
);

// PUT /api/v1/funds/:id
router.put('/:id',
  sanitizeParamString('id'),
  sanitizeString('name'),
  sanitizeString('notes'),
  validateParams(uuidParamSchema),
  validateBody(fundUpdateSchema),
  updateFundHandler
);

// DELETE /api/v1/funds/:id
router.delete('/:id',
  sanitizeParamString('id'),
  validateParams(uuidParamSchema),
  deleteFundHandler
);

export { router };
export default router;