-- Migration: Update chat_sessions table with new fields
-- Date: 2026-02-10

-- Add is_read field to track if CRM user has viewed the chat
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT true;

-- Add resolved_at field to track when chat was marked as resolved
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Drop the old constraint if it exists
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_status_check;

-- Add new constraint that includes 'resolved' status
ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_status_check 
    CHECK (status IN ('active', 'closed', 'resolved'));

-- Update existing 'closed' sessions to 'resolved' (optional migration)
-- UPDATE chat_sessions SET status = 'resolved', resolved_at = updated_at WHERE status = 'closed';
