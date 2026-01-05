-- Fix content_generation_jobs unique constraint
-- Problem: UNIQUE(brief_id) prevents regenerating drafts after completion/failure
-- Solution: Only enforce uniqueness for active jobs (pending/in_progress)

-- Drop the old constraint
ALTER TABLE public.content_generation_jobs DROP CONSTRAINT IF EXISTS content_generation_jobs_brief_id_key;

-- Create a partial unique index that only applies to active jobs
-- This allows multiple completed/failed/cancelled jobs per brief, but only one active job
CREATE UNIQUE INDEX IF NOT EXISTS content_generation_jobs_active_brief_unique
ON public.content_generation_jobs (brief_id)
WHERE status IN ('pending', 'in_progress', 'paused');

-- Also clean up old failed/cancelled jobs that might be blocking
-- (Keep completed ones for history, delete failed/cancelled older than 7 days)
DELETE FROM public.content_generation_jobs
WHERE status IN ('failed', 'cancelled')
AND created_at < NOW() - INTERVAL '7 days';
