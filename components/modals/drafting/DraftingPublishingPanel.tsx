// components/modals/drafting/DraftingPublishingPanel.tsx
// UI components for publishing modals in DraftingModal

import React from 'react';
import { PublishToWordPressModal } from '../../wordpress';
import { StylePublishModal } from '../../publishing';
import { PremiumDesignModal } from '../../premium-design/PremiumDesignModal';
import { ContentBrief, BusinessInfo, EnrichedTopic, TopicalMap } from '../../../types';

interface DraftingPublishingPanelProps {
  // Data
  brief: ContentBrief;
  activeBriefTopic: EnrichedTopic | null;
  draftContent: string;
  businessInfo: BusinessInfo;
  activeMap?: TopicalMap;

  // Modal states
  showPublishModal: boolean;
  showStylePublishModal: boolean;
  showPremiumDesignModal: boolean;
  premiumDesignInitialView: 'fork' | 'premium-url';

  // Callbacks
  onClosePublishModal: () => void;
  onCloseStylePublishModal: () => void;
  onClosePremiumDesignModal: () => void;
  dispatch: React.Dispatch<any>;
}

/**
 * Publishing modals section for DraftingModal.
 * Renders WordPress, Style Publish, and Premium Design modals.
 */
export const DraftingPublishingPanel: React.FC<DraftingPublishingPanelProps> = ({
  brief,
  activeBriefTopic,
  draftContent,
  businessInfo,
  activeMap,
  showPublishModal,
  showStylePublishModal,
  showPremiumDesignModal,
  premiumDesignInitialView,
  onClosePublishModal,
  onCloseStylePublishModal,
  onClosePremiumDesignModal,
  dispatch,
}) => {
  return (
    <>
      {/* Publish to WordPress Modal */}
      {brief && activeBriefTopic && (
        <PublishToWordPressModal
          isOpen={showPublishModal}
          onClose={onClosePublishModal}
          topic={activeBriefTopic}
          brief={brief}
          articleDraft={draftContent}
          onPublishSuccess={onClosePublishModal}
        />
      )}

      {/* Style & Publish Modal */}
      {activeBriefTopic && draftContent && (
        <StylePublishModal
          isOpen={showStylePublishModal}
          onClose={onCloseStylePublishModal}
          topic={activeBriefTopic}
          articleDraft={draftContent}
          brief={brief}
          brandKit={businessInfo?.brandKit as any}
          topicalMap={activeMap}
          supabaseUrl={businessInfo.supabaseUrl}
          supabaseAnonKey={businessInfo.supabaseAnonKey}
          projectId={activeMap?.project_id}
          onPublishSuccess={() => {
            onCloseStylePublishModal();
            dispatch({
              type: 'SET_NOTIFICATION',
              payload: 'Content published successfully with styled formatting'
            });
          }}
        />
      )}

      {/* Premium Design Modal */}
      {activeBriefTopic && draftContent && (
        <PremiumDesignModal
          isOpen={showPremiumDesignModal}
          onClose={onClosePremiumDesignModal}
          topic={activeBriefTopic}
          articleDraft={draftContent}
          brief={brief}
          topicalMap={activeMap}
          projectId={activeMap?.project_id}
          initialView={premiumDesignInitialView}
        />
      )}
    </>
  );
};

export default DraftingPublishingPanel;
