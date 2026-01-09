-- supabase/migrations/20260110100005_organization_api_keys_table.sql
-- Organization-level API keys stored securely via Vault
--
-- Usage pattern:
--   INSERT: store_secret('org_<org_id>_<provider>', 'sk-xxx') returns vault_secret_id
--   SELECT: get_secret(vault_secret_id) returns decrypted key
--   UPDATE: rotate_secret(vault_secret_id, 'sk-new') rotates key in place

CREATE TABLE IF NOT EXISTS organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  vault_secret_id UUID NOT NULL,  -- Reference to vault.secrets, use get_secret() to decrypt
  key_source TEXT DEFAULT 'platform' CHECK (key_source IN ('platform', 'byok')),
  is_active BOOLEAN DEFAULT TRUE,
  usage_this_month JSONB DEFAULT '{"tokens": 0, "requests": 0, "cost_usd": 0}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(organization_id, provider)
);

CREATE INDEX idx_org_api_keys_org ON organization_api_keys(organization_id);
CREATE INDEX idx_org_api_keys_provider ON organization_api_keys(provider) WHERE is_active = TRUE;

CREATE TRIGGER tr_org_api_keys_updated_at
  BEFORE UPDATE ON organization_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

ALTER TABLE organization_api_keys ENABLE ROW LEVEL SECURITY;

-- Single policy covers SELECT, INSERT, UPDATE, DELETE for owners and admins
CREATE POLICY "Admins can manage org API keys"
  ON organization_api_keys FOR ALL
  TO authenticated
  USING (get_org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (get_org_role(organization_id) IN ('owner', 'admin'));
