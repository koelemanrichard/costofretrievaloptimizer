
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Added React import to resolve namespace error.
import { SerpResult, BusinessInfo } from '../types';
import { cacheService } from './cacheService';
import React from 'react';

const CORS_PROXY_URL = `https://corsproxy.io/?`;

const fetchWithProxy = async (url: string, options?: RequestInit): Promise<Response> => {
    const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(url)}`;
    // FIX: Increased timeout to 30 seconds to handle slow API responses.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
        const response = await fetch(proxyUrl, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('The request timed out after 30 seconds.');
        }
        throw error;
    }
};

const parseSitemapXml = (xmlText: string): { sitemapUrls: string[], pageUrls: string[] } => {
    const sitemapUrls: string[] = [];
    const pageUrls: string[] = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
        console.warn("XML parsing error:", errorNode.textContent);
        return { sitemapUrls, pageUrls };
    }

    const sitemapNodes = xmlDoc.querySelectorAll("sitemap > loc");
    sitemapNodes.forEach(node => {
        if (node.textContent) sitemapUrls.push(node.textContent);
    });

    const urlNodes = xmlDoc.querySelectorAll("url > loc");
    urlNodes.forEach(node => {
        if (node.textContent) pageUrls.push(node.textContent);
    });

    return { sitemapUrls, pageUrls };
};


const discoverSitemapUrls = async (domain: string): Promise<string[]> => {
    try {
        const response = await fetchWithProxy(`https://${domain}/robots.txt`);
        if (response.ok) {
            const text = await response.text();
            const matches = text.match(/Sitemap:\s*(.*)/gi);
            if (matches) {
                return matches.map(s => s.split(': ')[1].trim());
            }
        }
    } catch (e) {
        console.warn(`Could not fetch or parse robots.txt for ${domain}`, e);
    }

    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap_index.xml.gz', '/sitemap.xml.gz', '/post-sitemap.xml', '/page-sitemap.xml'];
    for (const path of commonPaths) {
        try {
            const sitemapUrl = `https://${domain}${path}`;
            const response = await fetchWithProxy(sitemapUrl);
            if (response.ok) {
                return [sitemapUrl];
            }
        } catch (e) {
             console.warn(`Error checking common sitemap path: ${path} for ${domain}`, e);
        }
    }

    return [];
};


export const analyzeCompetitorSitemap = async (domain: string): Promise<string[]> => {
    const fetchFn = async () => {
        const initialSitemapUrls = await discoverSitemapUrls(domain);
        if (initialSitemapUrls.length === 0) {
            throw new Error(`No sitemap found for ${domain}`);
        }

        const allPageUrls = new Set<string>();
        const sitemapsToProcess = [...initialSitemapUrls];
        const processedSitemaps = new Set<string>();

        while (sitemapsToProcess.length > 0) {
            const currentSitemapUrl = sitemapsToProcess.pop();
            if (!currentSitemapUrl || processedSitemaps.has(currentSitemapUrl)) {
                continue;
            }

            processedSitemaps.add(currentSitemapUrl);
            console.log(`Processing sitemap: ${currentSitemapUrl}`);

            try {
                const response = await fetchWithProxy(currentSitemapUrl);
                if (!response.ok) {
                    console.warn(`Failed to fetch sitemap: ${currentSitemapUrl}`);
                    continue;
                }
                const xmlText = await response.text();
                const { sitemapUrls: newSitemapUrls, pageUrls } = parseSitemapXml(xmlText);

                pageUrls.forEach(url => allPageUrls.add(url));

                newSitemapUrls.forEach(url => {
                    if (!processedSitemaps.has(url)) {
                        sitemapsToProcess.push(url);
                    }
                });

            } catch (error) {
                console.error(`Error processing sitemap ${currentSitemapUrl}:`, error);
            }
        }

        return Array.from(allPageUrls);
    };
    
    // Cache sitemap analysis for 6 hours
    return cacheService.cacheThrough('sitemap', { domain }, fetchFn, 21600);
};


export const fetchSerpResults = async (query: string, login: string, password: string, locationName: string, languageCode: string): Promise<SerpResult[]> => {
    const cacheKey = `serp:dataforseo:${JSON.stringify({ query, locationName, languageCode })}`;

    // Check cache first
    const cachedResult = await cacheService.get<SerpResult[]>(cacheKey);
    if (cachedResult !== null && cachedResult.length > 0) {
        console.log(`[CACHE HIT]: serp:dataforseo (${cachedResult.length} results)`);
        return cachedResult;
    }

    // If cache miss or cached empty results, fetch fresh data
    console.log(`[CACHE MISS or EMPTY]: serp:dataforseo`);

    const postData = [{
        keyword: query,
        location_name: locationName,
        language_code: languageCode,
        depth: 30, // Fetch more results since we filter out publications and own domain
    }];

    const url = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
    const credentials = btoa(`${login}:${password}`);

    console.log('[DataForSEO] Starting SERP request for:', { query, locationName, languageCode });
    const startTime = Date.now();

    try {
        const response = await fetchWithProxy(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        console.log(`[DataForSEO] Response received in ${Date.now() - startTime}ms, status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DataForSEO API HTTP Error: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[DataForSEO] Parsed response, status_code: ${data.status_code}, tasks: ${data.tasks?.length}`);

        if (data.status_code !== 20000) {
            throw new Error(`DataForSEO API Error: ${data.status_message}`);
        }

        const taskResult = data.tasks?.[0]?.result?.[0];
        if (!taskResult || !taskResult.items) {
            console.warn('[DataForSEO] No SERP results returned. Response structure:', {
                hasTaskResult: !!taskResult,
                hasItems: !!taskResult?.items,
                itemCount: taskResult?.items?.length,
                tasks: data.tasks?.length,
                statusMessage: data.status_message,
                fullTaskResult: taskResult // Log full result for debugging
            });
            // Don't cache empty results - allow retry on next request
            return [];
        }

        const results = taskResult.items
            .filter((item: any) => item.type === 'organic')
            .map((item: any): SerpResult => ({
                position: item.rank_absolute,
                title: item.title,
                link: item.url,
                snippet: item.description || ''
            }));

        // Only cache non-empty results for 7 days
        if (results.length > 0) {
            await cacheService.set(cacheKey, results, 604800);
            console.log(`[DataForSEO] Cached ${results.length} results`);
        } else {
            console.log('[DataForSEO] No organic results found, not caching');
        }

        return results;

    } catch (error) {
        console.error("Failed to fetch SERP data from DataForSEO:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown Error';
        if (errorMessage.includes('timed out')) {
             throw new Error(`Could not get SERP data: The request to DataForSEO timed out. This can happen with very broad queries or if their service is slow. Please try again or refine your seed keyword.`);
        }
        throw new Error(`Could not fetch SERP data. Please check your query and API credentials. [${errorMessage}]`);
    }
};

// =============================================================================
// FULL SERP DATA EXTRACTION (for Topic-Level Competitive Intelligence)
// =============================================================================

/**
 * Full SERP result with all available data from DataForSEO
 */
export interface FullSerpResult {
  // Organic results with extended data
  organicResults: {
    position: number;
    url: string;
    domain: string;
    title: string;
    snippet: string;
    breadcrumb?: string;
    rating?: { value: number; count: number };
    price?: { current: number; currency: string };
    sitelinks?: { title: string; url: string }[];
  }[];

  // SERP features detected
  features: {
    hasFeaturedSnippet: boolean;
    featuredSnippet?: {
      type: 'paragraph' | 'list' | 'table';
      content: string;
      url: string;
      domain: string;
    };
    hasPeopleAlsoAsk: boolean;
    peopleAlsoAsk: { question: string; url?: string; snippet?: string }[];
    hasImagePack: boolean;
    imagePackCount: number;
    hasVideoCarousel: boolean;
    videoCount: number;
    hasLocalPack: boolean;
    localPackCount: number;
    hasKnowledgePanel: boolean;
    knowledgePanel?: {
      title: string;
      type: string;
      description?: string;
    };
    hasSitelinks: boolean;
    hasReviews: boolean;
    hasFaq: boolean;
    faqCount: number;
    hasRelatedSearches: boolean;
    relatedSearches: string[];
  };

  // Metadata
  query: string;
  totalResults: number;
  fetchedAt: Date;
  locationName: string;
  languageCode: string;
}

/**
 * Extract full SERP data from DataForSEO response including all features
 */
export const fetchFullSerpData = async (
  query: string,
  login: string,
  password: string,
  locationName: string,
  languageCode: string
): Promise<FullSerpResult> => {
  const fetchFn = async (): Promise<FullSerpResult> => {
    const postData = [{
      keyword: query,
      location_name: locationName,
      language_code: languageCode,
      depth: 30,
    }];

    const url = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
    const credentials = btoa(`${login}:${password}`);

    const response = await fetchWithProxy(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DataForSEO API HTTP Error: ${response.status} ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json();

    if (data.status_code !== 20000) {
      throw new Error(`DataForSEO API Error: ${data.status_message}`);
    }

    const taskResult = data.tasks?.[0]?.result?.[0];
    if (!taskResult) {
      return createEmptyFullSerpResult(query, locationName, languageCode);
    }

    const items = taskResult.items || [];

    // Extract organic results
    const organicResults = items
      .filter((item: any) => item.type === 'organic')
      .map((item: any) => ({
        position: item.rank_absolute || item.rank_group,
        url: item.url,
        domain: item.domain,
        title: item.title,
        snippet: item.description || '',
        breadcrumb: item.breadcrumb,
        rating: item.rating ? {
          value: item.rating.rating_value,
          count: item.rating.votes_count
        } : undefined,
        price: item.price ? {
          current: item.price.current,
          currency: item.price.currency
        } : undefined,
        sitelinks: item.links?.map((link: any) => ({
          title: link.title,
          url: link.url
        }))
      }));

    // Extract featured snippet
    const featuredSnippetItem = items.find((item: any) => item.type === 'featured_snippet');
    const hasFeaturedSnippet = !!featuredSnippetItem;
    const featuredSnippet = featuredSnippetItem ? {
      type: detectFeaturedSnippetType(featuredSnippetItem),
      content: featuredSnippetItem.description || featuredSnippetItem.title || '',
      url: featuredSnippetItem.url || '',
      domain: featuredSnippetItem.domain || ''
    } : undefined;

    // Extract People Also Ask
    const paaItems = items.filter((item: any) => item.type === 'people_also_ask');
    const peopleAlsoAsk = paaItems.flatMap((paa: any) =>
      (paa.items || []).map((q: any) => ({
        question: q.title || q.question || '',
        url: q.url,
        snippet: q.description
      }))
    );

    // Extract image pack
    const imagePackItem = items.find((item: any) => item.type === 'images');
    const hasImagePack = !!imagePackItem;
    const imagePackCount = imagePackItem?.items?.length || 0;

    // Extract video carousel
    const videoItem = items.find((item: any) => item.type === 'video');
    const hasVideoCarousel = !!videoItem;
    const videoCount = videoItem?.items?.length || 0;

    // Extract local pack
    const localPackItem = items.find((item: any) => item.type === 'local_pack');
    const hasLocalPack = !!localPackItem;
    const localPackCount = localPackItem?.items?.length || 0;

    // Extract knowledge panel
    const knowledgePanelItem = items.find((item: any) => item.type === 'knowledge_graph');
    const hasKnowledgePanel = !!knowledgePanelItem;
    const knowledgePanel = knowledgePanelItem ? {
      title: knowledgePanelItem.title || '',
      type: knowledgePanelItem.sub_title || '',
      description: knowledgePanelItem.description
    } : undefined;

    // Check for various features
    const hasSitelinks = organicResults.some((r: any) => r.sitelinks && r.sitelinks.length > 0);
    const hasReviews = organicResults.some((r: any) => r.rating);

    // Extract FAQ
    const faqItems = items.filter((item: any) => item.type === 'faq' || item.type === 'faq_box');
    const hasFaq = faqItems.length > 0;
    const faqCount = faqItems.reduce((sum: number, faq: any) => sum + (faq.items?.length || 0), 0);

    // Extract related searches
    const relatedSearchItem = items.find((item: any) => item.type === 'related_searches');
    const hasRelatedSearches = !!relatedSearchItem;
    const relatedSearches = (relatedSearchItem?.items || []).map((r: any) => r.title || r.query || '').filter(Boolean);

    return {
      organicResults,
      features: {
        hasFeaturedSnippet,
        featuredSnippet,
        hasPeopleAlsoAsk: peopleAlsoAsk.length > 0,
        peopleAlsoAsk,
        hasImagePack,
        imagePackCount,
        hasVideoCarousel,
        videoCount,
        hasLocalPack,
        localPackCount,
        hasKnowledgePanel,
        knowledgePanel,
        hasSitelinks,
        hasReviews,
        hasFaq,
        faqCount,
        hasRelatedSearches,
        relatedSearches
      },
      query,
      totalResults: taskResult.se_results_count || 0,
      fetchedAt: new Date(),
      locationName,
      languageCode
    };
  };

  // Cache full SERP results for 7 days
  return cacheService.cacheThrough('serp:dataforseo:full', { query, locationName, languageCode }, fetchFn, 604800);
};

/**
 * Detect the type of featured snippet
 */
function detectFeaturedSnippetType(item: any): 'paragraph' | 'list' | 'table' {
  if (item.table) return 'table';
  if (item.items && Array.isArray(item.items)) return 'list';
  return 'paragraph';
}

/**
 * Create an empty full SERP result
 */
function createEmptyFullSerpResult(query: string, locationName: string, languageCode: string): FullSerpResult {
  return {
    organicResults: [],
    features: {
      hasFeaturedSnippet: false,
      hasPeopleAlsoAsk: false,
      peopleAlsoAsk: [],
      hasImagePack: false,
      imagePackCount: 0,
      hasVideoCarousel: false,
      videoCount: 0,
      hasLocalPack: false,
      localPackCount: 0,
      hasKnowledgePanel: false,
      hasSitelinks: false,
      hasReviews: false,
      hasFaq: false,
      faqCount: 0,
      hasRelatedSearches: false,
      relatedSearches: []
    },
    query,
    totalResults: 0,
    fetchedAt: new Date(),
    locationName,
    languageCode
  };
}

// =============================================================================
// COMPETITOR FILTERING (existing code)
// =============================================================================

// Generic publication/news sites that are NOT competitors
const EXCLUDED_DOMAINS = [
    'forbes.com', 'businessinsider.com', 'entrepreneur.com', 'inc.com',
    'techcrunch.com', 'wired.com', 'theverge.com', 'cnet.com', 'zdnet.com',
    'medium.com', 'wikipedia.org', 'wikihow.com', 'quora.com', 'reddit.com',
    'youtube.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
    'amazon.com', 'ebay.com', 'aliexpress.com', 'alibaba.com',
    'capterra.com', 'g2.com', 'softwareadvice.com', 'getapp.com', 'trustpilot.com',
    'gartner.com', 'forrester.com', 'nytimes.com', 'wsj.com', 'bbc.com', 'cnn.com',
    'hubspot.com', 'salesforce.com', 'blog.hubspot.com', 'zapier.com',
    'pcmag.com', 'tomsguide.com', 'techradar.com', 'makeuseof.com',
    'gov.uk', 'gov.nl', 'overheid.nl', 'rijksoverheid.nl', // Government sites
];

// Map of language codes to country TLDs for prioritization
const LANGUAGE_TO_TLDS: Record<string, string[]> = {
    'nl': ['.nl', '.be'],
    'de': ['.de', '.at', '.ch'],
    'fr': ['.fr', '.be', '.ch', '.ca'],
    'es': ['.es', '.mx', '.ar', '.co'],
    'it': ['.it'],
    'pt': ['.pt', '.br'],
    'en': ['.com', '.co.uk', '.io', '.us'],
};

// Map of language codes to locale keywords for query enhancement
const LANGUAGE_TO_LOCALE_KEYWORDS: Record<string, string> = {
    'nl': 'Nederland',
    'de': 'Deutschland',
    'fr': 'France',
    'es': 'España',
    'it': 'Italia',
    'pt': 'Portugal',
    'en': '', // English is default, no locale needed
};

/**
 * Extract domain from URL for comparison
 */
const extractDomain = (url: string): string => {
    try {
        const hostname = new URL(url).hostname;
        // Remove www. prefix
        return hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return url.toLowerCase();
    }
};

/**
 * Check if a URL belongs to an excluded domain
 */
const isExcludedDomain = (url: string): boolean => {
    const domain = extractDomain(url);
    return EXCLUDED_DOMAINS.some(excluded =>
        domain === excluded || domain.endsWith('.' + excluded)
    );
};

/**
 * Check if a URL belongs to the company's own domain
 */
const isOwnDomain = (url: string, companyDomain: string): boolean => {
    if (!companyDomain) return false;
    const urlDomain = extractDomain(url);
    const ownDomain = extractDomain(companyDomain.startsWith('http') ? companyDomain : `https://${companyDomain}`);
    return urlDomain === ownDomain || urlDomain.endsWith('.' + ownDomain);
};

/**
 * Score a result based on locale relevance
 * Higher score = more relevant to the target market
 */
const scoreLocaleRelevance = (url: string, languageCode: string): number => {
    const domain = extractDomain(url);
    const preferredTlds = LANGUAGE_TO_TLDS[languageCode] || LANGUAGE_TO_TLDS['en'];

    // Check if domain ends with a preferred TLD
    for (let i = 0; i < preferredTlds.length; i++) {
        if (domain.endsWith(preferredTlds[i])) {
            return 10 - i; // Higher score for first preference
        }
    }
    return 0;
};

/**
 * Build an enhanced search query with locale context
 * NOTE: Since DataForSEO API handles location/language targeting natively via
 * location_name and language_code parameters, we no longer add locale keywords
 * to the query. This was causing over-specification that returned fewer results.
 *
 * The locale scoring is still used for post-filtering/ranking results.
 */
const buildLocalizedQuery = (baseQuery: string, _languageCode: string, _targetMarket: string): string => {
    // Return base query unchanged - DataForSEO handles locale targeting via API params
    return baseQuery;
};

/**
 * Discover competitors with improved filtering and locale awareness
 */
export const discoverInitialCompetitors = async (
    query: string,
    info: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<SerpResult[]> => {
    // Build a locale-aware query
    const localizedQuery = buildLocalizedQuery(query, info.language, info.targetMarket);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'SERP',
        message: `Discovering competitors for query: "${localizedQuery}" (original: "${query}", locale: ${info.language}/${info.targetMarket})`,
        status: 'info',
        timestamp: Date.now()
    }});

    if (!info.dataforseoLogin || !info.dataforseoPassword) {
        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'SERP',
            message: `DataForSEO credentials not provided. Cannot discover competitors.`,
            status: 'skipped',
            timestamp: Date.now()
        }});
        return [];
    }

    // Fetch raw SERP results
    const rawResults = await fetchSerpResults(
        localizedQuery,
        info.dataforseoLogin,
        info.dataforseoPassword,
        info.targetMarket,
        info.language
    );

    // Filter and score results
    const filteredResults = rawResults
        .filter(result => {
            // Exclude publication/generic sites
            if (isExcludedDomain(result.link)) {
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'SERP',
                    message: `Filtered out publication site: ${extractDomain(result.link)}`,
                    status: 'info',
                    timestamp: Date.now()
                }});
                return false;
            }

            // Exclude own domain
            if (isOwnDomain(result.link, info.domain)) {
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'SERP',
                    message: `Filtered out own domain: ${extractDomain(result.link)}`,
                    status: 'info',
                    timestamp: Date.now()
                }});
                return false;
            }

            return true;
        })
        .map(result => ({
            ...result,
            localeScore: scoreLocaleRelevance(result.link, info.language)
        }))
        // Sort by locale relevance first, then by original position
        .sort((a, b) => {
            if (b.localeScore !== a.localeScore) {
                return b.localeScore - a.localeScore;
            }
            return a.position - b.position;
        })
        // Remove the localeScore property before returning
        .map(({ localeScore, ...result }) => result);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'SERP',
        message: `Found ${filteredResults.length} relevant competitors (filtered from ${rawResults.length} raw results)`,
        status: 'success',
        timestamp: Date.now()
    }});

    return filteredResults;
};

/**
 * Fetch search volume data from DataForSEO Keywords API
 * Used for Query Priority ordering in content generation
 */
export const fetchKeywordSearchVolume = async (
  keywords: string[],
  login: string,
  password: string,
  locationCode: string = '2840', // US default
  languageCode: string = 'en'
): Promise<Map<string, number>> => {
  const fetchFn = async () => {
    const postData = [{
      keywords: keywords.slice(0, 100), // API limit
      location_code: parseInt(locationCode) || 2840,
      language_code: languageCode,
    }];

    const url = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';
    const credentials = btoa(`${login}:${password}`);

    try {
      const response = await fetchWithProxy(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error(`DataForSEO Keywords API HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status_code !== 20000) {
        throw new Error(`DataForSEO Keywords API Error: ${data.status_message}`);
      }

      const result = new Map<string, number>();
      const items = data.tasks?.[0]?.result || [];

      for (const item of items) {
        if (item.keyword && item.search_volume !== undefined) {
          result.set(item.keyword.toLowerCase(), item.search_volume);
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to fetch keyword search volume:", error);
      return new Map();
    }
  };

  const cacheKey = keywords.slice(0, 5).join(',');
  return cacheService.cacheThrough('keywords:volume', { cacheKey }, fetchFn, 86400); // Cache 24h
};
