-- Fix RLS policy for ai_usage_logs
-- The admin policy was querying auth.users directly which causes "permission denied" errors

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admin can view all usage logs" ON ai_usage_logs;

-- Create a SECURITY DEFINER function to check admin status
-- This function runs with elevated privileges and can access auth.users safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a safer admin policy using the SECURITY DEFINER function
CREATE POLICY "Admin can view all usage logs"
  ON ai_usage_logs FOR SELECT
  USING (public.is_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Also fix the view to use the function instead of direct table access
DROP VIEW IF EXISTS ai_usage_summary;

CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT
  user_id,
  project_id,
  map_id,
  provider,
  model,
  operation,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as call_count,
  SUM(tokens_in) as total_tokens_in,
  SUM(tokens_out) as total_tokens_out,
  SUM(cost_usd) as total_cost_usd,
  AVG(duration_ms)::INTEGER as avg_duration_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as error_count
FROM ai_usage_logs
GROUP BY user_id, project_id, map_id, provider, model, operation, DATE_TRUNC('day', created_at);

-- Comment
COMMENT ON FUNCTION public.is_admin() IS 'Safely checks if the current user has admin role';
