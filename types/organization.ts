// types/organization.ts
// TypeScript types for multi-tenancy

export type OrganizationType = 'personal' | 'team' | 'enterprise';
export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  owner_id: string;
  settings: Record<string, unknown>;
  billing_email: string | null;
  stripe_customer_id: string | null;
  cost_visibility: CostVisibilitySettings;
  branding: OrganizationBranding;
  created_at: string;
  updated_at: string;
}

export interface CostVisibilitySettings {
  admin_sees_all: boolean;
  editor_sees_own: boolean;
  viewer_sees_none: boolean;
  external_can_see: boolean;
  breakdown_level: 'summary' | 'detailed' | 'full';
}

export interface OrganizationBranding {
  color: string | null;
  logo_url: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  permission_overrides: Record<string, boolean>;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface OrganizationApiKey {
  id: string;
  organization_id: string;
  provider: string;
  encrypted_key: string;
  key_source: 'platform' | 'byok';
  is_active: boolean;
  usage_this_month: {
    tokens: number;
    requests: number;
    cost_usd: number;
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface OrganizationWithMembership extends Organization {
  membership: OrganizationMember;
  member_count?: number;
  project_count?: number;
}

export interface OrganizationPermissions {
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
  canManageMembers: boolean;
  canManageBilling: boolean;
  canViewCosts: boolean;
  canConfigureApiKeys: boolean;
  canUseContentGeneration: boolean;
  canExportData: boolean;
  canViewAuditLog: boolean;
}

export interface OrganizationAuditLogEntry {
  id: string;
  organization_id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_email: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  enabled_user_ids: string[];
  enabled_org_ids: string[];
  created_at: string;
  updated_at: string;
}
