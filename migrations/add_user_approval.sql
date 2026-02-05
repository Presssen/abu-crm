-- 1. Add is_approved and is_blocked columns if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. Update existing accounts to be approved and not blocked
UPDATE public.profiles SET is_approved = true WHERE is_approved IS NULL;
UPDATE public.profiles SET is_blocked = false WHERE is_blocked IS NULL;

-- 3. Update handle_new_user trigger to explicitly handle statuses
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name, is_approved, is_blocked)
  VALUES (
    new.id, 
    new.email, 
    'user',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    false, -- New users need manual approval
    false  -- New users are not blocked by default
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
