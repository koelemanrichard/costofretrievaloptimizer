-- Add more missing columns discovered during migration

-- projects: ai_provider column
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_provider TEXT;

-- topical_maps: seo_pillars column (alias for pillars)
ALTER TABLE public.topical_maps ADD COLUMN IF NOT EXISTS seo_pillars JSONB;

-- content_briefs: user_id column
ALTER TABLE public.content_briefs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Fix topics freshness constraint - allow NULL and more values
ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_freshness_check;
ALTER TABLE public.topics ADD CONSTRAINT topics_freshness_check
  CHECK (freshness IS NULL OR freshness IN ('EVERGREEN', 'STANDARD', 'FREQUENT', 'evergreen', 'standard', 'frequent'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_content_briefs_user_id ON public.content_briefs(user_id);
