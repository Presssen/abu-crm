-- Migration script to add 'won_by' and 'won_at' fields to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;

-- Add a comment for better DX
COMMENT ON COLUMN leads.won_by IS 'The user who successfully closed/won the lead';
COMMENT ON COLUMN leads.won_at IS 'The timestamp when the lead was marked as won';
