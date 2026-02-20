// hooks/usePipeline.ts
//
// Custom hook for pipeline state management.
// Provides pipeline state, dispatch helpers, and auto-detection of completed steps.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../state/appState';
import {
  PipelineStep,
  StepStatus,
  PipelineState,
  PipelineStepState,
  WaveConfiguration,
  WaveState,
  pipelineActions,
  PIPELINE_STEP_DEFINITIONS,
} from '../state/slices/pipelineSlice';
import type { TopicalMap } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';

const STEP_PATH_MAP: Record<PipelineStep, string> = {
  crawl: 'crawl',
  gap_analysis: 'gap',
  strategy: 'strategy',
  eavs: 'eavs',
  map_planning: 'map',
  briefs: 'briefs',
  content: 'content',
  audit: 'audit',
  tech_spec: 'tech',
  export: 'export',
};

const STEP_ORDER: PipelineStep[] = [
  'crawl', 'gap_analysis', 'strategy', 'eavs', 'map_planning',
  'briefs', 'content', 'audit', 'tech_spec', 'export',
];

function getNextStepKey(currentStep: PipelineStep, steps: PipelineStepState[]): PipelineStep | null {
  const idx = STEP_ORDER.indexOf(currentStep);
  for (let i = idx + 1; i < STEP_ORDER.length; i++) {
    const s = steps.find(st => st.step === STEP_ORDER[i]);
    if (s && !s.autoSkipped) return STEP_ORDER[i];
  }
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

export function usePipeline() {
  const { state, dispatch } = useAppState();
  const pipeline = state.pipeline;

  // Navigation for auto-routing after step advancement
  let navigate: ReturnType<typeof useNavigate> | null = null;
  let routeParams: { projectId?: string; mapId?: string } = {};
  try {
    navigate = useNavigate();
    routeParams = useParams<{ projectId: string; mapId: string }>();
  } catch {
    // usePipeline may be called outside of Router context (e.g., tests)
  }

  const activeMap = useMemo(() => {
    return state.topicalMaps.find(m => m.id === state.activeMapId);
  }, [state.topicalMaps, state.activeMapId]);

  // ──── Dispatch helpers ────

  const activate = useCallback((isGreenfield: boolean, siteUrl?: string) => {
    dispatch(pipelineActions.activate(isGreenfield, siteUrl));
  }, [dispatch]);

  const deactivate = useCallback(() => {
    dispatch(pipelineActions.deactivate());
  }, [dispatch]);

  const setStepStatus = useCallback((step: PipelineStep, status: StepStatus) => {
    dispatch(pipelineActions.setStepStatus(step, status));
  }, [dispatch]);

  const navigateToStep = useCallback((step: PipelineStep) => {
    if (navigate && routeParams.projectId && routeParams.mapId) {
      const path = STEP_PATH_MAP[step];
      navigate(`/p/${routeParams.projectId}/m/${routeParams.mapId}/pipeline/${path}`);
    }
  }, [navigate, routeParams.projectId, routeParams.mapId]);

  const advanceStep = useCallback((fromStep: PipelineStep) => {
    dispatch(pipelineActions.advanceStep(fromStep));
    // Navigate to next step URL
    const next = getNextStepKey(fromStep, pipeline.steps);
    if (next) {
      // Use setTimeout to let the state update before navigation
      setTimeout(() => navigateToStep(next), 50);
    }
  }, [dispatch, pipeline.steps, navigateToStep]);

  const approveGate = useCallback((step: PipelineStep, approvedBy?: string) => {
    dispatch(pipelineActions.approveGate(step, approvedBy));
    // Navigate to next step URL
    const next = getNextStepKey(step, pipeline.steps);
    if (next) {
      setTimeout(() => navigateToStep(next), 50);
    }
  }, [dispatch, pipeline.steps, navigateToStep]);

  const rejectGate = useCallback((step: PipelineStep, reason: string) => {
    dispatch(pipelineActions.rejectGate(step, reason));
  }, [dispatch]);

  const reviseStep = useCallback((step: PipelineStep) => {
    dispatch(pipelineActions.clearApproval(step));
  }, [dispatch]);

  const setCurrentStep = useCallback((step: PipelineStep) => {
    dispatch(pipelineActions.setCurrentStep(step));
  }, [dispatch]);

  const toggleAutoApprove = useCallback((value?: boolean) => {
    dispatch(pipelineActions.toggleAutoApprove(value));
  }, [dispatch]);

  const setWaveConfig = useCallback((config: WaveConfiguration) => {
    dispatch(pipelineActions.setWaveConfig(config));
  }, [dispatch]);

  const updateWave = useCallback((waveId: string, updates: Partial<WaveState>) => {
    dispatch(pipelineActions.updateWave(waveId, updates));
  }, [dispatch]);

  const skipStep = useCallback((step: PipelineStep, reason: string) => {
    dispatch(pipelineActions.skipStep(step, reason));
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(pipelineActions.reset());
  }, [dispatch]);

  // ──── Derived state ────

  const currentStepState = useMemo(() => {
    return pipeline.steps.find(s => s.step === pipeline.currentStep);
  }, [pipeline.steps, pipeline.currentStep]);

  const getStepState = useCallback((step: PipelineStep): PipelineStepState | undefined => {
    return pipeline.steps.find(s => s.step === step);
  }, [pipeline.steps]);

  const completedSteps = useMemo(() => {
    return pipeline.steps.filter(s => s.status === 'completed');
  }, [pipeline.steps]);

  const progressPercent = useMemo(() => {
    const total = pipeline.steps.length;
    const completed = completedSteps.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [pipeline.steps.length, completedSteps.length]);

  const canNavigateToStep = useCallback((step: PipelineStep): boolean => {
    const stepState = pipeline.steps.find(s => s.step === step);
    if (!stepState) return false;
    return stepState.status !== 'locked';
  }, [pipeline.steps]);

  // ──── Auto-detect completed steps from existing map data ────

  const autoDetectStepStatuses = useCallback((map: TopicalMap): Partial<Record<PipelineStep, StepStatus>> => {
    const detected: Partial<Record<PipelineStep, StepStatus>> = {};

    // Check business info / crawl data
    const bizInfo = map.business_info;
    if (bizInfo && bizInfo.language && bizInfo.industry) {
      detected.crawl = 'completed';
    }

    // Check pillars
    if (map.pillars?.centralEntity && map.pillars?.sourceContext) {
      detected.strategy = 'completed';
    }

    // Check EAVs
    if (map.eavs && map.eavs.length > 0) {
      detected.eavs = 'completed';
    }

    // Check topics (map planning)
    if (map.topics && map.topics.length > 0) {
      detected.map_planning = 'completed';
    }

    // Check briefs
    if (map.briefs && Object.keys(map.briefs).length > 0) {
      detected.briefs = 'completed';
    }

    return detected;
  }, []);

  // ──── Auto-navigate when auto-approve advances the current step ────

  const prevCurrentStepRef = useRef(pipeline.currentStep);
  useEffect(() => {
    if (pipeline.currentStep !== prevCurrentStepRef.current) {
      const prevStep = prevCurrentStepRef.current;
      prevCurrentStepRef.current = pipeline.currentStep;
      // If the previous step was auto-approved (completed by toggle or auto-approve on set_status),
      // navigate to the new current step
      const prevStepState = pipeline.steps.find(s => s.step === prevStep);
      if (prevStepState?.approval?.approvedBy === 'auto') {
        setTimeout(() => navigateToStep(pipeline.currentStep), 50);
      }
    }
  }, [pipeline.currentStep, pipeline.steps, navigateToStep]);

  // ──── Persist pipeline state to Supabase ────

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistFailedRef = useRef(false);

  useEffect(() => {
    if (!pipeline.isActive || !state.activeMapId) return;
    // Stop trying if a previous persist already failed (column likely doesn't exist)
    if (persistFailedRef.current) return;

    // Debounce: save 500ms after last state change
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl,
          state.businessInfo.supabaseAnonKey
        );
        const { error } = await supabase
          .from('topical_maps')
          .update({ pipeline_state: pipeline } as any)
          .eq('id', state.activeMapId);
        if (error) {
          console.warn('[Pipeline] Persist failed (run migration to add pipeline_state column):', error.message);
          persistFailedRef.current = true;
        }
      } catch {
        persistFailedRef.current = true;
      }
    }, 500);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [pipeline, state.activeMapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  // Get pipeline step route path
  const getStepPath = useCallback((step: PipelineStep): string => {
    return STEP_PATH_MAP[step];
  }, []);

  return {
    // State
    pipeline,
    isActive: pipeline.isActive,
    steps: pipeline.steps,
    currentStep: pipeline.currentStep,
    currentStepState,
    isGreenfield: pipeline.isGreenfield,
    autoApprove: pipeline.autoApprove,
    waveConfig: pipeline.waveConfig,
    completedSteps,
    progressPercent,
    activeMap,

    // Actions
    activate,
    deactivate,
    setStepStatus,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    setCurrentStep,
    toggleAutoApprove,
    setWaveConfig,
    updateWave,
    skipStep,
    reset,

    // Helpers
    canNavigateToStep,
    autoDetectStepStatuses,
    getStepState,
    getStepPath,
    navigateToStep,
  };
}
