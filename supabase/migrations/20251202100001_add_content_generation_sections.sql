-- supabase/migrations/20251202100001_add_content_generation_sections.sql
-- Individual section storage with version history per pass

CREATE TABLE public.content_generation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.content_generation_jobs(id) ON DELETE CASCADE,

  -- Section identification
  section_key TEXT NOT NULL,
  section_heading TEXT,
  section_order INTEGER NOT NULL,
  section_level INTEGER DEFAULT 2,

  -- Content versions (one per pass)
  pass_1_content TEXT,
  pass_2_content TEXT,
  pass_3_content TEXT,
  pass_4_content TEXT,
  pass_5_content TEXT,
  pass_6_content TEXT,
  pass_7_content TEXT,
  pass_8_content TEXT,

  -- Current version pointer
  current_content TEXT,
  current_pass INTEGER DEFAULT 1,

  -- Per-section audit scores
  audit_scores JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(job_id, section_key)
);

-- RLS (inherits from job ownership)
ALTER TABLE public.content_generation_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sections"
  ON public.content_generation_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sections"
  ON public.content_generation_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sections"
  ON public.content_generation_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sections"
  ON public.content_generation_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_content_generation_sections_job_id ON public.content_generation_sections(job_id);
CREATE INDEX idx_content_generation_sections_order ON public.content_generation_sections(job_id, section_order);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_sections;

-- Updated_at trigger
CREATE TRIGGER update_content_generation_sections_updated_at
  BEFORE UPDATE ON public.content_generation_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
