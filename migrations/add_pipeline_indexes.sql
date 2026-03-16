-- Pipeline Performance: Composite indexes for fast status+sort queries
-- These indexes directly support the pipeline page which queries
-- leads filtered by status, optionally filtered by owner_id, ordered by created_at DESC

-- For admin users (filter on status only, sort by created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_created
ON leads(status, created_at DESC);

-- For non-admin users (filter on owner_id + status, sort by created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_owner_status_created
ON leads(owner_id, status, created_at DESC);
