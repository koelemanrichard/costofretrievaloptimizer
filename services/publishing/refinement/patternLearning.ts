/**
 * Pattern Learning Service
 *
 * Tracks and learns from user refinement patterns to improve AI suggestions.
 * Stores component swap frequencies, emphasis preferences, and other patterns.
 *
 * @module services/publishing/refinement/patternLearning
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ComponentType,
  SectionEmphasis,
  VisualStyle,
} from '../architect/blueprintTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface RefinementPattern {
  id: string;
  projectId: string;
  topicalMapId?: string;
  patternType: 'component_swap' | 'emphasis_change' | 'style_preference' | 'component_avoid';
  sourceValue: string;
  targetValue: string;
  frequency: number;
  context: {
    headingPattern?: string;
    contentType?: string;
    sectionPosition?: 'intro' | 'middle' | 'conclusion';
  };
  lastUsed: string;
  createdAt: string;
}

export interface ComponentSwapStats {
  fromComponent: ComponentType;
  toComponent: ComponentType;
  frequency: number;
  contexts: string[];
}

export interface LearnedPreferences {
  projectId: string;
  preferredComponents: ComponentType[];
  avoidedComponents: ComponentType[];
  preferredVisualStyle?: VisualStyle;
  emphasisPatterns: {
    sectionType: string;
    preferredEmphasis: SectionEmphasis;
    frequency: number;
  }[];
  componentSwaps: ComponentSwapStats[];
}

export interface SuggestionContext {
  headingText?: string;
  contentSnippet?: string;
  sectionPosition: 'intro' | 'middle' | 'conclusion';
  currentComponent: ComponentType;
  contentType?: string;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

let supabase: SupabaseClient | null = null;

export function initPatternLearningClient(url: string, anonKey: string): void {
  supabase = createClient(url, anonKey);
}

function getClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Pattern learning client not initialized. Call initPatternLearningClient first.');
  }
  return supabase;
}

// ============================================================================
// PATTERN RECORDING
// ============================================================================

/**
 * Record a component swap pattern
 */
export async function recordComponentSwap(
  projectId: string,
  fromComponent: ComponentType,
  toComponent: ComponentType,
  context?: {
    topicalMapId?: string;
    headingPattern?: string;
    contentType?: string;
    sectionPosition?: 'intro' | 'middle' | 'conclusion';
  }
): Promise<void> {
  const client = getClient();

  // Check if pattern exists
  const { data: existing } = await client
    .from('refinement_patterns')
    .select('*')
    .eq('project_id', projectId)
    .eq('pattern_type', 'component_swap')
    .eq('source_value', fromComponent)
    .eq('target_value', toComponent)
    .maybeSingle();

  if (existing) {
    // Update frequency
    await client
      .from('refinement_patterns')
      .update({
        frequency: existing.frequency + 1,
        last_used: new Date().toISOString(),
        context: {
          ...existing.context,
          ...(context?.headingPattern && { headingPattern: context.headingPattern }),
          ...(context?.contentType && { contentType: context.contentType }),
        },
      })
      .eq('id', existing.id);
  } else {
    // Create new pattern
    await client.from('refinement_patterns').insert({
      project_id: projectId,
      topical_map_id: context?.topicalMapId,
      pattern_type: 'component_swap',
      source_value: fromComponent,
      target_value: toComponent,
      frequency: 1,
      context: {
        headingPattern: context?.headingPattern,
        contentType: context?.contentType,
        sectionPosition: context?.sectionPosition,
      },
      last_used: new Date().toISOString(),
    });
  }
}

/**
 * Record an emphasis change pattern
 */
export async function recordEmphasisChange(
  projectId: string,
  sectionType: string,
  newEmphasis: SectionEmphasis,
  context?: {
    topicalMapId?: string;
    headingPattern?: string;
  }
): Promise<void> {
  const client = getClient();

  const { data: existing } = await client
    .from('refinement_patterns')
    .select('*')
    .eq('project_id', projectId)
    .eq('pattern_type', 'emphasis_change')
    .eq('source_value', sectionType)
    .eq('target_value', newEmphasis)
    .maybeSingle();

  if (existing) {
    await client
      .from('refinement_patterns')
      .update({
        frequency: existing.frequency + 1,
        last_used: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await client.from('refinement_patterns').insert({
      project_id: projectId,
      topical_map_id: context?.topicalMapId,
      pattern_type: 'emphasis_change',
      source_value: sectionType,
      target_value: newEmphasis,
      frequency: 1,
      context: {
        headingPattern: context?.headingPattern,
      },
      last_used: new Date().toISOString(),
    });
  }
}

/**
 * Record a component avoidance (user explicitly removes/replaces a component type)
 */
export async function recordComponentAvoidance(
  projectId: string,
  component: ComponentType,
  context?: {
    topicalMapId?: string;
    reason?: string;
  }
): Promise<void> {
  const client = getClient();

  const { data: existing } = await client
    .from('refinement_patterns')
    .select('*')
    .eq('project_id', projectId)
    .eq('pattern_type', 'component_avoid')
    .eq('source_value', component)
    .maybeSingle();

  if (existing) {
    await client
      .from('refinement_patterns')
      .update({
        frequency: existing.frequency + 1,
        last_used: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await client.from('refinement_patterns').insert({
      project_id: projectId,
      topical_map_id: context?.topicalMapId,
      pattern_type: 'component_avoid',
      source_value: component,
      target_value: 'avoided',
      frequency: 1,
      context: {
        reason: context?.reason,
      },
      last_used: new Date().toISOString(),
    });
  }
}

// ============================================================================
// PATTERN RETRIEVAL
// ============================================================================

/**
 * Get learned preferences for a project
 */
export async function getLearnedPreferences(
  projectId: string,
  topicalMapId?: string
): Promise<LearnedPreferences> {
  const client = getClient();

  // Get all patterns for this project
  let query = client
    .from('refinement_patterns')
    .select('*')
    .eq('project_id', projectId)
    .order('frequency', { ascending: false });

  if (topicalMapId) {
    query = query.or(`topical_map_id.eq.${topicalMapId},topical_map_id.is.null`);
  }

  const { data: patterns, error } = await query;

  if (error || !patterns) {
    return {
      projectId,
      preferredComponents: [],
      avoidedComponents: [],
      emphasisPatterns: [],
      componentSwaps: [],
    };
  }

  // Process patterns
  const componentSwaps: ComponentSwapStats[] = [];
  const avoidedComponents: ComponentType[] = [];
  const emphasisPatterns: LearnedPreferences['emphasisPatterns'] = [];
  const preferredComponents = new Map<ComponentType, number>();

  for (const pattern of patterns) {
    switch (pattern.pattern_type) {
      case 'component_swap':
        componentSwaps.push({
          fromComponent: pattern.source_value as ComponentType,
          toComponent: pattern.target_value as ComponentType,
          frequency: pattern.frequency,
          contexts: pattern.context?.headingPattern ? [pattern.context.headingPattern] : [],
        });
        // Track preferred components (targets of swaps)
        const currentCount = preferredComponents.get(pattern.target_value as ComponentType) || 0;
        preferredComponents.set(pattern.target_value as ComponentType, currentCount + pattern.frequency);
        break;

      case 'component_avoid':
        if (pattern.frequency >= 2) { // Only add if avoided multiple times
          avoidedComponents.push(pattern.source_value as ComponentType);
        }
        break;

      case 'emphasis_change':
        emphasisPatterns.push({
          sectionType: pattern.source_value,
          preferredEmphasis: pattern.target_value as SectionEmphasis,
          frequency: pattern.frequency,
        });
        break;
    }
  }

  // Sort and get top preferred components
  const sortedPreferred = [...preferredComponents.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([component]) => component);

  return {
    projectId,
    preferredComponents: sortedPreferred,
    avoidedComponents,
    emphasisPatterns,
    componentSwaps,
  };
}

/**
 * Get component swap suggestions based on learned patterns
 */
export async function getSwapSuggestions(
  projectId: string,
  currentComponent: ComponentType,
  context?: SuggestionContext
): Promise<{ component: ComponentType; confidence: number; reason: string }[]> {
  const client = getClient();

  // Get patterns where this component was the source
  const { data: patterns } = await client
    .from('refinement_patterns')
    .select('*')
    .eq('project_id', projectId)
    .eq('pattern_type', 'component_swap')
    .eq('source_value', currentComponent)
    .order('frequency', { ascending: false })
    .limit(5);

  if (!patterns || patterns.length === 0) {
    return [];
  }

  return patterns.map(pattern => {
    let confidence = Math.min(pattern.frequency / 10, 1); // Max confidence at 10+ uses

    // Boost confidence if context matches
    if (context?.headingText && pattern.context?.headingPattern) {
      const headingLower = context.headingText.toLowerCase();
      const patternLower = pattern.context.headingPattern.toLowerCase();
      if (headingLower.includes(patternLower) || patternLower.includes(headingLower)) {
        confidence = Math.min(confidence + 0.2, 1);
      }
    }

    return {
      component: pattern.target_value as ComponentType,
      confidence,
      reason: pattern.frequency > 5
        ? `You've made this swap ${pattern.frequency} times before`
        : pattern.frequency > 1
          ? `Based on your previous refinements`
          : `Suggested based on similar content`,
    };
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get refinement analytics for a project
 */
export async function getRefinementAnalytics(projectId: string): Promise<{
  totalRefinements: number;
  mostSwappedFrom: { component: ComponentType; count: number }[];
  mostSwappedTo: { component: ComponentType; count: number }[];
  refinementTrend: { date: string; count: number }[];
}> {
  const client = getClient();

  const { data: patterns } = await client
    .from('refinement_patterns')
    .select('*')
    .eq('project_id', projectId)
    .eq('pattern_type', 'component_swap');

  if (!patterns || patterns.length === 0) {
    return {
      totalRefinements: 0,
      mostSwappedFrom: [],
      mostSwappedTo: [],
      refinementTrend: [],
    };
  }

  // Calculate totals
  const totalRefinements = patterns.reduce((sum, p) => sum + p.frequency, 0);

  // Most swapped from
  const swapFromCounts = new Map<ComponentType, number>();
  const swapToCounts = new Map<ComponentType, number>();

  for (const pattern of patterns) {
    const fromCount = swapFromCounts.get(pattern.source_value as ComponentType) || 0;
    swapFromCounts.set(pattern.source_value as ComponentType, fromCount + pattern.frequency);

    const toCount = swapToCounts.get(pattern.target_value as ComponentType) || 0;
    swapToCounts.set(pattern.target_value as ComponentType, toCount + pattern.frequency);
  }

  const mostSwappedFrom = [...swapFromCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([component, count]) => ({ component, count }));

  const mostSwappedTo = [...swapToCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([component, count]) => ({ component, count }));

  return {
    totalRefinements,
    mostSwappedFrom,
    mostSwappedTo,
    refinementTrend: [], // Would need timestamp tracking for trend
  };
}

// ============================================================================
// SMART SUGGESTIONS
// ============================================================================

/**
 * Get smart component suggestions based on all learned patterns
 */
export function getSmartSuggestions(
  preferences: LearnedPreferences,
  context: SuggestionContext
): ComponentType[] {
  const suggestions: { component: ComponentType; score: number }[] = [];

  // Check swap patterns
  for (const swap of preferences.componentSwaps) {
    if (swap.fromComponent === context.currentComponent) {
      suggestions.push({
        component: swap.toComponent,
        score: swap.frequency * 2, // Weight by frequency
      });
    }
  }

  // Add preferred components if not already suggested
  for (const preferred of preferences.preferredComponents) {
    if (preferred !== context.currentComponent && !suggestions.find(s => s.component === preferred)) {
      suggestions.push({
        component: preferred,
        score: 1,
      });
    }
  }

  // Filter out avoided components
  const filtered = suggestions.filter(s => !preferences.avoidedComponents.includes(s.component));

  // Sort by score and return top suggestions
  return filtered
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => s.component);
}

/**
 * Determine if AI should auto-apply a learned pattern
 */
export function shouldAutoApplyPattern(
  preferences: LearnedPreferences,
  currentComponent: ComponentType,
  context: SuggestionContext
): { shouldApply: boolean; suggestedComponent?: ComponentType; confidence: number } {
  // Find matching swap patterns with high frequency
  const matchingSwap = preferences.componentSwaps.find(
    swap => swap.fromComponent === currentComponent && swap.frequency >= 5
  );

  if (matchingSwap) {
    const confidence = Math.min(matchingSwap.frequency / 10, 0.9); // Cap at 90% confidence
    return {
      shouldApply: confidence >= 0.7,
      suggestedComponent: matchingSwap.toComponent,
      confidence,
    };
  }

  return { shouldApply: false, confidence: 0 };
}
