/**
 * Social Media Signals Configuration
 * Based on Google Patents for Social Media & Brand Signals
 *
 * This configuration captures the 10 Google patents discussed in the
 * Semantic SEO framework that demonstrate how social media signals
 * influence search rankings and entity authority.
 *
 * Key Patents:
 * 1. Presenting social search results
 * 2. Crowdsourcing user-provided identifiers (brand recognition)
 * 3. Determining influence in a social community
 * 4. Social computing personas for reputation
 * 5. Reputation and engagement system
 * 6. Reputation of an author of online content
 * 7. Knowledge panel (social modules)
 * 8. Filtering social search results
 * 9. Social annotations for enhanced search results
 * 10. Ranking social network objects
 */

import type { SocialSignalType, SocialPlatform, SocialSignalRule, BrandSignalCategory } from '../types';

// =============================================================================
// SOCIAL PLATFORM DEFINITIONS
// =============================================================================

export const SOCIAL_PLATFORMS: Record<SocialPlatform, {
  name: string;
  icon: string;
  entityType: string;
  urlPattern: RegExp;
  importance: 'critical' | 'high' | 'medium' | 'low';
  kpContributor: boolean;
}> = {
  linkedin: {
    name: 'LinkedIn',
    icon: '🔗',
    entityType: 'ProfessionalNetwork',
    urlPattern: /linkedin\.com\/(company|in)\//,
    importance: 'critical',
    kpContributor: true,
  },
  twitter: {
    name: 'X (Twitter)',
    icon: '𝕏',
    entityType: 'SocialNetwork',
    urlPattern: /(?:twitter\.com|x\.com)\//,
    importance: 'high',
    kpContributor: true,
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    entityType: 'SocialNetwork',
    urlPattern: /facebook\.com\//,
    importance: 'medium',
    kpContributor: true,
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    entityType: 'SocialNetwork',
    urlPattern: /instagram\.com\//,
    importance: 'medium',
    kpContributor: false,
  },
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    entityType: 'VideoNetwork',
    urlPattern: /youtube\.com\/(channel|c|@)\//,
    importance: 'critical',
    kpContributor: true,
  },
  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    entityType: 'VisualNetwork',
    urlPattern: /pinterest\.com\//,
    importance: 'low',
    kpContributor: false,
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    entityType: 'VideoNetwork',
    urlPattern: /tiktok\.com\/@/,
    importance: 'medium',
    kpContributor: false,
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    entityType: 'DeveloperNetwork',
    urlPattern: /github\.com\//,
    importance: 'high',
    kpContributor: true,
  },
};

// =============================================================================
// BRAND SIGNAL CATEGORIES (from Google Patents)
// =============================================================================

export const BRAND_SIGNAL_CATEGORIES: Record<BrandSignalCategory, {
  name: string;
  description: string;
  patentBasis: string;
  weight: number;
}> = {
  brand_mentions: {
    name: 'Brand Mentions',
    description: 'Unlinked mentions of brand name acting as implied links',
    patentBasis: 'Implied Links Patent - mentions act as ranking signals without links',
    weight: 25,
  },
  entity_authority: {
    name: 'Entity Authority',
    description: 'Established authority and trust for the entity',
    patentBasis: 'Agent Rank (Brand/Entity Reputation Patent)',
    weight: 30,
  },
  social_influence: {
    name: 'Social Influence',
    description: 'Influence score based on reach of communications',
    patentBasis: 'Determining influence in a social community (Patent 3)',
    weight: 20,
  },
  reference_queries: {
    name: 'Reference Queries',
    description: 'Branded searches directly impacting result ordering',
    patentBasis: 'Reference Query Patent',
    weight: 15,
  },
  entity_consistency: {
    name: 'Entity Consistency',
    description: 'Consistent entity representation across web sources',
    patentBasis: 'Website Representation Vectors Patent (2020)',
    weight: 10,
  },
};

// =============================================================================
// SOCIAL SIGNAL RULES
// =============================================================================

export const SOCIAL_SIGNAL_RULES: SocialSignalRule[] = [
  // Profile Completeness Rules
  {
    id: 'ss-profile-complete',
    signal_type: 'profile_completeness',
    name: 'Complete Social Profiles',
    description: 'All key social profiles have complete bio, avatar, and links',
    validation_fn: 'validateProfileCompleteness',
    weight: 15,
    is_critical: true,
    patent_reference: 'Social computing personas (Patent 4)',
  },
  {
    id: 'ss-consistent-naming',
    signal_type: 'entity_consistency',
    name: 'Consistent Brand Naming',
    description: 'Brand name, handle, and bio are consistent across platforms',
    validation_fn: 'validateConsistentNaming',
    weight: 20,
    is_critical: true,
    patent_reference: 'Crowdsourcing user-provided identifiers (Patent 2)',
  },
  {
    id: 'ss-niche-association',
    signal_type: 'topical_relevance',
    name: 'Niche/Topic Association',
    description: 'Social profiles clearly associated with industry/niche topics',
    validation_fn: 'validateNicheAssociation',
    weight: 15,
    is_critical: false,
    patent_reference: 'Determining influence in a social community (Patent 3)',
  },

  // Engagement Rules
  {
    id: 'ss-engagement-rate',
    signal_type: 'engagement',
    name: 'Active Engagement',
    description: 'Regular posting and community interaction',
    validation_fn: 'validateEngagementRate',
    weight: 10,
    is_critical: false,
    patent_reference: 'Reputation and engagement system (Patent 5)',
  },
  {
    id: 'ss-community-building',
    signal_type: 'influence',
    name: 'Community Building',
    description: 'Growing follower base with genuine engagement',
    validation_fn: 'validateCommunityBuilding',
    weight: 10,
    is_critical: false,
    patent_reference: 'Determining influence in a social community (Patent 3)',
  },

  // Authority Rules
  {
    id: 'ss-expertise-sharing',
    signal_type: 'expertise',
    name: 'Expertise Demonstration',
    description: 'Sharing insights, research, case studies on social',
    validation_fn: 'validateExpertiseSharing',
    weight: 15,
    is_critical: true,
    patent_reference: 'Reputation of an author of online content (Patent 6)',
  },
  {
    id: 'ss-citation-mentions',
    signal_type: 'brand_mentions',
    name: 'Citation & Mentions',
    description: 'Brand mentioned by other accounts and in discussions',
    validation_fn: 'validateCitationMentions',
    weight: 15,
    is_critical: false,
    patent_reference: 'Social annotations for enhanced search results (Patent 9)',
  },
];

// =============================================================================
// KNOWLEDGE PANEL SOCIAL SIGNALS
// =============================================================================

export interface KPSocialSignal {
  platform: SocialPlatform;
  required: boolean;
  description: string;
  setupUrl: string;
}

export const KP_SOCIAL_SIGNALS: KPSocialSignal[] = [
  {
    platform: 'linkedin',
    required: true,
    description: 'Company page with complete info, logo, and regular updates',
    setupUrl: 'https://www.linkedin.com/company/setup/new/',
  },
  {
    platform: 'twitter',
    required: true,
    description: 'Verified account with consistent branding and active presence',
    setupUrl: 'https://twitter.com/i/flow/signup',
  },
  {
    platform: 'youtube',
    required: false,
    description: 'Channel with brand videos, helpful for entity disambiguation',
    setupUrl: 'https://www.youtube.com/create_channel',
  },
  {
    platform: 'facebook',
    required: false,
    description: 'Business page linked to website with reviews',
    setupUrl: 'https://www.facebook.com/pages/create',
  },
];

// =============================================================================
// SEO BENEFITS FROM SOCIAL PRESENCE
// =============================================================================

export const SOCIAL_SEO_BENEFITS = [
  {
    id: 'serp-real-estate',
    name: 'SERP Real Estate Control',
    description: 'Social profiles rank for brand name, controlling page-one results',
    impact: 'high',
  },
  {
    id: 'kp-building',
    name: 'Knowledge Panel Building',
    description: 'Strong social presence establishes Knowledge Graph attributes',
    impact: 'critical',
  },
  {
    id: 'entity-disambiguation',
    name: 'Entity Disambiguation',
    description: 'Consistent naming across profiles reinforces entity understanding',
    impact: 'high',
  },
  {
    id: 'topical-association',
    name: 'Topical Association',
    description: 'Repeated brand mentions alongside key topics strengthens co-occurrence',
    impact: 'medium',
  },
  {
    id: 'offsite-expertise',
    name: 'Off-site Expertise Signals',
    description: 'Expert insights shared on social contribute to E-E-A-T',
    impact: 'high',
  },
  {
    id: 'social-content-ranking',
    name: 'Social Content in SERP',
    description: 'Social posts can rank directly in search results',
    impact: 'medium',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get platforms that contribute to Knowledge Panel
 */
export function getKPContributingPlatforms(): SocialPlatform[] {
  return (Object.entries(SOCIAL_PLATFORMS) as [SocialPlatform, typeof SOCIAL_PLATFORMS[SocialPlatform]][])
    .filter(([_, config]) => config.kpContributor)
    .map(([platform]) => platform);
}

/**
 * Get critical social signal rules
 */
export function getCriticalSocialRules(): SocialSignalRule[] {
  return SOCIAL_SIGNAL_RULES.filter(rule => rule.is_critical);
}

/**
 * Calculate social presence score
 */
export function calculateSocialPresenceScore(
  claimedPlatforms: SocialPlatform[],
  profileCompleteness: Record<SocialPlatform, number>
): number {
  let totalWeight = 0;
  let earnedScore = 0;

  for (const [platform, config] of Object.entries(SOCIAL_PLATFORMS) as [SocialPlatform, typeof SOCIAL_PLATFORMS[SocialPlatform]][]) {
    const platformWeight = config.importance === 'critical' ? 30 :
                          config.importance === 'high' ? 20 :
                          config.importance === 'medium' ? 10 : 5;
    totalWeight += platformWeight;

    if (claimedPlatforms.includes(platform)) {
      const completeness = profileCompleteness[platform] || 0;
      earnedScore += platformWeight * (completeness / 100);
    }
  }

  return Math.round((earnedScore / totalWeight) * 100);
}

/**
 * Get recommended social actions for entity
 */
export function getRecommendedSocialActions(
  claimedPlatforms: SocialPlatform[],
  entityType: 'business' | 'person'
): { platform: SocialPlatform; action: string; priority: 'high' | 'medium' | 'low' }[] {
  const actions: { platform: SocialPlatform; action: string; priority: 'high' | 'medium' | 'low' }[] = [];

  // Critical platforms first
  const criticalPlatforms: SocialPlatform[] = ['linkedin', 'youtube'];
  const highPlatforms: SocialPlatform[] = ['twitter', 'github'];

  for (const platform of criticalPlatforms) {
    if (!claimedPlatforms.includes(platform)) {
      actions.push({
        platform,
        action: `Create and optimize ${SOCIAL_PLATFORMS[platform].name} profile`,
        priority: 'high',
      });
    }
  }

  for (const platform of highPlatforms) {
    if (!claimedPlatforms.includes(platform)) {
      actions.push({
        platform,
        action: `Establish presence on ${SOCIAL_PLATFORMS[platform].name}`,
        priority: 'medium',
      });
    }
  }

  return actions;
}

/**
 * Validate social profile URL
 */
export function validateSocialUrl(url: string, platform: SocialPlatform): boolean {
  const config = SOCIAL_PLATFORMS[platform];
  return config.urlPattern.test(url);
}
