-- supabase/migrations/20260110150000_repair_user_profiles_view.sql
-- Repair/ensure user_profiles view exists for PostgREST joins

-- Drop existing view if it exists (to ensure clean recreation)
DROP VIEW IF EXISTS public.user_profiles;

-- Create a view that exposes necessary user data from auth.users
CREATE VIEW public.user_profiles AS
SELECT
  id,
  email,
  raw_user_meta_data,
  created_at,
  last_sign_in_at
FROM auth.users;

-- Grant access to the view
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- Add comment for documentation and PostgREST primary key hint
COMMENT ON VIEW public.user_profiles IS E'@primaryKey id\nPublic view of user profiles for PostgREST joins';
