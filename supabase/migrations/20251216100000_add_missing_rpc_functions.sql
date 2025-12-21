-- Migration: Add Missing Core RPC Functions
-- These functions were expected by the application but were missing from the new database after migration
-- This migration adds the CRITICAL functions needed for basic project/map operations.
-- Site analysis functions are in a separate migration that creates the required tables first.

-- ===========================================
-- CREATE NEW PROJECT FUNCTION
-- ===========================================
-- Called from App.tsx handleCreateProject
-- Creates a new project for the authenticated user

CREATE OR REPLACE FUNCTION public.create_new_project(p_project_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_project public.projects%ROWTYPE;
  v_user_id UUID;
  v_project_name TEXT;
  v_domain TEXT;
BEGIN
  -- Extract parameters from JSONB
  v_user_id := (p_project_data->>'user_id')::UUID;
  v_project_name := p_project_data->>'project_name';
  v_domain := p_project_data->>'domain';

  -- Verify the user_id matches the authenticated user
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch: cannot create project for another user';
  END IF;

  -- Insert the new project
  INSERT INTO public.projects (user_id, project_name, domain)
  VALUES (v_user_id, v_project_name, v_domain)
  RETURNING * INTO v_new_project;

  -- Return the new project as JSONB
  RETURN jsonb_build_object(
    'id', v_new_project.id,
    'user_id', v_new_project.user_id,
    'project_name', v_new_project.project_name,
    'domain', v_new_project.domain,
    'created_at', v_new_project.created_at,
    'updated_at', v_new_project.updated_at
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_new_project(JSONB) TO authenticated;

-- ===========================================
-- CREATE NEW MAP FUNCTION
-- ===========================================
-- Called from ProjectDashboardContainer.tsx handleCreateNewMap
-- Creates a new topical map for a project

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

  -- Verify the project belongs to the authenticated user and get domain
  SELECT domain INTO v_project_domain
  FROM public.projects
  WHERE id = p_project_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_new_map(UUID, TEXT) TO authenticated;

-- ===========================================
-- CHECK TABLE EXISTS FUNCTION
-- ===========================================
-- Called from health-check edge function
-- Checks if a table exists in the given schema

CREATE OR REPLACE FUNCTION public.check_table_exists(schema_name TEXT, table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = schema_name
      AND information_schema.tables.table_name = check_table_exists.table_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_table_exists(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(TEXT, TEXT) TO service_role;
