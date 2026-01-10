/**
 * OrganizationManagement Component
 *
 * Admin interface for managing organizations system-wide.
 * Allows super admins to view all organizations, manage members,
 * and assign users to organizations.
 *
 * Created: 2026-01-10 - Multi-tenancy Admin Interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationType,
} from '../../types';

// ============================================================================
// Types
// ============================================================================

interface OrganizationWithDetails extends Organization {
  member_count: number;
  project_count: number;
  owner_email?: string;
}

interface MemberWithUser extends OrganizationMember {
  user?: {
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
    };
  };
}

interface UserForAssignment {
  id: string;
  email: string;
  raw_user_meta_data?: {
    full_name?: string;
    name?: string;
  };
}

// ============================================================================
// Component
// ============================================================================

const OrganizationManagement: React.FC = () => {
  const { state } = useAppState();
  const [organizations, setOrganizations] = useState<OrganizationWithDetails[]>([]);
  const [users, setUsers] = useState<UserForAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithDetails | null>(null);
  const [orgMembers, setOrgMembers] = useState<MemberWithUser[]>([]);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // Form state for assigning user
  const [assignForm, setAssignForm] = useState({
    userId: '',
    role: 'viewer' as OrganizationRole,
  });
  const [isAssigning, setIsAssigning] = useState(false);

  const supabase = state.businessInfo.supabaseUrl && state.businessInfo.supabaseAnonKey
    ? getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey)
    : null;

  // Fetch all organizations
  const fetchOrganizations = useCallback(async () => {
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get organizations with member and project counts
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members (count),
          projects (count)
        `)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Get owner emails
      const ownerIds = [...new Set((orgs || []).map(o => o.owner_id))];
      const { data: owners } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', ownerIds);

      const ownerMap = new Map((owners || []).map(o => [o.id, o.email]));

      const orgsWithDetails: OrganizationWithDetails[] = (orgs || []).map(org => ({
        ...org,
        member_count: org.organization_members?.[0]?.count || 0,
        project_count: org.projects?.[0]?.count || 0,
        owner_email: ownerMap.get(org.owner_id) || 'Unknown',
      }));

      setOrganizations(orgsWithDetails);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Fetch all users (for assignment dropdown)
  const fetchUsers = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-users', { method: 'GET' });
      if (error) throw error;
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [supabase]);

  // Fetch members for selected organization
  const fetchOrgMembers = useCallback(async (orgId: string) => {
    if (!supabase) return;

    setIsMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          user:user_profiles!organization_members_user_id_fkey (
            email,
            raw_user_meta_data
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrgMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsMembersLoading(false);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    fetchOrganizations();
    fetchUsers();
  }, [fetchOrganizations, fetchUsers]);

  // Open members modal
  const openMembersModal = (org: OrganizationWithDetails) => {
    setSelectedOrg(org);
    setIsMembersModalOpen(true);
    fetchOrgMembers(org.id);
  };

  // Open assign user modal
  const openAssignModal = (org: OrganizationWithDetails) => {
    setSelectedOrg(org);
    setAssignForm({ userId: '', role: 'viewer' });
    setIsAssignModalOpen(true);
  };

  // Assign user to organization
  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedOrg) return;

    setIsAssigning(true);
    setError(null);

    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', selectedOrg.id)
        .eq('user_id', assignForm.userId)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }

      // Add member
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: selectedOrg.id,
          user_id: assignForm.userId,
          role: assignForm.role,
          accepted_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Refresh organization list and close modal
      await fetchOrganizations();
      setIsAssignModalOpen(false);
    } catch (err) {
      console.error('Failed to assign user:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign user');
    } finally {
      setIsAssigning(false);
    }
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: OrganizationRole) => {
    if (!supabase || !selectedOrg) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      await fetchOrgMembers(selectedOrg.id);
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (!supabase || !selectedOrg) return;

    if (memberRole === 'owner') {
      setError('Cannot remove the organization owner');
      return;
    }

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await fetchOrgMembers(selectedOrg.id);
      await fetchOrganizations();
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const getOrgTypeBadge = (type: OrganizationType) => {
    const styles = {
      personal: 'bg-gray-700 text-gray-300',
      team: 'bg-blue-900 text-blue-200',
      enterprise: 'bg-purple-900 text-purple-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const getRoleBadge = (role: OrganizationRole) => {
    const styles = {
      owner: 'bg-yellow-900 text-yellow-200',
      admin: 'bg-purple-900 text-purple-200',
      editor: 'bg-blue-900 text-blue-200',
      viewer: 'bg-gray-700 text-gray-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${styles[role]}`}>
        {role}
      </span>
    );
  };

  const getUserDisplayName = (user?: { email: string; raw_user_meta_data?: { full_name?: string; name?: string } }) => {
    if (!user) return 'Unknown';
    const name = user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name;
    return name || user.email;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Organization Management</h3>
          <p className="text-sm text-gray-400 mt-1">
            Manage all organizations and their members
          </p>
        </div>
        <Button
          className="text-xs py-2"
          onClick={fetchOrganizations}
          variant="secondary"
        >
          {isLoading ? <Loader className="w-4 h-4" /> : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700/50 rounded text-sm text-red-300">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Organizations Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-800 text-gray-200 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3 text-center">Members</th>
                <th className="px-4 py-3 text-center">Projects</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader className="w-6 h-6 mx-auto" />
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center italic">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{org.name}</div>
                      <div className="text-xs text-gray-500">{org.slug}</div>
                    </td>
                    <td className="px-4 py-3">{getOrgTypeBadge(org.type)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300">{org.owner_email}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                        {org.member_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                        {org.project_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openMembersModal(org)}
                        className="text-blue-400 hover:text-blue-300 text-xs underline"
                      >
                        Members
                      </button>
                      <button
                        onClick={() => openAssignModal(org)}
                        className="text-green-400 hover:text-green-300 text-xs underline"
                      >
                        + Add User
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Members Modal */}
      <Modal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        title={`Members - ${selectedOrg?.name || ''}`}
        maxWidth="max-w-3xl"
      >
        {isMembersLoading ? (
          <div className="py-8 text-center">
            <Loader className="w-6 h-6 mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-800 text-gray-200 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Joined</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {orgMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center italic">
                      No members found.
                    </td>
                  </tr>
                ) : (
                  orgMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-2">
                        <div className="text-white">{getUserDisplayName(member.user)}</div>
                        <div className="text-xs text-gray-500">{member.user?.email}</div>
                      </td>
                      <td className="px-4 py-2">
                        {member.role === 'owner' ? (
                          getRoleBadge(member.role)
                        ) : (
                          <Select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value as OrganizationRole)}
                            className="py-1 text-xs"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {member.accepted_at
                          ? new Date(member.accepted_at).toLocaleDateString()
                          : 'Pending'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.role)}
                            className="text-red-400 hover:text-red-300 text-xs underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Assign User Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Add User to ${selectedOrg?.name || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignUser} className="space-y-4">
          <div>
            <Label>Select User</Label>
            <Select
              value={assignForm.userId}
              onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
              required
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                  {(user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name) &&
                    ` (${user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name})`}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select
              value={assignForm.role}
              onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value as OrganizationRole })}
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAssigning || !assignForm.userId}>
              {isAssigning ? <Loader className="w-4 h-4" /> : 'Add User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OrganizationManagement;
