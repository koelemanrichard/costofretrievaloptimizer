-- Migration: Topic SERP Analysis
-- Created: December 25, 2024
-- Purpose: Store topic-level competitive intelligence analysis results

-- =============================================================================
-- Table: topic_serp_analysis
-- =============================================================================
-- Stores complete SERP competitive intelligence for topics
-- Includes competitor analysis, gaps, patterns, and priority actions

CREATE TABLE IF NOT EXISTS topic_serp_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Analysis metadata
  topic_title TEXT NOT NULL,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('fast', 'deep')),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_time_ms INTEGER,

  -- SERP snapshot
  serp_data JSONB DEFAULT '{}'::jsonb,
  -- Structure: { totalResults, features[], topCompetitors[] }

  -- Competitor analyses (array of CompetitorAnalysis)
  competitors JSONB DEFAULT '[]'::jsonb,

  -- Aggregated patterns
  patterns JSONB DEFAULT '{}'::jsonb,
  -- Structure: { dominantContentType, avgWordCount, commonSchemaTypes[], topAttributes[] }

  -- Gap analysis
  gaps JSONB DEFAULT '{}'::jsonb,
  -- Structure: { attributes: {}, technical: {}, links: {}, priorityActions[] }

  -- Opportunity scores
  scores JSONB DEFAULT '{}'::jsonb,
  -- Structure: { contentOpportunity, technicalOpportunity, linkOpportunity, overallDifficulty }

  -- Cache management
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Find analysis by topic
CREATE INDEX IF NOT EXISTS idx_topic_serp_topic_id
  ON topic_serp_analysis(topic_id);

-- Find analysis by user
CREATE INDEX IF NOT EXISTS idx_topic_serp_user_id
  ON topic_serp_analysis(user_id);

-- Find unexpired analyses
CREATE INDEX IF NOT EXISTS idx_topic_serp_expires
  ON topic_serp_analysis(expires_at);

-- Find by topic title (for quick lookups without topic_id)
CREATE INDEX IF NOT EXISTS idx_topic_serp_title
  ON topic_serp_analysis(topic_title);

-- Composite index for user + topic lookups
CREATE INDEX IF NOT EXISTS idx_topic_serp_user_topic
  ON topic_serp_analysis(user_id, topic_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE topic_serp_analysis ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view own topic_serp_analysis"
  ON topic_serp_analysis FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own topic_serp_analysis"
  ON topic_serp_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update own topic_serp_analysis"
  ON topic_serp_analysis FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own topic_serp_analysis"
  ON topic_serp_analysis FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- Trigger: Update updated_at on changes
-- =============================================================================

CREATE OR REPLACE FUNCTION update_topic_serp_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_topic_serp_analysis_updated_at
  BEFORE UPDATE ON topic_serp_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_serp_analysis_updated_at();

-- =============================================================================
-- Function: Get or create fresh analysis
-- =============================================================================

CREATE OR REPLACE FUNCTION get_topic_serp_analysis(
  p_topic_id UUID,
  p_user_id UUID,
  p_max_age_hours INTEGER DEFAULT 168 -- 7 days
)
RETURNS TABLE (
  id UUID,
  topic_title TEXT,
  mode VARCHAR(10),
  analyzed_at TIMESTAMPTZ,
  serp_data JSONB,
  competitors JSONB,
  patterns JSONB,
  gaps JSONB,
  scores JSONB,
  is_fresh BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tsa.id,
    tsa.topic_title,
    tsa.mode,
    tsa.analyzed_at,
    tsa.serp_data,
    tsa.competitors,
    tsa.patterns,
    tsa.gaps,
    tsa.scores,
    (tsa.analyzed_at > NOW() - (p_max_age_hours || ' hours')::INTERVAL) AS is_fresh
  FROM topic_serp_analysis tsa
  WHERE tsa.topic_id = p_topic_id
    AND tsa.user_id = p_user_id
    AND tsa.expires_at > NOW()
  ORDER BY tsa.analyzed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: Cleanup expired analyses
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_topic_serp_analysis()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM topic_serp_analysis
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE topic_serp_analysis IS 'Stores topic-level competitive intelligence analysis results';
COMMENT ON COLUMN topic_serp_analysis.mode IS 'Analysis mode: fast (AI inference) or deep (real SERP data)';
COMMENT ON COLUMN topic_serp_analysis.serp_data IS 'SERP snapshot: totalResults, features, topCompetitors';
COMMENT ON COLUMN topic_serp_analysis.competitors IS 'Array of CompetitorAnalysis with content, technical, link scores';
COMMENT ON COLUMN topic_serp_analysis.patterns IS 'Aggregated patterns: content type, word count, schema types';
COMMENT ON COLUMN topic_serp_analysis.gaps IS 'Gap analysis: attributes, technical, links, priority actions';
COMMENT ON COLUMN topic_serp_analysis.scores IS 'Opportunity scores: content, technical, link, difficulty';
