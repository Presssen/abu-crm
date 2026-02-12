-- Update all leads without a plan or with empty plan to 'Shopify Standard'
UPDATE leads
SET plan = 'Shopify Standard'
WHERE plan IS NULL OR plan = '' OR TRIM(plan) = '';

-- Update all leads that have a plan but it's not 'Shopify Plus' to 'Shopify Standard'
UPDATE leads
SET plan = 'Shopify Standard'
WHERE plan IS NOT NULL 
  AND plan != '' 
  AND plan != 'Shopify Plus'
  AND TRIM(plan) != 'Shopify Plus';
