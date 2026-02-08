-- Migration: Shopify Integration
-- Description: Adds tables for tracking Shopify app installs and payments

-- 1. SHOPIFY INSTALLS
CREATE TABLE IF NOT EXISTS public.shopify_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT UNIQUE NOT NULL,
    shop_name TEXT,
    email TEXT,
    status TEXT DEFAULT 'active', -- active, uninstalled
    installed_at TIMESTAMPTZ DEFAULT now(),
    uninstalled_at TIMESTAMPTZ,
    plan_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopify_installs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage shopify_installs" ON public.shopify_installs;
CREATE POLICY "Admins can manage shopify_installs" ON public.shopify_installs
    FOR ALL USING (is_admin());

-- 2. SHOPIFY PAYMENTS
CREATE TABLE IF NOT EXISTS public.shopify_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT REFERENCES public.shopify_installs(shop_domain) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    charge_id TEXT UNIQUE,
    status TEXT, -- pending, active, cancelled, declined
    type TEXT, -- one-time, subscription
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopify_payments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage shopify_payments" ON public.shopify_payments;
CREATE POLICY "Admins can manage shopify_payments" ON public.shopify_payments
    FOR ALL USING (is_admin());

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_shopify_installs_domain ON shopify_installs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_payments_domain ON shopify_payments(shop_domain);

-- 4. UPDATE leads ON INSTALL
-- We will handle this in the edge function/api route logic, 
-- but we might want to link leads to shopify_installs later.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS shopify_domain TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_shopify_domain ON leads(shopify_domain);

-- 5. TRIGGER for updated_at
DROP TRIGGER IF EXISTS update_shopify_installs_updated_at ON shopify_installs;
CREATE TRIGGER update_shopify_installs_updated_at
    BEFORE UPDATE ON shopify_installs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
