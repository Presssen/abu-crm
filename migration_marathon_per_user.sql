-- Migration: Marathon Refinements
-- Adds per-user marathon enablement and ensured goal exists.

-- 1. Update Profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marathon_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_lead_goal INTEGER DEFAULT 20;

-- 2. Ensure Website column in Leads is ready (some rows might have it from previous drafts)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;

-- 3. Update existing profiles to have defaults if they were null
UPDATE public.profiles SET marathon_enabled = TRUE WHERE marathon_enabled IS NULL;
UPDATE public.profiles SET daily_lead_goal = 20 WHERE daily_lead_goal IS NULL;
