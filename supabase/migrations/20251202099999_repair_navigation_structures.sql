-- Repair migration: Create navigation_structures table if it doesn't exist
-- This fixes the 406 error when the original migration was marked complete but table wasn't created

-- ===========================================
-- NAVIGATION STRUCTURES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.navigation_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Header configuration
  header JSONB NOT NULL DEFAULT '{"logo_alt_text": "", "primary_nav": [], "cta_button": null}',

  -- Footer configuration
  footer JSONB NOT NULL DEFAULT '{"sections": [], "legal_links": [], "nap_display": true, "copyright_text": ""}',

  -- Navigation limits
  max_header_links INTEGER DEFAULT 10,
  max_footer_links INTEGER DEFAULT 30,

  -- Dynamic navigation per section
  dynamic_by_section BOOLEAN DEFAULT true,

  -- Additional metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (will do nothing if already enabled)
ALTER TABLE public.navigation_structures ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'navigation_structures' AND policyname = 'Users can view own navigation') THEN
    CREATE POLICY "Users can view own navigation"
      ON public.navigation_structures FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'navigation_structures' AND policyname = 'Users can create own navigation') THEN
    CREATE POLICY "Users can create own navigation"
      ON public.navigation_structures FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'navigation_structures' AND policyname = 'Users can update own navigation') THEN
    CREATE POLICY "Users can update own navigation"
      ON public.navigation_structures FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'navigation_structures' AND policyname = 'Users can delete own navigation') THEN
    CREATE POLICY "Users can delete own navigation"
      ON public.navigation_structures FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes (will do nothing if they already exist)
CREATE INDEX IF NOT EXISTS idx_navigation_structures_map_id ON public.navigation_structures(map_id);
CREATE INDEX IF NOT EXISTS idx_navigation_structures_user_id ON public.navigation_structures(user_id);

-- ===========================================
-- NAVIGATION SYNC STATUS TABLE
-- ===========================================
-- Add user_id column if missing (fixes migration issue)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'navigation_sync_status'
                 AND column_name = 'user_id') THEN
    ALTER TABLE public.navigation_sync_status
    ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.navigation_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync status (only if user_id exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
             AND table_name = 'navigation_sync_status'
             AND column_name = 'user_id') THEN

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'navigation_sync_status' AND policyname = 'Users can view own sync status') THEN
      CREATE POLICY "Users can view own sync status"
        ON public.navigation_sync_status FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'navigation_sync_status' AND policyname = 'Users can manage own sync status') THEN
      CREATE POLICY "Users can manage own sync status"
        ON public.navigation_sync_status FOR ALL
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_navigation_sync_status_map_id ON public.navigation_sync_status(map_id);
