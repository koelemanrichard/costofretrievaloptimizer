/**
 * Content Templates Types Module
 *
 * Contains types for the content template routing system including:
 * - TemplateName: Available template identifiers
 * - SectionTemplate: Section structure within templates
 * - TemplateConfig: Full template configuration
 * - TemplateRouterInput/Result: Template selection types
 * - DepthAnalyzer types: Content depth analysis
 * - ConflictDetection types: Brief/template conflict handling
 *
 * Created: 2026-01-18 - Content Template Routing implementation
 *
 * @module types/contentTemplates
 */

import { FormatCode, ContentZone } from './content';
import { AttributeCategory } from './semantic';
import { WebsiteType } from '../types';

// ============================================================================
// TEMPLATE NAMES
// ============================================================================

/**
 * Template names for content generation
 */
export type TemplateName =
  | 'DEFINITIONAL'
  | 'PROCESS_HOWTO'
  | 'ECOMMERCE_PRODUCT'
  | 'COMPARISON'
  | 'HEALTHCARE_YMYL'
  | 'SAAS_FEATURE'
  | 'NEWS_ARTICLE'
  | 'LISTING_DIRECTORY'
  | 'EVENT_EXPERIENCE'
  | 'COURSE_EDUCATION'
  | 'IMPACT_NONPROFIT'
  | 'LOCATION_REALESTATE';

// ============================================================================
// STYLOMETRY
// ============================================================================

/**
 * Stylometry options for content tone
 */
export type Stylometry = 'ACADEMIC_FORMAL' | 'DIRECT_TECHNICAL' | 'PERSUASIVE_SALES' | 'INSTRUCTIONAL_CLEAR';

// ============================================================================
// SECTION TEMPLATE
// ============================================================================

/**
 * Section template within a content template
 */
export interface SectionTemplate {
  /** Heading pattern with {entity} placeholder */
  headingPattern: string;
  /** Default format code for this section */
  formatCode: FormatCode;
  /** Attribute category for ordering */
  attributeCategory: AttributeCategory;
  /** Content zone classification */
  contentZone: ContentZone;
  /** Whether this section is required */
  required: boolean;
  /** Order in the template (1-based) */
  order: number;
}

// ============================================================================
// TEMPLATE CONFIGURATION
// ============================================================================

/**
 * Full template configuration
 */
export interface TemplateConfig {
  /** Template identifier */
  templateName: TemplateName;
  /** Human-readable label */
  label: string;
  /** Template description */
  description: string;
  /** Section structure */
  sectionStructure: SectionTemplate[];
  /** Default format codes by section type */
  formatCodeDefaults: Partial<Record<string, FormatCode>>;
  /** Attribute ordering override */
  attributeOrderOverride?: AttributeCategory[];
  /** Maximum sections for this template */
  maxSections: number;
  /** Minimum sections for this template */
  minSections: number;
  /** CSI predicates for linking */
  csiPredicates: string[];
  /** Default stylometry */
  stylometry: Stylometry;
}

// ============================================================================
// TEMPLATE ROUTER
// ============================================================================

/**
 * Input for template selection
 */
export interface TemplateRouterInput {
  websiteType: WebsiteType;
  queryIntent: 'informational' | 'transactional' | 'commercial' | 'navigational';
  queryType: string;
  topicType: 'core' | 'outer' | 'child';
  topicClass: 'monetization' | 'informational';
  competitorAnalysis?: {
    dominantFormat: string;
    avgSectionCount: number;
    avgWordCount: number;
  };
  briefHints?: {
    hasComparisonSections: boolean;
    hasStepSections: boolean;
    hasSpecsSections: boolean;
  };
}

/**
 * Result from template selection with AI reasoning
 */
export interface TemplateSelectionResult {
  template: TemplateConfig;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{
    templateName: TemplateName;
    reason: string;
  }>;
}

// ============================================================================
// DEPTH ANALYZER
// ============================================================================

/**
 * Depth suggestion modes
 */
export type DepthMode = 'high-quality' | 'quick-publish' | 'moderate';

/**
 * Input for depth analysis
 */
export interface DepthAnalyzerInput {
  competitorWordCounts: number[];
  serpDifficulty: 'low' | 'medium' | 'high';
  queryIntent: string;
  topicType: 'core' | 'outer' | 'child';
  existingTopicalAuthority: number;
}

/**
 * Depth suggestion result
 */
export interface DepthSuggestion {
  recommended: DepthMode;
  reasoning: string[];
  competitorBenchmark: {
    avgWordCount: number;
    avgSections: number;
    topPerformerWordCount: number;
  };
  settings: {
    maxSections: number;
    targetWordCount: { min: number; max: number };
    sectionDepth: 'comprehensive' | 'moderate' | 'brief';
  };
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Conflict item between template and brief
 */
export interface ConflictItem {
  field: string;
  briefValue: unknown;
  templateValue: unknown;
  severity: 'minor' | 'moderate' | 'critical';
  semanticSeoArgument: string;
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictItem[];
  overallSeverity: 'minor' | 'moderate' | 'critical';
  aiRecommendation: {
    action: 'use-template' | 'use-brief' | 'merge';
    reasoning: string[];
  };
}
