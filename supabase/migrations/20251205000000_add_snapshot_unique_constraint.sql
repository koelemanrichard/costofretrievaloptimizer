-- Add unique constraint to transition_snapshots for upsert support
-- This allows caching of scraped content by (inventory_id, snapshot_type)

-- First, remove any duplicate rows (keep the most recent)
DELETE FROM public.transition_snapshots a
USING public.transition_snapshots b
WHERE a.id < b.id
AND a.inventory_id = b.inventory_id
AND a.snapshot_type = b.snapshot_type;

-- Add unique constraint
ALTER TABLE public.transition_snapshots
ADD CONSTRAINT transition_snapshots_inventory_type_unique
UNIQUE (inventory_id, snapshot_type);

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
