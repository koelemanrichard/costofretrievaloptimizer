-- Add generation_changes JSONB column to content_briefs
ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS generation_changes JSONB DEFAULT '[]'::jsonb;

-- Add generation_summary JSONB column
ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS generation_summary JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN content_briefs.generation_changes IS 'Array of BriefChangeLogEntry tracking deviations during generation';
COMMENT ON COLUMN content_briefs.generation_summary IS 'Summary statistics of generation changes';
