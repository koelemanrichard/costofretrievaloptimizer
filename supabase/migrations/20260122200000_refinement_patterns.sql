-- Refinement Patterns Table
-- Stores user refinement patterns to improve AI suggestions over time

CREATE TABLE IF NOT EXISTS refinement_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  topical_map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('component_swap', 'emphasis_change', 'style_preference', 'component_avoid')),
  source_value TEXT NOT NULL,
  target_value TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  context JSONB DEFAULT '{}',
  last_used TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_refinement_patterns_project ON refinement_patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_refinement_patterns_map ON refinement_patterns(topical_map_id);
CREATE INDEX IF NOT EXISTS idx_refinement_patterns_type ON refinement_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_refinement_patterns_source ON refinement_patterns(source_value);
CREATE INDEX IF NOT EXISTS idx_refinement_patterns_frequency ON refinement_patterns(frequency DESC);

-- Unique constraint to prevent duplicate patterns
CREATE UNIQUE INDEX IF NOT EXISTS idx_refinement_patterns_unique
ON refinement_patterns(project_id, pattern_type, source_value, target_value)
WHERE topical_map_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refinement_patterns_unique_with_map
ON refinement_patterns(project_id, topical_map_id, pattern_type, source_value, target_value)
WHERE topical_map_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_refinement_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refinement_patterns_updated_at ON refinement_patterns;
CREATE TRIGGER refinement_patterns_updated_at
  BEFORE UPDATE ON refinement_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_refinement_patterns_updated_at();

-- RLS Policies
ALTER TABLE refinement_patterns ENABLE ROW LEVEL SECURITY;

-- Users can view patterns for projects they have access to
CREATE POLICY refinement_patterns_select ON refinement_patterns
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

-- Users can insert patterns for projects they own or are members of
CREATE POLICY refinement_patterns_insert ON refinement_patterns
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Users can update patterns for projects they own or are members of
CREATE POLICY refinement_patterns_update ON refinement_patterns
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Users can delete patterns for projects they own or are admins of
CREATE POLICY refinement_patterns_delete ON refinement_patterns
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- Competitor Design Analysis Table
-- Stores analyzed competitor design patterns

CREATE TABLE IF NOT EXISTS competitor_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  competitor_name TEXT,
  analysis_date TIMESTAMPTZ DEFAULT now(),
  design_patterns JSONB DEFAULT '{}',
  -- {
  --   visualStyle: 'editorial' | 'marketing' | etc,
  --   colorScheme: { primary, secondary, accent },
  --   typography: { headingFont, bodyFont },
  --   layoutPatterns: string[],
  --   componentUsage: { component: count },
  --   ctaStyle: { intensity, placement },
  --   strengths: string[],
  --   weaknesses: string[]
  -- }
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_designs_project ON competitor_designs(project_id);
CREATE INDEX IF NOT EXISTS idx_competitor_designs_url ON competitor_designs(competitor_url);

-- Unique constraint per project/url
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitor_designs_unique
ON competitor_designs(project_id, competitor_url);

-- Updated_at trigger
DROP TRIGGER IF EXISTS competitor_designs_updated_at ON competitor_designs;
CREATE TRIGGER competitor_designs_updated_at
  BEFORE UPDATE ON competitor_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_refinement_patterns_updated_at();

-- RLS Policies
ALTER TABLE competitor_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY competitor_designs_select ON competitor_designs
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY competitor_designs_insert ON competitor_designs
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY competitor_designs_update ON competitor_designs
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY competitor_designs_delete ON competitor_designs
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      UNION
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );
