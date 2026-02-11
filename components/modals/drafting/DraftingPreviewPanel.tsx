// components/modals/drafting/DraftingPreviewPanel.tsx
// HTML preview tab content for DraftingModal

import React from 'react';
import { SimpleMarkdown } from '../../ui/SimpleMarkdown';
import { replaceImagePlaceholdersWithUrls } from './ImageManager';
import { ContextMenu, EditorPanel, InlineDiff, ImageGenerationPanel, AnalysisConfirmationPanel } from '../../contextualEditor';
import { shouldUseInlineDiff } from '../../../services/ai/contextualEditing';
import { ContentBrief, BusinessInfo, ImagePlaceholder } from '../../../types';
import type { UseContextualEditorReturn } from '../../../hooks/useContextualEditor';
import type { ImageManagerHook } from './ImageManager';
import type { DatabaseJobInfo } from './DraftingContext';

interface DraftingPreviewPanelProps {
  brief: ContentBrief;
  draftContent: string;
  businessInfo: BusinessInfo;
  imagePlaceholders: ImagePlaceholder[];
  databaseJobInfo: DatabaseJobInfo | null;
  contentContainerRef: React.RefObject<HTMLDivElement>;
  contextualEditor: UseContextualEditorReturn;
  imageManager: ImageManagerHook;
}

/**
 * HTML preview tab content for DraftingModal.
 * Renders the article preview with contextual editing overlays,
 * image summaries, and competitor benchmarks.
 */
export const DraftingPreviewPanel: React.FC<DraftingPreviewPanelProps> = ({
  brief,
  draftContent,
  businessInfo,
  imagePlaceholders,
  databaseJobInfo,
  contentContainerRef,
  contextualEditor,
  imageManager,
}) => {
  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-gray-100">
      <div className="bg-blue-900/20 border-b border-blue-700/30 px-8 py-2 text-xs text-blue-300">
        Visual preview only &bull; Downloaded HTML includes SEO optimization (schema, Open Graph, semantic sections, embedded images)
      </div>
      <div className="p-8 max-w-3xl mx-auto">
        {draftContent ? (
          <>
            <h1 className="text-3xl font-bold text-white border-b border-gray-700 pb-4 mb-4">{brief?.title || 'Untitled Article'}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6 pb-4 border-b border-gray-800">
              <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>{draftContent.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
              <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{Math.ceil(draftContent.split(/\s+/).filter(Boolean).length / 200)} min read</span>
              {databaseJobInfo?.auditScore && (
                <span className={`flex items-center gap-1 ${databaseJobInfo.auditScore >= 80 ? 'text-green-400' : databaseJobInfo.auditScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Quality: {databaseJobInfo.auditScore}%</span>
              )}
              {imagePlaceholders.length > 0 && (
                <span className="flex items-center gap-1 text-purple-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{imagePlaceholders.length} images</span>
              )}
              {brief?.competitorSpecs && (
                <span className="flex items-center gap-1 text-cyan-400" title={`Based on ${brief.competitorSpecs.competitorsAnalyzed} competitors`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>Target: {brief.competitorSpecs.targetWordCount.toLocaleString()} words</span>
              )}
            </div>
            {/* Hero Image */}
            {(() => {
              const heroImage = imagePlaceholders.find(img => img.type === 'HERO');
              if (!heroImage) return null;
              return (
                <div className="bg-gray-800 border border-dashed border-gray-600 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-purple-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="font-medium">Hero Image</span></div>
                  <p className="text-gray-300 mt-2">{heroImage.description}</p>
                  <p className="text-sm text-gray-500 mt-1">Alt: {heroImage.altTextSuggestion}</p>
                  {heroImage.generatedUrl && <img src={heroImage.generatedUrl} alt={heroImage.altTextSuggestion} className="mt-3 rounded-lg max-h-48 object-cover" />}
                </div>
              );
            })()}
            {/* Main Content Preview with Contextual Editor */}
            <div ref={contentContainerRef} className="prose prose-invert prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-white prose-a:text-blue-400 prose-li:text-gray-300 prose-code:text-green-300 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 max-w-none relative">
              <SimpleMarkdown content={replaceImagePlaceholdersWithUrls(draftContent.replace(/^#\s+.*\n?/, ''), imagePlaceholders)} />
              {/* Contextual Editor: Context Menu (shown on text selection) */}
              {contextualEditor.state.mode === 'menu' && contextualEditor.selection && (
                <ContextMenu
                  selection={contextualEditor.selection}
                  analysis={contextualEditor.state.analysis}
                  onQuickAction={contextualEditor.executeQuickAction}
                  onMoreOptions={contextualEditor.openTextPanel}
                  onGenerateImage={contextualEditor.openImagePanel}
                  onClose={contextualEditor.closeMenu}
                  isProcessing={contextualEditor.state.isProcessing}
                />
              )}
              {/* Contextual Editor: Text Editing Panel */}
              {(contextualEditor.state.mode === 'panel_text' || contextualEditor.state.mode === 'preview') && contextualEditor.selection && (
                <EditorPanel
                  selection={contextualEditor.selection}
                  analysis={contextualEditor.state.analysis}
                  rewriteResult={contextualEditor.state.rewriteResult}
                  imagePromptResult={contextualEditor.state.imagePromptResult}
                  activeTab={contextualEditor.state.activeTab}
                  isProcessing={contextualEditor.state.isProcessing}
                  businessInfo={businessInfo}
                  customInstruction={contextualEditor.state.customInstruction}
                  onInstructionChange={contextualEditor.setCustomInstruction}
                  onTabChange={contextualEditor.setActiveTab}
                  onQuickAction={contextualEditor.executeQuickAction}
                  onAcceptRewrite={contextualEditor.acceptRewrite}
                  onRejectRewrite={contextualEditor.rejectRewrite}
                  onRetryRewrite={contextualEditor.retryRewrite}
                  onClose={contextualEditor.closePanel}
                />
              )}
              {/* Contextual Editor: Inline Diff for small rewrites */}
              {contextualEditor.state.mode === 'preview' && contextualEditor.state.rewriteResult && shouldUseInlineDiff(contextualEditor.state.rewriteResult.originalText, contextualEditor.state.rewriteResult.rewrittenText) && (
                <InlineDiff
                  result={contextualEditor.state.rewriteResult}
                  onAccept={contextualEditor.acceptRewrite}
                  onReject={contextualEditor.rejectRewrite}
                  onRetry={contextualEditor.retryRewrite}
                />
              )}
              {/* Contextual Editor: Image Generation Panel */}
              {contextualEditor.state.mode === 'panel_image' && (
                <ImageGenerationPanel
                  promptResult={contextualEditor.state.imagePromptResult}
                  isGenerating={imageManager.isGeneratingContextualImage}
                  isLoadingPrompt={contextualEditor.state.isProcessing}
                  onGenerate={imageManager.handleContextualImageGenerate}
                  onAccept={imageManager.handleContextualImageAccept}
                  onReject={imageManager.handleContextualImageReject}
                  onClose={imageManager.handleContextualImageClose}
                  generatedImageUrl={imageManager.contextualImageUrl}
                />
              )}
              {/* Contextual Editor: Analysis Confirmation Panel */}
              {contextualEditor.state.mode === 'analysis' && contextualEditor.state.analysisForConfirmation && contextualEditor.selection && (
                <AnalysisConfirmationPanel
                  selectedText={contextualEditor.selection.text}
                  analysis={contextualEditor.state.analysisForConfirmation}
                  businessInfo={businessInfo}
                  customInstruction={contextualEditor.state.customInstruction}
                  isProcessing={contextualEditor.state.isProcessing}
                  onItemDecisionChange={contextualEditor.updateItemDecision}
                  onInstructionChange={contextualEditor.setCustomInstruction}
                  onApply={contextualEditor.executeConfirmedRewrite}
                  onCancel={contextualEditor.cancelAnalysis}
                />
              )}
              {/* Article Images Summary */}
              {imagePlaceholders.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Article Images ({imagePlaceholders.length})</h3>
                  <div className="space-y-2">
                    {imagePlaceholders.map((img, i) => {
                      const imageUrl = img.generatedUrl || img.userUploadUrl;
                      const isInserted = img.id?.startsWith('inserted_');
                      const statusText = imageUrl ? (isInserted ? 'In Article' : 'Generated') : 'Pending';
                      const statusColor = imageUrl ? 'text-green-400' : 'text-yellow-400';
                      return (
                        <div key={img.id || i} className="bg-gray-800/50 rounded p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${img.type === 'HERO' ? 'bg-purple-900/50 text-purple-300' : img.type === 'INFOGRAPHIC' ? 'bg-blue-900/50 text-blue-300' : img.type === 'CHART' ? 'bg-green-900/50 text-green-300' : img.type === 'DIAGRAM' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>{img.type}</span>
                            <span className="text-gray-300 flex-1 truncate">{img.description}</span>
                            <span className={`text-xs ${statusColor}`}>{statusText}</span>
                          </div>
                          <p className="text-gray-500 mt-1 text-xs">Alt: {img.altTextSuggestion}</p>
                          {imageUrl && <img src={imageUrl} alt={img.altTextSuggestion || ''} className="mt-2 rounded max-h-24 object-cover" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Competitor Specs Summary */}
              {brief?.competitorSpecs && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>Competitor Benchmarks ({brief.competitorSpecs.competitorsAnalyzed} analyzed)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-gray-500 text-xs">Target Words</p><p className="text-white font-medium">{brief.competitorSpecs.targetWordCount.toLocaleString()}</p></div>
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-gray-500 text-xs">Target Images</p><p className="text-white font-medium">{brief.competitorSpecs.targetImageCount}</p></div>
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-gray-500 text-xs">Avg H2s</p><p className="text-white font-medium">{brief.competitorSpecs.avgH2Count}</p></div>
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-gray-500 text-xs">Data Quality</p><p className={`font-medium ${brief.competitorSpecs.dataQuality === 'high' ? 'text-green-400' : brief.competitorSpecs.dataQuality === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>{brief.competitorSpecs.dataQuality.toUpperCase()}</p></div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 py-20"><p>No content to preview.</p></div>
        )}
      </div>
    </div>
  );
};

export default DraftingPreviewPanel;
