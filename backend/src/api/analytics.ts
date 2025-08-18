/**
 * Analytics API Routes
 * 
 * This module implements analytics functionality including XIRR calculations,
 * cash flow series, projections, and FD comparison.
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
  validateParams,
  validateBody
} from '../lib/validation-utils';
import {
  authenticateToken
} from '../lib/auth-middleware';
import { query } from '../lib/db';
import {
  readOnlyRateLimiter,
  methodRateLimiter
} from '../lib/rate-limiting';
import {
  uuidSchema,
  fdComparisonSchema
} from '../lib/validation';

// Import the xirr function from our utility module
import { calculateXirrPercentage } from '../lib/xirr';
import { getFundCashFlowHandler, getFundNetCashFlowHandler } from './cash-flow';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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
 * Get cash flow series for a fund
 * Returns an array of { date: Date, amount: number } objects representing the cash flow
 * for each month of the fund. Negative values represent outflows (installments), 
 * positive values represent inflows (dividends + prize money).
 * @param userId - The ID of the user who owns the fund
 * @param fundId - The ID of the fund to get cash flow series for
 * @returns Promise that resolves to an array of cash flow objects with date and amount
 */
async function getFundCashFlowSeries(userId: string, fundId: string): Promise<Array<{ date: Date, amount: number }>> {
  // First get the fund details
  const fundResult = await query(`
    SELECT 
      f.start_month, f.end_month, f.early_exit_month,
      f.installment_amount, f.chit_value
    FROM funds f
    WHERE f.id = $1 AND f.user_id = $2
  `, [fundId, userId]);
  
  if (fundResult.rowCount === 0) {
    return [];
  }
  
  // Check if fund exists
  if (!fundResult || fundResult.rows.length === 0) {
    return [];
  }
  
  const fund = fundResult.rows[0];
  
  // Get all entries for this fund
  const entriesResult = await query(`
    SELECT 
      me.month_key, me.dividend_amount, me.prize_money
    FROM monthly_entries me
    WHERE me.fund_id = $1
    ORDER BY me.month_key
  `, [fundId]);
  
  const entries = entriesResult.rows;
  
  // Create a map of entries by month key for quick lookup
  const entryMap = new Map(entries.map(entry => [entry.month_key, entry]));
  
  // Generate expected month series
  const { generateFundMonthSeries } = await import('../lib/validation-utils');
  const expectedMonths = generateFundMonthSeries(
    fund.start_month,
    fund.end_month,
    fund.early_exit_month
  );
  
  // Build cash flow series
  const cashFlow: Array<{ date: Date, amount: number }> = [];
  
  for (const monthKey of expectedMonths) {
    const entry = entryMap.get(monthKey);
    
    // For each month, we have:
    // 1. Outflow: installment_amount (negative)
    // 2. Inflow: dividend_amount + prize_money (positive)
    
    const installment = -fund.installment_amount; // Negative because it's an outflow
    const dividend = entry ? entry.dividend_amount : 0;
    const prize = entry ? entry.prize_money : 0;
    const netCashFlow = installment + dividend + prize;
    
    // Convert month key to date (first day of the month)
    const parts = monthKey.split('-');
    const yearStr = parts[0];
    const monthStr = parts[1];
    
    // Check if we have valid parts
    if (!yearStr || !monthStr) {
      continue; // Skip invalid month keys
    }
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const date = new Date(year, month - 1, 1); // month is 0-indexed in JS Date
    
    cashFlow.push({
      date,
      amount: netCashFlow
    });
  }
  
  return cashFlow;
}

/**
 * Calculate XIRR (Internal Rate of Return) for a fund
 * Uses the cash flow series to calculate the XIRR using the xirr library.
 * Returns null if calculation fails or if there's no cash flow data.
 * @param userId - The ID of the user who owns the fund
 * @param fundId - The ID of the fund to calculate XIRR for
 * @returns Promise that resolves to the XIRR percentage value or null if calculation fails
 */
async function calculateFundXirr(userId: string, fundId: string): Promise<number | null> {
  try {
    const cashFlow = await getFundCashFlowSeries(userId, fundId);
    
    if (cashFlow.length === 0) {
      return null;
    }
    
    // Convert to format expected by xirr library
    const xirrInput = cashFlow.map(cf => ({
      amount: cf.amount,
      when: cf.date
    }));
    
    // Calculate XIRR as percentage using our utility function
    const result = calculateXirrPercentage(xirrInput);
    
    return result;
  } catch (error) {
    // If XIRR calculation fails (e.g., no solution), return null
    return null;
  }
}

/**
 * Calculate simple projections based on average cash flows
 * Projects future cash flows based on the average of historical cash flows.
 * @param userId - The ID of the user who owns the fund
 * @param fundId - The ID of the fund to calculate projections for
 * @param months - Number of months to project (default: 12)
 * @returns Promise that resolves to an object containing projected cash flows and average values
 */
async function calculateProjections(userId: string, fundId: string, months: number = 12): Promise<any> {
  // Get cash flow series
  const cashFlow = await getFundCashFlowSeries(userId, fundId);
  
  if (cashFlow.length === 0) {
    return {
      projected_cash_flows: [],
      average_monthly_cash_flow: 0,
      projected_xirr: null
    };
  }
  
  // Calculate average monthly cash flow
  const totalCashFlow = cashFlow.reduce((sum, cf) => sum + cf.amount, 0);
  const averageCashFlow = totalCashFlow / cashFlow.length;
  
  // Generate projections
  const lastEntry = cashFlow[cashFlow.length - 1];
  if (!lastEntry) {
    return {
      projected_cash_flows: [],
      average_monthly_cash_flow: averageCashFlow,
      projected_months: months
    };
  }
  
  const lastDate = lastEntry.date;
  const projectedCashFlows = [];
  
  for (let i = 1; i <= months; i++) {
    const projectedDate = new Date(lastDate);
    projectedDate.setMonth(projectedDate.getMonth() + i);
    
    projectedCashFlows.push({
      date: projectedDate,
      amount: averageCashFlow
    });
  }
  
  return {
    projected_cash_flows: projectedCashFlows,
    average_monthly_cash_flow: averageCashFlow,
    projected_months: months
  };
}

/**
 * Compare fund XIRR with FD (Fixed Deposit) rate
 * Calculates the difference between the fund's XIRR and a given FD rate to determine
 * which investment option is better.
 * @param userId - The ID of the user who owns the fund
 * @param fundId - The ID of the fund to compare
 * @param fdRate - The fixed deposit rate to compare against (as percentage)
 * @returns Promise that resolves to an object containing comparison results
 */
async function compareWithFd(userId: string, fundId: string, fdRate: number): Promise<any> {
  const fundXirr = await calculateFundXirr(userId, fundId);
  
  return {
    fund_xirr: fundXirr,
    fd_rate: fdRate,
    difference: fundXirr !== null ? fundXirr - fdRate : null,
    is_fund_better: fundXirr !== null ? fundXirr > fdRate : null
  };
}

/**
 * Get dashboard analytics for a user
 * Calculates total profit and fund performance metrics for all active funds
 * owned by the user.
 * @param userId - The ID of the user to get dashboard analytics for
 * @returns Promise that resolves to an object containing dashboard analytics data
 */
async function getDashboardAnalytics(userId: string): Promise<any> {
  // Get all active funds for the user
  const fundsResult = await query(`
    SELECT 
      f.id, f.name, f.chit_value, f.installment_amount, f.total_months,
      f.start_month, f.end_month, f.early_exit_month, f.needs_recalculation
    FROM funds f
    WHERE f.user_id = $1 AND f.is_active = true
    ORDER BY f.created_at DESC
  `, [userId]);
  
  const funds = fundsResult.rows;
  
  // Calculate analytics for each fund
  const fundAnalytics = [];
  let totalProfit = 0;
  
  // Track which funds need recalculation
  const fundsNeedingRecalculation = [];
  
  for (const fund of funds) {
    const cashFlow = await getFundCashFlowSeries(userId, fund.id);
    
    if (cashFlow.length > 0) {
      // Calculate total profit for this fund
      const fundProfit = cashFlow.reduce((sum, cf) => sum + cf.amount, 0);
      totalProfit += fundProfit;
      
      // Calculate XIRR
      const fundXirr = await calculateFundXirr(userId, fund.id);
      
      fundAnalytics.push({
        fund_id: fund.id,
        fund_name: fund.name,
        total_profit: fundProfit,
        xirr: fundXirr,
        cash_flow_count: cashFlow.length
      });
      
      // Track if this fund needs recalculation
      if (fund.needs_recalculation) {
        fundsNeedingRecalculation.push(fund.id);
      }
    }
  }
  
  // Mark all funds that needed recalculation as recalculated
  if (fundsNeedingRecalculation.length > 0) {
    await query(
      `UPDATE funds SET needs_recalculation = false WHERE id = ANY($1)`,
      [fundsNeedingRecalculation]
    );
  }
  
  return {
    total_profit: totalProfit,
    funds: fundAnalytics,
    fund_count: funds.length
  };
}

// ============================================================================ 
// Route Handlers
// ============================================================================

/**
 * Get dashboard analytics
 * GET /api/v1/analytics/dashboard
 * Returns total profit and fund performance metrics for all active funds.
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function getDashboardHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    const analytics = await getDashboardAnalytics(userId);
    
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
}

/**
 * Get fund-specific analytics
 * GET /api/v1/analytics/funds/:id
 * Returns cash flow series, XIRR, and projections for a specific fund.
 * @param req - Express request object containing fund ID in params
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function getFundAnalyticsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Check if id exists
    if (!id) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Fund ID is required'
      );
      return;
    }
    
    // Check fund ownership
    const ownsFund = await checkFundOwnership(userId, id);
    if (!ownsFund) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Access denied: fund not found or insufficient permissions'
      );
      return;
    }
    
    // Get fund details to check if recalculation is needed
    const fundResult = await query(
      'SELECT needs_recalculation FROM funds WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    const fund = fundResult.rows[0];
    const needsRecalculation = fund ? fund.needs_recalculation : true;
    
    // Get cash flow series
    const cashFlow = await getFundCashFlowSeries(userId, id);
    
    // Calculate XIRR
    const xirr = await calculateFundXirr(userId, id);
    
    // Calculate projections
    const projections = await calculateProjections(userId, id);
    
    // If we determined that recalculation was needed, mark the fund as recalculated
    if (needsRecalculation) {
      await query(
        'UPDATE funds SET needs_recalculation = false WHERE id = $1',
        [id]
      );
    }
    
    sendSuccess(res, {
      fund_id: id,
      cash_flow_series: cashFlow,
      xirr,
      projections
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Compare fund XIRR with FD rate
 * POST /api/v1/analytics/funds/:id/fd-comparison
 * Compares the fund's XIRR with a provided fixed deposit rate.
 * @param req - Express request object containing fund ID in params and FD rate in body
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function compareFundWithFdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { fd_rate } = req.body;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Check if id exists
    if (!id) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        'Fund ID is required'
      );
      return;
    }
    
    // Check fund ownership
    const ownsFund = await checkFundOwnership(userId, id);
    if (!ownsFund) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Access denied: fund not found or insufficient permissions'
      );
      return;
    }
    
    // Compare with FD
    const comparison = await compareWithFd(userId, id, fd_rate);
    
    sendSuccess(res, comparison);
  } catch (error) {
    next(error);
  }
}

/**
 * Get strategic bidding insights
 * GET /api/v1/analytics/insights
 * Returns historical bidding trends and strategic insights for all funds.
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when response is sent
 */
async function getInsightsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user.id;
    
    // Get all bids for the user
    const bidsResult = await query(`
      SELECT 
        b.fund_id, b.month_key, b.winning_bid, b.discount_amount,
        f.name as fund_name, f.chit_value, f.installment_amount
      FROM bids b
      JOIN funds f ON b.fund_id = f.id
      WHERE f.user_id = $1
      ORDER BY f.name ASC, b.month_key DESC
    `, [userId]);
    
    // Check if bidsResult exists and has rows
    if (!bidsResult || !bidsResult.rows || bidsResult.rows.length === 0) {
      sendSuccess(res, {
        insights: []
      });
      return;
    }
    
    const bids = bidsResult.rows;
    
    // Group bids by fund
    const bidsByFund: Record<string, any[]> = {};
    bids.forEach(bid => {
      // @ts-ignore
      if (!bidsByFund[bid.fund_id]) {
        // @ts-ignore
        bidsByFund[bid.fund_id] = [];
      }
      // @ts-ignore
      bidsByFund[bid.fund_id].push(bid);
    });
    
    // Calculate insights for each fund
    const fundInsights = [];
    for (const [fundId, fundBids] of Object.entries(bidsByFund)) {
      if (!fundBids || fundBids.length === 0) continue;
      
      // Check if first bid exists and has required properties
      const firstBid = fundBids[0];
      if (!firstBid || !firstBid.fund_name || firstBid.chit_value === undefined) {
        continue;
      }
      
      const fundName = firstBid.fund_name;
      const chitValue = firstBid.chit_value;
      
      // Calculate average discount
      const totalDiscount = fundBids.reduce((sum, bid) => {
        // Check if bid and bid.discount_amount exist
        if (!bid || bid.discount_amount === undefined) return sum;
        return sum + bid.discount_amount;
      }, 0);
      const averageDiscount = totalDiscount / fundBids.length;
      
      // Calculate average winning bid
      const totalWinningBid = fundBids.reduce((sum, bid) => {
        // Check if bid and bid.winning_bid exist
        if (!bid || bid.winning_bid === undefined) return sum;
        return sum + bid.winning_bid;
      }, 0);
      const averageWinningBid = totalWinningBid / fundBids.length;
      
      // Calculate average discount percentage
      const averageDiscountPercentage = (averageDiscount / chitValue) * 100;
      
      fundInsights.push({
        fund_id: fundId,
        fund_name: fundName,
        bid_count: fundBids.length,
        average_discount: averageDiscount,
        average_winning_bid: averageWinningBid,
        average_discount_percentage: averageDiscountPercentage,
        latest_bids: fundBids.slice(0, 5) // Last 5 bids
      });
    }
    
    sendSuccess(res, {
      insights: fundInsights
    });
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
  post: readOnlyRateLimiter // Using readOnlyRateLimiter for POST as these are read operations
}));

// GET /api/v1/analytics/dashboard
router.get('/dashboard', getDashboardHandler);

// GET /api/v1/analytics/funds/:id
router.get('/funds/:id', 
  validateParams(uuidParamSchema),
  getFundAnalyticsHandler
);

// GET /api/v1/analytics/funds/:id/cash-flow
router.get('/funds/:id/cash-flow', 
  validateParams(uuidParamSchema),
  getFundCashFlowHandler
);

// GET /api/v1/analytics/funds/:id/net-cash-flow
router.get('/funds/:id/net-cash-flow', 
  validateParams(uuidParamSchema),
  getFundNetCashFlowHandler
);

// POST /api/v1/analytics/funds/:id/fd-comparison
router.post('/funds/:id/fd-comparison',
  validateParams(uuidParamSchema),
  validateBody(fdComparisonSchema),
  compareFundWithFdHandler
);

// GET /api/v1/analytics/insights
router.get('/insights', getInsightsHandler);

export { router };
export { getFundCashFlowSeries };
export { checkFundOwnership };