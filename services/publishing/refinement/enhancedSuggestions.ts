/**
 * Enhanced Suggestions Service
 *
 * Combines learned patterns, competitor insights, and content analysis
 * to provide intelligent component and styling suggestions.
 *
 * @module services/publishing/refinement/enhancedSuggestions
 */

import type {
  ComponentType,
  SectionDesign,
  VisualStyle,
  SectionEmphasis,
} from '../architect/blueprintTypes';
import { suggestAlternativeComponents, getComponentCompatibility } from './sectionRefiner';
import {
  getLearnedPreferences,
  getSmartSuggestions,
  shouldAutoApplyPattern,
  type LearnedPreferences,
  type SuggestionContext,
} from './patternLearning';
import {
  getDesignRecommendations,
  type CompetitorDesignAnalysis,
} from './competitorAnalysis';

// ============================================================================
// TYPES
// ============================================================================

export interface EnhancedSuggestion {
  component: ComponentType;
  confidence: number;
  source: 'content_analysis' | 'learned_pattern' | 'competitor_insight' | 'category_alternative';
  reason: string;
}

export interface SectionSuggestions {
  sectionId: string;
  currentComponent: ComponentType;
  suggestions: EnhancedSuggestion[];
  autoApplyRecommendation?: {
    component: ComponentType;
    confidence: number;
    reason: string;
  };
  emphasisSuggestion?: {
    emphasis: SectionEmphasis;
    reason: string;
  };
}

export interface BlueprintSuggestions {
  visualStyleSuggestion?: {
    style: VisualStyle;
    confidence: number;
    reason: string;
  };
  sectionSuggestions: SectionSuggestions[];
  globalInsights: string[];
  improvementScore: number; // 0-100, how much the blueprint could be improved
}

export interface SuggestionConfig {
  useLearnedPatterns: boolean;
  useCompetitorInsights: boolean;
  useContentAnalysis: boolean;
  autoApplyThreshold: number; // 0-1, confidence threshold for auto-apply
  maxSuggestionsPerSection: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_SUGGESTION_CONFIG: SuggestionConfig = {
  useLearnedPatterns: true,
  useCompetitorInsights: true,
  useContentAnalysis: true,
  autoApplyThreshold: 0.8,
  maxSuggestionsPerSection: 4,
};

// ============================================================================
// SUGGESTION GENERATION
// ============================================================================

/**
 * Generate enhanced suggestions for a section
 */
export async function getSectionSuggestions(
  section: SectionDesign,
  projectId: string,
  config: Partial<SuggestionConfig> = {}
): Promise<SectionSuggestions> {
  const fullConfig = { ...DEFAULT_SUGGESTION_CONFIG, ...config };
  const suggestions: EnhancedSuggestion[] = [];

  // 1. Content-based suggestions (always available)
  if (fullConfig.useContentAnalysis) {
    const contentSuggestions = suggestAlternativeComponents(section);
    const compatibility = getComponentCompatibility(section.presentation.component);

    for (const component of contentSuggestions.slice(0, 2)) {
      suggestions.push({
        component,
        confidence: 0.6,
        source: 'content_analysis',
        reason: `Good for ${compatibility.bestFor.join(', ')}`,
      });
    }

    // Add category alternatives
    for (const alt of compatibility.alternativesIn.slice(0, 2)) {
      if (!suggestions.find(s => s.component === alt)) {
        suggestions.push({
          component: alt,
          confidence: 0.5,
          source: 'category_alternative',
          reason: `Alternative in ${compatibility.category} category`,
        });
      }
    }
  }

  // 2. Learned pattern suggestions
  let learnedPreferences: LearnedPreferences | null = null;
  if (fullConfig.useLearnedPatterns) {
    try {
      learnedPreferences = await getLearnedPreferences(projectId);

      const context: SuggestionContext = {
        headingText: section.heading,
        contentSnippet: section.sourceContent?.slice(0, 200),
        sectionPosition: getSectionPosition(section),
        currentComponent: section.presentation.component,
      };

      const patternSuggestions = getSmartSuggestions(learnedPreferences, context);

      for (const component of patternSuggestions) {
        const existing = suggestions.find(s => s.component === component);
        if (existing) {
          // Boost confidence if pattern confirms content analysis
          existing.confidence = Math.min(existing.confidence + 0.2, 0.95);
          existing.reason += ' (confirmed by your past choices)';
        } else {
          suggestions.push({
            component,
            confidence: 0.75,
            source: 'learned_pattern',
            reason: 'Based on your refinement history',
          });
        }
      }
    } catch {
      // Pattern learning not initialized, skip
    }
  }

  // 3. Competitor insight suggestions
  if (fullConfig.useCompetitorInsights) {
    try {
      const recommendations = await getDesignRecommendations(projectId);

      for (const component of recommendations.preferredComponents) {
        const existing = suggestions.find(s => s.component === component);
        if (existing) {
          existing.confidence = Math.min(existing.confidence + 0.1, 0.95);
          existing.reason += ' (industry standard)';
        } else if (!suggestions.find(s => s.component === component)) {
          suggestions.push({
            component,
            confidence: 0.55,
            source: 'competitor_insight',
            reason: 'Common in your industry',
          });
        }
      }
    } catch {
      // Competitor analysis not initialized, skip
    }
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);

  // Check for auto-apply recommendation
  let autoApplyRecommendation: SectionSuggestions['autoApplyRecommendation'];
  if (learnedPreferences) {
    const context: SuggestionContext = {
      headingText: section.heading,
      sectionPosition: getSectionPosition(section),
      currentComponent: section.presentation.component,
    };

    const autoApply = shouldAutoApplyPattern(
      learnedPreferences,
      section.presentation.component,
      context
    );

    if (autoApply.shouldApply && autoApply.suggestedComponent && autoApply.confidence >= fullConfig.autoApplyThreshold) {
      autoApplyRecommendation = {
        component: autoApply.suggestedComponent,
        confidence: autoApply.confidence,
        reason: 'You consistently make this change',
      };
    }
  }

  // Generate emphasis suggestion based on patterns
  let emphasisSuggestion: SectionSuggestions['emphasisSuggestion'];
  if (learnedPreferences) {
    const matchingPattern = learnedPreferences.emphasisPatterns.find(
      p => section.heading?.toLowerCase().includes(p.sectionType.toLowerCase())
    );
    if (matchingPattern && matchingPattern.frequency >= 3) {
      emphasisSuggestion = {
        emphasis: matchingPattern.preferredEmphasis,
        reason: `You often set similar sections to ${matchingPattern.preferredEmphasis}`,
      };
    }
  }

  return {
    sectionId: section.id,
    currentComponent: section.presentation.component,
    suggestions: suggestions.slice(0, fullConfig.maxSuggestionsPerSection),
    autoApplyRecommendation,
    emphasisSuggestion,
  };
}

/**
 * Generate suggestions for an entire blueprint
 */
export async function getBlueprintSuggestions(
  sections: SectionDesign[],
  projectId: string,
  currentVisualStyle: VisualStyle,
  config: Partial<SuggestionConfig> = {}
): Promise<BlueprintSuggestions> {
  const sectionSuggestions: SectionSuggestions[] = [];
  const globalInsights: string[] = [];
  let improvementScore = 0;

  // Generate suggestions for each section
  for (const section of sections) {
    const suggestions = await getSectionSuggestions(section, projectId, config);
    sectionSuggestions.push(suggestions);

    // Count potential improvements
    if (suggestions.autoApplyRecommendation) {
      improvementScore += 15;
    }
    if (suggestions.suggestions.length > 0 && suggestions.suggestions[0].confidence > 0.7) {
      improvementScore += 5;
    }
  }

  // Visual style suggestion from competitor insights
  let visualStyleSuggestion: BlueprintSuggestions['visualStyleSuggestion'];
  try {
    const recommendations = await getDesignRecommendations(projectId);
    if (recommendations.visualStyle !== currentVisualStyle) {
      visualStyleSuggestion = {
        style: recommendations.visualStyle,
        confidence: 0.6,
        reason: `${recommendations.visualStyle} is popular in your industry`,
      };
      improvementScore += 10;
    }
  } catch {
    // Competitor analysis not available
  }

  // Generate global insights
  const componentCounts = new Map<ComponentType, number>();
  for (const section of sections) {
    const comp = section.presentation.component;
    componentCounts.set(comp, (componentCounts.get(comp) || 0) + 1);
  }

  // Check for component overuse
  for (const [component, count] of componentCounts) {
    if (count > sections.length * 0.4) {
      globalInsights.push(`Consider varying layout: ${component} is used ${count} times`);
      improvementScore += 5;
    }
  }

  // Check for missing variety
  const uniqueComponents = componentCounts.size;
  if (uniqueComponents < 3 && sections.length > 5) {
    globalInsights.push('Consider adding more component variety for visual interest');
    improvementScore += 10;
  }

  // Cap improvement score
  improvementScore = Math.min(improvementScore, 100);

  return {
    visualStyleSuggestion,
    sectionSuggestions,
    globalInsights,
    improvementScore,
  };
}

// ============================================================================
// AUTO-APPLY SUGGESTIONS
// ============================================================================

/**
 * Apply all high-confidence suggestions automatically
 */
export function applyAutoSuggestions(
  sections: SectionDesign[],
  blueprintSuggestions: BlueprintSuggestions,
  confidenceThreshold: number = 0.8
): { updatedSections: SectionDesign[]; appliedCount: number } {
  const updatedSections = [...sections];
  let appliedCount = 0;

  for (const suggestion of blueprintSuggestions.sectionSuggestions) {
    if (
      suggestion.autoApplyRecommendation &&
      suggestion.autoApplyRecommendation.confidence >= confidenceThreshold
    ) {
      const sectionIndex = updatedSections.findIndex(s => s.id === suggestion.sectionId);
      if (sectionIndex !== -1) {
        updatedSections[sectionIndex] = {
          ...updatedSections[sectionIndex],
          presentation: {
            ...updatedSections[sectionIndex].presentation,
            component: suggestion.autoApplyRecommendation.component,
          },
          reasoning: `Auto-applied: ${suggestion.autoApplyRecommendation.reason}`,
        };
        appliedCount++;
      }
    }
  }

  return { updatedSections, appliedCount };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determine section position based on content
 */
function getSectionPosition(section: SectionDesign): 'intro' | 'middle' | 'conclusion' {
  const heading = (section.heading || '').toLowerCase();
  const content = (section.sourceContent || '').toLowerCase();

  // Intro patterns
  if (
    heading.includes('intro') ||
    heading.includes('overview') ||
    heading.includes('what is') ||
    content.startsWith('in this article')
  ) {
    return 'intro';
  }

  // Conclusion patterns
  if (
    heading.includes('conclus') ||
    heading.includes('summary') ||
    heading.includes('final') ||
    heading.includes('takeaway') ||
    heading.includes('wrap')
  ) {
    return 'conclusion';
  }

  return 'middle';
}

/**
 * Get suggestion quality score for analytics
 */
export function calculateSuggestionQuality(
  suggestions: BlueprintSuggestions
): {
  averageConfidence: number;
  autoApplyRate: number;
  diversityScore: number;
} {
  const allSuggestions = suggestions.sectionSuggestions.flatMap(s => s.suggestions);

  const averageConfidence = allSuggestions.length > 0
    ? allSuggestions.reduce((sum, s) => sum + s.confidence, 0) / allSuggestions.length
    : 0;

  const autoApplyCount = suggestions.sectionSuggestions.filter(
    s => s.autoApplyRecommendation
  ).length;
  const autoApplyRate = suggestions.sectionSuggestions.length > 0
    ? autoApplyCount / suggestions.sectionSuggestions.length
    : 0;

  // Calculate diversity of suggestion sources
  const sources = new Set(allSuggestions.map(s => s.source));
  const diversityScore = sources.size / 4; // 4 possible sources

  return {
    averageConfidence,
    autoApplyRate,
    diversityScore,
  };
}
