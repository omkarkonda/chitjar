import { 
  validateMonetaryValue, 
  validateMonthKey, 
  validatePositiveInteger, 
  validateString,
  validateMonthlyEntry,
  validateFundCreation,
  validateFundUpdate
} from './validators.js';

describe('Frontend Validators', () => {
  describe('validateMonetaryValue', () => {
    test('should validate valid monetary values', () => {
      expect(validateMonetaryValue(1000, 'Amount')).toBeNull();
      expect(validateMonetaryValue('1000.50', 'Amount')).toBeNull();
    });

    test('should reject invalid monetary values', () => {
      expect(validateMonetaryValue('', 'Amount')).toBe('Amount is required');
      expect(validateMonetaryValue('invalid', 'Amount')).toBe('Amount must be a valid number');
      expect(validateMonetaryValue(-100, 'Amount')).toBe('Amount must be positive');
      expect(validateMonetaryValue(0, 'Amount')).toBe('Amount must be positive');
    });

    test('should validate dividend and prize money can be zero', () => {
      expect(validateMonetaryValue(0, 'Dividend amount')).toBeNull();
      expect(validateMonetaryValue(0, 'Prize money')).toBeNull();
      expect(validateMonetaryValue(-1, 'Dividend amount')).toBe('Dividend amount cannot be negative');
      expect(validateMonetaryValue(-1, 'Prize money')).toBe('Prize money cannot be negative');
    });

    test('should validate against chit value', () => {
      expect(validateMonetaryValue(1500, 'Amount', 1000)).toBe('Amount cannot exceed chit value of 1000');
      expect(validateMonetaryValue(500, 'Amount', 1000)).toBeNull();
    });
  });

  describe('validateMonthKey', () => {
    test('should validate valid month keys', () => {
      expect(validateMonthKey('2024-01', 'Month')).toBeNull();
      expect(validateMonthKey('2024-12', 'Month')).toBeNull();
    });

    test('should reject invalid month keys', () => {
      expect(validateMonthKey('', 'Month')).toBe('Month is required');
      expect(validateMonthKey('invalid', 'Month')).toBe('Invalid Month format (YYYY-MM)');
      expect(validateMonthKey('2024-13', 'Month')).toBe('Invalid Month: year must be 1900-2100, month must be 01-12');
      expect(validateMonthKey('1800-01', 'Month')).toBe('Invalid Month: year must be 1900-2100, month must be 01-12');
    });
  });

  describe('validatePositiveInteger', () => {
    test('should validate valid positive integers', () => {
      expect(validatePositiveInteger(10, 'Count')).toBeNull();
      expect(validatePositiveInteger('10', 'Count')).toBeNull();
    });

    test('should reject invalid positive integers', () => {
      expect(validatePositiveInteger('', 'Count')).toBe('Count is required');
      expect(validatePositiveInteger('invalid', 'Count')).toBe('Count must be a valid integer');
      expect(validatePositiveInteger(-1, 'Count')).toBe('Count must be positive');
      expect(validatePositiveInteger(0, 'Count')).toBe('Count must be positive');
    });

    test('should validate against max value', () => {
      expect(validatePositiveInteger(150, 'Count', 120)).toBe('Count cannot exceed 120');
      expect(validatePositiveInteger(100, 'Count', 120)).toBeNull();
    });
  });

  describe('validateString', () => {
    test('should validate valid strings', () => {
      expect(validateString('test', 'Name', 100)).toBeNull();
      expect(validateString('', 'Name', 100, false)).toBeNull(); // Not required
    });

    test('should reject invalid strings', () => {
      expect(validateString('', 'Name', 100)).toBe('Name is required');
      expect(validateString('a'.repeat(101), 'Name', 100)).toBe('Name is too long (maximum 100 characters)');
    });
  });

  describe('validateMonthlyEntry', () => {
    const fund = {
      chit_value: 100000
    };

    test('should validate valid monthly entry data', () => {
      const data = {
        dividend_amount: '1000',
        prize_money: '0',
        month_key: '2024-01',
        notes: 'Test notes'
      };
      
      const result = validateMonthlyEntry(data, fund);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should reject invalid monthly entry data', () => {
      const data = {
        dividend_amount: '-100',
        prize_money: '200000',
        month_key: 'invalid',
        notes: 'a'.repeat(1001)
      };
      
      const result = validateMonthlyEntry(data, fund);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('dividend_amount');
      expect(result.errors).toHaveProperty('prize_money');
      expect(result.errors).toHaveProperty('month_key');
      expect(result.errors).toHaveProperty('notes');
    });
  });

  describe('validateFundCreation', () => {
    test('should validate valid fund creation data', () => {
      const data = {
        name: 'Test Fund',
        chit_value: '100000',
        installment_amount: '10000',
        total_months: '12',
        start_month: '2024-01',
        end_month: '2024-12'
      };
      
      const result = validateFundCreation(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should reject invalid fund creation data', () => {
      const data = {
        name: '',
        chit_value: '-100000',
        installment_amount: '-10000',
        total_months: '0',
        start_month: '2024-12',
        end_month: '2024-01' // End before start
      };
      
      const result = validateFundCreation(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('name');
      expect(result.errors).toHaveProperty('chit_value');
      expect(result.errors).toHaveProperty('installment_amount');
      expect(result.errors).toHaveProperty('total_months');
      expect(result.errors).toHaveProperty('end_month');
    });
  });

  describe('validateFundUpdate', () => {
    test('should validate valid fund update data', () => {
      const data = {
        name: 'Updated Fund Name',
        chit_value: '150000'
      };
      
      const result = validateFundUpdate(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should not require all fields for update', () => {
      const data = {
        name: 'Updated Fund Name'
        // Other fields are optional for update
      };
      
      const result = validateFundUpdate(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});