// components/wordpress/PublishToWordPressModal.tsx
// Modal for publishing content to WordPress with full options

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import { useAppState } from '../../state/appState';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import {
  WordPressConnection,
  PublishOptions,
  WpCategory,
  WordPressPublication
} from '../../types/wordpress';
import { EnrichedTopic, ContentBrief } from '../../types';
import {
  getConnectionsForUser,
  publishTopic,
  getPublicationForTopic
} from '../../services/wordpress';
import { WordPressApiClient } from '../../services/wordpress/apiClient';
import { getAuthenticatedClient } from '../../services/wordpress/connectionService';

// ============================================================================
// Types
// ============================================================================

interface PublishToWordPressModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: EnrichedTopic;
  articleDraft: string;
  brief?: ContentBrief;
  onPublishSuccess?: (publication: WordPressPublication) => void;
}

interface FormState {
  connectionId: string;
  status: 'draft' | 'publish' | 'pending' | 'future';
  scheduledDate: string;
  scheduledTime: string;
  categoryId: number | null;
  tags: string[];
  tagInput: string;
  focusKeyword: string;
  metaDescription: string;
  useHeroImage: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PublishToWordPressModal: React.FC<PublishToWordPressModalProps> = ({
  isOpen,
  onClose,
  topic,
  articleDraft,
  brief,
  onPublishSuccess
}) => {
  const { state } = useAppState();
  const user = state.user;

  // Get supabase client - memoized to prevent unnecessary re-renders
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  // State
  const [connections, setConnections] = useState<WordPressConnection[]>([]);
  const [categories, setCategories] = useState<WpCategory[]>([]);
  const [existingPublication, setExistingPublication] = useState<WordPressPublication | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    connectionId: '',
    status: 'draft',
    scheduledDate: '',
    scheduledTime: '10:00',
    categoryId: null,
    tags: [],
    tagInput: '',
    focusKeyword: brief?.targetKeyword || topic.title.split(' ').slice(0, 3).join(' '),
    metaDescription: brief?.metaDescription || '',
    useHeroImage: true
  });

  // Load connections on mount
  useEffect(() => {
    if (!isOpen || !supabase || !user) return;

    const loadConnections = async () => {
      setIsLoadingConnections(true);
      try {
        const data = await getConnectionsForUser(supabase, user.id);
        const verified = data.filter(c => c.status === 'verified');
        setConnections(verified);

        if (verified.length > 0 && !form.connectionId) {
          setForm(prev => ({ ...prev, connectionId: verified[0].id }));
        }
      } catch (err) {
        console.error('[Publish Modal] Failed to load connections:', err);
      } finally {
        setIsLoadingConnections(false);
      }
    };

    loadConnections();
  }, [isOpen, supabase, user]);

  // Check for existing publication
  useEffect(() => {
    if (!isOpen || !supabase || !form.connectionId) return;

    const checkExisting = async () => {
      const pub = await getPublicationForTopic(supabase, topic.id, form.connectionId);
      setExistingPublication(pub);
    };

    checkExisting();
  }, [isOpen, supabase, topic.id, form.connectionId]);

  // Load categories when connection changes
  useEffect(() => {
    if (!form.connectionId || !supabase || !user) return;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const clientResult = await getAuthenticatedClient(supabase, user.id, form.connectionId);
        if ('error' in clientResult) {
          console.error('[Publish Modal] Failed to get client:', clientResult.error);
          return;
        }

        const result = await clientResult.client.getCategories({ per_page: 100 });
        if (result.success && result.data) {
          setCategories(result.data);
        }
      } catch (err) {
        console.error('[Publish Modal] Failed to load categories:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [form.connectionId, supabase, user]);

  // Handle form changes
  const updateForm = (updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
    setError(null);
    setSuccess(null);
  };

  // Add tag
  const addTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      updateForm({
        tags: [...form.tags, tag],
        tagInput: ''
      });
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    updateForm({
      tags: form.tags.filter(t => t !== tag)
    });
  };

  // Handle publish
  const handlePublish = async () => {
    if (!supabase || !user || !form.connectionId) return;

    setIsPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      // Build options
      const options: PublishOptions = {
        status: form.status,
        categories: form.categoryId ? [form.categoryId] : undefined
        // TODO: Implement tag name to ID lookup before passing tags
        // tags: form.tags would need to be converted to IDs first
      };

      // Add scheduling if future post
      if (form.status === 'future' && form.scheduledDate) {
        const scheduledAt = new Date(`${form.scheduledDate}T${form.scheduledTime}`);
        options.scheduled_at = scheduledAt.toISOString();
      }

      // Add SEO meta
      if (form.focusKeyword || form.metaDescription) {
        options.yoast_meta = {
          focus_keyword: form.focusKeyword || undefined,
          meta_description: form.metaDescription || undefined
        };
        options.rankmath_meta = {
          focus_keyword: form.focusKeyword || undefined,
          meta_description: form.metaDescription || undefined
        };
      }

      // Publish
      const result = await publishTopic(
        supabase,
        user.id,
        form.connectionId,
        topic,
        articleDraft,
        brief,
        options
      );

      if (!result.success) {
        setError(result.error || 'Publishing failed');
        return;
      }

      const statusText = form.status === 'publish' ? 'Published' :
                        form.status === 'future' ? 'Scheduled' :
                        form.status === 'draft' ? 'Saved as draft' : 'Submitted for review';

      setSuccess(`${statusText} successfully! ${result.wpPost?.link ? 'View post →' : ''}`);

      if (result.publication) {
        onPublishSuccess?.(result.publication);
      }

      // Close after delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  // Get selected connection
  const selectedConnection = connections.find(c => c.id === form.connectionId);

  // Word count
  const wordCount = articleDraft.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingPublication ? 'Update on WordPress' : 'Publish to WordPress'}
      description={`${topic.title} (${wordCount.toLocaleString()} words)`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Loading connections */}
        {isLoadingConnections && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6" />
          </div>
        )}

        {/* No connections */}
        {!isLoadingConnections && connections.length === 0 && (
          <div className="text-center py-8">
            <GlobeIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No WordPress sites connected</h3>
            <p className="text-gray-400 mb-4">
              Connect a WordPress site first to publish your content.
            </p>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        )}

        {/* Form */}
        {!isLoadingConnections && connections.length > 0 && (
          <>
            {/* Existing publication warning */}
            {existingPublication && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-300 font-medium">
                      Already published to this site
                    </p>
                    <p className="text-xs text-yellow-400/70 mt-1">
                      This will update the existing post at {existingPublication.wp_post_url}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Connection selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Destination Site
              </label>
              <select
                value={form.connectionId}
                onChange={e => updateForm({ connectionId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {connections.map(conn => (
                  <option key={conn.id} value={conn.id}>
                    {conn.site_name || new URL(conn.site_url).hostname}
                  </option>
                ))}
              </select>
            </div>

            {/* Status selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Publication Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <StatusOption
                  value="draft"
                  current={form.status}
                  onChange={v => updateForm({ status: v as typeof form.status })}
                  icon={<DraftIcon className="w-5 h-5" />}
                  label="Save as Draft"
                  description="Save without publishing"
                />
                <StatusOption
                  value="publish"
                  current={form.status}
                  onChange={v => updateForm({ status: v as typeof form.status })}
                  icon={<PublishIcon className="w-5 h-5" />}
                  label="Publish Now"
                  description="Make live immediately"
                />
                <StatusOption
                  value="future"
                  current={form.status}
                  onChange={v => updateForm({ status: v as typeof form.status })}
                  icon={<ScheduleIcon className="w-5 h-5" />}
                  label="Schedule"
                  description="Publish at a specific time"
                />
                <StatusOption
                  value="pending"
                  current={form.status}
                  onChange={v => updateForm({ status: v as typeof form.status })}
                  icon={<ReviewIcon className="w-5 h-5" />}
                  label="Pending Review"
                  description="Submit for approval"
                />
              </div>
            </div>

            {/* Schedule date/time */}
            {form.status === 'future' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={e => updateForm({ scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={e => updateForm({ scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select
                value={form.categoryId || ''}
                onChange={e => updateForm({ categoryId: e.target.value ? Number(e.target.value) : null })}
                disabled={isLoadingCategories}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent ? '— ' : ''}{cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={form.tagInput}
                  onChange={e => updateForm({ tagInput: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500"
                />
                <Button variant="secondary" onClick={addTag} disabled={!form.tagInput.trim()}>
                  Add
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-100"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SEO Settings */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <SeoIcon className="w-4 h-4" />
                SEO Settings (Yoast/RankMath)
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Focus Keyword
                  </label>
                  <input
                    type="text"
                    value={form.focusKeyword}
                    onChange={e => updateForm({ focusKeyword: e.target.value })}
                    placeholder="Main keyword to target"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Meta Description ({form.metaDescription.length}/160)
                  </label>
                  <textarea
                    value={form.metaDescription}
                    onChange={e => updateForm({ metaDescription: e.target.value.slice(0, 160) })}
                    placeholder="Brief description for search results..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Error/Success messages */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertIcon className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckIcon className="w-4 h-4" />
                  <span className="text-sm">{success}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button variant="secondary" onClick={onClose} disabled={isPublishing}>
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || !form.connectionId || (form.status === 'future' && !form.scheduledDate)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isPublishing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <PublishIcon className="w-4 h-4 mr-2" />
                    {existingPublication ? 'Update' : 'Publish'}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

interface StatusOptionProps {
  value: string;
  current: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const StatusOption: React.FC<StatusOptionProps> = ({
  value,
  current,
  onChange,
  icon,
  label,
  description
}) => {
  const isSelected = value === current;

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`p-3 rounded-lg border text-left transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      }`}
    >
      <div className={`flex items-center gap-2 mb-1 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
        {icon}
        <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
          {label}
        </span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </button>
  );
};

// ============================================================================
// Icons
// ============================================================================

const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DraftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PublishIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ScheduleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ReviewIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const SeoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default PublishToWordPressModal;
