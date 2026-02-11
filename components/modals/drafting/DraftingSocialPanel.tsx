// components/modals/drafting/DraftingSocialPanel.tsx
// UI components for social media modals in DraftingModal

import React from 'react';
import { TransformToSocialModal } from '../../social/transformation/TransformToSocialModal';
import { SocialCampaignsModal } from '../../social/SocialCampaignsModal';
import type { ArticleTransformationSource, TransformationConfig, SocialCampaign, SocialPost } from '../../../types/social';

interface DraftingSocialPanelProps {
  // Data
  activeBriefTopicId: string;
  socialTransformSource: ArticleTransformationSource | null;

  // Social campaigns data
  campaigns: Array<{ campaign: SocialCampaign; posts: SocialPost[] }>;
  campaignsLoading: boolean;
  campaignsError: string | null;

  // Modal states
  showSocialModal: boolean;
  showCampaignsModal: boolean;

  // Callbacks
  onCloseSocialModal: () => void;
  onCloseCampaignsModal: () => void;
  onOpenSocialModal: () => void;
  onTransform: (config: TransformationConfig) => Promise<any>;
  onRefreshCampaigns: () => Promise<void>;
  onUpdatePost: (postId: string, updates: Partial<SocialPost>) => Promise<boolean>;
  onUpdateCampaign: (campaignId: string, updates: any) => Promise<boolean>;
  onDeleteCampaign: (campaignId: string) => Promise<boolean>;
  dispatch: React.Dispatch<any>;
}

/**
 * Social media modals for DraftingModal.
 * Renders TransformToSocialModal and SocialCampaignsModal.
 */
export const DraftingSocialPanel: React.FC<DraftingSocialPanelProps> = ({
  activeBriefTopicId,
  socialTransformSource,
  campaigns,
  campaignsLoading,
  campaignsError,
  showSocialModal,
  showCampaignsModal,
  onCloseSocialModal,
  onCloseCampaignsModal,
  onOpenSocialModal,
  onTransform,
  onRefreshCampaigns,
  onUpdatePost,
  onUpdateCampaign,
  onDeleteCampaign,
  dispatch,
}) => {
  return (
    <>
      {/* Social Media Posts Modal */}
      {showSocialModal && socialTransformSource && (
        <TransformToSocialModal
          isOpen={showSocialModal}
          onClose={onCloseSocialModal}
          source={socialTransformSource}
          onTransform={onTransform as any}
          onComplete={(campaign, posts) => {
            dispatch({
              type: 'SET_NOTIFICATION',
              payload: `Created social campaign with ${posts.length} posts across ${new Set(posts.map(p => p.platform)).size} platforms`
            });
            onCloseSocialModal();
            onRefreshCampaigns();
          }}
        />
      )}

      {/* Social Campaigns Modal */}
      <SocialCampaignsModal
        isOpen={showCampaignsModal}
        onClose={onCloseCampaignsModal}
        topicId={activeBriefTopicId}
        campaigns={campaigns}
        isLoading={campaignsLoading}
        error={campaignsError}
        onRefresh={onRefreshCampaigns}
        onCreateNew={() => {
          onCloseCampaignsModal();
          onOpenSocialModal();
        }}
        onUpdatePost={onUpdatePost}
        onUpdateCampaign={async (campaignId, updates) => {
          return onUpdateCampaign(campaignId, updates);
        }}
        onDeleteCampaign={async (campaignId) => {
          return onDeleteCampaign(campaignId);
        }}
      />
    </>
  );
};

export default DraftingSocialPanel;
