/**
 * PageRank Flow Analyzer Service
 *
 * Analyzes PageRank flow direction to ensure proper link equity distribution:
 * - Classify page type (core/author/bridge)
 * - Classify link destinations
 * - Determine flow direction (correct/reversed)
 * - Identify flow issues
 *
 * Research Source: linking in website.md
 *
 * Key Insight: "PageRank moet richting Core Topics stromen vanaf Author Pages.
 * Core Topics moeten linken naar Author Pages maar voorzichtig (laat in content).
 * Bridge Topics verbinden clusters maar moeten PageRank niet lekken."
 *
 * Created: December 25, 2024
 *
 * @module services/pageRankFlowAnalyzer
 */

import {
  PageRankFlowAnalysis,
  PageType,
  FlowDirection,
  FlowIssue,
  SectionLinks,
} from '../types/competitiveIntelligence';
import { ExtractedLinkData } from './linkExtractor';
import { detectDestinationType, LinkDestinationType } from './linkPositionAnalyzer';

// =============================================================================
// Types
// =============================================================================

/**
 * Page type signals
 */
interface PageTypeSignals {
  type: PageType;
  confidence: number;
  signals: string[];
}

/**
 * Link destination classification result
 */
interface ClassifiedLink {
  link: ExtractedLinkData;
  destinationType: LinkDestinationType;
  isFlowingToCore: boolean;
  isFlowingToAuthor: boolean;
  isFlowingToBridge: boolean;
  zone: 'early' | 'middle' | 'late';
}

// =============================================================================
// Page Type Classification
// =============================================================================

/**
 * Signals that indicate a Core Topic page
 */
const CORE_PAGE_SIGNALS = {
  urlPatterns: ['/what-is-', '/guide/', '/how-to-', '/complete-guide', '/ultimate-guide', '/definitive-guide', '/tutorial/', '/learn-'],
  h1Patterns: [/^what is /i, /^how to /i, /guide to /i, /^understanding /i, /complete guide/i],
  contentPatterns: ['comprehensive', 'complete guide', 'everything you need to know', 'step-by-step', 'in-depth'],
};

/**
 * Signals that indicate an Author Page
 */
const AUTHOR_PAGE_SIGNALS = {
  urlPatterns: ['/about/', '/author/', '/team/', '/profile/', '/bio/', '/about-us', '/our-team', '/written-by/'],
  h1Patterns: [/^about /i, /^meet /i, /our team/i, /^who we are/i],
  contentPatterns: ['years of experience', 'expertise in', 'passionate about', 'specializes in', 'certified'],
};

/**
 * Signals that indicate a Bridge Topic page
 */
const BRIDGE_PAGE_SIGNALS = {
  urlPatterns: ['/vs-', '/versus/', '/comparison/', '/compare/', '/alternative-to/', '-vs-', '/differences/', '/review/'],
  h1Patterns: [/ vs /i, / versus /i, /comparison/i, /alternative/i, /differences between/i],
  contentPatterns: ['compared to', 'versus', 'alternative', 'pros and cons', 'which is better'],
};

/**
 * Classify page type from URL and content
 */
export function classifyPageType(
  url: string,
  h1?: string,
  contentSample?: string
): PageTypeSignals {
  const signals: string[] = [];
  const scores = { core: 0, author: 0, bridge: 0 };
  const lowerUrl = url.toLowerCase();
  const lowerH1 = (h1 || '').toLowerCase();
  const lowerContent = (contentSample || '').toLowerCase();

  // Check URL patterns
  for (const pattern of CORE_PAGE_SIGNALS.urlPatterns) {
    if (lowerUrl.includes(pattern)) {
      scores.core += 30;
      signals.push(`URL contains "${pattern}"`);
    }
  }

  for (const pattern of AUTHOR_PAGE_SIGNALS.urlPatterns) {
    if (lowerUrl.includes(pattern)) {
      scores.author += 35;
      signals.push(`URL contains "${pattern}"`);
    }
  }

  for (const pattern of BRIDGE_PAGE_SIGNALS.urlPatterns) {
    if (lowerUrl.includes(pattern)) {
      scores.bridge += 35;
      signals.push(`URL contains "${pattern}"`);
    }
  }

  // Check H1 patterns
  for (const pattern of CORE_PAGE_SIGNALS.h1Patterns) {
    if (pattern.test(lowerH1)) {
      scores.core += 25;
      signals.push(`H1 matches core pattern`);
    }
  }

  for (const pattern of AUTHOR_PAGE_SIGNALS.h1Patterns) {
    if (pattern.test(lowerH1)) {
      scores.author += 25;
      signals.push(`H1 matches author pattern`);
    }
  }

  for (const pattern of BRIDGE_PAGE_SIGNALS.h1Patterns) {
    if (pattern.test(lowerH1)) {
      scores.bridge += 25;
      signals.push(`H1 matches bridge pattern`);
    }
  }

  // Check content patterns
  for (const pattern of CORE_PAGE_SIGNALS.contentPatterns) {
    if (lowerContent.includes(pattern)) {
      scores.core += 10;
    }
  }

  for (const pattern of AUTHOR_PAGE_SIGNALS.contentPatterns) {
    if (lowerContent.includes(pattern)) {
      scores.author += 15;
    }
  }

  for (const pattern of BRIDGE_PAGE_SIGNALS.contentPatterns) {
    if (lowerContent.includes(pattern)) {
      scores.bridge += 10;
    }
  }

  // Determine type
  const maxScore = Math.max(scores.core, scores.author, scores.bridge);

  if (maxScore === 0) {
    return {
      type: 'unknown',
      confidence: 0,
      signals,
    };
  }

  let type: PageType;
  if (maxScore === scores.author) {
    type = 'author';
  } else if (maxScore === scores.bridge) {
    type = 'bridge';
  } else {
    type = 'core';
  }

  // Calculate confidence (normalized to 0-1)
  const totalScore = scores.core + scores.author + scores.bridge;
  const confidence = totalScore > 0 ? maxScore / 100 : 0;

  return {
    type,
    confidence: Math.min(1, confidence),
    signals,
  };
}

// =============================================================================
// Link Classification
// =============================================================================

/**
 * Classify all links by destination type
 */
function classifyLinks(links: ExtractedLinkData[]): ClassifiedLink[] {
  return links
    .filter(l => l.isInternal)
    .map(link => {
      const destinationType = detectDestinationType(link.href);

      return {
        link,
        destinationType,
        isFlowingToCore: destinationType === 'core',
        isFlowingToAuthor: destinationType === 'author',
        isFlowingToBridge: destinationType === 'bridge',
        zone: link.location.zone,
      };
    });
}

/**
 * Build section links analysis
 */
function buildSectionLinks(
  classifiedLinks: ClassifiedLink[],
  destinationType: LinkDestinationType
): SectionLinks {
  const matching = classifiedLinks.filter(l => l.destinationType === destinationType);

  return {
    count: matching.length,
    urls: matching.map(l => l.link.href),
    anchorTexts: matching.map(l => l.link.anchorText),
    placement: matching.map(l => l.zone),
  };
}

// =============================================================================
// Flow Analysis
// =============================================================================

/**
 * Determine flow direction based on page type and links
 */
function determineFlowDirection(
  pageType: PageType,
  linksToCore: SectionLinks,
  linksToAuthor: SectionLinks
): FlowDirection {
  if (pageType === 'author') {
    // Author pages should primarily link to core (correct)
    if (linksToCore.count > linksToAuthor.count && linksToCore.count >= 1) {
      return 'correct';
    }
    if (linksToCore.count < linksToAuthor.count) {
      return 'reversed'; // Authors linking more to other authors
    }
    return 'balanced';
  }

  if (pageType === 'core') {
    // Core pages should have limited author links, mostly in late position
    const earlyAuthorLinks = linksToAuthor.placement.filter(p => p === 'early').length;

    if (earlyAuthorLinks > 0) {
      return 'reversed'; // Core linking to author early is reversed
    }
    if (linksToCore.count > linksToAuthor.count * 2) {
      return 'correct'; // Core linking mostly to other core
    }
    return 'balanced';
  }

  if (pageType === 'bridge') {
    // Bridge pages should link equally to both sides they're connecting
    const ratio = linksToCore.count / (linksToAuthor.count || 1);
    if (ratio > 0.5 && ratio < 2) {
      return 'balanced'; // Good bridge behavior
    }
    return 'unclear';
  }

  return 'unclear';
}

/**
 * Calculate flow score (0-100)
 */
function calculateFlowScore(
  pageType: PageType,
  flowDirection: FlowDirection,
  linksToCore: SectionLinks,
  linksToAuthor: SectionLinks
): number {
  let score = 50; // Base score

  // Flow direction bonuses/penalties
  if (flowDirection === 'correct') {
    score += 30;
  } else if (flowDirection === 'reversed') {
    score -= 30;
  } else if (flowDirection === 'balanced') {
    score += 10;
  }

  // Page-type specific scoring
  if (pageType === 'author') {
    // Author pages get bonus for linking to core
    if (linksToCore.count >= 3) score += 15;
    // Penalty for too many author-to-author links
    if (linksToAuthor.count > linksToCore.count) score -= 15;
  }

  if (pageType === 'core') {
    // Core pages get bonus for linking to other core topics
    if (linksToCore.count >= 2) score += 10;
    // Check author links are properly placed
    const lateAuthorLinks = linksToAuthor.placement.filter(p => p === 'late').length;
    if (lateAuthorLinks === linksToAuthor.count && linksToAuthor.count > 0) {
      score += 15; // All author links properly at end
    }
  }

  if (pageType === 'bridge') {
    // Bridge pages get bonus for balanced linking
    if (linksToCore.count >= 1 && linksToAuthor.count >= 1) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate flow issues
 */
function generateFlowIssues(
  pageType: PageType,
  flowDirection: FlowDirection,
  linksToCore: SectionLinks,
  linksToAuthor: SectionLinks
): FlowIssue[] {
  const issues: FlowIssue[] = [];

  if (flowDirection === 'reversed') {
    if (pageType === 'author') {
      issues.push({
        issue: 'Author page links more to author pages than core topics',
        severity: 'critical',
        affectedLinks: linksToAuthor.urls,
      });
    } else if (pageType === 'core') {
      const earlyAuthorUrls = linksToAuthor.urls.filter((_, i) => linksToAuthor.placement[i] === 'early');
      if (earlyAuthorUrls.length > 0) {
        issues.push({
          issue: 'Core topic links to author pages early in content',
          severity: 'critical',
          affectedLinks: earlyAuthorUrls,
        });
      }
    }
  }

  // Author page specific issues
  if (pageType === 'author') {
    if (linksToCore.count === 0) {
      issues.push({
        issue: 'Author page has no links to core topics',
        severity: 'warning',
        affectedLinks: [],
      });
    }
  }

  // Core page specific issues
  if (pageType === 'core') {
    if (linksToCore.count === 0) {
      issues.push({
        issue: 'Core topic has no links to related core topics',
        severity: 'warning',
        affectedLinks: [],
      });
    }
  }

  // Bridge page specific issues
  if (pageType === 'bridge') {
    if (linksToCore.count === 0) {
      issues.push({
        issue: 'Bridge topic has no links to core topics it should connect',
        severity: 'warning',
        affectedLinks: [],
      });
    }
  }

  return issues;
}

/**
 * Generate strategic assessment
 */
function generateStrategicAssessment(
  pageType: PageType,
  flowDirection: FlowDirection,
  flowScore: number
): PageRankFlowAnalysis['strategicAssessment'] {
  let isOptimal = flowScore >= 75;
  let recommendation = '';
  let potentialImprovement = '';

  if (pageType === 'author') {
    if (flowDirection === 'correct') {
      recommendation = 'Author page is correctly channeling link equity to core topics.';
      potentialImprovement = 'Consider adding more contextual links to core topics.';
    } else {
      isOptimal = false;
      recommendation = 'Restructure links to prioritize core topics over other author pages.';
      potentialImprovement = 'Add 2-3 prominent links to main core topics with descriptive anchors.';
    }
  } else if (pageType === 'core') {
    if (flowDirection === 'correct') {
      recommendation = 'Core topic maintains proper link hierarchy.';
      potentialImprovement = 'Ensure author links appear only after main content points.';
    } else {
      isOptimal = false;
      recommendation = 'Move author page links to later in the content.';
      potentialImprovement = 'Add a "Written by" section at the end for author links.';
    }
  } else if (pageType === 'bridge') {
    if (flowDirection === 'balanced') {
      recommendation = 'Bridge topic connects clusters appropriately.';
      potentialImprovement = 'Ensure links have contextual justification before placement.';
    } else {
      isOptimal = false;
      recommendation = 'Bridge pages should link more evenly to both clusters they connect.';
      potentialImprovement = 'Add links to the underrepresented cluster with proper context.';
    }
  } else {
    recommendation = 'Page type unclear - review link structure for semantic clarity.';
    potentialImprovement = 'Clarify page purpose and adjust links accordingly.';
  }

  return { isOptimal, recommendation, potentialImprovement };
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze PageRank flow for a page
 */
export function analyzePageRankFlow(
  links: ExtractedLinkData[],
  pageUrl: string,
  h1?: string,
  contentSample?: string
): PageRankFlowAnalysis {
  // Classify page type
  const pageTypeResult = classifyPageType(pageUrl, h1, contentSample);

  // Classify all internal links
  const classifiedLinks = classifyLinks(links);

  // Build section links
  const linksToCore = buildSectionLinks(classifiedLinks, 'core');
  const linksToAuthor = buildSectionLinks(classifiedLinks, 'author');

  // Determine flow direction
  const flowDirection = determineFlowDirection(
    pageTypeResult.type,
    linksToCore,
    linksToAuthor
  );

  // Calculate flow score
  const flowScore = calculateFlowScore(
    pageTypeResult.type,
    flowDirection,
    linksToCore,
    linksToAuthor
  );

  // Generate issues
  const issues = generateFlowIssues(
    pageTypeResult.type,
    flowDirection,
    linksToCore,
    linksToAuthor
  );

  // Generate strategic assessment
  const strategicAssessment = generateStrategicAssessment(
    pageTypeResult.type,
    flowDirection,
    flowScore
  );

  return {
    pageType: pageTypeResult.type,
    pageTypeConfidence: pageTypeResult.confidence,
    pageTypeSignals: pageTypeResult.signals,
    flowAnalysis: {
      linksToCore,
      linksToAuthor,
      flowDirection,
      flowScore,
      issues,
    },
    strategicAssessment,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzePageRankFlow,
  classifyPageType,
};
