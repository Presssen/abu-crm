-- Add marathon configuration fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_lead_goal INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS marathon_enabled BOOLEAN DEFAULT false;

-- Create app_settings table for global configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default marathon goal
INSERT INTO app_settings (key, value) 
VALUES ('marathon_default_goal', '20')
ON CONFLICT (key) DO NOTHING;
