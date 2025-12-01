-- Linking Audit Tables
-- Stores multi-pass linking audit results and fix history for the Internal Linking System

-- Main audit results table
CREATE TABLE IF NOT EXISTS linking_audit_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Pass results stored as JSONB for flexibility
  pass_results JSONB NOT NULL DEFAULT '{}',

  -- Summary metrics
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  auto_fixable_count INTEGER DEFAULT 0,
  total_issues_count INTEGER DEFAULT 0,
  critical_issues_count INTEGER DEFAULT 0,

  -- Pass-specific scores
  fundamentals_score INTEGER CHECK (fundamentals_score >= 0 AND fundamentals_score <= 100),
  navigation_score INTEGER CHECK (navigation_score >= 0 AND navigation_score <= 100),
  flow_direction_score INTEGER CHECK (flow_direction_score >= 0 AND flow_direction_score <= 100),
  external_score INTEGER CHECK (external_score >= 0 AND external_score <= 100),

  -- Metadata
  rules_snapshot JSONB, -- Snapshot of rules used for this audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix history for undo capability
CREATE TABLE IF NOT EXISTS linking_fix_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES linking_audit_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Fix identification
  issue_id TEXT NOT NULL,
  fix_type TEXT NOT NULL CHECK (fix_type IN ('add_link', 'remove_link', 'update_anchor', 'add_bridge', 'reposition_link', 'add_nav_link')),

  -- Target details
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  field TEXT NOT NULL,

  -- Change tracking for undo
  old_value JSONB,
  new_value JSONB,

  -- Fix metadata
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  required_ai BOOLEAN DEFAULT false,
  description TEXT,

  -- Status tracking
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  undone_at TIMESTAMP WITH TIME ZONE,
  undone_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_linking_audit_results_map_id ON linking_audit_results(map_id);
CREATE INDEX IF NOT EXISTS idx_linking_audit_results_user_id ON linking_audit_results(user_id);
CREATE INDEX IF NOT EXISTS idx_linking_audit_results_created_at ON linking_audit_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linking_fix_history_audit_id ON linking_fix_history(audit_id);
CREATE INDEX IF NOT EXISTS idx_linking_fix_history_user_id ON linking_fix_history(user_id);
CREATE INDEX IF NOT EXISTS idx_linking_fix_history_target ON linking_fix_history(target_table, target_id);

-- Row Level Security
ALTER TABLE linking_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE linking_fix_history ENABLE ROW LEVEL SECURITY;

-- Policies for linking_audit_results
CREATE POLICY "Users can view their own audit results"
  ON linking_audit_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audit results"
  ON linking_audit_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audit results"
  ON linking_audit_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audit results"
  ON linking_audit_results FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for linking_fix_history
CREATE POLICY "Users can view their own fix history"
  ON linking_fix_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fix history"
  ON linking_fix_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fix history"
  ON linking_fix_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_linking_audit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_linking_audit_timestamp
  BEFORE UPDATE ON linking_audit_results
  FOR EACH ROW
  EXECUTE FUNCTION update_linking_audit_timestamp();
