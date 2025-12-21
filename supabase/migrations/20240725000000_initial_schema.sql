-- Initial Schema Migration
-- Creates the core tables: user_settings, projects, topical_maps, topics, content_briefs
-- This migration must run first as all other migrations depend on these tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- USER SETTINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- AI Provider Settings
  ai_provider TEXT DEFAULT 'gemini',
  ai_model TEXT DEFAULT 'gemini-2.0-flash-exp',

  -- Encrypted API Keys (stored securely)
  gemini_api_key TEXT,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  perplexity_api_key TEXT,
  openrouter_api_key TEXT,

  -- External Service Keys
  apify_token TEXT,
  infranodus_api_key TEXT,
  jina_api_key TEXT,
  firecrawl_api_key TEXT,
  dataforseo_login TEXT,
  dataforseo_password TEXT,
  apitemplate_api_key TEXT,

  -- Neo4j Settings
  neo4j_uri TEXT,
  neo4j_user TEXT,
  neo4j_password TEXT,

  -- Image/Brand Settings
  cloudinary_cloud_name TEXT,
  cloudinary_api_key TEXT,
  cloudinary_upload_preset TEXT,
  markupgo_api_key TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- PROJECTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- TOPICAL MAPS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.topical_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,

  -- JSON blobs for structured data
  business_info JSONB,
  pillars JSONB,
  eavs JSONB,
  competitors JSONB,
  analysis_state JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.topical_maps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topical_maps
CREATE POLICY "Users can view own maps" ON public.topical_maps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maps" ON public.topical_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maps" ON public.topical_maps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maps" ON public.topical_maps
  FOR DELETE USING (auth.uid() = user_id);

-- Index for project lookup
CREATE INDEX IF NOT EXISTS idx_topical_maps_project_id ON public.topical_maps(project_id);
CREATE INDEX IF NOT EXISTS idx_topical_maps_user_id ON public.topical_maps(user_id);

-- ===========================================
-- TOPICS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,

  -- Core topic fields
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('core', 'outer')),
  freshness TEXT DEFAULT 'STANDARD' CHECK (freshness IN ('EVERGREEN', 'STANDARD', 'FREQUENT')),

  -- Holistic SEO fields
  topic_class TEXT CHECK (topic_class IN ('monetization', 'informational')),
  cluster_role TEXT CHECK (cluster_role IN ('pillar', 'cluster_content')),
  attribute_focus TEXT,

  -- Query fields
  canonical_query TEXT,
  query_network JSONB,
  query_type TEXT,
  topical_border_note TEXT,

  -- Planning fields
  planned_publication_date TEXT,
  url_slug_hint TEXT,

  -- Blueprint
  blueprint JSONB,

  -- Scores
  decay_score NUMERIC,

  -- Generic metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topics (via topical_maps ownership)
CREATE POLICY "Users can view own topics" ON public.topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.topical_maps
      WHERE topical_maps.id = topics.map_id
      AND topical_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own topics" ON public.topics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topical_maps
      WHERE topical_maps.id = topics.map_id
      AND topical_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own topics" ON public.topics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.topical_maps
      WHERE topical_maps.id = topics.map_id
      AND topical_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own topics" ON public.topics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.topical_maps
      WHERE topical_maps.id = topics.map_id
      AND topical_maps.user_id = auth.uid()
    )
  );

-- Indexes for topics
CREATE INDEX IF NOT EXISTS idx_topics_map_id ON public.topics(map_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_id ON public.topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_type ON public.topics(type);

-- ===========================================
-- CONTENT BRIEFS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,

  -- Core brief fields
  title TEXT NOT NULL,
  slug TEXT,
  meta_description TEXT,
  key_takeaways JSONB,
  outline TEXT,

  -- SEO fields
  target_keyword TEXT,
  search_intent TEXT,

  -- SERP analysis
  serp_analysis JSONB,

  -- Visuals
  visuals JSONB,

  -- Semantic vectors
  contextual_vectors JSONB,
  contextual_bridge JSONB,

  -- Structure
  perspectives JSONB,
  methodology_note TEXT,
  structured_outline JSONB,
  structural_template_hash TEXT,
  predicted_user_journey TEXT,

  -- Content
  article_draft TEXT,
  content_audit JSONB,

  -- Holistic SEO fields
  query_type_format TEXT,
  featured_snippet_target JSONB,
  visual_semantics JSONB,
  discourse_anchors JSONB,

  -- Business fields
  cta TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_briefs (via topics -> topical_maps ownership)
CREATE POLICY "Users can view own briefs" ON public.content_briefs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own briefs" ON public.content_briefs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own briefs" ON public.content_briefs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own briefs" ON public.content_briefs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
      AND tm.user_id = auth.uid()
    )
  );

-- Index for content_briefs
CREATE INDEX IF NOT EXISTS idx_content_briefs_topic_id ON public.content_briefs(topic_id);

-- ===========================================
-- UPDATED_AT TRIGGER FUNCTIONS
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alias function used by some migrations
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
DROP TRIGGER IF EXISTS set_updated_at ON public.user_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.projects;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.topical_maps;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.topical_maps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.topics;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.content_briefs;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.content_briefs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
