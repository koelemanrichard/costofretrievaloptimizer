-- Add content_audit column to content_briefs table
-- This stores the AI-generated content integrity audit results

ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS content_audit JSONB;

-- Add comment for documentation
COMMENT ON COLUMN content_briefs.content_audit IS 'Stores AI content integrity audit results including rules, scores, and suggestions';
