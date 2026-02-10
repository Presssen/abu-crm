
-- CHAT SESSIONS
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID NOT NULL, -- Managed by client (localStorage)
    name TEXT,
    email TEXT,
    status TEXT CHECK (status IN ('active', 'closed')) DEFAULT 'active',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('visitor', 'agent')) NOT NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor ON chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- RLS POLICIES
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 1. Visitors can insert sessions (Public)
DROP POLICY IF EXISTS "Visitors can create chat sessions" ON chat_sessions;
CREATE POLICY "Visitors can create chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (true);

-- 2. Visitors can insert messages (Public)
DROP POLICY IF EXISTS "Visitors can create chat messages" ON chat_messages;
CREATE POLICY "Visitors can create chat messages" ON chat_messages
    FOR INSERT WITH CHECK (true);

-- 3. GLOBAL READ for now (to support client-side Realtime easily)
-- WARNING: This exposes chat history if someone guesses the session ID or visitor ID on client side?
-- Actually, realtime subscriptions require "SELECT" policy to be true for the rows you want to listen to.
-- If we want visitors to receive new messages, they need to SELECT them.
-- We restrict by session_id in the query, but RLS must allow it.
-- Since we don't have visitor authentication in RLS, we must allow public read for rows they are interested in.
-- But without auth, we can't restrict *which* rows easily except maybe by matching a header we send?
-- For MVP, we allow public read.
DROP POLICY IF EXISTS "Public Read Sessions" ON chat_sessions;
CREATE POLICY "Public Read Sessions" ON chat_sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Messages" ON chat_messages;
CREATE POLICY "Public Read Messages" ON chat_messages
    FOR SELECT USING (true);


DROP POLICY IF EXISTS "Agents can manage chat sessions" ON chat_sessions;
CREATE POLICY "Agents can manage chat sessions" ON chat_sessions
    FOR ALL USING (auth.role() = 'authenticated'); 

DROP POLICY IF EXISTS "Agents can manage messages" ON chat_messages;
CREATE POLICY "Agents can manage messages" ON chat_messages
    FOR ALL USING (auth.role() = 'authenticated');
