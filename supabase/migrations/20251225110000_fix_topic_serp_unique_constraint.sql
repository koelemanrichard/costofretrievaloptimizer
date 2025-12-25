-- Migration: Fix Topic SERP Analysis Unique Constraint
-- Created: December 25, 2024
-- Purpose: Add unique constraint for upsert to work properly

-- =============================================================================
-- Add Unique Constraint
-- =============================================================================
-- The upsert operation requires a unique constraint on (topic_id, user_id)
-- to handle "ON CONFLICT" properly

-- First, remove duplicates if any exist (keep the most recent)
DELETE FROM topic_serp_analysis a
USING topic_serp_analysis b
WHERE a.topic_id = b.topic_id
  AND a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Add the unique constraint
ALTER TABLE topic_serp_analysis
  ADD CONSTRAINT topic_serp_analysis_topic_user_unique
  UNIQUE (topic_id, user_id);

-- Also add a unique constraint for topic_title + user_id lookups (fallback when topic_id is null)
-- First remove duplicates
DELETE FROM topic_serp_analysis a
USING topic_serp_analysis b
WHERE a.topic_title = b.topic_title
  AND a.user_id = b.user_id
  AND a.topic_id IS NULL
  AND b.topic_id IS NULL
  AND a.created_at < b.created_at;

-- Add partial unique constraint for title-based lookups when topic_id is null
CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_serp_title_user_unique
  ON topic_serp_analysis(topic_title, user_id)
  WHERE topic_id IS NULL;
