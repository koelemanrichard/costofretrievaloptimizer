-- Add visual_placement_map and discourse_anchor_sequence columns to content_briefs
-- These fields are generated during brief enrichment but were not persisted to the database

ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS visual_placement_map JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discourse_anchor_sequence JSONB DEFAULT '[]'::jsonb;
