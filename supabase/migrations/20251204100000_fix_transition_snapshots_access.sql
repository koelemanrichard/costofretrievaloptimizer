-- Fix transition_snapshots table access for PostgREST
-- This ensures the table is properly exposed via the API

-- Grant usage on schema (should already exist but ensure it)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant table access to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transition_snapshots TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_inventory TO anon, authenticated;

-- Grant sequence access (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.transition_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_inventory ENABLE ROW LEVEL SECURITY;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
