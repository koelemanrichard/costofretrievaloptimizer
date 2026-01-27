-- ============================================================================
-- COMPREHENSIVE FIX: Blueprint Tables and RLS Policies
-- ============================================================================
-- This migration ensures project_blueprints and topical_map_blueprints tables
-- are correctly configured with simplified RLS policies.
--
-- Issues being fixed:
-- - 406 errors on GET requests
-- - RLS policies may be too restrictive
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure project_blueprints table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visual_style TEXT NOT NULL DEFAULT 'editorial' CHECK (visual_style IN ('editorial', 'marketing', 'minimal', 'bold', 'warm-modern')),
  pacing TEXT NOT NULL DEFAULT 'balanced' CHECK (pacing IN ('dense', 'balanced', 'spacious')),
  color_intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (color_intensity IN ('subtle', 'moderate', 'vibrant')),
  cta_positions TEXT[] DEFAULT ARRAY['end'],
  cta_intensity TEXT DEFAULT 'moderate' CHECK (cta_intensity IN ('subtle', 'moderate', 'prominent')),
  cta_style TEXT DEFAULT 'banner' CHECK (cta_style IN ('inline', 'banner', 'floating')),
  component_preferences JSONB DEFAULT '{}'::JSONB,
  avoid_components TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_blueprints_project ON project_blueprints(project_id);

-- ============================================================================
-- STEP 2: Ensure topical_map_blueprints table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS topical_map_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topical_map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visual_style TEXT CHECK (visual_style IS NULL OR visual_style IN ('editorial', 'marketing', 'minimal', 'bold', 'warm-modern')),
  pacing TEXT CHECK (pacing IS NULL OR pacing IN ('dense', 'balanced', 'spacious')),
  color_intensity TEXT CHECK (color_intensity IS NULL OR color_intensity IN ('subtle', 'moderate', 'vibrant')),
  cta_positions TEXT[],
  cta_intensity TEXT CHECK (cta_intensity IS NULL OR cta_intensity IN ('subtle', 'moderate', 'prominent')),
  cta_style TEXT CHECK (cta_style IS NULL OR cta_style IN ('inline', 'banner', 'floating')),
  component_preferences JSONB,
  cluster_rules JSONB DEFAULT '[]'::JSONB,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topical_map_id)
);

CREATE INDEX IF NOT EXISTS idx_topical_map_blueprints_map ON topical_map_blueprints(topical_map_id);
CREATE INDEX IF NOT EXISTS idx_topical_map_blueprints_project ON topical_map_blueprints(project_id);

-- ============================================================================
-- STEP 3: Enable RLS
-- ============================================================================

ALTER TABLE project_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE topical_map_blueprints ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Drop and recreate RLS policies using has_project_access()
-- ============================================================================

-- project_blueprints
DROP POLICY IF EXISTS "project_blueprints_select" ON project_blueprints;
DROP POLICY IF EXISTS "project_blueprints_insert" ON project_blueprints;
DROP POLICY IF EXISTS "project_blueprints_update" ON project_blueprints;
DROP POLICY IF EXISTS "project_blueprints_delete" ON project_blueprints;

CREATE POLICY "project_blueprints_select" ON project_blueprints
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "project_blueprints_insert" ON project_blueprints
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "project_blueprints_update" ON project_blueprints
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "project_blueprints_delete" ON project_blueprints
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- topical_map_blueprints
DROP POLICY IF EXISTS "topical_map_blueprints_select" ON topical_map_blueprints;
DROP POLICY IF EXISTS "topical_map_blueprints_insert" ON topical_map_blueprints;
DROP POLICY IF EXISTS "topical_map_blueprints_update" ON topical_map_blueprints;
DROP POLICY IF EXISTS "topical_map_blueprints_delete" ON topical_map_blueprints;

CREATE POLICY "topical_map_blueprints_select" ON topical_map_blueprints
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "topical_map_blueprints_insert" ON topical_map_blueprints
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "topical_map_blueprints_update" ON topical_map_blueprints
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "topical_map_blueprints_delete" ON topical_map_blueprints
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- ============================================================================
-- STEP 5: Notify PostgREST to reload schema
-- ============================================================================

NOTIFY pgrst, 'reload schema';
