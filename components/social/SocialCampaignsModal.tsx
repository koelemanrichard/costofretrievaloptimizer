/**
 * SocialCampaignsModal Component
 *
 * Modal for viewing, managing, and reopening saved social media campaigns.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type {
  SocialCampaign,
  SocialPost,
  SocialCampaignStatus,
  CampaignComplianceReport
} from '../../types/social';
import { CampaignList } from './campaigns/CampaignList';
import { SocialCampaignManager } from './SocialCampaignManager';

interface SocialCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  campaigns: Array<{ campaign: SocialCampaign; posts: SocialPost[] }>;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onCreateNew: () => void;
  onUpdatePost?: (postId: string, updates: Partial<SocialPost>) => Promise<boolean>;
  onUpdateCampaign?: (campaignId: string, updates: Partial<SocialCampaign>) => Promise<boolean>;
  onDeleteCampaign?: (campaignId: string) => Promise<boolean>;
  onExportCampaign?: (campaign: SocialCampaign, posts: SocialPost[], format: 'json' | 'text' | 'zip') => Promise<void>;
}

export const SocialCampaignsModal: React.FC<SocialCampaignsModalProps> = ({
  isOpen,
  onClose,
  topicId,
  campaigns,
  isLoading,
  error,
  onRefresh,
  onCreateNew,
  onUpdatePost,
  onUpdateCampaign,
  onDeleteCampaign,
  onExportCampaign
}) => {
  const [selectedCampaign, setSelectedCampaign] = useState<SocialCampaign | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<SocialPost[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'manage'>('list');
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewMode('list');
      setSelectedCampaign(null);
      setSelectedPosts([]);
    }
  }, [isOpen]);

  // Handle selecting a campaign to view
  const handleSelectCampaign = useCallback((campaign: SocialCampaign) => {
    const campaignData = campaigns.find(c => c.campaign.id === campaign.id);
    if (campaignData) {
      setSelectedCampaign(campaignData.campaign);
      setSelectedPosts(campaignData.posts);
      setViewMode('manage');
    }
  }, [campaigns]);

  // Handle export
  const handleExportCampaign = useCallback(async (format: 'json' | 'text' | 'zip') => {
    if (!selectedCampaign || !selectedPosts.length) return;

    setIsExporting(true);
    try {
      if (onExportCampaign) {
        await onExportCampaign(selectedCampaign, selectedPosts, format);
      } else {
        // Default export
        const campaignSlug = selectedCampaign.campaign_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'campaign';
        const timestamp = new Date().toISOString().slice(0, 10);

        let content: string;
        let filename: string;
        let mimeType: string;

        if (format === 'json') {
          content = JSON.stringify({ campaign: selectedCampaign, posts: selectedPosts }, null, 2);
          filename = `${campaignSlug}-${timestamp}.json`;
          mimeType = 'application/json';
        } else {
          content = buildMarkdownExport(selectedCampaign, selectedPosts);
          filename = `${campaignSlug}-${timestamp}.md`;
          mimeType = 'text/markdown';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [selectedCampaign, selectedPosts, onExportCampaign]);

  // Handle post update
  const handleUpdatePost = useCallback(async (postId: string, updates: Partial<SocialPost>): Promise<boolean> => {
    // Update local state
    setSelectedPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    ));

    // Persist to DB if handler provided
    if (onUpdatePost) {
      return onUpdatePost(postId, updates);
    }

    return true;
  }, [onUpdatePost]);

  // Handle marking post as posted
  const handleMarkAsPosted = useCallback(async (postId: string, postUrl?: string): Promise<boolean> => {
    return handleUpdatePost(postId, {
      status: 'posted',
      manually_posted_at: new Date().toISOString(),
      platform_post_url: postUrl
    });
  }, [handleUpdatePost]);

  // Handle unmarking post as posted
  const handleUnmarkAsPosted = useCallback(async (postId: string): Promise<boolean> => {
    return handleUpdatePost(postId, {
      status: 'ready',
      manually_posted_at: undefined,
      platform_post_url: undefined
    });
  }, [handleUpdatePost]);

  // Handle delete campaign
  const handleDeleteCampaign = useCallback(async (campaignId: string) => {
    if (onDeleteCampaign) {
      const success = await onDeleteCampaign(campaignId);
      if (success) {
        setDeleteConfirmId(null);
        setViewMode('list');
        setSelectedCampaign(null);
        await onRefresh();
      }
    }
  }, [onDeleteCampaign, onRefresh]);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedCampaign(null);
    setSelectedPosts([]);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <p className="text-gray-400">Loading campaigns...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={onRefresh}>Retry</Button>
        </div>
      );
    }

    if (viewMode === 'manage' && selectedCampaign) {
      return (
        <div className="space-y-4">
          {/* Back button */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToList}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              Back to campaigns
            </button>

            {/* Delete button */}
            {onDeleteCampaign && (
              <button
                type="button"
                onClick={() => setDeleteConfirmId(selectedCampaign.id)}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
              >
                Delete Campaign
              </button>
            )}
          </div>

          {/* Campaign manager */}
          <SocialCampaignManager
            campaign={selectedCampaign}
            posts={selectedPosts}
            onUpdatePost={handleUpdatePost}
            onMarkAsPosted={handleMarkAsPosted}
            onUnmarkAsPosted={handleUnmarkAsPosted}
            onExportCampaign={handleExportCampaign}
            isExporting={isExporting}
          />
        </div>
      );
    }

    // List view
    return (
      <CampaignList
        campaigns={campaigns}
        onSelect={handleSelectCampaign}
        onExport={(campaign, posts) => {
          setSelectedCampaign(campaign);
          setSelectedPosts(posts);
          setViewMode('manage');
        }}
        onCreateNew={onCreateNew}
        emptyMessage="No social campaigns yet. Create your first campaign from the Social Posts button."
      />
    );
  };

  const renderFooter = () => {
    if (viewMode === 'manage') {
      return (
        <div className="flex items-center justify-end w-full gap-3">
          <Button variant="secondary" onClick={handleBackToList}>
            Back to List
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full">
        <div className="text-sm text-gray-500">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onRefresh} disabled={isLoading}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={viewMode === 'manage' && selectedCampaign
          ? selectedCampaign.campaign_name || 'Campaign'
          : 'Social Media Campaigns'
        }
        maxWidth={viewMode === 'manage' ? 'max-w-5xl' : 'max-w-4xl'}
        footer={renderFooter()}
      >
        <div className={viewMode === 'manage' ? 'min-h-[500px]' : ''}>
          {renderContent()}
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Campaign"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete this campaign? This will permanently remove all posts in the campaign.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDeleteCampaign(deleteConfirmId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// Helper function to build markdown export
function buildMarkdownExport(campaign: SocialCampaign, posts: SocialPost[]): string {
  let content = `# Social Media Campaign: ${campaign.campaign_name || 'Untitled'}\n\n`;
  content += `Created: ${new Date(campaign.created_at).toLocaleDateString()}\n`;
  content += `Status: ${campaign.status}\n`;
  if (campaign.utm_campaign) {
    content += `UTM Campaign: ${campaign.utm_campaign}\n`;
  }
  content += `\n---\n\n`;

  // Group by platform
  const byPlatform = posts.reduce((acc, post) => {
    if (!acc[post.platform]) acc[post.platform] = [];
    acc[post.platform].push(post);
    return acc;
  }, {} as Record<string, SocialPost[]>);

  for (const [platform, platformPosts] of Object.entries(byPlatform)) {
    content += `## ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n\n`;

    for (const post of platformPosts) {
      content += `### ${post.is_hub ? 'Hub Post' : `Spoke #${post.spoke_position || 1}`}\n\n`;
      content += `**Status:** ${post.status}\n`;
      content += `**Type:** ${post.post_type}\n\n`;
      content += `**Content:**\n\n${post.content_text}\n\n`;

      if (post.hashtags && post.hashtags.length > 0) {
        content += `**Hashtags:** ${post.hashtags.map(h => `#${h}`).join(' ')}\n\n`;
      }

      if (post.link_url) {
        content += `**Link:** ${post.link_url}\n\n`;
      }

      if (post.posting_instructions) {
        content += `**Instructions:**\n\n${post.posting_instructions}\n\n`;
      }

      content += `---\n\n`;
    }
  }

  return content;
}

export default SocialCampaignsModal;
