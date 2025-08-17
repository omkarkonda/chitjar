/**
 * Corrected Extensive Seed Data Script for ChitJar
 * 
 * This script populates the database with extensive sample data for development 
 * and demonstration purposes. It creates 5 sample funds with realistic values
 * for chit value, installment amount, dividend, and prize money.
 */

import { query } from './db';
import bcrypt from 'bcryptjs';

// ============================================================================
// Sample Data
// ============================================================================

/**
 * Sample users data
 */
const sampleUsers = [
  {
    email: 'demo@example.com',
    password: 'DemoPass123!',
    name: 'Demo User'
  },
  {
    email: 'test@example.com',
    password: 'TestPass123!',
    name: 'Test User'
  }
];

/**
 * Sample funds data (5 funds) with realistic values
 */
const sampleFunds = [
  {
    name: 'Monthly Chit Fund A',
    chit_value: 100000, // 1 lakh
    installment_amount: 10000, // 10k per month
    total_months: 12,
    start_month: '2024-01',
    end_month: '2024-12',
    notes: 'Monthly chit fund with 12 months duration'
  },
  {
    name: 'Monthly Chit Fund B',
    chit_value: 200000, // 2 lakhs
    installment_amount: 20000, // 20k per month
    total_months: 12,
    start_month: '2024-01',
    end_month: '2024-12',
    notes: 'Monthly chit fund with higher chit value'
  },
  {
    name: 'Quarterly Chit Fund',
    chit_value: 500000, // 5 lakhs
    installment_amount: 25000, // 25k per month
    total_months: 24,
    start_month: '2023-01',
    end_month: '2024-12',
    notes: 'Long-term quarterly chit fund'
  },
  {
    name: 'Annual Chit Fund',
    chit_value: 1000000, // 10 lakhs
    installment_amount: 50000, // 50k per month
    total_months: 24,
    start_month: '2023-01',
    end_month: '2024-12',
    notes: 'High value annual chit fund'
  },
  {
    name: 'Special Chit Fund',
    chit_value: 300000, // 3 lakhs
    installment_amount: 15000, // 15k per month
    total_months: 24,
    start_month: '2023-01',
    end_month: '2024-12',
    notes: 'Special mid-year chit fund'
  }
];

// ============================================================================
// Seeding Functions
// ============================================================================

/**
 * Seed users with sample data
 * Creates sample users in the database
 * @returns Promise that resolves to an array of user IDs
 */
async function seedUsers(): Promise<string[]> {
  console.log('Seeding users...');
  
  const userIds: string[] = [];
  
  for (const user of sampleUsers) {
    // Hash password
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [user.email, hashedPassword, user.name]
    );
    
    userIds.push(result.rows[0].id);
    console.log(`  Created user: ${user.email}`);
  }
  
  return userIds;
}

/**
 * Seed funds with sample data
 * Creates sample funds in the database for the given users
 * @param userIds - Array of user IDs to create funds for
 * @returns Promise that resolves to an array of fund IDs
 */
async function seedFunds(userIds: string[]): Promise<Map<string, string>> {
  console.log('Seeding funds...');
  
  const fundIds = new Map<string, string>(); // fund_name -> fund_id
  
  for (const fund of sampleFunds) {
    // Use first user for all funds
    const userId = userIds[0];
    
    // Insert fund
    const result = await query(
      `INSERT INTO funds (
         user_id, name, chit_value, installment_amount, 
         total_months, start_month, end_month, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId, fund.name, fund.chit_value, fund.installment_amount,
        fund.total_months, fund.start_month, fund.end_month, fund.notes
      ]
    );
    
    fundIds.set(fund.name, result.rows[0].id);
    console.log(`  Created fund: ${fund.name} (₹${fund.chit_value.toLocaleString()})`);
  }
  
  return fundIds;
}

/**
 * Generate realistic monthly entries for a fund
 * @param fundId - The fund ID to create entries for
 * @param fundName - The fund name (for logging)
 * @param fundDetails - The fund details including chit_value and installment_amount
 * @param startMonth - The start month in YYYY-MM format
 * @param totalMonths - The total number of months
 * @returns Promise that resolves when entries are created
 */
async function generateMonthlyEntries(
  fundId: string, 
  fundName: string,
  fundDetails: { chit_value: number, installment_amount: number },
  startMonth: string, 
  totalMonths: number
): Promise<void> {
  console.log(`  Generating ${totalMonths} monthly entries for ${fundName}...`);
  
  // Parse start month
  const parts = startMonth.split('-').map(Number);
  const startYear = parts[0] || 2024;
  const startMonthNum = parts[1] || 1;
  
  // Calculate dividend range based on fund size
  const baseDividend = Math.round(fundDetails.installment_amount * 0.08); // 8% of installment
  const dividendRange = Math.round(fundDetails.installment_amount * 0.04); // +/- 4%
  
  // Calculate prize money range
  const avgPrizeMoney = Math.round(fundDetails.chit_value * 0.95); // 95% of chit value
  const prizeMoneyRange = Math.round(fundDetails.chit_value * 0.1); // +/- 10%
  
  for (let i = 0; i < totalMonths; i++) {
    // Calculate current month
    let year = startYear;
    let month = startMonthNum + i;
    
    // Handle year rollover
    while (month > 12) {
      year++;
      month -= 12;
    }
    
    // Format month key
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    
    // Generate realistic dividend (8% of installment +/- 4%)
    const dividendAmount = baseDividend + Math.floor(Math.random() * dividendRange * 2) - dividendRange;
    
    // Generate realistic prize money (95% of chit value +/- 10%)
    const prizeMoney = avgPrizeMoney + Math.floor(Math.random() * prizeMoneyRange * 2) - prizeMoneyRange;
    
    // Ensure prize money doesn't exceed chit value
    const finalPrizeMoney = Math.min(prizeMoney, fundDetails.chit_value);
    
    // 95% chance of being paid
    const isPaid = Math.random() > 0.05;
    
    // Insert monthly entry
    await query(
      `INSERT INTO monthly_entries (
         fund_id, month_key, dividend_amount, prize_money, is_paid, notes
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        fundId, monthKey, dividendAmount, 
        finalPrizeMoney, isPaid, `Monthly entry for ${monthKey}`
      ]
    );
    
    // Generate a corresponding bid for 80% of months
    if (Math.random() > 0.2) {
      // Winning bid is usually close to chit value minus a discount
      const discount = Math.floor(Math.random() * 20000) + 5000; // 5000-25000 discount
      const winningBid = Math.max(fundDetails.chit_value - discount, 50000); // Minimum 50k bid
      
      const discountAmount = fundDetails.chit_value - winningBid;
      const bidderNames = ['Rajesh Kumar', 'Suresh Patel', 'Mahesh Shah', 'Dinesh Rao', 'Ramesh Iyer', 
                          'Vikram Singh', 'Arun Kumar', 'Sandeep Reddy', 'Kiran Nair', 'Prakash Pillai'];
      const bidderName = bidderNames[Math.floor(Math.random() * bidderNames.length)];
      
      await query(
        `INSERT INTO bids (
           fund_id, month_key, winning_bid, discount_amount, bidder_name, notes
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          fundId, monthKey, winningBid, 
          discountAmount, bidderName, `Winning bid for ${monthKey}`
        ]
      );
    }
  }
  
  console.log(`  Generated ${totalMonths} entries for ${fundName}`);
}

/**
 * Seed monthly entries with realistic sample data
 * Creates sample monthly entries for each fund with realistic values
 * @param fundIds - Map of fund names to fund IDs to create entries for
 * @returns Promise that resolves when entries are created
 */
async function seedMonthlyEntries(fundIds: Map<string, string>): Promise<void> {
  console.log('Seeding realistic monthly entries...');
  
  for (const fund of sampleFunds) {
    const fundId = fundIds.get(fund.name);
    if (!fundId) {
      console.warn(`  Skipping entries for ${fund.name}: Fund not found`);
      continue;
    }
    
    // Generate monthly entries with realistic values
    await generateMonthlyEntries(fundId, fund.name, 
      { chit_value: fund.chit_value, installment_amount: fund.installment_amount },
      fund.start_month, fund.total_months);
  }
}

/**
 * Seed settings with sample data
 * Creates sample settings in the database for the given users
 * @param userIds - Array of user IDs to create settings for
 * @returns Promise that resolves when settings are created
 */
async function seedSettings(userIds: string[]): Promise<void> {
  console.log('Seeding settings...');
  
  // Create a map of email to user ID
  const emailToUserId = new Map<string, string>();
  for (let i = 0; i < sampleUsers.length && i < userIds.length; i++) {
    const user = sampleUsers[i];
    const userId = userIds[i];
    if (user && userId) {
      emailToUserId.set(user.email, userId);
    }
  }
  
  const sampleSettings = [
    {
      user_email: 'demo@example.com',
      key: 'currency',
      value: 'INR'
    },
    {
      user_email: 'demo@example.com',
      key: 'date_format',
      value: 'DD/MM/YYYY'
    },
    {
      user_email: 'test@example.com',
      key: 'currency',
      value: 'INR'
    }
  ];
  
  for (const setting of sampleSettings) {
    const userId = emailToUserId.get(setting.user_email);
    if (!userId) {
      console.warn(`  Skipping setting for ${setting.user_email}: User not found`);
      continue;
    }
    
    // Insert setting
    await query(
      `INSERT INTO settings (user_id, key, value)
       VALUES ($1, $2, $3)`,
      [userId, setting.key, setting.value]
    );
    
    console.log(`  Created setting for ${setting.user_email}: ${setting.key} = ${setting.value}`);
  }
}

/**
 * Clear existing seed data
 * Deletes all sample data from the database
 * @returns Promise that resolves when data is cleared
 */
async function clearSeedData(): Promise<void> {
  console.log('Clearing existing seed data...');
  
  // Delete in reverse order of dependencies
  await query('DELETE FROM settings WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))', 
              [sampleUsers.map(u => u.email)]);
  await query('DELETE FROM bids WHERE fund_id IN (SELECT id FROM funds WHERE name = ANY($1))', 
              [sampleFunds.map(f => f.name)]);
  await query('DELETE FROM monthly_entries WHERE fund_id IN (SELECT id FROM funds WHERE name = ANY($1))', 
              [sampleFunds.map(f => f.name)]);
  await query('DELETE FROM funds WHERE name = ANY($1)', [sampleFunds.map(f => f.name)]);
  await query('DELETE FROM users WHERE email = ANY($1)', [sampleUsers.map(u => u.email)]);
  
  console.log('Existing seed data cleared.');
}

// ============================================================================
// Main Seeding Function
// ============================================================================

/**
 * Seed the database with realistic sample data
 * Populates the database with 5 funds and realistic entries
 * @returns Promise that resolves when seeding is complete
 */
async function seed(): Promise<void> {
  try {
    console.log('Starting realistic database seeding...');
    
    // Clear existing seed data
    await clearSeedData();
    
    // Seed users
    const userIds = await seedUsers();
    
    // Seed funds
    const fundIds = await seedFunds(userIds);
    
    // Seed monthly entries
    await seedMonthlyEntries(fundIds);
    
    // Seed settings
    await seedSettings(userIds);
    
    console.log('Realistic database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// Script Execution
// ============================================================================

// Run seeding if this script is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seeding script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding script failed:', error);
      process.exit(1);
    });
}

// Export functions for testing
export {
  seed,
  clearSeedData,
  seedUsers,
  seedFunds,
  seedMonthlyEntries,
  seedSettings
};