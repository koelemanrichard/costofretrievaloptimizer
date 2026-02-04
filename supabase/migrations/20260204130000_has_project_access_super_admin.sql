-- ============================================================================
-- FIX: has_project_access() - Add super_admin bypass
-- ============================================================================
-- Super admins can SEE all projects via RLS SELECT policies but
-- has_project_access() didn't recognize them, so RPC functions like
-- create_new_map() that call has_project_access() would deny access.
-- Now checks is_super_admin() first, before all other access checks.
-- ============================================================================

CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Super admin bypass: super admins have access to all projects
  IF is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Quick check: is user the direct owner?
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE id = proj_id AND user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check via organization membership (with accepted_at)
  IF EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- FALLBACK: Check via organization membership WITHOUT accepted_at requirement
  -- Some members may not have accepted_at set (e.g., auto-created owner entries)
  IF EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- FALLBACK 2: Check via JWT current_organization_id metadata
  -- This covers cases where the user's org membership isn't in the table yet
  BEGIN
    v_org_id := (auth.jwt() -> 'user_metadata' ->> 'current_organization_id')::UUID;
    IF v_org_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM projects
        WHERE id = proj_id AND organization_id = v_org_id
      ) THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- JWT parsing failed, skip this check
    NULL;
  END;

  -- FALLBACK 3: Check project_members table (if it exists)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = proj_id AND user_id = auth.uid()
    ) THEN
      RETURN TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- project_members table might not exist
    NULL;
  END;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
