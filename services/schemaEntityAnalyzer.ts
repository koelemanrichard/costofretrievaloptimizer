/**
 * Schema Entity Analyzer Service
 *
 * Analyzes schema.org markup for entity linking quality.
 * Focuses on `about` and `mentions` properties which are critical
 * for entity disambiguation and Knowledge Panel optimization.
 *
 * Research Source: schema.md
 *
 * Quote: "Use `about` for the Central Entity of the page. Use `mentions`
 * for entities that are discussed but are not the main focus. This defines
 * the Macro Context (Main Topic) vs. Micro Context (Sub-topics) clearly
 * to the search engine."
 */

import {
  EntityLinkingAnalysis,
  AboutAnalysis,
  MentionsAnalysis,
  SchemaEntity,
} from '../types/competitiveIntelligence';

// =============================================================================
// Types
// =============================================================================

/**
 * Raw schema extracted from HTML
 */
export interface ExtractedSchema {
  type: string;
  raw: Record<string, unknown>;
  about?: unknown;
  mentions?: unknown[];
}

/**
 * Schema extraction result
 */
export interface SchemaExtractionResult {
  schemas: ExtractedSchema[];
  hasSchema: boolean;
  schemaTypes: string[];
  validationErrors: string[];
}

// =============================================================================
// Schema Extraction
// =============================================================================

/**
 * Extract all JSON-LD schemas from HTML
 */
export function extractSchemasFromHtml(html: string): SchemaExtractionResult {
  const schemas: ExtractedSchema[] = [];
  const schemaTypes: string[] = [];
  const validationErrors: string[] = [];

  // Find all JSON-LD script tags
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const schemaContent = match[1].trim();
      const parsed = JSON.parse(schemaContent);

      // Handle @graph structure
      if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        for (const item of parsed['@graph']) {
          processSchemaItem(item, schemas, schemaTypes);
        }
      } else if (Array.isArray(parsed)) {
        for (const item of parsed) {
          processSchemaItem(item, schemas, schemaTypes);
        }
      } else {
        processSchemaItem(parsed, schemas, schemaTypes);
      }
    } catch (error) {
      validationErrors.push(`Failed to parse JSON-LD: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    schemas,
    hasSchema: schemas.length > 0,
    schemaTypes: [...new Set(schemaTypes)],
    validationErrors,
  };
}

/**
 * Process a single schema item
 */
function processSchemaItem(
  item: Record<string, unknown>,
  schemas: ExtractedSchema[],
  schemaTypes: string[]
): void {
  if (!item || typeof item !== 'object') return;

  const type = getSchemaType(item);
  if (type) {
    schemaTypes.push(type);
  }

  schemas.push({
    type: type || 'Unknown',
    raw: item,
    about: item.about,
    mentions: Array.isArray(item.mentions) ? item.mentions : item.mentions ? [item.mentions] : undefined,
  });
}

/**
 * Get the @type of a schema item
 */
function getSchemaType(item: Record<string, unknown>): string | null {
  const type = item['@type'];
  if (typeof type === 'string') return type;
  if (Array.isArray(type) && type.length > 0) return type[0];
  return null;
}

// =============================================================================
// Entity Analysis
// =============================================================================

/**
 * Parse an entity from schema (can be object or string)
 */
function parseSchemaEntity(entity: unknown): SchemaEntity | null {
  if (!entity) return null;

  // String reference (just a name)
  if (typeof entity === 'string') {
    return {
      name: entity,
      type: 'Thing',
      wikidataId: null,
      wikipediaUrl: null,
      isProperlyReconciled: false,
    };
  }

  // Object with properties
  if (typeof entity === 'object' && entity !== null) {
    const obj = entity as Record<string, unknown>;

    // Extract Wikidata ID from @id or sameAs
    let wikidataId: string | null = null;
    let wikipediaUrl: string | null = null;

    // Check @id
    if (typeof obj['@id'] === 'string') {
      const id = obj['@id'];
      if (id.includes('wikidata.org')) {
        const qMatch = id.match(/Q\d+/);
        if (qMatch) wikidataId = qMatch[0];
      }
      if (id.includes('wikipedia.org')) {
        wikipediaUrl = id;
      }
    }

    // Check sameAs array
    const sameAs = obj.sameAs;
    if (sameAs) {
      const sameAsArray = Array.isArray(sameAs) ? sameAs : [sameAs];
      for (const url of sameAsArray) {
        if (typeof url === 'string') {
          if (url.includes('wikidata.org') && !wikidataId) {
            const qMatch = url.match(/Q\d+/);
            if (qMatch) wikidataId = qMatch[0];
          }
          if (url.includes('wikipedia.org') && !wikipediaUrl) {
            wikipediaUrl = url;
          }
        }
      }
    }

    return {
      name: typeof obj.name === 'string' ? obj.name : String(obj['@id'] || 'Unknown'),
      type: getSchemaType(obj) || 'Thing',
      wikidataId,
      wikipediaUrl,
      isProperlyReconciled: wikidataId !== null,
    };
  }

  return null;
}

/**
 * Analyze the `about` property
 */
export function analyzeAboutProperty(schemas: ExtractedSchema[]): AboutAnalysis {
  const entities: SchemaEntity[] = [];
  const issues: string[] = [];

  for (const schema of schemas) {
    if (!schema.about) continue;

    // about can be an array or single item
    const aboutItems = Array.isArray(schema.about) ? schema.about : [schema.about];

    for (const item of aboutItems) {
      const entity = parseSchemaEntity(item);
      if (entity) {
        entities.push(entity);
      }
    }
  }

  // Determine quality
  let quality: AboutAnalysis['quality'];

  if (entities.length === 0) {
    quality = 'missing';
    issues.push('No "about" property found in schema');
  } else if (entities.every(e => e.isProperlyReconciled)) {
    quality = 'excellent';
  } else if (entities.some(e => e.wikidataId || e.wikipediaUrl)) {
    quality = 'good';
    if (entities.some(e => !e.isProperlyReconciled)) {
      issues.push('Some entities are not reconciled to Wikidata');
    }
  } else {
    quality = 'poor';
    issues.push('Entities in "about" lack Wikidata or Wikipedia links');
  }

  return {
    present: entities.length > 0,
    entities,
    quality,
    issues,
  };
}

/**
 * Analyze the `mentions` property
 */
export function analyzeMentionsProperty(schemas: ExtractedSchema[]): MentionsAnalysis {
  const entities: SchemaEntity[] = [];

  for (const schema of schemas) {
    if (!schema.mentions || !Array.isArray(schema.mentions)) continue;

    for (const item of schema.mentions) {
      const entity = parseSchemaEntity(item);
      if (entity) {
        entities.push(entity);
      }
    }
  }

  // Determine quality
  let quality: MentionsAnalysis['quality'];

  if (entities.length === 0) {
    quality = 'missing';
  } else if (entities.every(e => e.isProperlyReconciled)) {
    quality = 'excellent';
  } else if (entities.some(e => e.wikidataId || e.wikipediaUrl)) {
    quality = 'good';
  } else {
    quality = 'poor';
  }

  return {
    present: entities.length > 0,
    count: entities.length,
    entities,
    quality,
  };
}

/**
 * Calculate entity disambiguation score (0-100)
 */
export function calculateDisambiguationScore(
  about: AboutAnalysis,
  mentions: MentionsAnalysis
): number {
  let score = 0;

  // About property scoring (max 60 points)
  if (about.present) {
    score += 20;
    if (about.entities.some(e => e.wikidataId)) {
      score += 40; // Properly reconciled = major points
    } else if (about.entities.some(e => e.wikipediaUrl)) {
      score += 20; // Wikipedia link = partial credit
    }
  }

  // Mentions property scoring (max 40 points)
  if (mentions.present && mentions.count > 0) {
    score += 20;
    const reconciledRatio = mentions.entities.filter(e => e.wikidataId).length /
                            mentions.entities.length;
    score += Math.round(reconciledRatio * 20);
  }

  return score;
}

/**
 * Generate recommendations for improving entity linking
 */
export function generateEntityLinkingRecommendations(
  about: AboutAnalysis,
  mentions: MentionsAnalysis
): EntityLinkingAnalysis['recommendations'] {
  const recommendations: EntityLinkingAnalysis['recommendations'] = [];

  // About recommendations
  if (!about.present) {
    recommendations.push({
      action: 'Add "about" property to Article/WebPage schema',
      impact: 'high',
      implementation: 'Add about: { "@type": "Thing", "name": "Topic Name", "@id": "https://www.wikidata.org/wiki/Q123" }',
    });
  } else if (!about.entities.some(e => e.wikidataId)) {
    recommendations.push({
      action: 'Add Wikidata @id to "about" property',
      impact: 'high',
      implementation: 'Use format: {"@id": "https://www.wikidata.org/wiki/Q123"} where Q123 is the Wikidata entity ID',
    });
  }

  // Mentions recommendations
  if (!mentions.present) {
    recommendations.push({
      action: 'Add "mentions" property for secondary entities',
      impact: 'medium',
      implementation: 'List entities discussed but not central to the page with Wikidata links',
    });
  } else if (mentions.entities.length > 0 && !mentions.entities.some(e => e.wikidataId)) {
    recommendations.push({
      action: 'Link mentioned entities to Wikidata',
      impact: 'medium',
      implementation: 'Add @id with Wikidata URLs to each entity in "mentions" array',
    });
  }

  // Additional recommendations based on quality
  if (about.quality === 'poor' || mentions.quality === 'poor') {
    recommendations.push({
      action: 'Use entity reconciliation tools',
      impact: 'medium',
      implementation: 'Use tools like OpenRefine or Google Knowledge Graph API to find correct Wikidata IDs',
    });
  }

  return recommendations;
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Perform complete entity linking analysis on HTML content
 */
export function analyzeEntityLinking(html: string): EntityLinkingAnalysis {
  // Extract schemas
  const extraction = extractSchemasFromHtml(html);

  // Analyze about and mentions
  const about = analyzeAboutProperty(extraction.schemas);
  const mentions = analyzeMentionsProperty(extraction.schemas);

  // Calculate score
  const disambiguationScore = calculateDisambiguationScore(about, mentions);

  // Generate recommendations
  const recommendations = generateEntityLinkingRecommendations(about, mentions);

  return {
    about,
    mentions,
    disambiguationScore,
    recommendations,
  };
}

/**
 * Quick check if schema has proper entity linking
 */
export function hasProperEntityLinking(html: string): boolean {
  const analysis = analyzeEntityLinking(html);
  return analysis.disambiguationScore >= 60;
}

// =============================================================================
// Schema Type Analysis
// =============================================================================

/**
 * Get all schema types from HTML
 */
export function getSchemaTypes(html: string): string[] {
  const extraction = extractSchemasFromHtml(html);
  return extraction.schemaTypes;
}

/**
 * Check for specific schema types
 */
export function hasSchemaType(html: string, type: string): boolean {
  const types = getSchemaTypes(html);
  return types.some(t => t.toLowerCase() === type.toLowerCase());
}

/**
 * Get recommended schema types based on content type
 */
export function getRecommendedSchemaTypes(contentType: string): string[] {
  const recommendations: Record<string, string[]> = {
    'article': ['Article', 'NewsArticle', 'BlogPosting'],
    'guide': ['Article', 'HowTo', 'FAQPage'],
    'product': ['Product', 'Offer', 'AggregateRating'],
    'comparison': ['Article', 'ItemList', 'Product'],
    'how-to': ['HowTo', 'Article'],
    'faq': ['FAQPage', 'Article'],
    'review': ['Review', 'Product', 'AggregateRating'],
    'listicle': ['Article', 'ItemList'],
  };

  return recommendations[contentType.toLowerCase()] || ['Article', 'WebPage'];
}

// =============================================================================
// Export
// =============================================================================

export default {
  extractSchemasFromHtml,
  analyzeAboutProperty,
  analyzeMentionsProperty,
  calculateDisambiguationScore,
  generateEntityLinkingRecommendations,
  analyzeEntityLinking,
  hasProperEntityLinking,
  getSchemaTypes,
  hasSchemaType,
  getRecommendedSchemaTypes,
};
