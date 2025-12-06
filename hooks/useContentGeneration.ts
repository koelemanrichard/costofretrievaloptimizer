// hooks/useContentGeneration.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  ContentGenerationJob,
  ContentGenerationSection,
  ContentBrief,
  BusinessInfo,
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
  executePass8
} from '../services/ai/contentGeneration';

interface UseContentGenerationProps {
  briefId: string;
  mapId: string;
  userId: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  onLog: (message: string, status: 'info' | 'success' | 'failure' | 'warning') => void;
  onComplete?: (draft: string, auditScore: number) => void;
}

interface UseContentGenerationReturn {
  job: ContentGenerationJob | null;
  sections: ContentGenerationSection[];
  isGenerating: boolean;
  isPaused: boolean;
  isComplete: boolean;
  progress: number;
  currentPassName: string;
  startGeneration: () => Promise<void>;
  pauseGeneration: () => Promise<void>;
  resumeGeneration: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
  error: string | null;
}

export function useContentGeneration({
  briefId,
  mapId,
  userId,
  businessInfo,
  brief,
  onLog,
  onComplete
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

  // Check for existing job on mount (including completed jobs)
  useEffect(() => {
    const checkExisting = async () => {
      if (!orchestratorRef.current || !briefId) return;
      try {
        // First check for ANY job (including completed) to restore state
        const latestJob = await orchestratorRef.current.getLatestJob(briefId);
        if (latestJob) {
          setJob(latestJob);
          const existingSections = await orchestratorRef.current.getSections(latestJob.id);
          setSections(existingSections);

          // If job is completed and has a draft, sync it to the brief
          // Also try to assemble from sections if draft_content is empty
          if (latestJob.status === 'completed' && onComplete) {
            let draftToSync = latestJob.draft_content;

            // If draft_content is empty but we have sections, assemble from them
            if (!draftToSync && existingSections.length > 0) {
              console.log('[useContentGeneration] Assembling draft from sections...');
              draftToSync = await orchestratorRef.current.assembleDraft(latestJob.id);
            }

            if (draftToSync) {
              console.log('[useContentGeneration] Syncing draft to brief:', draftToSync.length, 'chars');
              onComplete(draftToSync, latestJob.final_audit_score || 0);
            } else {
              console.warn('[useContentGeneration] No draft content found in completed job');
            }
          }
        }
      } catch (err) {
        // Silently ignore - no existing job
        console.debug('No existing job found:', err);
      }
    };
    checkExisting();
  }, [briefId, onComplete]);

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
      }

      // Pass 2: Headers
      if (updatedJob.current_pass === 2) {
        onLog('Pass 2: Optimizing headers...', 'info');
        await executePass2(orchestrator, updatedJob, brief, safeBusinessInfo);
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 3: Lists & Tables
      if (updatedJob.current_pass === 3) {
        onLog('Pass 3: Optimizing lists and tables...', 'info');
        await executePass3(orchestrator, updatedJob, brief, safeBusinessInfo);
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 4: Visuals
      if (updatedJob.current_pass === 4) {
        onLog('Pass 4: Adding visual semantics...', 'info');
        await executePass4(orchestrator, updatedJob, brief, safeBusinessInfo);
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 5: Micro Semantics
      if (updatedJob.current_pass === 5) {
        onLog('Pass 5: Applying micro semantics rules...', 'info');
        await executePass5(orchestrator, updatedJob, brief, safeBusinessInfo);
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 6: Discourse
      if (updatedJob.current_pass === 6) {
        onLog('Pass 6: Integrating discourse flow...', 'info');
        await executePass6(orchestrator, updatedJob, brief, safeBusinessInfo);
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 7: Introduction
      if (updatedJob.current_pass === 7) {
        onLog('Pass 7: Synthesizing introduction...', 'info');
        await executePass7(orchestrator, updatedJob, brief, safeBusinessInfo);
        if (shouldAbort()) return;
        updatedJob = await orchestrator.getJob(updatedJob.id) || updatedJob;
      }

      // Pass 8: Audit
      if (updatedJob.current_pass === 8) {
        onLog('Pass 8: Running final audit...', 'info');
        const result = await executePass8(orchestrator, updatedJob, brief, safeBusinessInfo);
        onLog(`Complete! Audit score: ${result.score}%`, 'success');

        // Notify parent of completion so it can update local state
        if (onComplete) {
          onComplete(result.draft, result.score);
        }
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
      // Check for existing job first - resume it or delete failed ones
      let existingJob = await orchestratorRef.current.getExistingJob(briefId);

      if (existingJob) {
        // If existing job failed or is paused, delete it and start fresh
        if (existingJob.status === 'failed' || existingJob.status === 'cancelled') {
          await orchestratorRef.current.deleteJob(existingJob.id);
          existingJob = null;
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

  const progress = job ? orchestratorRef.current?.calculateProgress(job) || 0 : 0;
  const currentPassName = job ? PASS_NAMES[job.current_pass] || 'Unknown' : '';

  return {
    job,
    sections,
    isGenerating: job?.status === 'in_progress',
    isPaused: job?.status === 'paused',
    isComplete: job?.status === 'completed',
    progress,
    currentPassName,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration,
    error
  };
}
