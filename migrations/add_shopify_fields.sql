-- Add Shopify-specific fields to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS categories TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS created_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS plan TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS platform_rank INTEGER,
ADD COLUMN IF NOT EXISTS shopify_status TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_leads_plan ON leads(plan);
CREATE INDEX IF NOT EXISTS idx_leads_shopify_status ON leads(shopify_status);
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_tags ON leads USING GIN(tags);
