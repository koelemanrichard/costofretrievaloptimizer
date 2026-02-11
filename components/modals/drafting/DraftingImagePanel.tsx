// components/modals/drafting/DraftingImagePanel.tsx
// UI panel for image management tab in DraftingModal

import React from 'react';
import { ImageManagementPanel } from '../../imageGeneration/ImageManagementPanel';
import { ImageGenerationModal } from '../../imageGeneration/ImageGenerationModal';
import { ImagePlaceholder, BusinessInfo } from '../../../types';
import { getSupabaseClient } from '../../../services/supabaseClient';

interface DraftingImagePanelProps {
  // Data
  imagePlaceholders: ImagePlaceholder[];
  draftContent: string;
  businessInfo: BusinessInfo;
  jobId?: string;
  briefId?: string;
  isTransient?: boolean;

  // Image modal state
  showImageModal: boolean;
  selectedPlaceholder: ImagePlaceholder | null;
  openInVisualEditor: boolean;

  // Callbacks
  onDraftChange: (newDraft: string) => void;
  onSetHasUnsavedChanges: (value: boolean) => void;
  onSetSelectedPlaceholder: (placeholder: ImagePlaceholder | null) => void;
  onSetOpenInVisualEditor: (open: boolean) => void;
  onSetShowImageModal: (show: boolean) => void;
  onImageInsert: (generatedPlaceholder: ImagePlaceholder) => void;
}

/**
 * Image management tab content for DraftingModal.
 * Renders the ImageManagementPanel and ImageGenerationModal.
 */
export const DraftingImagePanel: React.FC<DraftingImagePanelProps> = ({
  imagePlaceholders,
  draftContent,
  businessInfo,
  jobId,
  briefId,
  isTransient,
  showImageModal,
  selectedPlaceholder,
  openInVisualEditor,
  onDraftChange,
  onSetHasUnsavedChanges,
  onSetSelectedPlaceholder,
  onSetOpenInVisualEditor,
  onSetShowImageModal,
  onImageInsert,
}) => {
  return (
    <>
      <ImageManagementPanel
        placeholders={imagePlaceholders}
        businessInfo={businessInfo}
        draftContent={draftContent}
        jobId={jobId}
        onUpdateDraft={(newDraft, shouldAutoSave) => {
          onDraftChange(newDraft);
          onSetHasUnsavedChanges(true);
          // Auto-save after image insertion to prevent data loss
          if (shouldAutoSave && briefId && !isTransient) {
            setTimeout(async () => {
              try {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                await supabase
                  .from('content_briefs')
                  .update({ article_draft: newDraft, updated_at: new Date().toISOString() })
                  .eq('id', briefId);
                onSetHasUnsavedChanges(false);
                console.log('[DraftingImagePanel] Auto-saved draft after image insertion');
              } catch (err) {
                console.error('[DraftingImagePanel] Auto-save failed:', err);
              }
            }, 500);
          }
        }}
        onOpenVisualEditor={(placeholder) => {
          onSetSelectedPlaceholder(placeholder);
          onSetOpenInVisualEditor(true);
          onSetShowImageModal(true);
        }}
      />

      {/* Image Generation Modal */}
      {selectedPlaceholder && (
        <ImageGenerationModal
          isOpen={showImageModal}
          onClose={() => {
            onSetShowImageModal(false);
            onSetSelectedPlaceholder(null);
            onSetOpenInVisualEditor(false);
          }}
          placeholder={selectedPlaceholder}
          brandKit={businessInfo.brandKit}
          businessInfo={businessInfo}
          onInsert={onImageInsert}
          openInVisualEditor={openInVisualEditor}
        />
      )}
    </>
  );
};

export default DraftingImagePanel;
