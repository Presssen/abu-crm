-- ============================================================
-- Migration: Qualified Leads table
-- Stores leads that have been qualified (selected) by users
-- for later review and Excel export.
-- This does NOT change the lead's pipeline status.
-- ============================================================

-- 1. Create the qualified_leads table
CREATE TABLE IF NOT EXISTS public.qualified_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'qualified',  -- 'qualified' or 'discarded'
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Unique constraint: a user can only qualify/discard a lead once
    UNIQUE(lead_id, user_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_qualified_leads_user ON qualified_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_lead ON qualified_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_status ON qualified_leads(user_id, status);

-- 3. Enable RLS
ALTER TABLE public.qualified_leads ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can see their own qualified leads
DROP POLICY IF EXISTS "Users can view own qualified leads" ON qualified_leads;
CREATE POLICY "Users can view own qualified leads" ON qualified_leads
    FOR SELECT USING (auth.uid() = user_id);

-- Users can add their own qualified leads
DROP POLICY IF EXISTS "Users can insert own qualified leads" ON qualified_leads;
CREATE POLICY "Users can insert own qualified leads" ON qualified_leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own qualified leads
DROP POLICY IF EXISTS "Users can delete own qualified leads" ON qualified_leads;
CREATE POLICY "Users can delete own qualified leads" ON qualified_leads
    FOR DELETE USING (auth.uid() = user_id);

-- Users can update their own qualified leads (for editing notes)
DROP POLICY IF EXISTS "Users can update own qualified leads" ON qualified_leads;
CREATE POLICY "Users can update own qualified leads" ON qualified_leads
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can see all qualified leads
DROP POLICY IF EXISTS "Admins can view all qualified leads" ON qualified_leads;
CREATE POLICY "Admins can view all qualified leads" ON qualified_leads
    FOR SELECT USING (is_admin());
