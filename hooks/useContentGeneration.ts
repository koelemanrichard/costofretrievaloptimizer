// hooks/useContentGeneration.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  ContentGenerationJob,
  ContentGenerationSection,
  ContentBrief,
  BusinessInfo,
  SEOPillars,
  EnrichedTopic,
  EnhancedSchemaResult,
  PASS_NAMES,
  QualityReport,
  SectionGenerationContext
} from '../types';
import {
  ContentGenerationOrchestrator,
  executePass1,
  executePass2,
  executePass3,   // Lists & Tables
  executePass4,   // Discourse Integration
  executePass5,   // Micro Semantics
  executePass6,   // Visual Semantics
  executePass7,   // Introduction Synthesis (AFTER body polish)
  executePass8,   // Final Polish
  executePass9,   // Final Audit
  executePass10   // Schema Generation
} from '../services/ai/contentGeneration';
import {
  createEmptyProgressiveData,
  collectFromPass,
  collectFromPass8
} from '../services/ai/contentGeneration/progressiveSchemaCollector';
import { extractPlaceholdersFromDraft } from '../services/ai/imageGeneration/placeholderParser';
import type { PassDelta } from '../services/ai/contentGeneration/tracking';
import { runAlgorithmicAudit } from '../services/ai/contentGeneration/passes/auditChecks';
import type { AuditDetails, ValidationViolation } from '../types';
import {
  captureFromSections,
  compareSnapshots,
  summarizeDiff,
  type StructuralSnapshot,
  type SnapshotDiff
} from '../services/ai/contentGeneration/structuralValidator';
import {
  evaluateStrategy,
  type StrategyChecklist
} from '../services/contentStrategyEnforcer';
import {
  storePassSnapshot,
  storeSectionVersion,
  runValidationGate,
  type PassSnapshot
} from '../services/contentGenerationDebugger';

/**
 * PERFORMANCE: Yield to main thread between passes
 * This prevents the browser from becoming unresponsive during long-running generation
 * by allowing the event loop to process pending tasks (UI updates, user input, etc.)
 */
const yieldToMainThread = (): Promise<void> => {
  return new Promise(resolve => {
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 100 });
    } else {
      setTimeout(resolve, 50);
    }
  });
};

/**
 * PERFORMANCE: Clear unnecessary references to help garbage collection
 * Called between passes to reduce memory pressure
 */
const performMemoryCleanup = (): void => {
  // Hint to garbage collector (browsers may or may not honor this)
  if (typeof gc === 'function') {
    try {
      gc();
    } catch (e) {
      // gc() only available with --expose-gc flag, ignore errors
    }
  }
};

// Helper functions for building quality report
function buildCategoryScores(auditDetails: AuditDetails | null): Record<string, number> {
  if (!auditDetails?.algorithmicResults) return {};

  const categoryMap: Record<string, { passed: number; total: number }> = {};

  for (const result of auditDetails.algorithmicResults) {
    // Extract category from ruleName (e.g., "CENTERPIECE_CHECK" -> "Centerpiece", "LLM_SIGNATURE_DETECTION" -> "LLM")
    // AuditRuleResult has: ruleName, isPassing, details, remediation
    const categoryMatch = result.ruleName?.match(/^([A-Z]+)_/);
    const category = categoryMatch ? categoryMatch[1] : 'Other';

    if (!categoryMap[category]) {
      categoryMap[category] = { passed: 0, total: 0 };
    }
    categoryMap[category].total++;
    // CRITICAL FIX: Use isPassing (correct property) not passed (wrong property)
    if (result.isPassing) {
      categoryMap[category].passed++;
    }
  }

  // Convert to percentage scores
  const scores: Record<string, number> = {};
  for (const [category, data] of Object.entries(categoryMap)) {
    scores[category] = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 100;
  }

  return scores;
}

function buildViolations(auditDetails: AuditDetails | null): QualityReport['violations'] {
  if (!auditDetails?.algorithmicResults) return [];

  return auditDetails.algorithmicResults
    // CRITICAL FIX: Use isPassing (correct property) not passed (wrong property)
    .filter(r => !r.isPassing)
    .map(r => ({
      rule: r.ruleName || 'Unknown',
      text: r.details || '',
      severity: 'warning' as const,  // AuditRuleResult doesn't have severity, default to warning
      suggestion: r.remediation || ''
    }));
}

function buildSystemicChecks(job: ContentGenerationJob): QualityReport['systemicChecks'] {
  const checks: QualityReport['systemicChecks'] = [];

  // Word count check
  const wordCount = job.draft_content?.split(/\s+/).length || 0;
  checks.push({
    checkId: 'word_count',
    name: 'Word Count',
    status: wordCount >= 1500 ? 'pass' : wordCount >= 800 ? 'warning' : 'fail',
    value: `${wordCount} words`
  });

  // Image count check
  const imageCount = (job.draft_content?.match(/!\[/g) || []).length +
    (job.draft_content?.match(/\[IMAGE_PLACEHOLDER/g) || []).length;
  checks.push({
    checkId: 'image_count',
    name: 'Image Balance',
    status: imageCount >= 3 ? 'pass' : imageCount >= 1 ? 'warning' : 'fail',
    value: `${imageCount} images/placeholders`
  });

  // Section count
  const sectionCount = (job.draft_content?.match(/^##\s/gm) || []).length;
  checks.push({
    checkId: 'section_count',
    name: 'Section Structure',
    status: sectionCount >= 4 ? 'pass' : sectionCount >= 2 ? 'warning' : 'fail',
    value: `${sectionCount} sections`
  });

  // Audit score check
  const auditScore = job.final_audit_score || 0;
  checks.push({
    checkId: 'audit_score',
    name: 'Audit Score',
    status: auditScore >= 70 ? 'pass' : auditScore >= 50 ? 'warning' : 'fail',
    value: `${auditScore}%`
  });

  // Schema check
  checks.push({
    checkId: 'schema_generated',
    name: 'Schema Generated',
    status: job.schema_data ? 'pass' : 'warning',
    value: job.schema_data ? (job.schema_data as any).pageType || 'Generated' : 'Pending'
  });

  return checks;
}

/**
 * Get violations from draft content using algorithmic audit
 * Converts AuditRuleResult[] to ValidationViolation[] for PassTracker
 */
function getViolationsFromContent(
  draft: string,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): ValidationViolation[] {
  if (!draft || draft.length < 100) return []; // Skip for minimal content

  try {
    const auditResults = runAlgorithmicAudit(draft, brief, businessInfo);
    return auditResults
      .filter(r => !r.isPassing)
      .map(r => ({
        // AuditRuleResult has ruleName not rule
        rule: r.ruleName || 'UNKNOWN',
        text: r.details || '',
        position: 0,
        severity: 'warning' as const,  // AuditRuleResult doesn't have severity
        suggestion: r.remediation || ''
      }));
  } catch (err) {
    console.warn('[PassTracker] Failed to get violations:', err);
    return [];
  }
}

/**
 * Calculate PassDelta by comparing violations before and after a pass
 */
function calculatePassDelta(
  passNumber: number,
  violationsBefore: ValidationViolation[],
  violationsAfter: ValidationViolation[]
): PassDelta {
  const rulesBefore = new Set(violationsBefore.map(v => v.rule));
  const rulesAfter = new Set(violationsAfter.map(v => v.rule));

  const rulesFixed: string[] = [];
  const rulesRegressed: string[] = [];
  const rulesUnchanged: string[] = [];

  // Find rules that were fixed (in before but not in after)
  for (const rule of rulesBefore) {
    if (!rulesAfter.has(rule)) {
      rulesFixed.push(rule);
    } else {
      rulesUnchanged.push(rule);
    }
  }

  // Find rules that regressed (in after but not in before)
  for (const rule of rulesAfter) {
    if (!rulesBefore.has(rule)) {
      rulesRegressed.push(rule);
    }
  }

  const netChange = rulesFixed.length - rulesRegressed.length;

  // Determine recommendation based on net change
  let recommendation: 'accept' | 'revert' | 'review' = 'accept';
  if (netChange < -2) {
    recommendation = 'revert';
  } else if (netChange < 0) {
    recommendation = 'review';
  }

  return {
    passNumber,
    rulesFixed,
    rulesRegressed,
    rulesUnchanged,
    netChange,
    recommendation
  };
}

/**
 * Calculate quality score from audit results
 * Returns a percentage (0-100) based on passing rules
 */
function calculateQualityScore(auditResults: AuditRuleResult[]): number {
  if (!auditResults || auditResults.length === 0) return 100;
  const passing = auditResults.filter(r => r.isPassing).length;
  return Math.round((passing / auditResults.length) * 100);
}

/**
 * Quality gating result for tracking score changes between passes
 */
interface QualityGateResult {
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  hasRegression: boolean;
  hasSevereRegression: boolean;
}

/**
 * Check quality gate between passes
 * Warns if quality decreases significantly
 */
function checkQualityGate(
  draft: string,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  passNumber: number,
  previousScore: number | null,
  onLog: (message: string, type: 'info' | 'success' | 'warning' | 'failure') => void
): QualityGateResult {
  // Run audit on current content
  const auditResults = draft && draft.length > 100
    ? runAlgorithmicAudit(draft, brief, businessInfo)
    : [];

  const scoreAfter = calculateQualityScore(auditResults);
  const scoreBefore = previousScore ?? scoreAfter; // First pass has no previous
  const delta = scoreAfter - scoreBefore;

  const hasRegression = delta < -5;
  const hasSevereRegression = delta < -15;

  // Log quality changes
  if (hasSevereRegression) {
    console.warn(`[QualityGate] Pass ${passNumber}: SEVERE quality regression! Score dropped from ${scoreBefore}% to ${scoreAfter}% (${delta})`);
    onLog(`Pass ${passNumber}: Quality dropped significantly (${scoreBefore}% → ${scoreAfter}%)`, 'warning');
  } else if (hasRegression) {
    console.warn(`[QualityGate] Pass ${passNumber}: Quality regression. Score changed from ${scoreBefore}% to ${scoreAfter}% (${delta})`);
    onLog(`Pass ${passNumber}: Quality slightly decreased (${scoreBefore}% → ${scoreAfter}%)`, 'warning');
  } else if (delta > 5) {
    console.log(`[QualityGate] Pass ${passNumber}: Quality improved! Score: ${scoreBefore}% → ${scoreAfter}% (+${delta})`);
    onLog(`Pass ${passNumber}: Quality improved (${scoreBefore}% → ${scoreAfter}%)`, 'success');
  } else {
    console.log(`[QualityGate] Pass ${passNumber}: Quality stable. Score: ${scoreAfter}%`);
  }

  return {
    scoreBefore,
    scoreAfter,
    delta,
    hasRegression,
    hasSevereRegression
  };
}

import type { ContentGenerationSettings, ContentGenerationPriorities } from '../types/contentGeneration';
import type { AuditRuleResult } from '../types';

interface UseContentGenerationProps {
  briefId: string;
  mapId: string;
  userId: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  pillars?: SEOPillars;
  topic?: EnrichedTopic;
  /** Generation settings including priorities and pass control */
  generationSettings?: ContentGenerationSettings;
  onLog: (message: string, status: 'info' | 'success' | 'failure' | 'warning') => void;
  onComplete?: (draft: string, auditScore: number, schemaResult?: EnhancedSchemaResult) => void;
  externalRefreshTrigger?: number; // From global state - triggers re-check when incremented
}

interface UseContentGenerationReturn {
  job: ContentGenerationJob | null;
  sections: ContentGenerationSection[];
  isGenerating: boolean;
  isPaused: boolean;
  isComplete: boolean;
  isFailed: boolean;
  progress: number;
  currentPassName: string;
  startGeneration: () => Promise<void>;
  pauseGeneration: () => Promise<void>;
  resumeGeneration: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
  retryGeneration: () => Promise<void>;
  triggerJobRefresh: () => void; // Trigger re-check of job state (for re-run scenarios)
  error: string | null;
}

export function useContentGeneration({
  briefId,
  mapId,
  userId,
  businessInfo,
  brief,
  pillars,
  topic,
  generationSettings,
  onLog,
  onComplete,
  externalRefreshTrigger
}: UseContentGenerationProps): UseContentGenerationReturn {
  const [job, setJob] = useState<ContentGenerationJob | null>(null);
  const [sections, setSections] = useState<ContentGenerationSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Brief caching: stores fetched brief to avoid redundant database queries during generation
  const [cachedBrief, setCachedBrief] = useState<{ briefId: string; data: ContentBrief } | null>(null);
  const abortRef = useRef(false);
  const orchestratorRef = useRef<ContentGenerationOrchestrator | null>(null);

  const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

  // Initialize orchestrator
  useEffect(() => {
    orchestratorRef.current = new ContentGenerationOrchestrator(
      businessInfo.supabaseUrl,
      businessInfo.supabaseAnonKey,
      {
        onPassStart: (num, name) => onLog(`Starting Pass ${num}: ${name}`, 'info'),
        onPassComplete: (num) => onLog(`Completed Pass ${num}`, 'success'),
        onSectionStart: (key, heading) => onLog(`Generating: ${heading}`, 'info'),
        onSectionComplete: (key) => onLog(`Section complete`, 'success'),
        onError: (err, ctx) => onLog(`Error in ${ctx}: ${err.message}`, 'failure'),
        onJobComplete: (score) => onLog(`Generation complete! Score: ${score}%`, 'success')
      }
    );
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, onLog]);

  // PERFORMANCE FIX: Completely disable realtime subscriptions during active generation
  // Realtime updates were causing browser freezes due to constant state updates
  // Instead, the UI updates are driven by the generation loop itself
  // Only subscribe to realtime when generation is NOT running (for viewing completed jobs)
  useEffect(() => {
    // Skip realtime subscriptions entirely during active generation
    // The generation loop handles all state updates directly
    const isCurrentlyGenerating = job?.status === 'in_progress';
    if (!job?.id || isCurrentlyGenerating) return;

    const jobChannel = supabase
      .channel(`job-${job.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_generation_jobs',
        filter: `id=eq.${job.id}`
      }, (payload) => {
        setJob(payload.new as ContentGenerationJob);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
    };
  }, [job?.id, job?.status, supabase]);

  // Handle browser tab visibility changes - refetch state when tab becomes visible
  // This handles stale state after browser throttles background tabs
  useEffect(() => {
    if (!job?.id || !orchestratorRef.current) return;

    let lastVisibleTime = Date.now();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastVisible = Date.now() - lastVisibleTime;

        // If tab was hidden for more than 5 seconds, refresh job state
        if (timeSinceLastVisible > 5000) {
          console.log(`[useContentGeneration] Tab became visible after ${Math.round(timeSinceLastVisible / 1000)}s - refreshing job state`);

          try {
            // Refetch job state from database
            const freshJob = await orchestratorRef.current!.getJobWithDraft(job.id);
            if (freshJob) {
              setJob(freshJob);

              // Also refetch sections
              const freshSections = await orchestratorRef.current!.getSections(job.id);
              setSections(freshSections.sort((a, b) => a.section_order - b.section_order));

              console.log(`[useContentGeneration] Refreshed: pass=${freshJob.current_pass}, status=${freshJob.status}`);
            }
          } catch (err) {
            console.warn('[useContentGeneration] Failed to refresh job state on visibility change:', err);
          }
        }

        lastVisibleTime = Date.now();
      } else {
        // Tab is being hidden - record the time
        lastVisibleTime = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [job?.id]);

  // Track external refresh requests (e.g., from DraftingModal after re-run configuration)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Expose a function to trigger job refresh (for external callers like DraftingModal)
  const triggerJobRefresh = useCallback(() => {
    console.log('[useContentGeneration] External refresh triggered');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Track briefId changes to reset state
  const previousBriefIdRef = useRef<string | null>(null);

  // Check for existing job on mount (including completed jobs) and auto-resume if needed
  useEffect(() => {
    const checkExisting = async () => {
      if (!orchestratorRef.current || !briefId) return;

      // CRITICAL: Reset state when briefId changes to prevent showing stale data from previous brief
      if (previousBriefIdRef.current !== null && previousBriefIdRef.current !== briefId) {
        console.log('[useContentGeneration] Brief changed from', previousBriefIdRef.current, 'to', briefId, '- resetting state');
        setJob(null);
        setSections([]);
        setError(null);
        // Clear cached brief when switching to a different brief
        setCachedBrief(null);
      }
      previousBriefIdRef.current = briefId;

      try {
        // First check for ANY job (including completed) to restore state
        const latestJob = await orchestratorRef.current.getLatestJob(briefId);
        if (latestJob) {
          setJob(latestJob);
          const existingSections = await orchestratorRef.current.getSections(latestJob.id);
          setSections(existingSections);

          // For COMPLETED jobs on page load: Check DATABASE for existing article_draft
          // The user's saved content (via Polish/Flow/Audit) is in content_briefs.article_draft
          // That is the source of truth - not the job's draft_content or React state
          //
          // Only sync job content to brief if:
          // 1. content_briefs.article_draft is empty in the DATABASE
          // 2. This means no user has saved any work yet
          //
          // If database already has content, the user may have:
          // - Polished the draft (shorter, optimized)
          // - Run Flow optimization
          // - Run Audit fixes
          // We must NOT overwrite their work!
          if (latestJob.status === 'completed' && onComplete) {
            const jobDraftContent = latestJob.draft_content || '';

            // Check DATABASE for existing article_draft (not React state which may be stale)
            const { data: briefData } = await supabase
              .from('content_briefs')
              .select('article_draft')
              .eq('id', briefId)
              .single();

            const dbArticleDraft = briefData?.article_draft || '';

            if (dbArticleDraft.trim().length > 0) {
              // Database already has user-saved content - DO NOT overwrite
              console.log('[useContentGeneration] Completed job found, but database already has article_draft:', dbArticleDraft.length, 'chars');
              console.log('[useContentGeneration] NOT syncing job content to preserve user\'s saved work (Polish/Flow/Audit)');
              // Still log comparison for debugging
              if (existingSections.length > 0) {
                const assembledDraft = await orchestratorRef.current.assembleDraft(latestJob.id);
                console.log('[useContentGeneration] FYI - job.draft_content:', jobDraftContent.length, 'chars, assembled sections:', assembledDraft.length, 'chars, DB article_draft:', dbArticleDraft.length, 'chars');
              }
            } else {
              // Database has NO article_draft - this is initial sync after generation completed
              // Use job.draft_content (optimized through passes 1-9)
              console.log('[useContentGeneration] Database has no article_draft, syncing from completed job');

              let assembledDraft = '';
              if (existingSections.length > 0) {
                assembledDraft = await orchestratorRef.current.assembleDraft(latestJob.id);
                console.log('[useContentGeneration] Content comparison - job.draft_content:', jobDraftContent.length, 'chars, assembled sections:', assembledDraft.length, 'chars');
              }

              // Use job.draft_content as primary source, fall back to sections only if empty
              let draftToSync = jobDraftContent;
              let source = 'job.draft_content (optimized)';

              if (!jobDraftContent && assembledDraft) {
                draftToSync = assembledDraft;
                source = 'assembled_sections (fallback - no optimized content)';
                console.log('[useContentGeneration] No job.draft_content, falling back to assembled sections');
              }

              if (draftToSync) {
                console.log('[useContentGeneration] Syncing draft to brief from', source + ':', draftToSync.length, 'chars');
                const schemaResult = latestJob.schema_data as EnhancedSchemaResult | undefined;
                onComplete(draftToSync, latestJob.final_audit_score || 0, schemaResult);
              } else {
                console.warn('[useContentGeneration] No draft content found in completed job');
              }
            }
          }
          // Auto-resume in_progress or pending jobs after page refresh
          else if (latestJob.status === 'in_progress' || latestJob.status === 'pending') {
            console.log('[useContentGeneration] Auto-resuming job:', latestJob.id, 'status:', latestJob.status);
            onLog('Resuming generation after page refresh...', 'info');
            abortRef.current = false;
            // Mark as in_progress if it was pending
            if (latestJob.status === 'pending') {
              await orchestratorRef.current.updateJob(latestJob.id, { status: 'in_progress' });
            }
            setJob({ ...latestJob, status: 'in_progress' });
            // Run passes with a small delay to ensure state is set
            setTimeout(() => {
              if (orchestratorRef.current) {
                runPasses(orchestratorRef.current, { ...latestJob, status: 'in_progress' });
              }
            }, 100);
          }
        } else {
          // No job found for this brief - ensure state is clean
          console.log('[useContentGeneration] No existing job found for brief:', briefId);
          setJob(null);
          setSections([]);
        }
      } catch (err) {
        // Silently ignore - no existing job
        console.debug('No existing job found:', err);
        setJob(null);
        setSections([]);
      }
    };
    checkExisting();
  }, [briefId, refreshTrigger, externalRefreshTrigger]); // Added refreshTrigger and externalRefreshTrigger for re-check requests

  const runPasses = async (orchestrator: ContentGenerationOrchestrator, currentJob: ContentGenerationJob) => {
    // Debug: Log what pass we're starting from
    console.log(`[runPasses] Starting execution from current_pass: ${currentJob.current_pass}, status: ${currentJob.status}`);
    console.log(`[runPasses] passes_status:`, JSON.stringify(currentJob.passes_status, null, 2));

    let updatedJob = currentJob;
    const shouldAbort = () => abortRef.current;

    // CRITICAL FIX: Fetch fresh brief from database to ensure edits are used
    // The 'brief' from hook props may be stale if user edited it before clicking Generate
    // OPTIMIZATION: Use cached brief if available and matches current briefId
    let activeBrief = brief;
    if (cachedBrief && cachedBrief.briefId === briefId) {
      // Use cached brief - avoids redundant database query
      activeBrief = cachedBrief.data;
      console.log('[runPasses] Using cached brief:', {
        sections: activeBrief.structured_outline?.length || 0,
        title: activeBrief.title
      });
    } else {
      // Fetch fresh brief from database and cache it
      try {
        const { data: freshBrief, error: briefError } = await supabase
          .from('content_briefs')
          .select('*')
          .eq('id', briefId)
          .single();

        if (!briefError && freshBrief) {
          // Use the fresh brief from database
          activeBrief = freshBrief as unknown as ContentBrief;
          // Cache the fetched brief
          setCachedBrief({ briefId, data: activeBrief });
          console.log('[runPasses] Fetched and cached brief from database:', {
            sections: activeBrief.structured_outline?.length || 0,
            title: activeBrief.title
          });
        } else {
          console.warn('[runPasses] Could not fetch fresh brief, using prop value:', briefError?.message);
        }
      } catch (err) {
        console.warn('[runPasses] Error fetching fresh brief:', err);
        // Fall back to prop brief if fetch fails
      }
    }

    // Ensure businessInfo has required fields with defaults
    // Include generation priorities for prompt customization
    const safeBusinessInfo: BusinessInfo & { generationPriorities?: ContentGenerationPriorities } = {
      ...businessInfo,
      language: businessInfo?.language || 'English',
      targetMarket: businessInfo?.targetMarket || 'Global',
      aiProvider: businessInfo?.aiProvider || 'gemini',
      generationPriorities: generationSettings?.priorities,
    };

    // Real quality tracking: collect PassDeltas during pass execution
    const collectedDeltas: PassDelta[] = [];
    let violationsBeforePass: ValidationViolation[] = [];

    // Helper to capture violations for delta tracking
    const captureViolations = () => {
      return getViolationsFromContent(
        updatedJob.draft_content || '',
        activeBrief,
        safeBusinessInfo
      );
    };

    // Helper to track pass completion and calculate delta
    const trackPassCompletion = (passNumber: number) => {
      try {
        const violationsAfterPass = captureViolations();
        const delta = calculatePassDelta(passNumber, violationsBeforePass, violationsAfterPass);
        collectedDeltas.push(delta);

        // Log meaningful changes
        if (delta.rulesFixed.length > 0 || delta.rulesRegressed.length > 0) {
          const msg = `Pass ${passNumber}: ${delta.rulesFixed.length} rules fixed, ${delta.rulesRegressed.length} regressed (net: ${delta.netChange > 0 ? '+' : ''}${delta.netChange})`;
          onLog(msg, delta.netChange >= 0 ? 'success' : 'warning');
        }

        // Update violationsBeforePass for next pass
        violationsBeforePass = violationsAfterPass;
      } catch (err) {
        console.warn(`[PassTracker] Failed to track pass ${passNumber}:`, err);
      }
    };

    // Log generation settings being used
    if (generationSettings?.priorities) {
      const p = generationSettings.priorities;
      onLog(`Using priorities: Readability ${p.humanReadability}%, Business ${p.businessConversion}%, SEO ${p.machineOptimization}%`, 'info');
    }

    // Helper to collect and save progressive schema data
    const collectProgressiveData = async (passNumber: number, draftContent: string) => {
      try {
        const existingData = updatedJob.progressive_schema_data || createEmptyProgressiveData();
        const newData = collectFromPass(existingData, passNumber, draftContent, activeBrief);

        await orchestrator.updateJob(updatedJob.id, {
          progressive_schema_data: newData
        });

        // Update local job state
        updatedJob = { ...updatedJob, progressive_schema_data: newData };
      } catch (err) {
        console.warn(`[Progressive] Failed to collect data for pass ${passNumber}:`, err);
        // Don't fail the pass if progressive collection fails
      }
    };

    // Structural snapshot tracking for compounding improvements visibility
    let lastStructuralSnapshot: StructuralSnapshot | null = null;
    const structuralDiffs: Record<number, SnapshotDiff> = {};

    // Quality score tracking for quality gating between passes
    let lastQualityScore: number | null = null;
    const qualityScores: Record<number, QualityGateResult> = {};

    // Helper to capture structural snapshot and compare with previous
    const captureAndLogStructuralChanges = async (passNumber: number) => {
      try {
        const currentSections = await orchestrator.getSections(updatedJob.id);
        const snapshot = captureFromSections(currentSections, passNumber);

        if (lastStructuralSnapshot) {
          const diff = compareSnapshots(lastStructuralSnapshot, snapshot);
          structuralDiffs[passNumber] = diff;

          // Log the diff for visibility
          const diffSummary = summarizeDiff(diff);
          console.log(`[Structural] ${diffSummary}`);

          // Log to UI if there are meaningful changes
          if (diff.hasRegressions) {
            onLog(`Pass ${passNumber}: ${diff.regressions.join(', ')}`, 'warning');
          } else if (diff.hasImprovements) {
            onLog(`Pass ${passNumber}: ${diff.improvements.join(', ')}`, 'success');
          }
        } else {
          // First snapshot - just log the baseline
          console.log(`[Structural] Baseline: ${snapshot.elements.wordCount} words, ${snapshot.elements.images} images, ${snapshot.elements.lists} lists, ${snapshot.elements.tables} tables`);
        }

        lastStructuralSnapshot = snapshot;

        // Store snapshots in job metadata for UI access
        // (Database migration pending - this will work once column exists)
        try {
          const existingSnapshots = (updatedJob as any).structural_snapshots || {};
          await orchestrator.updateJob(updatedJob.id, {
            structural_snapshots: {
              ...existingSnapshots,
              [`pass_${passNumber}`]: snapshot
            }
          } as any);
        } catch (dbErr) {
          // Column may not exist yet - just log to console
          console.debug(`[Structural] DB storage pending migration - snapshot logged to console`);
        }
      } catch (err) {
        console.warn(`[Structural] Failed to capture snapshot for pass ${passNumber}:`, err);
      }
    };

    // Helper to check quality gate and store results
    const checkAndStoreQualityGate = async (passNumber: number) => {
      try {
        const draftContent = updatedJob.draft_content || '';
        const result = checkQualityGate(
          draftContent,
          activeBrief,
          safeBusinessInfo,
          passNumber,
          lastQualityScore,
          onLog
        );

        qualityScores[passNumber] = result;
        lastQualityScore = result.scoreAfter;

        // Store quality scores in job metadata for UI access
        // (Database migration pending - this will work once column exists)
        try {
          const existingScores = (updatedJob as any).pass_quality_scores || {};
          await orchestrator.updateJob(updatedJob.id, {
            pass_quality_scores: {
              ...existingScores,
              [`pass_${passNumber}`]: result.scoreAfter
            },
            // Add quality warning if severe regression
            ...(result.hasSevereRegression ? {
              quality_warning: `Pass ${passNumber} caused significant quality regression (${result.scoreBefore}% → ${result.scoreAfter}%)`
            } : {})
          } as any);
        } catch (dbErr) {
          // Column may not exist yet - just log to console
          console.debug(`[QualityGate] DB storage pending migration - score logged to console`);
        }
      } catch (err) {
        console.warn(`[QualityGate] Failed to check quality gate for pass ${passNumber}:`, err);
      }
    };

    // Helper to store pass snapshot for debugging
    let previousDraftContent = '';
    const storeDebugSnapshot = async (passNumber: number, passName: string) => {
      if (!generationSettings?.storePassSnapshots) return;

      try {
        const currentDraft = updatedJob.draft_content || '';
        const sections = await orchestrator.getSections(updatedJob.id);

        const snapshot: PassSnapshot = {
          passNumber,
          passName,
          timestamp: new Date().toISOString(),
          beforeContent: previousDraftContent,
          afterContent: currentDraft,
          sectionsModified: sections.filter(s => {
            const passKey = `pass_${passNumber}_content` as keyof typeof s;
            return s[passKey] != null;
          }).map(s => s.section_key),
          wordCountBefore: previousDraftContent.split(/\s+/).filter(Boolean).length,
          wordCountAfter: currentDraft.split(/\s+/).filter(Boolean).length,
          validationResult: qualityScores[passNumber] ? {
            passed: !qualityScores[passNumber].hasSevereRegression,
            score: qualityScores[passNumber].scoreAfter,
            violations: [],
            warnings: []
          } : undefined
        };

        storePassSnapshot(updatedJob.id, snapshot);
        previousDraftContent = currentDraft;

        // Also store individual section versions
        for (const section of sections) {
          const passKey = `pass_${passNumber}_content` as keyof typeof section;
          const content = section[passKey] as string | null | undefined;
          if (content) {
            storeSectionVersion(updatedJob.id, section.section_key, passNumber, content);
          }
        }
      } catch (err) {
        console.warn(`[DebugSnapshot] Failed to store snapshot for pass ${passNumber}:`, err);
      }
    };

    // Helper to run validation gate between passes
    const runInterPassValidation = async (passNumber: number): Promise<boolean> => {
      const validationMode = generationSettings?.validationMode ?? 'hard';
      if (validationMode === 'soft') return true; // Skip validation in soft mode

      try {
        const sections = await orchestrator.getSections(updatedJob.id);
        const currentDraft = updatedJob.draft_content || '';

        const gateResult = runValidationGate(
          validationMode,
          activeBrief,
          sections,
          currentDraft,
          passNumber
        );

        // Log validation result
        if (!gateResult.passed) {
          onLog(`Validation gate after Pass ${passNumber}: ${gateResult.errors.length} errors`, 'warning');
          gateResult.errors.forEach(e => console.error(`[ValidationGate] ${e}`));
        }

        if (gateResult.warnings.length > 0) {
          console.warn(`[ValidationGate] Warnings after Pass ${passNumber}:`, gateResult.warnings);
        }

        // In checkpoint mode with issues, set job to checkpoint status
        if (gateResult.requiresCheckpoint) {
          await orchestrator.updateJob(updatedJob.id, {
            status: 'checkpoint',
            quality_warning: `Checkpoint required after Pass ${passNumber}: ${gateResult.errors.join('; ')}`
          } as any);
          onLog(`Checkpoint required after Pass ${passNumber} - review needed`, 'warning');
          return false; // Don't proceed automatically
        }

        // In hard mode, don't proceed if validation failed
        if (!gateResult.canProceed) {
          await orchestrator.updateJob(updatedJob.id, {
            status: 'failed',
            quality_warning: `Validation failed after Pass ${passNumber}: ${gateResult.errors.join('; ')}`
          } as any);
          onLog(`Generation stopped after Pass ${passNumber} - validation failed`, 'failure');
          return false;
        }

        return true;
      } catch (err) {
        console.warn(`[ValidationGate] Failed to run validation for pass ${passNumber}:`, err);
        return true; // Continue on error (don't block generation)
      }
    };

    try {
      // Pass 1: Draft Generation
      if (updatedJob.current_pass === 1) {
        // SMART BRIEF ANALYSIS: Show user what the AI detected
        const briefSectionCount = activeBrief.structured_outline?.length || 0;
        const briefImageCount = activeBrief.visual_semantics?.length || 0;
        const serpTargetWords = activeBrief.serpAnalysis?.avgWordCount || 0;
        const hasDetailedOutline = briefSectionCount >= 5;
        const hasVisualPlan = briefImageCount >= 2;
        const isComprehensiveBrief = hasDetailedOutline || hasVisualPlan || serpTargetWords > 1500;

        // Log what the AI analyzed
        onLog(`📊 Brief analysis: ${briefSectionCount} sections, ${briefImageCount} images, SERP target: ${serpTargetWords} words`, 'info');

        if (isComprehensiveBrief) {
          onLog(`🧠 AI Decision: Brief is comprehensive - generating full content (ignoring "${topic?.type || 'unknown'}" topic type preset)`, 'info');
        } else if (topic?.type === 'outer') {
          onLog(`🧠 AI Decision: Simple brief + outer topic - using shorter content format`, 'info');
        } else if (topic?.type === 'core') {
          onLog(`🧠 AI Decision: Core topic - using comprehensive content format`, 'info');
        } else {
          onLog(`🧠 AI Decision: Using standard content format`, 'info');
        }

        onLog('Pass 1: Generating draft section-by-section...', 'info');
        await executePass1(
          orchestrator,
          updatedJob,
          activeBrief,
          safeBusinessInfo,
          (key, heading, current, total) => {
            onLog(`Section ${current}/${total}: ${heading}`, 'success');
          },
          shouldAbort,
          {
            settings: generationSettings,
            topicType: topic?.type ?? 'unknown'
          }
        );
        if (shouldAbort()) return;
        // Refresh job state
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 1
        await collectProgressiveData(1, updatedJob.draft_content || '');
        // Capture baseline structural snapshot
        await captureAndLogStructuralChanges(1);
        // Check quality gate (baseline for future comparisons)
        await checkAndStoreQualityGate(1);
        // Initialize violation tracking after draft generation
        violationsBeforePass = captureViolations();

        // STRATEGY VALIDATION: Check if draft meets basic requirements before proceeding
        try {
          const sections = await orchestrator.getSections(updatedJob.id);
          const strategyCheck = evaluateStrategy({
            brief: activeBrief,
            draft: updatedJob.draft_content || '',
            sections,
          });

          console.log('[Strategy Check] After Pass 1:', {
            compliance: strategyCheck.overallCompliance,
            blockers: strategyCheck.blockers.length,
            warnings: strategyCheck.warnings.length,
          });

          // Log blockers as warnings (don't fail, but alert user)
          if (strategyCheck.blockers.length > 0) {
            onLog(`Strategy validation found ${strategyCheck.blockers.length} issue(s) after draft generation`, 'warning');
            strategyCheck.blockers.forEach(b => {
              console.warn(`[Strategy Blocker] ${b.name}: ${b.description}. Suggestion: ${b.suggestion}`);
            });
          }

          // Log compliance score
          onLog(`Draft compliance: ${strategyCheck.overallCompliance}%`, strategyCheck.overallCompliance >= 60 ? 'info' : 'warning');
        } catch (strategyError) {
          console.warn('[Strategy Check] Failed to run strategy validation:', strategyError);
          // Don't fail the pass if strategy check fails
        }

        // Store debug snapshot and run validation gate
        await storeDebugSnapshot(1, 'Draft Generation');
        const canProceed = await runInterPassValidation(1);
        if (!canProceed) return; // Stop if validation gate fails

        // PERFORMANCE: Yield to main thread and cleanup between passes
        await yieldToMainThread();
        performMemoryCleanup();
      }

      // Helper for section progress callbacks
      const makeSectionProgressCallback = (passNum: number, passName: string) =>
        (sectionKey: string, current: number, total: number) => {
          onLog(`Pass ${passNum} (${passName}): Section ${current}/${total}`, 'info');
        };

      // Pass 2: Headers (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      if (updatedJob.current_pass === 2) {
        // Capture violations before pass for delta tracking
        if (violationsBeforePass.length === 0) {
          violationsBeforePass = captureViolations();
        }
        onLog('Pass 2: Optimizing headers section-by-section...', 'info');
        await executePass2(
          orchestrator, updatedJob, activeBrief, safeBusinessInfo,
          makeSectionProgressCallback(2, 'Headers'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Capture structural snapshot
        await captureAndLogStructuralChanges(2);
        // Check quality gate
        await checkAndStoreQualityGate(2);
        // Track pass completion
        trackPassCompletion(2);
        // Store debug snapshot and run validation gate
        await storeDebugSnapshot(2, 'Headers');
        const canProceed2 = await runInterPassValidation(2);
        if (!canProceed2) return;

        // PERFORMANCE: Yield to main thread between passes
        await yieldToMainThread();
        performMemoryCleanup();
      }

      // Pass 3: Lists & Tables (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      if (updatedJob.current_pass === 3) {
        onLog('Pass 3: Optimizing lists section-by-section...', 'info');
        await executePass3(
          orchestrator, updatedJob, activeBrief, safeBusinessInfo,
          makeSectionProgressCallback(3, 'Lists'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 3 (lists/tables)
        await collectProgressiveData(3, updatedJob.draft_content || '');
        // Capture structural snapshot (critical - lists/tables added here)
        await captureAndLogStructuralChanges(3);
        // Check quality gate
        await checkAndStoreQualityGate(3);
        // Track pass completion
        trackPassCompletion(3);
        // Store debug snapshot and run validation gate
        await storeDebugSnapshot(3, 'Lists & Tables');
        const canProceed3 = await runInterPassValidation(3);
        if (!canProceed3) return;

        // PERFORMANCE: Yield to main thread between passes
        await yieldToMainThread();
        performMemoryCleanup();
      }

      // Pass 4: Discourse Integration (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      if (updatedJob.current_pass === 4) {
        onLog('Pass 4: Integrating discourse section-by-section...', 'info');
        await executePass4(
          orchestrator, updatedJob, activeBrief, safeBusinessInfo,
          makeSectionProgressCallback(4, 'Discourse'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Capture structural snapshot
        await captureAndLogStructuralChanges(4);
        // Check quality gate
        await checkAndStoreQualityGate(4);
        // Track pass completion
        trackPassCompletion(4);
        // Store debug snapshot and run validation gate
        await storeDebugSnapshot(4, 'Discourse Integration');
        const canProceed4 = await runInterPassValidation(4);
        if (!canProceed4) return;

        // PERFORMANCE: Yield to main thread between passes
        await yieldToMainThread();
        performMemoryCleanup();
      }

      // Pass 5: Micro Semantics (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      if (updatedJob.current_pass === 5) {
        onLog('Pass 5: Applying micro semantics section-by-section...', 'info');
        await executePass5(
          orchestrator, updatedJob, activeBrief, safeBusinessInfo,
          makeSectionProgressCallback(5, 'MicroSemantics'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 5 (keywords, entities)
        await collectProgressiveData(5, updatedJob.draft_content || '');
        // Capture structural snapshot
        await captureAndLogStructuralChanges(5);
        // Check quality gate
        await checkAndStoreQualityGate(5);
        // Track pass completion
        trackPassCompletion(5);
        // Store debug snapshot and run validation gate
        await storeDebugSnapshot(5, 'Micro Semantics');
        const canProceed5 = await runInterPassValidation(5);
        if (!canProceed5) return;

        // PERFORMANCE: Yield to main thread between passes
        await yieldToMainThread();
        performMemoryCleanup();
      }

      // Pass 6: Visual Semantics (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      // Uses visual_semantics from content brief as primary guide
      if (updatedJob.current_pass === 6) {
        onLog('Pass 6: Adding visual semantics section-by-section...', 'info');
        await executePass6(
          orchestrator, updatedJob, activeBrief, safeBusinessInfo,
          makeSectionProgressCallback(6, 'Visuals'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 6 (images)
        await collectProgressiveData(6, updatedJob.draft_content || '');

        // Extract and save image placeholders from Pass 6 output
        try {
          const placeholders = extractPlaceholdersFromDraft(updatedJob.draft_content || '');
          if (placeholders.length > 0) {
            await orchestrator.updateImagePlaceholders(updatedJob.id, placeholders);
            onLog(`Found ${placeholders.length} image placeholder(s)`, 'info');
          }
        } catch (err) {
          console.warn('[Pass 6] Failed to extract image placeholders:', err);
        }
        // Capture structural snapshot (critical - images added here)
        await captureAndLogStructuralChanges(6);
        // Check quality gate
        await checkAndStoreQualityGate(6);
        // Track pass completion
        trackPassCompletion(6);
        // Store debug snapshot and run validation gate
        await storeDebugSnapshot(6, 'Visual Semantics');
        const canProceed6 = await runInterPassValidation(6);
        if (!canProceed6) return;

        // PERFORMANCE: Yield to main thread between passes
        await yieldToMainThread();
        performMemoryCleanup();
      }

      // Pass 7: Introduction Synthesis (AFTER body is fully polished)
      // Only processes intro/conclusion with full polished article context
      if (updatedJob.current_pass === 7) {
        onLog('Pass 7: Synthesizing introduction with fully polished article context...', 'info');
        await executePass7(
          orchestrator, updatedJob, activeBrief, safeBusinessInfo,
          makeSectionProgressCallback(7, 'Introduction'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 7 (abstract from intro)
        await collectProgressiveData(7, updatedJob.draft_content || '');
        // Capture structural snapshot
        await captureAndLogStructuralChanges(7);
        // Check quality gate
        await checkAndStoreQualityGate(7);
        // Track pass completion
        trackPassCompletion(7);
        // Store debug snapshot and run validation gate
        await storeDebugSnapshot(7, 'Introduction Synthesis');
        const canProceed7 = await runInterPassValidation(7);
        if (!canProceed7) return;

        // PERFORMANCE: Yield to main thread between passes
        await yieldToMainThread();
        performMemoryCleanup();
      }

      // Pass 8: Final Polish
      // Ensures publication-ready output while preserving all image placeholders
      if (updatedJob.current_pass === 8) {
        onLog('Pass 8: Applying final polish...', 'info');
        await executePass8(
          orchestrator, updatedJob, activeBrief, safeBusinessInfo,
          makeSectionProgressCallback(8, 'FinalPolish'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 8
        await collectProgressiveData(8, updatedJob.draft_content || '');
        // Capture structural snapshot (critical - verify preservation worked)
        await captureAndLogStructuralChanges(8);
        // Check quality gate (critical - verify polish didn't degrade quality)
        await checkAndStoreQualityGate(8);
        // Track pass completion
        trackPassCompletion(8);
        // Store debug snapshot (validation already runs below via strategy check)
        await storeDebugSnapshot(8, 'Final Polish');

        // COMPREHENSIVE STRATEGY VALIDATION before final audit
        try {
          const sections = await orchestrator.getSections(updatedJob.id);
          const finalStrategyCheck = evaluateStrategy({
            brief: activeBrief,
            draft: updatedJob.draft_content || '',
            sections,
          });

          console.log('[Strategy Check] After Pass 8 (pre-audit):', {
            compliance: finalStrategyCheck.overallCompliance,
            blockers: finalStrategyCheck.blockers.length,
            warnings: finalStrategyCheck.warnings.length,
            isComplete: finalStrategyCheck.isComplete,
            summary: finalStrategyCheck.summary,
          });

          // Log detailed compliance report
          onLog(`Pre-audit compliance: ${finalStrategyCheck.overallCompliance}% - ${finalStrategyCheck.summary}`, 'info');

          if (finalStrategyCheck.blockers.length > 0) {
            onLog(`${finalStrategyCheck.blockers.length} issue(s) may affect quality:`, 'warning');
            finalStrategyCheck.blockers.slice(0, 3).forEach(b => {
              onLog(`  • ${b.name}: ${b.suggestion}`, 'info');
            });
          }

          // Store strategy results in job for later analysis
          await orchestrator.updateJob(updatedJob.id, {
            quality_warning: !finalStrategyCheck.isComplete ? finalStrategyCheck.summary : null,
          });
        } catch (strategyError) {
          console.warn('[Strategy Check] Failed to run pre-audit validation:', strategyError);
        }
      }

      // Pass 9: Final Audit (includes auto-fix capability)
      if (updatedJob.current_pass === 9) {
        onLog('Pass 9: Running final audit...', 'info');
        const result = await executePass9(orchestrator, updatedJob, activeBrief, safeBusinessInfo);
        onLog(`Audit score: ${result.score}%`, 'success');
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJobWithDraft(updatedJob.id) || updatedJob;

        // Collect progressive schema data from Pass 9 (audit scores)
        // CRITICAL: Pass final draft content to update wordCount (was stale from Pass 1)
        try {
          const existingData = updatedJob.progressive_schema_data || createEmptyProgressiveData();
          const finalDraft = updatedJob.draft_content || '';
          const newData = collectFromPass8(existingData, result.score, undefined, finalDraft);
          await orchestrator.updateJob(updatedJob.id, {
            progressive_schema_data: newData
          });
          updatedJob = { ...updatedJob, progressive_schema_data: newData };
        } catch (err) {
          console.warn('[Progressive] Failed to collect data for pass 9:', err);
        }
        // Capture final structural snapshot
        await captureAndLogStructuralChanges(9);
        // Final quality gate check
        await checkAndStoreQualityGate(9);
      }

      // Pass 10: Schema Generation
      if (updatedJob.current_pass === 10) {
        onLog('Pass 10: Generating JSON-LD schema...', 'info');

        // Build SEO pillars with defaults if not provided
        const safePillars: SEOPillars = pillars || {
          centralEntity: activeBrief.targetKeyword || '',
          sourceContext: safeBusinessInfo.industry || '',
          centralSearchIntent: activeBrief.searchIntent || 'informational'
        };

        const pass10Result = await executePass10(
          updatedJob.id,
          activeBrief,
          safeBusinessInfo,
          safePillars,
          updatedJob.draft_content || '',
          topic,
          updatedJob.progressive_schema_data,
          safeBusinessInfo.supabaseUrl,
          safeBusinessInfo.supabaseAnonKey,
          userId,
          undefined, // Use default config
          (message) => onLog(message, 'info')
        );

        if (pass10Result.success && pass10Result.schemaResult) {
          onLog(`Schema generated! Validation: ${pass10Result.schemaResult.validation.overallScore}%`, 'success');

          // Notify parent of completion with schema result
          if (onComplete) {
            onComplete(
              updatedJob.draft_content || '',
              updatedJob.final_audit_score || 0,
              pass10Result.schemaResult
            );
          }
        } else {
          onLog(`Schema generation failed: ${pass10Result.error}`, 'warning');
          // Still complete the job, but without schema
          if (onComplete) {
            onComplete(updatedJob.draft_content || '', updatedJob.final_audit_score || 0);
          }
        }

        // Build quality report from audit details and job state
        // Include real PassDeltas from tracking (collected during pass execution)
        const qualityReport: QualityReport = {
          overallScore: updatedJob.final_audit_score || 0,
          categoryScores: buildCategoryScores(updatedJob.audit_details),
          violations: buildViolations(updatedJob.audit_details),
          passDeltas: collectedDeltas, // Real tracking data from pass execution
          systemicChecks: buildSystemicChecks(updatedJob),
          generatedAt: new Date().toISOString(),
          generationMode: 'autonomous' // TODO: Get from settings
        };

        // Mark job as completed and save quality report
        await orchestrator.updateJob(updatedJob.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          quality_report: qualityReport
        });
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onLog(`Error: ${message}`, 'failure');
      await orchestrator.updateJob(updatedJob.id, {
        status: 'failed',
        last_error: message
      });
    }
  };

  const startGeneration = useCallback(async () => {
    if (!orchestratorRef.current) return;
    abortRef.current = false;
    setError(null);

    try {
      // Check for existing job first (including completed ones for regeneration)
      let existingJob = await orchestratorRef.current.getLatestJob(briefId);

      if (existingJob) {
        // If existing job failed, cancelled, or completed - delete it and start fresh
        if (existingJob.status === 'failed' || existingJob.status === 'cancelled' || existingJob.status === 'completed') {
          onLog(existingJob.status === 'completed' ? 'Clearing previous draft for regeneration...' : 'Clearing failed job...', 'info');
          await orchestratorRef.current.deleteJob(existingJob.id);
          existingJob = null;
          // Clear local state
          setJob(null);
          setSections([]);
        } else if (existingJob.status === 'paused' || existingJob.status === 'pending') {
          // Resume the existing job
          onLog('Resuming existing job...', 'info');
          await orchestratorRef.current.updateJob(existingJob.id, { status: 'in_progress' });
          setJob({ ...existingJob, status: 'in_progress' });
          await runPasses(orchestratorRef.current, { ...existingJob, status: 'in_progress' });
          return;
        } else if (existingJob.status === 'in_progress') {
          // Already running, don't start another
          onLog('Generation already in progress', 'warning');
          setJob(existingJob);
          return;
        }
      }

      // Create new job
      const newJob = await orchestratorRef.current.createJob(briefId, mapId, userId);
      setJob(newJob);
      await runPasses(orchestratorRef.current, newJob);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start';
      setError(message);
      onLog(message, 'failure');
    }
  }, [briefId, mapId, userId, brief, businessInfo, onLog]);

  const pauseGeneration = useCallback(async () => {
    if (!orchestratorRef.current || !job) return;
    abortRef.current = true;
    await orchestratorRef.current.pauseJob(job.id);
    onLog('Generation paused', 'info');
  }, [job, onLog]);

  const resumeGeneration = useCallback(async () => {
    if (!orchestratorRef.current || !job) return;
    abortRef.current = false;
    setError(null);

    await orchestratorRef.current.updateJob(job.id, { status: 'in_progress' });
    const updatedJob = { ...job, status: 'in_progress' as const };
    setJob(updatedJob);

    onLog('Resuming generation...', 'info');
    await runPasses(orchestratorRef.current, updatedJob);
  }, [job, brief, businessInfo, onLog]);

  const cancelGeneration = useCallback(async () => {
    if (!orchestratorRef.current || !job) return;
    abortRef.current = true;
    await orchestratorRef.current.cancelJob(job.id);
    setJob(null);
    setSections([]);
    onLog('Generation cancelled', 'info');
  }, [job, onLog]);

  const retryGeneration = useCallback(async () => {
    if (!orchestratorRef.current || !job) return;
    abortRef.current = false;
    setError(null);

    // Clear error and reset status to in_progress
    await orchestratorRef.current.updateJob(job.id, {
      status: 'in_progress',
      last_error: null as unknown as string
    });
    const updatedJob = { ...job, status: 'in_progress' as const, last_error: undefined };
    setJob(updatedJob);

    onLog('Retrying generation...', 'info');
    await runPasses(orchestratorRef.current, updatedJob);
  }, [job, brief, businessInfo, onLog]);

  const progress = job ? orchestratorRef.current?.calculateProgress(job) || 0 : 0;
  const currentPassName = job ? PASS_NAMES[job.current_pass] || 'Unknown' : '';

  return {
    job,
    sections,
    isGenerating: job?.status === 'in_progress',
    isPaused: job?.status === 'paused',
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    progress,
    currentPassName,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration,
    retryGeneration,
    triggerJobRefresh, // Allows external components to trigger a re-check of job state
    error
  };
}
