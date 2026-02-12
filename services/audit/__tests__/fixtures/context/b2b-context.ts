import type { FixtureContext } from './types';

export const b2bContext: FixtureContext = {
  centralEntity: 'Cloud Migration Services',
  sourceContext: {
    businessName: 'CloudShift Solutions',
    industry: 'Enterprise IT Services',
    targetAudience: 'CTOs, IT Directors, and enterprise decision-makers planning cloud migration',
    coreServices: ['Cloud migration', 'Infrastructure assessment', 'Hybrid cloud architecture', 'DevOps consulting'],
    uniqueSellingPoints: ['98% on-time delivery record', 'AWS and Azure dual-certified team', 'Zero-downtime migration methodology'],
  },
  contentSpec: {
    centralEntity: 'Cloud Migration Services',
    targetKeywords: ['enterprise cloud migration services', 'cloud migration consulting', 'cloud infrastructure assessment'],
    requiredAttributes: ['methodology', 'timeline', 'cost', 'security compliance', 'downtime guarantee'],
  },
  sourceContextAttributes: ['methodology', 'timeline', 'cost', 'security compliance'],
  csiPredicates: ['hire', 'consult', 'evaluate'],
  eavs: [
    { entity: 'Cloud Migration Services', attribute: 'methodology', value: '6-phase migration framework', category: 'ROOT' },
    { entity: 'Cloud Migration Services', attribute: 'timeline', value: '3-12 months depending on scope', category: 'ROOT' },
    { entity: 'Cloud Migration Services', attribute: 'downtime guarantee', value: 'zero-downtime for Tier 1 apps', category: 'UNIQUE' },
    { entity: 'Cloud Migration Services', attribute: 'certifications', value: 'AWS, Azure, GCP certified', category: 'COMMON' },
    { entity: 'Cloud Migration Services', attribute: 'compliance', value: 'SOC 2, HIPAA, GDPR ready', category: 'COMMON' },
    { entity: 'Cloud Migration Services', attribute: 'support model', value: '24/7 dedicated team', category: 'RARE' },
  ],
  rootAttributes: ['methodology', 'timeline'],
  pageTopic: 'Enterprise Cloud Migration Services',
  otherPages: [
    { url: 'https://cloudshift.com/case-studies', topic: 'Case Studies' },
    { url: 'https://cloudshift.com/hybrid-cloud', topic: 'Hybrid Cloud Solutions' },
    { url: 'https://cloudshift.com/devops', topic: 'DevOps Consulting' },
  ],
  relatedPages: [
    { url: 'https://cloudshift.com/case-studies', topic: 'Case Studies', anchorText: 'view our case studies' },
    { url: 'https://cloudshift.com/hybrid-cloud', topic: 'Hybrid Cloud Solutions', anchorText: 'hybrid cloud solutions' },
  ],
  keyAttributes: ['methodology', 'timeline', 'cost', 'security compliance', 'downtime guarantee'],
  websiteType: 'b2b',
  eavTriples: [
    { entity: 'Cloud Migration Services', attribute: 'methodology', value: '6-phase migration framework' },
    { entity: 'Cloud Migration Services', attribute: 'timeline', value: '3-12 months depending on scope' },
    { entity: 'Cloud Migration Services', attribute: 'downtime guarantee', value: 'zero-downtime for Tier 1 apps' },
  ],

  httpHeaders: { 'content-encoding': 'identity' }, // No compression
  cwvMetrics: { lcp: 4500, inp: 450, cls: 0.30, fcp: 3000, ttfb: 1200 },
  ttfbMs: 1200,
  contentEncoding: 'identity',

  // Deep URL path — triggers URL architecture finding
  statusCode: 200,
  responseTimeMs: 1200,
  sitemapUrls: ['https://cloudshift.com/services/cloud/enterprise/migration/overview'],
  targetKeyword: 'enterprise cloud migration services',
  otherUrls: ['https://cloudshift.com/case-studies', 'https://cloudshift.com/hybrid-cloud'],

  robotsTxt: 'User-agent: *\nAllow: /',
  pageCentralEntity: 'Cloud Migration Services',
  pageTargetQuery: 'enterprise cloud migration services',
  siteCentralEntity: 'CloudShift Solutions',
  allPageUrls: [
    'https://cloudshift.com/services/cloud/enterprise/migration/overview',
    'https://cloudshift.com/case-studies',
    'https://cloudshift.com/hybrid-cloud',
  ],
  allPageTargetQueries: ['enterprise cloud migration services', 'cloud migration case studies', 'hybrid cloud solutions'],
  allPageCentralEntities: ['Cloud Migration Services', 'Case Studies', 'Hybrid Cloud'],

  targetQuery: 'enterprise cloud migration services',
  totalWords: 900,
};
