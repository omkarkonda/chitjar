-- ChitJar Database Schema
-- PostgreSQL schema for chit fund tracking application

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and data isolation
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Funds table for chit fund definitions
CREATE TABLE IF NOT EXISTS funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    chit_value DECIMAL(12,2) NOT NULL CHECK (chit_value > 0),
    installment_amount DECIMAL(12,2) NOT NULL CHECK (installment_amount > 0),
    total_months INTEGER NOT NULL CHECK (total_months > 0),
    start_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    end_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    is_active BOOLEAN DEFAULT true,
    early_exit_month VARCHAR(7), -- Format: YYYY-MM, NULL if not exited early
    needs_recalculation BOOLEAN DEFAULT true, -- Flag to indicate if analytics need recalculation
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure start_month is before end_month
    CONSTRAINT valid_month_range CHECK (start_month < end_month),
    -- Ensure early_exit_month is between start and end if provided
    CONSTRAINT valid_early_exit CHECK (
        early_exit_month IS NULL OR 
        (early_exit_month >= start_month AND early_exit_month <= end_month)
    )
);

-- Monthly entries for dividends and prize money
CREATE TABLE IF NOT EXISTS monthly_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    month_key VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    dividend_amount DECIMAL(12,2) DEFAULT 0 CHECK (dividend_amount >= 0),
    is_paid BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per fund and month
    UNIQUE(fund_id, month_key)
);

-- Bids table for historical winning bids
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    month_key VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    winning_bid DECIMAL(12,2) NOT NULL CHECK (winning_bid > 0),
    discount_amount DECIMAL(12,2) NOT NULL CHECK (discount_amount >= 0),
    bidder_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per fund and month
    UNIQUE(fund_id, month_key)
);

-- Settings table for user preferences and application config
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per user and key
    UNIQUE(user_id, key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_funds_user_id ON funds(user_id);
CREATE INDEX IF NOT EXISTS idx_funds_start_month ON funds(start_month);
CREATE INDEX IF NOT EXISTS idx_funds_end_month ON funds(end_month);
CREATE INDEX IF NOT EXISTS idx_monthly_entries_fund_id ON monthly_entries(fund_id);
CREATE INDEX IF NOT EXISTS idx_monthly_entries_month_key ON monthly_entries(month_key);
CREATE INDEX IF NOT EXISTS idx_bids_fund_id ON bids(fund_id);
CREATE INDEX IF NOT EXISTS idx_bids_month_key ON bids(month_key);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funds_updated_at BEFORE UPDATE ON funds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_entries_updated_at BEFORE UPDATE ON monthly_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Validation functions for constraints that can't use subqueries
CREATE OR REPLACE FUNCTION validate_monthly_entry()
RETURNS TRIGGER AS $$
DECLARE
    fund_record RECORD;
BEGIN
    -- Get fund details
    SELECT chit_value, start_month, end_month, early_exit_month
    INTO fund_record
    FROM funds
    WHERE id = NEW.fund_id;
    
    -- Check if prize_money doesn't exceed chit_value
    IF NEW.prize_money > fund_record.chit_value THEN
        RAISE EXCEPTION 'Prize money (%) cannot exceed chit value (%)',
            NEW.prize_money, fund_record.chit_value;
    END IF;
    
    -- Check if month_key is within fund's date range
    IF NEW.month_key < fund_record.start_month THEN
        RAISE EXCEPTION 'Month key (%) cannot be before fund start month (%)',
            NEW.month_key, fund_record.start_month;
    END IF;
    
    IF NEW.month_key > COALESCE(fund_record.early_exit_month, fund_record.end_month) THEN
        RAISE EXCEPTION 'Month key (%) cannot be after fund end month (%)',
            NEW.month_key, COALESCE(fund_record.early_exit_month, fund_record.end_month);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_bid()
RETURNS TRIGGER AS $$
DECLARE
    fund_record RECORD;
BEGIN
    -- Get fund details
    SELECT chit_value, start_month, end_month, early_exit_month
    INTO fund_record
    FROM funds
    WHERE id = NEW.fund_id;
    
    -- Check if winning_bid doesn't exceed chit_value
    IF NEW.winning_bid > fund_record.chit_value THEN
        RAISE EXCEPTION 'Winning bid (%) cannot exceed chit value (%)',
            NEW.winning_bid, fund_record.chit_value;
    END IF;
    
    -- Check if discount_amount doesn't exceed chit_value
    IF NEW.discount_amount > fund_record.chit_value THEN
        RAISE EXCEPTION 'Discount amount (%) cannot exceed chit value (%)',
            NEW.discount_amount, fund_record.chit_value;
    END IF;
    
    -- Check if month_key is within fund's date range
    IF NEW.month_key < fund_record.start_month THEN
        RAISE EXCEPTION 'Month key (%) cannot be before fund start month (%)',
            NEW.month_key, fund_record.start_month;
    END IF;
    
    IF NEW.month_key > COALESCE(fund_record.early_exit_month, fund_record.end_month) THEN
        RAISE EXCEPTION 'Month key (%) cannot be after fund end month (%)',
            NEW.month_key, COALESCE(fund_record.early_exit_month, fund_record.end_month);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for validation
CREATE TRIGGER validate_monthly_entry_trigger
    BEFORE INSERT OR UPDATE ON monthly_entries
    FOR EACH ROW EXECUTE FUNCTION validate_monthly_entry();

CREATE TRIGGER validate_bid_trigger
    BEFORE INSERT OR UPDATE ON bids
    FOR EACH ROW EXECUTE FUNCTION validate_bid();

-- Function to mark fund as needing recalculation
CREATE OR REPLACE FUNCTION mark_fund_for_recalculation()
RETURNS TRIGGER AS $
BEGIN
    -- Update the fund to mark it as needing recalculation
    UPDATE funds 
    SET needs_recalculation = true
    WHERE id = COALESCE(NEW.fund_id, OLD.fund_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- Triggers to mark funds for recalculation when entries or bids change
CREATE TRIGGER monthly_entry_recalc_trigger
    AFTER INSERT OR UPDATE OR DELETE ON monthly_entries
    FOR EACH ROW EXECUTE FUNCTION mark_fund_for_recalculation();

CREATE TRIGGER bid_recalc_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bids
    FOR EACH ROW EXECUTE FUNCTION mark_fund_for_recalculation();

-- Function to validate month_key format (YYYY-MM)
CREATE OR REPLACE FUNCTION validate_month_key(month_key VARCHAR(7))
RETURNS BOOLEAN AS $$
BEGIN
    -- Check basic format first
    IF NOT (month_key ~ '^\d{4}-\d{2}$') THEN
        RETURN FALSE;
    END IF;
    
    -- Try to convert to date, catch any exceptions
    BEGIN
        PERFORM TO_DATE(month_key || '-01', 'YYYY-MM-DD');
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Add check constraints for month_key format
ALTER TABLE funds ADD CONSTRAINT check_start_month_format 
    CHECK (validate_month_key(start_month));

ALTER TABLE funds ADD CONSTRAINT check_end_month_format 
    CHECK (validate_month_key(end_month));

ALTER TABLE funds ADD CONSTRAINT check_early_exit_month_format 
    CHECK (early_exit_month IS NULL OR validate_month_key(early_exit_month));

ALTER TABLE monthly_entries ADD CONSTRAINT check_month_key_format 
    CHECK (validate_month_key(month_key));

ALTER TABLE bids ADD CONSTRAINT check_bid_month_key_format 
    CHECK (validate_month_key(month_key));
