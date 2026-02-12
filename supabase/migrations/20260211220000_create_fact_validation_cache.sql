-- Fact validation cache for audit system
-- Caches claim verification results to avoid redundant API calls (30-day TTL)

CREATE TABLE IF NOT EXISTS fact_validation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_hash TEXT NOT NULL UNIQUE,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL DEFAULT 'general',
  verification_status TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  suggestion TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup by claim hash
CREATE INDEX IF NOT EXISTS idx_fv_cache_hash ON fact_validation_cache(claim_hash);

-- For TTL cleanup queries
CREATE INDEX IF NOT EXISTS idx_fv_cache_expires ON fact_validation_cache(expires_at);

-- Enable RLS
ALTER TABLE fact_validation_cache ENABLE ROW LEVEL SECURITY;

-- Cache is shared across users (fact verification results are universal)
CREATE POLICY "fact_validation_cache_read_all" ON fact_validation_cache
  FOR SELECT USING (true);

-- Only authenticated users can insert/update
CREATE POLICY "fact_validation_cache_insert_authenticated" ON fact_validation_cache
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "fact_validation_cache_update_authenticated" ON fact_validation_cache
  FOR UPDATE USING (auth.role() = 'authenticated');
