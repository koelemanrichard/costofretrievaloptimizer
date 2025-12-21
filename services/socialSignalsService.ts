/**
 * Social Signals Service
 * Based on Google's patents on social signals for entity verification
 * and Knowledge Panel building (Kalicube methodology)
 *
 * Key patents referenced in Koray's discussions:
 * - US Patent 8,650,152: Methods for determining social relevance
 * - Google's Entity Association scoring using social graph signals
 *
 * This service helps track and optimize social signals that contribute
 * to entity recognition and Knowledge Panel eligibility.
 */

import type { SeedSourceCategory, SeedSourceEntry, EntityIdentity } from '../types';

// =============================================================================
// SOCIAL SIGNAL TYPES
// =============================================================================

export interface SocialProfile {
  platform: SocialPlatform;
  url: string;
  username: string;
  verified: boolean;
  followerCount?: number;
  postFrequency?: 'daily' | 'weekly' | 'monthly' | 'rarely';
  lastActivityDate?: string;
  entityMentionConsistency?: number; // 0-100: How consistently entity name appears
}

export type SocialPlatform =
  | 'youtube'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'pinterest'
  | 'github'
  | 'medium'
  | 'quora';

export interface SocialSignalScore {
  platform: SocialPlatform;
  score: number; // 0-100
  factors: SocialSignalFactor[];
  recommendations: string[];
}

export interface SocialSignalFactor {
  name: string;
  weight: number;
  achieved: boolean;
  description: string;
}

export interface OverallSocialSignalReport {
  totalScore: number;
  platformScores: SocialSignalScore[];
  kpReadiness: 'not-ready' | 'building' | 'ready' | 'strong';
  missingCriticalSignals: string[];
  recommendations: string[];
  corroborationMatrix: CorroborationEntry[];
}

export interface CorroborationEntry {
  factType: string; // e.g., "Entity Name", "Founded Year", "Location"
  sources: string[]; // Platforms where this fact is consistent
  inconsistencies: string[]; // Platforms with different data
  corroborationScore: number; // 0-100
}

// =============================================================================
// PLATFORM CONFIGURATION
// =============================================================================

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  kpWeight: number; // 1-10: Importance for Knowledge Panel
  entityTypes: string[]; // Which entity types benefit most
  urlPattern: RegExp;
  verificationMethod: string;
  category: SeedSourceCategory;
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    kpWeight: 9,
    entityTypes: ['Person', 'Organization', 'Brand', 'MusicGroup'],
    urlPattern: /youtube\.com\/(channel|c|user|@)\/[\w-]+/,
    verificationMethod: 'Channel verification badge + consistent branding',
    category: 'social',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    kpWeight: 8,
    entityTypes: ['Person', 'Organization', 'Brand'],
    urlPattern: /twitter\.com\/[\w]+|x\.com\/[\w]+/,
    verificationMethod: 'Blue checkmark + bio links to official site',
    category: 'social',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    kpWeight: 9,
    entityTypes: ['Person', 'Organization'],
    urlPattern: /linkedin\.com\/(in|company)\/[\w-]+/,
    verificationMethod: 'Company page verification + employee connections',
    category: 'business',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    kpWeight: 7,
    entityTypes: ['Organization', 'Brand', 'LocalBusiness'],
    urlPattern: /facebook\.com\/[\w.]+/,
    verificationMethod: 'Page verification badge + consistent NAP',
    category: 'social',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    kpWeight: 7,
    entityTypes: ['Person', 'Brand', 'Organization'],
    urlPattern: /instagram\.com\/[\w.]+/,
    verificationMethod: 'Verified badge + bio link to official site',
    category: 'social',
  },
  {
    id: 'github',
    name: 'GitHub',
    kpWeight: 8,
    entityTypes: ['Person', 'Organization', 'SoftwareApplication'],
    urlPattern: /github\.com\/[\w-]+/,
    verificationMethod: 'Organization verification + active repositories',
    category: 'developer',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    kpWeight: 5,
    entityTypes: ['Person', 'Brand'],
    urlPattern: /tiktok\.com\/@[\w.]+/,
    verificationMethod: 'Verified badge',
    category: 'social',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    kpWeight: 4,
    entityTypes: ['Brand', 'Organization'],
    urlPattern: /pinterest\.com\/[\w]+/,
    verificationMethod: 'Claimed website',
    category: 'social',
  },
  {
    id: 'medium',
    name: 'Medium',
    kpWeight: 6,
    entityTypes: ['Person', 'Organization'],
    urlPattern: /medium\.com\/@?[\w-]+/,
    verificationMethod: 'Publications + consistent authorship',
    category: 'media',
  },
  {
    id: 'quora',
    name: 'Quora',
    kpWeight: 5,
    entityTypes: ['Person', 'Organization'],
    urlPattern: /quora\.com\/profile\/[\w-]+/,
    verificationMethod: 'Credentials verification + answer activity',
    category: 'social',
  },
];

// =============================================================================
// SCORING FACTORS
// =============================================================================

export const SOCIAL_SIGNAL_FACTORS: Record<SocialPlatform, Omit<SocialSignalFactor, 'achieved'>[]> = {
  youtube: [
    { name: 'Channel exists and is active', weight: 20, description: 'YouTube channel with recent uploads' },
    { name: 'Channel is verified', weight: 15, description: 'Official verification badge' },
    { name: 'Entity name in channel name', weight: 20, description: 'Consistent entity naming' },
    { name: 'About section links to website', weight: 15, description: 'Cross-reference to official site' },
    { name: '1000+ subscribers', weight: 15, description: 'Minimum audience threshold' },
    { name: 'Consistent uploads (monthly+)', weight: 15, description: 'Active channel activity' },
  ],
  twitter: [
    { name: 'Account exists and is active', weight: 20, description: 'Twitter/X account with recent posts' },
    { name: 'Account is verified', weight: 15, description: 'Blue checkmark verification' },
    { name: 'Entity name in display name', weight: 20, description: 'Consistent entity naming' },
    { name: 'Bio links to website', weight: 15, description: 'Cross-reference to official site' },
    { name: '1000+ followers', weight: 15, description: 'Minimum audience threshold' },
    { name: 'Regular posting (weekly+)', weight: 15, description: 'Active account activity' },
  ],
  linkedin: [
    { name: 'Company page exists', weight: 20, description: 'LinkedIn company page created' },
    { name: 'Page is verified', weight: 15, description: 'LinkedIn verification' },
    { name: 'Complete company info', weight: 20, description: 'All fields filled out' },
    { name: 'Website link present', weight: 15, description: 'Cross-reference to official site' },
    { name: '50+ employees listed', weight: 15, description: 'Employee connections' },
    { name: 'Regular updates', weight: 15, description: 'Active page activity' },
  ],
  facebook: [
    { name: 'Page exists', weight: 20, description: 'Facebook page created' },
    { name: 'Page is verified', weight: 15, description: 'Facebook verification badge' },
    { name: 'Consistent NAP', weight: 20, description: 'Name, Address, Phone consistent with site' },
    { name: 'Website link present', weight: 15, description: 'Cross-reference to official site' },
    { name: 'Active engagement', weight: 15, description: 'Regular posts and interactions' },
    { name: 'Complete info section', weight: 15, description: 'All business info filled' },
  ],
  instagram: [
    { name: 'Account exists', weight: 20, description: 'Instagram account created' },
    { name: 'Account is verified', weight: 15, description: 'Verification badge' },
    { name: 'Entity name in username', weight: 20, description: 'Consistent entity naming' },
    { name: 'Bio links to website', weight: 15, description: 'Cross-reference to official site' },
    { name: '1000+ followers', weight: 15, description: 'Minimum audience threshold' },
    { name: 'Regular posting', weight: 15, description: 'Active account activity' },
  ],
  github: [
    { name: 'Organization exists', weight: 25, description: 'GitHub organization created' },
    { name: 'Organization is verified', weight: 15, description: 'Domain verification' },
    { name: 'Active repositories', weight: 20, description: 'Public repos with recent commits' },
    { name: 'Website link present', weight: 15, description: 'Cross-reference to official site' },
    { name: 'Team members listed', weight: 15, description: 'Organization members visible' },
    { name: 'README files complete', weight: 10, description: 'Documentation present' },
  ],
  tiktok: [
    { name: 'Account exists', weight: 25, description: 'TikTok account created' },
    { name: 'Account is verified', weight: 20, description: 'Verification badge' },
    { name: 'Entity name in username', weight: 20, description: 'Consistent entity naming' },
    { name: 'Bio links to website', weight: 20, description: 'Cross-reference to official site' },
    { name: 'Active content', weight: 15, description: 'Regular video uploads' },
  ],
  pinterest: [
    { name: 'Account exists', weight: 25, description: 'Pinterest account created' },
    { name: 'Website claimed', weight: 25, description: 'Website verification' },
    { name: 'Entity name in profile', weight: 20, description: 'Consistent entity naming' },
    { name: 'Active boards', weight: 15, description: 'Curated content boards' },
    { name: 'Followers present', weight: 15, description: 'Audience building' },
  ],
  medium: [
    { name: 'Profile exists', weight: 25, description: 'Medium profile/publication' },
    { name: 'Entity name in profile', weight: 20, description: 'Consistent entity naming' },
    { name: 'Website link present', weight: 20, description: 'Cross-reference to official site' },
    { name: 'Published articles', weight: 20, description: 'Active content creation' },
    { name: 'Follower count', weight: 15, description: 'Audience building' },
  ],
  quora: [
    { name: 'Profile exists', weight: 25, description: 'Quora profile created' },
    { name: 'Credentials listed', weight: 20, description: 'Professional credentials' },
    { name: 'Entity name in profile', weight: 20, description: 'Consistent entity naming' },
    { name: 'Active answers', weight: 20, description: 'Expertise demonstration' },
    { name: 'Upvotes received', weight: 15, description: 'Quality recognition' },
  ],
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Calculate social signal score for a single platform
 */
export function calculatePlatformScore(
  platform: SocialPlatform,
  profile: SocialProfile
): SocialSignalScore {
  const factors = SOCIAL_SIGNAL_FACTORS[platform];
  if (!factors) {
    return {
      platform,
      score: 0,
      factors: [],
      recommendations: ['Platform not configured for scoring'],
    };
  }

  const evaluatedFactors: SocialSignalFactor[] = [];
  const recommendations: string[] = [];
  let totalWeight = 0;
  let achievedWeight = 0;

  for (const factor of factors) {
    const achieved = evaluateFactor(platform, factor.name, profile);
    evaluatedFactors.push({ ...factor, achieved });
    totalWeight += factor.weight;
    if (achieved) {
      achievedWeight += factor.weight;
    } else {
      recommendations.push(`${factor.name}: ${factor.description}`);
    }
  }

  const score = Math.round((achievedWeight / totalWeight) * 100);

  return {
    platform,
    score,
    factors: evaluatedFactors,
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
  };
}

/**
 * Evaluate whether a specific factor is achieved
 */
function evaluateFactor(
  platform: SocialPlatform,
  factorName: string,
  profile: SocialProfile
): boolean {
  // Basic checks that apply to most factors
  if (factorName.includes('exists')) {
    return !!profile.url;
  }
  if (factorName.includes('verified')) {
    return profile.verified;
  }
  if (factorName.includes('entity name') || factorName.includes('Entity name')) {
    return (profile.entityMentionConsistency || 0) >= 80;
  }
  if (factorName.includes('links to website') || factorName.includes('Website link')) {
    // Would need to actually check the profile - assume true if URL exists
    return !!profile.url;
  }
  if (factorName.includes('1000+ followers') || factorName.includes('1000+ subscribers')) {
    return (profile.followerCount || 0) >= 1000;
  }
  if (factorName.includes('50+ employees')) {
    return (profile.followerCount || 0) >= 50; // Using followerCount as proxy
  }
  if (factorName.includes('Regular') || factorName.includes('Active') || factorName.includes('active')) {
    return profile.postFrequency === 'daily' || profile.postFrequency === 'weekly';
  }

  // Default to false for unrecognized factors
  return false;
}

/**
 * Generate overall social signal report for an entity
 */
export function generateSocialSignalReport(
  profiles: SocialProfile[],
  entityIdentity?: EntityIdentity
): OverallSocialSignalReport {
  const platformScores: SocialSignalScore[] = profiles.map(profile =>
    calculatePlatformScore(profile.platform, profile)
  );

  // Calculate weighted total score
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const score of platformScores) {
    const config = PLATFORM_CONFIGS.find(c => c.id === score.platform);
    const weight = config?.kpWeight || 5;
    totalWeightedScore += score.score * weight;
    totalWeight += weight * 100; // Max score per platform is 100
  }

  const totalScore = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;

  // Determine KP readiness
  let kpReadiness: OverallSocialSignalReport['kpReadiness'];
  if (totalScore >= 80 && platformScores.length >= 5) {
    kpReadiness = 'strong';
  } else if (totalScore >= 60 && platformScores.length >= 3) {
    kpReadiness = 'ready';
  } else if (totalScore >= 40 || platformScores.length >= 2) {
    kpReadiness = 'building';
  } else {
    kpReadiness = 'not-ready';
  }

  // Identify missing critical signals
  const missingCriticalSignals: string[] = [];
  const criticalPlatforms: SocialPlatform[] = ['youtube', 'twitter', 'linkedin'];

  for (const platform of criticalPlatforms) {
    if (!profiles.some(p => p.platform === platform)) {
      const config = PLATFORM_CONFIGS.find(c => c.id === platform);
      missingCriticalSignals.push(`Missing ${config?.name || platform} presence`);
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (profiles.length < 3) {
    recommendations.push('Establish presence on at least 3 major social platforms');
  }

  const unverifiedProfiles = profiles.filter(p => !p.verified);
  if (unverifiedProfiles.length > 0) {
    recommendations.push(`Get verified on: ${unverifiedProfiles.map(p => p.platform).join(', ')}`);
  }

  const lowConsistency = profiles.filter(p => (p.entityMentionConsistency || 0) < 80);
  if (lowConsistency.length > 0) {
    recommendations.push('Ensure entity name is consistent across all profiles');
  }

  // Add platform-specific recommendations
  for (const score of platformScores) {
    if (score.score < 70 && score.recommendations.length > 0) {
      recommendations.push(`${score.platform}: ${score.recommendations[0]}`);
    }
  }

  // Corroboration matrix
  const corroborationMatrix: CorroborationEntry[] = [
    {
      factType: 'Entity Name',
      sources: profiles.filter(p => (p.entityMentionConsistency || 0) >= 80).map(p => p.platform),
      inconsistencies: profiles.filter(p => (p.entityMentionConsistency || 0) < 80).map(p => p.platform),
      corroborationScore: profiles.length > 0
        ? Math.round(profiles.filter(p => (p.entityMentionConsistency || 0) >= 80).length / profiles.length * 100)
        : 0,
    },
    {
      factType: 'Website Link',
      sources: profiles.map(p => p.platform), // Assume all have website links if URL exists
      inconsistencies: [],
      corroborationScore: 100,
    },
    {
      factType: 'Verification Status',
      sources: profiles.filter(p => p.verified).map(p => p.platform),
      inconsistencies: profiles.filter(p => !p.verified).map(p => p.platform),
      corroborationScore: profiles.length > 0
        ? Math.round(profiles.filter(p => p.verified).length / profiles.length * 100)
        : 0,
    },
  ];

  return {
    totalScore,
    platformScores,
    kpReadiness,
    missingCriticalSignals,
    recommendations: recommendations.slice(0, 5),
    corroborationMatrix,
  };
}

/**
 * Get priority platforms for an entity type
 */
export function getPriorityPlatformsForEntityType(entityType: string): PlatformConfig[] {
  return PLATFORM_CONFIGS
    .filter(config => config.entityTypes.includes(entityType))
    .sort((a, b) => b.kpWeight - a.kpWeight);
}

/**
 * Validate a social profile URL
 */
export function validateSocialProfileUrl(url: string): { valid: boolean; platform?: SocialPlatform; error?: string } {
  for (const config of PLATFORM_CONFIGS) {
    if (config.urlPattern.test(url)) {
      return { valid: true, platform: config.id };
    }
  }

  return { valid: false, error: 'URL does not match any known social platform pattern' };
}

/**
 * Extract username from social profile URL
 */
export function extractUsernameFromUrl(url: string, platform: SocialPlatform): string | null {
  const config = PLATFORM_CONFIGS.find(c => c.id === platform);
  if (!config) return null;

  const match = url.match(config.urlPattern);
  if (!match) return null;

  // Extract the last part of the matched URL
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1].replace('@', '');
}

/**
 * Generate action checklist for Knowledge Panel readiness
 */
export function generateKPActionChecklist(
  profiles: SocialProfile[],
  entityType: string = 'Organization'
): Array<{ action: string; priority: 'high' | 'medium' | 'low'; completed: boolean }> {
  const checklist: Array<{ action: string; priority: 'high' | 'medium' | 'low'; completed: boolean }> = [];

  const priorityPlatforms = getPriorityPlatformsForEntityType(entityType);
  const existingPlatforms = new Set(profiles.map(p => p.platform));

  // Check for missing high-priority platforms
  for (const config of priorityPlatforms.slice(0, 3)) {
    if (!existingPlatforms.has(config.id)) {
      checklist.push({
        action: `Create ${config.name} profile with consistent entity naming`,
        priority: 'high',
        completed: false,
      });
    } else {
      const profile = profiles.find(p => p.platform === config.id);
      if (profile && !profile.verified) {
        checklist.push({
          action: `Get verified on ${config.name}`,
          priority: 'high',
          completed: false,
        });
      }
    }
  }

  // Check entity consistency
  const inconsistentProfiles = profiles.filter(p => (p.entityMentionConsistency || 0) < 80);
  if (inconsistentProfiles.length > 0) {
    checklist.push({
      action: `Update entity name on: ${inconsistentProfiles.map(p => p.platform).join(', ')}`,
      priority: 'high',
      completed: false,
    });
  }

  // Check for website links
  checklist.push({
    action: 'Ensure all profiles link back to official website',
    priority: 'medium',
    completed: true, // Assume true if we have URL
  });

  // Activity checks
  const inactiveProfiles = profiles.filter(p =>
    p.postFrequency === 'rarely' || !p.postFrequency
  );
  if (inactiveProfiles.length > 0) {
    checklist.push({
      action: `Increase posting frequency on: ${inactiveProfiles.map(p => p.platform).join(', ')}`,
      priority: 'medium',
      completed: false,
    });
  }

  // Add general best practices
  checklist.push({
    action: 'Cross-link between all social profiles',
    priority: 'low',
    completed: false,
  });

  checklist.push({
    action: 'Add schema.org sameAs markup for all social profiles on website',
    priority: 'medium',
    completed: false,
  });

  return checklist;
}
