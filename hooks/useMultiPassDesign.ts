/**
 * useMultiPassDesign Hook
 *
 * React hook for managing multi-pass design generation.
 * Wraps the MultiPassOrchestrator for use in React components.
 *
 * @module hooks/useMultiPassDesign
 */

import { useState, useCallback, useRef } from 'react';
import {
  MultiPassOrchestrator,
  type MultiPassConfig,
  type MultiPassResult,
} from '../services/publishing/multipass';
import type {
  MultiPassDesignState,
  ContentAnalysis,
  ComponentSelection,
  VisualRhythmPlan,
  DesignQualityValidation,
  BrandDiscoveryReport,
} from '../types/publishing';

// ============================================================================
// TYPES
// ============================================================================

export interface MultiPassDesignHookState {
  /** Whether design generation is in progress */
  isGenerating: boolean;

  /** Current pass being executed (1-5 or 'complete') */
  currentPass: 1 | 2 | 3 | 4 | 5 | 'complete' | null;

  /** Pass 1 result: Content analysis */
  contentAnalysis: ContentAnalysis | null;

  /** Pass 2 result: Component selections */
  componentSelections: ComponentSelection[] | null;

  /** Pass 3 result: Visual rhythm plan */
  rhythmPlan: VisualRhythmPlan | null;

  /** Pass 4 complete flag */
  designApplied: boolean;

  /** Pass 5 result: Quality validation */
  qualityValidation: DesignQualityValidation | null;

  /** Final blueprint (available after all passes complete) */
  blueprint: MultiPassResult['blueprint'] | null;

  /** Error message if generation failed */
  error: string | null;

  /** Progress percentage (0-100) */
  progress: number;
}

export interface UseMultiPassDesignOptions {
  /** Design personality (e.g., 'modern-minimal') */
  personality: string;

  /** AI provider for quality validation */
  aiProvider: 'gemini' | 'anthropic';

  /** API key for AI provider */
  aiApiKey: string;

  /** Callback when a pass completes */
  onPassComplete?: (pass: number, result: unknown) => void;

  /** Callback when all passes complete */
  onComplete?: (result: MultiPassResult) => void;

  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseMultiPassDesignReturn {
  /** Current state */
  state: MultiPassDesignHookState;

  /** Start design generation */
  generate: (markdown: string, brandDiscovery: BrandDiscoveryReport) => Promise<MultiPassResult | null>;

  /** Reset state to initial */
  reset: () => void;

  /** Cancel in-progress generation */
  cancel: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MultiPassDesignHookState = {
  isGenerating: false,
  currentPass: null,
  contentAnalysis: null,
  componentSelections: null,
  rhythmPlan: null,
  designApplied: false,
  qualityValidation: null,
  blueprint: null,
  error: null,
  progress: 0,
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing multi-pass design generation
 *
 * @example
 * ```tsx
 * const { state, generate, reset } = useMultiPassDesign({
 *   personality: 'modern-minimal',
 *   aiProvider: 'gemini',
 *   aiApiKey: geminiKey,
 *   onComplete: (result) => console.log('Done!', result),
 * });
 *
 * // Start generation
 * await generate(articleMarkdown, brandDiscoveryReport);
 *
 * // Access results
 * console.log(state.contentAnalysis);
 * console.log(state.blueprint);
 * ```
 */
export function useMultiPassDesign(
  options: UseMultiPassDesignOptions
): UseMultiPassDesignReturn {
  const [state, setState] = useState<MultiPassDesignHookState>(initialState);
  const orchestratorRef = useRef<MultiPassOrchestrator | null>(null);
  const cancelledRef = useRef(false);

  /**
   * Calculate progress percentage based on current pass
   */
  const calculateProgress = useCallback((pass: number | 'complete'): number => {
    if (pass === 'complete') return 100;
    // Each of 5 passes is 20%
    return pass * 20;
  }, []);

  /**
   * Handle pass completion
   */
  const handlePassComplete = useCallback(
    (pass: number, result: unknown) => {
      if (cancelledRef.current) return;

      setState((prev) => {
        const updates: Partial<MultiPassDesignHookState> = {
          currentPass: pass as 1 | 2 | 3 | 4 | 5,
          progress: calculateProgress(pass),
        };

        switch (pass) {
          case 1:
            updates.contentAnalysis = result as ContentAnalysis;
            break;
          case 2:
            updates.componentSelections = result as ComponentSelection[];
            break;
          case 3:
            updates.rhythmPlan = result as VisualRhythmPlan;
            break;
          case 4:
            updates.designApplied = true;
            break;
          case 5:
            updates.qualityValidation = result as DesignQualityValidation;
            break;
        }

        return { ...prev, ...updates };
      });

      options.onPassComplete?.(pass, result);
    },
    [options, calculateProgress]
  );

  /**
   * Start multi-pass design generation
   */
  const generate = useCallback(
    async (
      markdown: string,
      brandDiscovery: BrandDiscoveryReport
    ): Promise<MultiPassResult | null> => {
      // Reset state
      cancelledRef.current = false;
      setState({
        ...initialState,
        isGenerating: true,
        currentPass: 1,
        progress: 0,
      });

      try {
        // Create orchestrator config
        const config: MultiPassConfig = {
          markdown,
          personality: options.personality,
          brandDiscovery,
          aiProvider: options.aiProvider,
          aiApiKey: options.aiApiKey,
          onPassComplete: handlePassComplete,
        };

        // Create and store orchestrator
        orchestratorRef.current = new MultiPassOrchestrator(config);

        // Execute all passes
        const result = await orchestratorRef.current.execute();

        if (cancelledRef.current) {
          return null;
        }

        // Update final state
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          currentPass: 'complete',
          blueprint: result.blueprint,
          progress: 100,
        }));

        options.onComplete?.(result);
        return result;
      } catch (error) {
        if (cancelledRef.current) {
          return null;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during design generation';

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMessage,
        }));

        if (error instanceof Error) {
          options.onError?.(error);
        }

        return null;
      }
    },
    [options, handlePassComplete]
  );

  /**
   * Reset state to initial
   */
  const reset = useCallback(() => {
    cancelledRef.current = true;
    orchestratorRef.current = null;
    setState(initialState);
  }, []);

  /**
   * Cancel in-progress generation
   */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState((prev) => ({
      ...prev,
      isGenerating: false,
      error: 'Generation cancelled',
    }));
  }, []);

  return {
    state,
    generate,
    reset,
    cancel,
  };
}

export default useMultiPassDesign;
