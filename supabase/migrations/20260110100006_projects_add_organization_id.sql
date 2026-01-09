-- supabase/migrations/20260110100006_projects_add_organization_id.sql
-- Add organization_id column to projects table
-- Supports hybrid access: both user_id (legacy) and organization_id (new) patterns

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS api_key_mode TEXT DEFAULT 'inherit'
    CHECK (api_key_mode IN ('inherit', 'project_specific', 'prompt_user'));

-- Add FK with ON DELETE SET NULL (projects preserved if org deleted)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_organization_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

-- Update RLS policies to support both patterns during transition
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can view accessible projects"
  ON projects FOR SELECT
  TO authenticated
  USING (has_project_access(id) OR user_id = auth.uid());

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND get_org_role(organization_id) IN ('owner', 'admin', 'editor'))
    OR user_id = auth.uid()
  );

CREATE POLICY "Editors can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (get_project_role(id) IN ('owner', 'admin', 'editor') OR user_id = auth.uid())
  WITH CHECK (
    -- Prevent reassigning to unauthorized org
    (organization_id IS NULL OR get_org_role(organization_id) IN ('owner', 'admin', 'editor'))
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (get_project_role(id) IN ('owner', 'admin') OR user_id = auth.uid());
