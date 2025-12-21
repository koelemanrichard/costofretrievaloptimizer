-- Migration: insight_actions
-- Created: 2025-12-16
-- Description: Table for tracking AI-enhanced actions taken from the Insights Hub

-- Create insight_actions table
CREATE TABLE IF NOT EXISTS insight_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'add_eav', 'create_brief', 'add_faq', 'merge_topics', 'differentiate_topics'
  source_type TEXT, -- 'query_network', 'eat_scanner', 'corpus_audit', 'metrics'
  source_id UUID, -- Reference to source audit
  target_type TEXT, -- 'topic', 'eav', 'brief'
  target_id UUID,
  payload JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_insight_actions_map_id ON insight_actions(map_id);
CREATE INDEX IF NOT EXISTS idx_insight_actions_user_id ON insight_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_actions_status ON insight_actions(status);
CREATE INDEX IF NOT EXISTS idx_insight_actions_action_type ON insight_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_insight_actions_created_at ON insight_actions(created_at DESC);

-- Enable RLS
ALTER TABLE insight_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own insight actions"
  ON insight_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insight actions"
  ON insight_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insight actions"
  ON insight_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insight actions"
  ON insight_actions FOR DELETE
  USING (auth.uid() = user_id);

-- Create view for aggregated map insights summary
CREATE OR REPLACE VIEW map_insights_summary AS
SELECT
  m.id as map_id,
  m.name as map_name,
  m.project_id,
  -- Topic counts
  COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'core') as core_topics,
  COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'outer') as outer_topics,
  COUNT(DISTINCT t.id) as total_topics,
  -- EAV metrics
  COALESCE(jsonb_array_length(m.eavs), 0) as total_eavs,
  -- Brief counts
  COUNT(DISTINCT cb.id) as total_briefs,
  -- Latest audit scores (using lateral joins for performance)
  (SELECT overall_eat_score FROM eat_scanner_audits WHERE map_id = m.id ORDER BY created_at DESC LIMIT 1) as latest_eat_score,
  (SELECT semantic_coverage_percentage FROM corpus_audits WHERE map_id = m.id ORDER BY created_at DESC LIMIT 1) as latest_coverage,
  (SELECT total_content_gaps FROM query_network_audits WHERE map_id = m.id ORDER BY created_at DESC LIMIT 1) as content_gaps,
  -- Publication progress
  COUNT(DISTINCT t.id) FILTER (WHERE (t.metadata->>'publication_status') = 'published') as published_count,
  -- Pending actions
  (SELECT COUNT(*) FROM insight_actions WHERE map_id = m.id AND status = 'pending') as pending_actions,
  -- Last updated
  m.updated_at as map_updated_at
FROM topical_maps m
LEFT JOIN topics t ON t.map_id = m.id
LEFT JOIN content_briefs cb ON cb.map_id = m.id
GROUP BY m.id, m.name, m.project_id, m.eavs, m.updated_at;

-- Grant access to the view
GRANT SELECT ON map_insights_summary TO authenticated;

-- Comment on the table
COMMENT ON TABLE insight_actions IS 'Tracks AI-enhanced actions taken from the SEO Insights Hub';
COMMENT ON VIEW map_insights_summary IS 'Aggregated summary of insights for each topical map';
