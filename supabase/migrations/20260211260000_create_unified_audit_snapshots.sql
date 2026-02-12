-- Unified Audit Snapshots
-- Stores audit results over time for tracking improvement trajectory
-- and correlating with GSC/GA4 performance data.

CREATE TABLE IF NOT EXISTS unified_audit_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('internal', 'external', 'published')),

  overall_score NUMERIC(5,2) NOT NULL,
  phase_scores JSONB NOT NULL DEFAULT '{}',

  findings_count_critical INT NOT NULL DEFAULT 0,
  findings_count_high INT NOT NULL DEFAULT 0,
  findings_count_medium INT NOT NULL DEFAULT 0,
  findings_count_low INT NOT NULL DEFAULT 0,

  full_report JSONB,

  -- Performance data at time of audit
  gsc_clicks INT,
  gsc_impressions INT,
  gsc_ctr NUMERIC(5,4),
  gsc_position NUMERIC(5,2),
  ga4_pageviews INT,
  ga4_bounce_rate NUMERIC(5,4),

  language TEXT NOT NULL DEFAULT 'en',
  version INT NOT NULL DEFAULT 1,
  content_hash TEXT,
  weights_used JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_uas_project ON unified_audit_snapshots(project_id);
CREATE INDEX idx_uas_url ON unified_audit_snapshots(url);
CREATE INDEX idx_uas_created ON unified_audit_snapshots(created_at DESC);
CREATE INDEX idx_uas_topic ON unified_audit_snapshots(topic_id);
CREATE INDEX idx_uas_project_url ON unified_audit_snapshots(project_id, url, created_at DESC);

-- RLS
ALTER TABLE unified_audit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own audit snapshots"
  ON unified_audit_snapshots FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Audit Schedules (future-ready, execution deferred)
CREATE TABLE IF NOT EXISTS audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  alert_threshold NUMERIC(5,2) DEFAULT 70,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own audit schedules"
  ON audit_schedules FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE INDEX idx_audit_schedules_project ON audit_schedules(project_id);
CREATE INDEX idx_audit_schedules_next_run ON audit_schedules(next_run_at) WHERE is_active = true;
