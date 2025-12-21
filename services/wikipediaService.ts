// services/wikipediaService.ts
// Wikipedia API service for entity verification and content extraction

import type { WikipediaEntityResult } from '../types';

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';

interface WikipediaSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  wordcount: number;
  size: number;
  timestamp: string;
}

interface WikipediaPageInfo {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  categories?: { title: string }[];
  links?: { title: string }[];
  pageprops?: {
    wikibase_item?: string; // Wikidata ID
  };
}

interface WikipediaQueryResponse {
  query?: {
    search?: WikipediaSearchResult[];
    pages?: Record<string, WikipediaPageInfo>;
  };
  continue?: Record<string, string>;
}

/**
 * Search Wikipedia for articles matching a query
 */
export async function searchWikipedia(
  query: string,
  limit: number = 10,
  language: string = 'en'
): Promise<WikipediaSearchResult[]> {
  const apiUrl = language === 'en'
    ? WIKIPEDIA_API_BASE
    : `https://${language}.wikipedia.org/w/api.php`;

  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: limit.toString(),
    srprop: 'snippet|wordcount|size|timestamp',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) {
      console.error('[WikipediaService] Search failed:', response.statusText);
      return [];
    }

    const data: WikipediaQueryResponse = await response.json();
    return data.query?.search || [];
  } catch (error) {
    console.error('[WikipediaService] Search error:', error);
    return [];
  }
}

/**
 * Get detailed information about a Wikipedia page by title
 */
export async function getWikipediaPage(
  title: string,
  language: string = 'en'
): Promise<WikipediaPageInfo | null> {
  const apiUrl = language === 'en'
    ? WIKIPEDIA_API_BASE
    : `https://${language}.wikipedia.org/w/api.php`;

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts|info|categories|links|pageprops',
    exintro: 'true',
    explaintext: 'true',
    exsentences: '5',
    inprop: 'url',
    cllimit: '20',
    pllimit: '50',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) {
      console.error('[WikipediaService] Get page failed:', response.statusText);
      return null;
    }

    const data: WikipediaQueryResponse = await response.json();
    const pages = data.query?.pages;

    if (!pages) return null;

    // Get the first (and only) page from results
    const pageId = Object.keys(pages)[0];

    // Check if page exists (-1 = not found)
    if (pageId === '-1') {
      console.log(`[WikipediaService] Page not found: "${title}"`);
      return null;
    }

    return pages[pageId];
  } catch (error) {
    console.error('[WikipediaService] Get page error:', error);
    return null;
  }
}

/**
 * Get Wikipedia page by page ID
 */
export async function getWikipediaPageById(
  pageId: number,
  language: string = 'en'
): Promise<WikipediaPageInfo | null> {
  const apiUrl = language === 'en'
    ? WIKIPEDIA_API_BASE
    : `https://${language}.wikipedia.org/w/api.php`;

  const params = new URLSearchParams({
    action: 'query',
    pageids: pageId.toString(),
    prop: 'extracts|info|categories|links|pageprops',
    exintro: 'true',
    explaintext: 'true',
    exsentences: '5',
    inprop: 'url',
    cllimit: '20',
    pllimit: '50',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) {
      return null;
    }

    const data: WikipediaQueryResponse = await response.json();
    const pages = data.query?.pages;

    if (!pages) return null;

    return pages[pageId.toString()] || null;
  } catch (error) {
    console.error('[WikipediaService] Get page by ID error:', error);
    return null;
  }
}

/**
 * Get categories for a Wikipedia page
 */
export async function getWikipediaCategories(
  title: string,
  language: string = 'en'
): Promise<string[]> {
  const apiUrl = language === 'en'
    ? WIKIPEDIA_API_BASE
    : `https://${language}.wikipedia.org/w/api.php`;

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'categories',
    cllimit: '50',
    clshow: '!hidden', // Exclude hidden categories
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) return [];

    const data: WikipediaQueryResponse = await response.json();
    const pages = data.query?.pages;

    if (!pages) return [];

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return [];

    const categories = pages[pageId].categories || [];
    return categories.map(c => c.title.replace('Category:', ''));
  } catch (error) {
    console.error('[WikipediaService] Get categories error:', error);
    return [];
  }
}

/**
 * Get links from a Wikipedia page (internal wiki links)
 */
export async function getWikipediaLinks(
  title: string,
  language: string = 'en'
): Promise<string[]> {
  const apiUrl = language === 'en'
    ? WIKIPEDIA_API_BASE
    : `https://${language}.wikipedia.org/w/api.php`;

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'links',
    pllimit: '100',
    plnamespace: '0', // Main namespace only
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) return [];

    const data: WikipediaQueryResponse = await response.json();
    const pages = data.query?.pages;

    if (!pages) return [];

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return [];

    const links = pages[pageId].links || [];
    return links.map(l => l.title);
  } catch (error) {
    console.error('[WikipediaService] Get links error:', error);
    return [];
  }
}

/**
 * Verify if an entity exists on Wikipedia and get basic info
 * Returns our WikipediaEntityResult type
 */
export async function verifyEntity(
  entityName: string,
  context?: string,
  language: string = 'en'
): Promise<WikipediaEntityResult> {
  // First, search for the entity
  const searchResults = await searchWikipedia(entityName, 5, language);

  if (!searchResults.length) {
    return {
      found: false
    };
  }

  // Score results based on title match and context
  const scoredResults = searchResults.map(result => {
    let score = 0;

    // Exact title match gets high score
    if (result.title.toLowerCase() === entityName.toLowerCase()) {
      score += 100;
    } else if (result.title.toLowerCase().includes(entityName.toLowerCase())) {
      score += 50;
    }

    // Check context in snippet
    if (context && result.snippet) {
      const snippetLower = result.snippet.toLowerCase();
      const contextWords = context.toLowerCase().split(/\s+/);
      const matchingWords = contextWords.filter(w =>
        w.length > 3 && snippetLower.includes(w)
      );
      score += matchingWords.length * 10;
    }

    // Favor longer articles (more likely to be notable)
    if (result.wordcount > 5000) score += 20;
    else if (result.wordcount > 2000) score += 10;
    else if (result.wordcount > 500) score += 5;

    return { result, score };
  });

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  // Get the best match
  const bestMatch = scoredResults[0].result;

  // Fetch full page data
  const pageData = await getWikipediaPageById(bestMatch.pageid, language);

  if (!pageData) {
    return {
      found: false
    };
  }

  // Get categories for related entities context
  const categories = await getWikipediaCategories(pageData.title, language);

  // Get links as related entities
  const links = await getWikipediaLinks(pageData.title, language);

  // Select most relevant related entities (first 10 links)
  const relatedEntities = links.slice(0, 10);

  return {
    found: true,
    title: pageData.title,
    extract: pageData.extract,
    pageUrl: pageData.fullurl,
    wikidataId: pageData.pageprops?.wikibase_item,
    categories,
    relatedEntities
  };
}

/**
 * Get Wikipedia article summary for an entity
 */
export async function getEntitySummary(
  entityName: string,
  language: string = 'en'
): Promise<string | null> {
  const pageData = await getWikipediaPage(entityName, language);
  return pageData?.extract || null;
}

/**
 * Check if two entities are related on Wikipedia
 * (i.e., one links to the other)
 */
export async function areEntitiesRelated(
  entity1: string,
  entity2: string,
  language: string = 'en'
): Promise<boolean> {
  const links1 = await getWikipediaLinks(entity1, language);
  const links2 = await getWikipediaLinks(entity2, language);

  const entity1Lower = entity1.toLowerCase();
  const entity2Lower = entity2.toLowerCase();

  // Check if entity1 links to entity2
  const link1To2 = links1.some(l => l.toLowerCase() === entity2Lower);
  // Check if entity2 links to entity1
  const link2To1 = links2.some(l => l.toLowerCase() === entity1Lower);

  return link1To2 || link2To1;
}

/**
 * Get disambiguation options for an ambiguous entity name
 */
export async function getDisambiguationOptions(
  entityName: string,
  language: string = 'en'
): Promise<Array<{ title: string; description: string }>> {
  const searchResults = await searchWikipedia(`${entityName} (disambiguation)`, 1, language);

  if (!searchResults.length) {
    // No disambiguation page, return regular search results
    const regularResults = await searchWikipedia(entityName, 5, language);
    return regularResults.map(r => ({
      title: r.title,
      description: r.snippet.replace(/<[^>]*>/g, '') // Strip HTML tags
    }));
  }

  // Get links from disambiguation page
  const disambigTitle = searchResults[0].title;
  const links = await getWikipediaLinks(disambigTitle, language);

  // Get summaries for each option
  const options: Array<{ title: string; description: string }> = [];

  for (const link of links.slice(0, 10)) { // Limit to 10 options
    const page = await getWikipediaPage(link, language);
    if (page?.extract) {
      options.push({
        title: page.title,
        description: page.extract.substring(0, 200) + '...'
      });
    }
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return options;
}

/**
 * Get co-occurring entities (entities that appear in the same Wikipedia categories)
 */
export async function getCoOccurringEntities(
  entityName: string,
  limit: number = 20,
  language: string = 'en'
): Promise<string[]> {
  const categories = await getWikipediaCategories(entityName, language);

  if (!categories.length) return [];

  // Pick the most specific category (usually has fewest members)
  const categoryToQuery = categories.find(c =>
    !c.toLowerCase().includes('article') &&
    !c.toLowerCase().includes('pages') &&
    !c.toLowerCase().includes('wikipedia')
  ) || categories[0];

  const apiUrl = language === 'en'
    ? WIKIPEDIA_API_BASE
    : `https://${language}.wikipedia.org/w/api.php`;

  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${categoryToQuery}`,
    cmlimit: limit.toString(),
    cmnamespace: '0', // Main namespace only
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) return [];

    const data = await response.json();
    const members = data.query?.categorymembers || [];

    // Filter out the original entity
    return members
      .map((m: { title: string }) => m.title)
      .filter((title: string) => title.toLowerCase() !== entityName.toLowerCase());
  } catch (error) {
    console.error('[WikipediaService] Get co-occurring entities error:', error);
    return [];
  }
}

/**
 * Batch verify multiple entities
 */
export async function batchVerifyEntities(
  entities: Array<{ name: string; context?: string }>,
  language: string = 'en',
  delayMs: number = 200
): Promise<Map<string, WikipediaEntityResult>> {
  const results = new Map<string, WikipediaEntityResult>();

  for (const entity of entities) {
    const result = await verifyEntity(entity.name, entity.context, language);
    results.set(entity.name, result);

    // Rate limiting
    if (entities.indexOf(entity) < entities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
