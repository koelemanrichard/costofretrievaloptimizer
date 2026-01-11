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

  // Subscribe to realtime updates
  useEffect(() => {
    if (!job?.id) return;

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

    const sectionsChannel = supabase
      .channel(`sections-${job.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_generation_sections',
        filter: `job_id=eq.${job.id}`
      }, (payload) => {
        setSections(prev => {
          const updated = [...prev];
          const newSection = payload.new as ContentGenerationSection;
          // Use section_key for deduplication, not id (sections are unique by job_id + section_key)
          const idx = updated.findIndex(s => s.section_key === newSection.section_key);
          if (idx >= 0) {
            updated[idx] = newSection;
          } else {
            updated.push(newSection);
          }
          return updated.sort((a, b) => a.section_order - b.section_order);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(sectionsChannel);
    };
  }, [job?.id, supabase]);

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
        brief,
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
        const newData = collectFromPass(existingData, passNumber, draftContent, brief);

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
          brief,
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

    try {
      // Pass 1: Draft Generation
      if (updatedJob.current_pass === 1) {
        onLog('Pass 1: Generating draft section-by-section...', 'info');
        await executePass1(
          orchestrator,
          updatedJob,
          brief,
          safeBusinessInfo,
          (key, heading, current, total) => {
            onLog(`Section ${current}/${total}: ${heading}`, 'success');
          },
          shouldAbort
        );
        if (shouldAbort()) return;
        // Refresh job state
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 1
        await collectProgressiveData(1, updatedJob.draft_content || '');
        // Capture baseline structural snapshot
        await captureAndLogStructuralChanges(1);
        // Check quality gate (baseline for future comparisons)
        await checkAndStoreQualityGate(1);
        // Initialize violation tracking after draft generation
        violationsBeforePass = captureViolations();
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
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(2, 'Headers'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Capture structural snapshot
        await captureAndLogStructuralChanges(2);
        // Check quality gate
        await checkAndStoreQualityGate(2);
        // Track pass completion
        trackPassCompletion(2);
      }

      // Pass 3: Lists & Tables (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      if (updatedJob.current_pass === 3) {
        onLog('Pass 3: Optimizing lists section-by-section...', 'info');
        await executePass3(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(3, 'Lists'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 3 (lists/tables)
        await collectProgressiveData(3, updatedJob.draft_content || '');
        // Capture structural snapshot (critical - lists/tables added here)
        await captureAndLogStructuralChanges(3);
        // Check quality gate
        await checkAndStoreQualityGate(3);
        // Track pass completion
        trackPassCompletion(3);
      }

      // Pass 4: Discourse Integration (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      if (updatedJob.current_pass === 4) {
        onLog('Pass 4: Integrating discourse section-by-section...', 'info');
        await executePass4(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(4, 'Discourse'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Capture structural snapshot
        await captureAndLogStructuralChanges(4);
        // Check quality gate
        await checkAndStoreQualityGate(4);
        // Track pass completion
        trackPassCompletion(4);
      }

      // Pass 5: Micro Semantics (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      if (updatedJob.current_pass === 5) {
        onLog('Pass 5: Applying micro semantics section-by-section...', 'info');
        await executePass5(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(5, 'MicroSemantics'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 5 (keywords, entities)
        await collectProgressiveData(5, updatedJob.draft_content || '');
        // Capture structural snapshot
        await captureAndLogStructuralChanges(5);
        // Check quality gate
        await checkAndStoreQualityGate(5);
        // Track pass completion
        trackPassCompletion(5);
      }

      // Pass 6: Visual Semantics (section-by-section with holistic context)
      // Excludes intro/conclusion - they're handled in Pass 7
      // Uses visual_semantics from content brief as primary guide
      if (updatedJob.current_pass === 6) {
        onLog('Pass 6: Adding visual semantics section-by-section...', 'info');
        await executePass6(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(6, 'Visuals'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
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
      }

      // Pass 7: Introduction Synthesis (AFTER body is fully polished)
      // Only processes intro/conclusion with full polished article context
      if (updatedJob.current_pass === 7) {
        onLog('Pass 7: Synthesizing introduction with fully polished article context...', 'info');
        await executePass7(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(7, 'Introduction'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 7 (abstract from intro)
        await collectProgressiveData(7, updatedJob.draft_content || '');
        // Capture structural snapshot
        await captureAndLogStructuralChanges(7);
        // Check quality gate
        await checkAndStoreQualityGate(7);
        // Track pass completion
        trackPassCompletion(7);
      }

      // Pass 8: Final Polish
      // Ensures publication-ready output while preserving all image placeholders
      if (updatedJob.current_pass === 8) {
        onLog('Pass 8: Applying final polish...', 'info');
        await executePass8(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(8, 'FinalPolish'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 8
        await collectProgressiveData(8, updatedJob.draft_content || '');
        // Capture structural snapshot (critical - verify preservation worked)
        await captureAndLogStructuralChanges(8);
        // Check quality gate (critical - verify polish didn't degrade quality)
        await checkAndStoreQualityGate(8);
        // Track pass completion
        trackPassCompletion(8);
      }

      // Pass 9: Final Audit (includes auto-fix capability)
      if (updatedJob.current_pass === 9) {
        onLog('Pass 9: Running final audit...', 'info');
        const result = await executePass9(orchestrator, updatedJob, brief, safeBusinessInfo);
        onLog(`Audit score: ${result.score}%`, 'success');
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;

        // Collect progressive schema data from Pass 9 (audit scores)
        try {
          const existingData = updatedJob.progressive_schema_data || createEmptyProgressiveData();
          const newData = collectFromPass8(existingData, result.score);
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
          centralEntity: brief.targetKeyword || '',
          sourceContext: safeBusinessInfo.industry || '',
          centralSearchIntent: brief.searchIntent || 'informational'
        };

        const pass10Result = await executePass10(
          updatedJob.id,
          brief,
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
