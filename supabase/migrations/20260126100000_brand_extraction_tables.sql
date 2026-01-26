-- Brand Extractions (cached page captures)
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

-- Extracted Components (literal HTML/CSS from site)
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

-- Extracted Design Tokens (actual values, not abstracted)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_extractions_project ON brand_extractions(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_components_project ON brand_components(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_components_extraction ON brand_components(extraction_id);

-- Row Level Security
ALTER TABLE brand_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own brand_extractions"
  ON brand_extractions FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own brand_components"
  ON brand_components FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own brand_tokens"
  ON brand_tokens FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
