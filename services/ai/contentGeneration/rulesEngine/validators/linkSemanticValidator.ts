// services/ai/contentGeneration/rulesEngine/validators/linkSemanticValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';

export interface LinkValidationResult {
  totalLinks: number;
  validLinks: number;
  violations: ValidationViolation[];
}

/**
 * Validate semantic relevance of internal links.
 * Checks that anchor text is semantically related to target topic.
 *
 * This validator implements the Holistic SEO principle that anchor text
 * should accurately describe the target page content to reduce Cost of Retrieval
 * for both users and search engines.
 */
export class LinkSemanticValidator {

  /**
   * Validate links in content against topical map data.
   * @param content The content containing markdown links to validate
   * @param topicalMapTopics Array of topics from the topical map with keyword, url, and optional EAVs
   * @param context Optional section generation context (not currently used but available for future extensions)
   * @returns Array of validation violations for links with low semantic relevance
   */
  static validate(
    content: string,
    topicalMapTopics?: { keyword: string; url?: string; eavs?: SemanticTriple[] }[],
    context?: SectionGenerationContext
  ): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    if (!topicalMapTopics || topicalMapTopics.length === 0) {
      return violations;
    }

    // Find markdown links: [anchor text](url)
    const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const anchorText = match[1];
      const targetUrl = match[2];
      const position = match.index;

      // Skip external links that are not in topical map
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        // Only validate external links if they ARE in our topical map by URL
        const targetTopic = topicalMapTopics.find(t => t.url === targetUrl);
        if (!targetTopic) continue;

        // Validate this external link since it's in our map
        const relevance = calculateSemanticRelevance(
          anchorText,
          targetTopic.keyword,
          targetTopic.eavs
        );

        if (relevance < 0.3) {
          violations.push({
            rule: 'LINK_SEMANTIC_ALIGNMENT',
            text: `[${anchorText}](${targetUrl})`,
            position,
            suggestion: `Anchor text "${anchorText}" has low semantic relevance to target topic "${targetTopic.keyword}". Consider using more descriptive anchor text.`,
            severity: 'warning'
          });
        }
        continue;
      }

      // Find target topic by URL or keyword match for internal links
      const targetTopic = findTargetTopic(topicalMapTopics, targetUrl, anchorText);

      if (!targetTopic) continue; // Can't validate without target info

      // Calculate semantic relevance
      const relevance = calculateSemanticRelevance(
        anchorText,
        targetTopic.keyword,
        targetTopic.eavs
      );

      if (relevance < 0.3) {
        violations.push({
          rule: 'LINK_SEMANTIC_ALIGNMENT',
          text: `[${anchorText}](${targetUrl})`,
          position,
          suggestion: `Anchor text "${anchorText}" has low semantic relevance to target topic "${targetTopic.keyword}". Consider using more descriptive anchor text.`,
          severity: 'warning'
        });
      }
    }

    return violations;
  }
}

/**
 * Find target topic from topical map by URL or keyword.
 * Uses a priority-based matching strategy:
 * 1. Exact URL match
 * 2. Keyword slug in URL
 * 3. Anchor text matches keyword
 */
export function findTargetTopic(
  topics: { keyword: string; url?: string; eavs?: SemanticTriple[] }[],
  url: string,
  anchorText: string
): { keyword: string; eavs?: SemanticTriple[] } | undefined {
  // Try exact URL match first (highest confidence)
  const byUrl = topics.find(t => t.url && t.url === url);
  if (byUrl) return byUrl;

  // Try keyword slug in URL match (convert keyword to URL slug format)
  const urlLower = url.toLowerCase();
  const byKeywordInUrl = topics.find(t => {
    const keywordSlug = t.keyword.toLowerCase().replace(/\s+/g, '-');
    return urlLower.includes(keywordSlug);
  });
  if (byKeywordInUrl) return byKeywordInUrl;

  // Try anchor text match to keyword (bidirectional containment)
  const anchorLower = anchorText.toLowerCase();
  const byAnchorMatch = topics.find(t => {
    const keywordLower = t.keyword.toLowerCase();
    return anchorLower.includes(keywordLower) || keywordLower.includes(anchorLower);
  });

  return byAnchorMatch;
}

/**
 * Calculate semantic relevance between anchor text and target topic.
 * Returns a score from 0.0 (no relevance) to 1.0 (perfect match).
 *
 * Scoring tiers:
 * - 1.0: Exact keyword match or full containment
 * - 0.8: Significant word overlap (50%+ of keyword words found)
 * - 0.6: EAV entity/value match
 * - 0.5: Partial word overlap
 * - 0.1: No semantic match found
 */
export function calculateSemanticRelevance(
  anchorText: string,
  targetKeyword: string,
  targetEavs?: SemanticTriple[]
): number {
  const anchorLower = anchorText.toLowerCase().trim();
  const keywordLower = targetKeyword.toLowerCase().trim();

  // Handle empty inputs
  if (!anchorLower || !keywordLower) {
    return 0.1;
  }

  // Exact keyword match or bidirectional containment = highest relevance
  if (anchorLower.includes(keywordLower) || keywordLower.includes(anchorLower)) {
    return 1.0;
  }

  // Check word overlap (filter short words < 3 chars)
  const anchorWords = new Set(
    anchorLower.split(/\s+/).filter(w => w.length >= 3)
  );
  const keywordWords = keywordLower.split(/\s+/).filter(w => w.length >= 3);

  let matchCount = 0;
  for (const kw of keywordWords) {
    if (anchorWords.has(kw)) matchCount++;
  }

  if (keywordWords.length > 0 && matchCount > 0) {
    const wordOverlap = matchCount / keywordWords.length;
    if (wordOverlap >= 0.5) return 0.8;  // Significant overlap
    if (wordOverlap > 0) return 0.5;     // Partial overlap
  }

  // Check EAV term matches if available
  if (targetEavs && targetEavs.length > 0) {
    for (const eav of targetEavs) {
      // Safely extract entity label
      const entityLabel = eav.subject?.label?.toLowerCase() || '';
      // Safely extract object value, converting to string
      const objectValue = String(eav.object?.value ?? '').toLowerCase();

      if (entityLabel && anchorLower.includes(entityLabel)) {
        return 0.6;
      }
      if (objectValue && anchorLower.includes(objectValue)) {
        return 0.6;
      }
    }
  }

  // No semantic match found
  return 0.1;
}
