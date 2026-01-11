-- Migration: Add pass tracking columns for structural and quality monitoring
-- Description: Adds columns to track structural snapshots, quality scores per pass,
--              and quality warnings for the multi-pass content generation system.
-- Created: 2026-01-11
-- Phase: Multi-pass Compounding Improvements Fix

-- ============================================================================
-- Add pass tracking columns to content_generation_jobs
-- ============================================================================

-- structural_snapshots: Stores element counts (images, lists, tables, words) per pass
-- Format: { "pass_1": { "passNumber": 1, "elements": { "images": 0, "lists": 2, ... } }, ... }
ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS structural_snapshots JSONB DEFAULT '{}';

-- pass_quality_scores: Stores quality audit score per pass
-- Format: { "pass_1": 85, "pass_2": 88, "pass_3": 90, ... }
ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS pass_quality_scores JSONB DEFAULT '{}';

-- quality_warning: Text warning if a pass caused significant quality regression
-- Set by quality gating when score drops by 15+ points
ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS quality_warning TEXT;

-- ============================================================================
-- Add index for jobs with quality warnings (for admin monitoring)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_content_generation_jobs_quality_warning
ON content_generation_jobs (quality_warning)
WHERE quality_warning IS NOT NULL;

-- ============================================================================
-- Add comment documentation
-- ============================================================================

COMMENT ON COLUMN content_generation_jobs.structural_snapshots IS
'JSONB storing structural element counts (images, lists, tables, headings, words) captured after each pass. Used for tracking compounding improvements and detecting regressions.';

COMMENT ON COLUMN content_generation_jobs.pass_quality_scores IS
'JSONB storing the quality audit score (0-100) after each pass. Used for quality gating to detect and warn about quality regressions between passes.';

COMMENT ON COLUMN content_generation_jobs.quality_warning IS
'Text warning message set when a pass causes significant quality regression (score drops 15+ points). Used for admin monitoring and debugging.';

-- ============================================================================
-- Helper function to get quality trend for a job
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quality_trend(p_job_id UUID)
RETURNS TABLE (
  pass_number INT,
  score INT,
  delta INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scores JSONB;
  v_pass TEXT;
  v_score INT;
  v_prev_score INT := NULL;
BEGIN
  SELECT pass_quality_scores INTO v_scores
  FROM content_generation_jobs
  WHERE id = p_job_id;

  IF v_scores IS NULL THEN
    RETURN;
  END IF;

  FOR v_pass IN SELECT jsonb_object_keys(v_scores) ORDER BY 1
  LOOP
    v_score := (v_scores->>v_pass)::INT;

    RETURN QUERY SELECT
      SUBSTRING(v_pass FROM 'pass_(\d+)')::INT AS pass_number,
      v_score AS score,
      CASE WHEN v_prev_score IS NOT NULL THEN v_score - v_prev_score ELSE 0 END AS delta;

    v_prev_score := v_score;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION get_quality_trend(UUID) IS
'Returns the quality score trend for a content generation job, showing the score and delta for each pass.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_quality_trend(UUID) TO authenticated;
