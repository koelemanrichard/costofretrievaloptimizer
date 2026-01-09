-- supabase/migrations/20260110000003_ai_pricing_rates.sql
-- AI provider pricing rates for accurate cost calculation

CREATE TABLE IF NOT EXISTS ai_pricing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_rate_per_1k DECIMAL(10,8) NOT NULL,
  output_rate_per_1k DECIMAL(10,8) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model, effective_from)
);

CREATE INDEX idx_pricing_lookup ON ai_pricing_rates(provider, model, effective_from DESC);

ALTER TABLE ai_pricing_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing rates"
  ON ai_pricing_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION calculate_ai_cost(
  p_provider TEXT,
  p_model TEXT,
  p_input_tokens INT,
  p_output_tokens INT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS DECIMAL(10,6) AS $$
DECLARE
  v_input_rate DECIMAL(10,8);
  v_output_rate DECIMAL(10,8);
BEGIN
  SELECT input_rate_per_1k, output_rate_per_1k
  INTO v_input_rate, v_output_rate
  FROM ai_pricing_rates
  WHERE provider = p_provider
    AND model = p_model
    AND effective_from <= p_timestamp::DATE
    AND (effective_to IS NULL OR effective_to >= p_timestamp::DATE)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_input_rate IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (p_input_tokens / 1000.0 * v_input_rate) +
         (p_output_tokens / 1000.0 * v_output_rate);
END;
$$ LANGUAGE plpgsql STABLE;

-- Seed current pricing
INSERT INTO ai_pricing_rates (provider, model, input_rate_per_1k, output_rate_per_1k, effective_from, notes) VALUES
  ('anthropic', 'claude-3-opus-20240229', 0.015, 0.075, '2024-02-29', 'Claude 3 Opus'),
  ('anthropic', 'claude-3-sonnet-20240229', 0.003, 0.015, '2024-02-29', 'Claude 3 Sonnet'),
  ('anthropic', 'claude-3-haiku-20240307', 0.00025, 0.00125, '2024-03-07', 'Claude 3 Haiku'),
  ('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015, '2024-10-22', 'Claude 3.5 Sonnet'),
  ('anthropic', 'claude-3-5-haiku-20241022', 0.001, 0.005, '2024-10-22', 'Claude 3.5 Haiku'),
  ('openai', 'gpt-4-turbo', 0.01, 0.03, '2024-04-01', 'GPT-4 Turbo'),
  ('openai', 'gpt-4o', 0.005, 0.015, '2024-05-13', 'GPT-4o'),
  ('openai', 'gpt-4o-mini', 0.00015, 0.0006, '2024-07-18', 'GPT-4o Mini'),
  ('google', 'gemini-1.5-pro', 0.00125, 0.005, '2024-05-01', 'Gemini 1.5 Pro'),
  ('google', 'gemini-1.5-flash', 0.000075, 0.0003, '2024-05-01', 'Gemini 1.5 Flash'),
  ('perplexity', 'llama-3.1-sonar-small-128k-online', 0.0002, 0.0002, '2024-07-01', 'Sonar Small'),
  ('perplexity', 'llama-3.1-sonar-large-128k-online', 0.001, 0.001, '2024-07-01', 'Sonar Large');
