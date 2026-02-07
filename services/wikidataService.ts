// services/wikidataService.ts
// Wikidata API service for entity resolution in schema generation

import type {
  ResolvedEntity,
  SchemaEntityType,
  EntityCandidate
} from '../types';
import { sanitizeTextInput } from '../utils/inputValidation';

// Wikidata API endpoints
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

// Wikidata property IDs for common properties
const WIKIDATA_PROPERTIES = {
  instanceOf: 'P31',
  image: 'P18',
  officialWebsite: 'P856',
  twitter: 'P2002',
  facebook: 'P2013',
  instagram: 'P2003',
  linkedIn: 'P6634',
  orcid: 'P496',
  dateOfBirth: 'P569',
  placeOfBirth: 'P19',
  occupation: 'P106',
  employer: 'P108',
  founder: 'P112',
  ceo: 'P169',
  headquarters: 'P159',
  foundingDate: 'P571',
  numberOfEmployees: 'P1128',
  industry: 'P452',
  country: 'P17',
  coordinates: 'P625',
  description: 'schema:description'
} as const;

// Entity type mapping from Wikidata to our types
const WIKIDATA_TYPE_MAPPING: Record<string, SchemaEntityType> = {
  'Q5': 'Person',           // human
  'Q43229': 'Organization', // organization
  'Q4830453': 'Organization', // business
  'Q6881511': 'Organization', // enterprise
  'Q783794': 'Organization',  // company
  'Q618779': 'Place',       // geographic location
  'Q515': 'Place',          // city
  'Q6256': 'Place',         // country
  'Q3914': 'Thing',         // school
  'Q7889': 'CreativeWork',  // video game
  'Q11424': 'CreativeWork', // film
  'Q7725634': 'CreativeWork', // literary work
  'Q1656682': 'Event',      // event
  'Q26907166': 'Event',     // recurring event
};

// Wikidata search result
interface WikidataSearchResult {
  id: string;
  label: string;
  description: string;
  concepturi: string;
  match: {
    type: string;
    language: string;
    text: string;
  };
}

// Wikidata entity data
interface WikidataEntity {
  id: string;
  labels: Record<string, { language: string; value: string }>;
  descriptions: Record<string, { language: string; value: string }>;
  claims: Record<string, WikidataClaim[]>;
  sitelinks: Record<string, { site: string; title: string; url?: string }>;
}

interface WikidataClaim {
  mainsnak: {
    snaktype: string;
    property: string;
    datavalue?: {
      value: any;
      type: string;
    };
  };
  rank: string;
}

/**
 * Search for entities in Wikidata
 */
export async function searchWikidata(
  query: string,
  type?: SchemaEntityType,
  language: string = 'en',
  limit: number = 5
): Promise<WikidataSearchResult[]> {
  // Sanitize external entity name input before sending to Wikidata API
  query = sanitizeTextInput(query, 300);

  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language,
    limit: limit.toString(),
    format: 'json',
    origin: '*'
  });

  // Add type constraint if specified
  if (type) {
    params.set('type', 'item');
  }

  try {
    const response = await fetch(`${WIKIDATA_API}?${params}`);

    if (!response.ok) {
      console.error('[WikidataService] Search failed:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.search || [];
  } catch (error) {
    console.error('[WikidataService] Search error:', error);
    return [];
  }
}

/**
 * Get detailed entity data from Wikidata
 */
export async function getWikidataEntity(
  wikidataId: string,
  language: string = 'en'
): Promise<WikidataEntity | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: wikidataId,
    languages: language,
    props: 'labels|descriptions|claims|sitelinks',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIDATA_API}?${params}`);

    if (!response.ok) {
      console.error('[WikidataService] Get entity failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.entities?.[wikidataId] || null;
  } catch (error) {
    console.error('[WikidataService] Get entity error:', error);
    return null;
  }
}

/**
 * Determine entity type from Wikidata claims
 */
function determineEntityType(entity: WikidataEntity): SchemaEntityType {
  const instanceOfClaims = entity.claims[WIKIDATA_PROPERTIES.instanceOf] || [];

  for (const claim of instanceOfClaims) {
    const typeId = claim.mainsnak?.datavalue?.value?.id;
    if (typeId && WIKIDATA_TYPE_MAPPING[typeId]) {
      return WIKIDATA_TYPE_MAPPING[typeId];
    }
  }

  // Default to Thing if type can't be determined
  return 'Thing';
}

/**
 * Extract sameAs URLs from Wikidata entity
 */
function extractSameAsUrls(entity: WikidataEntity): string[] {
  const sameAs: string[] = [];

  // Add Wikidata URL
  sameAs.push(`https://www.wikidata.org/wiki/${entity.id}`);

  // Add Wikipedia URL if available
  const enWiki = entity.sitelinks?.enwiki;
  if (enWiki) {
    const wikiTitle = encodeURIComponent(enWiki.title.replace(/ /g, '_'));
    sameAs.push(`https://en.wikipedia.org/wiki/${wikiTitle}`);
  }

  // Extract social media URLs from claims
  const socialProperties = [
    WIKIDATA_PROPERTIES.officialWebsite,
    WIKIDATA_PROPERTIES.twitter,
    WIKIDATA_PROPERTIES.facebook,
    WIKIDATA_PROPERTIES.instagram,
    WIKIDATA_PROPERTIES.linkedIn
  ];

  for (const prop of socialProperties) {
    const claims = entity.claims[prop] || [];
    for (const claim of claims) {
      const value = claim.mainsnak?.datavalue?.value;
      if (value) {
        if (prop === WIKIDATA_PROPERTIES.officialWebsite) {
          sameAs.push(value);
        } else if (prop === WIKIDATA_PROPERTIES.twitter) {
          sameAs.push(`https://twitter.com/${value}`);
        } else if (prop === WIKIDATA_PROPERTIES.facebook) {
          sameAs.push(`https://www.facebook.com/${value}`);
        } else if (prop === WIKIDATA_PROPERTIES.instagram) {
          sameAs.push(`https://www.instagram.com/${value}`);
        } else if (prop === WIKIDATA_PROPERTIES.linkedIn) {
          sameAs.push(`https://www.linkedin.com/in/${value}`);
        }
      }
    }
  }

  return sameAs;
}

/**
 * Extract additional properties from Wikidata entity
 */
function extractProperties(entity: WikidataEntity): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  // Helper to get claim value
  const getClaimValue = (prop: string): any => {
    const claims = entity.claims[prop];
    if (!claims?.length) return undefined;
    return claims[0].mainsnak?.datavalue?.value;
  };

  // Helper to get date value
  const getDateValue = (prop: string): string | undefined => {
    const value = getClaimValue(prop);
    if (value?.time) {
      // Wikidata dates start with +, e.g., "+1976-02-24T00:00:00Z"
      return value.time.replace(/^\+/, '').split('T')[0];
    }
    return undefined;
  };

  // Common properties
  const dateOfBirth = getDateValue(WIKIDATA_PROPERTIES.dateOfBirth);
  if (dateOfBirth) properties.birthDate = dateOfBirth;

  const foundingDate = getDateValue(WIKIDATA_PROPERTIES.foundingDate);
  if (foundingDate) properties.foundingDate = foundingDate;

  const employees = getClaimValue(WIKIDATA_PROPERTIES.numberOfEmployees);
  if (employees?.amount) {
    properties.numberOfEmployees = parseInt(employees.amount.replace('+', ''));
  }

  // Image
  const image = getClaimValue(WIKIDATA_PROPERTIES.image);
  if (image) {
    const filename = encodeURIComponent(image.replace(/ /g, '_'));
    properties.image = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`;
  }

  // ORCID for persons
  const orcid = getClaimValue(WIKIDATA_PROPERTIES.orcid);
  if (orcid) {
    properties.sameAs = properties.sameAs || [];
    (properties.sameAs as string[]).push(`https://orcid.org/${orcid}`);
  }

  return properties;
}

/**
 * Fallback entity resolution using schema.org type inference from name patterns.
 * Used when Wikidata lookup fails (network error, no results, no valid matches).
 * Returns a ResolvedEntity with lower confidence (0.6) and source 'pattern_inference'.
 */
export function fallbackEntityResolution(
  entityName: string,
  entityType?: SchemaEntityType
): ResolvedEntity {
  let inferredType: SchemaEntityType = entityType || 'Thing';

  // Only infer type if not explicitly provided
  if (!entityType) {
    // Organization patterns: Inc, LLC, Ltd, Corp, Company, GmbH, etc.
    if (
      /\b(inc\.?|llc|ltd\.?|corp\.?|company|gmbh|plc|co\.|incorporated|corporation|limited|group|holdings)\b/i.test(entityName)
    ) {
      inferredType = 'Organization';
    }
    // EducationalOrganization patterns
    else if (
      /\b(university|college|school|academy|institute of technology|polytechnic)\b/i.test(entityName)
    ) {
      inferredType = 'Organization'; // schema:EducationalOrganization maps to Organization in our type system
    }
    // MedicalOrganization patterns
    else if (
      /\b(hospital|clinic|medical|healthcare|health center|health centre|pharmacy)\b/i.test(entityName)
    ) {
      inferredType = 'Organization'; // schema:MedicalOrganization maps to Organization in our type system
    }
    // Person patterns: likely "First Last" or "Title First Last"
    else if (
      /^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|sir|dame)\s+\w/i.test(entityName) ||
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(entityName.trim()) ||
      /^[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+$/.test(entityName.trim())
    ) {
      inferredType = 'Person';
    }
    // Place patterns: city, country, geographic indicators
    else if (
      /\b(city|county|country|state|province|republic|kingdom|island|mountain|river|lake|ocean|valley|district|territory|peninsula)\b/i.test(entityName)
    ) {
      inferredType = 'Place';
    }
    // Event patterns
    else if (
      /\b(conference|festival|summit|expo|exhibition|championship|olympics|ceremony|congress|symposium)\b/i.test(entityName)
    ) {
      inferredType = 'Event';
    }
    // CreativeWork patterns
    else if (
      /\b(book|journal|magazine|newspaper|film|movie|album|series|guide|handbook|manual|encyclopedia)\b/i.test(entityName)
    ) {
      inferredType = 'CreativeWork';
    }
    // Default remains 'Thing'
  }

  // Determine a more specific schema.org description based on inferred type
  const typeDescriptions: Record<SchemaEntityType, string> = {
    'Organization': 'Organization (inferred from name pattern)',
    'Person': 'Person (inferred from name pattern)',
    'Place': 'Place (inferred from name pattern)',
    'Event': 'Event (inferred from name pattern)',
    'CreativeWork': 'Creative work (inferred from name pattern)',
    'Thing': 'Entity (type inferred by pattern matching)'
  };

  console.log(
    `[WikidataService] Fallback resolution for "${entityName}" -> type: ${inferredType} (pattern_inference, confidence: 0.6)`
  );

  return {
    name: entityName,
    type: inferredType,
    wikidataId: undefined,
    wikipediaUrl: undefined,
    sameAs: [],
    description: typeDescriptions[inferredType],
    properties: {},
    confidenceScore: 0.6,
    source: 'pattern_inference',
    lastVerifiedAt: new Date().toISOString()
  };
}

/**
 * Resolve a single entity to Wikidata.
 * Falls back to pattern-based inference when Wikidata lookup fails.
 */
export async function resolveEntity(
  name: string,
  context: string,
  type?: SchemaEntityType,
  language: string = 'en'
): Promise<ResolvedEntity | null> {
  // Guard against undefined inputs
  if (!name) return null;
  // Sanitize external entity name input
  name = sanitizeTextInput(name, 300);
  const safeContext = context || '';

  try {
    // Search for the entity
    const searchResults = await searchWikidata(name, type, language, 5);

    if (!searchResults.length) {
      console.log(`[WikidataService] No Wikidata results for "${name}", using fallback resolution`);
      return fallbackEntityResolution(name, type);
    }

    // Score results based on context and type, with context-aware validation
    const scoredResults = searchResults.map(result => {
      let score = 0;

      // Exact match bonus
      if (result.label.toLowerCase() === name.toLowerCase()) {
        score += 10;
      }

      // Description contains context words
      if (result.description) {
        const descWords = result.description.toLowerCase().split(/\s+/);
        const contextWords = safeContext.toLowerCase().split(/\s+/);
        const matches = contextWords.filter(w => descWords.includes(w)).length;
        score += matches * 2;

        // CONTEXT-AWARE VALIDATION: Penalize clearly wrong entity types
        // These are entity types that should never match technical/domain content
        const wrongTypeIndicators = [
          'family name', 'surname', 'given name', 'first name',
          'disambiguation', 'wikimedia', 'taxon', 'species',
          'gene', 'protein', 'chemical compound', 'mineral',
          'fictional character', 'mythological', 'album',
          'single', 'song', 'music video', 'television episode'
        ];

        const descLower = result.description.toLowerCase();
        for (const indicator of wrongTypeIndicators) {
          if (descLower.includes(indicator)) {
            // Heavy penalty for wrong type matches
            score -= 20;
            console.log(`[WikidataService] Penalizing "${result.label}" - wrong type: "${indicator}"`);
            break;
          }
        }

        // Bonus for domain-relevant descriptions
        const domainIndicators = [
          'construction', 'building', 'architecture', 'engineering',
          'roofing', 'plumbing', 'electrical', 'hvac', 'insulation',
          'material', 'technique', 'method', 'process', 'tool',
          'professional', 'industry', 'trade', 'craft'
        ];

        for (const indicator of domainIndicators) {
          if (descLower.includes(indicator)) {
            score += 5;
            break;
          }
        }
      }

      return { result, score };
    });

    // Sort by score
    scoredResults.sort((a, b) => b.score - a.score);

    // Skip results with negative scores (clearly wrong matches)
    const validResults = scoredResults.filter(r => r.score > 0);
    if (!validResults.length) {
      console.log(`[WikidataService] No valid Wikidata matches for "${name}" after context validation, using fallback`);
      return fallbackEntityResolution(name, type);
    }

    // Get the best match
    const bestMatch = validResults[0].result;

    // Fetch full entity data
    const entityData = await getWikidataEntity(bestMatch.id, language);

    if (!entityData) {
      console.log(`[WikidataService] Could not fetch entity data for ${bestMatch.id}, using fallback`);
      return fallbackEntityResolution(name, type);
    }

    // Determine type
    const resolvedType = type || determineEntityType(entityData);

    // Extract sameAs URLs
    const sameAs = extractSameAsUrls(entityData);

    // Extract additional properties
    const properties = extractProperties(entityData);

    // Get Wikipedia URL
    const enWiki = entityData.sitelinks?.enwiki;
    const wikipediaUrl = enWiki
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enWiki.title.replace(/ /g, '_'))}`
      : undefined;

    // Calculate confidence score
    const confidenceScore = Math.min(1, (scoredResults[0].score / 20) + 0.5);

    return {
      name: entityData.labels[language]?.value || name,
      type: resolvedType,
      wikidataId: entityData.id,
      wikipediaUrl,
      sameAs,
      description: entityData.descriptions[language]?.value,
      properties,
      confidenceScore,
      source: 'wikidata',
      lastVerifiedAt: new Date().toISOString()
    };
  } catch (error) {
    // Network error or unexpected failure - use fallback
    console.error(`[WikidataService] Error resolving "${name}":`, error);
    console.log(`[WikidataService] Using fallback resolution for "${name}" due to error`);
    return fallbackEntityResolution(name, type);
  }
}

/**
 * Batch resolve multiple entities
 */
export async function batchResolveEntities(
  candidates: EntityCandidate[],
  maxConcurrent: number = 3,
  language: string = 'en'
): Promise<{ resolved: ResolvedEntity[]; failed: string[] }> {
  const resolved: ResolvedEntity[] = [];
  const failed: string[] = [];

  // Process in batches to avoid rate limiting
  for (let i = 0; i < candidates.length; i += maxConcurrent) {
    const batch = candidates.slice(i, i + maxConcurrent);

    const results = await Promise.allSettled(
      batch.map(candidate =>
        resolveEntity(candidate.name, candidate.context, candidate.type, language)
      )
    );

    results.forEach((result, index) => {
      const candidate = batch[index];
      if (result.status === 'fulfilled' && result.value) {
        resolved.push(result.value);
      } else {
        failed.push(candidate.name);
      }
    });

    // Small delay between batches to be respectful to Wikidata API
    if (i + maxConcurrent < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return { resolved, failed };
}

/**
 * Query Wikidata SPARQL for specific entity types
 * Useful for finding all entities of a certain type in a domain
 */
export async function sparqlQuery(query: string): Promise<any[]> {
  // Sanitize SPARQL query input (allow longer queries since SPARQL can be verbose)
  query = sanitizeTextInput(query, 5000);

  const params = new URLSearchParams({
    query,
    format: 'json'
  });

  try {
    const response = await fetch(`${WIKIDATA_SPARQL}?${params}`, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'HolisticSEO-TopicalMapGenerator/1.0'
      }
    });

    if (!response.ok) {
      console.error('[WikidataService] SPARQL query failed:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.results?.bindings || [];
  } catch (error) {
    console.error('[WikidataService] SPARQL error:', error);
    return [];
  }
}

/**
 * Get entity by Wikipedia URL
 */
export async function getEntityByWikipediaUrl(
  wikipediaUrl: string
): Promise<ResolvedEntity | null> {
  // Extract title from Wikipedia URL
  const match = wikipediaUrl.match(/wikipedia\.org\/wiki\/(.+)$/);
  if (!match) return null;

  const title = decodeURIComponent(match[1].replace(/_/g, ' '));

  // Use Wikidata API to get entity by site link
  const params = new URLSearchParams({
    action: 'wbgetentities',
    sites: 'enwiki',
    titles: title,
    props: 'labels|descriptions|claims|sitelinks',
    languages: 'en',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIDATA_API}?${params}`);

    if (!response.ok) return null;

    const data = await response.json();
    const entities = data.entities;

    // Find the entity (skip -1 which is "not found")
    const entityId = Object.keys(entities).find(id => id !== '-1');
    if (!entityId) return null;

    const entityData = entities[entityId];
    const resolvedType = determineEntityType(entityData);
    const sameAs = extractSameAsUrls(entityData);
    const properties = extractProperties(entityData);

    return {
      name: entityData.labels?.en?.value || title,
      type: resolvedType,
      wikidataId: entityData.id,
      wikipediaUrl,
      sameAs,
      description: entityData.descriptions?.en?.value,
      properties,
      confidenceScore: 1.0, // High confidence since we looked up directly
      source: 'wikidata',
      lastVerifiedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[WikidataService] Wikipedia lookup error:', error);
    return null;
  }
}

/**
 * Verify if a Wikidata ID exists and is valid
 */
export async function verifyWikidataId(wikidataId: string): Promise<boolean> {
  const entity = await getWikidataEntity(wikidataId);
  return entity !== null && !('missing' in entity);
}

/**
 * Get suggested entity type based on context
 */
export function suggestEntityType(name: string, context: string): SchemaEntityType {
  const combined = `${name} ${context}`.toLowerCase();

  // Person indicators
  if (
    combined.match(/\b(ceo|founder|author|dr\.|professor|mr\.|mrs\.|ms\.)\b/) ||
    combined.match(/\b(born|died|married|graduated)\b/)
  ) {
    return 'Person';
  }

  // Organization indicators
  if (
    combined.match(/\b(inc\.|corp\.|llc|ltd|company|organization|foundation|institute)\b/) ||
    combined.match(/\b(headquartered|founded in|employees)\b/)
  ) {
    return 'Organization';
  }

  // Place indicators
  if (
    combined.match(/\b(city|country|state|province|located in|capital of)\b/) ||
    combined.match(/\b(km|miles|population|coordinates)\b/)
  ) {
    return 'Place';
  }

  // Event indicators
  if (
    combined.match(/\b(conference|festival|event|meeting|summit|ceremony)\b/) ||
    combined.match(/\b(annual|held on|takes place)\b/)
  ) {
    return 'Event';
  }

  // Creative work indicators
  if (
    combined.match(/\b(book|movie|film|album|song|article|paper|publication)\b/) ||
    combined.match(/\b(written by|directed by|published|released)\b/)
  ) {
    return 'CreativeWork';
  }

  // Default to Thing
  return 'Thing';
}
