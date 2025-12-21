-- Complete schema alignment with old database
-- Adds all missing columns and fixes constraints for data migration

-- =====================================
-- PROJECTS TABLE - Missing columns
-- =====================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS seed_keyword TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS apify_token TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS analysis_result JSONB;

-- =====================================
-- TOPICAL_MAPS TABLE - Missing columns
-- =====================================
ALTER TABLE public.topical_maps ADD COLUMN IF NOT EXISTS status TEXT;

-- =====================================
-- TOPICS TABLE - Fix freshness constraint
-- =====================================
-- Remove old constraint
ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_freshness_check;

-- The old database has many freshness values - remove constraint entirely
-- Values found: EVERGREEN, STANDARD, UPDATED, FREQUENT, SEASONAL, FRESH, TRENDING, URGENT, TECHNICAL, PREVENTIVE, COMPLIANCE, ADVANCED, NICHE

-- =====================================
-- CONTENT_BRIEFS TABLE - Missing columns
-- =====================================
ALTER TABLE public.content_briefs ADD COLUMN IF NOT EXISTS map_id UUID REFERENCES public.topical_maps(id) ON DELETE CASCADE;

-- Index for map_id
CREATE INDEX IF NOT EXISTS idx_content_briefs_map_id ON public.content_briefs(map_id);
