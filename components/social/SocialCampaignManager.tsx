/**
 * SocialCampaignManager Component
 *
 * Complete campaign management: view, edit, export, and track social posts.
 * Can work with newly generated campaigns or saved/reopened ones.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  SocialCampaign,
  SocialPost,
  SocialMediaPlatform,
  CampaignComplianceReport,
  ExportFormat
} from '../../types/social';
import { SOCIAL_PLATFORM_CONFIG, TARGET_COMPLIANCE_SCORE } from '../../types/social';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SocialPostEditor } from './editor/SocialPostEditor';
import { ExportPanel } from './export/ExportPanel';
import PostPreviewCard from './preview/PostPreviewCard';

// Tabs for the manager
type ManagerTab = 'overview' | 'posts' | 'export';

interface SocialCampaignManagerProps {
  campaign: SocialCampaign;
  posts: SocialPost[];
  complianceReport?: CampaignComplianceReport;
  onUpdatePost?: (postId: string, updates: Partial<SocialPost>) => Promise<boolean>;
  onDeletePost?: (postId: string) => Promise<boolean>;
  onMarkAsPosted?: (postId: string, postUrl?: string) => Promise<boolean>;
  onUnmarkAsPosted?: (postId: string) => Promise<boolean>;
  onExport?: (format: ExportFormat, data: string) => void;
  onExportCampaign?: (format: 'json' | 'text' | 'zip') => Promise<void>;
  onClose?: () => void;
  onCampaignUpdate?: (updates: Partial<SocialCampaign>) => Promise<boolean>;
  isExporting?: boolean;
}

export const SocialCampaignManager: React.FC<SocialCampaignManagerProps> = ({
  campaign,
  posts,
  complianceReport,
  onUpdatePost,
  onDeletePost,
  onMarkAsPosted,
  onUnmarkAsPosted,
  onExport,
  onExportCampaign,
  onClose,
  onCampaignUpdate,
  isExporting = false
}) => {
  const [activeTab, setActiveTab] = useState<ManagerTab>('overview');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [markAsPostedPostId, setMarkAsPostedPostId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState('');

  // Separate hub and spoke posts
  const hubPost = useMemo(() => posts.find(p => p.is_hub) || null, [posts]);
  const spokePosts = useMemo(() =>
    posts.filter(p => !p.is_hub).sort((a, b) => (a.spoke_position || 0) - (b.spoke_position || 0)),
    [posts]
  );

  // Group posts by platform
  const postsByPlatform = useMemo(() => {
    return posts.reduce((acc, post) => {
      if (!acc[post.platform]) {
        acc[post.platform] = [];
      }
      acc[post.platform].push(post);
      return acc;
    }, {} as Record<SocialMediaPlatform, SocialPost[]>);
  }, [posts]);

  // Stats
  const stats = useMemo(() => ({
    totalPosts: posts.length,
    platforms: Object.keys(postsByPlatform).length,
    posted: posts.filter(p => p.status === 'posted').length,
    exported: posts.filter(p => p.status === 'exported').length,
    draft: posts.filter(p => p.status === 'draft' || p.status === 'ready').length
  }), [posts, postsByPlatform]);

  // Score colors
  const overallScore = complianceReport?.overall_score || campaign.overall_compliance_score || 0;
  const scoreColor = overallScore >= TARGET_COMPLIANCE_SCORE
    ? 'text-green-400'
    : overallScore >= 70
      ? 'text-yellow-400'
      : 'text-red-400';

  // Handlers
  const handleEditPost = useCallback((post: SocialPost) => {
    setEditingPost({ ...post });
    setShowPostEditor(true);
  }, []);

  const handleSavePost = useCallback(async () => {
    if (!editingPost || !onUpdatePost) return;

    const success = await onUpdatePost(editingPost.id, {
      content_text: editingPost.content_text,
      hashtags: editingPost.hashtags,
      content_thread: editingPost.content_thread
    });

    if (success) {
      setShowPostEditor(false);
      setEditingPost(null);
    }
  }, [editingPost, onUpdatePost]);

  const handleCopyToClipboard = useCallback(async (post: SocialPost) => {
    try {
      let content = post.content_text;
      if (post.hashtags && post.hashtags.length > 0) {
        content += '\n\n' + post.hashtags.map(h => `#${h}`).join(' ');
      }
      await navigator.clipboard.writeText(content);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleMarkAsPosted = useCallback(async () => {
    if (!markAsPostedPostId || !onMarkAsPosted) return;
    await onMarkAsPosted(markAsPostedPostId, postUrl || undefined);
    setMarkAsPostedPostId(null);
    setPostUrl('');
  }, [markAsPostedPostId, postUrl, onMarkAsPosted]);

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Campaign header */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {campaign.campaign_name || 'Social Campaign'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Created {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {Math.round(overallScore)}%
            </div>
            <p className="text-xs text-gray-500">Compliance</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{stats.totalPosts}</div>
            <div className="text-xs text-gray-500">Total Posts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{stats.platforms}</div>
            <div className="text-xs text-gray-500">Platforms</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-400">{stats.posted}</div>
            <div className="text-xs text-gray-500">Posted</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-400">{stats.exported}</div>
            <div className="text-xs text-gray-500">Exported</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-400">{stats.draft}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
        </div>

        {/* UTM info */}
        {campaign.utm_campaign && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              <span className="font-medium">UTM Campaign:</span>{' '}
              <span className="text-gray-400">{campaign.utm_campaign}</span>
            </p>
          </div>
        )}
      </div>

      {/* Platform breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Posts by Platform</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(postsByPlatform).map(([platform, platformPosts]) => {
            const config = SOCIAL_PLATFORM_CONFIG[platform as SocialMediaPlatform];
            const postedCount = platformPosts.filter(p => p.status === 'posted').length;
            return (
              <div
                key={platform}
                className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: config.color }}
                  >
                    <span className="text-white text-xs font-bold">
                      {config.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white">{config.name}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {platformPosts.length} post{platformPosts.length !== 1 ? 's' : ''}
                  {postedCount > 0 && (
                    <span className="text-green-400"> • {postedCount} posted</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setActiveTab('posts')}>
          View All Posts
        </Button>
        <Button variant="secondary" onClick={() => setActiveTab('export')}>
          Export Campaign
        </Button>
      </div>
    </div>
  );

  // Render posts tab
  const renderPosts = () => (
    <div className="space-y-6">
      {/* Hub post */}
      {hubPost && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">H</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-300">Hub Post</h4>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
              {SOCIAL_PLATFORM_CONFIG[hubPost.platform].name}
            </span>
          </div>

          <PostPreviewCard
            post={hubPost}
            compliance={complianceReport?.post_reports?.find(r => r.post_id === hubPost.id)}
            onEdit={onUpdatePost ? () => handleEditPost(hubPost) : undefined}
          />

          {/* Actions for hub post */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCopyToClipboard(hubPost)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                copiedPostId === hubPost.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copiedPostId === hubPost.id ? '✓ Copied!' : 'Copy to Clipboard'}
            </button>
            {onUpdatePost && (
              <button
                type="button"
                onClick={() => handleEditPost(hubPost)}
                className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Edit
              </button>
            )}
            {hubPost.status !== 'posted' && onMarkAsPosted && (
              <button
                type="button"
                onClick={() => setMarkAsPostedPostId(hubPost.id)}
                className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Mark as Posted
              </button>
            )}
            {hubPost.status === 'posted' && onUnmarkAsPosted && (
              <span className="px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded">
                ✓ Posted
                {hubPost.platform_post_url && (
                  <a
                    href={hubPost.platform_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline"
                  >
                    View
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Spoke posts by platform */}
      {Object.entries(postsByPlatform)
        .filter(([platform]) => platform !== hubPost?.platform || postsByPlatform[platform as SocialMediaPlatform].length > 1)
        .map(([platform, platformPosts]) => {
          const config = SOCIAL_PLATFORM_CONFIG[platform as SocialMediaPlatform];
          const relevantPosts = platformPosts.filter(p => !p.is_hub);

          if (relevantPosts.length === 0) return null;

          return (
            <div key={platform} className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: config.color }}
                >
                  <span className="text-white text-xs font-bold">{config.name.charAt(0)}</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-300">
                  {config.name} ({relevantPosts.length} spoke{relevantPosts.length !== 1 ? 's' : ''})
                </h4>
              </div>

              <div className="space-y-4">
                {relevantPosts.map(post => (
                  <div key={post.id} className="space-y-2">
                    <PostPreviewCard
                      post={post}
                      compliance={complianceReport?.post_reports?.find(r => r.post_id === post.id)}
                      onEdit={onUpdatePost ? () => handleEditPost(post) : undefined}
                    />
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(post)}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          copiedPostId === post.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {copiedPostId === post.id ? '✓ Copied!' : 'Copy'}
                      </button>
                      {onUpdatePost && (
                        <button
                          type="button"
                          onClick={() => handleEditPost(post)}
                          className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {post.status !== 'posted' && onMarkAsPosted && (
                        <button
                          type="button"
                          onClick={() => setMarkAsPostedPostId(post.id)}
                          className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                        >
                          Mark Posted
                        </button>
                      )}
                      {post.status === 'posted' && (
                        <span className="px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded">
                          ✓ Posted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );

  // Render export tab
  const renderExport = () => (
    <div className="space-y-6">
      {/* Export options */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="font-medium text-white mb-4">Export Full Campaign</h4>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => onExportCampaign?.('json')}
            disabled={isExporting}
            variant="secondary"
          >
            Download JSON
          </Button>
          <Button
            onClick={() => onExportCampaign?.('text')}
            disabled={isExporting}
            variant="secondary"
          >
            Download Markdown
          </Button>
          <Button
            onClick={() => onExportCampaign?.('zip')}
            disabled={isExporting}
          >
            Download ZIP Package
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          ZIP includes all posts organized by platform with posting instructions.
        </p>
      </div>

      {/* Individual post export */}
      <div>
        <h4 className="font-medium text-white mb-4">Export Individual Posts</h4>
        <div className="space-y-4">
          {posts.map(post => {
            const config = SOCIAL_PLATFORM_CONFIG[post.platform];
            return (
              <div
                key={post.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: config.color }}
                    >
                      <span className="text-white text-xs font-bold">{config.name.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{config.name}</span>
                    {post.is_hub && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">Hub</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(post)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      copiedPostId === post.id
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copiedPostId === post.id ? '✓ Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
                <pre className="text-xs text-gray-400 bg-gray-900 rounded p-3 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {post.content_text.substring(0, 200)}
                  {post.content_text.length > 200 ? '...' : ''}
                </pre>
                {post.posting_instructions && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Posting instructions
                    </summary>
                    <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">
                      {post.posting_instructions}
                    </p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab navigation */}
      <div className="flex border-b border-gray-700 px-4">
        {(['overview', 'posts', 'export'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'posts' && `Posts (${posts.length})`}
            {tab === 'export' && 'Export'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'posts' && renderPosts()}
        {activeTab === 'export' && renderExport()}
      </div>

      {/* Footer */}
      {onClose && (
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      {/* Post editor modal */}
      {showPostEditor && editingPost && (
        <Modal
          isOpen={showPostEditor}
          onClose={() => {
            setShowPostEditor(false);
            setEditingPost(null);
          }}
          title="Edit Post"
          maxWidth="max-w-2xl"
        >
          <SocialPostEditor
            post={editingPost}
            onChange={setEditingPost}
            onSave={handleSavePost}
            onCancel={() => {
              setShowPostEditor(false);
              setEditingPost(null);
            }}
          />
        </Modal>
      )}

      {/* Mark as posted modal */}
      {markAsPostedPostId && (
        <Modal
          isOpen={!!markAsPostedPostId}
          onClose={() => {
            setMarkAsPostedPostId(null);
            setPostUrl('');
          }}
          title="Mark as Posted"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Enter the URL of the published post (optional):
            </p>
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://linkedin.com/posts/..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setMarkAsPostedPostId(null);
                  setPostUrl('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleMarkAsPosted}>
                Confirm Posted
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SocialCampaignManager;
