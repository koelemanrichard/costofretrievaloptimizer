-- Extend site_inventory for the Site Authority Engine
-- Adds: audit integration, page metadata, auto-matching, migration plan, CrUX, URL Inspection

-- Extend action_type enum with new values needed by the migration plan engine
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'OPTIMIZE';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'CREATE_NEW';

-- Audit integration
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS audit_score numeric(5,2);
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS audit_snapshot_id uuid REFERENCES public.unified_audit_snapshots(id) ON DELETE SET NULL;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS last_audited_at timestamptz;

-- Page metadata extracted during audit (cached to avoid re-fetch)
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS page_title text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS page_h1 text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS headings jsonb;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS internal_link_count int;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS external_link_count int;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS schema_types text[];
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS language text;

-- Auto-matching
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS match_confidence numeric(4,2);
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS match_source text;

-- Migration plan
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS recommended_action action_type;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS action_reasoning text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS action_priority text CHECK (action_priority IN ('critical', 'high', 'medium', 'low'));
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS action_effort text CHECK (action_effort IN ('none', 'low', 'medium', 'high'));

-- CrUX / Core Web Vitals (real user data)
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_lcp numeric;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_inp numeric;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_cls numeric;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_assessment text CHECK (cwv_assessment IN ('good', 'needs-improvement', 'poor'));

-- URL Inspection data
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS google_index_verdict text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS google_canonical text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS last_crawled_at timestamptz;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS mobile_usability text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS rich_results_status text;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_site_inventory_audit_score ON public.site_inventory(audit_score);
CREATE INDEX IF NOT EXISTS idx_site_inventory_priority ON public.site_inventory(action_priority);
CREATE INDEX IF NOT EXISTS idx_site_inventory_recommended ON public.site_inventory(recommended_action);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
