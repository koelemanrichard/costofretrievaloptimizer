/**
 * Component Mappings
 *
 * Defines the mapping tables for two-factor component selection based on:
 * 1. Content type (from SectionAnalysis)
 * 2. Brand personality (from DesignDNA)
 *
 * Also includes FS-compliant components and high-value enhancements.
 */

import { ComponentType, ContentType } from './types';

// =============================================================================
// PERSONALITY TYPES
// =============================================================================

export type PersonalityType =
  | 'corporate'
  | 'creative'
  | 'minimal'
  | 'luxurious'
  | 'friendly'
  | 'bold'
  | 'elegant'
  | 'playful';

// =============================================================================
// COMPONENT MAPPING STRUCTURE
// =============================================================================

export interface ComponentMapping {
  componentType: ComponentType;
  variants: Record<PersonalityType, string>;
  alternatives: ComponentType[];
}

// =============================================================================
// FS-COMPLIANT COMPONENTS
// =============================================================================

/**
 * FS-compliant component mappings.
 * These preserve HTML structure for Featured Snippet eligibility.
 */
export const FS_COMPLIANT_COMPONENTS: Record<string, { component: ComponentType; variant: string }> = {
  // List types
  'numbered-list': { component: 'step-list', variant: 'fs-compliant' },
  'bulleted-list': { component: 'checklist', variant: 'fs-compliant' },
  steps: { component: 'step-list', variant: 'fs-compliant' },
  list: { component: 'checklist', variant: 'fs-compliant' },

  // Table types
  table: { component: 'comparison-table', variant: 'fs-compliant' },
  comparison: { component: 'comparison-table', variant: 'fs-compliant' },
  data: { component: 'comparison-table', variant: 'fs-compliant' },

  // Definition types
  definition: { component: 'definition-box', variant: 'fs-compliant' },

  // FAQ types (PAA)
  faq: { component: 'faq-accordion', variant: 'fs-compliant' },

  // Summary types
  summary: { component: 'key-takeaways', variant: 'fs-compliant' },

  // Default fallback
  default: { component: 'prose', variant: 'fs-compliant' },
};

// =============================================================================
// HIGH-VALUE COMPONENTS (UNIQUE/RARE)
// =============================================================================

/**
 * Enhanced components for high-value content (UNIQUE/RARE attribute categories).
 * These provide extra visual emphasis for differentiated content.
 */
export const HIGH_VALUE_COMPONENTS: Record<ContentType, { component: ComponentType; variant: string; confidenceBoost: number }> = {
  summary: { component: 'key-takeaways', variant: 'featured', confidenceBoost: 0.15 },
  explanation: { component: 'prose', variant: 'unique-insight', confidenceBoost: 0.15 },
  definition: { component: 'definition-box', variant: 'highlighted', confidenceBoost: 0.15 },
  introduction: { component: 'hero', variant: 'featured', confidenceBoost: 0.1 },
  steps: { component: 'timeline', variant: 'featured', confidenceBoost: 0.1 },
  faq: { component: 'faq-accordion', variant: 'featured', confidenceBoost: 0.1 },
  comparison: { component: 'comparison-table', variant: 'featured', confidenceBoost: 0.1 },
  testimonial: { component: 'testimonial-card', variant: 'featured', confidenceBoost: 0.1 },
  list: { component: 'checklist', variant: 'featured', confidenceBoost: 0.1 },
  data: { component: 'stat-highlight', variant: 'featured', confidenceBoost: 0.1 },
};

// =============================================================================
// MAIN COMPONENT MAPPINGS (Two-Factor Matrix)
// =============================================================================

/**
 * Two-factor component selection matrix.
 * Maps content type to component with personality-specific variants.
 *
 * | Content Type | Corporate | Creative | Minimal | Luxurious | Friendly | Bold | Elegant | Playful |
 * |--------------|-----------|----------|---------|-----------|----------|------|---------|---------|
 */
export const COMPONENT_MAPPINGS: Record<ContentType, ComponentMapping> = {
  introduction: {
    componentType: 'hero',
    variants: {
      corporate: 'contained',
      creative: 'gradient',
      minimal: 'simple',
      luxurious: 'elegant',
      friendly: 'warm',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'animated',
    },
    alternatives: ['prose', 'card'],
  },

  explanation: {
    componentType: 'prose',
    variants: {
      corporate: 'structured',
      creative: 'flowing',
      minimal: 'clean',
      luxurious: 'elegant',
      friendly: 'conversational',
      bold: 'impactful',
      elegant: 'refined',
      playful: 'casual',
    },
    alternatives: ['card', 'feature-grid'],
  },

  steps: {
    componentType: 'timeline',
    variants: {
      corporate: 'vertical-professional',
      creative: 'playful',
      minimal: 'numbered',
      luxurious: 'elegant-flow',
      friendly: 'cheerful',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'animated',
    },
    alternatives: ['step-list', 'checklist'],
  },

  faq: {
    componentType: 'faq-accordion',
    variants: {
      corporate: 'clean',
      creative: 'colorful',
      minimal: 'minimal',
      luxurious: 'elegant',
      friendly: 'warm',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'bouncy',
    },
    alternatives: ['accordion', 'card'],
  },

  comparison: {
    componentType: 'comparison-table',
    variants: {
      corporate: 'striped',
      creative: 'cards',
      minimal: 'simple',
      luxurious: 'elegant',
      friendly: 'friendly',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'colorful',
    },
    alternatives: ['feature-grid', 'card'],
  },

  summary: {
    componentType: 'key-takeaways',
    variants: {
      corporate: 'key-points',
      creative: 'visual',
      minimal: 'checklist',
      luxurious: 'elegant',
      friendly: 'friendly',
      bold: 'impactful',
      elegant: 'refined',
      playful: 'fun',
    },
    alternatives: ['card', 'checklist'],
  },

  testimonial: {
    componentType: 'testimonial-card',
    variants: {
      corporate: 'bordered',
      creative: 'gradient',
      minimal: 'subtle',
      luxurious: 'elegant',
      friendly: 'warm',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'cheerful',
    },
    alternatives: ['blockquote', 'card'],
  },

  definition: {
    componentType: 'definition-box',
    variants: {
      corporate: 'bordered',
      creative: 'highlighted',
      minimal: 'simple',
      luxurious: 'elegant',
      friendly: 'friendly',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'colorful',
    },
    alternatives: ['prose', 'card'],
  },

  list: {
    componentType: 'checklist',
    variants: {
      corporate: 'professional',
      creative: 'icons',
      minimal: 'simple',
      luxurious: 'elegant',
      friendly: 'friendly',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'colorful',
    },
    alternatives: ['step-list', 'feature-grid'],
  },

  data: {
    componentType: 'stat-highlight',
    variants: {
      corporate: 'structured',
      creative: 'visual',
      minimal: 'simple',
      luxurious: 'elegant',
      friendly: 'friendly',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'animated',
    },
    alternatives: ['comparison-table', 'card'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the component mapping for a given content type.
 * Falls back to 'explanation' if content type is not found.
 */
export function getComponentMapping(contentType: ContentType): ComponentMapping {
  return COMPONENT_MAPPINGS[contentType] || COMPONENT_MAPPINGS.explanation;
}

/**
 * Get the FS-compliant component for a given content type.
 * Falls back to default prose if content type is not found.
 */
export function getFSCompliantComponent(contentType: ContentType): { component: ComponentType; variant: string } {
  return FS_COMPLIANT_COMPONENTS[contentType] || FS_COMPLIANT_COMPONENTS.default;
}

/**
 * Get the high-value enhanced component for a given content type.
 */
export function getHighValueComponent(contentType: ContentType): { component: ComponentType; variant: string; confidenceBoost: number } {
  return HIGH_VALUE_COMPONENTS[contentType];
}

/**
 * Get the variant for a given personality type.
 * Falls back to 'corporate' if personality is not recognized.
 */
export function getVariantForPersonality(mapping: ComponentMapping, personality: PersonalityType): string {
  return mapping.variants[personality] || mapping.variants.corporate;
}
