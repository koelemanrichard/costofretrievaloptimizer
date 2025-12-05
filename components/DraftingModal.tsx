
// components/DraftingModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ContentBrief, BusinessInfo, EnrichedTopic, FreshnessProfile } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppState } from '../state/appState';
import { Loader } from './ui/Loader';
import { safeString } from '../utils/parsers';
import { Textarea } from './ui/Textarea';
import { getSupabaseClient } from '../services/supabaseClient';
import { SimpleMarkdown } from './ui/SimpleMarkdown';
import * as aiService from '../services/ai/index';
import { AIModelSelector } from './ui/AIModelSelector';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';
import { RequirementsRail } from './drafting/RequirementsRail';

interface DraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: ContentBrief | null;
  onAudit: (brief: ContentBrief, draft: string) => void;
  onGenerateSchema: (brief: ContentBrief) => void;
  isLoading: boolean;
  businessInfo: BusinessInfo;
  onAnalyzeFlow: (draft: string) => void;
}

const DraftingModal: React.FC<DraftingModalProps> = ({ isOpen, onClose, brief, onAudit, onGenerateSchema, isLoading, businessInfo, onAnalyzeFlow }) => {
  const { state, dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRail, setShowRail] = useState(true); // Toggle for Requirements Rail

  // Dynamic Model Selection State
  const [overrideSettings, setOverrideSettings] = useState<{ provider: string, model: string } | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  useEffect(() => {
    if (brief) {
      setDraftContent(safeString(brief.articleDraft));
      // Default to edit mode if no draft
      setActiveTab('edit');
      setHasUnsavedChanges(false);
    }
  }, [brief]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraftContent(e.target.value);
      setHasUnsavedChanges(true);
  };

  const handleConfigChange = useCallback((provider: string | null, model: string | null) => {
      if (provider && model) {
          setOverrideSettings({ provider, model });
      } else {
          setOverrideSettings(null);
      }
  }, []);

  // Handlers declared BEFORE guard clause
  const handleSaveDraft = async () => {
    if (!brief) return;
    if (!state.activeMapId) return;

    const isTransient = brief.id.startsWith('transient-');

    if (isTransient) {
        // Update in memory only for transient
        const updatedBrief = { ...brief, articleDraft: draftContent };
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
        setHasUnsavedChanges(false);
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Transient draft updated in memory. Click "Save to Map" to persist.' });
        return;
    }

    setIsSaving(true);
    try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const { error } = await supabase
            .from('content_briefs')
            .update({ article_draft: draftContent })
            .eq('id', brief.id);

        if (error) throw error;

        // Update state
        const updatedBrief = { ...brief, articleDraft: draftContent };
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft saved successfully.' });
        setHasUnsavedChanges(false);

    } catch (e) {
        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save draft." });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveTransient = async () => {
    if (!brief || !state.activeMapId || !state.user) return;

    setIsSaving(true);
    try {
        const newTopicId = uuidv4();
        const newBriefId = uuidv4();

        // Use title for slug, or fallback to a generic name
        const topicSlug = slugify(brief.title || 'imported-topic');

        // 1. Create Topic
        const newTopic: EnrichedTopic = {
            id: newTopicId,
            map_id: state.activeMapId,
            title: brief.title || 'Imported Topic',
            slug: topicSlug,
            description: `Imported from ${brief.slug}`, // brief.slug holds the URL in transient briefs
            type: 'outer',
            freshness: FreshnessProfile.EVERGREEN,
            parent_topic_id: null,
            metadata: {
                topic_class: 'informational',
                source: 'import'
            }
        };

        // 2. Create Brief
        const newBrief: ContentBrief = {
            ...brief,
            id: newBriefId,
            topic_id: newTopic.id,
            articleDraft: draftContent // Ensure current editor content is saved
        };

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // Insert Topic
        const { error: topicError } = await supabase.from('topics').insert({
            ...newTopic,
            user_id: state.user.id
        });
        if (topicError) throw topicError;

        // Insert Brief
         const { error: briefError } = await supabase.from('content_briefs').insert({
            id: newBrief.id,
            topic_id: newTopic.id,
            user_id: state.user.id,
            title: newBrief.title,
            meta_description: newBrief.metaDescription,
            key_takeaways: newBrief.keyTakeaways as any,
            outline: newBrief.outline,
            article_draft: newBrief.articleDraft,
            serp_analysis: newBrief.serpAnalysis as any,
            contextual_vectors: newBrief.contextualVectors as any,
            created_at: new Date().toISOString()
         });

         if (briefError) throw briefError;

        // Update Global State
        dispatch({ type: 'ADD_TOPIC', payload: { mapId: state.activeMapId, topic: newTopic } });
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: newTopicId, brief: newBrief } });
        dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: newTopic });

        dispatch({ type: 'SET_NOTIFICATION', payload: 'Imported page saved to map successfully.' });
        setHasUnsavedChanges(false);

    } catch (e) {
         dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save to map." });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePolishDraft = async () => {
      if (!brief) return;
      if (!draftContent.trim()) return;
      setIsPolishing(true);

      const configToUse = overrideSettings
          ? { ...businessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
          : businessInfo;

      try {
          const polishedText = await aiService.polishDraft(draftContent, brief, configToUse, dispatch);
          setDraftContent(polishedText);
          setHasUnsavedChanges(true);
          setActiveTab('preview'); // Switch to preview to show the formatted result
          dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! Introduction rewritten and formatting improved.' });
      } catch (e) {
          dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to polish draft." });
      } finally {
          setIsPolishing(false);
      }
  };

  const handleCloseModal = () => {
      if (hasUnsavedChanges) {
          if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
              onClose();
          }
      } else {
          onClose();
      }
  };

  // Validated Logic: 'brief' availability is checked before return or inside handlers.
  if (!isOpen || !brief) return null;

  const isTransient = brief.id.startsWith('transient-');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={handleCloseModal}>
      <Card className="w-full max-w-[98vw] h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
                {isTransient ? 'Audit Live Page' : 'Article Draft Workspace'}
            </h2>
            <p className="text-sm text-gray-400 flex items-center gap-2">
                {safeString(brief.title) || 'Untitled Topic'}
                {isTransient && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-700">Transient Mode</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
             {hasUnsavedChanges && <span className="text-xs text-yellow-400 animate-pulse">Unsaved Changes</span>}

             {/* Toggle Requirements Rail */}
             <button
                onClick={() => setShowRail(!showRail)}
                className={`px-3 py-1 text-xs rounded border ${showRail ? 'bg-blue-900/50 border-blue-600 text-blue-200' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
             >
                {showRail ? 'Hide Requirements' : 'Show Requirements'}
             </button>

             {/* AI Config Toggle */}
             <div className="relative">
                 <Button variant="secondary" className="!py-1 !px-3 text-xs flex items-center gap-2" onClick={() => setShowModelSelector(!showModelSelector)}>
                     <span>AI</span> {overrideSettings ? `${overrideSettings.provider}` : 'Config'}
                 </Button>
                 {showModelSelector && (
                     <div className="absolute top-full right-0 mt-2 w-80 z-50 shadow-xl">
                         <AIModelSelector
                             currentConfig={businessInfo}
                             onConfigChange={handleConfigChange}
                             className="bg-gray-800"
                         />
                     </div>
                 )}
             </div>

             {/* View Toggles */}
             <div className="flex bg-gray-700 rounded p-1 mr-2">
                 <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1 text-sm rounded ${activeTab === 'edit' ? 'bg-gray-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    Editor
                 </button>
                 <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 text-sm rounded ${activeTab === 'preview' ? 'bg-gray-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    HTML Preview
                 </button>
             </div>

             {isTransient ? (
                 <Button
                    onClick={handleSaveTransient}
                    className="!py-1 !px-4 text-sm bg-green-700 hover:bg-green-600"
                    disabled={isSaving || isPolishing}
                 >
                    {isSaving ? <Loader className="w-4 h-4"/> : 'Save to Map'}
                 </Button>
             ) : (
                 <Button
                    onClick={handleSaveDraft}
                    className="!py-1 !px-4 text-sm"
                    disabled={isSaving || isPolishing}
                 >
                    {isSaving ? <Loader className="w-4 h-4"/> : 'Save Draft'}
                 </Button>
             )}

             <button onClick={handleCloseModal} className="text-gray-400 text-2xl leading-none hover:text-white ml-2">&times;</button>
          </div>
        </header>

        <div className={`flex-grow overflow-hidden bg-gray-900 flex`}>

            {/* Left Sidebar (Structure Guide) */}
            {brief?.structured_outline && brief.structured_outline.length > 0 && activeTab === 'edit' && (
                <div className="hidden xl:flex flex-col w-64 bg-gray-800 border-r border-gray-700 h-full overflow-hidden flex-shrink-0">
                    <div className="p-3 border-b border-gray-700 bg-gray-800/50">
                        <h4 className="text-sm font-bold text-white">Structure Guide</h4>
                        <p className="text-xs text-gray-400">Semantic vector.</p>
                    </div>
                    <div className="overflow-y-auto p-3 space-y-4 flex-grow">
                        {brief.structured_outline.map((section, idx) => (
                            <div key={idx} className="border-l-2 border-gray-600 pl-2">
                                <p className={`text-xs font-semibold text-gray-200 mb-1 ${section.level > 2 ? 'ml-2' : ''}`}>
                                    {safeString(section.heading)}
                                </p>
                                {section.subordinate_text_hint && (
                                    <div className="bg-black/30 p-2 rounded text-[10px] text-gray-300 italic mb-1">
                                        <span className="text-yellow-500 font-bold not-italic">Hint: </span>
                                        {safeString(section.subordinate_text_hint)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden relative`}>
                {activeTab === 'edit' ? (
                    <>
                        <Textarea
                            value={draftContent}
                            onChange={handleContentChange}
                            className="w-full h-full min-h-[500px] font-mono text-sm text-gray-300 bg-gray-900 border-none focus:ring-0 resize-none p-6 leading-relaxed"
                            placeholder="Start writing your article draft here..."
                            disabled={isPolishing}
                        />
                        {/* Floating Polish Button */}
                        <div className="absolute bottom-6 right-6">
                            <Button
                                onClick={handlePolishDraft}
                                disabled={isPolishing || !draftContent}
                                className="bg-purple-600 hover:bg-purple-700 shadow-lg flex items-center gap-2"
                            >
                                {isPolishing ? <Loader className="w-4 h-4" /> : <span>Finalize & Polish</span>}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="h-full overflow-y-auto p-8 bg-gray-950 text-gray-100">
                        <div className="max-w-3xl mx-auto">
                            {draftContent ? (
                                <SimpleMarkdown content={safeString(draftContent)} />
                            ) : (
                                <div className="text-center text-gray-400 py-20">
                                    <p>No content to preview.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Sidebar (Requirements Rail) */}
            {showRail && activeTab === 'edit' && (
                 <RequirementsRail brief={brief} draftContent={draftContent} />
            )}

        </div>

        <footer className="p-3 bg-gray-800 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
            <div className="text-xs text-gray-500">
                {draftContent.length} characters | ~{draftContent.split(/\s+/).filter(Boolean).length} words
            </div>
            <div className="flex gap-2">
                <Button onClick={() => onAnalyzeFlow(draftContent)} variant="secondary" disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing} className="text-xs py-1 border border-cyan-700 text-cyan-400 hover:bg-cyan-900/20">
                    {isLoading ? <Loader className="w-3 h-3"/> : 'Flow & Vector Audit'}
                </Button>
                <Button onClick={() => onAudit(brief, draftContent)} variant="secondary" disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing} className="text-xs py-1">
                    {isLoading ? <Loader className="w-3 h-3"/> : 'Audit Integrity'}
                </Button>
                <Button onClick={() => onGenerateSchema(brief)} disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing} variant="secondary" className="text-xs py-1">
                    {isLoading ? <Loader className="w-3 h-3"/> : 'Generate Schema'}
                </Button>
                <Button onClick={handleCloseModal} variant="secondary" className="text-xs py-1">Close</Button>
            </div>
        </footer>
      </Card>
    </div>
  );
};

export default DraftingModal;
