/**
 * Forecast Utility Module for ChitJar Backend
 *
 * This module provides functions for forecasting future net cash flows
 * using simple averages in Node.js, encapsulated for future upgrades.
 */

import { query } from '../lib/db';

/**
 * Forecast future net cash flows using simple averages
 * 
 * This function calculates forecasts for future months based on historical data
 * using simple averages of installment amounts, dividend amounts, and prize money.
 * 
 * @param userId - The ID of the user who owns the fund
 * @param fundId - The ID of the fund to forecast
 * @param months - Number of months to forecast (default: 12)
 * @returns Promise that resolves to an array of forecasted cash flows
 */
export async function forecastFutureCashFlows(
  userId: string, 
  fundId: string, 
  months: number = 12
): Promise<Array<{
  date: Date;
  month_key: string;
  forecasted_installment_amount: number;
  forecasted_dividend_amount: number;
  forecasted_prize_money: number;
  forecasted_net_cash_flow: number;
}>> {
  // Get fund details
  const fundResult = await query(`
    SELECT 
      id, user_id, name, installment_amount, chit_value,
      start_month, end_month, early_exit_month
    FROM funds 
    WHERE id = $1 AND user_id = $2
  `, [fundId, userId]);
  
  if (fundResult.rowCount === 0) {
    throw new Error('Fund not found');
  }
  
  const fund = fundResult.rows[0];
  
  // Get all historical entries for this fund
  const entriesResult = await query(`
    SELECT 
      month_key, dividend_amount, prize_money
    FROM monthly_entries 
    WHERE fund_id = $1
    ORDER BY month_key
  `, [fundId]);
  
  const entries = entriesResult.rows;
  
  // If no entries, we can't make meaningful forecasts
  if (entries.length === 0) {
    return [];
  }
  
  // Calculate averages for forecasting
  const totalDividend = entries.reduce((sum, entry) => sum + (entry.dividend_amount || 0), 0);
  const totalPrize = entries.reduce((sum, entry) => sum + (entry.prize_money || 0), 0);
  const entryCount = entries.length;
  
  const avgDividend = entryCount > 0 ? totalDividend / entryCount : 0;
  const avgPrize = entryCount > 0 ? totalPrize / entryCount : 0;
  
  // Use the fund's installment amount as the fixed installment for forecasts
  const installmentAmount = fund.installment_amount || 0;
  
  // Generate the next 'months' number of month keys
  const lastMonthKey = entries[entries.length - 1]?.month_key || fund.start_month;
  const forecastMonths = generateNextMonths(lastMonthKey, months);
  
  // Build forecasted cash flow series
  const forecastedCashFlows: Array<{
    date: Date;
    month_key: string;
    forecasted_installment_amount: number;
    forecasted_dividend_amount: number;
    forecasted_prize_money: number;
    forecasted_net_cash_flow: number;
  }> = [];
  
  for (const monthKey of forecastMonths) {
    // Calculate forecasted net cash flow: installment - dividend
    const forecastedInstallment = -installmentAmount; // Negative because it's an outflow
    const forecastedDividend = avgDividend;
    const forecastedPrize = avgPrize;
    const forecastedNetCashFlow = forecastedInstallment + forecastedDividend + forecastedPrize;
    
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
    
    forecastedCashFlows.push({
      date,
      month_key: monthKey,
      forecasted_installment_amount: installmentAmount,
      forecasted_dividend_amount: forecastedDividend,
      forecasted_prize_money: forecastedPrize,
      forecasted_net_cash_flow: forecastedNetCashFlow
    });
  }
  
  return forecastedCashFlows;
}

/**
 * Generate the next N months after a given month key
 * 
 * @param startMonthKey - The month key to start from (YYYY-MM format)
 * @param count - Number of months to generate
 * @returns Array of month keys in YYYY-MM format
 */
function generateNextMonths(startMonthKey: string, count: number): string[] {
  const months: string[] = [];
  const [yearStr, monthStr] = startMonthKey.split('-');
  
  if (!yearStr || !monthStr) {
    return months;
  }
  
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  
  // Generate the next 'count' months
  for (let i = 1; i <= count; i++) {
    // Increment month
    month++;
    
    // Handle year rollover
    if (month > 12) {
      month = 1;
      year++;
    }
    
    // Format month with leading zero if needed
    const formattedMonth = month.toString().padStart(2, '0');
    months.push(`${year}-${formattedMonth}`);
  }
  
  return months;
}