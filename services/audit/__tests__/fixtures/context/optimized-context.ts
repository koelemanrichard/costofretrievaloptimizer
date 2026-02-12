import type { FixtureContext } from './types';

export const optimizedContext: FixtureContext = {
  centralEntity: 'Semantic SEO',
  sourceContext: {
    businessName: 'SEO Knowledge Base',
    industry: 'Digital Marketing Education',
    targetAudience: 'SEO professionals and content strategists seeking advanced optimization techniques',
    coreServices: ['SEO training', 'Content strategy guides', 'Technical SEO resources'],
    uniqueSellingPoints: ['Research-backed methodology', 'Practical implementation guides', 'Entity-first framework'],
  },
  contentSpec: {
    centralEntity: 'Semantic SEO',
    targetKeywords: ['what is semantic seo', 'semantic seo guide', 'entity-based seo'],
    requiredAttributes: ['definition', 'methodology', 'benefits', 'implementation steps', 'tools'],
  },
  sourceContextAttributes: ['definition', 'methodology', 'benefits', 'implementation steps'],
  csiPredicates: ['learn', 'understand', 'implement'],
  eavs: [
    { entity: 'Semantic SEO', attribute: 'definition', value: 'search optimization using entity relationships and meaning', category: 'ROOT' },
    { entity: 'Semantic SEO', attribute: 'core principle', value: 'entity-first content architecture', category: 'ROOT' },
    { entity: 'Semantic SEO', attribute: 'key method', value: 'EAV triple optimization', category: 'UNIQUE' },
    { entity: 'Semantic SEO', attribute: 'benefit', value: 'improved topical authority signals', category: 'COMMON' },
    { entity: 'Semantic SEO', attribute: 'tool', value: 'knowledge graph builders', category: 'COMMON' },
    { entity: 'Semantic SEO', attribute: 'origin', value: 'Google Hummingbird and Knowledge Graph updates', category: 'RARE' },
  ],
  rootAttributes: ['definition', 'core principle'],
  pageTopic: 'What Is Semantic SEO',
  otherPages: [
    { url: 'https://seoknowledgebase.com/eav-triples', topic: 'EAV Triples in SEO' },
    { url: 'https://seoknowledgebase.com/topical-authority', topic: 'Topical Authority Guide' },
    { url: 'https://seoknowledgebase.com/knowledge-graphs', topic: 'Knowledge Graphs for SEO' },
  ],
  relatedPages: [
    { url: 'https://seoknowledgebase.com/eav-triples', topic: 'EAV Triples in SEO', anchorText: 'EAV triples' },
    { url: 'https://seoknowledgebase.com/topical-authority', topic: 'Topical Authority Guide', anchorText: 'topical authority' },
    { url: 'https://seoknowledgebase.com/knowledge-graphs', topic: 'Knowledge Graphs for SEO', anchorText: 'knowledge graphs' },
  ],
  keyAttributes: ['definition', 'methodology', 'benefits', 'implementation steps', 'tools'],
  websiteType: 'blog',
  eavTriples: [
    { entity: 'Semantic SEO', attribute: 'definition', value: 'search optimization using entity relationships and meaning' },
    { entity: 'Semantic SEO', attribute: 'core principle', value: 'entity-first content architecture' },
    { entity: 'Semantic SEO', attribute: 'key method', value: 'EAV triple optimization' },
  ],

  // Good performance metrics — minor issues only
  httpHeaders: {
    'cache-control': 'public, max-age=86400',
    'content-encoding': 'br',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
  },
  cwvMetrics: { lcp: 1800, inp: 120, cls: 0.05, fcp: 1200, ttfb: 380 },
  ttfbMs: 380,
  contentEncoding: 'br',

  canonicalUrl: 'https://seoknowledgebase.com/what-is-semantic-seo',
  statusCode: 200,
  responseTimeMs: 380,
  sitemapUrls: ['https://seoknowledgebase.com/what-is-semantic-seo'],
  targetKeyword: 'what is semantic seo',
  otherUrls: ['https://seoknowledgebase.com/eav-triples', 'https://seoknowledgebase.com/topical-authority'],

  robotsTxt: 'User-agent: *\nAllow: /\nSitemap: https://seoknowledgebase.com/sitemap.xml',
  pageCentralEntity: 'Semantic SEO',
  pageTargetQuery: 'what is semantic seo',
  siteCentralEntity: 'Semantic SEO',
  allPageUrls: [
    'https://seoknowledgebase.com/what-is-semantic-seo',
    'https://seoknowledgebase.com/eav-triples',
    'https://seoknowledgebase.com/topical-authority',
  ],
  allPageTargetQueries: ['what is semantic seo', 'eav triples seo', 'topical authority'],
  allPageCentralEntities: ['Semantic SEO', 'EAV Triples', 'Topical Authority'],

  targetQuery: 'what is semantic seo',
  totalWords: 2200,
  authorInfo: { name: 'Dr. Sarah Chen', bio: 'PhD in Information Retrieval, 15 years in search engine research. Published 30+ papers on semantic search and entity recognition.' },
};
