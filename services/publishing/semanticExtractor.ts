/**
 * Semantic Content Data Extractor
 *
 * Extracts semantic SEO data from content briefs, topics, and topical maps:
 * - EAVs (Entity-Attribute-Value triples) for JSON-LD PropertyValue
 * - Entities for Wikidata linking
 * - Keywords and synonyms for vocabulary expansion
 * - Topical context for internal linking
 * - E-E-A-T signals (authorship, sources)
 *
 * @module services/publishing/semanticExtractor
 */

import type { ContentBrief, SemanticTriple, EnrichedTopic, TopicalMap, BusinessInfo, AttributeCategory } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entity extracted from content with optional Wikidata linking
 */
export interface ExtractedEntity {
  name: string;
  type: string; // Person, Organization, Product, Service, Place, etc.
  wikidataId?: string; // From entity resolution cache
  wikipediaUrl?: string;
  description?: string;
  attributes: Array<{
    name: string;
    value: string | number;
    unit?: string;
    category?: AttributeCategory;
    classification?: string;
  }>;
}

/**
 * Keywords with synonyms and related terms for vocabulary expansion
 */
export interface ExtractedKeywords {
  primary: string;
  secondary: string[];
  synonyms: Map<string, string[]>; // keyword -> synonyms
  relatedTerms: string[];
  hypernyms: string[]; // Broader category terms
}

/**
 * Topical context for internal linking and breadcrumbs
 */
export interface TopicalContext {
  pillarTopic?: { title: string; slug: string; url?: string };
  parentTopic?: { title: string; slug: string; url?: string };
  siblingTopics: Array<{ title: string; slug: string; url?: string }>;
  childTopics: Array<{ title: string; slug: string; url?: string }>;
  clusterTopics: Array<{ title: string; slug: string; url?: string }>;
}

/**
 * Authorship information for E-E-A-T signals
 */
export interface AuthorshipData {
  name: string;
  title?: string;
  credentials?: string[];
  bio?: string;
  imageUrl?: string;
  socialLinks?: string[];
  knowsAbout?: string[]; // Topics the author is expert in
}

/**
 * Source citation for E-E-A-T signals
 */
export interface SourceCitation {
  title: string;
  url: string;
  type: 'official' | 'research' | 'news' | 'expert' | 'industry';
  organization?: string;
  publishDate?: string;
}

/**
 * Complete semantic content data extracted from brief and context
 */
export interface SemanticContentData {
  entities: ExtractedEntity[];
  keywords: ExtractedKeywords;
  topicalContext: TopicalContext;
  authorship?: AuthorshipData;
  sources: SourceCitation[];
  pageType: 'article' | 'service' | 'product' | 'faq' | 'howto' | 'category';
  mainEntity?: ExtractedEntity; // The primary entity the content is about
  datePublished?: string;
  dateModified?: string;
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract semantic data from ContentBrief + EnrichedTopic + TopicalMap
 */
export function extractSemanticData(
  brief: ContentBrief,
  topic?: EnrichedTopic,
  topicalMap?: TopicalMap,
  options: {
    entityCache?: Map<string, { wikidataId: string; wikipediaUrl?: string }>;
    baseUrl?: string;
  } = {}
): SemanticContentData {
  // Extract entities from EAVs
  const entities = extractEntitiesFromEavs(brief.eavs || [], brief.contextualVectors || [], options.entityCache);

  // Identify main entity (the subject of the content)
  const mainEntity = identifyMainEntity(brief, topic, entities);

  // Build keyword data with synonyms
  const keywords = extractKeywords(brief, topic);

  // Build topical context from map structure
  const topicalContext = buildTopicalContext(topic, topicalMap, options.baseUrl);

  // Extract authorship from business info
  const authorship = extractAuthorship(topicalMap?.business_info);

  // Extract sources from brief
  const sources = extractSources(brief);

  // Determine page type
  const pageType = determinePageType(brief, topic);

  return {
    entities,
    keywords,
    topicalContext,
    authorship,
    sources,
    pageType,
    mainEntity,
    datePublished: brief.created_at,
    dateModified: new Date().toISOString(),
  };
}

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

/**
 * Extract entities from EAV triples and contextual vectors
 */
function extractEntitiesFromEavs(
  eavs: SemanticTriple[],
  contextualVectors: SemanticTriple[],
  entityCache?: Map<string, { wikidataId: string; wikipediaUrl?: string }>
): ExtractedEntity[] {
  const entityMap = new Map<string, ExtractedEntity>();

  // Process all semantic triples
  const allTriples = [...eavs, ...contextualVectors];

  for (const triple of allTriples) {
    const entityName = triple.subject?.label || triple.entity || '';
    if (!entityName) continue;

    // Get or create entity
    let entity = entityMap.get(entityName.toLowerCase());
    if (!entity) {
      const entityType = inferEntityType(entityName, triple.subject?.type);
      const cached = entityCache?.get(entityName.toLowerCase());

      entity = {
        name: entityName,
        type: entityType,
        wikidataId: cached?.wikidataId,
        wikipediaUrl: cached?.wikipediaUrl,
        attributes: [],
      };
      entityMap.set(entityName.toLowerCase(), entity);
    }

    // Add attribute
    const attributeName = triple.predicate?.relation || triple.attribute;
    const attributeValue = triple.object?.value ?? triple.value;

    if (attributeName && attributeValue !== undefined) {
      entity.attributes.push({
        name: attributeName,
        value: attributeValue,
        unit: triple.object?.unit,
        category: triple.predicate?.category || triple.category,
        classification: triple.predicate?.classification || triple.classification,
      });
    }
  }

  return Array.from(entityMap.values());
}

/**
 * Infer entity type from name and context
 */
function inferEntityType(name: string, providedType?: string): string {
  if (providedType && providedType !== 'unknown') {
    return mapToSchemaOrgType(providedType);
  }

  const nameLower = name.toLowerCase();

  // Company/Organization indicators
  if (nameLower.includes(' b.v.') || nameLower.includes(' bv') ||
      nameLower.includes(' inc') || nameLower.includes(' ltd') ||
      nameLower.includes(' llc') || nameLower.includes(' gmbh')) {
    return 'Organization';
  }

  // Service indicators
  if (nameLower.includes('service') || nameLower.includes('dienst') ||
      nameLower.includes('installatie') || nameLower.includes('plaatsen')) {
    return 'Service';
  }

  // Product indicators
  if (nameLower.includes('product') || nameLower.includes('model') ||
      nameLower.includes('type') || nameLower.includes('variant')) {
    return 'Product';
  }

  // Place indicators
  if (nameLower.includes('amsterdam') || nameLower.includes('rotterdam') ||
      nameLower.includes('nederland') || nameLower.includes('europa')) {
    return 'Place';
  }

  return 'Thing';
}

/**
 * Map internal types to Schema.org types
 */
function mapToSchemaOrgType(type: string): string {
  const typeMap: Record<string, string> = {
    'person': 'Person',
    'organization': 'Organization',
    'company': 'Organization',
    'product': 'Product',
    'service': 'Service',
    'place': 'Place',
    'location': 'Place',
    'event': 'Event',
    'article': 'Article',
    'howto': 'HowTo',
    'faq': 'FAQPage',
    'review': 'Review',
    'thing': 'Thing',
  };

  return typeMap[type.toLowerCase()] || 'Thing';
}

/**
 * Identify the main entity the content is about
 */
function identifyMainEntity(
  brief: ContentBrief,
  topic?: EnrichedTopic,
  entities?: ExtractedEntity[]
): ExtractedEntity | undefined {
  // Use topic title as main entity if available
  const mainName = topic?.title || brief.title;

  // Find matching entity or create one
  const existing = entities?.find(e =>
    e.name.toLowerCase() === mainName.toLowerCase()
  );

  if (existing) return existing;

  // Create main entity from topic/brief info
  return {
    name: mainName,
    type: determineMainEntityType(brief, topic),
    attributes: [],
  };
}

/**
 * Determine the Schema.org type for the main entity
 */
function determineMainEntityType(brief: ContentBrief, topic?: EnrichedTopic): string {
  const topicClass = topic?.topic_class || brief.topic_class;

  if (topicClass === 'monetization') {
    return 'Service';
  }

  // Check for product indicators in title
  const title = (brief.title || '').toLowerCase();
  if (title.includes('product') || title.includes('kopen') || title.includes('prijs')) {
    return 'Product';
  }

  // Check for service indicators
  if (title.includes('dienst') || title.includes('service') ||
      title.includes('installatie') || title.includes('plaatsen')) {
    return 'Service';
  }

  return 'Article';
}

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

/**
 * Extract keywords with synonyms from brief
 */
function extractKeywords(brief: ContentBrief, topic?: EnrichedTopic): ExtractedKeywords {
  const primary = brief.targetKeyword || topic?.title || brief.title;
  const synonyms = new Map<string, string[]>();
  const relatedTerms: string[] = [];
  const hypernyms: string[] = [];

  // Extract synonyms from EAVs lexical data
  const allTriples = [...(brief.eavs || []), ...(brief.contextualVectors || [])];
  for (const triple of allTriples) {
    if (triple.lexical?.synonyms?.length) {
      const key = triple.entity || triple.subject?.label || '';
      if (key) {
        synonyms.set(key.toLowerCase(), triple.lexical.synonyms);
      }
    }
    if (triple.lexical?.hypernyms?.length) {
      hypernyms.push(...triple.lexical.hypernyms);
    }
  }

  // Add secondary keywords
  const secondary: string[] = [];
  if (brief.serpAnalysis?.competitorHeadings) {
    // Extract keywords from competitor headings
    for (const competitor of brief.serpAnalysis.competitorHeadings.slice(0, 3)) {
      for (const heading of competitor.headings) {
        const words = heading.text.split(/\s+/).filter(w => w.length > 4);
        relatedTerms.push(...words.slice(0, 2));
      }
    }
  }

  // Extract from contextual bridge
  if (Array.isArray(brief.contextualBridge)) {
    for (const link of brief.contextualBridge) {
      if (link.anchorText) {
        relatedTerms.push(link.anchorText);
      }
    }
  }

  return {
    primary,
    secondary: [...new Set(secondary)],
    synonyms,
    relatedTerms: [...new Set(relatedTerms)].slice(0, 10),
    hypernyms: [...new Set(hypernyms)],
  };
}

// ============================================================================
// TOPICAL CONTEXT
// ============================================================================

/**
 * Build topical context from map structure
 */
function buildTopicalContext(
  topic?: EnrichedTopic,
  topicalMap?: TopicalMap,
  baseUrl?: string
): TopicalContext {
  const context: TopicalContext = {
    siblingTopics: [],
    childTopics: [],
    clusterTopics: [],
  };

  if (!topic || !topicalMap) return context;

  const allTopics = topicalMap.topics || [];

  // Find pillar topic
  const pillar = allTopics.find(t => t.type === 'core' && !t.parent_topic_id);
  if (pillar) {
    context.pillarTopic = {
      title: pillar.title,
      slug: pillar.slug,
      url: baseUrl ? `${baseUrl}/${pillar.slug}` : undefined,
    };
  }

  // Find parent topic
  if (topic.parent_topic_id) {
    const parent = allTopics.find(t => t.id === topic.parent_topic_id);
    if (parent) {
      context.parentTopic = {
        title: parent.title,
        slug: parent.slug,
        url: baseUrl ? `${baseUrl}/${parent.slug}` : undefined,
      };
    }
  }

  // Find sibling topics (same parent)
  const siblings = allTopics.filter(t =>
    t.parent_topic_id === topic.parent_topic_id &&
    t.id !== topic.id
  );
  context.siblingTopics = siblings.slice(0, 5).map(t => ({
    title: t.title,
    slug: t.slug,
    url: baseUrl ? `${baseUrl}/${t.slug}` : undefined,
  }));

  // Find child topics
  const children = allTopics.filter(t => t.parent_topic_id === topic.id);
  context.childTopics = children.slice(0, 5).map(t => ({
    title: t.title,
    slug: t.slug,
    url: baseUrl ? `${baseUrl}/${t.slug}` : undefined,
  }));

  // Find cluster topics (same cluster role)
  if (topic.cluster_role) {
    const clusterPeers = allTopics.filter(t =>
      t.cluster_role === topic.cluster_role &&
      t.id !== topic.id
    );
    context.clusterTopics = clusterPeers.slice(0, 5).map(t => ({
      title: t.title,
      slug: t.slug,
      url: baseUrl ? `${baseUrl}/${t.slug}` : undefined,
    }));
  }

  return context;
}

// ============================================================================
// E-E-A-T EXTRACTION
// ============================================================================

/**
 * Extract authorship from business info
 */
function extractAuthorship(businessInfo?: Partial<BusinessInfo>): AuthorshipData | undefined {
  if (!businessInfo) return undefined;

  // Check for author in business info - use authorProfile if available, otherwise company name
  const authorProfile = businessInfo.authorProfile;
  if (authorProfile) {
    return {
      name: authorProfile.name,
      bio: authorProfile.bio,
      credentials: authorProfile.credentials ? [authorProfile.credentials] : undefined,
      socialLinks: authorProfile.socialUrls,
    };
  }

  // Fallback to project name as organization author
  const projectName = businessInfo.projectName;
  if (!projectName) return undefined;

  return {
    name: projectName,
    title: businessInfo.industry,
    bio: businessInfo.valueProp,
    knowsAbout: businessInfo.expertise ? [businessInfo.expertise] : [],
  };
}

/**
 * Extract sources from brief
 */
function extractSources(brief: ContentBrief): SourceCitation[] {
  const sources: SourceCitation[] = [];

  // Extract from schema suggestions
  if (brief.schema_suggestions) {
    for (const schema of brief.schema_suggestions) {
      if (schema.citation && typeof schema.citation === 'object') {
        const citation = schema.citation as Record<string, unknown>;
        if (citation.url && citation.name) {
          sources.push({
            title: String(citation.name),
            url: String(citation.url),
            type: 'official',
          });
        }
      }
    }
  }

  // Extract from SERP competitor data
  if (brief.serpAnalysis?.competitorHeadings) {
    for (const competitor of brief.serpAnalysis.competitorHeadings.slice(0, 3)) {
      if (competitor.url && competitor.title) {
        sources.push({
          title: competitor.title,
          url: competitor.url,
          type: 'industry',
        });
      }
    }
  }

  return sources;
}

// ============================================================================
// PAGE TYPE DETECTION
// ============================================================================

/**
 * Determine page type from brief and topic
 */
function determinePageType(
  brief: ContentBrief,
  topic?: EnrichedTopic
): SemanticContentData['pageType'] {
  const title = (brief.title || '').toLowerCase();
  const queryType = brief.query_type_format?.toLowerCase() || '';
  const topicClass = topic?.topic_class || brief.topic_class;

  // FAQ detection
  if (queryType.includes('faq') || title.includes('veelgestelde') ||
      title.includes('frequently asked')) {
    return 'faq';
  }

  // HowTo detection
  if (queryType.includes('how') || title.includes('hoe') ||
      title.includes('how to') || title.includes('stappenplan')) {
    return 'howto';
  }

  // Product detection
  if (title.includes('product') || title.includes('kopen') ||
      title.includes('prijs') || title.includes('vergelijk')) {
    return 'product';
  }

  // Service detection
  if (topicClass === 'monetization' || title.includes('dienst') ||
      title.includes('service') || title.includes('offerte')) {
    return 'service';
  }

  // Category detection
  if (topic?.cluster_role === 'pillar' || title.includes('overzicht') ||
      title.includes('categorie') || title.includes('soorten')) {
    return 'category';
  }

  return 'article';
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Consolidate entities by merging attributes for same entity
 */
export function consolidateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const entityMap = new Map<string, ExtractedEntity>();

  for (const entity of entities) {
    const key = entity.name.toLowerCase();
    const existing = entityMap.get(key);

    if (existing) {
      // Merge attributes
      existing.attributes.push(...entity.attributes);
      // Update Wikidata info if available
      if (entity.wikidataId && !existing.wikidataId) {
        existing.wikidataId = entity.wikidataId;
      }
      if (entity.wikipediaUrl && !existing.wikipediaUrl) {
        existing.wikipediaUrl = entity.wikipediaUrl;
      }
    } else {
      entityMap.set(key, { ...entity });
    }
  }

  return Array.from(entityMap.values());
}

/**
 * Get unique attributes from an entity, deduplicating by name
 */
export function getUniqueAttributes(entity: ExtractedEntity): ExtractedEntity['attributes'] {
  const seen = new Set<string>();
  return entity.attributes.filter(attr => {
    const key = `${attr.name}:${attr.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
