-- ================================================================
-- CREATE ALL MISSING DESIGN TABLES
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ================================================================

-- 1. Design Profiles
CREATE TABLE IF NOT EXISTS design_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_url TEXT,
    screenshot_url TEXT,
    brand_discovery JSONB NOT NULL DEFAULT '{}',
    user_overrides JSONB DEFAULT '{}',
    final_tokens JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_profiles_project ON design_profiles(project_id);
ALTER TABLE design_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their project design profiles" ON design_profiles;
CREATE POLICY "Users can manage their project design profiles"
    ON design_profiles FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 2. Design Preferences
CREATE TABLE IF NOT EXISTS design_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    preference_type TEXT NOT NULL,
    context TEXT NOT NULL,
    choice TEXT NOT NULL,
    frequency INT DEFAULT 1,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_preferences_project ON design_preferences(project_id);
ALTER TABLE design_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their design preferences" ON design_preferences;
CREATE POLICY "Users can manage their design preferences"
    ON design_preferences FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 3. Project Design Defaults
CREATE TABLE IF NOT EXISTS project_design_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    design_profile_id UUID REFERENCES design_profiles(id),
    default_personality TEXT DEFAULT 'modern-minimal',
    component_preferences JSONB DEFAULT '{}',
    spacing_preference TEXT DEFAULT 'normal',
    visual_intensity TEXT DEFAULT 'moderate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_design_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their project design defaults" ON project_design_defaults;
CREATE POLICY "Users can manage their project design defaults"
    ON project_design_defaults FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 4. Topical Map Design Rules
CREATE TABLE IF NOT EXISTS topical_map_design_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topical_map_id UUID NOT NULL UNIQUE REFERENCES topical_maps(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inherit_from_project BOOLEAN DEFAULT true,
    overrides JSONB DEFAULT '{}',
    cluster_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_design_rules_project ON topical_map_design_rules(project_id);
ALTER TABLE topical_map_design_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their map design rules" ON topical_map_design_rules;
CREATE POLICY "Users can manage their map design rules"
    ON topical_map_design_rules FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 5. Brand Design DNA
CREATE TABLE IF NOT EXISTS brand_design_dna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    screenshot_url TEXT,
    screenshot_base64 TEXT,
    design_dna JSONB NOT NULL,
    ai_model TEXT,
    confidence_score NUMERIC,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_dna_project ON brand_design_dna(project_id);
ALTER TABLE brand_design_dna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own brand_design_dna" ON brand_design_dna;
CREATE POLICY "Users can view own brand_design_dna"
    ON brand_design_dna FOR SELECT
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own brand_design_dna" ON brand_design_dna;
CREATE POLICY "Users can insert own brand_design_dna"
    ON brand_design_dna FOR INSERT
    WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own brand_design_dna" ON brand_design_dna;
CREATE POLICY "Users can update own brand_design_dna"
    ON brand_design_dna FOR UPDATE
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own brand_design_dna" ON brand_design_dna;
CREATE POLICY "Users can delete own brand_design_dna"
    ON brand_design_dna FOR DELETE
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 6. Brand Design Systems
CREATE TABLE IF NOT EXISTS brand_design_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    design_dna_id UUID REFERENCES brand_design_dna(id) ON DELETE SET NULL,
    brand_name TEXT NOT NULL,
    design_dna_hash TEXT NOT NULL,
    tokens JSONB NOT NULL,
    component_styles JSONB NOT NULL,
    decorative_elements JSONB,
    interactions JSONB,
    typography_treatments JSONB,
    image_treatments JSONB,
    compiled_css TEXT NOT NULL,
    variant_mappings JSONB,
    ai_model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, design_dna_hash)
);

CREATE INDEX IF NOT EXISTS idx_brand_systems_project ON brand_design_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_systems_hash ON brand_design_systems(design_dna_hash);
ALTER TABLE brand_design_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own brand_design_systems" ON brand_design_systems;
CREATE POLICY "Users can view own brand_design_systems"
    ON brand_design_systems FOR SELECT
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own brand_design_systems" ON brand_design_systems;
CREATE POLICY "Users can insert own brand_design_systems"
    ON brand_design_systems FOR INSERT
    WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own brand_design_systems" ON brand_design_systems;
CREATE POLICY "Users can update own brand_design_systems"
    ON brand_design_systems FOR UPDATE
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own brand_design_systems" ON brand_design_systems;
CREATE POLICY "Users can delete own brand_design_systems"
    ON brand_design_systems FOR DELETE
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Done!
SELECT 'All design tables created successfully!' as status;
