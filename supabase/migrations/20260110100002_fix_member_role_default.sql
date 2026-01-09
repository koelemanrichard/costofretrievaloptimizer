-- supabase/migrations/20260110100001a_fix_member_role_default.sql
-- Fix: Change default role from invalid 'member' to valid 'viewer'

ALTER TABLE organization_members
  ALTER COLUMN role SET DEFAULT 'viewer';
