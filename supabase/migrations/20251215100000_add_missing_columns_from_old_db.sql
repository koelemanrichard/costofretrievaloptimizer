-- Add missing columns from old database for data migration
-- These columns exist in the old database but weren't captured in original migrations

-- user_settings: settings_data column
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS settings_data JSONB;

-- projects: ai_model column
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_model TEXT;

-- topical_maps: map_type column
ALTER TABLE public.topical_maps ADD COLUMN IF NOT EXISTS map_type TEXT;

-- topics: user_id column (for denormalized access)
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- content_briefs: status column
ALTER TABLE public.content_briefs ADD COLUMN IF NOT EXISTS status TEXT;

-- Create index for topics user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON public.topics(user_id);
