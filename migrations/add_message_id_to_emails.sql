-- Add message_id to emails table to track Gmail messages
ALTER TABLE emails ADD COLUMN IF NOT EXISTS message_id TEXT;
CREATE INDEX IF NOT EXISTS emails_message_id_idx ON emails(message_id);
