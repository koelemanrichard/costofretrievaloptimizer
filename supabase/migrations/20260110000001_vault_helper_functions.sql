-- supabase/migrations/20260110000001_vault_helper_functions.sql
-- Helper functions for storing, retrieving, and rotating secrets

-- Store a secret and return its ID
CREATE OR REPLACE FUNCTION store_secret(
  p_secret TEXT,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (p_secret, p_name, p_description)
  RETURNING id INTO v_secret_id;

  RETURN v_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retrieve a decrypted secret (only callable from edge functions via service role)
CREATE OR REPLACE FUNCTION get_secret(p_secret_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id;

  RETURN v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a secret
CREATE OR REPLACE FUNCTION delete_secret(p_secret_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = p_secret_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rotate a secret (creates new, deletes old, returns new ID)
CREATE OR REPLACE FUNCTION rotate_secret(
  p_old_secret_id UUID,
  p_new_secret TEXT
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_name TEXT;
  v_description TEXT;
BEGIN
  -- Get metadata from old secret
  SELECT name, description INTO v_name, v_description
  FROM vault.secrets WHERE id = p_old_secret_id;

  -- Create new secret with same metadata
  v_new_id := store_secret(p_new_secret, v_name, v_description);

  -- Delete old secret
  PERFORM delete_secret(p_old_secret_id);

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke execute from authenticated (only service_role should call these)
REVOKE EXECUTE ON FUNCTION store_secret FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_secret FROM authenticated;
REVOKE EXECUTE ON FUNCTION delete_secret FROM authenticated;
REVOKE EXECUTE ON FUNCTION rotate_secret FROM authenticated;
