-- 1. Restrict DELETE on leads to Admins only
DROP POLICY IF EXISTS "Users can manage their own leads" ON leads;
DROP POLICY IF EXISTS "Users can view and update own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON leads;

-- Allow SELECT, INSERT, UPDATE for owners and admins
CREATE POLICY "Users can view and update own leads" ON leads
    FOR SELECT USING (auth.uid() = owner_id OR is_admin());

CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own leads" ON leads
    FOR UPDATE USING (auth.uid() = owner_id OR is_admin());

-- Allow DELETE only for Admins
CREATE POLICY "Admins can delete leads" ON leads
    FOR DELETE USING (is_admin());


-- 2. Add Marathon Configurations to Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_lead_goal INTEGER DEFAULT 20;


-- 3. Add Website column to Leads (if missing, for AI scraping)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT;

-- 4. Enable RLS on integrations if not strictly enforced (double check)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
