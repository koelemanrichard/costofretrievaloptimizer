-- Migration: Add content length settings columns
-- Adds user-controllable content length settings per Korayanese framework
-- - minimal: Bridge topics, definitions (300-400 words)
-- - short: Outer topics, informational (500-700 words)
-- - standard: SERP-based dynamic length (default)
-- - comprehensive: Core topics, pillar content (2000+ words)

-- Add length columns to content_generation_settings table
ALTER TABLE content_generation_settings
  ADD COLUMN IF NOT EXISTS length_preset TEXT DEFAULT 'standard'
    CHECK (length_preset IN ('minimal', 'short', 'standard', 'comprehensive')),
  ADD COLUMN IF NOT EXISTS target_word_count INTEGER,
  ADD COLUMN IF NOT EXISTS max_sections INTEGER,
  ADD COLUMN IF NOT EXISTS respect_topic_type BOOLEAN DEFAULT true;

-- Add comment explaining the columns
COMMENT ON COLUMN content_generation_settings.length_preset IS 'Content length preset: minimal (300w), short (600w), standard (SERP-based), comprehensive (2000w+)';
COMMENT ON COLUMN content_generation_settings.target_word_count IS 'User override for target word count (takes precedence over preset)';
COMMENT ON COLUMN content_generation_settings.max_sections IS 'Maximum number of sections to generate';
COMMENT ON COLUMN content_generation_settings.respect_topic_type IS 'Auto-adjust length based on topic type (core vs outer)';

-- Create index for faster preset lookups
CREATE INDEX IF NOT EXISTS idx_content_gen_settings_length_preset
  ON content_generation_settings(length_preset);
