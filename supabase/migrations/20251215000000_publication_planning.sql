-- supabase/migrations/20251215000000_publication_planning.sql
-- Publication planning and performance tracking

-- =============================================================================
-- ADD COLUMNS TO TOPICS TABLE
-- =============================================================================

-- Publication status (auto-detected or manually set)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'not_started'
    CHECK (publication_status IN (
      'not_started', 'brief_ready', 'draft_in_progress', 'draft_ready',
      'in_review', 'scheduled', 'published', 'needs_update'
    ));

-- Publication phase (1-4 based on semantic SEO guidelines)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS publication_phase TEXT
    CHECK (publication_phase IS NULL OR publication_phase IN (
      'phase_1_authority', 'phase_2_support', 'phase_3_expansion', 'phase_4_longtail'
    ));

-- Priority score (0-100 calculated)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS priority_score INTEGER
    CHECK (priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100));

-- Priority level (derived from score)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS priority_level TEXT
    CHECK (priority_level IS NULL OR priority_level IN ('critical', 'high', 'medium', 'low'));

-- AI-calculated optimal publication date
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS optimal_publication_date DATE;

-- Actual publication date (when content went live)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS actual_publication_date DATE;

-- User-scheduled date
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Topic dependencies (topics that must publish first)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS publication_dependencies UUID[];

-- Planning notes
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS planning_notes TEXT;

-- =============================================================================
-- CREATE PERFORMANCE SNAPSHOTS TABLE
-- =============================================================================

CREATE TABLE public.performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Capture metadata
  snapshot_type TEXT NOT NULL DEFAULT 'periodic'
    CHECK (snapshot_type IN ('periodic', 'baseline', 'milestone')),
  is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  capture_source TEXT NOT NULL DEFAULT 'csv_import'
    CHECK (capture_source IN ('csv_import', 'api', 'manual')),

  -- GSC metrics (from CSV import)
  gsc_clicks INTEGER DEFAULT 0,
  gsc_impressions INTEGER DEFAULT 0,
  gsc_ctr NUMERIC(8,6) DEFAULT 0,          -- CTR as decimal (0.0 - 1.0)
  gsc_position NUMERIC(8,2) DEFAULT 0,     -- Average position

  -- Delta from baseline (calculated during import)
  delta_clicks INTEGER,
  delta_impressions INTEGER,
  delta_ctr NUMERIC(8,6),
  delta_position NUMERIC(8,2),

  -- Raw import data (for debugging)
  raw_import_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON public.performance_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own snapshots"
  ON public.performance_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
  ON public.performance_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.performance_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Performance snapshots indexes
CREATE INDEX idx_performance_snapshots_topic_id
  ON public.performance_snapshots(topic_id);
CREATE INDEX idx_performance_snapshots_map_id
  ON public.performance_snapshots(map_id);
CREATE INDEX idx_performance_snapshots_user_id
  ON public.performance_snapshots(user_id);
CREATE INDEX idx_performance_snapshots_captured_at
  ON public.performance_snapshots(captured_at DESC);
CREATE INDEX idx_performance_snapshots_baseline
  ON public.performance_snapshots(topic_id, is_baseline)
  WHERE is_baseline = TRUE;

-- Topics planning indexes
CREATE INDEX IF NOT EXISTS idx_topics_publication_status
  ON public.topics(publication_status);
CREATE INDEX IF NOT EXISTS idx_topics_publication_phase
  ON public.topics(publication_phase);
CREATE INDEX IF NOT EXISTS idx_topics_optimal_publication_date
  ON public.topics(optimal_publication_date);
CREATE INDEX IF NOT EXISTS idx_topics_priority_score
  ON public.topics(priority_score DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at trigger for performance_snapshots
CREATE TRIGGER update_performance_snapshots_updated_at
  BEFORE UPDATE ON public.performance_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================

-- Only one baseline per topic
CREATE UNIQUE INDEX idx_unique_baseline_per_topic
  ON public.performance_snapshots(topic_id)
  WHERE is_baseline = TRUE;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.performance_snapshots IS 'GSC performance data imported from CSV for tracking content performance over time';
COMMENT ON COLUMN public.topics.publication_status IS 'Current workflow status (auto-detected from brief/draft existence or manually set)';
COMMENT ON COLUMN public.topics.publication_phase IS 'Phase assignment from AI planning (1=authority batch, 2=support, 3=expansion, 4=longtail)';
COMMENT ON COLUMN public.topics.priority_score IS 'AI-calculated priority score 0-100 based on structural, semantic, dependency, and seasonal factors';
COMMENT ON COLUMN public.topics.optimal_publication_date IS 'AI-recommended publication date based on phase and dependency analysis';
COMMENT ON COLUMN public.topics.actual_publication_date IS 'Actual date content was published (for variance tracking)';
