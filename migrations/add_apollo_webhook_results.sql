-- Create apollo_webhook_results table to temporarily store Apollo responses
CREATE TABLE IF NOT EXISTS apollo_webhook_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apollo_id TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE apollo_webhook_results ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert webhook results" ON apollo_webhook_results;
CREATE POLICY "Users can insert webhook results" ON apollo_webhook_results
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read their webhook results" ON apollo_webhook_results;
CREATE POLICY "Users can read their webhook results" ON apollo_webhook_results
    FOR SELECT USING (true);
    
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_apollo_webhook_results_apollo_id ON apollo_webhook_results(apollo_id);
CREATE INDEX IF NOT EXISTS idx_apollo_webhook_results_created_at ON apollo_webhook_results(created_at);

-- Add automated cleanup function and trigger to delete records older than 1 hour to prevent indefinite growth
CREATE OR REPLACE FUNCTION delete_old_apollo_webhook_results()
RETURNS trigger AS $$
BEGIN
  DELETE FROM apollo_webhook_results WHERE created_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_old_apollo_webhook_results ON apollo_webhook_results;
CREATE TRIGGER trigger_delete_old_apollo_webhook_results
AFTER INSERT ON apollo_webhook_results
EXECUTE FUNCTION delete_old_apollo_webhook_results();
