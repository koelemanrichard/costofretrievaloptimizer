-- Add gsc_top_queries column to site_inventory
-- Stores the top search queries for each page (from GSC API aggregation)

ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS gsc_top_queries jsonb;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
