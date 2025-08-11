/**
 * Bids API Routes
 * 
 * This module implements CRUD operations for bids with per-user authorization
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
  bidCreationSchema,
  bidUpdateSchema,
  bidListQuerySchema,
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
 * Get bids with user filtering through fund ownership
 */
async function getUserBids(userId: string, filters: any = {}): Promise<any[]> {
  const { page = 1, limit = 20, fund_id, month_key } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE f.user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (fund_id) {
    whereClause += ` AND b.fund_id = $${paramIndex}`;
    params.push(fund_id);
    paramIndex++;
  }
  
  if (month_key) {
    whereClause += ` AND b.month_key = $${paramIndex}`;
    params.push(month_key);
    paramIndex++;
  }
  
  const result = await query(`
    SELECT 
      b.id, b.fund_id, b.month_key, b.winning_bid, b.discount_amount,
      b.bidder_name, b.notes, b.created_at, b.updated_at,
      f.name as fund_name, f.chit_value, f.installment_amount
    FROM bids b
    JOIN funds f ON b.fund_id = f.id
    ${whereClause}
    ORDER BY b.month_key DESC, f.name ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);
  
  return result.rows;
}

/**
 * Get bid by ID with user ownership check through fund
 */
async function getUserBidById(userId: string, bidId: string): Promise<any> {
  const result = await query(`
    SELECT 
      b.id, b.fund_id, b.month_key, b.winning_bid, b.discount_amount,
      b.bidder_name, b.notes, b.created_at, b.updated_at,
      f.name as fund_name, f.chit_value, f.installment_amount
    FROM bids b
    JOIN funds f ON b.fund_id = f.id
    WHERE b.id = $1 AND f.user_id = $2
  `, [bidId, userId]);
  
  return result.rows[0] || null;
}

/**
 * Count bids with user filtering through fund ownership
 */
async function countUserBids(userId: string, filters: any = {}): Promise<number> {
  let whereClause = 'WHERE f.user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (filters.fund_id) {
    whereClause += ` AND b.fund_id = $${paramIndex}`;
    params.push(filters.fund_id);
    paramIndex++;
  }
  
  if (filters.month_key) {
    whereClause += ` AND b.month_key = $${paramIndex}`;
    params.push(filters.month_key);
    paramIndex++;
  }
  
  const result = await query(`
    SELECT COUNT(*) as count
    FROM bids b
    JOIN funds f ON b.fund_id = f.id
    ${whereClause}
  `, params);
  
  return parseInt(result.rows[0].count);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Create a new bid
 * POST /api/v1/bids
 */
async function createBidHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fund_id, month_key, winning_bid, discount_amount, bidder_name, notes } = req.body;
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
    
    // Create bid in transaction
    const result = await transaction(async (client) => {
      const bidResult = await client.query(`
        INSERT INTO bids (
          fund_id, month_key, winning_bid, discount_amount, bidder_name, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, fund_id, month_key, winning_bid, discount_amount,
                  bidder_name, notes, created_at, updated_at
      `, [fund_id, month_key, winning_bid, discount_amount, bidder_name || null, notes || null]);
      
      return bidResult.rows[0];
    });
    
    sendSuccess(res, result, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all bids for the authenticated user
 * GET /api/v1/bids
 */
async function getBidsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    const { page, limit, fund_id, month_key } = req.query as any;
    
    const filters = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      fund_id: fund_id || undefined,
      month_key: month_key || undefined
    };
    
    // Ensure limit is within bounds
    filters.limit = Math.min(filters.limit, 100);
    
    const bids = await getUserBids(userId, filters);
    const total = await countUserBids(userId, filters);
    const totalPages = Math.ceil(total / filters.limit);
    
    sendSuccess(res, {
      bids,
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
 * Get bids for a specific fund
 * GET /api/v1/funds/:fundId/bids
 */
async function getFundBidsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fundId } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    const { page, limit, month_key } = req.query as any;
    
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
      month_key: month_key || undefined
    };
    
    // Ensure limit is within bounds
    filters.limit = Math.min(filters.limit, 100);
    
    const bids = await getUserBids(userId, filters);
    const total = await countUserBids(userId, filters);
    const totalPages = Math.ceil(total / filters.limit);
    
    sendSuccess(res, {
      bids,
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
 * Get a specific bid by ID
 * GET /api/v1/bids/:id
 */
async function getBidHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    if (!id) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Bid ID is required'
      );
      return;
    }
    
    // Check ownership through fund
    const bid = await getUserBidById(userId, id);
    
    if (!bid) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Bid not found'
      );
      return;
    }
    
    sendSuccess(res, bid);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a bid
 * PUT /api/v1/bids/:id
 */
async function updateBidHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        'Bid ID is required'
      );
      return;
    }
    
    // Check ownership through fund
    const bid = await getUserBidById(userId, id);
    
    if (!bid) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Bid not found'
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
      sendSuccess(res, bid);
      return;
    }
    
    values.push(id); // Add bid ID for WHERE clause
    
    const result = await query(`
      UPDATE bids 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${index}
      AND fund_id IN (SELECT id FROM funds WHERE user_id = $${index + 1})
      RETURNING id, fund_id, month_key, winning_bid, discount_amount,
                bidder_name, notes, created_at, updated_at
    `, [...values, userId]);
    
    if (result.rowCount === 0) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Bid not found'
      );
      return;
    }
    
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a bid
 * DELETE /api/v1/bids/:id
 */
async function deleteBidHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    if (!id) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Bid ID is required'
      );
      return;
    }
    
    // Check ownership through fund
    const bid = await getUserBidById(userId, id);
    
    if (!bid) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Bid not found'
      );
      return;
    }
    
    // Delete bid
    const result = await query(`
      DELETE FROM bids 
      WHERE id = $1 
      AND fund_id IN (SELECT id FROM funds WHERE user_id = $2)
    `, [id, userId]);
    
    if (result.rowCount === 0) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Bid not found'
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

// POST /api/v1/bids
router.post('/', validateBody(bidCreationSchema), createBidHandler);

// GET /api/v1/bids
router.get('/', validateQuery(bidListQuerySchema), getBidsHandler);

// GET /api/v1/bids/:id
router.get('/:id', validateParams(uuidParamSchema), getBidHandler);

// PUT /api/v1/bids/:id
router.put('/:id', validateParams(uuidParamSchema), validateBody(bidUpdateSchema), updateBidHandler);

// DELETE /api/v1/bids/:id
router.delete('/:id', validateParams(uuidParamSchema), deleteBidHandler);

// GET /api/v1/funds/:fundId/bids
router.get('/funds/:fundId/bids', validateParams(fundIdParamSchema), validateQuery(bidListQuerySchema), getFundBidsHandler);

export { router };
export default router;