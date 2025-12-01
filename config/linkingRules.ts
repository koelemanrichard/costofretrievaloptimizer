// config/linkingRules.ts
// Default configuration for the Internal Linking Audit System (Phase 5)

import { InternalLinkingRules } from '../types';

/**
 * Generic anchor texts that should be avoided
 * These provide no semantic value to search engines
 */
export const GENERIC_ANCHORS = [
  'click here',
  'read more',
  'learn more',
  'view',
  'this',
  'here',
  'link',
  'page',
  'article',
  'post',
  'see more',
  'continue reading',
  'find out more',
  'discover more',
  'check it out',
  'go here',
  'visit',
] as const;

/**
 * Default internal linking rules based on research document
 * Reference: docs/build-docs/linking in website.md
 */
export const DEFAULT_LINKING_RULES: InternalLinkingRules = {
  // Pass 1: Fundamentals
  maxLinksPerPage: 150,           // Maximum 150 internal links per page (including navigation)
  maxAnchorTextRepetition: 3,     // Same anchor text max 3x per target URL

  // Content prioritization
  prioritizeMainContentLinks: true,  // 70-95% of links should be in main content
  useDescriptiveAnchorText: true,    // Always use descriptive anchor text
  avoidGenericAnchors: [...GENERIC_ANCHORS],

  // Pass 3: Flow Direction
  contextualBridgeRequired: true,    // Require contextual bridges for discordant topics
  delayLowRelevanceLinks: true,      // Place Core links at bottom of Author section pages
  hubSpokeFlowDirection: 'spoke_to_hub',  // Authority flows: Author Section → Core Section

  // Quality filtering
  linkToQualityNodesFirst: true,     // Prefer linking to high-quality pages
  qualityNodeThreshold: 70,          // Minimum quality score for priority linking
};

/**
 * Navigation-specific rules
 */
export const NAVIGATION_RULES = {
  // Pass 2: Navigation
  maxHeaderLinks: 10,               // Maximum links in header navigation
  maxFooterLinks: 30,               // Maximum links per footer section
  maxFooterSections: 4,             // Maximum number of footer column sections

  // Required E-A-T links
  requiredFooterLinks: ['about', 'privacy', 'contact'] as const,

  // Anchor differentiation
  requireDifferentAnchors: true,    // Header and footer must use different anchor text

  // Dynamic navigation
  preferDynamicNavigation: true,    // Recommend context-aware navigation
} as const;

/**
 * External link validation rules
 */
export const EXTERNAL_LINK_RULES = {
  // Pass 4: External E-A-T
  requireEatPurpose: true,          // External links must serve E-A-T purpose
  flagCompetitorLinks: true,        // Warn about links to competitor domains
  requireTextIntegration: true,     // References should be in text, not just bibliography

  // Authority domain patterns
  highAuthorityPatterns: [
    /\.gov$/,
    /\.edu$/,
    /\.org$/,
    /wikipedia\.org/,
    /scholar\.google/,
    /pubmed\.ncbi/,
    /sciencedirect\.com/,
    /springer\.com/,
  ] as const,

  // Social proof
  requireSocialInSchema: true,      // Include social links in Organization schema
} as const;

/**
 * Scoring weights for audit passes
 */
export const PASS_WEIGHTS = {
  fundamentals: 0.35,    // 35% weight
  navigation: 0.25,      // 25% weight
  flowDirection: 0.25,   // 25% weight
  external: 0.15,        // 15% weight
} as const;

/**
 * Issue severity penalties for score calculation
 */
export const SEVERITY_PENALTIES = {
  critical: 10,          // -10 points per critical issue
  warning: 3,            // -3 points per warning
  suggestion: 1,         // -1 point per suggestion
} as const;

/**
 * Auto-fix confidence thresholds
 */
export const FIX_CONFIDENCE_THRESHOLDS = {
  autoApply: 85,         // Auto-apply fixes with confidence >= 85%
  suggest: 60,           // Show as suggestion for confidence >= 60%
  requireReview: 0,      // Always require review below 60%
} as const;

/**
 * Get combined rules object for use in components
 */
export const getLinkingConfig = () => ({
  rules: DEFAULT_LINKING_RULES,
  navigation: NAVIGATION_RULES,
  external: EXTERNAL_LINK_RULES,
  weights: PASS_WEIGHTS,
  penalties: SEVERITY_PENALTIES,
  thresholds: FIX_CONFIDENCE_THRESHOLDS,
});

export default {
  DEFAULT_LINKING_RULES,
  NAVIGATION_RULES,
  EXTERNAL_LINK_RULES,
  GENERIC_ANCHORS,
  PASS_WEIGHTS,
  SEVERITY_PENALTIES,
  FIX_CONFIDENCE_THRESHOLDS,
  getLinkingConfig,
};
