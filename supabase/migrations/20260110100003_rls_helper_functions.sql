-- supabase/migrations/20260110100003_rls_helper_functions.sql
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

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
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

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
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

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
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

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
