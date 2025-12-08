-- Migration for Semantic Analysis Results persistence
-- Stores semantic analysis results for site inventory items

-- Create Semantic Analysis Results Table
CREATE TABLE IF NOT EXISTS public.semantic_analysis_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    inventory_id uuid NOT NULL REFERENCES public.site_inventory(id) ON DELETE CASCADE,
    map_id uuid REFERENCES public.topical_maps(id) ON DELETE SET NULL,  -- The map used for alignment checking (optional)

    -- The full analysis result as JSON
    result jsonb NOT NULL,

    -- Key scores extracted for quick queries
    overall_score int,
    ce_alignment int,  -- Central Entity alignment score (0-100)
    sc_alignment int,  -- Source Context alignment score (0-100)
    csi_alignment int, -- Central Search Intent alignment score (0-100)

    -- Detected entities (for quick lookup)
    detected_ce text,  -- What CE was detected
    detected_sc text,  -- What SC was detected
    detected_csi text, -- What CSI was detected

    -- Content hash to detect if re-analysis is needed
    content_hash text,

    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_semantic_results_inventory ON public.semantic_analysis_results(inventory_id);
CREATE INDEX IF NOT EXISTS idx_semantic_results_map ON public.semantic_analysis_results(map_id);
CREATE INDEX IF NOT EXISTS idx_semantic_results_scores ON public.semantic_analysis_results(overall_score, ce_alignment, sc_alignment, csi_alignment);
CREATE INDEX IF NOT EXISTS idx_semantic_results_content_hash ON public.semantic_analysis_results(inventory_id, content_hash);

-- Row Level Security
ALTER TABLE public.semantic_analysis_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (through site_inventory -> projects)
DROP POLICY IF EXISTS "Users can view semantic results for their projects" ON public.semantic_analysis_results;
CREATE POLICY "Users can view semantic results for their projects" ON public.semantic_analysis_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = semantic_analysis_results.inventory_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert semantic results for their projects" ON public.semantic_analysis_results;
CREATE POLICY "Users can insert semantic results for their projects" ON public.semantic_analysis_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = semantic_analysis_results.inventory_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update semantic results for their projects" ON public.semantic_analysis_results;
CREATE POLICY "Users can update semantic results for their projects" ON public.semantic_analysis_results
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = semantic_analysis_results.inventory_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete semantic results for their projects" ON public.semantic_analysis_results;
CREATE POLICY "Users can delete semantic results for their projects" ON public.semantic_analysis_results
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            JOIN public.projects p ON p.id = si.project_id
            WHERE si.id = semantic_analysis_results.inventory_id
            AND p.user_id = auth.uid()
        )
    );

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload config';
