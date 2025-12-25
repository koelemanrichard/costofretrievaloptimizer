/**
 * Link Position Analyzer Service
 *
 * Analyzes link positions to determine optimal placement.
 * Key factors:
 * - Content zone (early/middle/late)
 * - Content type (main/supplementary/navigation)
 * - Optimal placement scoring
 *
 * Research Source: linking in website.md
 *
 * Quote: "Core Topics moeten vroeg in je content worden gelinkt
 * (within first third). Author Pages worden gelinkt aan het einde
 * van de content (after main points made)."
 *
 * Created: December 25, 2024
 *
 * @module services/linkPositionAnalyzer
 */

import { LinkPosition } from '../types/competitiveIntelligence';
import { ExtractedLinkData, LinkLocation } from './linkExtractor';

// =============================================================================
// Types
// =============================================================================

/**
 * Link destination type (for PageRank flow analysis)
 */
export type LinkDestinationType = 'core' | 'author' | 'bridge' | 'category' | 'external' | 'unknown';

/**
 * Link with position analysis
 */
export interface AnalyzedLinkPosition {
  /** Original link data */
  link: ExtractedLinkData;
  /** Position analysis */
  position: LinkPosition;
  /** Detected destination type */
  destinationType: LinkDestinationType;
  /** Is this placement optimal for destination type? */
  isOptimal: boolean;
  /** Placement issues */
  issues: string[];
  /** Placement recommendations */
  recommendations: string[];
}

/**
 * Position analysis summary
 */
export interface PositionAnalysisSummary {
  /** All analyzed links */
  analyzedLinks: AnalyzedLinkPosition[];
  /** Links in optimal positions */
  optimallyPlacedCount: number;
  /** Links in suboptimal positions */
  suboptimalCount: number;
  /** Core links in early positions */
  coreLinksEarly: number;
  /** Core links total */
  coreLinksTotal: number;
  /** Author links in late positions */
  authorLinksLate: number;
  /** Author links total */
  authorLinksTotal: number;
  /** Overall placement score (0-100) */
  overallPlacementScore: number;
  /** Summary recommendations */
  summaryRecommendations: string[];
}

// =============================================================================
// URL Pattern Detection
// =============================================================================

/**
 * Patterns that indicate core topic pages
 */
const CORE_PATTERNS = [
  '/what-is-',
  '/guide/',
  '/how-to-',
  '/best-',
  '/top-',
  '/complete-guide',
  '/ultimate-guide',
  '/definitive-guide',
  '/tutorial/',
  '/learn-',
];

/**
 * Patterns that indicate author/about pages
 */
const AUTHOR_PATTERNS = [
  '/about/',
  '/author/',
  '/team/',
  '/bio/',
  '/profile/',
  '/written-by/',
  '/contributor/',
  '/expert/',
  '/about-us',
  '/our-team',
];

/**
 * Patterns that indicate bridge/comparison pages
 */
const BRIDGE_PATTERNS = [
  '/vs-',
  '/versus/',
  '/comparison/',
  '/compare/',
  '/alternative-to/',
  '/vs/',
  '-vs-',
  '/review/',
  '/differences/',
];

/**
 * Patterns that indicate category pages
 */
const CATEGORY_PATTERNS = [
  '/category/',
  '/categories/',
  '/tag/',
  '/topic/',
  '/topics/',
  '/collection/',
  '/archive/',
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Detect destination type from URL
 */
export function detectDestinationType(href: string): LinkDestinationType {
  const lowerHref = href.toLowerCase();

  // Check external first
  if (!href.startsWith('/') && !href.startsWith('./') && !href.startsWith('../')) {
    try {
      new URL(href);
      // If we can parse as absolute URL, might be external
      // But could also be internal with full URL - need page domain to check
    } catch {
      // Not a valid URL, treat as internal relative
    }
  }

  // Check patterns
  for (const pattern of AUTHOR_PATTERNS) {
    if (lowerHref.includes(pattern)) return 'author';
  }

  for (const pattern of BRIDGE_PATTERNS) {
    if (lowerHref.includes(pattern)) return 'bridge';
  }

  for (const pattern of CATEGORY_PATTERNS) {
    if (lowerHref.includes(pattern)) return 'category';
  }

  for (const pattern of CORE_PATTERNS) {
    if (lowerHref.includes(pattern)) return 'core';
  }

  return 'unknown';
}

/**
 * Determine optimal zone for destination type
 */
function getOptimalZone(destinationType: LinkDestinationType): 'early' | 'middle' | 'late' | 'any' {
  switch (destinationType) {
    case 'core':
      return 'early'; // Core topics should be linked early
    case 'author':
      return 'late'; // Author pages at the end
    case 'bridge':
      return 'middle'; // Bridge topics in middle of content
    case 'category':
      return 'any'; // Category links can be anywhere (often in nav)
    case 'external':
      return 'middle'; // External citations often in middle
    default:
      return 'any';
  }
}

/**
 * Calculate placement score based on position and destination type
 */
function calculatePlacementScore(
  position: LinkPosition,
  destinationType: LinkDestinationType
): number {
  const optimalZone = getOptimalZone(destinationType);

  // Navigation links are always 50 (neutral)
  if (position.contentType === 'navigation') {
    return 50;
  }

  // Supplementary content (sidebar, related) - moderate score
  if (position.contentType === 'supplementary') {
    return 60;
  }

  // Main content - score based on zone match
  if (optimalZone === 'any') {
    return 75; // Any zone is fine
  }

  // Check zone match
  if (position.contentZone === optimalZone) {
    return 100; // Perfect match
  }

  // Partial matches
  if (destinationType === 'core') {
    // Core should be early, middle is okay, late is bad
    if (position.contentZone === 'middle') return 60;
    return 30; // Late
  }

  if (destinationType === 'author') {
    // Author should be late, middle is okay, early is bad
    if (position.contentZone === 'middle') return 60;
    return 30; // Early
  }

  if (destinationType === 'bridge') {
    // Bridge ideally middle, but any is acceptable
    return position.contentZone === 'middle' ? 100 : 70;
  }

  return 50; // Default moderate score
}

/**
 * Map location type to content type
 */
function locationToContentType(locationType: LinkLocation['type']): LinkPosition['contentType'] {
  switch (locationType) {
    case 'main':
      return 'main';
    case 'nav':
    case 'header':
    case 'footer':
      return 'navigation';
    case 'sidebar':
    case 'related':
      return 'supplementary';
    default:
      return 'main'; // Assume main if unknown
  }
}

/**
 * Generate placement issues
 */
function generatePlacementIssues(
  position: LinkPosition,
  destinationType: LinkDestinationType
): string[] {
  const issues: string[] = [];
  const optimalZone = getOptimalZone(destinationType);

  if (optimalZone === 'any' || position.contentType !== 'main') {
    return issues;
  }

  if (destinationType === 'core' && position.contentZone !== 'early') {
    issues.push(`Core topic link should be in early content (currently ${position.contentZone})`);
  }

  if (destinationType === 'author' && position.contentZone === 'early') {
    issues.push('Author page link should not be at the start of content');
  }

  if (destinationType === 'bridge' && position.contentZone !== 'middle') {
    issues.push(`Bridge topic link works best in middle content (currently ${position.contentZone})`);
  }

  return issues;
}

/**
 * Generate placement recommendations
 */
function generatePlacementRecommendations(
  position: LinkPosition,
  destinationType: LinkDestinationType
): string[] {
  const recommendations: string[] = [];

  if (destinationType === 'core' && position.contentZone !== 'early' && position.contentType === 'main') {
    recommendations.push('Move this link to the introduction or first third of content');
    recommendations.push('Consider adding this topic reference in your opening paragraph');
  }

  if (destinationType === 'author' && position.contentZone === 'early') {
    recommendations.push('Move author link to after main content points are made');
    recommendations.push('Consider placing in a "Written by" section at the end');
  }

  return recommendations;
}

// =============================================================================
// Main Analysis Functions
// =============================================================================

/**
 * Analyze position for a single link
 */
export function analyzeLinkPosition(
  link: ExtractedLinkData,
  pageDomain?: string
): AnalyzedLinkPosition {
  // Detect destination type
  let destinationType = detectDestinationType(link.href);

  // Check if external
  if (link.isExternal) {
    destinationType = 'external';
  }

  // Build position data
  const contentType = locationToContentType(link.location.type);

  const position: LinkPosition = {
    contentZone: link.location.zone,
    percentageThrough: link.location.percentageThrough,
    paragraphNumber: link.location.paragraphNumber,
    totalParagraphs: link.location.totalParagraphs,
    contentType,
    isOptimalPlacement: false, // Will be calculated
    placementScore: 0, // Will be calculated
  };

  // Calculate placement score
  position.placementScore = calculatePlacementScore(position, destinationType);
  position.isOptimalPlacement = position.placementScore >= 80;

  // Generate issues and recommendations
  const issues = generatePlacementIssues(position, destinationType);
  const recommendations = generatePlacementRecommendations(position, destinationType);

  return {
    link,
    position,
    destinationType,
    isOptimal: position.isOptimalPlacement,
    issues,
    recommendations,
  };
}

/**
 * Analyze positions for all links
 */
export function analyzeAllLinkPositions(
  links: ExtractedLinkData[],
  pageDomain?: string
): PositionAnalysisSummary {
  const analyzedLinks = links.map(link => analyzeLinkPosition(link, pageDomain));

  // Count metrics
  const optimallyPlacedCount = analyzedLinks.filter(l => l.isOptimal).length;
  const suboptimalCount = analyzedLinks.length - optimallyPlacedCount;

  // Core links analysis
  const coreLinks = analyzedLinks.filter(l => l.destinationType === 'core');
  const coreLinksTotal = coreLinks.length;
  const coreLinksEarly = coreLinks.filter(l => l.position.contentZone === 'early').length;

  // Author links analysis
  const authorLinks = analyzedLinks.filter(l => l.destinationType === 'author');
  const authorLinksTotal = authorLinks.length;
  const authorLinksLate = authorLinks.filter(l => l.position.contentZone === 'late').length;

  // Calculate overall score
  const totalLinks = analyzedLinks.length || 1;
  const avgPlacementScore = analyzedLinks.reduce((sum, l) => sum + l.position.placementScore, 0) / totalLinks;

  // Bonus for proper core/author placement
  let bonusScore = 0;
  if (coreLinksTotal > 0) {
    bonusScore += (coreLinksEarly / coreLinksTotal) * 10;
  }
  if (authorLinksTotal > 0) {
    bonusScore += (authorLinksLate / authorLinksTotal) * 10;
  }

  const overallPlacementScore = Math.min(100, Math.round(avgPlacementScore + bonusScore));

  // Generate summary recommendations
  const summaryRecommendations: string[] = [];

  if (coreLinksTotal > 0 && coreLinksEarly < coreLinksTotal * 0.5) {
    summaryRecommendations.push(`Only ${coreLinksEarly}/${coreLinksTotal} core topic links are in the early content. Move more to the introduction.`);
  }

  if (authorLinksTotal > 0 && authorLinksLate < authorLinksTotal * 0.7) {
    summaryRecommendations.push(`Author page links should appear later in content. Consider moving ${authorLinksTotal - authorLinksLate} link(s).`);
  }

  if (overallPlacementScore < 60) {
    summaryRecommendations.push('Overall link placement needs improvement. Review link positions against destination types.');
  }

  return {
    analyzedLinks,
    optimallyPlacedCount,
    suboptimalCount,
    coreLinksEarly,
    coreLinksTotal,
    authorLinksLate,
    authorLinksTotal,
    overallPlacementScore,
    summaryRecommendations,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeLinkPosition,
  analyzeAllLinkPositions,
  detectDestinationType,
};
