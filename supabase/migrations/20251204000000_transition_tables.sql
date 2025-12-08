-- Migration for Website Transition Workbench

-- Create Enums for State Management
DO $$ BEGIN
    CREATE TYPE transition_status AS ENUM ('AUDIT_PENDING', 'GAP_ANALYSIS', 'ACTION_REQUIRED', 'IN_PROGRESS', 'OPTIMIZED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE action_type AS ENUM ('KEEP', 'REWRITE', 'MERGE', 'REDIRECT_301', 'PRUNE_410', 'CANONICALIZE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE section_type AS ENUM ('CORE_SECTION', 'AUTHOR_SECTION', 'ORPHAN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Site Inventory Table (The "Old" Site)
CREATE TABLE IF NOT EXISTS public.site_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    url text NOT NULL,
    title text,
    http_status int,
    content_hash text,

    -- Technical & Cost of Retrieval Metrics
    word_count int,
    link_count int,
    dom_size int, -- in KB
    ttfb_ms int,
    cor_score int, -- 0-100 (High = Bad)

    -- GSC Performance Metrics
    gsc_clicks int DEFAULT 0,
    gsc_impressions int DEFAULT 0,
    gsc_position numeric,
    index_status text,
    striking_distance_keywords jsonb, -- Array of strings

    -- Strategy & Transition Mapping
    mapped_topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
    section section_type,
    status transition_status DEFAULT 'AUDIT_PENDING',
    action action_type,

    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    UNIQUE(project_id, url)
);

-- Transition Snapshots (Time Machine for Content)
CREATE TABLE IF NOT EXISTS public.transition_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    inventory_id uuid NOT NULL REFERENCES public.site_inventory(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    content_markdown text,
    snapshot_type text -- 'ORIGINAL_IMPORT', 'PRE_OPTIMIZATION', 'POST_OPTIMIZATION'
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_site_inventory_project ON public.site_inventory(project_id);
CREATE INDEX IF NOT EXISTS idx_site_inventory_url ON public.site_inventory(url);
CREATE INDEX IF NOT EXISTS idx_transition_snapshots_inventory ON public.transition_snapshots(inventory_id);
CREATE INDEX IF NOT EXISTS idx_transition_snapshots_type ON public.transition_snapshots(inventory_id, snapshot_type);

-- Row Level Security
ALTER TABLE public.site_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transition_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_inventory (drop if exist to be idempotent)
DROP POLICY IF EXISTS "Users can view inventory for their projects" ON public.site_inventory;
CREATE POLICY "Users can view inventory for their projects" ON public.site_inventory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = site_inventory.project_id
            AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert inventory for their projects" ON public.site_inventory;
CREATE POLICY "Users can insert inventory for their projects" ON public.site_inventory
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = site_inventory.project_id
            AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update inventory for their projects" ON public.site_inventory;
CREATE POLICY "Users can update inventory for their projects" ON public.site_inventory
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = site_inventory.project_id
            AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete inventory for their projects" ON public.site_inventory;
CREATE POLICY "Users can delete inventory for their projects" ON public.site_inventory
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = site_inventory.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- RLS Policies for transition_snapshots (through site_inventory -> projects)
DROP POLICY IF EXISTS "Users can view snapshots for their projects" ON public.transition_snapshots;
CREATE POLICY "Users can view snapshots for their projects" ON public.transition_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = transition_snapshots.inventory_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert snapshots for their projects" ON public.transition_snapshots;
CREATE POLICY "Users can insert snapshots for their projects" ON public.transition_snapshots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = transition_snapshots.inventory_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update snapshots for their projects" ON public.transition_snapshots;
CREATE POLICY "Users can update snapshots for their projects" ON public.transition_snapshots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = transition_snapshots.inventory_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete snapshots for their projects" ON public.transition_snapshots;
CREATE POLICY "Users can delete snapshots for their projects" ON public.transition_snapshots
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = transition_snapshots.inventory_id
            AND p.user_id = auth.uid()
        )
    );

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload config';
