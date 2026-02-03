-- Add unique constraint to integrations to allow upsert by owner and type
ALTER TABLE public.integrations 
DROP CONSTRAINT IF EXISTS unique_owner_integration_type;

ALTER TABLE public.integrations 
ADD CONSTRAINT unique_owner_integration_type UNIQUE (owner_id, integration_type);
