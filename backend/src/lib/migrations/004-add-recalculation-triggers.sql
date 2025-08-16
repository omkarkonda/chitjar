-- Migration 002: Add recalculation triggers
-- This migration adds a needs_recalculation flag to funds table and creates triggers
-- to automatically mark funds for recalculation when entries or bids are modified.

-- Add needs_recalculation column to funds table
ALTER TABLE funds ADD COLUMN IF NOT EXISTS needs_recalculation BOOLEAN DEFAULT true;

-- Create function to mark fund as needing recalculation
CREATE OR REPLACE FUNCTION mark_fund_for_recalculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the fund to mark it as needing recalculation
    UPDATE funds 
    SET needs_recalculation = true
    WHERE id = COALESCE(NEW.fund_id, OLD.fund_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS monthly_entry_recalc_trigger ON monthly_entries;
DROP TRIGGER IF EXISTS bid_recalc_trigger ON bids;

-- Create triggers to mark funds for recalculation when entries or bids change
CREATE TRIGGER monthly_entry_recalc_trigger
    AFTER INSERT OR UPDATE OR DELETE ON monthly_entries
    FOR EACH ROW EXECUTE FUNCTION mark_fund_for_recalculation();

CREATE TRIGGER bid_recalc_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bids
    FOR EACH ROW EXECUTE FUNCTION mark_fund_for_recalculation();