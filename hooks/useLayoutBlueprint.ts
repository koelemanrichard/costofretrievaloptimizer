/**
 * useLayoutBlueprint Hook
 *
 * React hook for managing layout blueprints in the UI.
 * Provides state management for blueprint generation, rendering, and refinement.
 *
 * @module hooks/useLayoutBlueprint
 */

import { useState, useCallback, useEffect } from 'react';
import {
  generateBlueprint,
  generateBlueprintHeuristic,
  refineSection,
  renderBlueprint,
  getArticleBlueprint,
  saveArticleBlueprint,
  updateArticleBlueprintOverrides,
  getBlueprintHistory,
  revertToHistory,
  getEffectiveSettings,
} from '../services/publishing';
import { initSupabaseClient } from '../services/publishing/architect/blueprintStorage';
import type {
  LayoutBlueprint,
  BlueprintRenderOutput,
  ArticleBlueprintOverrides,
  BlueprintComponentType,
  SectionEmphasis,
} from '../services/publishing';
import type { BusinessInfo, ContentBrief, EnrichedTopic, TopicalMap } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface BlueprintState {
  /** Current blueprint (null if not generated) */
  blueprint: LayoutBlueprint | null;

  /** Rendered output (null if not rendered) */
  rendered: BlueprintRenderOutput | null;

  /** Whether blueprint is being generated */
  isGenerating: boolean;

  /** Whether blueprint is being rendered */
  isRendering: boolean;

  /** Whether blueprint is being saved */
  isSaving: boolean;

  /** Whether blueprint is being refined */
  isRefining: boolean;

  /** Error message if any */
  error: string | null;

  /** Blueprint history for this topic */
  history: Array<{
    id: string;
    created_at: string;
    change_type: string;
    change_description: string | null;
  }>;
}

export interface UseBlueprintOptions {
  /** Topic ID */
  topicId: string;

  /** Topical map ID */
  topicalMapId: string;

  /** Project ID */
  projectId: string;

  /** Business info with AI keys */
  businessInfo: BusinessInfo;

  /** Content brief (optional) */
  brief?: ContentBrief;

  /** Topic data */
  topic?: EnrichedTopic;

  /** Topical map data */
  topicalMap?: TopicalMap;

  /** Auto-load existing blueprint on mount */
  autoLoad?: boolean;
}

export interface UseBlueprintReturn extends BlueprintState {
  /** Generate a new blueprint using AI */
  generateWithAI: (content: string, title: string) => Promise<LayoutBlueprint | null>;

  /** Generate a blueprint using heuristics (fallback) */
  generateHeuristic: (content: string, title: string) => Promise<LayoutBlueprint | null>;

  /** Render the current blueprint to HTML */
  render: (options?: {
    author?: { name: string; title?: string; bio?: string; imageUrl?: string };
    ctaConfig?: {
      primaryText?: string;
      primaryUrl?: string;
      secondaryText?: string;
      secondaryUrl?: string;
      bannerTitle?: string;
      bannerText?: string;
    };
  }) => Promise<BlueprintRenderOutput | null>;

  /** Refine a specific section */
  refineSection: (sectionId: string, instruction: string) => Promise<void>;

  /** Change component for a section */
  changeComponent: (sectionId: string, newComponent: BlueprintComponentType) => Promise<void>;

  /** Save current blueprint to database */
  save: () => Promise<void>;

  /** Load blueprint from database */
  load: () => Promise<void>;

  /** Revert to a previous version */
  revert: (historyId: string) => Promise<void>;

  /** Clear error */
  clearError: () => void;

  /** Reset state */
  reset: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useLayoutBlueprint(options: UseBlueprintOptions): UseBlueprintReturn {
  const {
    topicId,
    topicalMapId,
    projectId,
    businessInfo,
    brief,
    topic,
    topicalMap,
    autoLoad = true,
  } = options;

  // State
  const [state, setState] = useState<BlueprintState>({
    blueprint: null,
    rendered: null,
    isGenerating: false,
    isRendering: false,
    isSaving: false,
    isRefining: false,
    error: null,
    history: [],
  });

  // Initialize Supabase client when businessInfo is available
  useEffect(() => {
    if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
      initSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
    }
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  // Load existing blueprint on mount
  useEffect(() => {
    if (autoLoad && topicId) {
      loadBlueprint();
    }
  }, [topicId, autoLoad]);

  // Generate blueprint with AI
  const generateWithAI = useCallback(async (
    content: string,
    title: string
  ): Promise<LayoutBlueprint | null> => {
    setState(s => ({ ...s, isGenerating: true, error: null }));

    try {
      const blueprint = await generateBlueprint(
        content,
        title,
        topicId,
        businessInfo,
        {
          brief,
          topic,
          topicalMap,
        }
      );

      setState(s => ({
        ...s,
        blueprint,
        isGenerating: false,
        rendered: null, // Clear old render
      }));

      return blueprint;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate blueprint';
      setState(s => ({ ...s, isGenerating: false, error: message }));
      return null;
    }
  }, [topicId, businessInfo, brief, topic, topicalMap]);

  // Generate blueprint with heuristics (fallback)
  const generateHeuristicFn = useCallback(async (
    content: string,
    title: string
  ): Promise<LayoutBlueprint | null> => {
    setState(s => ({ ...s, isGenerating: true, error: null }));

    try {
      const blueprint = generateBlueprintHeuristic(
        content,
        title,
        topicId,
        businessInfo,
        { brief }
      );

      setState(s => ({
        ...s,
        blueprint,
        isGenerating: false,
        rendered: null,
      }));

      return blueprint;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate blueprint';
      setState(s => ({ ...s, isGenerating: false, error: message }));
      return null;
    }
  }, [topicId, businessInfo, brief]);

  // Render blueprint
  const renderFn = useCallback(async (renderOptions?: {
    author?: { name: string; title?: string; bio?: string; imageUrl?: string };
    ctaConfig?: {
      primaryText?: string;
      primaryUrl?: string;
      secondaryText?: string;
      secondaryUrl?: string;
      bannerTitle?: string;
      bannerText?: string;
    };
  }): Promise<BlueprintRenderOutput | null> => {
    if (!state.blueprint) {
      setState(s => ({ ...s, error: 'No blueprint to render' }));
      return null;
    }

    setState(s => ({ ...s, isRendering: true, error: null }));

    try {
      const rendered = renderBlueprint(
        state.blueprint,
        state.blueprint.sections[0]?.heading || 'Article',
        {
          brief,
          topic,
          topicalMap,
          author: renderOptions?.author,
          ctaConfig: renderOptions?.ctaConfig,
        }
      );

      setState(s => ({ ...s, rendered, isRendering: false }));
      return rendered;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to render blueprint';
      setState(s => ({ ...s, isRendering: false, error: message }));
      return null;
    }
  }, [state.blueprint, brief, topic, topicalMap]);

  // Refine section
  const refineSectionFn = useCallback(async (
    sectionId: string,
    instruction: string
  ): Promise<void> => {
    if (!state.blueprint) return;

    setState(s => ({ ...s, isRefining: true, error: null }));

    try {
      const refined = await refineSection(
        state.blueprint,
        sectionId,
        instruction,
        businessInfo
      );

      setState(s => ({
        ...s,
        blueprint: refined,
        isRefining: false,
        rendered: null, // Clear render as blueprint changed
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refine section';
      setState(s => ({ ...s, isRefining: false, error: message }));
    }
  }, [state.blueprint, businessInfo]);

  // Change component for a section
  const changeComponentFn = useCallback(async (
    sectionId: string,
    newComponent: BlueprintComponentType
  ): Promise<void> => {
    if (!state.blueprint) return;

    // Update locally first
    const updatedSections = state.blueprint.sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          presentation: {
            ...s.presentation,
            component: newComponent,
          },
          reasoning: `User changed component to ${newComponent}`,
        };
      }
      return s;
    });

    const updatedBlueprint: LayoutBlueprint = {
      ...state.blueprint,
      sections: updatedSections,
    };

    setState(s => ({
      ...s,
      blueprint: updatedBlueprint,
      rendered: null,
    }));
  }, [state.blueprint]);

  // Save blueprint
  const saveFn = useCallback(async (): Promise<void> => {
    if (!state.blueprint) return;

    setState(s => ({ ...s, isSaving: true, error: null }));

    try {
      await saveArticleBlueprint(topicId, topicalMapId, state.blueprint);
      setState(s => ({ ...s, isSaving: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save blueprint';
      setState(s => ({ ...s, isSaving: false, error: message }));
    }
  }, [state.blueprint, topicId, topicalMapId]);

  // Load blueprint
  const loadBlueprint = useCallback(async (): Promise<void> => {
    setState(s => ({ ...s, isGenerating: true, error: null }));

    try {
      const existing = await getArticleBlueprint(topicId);

      if (existing) {
        const history = await getBlueprintHistory(topicId);

        setState(s => ({
          ...s,
          blueprint: existing.blueprint,
          isGenerating: false,
          history: history.map(h => ({
            id: h.id,
            created_at: h.created_at,
            change_type: h.change_type,
            change_description: h.change_description,
          })),
        }));
      } else {
        setState(s => ({ ...s, isGenerating: false }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load blueprint';
      setState(s => ({ ...s, isGenerating: false, error: message }));
    }
  }, [topicId]);

  // Revert to history
  const revertFn = useCallback(async (historyId: string): Promise<void> => {
    setState(s => ({ ...s, isGenerating: true, error: null }));

    try {
      const reverted = await revertToHistory(topicId, historyId);
      const history = await getBlueprintHistory(topicId);

      setState(s => ({
        ...s,
        blueprint: reverted.blueprint,
        isGenerating: false,
        rendered: null,
        history: history.map(h => ({
          id: h.id,
          created_at: h.created_at,
          change_type: h.change_type,
          change_description: h.change_description,
        })),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revert blueprint';
      setState(s => ({ ...s, isGenerating: false, error: message }));
    }
  }, [topicId]);

  // Clear error
  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      blueprint: null,
      rendered: null,
      isGenerating: false,
      isRendering: false,
      isSaving: false,
      isRefining: false,
      error: null,
      history: [],
    });
  }, []);

  return {
    ...state,
    generateWithAI,
    generateHeuristic: generateHeuristicFn,
    render: renderFn,
    refineSection: refineSectionFn,
    changeComponent: changeComponentFn,
    save: saveFn,
    load: loadBlueprint,
    revert: revertFn,
    clearError,
    reset,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useLayoutBlueprint;
