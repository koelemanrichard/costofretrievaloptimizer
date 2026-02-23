-- Add missing columns to ga4_traffic_data that analytics-sync-worker writes
ALTER TABLE ga4_traffic_data
  ADD COLUMN IF NOT EXISTS engaged_sessions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions INTEGER NOT NULL DEFAULT 0;
