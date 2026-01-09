-- supabase/migrations/20260110400000_wordpress_multi_tenancy.sql
-- WordPress integration multi-tenancy updates (Phase 4)

-- Add organization_id to wordpress_publications
ALTER TABLE wordpress_publications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_wp_publications_org ON wordpress_publications(organization_id);

-- Backfill organization_id from content_briefs → topics → topical_maps → projects
UPDATE wordpress_publications wp
SET organization_id = p.organization_id
FROM content_briefs cb
JOIN topics t ON t.id = cb.topic_id
JOIN topical_maps tm ON tm.id = t.map_id
JOIN projects p ON p.id = tm.project_id
WHERE wp.content_brief_id = cb.id
  AND wp.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- Update RLS policies for wordpress_publications
DROP POLICY IF EXISTS "Users can view own publications" ON wordpress_publications;
DROP POLICY IF EXISTS "Users can insert own publications" ON wordpress_publications;
DROP POLICY IF EXISTS "Users can update own publications" ON wordpress_publications;

CREATE POLICY "Users can view publications via org or project"
  ON wordpress_publications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM content_briefs cb
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cb.id = wordpress_publications.content_brief_id
        AND has_project_access(p.id)
    )
  );

CREATE POLICY "Editors can manage publications"
  ON wordpress_publications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_briefs cb
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cb.id = wordpress_publications.content_brief_id
        AND get_project_role(p.id) IN ('owner', 'admin', 'editor')
    )
  );

-- Add organization_id to wordpress_connections if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wordpress_connections' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE wordpress_connections
      ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- Backfill wordpress_connections organization_id from project
UPDATE wordpress_connections wc
SET organization_id = p.organization_id
FROM projects p
WHERE wc.project_id = p.id
  AND wc.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- Update RLS for wordpress_connections
DROP POLICY IF EXISTS "Users can view own connections" ON wordpress_connections;
DROP POLICY IF EXISTS "Users can manage own connections" ON wordpress_connections;

CREATE POLICY "Org members can view wp connections"
  ON wordpress_connections FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Admins can manage wp connections"
  ON wordpress_connections FOR ALL
  TO authenticated
  USING (
    get_org_role(organization_id) IN ('owner', 'admin')
  );
