-- Migration 002: Add recalculation triggers
-- Adds the needs_recalculation column to funds table and sets up triggers

-- Add needs_recalculation column if it doesn't exist
ALTER TABLE funds ADD COLUMN IF NOT EXISTS needs_recalculation BOOLEAN DEFAULT true;

-- Function to mark fund as needing recalculation
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

-- Triggers to mark funds for recalculation when entries or bids change
DROP TRIGGER IF EXISTS monthly_entry_recalc_trigger ON monthly_entries;
CREATE TRIGGER monthly_entry_recalc_trigger
    AFTER INSERT OR UPDATE OR DELETE ON monthly_entries
    FOR EACH ROW EXECUTE FUNCTION mark_fund_for_recalculation();

DROP TRIGGER IF EXISTS bid_recalc_trigger ON bids;
CREATE TRIGGER bid_recalc_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bids
    FOR EACH ROW EXECUTE FUNCTION mark_fund_for_recalculation();