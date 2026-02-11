-- Ensure only one settings row per user per map
-- This prevents duplicate map-specific settings from being created
-- (complements the existing idx_unique_user_default_setting for default rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_map_setting
  ON content_generation_settings (user_id, map_id)
  WHERE map_id IS NOT NULL;
