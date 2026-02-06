-- Add avatar_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify if public profiles are accessible for avatars
-- (Assumes an 'avatars' storage bucket will be created)
