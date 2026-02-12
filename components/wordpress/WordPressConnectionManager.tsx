// components/wordpress/WordPressConnectionManager.tsx
// UI for managing WordPress site connections

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase, getSupabaseClient } from '../../services/supabaseClient';
import { useAppState } from '../../state/appState';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import {
  WordPressConnection,
  WordPressConnectionStatus
} from '../../types/wordpress';
import { AuditButton } from '../audit/AuditButton';
import {
  getConnectionsForUser,
  addConnection,
  testConnection,
  verifyConnection,
  removeConnection
} from '../../services/wordpress';

// ============================================================================
// Types
// ============================================================================

interface WordPressConnectionManagerProps {
  projectId?: string;
  onConnectionChange?: (connections: WordPressConnection[]) => void;
}

interface AddConnectionModalState {
  isOpen: boolean;
  siteUrl: string;
  siteName: string;
  username: string;
  password: string;
  isLoading: boolean;
  isTesting: boolean;
  testResult?: { success: boolean; message: string };
  error?: string;
}

// ============================================================================
// Component
// ============================================================================

export const WordPressConnectionManager: React.FC<WordPressConnectionManagerProps> = ({
  projectId,
  onConnectionChange
}) => {
  const { state } = useAppState();
  const user = state.user;

  // Get supabase client - memoized to prevent unnecessary re-renders
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [connections, setConnections] = useState<WordPressConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [addModal, setAddModal] = useState<AddConnectionModalState>({
    isOpen: false,
    siteUrl: '',
    siteName: '',
    username: '',
    password: '',
    isLoading: false,
    isTesting: false
  });

  // Load connections
  const loadConnections = useCallback(async () => {
    if (!supabase || !user) {
      console.log('[WP Manager] Skipping load - supabase:', !!supabase, 'user:', !!user);
      setIsLoading(false);
      return;
    }

    console.log('[WP Manager] Loading connections for user:', user.id);
    setIsLoading(true);
    try {
      const data = await getConnectionsForUser(supabase, user.id);
      console.log('[WP Manager] Loaded connections:', data.length);
      setConnections(data);
      onConnectionChange?.(data);
    } catch (error) {
      console.error('[WP Manager] Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user, onConnectionChange]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Test connection before adding
  const handleTestConnection = async () => {
    setAddModal(prev => ({ ...prev, isTesting: true, testResult: undefined, error: undefined }));

    try {
      const result = await testConnection(
        addModal.siteUrl,
        addModal.username,
        addModal.password
      );

      setAddModal(prev => ({
        ...prev,
        isTesting: false,
        testResult: result
      }));
    } catch (error) {
      setAddModal(prev => ({
        ...prev,
        isTesting: false,
        testResult: {
          success: false,
          message: error instanceof Error ? error.message : 'Connection test failed'
        }
      }));
    }
  };

  // Add new connection
  const handleAddConnection = async () => {
    if (!supabase || !user) {
      console.error('[WP Manager] Cannot add - supabase or user not available');
      return;
    }

    console.log('[WP Manager] Adding connection for user:', user.id);
    setAddModal(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const result = await addConnection(supabase, user.id, {
        site_url: addModal.siteUrl,
        site_name: addModal.siteName || undefined,
        api_username: addModal.username,
        api_password: addModal.password,
        project_id: projectId
      });

      console.log('[WP Manager] Add connection result:', result);

      if (!result.success) {
        console.error('[WP Manager] Add failed:', result.error);
        setAddModal(prev => ({ ...prev, isLoading: false, error: result.error }));
        return;
      }

      // Close modal and reload
      setAddModal({
        isOpen: false,
        siteUrl: '',
        siteName: '',
        username: '',
        password: '',
        isLoading: false,
        isTesting: false
      });

      await loadConnections();

      // Auto-verify the new connection
      if (result.connection) {
        handleVerifyConnection(result.connection.id);
      }
    } catch (error) {
      setAddModal(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to add connection'
      }));
    }
  };

  // Verify a connection
  const handleVerifyConnection = async (connectionId: string) => {
    if (!supabase || !user) return;

    setVerifyingId(connectionId);

    try {
      await verifyConnection(supabase, user.id, connectionId);
      await loadConnections();
    } catch (error) {
      console.error('[WP Manager] Verify failed:', error);
    } finally {
      setVerifyingId(null);
    }
  };

  // Remove a connection
  const handleRemoveConnection = async (connectionId: string) => {
    if (!supabase || !user) return;

    if (!confirm('Are you sure you want to remove this WordPress connection? Published posts will not be affected.')) {
      return;
    }

    setRemovingId(connectionId);

    try {
      await removeConnection(supabase, user.id, connectionId);
      await loadConnections();
    } catch (error) {
      console.error('[WP Manager] Remove failed:', error);
    } finally {
      setRemovingId(null);
    }
  };

  // Get status indicator
  const getStatusIndicator = (status: WordPressConnectionStatus) => {
    switch (status) {
      case 'verified':
        return <span className="flex items-center gap-1 text-green-400"><StatusDot color="green" /> Connected</span>;
      case 'pending':
        return <span className="flex items-center gap-1 text-yellow-400"><StatusDot color="yellow" /> Pending Verification</span>;
      case 'error':
        return <span className="flex items-center gap-1 text-red-400"><StatusDot color="red" /> Connection Error</span>;
      case 'disconnected':
        return <span className="flex items-center gap-1 text-gray-400"><StatusDot color="gray" /> Disconnected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">WordPress Connections</h2>
          <p className="text-sm text-gray-400 mt-1">
            Connect WordPress sites to publish content directly
          </p>
        </div>
        <Button
          onClick={() => setAddModal(prev => ({ ...prev, isOpen: true }))}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Site
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && connections.length === 0 && (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
          <GlobeIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No WordPress sites connected</h3>
          <p className="text-gray-400 mb-4 max-w-md mx-auto">
            Connect a WordPress site to publish your content directly from the app.
          </p>
          <Button
            onClick={() => setAddModal(prev => ({ ...prev, isOpen: true }))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Your First Site
          </Button>
        </div>
      )}

      {/* Connection list */}
      {!isLoading && connections.length > 0 && (
        <div className="space-y-3">
          {connections.map(connection => (
            <div
              key={connection.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <GlobeIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-white">
                      {connection.site_name || new URL(connection.site_url).hostname}
                    </span>
                    {getStatusIndicator(connection.status)}
                  </div>

                  <div className="text-sm text-gray-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      <a
                        href={connection.site_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400"
                      >
                        {connection.site_url}
                      </a>
                      <AuditButton url={connection.site_url} variant="icon" size="sm" />
                    </div>

                    {connection.plugin_version && (
                      <div className="flex items-center gap-2">
                        <PlugIcon className="w-4 h-4" />
                        <span>Plugin v{connection.plugin_version}</span>
                      </div>
                    )}

                    {connection.last_sync_at && (
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>Last sync: {formatRelativeTime(connection.last_sync_at)}</span>
                      </div>
                    )}

                    {connection.last_error && (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertIcon className="w-4 h-4" />
                        <span>{connection.last_error}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVerifyConnection(connection.id)}
                    disabled={verifyingId === connection.id}
                  >
                    {verifyingId === connection.id ? (
                      <Loader className="w-4 h-4" />
                    ) : (
                      'Sync'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveConnection(connection.id)}
                    disabled={removingId === connection.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    {removingId === connection.id ? (
                      <Loader className="w-4 h-4" />
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Connection Modal */}
      <Modal
        isOpen={addModal.isOpen}
        onClose={() => setAddModal(prev => ({ ...prev, isOpen: false }))}
        title="Add WordPress Connection"
        description="Connect a WordPress site using Application Passwords"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Site URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              WordPress Site URL *
            </label>
            <input
              type="url"
              value={addModal.siteUrl}
              onChange={e => setAddModal(prev => ({ ...prev, siteUrl: e.target.value }))}
              placeholder="https://example.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Site Name (optional)
            </label>
            <input
              type="text"
              value={addModal.siteName}
              onChange={e => setAddModal(prev => ({ ...prev, siteName: e.target.value }))}
              placeholder="My WordPress Blog"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              WordPress Username *
            </label>
            <input
              type="text"
              value={addModal.username}
              onChange={e => setAddModal(prev => ({ ...prev, username: e.target.value }))}
              placeholder="admin"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Application Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Application Password *
            </label>
            <input
              type="password"
              value={addModal.password}
              onChange={e => setAddModal(prev => ({ ...prev, password: e.target.value }))}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Generate an Application Password in WordPress: Users → Profile → Application Passwords
            </p>
          </div>

          {/* Test Result */}
          {addModal.testResult && (
            <div className={`p-3 rounded-lg ${addModal.testResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className={`flex items-center gap-2 ${addModal.testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {addModal.testResult.success ? <CheckIcon className="w-4 h-4" /> : <AlertIcon className="w-4 h-4" />}
                <span className="text-sm">{addModal.testResult.message}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {addModal.error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400">
                <AlertIcon className="w-4 h-4" />
                <span className="text-sm">{addModal.error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="secondary"
              onClick={() => setAddModal(prev => ({ ...prev, isOpen: false }))}
              disabled={addModal.isLoading || addModal.isTesting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              disabled={!addModal.siteUrl || !addModal.username || !addModal.password || addModal.isTesting || addModal.isLoading}
            >
              {addModal.isTesting ? <Loader className="w-4 h-4 mr-2" /> : null}
              Test Connection
            </Button>
            <Button
              onClick={handleAddConnection}
              disabled={!addModal.siteUrl || !addModal.username || !addModal.password || addModal.isLoading || addModal.isTesting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addModal.isLoading ? <Loader className="w-4 h-4 mr-2" /> : null}
              Add Connection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

const StatusDot: React.FC<{ color: 'green' | 'yellow' | 'red' | 'gray' }> = ({ color }) => {
  const colorClasses = {
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
    gray: 'bg-gray-400'
  };

  return <span className={`w-2 h-2 rounded-full ${colorClasses[color]}`} />;
};

// ============================================================================
// Icons
// ============================================================================

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const PlugIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ============================================================================
// Utilities
// ============================================================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}

export default WordPressConnectionManager;
