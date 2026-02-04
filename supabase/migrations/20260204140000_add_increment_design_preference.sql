-- ============================================================================
-- Add increment_design_preference_frequency RPC function
-- ============================================================================
-- Called by DesignInheritanceService.ts to track design preference usage.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_design_preference_frequency(
  p_project_id UUID,
  p_preference_type TEXT,
  p_context TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE design_preferences
  SET frequency = frequency + 1,
      last_used = NOW()
  WHERE project_id = p_project_id
    AND preference_type = p_preference_type
    AND context = p_context;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_design_preference_frequency(UUID, TEXT, TEXT) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
