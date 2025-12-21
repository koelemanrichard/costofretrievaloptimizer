-- Migration: Add display_parent_id for visual grouping
-- Purpose: Allows topics to have a separate visual parent for business presentations
--          without affecting the behavioral/SEO hierarchy (type + parent_topic_id)
--
-- Key distinction:
--   - parent_topic_id: Behavioral parent (affects SEO processing, priority, hub-spoke)
--   - display_parent_id: Visual parent (presentation only, no SEO impact)

-- Add the display_parent_id column
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS display_parent_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- Add index for efficient lookups when building visual hierarchy
CREATE INDEX IF NOT EXISTS idx_topics_display_parent_id ON public.topics(display_parent_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.topics.display_parent_id IS
  'Optional visual parent for business presentations. Does NOT affect SEO behavior (type, priority, hub-spoke). Used for grouping topics visually without changing their behavioral hierarchy.';

-- Create function to prevent circular display_parent references
CREATE OR REPLACE FUNCTION check_display_parent_cycle()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  max_depth INT := 10;
  depth INT := 0;
BEGIN
  -- Allow NULL display_parent
  IF NEW.display_parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent self-reference
  IF NEW.display_parent_id = NEW.id THEN
    RAISE EXCEPTION 'A topic cannot be its own display parent';
  END IF;

  -- Check for cycles by walking up the display_parent chain
  current_id := NEW.display_parent_id;
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular display_parent reference detected';
    END IF;
    SELECT display_parent_id INTO current_id FROM public.topics WHERE id = current_id;
    depth := depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce no circular references
DROP TRIGGER IF EXISTS prevent_display_parent_cycle ON public.topics;
CREATE TRIGGER prevent_display_parent_cycle
  BEFORE INSERT OR UPDATE OF display_parent_id ON public.topics
  FOR EACH ROW EXECUTE FUNCTION check_display_parent_cycle();
