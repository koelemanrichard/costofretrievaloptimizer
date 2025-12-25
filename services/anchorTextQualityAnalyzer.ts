/**
 * Anchor Text Quality Analyzer Service
 *
 * Analyzes anchor text quality based on semantic SEO best practices:
 * - Repetition check (max 3 per anchor-target combination)
 * - Generic anchor detection ("click here", "read more", etc.)
 * - First-word placement detection (avoid links at paragraph start)
 * - Annotation text quality
 *
 * Research Source: linking in website.md
 *
 * Quotes:
 * - "Generic link texts like 'click here' are BAD for SEO."
 * - "Links starting at the first word of a paragraph = often poor."
 * - "Max 3 internal links from same source to same target with same anchor."
 *
 * Created: December 25, 2024
 *
 * @module services/anchorTextQualityAnalyzer
 */

import {
  AnchorTextQuality,
  AnchorRepetitionIssue,
  GenericAnchorIssue,
  FirstWordLinkIssue,
} from '../types/competitiveIntelligence';
import { ExtractedLinkData } from './linkExtractor';

// =============================================================================
// Generic Anchor Detection
// =============================================================================

/**
 * Common generic anchor texts to detect
 */
const GENERIC_ANCHORS = [
  'click here',
  'read more',
  'learn more',
  'see more',
  'find out more',
  'more info',
  'more information',
  'here',
  'this',
  'this page',
  'this article',
  'this link',
  'link',
  'website',
  'site',
  'page',
  'source',
  'check it out',
  'go here',
  'visit',
  'details',
  'more details',
];

/**
 * Short anchors that are usually generic
 */
const SHORT_GENERIC_LIMIT = 3;

/**
 * Check if anchor text is generic
 */
function isGenericAnchor(anchorText: string): boolean {
  const lower = anchorText.toLowerCase().trim();

  // Check against known generics
  if (GENERIC_ANCHORS.includes(lower)) {
    return true;
  }

  // Very short anchors are often generic
  if (lower.length <= SHORT_GENERIC_LIMIT && !lower.match(/^\d+$/)) {
    return true;
  }

  // Single words that aren't nouns/entities are often generic
  if (lower.split(/\s+/).length === 1 && ['it', 'this', 'that', 'here'].includes(lower)) {
    return true;
  }

  return false;
}

/**
 * Generate suggestion for improving generic anchor
 */
function generateAnchorSuggestion(anchorText: string, context: { textBefore: string; textAfter: string }): string {
  const lower = anchorText.toLowerCase().trim();

  // Extract potential topic from surrounding context
  const fullContext = `${context.textBefore} ${context.textAfter}`.toLowerCase();

  // Common pattern suggestions
  if (lower === 'click here' || lower === 'here') {
    return 'Use descriptive text that describes the linked content, e.g., "our SEO guide" or "pricing details"';
  }

  if (lower === 'read more' || lower === 'learn more') {
    return 'Replace with specific topic reference, e.g., "read our complete guide to keyword research"';
  }

  if (lower === 'this' || lower === 'this article' || lower === 'this page') {
    return 'Use the actual title or topic of the linked page';
  }

  return 'Replace with descriptive anchor text that includes relevant keywords';
}

// =============================================================================
// Repetition Analysis
// =============================================================================

/**
 * Maximum allowed repetitions of same anchor to same target
 */
const MAX_ANCHOR_REPETITIONS = 3;

/**
 * Analyze anchor text repetition
 */
function analyzeRepetition(links: ExtractedLinkData[]): AnchorRepetitionIssue[] {
  const anchorTargetCounts = new Map<string, number>();
  const issues: AnchorRepetitionIssue[] = [];

  for (const link of links) {
    if (!link.isInternal) continue;

    const key = `${link.anchorText.toLowerCase()}::${link.href}`;
    const count = (anchorTargetCounts.get(key) || 0) + 1;
    anchorTargetCounts.set(key, count);
  }

  for (const [key, count] of anchorTargetCounts.entries()) {
    if (count > MAX_ANCHOR_REPETITIONS) {
      const [anchorText, targetUrl] = key.split('::');
      issues.push({
        anchorText,
        count,
        targetUrl,
        isViolation: true,
      });
    }
  }

  return issues;
}

// =============================================================================
// First Word Detection
// =============================================================================

/**
 * Analyze links that start at the first word of paragraphs
 */
function analyzeFirstWordLinks(links: ExtractedLinkData[]): FirstWordLinkIssue[] {
  const issues: FirstWordLinkIssue[] = [];

  for (const link of links) {
    if (link.context.isFirstWord && link.location.type === 'main') {
      issues.push({
        anchorText: link.anchorText,
        href: link.href,
        paragraphStart: link.context.textAfter.slice(0, 50),
      });
    }
  }

  return issues;
}

// =============================================================================
// Descriptiveness Scoring
// =============================================================================

/**
 * Score anchor text descriptiveness (0-100)
 */
function scoreDescriptiveness(anchorText: string): number {
  let score = 50; // Base score

  // Check length (too short is bad)
  const words = anchorText.trim().split(/\s+/);
  if (words.length === 1 && anchorText.length < 5) {
    score -= 20;
  } else if (words.length >= 2 && words.length <= 6) {
    score += 20; // Ideal length
  } else if (words.length > 8) {
    score -= 10; // Too long
  }

  // Check for generic patterns
  if (isGenericAnchor(anchorText)) {
    score -= 40;
  }

  // Check for keywords (nouns, proper cases)
  const hasUppercase = /[A-Z]/.test(anchorText.slice(1)); // Has capital after first char
  const hasNumbers = /\d/.test(anchorText);

  if (hasUppercase) score += 10; // Likely has proper nouns
  if (hasNumbers) score += 5; // Numbers often indicate specificity

  // Check for common descriptive patterns
  const descriptivePatterns = [
    /guide to/i,
    /how to/i,
    /what is/i,
    /\d+ (tips|ways|steps|examples)/i,
    /complete|ultimate|definitive/i,
  ];

  for (const pattern of descriptivePatterns) {
    if (pattern.test(anchorText)) {
      score += 15;
      break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// =============================================================================
// Placement Scoring
// =============================================================================

/**
 * Score anchor placement quality
 */
function scorePlacement(link: ExtractedLinkData): number {
  let score = 70; // Base score

  // First word of paragraph is bad
  if (link.context.isFirstWord) {
    score -= 30;
  }

  // Navigation links - neutral
  if (['nav', 'header', 'footer'].includes(link.location.type)) {
    return 50;
  }

  // In-content links with context are good
  if (link.location.type === 'main') {
    // Check if there's text before AND after
    if (link.context.textBefore.length > 20 && link.context.textAfter.length > 20) {
      score += 15; // Good context
    }

    // Check if under a relevant heading
    if (link.context.underHeading) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// =============================================================================
// Annotation Quality Scoring
// =============================================================================

/**
 * Score annotation text quality (surrounding context)
 */
function scoreAnnotation(link: ExtractedLinkData): number {
  let score = 50; // Base score

  // Check sentence quality
  if (link.context.fullSentence.length > 30) {
    score += 20; // Link is in a proper sentence
  }

  // Check if there's descriptive context
  const sentenceWords = link.context.fullSentence.split(/\s+/).length;
  if (sentenceWords >= 8) {
    score += 15; // Good sentence length
  }

  // Check for action verbs near link
  const actionPatterns = [
    /learn about/i,
    /discover/i,
    /explore/i,
    /read our/i,
    /check out/i,
    /see our/i,
    /visit our/i,
    /explained in/i,
    /covered in/i,
  ];

  const context = `${link.context.textBefore} ${link.context.textAfter}`;
  for (const pattern of actionPatterns) {
    if (pattern.test(context)) {
      score += 10;
      break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze anchor text quality for all links
 */
export function analyzeAnchorTextQuality(links: ExtractedLinkData[]): AnchorTextQuality {
  // Analyze repetition
  const repetitionIssues = analyzeRepetition(links);

  // Analyze generic anchors
  const genericAnchors: GenericAnchorIssue[] = [];
  for (const link of links) {
    if (isGenericAnchor(link.anchorText)) {
      genericAnchors.push({
        anchorText: link.anchorText,
        href: link.href,
        suggestion: generateAnchorSuggestion(link.anchorText, {
          textBefore: link.context.textBefore,
          textAfter: link.context.textAfter,
        }),
      });
    }
  }

  // Analyze first-word links
  const firstWordLinks = analyzeFirstWordLinks(links);

  // Calculate scores
  const internalLinks = links.filter(l => l.isInternal);
  const contentLinks = links.filter(l => l.location.type === 'main');

  // Repetition score (100 = no issues)
  const repetitionScore = repetitionIssues.length === 0 ? 100 :
    Math.max(0, 100 - (repetitionIssues.reduce((sum, i) => sum + (i.count - MAX_ANCHOR_REPETITIONS), 0) * 15));

  // Descriptiveness score (average of all anchors)
  const descriptiveness = links.length > 0
    ? links.reduce((sum, l) => sum + scoreDescriptiveness(l.anchorText), 0) / links.length
    : 50;

  // Placement score (average of content links)
  const placementScore = contentLinks.length > 0
    ? contentLinks.reduce((sum, l) => sum + scorePlacement(l), 0) / contentLinks.length
    : 50;

  // Annotation score (average of content links)
  const annotationScore = contentLinks.length > 0
    ? contentLinks.reduce((sum, l) => sum + scoreAnnotation(l), 0) / contentLinks.length
    : 50;

  // Overall score
  const overall = Math.round(
    (repetitionScore * 0.25) +
    (descriptiveness * 0.35) +
    (placementScore * 0.2) +
    (annotationScore * 0.2)
  );

  // Generate issues
  const issues: AnchorTextQuality['issues'] = [];

  if (repetitionIssues.length > 0) {
    issues.push({
      severity: 'critical',
      type: 'repetition',
      description: `${repetitionIssues.length} anchor-target combination(s) exceed max ${MAX_ANCHOR_REPETITIONS} repetitions`,
      count: repetitionIssues.length,
    });
  }

  if (genericAnchors.length > 3) {
    issues.push({
      severity: 'warning',
      type: 'generic',
      description: `${genericAnchors.length} links use generic anchor text`,
      count: genericAnchors.length,
    });
  } else if (genericAnchors.length > 0) {
    issues.push({
      severity: 'info',
      type: 'generic',
      description: `${genericAnchors.length} link(s) use generic anchor text`,
      count: genericAnchors.length,
    });
  }

  if (firstWordLinks.length > 2) {
    issues.push({
      severity: 'warning',
      type: 'placement',
      description: `${firstWordLinks.length} links start at the first word of paragraphs`,
      count: firstWordLinks.length,
    });
  } else if (firstWordLinks.length > 0) {
    issues.push({
      severity: 'info',
      type: 'placement',
      description: `${firstWordLinks.length} link(s) start at the first word of paragraphs`,
      count: firstWordLinks.length,
    });
  }

  if (annotationScore < 50) {
    issues.push({
      severity: 'info',
      type: 'annotation',
      description: 'Links lack sufficient contextual annotation',
      count: contentLinks.filter(l => scoreAnnotation(l) < 50).length,
    });
  }

  return {
    repetitionIssues,
    genericAnchors,
    genericCount: genericAnchors.length,
    firstWordLinks,
    firstWordCount: firstWordLinks.length,
    scores: {
      repetition: Math.round(repetitionScore),
      descriptiveness: Math.round(descriptiveness),
      placement: Math.round(placementScore),
      annotation: Math.round(annotationScore),
      overall,
    },
    issues,
  };
}

/**
 * Quick anchor quality check
 */
export function quickAnchorCheck(anchorText: string): {
  isGeneric: boolean;
  descriptiveness: number;
  suggestion?: string;
} {
  const isGeneric = isGenericAnchor(anchorText);
  const descriptiveness = scoreDescriptiveness(anchorText);

  return {
    isGeneric,
    descriptiveness,
    suggestion: isGeneric ? generateAnchorSuggestion(anchorText, { textBefore: '', textAfter: '' }) : undefined,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeAnchorTextQuality,
  quickAnchorCheck,
  isGenericAnchor,
};
