-- Migration: Add draft version history to content_briefs
-- This keeps track of the last 6 versions of article_draft to protect against data loss

-- Add draft_history column as JSONB array
-- Structure: [{version: 1, content: "...", saved_at: "2024-...", source: "manual|polish|flow_fix"}]
ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS draft_history JSONB DEFAULT '[]'::jsonb;

-- Add a trigger function to automatically version drafts on update
CREATE OR REPLACE FUNCTION manage_draft_history()
RETURNS TRIGGER AS $$
DECLARE
    max_versions CONSTANT INT := 6;
    current_history JSONB;
    new_version JSONB;
    history_length INT;
BEGIN
    -- Only run if article_draft actually changed and has content
    IF OLD.article_draft IS DISTINCT FROM NEW.article_draft
       AND OLD.article_draft IS NOT NULL
       AND LENGTH(OLD.article_draft) > 100 THEN

        -- Get current history or initialize empty array
        current_history := COALESCE(OLD.draft_history, '[]'::jsonb);
        history_length := jsonb_array_length(current_history);

        -- Create new version entry from the OLD content (what we're replacing)
        new_version := jsonb_build_object(
            'version', history_length + 1,
            'content', OLD.article_draft,
            'saved_at', NOW()::text,
            'char_count', LENGTH(OLD.article_draft)
        );

        -- Prepend new version to history
        current_history := new_version || current_history;

        -- Trim to max versions (keep only first N elements)
        IF jsonb_array_length(current_history) > max_versions THEN
            -- PostgreSQL: slice array to keep first max_versions elements
            SELECT jsonb_agg(elem)
            INTO current_history
            FROM (
                SELECT elem
                FROM jsonb_array_elements(current_history) WITH ORDINALITY AS t(elem, ord)
                WHERE ord <= max_versions
                ORDER BY ord
            ) sub;
        END IF;

        -- Update the draft_history in NEW record
        NEW.draft_history := current_history;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on content_briefs table
DROP TRIGGER IF EXISTS draft_history_trigger ON content_briefs;
CREATE TRIGGER draft_history_trigger
    BEFORE UPDATE ON content_briefs
    FOR EACH ROW
    EXECUTE FUNCTION manage_draft_history();

-- Add index for faster JSONB queries on draft_history
CREATE INDEX IF NOT EXISTS idx_content_briefs_draft_history
ON content_briefs USING GIN (draft_history);

-- Comment explaining the feature
COMMENT ON COLUMN content_briefs.draft_history IS
'Auto-versioned history of article_draft changes. Keeps last 6 versions.
Structure: [{version, content, saved_at, char_count}].
Automatically populated by trigger on article_draft updates.';
