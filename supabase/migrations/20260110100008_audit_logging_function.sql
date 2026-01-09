-- supabase/migrations/20260110100008_audit_logging_function.sql
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
