// services/ai/contentGeneration/rulesEngine/validators/linkInsertionValidator.ts

import { ContentBrief, ContextualBridgeLink, ValidationViolation } from '../../../../../types';
import { slugify } from '../../../../../utils/helpers';

/**
 * Link Insertion Validator
 *
 * Validates that expected internal links from the content brief
 * were actually inserted into the generated content.
 *
 * This validator runs after Pass 6 (Discourse Integration) to ensure
 * that the AI followed the link insertion instructions.
 */

export interface LinkInsertionResult {
  /** Total expected links from brief */
  expectedCount: number;
  /** Links found in content */
  foundCount: number;
  /** Links that were expected but not found */
  missingLinks: ContextualBridgeLink[];
  /** Links that were found */
  foundLinks: string[];
  /** Percentage of links successfully inserted */
  insertionRate: number;
  /** Whether the minimum threshold was met (>=75%) */
  passed: boolean;
}

/**
 * Extract contextual bridge links from a ContentBrief
 * Handles both legacy array format and new section format
 */
export function extractContextualBridgeLinks(brief: ContentBrief): ContextualBridgeLink[] {
  const links: ContextualBridgeLink[] = [];

  // Extract from contextualBridge
  if (brief.contextualBridge) {
    if (Array.isArray(brief.contextualBridge)) {
      links.push(...brief.contextualBridge);
    } else if (brief.contextualBridge.type === 'section' && brief.contextualBridge.links) {
      links.push(...brief.contextualBridge.links);
    }
  }

  // Extract from suggested_internal_links (newer format)
  if (brief.suggested_internal_links && brief.suggested_internal_links.length > 0) {
    for (const suggestion of brief.suggested_internal_links) {
      const anchorText = suggestion.anchor_text || suggestion.anchor || '';
      const isDuplicate = links.some(l =>
        l.anchorText.toLowerCase() === anchorText.toLowerCase()
      );

      if (!isDuplicate && anchorText) {
        links.push({
          targetTopic: suggestion.url || suggestion.title || suggestion.anchor || '',
          anchorText,
          reasoning: suggestion.title ? `Related: ${suggestion.title}` : 'Related topic',
          annotation_text_hint: undefined
        });
      }
    }
  }

  return links;
}

/**
 * Validate that internal links were inserted into the content
 *
 * @param content The generated content to validate
 * @param brief The content brief containing expected links
 * @returns LinkInsertionResult with details about link insertion success
 */
export function validateLinkInsertion(
  content: string,
  brief: ContentBrief
): LinkInsertionResult {
  const expectedLinks = extractContextualBridgeLinks(brief);

  if (expectedLinks.length === 0) {
    return {
      expectedCount: 0,
      foundCount: 0,
      missingLinks: [],
      foundLinks: [],
      insertionRate: 100,
      passed: true
    };
  }

  // Find all markdown links in the content
  // Matches [anchor text](url) pattern
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const foundAnchors: string[] = [];
  let match;

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    foundAnchors.push(match[1].toLowerCase().trim());
  }

  // Check which expected links were found
  const missingLinks: ContextualBridgeLink[] = [];
  const foundLinks: string[] = [];

  for (const link of expectedLinks) {
    const anchorLower = link.anchorText.toLowerCase().trim();

    // Check for exact match or partial match (anchor text contained in found anchor)
    const found = foundAnchors.some(foundAnchor =>
      foundAnchor === anchorLower ||
      foundAnchor.includes(anchorLower) ||
      anchorLower.includes(foundAnchor)
    );

    if (found) {
      foundLinks.push(link.anchorText);
    } else {
      missingLinks.push(link);
    }
  }

  const insertionRate = expectedLinks.length > 0
    ? Math.round((foundLinks.length / expectedLinks.length) * 100)
    : 100;

  return {
    expectedCount: expectedLinks.length,
    foundCount: foundLinks.length,
    missingLinks,
    foundLinks,
    insertionRate,
    passed: insertionRate >= 75 // At least 75% of links should be inserted for topical authority
  };
}

/**
 * Generate markdown for missing links to be appended as fallback
 * This is used when link insertion validation fails
 *
 * @param missingLinks Links that were not found in the content
 * @param language Optional language for section header
 * @returns Markdown string with missing links as a "See Also" section
 */
export function generateMissingLinksFallback(
  missingLinks: ContextualBridgeLink[],
  language?: string
): string {
  if (missingLinks.length === 0) return '';

  // Language-aware section header
  const headers: Record<string, string> = {
    'nl': 'Zie Ook',
    'de': 'Siehe Auch',
    'fr': 'Voir Aussi',
    'es': 'Ver También',
    'it': 'Vedi Anche',
    'pt': 'Veja Também',
    'en': 'See Also'
  };
  const header = headers[language || 'en'] || headers['en'];

  let section = `\n\n## ${header}\n\n`;

  for (const link of missingLinks) {
    const slug = slugify(link.targetTopic);
    const url = `/topics/${slug}`;
    section += `- [${link.anchorText}](${url})\n`;
  }

  return section;
}

/**
 * Validator class for integration with the validation pipeline
 */
export class LinkInsertionValidator {
  /**
   * Validate link insertion and return violations
   *
   * @param content Generated content
   * @param brief Content brief with expected links
   * @returns Array of validation violations
   */
  static validate(content: string, brief: ContentBrief): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const result = validateLinkInsertion(content, brief);

    if (!result.passed && result.expectedCount > 0) {
      const missingAnchors = result.missingLinks
        .map(l => `"${l.anchorText}"`)
        .slice(0, 5)
        .join(', ');

      violations.push({
        rule: 'IL-01',
        severity: 'error',
        text: missingAnchors,
        position: 0,
        suggestion: `Internal link insertion incomplete: ${result.foundCount}/${result.expectedCount} links found (${result.insertionRate}%). Missing links: ${missingAnchors}. Consider adding a "Related Topics" section.`,
      });
    }

    if (result.expectedCount > 0 && result.foundCount === 0) {
      violations.push({
        rule: 'IL-02',
        severity: 'error',
        text: 'No internal links found',
        position: 0,
        suggestion: 'Internal links are critical for SEO. Ensure Pass 6 is running correctly or add a Related Topics section.',
      });
    }

    return violations;
  }
}
