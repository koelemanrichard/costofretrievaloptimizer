-- GSC search analytics data: stores fetched rows from Google Search Console API
CREATE TABLE IF NOT EXISTS gsc_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES analytics_properties(id) ON DELETE CASCADE,
  sync_log_id UUID REFERENCES analytics_sync_logs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  query TEXT NOT NULL,
  page TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GA4 traffic data: stores fetched rows from Google Analytics 4 API
CREATE TABLE IF NOT EXISTS ga4_traffic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES analytics_properties(id) ON DELETE CASCADE,
  sync_log_id UUID REFERENCES analytics_sync_logs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  page_path TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  pageviews INTEGER NOT NULL DEFAULT 0,
  avg_session_duration DOUBLE PRECISION NOT NULL DEFAULT 0,
  bounce_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gsc_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga4_traffic_data ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access data for properties in their projects
CREATE POLICY "gsc_data_project_access" ON gsc_search_analytics
  FOR ALL USING (
    property_id IN (
      SELECT ap.id FROM analytics_properties ap
      JOIN projects p ON ap.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "ga4_data_project_access" ON ga4_traffic_data
  FOR ALL USING (
    property_id IN (
      SELECT ap.id FROM analytics_properties ap
      JOIN projects p ON ap.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gsc_data_property_date ON gsc_search_analytics(property_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_data_query ON gsc_search_analytics(property_id, query);
CREATE INDEX IF NOT EXISTS idx_gsc_data_page ON gsc_search_analytics(property_id, page);

CREATE INDEX IF NOT EXISTS idx_ga4_data_property_date ON ga4_traffic_data(property_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_data_page ON ga4_traffic_data(property_id, page_path);

-- Unique constraint to prevent duplicate rows on re-sync
-- (upsert on conflict to update existing rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gsc_data_unique_row
  ON gsc_search_analytics(property_id, date, query, page);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ga4_data_unique_row
  ON ga4_traffic_data(property_id, date, page_path);
