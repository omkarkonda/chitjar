/**
 * Export API Routes
 * 
 * This module implements export functionality for funds, entries, and full backup
 * with support for both CSV and JSON formats.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  authenticateToken
} from '../lib/auth-middleware';
import { query } from '../lib/db';
import {
  readOnlyRateLimiter,
  methodRateLimiter
} from '../lib/rate-limiting';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ============================================================================ 
// Helper Functions
// ============================================================================

/**
 * Convert array of objects to CSV string
 * @param data - Array of objects to convert to CSV
 * @param headers - Array of header objects with id and title properties
 * @returns CSV string representation of the data
 */
function convertToCsv(data: any[], headers: { id: string; title: string }[]): string {
  if (data.length === 0) {
    // Return only headers if no data
    return headers.map(h => `"${h.title}"`).join(',') + '\n';
  }
  
  // Create header row
  const headerRow = headers.map(h => `"${h.title}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(h => {
      const value = row[h.id];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape double quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

// ============================================================================ 
// Helper Functions
// ============================================================================

/**
 * Get all funds for a user as a streamable dataset
 */
async function getUserFundsForExport(userId: string): Promise<any[]> {
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
    WHERE f.user_id = $1
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `, [userId]);
  
  return result.rows;
}

/**
 * Get all monthly entries for a user as a streamable dataset
 */
async function getUserEntriesForExport(userId: string): Promise<any[]> {
  const result = await query(`
    SELECT 
      me.id, me.fund_id, me.month_key, me.dividend_amount, 
      me.prize_money, me.is_paid, me.notes, me.created_at, me.updated_at,
      f.name as fund_name
    FROM monthly_entries me
    JOIN funds f ON me.fund_id = f.id
    WHERE f.user_id = $1
    ORDER BY f.name ASC, me.month_key DESC
  `, [userId]);
  
  return result.rows;
}

/**
 * Get all bids for a user as a streamable dataset
 */
async function getUserBidsForExport(userId: string): Promise<any[]> {
  const result = await query(`
    SELECT 
      b.id, b.fund_id, b.month_key, b.winning_bid, b.discount_amount,
      b.bidder_name, b.notes, b.created_at, b.updated_at,
      f.name as fund_name
    FROM bids b
    JOIN funds f ON b.fund_id = f.id
    WHERE f.user_id = $1
    ORDER BY f.name ASC, b.month_key DESC
  `, [userId]);
  
  return result.rows;
}

/**
 * Get complete user data for backup
 */
async function getUserBackupData(userId: string): Promise<any> {
  const funds = await getUserFundsForExport(userId);
  const entries = await getUserEntriesForExport(userId);
  const bids = await getUserBidsForExport(userId);
  
  return {
    funds,
    entries,
    bids,
    export_timestamp: new Date().toISOString(),
    export_version: '1.0'
  };
}

// ============================================================================ 
// Route Handlers
// ============================================================================

/**
 * Export all funds for the authenticated user as CSV
 * GET /api/v1/export/funds.csv
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function exportFundsCsvHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get funds data
    const funds = await getUserFundsForExport(userId);
    
    // Define CSV headers
    const headers = [
      { id: 'id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'chit_value', title: 'Chit Value' },
      { id: 'installment_amount', title: 'Installment Amount' },
      { id: 'total_months', title: 'Total Months' },
      { id: 'start_month', title: 'Start Month' },
      { id: 'end_month', title: 'End Month' },
      { id: 'is_active', title: 'Is Active' },
      { id: 'early_exit_month', title: 'Early Exit Month' },
      { id: 'entries_count', title: 'Entries Count' },
      { id: 'bids_count', title: 'Bids Count' },
      { id: 'notes', title: 'Notes' },
      { id: 'created_at', title: 'Created At' },
      { id: 'updated_at', title: 'Updated At' }
    ];
    
    // Convert to CSV
    const csvContent = convertToCsv(funds, headers);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chitjar-funds.csv"');
    
    // Send CSV response
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * Export all funds for the authenticated user as JSON
 * GET /api/v1/export/funds.json
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function exportFundsJsonHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get funds data
    const funds = await getUserFundsForExport(userId);
    
    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="chitjar-funds.json"');
    
    // Send JSON response
    res.json({
      data: funds,
      export_timestamp: new Date().toISOString(),
      export_version: '1.0'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export all monthly entries for the authenticated user as CSV
 * GET /api/v1/export/entries.csv
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function exportEntriesCsvHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get entries data
    const entries = await getUserEntriesForExport(userId);
    
    // Define CSV headers
    const headers = [
      { id: 'id', title: 'ID' },
      { id: 'fund_id', title: 'Fund ID' },
      { id: 'fund_name', title: 'Fund Name' },
      { id: 'month_key', title: 'Month Key' },
      { id: 'dividend_amount', title: 'Dividend Amount' },
      { id: 'prize_money', title: 'Prize Money' },
      { id: 'is_paid', title: 'Is Paid' },
      { id: 'notes', title: 'Notes' },
      { id: 'created_at', title: 'Created At' },
      { id: 'updated_at', title: 'Updated At' }
    ];
    
    // Convert to CSV
    const csvContent = convertToCsv(entries, headers);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chitjar-entries.csv"');
    
    // Send CSV response
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * Export all monthly entries for the authenticated user as JSON
 * GET /api/v1/export/entries.json
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function exportEntriesJsonHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get entries data
    const entries = await getUserEntriesForExport(userId);
    
    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="chitjar-entries.json"');
    
    // Send JSON response
    res.json({
      data: entries,
      export_timestamp: new Date().toISOString(),
      export_version: '1.0'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export all bids for the authenticated user as CSV
 * GET /api/v1/export/bids.csv
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function exportBidsCsvHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get bids data
    const bids = await getUserBidsForExport(userId);
    
    // Define CSV headers
    const headers = [
      { id: 'id', title: 'ID' },
      { id: 'fund_id', title: 'Fund ID' },
      { id: 'fund_name', title: 'Fund Name' },
      { id: 'month_key', title: 'Month Key' },
      { id: 'winning_bid', title: 'Winning Bid' },
      { id: 'discount_amount', title: 'Discount Amount' },
      { id: 'bidder_name', title: 'Bidder Name' },
      { id: 'notes', title: 'Notes' },
      { id: 'created_at', title: 'Created At' },
      { id: 'updated_at', title: 'Updated At' }
    ];
    
    // Convert to CSV
    const csvContent = convertToCsv(bids, headers);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chitjar-bids.csv"');
    
    // Send CSV response
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * Export all bids for the authenticated user as JSON
 * GET /api/v1/export/bids.json
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function exportBidsJsonHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get bids data
    const bids = await getUserBidsForExport(userId);
    
    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="chitjar-bids.json"');
    
    // Send JSON response
    res.json({
      data: bids,
      export_timestamp: new Date().toISOString(),
      export_version: '1.0'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export complete backup for the authenticated user as JSON
 * GET /api/v1/export/backup.json
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function exportBackupJsonHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get complete backup data
    const backupData = await getUserBackupData(userId);
    
    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="chitjar-backup.json"');
    
    // Send JSON response
    res.json(backupData);
  } catch (error) {
    next(error);
  }
}

// ============================================================================ 
// Route Definitions
// ============================================================================

// Apply method-based rate limiting to all routes
router.use(methodRateLimiter({
  get: readOnlyRateLimiter
}));

// GET /api/v1/export/funds.csv
router.get('/funds.csv', exportFundsCsvHandler);

// GET /api/v1/export/funds.json
router.get('/funds.json', exportFundsJsonHandler);

// GET /api/v1/export/entries.csv
router.get('/entries.csv', exportEntriesCsvHandler);

// GET /api/v1/export/entries.json
router.get('/entries.json', exportEntriesJsonHandler);

// GET /api/v1/export/bids.csv
router.get('/bids.csv', exportBidsCsvHandler);

// GET /api/v1/export/bids.json
router.get('/bids.json', exportBidsJsonHandler);

// GET /api/v1/export/backup.json
router.get('/backup.json', exportBackupJsonHandler);

export { router };