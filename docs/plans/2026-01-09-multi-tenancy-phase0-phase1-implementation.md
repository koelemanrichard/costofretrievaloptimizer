# Multi-Tenancy Phase 0 & Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the foundation for multi-tenancy by creating core database tables, RLS helper functions, and auto-creating personal organizations for existing users.

**Architecture:** Phase 0 creates prerequisite infrastructure (Vault, feature flags, audit log, pricing rates). Phase 1 creates the organization entity model with RLS policies that enable organization-based access control while maintaining backward compatibility during migration.

**Tech Stack:** Supabase PostgreSQL, Supabase Vault extension, TypeScript, React Context

**Reference:** `docs/plans/2026-01-09-multi-tenancy-design.md` (Sections 1-4, 11-17)

**⚠️ Execution Strategy:** Execute in **batches of 3-4 tasks per session** to avoid context exhaustion. Start fresh session for each batch.

---

## Status Overview

| Batch | Tasks | Status |
|-------|-------|--------|
| Batch 1 | 0.1, 0.2, 0.3 | ✅ COMPLETE |
| Batch 2 | 0.4, 0.5, 0.6 | ✅ COMPLETE |
| Batch 3 | 1.1, 1.2, 1.3 | ✅ COMPLETE |
| Batch 4 | 1.4, 1.5, 1.6 | ✅ COMPLETE |
| Batch 5 | 1.7, 1.8, 1.9 | ✅ COMPLETE |
| Batch 6 | 1.10, 1.11, 1.12 | ✅ COMPLETE (1.10-1.11 done, 1.12 is manual step) |

---

## Batch 1: Pre-Implementation Setup (COMPLETE)

### Task 0.1: Enable Supabase Vault Extension ✅

**Status:** COMPLETE - Committed as `c40a16f`

**Files:**
- Created: `supabase/migrations/20260110000000_enable_vault.sql`

---

### Task 0.2: Create Vault Helper Functions ✅

**Status:** COMPLETE - Committed as `c40a16f`

**Files:**
- Created: `supabase/migrations/20260110000001_vault_helper_functions.sql`

---

### Task 0.3: Create Feature Flags Table ✅

**Status:** COMPLETE - Committed as `c40a16f`

**Files:**
- Created: `supabase/migrations/20260110000002_feature_flags.sql`

---

## Batch 2: Cost & Audit Infrastructure (COMPLETE)

### Task 0.4: Create AI Pricing Rates Table ✅

**Status:** COMPLETE - Migration `20260110000003_ai_pricing_rates.sql` applied

**Files:**
- Create: `supabase/migrations/20260110000003_ai_pricing_rates.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110000003_ai_pricing_rates.sql
-- AI provider pricing rates for accurate cost calculation

CREATE TABLE IF NOT EXISTS ai_pricing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_rate_per_1k DECIMAL(10,8) NOT NULL,
  output_rate_per_1k DECIMAL(10,8) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model, effective_from)
);

CREATE INDEX idx_pricing_lookup ON ai_pricing_rates(provider, model, effective_from DESC);

ALTER TABLE ai_pricing_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing rates"
  ON ai_pricing_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION calculate_ai_cost(
  p_provider TEXT,
  p_model TEXT,
  p_input_tokens INT,
  p_output_tokens INT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS DECIMAL(10,6) AS $$
DECLARE
  v_input_rate DECIMAL(10,8);
  v_output_rate DECIMAL(10,8);
BEGIN
  SELECT input_rate_per_1k, output_rate_per_1k
  INTO v_input_rate, v_output_rate
  FROM ai_pricing_rates
  WHERE provider = p_provider
    AND model = p_model
    AND effective_from <= p_timestamp::DATE
    AND (effective_to IS NULL OR effective_to >= p_timestamp::DATE)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_input_rate IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (p_input_tokens / 1000.0 * v_input_rate) +
         (p_output_tokens / 1000.0 * v_output_rate);
END;
$$ LANGUAGE plpgsql STABLE;

-- Seed current pricing
INSERT INTO ai_pricing_rates (provider, model, input_rate_per_1k, output_rate_per_1k, effective_from, notes) VALUES
  ('anthropic', 'claude-3-opus-20240229', 0.015, 0.075, '2024-02-29', 'Claude 3 Opus'),
  ('anthropic', 'claude-3-sonnet-20240229', 0.003, 0.015, '2024-02-29', 'Claude 3 Sonnet'),
  ('anthropic', 'claude-3-haiku-20240307', 0.00025, 0.00125, '2024-03-07', 'Claude 3 Haiku'),
  ('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015, '2024-10-22', 'Claude 3.5 Sonnet'),
  ('anthropic', 'claude-3-5-haiku-20241022', 0.001, 0.005, '2024-10-22', 'Claude 3.5 Haiku'),
  ('openai', 'gpt-4-turbo', 0.01, 0.03, '2024-04-01', 'GPT-4 Turbo'),
  ('openai', 'gpt-4o', 0.005, 0.015, '2024-05-13', 'GPT-4o'),
  ('openai', 'gpt-4o-mini', 0.00015, 0.0006, '2024-07-18', 'GPT-4o Mini'),
  ('google', 'gemini-1.5-pro', 0.00125, 0.005, '2024-05-01', 'Gemini 1.5 Pro'),
  ('google', 'gemini-1.5-flash', 0.000075, 0.0003, '2024-05-01', 'Gemini 1.5 Flash'),
  ('perplexity', 'llama-3.1-sonar-small-128k-online', 0.0002, 0.0002, '2024-07-01', 'Sonar Small'),
  ('perplexity', 'llama-3.1-sonar-large-128k-online', 0.001, 0.001, '2024-07-01', 'Sonar Large');
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify**

```sql
SELECT calculate_ai_cost('anthropic', 'claude-3-5-sonnet-20241022', 1000, 500);
-- Expected: 0.010500
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260110000003_ai_pricing_rates.sql
git commit -m "feat(db): add AI pricing rates table with cost calculation function"
```

---

### Task 0.5: Create Organization Audit Log Table ✅

**Status:** COMPLETE - Migration `20260110000004_organization_audit_log.sql` applied

**Files:**
- Create: `supabase/migrations/20260110000004_organization_audit_log.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110000004_organization_audit_log.sql
-- Audit log for tracking sensitive organization operations

CREATE TABLE IF NOT EXISTS organization_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_email TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org_time ON organization_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_actor ON organization_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_action ON organization_audit_log(action, created_at DESC);

ALTER TABLE organization_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON organization_audit_log
  FOR ALL TO service_role
  USING (true);
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110000004_organization_audit_log.sql
git commit -m "feat(db): add organization audit log table"
```

---

### Task 0.6: Add Cost Columns to AI Usage Logs ✅

**Status:** COMPLETE - Migration `20260110000005_ai_usage_logs_cost_columns.sql` applied

**Files:**
- Create: `supabase/migrations/20260110000005_ai_usage_logs_cost_columns.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110000005_ai_usage_logs_cost_columns.sql
-- Add cost tracking columns to ai_usage_logs

ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS key_source TEXT CHECK (key_source IN ('platform', 'org_byok', 'project_byok')),
  ADD COLUMN IF NOT EXISTS billable_to TEXT CHECK (billable_to IN ('platform', 'organization', 'project')),
  ADD COLUMN IF NOT EXISTS billable_id UUID,
  ADD COLUMN IF NOT EXISTS is_external_usage BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS organization_id UUID;

CREATE OR REPLACE FUNCTION calculate_usage_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cost_usd IS NULL AND NEW.input_tokens IS NOT NULL AND NEW.output_tokens IS NOT NULL THEN
    NEW.cost_usd := calculate_ai_cost(
      NEW.provider,
      NEW.model,
      NEW.input_tokens,
      NEW.output_tokens,
      COALESCE(NEW.created_at, NOW())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calculate_usage_cost ON ai_usage_logs;

CREATE TRIGGER tr_calculate_usage_cost
  BEFORE INSERT ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_usage_cost();

CREATE INDEX IF NOT EXISTS idx_usage_org_billing
  ON ai_usage_logs(organization_id, billable_to, created_at DESC);
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110000005_ai_usage_logs_cost_columns.sql
git commit -m "feat(db): add cost tracking columns to ai_usage_logs"
```

**Step 4: Batch 2 complete - commit batch**

```bash
git push origin master
```

---

## Batch 3: Organization Tables & RLS Functions (COMPLETE)

### Task 1.1: Create Organizations Table ✅

**Status:** COMPLETE - Migration `20260110100000_organizations_table.sql` applied

**Files:**
- Create: `supabase/migrations/20260110100000_organizations_table.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100000_organizations_table.sql
-- Core organizations table

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'team', 'enterprise')),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  billing_email TEXT,
  stripe_customer_id TEXT,
  cost_visibility JSONB DEFAULT '{
    "admin_sees_all": true,
    "editor_sees_own": true,
    "viewer_sees_none": true,
    "external_can_see": false,
    "breakdown_level": "summary"
  }',
  branding JSONB DEFAULT '{"color": null, "logo_url": null}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_personal_org_owner ON organizations(owner_id) WHERE type = 'personal';
CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110100000_organizations_table.sql
git commit -m "feat(db): add organizations table"
```

---

### Task 1.2: Create Organization Members Table ✅

**Status:** COMPLETE - Migration `20260110100001_organization_members_table.sql` applied

**Files:**
- Create: `supabase/migrations/20260110100001_organization_members_table.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100001_organization_members_table.sql
-- Organization membership with roles

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  permission_overrides JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_pending ON organization_members(organization_id) WHERE accepted_at IS NULL;

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110100001_organization_members_table.sql
git commit -m "feat(db): add organization_members table"
```

---

### Task 1.3: Create RLS Helper Functions ✅

**Status:** COMPLETE - Migration `20260110100003_rls_helper_functions.sql` applied

**Files:**
- Create: `supabase/migrations/20260110100002_rls_helper_functions.sql`

**⚠️ FIX APPLIED:** Changed `current_org_id()` and `current_org_role()` from `LANGUAGE sql` to `LANGUAGE plpgsql` because they use BEGIN/EXCEPTION blocks.

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100002_rls_helper_functions.sql
-- Helper functions for RLS policies

-- Check if user is a member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role in an organization
CREATE OR REPLACE FUNCTION get_org_role(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has access to a project
CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check via organization membership
  IF EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check old user_id pattern (backward compatibility)
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = proj_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get effective role for a project
CREATE OR REPLACE FUNCTION get_project_role(proj_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_org_role TEXT;
BEGIN
  SELECT om.role INTO v_org_role
  FROM projects p
  JOIN organization_members om ON om.organization_id = p.organization_id
  WHERE p.id = proj_id
    AND om.user_id = auth.uid()
    AND om.accepted_at IS NOT NULL;

  IF v_org_role IS NOT NULL THEN
    RETURN v_org_role;
  END IF;

  -- Fallback: if user owns via old pattern, treat as owner
  IF EXISTS (SELECT 1 FROM projects WHERE id = proj_id AND user_id = auth.uid()) THEN
    RETURN 'owner';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current organization from JWT metadata
-- FIX: Changed from LANGUAGE sql to LANGUAGE plpgsql (required for BEGIN/EXCEPTION)
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'current_organization_id')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current organization role from JWT metadata
-- FIX: Changed from LANGUAGE sql to LANGUAGE plpgsql (required for BEGIN/EXCEPTION)
CREATE OR REPLACE FUNCTION current_org_role()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() -> 'user_metadata' ->> 'current_organization_role';
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110100002_rls_helper_functions.sql
git commit -m "feat(db): add RLS helper functions for organization access control"
```

**Step 4: Batch 3 complete - push**

```bash
git push origin master
```

---

## Batch 4: RLS Policies & API Keys (COMPLETE)

### Task 1.4: Create Organization RLS Policies ✅

**Status:** COMPLETE - Migration `20260110100004_organization_rls_policies.sql` applied

**Files:**
- Create: `supabase/migrations/20260110100003_organization_rls_policies.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100003_organization_rls_policies.sql
-- RLS policies for organizations and organization_members tables

-- Organizations Policies
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_org_member(id) OR owner_id = auth.uid());

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() AND type != 'personal');

CREATE POLICY "Owners and admins can update organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (get_org_role(id) IN ('owner', 'admin'));

CREATE POLICY "Only owners can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Organization Members Policies
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id) OR user_id = auth.uid());

CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    get_org_role(organization_id) IN ('owner', 'admin')
    OR (user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    get_org_role(organization_id) IN ('owner', 'admin')
    OR (user_id = auth.uid() AND accepted_at IS NULL)
  );

CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    get_org_role(organization_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- Update audit log policies
DROP POLICY IF EXISTS "Service role only" ON organization_audit_log;

CREATE POLICY "Admins can view audit log"
  ON organization_audit_log FOR SELECT
  TO authenticated
  USING (get_org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY "System can insert audit log"
  ON organization_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND is_org_member(organization_id)
  );

-- Add FK constraint to audit log
ALTER TABLE organization_audit_log
  ADD CONSTRAINT fk_audit_log_org
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110100003_organization_rls_policies.sql
git commit -m "feat(db): add RLS policies for organizations and members"
```

---

### Task 1.5: Create Organization API Keys Table ✅

**Status:** COMPLETE - Migration `20260110100005_organization_api_keys_table.sql` applied

**Files:**
- Create: `supabase/migrations/20260110100004_organization_api_keys_table.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100004_organization_api_keys_table.sql
-- Organization-level API keys stored securely via Vault

CREATE TABLE IF NOT EXISTS organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
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

CREATE POLICY "Admins can view org API keys"
  ON organization_api_keys FOR SELECT
  TO authenticated
  USING (get_org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can manage org API keys"
  ON organization_api_keys FOR ALL
  TO authenticated
  USING (get_org_role(organization_id) IN ('owner', 'admin'));
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110100004_organization_api_keys_table.sql
git commit -m "feat(db): add organization_api_keys table with Vault integration"
```

---

### Task 1.6: Add Organization ID to Projects Table ✅

**Status:** COMPLETE - Migration `20260110100006_projects_add_organization_id.sql` applied

**Files:**
- Create: `supabase/migrations/20260110100005_projects_add_organization_id.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100005_projects_add_organization_id.sql
-- Add organization_id column to projects table

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS api_key_mode TEXT DEFAULT 'inherit'
    CHECK (api_key_mode IN ('inherit', 'project_specific', 'prompt_user'));

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

-- Update RLS policies to support both patterns during transition
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can view accessible projects"
  ON projects FOR SELECT
  TO authenticated
  USING (has_project_access(id) OR user_id = auth.uid());

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND get_org_role(organization_id) IN ('owner', 'admin', 'editor'))
    OR user_id = auth.uid()
  );

CREATE POLICY "Editors can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (get_project_role(id) IN ('owner', 'admin', 'editor') OR user_id = auth.uid());

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (get_project_role(id) IN ('owner', 'admin') OR user_id = auth.uid());
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110100005_projects_add_organization_id.sql
git commit -m "feat(db): add organization_id to projects with hybrid RLS policies"
```

**Step 4: Batch 4 complete - push**

```bash
git push origin master
```

---

## Batch 5: Data Migration & Audit Function

### Task 1.7: Create Personal Organizations Migration ✅

**Status:** COMPLETE - Migration `20260110100007_migrate_to_personal_orgs.sql` applied

**Files:**
- Create: `supabase/migrations/20260110100006_migrate_to_personal_orgs.sql`

**⚠️ FIX APPLIED:** Removed Step 5 that referenced `organization_scores` table (doesn't exist until Phase 4 Gamification).

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100006_migrate_to_personal_orgs.sql
-- Create personal organizations for all existing users and migrate their projects

-- Step 1: Create personal organization for each existing user
INSERT INTO organizations (name, slug, type, owner_id, billing_email)
SELECT
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ) || '''s Workspace' as name,
  id::text as slug,
  'personal' as type,
  id as owner_id,
  email as billing_email
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o
  WHERE o.owner_id = auth.users.id AND o.type = 'personal'
);

-- Step 2: Add users as owners of their personal orgs
INSERT INTO organization_members (organization_id, user_id, role, accepted_at)
SELECT
  o.id as organization_id,
  o.owner_id as user_id,
  'owner' as role,
  NOW() as accepted_at
FROM organizations o
WHERE o.type = 'personal'
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = o.id AND om.user_id = o.owner_id
  );

-- Step 3: Migrate projects to their owner's personal organization
UPDATE projects p
SET organization_id = o.id
FROM organizations o
WHERE o.owner_id = p.user_id
  AND o.type = 'personal'
  AND p.organization_id IS NULL;

-- Step 4: Update ai_usage_logs with organization_id
UPDATE ai_usage_logs aul
SET organization_id = p.organization_id
FROM projects p
WHERE aul.project_id = p.id
  AND aul.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- Note: organization_scores will be created in Phase 4 (Gamification)
-- This migration is idempotent - can be re-run safely
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify migration**

```sql
-- V1.1: All users have a personal organization
SELECT 'Users without org' as check, COUNT(*)
FROM auth.users u
LEFT JOIN organizations o ON o.owner_id = u.id AND o.type = 'personal'
WHERE o.id IS NULL;
-- Expected: 0

-- V1.2: All personal org owners are members
SELECT 'Owners not members' as check, COUNT(*)
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = o.owner_id
WHERE o.type = 'personal' AND om.id IS NULL;
-- Expected: 0

-- V1.3: All projects have organization_id
SELECT 'Projects without org' as check, COUNT(*)
FROM projects WHERE organization_id IS NULL;
-- Expected: 0
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260110100006_migrate_to_personal_orgs.sql
git commit -m "feat(db): migrate existing users to personal organizations"
```

---

### Task 1.8: Create Audit Logging Helper Function ✅

**Status:** COMPLETE - Migration `20260110100008_audit_logging_function.sql` created

**Files:**
- Create: `supabase/migrations/20260110100007_audit_logging_function.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260110100007_audit_logging_function.sql
-- Helper function to log audit events

CREATE OR REPLACE FUNCTION log_audit_event(
  p_org_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_email TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO organization_audit_log (
    organization_id, actor_id, action, target_type, target_id,
    target_email, old_value, new_value, ip_address, user_agent
  ) VALUES (
    p_org_id, auth.uid(), p_action, p_target_type, p_target_id,
    p_target_email, p_old_value, p_new_value, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260110100007_audit_logging_function.sql
git commit -m "feat(db): add audit logging helper function"
```

---

### Task 1.9: Create TypeScript Types for Organizations ✅

**Status:** COMPLETE - `types/organization.ts` created and exported from `types.ts`

**Files:**
- Create: `types/organization.ts`
- Modify: `types.ts` (add export)

**Step 1: Create organization types file**

```typescript
// types/organization.ts
// TypeScript types for multi-tenancy

export type OrganizationType = 'personal' | 'team' | 'enterprise';
export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  owner_id: string;
  settings: Record<string, unknown>;
  billing_email: string | null;
  stripe_customer_id: string | null;
  cost_visibility: CostVisibilitySettings;
  branding: OrganizationBranding;
  created_at: string;
  updated_at: string;
}

export interface CostVisibilitySettings {
  admin_sees_all: boolean;
  editor_sees_own: boolean;
  viewer_sees_none: boolean;
  external_can_see: boolean;
  breakdown_level: 'summary' | 'detailed' | 'full';
}

export interface OrganizationBranding {
  color: string | null;
  logo_url: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  permission_overrides: Record<string, boolean>;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface OrganizationApiKey {
  id: string;
  organization_id: string;
  provider: string;
  encrypted_key: string;
  key_source: 'platform' | 'byok';
  is_active: boolean;
  usage_this_month: {
    tokens: number;
    requests: number;
    cost_usd: number;
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface OrganizationWithMembership extends Organization {
  membership: OrganizationMember;
  member_count?: number;
  project_count?: number;
}

export interface OrganizationPermissions {
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
  canManageMembers: boolean;
  canManageBilling: boolean;
  canViewCosts: boolean;
  canConfigureApiKeys: boolean;
  canUseContentGeneration: boolean;
  canExportData: boolean;
  canViewAuditLog: boolean;
}

export interface OrganizationAuditLogEntry {
  id: string;
  organization_id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_email: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  enabled_user_ids: string[];
  enabled_org_ids: string[];
  created_at: string;
  updated_at: string;
}
```

**Step 2: Update main types.ts**

Add after other exports:
```typescript
export * from './types/organization';
```

**Step 3: Commit**

```bash
git add types/organization.ts types.ts
git commit -m "feat(types): add TypeScript types for organizations"
```

**Step 4: Batch 5 complete - push**

```bash
git push origin master
```

---

## Batch 6: State Management & Hook (COMPLETE)

### Task 1.10: Create Organization State Slice ✅

**Status:** COMPLETE - `state/slices/organizationSlice.ts` created and exported from `state/slices/index.ts`

**Files:**
- Create: `state/slices/organizationSlice.ts`

**Step 1: Create organization slice**

```typescript
// state/slices/organizationSlice.ts
// State management for organization context

import {
  Organization,
  OrganizationMember,
  OrganizationWithMembership,
  OrganizationPermissions,
  OrganizationRole,
} from '../../types';

export interface OrganizationState {
  currentOrganization: Organization | null;
  currentMembership: OrganizationMember | null;
  organizations: OrganizationWithMembership[];
  permissions: OrganizationPermissions;
  isLoadingOrganizations: boolean;
  isSwitchingOrganization: boolean;
  error: string | null;
}

export const initialOrganizationState: OrganizationState = {
  currentOrganization: null,
  currentMembership: null,
  organizations: [],
  permissions: getDefaultPermissions(),
  isLoadingOrganizations: false,
  isSwitchingOrganization: false,
  error: null,
};

export type OrganizationAction =
  | { type: 'SET_ORGANIZATIONS'; payload: OrganizationWithMembership[] }
  | { type: 'SET_CURRENT_ORGANIZATION'; payload: { org: Organization; membership: OrganizationMember } }
  | { type: 'CLEAR_CURRENT_ORGANIZATION' }
  | { type: 'SET_ORGANIZATIONS_LOADING'; payload: boolean }
  | { type: 'SET_SWITCHING_ORGANIZATION'; payload: boolean }
  | { type: 'SET_ORGANIZATION_ERROR'; payload: string | null }
  | { type: 'UPDATE_ORGANIZATION'; payload: Partial<Organization> }
  | { type: 'ADD_ORGANIZATION'; payload: OrganizationWithMembership };

export function organizationReducer(
  state: OrganizationState,
  action: OrganizationAction
): OrganizationState {
  switch (action.type) {
    case 'SET_ORGANIZATIONS':
      return { ...state, organizations: action.payload, isLoadingOrganizations: false };
    case 'SET_CURRENT_ORGANIZATION':
      return {
        ...state,
        currentOrganization: action.payload.org,
        currentMembership: action.payload.membership,
        permissions: computePermissions(action.payload.membership),
        isSwitchingOrganization: false,
      };
    case 'CLEAR_CURRENT_ORGANIZATION':
      return { ...state, currentOrganization: null, currentMembership: null, permissions: getDefaultPermissions() };
    case 'SET_ORGANIZATIONS_LOADING':
      return { ...state, isLoadingOrganizations: action.payload };
    case 'SET_SWITCHING_ORGANIZATION':
      return { ...state, isSwitchingOrganization: action.payload };
    case 'SET_ORGANIZATION_ERROR':
      return { ...state, error: action.payload, isLoadingOrganizations: false, isSwitchingOrganization: false };
    case 'UPDATE_ORGANIZATION':
      return {
        ...state,
        currentOrganization: state.currentOrganization
          ? { ...state.currentOrganization, ...action.payload }
          : null,
        organizations: state.organizations.map((org) =>
          org.id === action.payload.id ? { ...org, ...action.payload } : org
        ),
      };
    case 'ADD_ORGANIZATION':
      return { ...state, organizations: [...state.organizations, action.payload] };
    default:
      return state;
  }
}

function getDefaultPermissions(): OrganizationPermissions {
  return {
    canViewProjects: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    canManageMembers: false,
    canManageBilling: false,
    canViewCosts: false,
    canConfigureApiKeys: false,
    canUseContentGeneration: false,
    canExportData: false,
    canViewAuditLog: false,
  };
}

function computePermissions(membership: OrganizationMember): OrganizationPermissions {
  const role = membership.role;
  const overrides = membership.permission_overrides || {};

  const basePermissions: Record<OrganizationRole, OrganizationPermissions> = {
    owner: {
      canViewProjects: true, canCreateProjects: true, canDeleteProjects: true,
      canManageMembers: true, canManageBilling: true, canViewCosts: true,
      canConfigureApiKeys: true, canUseContentGeneration: true, canExportData: true, canViewAuditLog: true,
    },
    admin: {
      canViewProjects: true, canCreateProjects: true, canDeleteProjects: true,
      canManageMembers: true, canManageBilling: false, canViewCosts: true,
      canConfigureApiKeys: true, canUseContentGeneration: true, canExportData: true, canViewAuditLog: true,
    },
    editor: {
      canViewProjects: true, canCreateProjects: true, canDeleteProjects: false,
      canManageMembers: false, canManageBilling: false, canViewCosts: false,
      canConfigureApiKeys: false, canUseContentGeneration: true, canExportData: true, canViewAuditLog: false,
    },
    viewer: {
      canViewProjects: true, canCreateProjects: false, canDeleteProjects: false,
      canManageMembers: false, canManageBilling: false, canViewCosts: false,
      canConfigureApiKeys: false, canUseContentGeneration: false, canExportData: false, canViewAuditLog: false,
    },
  };

  const permissions = { ...basePermissions[role] };
  for (const [key, value] of Object.entries(overrides)) {
    if (key in permissions && typeof value === 'boolean') {
      (permissions as Record<string, boolean>)[key] = value;
    }
  }
  return permissions;
}
```

**Step 2: Commit**

```bash
git add state/slices/organizationSlice.ts
git commit -m "feat(state): add organization state slice"
```

---

### Task 1.11: Create useOrganization Hook ✅

**Status:** COMPLETE - `hooks/useOrganization.ts` created

**Files:**
- Create: `hooks/useOrganization.ts`

**Step 1: Create the hook**

```typescript
// hooks/useOrganization.ts
// Hook for accessing and managing organization context

import { useCallback, useEffect } from 'react';
import { useAppState } from '../state/appState';
import { supabase } from '../services/supabaseClient';
import { OrganizationWithMembership } from '../types';

export function useOrganization() {
  const { state, dispatch } = useAppState();
  const {
    currentOrganization,
    currentMembership,
    organizations,
    permissions,
    isLoadingOrganizations,
    isSwitchingOrganization,
  } = state.organization;

  const loadOrganizations = useCallback(async () => {
    if (!state.user) return;

    dispatch({ type: 'SET_ORGANIZATIONS_LOADING', payload: true });

    try {
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select('*, organization:organizations(*)')
        .eq('user_id', state.user.id)
        .not('accepted_at', 'is', null);

      if (error) throw error;

      const orgs: OrganizationWithMembership[] = (memberships || []).map((m) => ({
        ...m.organization,
        membership: {
          id: m.id,
          organization_id: m.organization_id,
          user_id: m.user_id,
          role: m.role,
          permission_overrides: m.permission_overrides || {},
          invited_by: m.invited_by,
          invited_at: m.invited_at,
          accepted_at: m.accepted_at,
          created_at: m.created_at,
        },
      }));

      dispatch({ type: 'SET_ORGANIZATIONS', payload: orgs });

      if (!currentOrganization && orgs.length > 0) {
        const personalOrg = orgs.find((o) => o.type === 'personal');
        if (personalOrg) await switchOrganization(personalOrg.id);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
      dispatch({
        type: 'SET_ORGANIZATION_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load organizations',
      });
    }
  }, [state.user, dispatch, currentOrganization]);

  const switchOrganization = useCallback(async (orgId: string) => {
    dispatch({ type: 'SET_SWITCHING_ORGANIZATION', payload: true });

    try {
      const org = organizations.find((o) => o.id === orgId);
      if (!org) throw new Error('Organization not found');

      await supabase.auth.updateUser({
        data: {
          current_organization_id: orgId,
          current_organization_role: org.membership.role,
        },
      });

      dispatch({
        type: 'SET_CURRENT_ORGANIZATION',
        payload: { org, membership: org.membership },
      });
    } catch (error) {
      console.error('Failed to switch organization:', error);
      dispatch({
        type: 'SET_ORGANIZATION_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to switch organization',
      });
    }
  }, [organizations, dispatch]);

  const createOrganization = useCallback(async (name: string, type: 'team' | 'enterprise' = 'team') => {
    if (!state.user) throw new Error('Not authenticated');

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug: `${slug}-${Date.now()}`,
        type,
        owner_id: state.user.id,
        billing_email: state.user.email,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: state.user.id,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) throw memberError;

    const newOrg: OrganizationWithMembership = { ...org, membership };
    dispatch({ type: 'ADD_ORGANIZATION', payload: newOrg });

    await supabase.rpc('log_audit_event', {
      p_org_id: org.id,
      p_action: 'org.created',
      p_target_type: 'organization',
      p_target_id: org.id,
      p_new_value: { name, type },
    });

    return newOrg;
  }, [state.user, dispatch]);

  useEffect(() => {
    if (state.user && organizations.length === 0 && !isLoadingOrganizations) {
      loadOrganizations();
    }
  }, [state.user, organizations.length, isLoadingOrganizations, loadOrganizations]);

  return {
    current: currentOrganization,
    membership: currentMembership,
    permissions,
    organizations,
    isLoading: isLoadingOrganizations,
    isSwitching: isSwitchingOrganization,
    loadOrganizations,
    switchOrganization,
    createOrganization,
    isPersonalOrg: currentOrganization?.type === 'personal',
    hasMultipleOrgs: organizations.length > 1,
  };
}
```

**Step 2: Commit**

```bash
git add hooks/useOrganization.ts
git commit -m "feat(hooks): add useOrganization hook"
```

---

### Task 1.12: Enable Multi-Tenancy Feature Flag

**Step 1: Enable the feature flag for testing**

Run in Supabase SQL Editor:
```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE';

-- Enable for your user
UPDATE feature_flags
SET enabled_user_ids = array_append(enabled_user_ids, 'YOUR_USER_ID')
WHERE flag_key = 'multi_tenancy_enabled';
```

**Step 2: Verify**

```sql
SELECT is_feature_enabled('multi_tenancy_enabled', 'YOUR_USER_ID');
-- Expected: true
```

**Step 3: Batch 6 complete - push and verify**

```bash
git push origin master
```

Run verification queries:
```sql
SELECT COUNT(*) > 0 as vault_enabled FROM pg_extension WHERE extname = 'supabase_vault';
SELECT COUNT(*) = 4 as flags_exist FROM feature_flags;
SELECT COUNT(*) > 10 as rates_exist FROM ai_pricing_rates;
SELECT COUNT(*) > 0 as orgs_exist FROM organizations;
SELECT COUNT(*) = 0 as all_users_have_orgs FROM auth.users u
  LEFT JOIN organizations o ON o.owner_id = u.id AND o.type = 'personal' WHERE o.id IS NULL;
SELECT COUNT(*) = 0 as all_projects_migrated FROM projects WHERE organization_id IS NULL;
```

---

## Next Steps

After Phase 0 & 1 complete:
1. **Phase 2**: Invitation system, project_members table, external collaborators
2. **Phase 3**: API key migration to Vault, cost tracking
3. **Phase 4**: WordPress/Quality/Neo4j integration updates
4. **Phase 5**: UI polish, organization switcher component
