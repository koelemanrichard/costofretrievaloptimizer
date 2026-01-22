-- ============================================================================
-- Layout Blueprints Tables for AI Architect System
-- ============================================================================
-- Created: 2026-01-22
-- Description: Stores layout blueprints at project, topical map, and article levels
-- for the AI Layout Architect system.
-- ============================================================================

-- ============================================================================
-- PROJECT BLUEPRINTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Blueprint defaults
  visual_style TEXT NOT NULL DEFAULT 'editorial' CHECK (visual_style IN ('editorial', 'marketing', 'minimal', 'bold', 'warm-modern')),
  pacing TEXT NOT NULL DEFAULT 'balanced' CHECK (pacing IN ('dense', 'balanced', 'spacious')),
  color_intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (color_intensity IN ('subtle', 'moderate', 'vibrant')),

  -- CTA strategy defaults
  cta_positions TEXT[] DEFAULT ARRAY['end'],
  cta_intensity TEXT DEFAULT 'moderate' CHECK (cta_intensity IN ('subtle', 'moderate', 'prominent')),
  cta_style TEXT DEFAULT 'banner' CHECK (cta_style IN ('inline', 'banner', 'floating')),

  -- Component preferences
  component_preferences JSONB DEFAULT '{}'::JSONB,
  avoid_components TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- AI reasoning
  ai_reasoning TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One blueprint per project
  UNIQUE(project_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_blueprints_project ON project_blueprints(project_id);

-- ============================================================================
-- TOPICAL MAP BLUEPRINTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS topical_map_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topical_map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Override defaults (nullable - inherits from project if null)
  visual_style TEXT CHECK (visual_style IS NULL OR visual_style IN ('editorial', 'marketing', 'minimal', 'bold', 'warm-modern')),
  pacing TEXT CHECK (pacing IS NULL OR pacing IN ('dense', 'balanced', 'spacious')),
  color_intensity TEXT CHECK (color_intensity IS NULL OR color_intensity IN ('subtle', 'moderate', 'vibrant')),

  -- CTA strategy overrides
  cta_positions TEXT[],
  cta_intensity TEXT CHECK (cta_intensity IS NULL OR cta_intensity IN ('subtle', 'moderate', 'prominent')),
  cta_style TEXT CHECK (cta_style IS NULL OR cta_style IN ('inline', 'banner', 'floating')),

  -- Component preferences override
  component_preferences JSONB,

  -- Cluster-specific rules
  cluster_rules JSONB DEFAULT '[]'::JSONB,

  -- AI reasoning
  ai_reasoning TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One blueprint per topical map
  UNIQUE(topical_map_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topical_map_blueprints_map ON topical_map_blueprints(topical_map_id);
CREATE INDEX IF NOT EXISTS idx_topical_map_blueprints_project ON topical_map_blueprints(project_id);

-- ============================================================================
-- ARTICLE BLUEPRINTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  topical_map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,

  -- Full blueprint JSON
  blueprint JSONB NOT NULL,

  -- User overrides (stored separately for easy merging)
  user_overrides JSONB DEFAULT '{}'::JSONB,

  -- Page strategy summary (for quick filtering/display)
  visual_style TEXT NOT NULL CHECK (visual_style IN ('editorial', 'marketing', 'minimal', 'bold', 'warm-modern')),
  pacing TEXT NOT NULL CHECK (pacing IN ('dense', 'balanced', 'spacious')),

  -- Metadata
  sections_count INTEGER DEFAULT 0,
  components_used TEXT[] DEFAULT ARRAY[]::TEXT[],
  word_count INTEGER DEFAULT 0,

  -- Generation metadata
  model_used TEXT,
  generation_duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One blueprint per topic
  UNIQUE(topic_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_article_blueprints_topic ON article_blueprints(topic_id);
CREATE INDEX IF NOT EXISTS idx_article_blueprints_map ON article_blueprints(topical_map_id);
CREATE INDEX IF NOT EXISTS idx_article_blueprints_style ON article_blueprints(visual_style);
CREATE INDEX IF NOT EXISTS idx_article_blueprints_components ON article_blueprints USING GIN(components_used);

-- ============================================================================
-- BLUEPRINT HISTORY (for reverting changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS blueprint_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_blueprint_id UUID NOT NULL REFERENCES article_blueprints(id) ON DELETE CASCADE,

  -- Snapshot of the blueprint at this point
  blueprint_snapshot JSONB NOT NULL,
  user_overrides_snapshot JSONB,

  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN ('generated', 'refined', 'bulk_update', 'manual_edit', 'reverted')),
  change_description TEXT,

  -- Who made the change (if applicable)
  changed_by UUID REFERENCES auth.users(id),

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_history_article ON blueprint_history(article_blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_history_created ON blueprint_history(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE project_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE topical_map_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_history ENABLE ROW LEVEL SECURITY;

-- Project blueprints: access if user has access to project
CREATE POLICY project_blueprints_select ON project_blueprints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY project_blueprints_insert ON project_blueprints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')
      ))
    )
  );

CREATE POLICY project_blueprints_update ON project_blueprints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')
      ))
    )
  );

CREATE POLICY project_blueprints_delete ON project_blueprints
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
      ))
    )
  );

-- Topical map blueprints: same pattern
CREATE POLICY topical_map_blueprints_select ON topical_map_blueprints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = topical_map_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY topical_map_blueprints_insert ON topical_map_blueprints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = topical_map_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')
      ))
    )
  );

CREATE POLICY topical_map_blueprints_update ON topical_map_blueprints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = topical_map_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')
      ))
    )
  );

CREATE POLICY topical_map_blueprints_delete ON topical_map_blueprints
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = topical_map_blueprints.project_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
      ))
    )
  );

-- Article blueprints: access via topical map -> project chain
CREATE POLICY article_blueprints_select ON article_blueprints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY article_blueprints_insert ON article_blueprints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')
      ))
    )
  );

CREATE POLICY article_blueprints_update ON article_blueprints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')
      ))
    )
  );

CREATE POLICY article_blueprints_delete ON article_blueprints
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
      ))
    )
  );

-- Blueprint history: same as article blueprints
CREATE POLICY blueprint_history_select ON blueprint_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM article_blueprints ab
      JOIN topical_maps tm ON tm.id = ab.topical_map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE ab.id = blueprint_history.article_blueprint_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY blueprint_history_insert ON blueprint_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM article_blueprints ab
      JOIN topical_maps tm ON tm.id = ab.topical_map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE ab.id = blueprint_history.article_blueprint_id
      AND (p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')
      ))
    )
  );

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_blueprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_blueprints_updated_at
  BEFORE UPDATE ON project_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_blueprint_updated_at();

CREATE TRIGGER update_topical_map_blueprints_updated_at
  BEFORE UPDATE ON topical_map_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_blueprint_updated_at();

CREATE TRIGGER update_article_blueprints_updated_at
  BEFORE UPDATE ON article_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_blueprint_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_blueprints IS 'Project-level layout blueprint defaults for AI Architect system';
COMMENT ON TABLE topical_map_blueprints IS 'Topical map level layout blueprint overrides';
COMMENT ON TABLE article_blueprints IS 'Per-article layout blueprints with section-level component decisions';
COMMENT ON TABLE blueprint_history IS 'History of blueprint changes for reverting';
