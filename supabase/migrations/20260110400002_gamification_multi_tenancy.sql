-- supabase/migrations/20260110400002_gamification_multi_tenancy.sql
-- Gamification organization scope (Phase 4)

-- Organization-level scores (aggregated from members)
CREATE TABLE IF NOT EXISTS organization_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Aggregated metrics
  total_score INT DEFAULT 0,
  total_articles_generated INT DEFAULT 0,
  total_high_quality_articles INT DEFAULT 0,  -- audit_score >= 80
  avg_audit_score DECIMAL(5,2),

  -- Leaderboard position (updated by cron/trigger)
  global_rank INT,

  -- Time-boxed scores
  score_this_week INT DEFAULT 0,
  score_this_month INT DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

CREATE INDEX idx_org_scores_rank ON organization_scores(global_rank) WHERE global_rank IS NOT NULL;
CREATE INDEX idx_org_scores_total ON organization_scores(total_score DESC);

ALTER TABLE organization_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view org scores"
  ON organization_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update org scores"
  ON organization_scores FOR ALL
  TO service_role
  USING (true);

-- Organization achievements
CREATE TABLE IF NOT EXISTS organization_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,  -- 'first_100_articles', 'quality_streak_10', etc.
  achievement_name TEXT,
  achievement_description TEXT,
  points_awarded INT DEFAULT 0,
  earned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, achievement_id)
);

CREATE INDEX idx_org_achievements_org ON organization_achievements(organization_id);

ALTER TABLE organization_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view org achievements"
  ON organization_achievements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage org achievements"
  ON organization_achievements FOR ALL
  TO service_role
  USING (true);

-- Weekly/Monthly leaderboard snapshots
CREATE TABLE IF NOT EXISTS organization_leaderboard_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month')),
  period_start DATE NOT NULL,
  rank INT NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, period_type, period_start)
);

CREATE INDEX idx_org_leaderboard_period ON organization_leaderboard_history(period_type, period_start, rank);

ALTER TABLE organization_leaderboard_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard history"
  ON organization_leaderboard_history FOR SELECT
  TO authenticated
  USING (true);

-- Initialize organization_scores for all existing organizations
INSERT INTO organization_scores (organization_id)
SELECT id FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM organization_scores os WHERE os.organization_id = organizations.id
);

-- Function to recalculate organization scores
CREATE OR REPLACE FUNCTION recalculate_organization_scores(p_org_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE organization_scores os
  SET
    total_articles_generated = (
      SELECT COUNT(*)
      FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cb.id = cgj.content_brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE p.organization_id = os.organization_id
        AND cgj.status = 'completed'
    ),
    total_high_quality_articles = (
      SELECT COUNT(*)
      FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cb.id = cgj.content_brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE p.organization_id = os.organization_id
        AND cgj.status = 'completed'
        AND cgj.audit_score >= 80
    ),
    avg_audit_score = (
      SELECT ROUND(AVG(cgj.audit_score)::numeric, 2)
      FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cb.id = cgj.content_brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE p.organization_id = os.organization_id
        AND cgj.audit_score IS NOT NULL
    ),
    -- Calculate total score: articles * 10 + high quality bonus * 5
    total_score = (
      SELECT COALESCE(COUNT(*) * 10 + COUNT(*) FILTER (WHERE cgj.audit_score >= 80) * 5, 0)
      FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cb.id = cgj.content_brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE p.organization_id = os.organization_id
        AND cgj.status = 'completed'
    ),
    updated_at = NOW()
  WHERE (p_org_id IS NULL OR os.organization_id = p_org_id);

  -- Update global ranks
  WITH ranked AS (
    SELECT organization_id, ROW_NUMBER() OVER (ORDER BY total_score DESC) as new_rank
    FROM organization_scores
    WHERE total_score > 0
  )
  UPDATE organization_scores os
  SET global_rank = r.new_rank
  FROM ranked r
  WHERE os.organization_id = r.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update org scores when content is generated
CREATE OR REPLACE FUNCTION update_org_scores_on_generation()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization_id from the content brief's project
  SELECT p.organization_id INTO v_org_id
  FROM content_briefs cb
  JOIN topics t ON t.id = cb.topic_id
  JOIN topical_maps tm ON tm.id = t.map_id
  JOIN projects p ON p.id = tm.project_id
  WHERE cb.id = NEW.content_brief_id;

  IF v_org_id IS NOT NULL THEN
    PERFORM recalculate_organization_scores(v_org_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_org_scores_on_generation ON content_generation_jobs;

CREATE TRIGGER tr_update_org_scores_on_generation
  AFTER INSERT OR UPDATE OF status, audit_score ON content_generation_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_org_scores_on_generation();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION recalculate_organization_scores TO authenticated;
