-- ENUMS/Types
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'demo_scheduled', 'proposal_sent', 'won', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'med', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    status lead_status DEFAULT 'new',
    source TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'open', -- open, done
    priority task_priority DEFAULT 'med',
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- IMPORTS
CREATE TABLE IF NOT EXISTS imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT,
    status TEXT DEFAULT 'uploaded', -- uploaded, mapped, imported, failed
    mapping JSONB,
    summary JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- MEETINGS
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    attendees JSONB DEFAULT '[]'::jsonb,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- EMAILS
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    status TEXT DEFAULT 'sent', -- draft, sent, failed
    provider TEXT DEFAULT 'internal',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_meetings_owner ON meetings(owner_id);

-- RLS Enablement
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Leads Policies
CREATE POLICY "Users can manage their own leads" ON leads
    FOR ALL USING (auth.uid() = owner_id OR is_admin());

-- Tasks Policies
CREATE POLICY "Users can manage their own tasks" ON tasks
    FOR ALL USING (auth.uid() = owner_id OR is_admin());

-- Imports Policies
CREATE POLICY "Users can manage their own imports" ON imports
    FOR ALL USING (auth.uid() = owner_id OR is_admin());

-- Meetings Policies
CREATE POLICY "Users can manage their own meetings" ON meetings
    FOR ALL USING (auth.uid() = owner_id OR is_admin());

-- Emails Policies
CREATE POLICY "Users can manage their own emails" ON emails
    FOR ALL USING (auth.uid() = owner_id OR is_admin());

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
