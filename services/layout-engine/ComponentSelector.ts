/**
 * ComponentSelector
 *
 * Selects visual components based on a two-factor selection system:
 * 1. Content type (from SectionAnalysis)
 * 2. Brand personality (from DesignDNA)
 *
 * Selection priority:
 * 1. FS-protected sections -> Always use compliant components
 * 2. High-value sections (UNIQUE/RARE) -> May get enhanced components
 * 3. Standard selection -> Content type x brand personality matrix
 */

import { DesignDNA } from '../../types/designDna';
import {
  ComponentSelection,
  ComponentType,
  ContentType,
  IComponentSelector,
  SectionAnalysis,
} from './types';
import {
  COMPONENT_MAPPINGS,
  getComponentMapping,
  getFSCompliantComponent,
  getHighValueComponent,
  getVariantForPersonality,
  PersonalityType,
} from './componentMappings';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_PERSONALITY: PersonalityType = 'corporate';

const FS_CONFIDENCE = 0.95;
const HIGH_VALUE_BASE_CONFIDENCE = 0.85;
const STANDARD_CONFIDENCE = 0.75;
const FALLBACK_CONFIDENCE = 0.6;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Infer brand personality from formality, energy, and warmth scores.
 * Uses a decision tree approach to map numeric values to personality types.
 */
function inferPersonalityFromScores(
  formality: number,
  energy: number,
  warmth: number
): PersonalityType {
  // High formality + low energy = corporate
  if (formality >= 4 && energy <= 2) {
    return 'corporate';
  }

  // Low formality + high energy = creative or playful
  if (formality <= 2 && energy >= 4) {
    // Only playful if warmth is very high (5)
    return warmth >= 5 ? 'playful' : 'creative';
  }

  // Low formality + low energy = minimal
  if (formality <= 2 && energy <= 2) {
    return 'minimal';
  }

  // High formality + high warmth = elegant
  if (formality >= 4 && warmth >= 4) {
    return 'elegant';
  }

  // High energy + high warmth = friendly
  if (energy >= 4 && warmth >= 4) {
    return 'friendly';
  }

  // High energy + low warmth = bold
  if (energy >= 4 && warmth <= 2) {
    return 'bold';
  }

  // High formality + moderate everything = luxurious
  if (formality >= 4 && energy >= 3 && warmth >= 3) {
    return 'luxurious';
  }

  // Default fallback
  return 'corporate';
}

/**
 * Determine the effective brand personality from DesignDNA.
 * Uses explicit overall personality if available, otherwise infers from scores.
 */
function determinePersonality(dna?: DesignDNA): PersonalityType {
  if (!dna?.personality) {
    return DEFAULT_PERSONALITY;
  }

  // Use explicit overall personality if available
  if (dna.personality.overall) {
    // Map DNA personality to our PersonalityType (they should match)
    return dna.personality.overall as PersonalityType;
  }

  // Infer from formality/energy/warmth scores
  const { formality, energy, warmth } = dna.personality;
  return inferPersonalityFromScores(formality, energy, warmth);
}

/**
 * Check if section requires FS-compliant component selection.
 */
function requiresFSCompliance(analysis: SectionAnalysis): boolean {
  return analysis.formatCode === 'FS' || analysis.constraints.fsTarget === true;
}

/**
 * Check if section qualifies for high-value enhancement.
 */
function qualifiesForHighValue(analysis: SectionAnalysis): boolean {
  const category = analysis.attributeCategory;
  return category === 'UNIQUE' || category === 'RARE';
}

/**
 * Generate reasoning string for the component selection.
 */
function generateReasoning(
  analysis: SectionAnalysis,
  personality: PersonalityType,
  selectionPath: 'fs' | 'high-value' | 'matrix'
): string {
  const { contentType, attributeCategory, formatCode } = analysis;

  switch (selectionPath) {
    case 'fs':
      return `FS-compliant selection for ${contentType} content. Format code: ${formatCode}. HTML structure preserved for Featured Snippet eligibility.`;

    case 'high-value':
      return `Enhanced ${contentType} component for ${attributeCategory} attribute category. High-value content receives premium visual treatment to emphasize differentiated information.`;

    case 'matrix':
      return `Standard ${contentType} content mapped to ${personality} brand personality variant. Two-factor selection from content-type x personality matrix.`;
  }
}

// =============================================================================
// COMPONENT SELECTOR CLASS
// =============================================================================

export class ComponentSelector implements IComponentSelector {
  /**
   * Select a component for a section based on content type and brand personality.
   * Follows priority: FS-protected > High-value > Matrix selection
   */
  static selectComponent(analysis: SectionAnalysis, dna?: DesignDNA): ComponentSelection {
    const personality = determinePersonality(dna);

    // Priority 1: FS-protected sections
    if (requiresFSCompliance(analysis)) {
      return ComponentSelector.selectFSCompliantComponent(analysis);
    }

    // Priority 2: High-value sections (UNIQUE/RARE)
    if (qualifiesForHighValue(analysis)) {
      return ComponentSelector.selectHighValueComponent(analysis, personality);
    }

    // Priority 3: Standard matrix selection
    return ComponentSelector.selectFromMatrix(analysis, personality);
  }

  /**
   * Select components for all sections.
   */
  static selectAllComponents(analyses: SectionAnalysis[], dna?: DesignDNA): ComponentSelection[] {
    return analyses.map((analysis) => ComponentSelector.selectComponent(analysis, dna));
  }

  /**
   * Select an FS-compliant component that preserves HTML structure.
   */
  private static selectFSCompliantComponent(analysis: SectionAnalysis): ComponentSelection {
    const fsComponent = getFSCompliantComponent(analysis.contentType);
    const mapping = getComponentMapping(analysis.contentType);

    return {
      primaryComponent: fsComponent.component,
      alternativeComponents: mapping.alternatives,
      componentVariant: fsComponent.variant,
      confidence: FS_CONFIDENCE,
      reasoning: generateReasoning(analysis, DEFAULT_PERSONALITY, 'fs'),
    };
  }

  /**
   * Select an enhanced component for high-value (UNIQUE/RARE) content.
   */
  private static selectHighValueComponent(
    analysis: SectionAnalysis,
    personality: PersonalityType
  ): ComponentSelection {
    const highValueConfig = getHighValueComponent(analysis.contentType);
    const mapping = getComponentMapping(analysis.contentType);

    // Use high-value variant if available, otherwise use matrix variant with enhanced reasoning
    const variant = highValueConfig?.variant || getVariantForPersonality(mapping, personality);
    const confidenceBoost = highValueConfig?.confidenceBoost || 0.1;

    return {
      primaryComponent: highValueConfig?.component || mapping.componentType,
      alternativeComponents: mapping.alternatives,
      componentVariant: variant,
      confidence: HIGH_VALUE_BASE_CONFIDENCE + confidenceBoost,
      reasoning: generateReasoning(analysis, personality, 'high-value'),
    };
  }

  /**
   * Select from the content type x brand personality matrix.
   */
  private static selectFromMatrix(
    analysis: SectionAnalysis,
    personality: PersonalityType
  ): ComponentSelection {
    const mapping = getComponentMapping(analysis.contentType);

    if (!mapping) {
      // Fallback for unknown content types
      return {
        primaryComponent: 'prose' as ComponentType,
        alternativeComponents: ['card' as ComponentType],
        componentVariant: 'default',
        confidence: FALLBACK_CONFIDENCE,
        reasoning: `Fallback selection for unknown content type: ${analysis.contentType}`,
      };
    }

    const variant = getVariantForPersonality(mapping, personality);

    return {
      primaryComponent: mapping.componentType,
      alternativeComponents: mapping.alternatives,
      componentVariant: variant,
      confidence: STANDARD_CONFIDENCE,
      reasoning: generateReasoning(analysis, personality, 'matrix'),
    };
  }

  // =============================================================================
  // INSTANCE METHODS (delegate to static methods)
  // =============================================================================

  selectComponent(analysis: SectionAnalysis, dna?: DesignDNA): ComponentSelection {
    return ComponentSelector.selectComponent(analysis, dna);
  }

  selectAllComponents(analyses: SectionAnalysis[], dna?: DesignDNA): ComponentSelection[] {
    return ComponentSelector.selectAllComponents(analyses, dna);
  }
}

export default ComponentSelector;
