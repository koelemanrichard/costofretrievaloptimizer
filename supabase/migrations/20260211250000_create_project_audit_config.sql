-- Project Audit Configuration
-- Stores per-project audit weight customization and website type selection

CREATE TABLE IF NOT EXISTS project_audit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  weights JSONB NOT NULL DEFAULT '{}',
  website_type TEXT NOT NULL DEFAULT 'other' CHECK (website_type IN ('ecommerce', 'saas', 'b2b', 'blog', 'local-business', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE project_audit_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own project's audit config
CREATE POLICY "Users can read own project audit config"
  ON project_audit_config FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert audit config for their own projects
CREATE POLICY "Users can insert own project audit config"
  ON project_audit_config FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update their own project's audit config
CREATE POLICY "Users can update own project audit config"
  ON project_audit_config FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own project's audit config
CREATE POLICY "Users can delete own project audit config"
  ON project_audit_config FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Index for fast project lookups
CREATE INDEX idx_project_audit_config_project
  ON project_audit_config(project_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_project_audit_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_audit_config_updated_at
  BEFORE UPDATE ON project_audit_config
  FOR EACH ROW EXECUTE FUNCTION update_project_audit_config_updated_at();
