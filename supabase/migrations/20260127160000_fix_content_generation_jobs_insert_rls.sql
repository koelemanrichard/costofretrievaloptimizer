-- supabase/migrations/20260127160000_fix_content_generation_jobs_insert_rls.sql
-- Fix RLS policy for content_generation_jobs INSERT operations
-- The FOR ALL policy needs WITH CHECK for INSERT, not just USING

-- Drop the problematic "manage" policy that doesn't work for INSERT
DROP POLICY IF EXISTS "Users can manage accessible jobs" ON content_generation_jobs;

-- Keep the SELECT policy as is (it was working)
-- Now create separate policies for INSERT, UPDATE, DELETE with proper clauses

-- INSERT needs WITH CHECK (validates new rows)
CREATE POLICY "Users can insert accessible jobs"
  ON content_generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must have access to the brief's project
    EXISTS (
      SELECT 1 FROM content_briefs cb
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cb.id = brief_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
    -- And user_id must match the authenticated user
    AND user_id = auth.uid()
  );

-- UPDATE needs USING (checks existing row access)
CREATE POLICY "Users can update accessible jobs"
  ON content_generation_jobs FOR UPDATE
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

-- DELETE needs USING (checks existing row access)
CREATE POLICY "Users can delete accessible jobs"
  ON content_generation_jobs FOR DELETE
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
