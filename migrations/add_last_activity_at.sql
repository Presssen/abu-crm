-- Migration: Add last_activity_at to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Initialize last_activity_at with current updated_at or created_at
UPDATE leads SET last_activity_at = COALESCE(updated_at, created_at, now()) WHERE last_activity_at IS NULL;
