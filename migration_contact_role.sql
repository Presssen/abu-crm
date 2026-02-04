-- Migration to add contact_role to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_role TEXT;
