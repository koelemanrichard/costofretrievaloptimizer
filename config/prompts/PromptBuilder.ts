/**
 * PromptBuilder - Centralized prompt construction utilities
 *
 * This module provides reusable building blocks for constructing AI prompts:
 * - Business context generation
 * - JSON response instructions
 * - Stylometry instructions
 * - Website type-specific rules
 * - Prompt composition utilities
 *
 * Created: 2024-12-20 - Prompt template engine
 */

import type { BusinessInfo, AuthorProfile, WebsiteType, SEOPillars } from '../../types';
import { getWebsiteTypeConfig } from '../websiteTypeTemplates';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Standard counts for AI-generated lists to ensure consistency
 */
export const PROMPT_CONSTRAINTS = {
  ENTITY_CANDIDATES_COUNT: 5,
  SOURCE_CONTEXT_OPTIONS_COUNT: 4,
  SEARCH_INTENT_COUNT: 3,
  SEMANTIC_TRIPLES_COUNT: 15,
  TOPIC_RECOMMENDATIONS_COUNT: 10,
  KNOWLEDGE_TERMS_COUNT: 20,
  BRIEF_SECTIONS_MIN: 5,
  BRIEF_SECTIONS_MAX: 12,
} as const;

// ============================================================================
// JSON INSTRUCTIONS
// ============================================================================

/**
 * Standard JSON response instruction - use at end of prompts requiring JSON output
 */
export const jsonResponseInstruction = `
Respond with a valid JSON object. Do not include any explanatory text or markdown formatting before or after the JSON.
`;

/**
 * Generate a JSON array example format instruction
 */
export function jsonArrayExample(count: number, fields: Record<string, string>): string {
  const exampleObject = Object.entries(fields)
    .map(([key, value]) => `"${key}": "${value}"`)
    .join(', ');

  const examples = Array.from({ length: count }, (_, i) => {
    // Replace placeholders with numbered versions
    return `  {${exampleObject.replace(/example/gi, `Example ${i + 1}`)}}`;
  }).join(',\n');

  return `**IMPORTANT: Return a JSON ARRAY with EXACTLY ${count} objects. Example format:**
[
${examples}
]`;
}

// ============================================================================
// BUSINESS CONTEXT
// ============================================================================

/**
 * Generate the standard business context section for prompts
 */
export function businessContext(info: BusinessInfo): string {
  const typeConfig = info.websiteType ? getWebsiteTypeConfig(info.websiteType) : null;

  return `
Business Context:
- Domain: ${info.domain}
- Industry: ${info.industry}
- Business Model: ${info.model}
- Website Type: ${typeConfig?.label || 'General/Informational'}
- Target Audience: ${info.audience}
- Unique Value Proposition: ${info.valueProp}
- Stated Expertise Level: ${info.expertise}
- Main Topic / Seed Keyword: ${info.seedKeyword}
- Target Market: ${info.targetMarket}
- Language: ${info.language}
${info.authorName ? `- Author: ${info.authorName} (${info.authorBio || ''})` : ''}
${info.authorCredentials ? `- Author Credentials: ${info.authorCredentials}` : ''}
${info.uniqueDataAssets ? `- Unique Data Assets: ${info.uniqueDataAssets}` : ''}
`;
}

/**
 * Generate a compact business context for token-limited prompts
 */
export function compactBusinessContext(info: BusinessInfo): string {
  return `Business: ${info.domain} | Industry: ${info.industry} | Audience: ${info.audience} | Seed: ${info.seedKeyword}`;
}

// ============================================================================
// SEO PILLARS CONTEXT
// ============================================================================

/**
 * Generate SEO pillars context section
 */
export function pillarsContext(pillars: SEOPillars): string {
  return `
SEO Pillars:
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}
`;
}

/**
 * Generate compact pillars context
 */
export function compactPillarsContext(pillars: SEOPillars): string {
  return `Entity: "${pillars.centralEntity}" | Context: "${pillars.sourceContext}" | Intent: "${pillars.centralSearchIntent}"`;
}

// ============================================================================
// STYLOMETRY
// ============================================================================

/**
 * Generate stylometry instructions based on author profile
 */
export function stylometryInstructions(profile?: AuthorProfile): string {
  if (!profile) return 'Tone: Professional and authoritative.';

  const styleMap: Record<string, string> = {
    ACADEMIC_FORMAL:
      'Tone: Academic and Formal. Use objective language. Prioritize precision, nuance, and citation of principles. Avoid colloquialisms. Complex sentence structures are permitted if they add precision.',
    DIRECT_TECHNICAL:
      'Tone: Direct and Technical. Use short, declarative sentences. Focus on mechanics, specifications, and "how-to". Avoid adjectives and fluff. Prioritize clarity and brevity over elegance.',
    PERSUASIVE_SALES:
      'Tone: Persuasive and Benefit-Driven. Use active voice. Focus on outcomes, value propositions, and solving user pain points. Use rhetorical questions sparingly to drive engagement.',
    INSTRUCTIONAL_CLEAR:
      'Tone: Instructional and Clear. Use simple, accessible language (EL15). Focus on step-by-step logic. Define technical terms immediately upon introduction.',
  };

  let stylePrompt = styleMap[profile.stylometry || 'INSTRUCTIONAL_CLEAR'] || styleMap.INSTRUCTIONAL_CLEAR;

  if (profile.customStylometryRules && profile.customStylometryRules.length > 0) {
    stylePrompt += '\n\nNEGATIVE CONSTRAINTS (Strictly Forbidden):';
    profile.customStylometryRules.forEach(rule => {
      stylePrompt += `\n- ${rule}`;
    });
  }

  return stylePrompt;
}

// ============================================================================
// WEBSITE TYPE INSTRUCTIONS
// ============================================================================

/**
 * Generate website type-specific instructions for topical map generation
 */
export function websiteTypeInstructions(websiteType?: WebsiteType): string {
  if (!websiteType) return '';

  const config = getWebsiteTypeConfig(websiteType);

  let instructions = `
**WEBSITE TYPE-SPECIFIC STRATEGY: ${config.label.toUpperCase()}**
${config.description}

**Core Section Focus (Monetization):**
${config.coreSectionRules.description}
- Required page types: ${config.coreSectionRules.requiredPageTypes.join(', ')}
- Optional page types: ${config.coreSectionRules.optionalPageTypes.join(', ')}
- Content depth: ${config.coreSectionRules.contentDepth}
- Attribute priority: ${config.coreSectionRules.attributePriority.join(' → ')}

**Author Section Focus (Authority Building):**
${config.authorSectionRules.description}
- Required page types: ${config.authorSectionRules.requiredPageTypes.join(', ')}
- Link-back strategy: ${config.authorSectionRules.linkBackStrategy} (PageRank should flow from Author → Core)

**Hub-Spoke Structure:**
- Optimal ratio: 1:${config.hubSpokeRatio.optimal} (min: ${config.hubSpokeRatio.min}, max: ${config.hubSpokeRatio.max})
- Generate ${config.hubSpokeRatio.optimal} spokes per core topic

**Linking Rules:**
- Max ${config.linkingRules.maxAnchorsPerPage} anchors per page
- Max ${config.linkingRules.maxAnchorRepetition} repetitions of same anchor text
- Link direction: ${config.linkingRules.preferredLinkDirection.replace(/_/g, ' ')}
`;

  // Add type-specific template patterns
  if (config.templatePatterns.length > 0) {
    instructions += `
**Recommended Topic Templates:**
`;
    config.templatePatterns.forEach(template => {
      instructions += `- ${template.name}: ${template.description} (Schema: ${template.schemaType})
`;
    });
  }

  // Add type-specific EAV priorities
  instructions += `
**Prioritized Attributes for this Website Type:**
- ROOT (Essential): ${config.eavPriority.requiredCategories.ROOT.join(', ')}
- UNIQUE (Differentiating): ${config.eavPriority.requiredCategories.UNIQUE.join(', ')}
- RARE (Detailed): ${config.eavPriority.requiredCategories.RARE.join(', ')}
- Composite: ${config.eavPriority.compositeAttributes.join(', ')}
`;

  return instructions;
}

// ============================================================================
// PROMPT COMPOSITION
// ============================================================================

/**
 * Prompt part for composition
 */
export interface PromptPart {
  content: string;
  condition?: boolean;
}

/**
 * Compose a prompt from multiple parts
 * @param parts Array of prompt parts (string or PromptPart objects)
 * @returns Combined prompt string
 */
export function composePrompt(...parts: (string | PromptPart | undefined | null)[]): string {
  return parts
    .filter((part): part is string | PromptPart => part != null)
    .filter(part => {
      if (typeof part === 'string') return part.trim().length > 0;
      return part.condition !== false && part.content.trim().length > 0;
    })
    .map(part => (typeof part === 'string' ? part : part.content))
    .join('\n\n');
}

/**
 * Create a critical requirement instruction
 */
export function criticalRequirement(count: number, item: string): string {
  return `**CRITICAL: You MUST return EXACTLY ${count} ${item}. Do not return fewer than ${count}.**`;
}

/**
 * Create a numbered list format instruction
 */
export function numberedListFormat(fields: { name: string; description: string }[]): string {
  return fields.map((f, i) => `${i + 1}. "${f.name}": ${f.description}`).join('\n');
}

// ============================================================================
// PROMPT BUILDER CLASS
// ============================================================================

/**
 * Fluent prompt builder for constructing complex prompts
 */
export class PromptBuilder {
  private parts: string[] = [];

  /**
   * Add a raw string part
   */
  add(content: string): this {
    if (content.trim()) {
      this.parts.push(content);
    }
    return this;
  }

  /**
   * Add content conditionally
   */
  addIf(condition: boolean, content: string): this {
    if (condition && content.trim()) {
      this.parts.push(content);
    }
    return this;
  }

  /**
   * Add business context
   */
  addBusinessContext(info: BusinessInfo): this {
    this.parts.push(businessContext(info));
    return this;
  }

  /**
   * Add compact business context
   */
  addCompactBusinessContext(info: BusinessInfo): this {
    this.parts.push(compactBusinessContext(info));
    return this;
  }

  /**
   * Add SEO pillars context
   */
  addPillarsContext(pillars: SEOPillars): this {
    this.parts.push(pillarsContext(pillars));
    return this;
  }

  /**
   * Add stylometry instructions
   */
  addStylometry(profile?: AuthorProfile): this {
    this.parts.push(stylometryInstructions(profile));
    return this;
  }

  /**
   * Add website type instructions
   */
  addWebsiteType(type?: WebsiteType): this {
    const instructions = websiteTypeInstructions(type);
    if (instructions) {
      this.parts.push(instructions);
    }
    return this;
  }

  /**
   * Add JSON response instruction
   */
  addJsonInstruction(): this {
    this.parts.push(jsonResponseInstruction);
    return this;
  }

  /**
   * Add critical requirement
   */
  addCriticalRequirement(count: number, item: string): this {
    this.parts.push(criticalRequirement(count, item));
    return this;
  }

  /**
   * Add JSON array example
   */
  addJsonArrayExample(count: number, fields: Record<string, string>): this {
    this.parts.push(jsonArrayExample(count, fields));
    return this;
  }

  /**
   * Build the final prompt string
   */
  build(): string {
    return this.parts.join('\n\n');
  }

  /**
   * Reset the builder for reuse
   */
  reset(): this {
    this.parts = [];
    return this;
  }
}

/**
 * Factory function to create a new PromptBuilder
 */
export function createPromptBuilder(): PromptBuilder {
  return new PromptBuilder();
}
