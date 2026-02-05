-- Enable RLS on leads table (if not already enabled)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

-- Create comprehensive policies for normal usage

-- 1. View (Select): Users can see leads they own
CREATE POLICY "Users can view their own leads"
ON leads FOR SELECT
USING (auth.uid() = owner_id);

-- 2. Insert: Users can insert leads (and auto-assign themselves as owner if needed, though app handles it)
CREATE POLICY "Users can insert their own leads"
ON leads FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- 3. Update: Users can update leads they own
CREATE POLICY "Users can update their own leads"
ON leads FOR UPDATE
USING (auth.uid() = owner_id);

-- 4. Delete: Users can delete leads they own
CREATE POLICY "Users can delete their own leads"
ON leads FOR DELETE
USING (auth.uid() = owner_id);

-- 5. Admin Override (Optional: If you have an 'admin' role, you might want this)
-- Uncomment if you calculate roles via a public.profiles table or claim
-- CREATE POLICY "Admins can view all leads" ON leads FOR SELECT USING ( 
--   exists (select 1 from profiles where id = auth.uid() and role = 'admin') 
-- );
