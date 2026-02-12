-- Analytics accounts: stores OAuth tokens for Google/Bing accounts
-- Supports multiple accounts per user (personal + business)
CREATE TABLE IF NOT EXISTS analytics_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'bing')),
  account_email TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, account_email)
);

-- Analytics properties: links GSC/GA4 properties to projects
-- Supports multiple properties per project per service
CREATE TABLE IF NOT EXISTS analytics_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES analytics_accounts(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('gsc', 'ga4')),
  property_id TEXT NOT NULL,
  property_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, service, property_id)
);

-- Enable RLS
ALTER TABLE analytics_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_properties ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own accounts
CREATE POLICY "analytics_accounts_user_access" ON analytics_accounts
  FOR ALL USING (user_id = auth.uid());

-- RLS: users can only access properties in their projects
CREATE POLICY "analytics_properties_project_access" ON analytics_properties
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_analytics_accounts_user ON analytics_accounts(user_id);

-- Index for fast lookup by project and service
CREATE INDEX IF NOT EXISTS idx_analytics_properties_project ON analytics_properties(project_id, service);

-- Index for sync worker queries
CREATE INDEX IF NOT EXISTS idx_analytics_properties_sync ON analytics_properties(sync_enabled, last_synced_at)
  WHERE sync_enabled = true;
