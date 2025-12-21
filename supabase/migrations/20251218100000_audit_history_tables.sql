-- Migration: Comprehensive Audit History Tables
-- Stores historical audit data for Query Network, E-A-T Scanner, Corpus Audit, and Enhanced Metrics
-- Enables tracking progress over time and comparing with competitors

-- ===========================================
-- QUERY NETWORK AUDIT HISTORY
-- ===========================================
CREATE TABLE IF NOT EXISTS public.query_network_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audit configuration
  seed_keyword TEXT NOT NULL,
  target_domain TEXT,
  language TEXT DEFAULT 'en',

  -- Results summary
  total_queries INTEGER DEFAULT 0,
  total_competitor_eavs INTEGER DEFAULT 0,
  total_content_gaps INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,

  -- Full results as JSONB
  query_network JSONB,           -- Generated queries with intent classification
  competitor_eavs JSONB,         -- Extracted EAVs from competitors
  content_gaps JSONB,            -- Identified gaps
  recommendations JSONB,         -- Generated recommendations
  intent_distribution JSONB,     -- Query intent breakdown
  questions JSONB,               -- Generated questions for featured snippets

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for fast lookups
  CONSTRAINT query_network_audits_map_user UNIQUE (map_id, created_at)
);

-- Enable RLS
ALTER TABLE public.query_network_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own query network audits" ON public.query_network_audits;
CREATE POLICY "Users can view own query network audits" ON public.query_network_audits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own query network audits" ON public.query_network_audits;
CREATE POLICY "Users can insert own query network audits" ON public.query_network_audits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own query network audits" ON public.query_network_audits;
CREATE POLICY "Users can delete own query network audits" ON public.query_network_audits
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_query_network_audits_map_id ON public.query_network_audits(map_id);
CREATE INDEX IF NOT EXISTS idx_query_network_audits_user_id ON public.query_network_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_query_network_audits_created_at ON public.query_network_audits(created_at DESC);

-- ===========================================
-- E-A-T SCANNER (MENTION SCANNER) HISTORY
-- ===========================================
CREATE TABLE IF NOT EXISTS public.eat_scanner_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scan configuration
  entity_name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  language TEXT DEFAULT 'en',

  -- Score summary
  overall_eat_score NUMERIC,
  expertise_score NUMERIC,
  authority_score NUMERIC,
  trust_score NUMERIC,
  overall_sentiment TEXT,

  -- Full results as JSONB
  entity_authority JSONB,        -- Wikipedia, Wikidata, Knowledge Graph presence
  reputation_signals JSONB,      -- Reviews, mentions with sentiment
  co_occurrences JSONB,          -- Related entities found
  eat_breakdown JSONB,           -- Detailed E-A-T scores with signals
  recommendations JSONB,         -- Prioritized actions to improve E-A-T

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.eat_scanner_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own eat scanner audits" ON public.eat_scanner_audits;
CREATE POLICY "Users can view own eat scanner audits" ON public.eat_scanner_audits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own eat scanner audits" ON public.eat_scanner_audits;
CREATE POLICY "Users can insert own eat scanner audits" ON public.eat_scanner_audits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own eat scanner audits" ON public.eat_scanner_audits;
CREATE POLICY "Users can delete own eat scanner audits" ON public.eat_scanner_audits
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eat_scanner_audits_map_id ON public.eat_scanner_audits(map_id);
CREATE INDEX IF NOT EXISTS idx_eat_scanner_audits_user_id ON public.eat_scanner_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_eat_scanner_audits_created_at ON public.eat_scanner_audits(created_at DESC);

-- ===========================================
-- CORPUS AUDIT HISTORY
-- ===========================================
CREATE TABLE IF NOT EXISTS public.corpus_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audit configuration
  domain TEXT NOT NULL,
  sitemap_url TEXT,
  page_limit INTEGER,

  -- Results summary
  total_pages INTEGER DEFAULT 0,
  total_overlaps INTEGER DEFAULT 0,
  semantic_coverage_percentage NUMERIC,

  -- Full results as JSONB
  pages JSONB,                   -- Crawled pages with content
  content_overlaps JSONB,        -- Content overlap detection
  anchor_patterns JSONB,         -- Anchor text analysis
  semantic_coverage JSONB,       -- EAV coverage analysis
  metrics JSONB,                 -- Site-wide metrics
  issues JSONB,                  -- Identified issues

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.corpus_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own corpus audits" ON public.corpus_audits;
CREATE POLICY "Users can view own corpus audits" ON public.corpus_audits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own corpus audits" ON public.corpus_audits;
CREATE POLICY "Users can insert own corpus audits" ON public.corpus_audits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own corpus audits" ON public.corpus_audits;
CREATE POLICY "Users can delete own corpus audits" ON public.corpus_audits
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_corpus_audits_map_id ON public.corpus_audits(map_id);
CREATE INDEX IF NOT EXISTS idx_corpus_audits_user_id ON public.corpus_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_corpus_audits_created_at ON public.corpus_audits(created_at DESC);

-- ===========================================
-- ENHANCED METRICS SNAPSHOTS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.enhanced_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Snapshot type: 'manual' or 'auto' (auto = saved after audit)
  snapshot_type TEXT DEFAULT 'manual',
  snapshot_name TEXT,  -- User-provided name for manual snapshots

  -- Key metrics for quick comparison
  semantic_compliance_score NUMERIC,
  eav_authority_score NUMERIC,
  information_density_score NUMERIC,
  topic_count INTEGER,
  eav_count INTEGER,

  -- Category counts
  unique_eav_count INTEGER DEFAULT 0,
  root_eav_count INTEGER DEFAULT 0,
  rare_eav_count INTEGER DEFAULT 0,
  common_eav_count INTEGER DEFAULT 0,

  -- Full metrics as JSONB
  semantic_compliance JSONB,
  authority_indicators JSONB,
  information_density JSONB,
  action_roadmap JSONB,
  category_distribution JSONB,
  classification_distribution JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT  -- User notes about this snapshot
);

-- Enable RLS
ALTER TABLE public.enhanced_metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots;
CREATE POLICY "Users can view own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots;
CREATE POLICY "Users can insert own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots;
CREATE POLICY "Users can update own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots;
CREATE POLICY "Users can delete own enhanced metrics snapshots" ON public.enhanced_metrics_snapshots
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_metrics_map_id ON public.enhanced_metrics_snapshots(map_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_metrics_user_id ON public.enhanced_metrics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_metrics_created_at ON public.enhanced_metrics_snapshots(created_at DESC);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Get latest audit of each type for a map
CREATE OR REPLACE FUNCTION public.get_latest_audits(p_map_id UUID)
RETURNS TABLE (
  audit_type TEXT,
  audit_id UUID,
  created_at TIMESTAMPTZ,
  summary JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 'query_network'::TEXT, q.id, q.created_at,
      jsonb_build_object(
        'seed_keyword', q.seed_keyword,
        'total_queries', q.total_queries,
        'total_competitor_eavs', q.total_competitor_eavs,
        'total_recommendations', q.total_recommendations
      )
    FROM public.query_network_audits q
    WHERE q.map_id = p_map_id
    ORDER BY q.created_at DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT 'eat_scanner'::TEXT, e.id, e.created_at,
      jsonb_build_object(
        'entity_name', e.entity_name,
        'overall_eat_score', e.overall_eat_score,
        'overall_sentiment', e.overall_sentiment
      )
    FROM public.eat_scanner_audits e
    WHERE e.map_id = p_map_id
    ORDER BY e.created_at DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT 'corpus_audit'::TEXT, c.id, c.created_at,
      jsonb_build_object(
        'domain', c.domain,
        'total_pages', c.total_pages,
        'semantic_coverage_percentage', c.semantic_coverage_percentage
      )
    FROM public.corpus_audits c
    WHERE c.map_id = p_map_id
    ORDER BY c.created_at DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT 'enhanced_metrics'::TEXT, m.id, m.created_at,
      jsonb_build_object(
        'snapshot_name', m.snapshot_name,
        'semantic_compliance_score', m.semantic_compliance_score,
        'eav_authority_score', m.eav_authority_score,
        'topic_count', m.topic_count
      )
    FROM public.enhanced_metrics_snapshots m
    WHERE m.map_id = p_map_id
    ORDER BY m.created_at DESC
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_audits(UUID) TO authenticated;

-- Compare two metrics snapshots
CREATE OR REPLACE FUNCTION public.compare_metrics_snapshots(p_snapshot_id_1 UUID, p_snapshot_id_2 UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_s1 RECORD;
  v_s2 RECORD;
BEGIN
  SELECT * INTO v_s1 FROM public.enhanced_metrics_snapshots WHERE id = p_snapshot_id_1;
  SELECT * INTO v_s2 FROM public.enhanced_metrics_snapshots WHERE id = p_snapshot_id_2;

  IF v_s1 IS NULL OR v_s2 IS NULL THEN
    RETURN jsonb_build_object('error', 'One or both snapshots not found');
  END IF;

  RETURN jsonb_build_object(
    'snapshot_1', jsonb_build_object(
      'id', v_s1.id,
      'created_at', v_s1.created_at,
      'semantic_compliance_score', v_s1.semantic_compliance_score,
      'eav_authority_score', v_s1.eav_authority_score,
      'topic_count', v_s1.topic_count,
      'eav_count', v_s1.eav_count
    ),
    'snapshot_2', jsonb_build_object(
      'id', v_s2.id,
      'created_at', v_s2.created_at,
      'semantic_compliance_score', v_s2.semantic_compliance_score,
      'eav_authority_score', v_s2.eav_authority_score,
      'topic_count', v_s2.topic_count,
      'eav_count', v_s2.eav_count
    ),
    'changes', jsonb_build_object(
      'semantic_compliance_delta', COALESCE(v_s2.semantic_compliance_score, 0) - COALESCE(v_s1.semantic_compliance_score, 0),
      'eav_authority_delta', COALESCE(v_s2.eav_authority_score, 0) - COALESCE(v_s1.eav_authority_score, 0),
      'topic_count_delta', COALESCE(v_s2.topic_count, 0) - COALESCE(v_s1.topic_count, 0),
      'eav_count_delta', COALESCE(v_s2.eav_count, 0) - COALESCE(v_s1.eav_count, 0)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compare_metrics_snapshots(UUID, UUID) TO authenticated;
