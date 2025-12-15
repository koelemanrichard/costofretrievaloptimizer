// config/schemaTemplates.ts
// Comprehensive schema templates for all page types with maximum property coverage

import type { SchemaPageType, SchemaTemplate } from '../types';

// ============================================================================
// SCHEMA.ORG PROPERTY DEFINITIONS
// ============================================================================

// Article/BlogPosting properties
const ARTICLE_PROPERTIES = {
  requiredProperties: [
    '@type',
    '@id',
    'headline',
    'datePublished',
    'author',
    'publisher'
  ],
  recommendedProperties: [
    'mainEntityOfPage',
    'image',
    'dateModified',
    'description',
    'articleBody',
    'wordCount'
  ],
  optionalProperties: [
    'name',
    'articleSection',
    'keywords',
    'about',
    'mentions',
    'citation',
    'isPartOf',
    'speakable',
    'hasPart',
    'inLanguage',
    'copyrightHolder',
    'copyrightYear',
    'license',
    'isAccessibleForFree',
    'thumbnailUrl',
    'backstory',
    'genre',
    'contentLocation',
    'timeRequired'
  ]
};

// Product properties
const PRODUCT_PROPERTIES = {
  requiredProperties: [
    '@type',
    '@id',
    'name',
    'image'
  ],
  recommendedProperties: [
    'description',
    'brand',
    'offers',
    'aggregateRating',
    'review',
    'sku'
  ],
  optionalProperties: [
    'gtin',
    'mpn',
    'category',
    'material',
    'color',
    'size',
    'weight',
    'width',
    'height',
    'depth',
    'manufacturer',
    'model',
    'productID',
    'releaseDate',
    'audience',
    'award',
    'isSimilarTo',
    'isRelatedTo',
    'itemCondition',
    'logo',
    'slogan',
    'additionalProperty'
  ]
};

// Organization properties (used for nested author/publisher - keep as required/recommended/optional for nested use)
const ORGANIZATION_PROPERTIES = {
  required: [
    '@type',
    '@id',
    'name',
    'url'
  ],
  recommended: [
    'logo',
    'sameAs',
    'contactPoint',
    'address'
  ],
  optional: [
    'description',
    'foundingDate',
    'founder',
    'numberOfEmployees',
    'areaServed',
    'slogan',
    'legalName',
    'taxID',
    'email',
    'telephone',
    'faxNumber',
    'brand',
    'parentOrganization',
    'subOrganization',
    'member',
    'alumni',
    'award',
    'knowsAbout',
    'publishingPrinciples'
  ]
};

// Person properties
const PERSON_PROPERTIES = {
  required: [
    '@type',
    '@id',
    'name'
  ],
  recommended: [
    'url',
    'image',
    'sameAs',
    'jobTitle'
  ],
  optional: [
    'description',
    'worksFor',
    'alumniOf',
    'knowsAbout',
    'email',
    'telephone',
    'birthDate',
    'birthPlace',
    'nationality',
    'honorificPrefix',
    'honorificSuffix',
    'gender',
    'height',
    'weight',
    'award',
    'colleague',
    'knows',
    'memberOf',
    'sponsor',
    'affiliation'
  ]
};

// FAQPage properties
const FAQPAGE_PROPERTIES = {
  requiredProperties: [
    '@type',
    'mainEntity'
  ],
  recommendedProperties: [
    'name',
    'description'
  ],
  optionalProperties: [
    'about',
    'audience',
    'dateCreated',
    'dateModified',
    'lastReviewed',
    'speakable'
  ]
};

// HowTo properties
const HOWTO_PROPERTIES = {
  requiredProperties: [
    '@type',
    'name',
    'step'
  ],
  recommendedProperties: [
    'description',
    'image',
    'totalTime',
    'estimatedCost'
  ],
  optionalProperties: [
    'supply',
    'tool',
    'yield',
    'prepTime',
    'performTime',
    'video',
    'about',
    'keywords',
    'datePublished',
    'dateModified',
    'author'
  ]
};

// WebPage properties
const WEBPAGE_PROPERTIES = {
  requiredProperties: [
    '@type',
    '@id',
    'url',
    'name'
  ],
  recommendedProperties: [
    'description',
    'isPartOf',
    'primaryImageOfPage',
    'datePublished',
    'dateModified'
  ],
  optionalProperties: [
    'breadcrumb',
    'mainEntity',
    'about',
    'mentions',
    'significantLink',
    'speakable',
    'specialty',
    'relatedLink',
    'lastReviewed',
    'reviewedBy',
    'mainContentOfPage',
    'potentialAction'
  ]
};

// ============================================================================
// SCHEMA TEMPLATES BY PAGE TYPE
// ============================================================================

export const SCHEMA_TEMPLATES: Record<SchemaPageType, SchemaTemplate> = {
  Article: {
    type: 'Article',
    ...ARTICLE_PROPERTIES,
    nestedTypes: {
      author: PERSON_PROPERTIES.required,
      publisher: ORGANIZATION_PROPERTIES.required,
      image: ['@type', 'url', 'width', 'height', 'caption'],
      mainEntityOfPage: ['@type', '@id']
    }
  },

  BlogPosting: {
    type: 'BlogPosting',
    ...ARTICLE_PROPERTIES,
    nestedTypes: {
      author: PERSON_PROPERTIES.required,
      publisher: ORGANIZATION_PROPERTIES.required,
      image: ['@type', 'url', 'width', 'height', 'caption'],
      mainEntityOfPage: ['@type', '@id']
    }
  },

  NewsArticle: {
    type: 'NewsArticle',
    requiredProperties: [...ARTICLE_PROPERTIES.requiredProperties, 'dateline'],
    recommendedProperties: [...ARTICLE_PROPERTIES.recommendedProperties, 'printEdition', 'printPage', 'printSection'],
    optionalProperties: ARTICLE_PROPERTIES.optionalProperties,
    nestedTypes: {
      author: PERSON_PROPERTIES.required,
      publisher: ORGANIZATION_PROPERTIES.required,
      image: ['@type', 'url', 'width', 'height', 'caption']
    }
  },

  Product: {
    type: 'Product',
    ...PRODUCT_PROPERTIES,
    nestedTypes: {
      brand: ['@type', 'name', 'logo'],
      offers: ['@type', 'price', 'priceCurrency', 'availability', 'url', 'seller', 'priceValidUntil'],
      aggregateRating: ['@type', 'ratingValue', 'reviewCount', 'bestRating', 'worstRating'],
      review: ['@type', 'author', 'reviewRating', 'reviewBody', 'datePublished']
    }
  },

  FAQPage: {
    type: 'FAQPage',
    ...FAQPAGE_PROPERTIES,
    nestedTypes: {
      mainEntity: ['@type', 'name', 'acceptedAnswer'],
      acceptedAnswer: ['@type', 'text']
    }
  },

  HowTo: {
    type: 'HowTo',
    ...HOWTO_PROPERTIES,
    nestedTypes: {
      step: ['@type', 'name', 'text', 'url', 'image', 'itemListElement'],
      supply: ['@type', 'name'],
      tool: ['@type', 'name'],
      estimatedCost: ['@type', 'currency', 'value'],
      video: ['@type', 'name', 'description', 'thumbnailUrl', 'contentUrl', 'uploadDate', 'duration']
    }
  },

  HomePage: {
    type: 'WebPage',
    requiredProperties: ['@type', '@id', 'url', 'name', 'isPartOf'],
    recommendedProperties: ['description', 'primaryImageOfPage', 'about'],
    optionalProperties: ['breadcrumb', 'speakable', 'significantLink', 'potentialAction'],
    nestedTypes: {
      isPartOf: ['@type', '@id', 'name', 'url', 'publisher'],
      about: ['@type', '@id', 'name', 'description'],
      potentialAction: ['@type', 'target', 'query-input']
    }
  },

  ProfilePage: {
    type: 'ProfilePage',
    requiredProperties: ['@type', '@id', 'mainEntity'],
    recommendedProperties: ['name', 'description', 'url'],
    optionalProperties: ['dateCreated', 'dateModified'],
    nestedTypes: {
      mainEntity: PERSON_PROPERTIES.required
    }
  },

  CollectionPage: {
    type: 'CollectionPage',
    requiredProperties: ['@type', '@id', 'name'],
    recommendedProperties: ['description', 'url', 'mainEntity'],
    optionalProperties: ['about', 'hasPart', 'numberOfItems', 'itemListElement'],
    nestedTypes: {
      mainEntity: ['@type', 'itemListElement', 'numberOfItems'],
      itemListElement: ['@type', 'position', 'url', 'name']
    }
  },

  WebPage: {
    type: 'WebPage',
    ...WEBPAGE_PROPERTIES,
    nestedTypes: {
      breadcrumb: ['@type', 'itemListElement'],
      mainEntity: ['@type', '@id', 'name'],
      potentialAction: ['@type', 'target', 'query-input']
    }
  }
};

// ============================================================================
// BASE SCHEMA STRUCTURES
// ============================================================================

/**
 * Base Organization schema structure
 */
export function createOrganizationSchema(
  name: string,
  url: string,
  logoUrl?: string,
  sameAs?: string[]
): object {
  return {
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name,
    url,
    ...(logoUrl && {
      logo: {
        '@type': 'ImageObject',
        '@id': `${url}#logo`,
        url: logoUrl,
        contentUrl: logoUrl,
        caption: `${name} logo`
      }
    }),
    ...(sameAs?.length && { sameAs })
  };
}

/**
 * Base Person/Author schema structure
 */
export function createPersonSchema(
  name: string,
  url?: string,
  imageUrl?: string,
  jobTitle?: string,
  worksForId?: string,
  sameAs?: string[]
): object {
  const personId = `${url || ''}#author-${name.toLowerCase().replace(/\s+/g, '-')}`;

  return {
    '@type': 'Person',
    '@id': personId,
    name,
    ...(url && { url }),
    ...(imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
        caption: name
      }
    }),
    ...(jobTitle && { jobTitle }),
    ...(worksForId && {
      worksFor: {
        '@type': 'Organization',
        '@id': worksForId
      }
    }),
    ...(sameAs?.length && { sameAs })
  };
}

/**
 * Base WebSite schema structure
 */
export function createWebSiteSchema(
  name: string,
  url: string,
  publisherId: string,
  searchActionEnabled: boolean = true
): object {
  const schema: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': `${url}#website`,
    name,
    url,
    publisher: {
      '@type': 'Organization',
      '@id': publisherId
    }
  };

  if (searchActionEnabled) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    };
  }

  return schema;
}

/**
 * Base BreadcrumbList schema structure
 */
export function createBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

/**
 * Base ImageObject schema structure
 */
export function createImageSchema(
  url: string,
  caption?: string,
  width?: number,
  height?: number
): object {
  return {
    '@type': 'ImageObject',
    url,
    contentUrl: url,
    ...(caption && { caption }),
    ...(width && { width }),
    ...(height && { height })
  };
}

// ============================================================================
// ARTICLE/BLOGPOSTING TEMPLATE
// ============================================================================

export function createArticleSchema(
  type: 'Article' | 'BlogPosting' | 'NewsArticle',
  data: {
    headline: string;
    description: string;
    url: string;
    datePublished: string;
    dateModified?: string;
    authorId: string;
    publisherId: string;
    imageUrl?: string;
    wordCount?: number;
    articleSection?: string;
    keywords?: string[];
    inLanguage?: string;
  }
): object {
  return {
    '@type': type,
    '@id': `${data.url}#article`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.url
    },
    headline: data.headline,
    name: data.headline,
    description: data.description,
    datePublished: data.datePublished,
    ...(data.dateModified && { dateModified: data.dateModified }),
    author: {
      '@type': 'Person',
      '@id': data.authorId
    },
    publisher: {
      '@type': 'Organization',
      '@id': data.publisherId
    },
    ...(data.imageUrl && {
      image: createImageSchema(data.imageUrl, data.headline)
    }),
    ...(data.wordCount && { wordCount: data.wordCount }),
    ...(data.articleSection && { articleSection: data.articleSection }),
    ...(data.keywords?.length && { keywords: data.keywords.join(', ') }),
    inLanguage: data.inLanguage || 'en'
  };
}

// ============================================================================
// FAQ TEMPLATE
// ============================================================================

export function createFAQSchema(
  questions: Array<{ question: string; answer: string }>
): object {
  return {
    '@type': 'FAQPage',
    mainEntity: questions.map(qa => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer
      }
    }))
  };
}

// ============================================================================
// HOWTO TEMPLATE
// ============================================================================

export function createHowToSchema(
  data: {
    name: string;
    description: string;
    steps: Array<{ name: string; text: string; imageUrl?: string }>;
    totalTime?: string;
    supplies?: string[];
    tools?: string[];
    estimatedCost?: { currency: string; value: string };
  }
): object {
  return {
    '@type': 'HowTo',
    name: data.name,
    description: data.description,
    ...(data.totalTime && { totalTime: data.totalTime }),
    ...(data.supplies?.length && {
      supply: data.supplies.map(s => ({ '@type': 'HowToSupply', name: s }))
    }),
    ...(data.tools?.length && {
      tool: data.tools.map(t => ({ '@type': 'HowToTool', name: t }))
    }),
    ...(data.estimatedCost && {
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: data.estimatedCost.currency,
        value: data.estimatedCost.value
      }
    }),
    step: data.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.imageUrl && { image: step.imageUrl })
    }))
  };
}

// ============================================================================
// PRODUCT TEMPLATE
// ============================================================================

export function createProductSchema(
  data: {
    name: string;
    description: string;
    imageUrl: string;
    brand?: string;
    sku?: string;
    offers?: {
      price: number;
      currency: string;
      availability: 'InStock' | 'OutOfStock' | 'PreOrder';
      url?: string;
    };
    aggregateRating?: {
      ratingValue: number;
      reviewCount: number;
    };
  }
): object {
  return {
    '@type': 'Product',
    name: data.name,
    description: data.description,
    image: data.imageUrl,
    ...(data.brand && {
      brand: {
        '@type': 'Brand',
        name: data.brand
      }
    }),
    ...(data.sku && { sku: data.sku }),
    ...(data.offers && {
      offers: {
        '@type': 'Offer',
        price: data.offers.price,
        priceCurrency: data.offers.currency,
        availability: `https://schema.org/${data.offers.availability}`,
        ...(data.offers.url && { url: data.offers.url })
      }
    }),
    ...(data.aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: data.aggregateRating.ratingValue,
        reviewCount: data.aggregateRating.reviewCount
      }
    })
  };
}

// ============================================================================
// GRAPH WRAPPER
// ============================================================================

/**
 * Wrap schema items in @graph structure
 */
export function wrapInGraph(
  context: string = 'https://schema.org',
  items: object[]
): object {
  return {
    '@context': context,
    '@graph': items
  };
}

/**
 * Get the @id for referencing an entity
 */
export function getSchemaId(baseUrl: string, type: string, identifier?: string): string {
  const suffix = identifier
    ? identifier.toLowerCase().replace(/\s+/g, '-')
    : type.toLowerCase();
  return `${baseUrl}#${suffix}`;
}
