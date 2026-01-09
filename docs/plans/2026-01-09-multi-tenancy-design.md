# Multi-Tenancy, RBAC, and Billing System Design

**Date:** 2026-01-09
**Status:** Approved
**Author:** Claude Code + User Collaboration

---

## Overview

This document describes the architecture for implementing multi-tenancy, role-based access control (RBAC), and multi-level billing in the CutTheCrap content generation platform.

### Key Requirements

1. Projects attachable to multiple users across organizations
2. Different authorization levels/roles with feature gating
3. External collaborators from different organizations
4. Multi-level billing (organization subscriptions + usage-based)
5. BYOK (Bring Your Own Keys) support with separate billing
6. Cost tracking at project/map level for client invoicing
7. Module-based feature unlocking
8. Configurable cost visibility per organization

---

## Section 1: Core Entity Model

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                  │
│  (auth.users - Supabase Auth)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ belongs to (many-to-many)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORGANIZATION                              │
│  - Personal (implicit, 1:1 with user)                       │
│  - Team (explicit, multiple users)                          │
│  - Enterprise (advanced features)                           │
│                                                             │
│  Has: API Keys, Subscriptions, Billing Settings             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ owns (one-to-many)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PROJECT                                 │
│  - Inherits org API keys OR has own                         │
│  - Can invite external collaborators                        │
│  - Tracks costs per-project                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ contains (one-to-many)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TOPICAL MAP                               │
│  - Can override project API keys                            │
│  - Granular cost tracking                                   │
│  - Usage thresholds (future)                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Relationships

- **User ↔ Organization**: Many-to-many via `organization_members`
- **Organization → Project**: One-to-many ownership
- **Project ↔ User**: Many-to-many via `project_members` (for external collaborators)
- **Project → Topical Map**: One-to-many containment

---

## Section 2: Organization Tables

### organizations

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly identifier
  type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'team', 'enterprise')),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  settings JSONB DEFAULT '{}',
  billing_email TEXT,
  stripe_customer_id TEXT,  -- For subscription management
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cost visibility configuration
  cost_visibility JSONB DEFAULT '{
    "admin_sees_all": true,
    "editor_sees_own": true,
    "viewer_sees_none": true,
    "external_can_see": false,
    "breakdown_level": "summary"
  }'
);

-- Personal orgs are auto-created, slug = user_id
CREATE UNIQUE INDEX idx_personal_org ON organizations(owner_id) WHERE type = 'personal';
```

### organization_members

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),

  -- Granular permission overrides (expand/restrict from base role)
  permission_overrides JSONB DEFAULT '{}',
  -- Example: {"can_manage_billing": true, "can_delete_projects": false}

  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,  -- NULL = pending invitation

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

### organization_api_keys

```sql
CREATE TABLE organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'anthropic', 'openai', 'gemini', etc.
  encrypted_key TEXT NOT NULL,  -- Encrypted with Supabase Vault
  key_source TEXT DEFAULT 'platform' CHECK (key_source IN ('platform', 'byok')),
  is_active BOOLEAN DEFAULT true,

  -- Usage tracking for billing
  usage_this_month JSONB DEFAULT '{"tokens": 0, "requests": 0, "cost_usd": 0}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, provider)
);
```

---

## Section 3: Project-Level Tables

### project_members (External Collaborators)

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role for THIS project (independent of org role)
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  permission_overrides JSONB DEFAULT '{}',

  -- Source tracking
  source TEXT DEFAULT 'direct' CHECK (source IN ('org_member', 'direct', 'invitation')),

  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  UNIQUE(project_id, user_id)
);
```

### project_api_keys (Optional Overrides)

```sql
CREATE TABLE project_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT,  -- NULL = inherit from org
  key_source TEXT CHECK (key_source IN ('inherit', 'byok')),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, provider)
);
```

### projects table modifications

```sql
ALTER TABLE projects
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN api_key_mode TEXT DEFAULT 'inherit'
    CHECK (api_key_mode IN ('inherit', 'project_specific', 'prompt_user'));
```

---

## Section 4: Row Level Security (RLS)

### Helper Functions

```sql
-- Check if user is member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user's role in an organization
CREATE OR REPLACE FUNCTION get_org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has access to a project (via org OR direct membership)
CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Access via organization membership
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
  ) OR EXISTS (
    -- Direct project membership (external collaborators)
    SELECT 1 FROM project_members
    WHERE project_id = proj_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get effective role for a project
CREATE OR REPLACE FUNCTION get_project_role(proj_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    -- Direct project role takes precedence
    (SELECT role FROM project_members
     WHERE project_id = proj_id AND user_id = auth.uid() AND accepted_at IS NOT NULL),
    -- Fall back to org role
    (SELECT om.role FROM projects p
     JOIN organization_members om ON om.organization_id = p.organization_id
     WHERE p.id = proj_id AND om.user_id = auth.uid() AND om.accepted_at IS NOT NULL)
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### RLS Policies

```sql
-- Organizations: See orgs you're a member of
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id) OR owner_id = auth.uid());

CREATE POLICY "Owners and admins can update organization"
  ON organizations FOR UPDATE
  USING (get_org_role(id) IN ('owner', 'admin'));

-- Projects: Access via org membership OR direct project membership
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible projects"
  ON projects FOR SELECT
  USING (has_project_access(id));

CREATE POLICY "Editors+ can update projects"
  ON projects FOR UPDATE
  USING (get_project_role(id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Admins+ can delete projects"
  ON projects FOR DELETE
  USING (get_project_role(id) IN ('owner', 'admin'));

-- Topical Maps: Inherit from project access
ALTER TABLE topical_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maps in accessible projects"
  ON topical_maps FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Editors+ can modify maps"
  ON topical_maps FOR ALL
  USING (get_project_role(project_id) IN ('owner', 'admin', 'editor'));
```

---

## Section 5: Modules & Subscription System

### modules

```sql
CREATE TABLE modules (
  id TEXT PRIMARY KEY,  -- 'core', 'advanced_seo', 'competitor_analysis', etc.
  name TEXT NOT NULL,
  description TEXT,
  base_price_monthly DECIMAL(10,2),

  -- Features this module unlocks
  features JSONB NOT NULL,
  -- Example: ["content_generation", "flow_validation", "schema_generation"]

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO modules (id, name, base_price_monthly, features) VALUES
  ('core', 'Core Platform', 0, '["project_management", "topical_maps", "basic_briefs"]'),
  ('content_gen', 'Content Generation', 49, '["content_generation", "10_pass_system", "audit"]'),
  ('advanced_seo', 'Advanced SEO', 29, '["competitor_analysis", "serp_tracking", "gap_analysis"]'),
  ('enterprise', 'Enterprise', 199, '["api_access", "webhooks", "sso", "audit_logs"]');
```

### organization_subscriptions

```sql
CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id),

  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'professional', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),

  -- Stripe integration
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Usage limits (NULL = unlimited)
  usage_limits JSONB DEFAULT '{}',
  -- Example: {"monthly_generations": 100, "monthly_tokens": 1000000}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);
```

### role_module_access

```sql
CREATE TABLE role_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'admin', 'editor', 'viewer'
  module_id TEXT REFERENCES modules(id),

  is_allowed BOOLEAN DEFAULT true,

  UNIQUE(organization_id, role, module_id)
);

-- Default: All modules allowed for all roles (org configures restrictions)
```

### Feature Check Function

```sql
CREATE OR REPLACE FUNCTION can_use_feature(
  p_user_id UUID,
  p_organization_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_module_id TEXT;
BEGIN
  -- Get user's role in org
  SELECT role INTO v_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND accepted_at IS NOT NULL;

  IF v_role IS NULL THEN RETURN FALSE; END IF;

  -- Find which module provides this feature
  SELECT id INTO v_module_id
  FROM modules
  WHERE features ? p_feature
    AND is_active = true
  LIMIT 1;

  IF v_module_id IS NULL THEN RETURN FALSE; END IF;

  -- Check org has active subscription to this module
  IF NOT EXISTS (
    SELECT 1 FROM organization_subscriptions
    WHERE organization_id = p_organization_id
      AND module_id = v_module_id
      AND status = 'active'
  ) THEN RETURN FALSE; END IF;

  -- Check role is allowed to use this module
  IF EXISTS (
    SELECT 1 FROM role_module_access
    WHERE organization_id = p_organization_id
      AND role = v_role
      AND module_id = v_module_id
      AND is_allowed = false
  ) THEN RETURN FALSE; END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Section 6: API Key Hierarchy & Billing Attribution

### Key Resolution Function

```sql
CREATE OR REPLACE FUNCTION resolve_api_key(
  p_project_id UUID,
  p_map_id UUID,
  p_provider TEXT
)
RETURNS TABLE (
  key_source TEXT,
  encrypted_key TEXT,
  billable_to TEXT,
  billable_id UUID
) AS $$
BEGIN
  -- Priority 1: Map-specific BYOK (if exists and project allows)
  -- Priority 2: Project-specific BYOK
  -- Priority 3: Organization key
  -- Priority 4: Platform key (charged to org)

  RETURN QUERY
  WITH project_info AS (
    SELECT p.id, p.organization_id, p.api_key_mode
    FROM projects p WHERE p.id = p_project_id
  )
  SELECT
    CASE
      WHEN pak.key_source = 'byok' THEN 'project_byok'
      WHEN oak.key_source = 'byok' THEN 'org_byok'
      WHEN oak.key_source = 'platform' THEN 'platform'
      ELSE 'platform'
    END as key_source,
    COALESCE(pak.encrypted_key, oak.encrypted_key) as encrypted_key,
    CASE
      WHEN pak.key_source = 'byok' THEN 'project'
      WHEN oak.key_source = 'byok' THEN 'organization'
      ELSE 'platform'
    END as billable_to,
    CASE
      WHEN pak.key_source = 'byok' THEN p_project_id
      ELSE pi.organization_id
    END as billable_id
  FROM project_info pi
  LEFT JOIN project_api_keys pak
    ON pak.project_id = pi.id AND pak.provider = p_provider AND pak.is_active
  LEFT JOIN organization_api_keys oak
    ON oak.organization_id = pi.organization_id AND oak.provider = p_provider AND oak.is_active
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ai_usage_logs table modifications

```sql
ALTER TABLE ai_usage_logs
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN key_source TEXT,  -- 'platform', 'org_byok', 'project_byok'
  ADD COLUMN billable_to TEXT,  -- 'platform', 'organization', 'project'
  ADD COLUMN billable_id UUID,  -- ID of entity responsible for cost
  ADD COLUMN cost_usd DECIMAL(10,6);  -- Calculated cost
```

### Billing Attribution Logic

```typescript
// In AI service layer, BEFORE making API call:
async function getApiKeyWithBilling(projectId: string, mapId: string, provider: string) {
  const { data } = await supabase.rpc('resolve_api_key', {
    p_project_id: projectId,
    p_map_id: mapId,
    p_provider: provider
  });

  return {
    key: decrypt(data.encrypted_key),
    billing: {
      source: data.key_source,
      billableTo: data.billable_to,
      billableId: data.billable_id
    }
  };
}

// AFTER API call, log with billing attribution:
await supabase.from('ai_usage_logs').insert({
  ...usageData,
  organization_id: billing.billableId,
  key_source: billing.source,
  billable_to: billing.billableTo,
  billable_id: billing.billableId,
  cost_usd: calculateCost(tokens, provider)
});
```

---

## Section 7: Cost Visibility & Reporting

### cost_reports materialized view

```sql
CREATE MATERIALIZED VIEW cost_reports AS
SELECT
  organization_id,
  project_id,
  map_id,
  DATE_TRUNC('day', created_at) as date,
  DATE_TRUNC('month', created_at) as month,
  provider,
  key_source,
  billable_to,

  -- Aggregated metrics
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_usd) as total_cost_usd,

  -- Breakdown by operation
  operation_type,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests

FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9;

-- Refresh daily via cron
CREATE INDEX idx_cost_reports_org ON cost_reports(organization_id, month);
CREATE INDEX idx_cost_reports_project ON cost_reports(project_id, month);
```

### Cost Visibility RLS

```sql
CREATE OR REPLACE FUNCTION can_view_costs(
  p_organization_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_visibility JSONB;
BEGIN
  -- Get user's role and org visibility settings
  SELECT om.role, o.cost_visibility
  INTO v_role, v_visibility
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.organization_id = p_organization_id
    AND om.user_id = auth.uid()
    AND om.accepted_at IS NOT NULL;

  -- Check based on role
  IF v_role IN ('owner', 'admin') THEN
    RETURN (v_visibility->>'admin_sees_all')::boolean;
  ELSIF v_role = 'editor' THEN
    RETURN (v_visibility->>'editor_sees_own')::boolean;
  ELSIF v_role = 'viewer' THEN
    RETURN NOT (v_visibility->>'viewer_sees_none')::boolean;
  END IF;

  -- External collaborators
  IF p_project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  ) THEN
    RETURN (v_visibility->>'external_can_see')::boolean;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### API Endpoint for Cost Data

```typescript
// GET /api/costs?org_id=...&project_id=...&period=month
async function getCostReport(req) {
  const { org_id, project_id, period } = req.query;

  // Check visibility permissions
  const canView = await supabase.rpc('can_view_costs', {
    p_organization_id: org_id,
    p_project_id: project_id
  });

  if (!canView) throw new ForbiddenError();

  // Query materialized view with appropriate filters
  let query = supabase
    .from('cost_reports')
    .select('*')
    .eq('organization_id', org_id);

  if (project_id) query = query.eq('project_id', project_id);
  if (period === 'month') query = query.eq('month', startOfMonth(new Date()));

  return query;
}
```

---

## Section 8: Invitation System

### invitations table

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What type of invitation
  type TEXT NOT NULL CHECK (type IN ('organization', 'project')),

  -- Target (one will be set based on type)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Invitee
  email TEXT NOT NULL,
  role TEXT NOT NULL,  -- Role to assign upon acceptance

  -- Security
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Metadata
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT,  -- Optional personal message

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,

  -- Constraints
  CHECK (
    (type = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
    (type = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX idx_invitations_email ON invitations(email) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;
```

### Invitation Acceptance Flow

```typescript
// POST /api/invitations/accept
async function acceptInvitation(token: string, userId: string) {
  // 1. Validate token
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) throw new Error('Invalid or expired invitation');

  // 2. Create membership based on type
  if (invitation.type === 'organization') {
    await supabase.from('organization_members').insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      accepted_at: new Date().toISOString()
    });
  } else {
    await supabase.from('project_members').insert({
      project_id: invitation.project_id,
      user_id: userId,
      role: invitation.role,
      source: 'invitation',
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      accepted_at: new Date().toISOString()
    });
  }

  // 3. Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return { success: true, type: invitation.type };
}
```

### Email Notification (Edge Function)

```typescript
// supabase/functions/send-invitation/index.ts
Deno.serve(async (req) => {
  const { invitationId } = await req.json();

  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, inviter:invited_by(email, raw_user_meta_data)')
    .eq('id', invitationId)
    .single();

  const acceptUrl = `${APP_URL}/accept-invite?token=${invitation.token}`;

  await sendEmail({
    to: invitation.email,
    subject: `You've been invited to collaborate`,
    html: `
      <p>${invitation.inviter.raw_user_meta_data.name} invited you to join
         ${invitation.type === 'organization' ? 'their organization' : 'a project'}.</p>
      <p>Role: ${invitation.role}</p>
      ${invitation.message ? `<p>Message: ${invitation.message}</p>` : ''}
      <a href="${acceptUrl}">Accept Invitation</a>
      <p>This invitation expires in 7 days.</p>
    `
  });
});
```

---

## Section 9: Migration Plan

### Phase 1: Create Tables (Non-Breaking)

```sql
-- Run as migration: 20260109_multi_tenancy_tables.sql

-- 1. Create all new tables
CREATE TABLE organizations (...);
CREATE TABLE organization_members (...);
CREATE TABLE organization_api_keys (...);
CREATE TABLE project_members (...);
CREATE TABLE project_api_keys (...);
CREATE TABLE modules (...);
CREATE TABLE organization_subscriptions (...);
CREATE TABLE role_module_access (...);
CREATE TABLE invitations (...);

-- 2. Add new columns to existing tables (nullable for now)
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE ai_usage_logs ADD COLUMN organization_id UUID;
-- etc.

-- 3. Create helper functions
CREATE FUNCTION is_org_member(...);
CREATE FUNCTION has_project_access(...);
-- etc.
```

### Phase 2: Data Migration

```sql
-- Run as migration: 20260109_migrate_to_orgs.sql

-- 1. Create personal organization for each user
INSERT INTO organizations (name, slug, type, owner_id)
SELECT
  COALESCE(raw_user_meta_data->>'name', email) || '''s Workspace',
  id::text,  -- Use user_id as slug for personal orgs
  'personal',
  id
FROM auth.users;

-- 2. Add users as owners of their personal orgs
INSERT INTO organization_members (organization_id, user_id, role, accepted_at)
SELECT o.id, o.owner_id, 'owner', NOW()
FROM organizations o WHERE o.type = 'personal';

-- 3. Migrate projects to organizations
UPDATE projects p
SET organization_id = o.id
FROM organizations o
WHERE o.owner_id = p.user_id AND o.type = 'personal';

-- 4. Migrate API keys from user_settings to organization_api_keys
INSERT INTO organization_api_keys (organization_id, provider, encrypted_key, key_source)
SELECT
  o.id,
  key,
  value,
  'byok'
FROM user_settings us
CROSS JOIN LATERAL jsonb_each_text(us.api_keys) AS kv(key, value)
JOIN organizations o ON o.owner_id = us.user_id
WHERE us.api_keys IS NOT NULL AND us.api_keys != '{}';

-- 5. Give all existing users 'core' module subscription
INSERT INTO organization_subscriptions (organization_id, module_id, status)
SELECT id, 'core', 'active' FROM organizations;
```

### Phase 3: Enable New RLS Policies

```sql
-- Run as migration: 20260109_enable_new_rls.sql

-- 1. Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can modify own projects" ON projects;

-- 2. Create new policies
CREATE POLICY "Users can view accessible projects" ON projects ...;
CREATE POLICY "Editors+ can update projects" ON projects ...;

-- 3. Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
-- etc.
```

### Phase 4: Cleanup (After 30-Day Validation)

```sql
-- Run manually after validation period

-- 1. Remove old user_id columns (after verifying no code references)
ALTER TABLE projects DROP COLUMN user_id;
ALTER TABLE topical_maps DROP COLUMN user_id;

-- 2. Make organization_id NOT NULL
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;

-- 3. Remove old api_keys from user_settings
ALTER TABLE user_settings DROP COLUMN api_keys;
```

---

## Section 10: Frontend Architecture Changes

### New State Structure

```typescript
// state/appState.ts - Updated shape
interface AppState {
  // NEW: Current context
  currentOrganization: Organization | null;
  currentProject: Project | null;
  currentMap: TopicalMap | null;

  // NEW: User's memberships
  organizations: Organization[];
  organizationMemberships: OrganizationMember[];

  // NEW: Permissions (derived from role + overrides)
  permissions: {
    canManageBilling: boolean;
    canInviteMembers: boolean;
    canDeleteProjects: boolean;
    canUseContentGeneration: boolean;
    // ... feature flags
  };

  // Existing (scoped to current context)
  projects: Project[];
  maps: TopicalMap[];
  topics: Topic[];
  // ...
}
```

### New Hooks

```typescript
// hooks/useOrganization.ts
export function useOrganization() {
  const { state, dispatch } = useAppState();

  return {
    current: state.currentOrganization,
    all: state.organizations,
    membership: state.organizationMemberships.find(
      m => m.organization_id === state.currentOrganization?.id
    ),
    switch: (orgId: string) => dispatch({ type: 'SET_ORGANIZATION', payload: orgId }),
    // ...
  };
}

// hooks/usePermissions.ts
export function usePermissions() {
  const { state } = useAppState();

  const can = useCallback((action: string) => {
    return state.permissions[action] ?? false;
  }, [state.permissions]);

  return { can, permissions: state.permissions };
}

// hooks/useFeatureGate.ts
export function useFeatureGate(feature: string) {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check module subscription + role access
    checkFeatureAccess(feature).then(setLoading(false));
  }, [feature]);

  return {
    enabled: can(`use_${feature}`),
    loading,
    UpgradePrompt: () => <ModuleUpgradeModal feature={feature} />
  };
}
```

### UI Components

```typescript
// components/OrganizationSwitcher.tsx
export function OrganizationSwitcher() {
  const { current, all, switch: switchOrg } = useOrganization();

  return (
    <Dropdown>
      <DropdownTrigger>
        {current?.name} <ChevronDown />
      </DropdownTrigger>
      <DropdownContent>
        {all.map(org => (
          <DropdownItem key={org.id} onClick={() => switchOrg(org.id)}>
            {org.name}
            {org.type === 'personal' && <Badge>Personal</Badge>}
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem onClick={createNewOrg}>
          <Plus /> Create Organization
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

// components/FeatureGate.tsx
export function FeatureGate({ feature, children, fallback }) {
  const { enabled, loading, UpgradePrompt } = useFeatureGate(feature);

  if (loading) return <Skeleton />;
  if (!enabled) return fallback ?? <UpgradePrompt />;
  return children;
}

// Usage:
<FeatureGate feature="content_generation">
  <ContentGenerationPanel />
</FeatureGate>
```

### API Key Selection UI

```typescript
// components/settings/ApiKeySelector.tsx
export function ApiKeySelector({ projectId, provider }) {
  const [mode, setMode] = useState<'inherit' | 'byok' | 'prompt'>('inherit');
  const { current: org } = useOrganization();

  return (
    <RadioGroup value={mode} onChange={setMode}>
      <Radio value="inherit">
        Use organization key
        {org.apiKeys[provider] && <Badge color="green">Configured</Badge>}
      </Radio>
      <Radio value="byok">
        Use project-specific key
        <Input type="password" placeholder="Enter API key" />
      </Radio>
      <Radio value="prompt">
        Ask me each time (for testing different keys)
      </Radio>
    </RadioGroup>
  );
}
```

### Cost Dashboard

```typescript
// components/billing/CostDashboard.tsx
export function CostDashboard() {
  const { can } = usePermissions();
  const { current: org } = useOrganization();
  const [costs, setCosts] = useState(null);

  if (!can('view_costs')) {
    return <AccessDenied message="You don't have permission to view costs" />;
  }

  return (
    <div>
      <MonthSelector />
      <CostSummaryCards data={costs?.summary} />

      <Tabs>
        <Tab label="By Project">
          <ProjectCostTable data={costs?.byProject} />
        </Tab>
        <Tab label="By Provider">
          <ProviderCostChart data={costs?.byProvider} />
        </Tab>
        <Tab label="Usage Log">
          <UsageLogTable data={costs?.logs} />
        </Tab>
      </Tabs>

      {can('export_costs') && (
        <Button onClick={exportToCsv}>Export for Invoicing</Button>
      )}
    </div>
  );
}
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. Database tables and migrations
2. Auto-create personal organizations for existing users
3. Basic RLS policies
4. Organization switcher UI

### Phase 2: Collaboration (Week 3-4)
5. Invitation system
6. Project member management
7. Role-based UI restrictions

### Phase 3: Billing (Week 5-6)
8. Module system
9. API key hierarchy
10. Cost tracking and reporting

### Phase 4: Polish (Week 7-8)
11. Cost visibility configuration
12. Export features
13. Testing and bug fixes

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Data migration success rate | 100% |
| RLS policy coverage | All tables |
| Feature gate compliance | No unauthorized access |
| Cost attribution accuracy | 100% of API calls logged |
| Invitation acceptance rate | Track for UX improvements |

---

## Appendix: Role Permissions Matrix

| Permission | Owner | Admin | Editor | Viewer |
|------------|-------|-------|--------|--------|
| View projects | ✅ | ✅ | ✅ | ✅ |
| Create projects | ✅ | ✅ | ✅ | ❌ |
| Delete projects | ✅ | ✅ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ✅* | ❌ | ❌ |
| View costs | ✅ | ✅ | Config | Config |
| Configure API keys | ✅ | ✅ | ❌ | ❌ |
| Use content generation | ✅ | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ✅ | ❌ |

*Admin billing access configurable per organization
