-- supabase/migrations/20251202100000_add_content_generation_jobs.sql
-- Multi-pass content generation job tracking

CREATE TABLE public.content_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id),

  -- Job Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'failed', 'cancelled')),

  -- Multi-pass tracking
  current_pass INTEGER NOT NULL DEFAULT 1 CHECK (current_pass >= 1 AND current_pass <= 8),
  passes_status JSONB NOT NULL DEFAULT '{
    "pass_1_draft": "pending",
    "pass_2_headers": "pending",
    "pass_3_lists": "pending",
    "pass_4_visuals": "pending",
    "pass_5_microsemantics": "pending",
    "pass_6_discourse": "pending",
    "pass_7_intro": "pending",
    "pass_8_audit": "pending"
  }'::jsonb,

  -- Section tracking for Pass 1
  total_sections INTEGER,
  completed_sections INTEGER DEFAULT 0,
  current_section_key TEXT,

  -- Content accumulation
  draft_content TEXT,

  -- Audit results
  final_audit_score NUMERIC(5,2),
  audit_details JSONB,

  -- Error handling
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(brief_id)
);

-- RLS Policies
ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.content_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.content_generation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.content_generation_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON public.content_generation_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_content_generation_jobs_brief_id ON public.content_generation_jobs(brief_id);
CREATE INDEX idx_content_generation_jobs_user_id ON public.content_generation_jobs(user_id);
CREATE INDEX idx_content_generation_jobs_status ON public.content_generation_jobs(status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_jobs;

-- Updated_at trigger
CREATE TRIGGER update_content_generation_jobs_updated_at
  BEFORE UPDATE ON public.content_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
