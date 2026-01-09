-- supabase/migrations/20260110000000_enable_vault.sql
-- Enable Supabase Vault for secure API key storage
-- This extension provides transparent encryption for sensitive data

-- Enable the vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Grant access to service role only (edge functions)
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA vault TO service_role;

-- Revoke from authenticated users (they should never access vault directly)
REVOKE ALL ON SCHEMA vault FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA vault FROM authenticated;
