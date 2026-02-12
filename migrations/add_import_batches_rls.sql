-- Enable RLS on import_batches table
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own import batches
CREATE POLICY "Users can insert their own import batches"
ON import_batches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can view their own import batches
CREATE POLICY "Users can view their own import batches"
ON import_batches
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Policy: Users can update their own import batches
CREATE POLICY "Users can update their own import batches"
ON import_batches
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own import batches
CREATE POLICY "Users can delete their own import batches"
ON import_batches
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Policy: Admins can view all import batches
CREATE POLICY "Admins can view all import batches"
ON import_batches
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy: Admins can delete any import batch
CREATE POLICY "Admins can delete any import batch"
ON import_batches
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
