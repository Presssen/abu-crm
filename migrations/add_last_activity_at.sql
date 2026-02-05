-- Add last_activity_at to leads table to track when the last interaction happened
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity_at);
