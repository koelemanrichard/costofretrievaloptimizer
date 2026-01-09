-- supabase/migrations/20260110100007_migrate_to_personal_orgs.sql
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
-- Note: This may be handled by trigger now, but keep for safety
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

-- This migration is idempotent - can be re-run safely
