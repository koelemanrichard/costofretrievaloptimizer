-- Site Analysis V2 Tables
-- Run this migration to add site analysis capabilities

-- ===========================================
-- SITE ANALYSIS PROJECTS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.site_analysis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,

  -- Input configuration
  input_method TEXT CHECK (input_method IN ('url', 'sitemap', 'gsc', 'manual')) DEFAULT 'url',
  sitemap_url TEXT,

  -- Link to existing topical map project (optional)
  linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Semantic Foundation (CE/SC/CSI)
  central_entity TEXT,
  central_entity_type TEXT,
  source_context TEXT,
  source_context_type TEXT,
  central_search_intent TEXT,
  pillars_validated BOOLEAN DEFAULT FALSE,
  pillars_validated_at TIMESTAMPTZ,
  pillars_source TEXT CHECK (pillars_source IN ('inferred', 'linked', 'manual')),

  -- Status tracking
  status TEXT CHECK (status IN ('created', 'crawling', 'extracting', 'discovering_pillars', 'awaiting_validation', 'building_graph', 'analyzing', 'completed', 'error')) DEFAULT 'created',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_audit_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.site_analysis_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own site analysis projects"
  ON public.site_analysis_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create site analysis projects"
  ON public.site_analysis_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site analysis projects"
  ON public.site_analysis_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site analysis projects"
  ON public.site_analysis_projects FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- SITE PAGES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.site_analysis_projects(id) ON DELETE CASCADE NOT NULL,

  -- Page identification
  url TEXT NOT NULL,
  path TEXT, -- extracted path for easier querying

  -- Discovery metadata
  discovered_via TEXT CHECK (discovered_via IN ('sitemap', 'crawl', 'gsc', 'manual', 'link')),
  sitemap_lastmod TIMESTAMPTZ,
  sitemap_priority DECIMAL(2,1),
  sitemap_changefreq TEXT,

  -- Content extraction - Basic
  content_hash TEXT, -- for change detection
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  word_count INTEGER,

  -- Technical data (from Apify)
  status_code INTEGER,
  canonical_url TEXT,
  robots_meta TEXT,
  schema_types TEXT[], -- e.g., ['Article', 'FAQ', 'BreadcrumbList']
  schema_json JSONB, -- full schema data
  ttfb_ms INTEGER,
  load_time_ms INTEGER,
  dom_nodes INTEGER,
  html_size_kb INTEGER,

  -- Semantic data (from Jina)
  headings JSONB, -- [{level: 1, text: '...'}, ...]
  links JSONB, -- [{href, text, isInternal, position}, ...]
  images JSONB, -- [{src, alt, width, height}, ...]
  content_markdown TEXT,

  -- GSC metrics (if available)
  gsc_clicks INTEGER,
  gsc_impressions INTEGER,
  gsc_ctr DECIMAL(5,4),
  gsc_position DECIMAL(4,1),
  gsc_queries JSONB, -- top queries for this page

  -- Status
  crawl_status TEXT CHECK (crawl_status IN ('pending', 'crawling', 'crawled', 'failed', 'skipped')) DEFAULT 'pending',
  crawl_error TEXT,
  crawled_at TIMESTAMPTZ,
  apify_crawled BOOLEAN DEFAULT FALSE,
  jina_crawled BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, url)
);

-- Enable RLS
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (via project ownership)
CREATE POLICY "Users can view pages of their projects"
  ON public.site_pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = site_pages.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pages to their projects"
  ON public.site_pages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = site_pages.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update pages of their projects"
  ON public.site_pages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = site_pages.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete pages of their projects"
  ON public.site_pages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = site_pages.project_id AND user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_site_pages_project ON public.site_pages(project_id);
CREATE INDEX idx_site_pages_url ON public.site_pages(url);
CREATE INDEX idx_site_pages_crawl_status ON public.site_pages(crawl_status);

-- ===========================================
-- PAGE AUDITS (versioned)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.site_pages(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.site_analysis_projects(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,

  -- Overall scores
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  technical_score INTEGER CHECK (technical_score >= 0 AND technical_score <= 100),
  semantic_score INTEGER CHECK (semantic_score >= 0 AND semantic_score <= 100),
  link_structure_score INTEGER CHECK (link_structure_score >= 0 AND link_structure_score <= 100),
  content_quality_score INTEGER CHECK (content_quality_score >= 0 AND content_quality_score <= 100),
  visual_schema_score INTEGER CHECK (visual_schema_score >= 0 AND visual_schema_score <= 100),

  -- Detailed phase results
  technical_checks JSONB,
  semantic_checks JSONB,
  link_structure_checks JSONB,
  content_quality_checks JSONB,
  visual_schema_checks JSONB,

  -- AI Analysis (for deep analysis)
  ai_analysis_complete BOOLEAN DEFAULT FALSE,
  ce_alignment_score INTEGER,
  ce_alignment_explanation TEXT,
  sc_alignment_score INTEGER,
  sc_alignment_explanation TEXT,
  csi_alignment_score INTEGER,
  csi_alignment_explanation TEXT,
  content_suggestions TEXT[],

  -- Summary
  summary TEXT,
  critical_issues_count INTEGER DEFAULT 0,
  high_issues_count INTEGER DEFAULT 0,
  medium_issues_count INTEGER DEFAULT 0,
  low_issues_count INTEGER DEFAULT 0,

  -- Content hash at audit time (for change detection)
  content_hash_at_audit TEXT,

  -- Audit type
  audit_type TEXT CHECK (audit_type IN ('quick', 'deep')) DEFAULT 'quick',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(page_id, version)
);

-- Enable RLS
ALTER TABLE public.page_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view audits of their projects"
  ON public.page_audits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = page_audits.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert audits to their projects"
  ON public.page_audits FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = page_audits.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update audits of their projects"
  ON public.page_audits FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = page_audits.project_id AND user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_page_audits_page ON public.page_audits(page_id);
CREATE INDEX idx_page_audits_project ON public.page_audits(project_id);

-- ===========================================
-- AUDIT TASKS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.site_analysis_projects(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES public.site_pages(id) ON DELETE SET NULL,
  audit_id UUID REFERENCES public.page_audits(id) ON DELETE SET NULL,

  -- Task details
  rule_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  remediation TEXT,

  -- Priority and impact
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')) NOT NULL,
  estimated_impact TEXT CHECK (estimated_impact IN ('high', 'medium', 'low')),
  phase TEXT CHECK (phase IN ('technical', 'semantic', 'linkStructure', 'contentQuality', 'visualSchema')),

  -- Status
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  dismissed_reason TEXT,

  -- Grouping
  issue_group TEXT, -- for grouping similar issues across pages

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view tasks of their projects"
  ON public.audit_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = audit_tasks.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage tasks of their projects"
  ON public.audit_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = audit_tasks.project_id AND user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_audit_tasks_project ON public.audit_tasks(project_id);
CREATE INDEX idx_audit_tasks_page ON public.audit_tasks(page_id);
CREATE INDEX idx_audit_tasks_status ON public.audit_tasks(status);
CREATE INDEX idx_audit_tasks_priority ON public.audit_tasks(priority);

-- ===========================================
-- AUDIT HISTORY (for trend tracking)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.site_analysis_projects(id) ON DELETE CASCADE NOT NULL,

  -- Snapshot data
  audit_date TIMESTAMPTZ DEFAULT NOW(),
  total_pages INTEGER,
  pages_audited INTEGER,
  average_score INTEGER,

  -- Phase averages
  avg_technical_score INTEGER,
  avg_semantic_score INTEGER,
  avg_link_structure_score INTEGER,
  avg_content_quality_score INTEGER,
  avg_visual_schema_score INTEGER,

  -- Issue counts
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  medium_issues INTEGER DEFAULT 0,
  low_issues INTEGER DEFAULT 0,

  -- Pages with changes since last audit
  pages_changed INTEGER DEFAULT 0,

  -- Top issues snapshot
  top_issues JSONB -- [{ruleId, ruleName, count}, ...]
);

-- Enable RLS
ALTER TABLE public.audit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view history of their projects"
  ON public.audit_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = audit_history.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert history for their projects"
  ON public.audit_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.site_analysis_projects
    WHERE id = audit_history.project_id AND user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_audit_history_project ON public.audit_history(project_id);
CREATE INDEX idx_audit_history_date ON public.audit_history(audit_date);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function to get next audit version for a page
CREATE OR REPLACE FUNCTION get_next_audit_version(p_page_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.page_audits
  WHERE page_id = p_page_id;
$$ LANGUAGE SQL;

-- Function to update project updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_analysis_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.site_analysis_projects
  SET updated_at = NOW()
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update project timestamp
CREATE TRIGGER update_project_on_page_change
  AFTER INSERT OR UPDATE ON public.site_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_site_analysis_project_timestamp();

CREATE TRIGGER update_project_on_audit_change
  AFTER INSERT OR UPDATE ON public.page_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_site_analysis_project_timestamp();
