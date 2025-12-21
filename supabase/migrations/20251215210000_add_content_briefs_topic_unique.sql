-- Add UNIQUE constraint on topic_id for content_briefs table
-- This is required for upsert operations using ON CONFLICT (topic_id)

-- First, handle any duplicate topic_ids by keeping only the most recent brief
-- This is a safety step in case there are duplicates
DO $$
DECLARE
    duplicate_topic_id UUID;
BEGIN
    -- Find and delete older duplicates, keeping only the most recent brief for each topic_id
    FOR duplicate_topic_id IN
        SELECT topic_id
        FROM public.content_briefs
        GROUP BY topic_id
        HAVING COUNT(*) > 1
    LOOP
        DELETE FROM public.content_briefs
        WHERE topic_id = duplicate_topic_id
        AND id NOT IN (
            SELECT id FROM public.content_briefs
            WHERE topic_id = duplicate_topic_id
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
            LIMIT 1
        );
    END LOOP;
END $$;

-- Drop the existing non-unique index if it exists
DROP INDEX IF EXISTS idx_content_briefs_topic_id;

-- Create a UNIQUE constraint on topic_id
-- This will also create an implicit unique index
ALTER TABLE public.content_briefs
ADD CONSTRAINT content_briefs_topic_id_unique UNIQUE (topic_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT content_briefs_topic_id_unique ON public.content_briefs IS
'Ensures one brief per topic. Required for upsert operations.';
