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

// ============================================================================
// Project Members (External Collaborators)
// ============================================================================

export type ProjectRole = 'admin' | 'editor' | 'viewer';
export type ProjectMemberSource = 'org_member' | 'direct' | 'invitation';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  permission_overrides: Record<string, boolean>;
  source: ProjectMemberSource;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface ProjectMemberWithUser extends ProjectMember {
  user?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
    };
  };
}

// ============================================================================
// Invitations
// ============================================================================

export type InvitationType = 'organization' | 'project';

export interface Invitation {
  id: string;
  type: InvitationType;
  organization_id: string | null;
  project_id: string | null;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  message: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  declined_at: string | null;
}

export interface InvitationWithInviter extends Invitation {
  inviter?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
    };
  };
}

export interface CreateInvitationParams {
  type: InvitationType;
  organization_id?: string;
  project_id?: string;
  email: string;
  role: string;
  message?: string;
}

export interface AcceptInvitationResult {
  success: boolean;
  type: InvitationType;
  organization_id?: string;
  project_id?: string;
}

// ============================================================================
// Project API Keys
// ============================================================================

export type ApiKeySource = 'inherit' | 'platform' | 'byok';

export interface ProjectApiKey {
  id: string;
  project_id: string;
  provider: string;
  encrypted_key: string | null;
  key_source: ApiKeySource;
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

export interface ApiKeyStatus {
  provider: string;
  hasKey: boolean;
  keySource: ApiKeySource;
  isActive: boolean;
  usageThisMonth?: {
    tokens: number;
    requests: number;
    cost_usd: number;
  };
}

export interface ResolvedApiKey {
  encrypted_key: string;
  key_source: string;
  billable_to: 'platform' | 'organization' | 'project';
  billable_id: string;
}

// ============================================================================
// Gamification & Leaderboards
// ============================================================================

export interface OrganizationScore {
  id: string;
  organization_id: string;
  total_score: number;
  total_articles_generated: number;
  total_high_quality_articles: number;
  avg_audit_score: number | null;
  global_rank: number | null;
  score_this_week: number;
  score_this_month: number;
  updated_at: string;
}

export interface OrganizationScoreWithDetails extends OrganizationScore {
  organization: {
    id: string;
    name: string;
    slug: string;
    type: OrganizationType;
    branding?: OrganizationBranding;
  };
}

export interface OrganizationAchievement {
  id: string;
  organization_id: string;
  achievement_id: string;
  achievement_name: string | null;
  achievement_description: string | null;
  points_awarded: number;
  earned_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  organizationId: string;
  organizationName: string;
  score: number;
  articlesGenerated: number;
  avgAuditScore: number | null;
  isCurrentOrg: boolean;
}

export interface LeaderboardPeriod {
  type: 'week' | 'month' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface OrganizationQualitySettings {
  id: string;
  organization_id: string;
  min_word_count: number | null;
  max_word_count: number | null;
  min_heading_ratio: number | null;
  min_paragraph_length: number | null;
  max_consecutive_short_paragraphs: number | null;
  min_audit_score: number;
  custom_rules: Record<string, unknown>[];
  enforce_on_publish: boolean;
  auto_reject_below_threshold: boolean;
  created_at: string;
  updated_at: string;
}
