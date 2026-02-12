-- Fix ai_usage_logs CHECK constraints to match application values
-- The application sends 'user_byok' and 'unknown' for key_source,
-- and 'user' for billable_to, which the original constraints reject.

-- Drop and recreate key_source constraint with all valid values
ALTER TABLE ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_key_source_check;
ALTER TABLE ai_usage_logs ADD CONSTRAINT ai_usage_logs_key_source_check
  CHECK (key_source IN ('platform', 'org_byok', 'project_byok', 'user_byok', 'unknown'));

-- Drop and recreate billable_to constraint with all valid values
ALTER TABLE ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_billable_to_check;
ALTER TABLE ai_usage_logs ADD CONSTRAINT ai_usage_logs_billable_to_check
  CHECK (billable_to IN ('platform', 'organization', 'project', 'user'));
