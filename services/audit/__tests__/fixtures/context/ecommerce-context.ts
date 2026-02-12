import type { FixtureContext } from './types';

export const ecommerceContext: FixtureContext = {
  centralEntity: 'Ergonomic Standing Desk',
  sourceContext: {
    businessName: 'DeskPro Store',
    industry: 'Office Furniture E-commerce',
    targetAudience: 'Remote workers and office professionals seeking ergonomic furniture',
    coreServices: ['Standing desks', 'Ergonomic chairs', 'Office accessories'],
    uniqueSellingPoints: ['10-year warranty', 'Free assembly service', 'Height-adjustable electric motors'],
  },
  contentSpec: {
    centralEntity: 'Ergonomic Standing Desk',
    targetKeywords: ['ergonomic standing desk', 'standing desk pro x1', 'electric standing desk'],
    requiredAttributes: ['price', 'dimensions', 'weight capacity', 'motor type', 'warranty'],
  },
  sourceContextAttributes: ['price', 'dimensions', 'weight capacity', 'motor type'],
  csiPredicates: ['buy', 'order', 'compare'],
  eavs: [
    { entity: 'Ergonomic Standing Desk', attribute: 'price', value: '$599', category: 'ROOT' },
    { entity: 'Ergonomic Standing Desk', attribute: 'weight capacity', value: '300 lbs', category: 'ROOT' },
    { entity: 'Ergonomic Standing Desk', attribute: 'motor type', value: 'dual electric', category: 'UNIQUE' },
    { entity: 'Ergonomic Standing Desk', attribute: 'height range', value: '28-48 inches', category: 'UNIQUE' },
    { entity: 'Ergonomic Standing Desk', attribute: 'warranty', value: '10 years', category: 'COMMON' },
    { entity: 'Ergonomic Standing Desk', attribute: 'desktop material', value: 'bamboo and MDF', category: 'COMMON' },
    { entity: 'Ergonomic Standing Desk', attribute: 'assembly', value: 'free professional assembly', category: 'RARE' },
  ],
  rootAttributes: ['price', 'weight capacity'],
  pageTopic: 'Ergonomic Standing Desk Pro X1',
  otherPages: [
    { url: 'https://deskprostore.com/standing-desks', topic: 'All Standing Desks' },
    { url: 'https://deskprostore.com/ergonomic-chairs', topic: 'Ergonomic Chairs' },
    { url: 'https://deskprostore.com/desk-accessories', topic: 'Desk Accessories' },
  ],
  relatedPages: [
    { url: 'https://deskprostore.com/standing-desks', topic: 'All Standing Desks', anchorText: 'browse all standing desks' },
    { url: 'https://deskprostore.com/desk-accessories', topic: 'Desk Accessories', anchorText: 'desk accessories' },
  ],
  keyAttributes: ['price', 'dimensions', 'weight capacity', 'motor type', 'warranty'],
  websiteType: 'ecommerce',
  eavTriples: [
    { entity: 'Ergonomic Standing Desk', attribute: 'price', value: '$599' },
    { entity: 'Ergonomic Standing Desk', attribute: 'weight capacity', value: '300 lbs' },
    { entity: 'Ergonomic Standing Desk', attribute: 'motor type', value: 'dual electric' },
  ],

  httpHeaders: { 'cache-control': 'max-age=60', 'content-encoding': 'gzip' },
  cwvMetrics: { lcp: 4200, inp: 400, cls: 0.28, fcp: 2800, ttfb: 1100, domNodes: 2500 },
  ttfbMs: 1100,
  contentEncoding: 'gzip',

  statusCode: 200,
  responseTimeMs: 1100,
  sitemapUrls: ['https://deskprostore.com/standing-desk-pro-x1'],
  targetKeyword: 'ergonomic standing desk',
  otherUrls: ['https://deskprostore.com/standing-desks', 'https://deskprostore.com/ergonomic-chairs'],

  robotsTxt: 'User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /checkout',
  pageCentralEntity: 'Ergonomic Standing Desk',
  pageTargetQuery: 'ergonomic standing desk pro x1',
  siteCentralEntity: 'Office Furniture',
  allPageUrls: [
    'https://deskprostore.com/standing-desk-pro-x1',
    'https://deskprostore.com/standing-desks',
    'https://deskprostore.com/ergonomic-chairs',
  ],
  allPageTargetQueries: ['ergonomic standing desk pro x1', 'standing desks', 'ergonomic chairs'],
  allPageCentralEntities: ['Ergonomic Standing Desk', 'Standing Desks', 'Ergonomic Chairs'],

  targetQuery: 'ergonomic standing desk pro x1',
  totalWords: 800,
  schemaTypes: ['Product'],
  authorInfo: undefined, // E-commerce — no author
};
