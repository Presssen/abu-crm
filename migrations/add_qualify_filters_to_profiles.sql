-- Migration: Add qualify_filters column to profiles
-- Stores the user's qualify page filter preferences (plan, country, sector, excludePassword)
-- so they sync across devices.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS qualify_filters JSONB DEFAULT '{}'::jsonb;
