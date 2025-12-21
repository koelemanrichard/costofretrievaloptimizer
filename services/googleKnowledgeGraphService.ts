// services/googleKnowledgeGraphService.ts
// Google Knowledge Graph Search API service for entity recognition and authority validation

import type { KnowledgeGraphEntityResult, EntityAuthorityResult, WikipediaEntityResult, WikidataEntityResult } from '../types';
import { verifyEntity as verifyWikipediaEntity } from './wikipediaService';
import { resolveEntity as resolveWikidataEntity } from './wikidataService';

const KNOWLEDGE_GRAPH_API_URL = 'https://kgsearch.googleapis.com/v1/entities:search';

interface KGSearchResponse {
  '@type': string;
  itemListElement?: Array<{
    '@type': string;
    result: KGEntity;
    resultScore: number;
  }>;
}

interface KGEntity {
  '@id': string;
  '@type': string | string[];
  name: string;
  description?: string;
  detailedDescription?: {
    articleBody: string;
    url: string;
    license: string;
  };
  image?: {
    url: string;
    contentUrl: string;
  };
  url?: string;
}

/**
 * Search the Google Knowledge Graph for entities
 */
export async function searchKnowledgeGraph(
  query: string,
  apiKey: string,
  types?: string[],
  limit: number = 10,
  language: string = 'en'
): Promise<KnowledgeGraphEntityResult[]> {
  if (!apiKey) {
    console.warn('[KnowledgeGraphService] No API key provided');
    return [];
  }

  const params = new URLSearchParams({
    key: apiKey,
    query: query,
    limit: limit.toString(),
    languages: language,
    indent: 'false'
  });

  // Add type constraints if specified
  if (types?.length) {
    types.forEach(type => params.append('types', type));
  }

  try {
    const response = await fetch(`${KNOWLEDGE_GRAPH_API_URL}?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[KnowledgeGraphService] Search failed:', response.status, errorText);
      return [];
    }

    const data: KGSearchResponse = await response.json();

    if (!data.itemListElement?.length) {
      return [];
    }

    return data.itemListElement.map(item => {
      const entity = item.result;
      const types = Array.isArray(entity['@type'])
        ? entity['@type']
        : [entity['@type']];

      return {
        id: entity['@id'] || '',
        name: entity.name,
        type: types.filter(t => t !== 'Thing'), // Filter out generic 'Thing' type
        description: entity.description,
        detailedDescription: entity.detailedDescription,
        image: entity.image,
        url: entity.url,
        resultScore: item.resultScore
      };
    });
  } catch (error) {
    console.error('[KnowledgeGraphService] Search error:', error);
    return [];
  }
}

/**
 * Get the best matching entity from Knowledge Graph
 */
export async function getKnowledgeGraphEntity(
  entityName: string,
  apiKey: string,
  context?: string,
  types?: string[],
  language: string = 'en'
): Promise<KnowledgeGraphEntityResult | null> {
  const results = await searchKnowledgeGraph(entityName, apiKey, types, 10, language);

  if (!results.length) {
    return null;
  }

  // Score results based on name match and context
  const scoredResults = results.map(result => {
    let score = result.resultScore * 100; // Base score from Google

    // Exact name match bonus
    if (result.name.toLowerCase() === entityName.toLowerCase()) {
      score += 500;
    } else if (result.name.toLowerCase().includes(entityName.toLowerCase())) {
      score += 200;
    }

    // Context matching in description
    if (context && result.description) {
      const descLower = result.description.toLowerCase();
      const contextWords = context.toLowerCase().split(/\s+/);
      const matchingWords = contextWords.filter(w =>
        w.length > 3 && descLower.includes(w)
      );
      score += matchingWords.length * 50;
    }

    // Bonus for having detailed description (more notable entities)
    if (result.detailedDescription) {
      score += 100;
    }

    // Bonus for having an image
    if (result.image) {
      score += 50;
    }

    return { result, score };
  });

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults[0].result;
}

/**
 * Verify entity identity across Wikipedia, Wikidata, and Google Knowledge Graph
 * This provides comprehensive E-A-T (Expertise, Authority, Trust) signals
 */
export async function validateEntityAuthority(
  entityName: string,
  domain?: string,
  googleApiKey?: string,
  language: string = 'en'
): Promise<EntityAuthorityResult> {
  const results: EntityAuthorityResult = {
    entityName,
    wikipedia: null,
    wikidata: null,
    knowledgeGraph: null,
    authorityScore: 0,
    verificationStatus: 'unverified',
    recommendations: []
  };

  // Run all verifications in parallel
  const [wikipediaResult, wikidataResult, kgResult] = await Promise.allSettled([
    verifyWikipediaEntity(entityName, domain, language),
    resolveWikidataEntity(entityName, domain || '', undefined, language),
    googleApiKey
      ? getKnowledgeGraphEntity(entityName, googleApiKey, domain, undefined, language)
      : Promise.resolve(null)
  ]);

  // Process Wikipedia result
  if (wikipediaResult.status === 'fulfilled' && wikipediaResult.value?.found) {
    results.wikipedia = wikipediaResult.value;
  }

  // Process Wikidata result
  if (wikidataResult.status === 'fulfilled' && wikidataResult.value) {
    const wdResult = wikidataResult.value;
    results.wikidata = {
      id: wdResult.wikidataId || '',
      label: wdResult.name,
      description: wdResult.description,
      sitelinks: wdResult.sameAs
        ? { wikipedia: wdResult.wikipediaUrl || '' }
        : undefined
    };
  }

  // Process Knowledge Graph result
  if (kgResult.status === 'fulfilled' && kgResult.value) {
    results.knowledgeGraph = kgResult.value;
  }

  // Calculate authority score (0-100)
  let score = 0;
  let verifiedCount = 0;

  if (results.wikipedia?.found) {
    score += 35;
    verifiedCount++;

    // Bonus for having Wikidata ID in Wikipedia
    if (results.wikipedia.wikidataId) {
      score += 5;
    }

    // Bonus for having categories
    if (results.wikipedia.categories?.length) {
      score += Math.min(10, results.wikipedia.categories.length);
    }
  }

  if (results.wikidata) {
    score += 30;
    verifiedCount++;

    // Bonus for having sameAs links
    const sameAsCount = Object.keys(results.wikidata.sitelinks || {}).length;
    score += Math.min(10, sameAsCount * 2);
  }

  if (results.knowledgeGraph) {
    score += 25;
    verifiedCount++;

    // Bonus for high result score
    if (results.knowledgeGraph.resultScore > 100) {
      score += 10;
    }

    // Bonus for detailed description
    if (results.knowledgeGraph.detailedDescription) {
      score += 5;
    }
  }

  results.authorityScore = Math.min(100, score);

  // Determine verification status
  if (verifiedCount >= 2) {
    results.verificationStatus = 'verified';
  } else if (verifiedCount === 1) {
    results.verificationStatus = 'partial';
  } else {
    results.verificationStatus = 'unverified';
  }

  // Generate recommendations
  if (!results.wikipedia?.found) {
    results.recommendations.push(
      'Entity not found on Wikipedia. Consider creating a Wikipedia page if notable, or using alternative entity names.'
    );
  }

  if (!results.wikidata) {
    results.recommendations.push(
      'Entity not found on Wikidata. Creating a Wikidata entry helps search engines understand entity identity.'
    );
  }

  if (!results.knowledgeGraph && googleApiKey) {
    results.recommendations.push(
      'Entity not recognized by Google Knowledge Graph. Focus on building entity recognition through structured data and authoritative mentions.'
    );
  }

  if (results.verificationStatus === 'verified' && results.authorityScore < 60) {
    results.recommendations.push(
      'Entity is verified but authority score is low. Strengthen presence by adding more sameAs links and detailed descriptions.'
    );
  }

  if (results.verificationStatus === 'verified' && results.authorityScore >= 80) {
    results.recommendations.push(
      'Strong entity authority established. Use this entity prominently in schema markup and ensure consistent naming across all properties.'
    );
  }

  return results;
}

/**
 * Batch validate multiple entities for authority
 */
export async function batchValidateAuthority(
  entities: Array<{ name: string; context?: string }>,
  googleApiKey?: string,
  language: string = 'en',
  delayMs: number = 300
): Promise<Map<string, EntityAuthorityResult>> {
  const results = new Map<string, EntityAuthorityResult>();

  for (const entity of entities) {
    const result = await validateEntityAuthority(
      entity.name,
      entity.context,
      googleApiKey,
      language
    );
    results.set(entity.name, result);

    // Rate limiting
    if (entities.indexOf(entity) < entities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Get entity types recognized by Knowledge Graph
 */
export function getKnowledgeGraphTypes(): Record<string, string> {
  return {
    // People
    'Person': 'Individual people',
    // Organizations
    'Organization': 'Companies, non-profits, etc.',
    'Corporation': 'Business corporations',
    'EducationalOrganization': 'Schools, universities',
    'GovernmentOrganization': 'Government bodies',
    'LocalBusiness': 'Local businesses',
    // Places
    'Place': 'Geographic locations',
    'City': 'Cities',
    'Country': 'Countries',
    'AdministrativeArea': 'States, provinces',
    'Landmark': 'Famous landmarks',
    // Creative Works
    'Book': 'Books and publications',
    'Movie': 'Films',
    'MusicAlbum': 'Music albums',
    'TVSeries': 'Television shows',
    // Other
    'Event': 'Events and happenings',
    'Product': 'Products and goods',
    'SportsTeam': 'Sports teams'
  };
}

/**
 * Check if Google Knowledge Graph API key is valid
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;

  try {
    // Try a simple search to validate the key
    const results = await searchKnowledgeGraph('test', apiKey, undefined, 1);
    return true; // If we get here without error, key is valid
  } catch (error) {
    return false;
  }
}

/**
 * Get entity disambiguation options from Knowledge Graph
 */
export async function getDisambiguationOptions(
  entityName: string,
  apiKey: string,
  language: string = 'en'
): Promise<Array<{ name: string; type: string; description: string; score: number }>> {
  const results = await searchKnowledgeGraph(entityName, apiKey, undefined, 10, language);

  return results.map(result => ({
    name: result.name,
    type: result.type[0] || 'Thing',
    description: result.description || '',
    score: result.resultScore
  }));
}

/**
 * Extract structured sameAs URLs from Knowledge Graph result
 */
export function extractSameAsUrls(kgResult: KnowledgeGraphEntityResult): string[] {
  const sameAs: string[] = [];

  // Add the main URL if present
  if (kgResult.url) {
    sameAs.push(kgResult.url);
  }

  // Add detailed description URL (usually Wikipedia)
  if (kgResult.detailedDescription?.url) {
    sameAs.push(kgResult.detailedDescription.url);
  }

  // Extract Freebase ID from the @id (legacy, but still useful)
  if (kgResult.id && kgResult.id.startsWith('kg:')) {
    // Google KG IDs are in format kg:/m/xxxxx
    sameAs.push(`https://www.google.com/search?kgmid=${kgResult.id.replace('kg:', '')}`);
  }

  return sameAs;
}
