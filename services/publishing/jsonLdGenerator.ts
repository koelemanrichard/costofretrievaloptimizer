/**
 * JSON-LD Schema Generator
 *
 * Generates comprehensive JSON-LD structured data from semantic content data:
 * - Article/Service/Product schemas with entity linking
 * - EAVs as Schema.org PropertyValue
 * - Entity linking to Wikidata via sameAs
 * - Breadcrumb navigation for topical authority
 * - Author schema for E-E-A-T signals
 * - FAQ and HowTo schemas
 *
 * @module services/publishing/jsonLdGenerator
 */

import type {
  SemanticContentData,
  ExtractedEntity,
  TopicalContext,
  AuthorshipData,
  SourceCitation,
} from './semanticExtractor';

// ============================================================================
// TYPES
// ============================================================================

export interface JsonLdOptions {
  baseUrl?: string;
  organizationName?: string;
  organizationLogo?: string;
  includeEavs?: boolean;
  includeBreadcrumb?: boolean;
  includeAuthor?: boolean;
  includeFaq?: boolean;
  includeHowTo?: boolean;
  language?: string;
}

interface SchemaOrgThing {
  '@type': string;
  name: string;
  [key: string]: unknown;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate comprehensive JSON-LD from semantic data
 */
export function generateJsonLd(
  semanticData: SemanticContentData,
  options: JsonLdOptions = {}
): string {
  const schemas: object[] = [];

  // 1. Main page schema (Article, Service, Product, etc.)
  const mainSchema = generateMainSchema(semanticData, options);
  if (mainSchema) {
    schemas.push(mainSchema);
  }

  // 2. EAVs as PropertyValue list (separate schema for clarity)
  if (options.includeEavs !== false && semanticData.entities.length > 0) {
    const eavSchema = generateEavSchema(semanticData.entities, options);
    if (eavSchema) {
      schemas.push(eavSchema);
    }
  }

  // 3. Breadcrumb for topical authority
  if (options.includeBreadcrumb !== false && semanticData.topicalContext.pillarTopic) {
    const breadcrumbSchema = generateBreadcrumbSchema(semanticData.topicalContext, semanticData.mainEntity?.name || '', options);
    if (breadcrumbSchema) {
      schemas.push(breadcrumbSchema);
    }
  }

  // 4. Organization schema (publisher)
  if (options.organizationName) {
    const orgSchema = generateOrganizationSchema(options);
    schemas.push(orgSchema);
  }

  // Generate final JSON-LD scripts
  return schemas.map(schema =>
    `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
  ).join('\n');
}

// ============================================================================
// MAIN SCHEMA GENERATORS
// ============================================================================

/**
 * Generate main page schema based on page type
 */
function generateMainSchema(
  semanticData: SemanticContentData,
  options: JsonLdOptions
): object | null {
  const { pageType, mainEntity, datePublished, dateModified, authorship, keywords } = semanticData;

  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': getSchemaType(pageType),
    headline: mainEntity?.name || '',
    description: mainEntity?.description || keywords.primary,
    datePublished: datePublished,
    dateModified: dateModified,
    inLanguage: options.language || 'nl-NL',
  };

  // Add about with entity linking
  if (mainEntity) {
    const aboutEntity: SchemaOrgThing = {
      '@type': mainEntity.type,
      name: mainEntity.name,
    };

    // Add Wikidata linking
    if (mainEntity.wikidataId || mainEntity.wikipediaUrl) {
      aboutEntity.sameAs = [];
      if (mainEntity.wikidataId) {
        (aboutEntity.sameAs as string[]).push(`https://www.wikidata.org/wiki/${mainEntity.wikidataId}`);
      }
      if (mainEntity.wikipediaUrl) {
        (aboutEntity.sameAs as string[]).push(mainEntity.wikipediaUrl);
      }
    }

    // Add PropertyValue for main entity attributes
    if (mainEntity.attributes.length > 0) {
      aboutEntity.additionalProperty = mainEntity.attributes.map(attr => ({
        '@type': 'PropertyValue',
        name: attr.name,
        value: attr.value,
        ...(attr.unit && { unitText: attr.unit }),
      }));
    }

    (baseSchema as Record<string, unknown>).about = aboutEntity;
  }

  // Add author for E-E-A-T
  if (authorship && options.includeAuthor !== false) {
    (baseSchema as Record<string, unknown>).author = generateAuthorSchema(authorship);
  }

  // Add publisher
  if (options.organizationName) {
    (baseSchema as Record<string, unknown>).publisher = {
      '@type': 'Organization',
      name: options.organizationName,
      ...(options.organizationLogo && {
        logo: {
          '@type': 'ImageObject',
          url: options.organizationLogo,
        },
      }),
    };
  }

  // Add keywords
  if (keywords.secondary.length > 0) {
    (baseSchema as Record<string, unknown>).keywords = [keywords.primary, ...keywords.secondary].join(', ');
  }

  // Add main entity URL
  if (options.baseUrl) {
    (baseSchema as Record<string, unknown>).mainEntityOfPage = {
      '@type': 'WebPage',
      '@id': options.baseUrl,
    };
  }

  return baseSchema;
}

/**
 * Get Schema.org type for page type
 */
function getSchemaType(pageType: SemanticContentData['pageType']): string {
  const typeMap: Record<SemanticContentData['pageType'], string> = {
    article: 'Article',
    service: 'Service',
    product: 'Product',
    faq: 'FAQPage',
    howto: 'HowTo',
    category: 'CollectionPage',
  };
  return typeMap[pageType] || 'Article';
}

// ============================================================================
// EAV SCHEMA GENERATOR
// ============================================================================

/**
 * Generate schema for EAVs as PropertyValue list
 */
function generateEavSchema(
  entities: ExtractedEntity[],
  options: JsonLdOptions
): object | null {
  if (entities.length === 0) return null;

  // Filter entities with attributes
  const entitiesWithAttributes = entities.filter(e => e.attributes.length > 0);
  if (entitiesWithAttributes.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Entity Attributes',
    description: 'Semantic attributes (EAVs) for entities in this content',
    itemListElement: entitiesWithAttributes.map((entity, index) => ({
      '@type': entity.type || 'Thing',
      position: index + 1,
      name: entity.name,
      ...(entity.wikidataId && {
        sameAs: `https://www.wikidata.org/wiki/${entity.wikidataId}`,
      }),
      additionalProperty: entity.attributes.map(attr => ({
        '@type': 'PropertyValue',
        name: attr.name,
        value: attr.value,
        ...(attr.unit && { unitText: attr.unit }),
        ...(attr.category && {
          propertyID: attr.category, // UNIQUE, ROOT, RARE, COMMON
        }),
      })),
    })),
  };
}

// ============================================================================
// BREADCRUMB SCHEMA GENERATOR
// ============================================================================

/**
 * Generate BreadcrumbList schema for topical authority
 */
function generateBreadcrumbSchema(
  topicalContext: TopicalContext,
  currentTitle: string,
  options: JsonLdOptions
): object | null {
  const items: Array<{ name: string; url?: string }> = [];

  // Add home
  if (options.baseUrl) {
    items.push({ name: 'Home', url: options.baseUrl });
  }

  // Add pillar topic
  if (topicalContext.pillarTopic) {
    items.push({
      name: topicalContext.pillarTopic.title,
      url: topicalContext.pillarTopic.url,
    });
  }

  // Add parent topic
  if (topicalContext.parentTopic) {
    items.push({
      name: topicalContext.parentTopic.title,
      url: topicalContext.parentTopic.url,
    });
  }

  // Add current page
  items.push({ name: currentTitle });

  if (items.length < 2) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };
}

// ============================================================================
// AUTHOR SCHEMA GENERATOR
// ============================================================================

/**
 * Generate Person/Organization schema for authorship
 */
function generateAuthorSchema(authorship: AuthorshipData): object {
  const isOrganization = !authorship.name.includes(' ') ||
    authorship.name.toLowerCase().includes('b.v.') ||
    authorship.name.toLowerCase().includes('bv') ||
    authorship.name.toLowerCase().includes('inc');

  const schema: Record<string, unknown> = {
    '@type': isOrganization ? 'Organization' : 'Person',
    name: authorship.name,
  };

  if (authorship.title) {
    schema.jobTitle = authorship.title;
  }

  if (authorship.bio) {
    schema.description = authorship.bio;
  }

  if (authorship.imageUrl) {
    schema.image = authorship.imageUrl;
  }

  if (authorship.knowsAbout && authorship.knowsAbout.length > 0) {
    schema.knowsAbout = authorship.knowsAbout;
  }

  if (authorship.socialLinks && authorship.socialLinks.length > 0) {
    schema.sameAs = authorship.socialLinks;
  }

  if (authorship.credentials && authorship.credentials.length > 0) {
    schema.hasCredential = authorship.credentials.map(cred => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certification',
      name: cred,
    }));
  }

  return schema;
}

// ============================================================================
// ORGANIZATION SCHEMA GENERATOR
// ============================================================================

/**
 * Generate Organization schema for publisher
 */
function generateOrganizationSchema(options: JsonLdOptions): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options.organizationName,
    ...(options.organizationLogo && {
      logo: {
        '@type': 'ImageObject',
        url: options.organizationLogo,
      },
    }),
    ...(options.baseUrl && { url: options.baseUrl }),
  };
}

// ============================================================================
// FAQ SCHEMA GENERATOR
// ============================================================================

/**
 * Generate FAQPage schema from FAQ items
 */
export function generateFaqSchema(
  faqItems: Array<{ question: string; answer: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ============================================================================
// HOWTO SCHEMA GENERATOR
// ============================================================================

/**
 * Generate HowTo schema from process steps
 */
export function generateHowToSchema(
  name: string,
  description: string,
  steps: Array<{ title: string; description: string; image?: string }>,
  options: {
    totalTime?: string; // ISO 8601 duration (e.g., "PT30M")
    estimatedCost?: { value: number; currency: string };
    supply?: string[];
    tool?: string[];
  } = {}
): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
      ...(step.image && {
        image: {
          '@type': 'ImageObject',
          url: step.image,
        },
      }),
    })),
  };

  if (options.totalTime) {
    schema.totalTime = options.totalTime;
  }

  if (options.estimatedCost) {
    schema.estimatedCost = {
      '@type': 'MonetaryAmount',
      value: options.estimatedCost.value,
      currency: options.estimatedCost.currency,
    };
  }

  if (options.supply && options.supply.length > 0) {
    schema.supply = options.supply.map(s => ({
      '@type': 'HowToSupply',
      name: s,
    }));
  }

  if (options.tool && options.tool.length > 0) {
    schema.tool = options.tool.map(t => ({
      '@type': 'HowToTool',
      name: t,
    }));
  }

  return schema;
}

// ============================================================================
// SERVICE SCHEMA GENERATOR
// ============================================================================

/**
 * Generate Service schema with EAV attributes
 */
export function generateServiceSchema(
  serviceName: string,
  description: string,
  entity: ExtractedEntity,
  options: {
    provider?: { name: string; url?: string };
    areaServed?: string[];
    offers?: Array<{ name: string; price?: number; currency?: string }>;
  } = {}
): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description,
  };

  // Add entity linking
  if (entity.wikidataId) {
    schema.sameAs = `https://www.wikidata.org/wiki/${entity.wikidataId}`;
  }

  // Add attributes as PropertyValue
  if (entity.attributes.length > 0) {
    schema.additionalProperty = entity.attributes.map(attr => ({
      '@type': 'PropertyValue',
      name: attr.name,
      value: attr.value,
      ...(attr.unit && { unitText: attr.unit }),
    }));
  }

  // Add provider
  if (options.provider) {
    schema.provider = {
      '@type': 'Organization',
      name: options.provider.name,
      ...(options.provider.url && { url: options.provider.url }),
    };
  }

  // Add area served
  if (options.areaServed && options.areaServed.length > 0) {
    schema.areaServed = options.areaServed.map(area => ({
      '@type': 'Place',
      name: area,
    }));
  }

  // Add offers
  if (options.offers && options.offers.length > 0) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: `${serviceName} Options`,
      itemListElement: options.offers.map(offer => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: offer.name,
        },
        ...(offer.price !== undefined && {
          price: offer.price,
          priceCurrency: offer.currency || 'EUR',
        }),
      })),
    };
  }

  return schema;
}

// ============================================================================
// PRODUCT SCHEMA GENERATOR
// ============================================================================

/**
 * Generate Product schema with EAV attributes
 */
export function generateProductSchema(
  productName: string,
  description: string,
  entity: ExtractedEntity,
  options: {
    brand?: string;
    sku?: string;
    price?: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    image?: string;
    rating?: { value: number; count: number };
  } = {}
): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description,
  };

  // Add entity linking
  if (entity.wikidataId) {
    schema.sameAs = `https://www.wikidata.org/wiki/${entity.wikidataId}`;
  }

  // Add attributes as PropertyValue
  if (entity.attributes.length > 0) {
    schema.additionalProperty = entity.attributes.map(attr => ({
      '@type': 'PropertyValue',
      name: attr.name,
      value: attr.value,
      ...(attr.unit && { unitText: attr.unit }),
    }));
  }

  // Add brand
  if (options.brand) {
    schema.brand = {
      '@type': 'Brand',
      name: options.brand,
    };
  }

  // Add SKU
  if (options.sku) {
    schema.sku = options.sku;
  }

  // Add image
  if (options.image) {
    schema.image = options.image;
  }

  // Add offers
  if (options.price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      price: options.price,
      priceCurrency: options.currency || 'EUR',
      availability: `https://schema.org/${options.availability || 'InStock'}`,
    };
  }

  // Add rating
  if (options.rating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: options.rating.value,
      reviewCount: options.rating.count,
    };
  }

  return schema;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Merge multiple JSON-LD scripts into one
 */
export function mergeJsonLdScripts(...scripts: string[]): string {
  return scripts.filter(Boolean).join('\n');
}

/**
 * Extract JSON-LD from HTML string
 */
export function extractJsonLdFromHtml(html: string): object[] {
  const schemas: object[] = [];
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const schema = JSON.parse(match[1]);
      schemas.push(schema);
    } catch {
      // Skip invalid JSON
    }
  }

  return schemas;
}

/**
 * Validate JSON-LD structure
 */
export function validateJsonLd(schema: object): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!('@context' in schema)) {
    errors.push('Missing @context');
  }

  if (!('@type' in schema)) {
    errors.push('Missing @type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
