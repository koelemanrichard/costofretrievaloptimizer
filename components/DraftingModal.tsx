
// components/DraftingModal.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ContentBrief, BusinessInfo, EnrichedTopic, FreshnessProfile, ImagePlaceholder } from '../types';
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
import { extractPlaceholdersFromDraft } from '../services/ai/imageGeneration/placeholderParser';
import { ImageGenerationModal } from './imageGeneration/ImageGenerationModal';
import { ImageManagementPanel } from './imageGeneration/ImageManagementPanel';
import { ReportExportButton, ReportModal } from './reports';
import { useArticleDraftReport } from '../hooks/useReportGeneration';
import { ContentGenerationJob } from '../types';

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

const DraftingModal: React.FC<DraftingModalProps> = ({ isOpen, onClose, brief: briefProp, onAudit, onGenerateSchema, isLoading, businessInfo, onAnalyzeFlow }) => {
  const { state, dispatch } = useAppState();

  // Read brief from state for UI display
  const { activeBriefTopic, topicalMaps, activeMapId } = state;
  const activeMap = topicalMaps.find(m => m.id === activeMapId);
  const briefFromState = activeBriefTopic ? activeMap?.briefs?.[activeBriefTopic.id] : null;
  const brief = briefFromState || briefProp;

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'images'>('edit');
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRail, setShowRail] = useState(true); // Toggle for Requirements Rail
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Database sync detection state
  const [databaseDraft, setDatabaseDraft] = useState<string | null>(null);
  const [databaseJobInfo, setDatabaseJobInfo] = useState<{
    updatedAt: string;
    auditScore: number | null;
    passesCompleted: number;
    sectionCount: number;
    jobStatus: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
    currentPass: number;
    jobId: string;
    passesStatus: Record<string, string>;
    contentSource?: string; // Track the source of the content for better messaging
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDiffPreview, setShowDiffPreview] = useState(false);

  // Dynamic Model Selection State
  const [overrideSettings, setOverrideSettings] = useState<{ provider: string, model: string } | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Image Generation State
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<ImagePlaceholder | null>(null);

  // Re-run Passes State
  const [showPassesModal, setShowPassesModal] = useState(false);
  const [selectedPasses, setSelectedPasses] = useState<number[]>([]);
  const [isRerunning, setIsRerunning] = useState(false);

  // Create a minimal job object for report generation
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
      schema_data: null,
      schema_validation_results: null,
      schema_entities: null,
      schema_page_type: null,
      progressive_schema_data: null
    };
  }, [databaseJobInfo, brief, draftContent, activeMapId, state.user?.id]);

  // Report generation hook
  const reportHook = useArticleDraftReport(minimalJob, brief);

  // Parse image placeholders from draft content
  const imagePlaceholders = useMemo(() => {
    if (!draftContent) return [];
    return extractPlaceholdersFromDraft(draftContent);
  }, [draftContent]);

  // Track which brief/draft we've loaded to avoid re-fetching
  const loadedBriefIdRef = useRef<string | null>(null);
  const loadedDraftLengthRef = useRef<number>(0); // Track draft length to detect regeneration
  const loadedAtRef = useRef<string | null>(null); // Track when content was loaded to detect newer job updates

  // ROBUST FIX: Fetch draft directly from database when modal opens
  // This bypasses React state timing issues entirely
  useEffect(() => {
    const fetchDraftFromDatabase = async () => {
      if (!isOpen || !brief?.id || brief.id.startsWith('transient-')) {
        return;
      }

      // Check if we have a draft in state/prop
      const existingDraft = safeString(brief.articleDraft);

      // Detect regeneration: same brief ID but different draft length
      const isDraftRegenerated = loadedBriefIdRef.current === brief.id &&
                                  existingDraft &&
                                  existingDraft.length !== loadedDraftLengthRef.current;

      // Don't re-fetch if we already loaded this brief AND have content AND draft hasn't changed
      if (loadedBriefIdRef.current === brief.id && draftContent && !isDraftRegenerated) {
        console.log('[DraftingModal] Already loaded draft for this brief, skipping fetch');
        return;
      }

      // If draft was regenerated, update with new draft
      // BUT only if the new draft is NOT shorter (prevent accidental content loss)
      if (isDraftRegenerated) {
        if (existingDraft.length >= loadedDraftLengthRef.current) {
          console.log('[DraftingModal] Draft regenerated! Updating from', loadedDraftLengthRef.current, 'to', existingDraft.length, 'chars');
          setDraftContent(existingDraft);
          loadedDraftLengthRef.current = existingDraft.length;
          loadedAtRef.current = new Date().toISOString();
          setHasUnsavedChanges(false);
        } else {
          console.log('[DraftingModal] Skipping regeneration - would downgrade from', loadedDraftLengthRef.current, 'to', existingDraft.length, 'chars');
          // Don't update - keep the longer content
        }
        return;
      }

      // If we have a draft in state/prop already, use it
      if (existingDraft) {
        console.log('[DraftingModal] Using existing draft from state:', existingDraft.length, 'chars');
        setDraftContent(existingDraft);
        loadedBriefIdRef.current = brief.id;
        loadedDraftLengthRef.current = existingDraft.length;
        loadedAtRef.current = new Date().toISOString();
        return;
      }

      // No draft in state - fetch from database (handles race condition)
      console.log('[DraftingModal] No draft in state, fetching from database for brief:', brief.id);
      setIsLoadingDraft(true);

      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // First try content_briefs table (primary storage)
        const { data: briefData, error: briefError } = await supabase
          .from('content_briefs')
          .select('article_draft')
          .eq('id', brief.id)
          .single();

        if (!briefError && briefData?.article_draft) {
          console.log('[DraftingModal] Loaded draft from content_briefs:', briefData.article_draft.length, 'chars');
          setDraftContent(briefData.article_draft);
          loadedBriefIdRef.current = brief.id;
          loadedDraftLengthRef.current = briefData.article_draft.length;
          loadedAtRef.current = new Date().toISOString();

          // Also update React state so it stays in sync
          if (activeMapId && brief.topic_id) {
            dispatch({
              type: 'UPDATE_BRIEF',
              payload: {
                mapId: activeMapId,
                topicId: brief.topic_id,
                updates: { articleDraft: briefData.article_draft }
              }
            });
          }
          return;
        }

        // Fallback: try content_generation_jobs table
        const { data: jobData, error: jobError } = await supabase
          .from('content_generation_jobs')
          .select('draft_content')
          .eq('brief_id', brief.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!jobError && jobData?.draft_content) {
          console.log('[DraftingModal] Loaded draft from content_generation_jobs:', jobData.draft_content.length, 'chars');
          setDraftContent(jobData.draft_content);
          loadedBriefIdRef.current = brief.id;
          loadedDraftLengthRef.current = jobData.draft_content.length;
          loadedAtRef.current = new Date().toISOString();

          // Sync to content_briefs and React state
          await supabase
            .from('content_briefs')
            .update({ article_draft: jobData.draft_content })
            .eq('id', brief.id);

          if (activeMapId && brief.topic_id) {
            dispatch({
              type: 'UPDATE_BRIEF',
              payload: {
                mapId: activeMapId,
                topicId: brief.topic_id,
                updates: { articleDraft: jobData.draft_content }
              }
            });
          }
          return;
        }

        console.log('[DraftingModal] No draft found in database');
        loadedBriefIdRef.current = brief.id;

      } catch (err) {
        console.error('[DraftingModal] Error fetching draft:', err);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    fetchDraftFromDatabase();
  }, [isOpen, brief?.id, brief?.articleDraft, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, activeMapId, brief?.topic_id, dispatch]);

  // Reset loaded ref when brief changes
  useEffect(() => {
    if (brief?.id && loadedBriefIdRef.current !== brief.id) {
      loadedBriefIdRef.current = null;
    }
  }, [brief?.id]);

  // Also watch for state updates (in case UPDATE_BRIEF fires after initial load)
  useEffect(() => {
    const stateDraft = safeString(brief?.articleDraft);
    if (stateDraft && stateDraft !== draftContent && !hasUnsavedChanges) {
      // CRITICAL: Prevent race condition where stale state overwrites synced content
      // If we recently loaded/synced content that's longer, don't revert to shorter content
      if (loadedDraftLengthRef.current > 0 && stateDraft.length < loadedDraftLengthRef.current) {
        console.log('[DraftingModal] Skipping state sync - would revert to shorter content:',
          stateDraft.length, 'chars vs loaded', loadedDraftLengthRef.current, 'chars');
        return;
      }
      console.log('[DraftingModal] State updated with new draft:', stateDraft.length, 'chars');
      setDraftContent(stateDraft);
      loadedDraftLengthRef.current = stateDraft.length;
    }
  }, [brief?.articleDraft, draftContent, hasUnsavedChanges]);

  // Check for newer content in database (from completed multi-pass generation)
  useEffect(() => {
    const checkDatabaseForNewerContent = async () => {
      if (!isOpen || !brief?.id || brief.id.startsWith('transient-') || !draftContent) {
        return;
      }

      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // Get the latest job for this brief (any status - to detect incomplete jobs that can be resumed)
        const { data: jobData, error: jobError } = await supabase
          .from('content_generation_jobs')
          .select('id, draft_content, updated_at, final_audit_score, passes_status, status, current_pass')
          .eq('brief_id', brief.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobError || !jobData) {
          setDatabaseDraft(null);
          setDatabaseJobInfo(null);
          return;
        }

        // ALWAYS get sections to find the most complete content
        // Compare: draft_content from job, assembled sections, and current display
        let sectionCount = 0;
        let assembledFromSections: string | null = null;

        // Get all completed sections
        const { data: sections } = await supabase
          .from('content_generation_sections')
          .select('section_key, section_heading, section_level, section_order, current_content, status')
          .eq('job_id', jobData.id)
          .order('section_order', { ascending: true });

        if (sections && sections.length > 0) {
          const completedSections = sections.filter(s => s.status === 'completed' && s.current_content);
          sectionCount = completedSections.length;

          if (completedSections.length > 0) {
            assembledFromSections = completedSections
              .map(s => {
                const heading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
                return `${heading}\n\n${s.current_content || ''}`;
              })
              .join('\n\n');

            console.log('[DraftingModal] Assembled from', completedSections.length, 'sections:', assembledFromSections?.length, 'chars');
          }
        }

        // Compare content from different sources
        const jobDraftContent = jobData.draft_content || '';
        const jobDraftLength = jobDraftContent.length;
        const sectionsLength = assembledFromSections?.length || 0;
        const currentLength = draftContent.length;

        console.log('[DraftingModal] Content lengths - job.draft_content:', jobDraftLength, 'assembled sections:', sectionsLength, 'current display:', currentLength);

        // Check if job was updated after we loaded the content
        const jobUpdatedAt = new Date(jobData.updated_at).getTime();
        const loadedAt = loadedAtRef.current ? new Date(loadedAtRef.current).getTime() : 0;
        const isJobNewer = jobUpdatedAt > loadedAt;

        console.log('[DraftingModal] Timestamp check - job updated:', jobData.updated_at, 'loaded at:', loadedAtRef.current, 'isJobNewer:', isJobNewer);

        // Determine the best content to offer
        // Sections are complete but raw (Pass 1 only)
        // Job draft_content is optimized (Pass 2-8) but may be incomplete
        // If sections are significantly longer, they have content that's missing from draft_content
        let assembledDraft: string | null = null;
        let sourceType = '';

        if (sectionsLength > currentLength && sectionsLength > jobDraftLength) {
          // Sections have more content than both current display and job draft_content
          // This means some sections are missing from the optimized version
          assembledDraft = assembledFromSections;
          sourceType = 'sections (complete but raw)';
          console.log('[DraftingModal] Using assembled sections - has', (sectionsLength - currentLength), 'more chars than current');
        } else if (jobDraftLength > currentLength) {
          // Job draft_content is longer than current display
          assembledDraft = jobDraftContent;
          sourceType = 'job draft_content (optimized)';
          console.log('[DraftingModal] Using job draft_content - has', (jobDraftLength - currentLength), 'more chars than current');
        } else if (isJobNewer && jobDraftContent && jobDraftContent !== draftContent) {
          // Job was updated AFTER we loaded our content - use job's optimized content
          // This handles the case where passes 2-8 ran and produced similar-length but optimized content
          assembledDraft = jobDraftContent;
          sourceType = 'job draft_content (optimized - newer timestamp)';
          console.log('[DraftingModal] Using job draft_content based on newer timestamp');
        } else if (sectionsLength > currentLength) {
          // Fall back to sections if they're at least longer than current
          assembledDraft = assembledFromSections;
          sourceType = 'sections';
        }

        // Always show job info if job exists (completed OR incomplete)
        const jobStatus = (jobData.status || 'pending') as 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
        const currentPass = jobData.current_pass || 1;
        const isIncomplete = jobStatus === 'paused' || jobStatus === 'in_progress' || jobStatus === 'pending';

        // Count completed passes from passes_status object
        const passesStatus = jobData.passes_status as Record<string, string> || {};
        const passKeys = ['pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_visuals',
                         'pass_5_microsemantics', 'pass_6_discourse', 'pass_7_intro', 'pass_8_audit', 'pass_9_schema'];
        const completedPasses = passKeys.filter(key => passesStatus[key] === 'completed').length;

        // Debug: log the actual passes_status
        console.log('[DraftingModal] passes_status from DB:', JSON.stringify(passesStatus, null, 2));
        console.log('[DraftingModal] Completed passes count:', completedPasses, 'from keys:', passKeys.map(k => `${k}=${passesStatus[k]}`));
        console.log('[DraftingModal] Job status:', jobStatus, 'current_pass:', currentPass);

        // Always show job info when a job exists (so user can see generation status)
        setDatabaseJobInfo({
          updatedAt: jobData.updated_at,
          auditScore: jobData.final_audit_score,
          passesCompleted: completedPasses,
          sectionCount: sectionCount,
          jobStatus,
          currentPass,
          jobId: jobData.id,
          passesStatus: passesStatus, // Store full passes status for detailed display
          contentSource: sourceType, // Track the source for better sync messaging
        });

        // If no newer/longer content found, don't show sync option
        // But if we have content based on newer timestamp, still show it
        if (!assembledDraft) {
          console.log('[DraftingModal] No newer/longer content found, current is already the best version');
          setDatabaseDraft(null);
          return;
        }

        // Compare with current draft - check if significantly different
        const dbLength = assembledDraft.length;
        const lengthDiff = Math.abs(currentLength - dbLength);

        // For determining if we should suggest sync:
        // - If database is LONGER: only suggest if significantly longer (>500 chars)
        //   This avoids false positives when user inserts images (which can make content shorter)
        // - If database is shorter: almost never suggest (user likely added content)
        // - Exception: incomplete jobs should always show status (but not force sync)
        const dbIsSignificantlyLonger = dbLength > currentLength + 500;
        const isSubstantiallyDifferent = dbIsSignificantlyLonger || (isJobNewer && lengthDiff > 500);
        const isDifferent = isSubstantiallyDifferent || assembledDraft !== draftContent;

        // Only set databaseDraft if there's actually better/newer content to sync
        // AND the database content is meaningfully longer (not just format differences from image insertion)
        if ((isDifferent && dbIsSignificantlyLonger) || isIncomplete) {
          setDatabaseDraft(assembledDraft);
          console.log('[DraftingModal] Found newer/different database content:', {
            currentLength,
            dbLength,
            diff: lengthDiff,
            dbIsSignificantlyLonger,
            auditScore: jobData.final_audit_score,
            sectionCount,
            jobStatus,
            currentPass
          });
        } else {
          setDatabaseDraft(null);
          console.log('[DraftingModal] Content is synced or database is not significantly longer - no sync suggested');
        }
      } catch (err) {
        console.error('[DraftingModal] Error checking database for newer content:', err);
      }
    };

    // Check after a short delay to avoid race conditions
    const timeoutId = setTimeout(checkDatabaseForNewerContent, 500);
    return () => clearTimeout(timeoutId);
  }, [isOpen, brief?.id, draftContent, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  // Sync draft from database
  const handleSyncFromDatabase = async () => {
    if (!databaseDraft || !brief || !activeMapId) return;

    console.log('[DraftingModal] Starting sync, databaseDraft length:', databaseDraft.length);
    console.log('[DraftingModal] Current draftContent length:', draftContent.length);
    setIsSyncing(true);
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Store the draft locally before any state changes
      const newDraft = databaseDraft;
      console.log('[DraftingModal] Storing newDraft, length:', newDraft.length);

      // Update content_briefs with the assembled draft
      const { data: updateData, error: updateError } = await supabase
        .from('content_briefs')
        .update({ article_draft: newDraft })
        .eq('id', brief.id)
        .select('id, article_draft');

      if (updateError) {
        console.error('[DraftingModal] Failed to update content_briefs:', updateError);
        dispatch({ type: 'SET_ERROR', payload: `Database error: ${updateError.message}` });
        throw updateError;
      }

      // Verify the update actually happened
      const savedLength = updateData?.[0]?.article_draft?.length || 0;
      console.log('[DraftingModal] Database updated, verified saved length:', savedLength);

      if (savedLength !== newDraft.length) {
        console.warn('[DraftingModal] WARNING: Saved length differs! Expected:', newDraft.length, 'Got:', savedLength);
        dispatch({ type: 'SET_NOTIFICATION', payload: `Warning: Content may have been truncated. Expected ${newDraft.length} chars, saved ${savedLength} chars.` });
      }

      // Clear the database draft indicator FIRST to prevent re-detection
      setDatabaseDraft(null);
      setDatabaseJobInfo(null);
      setShowDiffPreview(false);

      // Update local state with the full content
      setDraftContent(newDraft);
      loadedDraftLengthRef.current = newDraft.length;
      loadedBriefIdRef.current = brief.id; // Mark this brief as loaded with new content
      setHasUnsavedChanges(false);

      // Update app state
      dispatch({
        type: 'UPDATE_BRIEF',
        payload: {
          mapId: activeMapId,
          topicId: brief.topic_id,
          updates: { articleDraft: newDraft }
        }
      });

      console.log('[DraftingModal] Sync complete, new draftContent length:', newDraft.length);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Draft synced! ${newDraft.length.toLocaleString()} characters loaded.` });
    } catch (err) {
      console.error('[DraftingModal] Error syncing from database:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'SET_ERROR', payload: `Failed to sync draft: ${errorMsg}` });
    } finally {
      setIsSyncing(false);
    }
  };

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
            visuals: newBrief.visuals as any,
            contextual_vectors: newBrief.contextualVectors as any,
            contextual_bridge: newBrief.contextualBridge as any,
            // Holistic SEO fields
            perspectives: newBrief.perspectives as any,
            methodology_note: newBrief.methodology_note,
            structured_outline: newBrief.structured_outline as any,
            predicted_user_journey: newBrief.predicted_user_journey,
            // New fields
            query_type_format: newBrief.query_type_format,
            featured_snippet_target: newBrief.featured_snippet_target as any,
            visual_semantics: newBrief.visual_semantics as any,
            discourse_anchors: newBrief.discourse_anchors as any,
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

  // Download complete article package
  const handleDownloadPackage = async () => {
    if (!brief || !draftContent) return;

    const slug = brief.slug || 'article';
    const wordCount = draftContent.split(/\s+/).length;
    // Calculate audit score from framework rules if available
    const frameworkRules = brief.contentAudit?.frameworkRules || [];
    const passingRules = frameworkRules.filter(r => r.isPassing).length;
    const auditScore = databaseJobInfo?.auditScore || (frameworkRules.length > 0 ? Math.round((passingRules / frameworkRules.length) * 100) : null);

    // 1. Create the Article (HTML) - nicely formatted for reading
    const articleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  <title>${brief.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.8; max-width: 750px; margin: 0 auto; padding: 2rem; color: #2d2d2d; background: #fafafa; }
    h1 { font-size: 2.2rem; color: #1a1a1a; margin-top: 0; margin-bottom: 0.5rem; line-height: 1.2; }
    h2 { font-size: 1.5rem; color: #1a1a1a; margin-top: 2.5rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; color: #333; margin-top: 2rem; }
    h4 { font-size: 1.1rem; color: #444; margin-top: 1.5rem; }
    p { margin: 1rem 0; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    figure { margin: 2rem 0; text-align: center; }
    figcaption { font-size: 0.9rem; color: #666; font-style: italic; margin-top: 0.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; font-size: 0.95rem; }
    th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    tr:nth-child(even) { background: #f9f9f9; }
    code { background: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; font-family: 'Consolas', monospace; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #0066cc; margin: 1.5rem 0; padding: 0.5rem 1rem; background: #f9f9f9; font-style: italic; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul, ol { padding-left: 1.5rem; margin: 1rem 0; }
    li { margin: 0.5rem 0; }
    .header-meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e0e0e0; font-family: system-ui, sans-serif; }
    .header-meta strong { color: #333; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 2rem 0; }
  </style>
</head>
<body>
  <article>
    <header>
      <h1>${brief.title}</h1>
      <div class="header-meta">
        <strong>Word Count:</strong> ${wordCount.toLocaleString()} words
        ${auditScore ? ` · <strong>Quality Score:</strong> ${auditScore}/100` : ''}
      </div>
    </header>
    ${convertMarkdownToHtml(draftContent)}
  </article>
</body>
</html>`;

    // 2. Create Content Brief (readable text document)
    const briefDoc = `
═══════════════════════════════════════════════════════════════════════════════
                              CONTENT BRIEF
═══════════════════════════════════════════════════════════════════════════════

TITLE: ${brief.title}
─────────────────────────────────────────────────────────────────────────────────

TARGET KEYWORD: ${brief.targetKeyword || 'Not specified'}
SEARCH INTENT: ${brief.searchIntent || 'Not specified'}
WORD COUNT: ${wordCount.toLocaleString()} words

META DESCRIPTION:
${brief.metaDescription || 'Not specified'}


═══════════════════════════════════════════════════════════════════════════════
                            KEY TAKEAWAYS
═══════════════════════════════════════════════════════════════════════════════

${brief.keyTakeaways?.map((t, i) => `  ${i + 1}. ${t}`).join('\n') || 'None specified'}


═══════════════════════════════════════════════════════════════════════════════
                          CONTENT OUTLINE
═══════════════════════════════════════════════════════════════════════════════

${brief.structured_outline?.map((section, i) => `
${i + 1}. ${section.heading}
   Format: ${section.format_code || 'Standard'}
   ${section.methodology_note ? `Note: ${section.methodology_note}` : ''}
   ${section.related_queries?.length ? `Related Queries: ${section.related_queries.join(', ')}` : ''}
`).join('\n') || brief.outline || 'No outline available'}


═══════════════════════════════════════════════════════════════════════════════
                         FEATURED IMAGE
═══════════════════════════════════════════════════════════════════════════════

Prompt: ${brief.visuals?.featuredImagePrompt || 'Not specified'}
Alt Text: ${brief.visuals?.imageAltText || 'Not specified'}


═══════════════════════════════════════════════════════════════════════════════
                    PEOPLE ALSO ASK (PAA)
═══════════════════════════════════════════════════════════════════════════════

${brief.serpAnalysis?.peopleAlsoAsk?.map((q, i) => `  ${i + 1}. ${q}`).join('\n') || 'No PAA questions available'}


Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
`.trim();

    // 3. Create Internal Links Document
    const linksArray = Array.isArray(brief.contextualBridge)
      ? brief.contextualBridge
      : (brief.contextualBridge as any)?.links || [];

    const linksDoc = `
═══════════════════════════════════════════════════════════════════════════════
                        INTERNAL LINKING PLAN
═══════════════════════════════════════════════════════════════════════════════

Article: ${brief.title}
Total Internal Links: ${linksArray.length}

─────────────────────────────────────────────────────────────────────────────────

${linksArray.length > 0 ? linksArray.map((link: any, i: number) => `
LINK ${i + 1}
────────
Anchor Text: "${link.anchorText}"
Target URL: ${link.targetUrl || link.targetTopicId || 'To be determined'}
Context: ${link.context || 'Not specified'}
Placement: ${link.suggestedPlacement || 'Natural placement in content'}
`).join('\n') : 'No internal links planned for this article.'}


═══════════════════════════════════════════════════════════════════════════════
                          SEO FACTS (EAVs)
═══════════════════════════════════════════════════════════════════════════════

Key facts and data points to include in the content:

${brief.contextualVectors?.slice(0, 15).map((eav: any, i: number) =>
  `  ${i + 1}. ${eav.subject?.label || 'Entity'} → ${eav.predicate?.relation || 'has'} → ${eav.object?.value || 'value'}`
).join('\n') || 'No EAV data available'}


Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
`.trim();

    // 4. Create Quality Report
    const qualityDoc = `
═══════════════════════════════════════════════════════════════════════════════
                         CONTENT QUALITY REPORT
═══════════════════════════════════════════════════════════════════════════════

Article: ${brief.title}
Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

─────────────────────────────────────────────────────────────────────────────────
                            OVERVIEW
─────────────────────────────────────────────────────────────────────────────────

Overall Quality Score: ${auditScore ? `${auditScore}/100` : 'Not audited yet'}
Word Count: ${wordCount.toLocaleString()}
Character Count: ${draftContent.length.toLocaleString()}
Optimization Passes Completed: ${databaseJobInfo?.passesCompleted || 'Unknown'}

─────────────────────────────────────────────────────────────────────────────────
                         AUDIT CHECKS
─────────────────────────────────────────────────────────────────────────────────

${brief.contentAudit?.frameworkRules?.map((rule) => `
${rule.isPassing ? '✓' : '✗'} ${rule.ruleName}
  ${rule.details}
  ${rule.remediation ? `Suggestion: ${rule.remediation}` : ''}
`).join('\n') || 'No detailed audit available. Run the audit to see specific checks.'}

EAV Coverage: ${brief.contentAudit?.eavCheck?.details || 'Not checked'}
Link Coverage: ${brief.contentAudit?.linkCheck?.details || 'Not checked'}
Linguistic Score: ${brief.contentAudit?.linguisticModality?.score || 'N/A'}/100

─────────────────────────────────────────────────────────────────────────────────
                           IMAGES
─────────────────────────────────────────────────────────────────────────────────

Total Images: ${imagePlaceholders.length}

${imagePlaceholders.map((img, i) => `
Image ${i + 1}: ${img.type}
  Description: ${img.description}
  Alt Text: ${img.altTextSuggestion}
  Status: ${img.status}
  ${img.generatedUrl || img.userUploadUrl ? `URL: ${img.generatedUrl || img.userUploadUrl}` : 'Not yet generated'}
`).join('\n') || 'No images in this article.'}

═══════════════════════════════════════════════════════════════════════════════
`.trim();

    // Download all documents
    downloadFile(new Blob([articleHtml], { type: 'text/html' }), `${slug}-article.html`);
    setTimeout(() => downloadFile(new Blob([draftContent], { type: 'text/markdown' }), `${slug}-article.md`), 100);
    setTimeout(() => downloadFile(new Blob([briefDoc], { type: 'text/plain' }), `${slug}-content-brief.txt`), 200);
    setTimeout(() => downloadFile(new Blob([linksDoc], { type: 'text/plain' }), `${slug}-internal-links.txt`), 300);
    setTimeout(() => downloadFile(new Blob([qualityDoc], { type: 'text/plain' }), `${slug}-quality-report.txt`), 400);

    // Download images
    let imageCount = 0;
    for (const placeholder of imagePlaceholders) {
      const imageUrl = placeholder.generatedUrl || placeholder.userUploadUrl;
      if (imageUrl && !imageUrl.startsWith('blob:')) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const ext = blob.type.split('/')[1] || 'png';
          const safeName = placeholder.description.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
          setTimeout(() => {
            downloadFile(blob, `${slug}-image-${imageCount + 1}-${safeName}.${ext}`);
          }, 500 + (imageCount * 200));
          imageCount++;
        } catch (err) {
          console.warn('Could not download image:', imageUrl, err);
        }
      }
    }

    const totalFiles = 5 + imageCount;
    dispatch({ type: 'SET_NOTIFICATION', payload: `Article package downloaded! (${totalFiles} files: Article, Brief, Links, Quality Report${imageCount > 0 ? `, ${imageCount} images` : ''})` });
  };

  // Helper to download a blob as a file
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Simple markdown to HTML converter for export
  const convertMarkdownToHtml = (md: string): string => {
    let html = md
      // Headers
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Paragraphs (lines with content that aren't already tags)
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<')) return line;
        return `<p>${line}</p>`;
      })
      .join('\n');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul>$&</ul>');

    return html;
  };

  // Open image generation modal with the first placeholder
  const handleOpenImageGeneration = () => {
    if (imagePlaceholders.length > 0) {
      setSelectedPlaceholder(imagePlaceholders[0]);
      setShowImageModal(true);
    } else {
      dispatch({ type: 'SET_ERROR', payload: 'No image placeholders found in the draft. Image placeholders are added during content generation.' });
    }
  };

  // Handle image insertion from the modal (modal handles generation internally)
  const handleImageInsert = (generatedPlaceholder: ImagePlaceholder) => {
    if (!selectedPlaceholder) return;

    // Check for error status
    if (generatedPlaceholder.status === 'error') {
      dispatch({ type: 'SET_ERROR', payload: generatedPlaceholder.errorMessage || 'Image generation failed' });
      return;
    }

    const imageUrl = generatedPlaceholder.generatedUrl || generatedPlaceholder.userUploadUrl;
    const altText = generatedPlaceholder.metadata?.altText || selectedPlaceholder.altTextSuggestion;

    // Replace the placeholder in the draft with the generated image markdown
    if (imageUrl) {
      const imageMarkdown = `![${altText}](${imageUrl})`;
      // Find the placeholder pattern in the draft and replace it
      const placeholderPattern = new RegExp(
        `\\[IMAGE:\\s*${selectedPlaceholder.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\]]*\\]`,
        'i'
      );
      const newDraft = draftContent.replace(placeholderPattern, imageMarkdown);
      setDraftContent(newDraft);
      setHasUnsavedChanges(true);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Image generated and inserted successfully!` });
    }
  };

  // Handle re-running optimization passes
  const handleRerunPasses = async () => {
    if (!brief || !databaseJobInfo || selectedPasses.length === 0) return;

    setIsRerunning(true);
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Get the job
      const { data: job, error: jobError } = await supabase
        .from('content_generation_jobs')
        .select('*')
        .eq('id', databaseJobInfo.jobId)
        .single();

      if (jobError || !job) throw new Error('Failed to get job');

      // Determine the lowest pass number to re-run from
      const lowestPass = Math.min(...selectedPasses);

      // Update job to re-run from that pass
      // Reset passes_status for selected passes and all passes after them
      const existingStatus = (job.passes_status && typeof job.passes_status === 'object')
        ? job.passes_status as Record<string, string>
        : {};
      const newPassesStatus: Record<string, string> = { ...existingStatus };
      for (let i = lowestPass; i <= 9; i++) {
        const passKey = `pass_${i}_${['draft', 'headers', 'lists', 'visuals', 'microsemantics', 'discourse', 'intro', 'audit', 'schema'][i - 1]}`;
        if (selectedPasses.includes(i) || i > lowestPass) {
          newPassesStatus[passKey] = 'pending';
        }
      }

      // CRITICAL: Get the BEST available content for re-running
      // Check: editor content, job.draft_content, AND assembled sections
      const jobDraftContent = job.draft_content || '';

      // Fetch and assemble sections to ensure we have the FULL content
      const { data: sections } = await supabase
        .from('content_generation_sections')
        .select('section_key, section_heading, section_level, section_order, current_content, status')
        .eq('job_id', databaseJobInfo.jobId)
        .eq('status', 'completed')
        .order('section_order', { ascending: true });

      let assembledSections = '';
      if (sections && sections.length > 0) {
        assembledSections = sections
          .map(s => {
            const heading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
            return `${heading}\n\n${s.current_content || ''}`;
          })
          .join('\n\n');
      }

      // Use the LONGEST content available
      const contentOptions = [
        { source: 'editor', content: draftContent, length: draftContent.length },
        { source: 'job.draft_content', content: jobDraftContent, length: jobDraftContent.length },
        { source: 'assembled_sections', content: assembledSections, length: assembledSections.length }
      ];
      const best = contentOptions.reduce((a, b) => a.length >= b.length ? a : b);
      const startingContent = best.content;

      console.log('[DraftingModal] Re-run content selection:', contentOptions.map(c => `${c.source}: ${c.length} chars`).join(', '));
      console.log('[DraftingModal] Using:', best.source, 'with', best.length, 'chars');

      if (startingContent.length !== draftContent.length) {
        console.log('[DraftingModal] Re-run using job.draft_content (' + jobDraftContent.length + ' chars) instead of editor (' + draftContent.length + ' chars)');
      }

      // Update the job with best available draft content and reset to re-run
      const { error: updateError } = await supabase
        .from('content_generation_jobs')
        .update({
          draft_content: startingContent, // Use longer content as starting point
          current_pass: lowestPass,
          status: 'pending',
          passes_status: newPassesStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', databaseJobInfo.jobId);

      if (updateError) throw new Error(`Failed to update job: ${updateError.message}`);

      // Trigger job refresh in ContentBriefModal's useContentGeneration hook
      // This will cause it to detect the pending job and auto-resume
      dispatch({ type: 'TRIGGER_JOB_REFRESH' });

      dispatch({ type: 'SET_NOTIFICATION', payload: `Re-running passes ${selectedPasses.join(', ')}. Generation will start automatically.` });
      setShowPassesModal(false);
      setSelectedPasses([]);
      onClose(); // Close drafting modal - ContentBriefModal will auto-resume the pending job

    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to configure re-run' });
    } finally {
      setIsRerunning(false);
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
                 <button
                    onClick={() => setActiveTab('images')}
                    className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                      activeTab === 'images'
                        ? 'bg-amber-600 text-white font-medium'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                 >
                    Images
                    {imagePlaceholders.length > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === 'images' ? 'bg-amber-700' : 'bg-gray-600'
                      }`}>
                        {imagePlaceholders.filter(p => p.status === 'placeholder').length}/{imagePlaceholders.length}
                      </span>
                    )}
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
                {/* Job Status Info - Always show when a job exists */}
                {databaseJobInfo && !databaseDraft && databaseJobInfo.jobStatus === 'completed' && (
                    <div className="bg-gray-800/60 border-b border-gray-700 px-3 py-2 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="text-green-400">✓</span>
                                <span>Multi-pass generation complete</span>
                                <span className="text-gray-600">•</span>
                                <span>{databaseJobInfo.sectionCount} sections</span>
                                <span className="text-gray-600">•</span>
                                <span>{databaseJobInfo.passesCompleted}/9 passes</span>
                                {databaseJobInfo.auditScore && (
                                    <>
                                        <span className="text-gray-600">•</span>
                                        <span>Audit: {databaseJobInfo.auditScore}%</span>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {[
                                    { key: 'pass_1_draft', label: 'D' },
                                    { key: 'pass_2_headers', label: 'H' },
                                    { key: 'pass_3_lists', label: 'L' },
                                    { key: 'pass_4_visuals', label: 'V' },
                                    { key: 'pass_5_microsemantics', label: 'M' },
                                    { key: 'pass_6_discourse', label: 'C' },
                                    { key: 'pass_7_intro', label: 'I' },
                                    { key: 'pass_8_audit', label: 'A' },
                                    { key: 'pass_9_schema', label: 'S' },
                                ].map(({ key, label }) => {
                                    const status = databaseJobInfo.passesStatus?.[key];
                                    const isComplete = status === 'completed';
                                    return (
                                        <span
                                            key={key}
                                            className={`text-[9px] w-4 h-4 flex items-center justify-center rounded ${
                                                isComplete ? 'bg-green-900/40 text-green-400' : 'bg-gray-700/40 text-gray-500'
                                            }`}
                                            title={`${key.replace(/_/g, ' ')}: ${status || 'pending'}`}
                                        >
                                            {label}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Database Sync Banner - show for completed jobs with different content OR incomplete jobs */}
                {databaseJobInfo && (databaseDraft || databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending') && (
                    <div className={`${
                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                            ? 'bg-amber-900/40 border-amber-600/50'
                            : 'bg-blue-900/40 border-blue-600/50'
                    } border-b p-3 flex-shrink-0`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                        ? 'bg-amber-600/30'
                                        : 'bg-blue-600/30'
                                }`}>
                                    {databaseJobInfo.jobStatus === 'paused' ? (
                                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? (
                                        <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${
                                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                            ? 'text-amber-200'
                                            : 'text-blue-200'
                                    }`}>
                                        {databaseJobInfo.jobStatus === 'paused' ? (
                                            <>Generation paused at Pass {databaseJobInfo.currentPass} - can be resumed</>
                                        ) : databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? (
                                            <>Generation in progress at Pass {databaseJobInfo.currentPass}</>
                                        ) : databaseJobInfo.contentSource?.includes('optimized') ? (
                                            <>Optimized content available - includes tables, lists, improved structure</>
                                        ) : (
                                            <>Newer draft available from multi-pass generation</>
                                        )}
                                    </p>
                                    <p className={`text-xs ${
                                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                            ? 'text-amber-300/70'
                                            : 'text-blue-300/70'
                                    }`}>
                                        {databaseJobInfo.sectionCount} sections • {databaseJobInfo.passesCompleted}/9 passes completed
                                        {databaseJobInfo.auditScore && ` • Audit score: ${databaseJobInfo.auditScore}%`}
                                        {databaseDraft && (
                                            <>
                                                {' • '}
                                                {databaseDraft.length.toLocaleString()} chars
                                                {draftContent && ` (${databaseDraft.length > draftContent.length ? '+' : ''}${(databaseDraft.length - draftContent.length).toLocaleString()} diff)`}
                                            </>
                                        )}
                                    </p>
                                    {/* Pass-by-pass status */}
                                    {databaseJobInfo.passesStatus && Object.keys(databaseJobInfo.passesStatus).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {[
                                                { key: 'pass_1_draft', label: 'Draft' },
                                                { key: 'pass_2_headers', label: 'Headers' },
                                                { key: 'pass_3_lists', label: 'Lists' },
                                                { key: 'pass_4_visuals', label: 'Visuals' },
                                                { key: 'pass_5_microsemantics', label: 'Micro' },
                                                { key: 'pass_6_discourse', label: 'Discourse' },
                                                { key: 'pass_7_intro', label: 'Intro' },
                                                { key: 'pass_8_audit', label: 'Audit' },
                                                { key: 'pass_9_schema', label: 'Schema' },
                                            ].map(({ key, label }) => {
                                                const status = databaseJobInfo.passesStatus[key];
                                                const isComplete = status === 'completed';
                                                const isInProgress = status === 'in_progress';
                                                const isPending = status === 'pending' || !status;
                                                return (
                                                    <span
                                                        key={key}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                            isComplete ? 'bg-green-900/50 text-green-300 border border-green-700/50' :
                                                            isInProgress ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50 animate-pulse' :
                                                            'bg-gray-800/50 text-gray-500 border border-gray-700/50'
                                                        }`}
                                                        title={`${label}: ${status || 'pending'}`}
                                                    >
                                                        {isComplete ? '✓' : isInProgress ? '⋯' : '○'} {label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {databaseDraft && (
                                    <button
                                        onClick={() => setShowDiffPreview(!showDiffPreview)}
                                        className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                            databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                                ? 'border-amber-600/50 text-amber-300 hover:bg-amber-800/30'
                                                : 'border-blue-600/50 text-blue-300 hover:bg-blue-800/30'
                                        }`}
                                    >
                                        {showDiffPreview ? 'Hide Preview' : 'Compare'}
                                    </button>
                                )}
                                {databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'pending' ? (
                                    <button
                                        onClick={() => {
                                            // Clear the banner and let ContentBriefModal handle resume
                                            setDatabaseDraft(null);
                                            setDatabaseJobInfo(null);
                                            onClose();
                                            // The ContentBriefModal's "Generate Draft" will detect and resume the paused job
                                        }}
                                        className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
                                    >
                                        Resume in Brief Modal
                                    </button>
                                ) : databaseJobInfo.jobStatus === 'in_progress' ? (
                                    <span className="text-xs px-3 py-1.5 rounded bg-amber-600/50 text-amber-200">
                                        Generation Active
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleSyncFromDatabase}
                                        disabled={isSyncing}
                                        className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isSyncing ? 'Syncing...' : databaseJobInfo.contentSource?.includes('optimized') ? 'Load Optimized Version' : 'Use Newer Draft'}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setDatabaseDraft(null); setDatabaseJobInfo(null); }}
                                    className={`text-xs px-2 py-1.5 transition-colors ${
                                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                            ? 'text-amber-400 hover:text-amber-200'
                                            : 'text-blue-400 hover:text-blue-200'
                                    }`}
                                    title="Dismiss"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        {/* Diff Preview Panel */}
                        {showDiffPreview && databaseDraft && (
                            <div className="mt-3 grid grid-cols-2 gap-4 max-h-[50vh] overflow-hidden">
                                <div className="bg-gray-900/50 rounded p-3 overflow-y-auto flex flex-col">
                                    <p className="text-xs font-semibold text-gray-400 mb-2 sticky top-0 bg-gray-900/90 py-1">
                                        Current Editor ({draftContent.length.toLocaleString()} chars)
                                        {databaseDraft.length > draftContent.length && (
                                            <span className="ml-2 text-amber-400">({(databaseDraft.length - draftContent.length).toLocaleString()} chars shorter)</span>
                                        )}
                                    </p>
                                    <div className="text-xs text-gray-300 whitespace-pre-wrap font-mono flex-grow">
                                        {draftContent}
                                    </div>
                                </div>
                                <div className="bg-blue-900/30 rounded p-3 overflow-y-auto flex flex-col">
                                    <p className="text-xs font-semibold text-blue-300 mb-2 sticky top-0 bg-blue-900/90 py-1">
                                        Optimized Version ({databaseDraft.length.toLocaleString()} chars)
                                        {databaseDraft.length > draftContent.length && (
                                            <span className="ml-2 text-green-400">(+{(databaseDraft.length - draftContent.length).toLocaleString()} chars)</span>
                                        )}
                                    </p>
                                    <div className="text-xs text-blue-200 whitespace-pre-wrap font-mono flex-grow">
                                        {databaseDraft}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isLoadingDraft ? (
                    <div className="flex-1 flex items-center justify-center bg-gray-900">
                        <div className="text-center">
                            <Loader className="w-8 h-8 mx-auto mb-4 text-blue-500" />
                            <p className="text-gray-400">Loading draft from database...</p>
                        </div>
                    </div>
                ) : activeTab === 'edit' ? (
                    <Textarea
                        value={draftContent}
                        onChange={handleContentChange}
                        className="w-full h-full font-mono text-sm text-gray-300 bg-gray-900 border-none focus:ring-0 resize-none p-6 leading-relaxed overflow-y-auto"
                        placeholder="Start writing your article draft here..."
                        disabled={isPolishing}
                    />
                ) : activeTab === 'preview' ? (
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
                ) : activeTab === 'images' ? (
                    <ImageManagementPanel
                      placeholders={imagePlaceholders}
                      businessInfo={businessInfo}
                      draftContent={draftContent}
                      onUpdateDraft={(newDraft) => {
                        setDraftContent(newDraft);
                        setHasUnsavedChanges(true);
                      }}
                    />
                ) : null}
            </div>

            {/* Right Sidebar (Requirements Rail) */}
            {showRail && activeTab === 'edit' && (
                 <RequirementsRail brief={brief} draftContent={draftContent} mapEavs={activeMap?.eavs} />
            )}

        </div>

        <footer className="p-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-center">
                {/* Left: Stats and Resources */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                        {draftContent.length.toLocaleString()} chars
                    </span>
                    <Button
                        onClick={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicResources', visible: true } })}
                        variant="secondary"
                        className="text-xs py-0.5 px-2 !bg-transparent !text-gray-400 hover:!text-white"
                        title="View all generated resources"
                    >
                        📦
                    </Button>
                    <Button
                        onClick={handleDownloadPackage}
                        disabled={!draftContent}
                        variant="secondary"
                        className="text-xs py-0.5 px-2 !bg-transparent !text-gray-400 hover:!text-white"
                        title="Download article package (Markdown, HTML, JSON with brief data, links, and audit)"
                    >
                        ⬇ Export
                    </Button>
                </div>

                {/* Center: Main Actions */}
                <div className="flex items-center gap-1">
                    <Button
                        onClick={handlePolishDraft}
                        disabled={isPolishing || !draftContent || activeTab === 'preview'}
                        className="text-xs py-1 px-3 bg-purple-600 hover:bg-purple-700"
                        title="AI polish and finalize"
                    >
                        {isPolishing ? <Loader className="w-3 h-3"/> : 'Polish'}
                    </Button>
                    <Button
                        onClick={() => onAnalyzeFlow(draftContent)}
                        variant="secondary"
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        className="text-xs py-1 px-2"
                        title="Flow audit"
                    >
                        Flow
                    </Button>
                    <Button
                        onClick={() => onAudit(brief, draftContent)}
                        variant="secondary"
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        className="text-xs py-1 px-2"
                        title="Content audit"
                    >
                        Audit
                    </Button>
                    <Button
                        onClick={() => onGenerateSchema(brief)}
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        variant="secondary"
                        className="text-xs py-1 px-2"
                        title="Generate schema"
                    >
                        Schema
                    </Button>
                    <Button
                        onClick={() => setActiveTab('images')}
                        disabled={isLoading || !draftContent || isPolishing}
                        variant="secondary"
                        className={`text-xs py-1 px-2 ${activeTab === 'images' ? 'bg-amber-600' : 'bg-amber-700 hover:bg-amber-600'}`}
                        title={imagePlaceholders.length > 0 ? `Manage ${imagePlaceholders.length} image(s)` : 'No image placeholders found'}
                    >
                        Images {imagePlaceholders.length > 0 && `(${imagePlaceholders.length})`}
                    </Button>
                    {databaseJobInfo && (
                        <Button
                            onClick={() => setShowPassesModal(true)}
                            disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                            variant="secondary"
                            className="text-xs py-1 px-2 bg-teal-700 hover:bg-teal-600"
                            title="Re-run specific optimization passes"
                        >
                            Re-run Passes
                        </Button>
                    )}
                    {reportHook.canGenerate && (
                        <ReportExportButton
                            reportType="article-draft"
                            onClick={reportHook.open}
                            variant="secondary"
                            size="sm"
                            className="text-xs py-1 px-2 bg-indigo-700 hover:bg-indigo-600"
                        />
                    )}
                </div>

                {/* Right: Close */}
                <Button onClick={handleCloseModal} variant="secondary" className="text-xs py-1 px-2 !bg-transparent !text-gray-400 hover:!text-white">
                    Close
                </Button>
            </div>
        </footer>
      </Card>

      {/* Image Generation Modal */}
      {selectedPlaceholder && (
        <ImageGenerationModal
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false);
            setSelectedPlaceholder(null);
          }}
          placeholder={selectedPlaceholder}
          brandKit={businessInfo.brandKit}
          businessInfo={businessInfo}
          onInsert={handleImageInsert}
        />
      )}

      {/* Re-run Passes Modal */}
      {showPassesModal && databaseJobInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setShowPassesModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">Re-run Optimization Passes</h2>
            <p className="text-sm text-gray-400 mb-4">
              Select which passes to re-run. All selected passes and any passes after the lowest selected will be re-processed.
            </p>

            <div className="space-y-2 mb-6">
              {[
                { num: 2, key: 'pass_2_headers', label: 'Pass 2: Header Optimization', desc: 'Optimize heading hierarchy and contextual overlap' },
                { num: 3, key: 'pass_3_lists', label: 'Pass 3: Lists & Tables', desc: 'Convert content to structured data for Featured Snippets' },
                { num: 4, key: 'pass_4_visuals', label: 'Pass 4: Visual Semantics', desc: 'Add image placeholders with vocabulary-extending alt text' },
                { num: 5, key: 'pass_5_microsemantics', label: 'Pass 5: Micro Semantics', desc: 'Linguistic optimization (modality, stop words, positioning)' },
                { num: 6, key: 'pass_6_discourse', label: 'Pass 6: Discourse Integration', desc: 'Improve transitions and contextual bridges' },
                { num: 7, key: 'pass_7_intro', label: 'Pass 7: Introduction Synthesis', desc: 'Rewrite introduction based on complete content' },
                { num: 8, key: 'pass_8_audit', label: 'Pass 8: Final Audit', desc: 'Algorithmic content audit with scoring' },
                { num: 9, key: 'pass_9_schema', label: 'Pass 9: Schema Generation', desc: 'JSON-LD structured data with entity resolution' },
              ].map(({ num, key, label, desc }) => {
                const status = databaseJobInfo.passesStatus?.[key] || 'pending';
                const isSelected = selectedPasses.includes(num);
                return (
                  <label
                    key={num}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-900/40 border border-teal-600' : 'bg-gray-700/40 border border-gray-600 hover:bg-gray-700/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPasses([...selectedPasses, num].sort((a, b) => a - b));
                        } else {
                          setSelectedPasses(selectedPasses.filter(p => p !== num));
                        }
                      }}
                      className="mt-1 w-4 h-4 rounded border-gray-500 text-teal-600 focus:ring-teal-500 bg-gray-700"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? 'text-teal-200' : 'text-gray-200'}`}>
                          {label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          status === 'completed' ? 'bg-green-900/50 text-green-300' :
                          status === 'in_progress' ? 'bg-amber-900/50 text-amber-300' :
                          'bg-gray-800/50 text-gray-500'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedPasses.length > 0 && (
              <div className="mb-4 p-3 bg-teal-900/30 border border-teal-700 rounded text-sm text-teal-200">
                Will re-run: Pass {Math.min(...selectedPasses)} through Pass 9
                <br />
                <span className="text-xs text-teal-300/70">
                  Current editor content will be used as the starting point.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowPassesModal(false); setSelectedPasses([]); }}>
                Cancel
              </Button>
              <Button
                onClick={handleRerunPasses}
                disabled={selectedPasses.length === 0 || isRerunning}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isRerunning ? <Loader className="w-4 h-4" /> : `Re-run ${selectedPasses.length} Pass${selectedPasses.length !== 1 ? 'es' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportHook.data && (
        <ReportModal
          isOpen={reportHook.isOpen}
          onClose={reportHook.close}
          reportType="article-draft"
          data={reportHook.data}
          projectName={activeMap?.name || businessInfo?.projectName}
        />
      )}
    </div>
  );
};

export default DraftingModal;
