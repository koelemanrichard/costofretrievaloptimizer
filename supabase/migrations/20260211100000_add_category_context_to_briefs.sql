-- Add category_context column to content_briefs for persisting linked catalog data
ALTER TABLE content_briefs ADD COLUMN IF NOT EXISTS category_context JSONB;
