import type { FixtureContext } from './types';

export const saasContext: FixtureContext = {
  centralEntity: 'Project Management Software',
  sourceContext: {
    businessName: 'ProjectFlow',
    industry: 'SaaS Project Management',
    targetAudience: 'Development teams and project managers seeking agile workflow tools',
    coreServices: ['Task management', 'Sprint planning', 'Team collaboration', 'Time tracking'],
    uniqueSellingPoints: ['AI-powered sprint estimation', 'Native Git integration', 'Real-time collaboration'],
  },
  contentSpec: {
    centralEntity: 'Project Management Software',
    targetKeywords: ['project management software', 'projectflow', 'agile project management tool'],
    requiredAttributes: ['pricing', 'features', 'integrations', 'team size support', 'security'],
  },
  sourceContextAttributes: ['pricing', 'features', 'integrations', 'team size support'],
  csiPredicates: ['try', 'subscribe', 'compare'],
  eavs: [
    { entity: 'Project Management Software', attribute: 'pricing', value: 'from $12/user/month', category: 'ROOT' },
    { entity: 'Project Management Software', attribute: 'max team size', value: 'unlimited', category: 'ROOT' },
    { entity: 'Project Management Software', attribute: 'AI estimation', value: 'sprint velocity prediction', category: 'UNIQUE' },
    { entity: 'Project Management Software', attribute: 'integration', value: 'GitHub, GitLab, Jira', category: 'COMMON' },
    { entity: 'Project Management Software', attribute: 'security', value: 'SOC 2 Type II certified', category: 'COMMON' },
    { entity: 'Project Management Software', attribute: 'uptime SLA', value: '99.9%', category: 'RARE' },
  ],
  rootAttributes: ['pricing', 'max team size'],
  pageTopic: 'ProjectFlow - Project Management Software',
  otherPages: [
    { url: 'https://projectflow.io/features', topic: 'Features' },
    { url: 'https://projectflow.io/pricing', topic: 'Pricing Plans' },
    { url: 'https://projectflow.io/integrations', topic: 'Integrations' },
  ],
  relatedPages: [
    { url: 'https://projectflow.io/features', topic: 'Features', anchorText: 'explore all features' },
    { url: 'https://projectflow.io/pricing', topic: 'Pricing Plans', anchorText: 'view pricing' },
  ],
  keyAttributes: ['pricing', 'features', 'integrations', 'team size support', 'security'],
  websiteType: 'saas',
  eavTriples: [
    { entity: 'Project Management Software', attribute: 'pricing', value: 'from $12/user/month' },
    { entity: 'Project Management Software', attribute: 'max team size', value: 'unlimited' },
    { entity: 'Project Management Software', attribute: 'AI estimation', value: 'sprint velocity prediction' },
  ],

  httpHeaders: { 'cache-control': 'public, max-age=3600' },
  cwvMetrics: { lcp: 3500, inp: 280, cls: 0.15, fcp: 2000, ttfb: 700 },
  ttfbMs: 700,
  contentEncoding: 'br',

  statusCode: 200,
  responseTimeMs: 700,
  sitemapUrls: ['https://projectflow.io/', 'https://projectflow.io/features', 'https://projectflow.io/pricing'],
  targetKeyword: 'project management software',
  otherUrls: ['https://projectflow.io/features', 'https://projectflow.io/pricing'],

  robotsTxt: 'User-agent: *\nAllow: /\nSitemap: https://projectflow.io/sitemap.xml',
  pageCentralEntity: 'Project Management Software',
  pageTargetQuery: 'project management software',
  siteCentralEntity: 'ProjectFlow',
  allPageUrls: ['https://projectflow.io/', 'https://projectflow.io/features', 'https://projectflow.io/pricing'],
  allPageTargetQueries: ['project management software', 'project management features', 'project management pricing'],
  allPageCentralEntities: ['Project Management Software', 'Features', 'Pricing'],

  targetQuery: 'project management software',
  totalWords: 1000,
  schemaTypes: ['SoftwareApplication'],
};
