-- ============================================================
-- Migration: Lead Pool System for Marathon
-- All users can see all leads. Leads are auto-assigned on first
-- contact. Leads inactive for 30+ days are released back to pool.
-- ============================================================

-- 1. Add claimed_at column to track when a lead was claimed
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- 2. Ensure last_activity_at exists (should already be there)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- 3. Create index for stale lead queries
CREATE INDEX IF NOT EXISTS idx_leads_claimed_at ON leads(claimed_at);
CREATE INDEX IF NOT EXISTS idx_leads_pool_query ON leads(status, owner_id, last_activity_at);

-- ============================================================
-- 4. Update RLS Policies for leads — SHARED POOL MODEL
-- ============================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can manage their own leads" ON leads;
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can view and update own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON leads;
-- Also drop policies from previous version of this migration
DROP POLICY IF EXISTS "All users can view all leads" ON leads;
DROP POLICY IF EXISTS "Users can insert leads" ON leads;
DROP POLICY IF EXISTS "Users can update accessible leads" ON leads;
DROP POLICY IF EXISTS "Only admins can delete leads" ON leads;

-- SELECT: All authenticated users can see ALL leads (pool model)
CREATE POLICY "All users can view all leads" ON leads
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: Users can create leads (assigned to themselves)
CREATE POLICY "Users can insert leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Users can update leads they own, unowned leads, leads without
-- any activity (never contacted = free to claim), or if admin
CREATE POLICY "Users can update accessible leads" ON leads
    FOR UPDATE USING (
        auth.uid() = owner_id
        OR owner_id IS NULL
        OR last_activity_at IS NULL
        OR is_admin()
    );

-- DELETE: Only admins can delete leads
CREATE POLICY "Only admins can delete leads" ON leads
    FOR DELETE USING (is_admin());

-- ============================================================
-- 5. Function to release stale leads (30+ days without activity)
-- Can be called via pg_cron or manually
-- ============================================================
CREATE OR REPLACE FUNCTION release_stale_leads()
RETURNS INTEGER AS $$
DECLARE
    released_count INTEGER;
BEGIN
    UPDATE leads
    SET owner_id = NULL, claimed_at = NULL
    WHERE owner_id IS NOT NULL
      AND status = 'new'
      AND (
          (last_activity_at IS NOT NULL AND last_activity_at < NOW() - INTERVAL '30 days')
          OR
          (last_activity_at IS NULL AND claimed_at IS NOT NULL AND claimed_at < NOW() - INTERVAL '30 days')
      );
    GET DIAGNOSTICS released_count = ROW_COUNT;
    RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (used by cron or admin calls)
GRANT EXECUTE ON FUNCTION release_stale_leads() TO authenticated;
