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
  PASS_NAMES
} from '../types';
import {
  ContentGenerationOrchestrator,
  executePass1,
  executePass2,
  executePass3,
  executePass4,
  executePass5,
  executePass6,
  executePass7,
  executePass8,
  executePass9
} from '../services/ai/contentGeneration';
import {
  createEmptyProgressiveData,
  collectFromPass,
  collectFromPass8
} from '../services/ai/contentGeneration/progressiveSchemaCollector';
import { extractPlaceholdersFromDraft } from '../services/ai/imageGeneration/placeholderParser';

interface UseContentGenerationProps {
  briefId: string;
  mapId: string;
  userId: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  pillars?: SEOPillars;
  topic?: EnrichedTopic;
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

          // If job is completed and has a draft, sync it to the brief
          // CRITICAL: Always compare with assembled sections and use the LONGER one
          // This prevents truncated AI output from overwriting full content
          if (latestJob.status === 'completed' && onComplete) {
            const jobDraftContent = latestJob.draft_content || '';

            // Always assemble sections to compare lengths
            let assembledDraft = '';
            if (existingSections.length > 0) {
              assembledDraft = await orchestratorRef.current.assembleDraft(latestJob.id);
              console.log('[useContentGeneration] Content comparison - job.draft_content:', jobDraftContent.length, 'chars, assembled sections:', assembledDraft.length, 'chars');
            }

            // Use the LONGER content to prevent data loss from AI truncation
            let draftToSync = jobDraftContent;
            let source = 'job.draft_content';

            if (assembledDraft.length > jobDraftContent.length) {
              // Assembled sections are longer - likely AI truncated the optimization
              draftToSync = assembledDraft;
              source = 'assembled_sections (raw but complete)';
              console.warn('[useContentGeneration] WARNING: AI optimization may have truncated content. Using complete raw sections instead.');
            }

            if (draftToSync) {
              console.log('[useContentGeneration] Syncing draft to brief from', source + ':', draftToSync.length, 'chars');
              // Pass schema data if available (for jobs completed with Pass 9)
              const schemaResult = latestJob.schema_data as EnhancedSchemaResult | undefined;
              onComplete(draftToSync, latestJob.final_audit_score || 0, schemaResult);
            } else {
              console.warn('[useContentGeneration] No draft content found in completed job');
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
    let updatedJob = currentJob;
    const shouldAbort = () => abortRef.current;

    // Ensure businessInfo has required fields with defaults
    const safeBusinessInfo: BusinessInfo = {
      ...businessInfo,
      language: businessInfo?.language || 'English',
      targetMarket: businessInfo?.targetMarket || 'Global',
      aiProvider: businessInfo?.aiProvider || 'gemini',
    };

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
      }

      // Helper for section progress callbacks
      const makeSectionProgressCallback = (passNum: number, passName: string) =>
        (sectionKey: string, current: number, total: number) => {
          onLog(`Pass ${passNum} (${passName}): Section ${current}/${total}`, 'info');
        };

      // Pass 2: Headers (section-by-section with holistic context)
      if (updatedJob.current_pass === 2) {
        onLog('Pass 2: Optimizing headers section-by-section...', 'info');
        await executePass2(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(2, 'Headers'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 3: Lists & Tables (section-by-section with holistic context)
      if (updatedJob.current_pass === 3) {
        onLog('Pass 3: Optimizing lists section-by-section...', 'info');
        await executePass3(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(3, 'Lists'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 3
        await collectProgressiveData(3, updatedJob.draft_content || '');
      }

      // Pass 4: Visuals (section-by-section with holistic context)
      if (updatedJob.current_pass === 4) {
        onLog('Pass 4: Adding visual semantics section-by-section...', 'info');
        await executePass4(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(4, 'Visuals'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 4 (images)
        await collectProgressiveData(4, updatedJob.draft_content || '');

        // Extract and save image placeholders from Pass 4 output
        try {
          const placeholders = extractPlaceholdersFromDraft(updatedJob.draft_content || '');
          if (placeholders.length > 0) {
            await orchestrator.updateImagePlaceholders(updatedJob.id, placeholders);
            onLog(`Found ${placeholders.length} image placeholder(s)`, 'info');
          }
        } catch (err) {
          console.warn('[Pass 4] Failed to extract image placeholders:', err);
        }
      }

      // Pass 5: Micro Semantics (section-by-section with holistic context)
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
      }

      // Pass 6: Discourse (section-by-section with holistic context)
      if (updatedJob.current_pass === 6) {
        onLog('Pass 6: Integrating discourse section-by-section...', 'info');
        await executePass6(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(6, 'Discourse'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 7: Introduction (only intro section with holistic context)
      if (updatedJob.current_pass === 7) {
        onLog('Pass 7: Synthesizing introduction with full article context...', 'info');
        await executePass7(
          orchestrator, updatedJob, brief, safeBusinessInfo,
          makeSectionProgressCallback(7, 'Introduction'),
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
        // Collect progressive schema data from Pass 7 (abstract)
        await collectProgressiveData(7, updatedJob.draft_content || '');
      }

      // Pass 8: Audit
      if (updatedJob.current_pass === 8) {
        onLog('Pass 8: Running final audit...', 'info');
        const result = await executePass8(orchestrator, updatedJob, brief, safeBusinessInfo);
        onLog(`Audit score: ${result.score}%`, 'success');
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;

        // Collect progressive schema data from Pass 8 (audit scores)
        try {
          const existingData = updatedJob.progressive_schema_data || createEmptyProgressiveData();
          const newData = collectFromPass8(existingData, result.score);
          await orchestrator.updateJob(updatedJob.id, {
            progressive_schema_data: newData
          });
          updatedJob = { ...updatedJob, progressive_schema_data: newData };
        } catch (err) {
          console.warn('[Progressive] Failed to collect data for pass 8:', err);
        }
      }

      // Pass 9: Schema Generation
      if (updatedJob.current_pass === 9) {
        onLog('Pass 9: Generating JSON-LD schema...', 'info');

        // Build SEO pillars with defaults if not provided
        const safePillars: SEOPillars = pillars || {
          centralEntity: brief.targetKeyword || '',
          sourceContext: safeBusinessInfo.industry || '',
          centralSearchIntent: brief.searchIntent || 'informational'
        };

        const pass9Result = await executePass9(
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

        if (pass9Result.success && pass9Result.schemaResult) {
          onLog(`Schema generated! Validation: ${pass9Result.schemaResult.validation.overallScore}%`, 'success');

          // Notify parent of completion with schema result
          if (onComplete) {
            onComplete(
              updatedJob.draft_content || '',
              updatedJob.final_audit_score || 0,
              pass9Result.schemaResult
            );
          }
        } else {
          onLog(`Schema generation failed: ${pass9Result.error}`, 'warning');
          // Still complete the job, but without schema
          if (onComplete) {
            onComplete(updatedJob.draft_content || '', updatedJob.final_audit_score || 0);
          }
        }

        // Mark job as completed
        await orchestrator.updateJob(updatedJob.id, {
          status: 'completed',
          completed_at: new Date().toISOString()
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
