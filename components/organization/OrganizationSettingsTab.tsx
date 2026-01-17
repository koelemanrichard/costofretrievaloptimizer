// components/organization/OrganizationSettingsTab.tsx
/**
 * OrganizationSettingsTab
 *
 * Displays organization settings including info, stats, and actions.
 * For admins: shows quick action buttons (Manage Members, Send Invitation, View Costs, API Keys)
 * For non-admins: shows permissions summary
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 1, Task 4
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useOrganizationContext } from './OrganizationProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { SmartLoader } from '../ui/FunLoaders';
import { getSupabaseClient } from '../../services/supabaseClient';
import { useAppState } from '../../state/appState';

// ============================================================================
// Types
// ============================================================================

interface OrganizationSettingsTabProps {
  onOpenMemberManagement?: () => void;
  onOpenInvitations?: () => void;
  onOpenCosts?: () => void;
  onOpenApiKeys?: () => void;
  onOpenSubscription?: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-200 capitalize">
        {value === null ? <SmartLoader context="loading" size="sm" showText={false} /> : value ?? '-'}
      </p>
    </div>
  );
}

interface PermissionRowProps {
  label: string;
  allowed: boolean;
}

function PermissionRow({ label, allowed }: PermissionRowProps) {
  return (
    <li className="flex items-center gap-2">
      <span className={allowed ? 'text-green-400' : 'text-gray-500'}>
        {allowed ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </span>
      <span className={allowed ? 'text-gray-200' : 'text-gray-500'}>{label}</span>
    </li>
  );
}

function OrgTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    personal: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    team: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    enterprise: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  };
  return <span className="text-gray-400">{icons[type] || icons.enterprise}</span>;
}

// ============================================================================
// Main Component
// ============================================================================

export function OrganizationSettingsTab({
  onOpenMemberManagement,
  onOpenInvitations,
  onOpenCosts,
  onOpenApiKeys,
  onOpenSubscription,
}: OrganizationSettingsTabProps) {
  const { state } = useAppState();
  const { current: organization, membership, isLoading } = useOrganizationContext();
  const { isAdmin, can } = usePermissions();

  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load member and project counts
  useEffect(() => {
    async function loadCounts() {
      if (!supabase || !organization) {
        setStatsLoading(false);
        return;
      }

      setStatsLoading(true);
      try {
        // Fetch member count (only accepted members)
        // Note: Using type assertion as database.types.ts needs regeneration for multi-tenancy tables
        const { count: members, error: membersError } = await (supabase as any)
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('accepted_at', 'is', null);

        if (membersError) {
          console.error('Failed to load member count:', membersError);
        } else {
          setMemberCount(members ?? 0);
        }

        // Fetch project count
        const { count: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id);

        if (projectsError) {
          console.error('Failed to load project count:', projectsError);
        } else {
          setProjectCount(projects ?? 0);
        }
      } catch (err) {
        console.error('Failed to load org counts:', err);
      } finally {
        setStatsLoading(false);
      }
    }

    loadCounts();
  }, [organization, supabase]);

  // Loading state - only show spinner if actively loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <SmartLoader context="loading" size="lg" showText={false} />
      </div>
    );
  }

  // No organization available
  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-gray-400 mb-2">No organization selected</p>
        <p className="text-gray-500 text-sm">Organization data is loading or unavailable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Info Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Organization</h3>
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1">Name</Label>
              <p className="text-gray-200 font-medium">{organization.name}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1">Type</Label>
              <div className="flex items-center gap-2">
                <OrgTypeIcon type={organization.type} />
                <span className="text-gray-200 capitalize">{organization.type}</span>
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1">Your Role</Label>
              <p className="text-gray-200 capitalize">{membership?.role || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1">Slug</Label>
              <p className="text-gray-400 font-mono text-sm">{organization.slug}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Members"
            value={statsLoading ? null : memberCount}
            icon={
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
          />
          <StatCard
            label="Projects"
            value={statsLoading ? null : projectCount}
            icon={
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Your Role"
            value={membership?.role}
            icon={
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <StatCard
            label="Type"
            value={organization.type}
            icon={<OrgTypeIcon type={organization.type} />}
          />
        </div>
      </section>

      {/* Quick Actions for Admins */}
      {isAdmin && (
        <section>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {can('canManageMembers') && onOpenMemberManagement && (
              <Button variant="secondary" onClick={onOpenMemberManagement}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Manage Members
                </span>
              </Button>
            )}
            {can('canManageMembers') && onOpenInvitations && (
              <Button variant="secondary" onClick={onOpenInvitations}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Invitation
                </span>
              </Button>
            )}
            {can('canViewCosts') && onOpenCosts && (
              <Button variant="secondary" onClick={onOpenCosts}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Costs
                </span>
              </Button>
            )}
            {can('canConfigureApiKeys') && onOpenApiKeys && (
              <Button variant="secondary" onClick={onOpenApiKeys}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  API Keys
                </span>
              </Button>
            )}
            {can('canManageBilling') && onOpenSubscription && (
              <Button variant="secondary" onClick={onOpenSubscription}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Subscription & Billing
                </span>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Permissions Summary for Non-Admins */}
      {!isAdmin && (
        <section>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Your Permissions</h3>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <ul className="space-y-2 text-sm">
              <PermissionRow label="View Projects" allowed={can('canViewProjects')} />
              <PermissionRow label="Create Projects" allowed={can('canCreateProjects')} />
              <PermissionRow label="Generate Content" allowed={can('canUseContentGeneration')} />
              <PermissionRow label="Export Data" allowed={can('canExportData')} />
              <PermissionRow label="View Costs" allowed={can('canViewCosts')} />
              <PermissionRow label="View Audit Log" allowed={can('canViewAuditLog')} />
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
