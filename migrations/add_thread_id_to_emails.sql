-- Add thread_id to emails table to track Gmail threads
ALTER TABLE emails ADD COLUMN IF NOT EXISTS thread_id TEXT;
create index if not exists emails_thread_id_idx on emails(thread_id);
