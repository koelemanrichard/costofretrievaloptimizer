/**
 * Bridge Justification Analyzer Service
 *
 * Analyzes whether bridge topic links are properly justified:
 * - Detect subordinate headings before links
 * - Detect contextual introduction text
 * - Evaluate semantic relevance
 * - Determine if bridge is justified or abrupt
 *
 * Research Source: linking in website.md
 *
 * Key Insight: "Bridge Topics verbinden clusters maar moeten contextual
 * gerechtvaardigd worden. Een abrupte link naar een bridging topic
 * zonder context = slechte UX en verdachte SEO."
 *
 * Created: December 25, 2024
 *
 * @module services/bridgeJustificationAnalyzer
 */

import {
  BridgeJustification,
  BridgeJustificationIssue,
  BridgeTopic,
} from '../types/competitiveIntelligence';
import { ExtractedLinkData } from './linkExtractor';
import { detectDestinationType } from './linkPositionAnalyzer';

// =============================================================================
// Types
// =============================================================================

/**
 * Context patterns for bridge justification
 */
interface ContextPattern {
  pattern: RegExp;
  type: 'intro' | 'comparison' | 'transition' | 'alternative';
  score: number;
}

// =============================================================================
// Detection Patterns
// =============================================================================

/**
 * Patterns that introduce or justify a bridge topic
 */
const JUSTIFICATION_PATTERNS: ContextPattern[] = [
  // Comparison/alternative patterns
  { pattern: /alternatively|as an alternative|another option/i, type: 'alternative', score: 20 },
  { pattern: /compared to|in comparison|when comparing/i, type: 'comparison', score: 25 },
  { pattern: /versus|vs\.?|or you could/i, type: 'comparison', score: 20 },
  { pattern: /on the other hand|conversely/i, type: 'comparison', score: 15 },

  // Transition patterns
  { pattern: /this leads us to|which brings us to/i, type: 'transition', score: 20 },
  { pattern: /this is where|that's where/i, type: 'transition', score: 15 },
  { pattern: /related to this|in relation to/i, type: 'transition', score: 15 },
  { pattern: /to understand.*better|for more context/i, type: 'transition', score: 15 },

  // Introduction patterns
  { pattern: /let's explore|let's look at|let's examine/i, type: 'intro', score: 10 },
  { pattern: /it's worth noting|it's important to/i, type: 'intro', score: 10 },
  { pattern: /speaking of|when it comes to/i, type: 'intro', score: 15 },
  { pattern: /for those interested in|if you're interested in/i, type: 'intro', score: 20 },
];

/**
 * Patterns that indicate subordinate headings for bridge topics
 */
const SUBORDINATE_HEADING_PATTERNS = [
  /^alternative/i,
  /^comparing/i,
  /^vs\.?\s/i,
  /versus/i,
  /comparison/i,
  /^related/i,
  /^see also/i,
  /^similar/i,
  /^other option/i,
];

/**
 * Patterns that suggest abrupt/unjustified links
 */
const ABRUPT_PATTERNS = [
  /^click here/i,
  /^read more/i,
  /^learn more about/i,
  /^check out/i,
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if text before link contains justification
 */
function findContextualIntro(textBefore: string): { hasIntro: boolean; contextText: string | null; score: number } {
  let totalScore = 0;
  let contextText: string | null = null;

  // Check against justification patterns
  for (const { pattern, score } of JUSTIFICATION_PATTERNS) {
    if (pattern.test(textBefore)) {
      totalScore += score;
      if (!contextText) {
        const match = textBefore.match(pattern);
        if (match) {
          // Extract the sentence containing the pattern
          const start = Math.max(0, match.index! - 50);
          contextText = textBefore.slice(start, match.index! + match[0].length + 50).trim();
        }
      }
    }
  }

  return {
    hasIntro: totalScore >= 15,
    contextText,
    score: totalScore,
  };
}

/**
 * Check if link has a subordinate heading
 */
function findSubordinateHeading(underHeading: string | null): { hasSubordinate: boolean; heading: string | null } {
  if (!underHeading) {
    return { hasSubordinate: false, heading: null };
  }

  for (const pattern of SUBORDINATE_HEADING_PATTERNS) {
    if (pattern.test(underHeading)) {
      return { hasSubordinate: true, heading: underHeading };
    }
  }

  return { hasSubordinate: false, heading: null };
}

/**
 * Determine link placement style
 */
function determineLinkPlacement(link: ExtractedLinkData): 'inline' | 'section_end' | 'standalone' {
  // Check if link is in a standalone paragraph (short surrounding text)
  const totalContext = link.context.textBefore.length + link.context.textAfter.length;

  if (totalContext < 30) {
    return 'standalone';
  }

  // Check if near end of section (close to next heading or end)
  if (link.location.zone === 'late' || link.context.textAfter.length < 50) {
    return 'section_end';
  }

  return 'inline';
}

/**
 * Check for abrupt/unjustified placement
 */
function detectAbruptness(link: ExtractedLinkData, contextIntro: { hasIntro: boolean; score: number }): BridgeJustificationIssue[] {
  const issues: BridgeJustificationIssue[] = [];

  // Check for abrupt patterns in anchor text
  for (const pattern of ABRUPT_PATTERNS) {
    if (pattern.test(link.anchorText)) {
      issues.push({
        issue: 'semantic_disconnect',
        description: 'Bridge link uses generic anchor text without descriptive context',
        suggestion: 'Replace with descriptive anchor that explains the connection',
      });
      break;
    }
  }

  // Check if link is too early without context
  if (link.location.zone === 'early' && !contextIntro.hasIntro) {
    issues.push({
      issue: 'early_placement',
      description: 'Bridge topic linked early in content without contextual introduction',
      suggestion: 'Add explanatory text before the link or move it later in the content',
    });
  }

  // Check for abrupt transition
  if (!contextIntro.hasIntro && link.context.textBefore.length > 20) {
    // Has text before but no justification patterns
    issues.push({
      issue: 'abrupt_transition',
      description: 'Link appears without transitional or connecting language',
      suggestion: 'Add a sentence explaining the relevance of this linked topic',
    });
  }

  // Check for no context at all
  if (link.context.textBefore.length < 10 && link.context.textAfter.length < 10) {
    issues.push({
      issue: 'no_context',
      description: 'Link appears in isolation without surrounding context',
      suggestion: 'Embed the link within explanatory text',
    });
  }

  return issues;
}

/**
 * Calculate justification score
 */
function calculateJustificationScore(
  hasSubordinate: boolean,
  contextIntro: { hasIntro: boolean; score: number },
  placement: 'inline' | 'section_end' | 'standalone',
  issues: BridgeJustificationIssue[]
): number {
  let score = 40; // Base score

  // Subordinate heading bonus
  if (hasSubordinate) {
    score += 25;
  }

  // Context intro bonus
  if (contextIntro.hasIntro) {
    score += Math.min(25, contextIntro.score);
  }

  // Placement scoring
  if (placement === 'inline') {
    score += 15; // Best placement
  } else if (placement === 'section_end') {
    score += 10;
  }
  // standalone gets no bonus

  // Penalty for issues
  for (const issue of issues) {
    if (issue.issue === 'no_context') {
      score -= 30;
    } else if (issue.issue === 'abrupt_transition') {
      score -= 20;
    } else if (issue.issue === 'early_placement') {
      score -= 15;
    } else if (issue.issue === 'semantic_disconnect') {
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// =============================================================================
// Main Analysis Functions
// =============================================================================

/**
 * Analyze justification for a single bridge link
 */
export function analyzeBridgeJustification(
  link: ExtractedLinkData
): BridgeJustification {
  // Find subordinate heading
  const { hasSubordinate, heading: subordinateHeading } = findSubordinateHeading(
    link.context.underHeading
  );

  // Find contextual introduction
  const contextIntro = findContextualIntro(link.context.textBefore);

  // Determine placement
  const linkPlacement = determineLinkPlacement(link);

  // Detect issues
  const issues = detectAbruptness(link, contextIntro);

  // Calculate score
  const justificationScore = calculateJustificationScore(
    hasSubordinate,
    contextIntro,
    linkPlacement,
    issues
  );

  // Determine if justified
  const isJustified = justificationScore >= 60 && issues.length === 0;

  return {
    hasSubordinateText: hasSubordinate,
    subordinateHeading,
    hasContextualIntro: contextIntro.hasIntro,
    contextualText: contextIntro.contextText,
    linkPlacement,
    isJustified,
    justificationScore,
    issues,
  };
}

/**
 * Identify bridge topic links and analyze their justification
 */
export function analyzeBridgeTopics(
  links: ExtractedLinkData[],
  pageUrl: string
): BridgeTopic[] {
  const bridgeTopics: BridgeTopic[] = [];

  for (const link of links) {
    if (!link.isInternal) continue;

    const destinationType = detectDestinationType(link.href);

    if (destinationType === 'bridge') {
      const justification = analyzeBridgeJustification(link);

      // Infer function and clusters from URL/context
      const lowerHref = link.href.toLowerCase();
      let func: BridgeTopic['function'] = 'connects';
      if (lowerHref.includes('support') || lowerHref.includes('help')) {
        func = 'supports';
      } else if (lowerHref.includes('expand') || lowerHref.includes('more')) {
        func = 'expands';
      }

      // Infer clusters from URL patterns
      const clusters: string[] = [];
      const vsMatch = lowerHref.match(/([^/]+)-vs-([^/]+)/);
      if (vsMatch) {
        clusters.push(vsMatch[1].replace(/-/g, ' '));
        clusters.push(vsMatch[2].replace(/-/g, ' '));
      }

      // Determine link juice flow
      let linkJuiceFlow: BridgeTopic['linkJuiceFlow'] = 'outbound';
      // If link is in early position, likely more valuable
      if (link.location.zone === 'early') {
        linkJuiceFlow = 'outbound';
      } else if (link.location.zone === 'late') {
        linkJuiceFlow = 'bidirectional';
      }

      // Determine strategic value
      let strategicValue: BridgeTopic['strategicValue'] = 'medium';
      if (justification.isJustified && clusters.length >= 2) {
        strategicValue = 'high';
      } else if (!justification.isJustified || justification.issues.length > 2) {
        strategicValue = 'low';
      }

      bridgeTopics.push({
        topic: link.anchorText || link.href,
        function: func,
        connectsClusters: clusters,
        linkJuiceFlow,
        strategicValue,
        justification,
      });
    }
  }

  return bridgeTopics;
}

/**
 * Quick check if a link to bridge topic is justified
 */
export function isBridgeJustified(link: ExtractedLinkData): boolean {
  const justification = analyzeBridgeJustification(link);
  return justification.isJustified;
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeBridgeJustification,
  analyzeBridgeTopics,
  isBridgeJustified,
};
