-- Add apollo_id column to lead_contacts table
-- This stores the Apollo contact ID for future enrichment (reveal email/phone)
ALTER TABLE lead_contacts ADD COLUMN IF NOT EXISTS apollo_id TEXT;
CREATE INDEX IF NOT EXISTS idx_lead_contacts_apollo_id ON lead_contacts(apollo_id);

