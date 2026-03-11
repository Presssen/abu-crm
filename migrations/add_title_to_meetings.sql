-- Add title column to meetings table to store the real Google Calendar event name
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS title text;
