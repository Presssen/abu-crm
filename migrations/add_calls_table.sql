-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can manage calls of their leads" ON calls
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = calls.lead_id 
            AND (leads.owner_id = auth.uid() OR is_admin())
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_owner_id ON calls(owner_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
