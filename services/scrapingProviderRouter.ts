// services/scrapingProviderRouter.ts
// Intelligent provider selection for page extraction

import { ExtractionType, ScrapingProvider } from '../types';

// Known JS-heavy domains that require browser rendering
const DEFAULT_FORCE_APIFY_DOMAINS = [
  'linkedin.com',
  'twitter.com',
  'x.com',
  'amazon.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
];

export interface ProviderSelectionConfig {
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  apifyToken?: string;
  preferredProvider?: ScrapingProvider | 'auto';
  forceApifyDomains?: string[];
  url?: string;
}

/**
 * Get default fallback order based on extraction type
 */
export function getDefaultFallbackOrder(type: ExtractionType): ScrapingProvider[] {
  switch (type) {
    case 'semantic_only':
      // Semantic: Jina is best, Firecrawl as backup
      return ['jina', 'firecrawl'];
    case 'technical_only':
      // Technical: Apify has full data, Firecrawl partial
      return ['apify', 'firecrawl'];
    case 'full_audit':
    case 'auto':
    default:
      // Full: Try all in order of cost-effectiveness
      return ['jina', 'firecrawl', 'apify'];
  }
}

/**
 * Check if URL requires Apify (JS-heavy sites)
 */
export function shouldForceApify(
  url: string,
  customDomains?: string[]
): boolean {
  const domains = customDomains || DEFAULT_FORCE_APIFY_DOMAINS;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return domains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Get available providers based on API keys
 */
export function getAvailableProviders(
  config: ProviderSelectionConfig
): ScrapingProvider[] {
  const available: ScrapingProvider[] = [];
  if (config.jinaApiKey) available.push('jina');
  if (config.firecrawlApiKey) available.push('firecrawl');
  if (config.apifyToken) available.push('apify');
  return available;
}

/**
 * Select providers for extraction in priority order
 * Returns array of providers to try (first = primary, rest = fallbacks)
 */
export function selectProvidersForExtraction(
  type: ExtractionType,
  config: ProviderSelectionConfig
): ScrapingProvider[] {
  const available = getAvailableProviders(config);

  if (available.length === 0) {
    return [];
  }

  // Check if URL requires Apify
  if (config.url && shouldForceApify(config.url, config.forceApifyDomains)) {
    if (available.includes('apify')) {
      // Put Apify first, then others
      return ['apify', ...available.filter(p => p !== 'apify')];
    }
  }

  // Check for user preference
  if (config.preferredProvider && config.preferredProvider !== 'auto') {
    const preferred = config.preferredProvider;
    if (available.includes(preferred)) {
      // Put preferred first, then fallbacks
      const fallbacks = getDefaultFallbackOrder(type).filter(
        p => p !== preferred && available.includes(p)
      );
      return [preferred, ...fallbacks];
    }
  }

  // Use default order filtered by availability
  const defaultOrder = getDefaultFallbackOrder(type);
  return defaultOrder.filter(p => available.includes(p));
}

/**
 * Determine if we need parallel extraction (both technical + semantic)
 */
export function needsParallelExtraction(type: ExtractionType): boolean {
  return type === 'full_audit';
}

/**
 * Get the semantic provider from selected list
 */
export function getSemanticProvider(
  providers: ScrapingProvider[]
): ScrapingProvider | null {
  // Jina and Firecrawl can do semantic
  const semanticProviders: ScrapingProvider[] = ['jina', 'firecrawl'];
  return providers.find(p => semanticProviders.includes(p)) || null;
}

/**
 * Get the technical provider from selected list
 */
export function getTechnicalProvider(
  providers: ScrapingProvider[]
): ScrapingProvider | null {
  // Apify is best for technical, Firecrawl partial
  const technicalProviders: ScrapingProvider[] = ['apify', 'firecrawl'];
  return providers.find(p => technicalProviders.includes(p)) || null;
}
