-- Migration: Site Analysis Tables and RPC Functions
-- Creates the tables needed for site analysis V2 feature and their associated RPC functions

-- ===========================================
-- SITE ANALYSIS PROJECTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.site_analysis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'discovering', 'crawling', 'crawling_pages', 'semantic_mapping', 'auditing', 'completed', 'error')),
  status_message TEXT,
  error_message TEXT,

  -- Input method
  input_method TEXT DEFAULT 'url' CHECK (input_method IN ('url', 'sitemap', 'gsc', 'manual', 'single_page')),
  sitemap_url TEXT,

  -- Link to topical map
  linked_project_id UUID REFERENCES public.topical_maps(id) ON DELETE SET NULL,

  -- Semantic pillars
  central_entity TEXT,
  central_entity_type TEXT,
  source_context TEXT,
  source_context_type TEXT,
  central_search_intent TEXT,
  pillars_validated BOOLEAN DEFAULT FALSE,
  pillars_validated_at TIMESTAMPTZ,
  pillars_source TEXT CHECK (pillars_source IN ('inferred', 'linked', 'manual')),

  -- Page counts (cached)
  page_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_audit_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.site_analysis_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own site analysis projects" ON public.site_analysis_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own site analysis projects" ON public.site_analysis_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own site analysis projects" ON public.site_analysis_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own site analysis projects" ON public.site_analysis_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_analysis_projects_user_id ON public.site_analysis_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_site_analysis_projects_domain ON public.site_analysis_projects(domain);

-- ===========================================
-- SITE ANALYSIS PAGES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.site_analysis_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.site_analysis_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT,

  -- Discovery
  discovered_via TEXT CHECK (discovered_via IN ('sitemap', 'crawl', 'gsc', 'manual', 'link')),
  sitemap_lastmod TEXT,
  sitemap_priority NUMERIC,
  sitemap_changefreq TEXT,

  -- Crawl status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'crawled', 'failed', 'skipped')),
  crawl_error TEXT,
  last_crawled_at TIMESTAMPTZ,
  apify_crawled BOOLEAN DEFAULT FALSE,
  jina_crawled BOOLEAN DEFAULT FALSE,
  firecrawl_crawled BOOLEAN DEFAULT FALSE,

  -- Content basics
  content_hash TEXT,
  content_changed BOOLEAN DEFAULT FALSE,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  word_count INTEGER,

  -- Technical data
  status_code INTEGER,
  canonical_url TEXT,
  robots_meta TEXT,
  schema_types JSONB,
  schema_json JSONB,
  ttfb_ms INTEGER,
  load_time_ms INTEGER,
  dom_nodes INTEGER,
  html_size_kb NUMERIC,

  -- Semantic data
  headings JSONB,
  links JSONB,
  images JSONB,
  content_markdown TEXT,
  content_layers JSONB,

  -- Raw extraction data
  jina_extraction JSONB,
  apify_extraction JSONB,
  firecrawl_extraction JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert
  UNIQUE(project_id, url)
);

-- Enable RLS
ALTER TABLE public.site_analysis_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (via project ownership)
CREATE POLICY "Users can view own site analysis pages" ON public.site_analysis_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = site_analysis_pages.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own site analysis pages" ON public.site_analysis_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = site_analysis_pages.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own site analysis pages" ON public.site_analysis_pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = site_analysis_pages.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own site analysis pages" ON public.site_analysis_pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = site_analysis_pages.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

-- Service role policies for edge functions
CREATE POLICY "Service role can manage site analysis pages" ON public.site_analysis_pages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_analysis_pages_project_id ON public.site_analysis_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_site_analysis_pages_status ON public.site_analysis_pages(status);
CREATE INDEX IF NOT EXISTS idx_site_analysis_pages_url ON public.site_analysis_pages(url);

-- ===========================================
-- PAGE AUDITS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.site_analysis_pages(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.site_analysis_projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,

  -- Scores
  overall_score NUMERIC,
  technical_score NUMERIC,
  semantic_score NUMERIC,
  link_structure_score NUMERIC,
  content_quality_score NUMERIC,
  visual_schema_score NUMERIC,

  -- Detailed checks (JSONB arrays)
  technical_checks JSONB,
  semantic_checks JSONB,
  link_structure_checks JSONB,
  content_quality_checks JSONB,
  visual_schema_checks JSONB,

  -- AI Analysis
  ai_analysis_complete BOOLEAN DEFAULT FALSE,
  ce_alignment_score NUMERIC,
  ce_alignment_explanation TEXT,
  sc_alignment_score NUMERIC,
  sc_alignment_explanation TEXT,
  csi_alignment_score NUMERIC,
  csi_alignment_explanation TEXT,
  content_suggestions JSONB,

  -- Summary
  summary TEXT,
  critical_issues_count INTEGER DEFAULT 0,
  high_issues_count INTEGER DEFAULT 0,
  medium_issues_count INTEGER DEFAULT 0,
  low_issues_count INTEGER DEFAULT 0,

  -- Change detection
  content_hash_at_audit TEXT,

  -- Audit type
  audit_type TEXT DEFAULT 'quick' CHECK (audit_type IN ('quick', 'deep')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for versioning
  UNIQUE(page_id, version)
);

-- Enable RLS
ALTER TABLE public.page_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (via project ownership)
CREATE POLICY "Users can view own page audits" ON public.page_audits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = page_audits.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own page audits" ON public.page_audits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = page_audits.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own page audits" ON public.page_audits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = page_audits.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own page audits" ON public.page_audits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = page_audits.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_audits_page_id ON public.page_audits(page_id);
CREATE INDEX IF NOT EXISTS idx_page_audits_project_id ON public.page_audits(project_id);

-- ===========================================
-- AUDIT TASKS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.site_analysis_projects(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.site_analysis_pages(id) ON DELETE SET NULL,
  audit_id UUID REFERENCES public.page_audits(id) ON DELETE SET NULL,

  rule_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  remediation TEXT,

  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.audit_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (via project ownership)
CREATE POLICY "Users can view own audit tasks" ON public.audit_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = audit_tasks.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own audit tasks" ON public.audit_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = audit_tasks.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own audit tasks" ON public.audit_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = audit_tasks.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own audit tasks" ON public.audit_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.site_analysis_projects
      WHERE site_analysis_projects.id = audit_tasks.project_id
      AND site_analysis_projects.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_tasks_project_id ON public.audit_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_page_id ON public.audit_tasks(page_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_status ON public.audit_tasks(status);

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================
DROP TRIGGER IF EXISTS set_updated_at ON public.site_analysis_projects;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.site_analysis_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.site_analysis_pages;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.site_analysis_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.audit_tasks;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.audit_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- RPC FUNCTIONS FOR SITE ANALYSIS
-- ===========================================

-- GET NEXT AUDIT VERSION FUNCTION
-- Called from siteAnalysisServiceV2.ts when auditing pages
CREATE OR REPLACE FUNCTION public.get_next_audit_version(p_page_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.page_audits
  WHERE page_id = p_page_id;

  RETURN v_next_version;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_audit_version(UUID) TO authenticated;

-- SYNC SITEMAP PAGES FUNCTION
-- Called from sitemap-discovery edge function
CREATE OR REPLACE FUNCTION public.sync_sitemap_pages(p_project_id UUID, pages_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page JSONB;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_url TEXT;
  v_was_insert BOOLEAN;
BEGIN
  FOR v_page IN SELECT * FROM jsonb_array_elements(pages_data)
  LOOP
    v_url := v_page->>'url';

    INSERT INTO public.site_analysis_pages (project_id, url, status, discovered_via)
    VALUES (p_project_id, v_url, 'pending', 'sitemap')
    ON CONFLICT (project_id, url) DO UPDATE
    SET updated_at = NOW()
    RETURNING (xmax = 0) INTO v_was_insert;

    IF v_was_insert THEN
      v_inserted := v_inserted + 1;
    ELSE
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  -- Update page count on project
  UPDATE public.site_analysis_projects
  SET page_count = (SELECT COUNT(*) FROM public.site_analysis_pages WHERE project_id = p_project_id)
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'total', jsonb_array_length(pages_data)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_sitemap_pages(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_sitemap_pages(UUID, JSONB) TO service_role;

-- UPDATE CRAWLED PAGES FUNCTION
-- Called from crawl-results-worker edge function
CREATE OR REPLACE FUNCTION public.update_crawled_pages(page_updates JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_update JSONB;
  v_updated INTEGER := 0;
BEGIN
  FOR v_update IN SELECT * FROM jsonb_array_elements(page_updates)
  LOOP
    UPDATE public.site_analysis_pages
    SET
      status = COALESCE(v_update->>'status', status),
      content_layers = COALESCE((v_update->'content_layers')::JSONB, content_layers),
      word_count = COALESCE((v_update->>'word_count')::INTEGER, word_count),
      last_crawled_at = COALESCE((v_update->>'last_crawled_at')::TIMESTAMPTZ, last_crawled_at),
      updated_at = NOW()
    WHERE project_id = (v_update->>'project_id')::UUID
      AND url = v_update->>'url';

    IF FOUND THEN
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_crawled_pages(JSONB) TO service_role;
