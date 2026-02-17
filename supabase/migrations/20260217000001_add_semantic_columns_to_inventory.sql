-- Add detected semantic entities to site_inventory for fast matching/planning access

ALTER TABLE public.site_inventory
  ADD COLUMN IF NOT EXISTS detected_ce text,
  ADD COLUMN IF NOT EXISTS detected_sc text,
  ADD COLUMN IF NOT EXISTS detected_csi text,
  ADD COLUMN IF NOT EXISTS ce_alignment numeric,
  ADD COLUMN IF NOT EXISTS sc_alignment numeric,
  ADD COLUMN IF NOT EXISTS csi_alignment numeric,
  ADD COLUMN IF NOT EXISTS semantic_overall_score numeric,
  ADD COLUMN IF NOT EXISTS overlay_status text;

-- Add check constraint separately (IF NOT EXISTS not supported for constraints in all PG versions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_inventory_overlay_status_check'
  ) THEN
    ALTER TABLE public.site_inventory
      ADD CONSTRAINT site_inventory_overlay_status_check
      CHECK (overlay_status IN ('covered_aligned', 'covered_needs_work', 'gap', 'orphan', 'cannibalization'));
  END IF;
END $$;

-- Add source tracking to topics
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS covered_by_inventory_ids uuid[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topics_source_check'
  ) THEN
    ALTER TABLE public.topics
      ADD CONSTRAINT topics_source_check
      CHECK (source IN ('generated', 'discovered', 'manual'));
  END IF;
END $$;

COMMENT ON COLUMN public.site_inventory.detected_ce IS 'Central Entity detected by semantic analysis (detection mode)';
COMMENT ON COLUMN public.site_inventory.detected_sc IS 'Source Context detected by semantic analysis';
COMMENT ON COLUMN public.site_inventory.detected_csi IS 'Central Search Intent detected by semantic analysis';
COMMENT ON COLUMN public.site_inventory.overlay_status IS 'Visual overlay status for map reconciliation view';
COMMENT ON COLUMN public.topics.source IS 'How this topic was created: generated (AI), discovered (from existing site), manual (user)';
