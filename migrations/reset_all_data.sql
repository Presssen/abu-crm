-- ============================================================
-- RESET ALL APPLICATION DATA (except users and integrations)
-- Run this in the Supabase SQL Editor
-- ============================================================
-- ⚠️  WARNING: This will DELETE ALL data permanently.
--     Only user accounts (auth.users, profiles) and 
--     integrations (Google, Apollo, etc.) will be preserved.
-- ============================================================

-- Disable triggers temporarily to avoid issues during mass delete
SET session_replication_role = 'replica';

-- 1. Delete child tables first (foreign key dependencies)
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE chat_sessions CASCADE;
TRUNCATE TABLE chat_settings CASCADE;

TRUNCATE TABLE emails CASCADE;
TRUNCATE TABLE meetings CASCADE;
TRUNCATE TABLE calls CASCADE;

TRUNCATE TABLE lead_contacts CASCADE;
TRUNCATE TABLE shopify_payments CASCADE;
TRUNCATE TABLE shopify_installs CASCADE;

TRUNCATE TABLE leads CASCADE;
TRUNCATE TABLE import_batches CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify: show row counts for all tables
SELECT 'leads' as table_name, count(*) as rows FROM leads
UNION ALL SELECT 'lead_contacts', count(*) FROM lead_contacts
UNION ALL SELECT 'emails', count(*) FROM emails
UNION ALL SELECT 'meetings', count(*) FROM meetings
UNION ALL SELECT 'calls', count(*) FROM calls
UNION ALL SELECT 'import_batches', count(*) FROM import_batches
UNION ALL SELECT 'chat_sessions', count(*) FROM chat_sessions
UNION ALL SELECT 'chat_messages', count(*) FROM chat_messages
UNION ALL SELECT 'shopify_installs', count(*) FROM shopify_installs
UNION ALL SELECT 'shopify_payments', count(*) FROM shopify_payments
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'integrations', count(*) FROM integrations
ORDER BY table_name;
