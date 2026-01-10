-- supabase/migrations/20260110170000_fix_org_rls_policies.sql
-- Fix RLS policies to support organization-based access for all tables
-- This is a comprehensive fix for multi-tenancy support

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user has access to a topical map (via project access)
CREATE OR REPLACE FUNCTION has_map_access(map_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM topical_maps tm
    JOIN projects p ON p.id = tm.project_id
    WHERE tm.id = map_id
      AND (
        has_project_access(p.id)
        OR tm.user_id = auth.uid()
        OR p.user_id = auth.uid()
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has access to a topic (via map access)
CREATE OR REPLACE FUNCTION has_topic_access(topic_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM topics t
    JOIN topical_maps tm ON tm.id = t.map_id
    JOIN projects p ON p.id = tm.project_id
    WHERE t.id = topic_id
      AND (
        has_project_access(p.id)
        OR tm.user_id = auth.uid()
        OR p.user_id = auth.uid()
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_map_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_topic_access(UUID) TO authenticated;

-- ============================================================================
-- TOPICAL_MAPS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own maps" ON topical_maps;
DROP POLICY IF EXISTS "Users can insert own maps" ON topical_maps;
DROP POLICY IF EXISTS "Users can update own maps" ON topical_maps;
DROP POLICY IF EXISTS "Users can delete own maps" ON topical_maps;
DROP POLICY IF EXISTS "Super admins can view all topical_maps" ON topical_maps;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible maps"
  ON topical_maps FOR SELECT
  TO authenticated
  USING (
    has_project_access(project_id)
    OR user_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert maps in accessible projects"
  ON topical_maps FOR INSERT
  TO authenticated
  WITH CHECK (
    has_project_access(project_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update accessible maps"
  ON topical_maps FOR UPDATE
  TO authenticated
  USING (
    has_project_access(project_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can delete accessible maps"
  ON topical_maps FOR DELETE
  TO authenticated
  USING (
    get_project_role(project_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- ============================================================================
-- TOPICS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own topics" ON topics;
DROP POLICY IF EXISTS "Users can insert own topics" ON topics;
DROP POLICY IF EXISTS "Users can update own topics" ON topics;
DROP POLICY IF EXISTS "Users can delete own topics" ON topics;
DROP POLICY IF EXISTS "Super admins can view all topics" ON topics;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible topics"
  ON topics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = topics.map_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
  );

CREATE POLICY "Users can insert accessible topics"
  ON topics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = topics.map_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can update accessible topics"
  ON topics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = topics.map_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can delete accessible topics"
  ON topics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = topics.map_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- CONTENT_BRIEFS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own briefs" ON content_briefs;
DROP POLICY IF EXISTS "Users can insert own briefs" ON content_briefs;
DROP POLICY IF EXISTS "Users can update own briefs" ON content_briefs;
DROP POLICY IF EXISTS "Users can delete own briefs" ON content_briefs;
DROP POLICY IF EXISTS "Super admins can view all content_briefs" ON content_briefs;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible briefs"
  ON content_briefs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = content_briefs.topic_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
  );

CREATE POLICY "Users can insert accessible briefs"
  ON content_briefs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = content_briefs.topic_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can update accessible briefs"
  ON content_briefs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = content_briefs.topic_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can delete accessible briefs"
  ON content_briefs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = content_briefs.topic_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- CONTENT_GENERATION_JOBS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON content_generation_jobs;

CREATE POLICY "Users can view accessible jobs"
  ON content_generation_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_briefs cb
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cb.id = content_generation_jobs.brief_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can manage accessible jobs"
  ON content_generation_jobs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_briefs cb
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cb.id = content_generation_jobs.brief_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- CONTENT_GENERATION_SECTIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own sections" ON content_generation_sections;
DROP POLICY IF EXISTS "Users can manage own sections" ON content_generation_sections;

CREATE POLICY "Users can view accessible sections"
  ON content_generation_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      JOIN content_briefs cb ON cb.id = j.brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE j.id = content_generation_sections.job_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can manage accessible sections"
  ON content_generation_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      JOIN content_briefs cb ON cb.id = j.brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE j.id = content_generation_sections.job_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- AI_USAGE_LOGS RLS POLICIES (if not already updated)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own usage logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Users can insert own usage logs" ON ai_usage_logs;

CREATE POLICY "Users can view accessible usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND has_project_access(project_id))
    OR (organization_id IS NOT NULL AND get_org_role(organization_id) IS NOT NULL)
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert usage logs"
  ON ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND has_project_access(project_id))
  );

-- ============================================================================
-- Done! All core tables now support organization-based access
-- ============================================================================
