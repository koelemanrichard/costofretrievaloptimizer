// components/wordpress/PublicationDetailsModal.tsx
// Modal showing detailed publication information, stats, and version history

import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import { useAppState } from '../../state/appState';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import {
  WordPressPublication,
  WordPressConnection,
  PublicationHistoryEntry
} from '../../types/wordpress';
import { EnrichedTopic } from '../../types';
import { AuditButton } from '../audit/AuditButton';
import {
  getPublicationForTopic,
  getPublicationHistory,
  syncPublicationStatus
} from '../../services/wordpress';

// ============================================================================
// Types
// ============================================================================

interface PublicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: EnrichedTopic;
  connection?: WordPressConnection;
  onPublish?: () => void;
  currentContentHash?: string;
}

// ============================================================================
// Component
// ============================================================================

export const PublicationDetailsModal: React.FC<PublicationDetailsModalProps> = ({
  isOpen,
  onClose,
  topic,
  connection,
  onPublish,
  currentContentHash
}) => {
  const { state } = useAppState();
  const user = state.user;

  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [publication, setPublication] = useState<WordPressPublication | null>(null);
  const [history, setHistory] = useState<PublicationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load publication and history
  useEffect(() => {
    if (!isOpen || !supabase || !connection) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const pub = await getPublicationForTopic(supabase, topic.id, connection.id);
        setPublication(pub);

        if (pub) {
          const hist = await getPublicationHistory(supabase, pub.id);
          setHistory(hist);
        }
      } catch (err) {
        console.error('[Publication Details] Load error:', err);
        setError('Failed to load publication details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, supabase, topic.id, connection]);

  // Sync with WordPress
  const handleSync = async () => {
    if (!supabase || !user || !publication) return;

    setIsSyncing(true);
    try {
      const result = await syncPublicationStatus(supabase, user.id, publication.id);
      if (result.success && result.publication) {
        setPublication(result.publication);
        // Reload history
        const hist = await getPublicationHistory(supabase, publication.id);
        setHistory(hist);
      }
    } catch (err) {
      console.error('[Publication Details] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Check if content has changed
  const hasChanges = publication && currentContentHash && publication.app_version_hash !== currentContentHash;

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending_review': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'trashed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Format relative time
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publication Details"
      description={topic.title}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6" />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {!isLoading && !publication && (
          <div className="text-center py-8">
            <NotPublishedIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Not Published</h3>
            <p className="text-gray-400 mb-4">
              This topic hasn't been published to WordPress yet.
            </p>
            {onPublish && (
              <Button onClick={onPublish}>
                Publish Now
              </Button>
            )}
          </div>
        )}

        {!isLoading && publication && (
          <>
            {/* Status & URL */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(publication.status)}`}>
                    {publication.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {publication.wp_post_type === 'page' ? 'Page' : 'Post'}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? <Loader className="w-4 h-4" /> : <SyncIcon className="w-4 h-4" />}
                  <span className="ml-1">Sync</span>
                </Button>
              </div>

              {publication.wp_post_url && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">WordPress URL</label>
                  <div className="flex items-center gap-2">
                    <a
                      href={publication.wp_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm break-all"
                    >
                      {publication.wp_post_url}
                    </a>
                    <AuditButton url={publication.wp_post_url} variant="icon" size="sm" />
                  </div>
                </div>
              )}

              {hasChanges && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400">
                    <UpdateIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Content has changed since last publish</span>
                  </div>
                  {onPublish && (
                    <Button
                      className="mt-2"
                      size="sm"
                      onClick={onPublish}
                    >
                      Update on WordPress
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <label className="text-xs text-gray-500 block mb-1">First Published</label>
                <p className="text-white text-sm">{formatDate(publication.published_at)}</p>
                {publication.published_at && (
                  <p className="text-gray-500 text-xs">{formatRelativeTime(publication.published_at)}</p>
                )}
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <label className="text-xs text-gray-500 block mb-1">Last Updated</label>
                <p className="text-white text-sm">{formatDate(publication.last_pushed_at)}</p>
                {publication.last_pushed_at && (
                  <p className="text-gray-500 text-xs">{formatRelativeTime(publication.last_pushed_at)}</p>
                )}
              </div>
            </div>

            {/* Version Info */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <label className="text-xs text-gray-500 block mb-2">Version Tracking</label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">App Version:</span>
                  <code className="ml-2 text-xs text-gray-500 bg-gray-900 px-1 rounded">
                    {publication.app_version_hash?.substring(0, 8) || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="text-gray-400">WP Version:</span>
                  <code className="ml-2 text-xs text-gray-500 bg-gray-900 px-1 rounded">
                    {publication.wp_version_hash?.substring(0, 8) || 'N/A'}
                  </code>
                </div>
              </div>
              {publication.has_wp_changes && (
                <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                  <WarningIcon className="w-3 h-3" />
                  WordPress content differs from app version
                </p>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Publication History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-2 bg-gray-800/30 rounded text-sm"
                    >
                      <HistoryIcon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300">
                          {formatHistoryAction(entry)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDate(entry.created_at)} • {entry.triggered_by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {publication.wp_post_url && (
                <Button
                  onClick={() => window.open(publication.wp_post_url, '_blank')}
                >
                  <ExternalLinkIcon className="w-4 h-4 mr-2" />
                  View on WordPress
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Format history action for display
function formatHistoryAction(entry: PublicationHistoryEntry): string {
  switch (entry.action) {
    case 'created':
      return `Published as ${entry.new_status || 'draft'}`;
    case 'updated':
      return 'Content updated';
    case 'status_changed':
      return `Status changed from ${entry.previous_status} to ${entry.new_status}`;
    case 'conflict_detected':
      return 'Conflict detected with WordPress version';
    case 'conflict_resolved':
      return `Conflict resolved: ${entry.content_diff_summary || 'merged'}`;
    case 'deleted':
      return 'Post deleted or trashed';
    default:
      return entry.action.replace('_', ' ');
  }
}

// ============================================================================
// Icons
// ============================================================================

const NotPublishedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const SyncIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const UpdateIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

export default PublicationDetailsModal;
