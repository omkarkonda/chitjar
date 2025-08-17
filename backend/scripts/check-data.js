const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkData() {
  try {
    console.log('Checking database data...\n');
    
    // Check funds
    console.log('=== FUNDS ===');
    const fundsResult = await pool.query(`
      SELECT id, name, chit_value, installment_amount, total_months 
      FROM funds 
      ORDER BY created_at
    `);
    
    fundsResult.rows.forEach(fund => {
      console.log(`${fund.name}:`);
      console.log(`  ID: ${fund.id}`);
      console.log(`  Chit Value: ${fund.chit_value} (type: ${typeof fund.chit_value})`);
      console.log(`  Installment: ${fund.installment_amount} (type: ${typeof fund.installment_amount})`);
      console.log(`  Total Months: ${fund.total_months} (type: ${typeof fund.total_months})`);
      console.log('');
    });
    
    // Check a few entries for the first fund
    if (fundsResult.rows.length > 0) {
      const firstFundId = fundsResult.rows[0].id;
      console.log(`=== ENTRIES FOR ${fundsResult.rows[0].name} ===`);
      const entriesResult = await pool.query(`
        SELECT id, month_key, dividend_amount, prize_money, is_paid
        FROM monthly_entries
        WHERE fund_id = $1
        ORDER BY month_key
        LIMIT 5
      `, [firstFundId]);
      
      entriesResult.rows.forEach(entry => {
        console.log(`Month ${entry.month_key}:`);
        console.log(`  ID: ${entry.id}`);
        console.log(`  Dividend: ${entry.dividend_amount} (type: ${typeof entry.dividend_amount})`);
        console.log(`  Prize Money: ${entry.prize_money} (type: ${typeof entry.prize_money})`);
        console.log(`  Paid: ${entry.is_paid} (type: ${typeof entry.is_paid})`);
        console.log('');
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error checking data:', error);
    await pool.end();
  }
}

checkData();