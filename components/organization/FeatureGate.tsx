/**
 * FeatureGate and PermissionGate Components
 *
 * Wrapper components for conditional rendering based on feature flags
 * and user permissions. These gates enable declarative access control
 * in the UI layer.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 5 (Task 15)
 */

import React, { ReactNode } from 'react';
import { useFeatureGate, usePermissions, Permission } from '../../hooks/usePermissions';
import { SmartLoader } from '../ui/FunLoaders';

// ============================================================================
// FeatureGate Component
// ============================================================================

export interface FeatureGateProps {
  /**
   * The feature flag key to check
   */
  feature: string;
  /**
   * Content to render when feature is enabled
   */
  children: ReactNode;
  /**
   * Optional fallback to render when feature is disabled
   */
  fallback?: ReactNode;
  /**
   * Whether to show a loading spinner while checking feature status
   */
  showLoader?: boolean;
}

/**
 * FeatureGate - Conditionally renders children based on feature flag status
 *
 * @example
 * ```tsx
 * <FeatureGate feature="advanced-analytics">
 *   <AdvancedAnalyticsDashboard />
 * </FeatureGate>
 *
 * <FeatureGate
 *   feature="beta-editor"
 *   fallback={<LegacyEditor />}
 *   showLoader
 * >
 *   <BetaEditor />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  showLoader = false,
}: FeatureGateProps): React.ReactElement | null {
  const { enabled, loading } = useFeatureGate(feature);

  // Show loader while checking feature status
  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <SmartLoader context="loading" size="sm" showText={false} />
      </div>
    );
  }

  // Don't render anything while loading (if no loader)
  if (loading) {
    return null;
  }

  // Feature is enabled - render children
  if (enabled) {
    return <>{children}</>;
  }

  // Feature is disabled - render fallback
  return <>{fallback}</>;
}

// ============================================================================
// PermissionGate Component
// ============================================================================

export interface PermissionGateProps {
  /**
   * Permission(s) to check. Can be a single permission or an array.
   */
  permission: Permission | Permission[];
  /**
   * When true, user must have ALL permissions. When false, user needs ANY one.
   * @default false
   */
  requireAll?: boolean;
  /**
   * Content to render when permission check passes
   */
  children: ReactNode;
  /**
   * Optional fallback to render when permission check fails
   */
  fallback?: ReactNode;
}

/**
 * PermissionGate - Conditionally renders children based on user permissions
 *
 * @example
 * ```tsx
 * // Single permission check
 * <PermissionGate permission="canManageMembers">
 *   <MemberManagementPanel />
 * </PermissionGate>
 *
 * // Any of multiple permissions (OR logic)
 * <PermissionGate permission={['canManageBilling', 'canViewCosts']}>
 *   <CostOverview />
 * </PermissionGate>
 *
 * // All permissions required (AND logic)
 * <PermissionGate
 *   permission={['canCreateProjects', 'canManageMembers']}
 *   requireAll
 *   fallback={<UpgradePrompt />}
 * >
 *   <AdvancedProjectCreator />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps): React.ReactElement | null {
  const { can, canAny, canAll } = usePermissions();

  // Determine if permission check passes
  let hasPermission: boolean;

  if (typeof permission === 'string') {
    // Single permission check
    hasPermission = can(permission);
  } else if (Array.isArray(permission)) {
    // Multiple permissions - use requireAll to determine logic
    hasPermission = requireAll
      ? canAll(permission)
      : canAny(permission);
  } else {
    // Invalid permission type - deny access
    hasPermission = false;
  }

  // Permission granted - render children
  if (hasPermission) {
    return <>{children}</>;
  }

  // Permission denied - render fallback
  return <>{fallback}</>;
}

// ============================================================================
// Utility Components
// ============================================================================

export interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AdminOnly - Shorthand for checking admin-level permissions
 *
 * @example
 * ```tsx
 * <AdminOnly>
 *   <DangerZoneSettings />
 * </AdminOnly>
 * ```
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps): React.ReactElement | null {
  const { isAdmin } = usePermissions();

  if (isAdmin) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

export interface OwnerOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * OwnerOnly - Shorthand for checking owner-level permissions
 *
 * @example
 * ```tsx
 * <OwnerOnly>
 *   <TransferOwnershipButton />
 * </OwnerOnly>
 * ```
 */
export function OwnerOnly({ children, fallback = null }: OwnerOnlyProps): React.ReactElement | null {
  const { isOwner } = usePermissions();

  if (isOwner) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

export interface EditAccessProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * EditAccess - Shorthand for checking edit-level permissions (editor, admin, owner)
 *
 * @example
 * ```tsx
 * <EditAccess fallback={<ReadOnlyView />}>
 *   <EditableContent />
 * </EditAccess>
 * ```
 */
export function EditAccess({ children, fallback = null }: EditAccessProps): React.ReactElement | null {
  const { canEdit } = usePermissions();

  if (canEdit) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
