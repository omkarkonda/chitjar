import { Request, Response, NextFunction } from 'express';
import { query } from '../lib/db';
import { sendSuccess, sendError, HTTP_STATUS, ERROR_CODES } from '../lib/api-conventions';
import { getFundCashFlowSeries } from './analytics';

// Import the checkFundOwnership function from analytics since it's not exported
import { checkFundOwnership } from './analytics';

/**
 * Get net monthly cash flow series for a fund
 * Computes net monthly cash flow as installment - dividend for each month
 * Exposes historical series via PostgreSQL queries
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function getFundCashFlowHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as unknown as { user: { id: string } };
    const userId = authenticatedReq.user.id;
    const fundId = req.params['id'];
    
    // Check if fundId is provided
    if (!fundId) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        'Fund ID is required'
      );
      return;
    }
    
    // Check if user owns the fund
    const isOwner = await checkFundOwnership(userId, fundId);
    if (!isOwner) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Access denied: you do not own this fund'
      );
      return;
    }
    
    // Get cash flow series using existing function
    const cashFlowSeries = await getFundCashFlowSeries(userId, fundId);
    
    sendSuccess(res, {
      fund_id: fundId,
      cash_flow_series: cashFlowSeries
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get simplified net monthly cash flow series for a fund
 * Computes net monthly cash flow as installment - dividend for each month
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function getFundNetCashFlowHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedReq = req as unknown as { user: { id: string } };
    const userId = authenticatedReq.user.id;
    const fundId = req.params['id'];
    
    // Check if fundId is provided
    if (!fundId) {
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        'Fund ID is required'
      );
      return;
    }
    
    // Check if user owns the fund
    const isOwner = await checkFundOwnership(userId, fundId);
    if (!isOwner) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Access denied: you do not own this fund'
      );
      return;
    }
    
    // Get fund details
    const fundResult = await query(`
      SELECT id, user_id, name, installment_amount, chit_value, 
             start_month, end_month, early_exit_month
      FROM funds 
      WHERE id = $1 AND user_id = $2
    `, [fundId, userId]);
    
    if (fundResult.rowCount === 0) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Fund not found'
      );
      return;
    }
    
    const fund = fundResult.rows[0];
    
    // Get all entries for this fund
    const entriesResult = await query(`
      SELECT month_key, dividend_amount, prize_money
      FROM monthly_entries 
      WHERE fund_id = $1
      ORDER BY month_key
    `, [fundId]);
    
    const entries = entriesResult.rows;
    
    // Create a map of entries by month key for quick lookup
    const entryMap = new Map(entries.map(entry => [entry['month_key'], entry]));
    
    // Generate expected month series
    const { generateFundMonthSeries } = await import('../lib/validation-utils');
    const expectedMonths = generateFundMonthSeries(
      fund['start_month'],
      fund['end_month'],
      fund['early_exit_month']
    );
    
    // Build net cash flow series (installment - dividend)
    const netCashFlowSeries: Array<{ 
      date: Date, 
      month_key: string,
      installment_amount: number,
      dividend_amount: number,
      prize_money: number,
      net_cash_flow: number 
    }> = [];
    
    for (const monthKey of expectedMonths) {
      const entry = entryMap.get(monthKey);
      
      // Calculate installment - dividend
      const installment = fund['installment_amount'];
      const dividend = entry ? entry['dividend_amount'] : 0;
      const prize = entry ? entry['prize_money'] : 0;
      const netCashFlow = installment - dividend; // As per task 5.3 requirement
      
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
      
      netCashFlowSeries.push({
        date,
        month_key: monthKey,
        installment_amount: installment,
        dividend_amount: dividend,
        prize_money: prize,
        net_cash_flow: netCashFlow
      });
    }
    
    sendSuccess(res, {
      fund_id: fundId,
      fund_name: fund['name'],
      cash_flow_series: netCashFlowSeries
    });
  } catch (error) {
    next(error);
  }
}

export { getFundCashFlowHandler, getFundNetCashFlowHandler };