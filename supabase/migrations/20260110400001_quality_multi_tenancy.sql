-- supabase/migrations/20260110400001_quality_multi_tenancy.sql
-- Quality enforcement multi-tenancy updates (Phase 4)

-- Add organization_id to quality_analytics_daily
ALTER TABLE quality_analytics_daily
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_quality_analytics_org ON quality_analytics_daily(organization_id);

-- Backfill organization_id
UPDATE quality_analytics_daily qad
SET organization_id = p.organization_id
FROM content_briefs cb
JOIN topics t ON t.id = cb.topic_id
JOIN topical_maps tm ON tm.id = t.map_id
JOIN projects p ON p.id = tm.project_id
WHERE qad.content_brief_id = cb.id
  AND qad.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view own analytics" ON quality_analytics_daily;

CREATE POLICY "Org members can view quality analytics"
  ON quality_analytics_daily FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- Create organization_quality_settings table for custom thresholds
CREATE TABLE IF NOT EXISTS organization_quality_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Override default thresholds
  min_word_count INT,
  max_word_count INT,
  min_heading_ratio DECIMAL(3,2),
  min_paragraph_length INT,
  max_consecutive_short_paragraphs INT,
  min_audit_score INT DEFAULT 70,

  -- Custom rules (JSONB for flexibility)
  custom_rules JSONB DEFAULT '[]',

  -- Feature toggles
  enforce_on_publish BOOLEAN DEFAULT FALSE,
  auto_reject_below_threshold BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

ALTER TABLE organization_quality_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view quality settings"
  ON organization_quality_settings FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "Admins can manage quality settings"
  ON organization_quality_settings FOR ALL
  TO authenticated
  USING (get_org_role(organization_id) IN ('owner', 'admin'));

-- Create organization quality metrics view
CREATE OR REPLACE VIEW organization_quality_metrics AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT cb.id) as total_briefs,
  COUNT(DISTINCT cgj.id) as total_generations,
  COUNT(DISTINCT cgj.id) FILTER (WHERE cgj.status = 'completed') as completed_generations,
  ROUND(AVG(cgj.audit_score)::numeric, 2) as avg_audit_score,
  ROUND(AVG(qad.overall_score)::numeric, 2) as avg_quality_score,
  COUNT(*) FILTER (WHERE cgj.audit_score >= 80) as high_quality_count,
  COUNT(*) FILTER (WHERE cgj.audit_score < 60) as low_quality_count
FROM organizations o
LEFT JOIN projects p ON p.organization_id = o.id
LEFT JOIN topical_maps tm ON tm.project_id = p.id
LEFT JOIN topics t ON t.map_id = tm.id
LEFT JOIN content_briefs cb ON cb.topic_id = t.id
LEFT JOIN content_generation_jobs cgj ON cgj.content_brief_id = cb.id
LEFT JOIN quality_analytics_daily qad ON qad.content_brief_id = cb.id
GROUP BY o.id, o.name;

-- Grant access to the view
GRANT SELECT ON organization_quality_metrics TO authenticated;
