-- Styled Content Publishing Tables
-- Enables brand-aware styling and content templates for WordPress publishing
-- Part of the Styled Content Publishing System feature

-- ============================================================================
-- 1. publishing_styles - Store brand styling configurations per project
-- ============================================================================
CREATE TABLE IF NOT EXISTS publishing_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Style metadata
    name TEXT NOT NULL DEFAULT 'Default Style',
    is_default BOOLEAN DEFAULT FALSE,
    source_url TEXT,  -- URL used for brand detection (future feature)

    -- Design tokens (colors, fonts, spacing, etc.)
    design_tokens JSONB NOT NULL DEFAULT '{
        "colors": {
            "primary": "#3B82F6",
            "secondary": "#1E40AF",
            "accent": "#F59E0B",
            "background": "#FFFFFF",
            "surface": "#F9FAFB",
            "text": "#111827",
            "textMuted": "#6B7280",
            "border": "#E5E7EB",
            "success": "#10B981",
            "warning": "#F59E0B",
            "error": "#EF4444"
        },
        "fonts": {
            "heading": "Inter, system-ui, sans-serif",
            "body": "Inter, system-ui, sans-serif",
            "mono": "JetBrains Mono, monospace"
        },
        "spacing": {
            "sectionGap": "normal",
            "contentWidth": "standard",
            "paragraphSpacing": "normal"
        },
        "borderRadius": "rounded",
        "shadows": "subtle",
        "typography": {
            "headingWeight": "semibold",
            "bodyLineHeight": "relaxed",
            "headingLineHeight": "tight"
        }
    }'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_publishing_styles_default
    ON publishing_styles(project_id)
    WHERE is_default = TRUE;

-- ============================================================================
-- 2. layout_templates - Store layout configurations per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS layout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Template metadata
    name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN (
        'blog-article',
        'landing-page',
        'ecommerce-product',
        'ecommerce-category',
        'service-page'
    )),
    is_default BOOLEAN DEFAULT FALSE,

    -- Layout configuration (component toggles, positions, styles)
    layout_config JSONB NOT NULL DEFAULT '{
        "components": {
            "hero": { "enabled": true, "style": "minimal" },
            "keyTakeaways": { "enabled": true, "position": "after-intro", "style": "box" },
            "toc": { "enabled": true, "position": "sidebar", "sticky": true },
            "ctaBanners": { "enabled": true, "intensity": "low", "positions": ["end"] },
            "faq": { "enabled": true, "style": "accordion" },
            "authorBox": { "enabled": true, "position": "bottom" },
            "relatedContent": { "enabled": true, "style": "cards" },
            "readingExperience": { "progressBar": true, "estimatedReadTime": true, "socialShare": true }
        }
    }'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default per user per template type
CREATE UNIQUE INDEX IF NOT EXISTS idx_layout_templates_default
    ON layout_templates(user_id, template_type)
    WHERE is_default = TRUE;

-- ============================================================================
-- 3. Add styled content columns to wordpress_publications
-- ============================================================================
ALTER TABLE wordpress_publications
ADD COLUMN IF NOT EXISTS style_config JSONB,
ADD COLUMN IF NOT EXISTS layout_config JSONB;

-- Add comment for documentation
COMMENT ON COLUMN wordpress_publications.style_config IS 'PublishingStyle snapshot at time of publication';
COMMENT ON COLUMN wordpress_publications.layout_config IS 'LayoutConfiguration snapshot at time of publication';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- publishing_styles
CREATE INDEX IF NOT EXISTS idx_publishing_styles_project ON publishing_styles(project_id);

-- layout_templates
CREATE INDEX IF NOT EXISTS idx_layout_templates_user ON layout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_layout_templates_type ON layout_templates(template_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE publishing_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_templates ENABLE ROW LEVEL SECURITY;

-- publishing_styles policies (through project ownership)
CREATE POLICY "Users can view styles through project membership"
    ON publishing_styles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = publishing_styles.project_id
            AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert styles to own projects"
    ON publishing_styles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = publishing_styles.project_id
            AND (p.user_id = auth.uid() OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')))
        )
    );

CREATE POLICY "Users can update styles in own projects"
    ON publishing_styles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = publishing_styles.project_id
            AND (p.user_id = auth.uid() OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'editor')))
        )
    );

CREATE POLICY "Users can delete styles from own projects"
    ON publishing_styles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = publishing_styles.project_id
            AND (p.user_id = auth.uid() OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')))
        )
    );

-- layout_templates policies (user owns their templates)
CREATE POLICY "Users can view own layout templates"
    ON layout_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own layout templates"
    ON layout_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own layout templates"
    ON layout_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own layout templates"
    ON layout_templates FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update timestamp for publishing_styles
CREATE OR REPLACE FUNCTION update_publishing_styles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER publishing_styles_updated
    BEFORE UPDATE ON publishing_styles
    FOR EACH ROW
    EXECUTE FUNCTION update_publishing_styles_timestamp();

-- Auto-update timestamp for layout_templates
CREATE OR REPLACE FUNCTION update_layout_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER layout_templates_updated
    BEFORE UPDATE ON layout_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_layout_templates_timestamp();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create default style for a project
CREATE OR REPLACE FUNCTION get_or_create_default_publishing_style(p_project_id UUID)
RETURNS UUID AS $$
DECLARE
    v_style_id UUID;
BEGIN
    -- Try to get existing default
    SELECT id INTO v_style_id
    FROM publishing_styles
    WHERE project_id = p_project_id AND is_default = TRUE
    LIMIT 1;

    -- If no default, get any style
    IF v_style_id IS NULL THEN
        SELECT id INTO v_style_id
        FROM publishing_styles
        WHERE project_id = p_project_id
        ORDER BY created_at
        LIMIT 1;
    END IF;

    -- If no styles at all, create default
    IF v_style_id IS NULL THEN
        INSERT INTO publishing_styles (project_id, name, is_default)
        VALUES (p_project_id, 'Default Style', TRUE)
        RETURNING id INTO v_style_id;
    END IF;

    RETURN v_style_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get default layout template for a user and template type
CREATE OR REPLACE FUNCTION get_default_layout_template(p_user_id UUID, p_template_type TEXT)
RETURNS UUID AS $$
DECLARE
    v_template_id UUID;
BEGIN
    -- Try to get default for this type
    SELECT id INTO v_template_id
    FROM layout_templates
    WHERE user_id = p_user_id
    AND template_type = p_template_type
    AND is_default = TRUE
    LIMIT 1;

    -- If no default, get any template of this type
    IF v_template_id IS NULL THEN
        SELECT id INTO v_template_id
        FROM layout_templates
        WHERE user_id = p_user_id AND template_type = p_template_type
        ORDER BY created_at
        LIMIT 1;
    END IF;

    RETURN v_template_id;  -- May be NULL if user has no saved templates
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE publishing_styles IS 'Brand styling configurations for styled content publishing';
COMMENT ON TABLE layout_templates IS 'User-specific layout templates for content type styling';

COMMENT ON COLUMN publishing_styles.design_tokens IS 'Full design token configuration (colors, fonts, spacing, etc.)';
COMMENT ON COLUMN publishing_styles.source_url IS 'URL used for automatic brand detection (future feature)';
COMMENT ON COLUMN layout_templates.template_type IS 'Content type: blog-article, landing-page, ecommerce-product, ecommerce-category, service-page';
COMMENT ON COLUMN layout_templates.layout_config IS 'Component configuration including toggles, positions, and styles';
