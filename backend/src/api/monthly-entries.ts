/**
 * Monthly Entries API Routes
 * 
 * This module implements CRUD operations for monthly entries with per-user authorization
 * and row-level ownership enforcement through fund ownership.
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
import {
  monthlyEntryCreationSchema,
  monthlyEntryUpdateSchema,
  monthlyEntryListQuerySchema,
  uuidSchema
} from '../lib/validation';
import {
  authenticateToken
} from '../lib/auth-middleware';
import { query, transaction } from '../lib/db';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ============================================================================
// Validation Schemas
// ============================================================================

const uuidParamSchema = z.object({
  id: uuidSchema
});

const fundIdParamSchema = z.object({
  fundId: uuidSchema
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user owns the fund
 */
async function checkFundOwnership(userId: string, fundId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM funds WHERE id = $1 AND user_id = $2',
    [fundId, userId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Get monthly entries with user filtering through fund ownership
 */
async function getUserMonthlyEntries(userId: string, filters: any = {}): Promise<any[]> {
  const { page = 1, limit = 20, fund_id, month_key, is_paid } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE f.user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (fund_id) {
    whereClause += ` AND me.fund_id = $${paramIndex}`;
    params.push(fund_id);
    paramIndex++;
  }
  
  if (month_key) {
    whereClause += ` AND me.month_key = $${paramIndex}`;
    params.push(month_key);
    paramIndex++;
  }
  
  if (typeof is_paid === 'boolean') {
    whereClause += ` AND me.is_paid = $${paramIndex}`;
    params.push(is_paid);
    paramIndex++;
  }
  
  const result = await query(`
    SELECT 
      me.id, me.fund_id, me.month_key, me.dividend_amount, 
      me.prize_money, me.is_paid, me.notes, me.created_at, me.updated_at,
      f.name as fund_name, f.chit_value, f.installment_amount
    FROM monthly_entries me
    JOIN funds f ON me.fund_id = f.id
    ${whereClause}
    ORDER BY me.month_key DESC, f.name ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);
  
  return result.rows;
}

/**
 * Get monthly entry by ID with user ownership check through fund
 */
async function getUserMonthlyEntryById(userId: string, entryId: string): Promise<any> {
  const result = await query(`
    SELECT 
      me.id, me.fund_id, me.month_key, me.dividend_amount, 
      me.prize_money, me.is_paid, me.notes, me.created_at, me.updated_at,
      f.name as fund_name, f.chit_value, f.installment_amount
    FROM monthly_entries me
    JOIN funds f ON me.fund_id = f.id
    WHERE me.id = $1 AND f.user_id = $2
  `, [entryId, userId]);
  
  return result.rows[0] || null;
}

/**
 * Count monthly entries with user filtering through fund ownership
 */
async function countUserMonthlyEntries(userId: string, filters: any = {}): Promise<number> {
  let whereClause = 'WHERE f.user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (filters.fund_id) {
    whereClause += ` AND me.fund_id = $${paramIndex}`;
    params.push(filters.fund_id);
    paramIndex++;
  }
  
  if (filters.month_key) {
    whereClause += ` AND me.month_key = $${paramIndex}`;
    params.push(filters.month_key);
    paramIndex++;
  }
  
  if (typeof filters.is_paid === 'boolean') {
    whereClause += ` AND me.is_paid = $${paramIndex}`;
    params.push(filters.is_paid);
    paramIndex++;
  }
  
  const result = await query(`
    SELECT COUNT(*) as count
    FROM monthly_entries me
    JOIN funds f ON me.fund_id = f.id
    ${whereClause}
  `, params);
  
  return parseInt(result.rows[0].count);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Create a new monthly entry
 * POST /api/v1/entries
 */
async function createMonthlyEntryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fund_id, month_key, dividend_amount, prize_money, is_paid, notes } = req.body;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Check fund ownership
    const ownsFund = await checkFundOwnership(userId, fund_id);
    if (!ownsFund) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Access denied: fund not found or insufficient permissions'
      );
      return;
    }
    
    // Create entry in transaction
    const result = await transaction(async (client) => {
      const entryResult = await client.query(`
        INSERT INTO monthly_entries (
          fund_id, month_key, dividend_amount, prize_money, is_paid, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, fund_id, month_key, dividend_amount, prize_money, 
                  is_paid, notes, created_at, updated_at
      `, [fund_id, month_key, dividend_amount || 0, prize_money || 0, is_paid || false, notes || null]);
      
      return entryResult.rows[0];
    });
    
    sendSuccess(res, result, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all monthly entries for the authenticated user
 * GET /api/v1/entries
 */
async function getMonthlyEntriesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    const { page, limit, fund_id, month_key, is_paid } = req.query as any;
    
    const filters = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      fund_id: fund_id || undefined,
      month_key: month_key || undefined,
      is_paid: is_paid !== undefined ? is_paid === 'true' : undefined
    };
    
    // Ensure limit is within bounds
    filters.limit = Math.min(filters.limit, 100);
    
    const entries = await getUserMonthlyEntries(userId, filters);
    const total = await countUserMonthlyEntries(userId, filters);
    const totalPages = Math.ceil(total / filters.limit);
    
    sendSuccess(res, {
      entries,
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
 * Get monthly entries for a specific fund
 * GET /api/v1/funds/:fundId/entries
 */
async function getFundMonthlyEntriesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fundId } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    const { page, limit, month_key, is_paid } = req.query as any;
    
    if (!fundId) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Fund ID is required'
      );
      return;
    }
    
    // Check fund ownership
    const ownsFund = await checkFundOwnership(userId, fundId);
    if (!ownsFund) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Access denied: fund not found or insufficient permissions'
      );
      return;
    }
    
    const filters = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      fund_id: fundId,
      month_key: month_key || undefined,
      is_paid: is_paid !== undefined ? is_paid === 'true' : undefined
    };
    
    // Ensure limit is within bounds
    filters.limit = Math.min(filters.limit, 100);
    
    const entries = await getUserMonthlyEntries(userId, filters);
    const total = await countUserMonthlyEntries(userId, filters);
    const totalPages = Math.ceil(total / filters.limit);
    
    sendSuccess(res, {
      entries,
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
 * Get a specific monthly entry by ID
 * GET /api/v1/entries/:id
 */
async function getMonthlyEntryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    if (!id) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Entry ID is required'
      );
      return;
    }
    
    // Check ownership through fund
    const entry = await getUserMonthlyEntryById(userId, id);
    
    if (!entry) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Monthly entry not found'
      );
      return;
    }
    
    sendSuccess(res, entry);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a monthly entry
 * PUT /api/v1/entries/:id
 */
async function updateMonthlyEntryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    const updateData = req.body;
    
    if (!id) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Entry ID is required'
      );
      return;
    }
    
    // Check ownership through fund
    const entry = await getUserMonthlyEntryById(userId, id);
    
    if (!entry) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Monthly entry not found'
      );
      return;
    }
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let index = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== 'id' && key !== 'fund_id') {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }
    
    if (fields.length === 0) {
      sendSuccess(res, entry);
      return;
    }
    
    values.push(id); // Add entry ID for WHERE clause
    
    const result = await query(`
      UPDATE monthly_entries 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${index}
      AND fund_id IN (SELECT id FROM funds WHERE user_id = $${index + 1})
      RETURNING id, fund_id, month_key, dividend_amount, prize_money, 
                is_paid, notes, created_at, updated_at
    `, [...values, userId]);
    
    if (result.rowCount === 0) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Monthly entry not found'
      );
      return;
    }
    
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a monthly entry
 * DELETE /api/v1/entries/:id
 */
async function deleteMonthlyEntryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    if (!id) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Entry ID is required'
      );
      return;
    }
    
    // Check ownership through fund
    const entry = await getUserMonthlyEntryById(userId, id);
    
    if (!entry) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Monthly entry not found'
      );
      return;
    }
    
    // Delete entry
    const result = await query(`
      DELETE FROM monthly_entries 
      WHERE id = $1 
      AND fund_id IN (SELECT id FROM funds WHERE user_id = $2)
    `, [id, userId]);
    
    if (result.rowCount === 0) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Monthly entry not found'
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

// POST /api/v1/entries
router.post('/', validateBody(monthlyEntryCreationSchema), createMonthlyEntryHandler);

// GET /api/v1/entries
router.get('/', validateQuery(monthlyEntryListQuerySchema), getMonthlyEntriesHandler);

// GET /api/v1/entries/:id
router.get('/:id', validateParams(uuidParamSchema), getMonthlyEntryHandler);

// PUT /api/v1/entries/:id
router.put('/:id', validateParams(uuidParamSchema), validateBody(monthlyEntryUpdateSchema), updateMonthlyEntryHandler);

// DELETE /api/v1/entries/:id
router.delete('/:id', validateParams(uuidParamSchema), deleteMonthlyEntryHandler);

// GET /api/v1/funds/:fundId/entries
router.get('/funds/:fundId/entries', validateParams(fundIdParamSchema), validateQuery(monthlyEntryListQuerySchema), getFundMonthlyEntriesHandler);

export { router };
export default router;