-- Migration plans: stores AI-generated migration roadmaps

CREATE TABLE IF NOT EXISTS public.migration_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,

  -- Plan metadata
  name text NOT NULL DEFAULT 'Migration Plan',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),

  -- Date range used for GSC analysis
  gsc_start_date date,
  gsc_end_date date,

  -- Summary stats (denormalized for quick display)
  total_urls int NOT NULL DEFAULT 0,
  total_topics int NOT NULL DEFAULT 0,
  matched_count int NOT NULL DEFAULT 0,
  orphan_count int NOT NULL DEFAULT 0,
  gap_count int NOT NULL DEFAULT 0,
  cannibalization_count int NOT NULL DEFAULT 0,

  -- Action breakdown
  keep_count int NOT NULL DEFAULT 0,
  optimize_count int NOT NULL DEFAULT 0,
  rewrite_count int NOT NULL DEFAULT 0,
  merge_count int NOT NULL DEFAULT 0,
  redirect_count int NOT NULL DEFAULT 0,
  prune_count int NOT NULL DEFAULT 0,
  create_count int NOT NULL DEFAULT 0,

  -- Completion tracking
  completed_count int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migration_plans_project_access"
  ON public.migration_plans FOR ALL TO authenticated
  USING (has_project_access(project_id))
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "Service role full access to migration_plans"
  ON public.migration_plans FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_migration_plans_project ON public.migration_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_migration_plans_map ON public.migration_plans(map_id);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
