-- ============================================================
-- Fix: Allow claiming stale leads (>30 days without activity)
-- 
-- BUG: The UPDATE RLS policy was missing the stale lead condition,
-- preventing users from claiming leads that had owner_id set and
-- last_activity_at older than 30 days. The UI showed them as
-- "libre" but the DB silently blocked the UPDATE (0 rows returned).
--
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================

-- Drop and recreate the UPDATE policy to include stale leads
DROP POLICY IF EXISTS "Users can update accessible leads" ON leads;

CREATE POLICY "Users can update accessible leads" ON leads
    FOR UPDATE USING (
        auth.uid() = owner_id
        OR owner_id IS NULL
        OR last_activity_at IS NULL
        OR last_activity_at < NOW() - INTERVAL '30 days'
        OR is_admin()
    );
