-- supabase/migrations/20260110000002_feature_flags.sql
-- Feature flags for gradual rollout of multi-tenancy features

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Global toggle
  is_enabled BOOLEAN DEFAULT FALSE,

  -- Gradual rollout (0-100)
  rollout_percentage INT DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),

  -- Specific targeting (for testing)
  enabled_user_ids UUID[] DEFAULT '{}',
  enabled_org_ids UUID[] DEFAULT '{}',  -- Will be used after orgs exist

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);

-- RLS: Only admins can modify flags, all authenticated can read
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- Note: UPDATE/INSERT/DELETE policies will be added after admin role system exists

-- Helper function to check if a feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_flag_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_flag feature_flags;
BEGIN
  SELECT * INTO v_flag FROM feature_flags WHERE flag_key = p_flag_key;

  -- Flag doesn't exist = disabled
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Globally enabled
  IF v_flag.is_enabled THEN RETURN TRUE; END IF;

  -- Check user-specific enablement
  IF p_user_id IS NOT NULL AND p_user_id = ANY(v_flag.enabled_user_ids) THEN
    RETURN TRUE;
  END IF;

  -- Check org-specific enablement
  IF p_org_id IS NOT NULL AND p_org_id = ANY(v_flag.enabled_org_ids) THEN
    RETURN TRUE;
  END IF;

  -- Check percentage rollout (deterministic based on user_id)
  IF v_flag.rollout_percentage > 0 AND p_user_id IS NOT NULL THEN
    RETURN (abs(hashtext(p_user_id::text)) % 100) < v_flag.rollout_percentage;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Seed initial feature flags for multi-tenancy
INSERT INTO feature_flags (flag_key, description, is_enabled) VALUES
  ('multi_tenancy_enabled', 'Enable multi-tenancy features (org switcher, etc)', false),
  ('org_billing_enabled', 'Enable organization-level billing', false),
  ('external_collaborators_enabled', 'Allow inviting external collaborators to projects', false),
  ('vault_api_keys_enabled', 'Use Vault for API key storage instead of plaintext', false);
