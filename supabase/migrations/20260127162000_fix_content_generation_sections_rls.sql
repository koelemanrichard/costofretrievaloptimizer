-- supabase/migrations/20260127162000_fix_content_generation_sections_rls.sql
-- Fix RLS policies for content_generation_sections table
-- Same issue as jobs table - FOR ALL policy needs WITH CHECK for INSERT

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own sections" ON content_generation_sections;
DROP POLICY IF EXISTS "Users can insert own sections" ON content_generation_sections;
DROP POLICY IF EXISTS "Users can update own sections" ON content_generation_sections;
DROP POLICY IF EXISTS "Users can delete own sections" ON content_generation_sections;
DROP POLICY IF EXISTS "Users can view accessible sections" ON content_generation_sections;
DROP POLICY IF EXISTS "Users can manage accessible sections" ON content_generation_sections;

-- Create simple policies that check job ownership

-- SELECT: Can view sections for jobs user owns or has project access to
CREATE POLICY "content_generation_sections_select"
  ON content_generation_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = content_generation_sections.job_id
        AND j.user_id = auth.uid()
    )
  );

-- INSERT: Can insert sections for jobs user owns
CREATE POLICY "content_generation_sections_insert"
  ON content_generation_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = job_id
        AND j.user_id = auth.uid()
    )
  );

-- UPDATE: Can update sections for jobs user owns
CREATE POLICY "content_generation_sections_update"
  ON content_generation_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = content_generation_sections.job_id
        AND j.user_id = auth.uid()
    )
  );

-- DELETE: Can delete sections for jobs user owns
CREATE POLICY "content_generation_sections_delete"
  ON content_generation_sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = content_generation_sections.job_id
        AND j.user_id = auth.uid()
    )
  );
