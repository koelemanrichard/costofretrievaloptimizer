-- Schema Generation System
-- Migration: 20251206000000_schema_generation.sql
-- Adds support for Pass 9 schema generation with entity resolution and validation

-- ============================================================================
-- ENTITY RESOLUTION CACHE
-- Stores resolved external entities (Wikidata, Wikipedia) for reuse
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_resolution_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Entity identification
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'Person', 'Organization', 'Place', 'Thing', 'Event'

  -- External resolution
  wikidata_id TEXT,
  wikipedia_url TEXT,
  resolved_data JSONB, -- Full entity data from Wikidata

  -- sameAs URLs array
  same_as_urls JSONB DEFAULT '[]'::jsonb,

  -- Resolution metadata
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  resolution_source TEXT DEFAULT 'ai_inferred' CHECK (resolution_source IN ('wikidata', 'ai_inferred', 'user_provided')),

  -- Timestamps
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique per user + entity name + type
  UNIQUE(user_id, entity_name, entity_type)
);

-- Indexes for fast lookup
CREATE INDEX idx_entity_cache_user ON entity_resolution_cache(user_id);
CREATE INDEX idx_entity_cache_name ON entity_resolution_cache(entity_name);
CREATE INDEX idx_entity_cache_wikidata ON entity_resolution_cache(wikidata_id) WHERE wikidata_id IS NOT NULL;
CREATE INDEX idx_entity_cache_type ON entity_resolution_cache(entity_type);

-- RLS Policies
ALTER TABLE entity_resolution_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entity cache"
  ON entity_resolution_cache
  FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================================
-- SCHEMA GENERATION FIELDS ON CONTENT GENERATION JOBS
-- ============================================================================

-- Extend current_pass check constraint to allow Pass 9
ALTER TABLE content_generation_jobs
  DROP CONSTRAINT IF EXISTS content_generation_jobs_current_pass_check;

ALTER TABLE content_generation_jobs
  ADD CONSTRAINT content_generation_jobs_current_pass_check
  CHECK (current_pass >= 1 AND current_pass <= 9);

-- Add Pass 9 status to passes_status default
-- Note: Existing rows will need migration, but new rows will have pass_9
ALTER TABLE content_generation_jobs
  ALTER COLUMN passes_status SET DEFAULT '{
    "pass_1_draft": "pending",
    "pass_2_headers": "pending",
    "pass_3_lists": "pending",
    "pass_4_visuals": "pending",
    "pass_5_microsemantics": "pending",
    "pass_6_discourse": "pending",
    "pass_7_intro": "pending",
    "pass_8_audit": "pending",
    "pass_9_schema": "pending"
  }'::jsonb;

-- Add schema-specific columns
ALTER TABLE content_generation_jobs
  ADD COLUMN IF NOT EXISTS schema_data JSONB DEFAULT NULL;

ALTER TABLE content_generation_jobs
  ADD COLUMN IF NOT EXISTS schema_validation_results JSONB DEFAULT NULL;

ALTER TABLE content_generation_jobs
  ADD COLUMN IF NOT EXISTS schema_entities JSONB DEFAULT NULL;

ALTER TABLE content_generation_jobs
  ADD COLUMN IF NOT EXISTS schema_page_type TEXT DEFAULT NULL;

ALTER TABLE content_generation_jobs
  ADD COLUMN IF NOT EXISTS progressive_schema_data JSONB DEFAULT NULL;

-- Index for schema queries
CREATE INDEX IF NOT EXISTS idx_jobs_schema_page_type
  ON content_generation_jobs(schema_page_type)
  WHERE schema_page_type IS NOT NULL;


-- ============================================================================
-- EXTEND CONTENT VERSIONS FOR PASS 9
-- ============================================================================

-- Update check constraint to allow Pass 9
ALTER TABLE content_versions
  DROP CONSTRAINT IF EXISTS content_versions_pass_number_check;

ALTER TABLE content_versions
  ADD CONSTRAINT content_versions_pass_number_check
  CHECK (pass_number >= 1 AND pass_number <= 9);


-- ============================================================================
-- EXTEND CONTENT GENERATION SECTIONS FOR PASS 9
-- ============================================================================

ALTER TABLE content_generation_sections
  ADD COLUMN IF NOT EXISTS pass_9_content TEXT DEFAULT NULL;


-- ============================================================================
-- PASS CONFIG UPDATE FOR SETTINGS
-- ============================================================================

-- Update the default pass_config to include pass 9
ALTER TABLE content_generation_settings
  ALTER COLUMN pass_config SET DEFAULT '{
    "checkpoint_after_pass_1": false,
    "passes": {
      "pass_2_headers": {"enabled": true, "store_version": true},
      "pass_3_lists": {"enabled": true, "store_version": true},
      "pass_4_visuals": {"enabled": true, "store_version": true},
      "pass_5_micro": {"enabled": true, "store_version": true},
      "pass_6_discourse": {"enabled": true, "store_version": true},
      "pass_7_intro": {"enabled": true, "store_version": true},
      "pass_8_audit": {"enabled": true, "store_version": false},
      "pass_9_schema": {"enabled": true, "store_version": true, "auto_fix": true, "external_validation": false}
    }
  }'::jsonb;


-- ============================================================================
-- ORGANIZATION AND AUTHOR SCHEMA STORAGE (Site-Wide)
-- ============================================================================

-- Store site-wide Organization schema (define once, reference via @id)
CREATE TABLE IF NOT EXISTS site_schema_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('Organization', 'Person', 'WebSite')),
  entity_id TEXT NOT NULL, -- The @id value for references (e.g., "#organization", "#author-john-doe")

  -- The full schema data
  schema_data JSONB NOT NULL,

  -- Metadata
  is_primary BOOLEAN DEFAULT false, -- Primary org/author for the site

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(map_id, entity_type, entity_id)
);

-- Indexes
CREATE INDEX idx_site_schema_entities_map ON site_schema_entities(map_id);
CREATE INDEX idx_site_schema_entities_type ON site_schema_entities(entity_type);

-- RLS
ALTER TABLE site_schema_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage site schema entities for their maps"
  ON site_schema_entities
  FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for entity_resolution_cache
DROP TRIGGER IF EXISTS update_entity_resolution_cache_updated_at ON entity_resolution_cache;
CREATE TRIGGER update_entity_resolution_cache_updated_at
  BEFORE UPDATE ON entity_resolution_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for site_schema_entities
DROP TRIGGER IF EXISTS update_site_schema_entities_updated_at ON site_schema_entities;
CREATE TRIGGER update_site_schema_entities_updated_at
  BEFORE UPDATE ON site_schema_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- MIGRATE EXISTING JOBS TO INCLUDE PASS 9
-- ============================================================================

-- Update existing jobs that don't have pass_9_schema in their passes_status
UPDATE content_generation_jobs
SET passes_status = passes_status || '{"pass_9_schema": "pending"}'::jsonb
WHERE NOT (passes_status ? 'pass_9_schema');


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE entity_resolution_cache IS 'Cache for resolved external entities (Wikidata, Wikipedia) used in schema generation';
COMMENT ON TABLE site_schema_entities IS 'Site-wide schema entities (Organization, Author) that are referenced via @id across all pages';
COMMENT ON COLUMN content_generation_jobs.schema_data IS 'Generated JSON-LD schema with @graph structure';
COMMENT ON COLUMN content_generation_jobs.schema_validation_results IS 'Validation results including syntax, Schema.org, content parity, and EAV consistency checks';
COMMENT ON COLUMN content_generation_jobs.schema_entities IS 'Resolved entity references used in the schema';
COMMENT ON COLUMN content_generation_jobs.schema_page_type IS 'Detected or specified page type for schema generation (Article, Product, FAQPage, etc.)';
COMMENT ON COLUMN content_generation_jobs.progressive_schema_data IS 'Schema-relevant data collected progressively during passes 1-8';
