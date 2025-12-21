-- AI Usage Logs Table
-- Tracks all AI API calls for reporting and cost analysis

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  map_id UUID REFERENCES topical_maps(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  brief_id UUID REFERENCES content_briefs(id) ON DELETE SET NULL,
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE SET NULL,

  -- Provider & Model
  provider TEXT NOT NULL, -- 'anthropic', 'gemini', 'openai', 'perplexity', 'openrouter'
  model TEXT NOT NULL,    -- 'claude-3-5-sonnet', 'gemini-2.0-flash', etc.

  -- Operation Context
  operation TEXT NOT NULL, -- 'map_generation', 'brief_generation', 'content_pass_1', etc.
  operation_detail TEXT,   -- Additional context like pass name, section index

  -- Token Usage
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,

  -- Cost (estimated in USD)
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- Timing
  duration_ms INTEGER,

  -- Request/Response size (for debugging)
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,

  -- Status
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  error_code TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_project ON ai_usage_logs(project_id);
CREATE INDEX idx_ai_usage_map ON ai_usage_logs(map_id);
CREATE INDEX idx_ai_usage_provider ON ai_usage_logs(provider);
CREATE INDEX idx_ai_usage_model ON ai_usage_logs(model);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_operation ON ai_usage_logs(operation);
CREATE INDEX idx_ai_usage_success ON ai_usage_logs(success);

-- Composite indexes for common report queries
CREATE INDEX idx_ai_usage_user_created ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_map_created ON ai_usage_logs(map_id, created_at DESC);
CREATE INDEX idx_ai_usage_provider_model ON ai_usage_logs(provider, model);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage logs
CREATE POLICY "Users can insert own usage logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all usage logs
CREATE POLICY "Admin can view all usage logs"
  ON ai_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Create view for aggregated usage stats
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT
  user_id,
  project_id,
  map_id,
  provider,
  model,
  operation,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as call_count,
  SUM(tokens_in) as total_tokens_in,
  SUM(tokens_out) as total_tokens_out,
  SUM(cost_usd) as total_cost_usd,
  AVG(duration_ms)::INTEGER as avg_duration_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as error_count
FROM ai_usage_logs
GROUP BY user_id, project_id, map_id, provider, model, operation, DATE_TRUNC('day', created_at);

-- Function to get usage stats for a user
CREATE OR REPLACE FUNCTION get_user_usage_stats(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  provider TEXT,
  model TEXT,
  call_count BIGINT,
  total_tokens_in BIGINT,
  total_tokens_out BIGINT,
  total_cost_usd DECIMAL,
  avg_duration_ms INTEGER,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.provider,
    l.model,
    COUNT(*)::BIGINT as call_count,
    SUM(l.tokens_in)::BIGINT as total_tokens_in,
    SUM(l.tokens_out)::BIGINT as total_tokens_out,
    SUM(l.cost_usd) as total_cost_usd,
    AVG(l.duration_ms)::INTEGER as avg_duration_ms,
    (SUM(CASE WHEN l.success THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100)::DECIMAL(5,2) as success_rate
  FROM ai_usage_logs l
  WHERE l.user_id = p_user_id
    AND l.created_at >= p_start_date
    AND l.created_at <= p_end_date
  GROUP BY l.provider, l.model
  ORDER BY total_cost_usd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get usage stats for a map
CREATE OR REPLACE FUNCTION get_map_usage_stats(
  p_map_id UUID
)
RETURNS TABLE (
  provider TEXT,
  model TEXT,
  operation TEXT,
  call_count BIGINT,
  total_tokens_in BIGINT,
  total_tokens_out BIGINT,
  total_cost_usd DECIMAL,
  avg_duration_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.provider,
    l.model,
    l.operation,
    COUNT(*)::BIGINT as call_count,
    SUM(l.tokens_in)::BIGINT as total_tokens_in,
    SUM(l.tokens_out)::BIGINT as total_tokens_out,
    SUM(l.cost_usd) as total_cost_usd,
    AVG(l.duration_ms)::INTEGER as avg_duration_ms
  FROM ai_usage_logs l
  WHERE l.map_id = p_map_id
  GROUP BY l.provider, l.model, l.operation
  ORDER BY total_cost_usd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API calls for usage reporting and cost analysis';
