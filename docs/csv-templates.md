# CSV Templates for ChitJar

This document defines the CSV templates used for importing data into ChitJar. Each template includes the required headers, data types, and examples.

## 1. Funds CSV Template

### Headers
| Header | Data Type | Required | Description |
|--------|-----------|----------|-------------|
| name | String (max 255 chars) | Yes | Name of the chit fund |
| chit_value | Decimal (positive) | Yes | Total value of the chit fund |
| installment_amount | Decimal (positive) | Yes | Monthly payment amount |
| total_months | Integer (1-120) | Yes | Duration of the fund in months |
| start_month | String (YYYY-MM) | Yes | Start date of the fund |
| end_month | String (YYYY-MM) | Yes | End date of the fund |
| notes | String (max 1000 chars) | No | Additional notes about the fund |

### Example
```csv
name,chit_value,installment_amount,total_months,start_month,end_month,notes
"Monthly Chit Fund 2024",100000.00,10000.00,12,2024-01,2024-12,"Started with 10 members"
"Quarterly Fund",500000.00,25000.00,20,2024-03,2025-10,"Flexible payment option"
```

## 2. Monthly Entries CSV Template

### Headers
| Header | Data Type | Required | Description |
|--------|-----------|----------|-------------|
| fund_name | String (max 255 chars) | Yes | Name of the existing fund |
| month_key | String (YYYY-MM) | Yes | Month for the entry |
| dividend_amount | Decimal (non-negative) | No (default: 0) | Dividend received for the month |
| prize_money | Decimal (non-negative) | No (default: 0) | Prize money received for the month |
| is_paid | Boolean | No (default: false) | Whether the installment was paid |
| notes | String (max 1000 chars) | No | Additional notes about the entry |

### Example
```csv
fund_name,month_key,dividend_amount,prize_money,is_paid,notes
"Monthly Chit Fund 2024",2024-01,1500.00,0.00,true,"First month payment"
"Monthly Chit Fund 2024",2024-02,1200.00,25000.00,true,"Won the bid this month"
"Quarterly Fund",2024-03,2000.00,0.00,false,"Payment pending"
```

## 3. Bids CSV Template

### Headers
| Header | Data Type | Required | Description |
|--------|-----------|----------|-------------|
| fund_name | String (max 255 chars) | Yes | Name of the existing fund |
| month_key | String (YYYY-MM) | Yes | Month for the bid |
| winning_bid | Decimal (positive) | Yes | Amount of the winning bid |
| discount_amount | Decimal (non-negative) | Yes | Discount amount received |
| bidder_name | String (max 255 chars) | No | Name of the winning bidder |
| notes | String (max 1000 chars) | No | Additional notes about the bid |

### Example
```csv
fund_name,month_key,winning_bid,discount_amount,bidder_name,notes
"Monthly Chit Fund 2024",2024-01,95000.00,5000.00,"Rajesh Kumar","First auction"
"Monthly Chit Fund 2024",2024-02,92000.00,8000.00,"Suresh Patel","Early exit option"
"Quarterly Fund",2024-03,480000.00,20000.00,"Priya Sharma","Competitive bidding"
```

## Data Validation Rules

### General Rules
1. All monetary values should be in the same currency (typically INR for Indian chit funds)
2. Date formats must be strictly YYYY-MM (e.g., "2024-01" for January 2024)
3. Text fields should not contain commas, or if they do, the entire field should be enclosed in double quotes
4. Boolean values can be represented as "true"/"false" or "1"/"0"

### Specific Validation Rules
1. **Funds:**
   - `chit_value` and `installment_amount` must be positive
   - `total_months` must be between 1 and 120
   - `start_month` must be before `end_month`

2. **Monthly Entries:**
   - `month_key` must be within the fund's date range
   - `prize_money` cannot exceed the fund's `chit_value`
   - `dividend_amount` and `prize_money` must be non-negative

3. **Bids:**
   - `month_key` must be within the fund's date range
   - `winning_bid` and `discount_amount` cannot exceed the fund's `chit_value`
   - `winning_bid` must be positive
   - `discount_amount` must be non-negative

## Error Handling

When importing CSV data:
1. Each row is validated individually
2. Errors are reported per line number
3. Valid rows are processed even if other rows contain errors
4. Duplicate entries (based on unique constraints) will be rejected

## Best Practices

1. Always use the provided templates as a starting point
2. Ensure fund names in entries and bids match exactly with existing funds
3. Validate date ranges against fund start/end dates
4. Check that monetary values don't exceed fund chit values
5. Use consistent formatting for all entries
6. Test with a small subset of data first