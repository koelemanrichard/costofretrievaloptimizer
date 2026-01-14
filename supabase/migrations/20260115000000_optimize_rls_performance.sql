-- supabase/migrations/20260115000000_optimize_rls_performance.sql
-- Performance optimization for RLS policies with complex join chains
-- Fixes CORS-like errors caused by query timeouts on large topic maps

-- ============================================================================
-- PART 1: COMPOSITE INDEXES FOR ACCESS CHECK PATTERNS
-- ============================================================================

-- Index for organization_members access pattern
-- Covers: WHERE organization_id = ? AND user_id = auth.uid() AND accepted_at IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_org_members_access_check
ON organization_members(organization_id, user_id)
WHERE accepted_at IS NOT NULL;

-- Index for project_members access pattern
-- Covers: WHERE project_id = ? AND user_id = auth.uid() AND accepted_at IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_project_members_access_check
ON project_members(project_id, user_id)
WHERE accepted_at IS NOT NULL;

-- Index for projects legacy user_id lookup
-- Covers: WHERE id = ? AND user_id = auth.uid()
CREATE INDEX IF NOT EXISTS idx_projects_id_user
ON projects(id, user_id);

-- ============================================================================
-- PART 2: DENORMALIZE project_id TO content_briefs
-- ============================================================================

-- Add project_id for direct access checks (eliminates 2 JOINs from RLS)
ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_content_briefs_project
ON content_briefs(project_id);

-- Backfill existing data
UPDATE content_briefs cb
SET project_id = tm.project_id
FROM topics t
INNER JOIN topical_maps tm ON tm.id = t.map_id
WHERE t.id = cb.topic_id
  AND cb.project_id IS NULL;

-- Create trigger to auto-populate project_id on insert/update
CREATE OR REPLACE FUNCTION sync_content_briefs_project_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Look up project_id from topic -> topical_map chain
  SELECT tm.project_id INTO NEW.project_id
  FROM topics t
  INNER JOIN topical_maps tm ON tm.id = t.map_id
  WHERE t.id = NEW.topic_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_content_briefs_project ON content_briefs;
CREATE TRIGGER trg_sync_content_briefs_project
  BEFORE INSERT OR UPDATE OF topic_id ON content_briefs
  FOR EACH ROW
  EXECUTE FUNCTION sync_content_briefs_project_id();

-- ============================================================================
-- PART 3: OPTIMIZED has_project_access FUNCTION
-- ============================================================================

-- Rewrite has_project_access to use a single UNION ALL query instead of sequential IFs
-- This reduces from 3 separate query executions to 1 combined query
CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Single query with UNION ALL to check all access paths
  -- PostgreSQL will short-circuit on first match due to EXISTS
  RETURN EXISTS (
    -- Path 1: Organization membership
    SELECT 1
    FROM projects p
    INNER JOIN organization_members om
      ON om.organization_id = p.organization_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
    WHERE p.id = proj_id

    UNION ALL

    -- Path 2: Direct project membership
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = proj_id
      AND pm.user_id = auth.uid()
      AND pm.accepted_at IS NOT NULL

    UNION ALL

    -- Path 3: Legacy user_id ownership
    SELECT 1
    FROM projects p
    WHERE p.id = proj_id
      AND p.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

-- ============================================================================
-- PART 4: OPTIMIZED RLS POLICY FOR content_briefs SELECT
-- ============================================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view accessible briefs" ON content_briefs;

-- Create highly optimized SELECT policy using denormalized project_id
CREATE POLICY "Users can view accessible briefs"
  ON content_briefs FOR SELECT
  TO authenticated
  USING (
    -- Fast path 1: Super admin
    public.is_super_admin()
    OR
    -- Fast path 2: Direct user ownership
    content_briefs.user_id = auth.uid()
    OR
    -- Fast path 3: Project access via denormalized project_id (eliminates 2 joins!)
    (
      content_briefs.project_id IS NOT NULL
      AND has_project_access(content_briefs.project_id)
    )
    OR
    -- Fallback for legacy data without project_id
    (
      content_briefs.project_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM topics t
        INNER JOIN topical_maps tm ON tm.id = t.map_id
        WHERE t.id = content_briefs.topic_id
          AND (
            tm.user_id = auth.uid()
            OR has_project_access(tm.project_id)
          )
      )
    )
  );

-- ============================================================================
-- PART 5: UPDATE OTHER content_briefs POLICIES FOR CONSISTENCY
-- ============================================================================

-- Update INSERT policy
DROP POLICY IF EXISTS "Users can insert accessible briefs" ON content_briefs;
CREATE POLICY "Users can insert accessible briefs"
  ON content_briefs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM topics t
      INNER JOIN topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
        AND (
          has_project_access(tm.project_id)
          OR tm.user_id = auth.uid()
        )
    )
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update accessible briefs" ON content_briefs;
CREATE POLICY "Users can update accessible briefs"
  ON content_briefs FOR UPDATE
  TO authenticated
  USING (
    content_briefs.user_id = auth.uid()
    OR (
      content_briefs.project_id IS NOT NULL
      AND has_project_access(content_briefs.project_id)
    )
    OR EXISTS (
      SELECT 1 FROM topics t
      INNER JOIN topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
        AND (
          has_project_access(tm.project_id)
          OR tm.user_id = auth.uid()
        )
    )
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete accessible briefs" ON content_briefs;
CREATE POLICY "Users can delete accessible briefs"
  ON content_briefs FOR DELETE
  TO authenticated
  USING (
    content_briefs.user_id = auth.uid()
    OR (
      content_briefs.project_id IS NOT NULL
      AND get_project_role(content_briefs.project_id) IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM topics t
      INNER JOIN topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
        AND (
          get_project_role(tm.project_id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- PART 6: UPDATE STATISTICS
-- ============================================================================

ANALYZE content_briefs;
ANALYZE topics;
ANALYZE topical_maps;
ANALYZE projects;
ANALYZE organization_members;
ANALYZE project_members;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN content_briefs.project_id IS
'Denormalized project_id for faster RLS checks. Auto-populated via trigger from topic -> topical_map chain.';

COMMENT ON INDEX idx_org_members_access_check IS
'Optimized partial index for RLS access checks on organization_members';

COMMENT ON INDEX idx_project_members_access_check IS
'Optimized partial index for RLS access checks on project_members';

COMMENT ON INDEX idx_content_briefs_project IS
'Index on denormalized project_id for fast RLS lookups';

COMMENT ON FUNCTION has_project_access(UUID) IS
'Optimized project access check using UNION ALL instead of sequential IF statements';
