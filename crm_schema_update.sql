-- Update profiles table to support Business Developer role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'business_developer', 'user'));

-- Create integrations table for API credentials
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL, -- 'email', 'calendar', 'global_email', 'global_calendar'
    provider TEXT, -- 'gmail', 'outlook', 'google_calendar', etc.
    credentials JSONB, -- encrypted credentials
    is_global BOOLEAN DEFAULT false, -- true if set by admin for all users
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_owner ON integrations(owner_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_global ON integrations(is_global);

-- RLS for integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own integrations
CREATE POLICY "Users can manage own integrations" ON integrations
    FOR ALL USING (auth.uid() = owner_id);

-- Admins can manage all integrations
CREATE POLICY "Admins can manage all integrations" ON integrations
    FOR ALL USING (is_admin());

-- Business developers can read global integrations
CREATE POLICY "Business developers can read global integrations" ON integrations
    FOR SELECT USING (
        is_global = true OR 
        auth.uid() = owner_id OR 
        is_admin()
    );

-- Trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Helper function to check business developer role
CREATE OR REPLACE FUNCTION is_business_developer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('business_developer', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
