/**
 * Bids API Routes
 * 
 * This module implements CRUD operations for bids with per-user authorization
 * and row-level ownership enforcement through fund ownership.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
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
  bidCreationSchema,
  bidUpdateSchema,
  bidListQuerySchema,
  uuidSchema,
  csvBidImportSchema,
  CsvBidImport
} from '../lib/validation';
import {
  authenticateToken
} from '../lib/auth-middleware';
import { query, transaction } from '../lib/db';
import { parseCsvData, validateBidsAgainstFunds, formatCsvErrors } from '../lib/csv';
import { dataModificationRateLimiter, readOnlyRateLimiter, methodRateLimiter } from '../lib/rate-limiting';

const router = Router();

// Configure multer for file upload
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});


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
 * Get fund details with ownership check
 * @param userId - The ID of the user
 * @param fundId - The ID of the fund to get details for
 * @returns Promise that resolves to fund details object or null if not found or not owned
 */
async function getFundDetails(userId: string, fundId: string): Promise<any> {
  const result = await query(
    'SELECT chit_value, start_month, end_month, early_exit_month, user_id FROM funds WHERE id = $1',
    [fundId]
  );
  
  if (result.rowCount === 0) {
    // Fund doesn't exist
    return null;
  }
  
  if (result.rows[0].user_id !== userId) {
    // Fund belongs to another user
    return null;
  }
  
  return result.rows[0];
}

/**
 * Get bids with user filtering through fund ownership
 * @param userId - The ID of the user to get bids for
 * @param filters - Optional filters for pagination and filtering (page, limit, fund_id, month_key)
 * @returns Promise that resolves to an array of bid objects
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
 * @param userId - The ID of the user who should own the bid's fund
 * @param bidId - The ID of the bid to retrieve
 * @returns Promise that resolves to the bid object or null if not found
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
 * @param userId - The ID of the user to count bids for
 * @param filters - Optional filters for counting (fund_id, month_key)
 * @returns Promise that resolves to the count of matching bids
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
 * @param req - Express request object containing bid data in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function createBidHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fund_id, month_key, winning_bid, discount_amount, bidder_name, notes } = req.body;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get fund details
    const fund = await getFundDetails(userId, fund_id);
    if (!fund) {
      // Check if fund exists but belongs to another user
      const fundExists = await query(
        'SELECT user_id FROM funds WHERE id = $1',
        [fund_id]
      );
      
      if (fundExists.rowCount === 0 || fundExists.rows[0].user_id !== userId) {
        // Fund doesn't exist or belongs to another user
        sendError(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND,
          'Fund not found'
        );
        return;
      }
    }
    
    // Validate that winning_bid doesn't exceed chit_value
    if (winning_bid > fund.chit_value) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        `Winning bid (${winning_bid}) cannot exceed chit value (${fund.chit_value})`
      );
      return;
    }
    
    // Validate that discount_amount doesn't exceed chit_value
    if (discount_amount > fund.chit_value) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        `Discount amount (${discount_amount}) cannot exceed chit value (${fund.chit_value})`
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
 * @param req - Express request object with optional query parameters for filtering
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
 * @param req - Express request object containing fundId in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
    const fundExists = await query(
      'SELECT user_id FROM funds WHERE id = $1',
      [fundId]
    );
    
    if (fundExists.rowCount === 0 || fundExists.rows[0].user_id !== userId) {
      // Fund doesn't exist or belongs to another user
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Fund not found'
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
 * @param req - Express request object containing bid ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
 * @param req - Express request object containing bid ID in params and update data in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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
    
    // If winning_bid is being updated, validate it against the fund's chit_value
    if (updateData.winning_bid !== undefined && updateData.winning_bid > bid.chit_value) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        `Winning bid (${updateData.winning_bid}) cannot exceed chit value (${bid.chit_value})`
      );
      return;
    }
    
    // If discount_amount is being updated, validate it against the fund's chit_value
    if (updateData.discount_amount !== undefined && updateData.discount_amount > bid.chit_value) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        `Discount amount (${updateData.discount_amount}) cannot exceed chit value (${bid.chit_value})`
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
 * @param req - Express request object containing bid ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
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

/**
 * Import bids from CSV
 * POST /api/v1/bids/import/csv
 * @param req - Express request object containing CSV file in multipart form data
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function importBidsFromCsvHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Check if file was uploaded
    if (!req.file) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'CSV file is required'
      );
      return;
    }
    
    // Parse CSV data
    const csvData = req.file.buffer.toString('utf8');
    const { validRows, errors: parseErrors } = await parseCsvData<CsvBidImport>(csvData, csvBidImportSchema, 'bids');
    
    // Validate bids against fund constraints
    const { validBids, errors: validationErrors } = await validateBidsAgainstFunds(validRows, userId);
    
    // Combine all errors
    const allErrors = [...parseErrors, ...validationErrors];
    
    // Return preview with errors
    sendSuccess(res, {
      totalRows: validRows.length + parseErrors.length,
      validRows: validBids.length,
      errors: formatCsvErrors(allErrors),
      preview: validBids.slice(0, 10), // Limit preview to first 10 rows
      canImport: allErrors.length === 0
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirm bids import from CSV
 * POST /api/v1/bids/import/csv/confirm
 * @param req - Express request object containing bids data in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function confirmBidsImportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    const { bids } = req.body;
    
    // Validate input
    if (!bids || !Array.isArray(bids) || bids.length === 0) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Bids array is required'
      );
      return;
    }
    
    // Import bids in transaction
    const result = await transaction(async (client) => {
      let importedCount = 0;
      const errors: any[] = [];
      
      for (const bid of bids) {
        try {
          // Check fund ownership
          const fundExists = await query(
            'SELECT user_id FROM funds WHERE id = $1',
            [bid.fund_id]
          );
          
          if (fundExists.rowCount === 0 || fundExists.rows[0].user_id !== userId) {
            // Fund doesn't exist or belongs to another user
            errors.push({
              message: 'Fund not found',
              fund_id: bid.fund_id,
              month_key: bid.month_key
            });
            continue;
          }
          
          // Insert bid
          await client.query(`
            INSERT INTO bids (
              fund_id, month_key, winning_bid, discount_amount, bidder_name, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (fund_id, month_key) 
            DO UPDATE SET
              winning_bid = EXCLUDED.winning_bid,
              discount_amount = EXCLUDED.discount_amount,
              bidder_name = EXCLUDED.bidder_name,
              notes = EXCLUDED.notes,
              updated_at = CURRENT_TIMESTAMP
          `, [
            bid.fund_id, 
            bid.month_key, 
            bid.winning_bid, 
            bid.discount_amount, 
            bid.bidder_name || null, 
            bid.notes || null
          ]);
          
          importedCount++;
        } catch (error) {
          errors.push({
            message: error instanceof Error ? error.message : 'Unknown error',
            fund_id: bid.fund_id,
            month_key: bid.month_key
          });
        }
      }
      
      return { importedCount, errors };
    });
    
    if (result.errors.length > 0) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Some bids failed to import',
        { errors: result.errors }
      );
      return;
    }
    
    sendSuccess(res, {
      message: `Successfully imported ${result.importedCount} bids`,
      importedCount: result.importedCount
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Route Definitions
// ============================================================================

// POST /api/v1/bids
router.post('/',
  methodRateLimiter({ post: dataModificationRateLimiter }),
  sanitizeString('bidder_name'),
  sanitizeString('notes'),
  validateBody(bidCreationSchema),
  createBidHandler
);

// GET /api/v1/bids
router.get('/',
  methodRateLimiter({ get: readOnlyRateLimiter }),
  sanitizeQueryString('month_key'),
  validateQuery(bidListQuerySchema),
  getBidsHandler
);

// GET /api/v1/bids/:id
router.get('/:id',
  methodRateLimiter({ get: readOnlyRateLimiter }),
  sanitizeParamString('id'),
  validateParams(uuidParamSchema),
  getBidHandler
);

// PUT /api/v1/bids/:id
router.put('/:id',
  methodRateLimiter({ put: dataModificationRateLimiter }),
  sanitizeParamString('id'),
  sanitizeString('bidder_name'),
  sanitizeString('notes'),
  validateParams(uuidParamSchema),
  validateBody(bidUpdateSchema),
  updateBidHandler
);

// DELETE /api/v1/bids/:id
router.delete('/:id',
  methodRateLimiter({ delete: dataModificationRateLimiter }),
  sanitizeParamString('id'),
  validateParams(uuidParamSchema),
  deleteBidHandler
);

// GET /api/v1/funds/:fundId/bids
router.get('/funds/:fundId/bids',
  methodRateLimiter({ get: readOnlyRateLimiter }),
  sanitizeParamString('fundId'),
  sanitizeQueryString('month_key'),
  validateParams(fundIdParamSchema),
  validateQuery(bidListQuerySchema),
  getFundBidsHandler
);

// POST /api/v1/bids/import/csv
router.post('/import/csv',
  methodRateLimiter({ post: dataModificationRateLimiter }),
  upload.single('file'),
  importBidsFromCsvHandler
);

// POST /api/v1/bids/import/csv/confirm
router.post('/import/csv/confirm',
  methodRateLimiter({ post: dataModificationRateLimiter }),
  confirmBidsImportHandler
);

export { router };
export default router;