-- Analytics sync logs: tracks automated and manual sync operations
-- Used by analytics-sync-worker edge function and sync status dashboard
CREATE TABLE IF NOT EXISTS analytics_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES analytics_properties(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  rows_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE analytics_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS: users can read sync logs for properties they have access to
-- (properties belong to projects, projects belong to users)
CREATE POLICY "analytics_sync_logs_read_own" ON analytics_sync_logs
  FOR SELECT USING (
    property_id IN (
      SELECT ap.id FROM analytics_properties ap
      JOIN projects p ON ap.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS: authenticated users can insert logs for their properties
CREATE POLICY "analytics_sync_logs_insert_own" ON analytics_sync_logs
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT ap.id FROM analytics_properties ap
      JOIN projects p ON ap.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Index for fast lookup by property
CREATE INDEX IF NOT EXISTS idx_analytics_sync_logs_property ON analytics_sync_logs(property_id, started_at DESC);

-- Index for finding recent failures
CREATE INDEX IF NOT EXISTS idx_analytics_sync_logs_status ON analytics_sync_logs(status, started_at DESC)
  WHERE status = 'failed';
