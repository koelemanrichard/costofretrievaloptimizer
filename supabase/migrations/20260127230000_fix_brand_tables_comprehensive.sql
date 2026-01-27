-- ============================================================================
-- COMPREHENSIVE FIX: Brand Tables and RLS Policies
-- ============================================================================
-- This migration ensures all brand-related tables exist and RLS policies
-- are correctly configured to use has_project_access().
--
-- Issues being fixed:
-- - 406 errors (tables may not exist)
-- - 403 errors (RLS blocking inserts)
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure brand_design_dna table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_design_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  design_dna JSONB NOT NULL,
  ai_model TEXT,
  confidence_score NUMERIC,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_brand_dna_project ON brand_design_dna(project_id);

-- ============================================================================
-- STEP 2: Ensure brand_design_systems table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_design_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  design_dna_id UUID REFERENCES brand_design_dna(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  design_dna_hash TEXT NOT NULL,
  tokens JSONB NOT NULL,
  component_styles JSONB NOT NULL,
  decorative_elements JSONB,
  interactions JSONB,
  typography_treatments JSONB,
  image_treatments JSONB,
  compiled_css TEXT NOT NULL,
  variant_mappings JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, design_dna_hash)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_systems_project ON brand_design_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_systems_hash ON brand_design_systems(design_dna_hash);

-- ============================================================================
-- STEP 3: Ensure brand_extractions table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  page_type TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  raw_html TEXT NOT NULL,
  computed_styles JSONB,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_brand_extractions_project ON brand_extractions(project_id);

-- ============================================================================
-- STEP 4: Ensure brand_components table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID NOT NULL REFERENCES brand_extractions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visual_description TEXT NOT NULL,
  component_type TEXT,
  literal_html TEXT NOT NULL,
  literal_css TEXT NOT NULL,
  their_class_names TEXT[],
  content_slots JSONB NOT NULL DEFAULT '[]',
  bounding_box JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_components_project ON brand_components(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_components_extraction ON brand_components(extraction_id);

-- ============================================================================
-- STEP 5: Ensure brand_tokens table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  colors JSONB NOT NULL,
  typography JSONB NOT NULL,
  spacing JSONB NOT NULL,
  shadows JSONB NOT NULL,
  borders JSONB NOT NULL,
  gradients JSONB,
  extracted_from TEXT[],
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- ============================================================================
-- STEP 6: Ensure brand_url_suggestions table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_url_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  suggested_url TEXT NOT NULL,
  page_type TEXT NOT NULL,
  discovered_from TEXT NOT NULL,
  prominence_score DECIMAL(3,2) DEFAULT 0.5,
  visual_context TEXT,
  selected BOOLEAN DEFAULT false,
  extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, suggested_url)
);

CREATE INDEX IF NOT EXISTS idx_brand_url_suggestions_project ON brand_url_suggestions(project_id);

-- ============================================================================
-- STEP 7: Enable RLS on all tables
-- ============================================================================

ALTER TABLE brand_design_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_design_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_url_suggestions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Drop ALL existing policies and recreate with has_project_access()
-- ============================================================================

-- brand_design_dna policies
DROP POLICY IF EXISTS "Users can view own brand_design_dna" ON brand_design_dna;
DROP POLICY IF EXISTS "Users can insert own brand_design_dna" ON brand_design_dna;
DROP POLICY IF EXISTS "Users can update own brand_design_dna" ON brand_design_dna;
DROP POLICY IF EXISTS "Users can delete own brand_design_dna" ON brand_design_dna;
DROP POLICY IF EXISTS "brand_design_dna_select" ON brand_design_dna;
DROP POLICY IF EXISTS "brand_design_dna_insert" ON brand_design_dna;
DROP POLICY IF EXISTS "brand_design_dna_update" ON brand_design_dna;
DROP POLICY IF EXISTS "brand_design_dna_delete" ON brand_design_dna;

CREATE POLICY "brand_design_dna_select" ON brand_design_dna
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_dna_insert" ON brand_design_dna
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_design_dna_update" ON brand_design_dna
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_dna_delete" ON brand_design_dna
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- brand_design_systems policies
DROP POLICY IF EXISTS "Users can view own brand_design_systems" ON brand_design_systems;
DROP POLICY IF EXISTS "Users can insert own brand_design_systems" ON brand_design_systems;
DROP POLICY IF EXISTS "Users can update own brand_design_systems" ON brand_design_systems;
DROP POLICY IF EXISTS "Users can delete own brand_design_systems" ON brand_design_systems;
DROP POLICY IF EXISTS "brand_design_systems_select" ON brand_design_systems;
DROP POLICY IF EXISTS "brand_design_systems_insert" ON brand_design_systems;
DROP POLICY IF EXISTS "brand_design_systems_update" ON brand_design_systems;
DROP POLICY IF EXISTS "brand_design_systems_delete" ON brand_design_systems;

CREATE POLICY "brand_design_systems_select" ON brand_design_systems
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_systems_insert" ON brand_design_systems
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_design_systems_update" ON brand_design_systems
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_systems_delete" ON brand_design_systems
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- brand_extractions policies
DROP POLICY IF EXISTS "Users can manage own brand_extractions" ON brand_extractions;
DROP POLICY IF EXISTS "brand_extractions_select" ON brand_extractions;
DROP POLICY IF EXISTS "brand_extractions_insert" ON brand_extractions;
DROP POLICY IF EXISTS "brand_extractions_update" ON brand_extractions;
DROP POLICY IF EXISTS "brand_extractions_delete" ON brand_extractions;

CREATE POLICY "brand_extractions_select" ON brand_extractions
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_extractions_insert" ON brand_extractions
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_extractions_update" ON brand_extractions
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_extractions_delete" ON brand_extractions
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- brand_components policies
DROP POLICY IF EXISTS "Users can manage own brand_components" ON brand_components;
DROP POLICY IF EXISTS "brand_components_select" ON brand_components;
DROP POLICY IF EXISTS "brand_components_insert" ON brand_components;
DROP POLICY IF EXISTS "brand_components_update" ON brand_components;
DROP POLICY IF EXISTS "brand_components_delete" ON brand_components;

CREATE POLICY "brand_components_select" ON brand_components
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_components_insert" ON brand_components
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_components_update" ON brand_components
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_components_delete" ON brand_components
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- brand_tokens policies
DROP POLICY IF EXISTS "Users can manage own brand_tokens" ON brand_tokens;
DROP POLICY IF EXISTS "brand_tokens_select" ON brand_tokens;
DROP POLICY IF EXISTS "brand_tokens_insert" ON brand_tokens;
DROP POLICY IF EXISTS "brand_tokens_update" ON brand_tokens;
DROP POLICY IF EXISTS "brand_tokens_delete" ON brand_tokens;

CREATE POLICY "brand_tokens_select" ON brand_tokens
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_tokens_insert" ON brand_tokens
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_tokens_update" ON brand_tokens
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_tokens_delete" ON brand_tokens
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- brand_url_suggestions policies
DROP POLICY IF EXISTS "Users can manage own brand_url_suggestions" ON brand_url_suggestions;
DROP POLICY IF EXISTS "brand_url_suggestions_select" ON brand_url_suggestions;
DROP POLICY IF EXISTS "brand_url_suggestions_insert" ON brand_url_suggestions;
DROP POLICY IF EXISTS "brand_url_suggestions_update" ON brand_url_suggestions;
DROP POLICY IF EXISTS "brand_url_suggestions_delete" ON brand_url_suggestions;

CREATE POLICY "brand_url_suggestions_select" ON brand_url_suggestions
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_url_suggestions_insert" ON brand_url_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_url_suggestions_update" ON brand_url_suggestions
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_url_suggestions_delete" ON brand_url_suggestions
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- ============================================================================
-- STEP 9: Notify PostgREST to reload schema (via pg_notify)
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- DONE
-- ============================================================================
