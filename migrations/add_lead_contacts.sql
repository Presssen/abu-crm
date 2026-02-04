-- Create lead_contacts table
CREATE TABLE IF NOT EXISTS lead_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_contacts ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (using existing is_admin function if available)
CREATE POLICY "Users can manage contacts of their leads" ON lead_contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = lead_contacts.lead_id 
            AND (leads.owner_id = auth.uid() OR is_admin())
        )
    );

-- Migrate existing data from leads table
INSERT INTO lead_contacts (lead_id, name, email, phone, is_primary)
SELECT id, contact_name, email, phone, true
FROM leads
WHERE contact_name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead_id ON lead_contacts(lead_id);
