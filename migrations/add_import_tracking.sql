-- Create import_batches table to track all imports
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    country TEXT,
    file_name TEXT,
    total_leads INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed'))
);

-- Add import_batch_id to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_import_batch_id ON leads(import_batch_id);

-- Create index on import_batches for faster queries
CREATE INDEX IF NOT EXISTS idx_import_batches_created_by ON import_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON import_batches(created_at DESC);
