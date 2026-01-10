/**
 * ExternalCollaboratorLimits Component
 *
 * UI for managing monthly cost limits per external collaborator on a project.
 * Shows current usage vs limit and allows admins to set/update limits.
 *
 * Created: 2026-01-11 - Multi-tenancy Phase 4
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { Button } from '../ui/Button';

interface ExternalMember {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  role: string;
  monthlyLimitUsd: number | null;
  usageThisMonthUsd: number;
  usageResetAt: string | null;
}

interface ExternalCollaboratorLimitsProps {
  projectId: string;
  onClose?: () => void;
}

export function ExternalCollaboratorLimits({ projectId, onClose }: ExternalCollaboratorLimitsProps) {
  const { state } = useAppState();
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [members, setMembers] = useState<ExternalMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Load external members
  const loadMembers = useCallback(async () => {
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          monthly_usage_limit_usd,
          usage_this_month_usd,
          usage_reset_at,
          user_settings:user_id (
            display_name,
            user_id
          )
        `)
        .eq('project_id', projectId)
        .eq('source', 'direct');

      if (fetchError) throw fetchError;

      // Get user emails from auth.users via RPC or join
      // For now, we'll use the user_id and try to get display names
      const mappedMembers: ExternalMember[] = (data || []).map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        email: m.user_settings?.user_id || m.user_id,  // Fallback to user_id
        displayName: m.user_settings?.display_name,
        role: m.role,
        monthlyLimitUsd: m.monthly_usage_limit_usd,
        usageThisMonthUsd: m.usage_this_month_usd || 0,
        usageResetAt: m.usage_reset_at,
      }));

      setMembers(mappedMembers);
    } catch (err) {
      console.error('Failed to load external members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Save limit for a member
  const saveLimit = useCallback(async (memberId: string, limit: number | null) => {
    if (!supabase) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: updateError } = await supabase
        .from('project_members')
        .update({ monthly_usage_limit_usd: limit })
        .eq('id', memberId);

      if (updateError) throw updateError;

      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, monthlyLimitUsd: limit } : m
      ));

      setSuccessMessage('Limit updated successfully');
      setEditingId(null);
      setEditValue('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to save limit');
    } finally {
      setIsSaving(false);
    }
  }, [supabase]);

  // Handle edit click
  const handleEditClick = (member: ExternalMember) => {
    setEditingId(member.id);
    setEditValue(member.monthlyLimitUsd?.toString() || '');
  };

  // Handle save click
  const handleSaveClick = (memberId: string) => {
    const limit = editValue.trim() === '' ? null : parseFloat(editValue);
    if (editValue.trim() !== '' && (isNaN(limit!) || limit! < 0)) {
      setError('Please enter a valid positive number or leave empty for unlimited');
      return;
    }
    saveLimit(memberId, limit);
  };

  // Handle remove limit
  const handleRemoveLimit = (memberId: string) => {
    saveLimit(memberId, null);
  };

  // Calculate usage percentage
  const getUsagePercentage = (used: number, limit: number | null): number => {
    if (limit === null || limit === 0) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  // Get usage bar color
  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!supabase) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Database connection not configured.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          External Collaborator Limits
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Set monthly cost limits for external collaborators on this project.
        Leave empty for unlimited access.
      </p>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No external collaborators on this project.</p>
          <p className="text-sm mt-1">
            External collaborators are users added directly to the project (not via organization).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const percentage = getUsagePercentage(member.usageThisMonthUsd, member.monthlyLimitUsd);
            const isEditing = editingId === member.id;

            return (
              <div
                key={member.id}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {member.displayName || member.email}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                        {member.role}
                      </span>
                    </div>

                    {/* Usage display */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Usage this month: ${member.usageThisMonthUsd.toFixed(2)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500">
                          {member.monthlyLimitUsd !== null
                            ? `Limit: $${member.monthlyLimitUsd.toFixed(2)}`
                            : 'Unlimited'}
                        </span>
                      </div>

                      {member.monthlyLimitUsd !== null && (
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getUsageColor(percentage)} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit controls */}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Unlimited"
                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            disabled={isSaving}
                          />
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveClick(member.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditValue('');
                          }}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditClick(member)}
                        >
                          Edit Limit
                        </Button>
                        {member.monthlyLimitUsd !== null && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLimit(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Reset info */}
                {member.usageResetAt && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    Usage resets: {new Date(member.usageResetAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExternalCollaboratorLimits;
