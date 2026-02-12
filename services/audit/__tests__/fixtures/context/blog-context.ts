import type { FixtureContext } from './types';

export const blogContext: FixtureContext = {
  // Semantic SEO
  centralEntity: 'CRM Software',
  sourceContext: {
    businessName: 'TechReview Hub',
    industry: 'Software Reviews',
    targetAudience: 'Small business owners looking for CRM solutions',
    coreServices: ['Software comparisons', 'Product reviews', 'Buying guides'],
    uniqueSellingPoints: ['Hands-on testing methodology', '500+ software reviews'],
  },
  contentSpec: {
    centralEntity: 'CRM Software',
    targetKeywords: ['best crm software small business', 'crm for small business', 'small business crm'],
    requiredAttributes: ['pricing', 'features', 'ease of use', 'integrations', 'customer support'],
  },
  sourceContextAttributes: ['pricing', 'features', 'ease of use', 'integrations'],
  csiPredicates: ['compare', 'evaluate', 'choose'],
  eavs: [
    { entity: 'CRM Software', attribute: 'pricing', value: 'varies by vendor', category: 'ROOT' },
    { entity: 'CRM Software', attribute: 'target user', value: 'small business owners', category: 'ROOT' },
    { entity: 'CRM Software', attribute: 'key feature', value: 'contact management', category: 'UNIQUE' },
    { entity: 'CRM Software', attribute: 'integration', value: 'email and calendar sync', category: 'COMMON' },
    { entity: 'CRM Software', attribute: 'deployment', value: 'cloud-based SaaS', category: 'COMMON' },
    { entity: 'CRM Software', attribute: 'scalability', value: 'grows with team size', category: 'RARE' },
  ],
  rootAttributes: ['pricing', 'target user'],
  pageTopic: 'Best CRM Software for Small Business',
  otherPages: [
    { url: 'https://techreviewhub.com/crm-features', topic: 'CRM Features Explained' },
    { url: 'https://techreviewhub.com/crm-pricing', topic: 'CRM Pricing Comparison 2026' },
    { url: 'https://techreviewhub.com/salesforce-review', topic: 'Salesforce Review' },
  ],
  relatedPages: [
    { url: 'https://techreviewhub.com/crm-features', topic: 'CRM Features Explained', anchorText: 'CRM features' },
    { url: 'https://techreviewhub.com/crm-pricing', topic: 'CRM Pricing Comparison 2026', anchorText: 'pricing comparison' },
  ],
  keyAttributes: ['pricing', 'features', 'ease of use', 'integrations', 'customer support'],
  websiteType: 'blog',
  eavTriples: [
    { entity: 'CRM Software', attribute: 'pricing', value: 'varies by vendor' },
    { entity: 'CRM Software', attribute: 'target user', value: 'small business owners' },
    { entity: 'CRM Software', attribute: 'key feature', value: 'contact management' },
  ],

  // Infrastructure / Performance
  httpHeaders: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  cwvMetrics: { lcp: 3800, inp: 320, cls: 0.22, fcp: 2400, ttfb: 950 },
  ttfbMs: 950,
  contentEncoding: 'identity', // No compression — triggers CoR finding

  // URL Architecture
  statusCode: 200,
  responseTimeMs: 950,
  sitemapUrls: ['https://techreviewhub.com/best-crm-software-small-business'],
  targetKeyword: 'best crm software small business',
  otherUrls: ['https://techreviewhub.com/crm-features', 'https://techreviewhub.com/crm-pricing'],

  // Cross-Page Consistency
  robotsTxt: 'User-agent: *\nAllow: /',
  pageCentralEntity: 'CRM Software',
  pageTargetQuery: 'best crm software small business',
  siteCentralEntity: 'Software Reviews',
  allPageUrls: [
    'https://techreviewhub.com/best-crm-software-small-business',
    'https://techreviewhub.com/crm-features',
    'https://techreviewhub.com/crm-pricing',
  ],
  allPageTargetQueries: ['best crm software small business', 'crm features', 'crm pricing comparison'],
  allPageCentralEntities: ['CRM Software', 'CRM Features', 'CRM Pricing'],

  // Content Format
  targetQuery: 'best crm software small business',
  totalWords: 1200,
};
