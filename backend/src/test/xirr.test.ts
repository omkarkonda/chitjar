/**
 * XIRR Utility Tests for ChitJar Backend
 *
 * These tests verify the correctness of XIRR calculations and edge case handling.
 */

import { calculateXirr, calculateXirrPercentage, validateCashFlowsForXirr } from '../lib/xirr';

describe('XIRR Utility', () => {
  describe('calculateXirr', () => {
    it('should calculate XIRR for a simple case', () => {
      // Simple example with known result
      const cashFlows = [
        { amount: -1000, when: new Date('2023-01-01') }, // Investment
        { amount: 1100, when: new Date('2024-01-01') }  // Return
      ];
      
      const result = calculateXirr(cashFlows);
      expect(result).toBeCloseTo(0.1, 2); // 10% return
    });

    it('should return null for empty cash flows', () => {
      const result = calculateXirr([]);
      expect(result).toBeNull();
    });

    it('should return null for cash flows with all positive values', () => {
      const cashFlows = [
        { amount: 1000, when: new Date('2023-01-01') },
        { amount: 1100, when: new Date('2024-01-01') }
      ];
      
      const result = calculateXirr(cashFlows);
      expect(result).toBeNull();
    });

    it('should return null for cash flows with all negative values', () => {
      const cashFlows = [
        { amount: -1000, when: new Date('2023-01-01') },
        { amount: -1100, when: new Date('2024-01-01') }
      ];
      
      const result = calculateXirr(cashFlows);
      expect(result).toBeNull();
    });

    it('should return null for cash flows with invalid dates', () => {
      const cashFlows = [
        { amount: -1000, when: new Date('invalid-date') },
        { amount: 1100, when: new Date('2024-01-01') }
      ];
      
      const result = calculateXirr(cashFlows);
      expect(result).toBeNull();
    });

    it('should return null for cash flows with null values', () => {
      const result = calculateXirr(null as any);
      expect(result).toBeNull();
    });
  });

  describe('calculateXirrPercentage', () => {
    it('should calculate XIRR as percentage', () => {
      const cashFlows = [
        { amount: -1000, when: new Date('2023-01-01') }, // Investment
        { amount: 1100, when: new Date('2024-01-01') }  // Return
      ];
      
      const result = calculateXirrPercentage(cashFlows);
      expect(result).toBeCloseTo(10, 1); // 10% return
    });

    it('should return null when calculation fails', () => {
      const cashFlows = [
        { amount: 1000, when: new Date('2023-01-01') },
        { amount: 1100, when: new Date('2024-01-01') }
      ];
      
      const result = calculateXirrPercentage(cashFlows);
      expect(result).toBeNull();
    });
  });

  describe('validateCashFlowsForXirr', () => {
    it('should validate valid cash flows', () => {
      const cashFlows = [
        { amount: -1000, when: new Date('2023-01-01') },
        { amount: 1100, when: new Date('2024-01-01') }
      ];
      
      const result = validateCashFlowsForXirr(cashFlows);
      expect(result).toBe(true);
    });

    it('should reject cash flows with all positive values', () => {
      const cashFlows = [
        { amount: 1000, when: new Date('2023-01-01') },
        { amount: 1100, when: new Date('2024-01-01') }
      ];
      
      const result = validateCashFlowsForXirr(cashFlows);
      expect(result).toBe(false);
    });

    it('should reject cash flows with all negative values', () => {
      const cashFlows = [
        { amount: -1000, when: new Date('2023-01-01') },
        { amount: -1100, when: new Date('2024-01-01') }
      ];
      
      const result = validateCashFlowsForXirr(cashFlows);
      expect(result).toBe(false);
    });

    it('should reject cash flows with invalid dates', () => {
      const cashFlows = [
        { amount: -1000, when: new Date('invalid-date') },
        { amount: 1100, when: new Date('2024-01-01') }
      ];
      
      const result = validateCashFlowsForXirr(cashFlows);
      expect(result).toBe(false);
    });

    it('should reject empty cash flows', () => {
      const result = validateCashFlowsForXirr([]);
      expect(result).toBe(false);
    });

    it('should reject null cash flows', () => {
      const result = validateCashFlowsForXirr(null as any);
      expect(result).toBe(false);
    });
  });
});