
// components/DraftingModal.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ContentBrief, BusinessInfo, EnrichedTopic, FreshnessProfile, ImagePlaceholder, StreamingProgress } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAppState } from '../../state/appState';
import { Loader } from '../ui/Loader';
import { safeString } from '../../utils/parsers';
import { Textarea } from '../ui/Textarea';
import { getSupabaseClient } from '../../services/supabaseClient';
import { verifiedInsert, verifiedDelete } from '../../services/verifiedDatabaseService';
import type { Json } from '../../database.types';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';
import * as aiService from '../../services/aiService';
import { AIModelSelector } from '../ui/AIModelSelector';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../utils/helpers';
import { RequirementsRail } from '../drafting/RequirementsRail';
import { extractPlaceholdersFromDraft } from '../../services/ai/imageGeneration/placeholderParser';
import { ImageGenerationModal } from '../imageGeneration/ImageGenerationModal';
import { ImageManagementPanel } from '../imageGeneration/ImageManagementPanel';
import { ReportExportButton, ReportModal } from '../reports';
import { useArticleDraftReport } from '../../hooks/useReportGeneration';
import { ContentGenerationJob } from '../../types';
import JSZip from 'jszip';
import { PublishToWordPressModal } from '../wordpress';
import { AuditIssuesPanel } from '../drafting/AuditIssuesPanel';
import { AuditIssue } from '../../types';
import { runAlgorithmicAudit, convertToAuditIssues } from '../../services/ai/contentGeneration/passes/auditChecks';
import {
  convertMarkdownToBasicHtml,
  convertMarkdownToSemanticHtml,
  extractCenterpiece,
  buildFullHtmlDocument,
  validateForExport,
  cleanForExport,
} from '../../services/contentAssemblyService';
import { useFeatureGate } from '../../hooks/usePermissions';
import { QualityRulePanel, ArticleQualityReport } from '../quality';
import { PassDiffViewer } from '../drafting/PassDiffViewer';
import type { StructuralSnapshot } from '../../services/ai/contentGeneration/structuralValidator';
import { ContentAnalysisPanel } from '../analysis/ContentAnalysisPanel';
import { exportDebugData, formatForClaudeAnalysis, getPassSnapshots, clearDebugData } from '../../services/contentGenerationDebugger';

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

  // Feature gate for content generation (covers polish, audit, schema)
  const { enabled: canGenerateContent, reason: featureReason } = useFeatureGate('content_generation');

  // Read brief from state for UI display
  const { activeBriefTopic, topicalMaps, activeMapId } = state;
  const activeMap = topicalMaps.find(m => m.id === activeMapId);
  const briefFromState = activeBriefTopic ? activeMap?.briefs?.[activeBriefTopic.id] : null;
  const brief = briefFromState || briefProp;

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'images' | 'quality' | 'debug'>('edit');
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRail, setShowRail] = useState(true); // Toggle for Requirements Rail
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Version history state
  const [draftHistory, setDraftHistory] = useState<Array<{
    version: number;
    content: string;
    saved_at: string;
    char_count: number;
  }>>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // CRITICAL: Ref to always have the latest draftContent for save operations
  // This fixes the stale closure bug where save after polish used old content
  const draftContentRef = useRef(draftContent);
  useEffect(() => {
    draftContentRef.current = draftContent;
  }, [draftContent]);

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
    schemaData?: any; // JSON-LD schema data from Pass 9
    structuralSnapshots?: Record<string, StructuralSnapshot>; // Element counts per pass
    passQualityScores?: Record<string, number>; // Quality scores per pass
    qualityWarning?: string | null; // Warning for quality regressions
    auditDetails?: { algorithmicResults?: Array<{ ruleName: string; isPassing: boolean; details: string }> }; // Audit results from Pass 9
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDiffPreview, setShowDiffPreview] = useState(false);

  // Dynamic Model Selection State
  const [overrideSettings, setOverrideSettings] = useState<{ provider: string, model: string } | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Image Generation State
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<ImagePlaceholder | null>(null);
  const [openInVisualEditor, setOpenInVisualEditor] = useState(false);

  // Re-run Passes State
  const [showPassesModal, setShowPassesModal] = useState(false);
  const [selectedPasses, setSelectedPasses] = useState<number[]>([]);
  const [isRerunning, setIsRerunning] = useState(false);

  // WordPress Publish State
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Audit Panel State
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

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
      schema_data: databaseJobInfo.schemaData || null,
      schema_validation_results: null,
      schema_entities: null,
      schema_page_type: null,
      progressive_schema_data: null
    };
  }, [databaseJobInfo, brief, draftContent, activeMapId, state.user?.id]);

  // Report generation hook
  const reportHook = useArticleDraftReport(minimalJob, brief);

  // Parse image placeholders from draft content
  // Pass brief title to pre-fill HERO image text overlay
  const imagePlaceholders = useMemo(() => {
    if (!draftContent) return [];
    return extractPlaceholdersFromDraft(draftContent, { heroTitle: brief?.title });
  }, [draftContent, brief?.title]);

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

      // CRITICAL: If brief changed, reset state immediately BEFORE any other checks
      // This prevents showing stale content from a previous brief
      if (loadedBriefIdRef.current !== null && loadedBriefIdRef.current !== brief.id) {
        console.log('[DraftingModal] Brief changed from', loadedBriefIdRef.current, 'to', brief.id, '- resetting state');
        setDraftContent('');
        setHasUnsavedChanges(false);
        loadedBriefIdRef.current = null;
        loadedDraftLengthRef.current = 0;
        // Continue to fetch the new brief's content
      }

      // Check if we have a draft in state/prop
      const existingDraft = safeString(brief.articleDraft);

      // Detect regeneration: same brief ID but different draft length
      const isDraftRegenerated = loadedBriefIdRef.current === brief.id &&
                                  existingDraft &&
                                  existingDraft.length !== loadedDraftLengthRef.current;

      console.log('[DraftingModal] Fetch check - briefId:', brief.id, 'loadedRef:', loadedBriefIdRef.current, 'existingDraft:', existingDraft?.length || 0);

      // Don't re-fetch if we already loaded this brief AND have content AND draft hasn't changed
      if (loadedBriefIdRef.current === brief.id && existingDraft && !isDraftRegenerated) {
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
      // BUT still fetch history from DB (history is not in state)
      if (existingDraft) {
        console.log('[DraftingModal] Using existing draft from state:', existingDraft.length, 'chars');
        setDraftContent(existingDraft);
        loadedBriefIdRef.current = brief.id;
        loadedDraftLengthRef.current = existingDraft.length;
        loadedAtRef.current = new Date().toISOString();

        // CRITICAL: Still fetch version history from DB even when using state draft
        // History is stored in DB only, not in React state
        try {
          const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
          const { data: historyData } = await supabase
            .from('content_briefs')
            .select('draft_history')
            .eq('id', brief.id)
            .single();

          if (historyData?.draft_history && Array.isArray(historyData.draft_history)) {
            setDraftHistory(historyData.draft_history as typeof draftHistory);
            console.log('[DraftingModal] Loaded version history:', historyData.draft_history.length, 'versions');
          }
        } catch (err) {
          console.warn('[DraftingModal] Failed to load version history:', err);
        }

        return;
      }

      // No draft in state - fetch from database (handles race condition)
      console.log('[DraftingModal] No draft in state, fetching from database for brief:', brief.id);
      setIsLoadingDraft(true);

      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // First try content_briefs table (primary storage) - also fetch version history
        const { data: briefData, error: briefError } = await supabase
          .from('content_briefs')
          .select('article_draft, draft_history')
          .eq('id', brief.id)
          .single();

        if (!briefError && briefData?.article_draft) {
          console.log('[DraftingModal] Loaded draft from content_briefs:', briefData.article_draft.length, 'chars');
          setDraftContent(briefData.article_draft);
          loadedBriefIdRef.current = brief.id;
          loadedDraftLengthRef.current = briefData.article_draft.length;
          loadedAtRef.current = new Date().toISOString();

          // Load version history if available
          if (briefData.draft_history && Array.isArray(briefData.draft_history)) {
            setDraftHistory(briefData.draft_history as typeof draftHistory);
            console.log('[DraftingModal] Loaded version history:', briefData.draft_history.length, 'versions');
          }

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

      // CRITICAL: Skip database sync check when user has unsaved local changes
      // This prevents the "Load Optimized Version" banner from appearing after Polish
      // which would confuse users and potentially revert their polished content
      if (hasUnsavedChanges) {
        console.log('[DraftingModal] Skipping database sync check - user has unsaved changes');
        return;
      }

      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // Get the latest job for this brief (any status - to detect incomplete jobs that can be resumed)
        const { data: jobData, error: jobError } = await supabase
          .from('content_generation_jobs')
          .select('id, draft_content, updated_at, final_audit_score, passes_status, status, current_pass, schema_data, structural_snapshots, pass_quality_scores, quality_warning, audit_details')
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
                const content = (s.current_content || '').trim();
                const expectedHeading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
                // Check if content already starts with a markdown heading (## or ###)
                // This prevents duplicate headers when passes add headings to content
                const headingPattern = /^#{2,3}\s+/;
                if (headingPattern.test(content)) {
                  return content;
                }
                return `${expectedHeading}\n\n${content}`;
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
        // CORRECT 10-PASS KEY ORDER (matches pass implementations):
        // Pass 4 is Discourse, Pass 6 is Visuals, Pass 8 is Polish, Pass 9 is Audit
        const passKeys = ['pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_discourse',
                         'pass_5_microsemantics', 'pass_6_visuals', 'pass_7_intro', 'pass_8_polish', 'pass_9_audit', 'pass_10_schema'];
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
          schemaData: jobData.schema_data, // JSON-LD schema from Pass 9
          structuralSnapshots: (jobData as any).structural_snapshots || {}, // Element counts per pass
          passQualityScores: (jobData as any).pass_quality_scores || {}, // Quality scores per pass
          qualityWarning: (jobData as any).quality_warning || null, // Quality regression warning
          auditDetails: (jobData as any).audit_details || undefined, // Audit results from Pass 9
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
        // - If database is shorter: NEVER suggest (user likely polished/improved content)
        // - If LOCAL is shorter: NEVER suggest - user has polished/consolidated the draft
        // - Exception: incomplete jobs should show status but ONLY if db content is not shorter
        const dbIsSignificantlyLonger = dbLength > currentLength + 500;
        const dbIsShorter = dbLength < currentLength - 100; // DB is notably shorter than local
        // NEW: Check if local content is notably shorter than DB - indicates polishing/consolidation
        // After polish, local content is typically 50-75% shorter (unified vs raw sections)
        const localIsSignificantlyShorter = currentLength < dbLength - 100;
        const isSubstantiallyDifferent = dbIsSignificantlyLonger || (isJobNewer && lengthDiff > 500);
        const isDifferent = isSubstantiallyDifferent || assembledDraft !== draftContent;

        // Only set databaseDraft if there's actually better/newer content to sync
        // AND the database content is meaningfully longer (not just format differences from image insertion)
        // CRITICAL: Never suggest syncing to SHORTER content - this would revert polished/improved drafts
        // CRITICAL: Never suggest syncing when LOCAL is shorter - user has polished/consolidated
        // When local is shorter than DB, the user likely ran polish which consolidates raw sections
        if ((isDifferent && dbIsSignificantlyLonger && !localIsSignificantlyShorter) || (isIncomplete && !dbIsShorter && !localIsSignificantlyShorter)) {
          setDatabaseDraft(assembledDraft);
          console.log('[DraftingModal] Found newer/different database content:', {
            currentLength,
            dbLength,
            diff: lengthDiff,
            dbIsSignificantlyLonger,
            dbIsShorter,
            localIsSignificantlyShorter,
            isIncomplete,
            auditScore: jobData.final_audit_score,
            sectionCount,
            jobStatus,
            currentPass
          });
        } else {
          setDatabaseDraft(null);
          console.log('[DraftingModal] No sync suggested:', {
            reason: localIsSignificantlyShorter
              ? 'Local content is shorter (likely polished/consolidated)'
              : 'Content is synced or database is not significantly longer',
            currentLength,
            dbLength,
            localIsSignificantlyShorter,
            dbIsSignificantlyLonger
          });
        }
      } catch (err) {
        console.error('[DraftingModal] Error checking database for newer content:', err);
      }
    };

    // Check after a short delay to avoid race conditions
    const timeoutId = setTimeout(checkDatabaseForNewerContent, 500);
    return () => clearTimeout(timeoutId);
  }, [isOpen, brief?.id, draftContent, hasUnsavedChanges, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

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

    // CRITICAL: Use ref to get the LATEST draftContent value
    // This fixes the stale closure bug where save after polish used old content
    const contentToSave = draftContentRef.current;

    const isTransient = brief.id.startsWith('transient-');

    if (isTransient) {
        // Update in memory only for transient
        const updatedBrief = { ...brief, articleDraft: contentToSave };
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
        setHasUnsavedChanges(false);
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Transient draft updated in memory. Click "Save to Map" to persist.' });
        return;
    }

    setIsSaving(true);
    try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const expectedLength = contentToSave.length;

        console.log('[DraftingModal] Starting save - brief.id:', brief.id, 'content length:', expectedLength, '(using ref for latest content)');

        // Step 1: Perform the update
        const { error: updateError, count: updateCount } = await supabase
            .from('content_briefs')
            .update({ article_draft: contentToSave, updated_at: new Date().toISOString() })
            .eq('id', brief.id);

        if (updateError) {
            console.error('[DraftingModal] Update error:', updateError);
            throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log('[DraftingModal] Update completed, rows affected:', updateCount);

        // Step 2: CRITICAL - Do a SEPARATE read to VERIFY the data actually persisted
        // This catches RLS issues where update appears to succeed but doesn't actually write
        const { data: verifyData, error: verifyError } = await supabase
            .from('content_briefs')
            .select('id, article_draft, updated_at')
            .eq('id', brief.id)
            .single<{ id: string; article_draft: string | null; updated_at: string }>();

        if (verifyError) {
            console.error('[DraftingModal] Verification read failed:', verifyError);
            throw new Error(`Save verification failed: ${verifyError.message}. The draft may not have been saved due to permissions.`);
        }

        if (!verifyData) {
            console.error('[DraftingModal] No data returned from verification read');
            throw new Error('Save verification failed: Could not read back saved data. Check database permissions.');
        }

        const savedLength = verifyData.article_draft?.length || 0;
        console.log('[DraftingModal] Verification result:', {
            expected: expectedLength,
            saved: savedLength,
            diff: savedLength - expectedLength,
            updated_at: verifyData.updated_at
        });

        // Check if the save actually worked
        if (savedLength === 0 && expectedLength > 0) {
            throw new Error('SAVE FAILED: The draft was not persisted to the database. This is likely a permissions issue. Please contact support.');
        }

        // Check for significant content mismatch
        if (Math.abs(savedLength - expectedLength) > 100) {
            console.warn('[DraftingModal] Content length mismatch after save!');
            dispatch({ type: 'SET_ERROR', payload: `WARNING: Draft may be corrupted. Expected ${expectedLength.toLocaleString()} chars, but database has ${savedLength.toLocaleString()} chars. Please try saving again.` });
            return; // Don't proceed as if save was successful
        }

        // Step 3: Also update the content_generation_job's draft_content if one exists
        if (databaseJobInfo?.jobId) {
          const { error: jobError } = await supabase
            .from('content_generation_jobs')
            .update({ draft_content: contentToSave, updated_at: new Date().toISOString() })
            .eq('id', databaseJobInfo.jobId);

          if (jobError) {
            console.warn('[DraftingModal] Failed to sync job draft_content:', jobError.message);
          } else {
            console.log('[DraftingModal] Synced draft to content_generation_jobs');
          }
        }

        // Step 4: Update local state only AFTER database verification succeeded
        const updatedBrief = { ...brief, articleDraft: contentToSave };
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

        // Step 5: Fetch updated version history from database (trigger should have created it)
        const { data: historyData } = await supabase
          .from('content_briefs')
          .select('draft_history')
          .eq('id', brief.id)
          .single();

        if (historyData?.draft_history) {
          setDraftHistory(historyData.draft_history as typeof draftHistory);
          console.log('[DraftingModal] Updated version history:', (historyData.draft_history as any[]).length, 'versions');
        }

        // Show clear success message with actual saved count
        dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Draft saved and verified! ${savedLength.toLocaleString()} characters persisted to database.` });
        setHasUnsavedChanges(false);

        // Update the loaded draft length ref to match saved content
        loadedDraftLengthRef.current = savedLength;

        // Clear the database sync banner since we just saved
        setDatabaseDraft(null);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to save draft.";
        console.error('[DraftingModal] Save error:', e);
        dispatch({ type: 'SET_ERROR', payload: `❌ SAVE FAILED: ${errorMessage}` });
    } finally {
        setIsSaving(false);
    }
  };

  // Restore a previous version from history
  const handleRestoreVersion = async (version: typeof draftHistory[0]) => {
    if (!brief || !version.content) return;

    const confirmRestore = window.confirm(
      `Restore draft from ${new Date(version.saved_at).toLocaleString()}?\n\n` +
      `This version has ${version.char_count.toLocaleString()} characters.\n\n` +
      `Your current draft will be saved to version history before restoring.`
    );

    if (!confirmRestore) return;

    setIsRestoringVersion(true);
    try {
      // First, save current draft to history (handled by trigger when we update)
      setDraftContent(version.content);
      setHasUnsavedChanges(true);
      setShowVersionHistory(false);

      // CRITICAL: Update loadedDraftLengthRef to prevent state sync from reverting restored content
      loadedDraftLengthRef.current = version.content.length;

      dispatch({
        type: 'SET_NOTIFICATION',
        payload: `✓ Restored draft from ${new Date(version.saved_at).toLocaleString()}. Click "Save Draft" to persist this version.`
      });
    } catch (e) {
      console.error('[DraftingModal] Restore version error:', e);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to restore version. Please try again.' });
    } finally {
      setIsRestoringVersion(false);
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

        // Insert Topic with verification
        const topicResult = await verifiedInsert(
            supabase,
            { table: 'topics', operationDescription: `create imported topic "${newTopic.title}"` },
            {
                id: newTopic.id,
                map_id: newTopic.map_id,
                title: newTopic.title,
                slug: newTopic.slug,
                description: newTopic.description,
                type: newTopic.type,
                parent_topic_id: newTopic.parent_topic_id,
                freshness: newTopic.freshness,
                metadata: (newTopic.metadata || {}) as Json,
                user_id: state.user.id
            },
            'id'
        );
        if (!topicResult.success) {
            throw new Error(topicResult.error || 'Topic insert verification failed');
        }

        // Insert Brief with verification
        const briefResult = await verifiedInsert(
            supabase,
            { table: 'content_briefs', operationDescription: `create brief for imported topic "${newBrief.title}"` },
            {
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
                perspectives: newBrief.perspectives as any,
                methodology_note: newBrief.methodology_note,
                structured_outline: newBrief.structured_outline as any,
                predicted_user_journey: newBrief.predicted_user_journey,
                query_type_format: newBrief.query_type_format,
                featured_snippet_target: newBrief.featured_snippet_target as any,
                visual_semantics: newBrief.visual_semantics as any,
                discourse_anchors: newBrief.discourse_anchors as any,
                created_at: new Date().toISOString()
            },
            'id'
        );

        if (!briefResult.success) {
            // Rollback: delete the topic we just created
            await verifiedDelete(
                supabase,
                { table: 'topics', operationDescription: `rollback topic "${newTopic.title}"` },
                newTopic.id
            );
            throw new Error(briefResult.error || 'Brief insert verification failed');
        }

        // Update Global State
        dispatch({ type: 'ADD_TOPIC', payload: { mapId: state.activeMapId, topic: newTopic } });
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: newTopicId, brief: newBrief } });
        dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: newTopic });

        dispatch({ type: 'SET_NOTIFICATION', payload: '✓ Imported page saved to map successfully (verified).' });
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

      // Strip base64 images to reduce token count - they can exceed context limits
      // Base64 data is replaced with placeholder URLs - image positions are preserved
      // The AI may move images during polish, which is fine - positions will reflect the new structure
      let strippedImageCount = 0;
      const contentForPolish = draftContent
          // Handle markdown images: ![alt](data:image/png;base64,...)
          .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, (_, altText) => {
              strippedImageCount++;
              return `![${altText || 'image'}](placeholder://base64-image-${strippedImageCount})`;
          })
          // Handle HTML img tags: <img src="data:image/png;base64,..." />
          .replace(/<img([^>]*)src="data:image\/[^;]+;base64,[A-Za-z0-9+/=]+"([^>]*)>/g, (_, before, after) => {
              strippedImageCount++;
              // Preserve other attributes like alt, class, style
              return `<img${before}src="placeholder://base64-image-${strippedImageCount}"${after}>`;
          });

      if (strippedImageCount > 0) {
          console.log(`[DraftingModal] Stripped ${strippedImageCount} base64 images before polish. Content reduced from ${draftContent.length} to ${contentForPolish.length} chars`);
          dispatch({
              type: 'SET_NOTIFICATION',
              payload: `Note: ${strippedImageCount} embedded image(s) were replaced with placeholders for processing. You may need to re-insert images after polishing.`
          });
      }

      // Create a slimmed-down brief for polish to stay within token limits
      // The polish prompt includes JSON.stringify(brief) which can be massive (600K+ chars)
      // Strip large fields that aren't essential for polish operations
      const briefForPolish: Partial<ContentBrief> = {
          id: brief.id,
          topic_id: brief.topic_id,
          title: brief.title,
          slug: brief.slug,
          metaDescription: brief.metaDescription,
          keyTakeaways: brief.keyTakeaways?.slice(0, 5),
          targetKeyword: brief.targetKeyword,
          searchIntent: brief.searchIntent,
          // Essential for polish: visual semantics for image placement
          visual_semantics: brief.visual_semantics?.slice(0, 5),
          // Slim down serpAnalysis - minimal for polish
          serpAnalysis: {
              peopleAlsoAsk: brief.serpAnalysis?.peopleAlsoAsk?.slice(0, 3) || [],
              competitorHeadings: [], // Exclude - not needed for polish
              query_type: brief.serpAnalysis?.query_type
          },
          // Exclude: articleDraft (we're passing it separately, already stripped)
          // Exclude: structured_outline, contextualVectors, contextualBridge, enhanced_visual_semantics
          cta: brief.cta,
          query_type_format: brief.query_type_format,
          featured_snippet_target: brief.featured_snippet_target
      };

      const briefJson = JSON.stringify(briefForPolish);
      console.log(`[DraftingModal] Slimmed brief for polish: ${briefJson.length} chars (original would be ~${JSON.stringify(brief).length} chars)`);

      // Check if content is still too large (rough estimate: 4 chars per token, 150k token limit for safety)
      const estimatedTokens = Math.ceil((contentForPolish.length + briefJson.length) / 4);
      if (estimatedTokens > 150000) {
          setIsPolishing(false);
          dispatch({
              type: 'SET_ERROR',
              payload: `Article is too large to polish (estimated ${estimatedTokens.toLocaleString()} tokens). Maximum is ~150,000 tokens. Try polishing a shorter section.`
          });
          return;
      }

      // Activity-based timeout: resets on each streaming progress event
      // This ensures long operations succeed as long as data is flowing,
      // but times out after 90 seconds of inactivity (true hang or network issue)
      const INACTIVITY_TIMEOUT_MS = 90000; // 90 seconds of no activity = timeout
      let activityTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let lastActivityTime = Date.now();

      const resetActivityTimeout = () => {
          if (activityTimeoutId) clearTimeout(activityTimeoutId);
          lastActivityTime = Date.now();
          activityTimeoutId = setTimeout(() => {
              const inactivityDuration = Date.now() - lastActivityTime;
              console.warn(`[DraftingModal] Polish operation inactive for ${inactivityDuration}ms - timing out`);
              setIsPolishing(false);
              dispatch({
                  type: 'SET_ERROR',
                  payload: `Polish operation timed out after ${Math.round(inactivityDuration/1000)}s of inactivity. Try a smaller article or switch to a faster AI provider.`
              });
          }, INACTIVITY_TIMEOUT_MS);
      };

      // Start initial timeout (for non-streaming providers)
      resetActivityTimeout();

      // Progress callback resets the timeout on each streaming activity
      const handleProgress = (progress: StreamingProgress) => {
          console.log(`[DraftingModal] Polish progress: ${progress.charsReceived} chars, ${progress.eventsProcessed} events`);
          resetActivityTimeout();
      };

      try {
          // Use smart polish - automatically chunks large drafts for reliability
          const polishedText = await aiService.polishDraftSmart(contentForPolish, briefForPolish as ContentBrief, configToUse, dispatch, handleProgress);
          if (activityTimeoutId) clearTimeout(activityTimeoutId);

          // Note: We don't restore base64 images - they remain as placeholder URLs
          // User can re-insert images at the placeholder positions if needed
          setDraftContent(polishedText);
          setActiveTab('preview'); // Switch to preview to show the formatted result

          // CRITICAL: Update loadedDraftLengthRef to prevent state sync from reverting polished content
          // Without this, if state.briefs gets updated with old content (e.g., from useContentGeneration),
          // the guard in the state sync useEffect would fail because it compares against the old length
          loadedDraftLengthRef.current = polishedText.length;
          console.log('[DraftingModal] Updated loadedDraftLengthRef to polished length:', polishedText.length);

          // AUTO-SAVE: Immediately persist polished content to prevent losing it on navigation/refresh
          // This is critical because polish consolidates raw sections into a unified, shorter draft
          // Without auto-save, reloading would show the longer raw sections instead of polished content
          if (brief && activeMapId && state.user) {
              try {
                  const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                  const { error: saveError } = await supabase
                      .from('content_briefs')
                      .update({ article_draft: polishedText, updated_at: new Date().toISOString() })
                      .eq('id', brief.id);

                  if (saveError) {
                      console.error('[DraftingModal] Auto-save after polish failed:', saveError);
                      dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! ⚠️ Auto-save failed - please save manually.' });
                      setHasUnsavedChanges(true);
                  } else {
                      // VERIFICATION: Read back to confirm save worked
                      const { data: verifyData, error: verifyError } = await supabase
                          .from('content_briefs')
                          .select('article_draft')
                          .eq('id', brief.id)
                          .single();

                      const savedLength = verifyData?.article_draft?.length || 0;
                      const expectedLength = polishedText.length;

                      if (verifyError || Math.abs(savedLength - expectedLength) > 100) {
                          console.error('[DraftingModal] Auto-save verification FAILED:', {
                              verifyError,
                              expectedLength,
                              savedLength,
                              diff: savedLength - expectedLength
                          });
                          dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! ⚠️ Save verification failed - please save manually.' });
                          setHasUnsavedChanges(true);
                      } else {
                          console.log('[DraftingModal] Auto-save VERIFIED:', savedLength, 'chars saved (expected:', expectedLength, ')');

                          // Also update the job's draft_content if exists
                          if (databaseJobInfo?.jobId) {
                              await supabase
                                  .from('content_generation_jobs')
                                  .update({ draft_content: polishedText, updated_at: new Date().toISOString() })
                                  .eq('id', databaseJobInfo.jobId);
                          }
                          // Update local state
                          const updatedBrief = { ...brief, articleDraft: polishedText };
                          dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
                          setHasUnsavedChanges(false);
                          setDatabaseDraft(null); // Clear sync banner
                          dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Draft polished and saved! (${savedLength.toLocaleString()} chars verified)` });
                      }
                  }
              } catch (autoSaveError) {
                  console.error('[DraftingModal] Auto-save exception:', autoSaveError);
                  dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! ⚠️ Auto-save failed - please save manually.' });
                  setHasUnsavedChanges(true);
              }
          } else {
              dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! Click Save to persist your changes.' });
              setHasUnsavedChanges(true);
          }
      } catch (e) {
          if (activityTimeoutId) clearTimeout(activityTimeoutId);
          console.error('[DraftingModal] Polish error:', e);
          dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to polish draft." });
      } finally {
          if (activityTimeoutId) clearTimeout(activityTimeoutId);
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

    // Get schema data from database job info
    const schemaData = databaseJobInfo?.schemaData;
    const schemaScript = schemaData ? `
  <script type="application/ld+json">
${JSON.stringify(schemaData, null, 2)}
  </script>` : '';

    // Get featured image for Open Graph
    const featuredImage = imagePlaceholders.find(img => img.type === 'HERO');
    const ogImage = featuredImage?.generatedUrl || featuredImage?.userUploadUrl || '';

    // Build Open Graph meta tags
    const ogTags = `
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${brief.title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${brief.title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}

  <!-- Article specific -->
  <meta property="article:published_time" content="${new Date().toISOString()}">
  ${businessInfo.authorName ? `<meta property="article:author" content="${businessInfo.authorName.replace(/"/g, '&quot;')}">` : ''}`;

    // Author information for byline
    const authorByline = businessInfo.authorName
      ? ` · <strong>Author:</strong> ${businessInfo.authorName}`
      : '';

    // 1. Create the Article (HTML) - nicely formatted for reading with SEO markup
    const articleHtml = `<!DOCTYPE html>
<html lang="${businessInfo.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  <meta name="keywords" content="${brief.targetKeyword || ''}">
  <meta name="robots" content="index, follow">
  ${businessInfo.authorName ? `<meta name="author" content="${businessInfo.authorName.replace(/"/g, '&quot;')}">` : ''}
  <title>${brief.title}</title>
  ${ogTags}
  ${schemaScript}
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
  <article itemscope itemtype="https://schema.org/Article">
    <header>
      <h1 itemprop="headline">${brief.title}</h1>
      <div class="header-meta">
        <strong>Word Count:</strong> <span itemprop="wordCount">${wordCount.toLocaleString()}</span> words
        ${auditScore ? ` · <strong>Quality Score:</strong> ${auditScore}/100` : ''}${authorByline}
        <meta itemprop="datePublished" content="${new Date().toISOString()}">
      </div>
    </header>
    <div itemprop="articleBody">
    ${convertMarkdownToBasicHtml(draftContent)}
    </div>
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

    // Create ZIP file with all content
    dispatch({ type: 'SET_NOTIFICATION', payload: 'Preparing ZIP package...' });

    const zip = new JSZip();

    // Add text files to ZIP
    zip.file(`${slug}-article.html`, articleHtml);
    zip.file(`${slug}-article.md`, draftContent);
    zip.file(`${slug}-content-brief.txt`, briefDoc);
    zip.file(`${slug}-internal-links.txt`, linksDoc);
    zip.file(`${slug}-quality-report.txt`, qualityDoc);

    // Add schema as separate JSON file if available
    if (schemaData) {
      zip.file(`${slug}-schema.json`, JSON.stringify(schemaData, null, 2));
    }

    // Create images folder and add images
    let imageCount = 0;
    const imagesFolder = zip.folder('images');

    // Collect image URLs from multiple sources
    const imageUrls: { url: string; name: string }[] = [];

    // 1. From image placeholders
    for (const placeholder of imagePlaceholders) {
      const imageUrl = placeholder.generatedUrl || placeholder.userUploadUrl;
      if (imageUrl) {
        const safeName = placeholder.description?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || `image_${imageCount + 1}`;
        imageUrls.push({ url: imageUrl, name: safeName });
      }
    }

    // 2. Extract image URLs from markdown content (in case images are embedded in draft)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownImageRegex.exec(draftContent)) !== null) {
      const alt = match[1] || '';
      const url = match[2];
      // Check if URL is not already in our list
      if (url && !imageUrls.some(img => img.url === url)) {
        const safeName = alt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || `image_${imageUrls.length + 1}`;
        imageUrls.push({ url, name: safeName });
      }
    }

    // Process all images
    for (const { url, name } of imageUrls) {
      try {
        let arrayBuffer: ArrayBuffer;
        let ext = 'png';

        if (url.startsWith('data:')) {
          // Handle base64 data URLs
          const matches = url.match(/^data:image\/([^;]+);base64,(.+)$/);
          if (matches) {
            ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const base64Data = matches[2];
            // Convert base64 to array buffer
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            arrayBuffer = bytes.buffer;
          } else {
            continue; // Skip if can't parse data URL
          }
        } else if (url.startsWith('blob:')) {
          // Skip blob URLs as they're not fetchable
          continue;
        } else {
          // Fetch remote URL
          const response = await fetch(url);
          const blob = await response.blob();
          ext = blob.type.split('/')[1] || 'png';
          if (ext === 'jpeg') ext = 'jpg';
          arrayBuffer = await blob.arrayBuffer();
        }

        const filename = `${imageCount + 1}-${name}.${ext}`;
        imagesFolder?.file(filename, arrayBuffer);
        imageCount++;
      } catch (err) {
        console.warn('Could not add image to ZIP:', url, err);
      }
    }

    // Generate and download ZIP
    try {
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      downloadFile(zipBlob, `${slug}-article-package.zip`);

      const totalFiles = 5 + (schemaData ? 1 : 0) + imageCount;
      dispatch({ type: 'SET_NOTIFICATION', payload: `ZIP package downloaded: ${slug}-article-package.zip (${totalFiles} files${imageCount > 0 ? `, ${imageCount} images` : ''})` });
    } catch (err) {
      console.error('Failed to create ZIP:', err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create ZIP package. Please try again.' });
    }
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


  // Download only the HTML file (quick download for publishing)
  // Follows HTML Writing Best Practices for SEO: semantic tags, centerpiece annotation, CLS prevention, proper schema nesting
  // Images are embedded as base64 data URLs for self-contained offline viewing
  const handleDownloadHtml = async () => {
    if (!brief || !draftContent) return;

    // Validate content before export
    const validation = validateForExport(draftContent);
    if (!validation.valid) {
      console.warn('[handleDownloadHtml] Content validation issues:', validation.issues);
      // Show warning but allow export for warnings (only block on blockers)
      if (validation.blockers.length > 0) {
        dispatch({ type: 'SET_ERROR', payload: `Cannot export: ${validation.blockers.join(', ')}. Please resolve these issues first.` });
        return;
      }
      // For warnings, show notification but continue
      if (validation.warnings.length > 0) {
        dispatch({ type: 'SET_NOTIFICATION', payload: `Export warnings: ${validation.warnings.join(', ')}` });
      }
    }

    // Clean content before export (fix H1 duplicates, excessive whitespace)
    const cleanedContent = cleanForExport(draftContent);

    dispatch({ type: 'SET_NOTIFICATION', payload: 'Preparing HTML with embedded images...' });

    const slug = brief.slug || 'article';
    const wordCount = draftContent.split(/\s+/).length;
    const frameworkRules = brief.contentAudit?.frameworkRules || [];
    const passingRules = frameworkRules.filter(r => r.isPassing).length;
    const auditScore = databaseJobInfo?.auditScore || (frameworkRules.length > 0 ? Math.round((passingRules / frameworkRules.length) * 100) : null);
    const publishDate = new Date().toISOString();

    // Build canonical URL from slug (Rule: Canonical tag prevents ranking signal dilution)
    const canonicalUrl = businessInfo.domain
      ? `https://${businessInfo.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/${slug}/`
      : '';

    // Get schema data from database job info
    const schemaData = databaseJobInfo?.schemaData;

    // Helper: Convert image URL to base64 data URL for embedding
    const imageUrlToDataUrl = async (url: string): Promise<string | null> => {
      if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
        return url.startsWith('data:') ? url : null;
      }
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Failed to convert image to data URL:', url, err);
        return null;
      }
    };

    // Build map of image URLs to their base64 data URLs
    const imageUrlMap = new Map<string, string>();
    const imageUrls: string[] = [];

    // Collect all image URLs from placeholders
    for (const placeholder of imagePlaceholders) {
      const url = placeholder.generatedUrl || placeholder.userUploadUrl;
      if (url && !url.startsWith('blob:')) {
        imageUrls.push(url);
      }
    }

    // Also extract image URLs from markdown content (use cleaned content)
    const markdownImageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownImageRegex.exec(cleanedContent)) !== null) {
      const url = match[1];
      if (url && !url.startsWith('blob:') && !url.startsWith('data:') && !imageUrls.includes(url)) {
        imageUrls.push(url);
      }
    }

    // Convert all images to base64 (in parallel for speed)
    const conversions = await Promise.all(
      imageUrls.map(async (url) => {
        const dataUrl = await imageUrlToDataUrl(url);
        return { url, dataUrl };
      })
    );

    for (const { url, dataUrl } of conversions) {
      if (dataUrl) {
        imageUrlMap.set(url, dataUrl);
      }
    }

    // Get featured image for Open Graph and LCP preloading
    const featuredImage = imagePlaceholders.find(img => img.type === 'HERO');
    const ogImageUrl = featuredImage?.generatedUrl || featuredImage?.userUploadUrl || '';
    const ogImage = imageUrlMap.get(ogImageUrl) || ogImageUrl;

    // Build enhanced JSON-LD schema with proper nesting (Rule: nest ImageObject, author inside main schema)
    const buildEnhancedSchema = () => {
      // Start with existing schema or create Article schema
      let schema = schemaData || {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: brief.title,
        description: brief.metaDescription || '',
        datePublished: publishDate,
        dateModified: publishDate,
        wordCount: wordCount,
      };

      // Ensure schema is an object (not array) for nesting
      if (Array.isArray(schema)) {
        schema = schema[0] || {};
      }

      // Nest author (Person schema) if available
      if (businessInfo.authorName && !schema.author) {
        schema.author = {
          '@type': 'Person',
          name: businessInfo.authorName,
          ...(businessInfo.authorBio && { description: businessInfo.authorBio }),
          ...(businessInfo.authorCredentials && { jobTitle: businessInfo.authorCredentials }),
        };
      }

      // Nest ImageObject for hero/LCP image (Rule: include hero in schema)
      if (ogImage && !schema.image) {
        schema.image = {
          '@type': 'ImageObject',
          url: ogImage,
          ...(featuredImage?.altTextSuggestion && { description: featuredImage.altTextSuggestion }),
        };
      }

      // Add publisher if business info available
      if (businessInfo.seedKeyword && !schema.publisher) {
        schema.publisher = {
          '@type': 'Organization',
          name: businessInfo.seedKeyword,
          ...(businessInfo.industry && { description: businessInfo.industry }),
        };
      }

      return schema;
    };

    const enhancedSchema = buildEnhancedSchema();
    const schemaScript = `<script type="application/ld+json">${JSON.stringify(enhancedSchema)}</script>`;

    // LCP Preload hint for hero image (Rule: preload LCP element, do NOT lazy load)
    const lcpPreload = ogImage ? `<link rel="preload" as="image" href="${ogImage}">` : '';

    // Build Open Graph meta tags (Rule: OG URL must match canonical)
    const ogTags = `<!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  ${canonicalUrl ? `<meta property="og:url" content="${canonicalUrl}">` : ''}
  <meta property="og:title" content="${brief.title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${brief.title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  <!-- Article specific -->
  <meta property="article:published_time" content="${publishDate}">
  ${businessInfo.authorName ? `<meta property="article:author" content="${businessInfo.authorName.replace(/"/g, '&quot;')}">` : ''}`;

    // Extract centerpiece using canonical service (first 300 chars rule)
    const centerpiece = extractCenterpiece(cleanedContent, 300) || brief.metaDescription || '';

    // Build HTML following SEO best practices
    // Rule: DOM under 1500 nodes, minified, semantic tags, centerpiece in first 400 chars
    const articleHtml = `<!DOCTYPE html>
<html lang="${businessInfo.language || 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
<meta name="keywords" content="${brief.targetKeyword || ''}">
<meta name="robots" content="index, follow">
${businessInfo.authorName ? `<meta name="author" content="${businessInfo.authorName.replace(/"/g, '&quot;')}">` : ''}
<title>${brief.title}</title>
${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : '<!-- Add canonical URL when publishing -->'}
${lcpPreload}
${ogTags}
${schemaScript}
<style>*{box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;line-height:1.8;max-width:750px;margin:0 auto;padding:2rem;color:#2d2d2d;background:#fafafa}main{display:block}article{display:block}section{margin-bottom:2rem}h1{font-size:2.2rem;color:#1a1a1a;margin-top:0;margin-bottom:0.5rem;line-height:1.2}h2{font-size:1.5rem;color:#1a1a1a;margin-top:2.5rem;border-bottom:2px solid #e0e0e0;padding-bottom:0.5rem}h3{font-size:1.25rem;color:#333;margin-top:2rem}h4{font-size:1.1rem;color:#444;margin-top:1.5rem}p{margin:1rem 0}img{max-width:100%;height:auto;border-radius:8px;margin:1.5rem 0;box-shadow:0 4px 12px rgba(0,0,0,0.1)}figure{margin:2rem 0;text-align:center}figcaption{font-size:0.9rem;color:#666;font-style:italic;margin-top:0.5rem}table{border-collapse:collapse;width:100%;margin:1.5rem 0;font-size:0.95rem}th,td{border:1px solid #ddd;padding:0.75rem;text-align:left}th{background:#f0f0f0;font-weight:600}tr:nth-child(even){background:#f9f9f9}code{background:#f0f0f0;padding:0.2em 0.4em;border-radius:3px;font-size:0.9em;font-family:'Consolas',monospace}pre{background:#f5f5f5;padding:1rem;border-radius:8px;overflow-x:auto}blockquote{border-left:4px solid #0066cc;margin:1.5rem 0;padding:0.5rem 1rem;background:#f9f9f9;font-style:italic}a{color:#0066cc;text-decoration:none}a:hover{text-decoration:underline}ul,ol{padding-left:1.5rem;margin:1rem 0}li{margin:0.5rem 0}.byline{color:#666;font-size:0.9rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #e0e0e0}hr{border:none;border-top:1px solid #e0e0e0;margin:2rem 0}</style>
</head>
<body>
<main>
<article>
<header>
<h1>${brief.title}</h1>
<p class="byline">${businessInfo.authorName ? `By <strong>${businessInfo.authorName}</strong> · ` : ''}<time datetime="${publishDate}">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time> · ${wordCount.toLocaleString()} words</p>
</header>
<p><strong>${centerpiece}</strong></p>
${convertMarkdownToSemanticHtml(cleanedContent, { imageUrlMap, ogImageUrl })}
</article>
</main>
</body>
</html>`;

    downloadFile(new Blob([articleHtml], { type: 'text/html' }), `${slug}.html`);
    const embeddedCount = imageUrlMap.size;
    dispatch({ type: 'SET_NOTIFICATION', payload: `HTML file downloaded: ${slug}.html (SEO-optimized${embeddedCount > 0 ? `, ${embeddedCount} images embedded` : ''})` });
  };

  // Copy HTML to clipboard for WordPress
  // Uses the SAME sophisticated conversion as handleDownloadHtml for full SEO optimization
  const handleCopyHtml = async () => {
    if (!brief || !draftContent) return;

    // Validate content before copy
    const validation = validateForExport(draftContent);
    if (!validation.valid) {
      console.warn('[handleCopyHtml] Content validation issues:', validation.issues);
      if (validation.blockers.length > 0) {
        dispatch({ type: 'SET_ERROR', payload: `Cannot copy: ${validation.blockers.join(', ')}. Please resolve these issues first.` });
        return;
      }
      if (validation.warnings.length > 0) {
        dispatch({ type: 'SET_NOTIFICATION', payload: `Copy warnings: ${validation.warnings.join(', ')}` });
      }
    }

    // Clean content before copy
    const cleanedContent = cleanForExport(draftContent);

    dispatch({ type: 'SET_NOTIFICATION', payload: 'Preparing optimized HTML with schema markup...' });

    const wordCount = cleanedContent.split(/\s+/).length;
    const publishDate = new Date().toISOString();
    const schemaData = databaseJobInfo?.schemaData;

    // Extract centerpiece using canonical service (first 300 chars rule)
    const centerpiece = extractCenterpiece(cleanedContent, 300) || brief.metaDescription || '';

    // Build enhanced JSON-LD schema
    const buildSchema = () => {
      let schema = schemaData || {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: brief.title,
        description: brief.metaDescription || '',
        datePublished: publishDate,
        dateModified: publishDate,
        wordCount: wordCount,
      };
      if (Array.isArray(schema)) schema = schema[0] || {};

      if (businessInfo.authorName && !schema.author) {
        schema.author = {
          '@type': 'Person',
          name: businessInfo.authorName,
          ...(businessInfo.authorBio && { description: businessInfo.authorBio }),
        };
      }
      return schema;
    };

    // Build the WordPress-ready HTML with all optimizations
    const schema = buildSchema();
    const schemaScript = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;

    const articleHtml = `<!-- SEO Meta: ${brief.metaDescription || ''} -->
<!-- Target Keyword: ${brief.targetKeyword || ''} -->

<article>
<header>
<h1>${brief.title}</h1>
${businessInfo.authorName ? `<p class="byline">By <strong>${businessInfo.authorName}</strong> · <time datetime="${publishDate}">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time> · ${wordCount.toLocaleString()} words</p>` : ''}
</header>

<!-- Centerpiece: First 400 chars for search snippets -->
<p><strong>${centerpiece}</strong></p>

${convertMarkdownToSemanticHtml(cleanedContent)}
</article>

<!-- JSON-LD Schema Markup (paste in Yoast/RankMath custom schema or theme footer) -->
${schemaScript}`;

    try {
      await navigator.clipboard.writeText(articleHtml);

      const hasImages = imagePlaceholders.some(p => p.generatedUrl || p.userUploadUrl);
      const imageNote = hasImages ? ' Images have external URLs - they should work directly.' : '';

      dispatch({ type: 'SET_NOTIFICATION', payload: `Optimized HTML copied! Includes semantic sections, schema markup, and SEO annotations.${imageNote}` });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to copy to clipboard. Please use the download option instead.' });
    }
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
      const escapedDesc = selectedPlaceholder.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const placeholderPattern = new RegExp(
        `\\[IMAGE:\\s*${escapedDesc}[^\\]]*\\]`,
        'i'
      );

      let newDraft = draftContent.replace(placeholderPattern, imageMarkdown);

      // If exact match didn't work, try a more flexible approach
      if (newDraft === draftContent) {
        // Try matching just the first few words of description
        const descWords = selectedPlaceholder.description.split(/\s+/).slice(0, 3).join('\\s+');
        const loosePattern = new RegExp(
          `\\[IMAGE:\\s*${descWords}[^\\]]*\\]`,
          'i'
        );
        newDraft = draftContent.replace(loosePattern, imageMarkdown);
      }

      if (newDraft !== draftContent) {
        setDraftContent(newDraft);
        setHasUnsavedChanges(true);
        dispatch({ type: 'SET_NOTIFICATION', payload: `Image generated and inserted successfully!` });
        console.log('[DraftingModal] Image inserted, URL length:', imageUrl.length);
      } else {
        // Log for debugging
        console.warn('[DraftingModal] Placeholder pattern did not match');
        console.warn('[DraftingModal] Looking for:', selectedPlaceholder.description);
        console.warn('[DraftingModal] Image URL length:', imageUrl.length);
        dispatch({ type: 'SET_NOTIFICATION', payload: `Image generated! Note: Could not auto-insert into draft. The placeholder may have been modified.` });
      }
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
      // CORRECT 10-PASS KEY ORDER:
      // Pass 4 = discourse, Pass 6 = visuals, Pass 8 = polish, Pass 9 = audit, Pass 10 = schema
      const passKeyNames = ['draft', 'headers', 'lists', 'discourse', 'microsemantics', 'visuals', 'intro', 'polish', 'audit', 'schema'];
      for (let i = lowestPass; i <= 10; i++) {
        const passKey = `pass_${i}_${passKeyNames[i - 1]}`;
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
            const content = (s.current_content || '').trim();
            const expectedHeading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
            // Check if content already starts with a markdown heading (## or ###)
            const headingPattern = /^#{2,3}\s+/;
            if (headingPattern.test(content)) {
              return content;
            }
            return `${expectedHeading}\n\n${content}`;
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

  // Handle running the algorithmic audit and showing issues
  const handleRunAudit = useCallback(() => {
    if (!brief || !draftContent) return;
    setIsRunningAudit(true);
    try {
      const auditResults = runAlgorithmicAudit(draftContent, brief, businessInfo);
      const issues = convertToAuditIssues(auditResults);
      setAuditIssues(issues);
      setShowAuditPanel(true);
    } catch (error) {
      console.error('[DraftingModal] Audit failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to run audit' });
    } finally {
      setIsRunningAudit(false);
    }
  }, [brief, draftContent, businessInfo, dispatch]);

  // Handle applying an auto-fix
  const handleApplyAuditFix = useCallback((updatedDraft: string, issueId: string) => {
    setDraftContent(updatedDraft);
    setHasUnsavedChanges(true);
    setAuditIssues(prev =>
      prev.map(issue =>
        issue.id === issueId ? { ...issue, fixApplied: true } : issue
      )
    );
    dispatch({ type: 'SET_NOTIFICATION', payload: 'Fix applied successfully' });
  }, [dispatch]);

  // Handle dismissing an audit issue
  const handleDismissAuditIssue = useCallback((issueId: string) => {
    setAuditIssues(prev => prev.filter(issue => issue.id !== issueId));
  }, []);

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
                    title="Visual preview only. Downloaded HTML includes SEO optimization (schema, OG tags, semantic sections)."
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
                 <button
                    onClick={() => setActiveTab('quality')}
                    className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                      activeTab === 'quality'
                        ? 'bg-green-600 text-white font-medium'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                 >
                    Quality
                    {databaseJobInfo?.auditScore && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === 'quality' ? 'bg-green-700' : 'bg-gray-600'
                      }`}>
                        {databaseJobInfo.auditScore}%
                      </span>
                    )}
                 </button>
                 <button
                    onClick={() => setActiveTab('debug')}
                    className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                      activeTab === 'debug'
                        ? 'bg-purple-600 text-white font-medium'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                 >
                    Debug
                 </button>
             </div>

             {isPolishing && (
                 <Button
                    onClick={() => {
                        console.log('[DraftingModal] User cancelled polish operation');
                        setIsPolishing(false);
                        dispatch({ type: 'SET_NOTIFICATION', payload: 'Polish cancelled. You can now save your draft.' });
                    }}
                    className="!py-1 !px-3 text-sm bg-amber-700 hover:bg-amber-600"
                    variant="secondary"
                 >
                    Cancel Polish
                 </Button>
             )}

             {isTransient ? (
                 <Button
                    onClick={handleSaveTransient}
                    className="!py-1 !px-4 text-sm bg-green-700 hover:bg-green-600"
                    disabled={isSaving || isPolishing}
                 >
                    {isSaving ? <Loader className="w-4 h-4"/> : 'Save to Map'}
                 </Button>
             ) : (
                 <>
                     <Button
                        onClick={handleSaveDraft}
                        className="!py-1 !px-4 text-sm"
                        disabled={isSaving || isPolishing}
                     >
                        {isSaving ? <Loader className="w-4 h-4"/> : 'Save Draft'}
                     </Button>
                     {draftHistory.length > 0 && (
                         <button
                            onClick={() => setShowVersionHistory(true)}
                            className="ml-2 px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded hover:border-gray-500"
                            title={`${draftHistory.length} previous version(s) available`}
                         >
                            📋 History ({draftHistory.length})
                         </button>
                     )}
                 </>
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
                                    { key: 'pass_4_discourse', label: 'C' },  // Discourse/Context
                                    { key: 'pass_5_microsemantics', label: 'M' },
                                    { key: 'pass_6_visuals', label: 'V' },    // Visuals
                                    { key: 'pass_7_intro', label: 'I' },
                                    { key: 'pass_8_polish', label: 'P' },     // Polish
                                    { key: 'pass_9_audit', label: 'A' },      // Audit
                                    { key: 'pass_10_schema', label: 'S' },    // Schema
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
                                                { key: 'pass_4_discourse', label: 'Discourse' },
                                                { key: 'pass_5_microsemantics', label: 'Micro' },
                                                { key: 'pass_6_visuals', label: 'Visuals' },
                                                { key: 'pass_7_intro', label: 'Intro' },
                                                { key: 'pass_8_polish', label: 'Polish' },
                                                { key: 'pass_9_audit', label: 'Audit' },
                                                { key: 'pass_10_schema', label: 'Schema' },
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
                    <div className="h-full overflow-y-auto bg-gray-950 text-gray-100">
                        <div className="bg-blue-900/20 border-b border-blue-700/30 px-8 py-2 text-xs text-blue-300">
                            Visual preview only • Downloaded HTML includes SEO optimization (schema, Open Graph, semantic sections, embedded images)
                        </div>
                        <div className="p-8 max-w-3xl mx-auto">
                            {draftContent ? (
                                <>
                                    {/* Article Title (H1) */}
                                    <h1 className="text-3xl font-bold text-white border-b border-gray-700 pb-4 mb-4">
                                        {brief?.title || 'Untitled Article'}
                                    </h1>

                                    {/* Article Metadata */}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6 pb-4 border-b border-gray-800">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            {draftContent.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {Math.ceil(draftContent.split(/\s+/).filter(Boolean).length / 200)} min read
                                        </span>
                                        {databaseJobInfo?.auditScore && (
                                            <span className={`flex items-center gap-1 ${
                                                databaseJobInfo.auditScore >= 80 ? 'text-green-400' :
                                                databaseJobInfo.auditScore >= 60 ? 'text-yellow-400' :
                                                'text-red-400'
                                            }`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Quality: {databaseJobInfo.auditScore}%
                                            </span>
                                        )}
                                        {imagePlaceholders.length > 0 && (
                                            <span className="flex items-center gap-1 text-purple-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {imagePlaceholders.length} images
                                            </span>
                                        )}
                                        {brief?.competitorSpecs && (
                                            <span className="flex items-center gap-1 text-cyan-400" title={`Based on ${brief.competitorSpecs.competitorsAnalyzed} competitors`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                                Target: {brief.competitorSpecs.targetWordCount.toLocaleString()} words
                                            </span>
                                        )}
                                    </div>

                                    {/* Hero Image Placeholder (if present) */}
                                    {(() => {
                                        const heroImage = imagePlaceholders.find(img => img.type === 'HERO');
                                        if (heroImage) {
                                            return (
                                                <div className="bg-gray-800 border border-dashed border-gray-600 rounded-lg p-4 mb-6">
                                                    <div className="flex items-center gap-2 text-purple-400">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="font-medium">Hero Image</span>
                                                    </div>
                                                    <p className="text-gray-300 mt-2">{heroImage.description}</p>
                                                    <p className="text-sm text-gray-500 mt-1">Alt: {heroImage.altTextSuggestion}</p>
                                                    {heroImage.generatedUrl && (
                                                        <img src={heroImage.generatedUrl} alt={heroImage.altTextSuggestion} className="mt-3 rounded-lg max-h-48 object-cover" />
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Main Content - strip leading H1 since we render title separately */}
                                    <div className="prose prose-invert max-w-none">
                                        <SimpleMarkdown content={safeString(draftContent).replace(/^#\s+[^\n]+\n*/m, '')} />
                                    </div>

                                    {/* All Image Placeholders Summary */}
                                    {imagePlaceholders.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-gray-700">
                                            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Image Placeholders ({imagePlaceholders.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {imagePlaceholders.map((img, i) => (
                                                    <div key={i} className="bg-gray-800/50 rounded p-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                img.type === 'HERO' ? 'bg-purple-900/50 text-purple-300' :
                                                                img.type === 'INFOGRAPHIC' ? 'bg-blue-900/50 text-blue-300' :
                                                                img.type === 'CHART' ? 'bg-green-900/50 text-green-300' :
                                                                img.type === 'DIAGRAM' ? 'bg-yellow-900/50 text-yellow-300' :
                                                                'bg-gray-700 text-gray-300'
                                                            }`}>
                                                                {img.type}
                                                            </span>
                                                            <span className="text-gray-300 flex-1 truncate">{img.description}</span>
                                                            {img.generatedUrl && (
                                                                <span className="text-green-400 text-xs">Generated</span>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-500 mt-1 text-xs">Alt: {img.altTextSuggestion}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Competitor Specs Summary (if available) */}
                                    {brief?.competitorSpecs && (
                                        <div className="mt-6 pt-6 border-t border-gray-700">
                                            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                Competitor Benchmarks ({brief.competitorSpecs.competitorsAnalyzed} analyzed)
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                                <div className="bg-gray-800/50 rounded p-2">
                                                    <p className="text-gray-500 text-xs">Target Words</p>
                                                    <p className="text-white font-medium">{brief.competitorSpecs.targetWordCount.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-gray-800/50 rounded p-2">
                                                    <p className="text-gray-500 text-xs">Target Images</p>
                                                    <p className="text-white font-medium">{brief.competitorSpecs.targetImageCount}</p>
                                                </div>
                                                <div className="bg-gray-800/50 rounded p-2">
                                                    <p className="text-gray-500 text-xs">Avg H2s</p>
                                                    <p className="text-white font-medium">{brief.competitorSpecs.avgH2Count}</p>
                                                </div>
                                                <div className="bg-gray-800/50 rounded p-2">
                                                    <p className="text-gray-500 text-xs">Data Quality</p>
                                                    <p className={`font-medium ${
                                                        brief.competitorSpecs.dataQuality === 'high' ? 'text-green-400' :
                                                        brief.competitorSpecs.dataQuality === 'medium' ? 'text-yellow-400' :
                                                        'text-red-400'
                                                    }`}>
                                                        {brief.competitorSpecs.dataQuality.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                      jobId={databaseJobInfo?.jobId}
                      onUpdateDraft={(newDraft, shouldAutoSave) => {
                        setDraftContent(newDraft);
                        setHasUnsavedChanges(true);
                        // Auto-save after image insertion to prevent data loss
                        if (shouldAutoSave && brief?.id && !brief.id.startsWith('transient-')) {
                          // Use a small delay to batch multiple quick updates
                          setTimeout(async () => {
                            try {
                              const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                              await supabase
                                .from('content_briefs')
                                .update({ article_draft: newDraft, updated_at: new Date().toISOString() })
                                .eq('id', brief.id);
                              setHasUnsavedChanges(false);
                              console.log('[DraftingModal] Auto-saved draft after image insertion');
                            } catch (err) {
                              console.error('[DraftingModal] Auto-save failed:', err);
                            }
                          }, 500);
                        }
                      }}
                      onOpenVisualEditor={(placeholder) => {
                        setSelectedPlaceholder(placeholder);
                        setOpenInVisualEditor(true);
                        setShowImageModal(true);
                      }}
                    />
                ) : activeTab === 'quality' ? (
                    <div className="h-full overflow-y-auto p-4 space-y-6">
                        {/* Quality Report Header */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Content Quality Report</h3>
                                {databaseJobInfo?.auditScore && (
                                    <div className={`text-2xl font-bold ${
                                        databaseJobInfo.auditScore >= 80 ? 'text-green-400' :
                                        databaseJobInfo.auditScore >= 60 ? 'text-yellow-400' :
                                        'text-red-400'
                                    }`}>
                                        {databaseJobInfo.auditScore}%
                                    </div>
                                )}
                            </div>
                            {minimalJob ? (() => {
                                // Get audit rules from either brief.contentAudit OR job.audit_details
                                const auditRules = brief?.contentAudit?.frameworkRules?.length > 0
                                    ? brief.contentAudit.frameworkRules
                                    : databaseJobInfo?.auditDetails?.algorithmicResults || [];

                                return (
                                    <ArticleQualityReport
                                        jobId={minimalJob.id}
                                        violations={auditRules.filter((r: any) => !r.isPassing).map((r: any) => ({
                                            rule: r.ruleName,
                                            text: r.details,
                                            position: 0,
                                            suggestion: r.remediation || 'Review and address this issue',
                                            severity: 'warning' as const,
                                        }))}
                                        evaluatedRules={auditRules.length > 0 ? auditRules.map((r: any) => ({
                                            ruleName: r.ruleName,
                                            isPassing: r.isPassing,
                                        })) : undefined}
                                        passDeltas={[]}
                                        overallScore={databaseJobInfo?.auditScore || 0}
                                        businessInfo={businessInfo}
                                        content={draftContent}
                                        onApprove={() => {
                                            dispatch({ type: 'SET_NOTIFICATION', payload: 'Article approved!' });
                                        }}
                                        onRequestFix={(ruleIds) => {
                                            console.log('Request fix for rules:', ruleIds);
                                            dispatch({ type: 'SET_NOTIFICATION', payload: `Requested fix for ${ruleIds.length} rule(s)` });
                                        }}
                                        onEdit={() => setActiveTab('edit')}
                                        onRegenerate={() => {
                                            dispatch({ type: 'SET_NOTIFICATION', payload: 'Regeneration not yet implemented in this view' });
                                        }}
                                    />
                                );
                            })() : (
                                <div className="text-center py-8 text-gray-400">
                                    <p>No quality data available yet.</p>
                                    <p className="text-sm mt-2">Generate or polish content to see quality metrics.</p>
                                </div>
                            )}
                        </div>

                        {/* Quality Rules Panel */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4">Quality Rules Checklist</h3>
                            {(() => {
                                // Get audit rules from either brief.contentAudit OR job.audit_details
                                const panelAuditRules = brief?.contentAudit?.frameworkRules?.length > 0
                                    ? brief.contentAudit.frameworkRules
                                    : databaseJobInfo?.auditDetails?.algorithmicResults || [];

                                return (
                                    <QualityRulePanel
                                        violations={panelAuditRules.filter((r: any) => !r.isPassing).map((r: any) => ({
                                            rule: r.ruleName,
                                            text: r.details,
                                            position: 0,
                                            suggestion: r.remediation || 'Review and address this issue',
                                            severity: 'warning' as const,
                                        }))}
                                        evaluatedRules={panelAuditRules.length > 0 ? panelAuditRules.map((r: any) => ({
                                            ruleName: r.ruleName,
                                            isPassing: r.isPassing,
                                        })) : undefined}
                                        onRuleClick={(ruleId) => {
                                            console.log('Rule clicked:', ruleId);
                                        }}
                                    />
                                );
                            })()}
                        </div>

                        {/* Pass History & Content Viewer */}
                        {databaseJobInfo && businessInfo && (
                            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Pass History & Content Viewer</h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    View structural changes and content at each pass. Click a pass to see details, then "View Content" to see the draft at that stage.
                                </p>
                                <PassDiffViewer
                                    jobId={databaseJobInfo.jobId}
                                    structuralSnapshots={databaseJobInfo.structuralSnapshots || {}}
                                    qualityScores={databaseJobInfo.passQualityScores || {}}
                                    qualityWarning={databaseJobInfo.qualityWarning}
                                    supabaseUrl={businessInfo.supabaseUrl}
                                    supabaseAnonKey={businessInfo.supabaseAnonKey}
                                    enableContentViewing={true}
                                    onRollback={(passNumber) => {
                                        console.log('[DraftingModal] Rollback requested to pass:', passNumber);
                                        dispatch({ type: 'SET_NOTIFICATION', payload: `Rolled back to pass ${passNumber}. Refresh to see changes.` });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ) : activeTab === 'debug' ? (
                    <div className="h-full overflow-y-auto">
                        {brief && draftContent && (
                            <ContentAnalysisPanel
                                brief={brief}
                                draft={draftContent}
                                sections={[]} // Sections will be loaded by the panel if needed
                                job={databaseJobInfo ? {
                                    id: databaseJobInfo.jobId,
                                    draft_content: draftContent,
                                    status: databaseJobInfo.jobStatus,
                                    current_pass: databaseJobInfo.currentPass
                                } as any : undefined}
                                businessInfo={businessInfo}
                                onExport={async (format) => {
                                    if (!brief || !businessInfo) return;
                                    // Minimal export for now
                                    const debugData = {
                                        exportedAt: new Date().toISOString(),
                                        brief,
                                        draftContent,
                                        job: databaseJobInfo,
                                        passSnapshots: getPassSnapshots(databaseJobInfo?.jobId || ''),
                                    };
                                    if (format === 'clipboard') {
                                        const text = JSON.stringify(debugData, null, 2);
                                        await navigator.clipboard.writeText(text);
                                        dispatch({ type: 'SET_NOTIFICATION', payload: 'Debug data copied to clipboard' });
                                    } else {
                                        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `debug-${databaseJobInfo?.jobId || 'unknown'}.json`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }
                                }}
                            />
                        )}
                        {(!brief || !draftContent) && (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <p>Generate content first to see analysis</p>
                            </div>
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
        {showAuditPanel && auditIssues.length > 0 && brief && (
            <div className="border-t border-gray-700 bg-gray-850 max-h-[300px] overflow-y-auto">
                <div className="flex items-center justify-between p-2 bg-gray-800">
                    <span className="text-sm font-medium text-gray-200">
                        Audit Issues ({auditIssues.filter(i => !i.fixApplied).length} pending)
                    </span>
                    <button
                        onClick={() => setShowAuditPanel(false)}
                        className="text-gray-400 hover:text-white p-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-4">
                    <AuditIssuesPanel
                        issues={auditIssues}
                        draft={draftContent}
                        brief={brief}
                        businessInfo={businessInfo}
                        onApplyFix={handleApplyAuditFix}
                        onDismiss={handleDismissAuditIssue}
                    />
                </div>
            </div>
        )}

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
                        onClick={handleCopyHtml}
                        disabled={!draftContent}
                        variant="secondary"
                        className="text-xs py-0.5 px-2 bg-blue-600/20 !text-blue-400 hover:bg-blue-600/40 hover:!text-blue-300 border border-blue-500/30"
                        title="Copy article HTML to clipboard (WordPress-ready, no document wrapper)"
                    >
                        📋 Copy HTML
                    </Button>
                    <Button
                        onClick={handleDownloadHtml}
                        disabled={!draftContent}
                        variant="secondary"
                        className="text-xs py-0.5 px-2 bg-emerald-600/20 !text-emerald-400 hover:bg-emerald-600/40 hover:!text-emerald-300 border border-emerald-500/30"
                        title="Download complete HTML document with schema markup, Open Graph tags, and all formatting"
                    >
                        ⬇ HTML
                    </Button>
                    <Button
                        onClick={handleDownloadPackage}
                        disabled={!draftContent}
                        variant="secondary"
                        className="text-xs py-0.5 px-2 !bg-transparent !text-gray-400 hover:!text-white"
                        title="Download full article package (HTML, Markdown, brief, links, audit report, images)"
                    >
                        📦 Export All
                    </Button>
                </div>

                {/* Center: Main Actions */}
                <div className="flex items-center gap-1">
                    <Button
                        onClick={handlePolishDraft}
                        disabled={isPolishing || !draftContent || activeTab === 'preview' || !canGenerateContent}
                        className="text-xs py-1 px-3 bg-gray-600 hover:bg-gray-500 opacity-80"
                        title={!canGenerateContent ? (featureReason || 'Content generation requires a subscription upgrade') : "Optional: Refines intro as abstractive summary, converts dense paragraphs to lists, applies stylometry for author voice. Note: Pass 7 already handles intro synthesis."}
                    >
                        {isPolishing ? <Loader className="w-3 h-3"/> : '⚡ Polish'}
                    </Button>
                    <Button
                        onClick={() => onAnalyzeFlow(draftContent)}
                        variant="secondary"
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        className="text-xs py-1 px-2 bg-emerald-700 hover:bg-emerald-600"
                        title="Recommended: Analyzes contextual flow consistency around central entity, checks transition logic between sections, and validates semantic coherence with pillar topic."
                    >
                        ✓ Flow
                    </Button>
                    <Button
                        onClick={handleRunAudit}
                        variant="secondary"
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing || isRunningAudit}
                        className={`text-xs py-1 px-2 ${showAuditPanel ? 'bg-emerald-600' : 'bg-emerald-700 hover:bg-emerald-600'}`}
                        title="Run algorithmic audit and show issues with auto-fix suggestions"
                    >
                        {isRunningAudit ? <Loader className="w-3 h-3" /> : showAuditPanel ? '◉ Audit' : '✓ Audit'}
                        {auditIssues.filter(i => !i.fixApplied).length > 0 && (
                            <span className="ml-1 px-1 py-0.5 text-[10px] bg-red-600 rounded-full">
                                {auditIssues.filter(i => !i.fixApplied).length}
                            </span>
                        )}
                    </Button>
                    <Button
                        onClick={() => onGenerateSchema(brief)}
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        variant="secondary"
                        className="text-xs py-1 px-2"
                        title="Generate JSON-LD structured data with entity resolution (Wikidata), page type detection (Article, HowTo, FAQ, Product), and automatic validation."
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
                    <Button
                        onClick={() => setShowPublishModal(true)}
                        disabled={isLoading || !draftContent || isPolishing}
                        variant="secondary"
                        className="text-xs py-1 px-2 bg-blue-700 hover:bg-blue-600"
                        title="Publish to WordPress"
                    >
                        Publish to WP
                    </Button>
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
            setOpenInVisualEditor(false);
          }}
          placeholder={selectedPlaceholder}
          brandKit={businessInfo.brandKit}
          businessInfo={businessInfo}
          onInsert={handleImageInsert}
          openInVisualEditor={openInVisualEditor}
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
                { num: 4, key: 'pass_4_discourse', label: 'Pass 4: Discourse Integration', desc: 'Improve transitions and contextual bridges' },
                { num: 5, key: 'pass_5_microsemantics', label: 'Pass 5: Micro Semantics', desc: 'Linguistic optimization (modality, stop words, positioning)' },
                { num: 6, key: 'pass_6_visuals', label: 'Pass 6: Visual Semantics', desc: 'Add image placeholders with vocabulary-extending alt text' },
                { num: 7, key: 'pass_7_intro', label: 'Pass 7: Introduction Synthesis', desc: 'Rewrite introduction based on complete content' },
                { num: 8, key: 'pass_8_polish', label: 'Pass 8: Final Polish', desc: 'Publication-ready content refinement' },
                { num: 9, key: 'pass_9_audit', label: 'Pass 9: Final Audit', desc: 'Algorithmic content audit with scoring' },
                { num: 10, key: 'pass_10_schema', label: 'Pass 10: Schema Generation', desc: 'JSON-LD structured data with entity resolution' },
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

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setShowVersionHistory(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">📋 Draft Version History</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Current draft and {draftHistory.length} previous version{draftHistory.length !== 1 ? 's' : ''}.
                </p>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto flex-grow space-y-3">
              {/* Current Draft Section - Always show what's in the editor */}
              <div className="bg-teal-900/30 rounded-lg p-4 border-2 border-teal-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-teal-400">
                      Current Draft
                    </span>
                    <span className="text-xs text-teal-300 px-2 py-0.5 bg-teal-800 rounded">
                      {(draftContent?.length || 0).toLocaleString()} chars
                    </span>
                    <span className="text-xs text-teal-400 px-2 py-0.5 bg-teal-900 rounded">
                      Active in Editor
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-300 bg-gray-800 rounded p-2 max-h-24 overflow-hidden relative">
                  <div className="line-clamp-3">
                    {(draftContent || '').substring(0, 500)}...
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-800 to-transparent" />
                </div>
              </div>

              {/* Divider */}
              {draftHistory.length > 0 && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-grow h-px bg-gray-600" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Previous Versions</span>
                  <div className="flex-grow h-px bg-gray-600" />
                </div>
              )}

              {draftHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No previous versions yet. Version history is created automatically when you save changes.
                </p>
              ) : (
                draftHistory.map((version, index) => {
                  // Calculate relative time
                  const savedDate = new Date(version.saved_at);
                  const now = new Date();
                  const diffMs = now.getTime() - savedDate.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMins / 60);
                  const diffDays = Math.floor(diffHours / 24);
                  let relativeTime = '';
                  if (diffDays > 0) relativeTime = `${diffDays}d ago`;
                  else if (diffHours > 0) relativeTime = `${diffHours}h ago`;
                  else if (diffMins > 0) relativeTime = `${diffMins}m ago`;
                  else relativeTime = 'just now';

                  // Calculate size difference from current
                  const currentLength = draftContent?.length || 0;
                  const sizeDiff = version.char_count - currentLength;
                  const sizeDiffText = sizeDiff > 0 ? `+${sizeDiff.toLocaleString()}` : sizeDiff.toLocaleString();

                  return (
                    <div
                      key={`${version.version}-${version.saved_at}`}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-teal-500 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-white">
                            v{version.version}
                          </span>
                          <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-600 rounded">
                            {version.char_count.toLocaleString()} chars
                          </span>
                          {sizeDiff !== 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded ${sizeDiff > 0 ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>
                              {sizeDiffText} vs current
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400 block">{relativeTime}</span>
                          <span className="text-xs text-gray-500">{savedDate.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 bg-gray-800 rounded p-2 mb-3 max-h-24 overflow-hidden relative">
                        <div className="line-clamp-3">
                          {version.content.substring(0, 500)}...
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-800 to-transparent" />
                      </div>
                      <Button
                        onClick={() => handleRestoreVersion(version)}
                        disabled={isRestoringVersion}
                        className="w-full !py-2 text-sm bg-teal-600 hover:bg-teal-700"
                      >
                        {isRestoringVersion ? <Loader className="w-4 h-4" /> : '⏪ Restore This Version'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Tip: Previous versions show content BEFORE each save. Current draft is what's active now.
              </p>
              <Button variant="secondary" onClick={() => setShowVersionHistory(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish to WordPress Modal */}
      {brief && activeBriefTopic && (
        <PublishToWordPressModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          topic={activeBriefTopic}
          brief={brief}
          articleDraft={draftContent}
          onPublishSuccess={() => {
            setShowPublishModal(false);
            // Could refresh publication status here if needed
          }}
        />
      )}
    </div>
  );
};

export default DraftingModal;
