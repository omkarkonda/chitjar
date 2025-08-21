-- Migration 003: Remove prize_money column from monthly_entries table
-- This migration removes the prize_money column which is no longer used in the application

-- Check if the column exists before trying to drop it
DO $$ 
BEGIN
    -- Drop the prize_money column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'monthly_entries' 
        AND column_name = 'prize_money'
    ) THEN
        ALTER TABLE monthly_entries DROP COLUMN prize_money;
    END IF;
END $$;

-- Update any functions or views that might reference prize_money
-- (This would depend on the specific database implementation)