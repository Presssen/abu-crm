-- Add google_event_id column to meetings table to track Google Calendar events
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Create index for faster lookups when syncing
CREATE INDEX IF NOT EXISTS idx_meetings_google_event_id ON meetings(google_event_id);

-- Optional: Add last_synced timestamp to integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ;
