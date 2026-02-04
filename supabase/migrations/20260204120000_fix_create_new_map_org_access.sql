-- ============================================================================
-- FIX: create_new_map() - Use has_project_access() for org-based projects
-- ============================================================================
-- The original function checked `user_id = auth.uid()` which fails for
-- organization-based projects where the project's user_id doesn't match
-- the current user. Now uses has_project_access() which handles direct
-- ownership, org membership, JWT fallback, and project_members.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_new_map(p_project_id UUID, p_map_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_map public.topical_maps%ROWTYPE;
  v_user_id UUID;
  v_project_domain TEXT;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();

  -- Verify the user has access to this project (supports org-based access)
  IF NOT has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  -- Get the project domain
  SELECT domain INTO v_project_domain
  FROM public.projects
  WHERE id = p_project_id;

  -- Insert the new map
  INSERT INTO public.topical_maps (project_id, user_id, name, domain)
  VALUES (p_project_id, v_user_id, p_map_name, v_project_domain)
  RETURNING * INTO v_new_map;

  -- Return the new map as JSONB
  RETURN jsonb_build_object(
    'id', v_new_map.id,
    'project_id', v_new_map.project_id,
    'user_id', v_new_map.user_id,
    'name', v_new_map.name,
    'domain', v_new_map.domain,
    'business_info', v_new_map.business_info,
    'pillars', v_new_map.pillars,
    'eavs', v_new_map.eavs,
    'competitors', v_new_map.competitors,
    'analysis_state', v_new_map.analysis_state,
    'created_at', v_new_map.created_at,
    'updated_at', v_new_map.updated_at
  );
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
