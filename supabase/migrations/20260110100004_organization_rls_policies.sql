-- supabase/migrations/20260110100004_organization_rls_policies.sql
-- RLS policies for organizations and organization_members tables

-- Organizations Policies
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_org_member(id) OR owner_id = auth.uid());

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() AND type != 'personal');

CREATE POLICY "Owners and admins can update organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (get_org_role(id) IN ('owner', 'admin'));

CREATE POLICY "Only owners can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Organization Members Policies
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id) OR user_id = auth.uid());

CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    get_org_role(organization_id) IN ('owner', 'admin')
    OR (
      -- Only allow self-insertion as owner if user is the organization's owner_id
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM organizations
        WHERE id = organization_id AND owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    get_org_role(organization_id) IN ('owner', 'admin')
    OR (user_id = auth.uid() AND accepted_at IS NULL)
  );

CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    get_org_role(organization_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- Update audit log policies
DROP POLICY IF EXISTS "Service role only" ON organization_audit_log;

CREATE POLICY "Admins can view audit log"
  ON organization_audit_log FOR SELECT
  TO authenticated
  USING (get_org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY "System can insert audit log"
  ON organization_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND is_org_member(organization_id)
  );

-- Add FK constraint to audit log
ALTER TABLE organization_audit_log
  ADD CONSTRAINT fk_audit_log_org
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

-- Auto-create owner membership when organization is created
CREATE OR REPLACE FUNCTION create_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role, accepted_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_create_owner_membership ON organizations;

CREATE TRIGGER tr_create_owner_membership
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_owner_membership();
