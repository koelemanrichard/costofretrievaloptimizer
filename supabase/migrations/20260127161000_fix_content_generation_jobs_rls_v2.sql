-- supabase/migrations/20260127161000_fix_content_generation_jobs_rls_v2.sql
-- Complete fix for content_generation_jobs RLS policies
-- Drop ALL policies and recreate cleanly

-- First, drop ALL existing policies on this table
DROP POLICY IF EXISTS "Users can view own jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can create own jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can view accessible jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can manage accessible jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can insert accessible jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can update accessible jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can delete accessible jobs" ON content_generation_jobs;

-- Create simple, permissive policies
-- The application already validates access - these policies just ensure users can only touch their own data

-- SELECT: Users can view jobs they created OR jobs in projects they have access to
CREATE POLICY "content_generation_jobs_select"
  ON content_generation_jobs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
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

-- INSERT: Users can create jobs where they are the user_id
-- Simple check - just validate user_id matches authenticated user
CREATE POLICY "content_generation_jobs_insert"
  ON content_generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own jobs
CREATE POLICY "content_generation_jobs_update"
  ON content_generation_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: Users can delete their own jobs
CREATE POLICY "content_generation_jobs_delete"
  ON content_generation_jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
