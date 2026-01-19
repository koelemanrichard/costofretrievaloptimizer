/**
 * Template Router Module
 *
 * AI-driven template selection with reasoning for content generation.
 * Selects the optimal content template based on:
 * - Website type (e.g., ECOMMERCE, SAAS, HEALTHCARE)
 * - Query intent (informational, transactional, commercial, navigational)
 * - Query type (definitional, procedural, comparative, etc.)
 * - Topic classification (core, outer, child)
 * - Brief hints (comparison sections, step sections, specs)
 * - Competitor analysis signals
 *
 * @module services/ai/contentGeneration/templateRouter
 */

import {
  TemplateConfig,
  TemplateName,
  TemplateRouterInput,
  TemplateSelectionResult,
} from '../../../types/contentTemplates';
import { FormatCode } from '../../../types/content';
import { AttributeCategory } from '../../../types/semantic';
import {
  CONTENT_TEMPLATES,
  WEBSITE_TYPE_TEMPLATE_MAP,
  getTemplateByName,
} from '../../../config/contentTemplates';
import { WebsiteType } from '../../../types';

// ============================================================================
// QUERY TYPE TO TEMPLATE MAPPING
// ============================================================================

/**
 * Maps query types to their most appropriate templates
 * Used for query-type-based template overrides
 */
const QUERY_TYPE_TEMPLATE_MAP: Partial<Record<string, TemplateName>> = {
  // Procedural/How-to queries
  procedural: 'PROCESS_HOWTO',
  'how-to': 'PROCESS_HOWTO',
  tutorial: 'PROCESS_HOWTO',
  guide: 'PROCESS_HOWTO',

  // Comparison queries
  comparative: 'COMPARISON',
  comparison: 'COMPARISON',
  versus: 'COMPARISON',
  vs: 'COMPARISON',

  // List queries
  list: 'LISTING_DIRECTORY',
  'best-of': 'LISTING_DIRECTORY',
  top: 'LISTING_DIRECTORY',

  // Definitional queries
  definitional: 'DEFINITIONAL',
  'what-is': 'DEFINITIONAL',
  definition: 'DEFINITIONAL',
};

// ============================================================================
// FORMAT CODE MAPPING
// ============================================================================

/**
 * Maps query types to default format codes
 */
const QUERY_TYPE_FORMAT_MAP: Record<string, FormatCode> = {
  definitional: FormatCode.FS,
  'what-is': FormatCode.FS,
  comparative: FormatCode.TABLE,
  comparison: FormatCode.TABLE,
  list: FormatCode.LISTING,
  'best-of': FormatCode.LISTING,
  procedural: FormatCode.LISTING,
  'how-to': FormatCode.LISTING,
};

/**
 * Maps section types to default format codes
 */
const SECTION_TYPE_FORMAT_MAP: Record<string, FormatCode> = {
  overview: FormatCode.FS,
  definition: FormatCode.FS,
  introduction: FormatCode.FS,
  comparison: FormatCode.TABLE,
  specifications: FormatCode.TABLE,
  specs: FormatCode.TABLE,
  pricing: FormatCode.TABLE,
  features: FormatCode.LISTING,
  benefits: FormatCode.LISTING,
  steps: FormatCode.LISTING,
  items: FormatCode.LISTING,
  faq: FormatCode.PAA,
  questions: FormatCode.PAA,
  analysis: FormatCode.PROSE,
  conclusion: FormatCode.PROSE,
};

// ============================================================================
// ATTRIBUTE ORDER PRESETS
// ============================================================================

/**
 * Default attribute order for most templates
 */
const DEFAULT_ATTRIBUTE_ORDER: AttributeCategory[] = [
  'CORE_DEFINITION',
  'SEARCH_DEMAND',
  'COMPETITIVE_EXPANSION',
];

/**
 * Attribute order overrides by website type and intent
 */
const ATTRIBUTE_ORDER_OVERRIDES: Partial<
  Record<WebsiteType, Partial<Record<string, AttributeCategory[]>>>
> = {
  ECOMMERCE: {
    transactional: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    commercial: ['SEARCH_DEMAND', 'CORE_DEFINITION', 'COMPETITIVE_EXPANSION'],
    informational: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
  },
  SAAS: {
    transactional: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    informational: ['SEARCH_DEMAND', 'CORE_DEFINITION', 'COMPETITIVE_EXPANSION'],
  },
  HEALTHCARE: {
    informational: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
  },
  INFORMATIONAL: {
    informational: ['SEARCH_DEMAND', 'CORE_DEFINITION', 'COMPETITIVE_EXPANSION'],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate confidence score based on input signals
 */
function calculateConfidence(input: TemplateRouterInput, selectedTemplate: TemplateName): number {
  let confidence = 60; // Base confidence

  // Website type alignment
  const defaultTemplate = WEBSITE_TYPE_TEMPLATE_MAP[input.websiteType];
  if (defaultTemplate === selectedTemplate) {
    confidence += 15;
  }

  // Query type alignment
  const queryTypeTemplate = QUERY_TYPE_TEMPLATE_MAP[input.queryType];
  if (queryTypeTemplate === selectedTemplate) {
    confidence += 10;
  }

  // Brief hints alignment
  if (input.briefHints) {
    if (input.briefHints.hasComparisonSections && selectedTemplate === 'COMPARISON') {
      confidence += 10;
    }
    if (input.briefHints.hasStepSections && selectedTemplate === 'PROCESS_HOWTO') {
      confidence += 10;
    }
    if (input.briefHints.hasSpecsSections && selectedTemplate === 'ECOMMERCE_PRODUCT') {
      confidence += 5;
    }
  }

  // Intent alignment
  if (input.queryIntent === 'transactional' && selectedTemplate === 'ECOMMERCE_PRODUCT') {
    confidence += 5;
  }
  if (input.queryIntent === 'informational' && selectedTemplate === 'DEFINITIONAL') {
    confidence += 5;
  }

  // Competitor analysis adds confidence
  if (input.competitorAnalysis) {
    confidence += 5;
  }

  // Cap at 100
  return Math.min(confidence, 100);
}

/**
 * Generate reasoning for template selection
 */
function generateReasoning(input: TemplateRouterInput, selectedTemplate: TemplateName): string[] {
  const reasons: string[] = [];

  // Website type reasoning
  const defaultTemplate = WEBSITE_TYPE_TEMPLATE_MAP[input.websiteType];
  if (defaultTemplate === selectedTemplate) {
    reasons.push(
      `Website type '${input.websiteType}' maps to '${selectedTemplate}' template`
    );
  }

  // Query type reasoning
  const queryTypeTemplate = QUERY_TYPE_TEMPLATE_MAP[input.queryType];
  if (queryTypeTemplate) {
    if (queryTypeTemplate === selectedTemplate) {
      reasons.push(
        `Query type '${input.queryType}' indicates '${selectedTemplate}' template is optimal`
      );
    } else {
      reasons.push(
        `Query type '${input.queryType}' suggests '${queryTypeTemplate}' but other factors override`
      );
    }
  }

  // Brief hints reasoning
  if (input.briefHints) {
    if (input.briefHints.hasComparisonSections) {
      if (selectedTemplate === 'COMPARISON') {
        reasons.push('Brief contains comparison sections, confirming COMPARISON template');
      } else {
        reasons.push('Brief has comparison sections but other factors take precedence');
      }
    }
    if (input.briefHints.hasStepSections) {
      if (selectedTemplate === 'PROCESS_HOWTO') {
        reasons.push('Brief contains step-by-step sections, confirming PROCESS_HOWTO template');
      } else {
        reasons.push('Brief has step sections but other factors take precedence');
      }
    }
  }

  // Intent reasoning
  if (input.queryIntent === 'transactional') {
    reasons.push(`Transactional intent favors conversion-focused templates`);
  } else if (input.queryIntent === 'commercial') {
    reasons.push(`Commercial intent suggests comparison or product-focused content`);
  } else if (input.queryIntent === 'informational') {
    reasons.push(`Informational intent favors educational content structures`);
  }

  // Topic type reasoning
  if (input.topicType === 'core') {
    reasons.push('Core topic type indicates comprehensive coverage needed');
  } else if (input.topicType === 'outer') {
    reasons.push('Outer topic type may require more focused structure');
  }

  // Competitor analysis reasoning
  if (input.competitorAnalysis) {
    reasons.push(
      `Competitor analysis shows dominant format '${input.competitorAnalysis.dominantFormat}' with avg ${input.competitorAnalysis.avgSectionCount} sections`
    );
  }

  return reasons;
}

/**
 * Generate alternative templates with reasons
 * Always provides at least 2-3 alternatives so users can override the selection
 */
function generateAlternatives(
  input: TemplateRouterInput,
  selectedTemplate: TemplateName
): Array<{ templateName: TemplateName; reason: string }> {
  const alternatives: Array<{ templateName: TemplateName; reason: string }> = [];
  const addedTemplates = new Set<TemplateName>([selectedTemplate]);

  const addAlternative = (templateName: TemplateName, reason: string) => {
    if (!addedTemplates.has(templateName)) {
      alternatives.push({ templateName, reason });
      addedTemplates.add(templateName);
    }
  };

  // Add website type default if different
  const websiteDefault = WEBSITE_TYPE_TEMPLATE_MAP[input.websiteType];
  if (websiteDefault !== selectedTemplate) {
    addAlternative(websiteDefault, `Default template for ${input.websiteType} website type`);
  }

  // Add query type template if different
  const queryTypeTemplate = QUERY_TYPE_TEMPLATE_MAP[input.queryType];
  if (queryTypeTemplate) {
    addAlternative(queryTypeTemplate, `Matches query type '${input.queryType}'`);
  }

  // Add DEFINITIONAL as fallback for informational intent
  if (input.queryIntent === 'informational') {
    addAlternative('DEFINITIONAL', 'Standard template for informational content');
  }

  // Add COMPARISON for commercial intent
  if (input.queryIntent === 'commercial') {
    addAlternative('COMPARISON', 'Comparison template suits commercial research intent');
  }

  // Always ensure at least 2-3 popular alternatives are available
  // These are commonly useful templates users might want to override to
  const popularAlternatives: Array<{ templateName: TemplateName; reason: string }> = [
    { templateName: 'PROCESS_HOWTO', reason: 'Step-by-step guide format for instructional content' },
    { templateName: 'COMPARISON', reason: 'Side-by-side comparison format for evaluative content' },
    { templateName: 'LISTING_DIRECTORY', reason: 'List-based format for collections and roundups' },
    { templateName: 'DEFINITIONAL', reason: 'Educational format for explaining concepts' },
  ];

  for (const alt of popularAlternatives) {
    if (alternatives.length >= 3) break;
    addAlternative(alt.templateName, alt.reason);
  }

  // Limit to 3 alternatives
  return alternatives.slice(0, 3);
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Select the optimal template with AI reasoning
 *
 * Selection logic:
 * 1. Start with website type mapping as base template
 * 2. Check query intent overrides (commercial + comparison -> COMPARISON)
 * 3. Check query type overrides (procedural -> PROCESS_HOWTO, comparative -> COMPARISON)
 * 4. Check brief hints (hasStepSections, hasComparisonSections, hasSpecsSections)
 * 5. Consider competitor analysis signals
 * 6. Adjust for topic type (core vs child)
 * 7. Generate alternatives
 *
 * @param input - Template router input with context
 * @returns Template selection result with reasoning and alternatives
 */
export function selectTemplate(input: TemplateRouterInput): TemplateSelectionResult {
  let selectedTemplateName: TemplateName;

  // Step 1: Start with website type default
  selectedTemplateName = WEBSITE_TYPE_TEMPLATE_MAP[input.websiteType];

  // Step 2: Check query intent overrides
  if (input.queryIntent === 'commercial' && input.queryType === 'comparative') {
    selectedTemplateName = 'COMPARISON';
  }

  // Step 3: Check query type overrides (strong signal)
  const queryTypeTemplate = QUERY_TYPE_TEMPLATE_MAP[input.queryType];
  if (queryTypeTemplate) {
    // Query type is a strong signal for procedural and comparative
    if (
      input.queryType === 'procedural' ||
      input.queryType === 'how-to' ||
      input.queryType === 'tutorial'
    ) {
      selectedTemplateName = 'PROCESS_HOWTO';
    } else if (
      input.queryType === 'comparative' ||
      input.queryType === 'comparison' ||
      input.queryType === 'versus'
    ) {
      selectedTemplateName = 'COMPARISON';
    }
  }

  // Step 4: Check brief hints (override if strong signal)
  if (input.briefHints) {
    if (input.briefHints.hasComparisonSections && !input.briefHints.hasStepSections) {
      selectedTemplateName = 'COMPARISON';
    }
    if (input.briefHints.hasStepSections && !input.briefHints.hasComparisonSections) {
      selectedTemplateName = 'PROCESS_HOWTO';
    }
  }

  // Step 5: Competitor analysis can influence selection
  if (input.competitorAnalysis) {
    const dominantFormat = input.competitorAnalysis.dominantFormat.toLowerCase();
    if (dominantFormat.includes('comparison') || dominantFormat.includes('table')) {
      // Only override if not already a specialized template
      if (
        selectedTemplateName === 'DEFINITIONAL' ||
        selectedTemplateName === WEBSITE_TYPE_TEMPLATE_MAP[input.websiteType]
      ) {
        // Competitor signal is weaker than explicit query type/brief hints
        // Just note it in reasoning
      }
    }
  }

  // Step 6: Topic type adjustments
  // Core topics may need more comprehensive templates
  // Child topics may benefit from more focused structures
  // (This is reflected in reasoning, not in template selection)

  // Get the actual template config
  const template = getTemplateByName(selectedTemplateName);
  if (!template) {
    // Fallback to DEFINITIONAL if template not found
    selectedTemplateName = 'DEFINITIONAL';
  }

  const finalTemplate = getTemplateByName(selectedTemplateName) || CONTENT_TEMPLATES.DEFINITIONAL;

  // Calculate confidence and generate reasoning
  const confidence = calculateConfidence(input, selectedTemplateName);
  const reasoning = generateReasoning(input, selectedTemplateName);
  const alternatives = generateAlternatives(input, selectedTemplateName);

  return {
    template: finalTemplate,
    confidence,
    reasoning,
    alternatives,
  };
}

/**
 * Simple routing that returns template directly
 * Backwards compatible interface for simpler use cases
 *
 * @param input - Template router input
 * @returns Template configuration
 */
export function routeToTemplate(input: TemplateRouterInput): TemplateConfig {
  const result = selectTemplate(input);
  return result.template;
}

/**
 * Get the format code for a section based on query type and section type
 *
 * @param queryType - The query type (definitional, comparative, list, etc.)
 * @param sectionType - The section type (overview, comparison, faq, etc.)
 * @returns Format code string
 */
export function getFormatCodeForSection(queryType: string, sectionType: string): string {
  // First check section type (more specific)
  const sectionFormat = SECTION_TYPE_FORMAT_MAP[sectionType.toLowerCase()];
  if (sectionFormat) {
    return sectionFormat;
  }

  // Then check query type (more general)
  const queryFormat = QUERY_TYPE_FORMAT_MAP[queryType.toLowerCase()];
  if (queryFormat) {
    return queryFormat;
  }

  // Default to PROSE
  return FormatCode.PROSE;
}

/**
 * Get attribute ordering based on website type and intent
 *
 * @param websiteType - The website type
 * @param intent - The query intent
 * @returns Ordered array of attribute categories
 */
export function getAttributeOrder(
  websiteType: WebsiteType | string,
  intent: string
): AttributeCategory[] {
  // Check for override
  const typeOverrides = ATTRIBUTE_ORDER_OVERRIDES[websiteType as WebsiteType];
  if (typeOverrides) {
    const intentOverride = typeOverrides[intent];
    if (intentOverride) {
      return intentOverride;
    }
  }

  // Return default order
  return DEFAULT_ATTRIBUTE_ORDER;
}
