/**
 * Seed Data Script for ChitJar
 * 
 * This script populates the database with sample data for development and demonstration purposes.
 * It creates sample users, funds, monthly entries, bids, and settings.
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
 * Sample funds data
 */
const sampleFunds = [
  {
    name: 'Monthly Chit Fund',
    chit_value: 100000,
    installment_amount: 10000,
    total_months: 12,
    start_month: '2024-01',
    end_month: '2024-12',
    notes: 'Sample monthly chit fund for demonstration'
  },
  {
    name: 'Quarterly Chit Fund',
    chit_value: 500000,
    installment_amount: 25000,
    total_months: 24,
    start_month: '2024-01',
    end_month: '2025-12',
    notes: 'Sample quarterly chit fund for demonstration'
  }
];

/**
 * Sample monthly entries data
 */
const sampleMonthlyEntries = [
  {
    fund_name: 'Monthly Chit Fund',
    month_key: '2024-01',
    dividend_amount: 8000,
    prize_money: 95000,
    is_paid: true,
    notes: 'First month entry'
  },
  {
    fund_name: 'Monthly Chit Fund',
    month_key: '2024-02',
    dividend_amount: 8500,
    prize_money: 94000,
    is_paid: true,
    notes: 'Second month entry'
  },
  {
    fund_name: 'Monthly Chit Fund',
    month_key: '2024-03',
    dividend_amount: 9000,
    prize_money: 93000,
    is_paid: false,
    notes: 'Third month entry'
  }
];

/**
 * Sample bids data
 */
const sampleBids = [
  {
    fund_name: 'Monthly Chit Fund',
    month_key: '2024-01',
    winning_bid: 95000,
    discount_amount: 5000,
    bidder_name: 'Rajesh Kumar',
    notes: 'First month winning bid'
  },
  {
    fund_name: 'Monthly Chit Fund',
    month_key: '2024-02',
    winning_bid: 94000,
    discount_amount: 6000,
    bidder_name: 'Suresh Patel',
    notes: 'Second month winning bid'
  }
];

/**
 * Sample settings data
 */
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
    console.log(`  Created fund: ${fund.name}`);
  }
  
  return fundIds;
}

/**
 * Seed monthly entries with sample data
 * Creates sample monthly entries in the database for the given funds
 * @param fundIds - Map of fund names to fund IDs to create entries for
 * @returns Promise that resolves when entries are created
 */
async function seedMonthlyEntries(fundIds: Map<string, string>): Promise<void> {
  console.log('Seeding monthly entries...');
  
  for (const entry of sampleMonthlyEntries) {
    const fundId = fundIds.get(entry.fund_name);
    if (!fundId) {
      console.warn(`  Skipping entry for ${entry.fund_name}: Fund not found`);
      continue;
    }
    
    // Insert monthly entry
    await query(
      `INSERT INTO monthly_entries (
         fund_id, month_key, dividend_amount, prize_money, is_paid, notes
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        fundId, entry.month_key, entry.dividend_amount, 
        entry.prize_money, entry.is_paid, entry.notes
      ]
    );
    
    console.log(`  Created entry for ${entry.fund_name} - ${entry.month_key}`);
  }
}

/**
 * Seed bids with sample data
 * Creates sample bids in the database for the given funds
 * @param fundIds - Map of fund names to fund IDs to create bids for
 * @returns Promise that resolves when bids are created
 */
async function seedBids(fundIds: Map<string, string>): Promise<void> {
  console.log('Seeding bids...');
  
  for (const bid of sampleBids) {
    const fundId = fundIds.get(bid.fund_name);
    if (!fundId) {
      console.warn(`  Skipping bid for ${bid.fund_name}: Fund not found`);
      continue;
    }
    
    // Insert bid
    await query(
      `INSERT INTO bids (
         fund_id, month_key, winning_bid, discount_amount, bidder_name, notes
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        fundId, bid.month_key, bid.winning_bid, 
        bid.discount_amount, bid.bidder_name, bid.notes
      ]
    );
    
    console.log(`  Created bid for ${bid.fund_name} - ${bid.month_key}`);
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
 * Seed the database with sample data
 * Populates the database with sample users, funds, entries, bids, and settings
 * @returns Promise that resolves when seeding is complete
 */
async function seed(): Promise<void> {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing seed data
    await clearSeedData();
    
    // Seed users
    const userIds = await seedUsers();
    
    // Seed funds
    const fundIds = await seedFunds(userIds);
    
    // Seed monthly entries
    await seedMonthlyEntries(fundIds);
    
    // Seed bids
    await seedBids(fundIds);
    
    // Seed settings
    await seedSettings(userIds);
    
    console.log('Database seeding completed successfully!');
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
  seedBids,
  seedSettings
};