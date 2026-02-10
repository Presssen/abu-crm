
-- CHAT SETTINGS
CREATE TABLE IF NOT EXISTS chat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_color TEXT DEFAULT '#2563eb',
    title TEXT DEFAULT 'Chat Support',
    subtitle TEXT DEFAULT 'We usually reply in a few minutes',
    bot_name TEXT DEFAULT 'ABU Bot',
    greeting_message TEXT DEFAULT 'Hello! How can we help you today?',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one row or at least a known one for global settings
-- For multi-tenant we'd use owner_id, but here we can stick to one row for now.

ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- Agents can manage settings
DROP POLICY IF EXISTS "Agents can manage chat settings" ON chat_settings;
CREATE POLICY "Agents can manage chat settings" ON chat_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Public can read settings (for the widget)
DROP POLICY IF EXISTS "Public can read chat settings" ON chat_settings;
CREATE POLICY "Public can read chat settings" ON chat_settings
    FOR SELECT USING (true);

-- Insert default settings if none exist
INSERT INTO chat_settings (primary_color, title, subtitle, bot_name, greeting_message)
SELECT '#2563eb', 'Chat Support', 'We usually reply in a few minutes', 'ABU Bot', 'Hello! How can we help you today?'
WHERE NOT EXISTS (SELECT 1 FROM chat_settings);
