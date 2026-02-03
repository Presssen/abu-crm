-- EMAIL TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read global templates or their own" ON public.email_templates;
CREATE POLICY "Users can read global templates or their own" ON public.email_templates
    FOR SELECT USING (is_global = true OR auth.uid() = owner_id OR is_admin());

DROP POLICY IF EXISTS "Users can manage their own templates" ON public.email_templates;
CREATE POLICY "Users can manage their own templates" ON public.email_templates
    FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Admins can manage global templates" ON public.email_templates;
CREATE POLICY "Admins can manage global templates" ON public.email_templates
    FOR ALL USING (is_admin());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
