-- Migration to add shop_name to chat_sessions
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS shop_name TEXT;

-- Update RLS if needed (already public, so fine)
