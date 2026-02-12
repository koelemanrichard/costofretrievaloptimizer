
// components/DraftingModal.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ContentBrief, BusinessInfo, EnrichedTopic, FreshnessProfile, ImagePlaceholder, StreamingProgress } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAppState } from '../../state/appState';
import { SmartLoader } from '../ui/FunLoaders';
import { safeString } from '../../utils/parsers';
import { Textarea } from '../ui/Textarea';
import { getSupabaseClient } from '../../services/supabaseClient';
import { verifiedInsert, verifiedDelete } from '../../services/verifiedDatabaseService';
import type { Json } from '../../database.types';
import { AIModelSelector } from '../ui/AIModelSelector';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../utils/helpers';
import { RequirementsRail } from '../drafting/RequirementsRail';
import { ReportModal } from '../reports';
import { useArticleDraftReport } from '../../hooks/useReportGeneration';
import { ContentGenerationJob } from '../../types';
import { GenerationChangesPanel } from '../drafting/GenerationChangesPanel';
import { useFeatureGate } from '../../hooks/usePermissions';
import type { StructuralSnapshot } from '../../services/ai/contentGeneration/structuralValidator';
import { ContentAnalysisPanel } from '../analysis/ContentAnalysisPanel';
import { getPassSnapshots } from '../../services/contentGenerationDebugger';
import { useSocialCampaigns } from '../../hooks/useSocialCampaigns';
import type { SocialPost } from '../../types/social';

// Contextual Editor
import { useContextualEditor } from '../../hooks/useContextualEditor';
import UpwardDropdownMenu, { DropdownMenuItem } from '../ui/UpwardDropdownMenu';

// Extracted hooks and panels from ./drafting/
import {
  DraftingProvider,
  useImageManager,
  usePublishingExport,
  useContentEnhancement,
  useDraftContentManager,
  useDatabaseSyncManager,
} from './drafting';
import type { DatabaseJobInfo, DraftVersion } from './drafting';
import { DraftingImagePanel } from './drafting/DraftingImagePanel';
import { DraftingPreviewPanel } from './drafting/DraftingPreviewPanel';
import { AuditIssuesPanelSection, QualityTabContent } from './drafting/DraftingAuditPanel';
import { DraftingPublishingPanel } from './drafting/DraftingPublishingPanel';
import { DraftingSocialPanel } from './drafting/DraftingSocialPanel';
import { RerunPassesModal, VersionHistoryModal } from './drafting/DraftingModals';
import { AuditButton } from '../audit/AuditButton';

interface DraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: ContentBrief | null;
  onAudit: (brief: ContentBrief, draft: string) => void;
  onGenerateSchema: (brief: ContentBrief) => void;
  isLoading: boolean;
  businessInfo: BusinessInfo;
  onAnalyzeFlow: (draft: string) => void;
  asPage?: boolean;
}

/**
 * Inner component that uses DraftingContext hooks.
 * Must be rendered inside DraftingProvider.
 */
const DraftingModalInner: React.FC<DraftingModalProps & {
  brief: ContentBrief;
  draftContent: string;
  setDraftContent: (v: string) => void;
  draftContentRef: React.MutableRefObject<string>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (v: boolean) => void;
  isLoadingDraft: boolean;
  setIsLoadingDraft: (v: boolean) => void;
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
  draftHistory: DraftVersion[];
  setDraftHistory: (v: DraftVersion[]) => void;
  databaseDraft: string | null;
  setDatabaseDraft: (v: string | null) => void;
  databaseJobInfo: DatabaseJobInfo | null;
  setDatabaseJobInfo: (v: DatabaseJobInfo | null) => void;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
  overrideSettings: { provider: string; model: string } | null;
  setOverrideSettings: (v: { provider: string; model: string } | null) => void;
  activeTab: 'edit' | 'preview' | 'images' | 'quality' | 'debug';
  setActiveTab: (v: 'edit' | 'preview' | 'images' | 'quality' | 'debug') => void;
  loadedBriefIdRef: React.MutableRefObject<string | null>;
  loadedDraftLengthRef: React.MutableRefObject<number>;
  loadedAtRef: React.MutableRefObject<string | null>;
  canGenerateContent: boolean;
  featureReason: string | null;
  activeMap: any;
  activeMapId: string | null;
  activeBriefTopic: EnrichedTopic | null;
}> = (props) => {
  const {
    isOpen, onClose, brief, onAudit, onGenerateSchema, isLoading, businessInfo, onAnalyzeFlow, asPage,
    draftContent, setDraftContent, draftContentRef, hasUnsavedChanges, setHasUnsavedChanges,
    isLoadingDraft, setIsLoadingDraft, isSaving, setIsSaving,
    draftHistory, setDraftHistory,
    databaseDraft, setDatabaseDraft, databaseJobInfo, setDatabaseJobInfo,
    isSyncing, setIsSyncing,
    overrideSettings, setOverrideSettings,
    activeTab, setActiveTab,
    loadedBriefIdRef, loadedDraftLengthRef, loadedAtRef,
    canGenerateContent, featureReason,
    activeMap, activeMapId, activeBriefTopic,
  } = props;

  const { state, dispatch } = useAppState();
  const routeNavigate = useNavigate();
  const routeParams = useParams<{ projectId: string; mapId: string; topicId: string }>();

  const showDebugTab = import.meta.env.DEV;

  // Version history UI state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Re-run passes UI state
  const [showPassesModal, setShowPassesModal] = useState(false);
  const [selectedPasses, setSelectedPasses] = useState<number[]>([]);

  // Premium design view state
  const [showPremiumDesignModal, setShowPremiumDesignModal] = useState(false);
  const [premiumDesignInitialView, setPremiumDesignInitialView] = useState<'fork' | 'premium-url'>('fork');

  // Model selector UI state
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showRail, setShowRail] = useState(true);
  const [showDiffPreview, setShowDiffPreview] = useState(false);

  // Ref for contextual editor text selection
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // --- Use extracted hooks ---

  // Contextual editor for text selection and AI editing
  const contextualEditor = useContextualEditor({
    containerRef: contentContainerRef,
    fullArticle: draftContent,
    businessInfo,
    brief: brief || {} as ContentBrief,
    eavs: activeMap?.eavs || [],
    onContentChange: (newContent, sectionKey) => {
      if (contextualEditor.state.rewriteResult) {
        const updated = draftContent.replace(
          contextualEditor.state.rewriteResult!.originalText,
          newContent
        );
        setDraftContent(updated);
      }
      setHasUnsavedChanges(true);
    },
    dispatch,
  });

  // Image management hook
  const imageManager = useImageManager(contextualEditor);

  // Content enhancement hook (polish, audit, re-run)
  const enhancement = useContentEnhancement();

  // Publishing & export hook
  const publishing = usePublishingExport(imageManager.imagePlaceholders);

  // Draft content management hook (save, restore, load)
  const draftManager = useDraftContentManager();

  // Database sync manager hook
  const syncManager = useDatabaseSyncManager();

  // Social campaigns hook
  const socialCampaigns = useSocialCampaigns({
    topicId: activeBriefTopic?.id || '',
    userId: state.user?.id || '',
    supabaseUrl: businessInfo.supabaseUrl,
    supabaseAnonKey: businessInfo.supabaseAnonKey,
  });

  // Handler for updating posts in campaigns
  const handleUpdateSocialPost = useCallback(async (postId: string, updates: Partial<SocialPost>): Promise<boolean> => {
    const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
    try {
      const { error } = await supabase
        .from('social_posts')
        .update({ ...updates as any, updated_at: new Date().toISOString() })
        .eq('id', postId);
      if (error) throw error;
      await socialCampaigns.refreshCampaigns();
      return true;
    } catch (err) {
      console.error('Failed to update post:', err);
      return false;
    }
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, socialCampaigns]);

  // Minimal job for report generation
  const minimalJob: ContentGenerationJob | null = useMemo(() => {
    if (!databaseJobInfo || !brief) return null;
    return {
      id: databaseJobInfo.jobId,
      brief_id: brief.id,
      user_id: state.user?.id || '',
      map_id: activeMapId || '',
      status: databaseJobInfo.jobStatus,
      current_pass: databaseJobInfo.currentPass,
      passes_status: databaseJobInfo.passesStatus as any,
      total_sections: databaseJobInfo.sectionCount,
      completed_sections: databaseJobInfo.sectionCount,
      current_section_key: null,
      draft_content: draftContent || null,
      final_audit_score: databaseJobInfo.auditScore,
      audit_details: null,
      last_error: null,
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
      updated_at: databaseJobInfo.updatedAt,
      started_at: null,
      completed_at: databaseJobInfo.jobStatus === 'completed' ? databaseJobInfo.updatedAt : null,
      schema_data: databaseJobInfo.schemaData || null,
      schema_validation_results: null,
      schema_entities: null,
      schema_page_type: null,
      progressive_schema_data: null,
    };
  }, [databaseJobInfo, brief, draftContent, activeMapId, state.user?.id]);

  // Report generation hook
  const reportHook = useArticleDraftReport(minimalJob, brief);

  // --- Effects ---

  // ROBUST FIX: Fetch draft directly from database when modal opens
  useEffect(() => {
    const fetchDraftFromDatabase = async () => {
      if (!isOpen || !brief?.id || brief.id.startsWith('transient-')) return;

      if (loadedBriefIdRef.current !== null && loadedBriefIdRef.current !== brief.id) {
        setDraftContent('');
        setHasUnsavedChanges(false);
        loadedBriefIdRef.current = null;
        loadedDraftLengthRef.current = 0;
      }

      const existingDraft = safeString(brief.articleDraft);
      const isDraftRegenerated = loadedBriefIdRef.current === brief.id &&
        existingDraft && existingDraft.length !== loadedDraftLengthRef.current;

      if (loadedBriefIdRef.current === brief.id && existingDraft && !isDraftRegenerated) return;

      if (isDraftRegenerated) {
        const currentDraft = draftContent || '';
        const isCurrentCorrupted = currentDraft.includes('data:image/') &&
          (currentDraft.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{10000,}/g)?.length || 0) > 0;

        if (existingDraft.length >= loadedDraftLengthRef.current || isCurrentCorrupted) {
          setDraftContent(existingDraft);
          loadedDraftLengthRef.current = existingDraft.length;
          loadedAtRef.current = new Date().toISOString();
          setHasUnsavedChanges(false);
        }
        return;
      }

      if (existingDraft) {
        setDraftContent(existingDraft);
        loadedBriefIdRef.current = brief.id;
        loadedDraftLengthRef.current = existingDraft.length;
        loadedAtRef.current = new Date().toISOString();

        try {
          const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
          const { data: historyData } = await supabase
            .from('content_briefs').select('draft_history').eq('id', brief.id).single();
          if (historyData?.draft_history && Array.isArray(historyData.draft_history)) {
            setDraftHistory(historyData.draft_history as unknown as DraftVersion[]);
          }
        } catch (err) {
          console.warn('[DraftingModal] Failed to load version history:', err);
        }
        return;
      }

      setIsLoadingDraft(true);
      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const [briefResult, jobResult] = await Promise.all([
          supabase.from('content_briefs').select('article_draft, draft_history, updated_at').eq('id', brief.id).single(),
          supabase.from('content_generation_jobs').select('draft_content, updated_at').eq('brief_id', brief.id).eq('status', 'completed').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        const briefData = briefResult.data;
        const jobData = jobResult.data;
        let selectedDraft: string | null = null;

        if (briefData?.article_draft && jobData?.draft_content) {
          const briefTime = new Date(briefData.updated_at || 0).getTime();
          const jobTime = new Date(jobData.updated_at || 0).getTime();
          if (jobTime > briefTime) {
            selectedDraft = jobData.draft_content;
            await supabase.from('content_briefs').update({ article_draft: jobData.draft_content, updated_at: new Date().toISOString() }).eq('id', brief.id);
          } else {
            selectedDraft = briefData.article_draft;
          }
        } else if (briefData?.article_draft) {
          selectedDraft = briefData.article_draft;
        } else if (jobData?.draft_content) {
          selectedDraft = jobData.draft_content;
          await supabase.from('content_briefs').update({ article_draft: jobData.draft_content }).eq('id', brief.id);
        }

        if (selectedDraft) {
          setDraftContent(selectedDraft);
          loadedBriefIdRef.current = brief.id;
          loadedDraftLengthRef.current = selectedDraft.length;
          loadedAtRef.current = new Date().toISOString();
          if (briefData?.draft_history && Array.isArray(briefData.draft_history)) {
            setDraftHistory(briefData.draft_history as unknown as DraftVersion[]);
          }
          if (activeMapId && brief.topic_id) {
            dispatch({ type: 'UPDATE_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, updates: { articleDraft: selectedDraft } } });
          }
          return;
        }
        loadedBriefIdRef.current = brief.id;
      } catch (err) {
        console.error('[DraftingModal] Error fetching draft:', err);
      } finally {
        setIsLoadingDraft(false);
      }
    };
    fetchDraftFromDatabase();
  }, [isOpen, brief?.id, brief?.articleDraft, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, activeMapId, brief?.topic_id, dispatch]);

  // Watch for state updates
  useEffect(() => {
    const stateDraft = safeString(brief?.articleDraft);
    if (stateDraft && stateDraft !== draftContent && !hasUnsavedChanges) {
      const isCurrentCorrupted = draftContent && draftContent.includes('data:image/') &&
        (draftContent.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{10000,}/g)?.length || 0) > 0;
      if (loadedDraftLengthRef.current > 0 && stateDraft.length < loadedDraftLengthRef.current && !isCurrentCorrupted) return;
      setDraftContent(stateDraft);
      loadedDraftLengthRef.current = stateDraft.length;
    }
  }, [brief?.articleDraft, draftContent, hasUnsavedChanges]);

  // Keyboard shortcuts for contextual editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (contextualEditor.canUndo) { e.preventDefault(); contextualEditor.undo(); }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        if (contextualEditor.canRedo) { e.preventDefault(); contextualEditor.redo(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [contextualEditor.canUndo, contextualEditor.canRedo, contextualEditor.undo, contextualEditor.redo]);

  // Check for newer content in database
  useEffect(() => {
    if (!isOpen || !brief?.id || brief.id.startsWith('transient-') || !draftContent || hasUnsavedChanges) return;
    const timeoutId = setTimeout(() => syncManager.checkDatabaseForNewerContent(), 500);
    return () => clearTimeout(timeoutId);
  }, [isOpen, brief?.id, draftContent, hasUnsavedChanges, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  // --- Handlers ---

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleConfigChange = useCallback((provider: string | null, model: string | null) => {
    if (provider && model) setOverrideSettings({ provider, model });
    else setOverrideSettings(null);
  }, []);

  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) onClose();
    } else {
      onClose();
    }
  };

  const handleSaveTransient = async () => {
    if (!brief || !state.activeMapId || !state.user) return;
    setIsSaving(true);
    try {
      const newTopicId = uuidv4();
      const newBriefId = uuidv4();
      const topicSlug = slugify(brief.title || 'imported-topic');

      const newTopic: EnrichedTopic = {
        id: newTopicId, map_id: state.activeMapId, title: brief.title || 'Imported Topic',
        slug: topicSlug, description: `Imported from ${brief.slug}`, type: 'outer',
        freshness: FreshnessProfile.EVERGREEN, parent_topic_id: null,
        metadata: { topic_class: 'informational', source: 'import' },
      };

      const newBrief: ContentBrief = { ...brief, id: newBriefId, topic_id: newTopic.id, articleDraft: draftContent };
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      const topicResult = await verifiedInsert(supabase,
        { table: 'topics', operationDescription: `create imported topic "${newTopic.title}"` },
        { id: newTopic.id, map_id: newTopic.map_id, title: newTopic.title, slug: newTopic.slug, description: newTopic.description, type: newTopic.type, parent_topic_id: newTopic.parent_topic_id, freshness: newTopic.freshness, metadata: (newTopic.metadata || {}) as Json, user_id: state.user.id },
        'id'
      );
      if (!topicResult.success) throw new Error(topicResult.error || 'Topic insert verification failed');

      const briefResult = await verifiedInsert(supabase,
        { table: 'content_briefs', operationDescription: `create brief for imported topic "${newBrief.title}"` },
        { id: newBrief.id, topic_id: newTopic.id, user_id: state.user.id, title: newBrief.title, meta_description: newBrief.metaDescription, key_takeaways: newBrief.keyTakeaways as any, outline: newBrief.outline, article_draft: newBrief.articleDraft, serp_analysis: newBrief.serpAnalysis as any, visuals: newBrief.visuals as any, contextual_vectors: newBrief.contextualVectors as any, contextual_bridge: newBrief.contextualBridge as any, perspectives: newBrief.perspectives as any, methodology_note: newBrief.methodology_note, structured_outline: newBrief.structured_outline as any, predicted_user_journey: newBrief.predicted_user_journey, query_type_format: newBrief.query_type_format, featured_snippet_target: newBrief.featured_snippet_target as any, visual_semantics: newBrief.visual_semantics as any, discourse_anchors: newBrief.discourse_anchors as any, created_at: new Date().toISOString() },
        'id'
      );
      if (!briefResult.success) {
        await verifiedDelete(supabase, { table: 'topics', operationDescription: `rollback topic "${newTopic.title}"` }, newTopic.id);
        throw new Error(briefResult.error || 'Brief insert verification failed');
      }

      dispatch({ type: 'ADD_TOPIC', payload: { mapId: state.activeMapId, topic: newTopic } });
      dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: newTopicId, brief: newBrief } });
      dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: newTopic });
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Imported page saved to map successfully (verified).' });
      setHasUnsavedChanges(false);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save to map." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = async (version: DraftVersion) => {
    if (!brief || !version.content) return;
    const confirmRestore = window.confirm(
      `Restore draft from ${new Date(version.saved_at).toLocaleString()}?\n\nThis version has ${version.char_count.toLocaleString()} characters.\n\nYour current draft will be saved to version history before restoring.`
    );
    if (!confirmRestore) return;
    setIsRestoringVersion(true);
    try {
      setDraftContent(version.content);
      setHasUnsavedChanges(true);
      setShowVersionHistory(false);
      loadedDraftLengthRef.current = version.content.length;
      dispatch({ type: 'SET_NOTIFICATION', payload: `Restored draft from ${new Date(version.saved_at).toLocaleString()}. Click "Save Draft" to persist this version.` });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to restore version. Please try again.' });
    } finally {
      setIsRestoringVersion(false);
    }
  };

  const handleRerunPasses = async () => {
    if (!brief || !databaseJobInfo || selectedPasses.length === 0) return;
    await enhancement.handleRerunPasses(selectedPasses);
    setShowPassesModal(false);
    setSelectedPasses([]);
    onClose();
  };

  const handleApplyAuditFix = useCallback((updatedDraft: string, issueId: string) => {
    setDraftContent(updatedDraft);
    setHasUnsavedChanges(true);
    enhancement.setAuditIssues(
      enhancement.auditIssues.map(issue => issue.id === issueId ? { ...issue, fixApplied: true } : issue)
    );
    dispatch({ type: 'SET_NOTIFICATION', payload: 'Fix applied successfully' });
  }, [dispatch, enhancement]);

  const handleDismissAuditIssue = useCallback((issueId: string) => {
    enhancement.setAuditIssues(enhancement.auditIssues.filter(issue => issue.id !== issueId));
  }, [enhancement]);

  // --- Aliases for brevity ---
  const { imagePlaceholders } = imageManager;
  const isTransient = brief.id.startsWith('transient-');

  const cardClasses = asPage
    ? "w-full flex flex-col h-[calc(100vh-4rem)] overflow-hidden"
    : "w-full max-w-[98vw] h-[95vh] flex flex-col";

  return (
    <div className={asPage ? '-m-4' : "fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"} onClick={asPage ? undefined : handleCloseModal}>
      <Card className={cardClasses} onClick={asPage ? undefined : (e => e.stopPropagation())}>
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            {asPage && routeParams.topicId && (
              <button onClick={() => routeNavigate(`/p/${routeParams.projectId}/m/${routeParams.mapId}/topics/${routeParams.topicId}/brief`)} className="text-xs text-gray-500 hover:text-gray-300 mb-1">&larr; Back to Brief</button>
            )}
            <h2 className="text-xl font-bold text-white">{isTransient ? 'Audit Live Page' : 'Article Draft Workspace'}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              {safeString(brief.title) || 'Untitled Topic'}
              {isTransient && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-700">Transient Mode</span>}
              {(() => {
                const d = (activeMap?.business_info as Record<string, unknown>)?.domain as string
                  || activeMap?.domain
                  || businessInfo?.domain
                  || '';
                const s = brief.slug || activeBriefTopic?.slug || '';
                return d && s ? <AuditButton url={`https://${d}/${s}`} variant="icon-text" size="sm" /> : null;
              })()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && <span className="text-xs text-yellow-400 animate-pulse">Unsaved Changes</span>}
            <button onClick={() => setShowRail(!showRail)} className={`px-3 py-1 text-xs rounded border ${showRail ? 'bg-blue-900/50 border-blue-600 text-blue-200' : 'bg-gray-700 border-gray-600 text-gray-300'}`}>
              {showRail ? 'Hide Requirements' : 'Show Requirements'}
            </button>
            <div className="relative">
              <Button variant="secondary" className="!py-1 !px-3 text-xs flex items-center gap-2" onClick={() => setShowModelSelector(!showModelSelector)}>
                <span>AI</span> {overrideSettings ? `${overrideSettings.provider}` : 'Config'}
              </Button>
              {showModelSelector && (
                <div className="absolute top-full right-0 mt-2 w-80 z-50 shadow-xl">
                  <AIModelSelector currentConfig={businessInfo} onConfigChange={handleConfigChange} className="bg-gray-800" />
                </div>
              )}
            </div>

            {/* View Toggles */}
            <div className="flex bg-gray-700 rounded p-1 mr-2">
              <button onClick={() => setActiveTab('edit')} className={`px-3 py-1 text-sm rounded ${activeTab === 'edit' ? 'bg-gray-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>Editor</button>
              <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 text-sm rounded ${activeTab === 'preview' ? 'bg-gray-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`} title="Visual preview only. Downloaded HTML includes SEO optimization.">HTML Preview</button>
              <button onClick={() => setActiveTab('images')} className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${activeTab === 'images' ? 'bg-amber-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>
                Images
                {imagePlaceholders.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'images' ? 'bg-amber-700' : 'bg-gray-600'}`}>
                    {imagePlaceholders.filter(p => p.status === 'placeholder').length}/{imagePlaceholders.length}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab('quality')} className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${activeTab === 'quality' ? 'bg-green-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>
                Quality
                {databaseJobInfo?.auditScore && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'quality' ? 'bg-green-700' : 'bg-gray-600'}`}>{databaseJobInfo.auditScore}%</span>
                )}
              </button>
              {showDebugTab && (
                <button onClick={() => setActiveTab('debug')} className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${activeTab === 'debug' ? 'bg-purple-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>Debug</button>
              )}
            </div>

            {enhancement.isPolishing && (
              <Button onClick={() => { dispatch({ type: 'SET_NOTIFICATION', payload: 'Polish cancelled.' }); }} className="!py-1 !px-3 text-sm bg-amber-700 hover:bg-amber-600" variant="secondary">Cancel Polish</Button>
            )}

            {isTransient ? (
              <Button onClick={handleSaveTransient} className="!py-1 !px-4 text-sm bg-green-700 hover:bg-green-600" disabled={isSaving || enhancement.isPolishing}>
                {isSaving ? <SmartLoader context="saving" size="sm" showText={false} /> : 'Save to Map'}
              </Button>
            ) : (
              <>
                <Button onClick={draftManager.handleSaveDraft} className="!py-1 !px-4 text-sm" disabled={isSaving || enhancement.isPolishing}>
                  {isSaving ? <SmartLoader context="saving" size="sm" showText={false} /> : 'Save Draft'}
                </Button>
                {draftHistory.length > 0 && (
                  <button onClick={() => setShowVersionHistory(true)} className="ml-2 px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded hover:border-gray-500" title={`${draftHistory.length} previous version(s) available`}>
                    History ({draftHistory.length})
                  </button>
                )}
              </>
            )}
            <button onClick={handleCloseModal} className="text-gray-400 text-2xl leading-none hover:text-white ml-2">&times;</button>
          </div>
        </header>

        <div className="flex-grow overflow-hidden bg-gray-900 flex">
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
                    <p className={`text-xs font-semibold text-gray-200 mb-1 ${section.level > 2 ? 'ml-2' : ''}`}>{safeString(section.heading)}</p>
                    {section.subordinate_text_hint && (
                      <div className="bg-black/30 p-2 rounded text-[10px] text-gray-300 italic mb-1">
                        <span className="text-yellow-500 font-bold not-italic">Hint: </span>{safeString(section.subordinate_text_hint)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Job Status Info */}
            {databaseJobInfo && !databaseDraft && databaseJobInfo.jobStatus === 'completed' && (
              <div className="bg-gray-800/60 border-b border-gray-700 px-3 py-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="text-green-400">&#10003;</span>
                    <span>Multi-pass generation complete</span>
                    <span className="text-gray-600">&bull;</span>
                    <span>{databaseJobInfo.sectionCount} sections</span>
                    <span className="text-gray-600">&bull;</span>
                    <span>{databaseJobInfo.passesCompleted}/9 passes</span>
                    {databaseJobInfo.auditScore && (<><span className="text-gray-600">&bull;</span><span>Audit: {databaseJobInfo.auditScore}%</span></>)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'pass_1_draft', label: 'D' }, { key: 'pass_2_headers', label: 'H' },
                      { key: 'pass_3_lists', label: 'L' }, { key: 'pass_4_discourse', label: 'C' },
                      { key: 'pass_5_microsemantics', label: 'M' }, { key: 'pass_6_visuals', label: 'V' },
                      { key: 'pass_7_intro', label: 'I' }, { key: 'pass_8_polish', label: 'P' },
                      { key: 'pass_9_audit', label: 'A' }, { key: 'pass_10_schema', label: 'S' },
                    ].map(({ key, label }) => {
                      const status = databaseJobInfo.passesStatus?.[key];
                      const isComplete = status === 'completed';
                      return (
                        <span key={key} className={`text-[9px] w-4 h-4 flex items-center justify-center rounded ${isComplete ? 'bg-green-900/40 text-green-400' : 'bg-gray-700/40 text-gray-500'}`} title={`${key.replace(/_/g, ' ')}: ${status || 'pending'}`}>{label}</span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Database Sync Banner */}
            {databaseJobInfo && (databaseDraft || databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending') && (
              <div className={`${databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? 'bg-amber-900/40 border-amber-600/50' : 'bg-blue-900/40 border-blue-600/50'} border-b p-3 flex-shrink-0`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? 'bg-amber-600/30' : 'bg-blue-600/30'}`}>
                      {databaseJobInfo.jobStatus === 'paused' ? (
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ) : databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? (
                        <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? 'text-amber-200' : 'text-blue-200'}`}>
                        {databaseJobInfo.jobStatus === 'paused' ? <>Generation paused at Pass {databaseJobInfo.currentPass} - can be resumed</> :
                         databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? <>Generation in progress at Pass {databaseJobInfo.currentPass}</> :
                         databaseJobInfo.contentSource?.includes('optimized') ? <>Optimized content available - includes tables, lists, improved structure</> :
                         <>Newer draft available from multi-pass generation</>}
                      </p>
                      <p className={`text-xs ${databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? 'text-amber-300/70' : 'text-blue-300/70'}`}>
                        {databaseJobInfo.sectionCount} sections &bull; {databaseJobInfo.passesCompleted}/9 passes completed
                        {databaseJobInfo.auditScore && ` \u00b7 Audit score: ${databaseJobInfo.auditScore}%`}
                        {databaseDraft && <> &bull; {databaseDraft.length.toLocaleString()} chars{draftContent && ` (${databaseDraft.length > draftContent.length ? '+' : ''}${(databaseDraft.length - draftContent.length).toLocaleString()} diff)`}</>}
                      </p>
                      {databaseJobInfo.passesStatus && Object.keys(databaseJobInfo.passesStatus).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[
                            { key: 'pass_1_draft', label: 'Draft' }, { key: 'pass_2_headers', label: 'Headers' },
                            { key: 'pass_3_lists', label: 'Lists' }, { key: 'pass_4_discourse', label: 'Discourse' },
                            { key: 'pass_5_microsemantics', label: 'Micro' }, { key: 'pass_6_visuals', label: 'Visuals' },
                            { key: 'pass_7_intro', label: 'Intro' }, { key: 'pass_8_polish', label: 'Polish' },
                            { key: 'pass_9_audit', label: 'Audit' }, { key: 'pass_10_schema', label: 'Schema' },
                          ].map(({ key, label }) => {
                            const status = databaseJobInfo.passesStatus[key];
                            const isComplete = status === 'completed';
                            const isInProgress = status === 'in_progress';
                            return (
                              <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded ${isComplete ? 'bg-green-900/50 text-green-300 border border-green-700/50' : isInProgress ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50 animate-pulse' : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'}`} title={`${label}: ${status || 'pending'}`}>
                                {isComplete ? '\u2713' : isInProgress ? '\u22EF' : '\u25CB'} {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {databaseDraft && (
                      <button onClick={() => setShowDiffPreview(!showDiffPreview)} className={`text-xs px-3 py-1.5 rounded border transition-colors ${databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? 'border-amber-600/50 text-amber-300 hover:bg-amber-800/30' : 'border-blue-600/50 text-blue-300 hover:bg-blue-800/30'}`}>
                        {showDiffPreview ? 'Hide Preview' : 'Compare'}
                      </button>
                    )}
                    {databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'pending' ? (
                      <button onClick={() => { setDatabaseDraft(null); setDatabaseJobInfo(null); onClose(); }} className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors">Resume in Brief Modal</button>
                    ) : databaseJobInfo.jobStatus === 'in_progress' ? (
                      <span className="text-xs px-3 py-1.5 rounded bg-amber-600/50 text-amber-200">Generation Active</span>
                    ) : (
                      <button onClick={syncManager.handleSyncFromDatabase} disabled={isSyncing} className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50">
                        {isSyncing ? 'Syncing...' : databaseJobInfo.contentSource?.includes('optimized') ? 'Load Optimized Version' : 'Use Newer Draft'}
                      </button>
                    )}
                    <button onClick={() => { setDatabaseDraft(null); setDatabaseJobInfo(null); }} className={`text-xs px-2 py-1.5 transition-colors ${databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? 'text-amber-400 hover:text-amber-200' : 'text-blue-400 hover:text-blue-200'}`} title="Dismiss">&times;</button>
                  </div>
                </div>
                {showDiffPreview && databaseDraft && (
                  <div className="mt-3 grid grid-cols-2 gap-4 max-h-[50vh] overflow-hidden">
                    <div className="bg-gray-900/50 rounded p-3 overflow-y-auto flex flex-col">
                      <p className="text-xs font-semibold text-gray-400 mb-2 sticky top-0 bg-gray-900/90 py-1">Current Editor ({draftContent.length.toLocaleString()} chars){databaseDraft.length > draftContent.length && <span className="ml-2 text-amber-400">({(databaseDraft.length - draftContent.length).toLocaleString()} chars shorter)</span>}</p>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap font-mono flex-grow">{draftContent}</div>
                    </div>
                    <div className="bg-blue-900/30 rounded p-3 overflow-y-auto flex flex-col">
                      <p className="text-xs font-semibold text-blue-300 mb-2 sticky top-0 bg-blue-900/90 py-1">Optimized Version ({databaseDraft.length.toLocaleString()} chars){databaseDraft.length > draftContent.length && <span className="ml-2 text-green-400">(+{(databaseDraft.length - draftContent.length).toLocaleString()} chars)</span>}</p>
                      <div className="text-xs text-blue-200 whitespace-pre-wrap font-mono flex-grow">{databaseDraft}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generation Changes Panel */}
            {brief?.generation_changes && brief.generation_changes.length > 0 && (
              <div className="px-4 flex-shrink-0">
                <GenerationChangesPanel changes={brief.generation_changes} summary={brief.generation_summary || null} />
              </div>
            )}

            {isLoadingDraft ? (
              <div className="flex-1 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <SmartLoader context="loading" size="lg" showText={false} className="mx-auto mb-4" />
                  <p className="text-gray-400">Loading draft from database...</p>
                </div>
              </div>
            ) : activeTab === 'edit' ? (
              <Textarea value={draftContent} onChange={handleContentChange} className="w-full h-full font-mono text-sm text-gray-300 bg-gray-900 border-none focus:ring-0 resize-none p-6 leading-relaxed overflow-y-auto" placeholder="Start writing your article draft here..." disabled={enhancement.isPolishing} />
            ) : activeTab === 'preview' ? (
              <DraftingPreviewPanel
                brief={brief}
                draftContent={draftContent}
                businessInfo={businessInfo}
                imagePlaceholders={imagePlaceholders}
                databaseJobInfo={databaseJobInfo}
                contentContainerRef={contentContainerRef}
                contextualEditor={contextualEditor}
                imageManager={imageManager}
              />
            ) : activeTab === 'images' ? (
              <DraftingImagePanel
                imagePlaceholders={imagePlaceholders}
                draftContent={draftContent}
                businessInfo={businessInfo}
                jobId={databaseJobInfo?.jobId}
                briefId={brief?.id}
                isTransient={isTransient}
                showImageModal={imageManager.showImageModal}
                selectedPlaceholder={imageManager.selectedPlaceholder}
                openInVisualEditor={imageManager.openInVisualEditor}
                onDraftChange={setDraftContent}
                onSetHasUnsavedChanges={setHasUnsavedChanges}
                onSetSelectedPlaceholder={imageManager.setSelectedPlaceholder}
                onSetOpenInVisualEditor={imageManager.setOpenInVisualEditor}
                onSetShowImageModal={imageManager.setShowImageModal}
                onImageInsert={imageManager.handleImageInsert}
              />
            ) : activeTab === 'quality' ? (
              <QualityTabContent
                brief={brief}
                draftContent={draftContent}
                businessInfo={businessInfo}
                databaseJobInfo={databaseJobInfo}
                minimalJob={minimalJob}
                onSetActiveTab={setActiveTab}
                dispatch={dispatch}
              />
            ) : activeTab === 'debug' && showDebugTab ? (
              <div className="h-full overflow-y-auto">
                {brief && draftContent ? (
                  <ContentAnalysisPanel brief={brief} draft={draftContent} sections={[]} job={databaseJobInfo ? { id: databaseJobInfo.jobId, draft_content: draftContent, status: databaseJobInfo.jobStatus, current_pass: databaseJobInfo.currentPass } as any : undefined} businessInfo={businessInfo}
                    onExport={async (format) => {
                      const debugData = { exportedAt: new Date().toISOString(), brief, draftContent, job: databaseJobInfo, passSnapshots: getPassSnapshots(databaseJobInfo?.jobId || '') };
                      if (format === 'clipboard') {
                        await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
                        dispatch({ type: 'SET_NOTIFICATION', payload: 'Debug data copied to clipboard' });
                      } else {
                        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `debug-${databaseJobInfo?.jobId || 'unknown'}.json`; a.click(); URL.revokeObjectURL(url);
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400"><p>Generate content first to see analysis</p></div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right Sidebar (Requirements Rail) */}
          {showRail && activeTab === 'edit' && (
            <RequirementsRail brief={brief} draftContent={draftContent} mapEavs={activeMap?.eavs} />
          )}
        </div>

        {/* Audit Issues Panel - Collapsible */}
        <AuditIssuesPanelSection
          showAuditPanel={enhancement.showAuditPanel}
          auditIssues={enhancement.auditIssues}
          brief={brief}
          draftContent={draftContent}
          businessInfo={businessInfo}
          onApplyFix={handleApplyAuditFix}
          onDismiss={handleDismissAuditIssue}
          onClose={() => enhancement.setShowAuditPanel(false)}
        />

        <footer className="p-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{draftContent.length.toLocaleString()} chars</span>
              <Button onClick={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicResources', visible: true } })} variant="secondary" className="text-xs py-0.5 px-2 !bg-transparent !text-gray-400 hover:!text-white" title="View all generated resources">&#128230;</Button>
            </div>
            <div className="flex items-center gap-1">
              {/* Export Group */}
              <UpwardDropdownMenu
                trigger={{ label: "Export", icon: "\u2B07", disabled: !draftContent, title: "Export article in various formats", className: "text-xs py-1 px-2 bg-emerald-600/20 !text-emerald-400 hover:bg-emerald-600/40 hover:!text-emerald-300 border border-emerald-500/30" }}
                items={[
                  { id: 'copy-html', label: 'Copy HTML to clipboard', icon: '\uD83D\uDCCB', onClick: publishing.handleCopyHtml },
                  { id: 'download-embedded', label: 'HTML with embedded images', icon: '\uD83D\uDCE6', onClick: () => publishing.handleDownloadHtml(true), divider: true },
                  { id: 'download-urls', label: 'HTML with image URLs', icon: '\uD83D\uDD17', onClick: () => publishing.handleDownloadHtml(false) },
                  { id: 'export-all', label: 'Download full package', icon: '\uD83D\uDCC1', onClick: publishing.handleDownloadPackage, divider: true },
                ]}
              />
              <div className="w-px h-6 bg-gray-600/50 mx-2" />
              {/* Enhancement Group */}
              {contextualEditor.editCount > 0 && (
                <>
                  <button onClick={contextualEditor.undo} disabled={!contextualEditor.canUndo} className="px-2 py-1 text-sm text-teal-400 hover:text-teal-300 disabled:opacity-30 disabled:text-gray-500" title="Undo (Ctrl+Z)">&larr;</button>
                  <button onClick={contextualEditor.redo} disabled={!contextualEditor.canRedo} className="px-2 py-1 text-sm text-teal-400 hover:text-teal-300 disabled:opacity-30 disabled:text-gray-500" title="Redo (Ctrl+Y)">&rarr;</button>
                </>
              )}
              <Button onClick={enhancement.handlePolishDraft} disabled={enhancement.isPolishing || !draftContent || activeTab === 'preview' || !canGenerateContent} className="text-xs py-1 px-2 bg-teal-600/20 !text-teal-400 hover:bg-teal-600/40 hover:!text-teal-300 border border-teal-500/30" title={!canGenerateContent ? (featureReason || 'Content generation requires a subscription upgrade') : "Polish draft"}>
                {enhancement.isPolishing ? <SmartLoader context="generating" size="sm" showText={false} /> : 'Polish'}
              </Button>
              <Button onClick={() => onAnalyzeFlow(draftContent)} variant="secondary" disabled={isLoading || !draftContent || activeTab === 'preview' || enhancement.isPolishing} className="text-xs py-1 px-2 bg-teal-600/20 !text-teal-400 hover:bg-teal-600/40 hover:!text-teal-300 border border-teal-500/30" title="Analyze contextual flow">
                {isLoading ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Flow'}
              </Button>
              <Button onClick={enhancement.handleRunAudit} variant="secondary" disabled={isLoading || !draftContent || activeTab === 'preview' || enhancement.isPolishing || enhancement.isRunningAudit} className={`text-xs py-1 px-2 ${enhancement.showAuditPanel ? 'bg-teal-600' : 'bg-teal-600/20'} !text-teal-400 hover:bg-teal-600/40 hover:!text-teal-300 border border-teal-500/30`} title="Run algorithmic audit">
                {enhancement.isRunningAudit ? <SmartLoader context="auditing" size="sm" showText={false} /> : 'Audit'}
                {enhancement.auditIssues.filter(i => !i.fixApplied).length > 0 && <span className="ml-1 px-1 py-0.5 text-[10px] bg-red-600 rounded-full">{enhancement.auditIssues.filter(i => !i.fixApplied).length}</span>}
              </Button>
              <div className="w-px h-6 bg-gray-600/50 mx-2" />
              {/* Content Additions Group */}
              <Button onClick={() => onGenerateSchema(brief)} disabled={isLoading || !draftContent || activeTab === 'preview' || enhancement.isPolishing} variant="secondary" className="text-xs py-1 px-2 bg-amber-600/20 !text-amber-400 hover:bg-amber-600/40 hover:!text-amber-300 border border-amber-500/30" title="Generate JSON-LD structured data">Schema</Button>
              <Button onClick={() => setActiveTab('images')} disabled={isLoading || !draftContent || enhancement.isPolishing} variant="secondary" className={`text-xs py-1 px-2 ${activeTab === 'images' ? 'bg-amber-600' : 'bg-amber-600/20'} !text-amber-400 hover:bg-amber-600/40 hover:!text-amber-300 border border-amber-500/30`} title={imagePlaceholders.length > 0 ? `Manage ${imagePlaceholders.length} image(s)` : 'No image placeholders found'}>
                Images{imagePlaceholders.length > 0 && ` (${imagePlaceholders.length})`}
              </Button>
              <Button onClick={publishing.handleAddRelatedTopics} disabled={!draftContent} variant="secondary" className="text-xs py-1 px-2 bg-amber-600/20 !text-amber-400 hover:bg-amber-600/40 hover:!text-amber-300 border border-amber-500/30" title="Add Related Topics section">&#128279;</Button>
              {databaseJobInfo && (
                <Button onClick={() => setShowPassesModal(true)} disabled={isLoading || !draftContent || activeTab === 'preview' || enhancement.isPolishing} variant="secondary" className="text-xs py-1 px-2 bg-amber-600/20 !text-amber-400 hover:bg-amber-600/40 hover:!text-amber-300 border border-amber-500/30" title="Re-run specific optimization passes">Re-run</Button>
              )}
              <div className="w-px h-6 bg-gray-600/50 mx-2" />
              {/* Publish Group */}
              <UpwardDropdownMenu
                trigger={{ label: "Publish", icon: "\uD83D\uDE80", disabled: isLoading || !draftContent || enhancement.isPolishing, title: "Publish and distribute content", className: "text-xs py-1 px-2 bg-purple-600/20 !text-purple-400 hover:bg-purple-600/40 hover:!text-purple-300 border border-purple-500/30" }}
                items={[
                  { id: 'premium-design', label: 'Export & Design', icon: '\uD83C\uDFA8', onClick: () => { setPremiumDesignInitialView('fork'); setShowPremiumDesignModal(true); } },
                  { id: 'style-guide', label: 'Style Guide', icon: '\uD83D\uDCCB', onClick: () => { setPremiumDesignInitialView('premium-url'); setShowPremiumDesignModal(true); }, divider: true },
                  { id: 'style-publish-legacy', label: 'Style & Publish (Legacy)', icon: '\uD83D\uDD8C\uFE0F', onClick: () => { if (asPage && routeParams.projectId && routeParams.mapId && routeParams.topicId) { routeNavigate(`/p/${routeParams.projectId}/m/${routeParams.mapId}/topics/${routeParams.topicId}/style`); } else { publishing.setShowStylePublishModal(true); } } },
                  { id: 'publish-wp', label: 'Publish to WordPress', icon: '\uD83D\uDCDD', onClick: () => publishing.setShowPublishModal(true) },
                  { id: 'social-posts', label: 'Create Social Posts', icon: '\uD83D\uDCF1', onClick: () => publishing.setShowSocialModal(true), disabled: !publishing.socialTransformSource, divider: true },
                  { id: 'campaigns', label: 'View Campaigns', icon: '\uD83D\uDCCA', onClick: () => publishing.setShowCampaignsModal(true), disabled: !activeBriefTopic?.id, badge: socialCampaigns.campaigns.length > 0 ? socialCampaigns.campaigns.length : undefined },
                  ...(reportHook.canGenerate ? [{ id: 'export-report', label: 'Export Quality Report', icon: '\uD83D\uDCC8', onClick: reportHook.open, divider: true }] : []),
                ] as DropdownMenuItem[]}
                align="right"
              />
            </div>
            <Button onClick={handleCloseModal} variant="secondary" className="text-xs py-1 px-2 !bg-transparent !text-gray-400 hover:!text-white">Close</Button>
          </div>
        </footer>
      </Card>

      {/* Re-run Passes Modal */}
      {databaseJobInfo && (
        <RerunPassesModal
          isOpen={showPassesModal}
          databaseJobInfo={databaseJobInfo}
          selectedPasses={selectedPasses}
          setSelectedPasses={setSelectedPasses}
          isRerunning={enhancement.isRerunning}
          onRerun={handleRerunPasses}
          onClose={() => setShowPassesModal(false)}
        />
      )}

      {/* Report Modal */}
      {reportHook.data && <ReportModal isOpen={reportHook.isOpen} onClose={reportHook.close} reportType="article-draft" data={reportHook.data} projectName={activeMap?.name || businessInfo?.projectName} />}

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionHistory}
        draftContent={draftContent}
        draftHistory={draftHistory}
        isRestoringVersion={isRestoringVersion}
        onRestoreVersion={handleRestoreVersion}
        onClose={() => setShowVersionHistory(false)}
      />

      {/* Publishing Modals */}
      <DraftingPublishingPanel
        brief={brief}
        activeBriefTopic={activeBriefTopic}
        draftContent={draftContent}
        businessInfo={businessInfo}
        activeMap={activeMap}
        showPublishModal={publishing.showPublishModal}
        showStylePublishModal={publishing.showStylePublishModal}
        showPremiumDesignModal={showPremiumDesignModal}
        premiumDesignInitialView={premiumDesignInitialView}
        onClosePublishModal={() => publishing.setShowPublishModal(false)}
        onCloseStylePublishModal={() => publishing.setShowStylePublishModal(false)}
        onClosePremiumDesignModal={() => { setShowPremiumDesignModal(false); setPremiumDesignInitialView('fork'); }}
        dispatch={dispatch}
      />

      {/* Social Modals */}
      <DraftingSocialPanel
        activeBriefTopicId={activeBriefTopic?.id || ''}
        socialTransformSource={publishing.socialTransformSource}
        campaigns={socialCampaigns.campaigns}
        campaignsLoading={socialCampaigns.isLoading}
        campaignsError={socialCampaigns.error}
        showSocialModal={publishing.showSocialModal}
        showCampaignsModal={publishing.showCampaignsModal}
        onCloseSocialModal={() => publishing.setShowSocialModal(false)}
        onCloseCampaignsModal={() => publishing.setShowCampaignsModal(false)}
        onOpenSocialModal={() => publishing.setShowSocialModal(true)}
        onTransform={publishing.handleSocialTransform}
        onRefreshCampaigns={socialCampaigns.refreshCampaigns}
        onUpdatePost={handleUpdateSocialPost}
        onUpdateCampaign={async (campaignId, updates) => socialCampaigns.updateCampaign(campaignId, updates)}
        onDeleteCampaign={async (campaignId) => socialCampaigns.deleteCampaign(campaignId)}
        dispatch={dispatch}
      />
    </div>
  );
};

/**
 * DraftingModal - Article draft workspace with editing, preview, image management,
 * quality auditing, and publishing capabilities.
 *
 * Decomposed into sub-panels (Sprint 5):
 * - DraftingImagePanel: Image management tab + generation modal
 * - DraftingAuditPanel: Audit issues panel + quality tab content
 * - DraftingPublishingPanel: WordPress, Style, Premium Design modals
 * - DraftingSocialPanel: Social media transformation + campaigns modals
 *
 * Extracted hooks (from ./drafting/):
 * - useImageManager: Image placeholder aggregation, generation, insertion
 * - useContentEnhancement: Polish, audit, re-run passes
 * - usePublishingExport: HTML export, package download, social transform
 * - useDraftContentManager: Save, restore, load drafts
 * - useDatabaseSyncManager: Database sync detection and operations
 */
const DraftingModal: React.FC<DraftingModalProps> = (props) => {
  const { isOpen, brief: briefProp, businessInfo } = props;
  const { state, dispatch } = useAppState();

  const { enabled: canGenerateContent, reason: featureReason } = useFeatureGate('content_generation');

  const { activeBriefTopic, topicalMaps, activeMapId } = state;
  const activeMap = topicalMaps.find(m => m.id === activeMapId);
  const briefFromState = activeBriefTopic ? activeMap?.briefs?.[activeBriefTopic.id] : null;
  const brief = briefFromState || briefProp;

  // Core state that DraftingContext needs
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'images' | 'quality' | 'debug'>('edit');
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftHistory, setDraftHistory] = useState<DraftVersion[]>([]);
  const [databaseDraft, setDatabaseDraft] = useState<string | null>(null);
  const [databaseJobInfo, setDatabaseJobInfo] = useState<DatabaseJobInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [overrideSettings, setOverrideSettings] = useState<{ provider: string; model: string } | null>(null);

  const draftContentRef = useRef(draftContent);
  useEffect(() => { draftContentRef.current = draftContent; }, [draftContent]);

  const loadedBriefIdRef = useRef<string | null>(null);
  const loadedDraftLengthRef = useRef<number>(0);
  const loadedAtRef = useRef<string | null>(null);

  if (!isOpen || !brief) return null;

  // Build context value for DraftingProvider
  const contextValue = {
    brief,
    draftContent,
    setDraftContent,
    draftContentRef,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    isLoadingDraft,
    setIsLoadingDraft,
    isSaving,
    setIsSaving,
    draftHistory,
    setDraftHistory,
    databaseDraft,
    setDatabaseDraft,
    databaseJobInfo,
    setDatabaseJobInfo,
    isSyncing,
    setIsSyncing,
    loadedBriefIdRef,
    loadedDraftLengthRef,
    loadedAtRef,
    imagePlaceholders: [], // Will be populated by useImageManager inside provider
    businessInfo,
    activeMapId: activeMapId || null,
    activeMap,
    activeBriefTopic,
    userId: state.user?.id,
    overrideSettings,
    setOverrideSettings,
    activeTab,
    setActiveTab,
    dispatch,
    canGenerateContent,
    featureReason: featureReason || null,
  };

  return (
    <DraftingProvider value={contextValue}>
      <DraftingModalInner
        {...props}
        brief={brief}
        draftContent={draftContent}
        setDraftContent={setDraftContent}
        draftContentRef={draftContentRef}
        hasUnsavedChanges={hasUnsavedChanges}
        setHasUnsavedChanges={setHasUnsavedChanges}
        isLoadingDraft={isLoadingDraft}
        setIsLoadingDraft={setIsLoadingDraft}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        draftHistory={draftHistory}
        setDraftHistory={setDraftHistory}
        databaseDraft={databaseDraft}
        setDatabaseDraft={setDatabaseDraft}
        databaseJobInfo={databaseJobInfo}
        setDatabaseJobInfo={setDatabaseJobInfo}
        isSyncing={isSyncing}
        setIsSyncing={setIsSyncing}
        overrideSettings={overrideSettings}
        setOverrideSettings={setOverrideSettings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loadedBriefIdRef={loadedBriefIdRef}
        loadedDraftLengthRef={loadedDraftLengthRef}
        loadedAtRef={loadedAtRef}
        canGenerateContent={canGenerateContent}
        featureReason={featureReason || null}
        activeMap={activeMap}
        activeMapId={activeMapId || null}
        activeBriefTopic={activeBriefTopic}
      />
    </DraftingProvider>
  );
};

export default DraftingModal;
