-- Add dialogue_context JSONB column to topical_maps
ALTER TABLE topical_maps
ADD COLUMN IF NOT EXISTS dialogue_context JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN topical_maps.dialogue_context IS 'Accumulated dialogue answers from pipeline steps (strategy, eavs, map_planning). Forward-propagated to downstream AI prompts.';
