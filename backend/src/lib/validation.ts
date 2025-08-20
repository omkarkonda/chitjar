/**
 * Zod Validation Schemas for ChitJar Backend
 * 
 * This module provides comprehensive validation schemas for all data models
 * ensuring server-client parity and type safety across the application.
 */

import { z } from 'zod';

// ============================================================================
// Common Validation Utilities
// ============================================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email format').max(255);

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one lowercase letter, one uppercase letter, and one number');

/**
 * Month key validation (YYYY-MM format)
 */
export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Month key must be in YYYY-MM format')
  .refine((val) => {
    const parts = val.split('-');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    return !isNaN(year) && !isNaN(month) &&
           year >= 1900 && year <= 2100 &&
           month >= 1 && month <= 12;
  }, 'Invalid month key: year must be 1900-2100, month must be 01-12');

/**
 * Positive decimal validation for monetary values
 * @returns Zod schema for positive monetary values
 */
export const monetarySchema = z
  .number()
  .positive('Amount must be positive')
  .max(99999999.99, 'Amount too large')
  .multipleOf(0.01, 'Amount can have at most 2 decimal places');

/**
 * Non-negative decimal validation for monetary values (allows 0)
 * @returns Zod schema for non-negative monetary values
 */
export const nonNegativeMonetarySchema = z
  .number()
  .nonnegative('Amount cannot be negative')
  .max(99999999.99, 'Amount too large')
  .multipleOf(0.01, 'Amount can have at most 2 decimal places');

/**
 * Custom validation for monetary values that must not exceed a chit value
 * @param chitValue - Maximum allowed value (chit value)
 * @returns Zod schema for monetary values within chit value limits
 */
export const monetaryWithinChitValueSchema = (chitValue: number) => 
  z.number()
    .positive('Amount must be positive')
    .max(chitValue, `Amount cannot exceed chit value of ${chitValue}`)
    .max(99999999.99, 'Amount too large')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places');

/**
 * Custom validation for non-negative monetary values that must not exceed a chit value
 * @param chitValue - Maximum allowed value (chit value)
 * @returns Zod schema for non-negative monetary values within chit value limits
 */
export const nonNegativeMonetaryWithinChitValueSchema = (chitValue: number) => 
  z.number()
    .nonnegative('Amount cannot be negative')
    .max(chitValue, `Amount cannot exceed chit value of ${chitValue}`)
    .max(99999999.99, 'Amount too large')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places');

/**
 * Positive integer validation
 */
export const positiveIntegerSchema = z
  .number()
  .int('Must be an integer')
  .positive('Must be positive');

// ============================================================================
// User Validation Schemas
// ============================================================================

/**
 * User registration schema
 */
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').trim(),
});

/**
 * User login schema
 */
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * User profile update schema
 */
export const userProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').trim().optional(),
  email: emailSchema.optional(),
});

/**
 * Password change schema
 */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * User database model schema
 */
export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  password_hash: z.string(),
  name: z.string().max(255),
  created_at: z.date(),
  updated_at: z.date(),
  last_login_at: z.date().nullable(),
  is_active: z.boolean(),
});

// ============================================================================
// Fund Validation Schemas
// ============================================================================

/**
 * Fund creation schema
 */
export const fundCreationSchema = z.object({
  name: z.string().min(1, 'Fund name is required').max(255, 'Fund name too long').trim(),
  chit_value: monetarySchema,
  installment_amount: monetarySchema,
  total_months: positiveIntegerSchema.max(120, 'Total months cannot exceed 120'),
  start_month: monthKeySchema,
  end_month: monthKeySchema,
  notes: z.string().max(1000, 'Notes too long').optional(),
}).refine((data) => data.start_month < data.end_month, {
  message: 'End month must be after start month',
  path: ['end_month'],
}).refine((data) => {
  const startDate = new Date(data.start_month + '-01');
  const endDate = new Date(data.end_month + '-01');
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth()) + 1;
  return monthsDiff === data.total_months;
}, {
  message: 'Total months must match the difference between start and end months',
  path: ['total_months'],
});

/**
 * Fund update schema
 */
export const fundUpdateSchema = z.object({
  name: z.string().min(1, 'Fund name is required').max(255, 'Fund name too long').trim().optional(),
  chit_value: monetarySchema.optional(),
  installment_amount: monetarySchema.optional(),
  total_months: positiveIntegerSchema.max(120, 'Total months cannot exceed 120').optional(),
  start_month: monthKeySchema.optional(),
  end_month: monthKeySchema.optional(),
  is_active: z.boolean().optional(),
  early_exit_month: monthKeySchema.nullable().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
}).refine((data) => {
  if (data.start_month && data.end_month) {
    return data.start_month < data.end_month;
  }
  return true;
}, {
  message: 'End month must be after start month',
  path: ['end_month'],
});

/**
 * Fund database model schema
 */
export const fundSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  name: z.string().max(255),
  chit_value: z.number(),
  installment_amount: z.number(),
  total_months: z.number().int(),
  start_month: monthKeySchema,
  end_month: monthKeySchema,
  is_active: z.boolean(),
  early_exit_month: monthKeySchema.nullable(),
  notes: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

// ============================================================================
// Monthly Entry Validation Schemas
// ============================================================================

/**
 * Monthly entry creation schema
 */
export const monthlyEntryCreationSchema = z.object({
  fund_id: uuidSchema,
  month_key: monthKeySchema,
  dividend_amount: nonNegativeMonetarySchema.default(0),
  prize_money: nonNegativeMonetarySchema.default(0),
  is_paid: z.boolean().default(false),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Monthly entry update schema
 */
export const monthlyEntryUpdateSchema = z.object({
  dividend_amount: nonNegativeMonetarySchema.optional(),
  prize_money: nonNegativeMonetarySchema.optional(),
  is_paid: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Monthly entry database model schema
 */
export const monthlyEntrySchema = z.object({
  id: uuidSchema,
  fund_id: uuidSchema,
  month_key: monthKeySchema,
  dividend_amount: z.number().nonnegative(),
  prize_money: z.number().nonnegative(),
  is_paid: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

// ============================================================================
// Bid Validation Schemas
// ============================================================================

/**
 * Bid creation schema
 */
export const bidCreationSchema = z.object({
  fund_id: uuidSchema,
  month_key: monthKeySchema,
  winning_bid: monetarySchema,
  discount_amount: nonNegativeMonetarySchema,
  bidder_name: z.string().max(255, 'Bidder name too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Bid update schema
 */
export const bidUpdateSchema = z.object({
  winning_bid: monetarySchema.optional(),
  discount_amount: nonNegativeMonetarySchema.optional(),
  bidder_name: z.string().max(255, 'Bidder name too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Bid database model schema
 */
export const bidSchema = z.object({
  id: uuidSchema,
  fund_id: uuidSchema,
  month_key: monthKeySchema,
  winning_bid: z.number().positive(),
  discount_amount: z.number().nonnegative(),
  bidder_name: z.string().max(255).nullable(),
  notes: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

// ============================================================================
// Settings Validation Schemas
// ============================================================================

/**
 * Settings creation/update schema
 */
export const settingsSchema = z.object({
  key: z.string().min(1, 'Setting key is required').max(255, 'Setting key too long'),
  value: z.string().max(1000, 'Setting value too long').optional(),
});

/**
 * Settings database model schema
 */
export const settingsDatabaseSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  key: z.string().max(255),
  value: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

/**
 * Pagination query parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Fund list query parameters schema
 */
export const fundListQuerySchema = paginationSchema.extend({
  is_active: z.coerce.boolean().optional(),
  search: z.string().max(255).optional(),
});

/**
 * Monthly entry list query parameters schema
 */
export const monthlyEntryListQuerySchema = paginationSchema.extend({
  fund_id: uuidSchema.optional(),
  month_key: monthKeySchema.optional(),
  is_paid: z.coerce.boolean().optional(),
});

/**
 * Bid list query parameters schema
 */
export const bidListQuerySchema = paginationSchema.extend({
  fund_id: uuidSchema.optional(),
  month_key: monthKeySchema.optional(),
});

// ============================================================================
// CSV Import Validation Schemas
// ============================================================================

/**
 * CSV fund import schema
 */
export const csvFundImportSchema = z.object({
  name: z.string().min(1).max(255),
  chit_value: z.coerce.number().positive(),
  installment_amount: z.coerce.number().positive(),
  total_months: z.coerce.number().int().positive().max(120),
  start_month: monthKeySchema,
  end_month: monthKeySchema,
  notes: z.string().max(1000).optional(),
});

/**
 * CSV monthly entry import schema
 */
export const csvMonthlyEntryImportSchema = z.object({
  fund_name: z.string().min(1).max(255),
  month_key: monthKeySchema,
  dividend_amount: z.coerce.number().nonnegative().default(0),
  prize_money: z.coerce.number().nonnegative().default(0),
  is_paid: z.coerce.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

/**
 * CSV bid import schema
 */
export const csvBidImportSchema = z.object({
  fund_name: z.string().min(1).max(255),
  month_key: monthKeySchema,
  winning_bid: z.coerce.number().positive(),
  discount_amount: z.coerce.number().nonnegative(),
  bidder_name: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

// ============================================================================
// Analytics Validation Schemas
// ============================================================================

/**
 * XIRR calculation request schema
 */
export const xirrCalculationSchema = z.object({
  fund_id: uuidSchema,
  include_projections: z.boolean().default(false),
});

/**
 * FD comparison request schema
 */
export const fdComparisonSchema = z.object({
  fd_rate: z.number().positive().max(50, 'FD rate cannot exceed 50%'),
});

/**
 * Analytics date range schema
 */
export const analyticsDateRangeSchema = z.object({
  start_month: monthKeySchema,
  end_month: monthKeySchema,
}).refine((data) => data.start_month <= data.end_month, {
  message: 'End month must be after or equal to start month',
  path: ['end_month'],
});

// ============================================================================
// Type Exports
// ============================================================================

// User types
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
export type User = z.infer<typeof userSchema>;

// Fund types
export type FundCreation = z.infer<typeof fundCreationSchema>;
export type FundUpdate = z.infer<typeof fundUpdateSchema>;
export type Fund = z.infer<typeof fundSchema>;

// Monthly entry types
export type MonthlyEntryCreation = z.infer<typeof monthlyEntryCreationSchema>;
export type MonthlyEntryUpdate = z.infer<typeof monthlyEntryUpdateSchema>;
export type MonthlyEntry = z.infer<typeof monthlyEntrySchema>;

// Bid types
export type BidCreation = z.infer<typeof bidCreationSchema>;
export type BidUpdate = z.infer<typeof bidUpdateSchema>;
export type Bid = z.infer<typeof bidSchema>;

// Settings types
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsDatabase = z.infer<typeof settingsDatabaseSchema>;

// Query types
export type Pagination = z.infer<typeof paginationSchema>;
export type FundListQuery = z.infer<typeof fundListQuerySchema>;
export type MonthlyEntryListQuery = z.infer<typeof monthlyEntryListQuerySchema>;
export type BidListQuery = z.infer<typeof bidListQuerySchema>;

// CSV import types
export type CsvFundImport = z.infer<typeof csvFundImportSchema>;
export type CsvMonthlyEntryImport = z.infer<typeof csvMonthlyEntryImportSchema>;
export type CsvBidImport = z.infer<typeof csvBidImportSchema>;

// Analytics types
export type XirrCalculation = z.infer<typeof xirrCalculationSchema>;
export type FdComparison = z.infer<typeof fdComparisonSchema>;
export type AnalyticsDateRange = z.infer<typeof analyticsDateRangeSchema>;