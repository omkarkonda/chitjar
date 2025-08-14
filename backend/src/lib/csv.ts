/**
 * CSV Utilities for ChitJar Backend
 * 
 * This module provides utilities for handling CSV import/export functionality
 * including parsing, validation, and error reporting.
 */

import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { CsvBidImport } from './validation';
import { validateMonthInFundRange } from './validation-utils';
import { query } from './db';

// Type for validated bid with fund_id
type ValidatedBidImport = CsvBidImport & { fund_id: string };

// ============================================================================

/**
 * CSV Parse Error
 */
export class CsvParseError extends Error {
  public lineNumber: number;
  public field: string | undefined;
  
  constructor(message: string, lineNumber: number, field: string | undefined) {
    super(message);
    this.name = 'CsvParseError';
    this.lineNumber = lineNumber;
    this.field = field;
  }
}

/**
 * CSV Validation Error
 */
export class CsvValidationError extends Error {
  public lineNumber: number;
  public field: string | undefined;
  public value: any;
  
  constructor(message: string, lineNumber: number, field: string | undefined, value?: any) {
    super(message);
    this.name = 'CsvValidationError';
    this.lineNumber = lineNumber;
    this.field = field;
    this.value = value !== undefined ? value : undefined;
  }
}

// ============================================================================

/**
 * Parse CSV data from a string
 * Converts CSV string data into an array of validated objects using a Zod schema
 * @param csvData - CSV data as a string
 * @param schema - Zod schema to validate each row against
 * @param type - Type of data being parsed ('bids', 'funds', or 'entries')
 * @returns Promise that resolves to an object containing valid rows and errors
 */
export async function parseCsvData<T>(
  csvData: string,
  schema: any,
  type: 'bids' | 'funds' | 'entries'
): Promise<{
  validRows: T[];
  errors: (CsvParseError | CsvValidationError)[];
}> {
  return new Promise((resolve, reject) => {
    const validRows: T[] = [];
    const errors: (CsvParseError | CsvValidationError)[] = [];
    let lineNumber = 1;
    
    const stream = new Readable();
    stream.push(csvData);
    stream.push(null);
    
    stream
      .pipe(csvParser())
      .on('data', (row: any) => {
        lineNumber++;
        try {
          // Transform row keys to match schema expectations
          const transformedRow = transformRowKeys(row, type);
          
          // Validate row against schema
          const parsed = schema.safeParse(transformedRow);
          
          if (parsed.success) {
            validRows.push(parsed.data);
          } else {
            // Collect validation errors
            parsed.error.issues.forEach((issue: any) => {
              errors.push(new CsvValidationError(
                issue.message,
                lineNumber,
                issue.path.join('.'),
                transformedRow[issue.path[0]]
              ));
            });
          }
        } catch (error) {
          errors.push(new CsvParseError(
            error instanceof Error ? error.message : 'Unknown error',
            lineNumber,
            undefined
          ));
        }
      })
      .on('end', () => {
        resolve({ validRows, errors });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Transform row keys to match schema expectations
 */
function transformRowKeys(row: any, type: 'bids' | 'funds' | 'entries'): any {
  const transformed: any = {};
  
  // Convert keys to camelCase and handle type-specific transformations
  for (const [key, value] of Object.entries(row)) {
    const camelCaseKey = toCamelCase(key.trim());
    
    // Handle type-specific field mappings
    if (type === 'bids') {
      switch (camelCaseKey) {
        case 'fundname':
          transformed.fund_name = value;
          break;
        case 'monthkey':
        case 'month':
          transformed.month_key = value;
          break;
        case 'winningbid':
        case 'winningBid':
        case 'winningBidAmount':
          transformed.winning_bid = value;
          break;
        case 'discountamount':
        case 'discount':
          transformed.discount_amount = value;
          break;
        case 'biddername':
          transformed.bidder_name = value;
          break;
        default:
          transformed[camelCaseKey] = value;
      }
    } else if (type === 'funds') {
      switch (camelCaseKey) {
        case 'chitvalue':
          transformed.chit_value = value;
          break;
        case 'installmentamount':
          transformed.installment_amount = value;
          break;
        case 'totalmonths':
          transformed.total_months = value;
          break;
        case 'startmonth':
          transformed.start_month = value;
          break;
        case 'endmonth':
          transformed.end_month = value;
          break;
        default:
          transformed[camelCaseKey] = value;
      }
    } else if (type === 'entries') {
      switch (camelCaseKey) {
        case 'fundname':
          transformed.fund_name = value;
          break;
        case 'monthkey':
        case 'month':
          transformed.month_key = value;
          break;
        case 'dividendamount':
          transformed.dividend_amount = value;
          break;
        case 'prizemoney':
          transformed.prize_money = value;
          break;
        case 'ispaid':
          transformed.is_paid = value === 'true' || value === '1';
          break;
        default:
          transformed[camelCaseKey] = value;
      }
    }
  }
  
  return transformed;
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

/**
 * Validate bids against fund constraints
 * Checks that bids are associated with valid funds and meet fund constraints
 * @param bids - Array of bid objects to validate
 * @param userId - ID of the user who owns the bids
 * @returns Promise that resolves to an object containing valid bids and errors
 */
export async function validateBidsAgainstFunds(
  bids: CsvBidImport[],
  userId: string
): Promise<{
  validBids: ValidatedBidImport[];
  errors: CsvValidationError[];
}> {
  const validBids: ValidatedBidImport[] = [];
  const errors: CsvValidationError[] = [];
  
  // Get all user's funds
  const fundsResult = await query(
    `SELECT id, name, start_month, end_month, early_exit_month, chit_value 
     FROM funds WHERE user_id = $1`,
    [userId]
  );
  
  const fundsMap = new Map(
    fundsResult.rows.map(fund => [fund.name.toLowerCase(), fund])
  );
  
  // Validate each bid
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    if (!bid) continue; // Skip undefined bids
    
    const lineNumber = i + 2; // +1 for header row, +1 for 1-based indexing
    
    // Find fund by name
    const fund = fundsMap.get(bid.fund_name.toLowerCase());
    if (!fund) {
      errors.push(new CsvValidationError(
        `Fund "${bid.fund_name}" not found`,
        lineNumber,
        'fund_name',
        bid.fund_name
      ));
      continue;
    }
    
    // Validate month is within fund range
    try {
      validateMonthInFundRange(
        bid.month_key,
        fund.start_month,
        fund.end_month,
        fund.early_exit_month
      );
    } catch (error) {
      errors.push(new CsvValidationError(
        error instanceof Error ? error.message : 'Invalid month for fund',
        lineNumber,
        'month_key',
        bid.month_key
      ));
      continue;
    }
    
    // Validate winning bid doesn't exceed chit value
    if (bid.winning_bid > fund.chit_value) {
      errors.push(new CsvValidationError(
        `Winning bid (${bid.winning_bid}) cannot exceed chit value (${fund.chit_value})`,
        lineNumber,
        'winning_bid',
        bid.winning_bid
      ));
      continue;
    }
    
    // Validate discount amount doesn't exceed chit value
    if (bid.discount_amount > fund.chit_value) {
      errors.push(new CsvValidationError(
        `Discount amount (${bid.discount_amount}) cannot exceed chit value (${fund.chit_value})`,
        lineNumber,
        'discount_amount',
        bid.discount_amount
      ));
      continue;
    }
    
    // Add fund_id to bid for import
    validBids.push({
      ...bid,
      fund_id: fund.id
    });
  }
  
  return { validBids, errors };
}

/**
 * Generate CSV template
 */
export function generateCsvTemplate(type: 'bids' | 'funds' | 'entries'): string {
  if (type === 'bids') {
    return 'fund_name,month_key,winning_bid,discount_amount,bidder_name,notes\n';
  } else if (type === 'funds') {
    return 'name,chit_value,installment_amount,total_months,start_month,end_month,notes\n';
  } else {
    return 'fund_name,month_key,dividend_amount,prize_money,is_paid,notes\n';
  }
}

/**
 * Format CSV errors for API response
 * Converts CSV errors into a format suitable for API responses
 * @param errors - Array of CSV errors to format
 * @returns Array of formatted error objects
 */
export function formatCsvErrors(errors: (CsvParseError | CsvValidationError)[]): any[] {
  return errors.map(error => ({
    line: error.lineNumber,
    message: error.message,
    field: error.field,
    value: 'value' in error ? error.value : undefined
  }));
}