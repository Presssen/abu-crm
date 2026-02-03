-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marathon_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_lead_goal INTEGER DEFAULT 20;

-- Create app_settings table for global configurations
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default marathon goal if not exists
INSERT INTO public.app_settings (key, value)
VALUES ('marathon_default_goal', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Ensure leads has required columns (idempotent)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS won_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies for app_settings
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
CREATE POLICY "Admins can manage app_settings" ON public.app_settings
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
CREATE POLICY "Authenticated users can read app_settings" ON public.app_settings
    FOR SELECT USING (auth.role() = 'authenticated');
