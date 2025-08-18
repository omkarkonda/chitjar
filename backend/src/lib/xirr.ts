/**
 * XIRR Utility Module for ChitJar Backend
 *
 * This module provides functions for calculating XIRR (Internal Rate of Return)
 * using the xirr library with proper error handling and documentation.
 */

// Import the xirr function
const xirr = require('xirr');

// Define the CashFlow type
export type CashFlow = {
  amount: number;
  when: Date;
};

/**
 * Calculate XIRR (Internal Rate of Return) for a series of cash flows
 * 
 * Cash Flow Sign Convention:
 * - Negative amounts represent outflows (money leaving the investor)
 * - Positive amounts represent inflows (money coming to the investor)
 * - The first cash flow should typically be negative (initial investment)
 * 
 * Date Convention:
 * - Dates should be JavaScript Date objects
 * - XIRR calculation requires at least one positive and one negative cash flow
 * 
 * @param cashFlows - Array of cash flow objects with amount and date
 * @returns XIRR as a decimal (0.1 = 10%) or null if calculation fails
 * 
 * @example
 * ```typescript
 * const cashFlows = [
 *   { amount: -1000, when: new Date('2023-01-01') }, // Initial investment
 *   { amount: 100, when: new Date('2023-02-01') },   // Return
 *   { amount: 120, when: new Date('2023-03-01') }    // Return
 * ];
 * const result = calculateXirr(cashFlows);
 * ```
 */
export function calculateXirr(cashFlows: CashFlow[]): number | null {
  try {
    // Validate input
    if (!cashFlows || cashFlows.length === 0) {
      return null;
    }

    // Check if we have both positive and negative cash flows
    const hasPositive = cashFlows.some(cf => cf.amount > 0);
    const hasNegative = cashFlows.some(cf => cf.amount < 0);
    
    if (!hasPositive || !hasNegative) {
      // XIRR requires at least one positive and one negative cash flow
      return null;
    }

    // Validate that all dates are valid
    const hasInvalidDates = cashFlows.some(cf => !(cf.when instanceof Date) || isNaN(cf.when.getTime()));
    if (hasInvalidDates) {
      return null;
    }

    // Calculate XIRR using the xirr library
    const result = xirr(cashFlows);
    
    // Check if result is valid
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return null;
    }
    
    return result;
  } catch (error) {
    // If XIRR calculation fails (e.g., no solution), return null
    return null;
  }
}

/**
 * Calculate XIRR as a percentage
 * 
 * @param cashFlows - Array of cash flow objects with amount and date
 * @returns XIRR as a percentage (10 = 10%) or null if calculation fails
 */
export function calculateXirrPercentage(cashFlows: CashFlow[]): number | null {
  const result = calculateXirr(cashFlows);
  return result !== null ? result * 100 : null;
}

/**
 * Validate cash flow data for XIRR calculation
 * 
 * @param cashFlows - Array of cash flow objects with amount and date
 * @returns Boolean indicating if cash flows are valid for XIRR calculation
 */
export function validateCashFlowsForXirr(cashFlows: CashFlow[]): boolean {
  if (!cashFlows || cashFlows.length === 0) {
    return false;
  }

  // Check if we have both positive and negative cash flows
  const hasPositive = cashFlows.some(cf => cf.amount > 0);
  const hasNegative = cashFlows.some(cf => cf.amount < 0);
  
  if (!hasPositive || !hasNegative) {
    return false;
  }

  // Validate that all dates are valid
  const hasInvalidDates = cashFlows.some(cf => !(cf.when instanceof Date) || isNaN(cf.when.getTime()));
  if (hasInvalidDates) {
    return false;
  }

  return true;
}