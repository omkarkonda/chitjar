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
import { sanitizeString, sanitizeQueryString, sanitizeParamString } from '../lib/sanitization';
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
import {
  dataModificationRateLimiter,
  readOnlyRateLimiter,
  methodRateLimiter
} from '../lib/rate-limiting';

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
 * @param userId - The ID of the user
 * @param fundId - The ID of the fund to check ownership for
 * @returns Promise that resolves to true if user owns the fund, false otherwise
 */
async function checkFundOwnership(userId: string, fundId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM funds WHERE id = $1 AND user_id = $2',
    [fundId, userId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Check if user owns the fund and get fund details
 * @param userId - The ID of the user
 * @param fundId - The ID of the fund to get details for
 * @returns Promise that resolves to fund details object or null if not found
 */
async function getFundDetails(userId: string, fundId: string): Promise<any> {
  const result = await query(
    'SELECT chit_value, start_month, end_month, early_exit_month FROM funds WHERE id = $1 AND user_id = $2',
    [fundId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Get monthly entries with user filtering through fund ownership
 * @param userId - The ID of the user to get entries for
 * @param filters - Optional filters for pagination and filtering (page, limit, fund_id, month_key, is_paid)
 * @returns Promise that resolves to an array of monthly entry objects
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
 * @param userId - The ID of the user who should own the entry's fund
 * @param entryId - The ID of the monthly entry to retrieve
 * @returns Promise that resolves to the entry object or null if not found
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
 * @param userId - The ID of the user to count entries for
 * @param filters - Optional filters for counting (fund_id, month_key, is_paid)
 * @returns Promise that resolves to the count of matching entries
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

/**
 * Get all expected months for a fund, including missing ones
 * Handles mid-year starts, early exits, and identifies zero/missing months
 * @param userId - The ID of the user who owns the fund
 * @param fundId - The ID of the fund to get month series for
 * @returns Promise that resolves to an array of month objects with entry details
 */
async function getFundMonthSeriesWithEntries(userId: string, fundId: string): Promise<any[]> {
  // First get the fund details
  const fundResult = await query(`
    SELECT 
      f.start_month, f.end_month, f.early_exit_month,
      f.chit_value, f.installment_amount
    FROM funds f
    WHERE f.id = $1 AND f.user_id = $2
  `, [fundId, userId]);
  
  if (fundResult.rowCount === 0) {
    return [];
  }
  
  const fund = fundResult.rows[0];
  
  // Generate expected month series
  const { generateFundMonthSeries } = await import('../lib/validation-utils');
  const expectedMonths = generateFundMonthSeries(
    fund.start_month,
    fund.end_month,
    fund.early_exit_month
  );
  
  // Get existing entries for this fund
  const entriesResult = await query(`
    SELECT 
      me.month_key, me.dividend_amount, me.prize_money, 
      me.is_paid, me.notes, me.created_at, me.updated_at
    FROM monthly_entries me
    WHERE me.fund_id = $1
    ORDER BY me.month_key
  `, [fundId]);
  
  const existingEntries = entriesResult.rows;
  const entryMap = new Map(existingEntries.map(entry => [entry.month_key, entry]));
  
  // Combine expected months with existing entries
  const result = expectedMonths.map(monthKey => {
    const entry = entryMap.get(monthKey);
    
    return {
      month_key: monthKey,
      dividend_amount: entry ? entry.dividend_amount : 0,
      prize_money: entry ? entry.prize_money : 0,
      is_paid: entry ? entry.is_paid : false,
      notes: entry ? entry.notes : null,
      created_at: entry ? entry.created_at : null,
      updated_at: entry ? entry.updated_at : null,
      is_missing: !entry, // Flag to indicate if this is a missing month
      fund_id: fundId,
      chit_value: fund.chit_value,
      installment_amount: fund.installment_amount
    };
  });
  
  return result;
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Create a new monthly entry
 * POST /api/v1/entries
 * Note: When saving a monthly entry, the month is automatically marked as "paid"
 * as per requirement AC2 in the PRD.
 * @param req - Express request object containing entry data in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function createMonthlyEntryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fund_id, month_key, dividend_amount, prize_money, notes } = req.body;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get fund details
    const fund = await getFundDetails(userId, fund_id);
    if (!fund) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Access denied: fund not found or insufficient permissions'
      );
      return;
    }
    
    // Validate that prize_money doesn't exceed chit_value
    if (prize_money > fund.chit_value) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        `Prize money (${prize_money}) cannot exceed chit value (${fund.chit_value})`
      );
      return;
    }
    
    // Create entry in transaction
    // Note: is_paid is always set to true when creating an entry (AC2)
    const result = await transaction(async (client) => {
      const entryResult = await client.query(`
        INSERT INTO monthly_entries (
          fund_id, month_key, dividend_amount, prize_money, is_paid, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, fund_id, month_key, dividend_amount, prize_money, 
                  is_paid, notes, created_at, updated_at
      `, [fund_id, month_key, dividend_amount || 0, prize_money || 0, true, notes || null]);
      
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
 * @param req - Express request object with optional query parameters for filtering
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
 * @param req - Express request object containing fundId in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
 * @param req - Express request object containing entry ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
 * Note: When updating a monthly entry, the month is automatically marked as "paid"
 * as per requirement AC2 in the PRD.
 * @param req - Express request object containing entry ID in params and update data in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
    
    // If prize_money is being updated, validate it against the fund's chit_value
    if (updateData.prize_money !== undefined && updateData.prize_money > entry.chit_value) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        `Prize money (${updateData.prize_money}) cannot exceed chit value (${entry.chit_value})`
      );
      return;
    }
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let index = 1;
    
    // Process update data, but always set is_paid to true (AC2)
    const processedUpdateData = { ...updateData, is_paid: true };
    
    for (const [key, value] of Object.entries(processedUpdateData)) {
      if (value !== undefined && key !== 'id' && key !== 'fund_id') {
        fields.push(`${key} = ${index}`);
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
      WHERE id = ${index}
      AND fund_id IN (SELECT id FROM funds WHERE user_id = ${index + 1})
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
 * @param req - Express request object containing entry ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
router.post('/',
  methodRateLimiter({ post: dataModificationRateLimiter }),
  sanitizeString('notes'),
  validateBody(monthlyEntryCreationSchema),
  createMonthlyEntryHandler
);

// GET /api/v1/entries
router.get('/',
  methodRateLimiter({ get: readOnlyRateLimiter }),
  sanitizeQueryString('month_key'),
  validateQuery(monthlyEntryListQuerySchema),
  getMonthlyEntriesHandler
);

// GET /api/v1/entries/:id
router.get('/:id',
  methodRateLimiter({ get: readOnlyRateLimiter }),
  sanitizeParamString('id'),
  validateParams(uuidParamSchema),
  getMonthlyEntryHandler
);

// PUT /api/v1/entries/:id
router.put('/:id',
  methodRateLimiter({ put: dataModificationRateLimiter }),
  sanitizeParamString('id'),
  sanitizeString('notes'),
  validateParams(uuidParamSchema),
  validateBody(monthlyEntryUpdateSchema),
  updateMonthlyEntryHandler
);

// DELETE /api/v1/entries/:id
router.delete('/:id',
  methodRateLimiter({ delete: dataModificationRateLimiter }),
  sanitizeParamString('id'),
  validateParams(uuidParamSchema),
  deleteMonthlyEntryHandler
);

// GET /api/v1/funds/:fundId/entries
router.get('/funds/:fundId/entries',
  methodRateLimiter({ get: readOnlyRateLimiter }),
  sanitizeParamString('fundId'),
  sanitizeQueryString('month_key'),
  validateParams(fundIdParamSchema),
  validateQuery(monthlyEntryListQuerySchema),
  getFundMonthlyEntriesHandler
);

export { router };
export { getFundMonthSeriesWithEntries };
export default router;