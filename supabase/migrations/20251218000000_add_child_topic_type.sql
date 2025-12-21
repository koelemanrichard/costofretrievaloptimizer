-- Migration: Add 'child' topic type for 3-level hierarchy
-- Extends topical map from 2 levels (Core -> Outer) to 3 levels (Core -> Outer -> Child)

-- Drop existing constraint if it exists
ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_type_check;

-- Add new constraint with 'child' type included
ALTER TABLE public.topics ADD CONSTRAINT topics_type_check
  CHECK (type IN ('core', 'outer', 'child'));

-- Add comment explaining the hierarchy
COMMENT ON COLUMN public.topics.type IS 'Topic hierarchy level: core (level 1, root), outer (level 2, under core), child (level 3, under outer)';
