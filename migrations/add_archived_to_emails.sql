-- Add archived column to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_emails_archived ON emails(archived);
