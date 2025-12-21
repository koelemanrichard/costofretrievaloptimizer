/**
 * Seed Sources Configuration for Knowledge Panel Optimization
 * Based on Kalicube's methodology for entity corroboration
 *
 * Kalicube recommends ~20+ consistent corroborative sources forming
 * an "infinite self-confirming loop of corroboration" for KP building.
 */

import type { SeedSourceCategory, SeedSourceDefinition, EntityIdentity } from '../types';

// =============================================================================
// SEED SOURCE DEFINITIONS
// =============================================================================

export const SEED_SOURCES: SeedSourceDefinition[] = [
  // -------------------------------------------------------------------------
  // Authority Sources (highest KP weight - 10)
  // These are Google's most trusted sources for entity verification
  // -------------------------------------------------------------------------
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    category: 'authority',
    icon: '📖',
    createUrl: 'https://en.wikipedia.org/wiki/Special:CreatePage',
    kpWeight: 10,
    entityTypes: ['Organization', 'Person', 'Product', 'Brand'],
    verificationMethod: 'Manual review by Wikipedia editors'
  },
  {
    id: 'wikidata',
    name: 'Wikidata',
    category: 'authority',
    icon: '📊',
    createUrl: 'https://www.wikidata.org/wiki/Special:NewItem',
    kpWeight: 10,
    entityTypes: ['Organization', 'Person', 'Product', 'Place', 'Brand'],
    verificationMethod: 'QID entity linking'
  },

  // -------------------------------------------------------------------------
  // Business Sources (KP weight 8-9)
  // Official business registries and professional networks
  // -------------------------------------------------------------------------
  {
    id: 'googleBusinessProfile',
    name: 'Google Business Profile',
    category: 'business',
    icon: '📍',
    createUrl: 'https://business.google.com/',
    kpWeight: 9,
    entityTypes: ['LocalBusiness', 'Organization'],
    verificationMethod: 'Phone/postcard/email verification'
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    category: 'business',
    icon: '💼',
    createUrl: 'https://www.crunchbase.com/add-organization',
    kpWeight: 8,
    entityTypes: ['Organization', 'Person', 'StartUp'],
    verificationMethod: 'Email domain verification'
  },
  {
    id: 'linkedinCompany',
    name: 'LinkedIn Company',
    category: 'business',
    icon: '🔗',
    createUrl: 'https://www.linkedin.com/company/setup/new/',
    kpWeight: 8,
    entityTypes: ['Organization'],
    verificationMethod: 'Email domain verification'
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    category: 'business',
    icon: '📈',
    createUrl: 'https://www.bloomberg.com/profile/company/',
    kpWeight: 8,
    entityTypes: ['Organization', 'PublicCompany'],
    verificationMethod: 'Public company data'
  },

  // -------------------------------------------------------------------------
  // Social Sources (KP weight 5-7)
  // Social profiles that Google uses for entity corroboration
  // -------------------------------------------------------------------------
  {
    id: 'youtube',
    name: 'YouTube Channel',
    category: 'social',
    icon: '▶️',
    createUrl: 'https://www.youtube.com/channel_switcher',
    kpWeight: 7,
    entityTypes: ['Organization', 'Person', 'Brand'],
    verificationMethod: 'Google account linking'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    category: 'social',
    icon: '𝕏',
    createUrl: 'https://twitter.com/i/flow/signup',
    kpWeight: 6,
    entityTypes: ['Organization', 'Person', 'Brand'],
    verificationMethod: 'Verified badge (optional)'
  },
  {
    id: 'facebook',
    name: 'Facebook Page',
    category: 'social',
    icon: '👤',
    createUrl: 'https://www.facebook.com/pages/create',
    kpWeight: 5,
    entityTypes: ['Organization', 'LocalBusiness', 'Brand'],
    verificationMethod: 'Business verification'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    icon: '📷',
    createUrl: 'https://www.instagram.com/accounts/emailsignup/',
    kpWeight: 5,
    entityTypes: ['Organization', 'Person', 'Brand'],
    verificationMethod: 'Meta business verification'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    category: 'social',
    icon: '📌',
    createUrl: 'https://business.pinterest.com/',
    kpWeight: 4,
    entityTypes: ['Organization', 'Brand', 'Ecommerce'],
    verificationMethod: 'Website verification'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'social',
    icon: '🎵',
    createUrl: 'https://www.tiktok.com/signup',
    kpWeight: 4,
    entityTypes: ['Organization', 'Person', 'Brand'],
    verificationMethod: 'Phone verification'
  },

  // -------------------------------------------------------------------------
  // Developer Sources (KP weight 4-6)
  // Technical platforms for software entities
  // -------------------------------------------------------------------------
  {
    id: 'github',
    name: 'GitHub',
    category: 'developer',
    icon: '🐙',
    createUrl: 'https://github.com/organizations/plan',
    kpWeight: 6,
    entityTypes: ['Organization', 'SoftwareApplication', 'Person'],
    verificationMethod: 'Email verification'
  },
  {
    id: 'npmjs',
    name: 'npm',
    category: 'developer',
    icon: '📦',
    createUrl: 'https://www.npmjs.com/signup',
    kpWeight: 4,
    entityTypes: ['SoftwareApplication', 'Organization'],
    verificationMethod: 'Email verification'
  },
  {
    id: 'pypi',
    name: 'PyPI',
    category: 'developer',
    icon: '🐍',
    createUrl: 'https://pypi.org/account/register/',
    kpWeight: 4,
    entityTypes: ['SoftwareApplication', 'Organization'],
    verificationMethod: 'Email verification'
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    category: 'developer',
    icon: '📚',
    createUrl: 'https://stackoverflow.com/users/signup',
    kpWeight: 5,
    entityTypes: ['Person', 'Organization'],
    verificationMethod: 'Reputation system'
  },

  // -------------------------------------------------------------------------
  // Media Sources (KP weight 4-5)
  // Podcast and media platforms
  // -------------------------------------------------------------------------
  {
    id: 'applepodcasts',
    name: 'Apple Podcasts',
    category: 'media',
    icon: '🎙️',
    createUrl: 'https://podcasters.apple.com/',
    kpWeight: 5,
    entityTypes: ['Organization', 'Person', 'Podcast'],
    verificationMethod: 'Apple ID verification'
  },
  {
    id: 'spotify',
    name: 'Spotify for Artists',
    category: 'media',
    icon: '🎧',
    createUrl: 'https://artists.spotify.com/',
    kpWeight: 4,
    entityTypes: ['Person', 'MusicGroup', 'Artist'],
    verificationMethod: 'Distributor verification'
  },
  {
    id: 'imdb',
    name: 'IMDb',
    category: 'media',
    icon: '🎬',
    createUrl: 'https://contribute.imdb.com/updates',
    kpWeight: 6,
    entityTypes: ['Person', 'Organization', 'Movie', 'TVShow'],
    verificationMethod: 'Editorial review'
  },

  // -------------------------------------------------------------------------
  // Industry Sources (KP weight 5-7)
  // Industry-specific directories and review sites
  // -------------------------------------------------------------------------
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    category: 'industry',
    icon: '🚪',
    createUrl: 'https://www.glassdoor.com/employers/',
    kpWeight: 5,
    entityTypes: ['Organization', 'Employer'],
    verificationMethod: 'Email domain verification'
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    category: 'industry',
    icon: '⭐',
    createUrl: 'https://business.trustpilot.com/',
    kpWeight: 5,
    entityTypes: ['Organization', 'Ecommerce', 'LocalBusiness'],
    verificationMethod: 'Website ownership'
  },
  {
    id: 'g2',
    name: 'G2',
    category: 'industry',
    icon: '📊',
    createUrl: 'https://sell.g2.com/',
    kpWeight: 6,
    entityTypes: ['SoftwareApplication', 'SaaS', 'Organization'],
    verificationMethod: 'Business verification'
  },
  {
    id: 'capterra',
    name: 'Capterra',
    category: 'industry',
    icon: '🏆',
    createUrl: 'https://www.capterra.com/vendors/sign-up',
    kpWeight: 5,
    entityTypes: ['SoftwareApplication', 'SaaS', 'Organization'],
    verificationMethod: 'Business verification'
  },
  {
    id: 'yelp',
    name: 'Yelp',
    category: 'industry',
    icon: '📋',
    createUrl: 'https://biz.yelp.com/',
    kpWeight: 5,
    entityTypes: ['LocalBusiness', 'Restaurant', 'Service'],
    verificationMethod: 'Phone verification'
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get seed sources applicable to a specific entity type
 */
export function getSeedSourcesForEntityType(entityType: string): SeedSourceDefinition[] {
  return SEED_SOURCES.filter(s => s.entityTypes.includes(entityType));
}

/**
 * Get seed sources by category
 */
export function getSeedSourcesByCategory(category: SeedSourceCategory): SeedSourceDefinition[] {
  return SEED_SOURCES.filter(s => s.category === category);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): SeedSourceCategory[] {
  return [...new Set(SEED_SOURCES.map(s => s.category))];
}

/**
 * Category display metadata
 */
export const CATEGORY_LABELS: Record<SeedSourceCategory, { label: string; description: string }> = {
  authority: {
    label: 'Authority Sources',
    description: 'Highest trust - Wikipedia, Wikidata'
  },
  business: {
    label: 'Business Profiles',
    description: 'Official business registries'
  },
  social: {
    label: 'Social Profiles',
    description: 'Social media presence'
  },
  developer: {
    label: 'Developer Platforms',
    description: 'Technical & code repositories'
  },
  industry: {
    label: 'Industry Directories',
    description: 'Niche & review platforms'
  },
  media: {
    label: 'Media Platforms',
    description: 'Podcast & entertainment'
  }
};

/**
 * Calculate corroboration score based on existing seed sources
 * Returns a score from 0-100 indicating Knowledge Panel readiness
 */
export function calculateCorroborationScore(
  existingSources: EntityIdentity['existingSeedSources']
): {
  score: number;
  sourcesFound: number;
  totalWeight: number;
  earnedWeight: number;
  missingHighPriority: SeedSourceDefinition[];
} {
  let totalWeight = 0;
  let earnedWeight = 0;
  let sourcesFound = 0;
  const missingHighPriority: SeedSourceDefinition[] = [];

  // Map source IDs to existingSeedSources keys
  const sourceKeyMap: Record<string, keyof typeof existingSources> = {
    wikipedia: 'wikipedia',
    wikidata: 'wikidata',
    crunchbase: 'crunchbase',
    linkedinCompany: 'linkedinCompany',
    googleBusinessProfile: 'googleBusinessProfile',
    youtube: 'youtube',
    twitter: 'twitter',
    instagram: 'instagram',
    facebook: 'facebook',
    github: 'github',
  };

  SEED_SOURCES.forEach(source => {
    totalWeight += source.kpWeight;

    const key = sourceKeyMap[source.id];
    if (key) {
      const value = existingSources[key];
      const hasSource = value !== undefined && value !== null && value !== '' && value !== false;

      if (hasSource) {
        earnedWeight += source.kpWeight;
        sourcesFound++;
      } else if (source.kpWeight >= 7) {
        missingHighPriority.push(source);
      }
    }
  });

  // Also count industry directories
  const directoryCount = existingSources.industryDirectories?.length || 0;
  if (directoryCount > 0) {
    // Award 3 points per directory, up to 15 points max
    earnedWeight += Math.min(directoryCount * 3, 15);
    sourcesFound += directoryCount;
  }

  const score = Math.round((earnedWeight / totalWeight) * 100);

  return {
    score,
    sourcesFound,
    totalWeight,
    earnedWeight,
    missingHighPriority
  };
}

/**
 * Get recommended sources based on entity type and current coverage
 */
export function getRecommendedSources(
  entityType: string,
  existingSources: EntityIdentity['existingSeedSources']
): SeedSourceDefinition[] {
  const applicable = getSeedSourcesForEntityType(entityType);
  const { missingHighPriority } = calculateCorroborationScore(existingSources);

  // Prioritize high-weight missing sources that apply to this entity type
  return missingHighPriority.filter(s => s.entityTypes.includes(entityType));
}

/**
 * Get corroboration status label
 */
export function getCorroborationStatus(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 80) {
    return {
      label: 'Excellent',
      color: 'green',
      description: 'Strong entity corroboration - KP highly likely'
    };
  } else if (score >= 60) {
    return {
      label: 'Good',
      color: 'blue',
      description: 'Solid foundation - add more sources for KP'
    };
  } else if (score >= 40) {
    return {
      label: 'Fair',
      color: 'yellow',
      description: 'Need more high-authority sources'
    };
  } else if (score >= 20) {
    return {
      label: 'Weak',
      color: 'orange',
      description: 'Limited corroboration - focus on authority sources'
    };
  } else {
    return {
      label: 'Minimal',
      color: 'red',
      description: 'Start with Wikipedia and Wikidata entries'
    };
  }
}
