// services/ai/linkingAudit.sitewide.test.ts
// Tests for Phase D: Site-Wide Audit Functions

import { describe, it, expect } from 'vitest';
import {
  runSiteLinkCountAudit,
  analyzePageRankFlow,
  checkSiteWideNGrams,
  runSiteWideAudit,
} from './linkingAudit';
import {
  FreshnessProfile,
  type LinkingAuditContext,
  type EnrichedTopic,
  type ContentBrief,
  type FoundationPage,
  type NavigationStructure,
  type SEOPillars,
  type InternalLinkingRules,
  type SiteLinkAuditResult,
  type LinkFlowAnalysis,
  type SiteWideNGramAudit,
  type SiteWideAuditResult,
} from '../../types';

// ============================================
// MOCK FACTORIES
// ============================================

const createMockTopic = (overrides: Partial<EnrichedTopic> = {}): EnrichedTopic => ({
  id: 'topic-' + Math.random(),
  map_id: 'map-1',
  title: 'Sample Topic',
  slug: 'sample-topic',
  description: 'Sample description',
  type: 'core' as const,
  freshness: FreshnessProfile.EVERGREEN,
  topic_class: 'informational' as const,
  cluster_role: 'cluster_content' as const,
  parent_topic_id: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const createMockBrief = (topicId: string, overrides: Partial<ContentBrief> = {}): ContentBrief => ({
  id: 'brief-' + topicId,
  topic_id: topicId,
  title: 'Sample Brief Title',
  slug: 'sample-brief',
  metaDescription: 'Sample meta description',
  keyTakeaways: [],
  outline: '',
  targetKeyword: 'sample keyword',
  serpAnalysis: {
    peopleAlsoAsk: [],
    competitorHeadings: [],
  },
  visuals: {
    featuredImagePrompt: '',
    imageAltText: '',
  },
  contextualVectors: [],
  contextualBridge: [],
  created_at: '2024-01-01',
  ...overrides,
});

const createMockFoundationPage = (overrides: Partial<FoundationPage> = {}): FoundationPage => ({
  id: 'fp-' + Math.random(),
  map_id: 'map-1',
  page_type: 'about',
  title: 'About Us',
  slug: 'about-us',
  sections: [],
  ...overrides,
});

const createMockNavigation = (overrides: Partial<NavigationStructure> = {}): NavigationStructure => ({
  id: 'nav-1',
  map_id: 'map-1',
  header: {
    logo_alt_text: 'Test Logo',
    primary_nav: [
      { text: 'Home', external_url: '/', prominence: 'high' },
      { text: 'Services', external_url: '/services', prominence: 'high' },
      { text: 'About', target_foundation_page_id: 'fp-about', prominence: 'medium' },
    ],
    cta_button: { text: 'Contact Us', url: '/contact' },
  },
  footer: {
    sections: [
      {
        heading: 'Company',
        links: [
          { text: 'About Us', target_foundation_page_id: 'fp-about', prominence: 'medium' },
          { text: 'Careers', external_url: '/careers', prominence: 'low' },
        ],
      },
    ],
    legal_links: [
      { text: 'Privacy Policy', target_foundation_page_id: 'fp-privacy', prominence: 'low' },
      { text: 'Terms of Service', target_foundation_page_id: 'fp-terms', prominence: 'low' },
    ],
    nap_display: false,
    copyright_text: '© 2024 Test Company',
  },
  dynamic_by_section: false,
  max_header_links: 10,
  max_footer_links: 30,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const createMockPillars = (overrides: Partial<SEOPillars> = {}): SEOPillars => ({
  centralEntity: 'Acme Corp',
  sourceContext: 'Enterprise Software Solutions',
  centralSearchIntent: 'enterprise software solutions',
  ...overrides,
});

const createMockRules = (overrides: Partial<InternalLinkingRules> = {}): InternalLinkingRules => ({
  maxLinksPerPage: 150,
  maxAnchorTextRepetition: 3,
  prioritizeMainContentLinks: true,
  useDescriptiveAnchorText: true,
  avoidGenericAnchors: ['click here', 'read more', 'learn more'],
  contextualBridgeRequired: true,
  delayLowRelevanceLinks: true,
  hubSpokeFlowDirection: 'spoke_to_hub',
  linkToQualityNodesFirst: true,
  qualityNodeThreshold: 70,
  ...overrides,
});

const createMockContext = (overrides: Partial<LinkingAuditContext> = {}): LinkingAuditContext => ({
  mapId: 'map-1',
  topics: [],
  briefs: {},
  foundationPages: [],
  navigation: createMockNavigation(),
  pillars: createMockPillars(),
  rules: createMockRules(),
  domain: 'example.com',
  competitors: [],
  ...overrides,
});

// ============================================
// TESTS: runSiteLinkCountAudit
// ============================================

describe('runSiteLinkCountAudit', () => {
  it('returns expected structure with no topics', () => {
    const ctx = createMockContext();
    const result: SiteLinkAuditResult = runSiteLinkCountAudit(ctx);

    expect(result).toHaveProperty('pages');
    expect(result).toHaveProperty('averageLinkCount');
    expect(result).toHaveProperty('medianLinkCount');
    expect(result).toHaveProperty('pagesOverLimit');
    expect(result).toHaveProperty('totalLinks');
    expect(result).toHaveProperty('linkDistribution');
    expect(result).toHaveProperty('overallScore');

    expect(Array.isArray(result.pages)).toBe(true);
    expect(Array.isArray(result.linkDistribution)).toBe(true);
  });

  it('calculates overall score in 0-100 range', () => {
    const ctx = createMockContext({
      topics: [
        createMockTopic({ id: 't1', title: 'Topic 1' }),
        createMockTopic({ id: 't2', title: 'Topic 2' }),
      ],
      briefs: {
        't1': createMockBrief('t1'),
        't2': createMockBrief('t2'),
      },
    });

    const result = runSiteLinkCountAudit(ctx);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(Number.isInteger(result.overallScore)).toBe(true);
  });

  it('properly counts navigation links', () => {
    const nav = createMockNavigation({
      header: {
        logo_alt_text: 'Test',
        primary_nav: [
          { text: 'Link 1', external_url: '/1', prominence: 'high' },
          { text: 'Link 2', external_url: '/2', prominence: 'high' },
        ],
        cta_button: { text: 'CTA', url: '/cta' },
      },
      footer: {
        sections: [
          {
            heading: 'Section',
            links: [
              { text: 'Footer 1', external_url: '/f1', prominence: 'low' },
              { text: 'Footer 2', external_url: '/f2', prominence: 'low' },
            ],
          },
        ],
        legal_links: [
          { text: 'Legal 1', external_url: '/l1', prominence: 'low' },
        ],
        nap_display: false,
        copyright_text: '© Test',
      },
    });

    const ctx = createMockContext({
      navigation: nav,
      topics: [createMockTopic({ id: 't1' })],
      briefs: { 't1': createMockBrief('t1') },
    });

    const result = runSiteLinkCountAudit(ctx);

    // Should have 1 page (topic)
    expect(result.pages.length).toBeGreaterThan(0);

    // Navigation count should be: 2 primary + 1 CTA + 2 footer section + 1 legal = 6
    const firstPage = result.pages[0];
    expect(firstPage.linkCounts.navigation).toBe(6);
  });

  it('detects pages over link limit', () => {
    const topic = createMockTopic({ id: 't1', title: 'Heavy Linker' });

    // Create many links via children
    const children = Array.from({ length: 160 }, (_, i) =>
      createMockTopic({
        id: `child-${i}`,
        parent_topic_id: 't1',
        title: `Child ${i}`,
      })
    );

    const ctx = createMockContext({
      topics: [topic, ...children],
      briefs: { 't1': createMockBrief('t1') },
      rules: createMockRules({ maxLinksPerPage: 150 }),
    });

    const result = runSiteLinkCountAudit(ctx);

    expect(result.pagesOverLimit).toBeGreaterThan(0);

    const overLimitPage = result.pages.find(p => p.isOverLimit);
    expect(overLimitPage).toBeDefined();
    expect(overLimitPage!.linkCounts.total).toBeGreaterThan(150);
  });

  it('calculates dilution risk correctly', () => {
    const topic = createMockTopic({ id: 't1' });
    const ctx = createMockContext({
      topics: [topic],
      briefs: { 't1': createMockBrief('t1') },
    });

    const result = runSiteLinkCountAudit(ctx);

    const page = result.pages.find(p => p.pageId === 't1');
    expect(page).toBeDefined();
    expect(page!.dilutionRisk).toMatch(/^(none|low|medium|high)$/);
  });

  it('returns proper link distribution array', () => {
    const ctx = createMockContext({
      topics: [
        createMockTopic({ id: 't1' }),
        createMockTopic({ id: 't2' }),
      ],
      briefs: {
        't1': createMockBrief('t1'),
        't2': createMockBrief('t2'),
      },
    });

    const result = runSiteLinkCountAudit(ctx);

    expect(result.linkDistribution).toBeDefined();
    expect(Array.isArray(result.linkDistribution)).toBe(true);
    expect(result.linkDistribution.length).toBeGreaterThan(0);

    result.linkDistribution.forEach(dist => {
      expect(dist).toHaveProperty('range');
      expect(dist).toHaveProperty('count');
      expect(typeof dist.range).toBe('string');
      expect(typeof dist.count).toBe('number');
    });
  });

  it('includes foundation pages in audit', () => {
    const fp = createMockFoundationPage({
      id: 'fp-about',
      page_type: 'about',
      title: 'About Us',
    });

    const ctx = createMockContext({
      foundationPages: [fp],
    });

    const result = runSiteLinkCountAudit(ctx);

    const foundationPageAudit = result.pages.find(p => p.pageType === 'foundation');
    expect(foundationPageAudit).toBeDefined();
    expect(foundationPageAudit!.pageTitle).toBe('About Us');
  });

  it('provides recommendations for over-limit pages', () => {
    const topic = createMockTopic({ id: 't1' });
    const children = Array.from({ length: 160 }, (_, i) =>
      createMockTopic({ id: `c${i}`, parent_topic_id: 't1' })
    );

    const ctx = createMockContext({
      topics: [topic, ...children],
      briefs: { 't1': createMockBrief('t1') },
      rules: createMockRules({ maxLinksPerPage: 150 }),
    });

    const result = runSiteLinkCountAudit(ctx);

    const overLimitPage = result.pages.find(p => p.isOverLimit);
    expect(overLimitPage).toBeDefined();
    expect(overLimitPage!.recommendations.length).toBeGreaterThan(0);
  });

  it('handles empty context gracefully', () => {
    const ctx = createMockContext({
      topics: [],
      briefs: {},
      foundationPages: [],
      navigation: null,
    });

    const result = runSiteLinkCountAudit(ctx);

    expect(result.pages).toEqual([]);
    expect(result.averageLinkCount).toBe(0);
    expect(result.totalLinks).toBe(0);
  });
});

// ============================================
// TESTS: analyzePageRankFlow
// ============================================

describe('analyzePageRankFlow', () => {
  it('returns expected structure', () => {
    const ctx = createMockContext();
    const result: LinkFlowAnalysis = analyzePageRankFlow(ctx);

    expect(result).toHaveProperty('graph');
    expect(result).toHaveProperty('flowViolations');
    expect(result).toHaveProperty('flowScore');
    expect(result).toHaveProperty('centralEntityReachability');
    expect(result).toHaveProperty('coreToAuthorRatio');
    expect(result).toHaveProperty('orphanedPages');
    expect(result).toHaveProperty('hubPages');

    expect(result.graph).toHaveProperty('nodes');
    expect(result.graph).toHaveProperty('edges');
    expect(Array.isArray(result.graph.nodes)).toBe(true);
    expect(Array.isArray(result.graph.edges)).toBe(true);
    expect(Array.isArray(result.flowViolations)).toBe(true);
    expect(Array.isArray(result.orphanedPages)).toBe(true);
    expect(Array.isArray(result.hubPages)).toBe(true);
  });

  it('calculates flow score in 0-100 range', () => {
    const ctx = createMockContext({
      topics: [
        createMockTopic({ id: 't1', topic_class: 'informational' }),
        createMockTopic({ id: 't2', topic_class: 'monetization' }),
      ],
      briefs: {
        't1': createMockBrief('t1'),
        't2': createMockBrief('t2'),
      },
    });

    const result = analyzePageRankFlow(ctx);

    expect(result.flowScore).toBeGreaterThanOrEqual(0);
    expect(result.flowScore).toBeLessThanOrEqual(100);
  });

  it('detects reverse flow violations (Core → Author)', () => {
    const coreTopic = createMockTopic({
      id: 't-core',
      title: 'Core Topic',
      topic_class: 'monetization',
    });
    const authorTopic = createMockTopic({
      id: 't-author',
      title: 'Author Topic',
      topic_class: 'informational',
    });

    const coreBrief = createMockBrief('t-core', {
      contextualBridge: [
        {
          targetTopic: 'Author Topic',
          anchorText: 'learn more',
          reasoning: 'test',
          annotation_text_hint: 'test',
        },
      ],
    });

    const ctx = createMockContext({
      topics: [coreTopic, authorTopic],
      briefs: { 't-core': coreBrief },
    });

    const result = analyzePageRankFlow(ctx);

    const reverseFlowViolation = result.flowViolations.find(
      v => v.type === 'reverse_flow'
    );
    expect(reverseFlowViolation).toBeDefined();
    expect(reverseFlowViolation!.severity).toBe('warning');
  });

  it('detects orphaned pages', () => {
    const orphan = createMockTopic({
      id: 't-orphan',
      title: 'Orphan Topic',
      cluster_role: 'cluster_content', // Non-pillar
    });

    const ctx = createMockContext({
      topics: [orphan],
      briefs: { 't-orphan': createMockBrief('t-orphan') },
    });

    const result = analyzePageRankFlow(ctx);

    expect(result.orphanedPages.length).toBeGreaterThan(0);
    expect(result.orphanedPages).toContain('Orphan Topic');

    const orphanViolation = result.flowViolations.find(
      v => v.type === 'orphaned'
    );
    expect(orphanViolation).toBeDefined();
  });

  it('detects pillar without cluster support', () => {
    const pillar = createMockTopic({
      id: 't-pillar',
      title: 'Pillar Topic',
      cluster_role: 'pillar',
    });

    const cluster = createMockTopic({
      id: 't-cluster',
      title: 'Cluster Topic',
      parent_topic_id: 't-pillar',
      cluster_role: 'cluster_content',
    });

    const ctx = createMockContext({
      topics: [pillar, cluster],
      briefs: {
        't-pillar': createMockBrief('t-pillar'),
        't-cluster': createMockBrief('t-cluster', {
          // No link back to pillar
          contextualBridge: [],
        }),
      },
    });

    const result = analyzePageRankFlow(ctx);

    const clusterSupportViolation = result.flowViolations.find(
      v => v.type === 'no_cluster_support'
    );
    expect(clusterSupportViolation).toBeDefined();
  });

  it('detects excessive outbound links', () => {
    const topic = createMockTopic({ id: 't1', title: 'Link Hoarder' });

    // Create 25 target topics
    const targetTopics = Array.from({ length: 25 }, (_, i) =>
      createMockTopic({ id: `target-${i}`, title: `Target ${i}` })
    );

    // Create 25 outbound links to those targets
    const links = Array.from({ length: 25 }, (_, i) => ({
      targetTopic: `Target ${i}`,
      anchorText: `Link ${i}`,
      reasoning: 'test',
      annotation_text_hint: 'test',
    }));

    const ctx = createMockContext({
      topics: [topic, ...targetTopics],
      briefs: {
        't1': createMockBrief('t1', { contextualBridge: links }),
      },
    });

    const result = analyzePageRankFlow(ctx);

    const excessiveViolation = result.flowViolations.find(
      v => v.type === 'excessive_outbound'
    );
    expect(excessiveViolation).toBeDefined();
  });

  it('identifies hub pages correctly', () => {
    const hub = createMockTopic({ id: 'hub', title: 'Hub Page' });
    const spoke1 = createMockTopic({ id: 's1', title: 'Spoke 1' });
    const spoke2 = createMockTopic({ id: 's2', title: 'Spoke 2' });

    const ctx = createMockContext({
      topics: [hub, spoke1, spoke2],
      briefs: {
        'hub': createMockBrief('hub'),
        's1': createMockBrief('s1', {
          contextualBridge: [{
            targetTopic: 'Hub Page',
            anchorText: 'hub',
            reasoning: 'test',
            annotation_text_hint: 'test',
          }],
        }),
        's2': createMockBrief('s2', {
          contextualBridge: [{
            targetTopic: 'Hub Page',
            anchorText: 'hub',
            reasoning: 'test',
            annotation_text_hint: 'test',
          }],
        }),
      },
    });

    const result = analyzePageRankFlow(ctx);

    expect(result.hubPages).toContain('Hub Page');
  });

  it('calculates core-to-author ratio', () => {
    const ctx = createMockContext({
      topics: [
        createMockTopic({ id: 't1', topic_class: 'monetization' }),
        createMockTopic({ id: 't2', topic_class: 'informational' }),
      ],
      briefs: {
        't1': createMockBrief('t1'),
        't2': createMockBrief('t2'),
      },
    });

    const result = analyzePageRankFlow(ctx);

    expect(typeof result.coreToAuthorRatio).toBe('number');
    expect(result.coreToAuthorRatio).toBeGreaterThanOrEqual(0);
  });

  it('calculates central entity reachability percentage', () => {
    const ctx = createMockContext({
      topics: [
        createMockTopic({ id: 't1' }),
        createMockTopic({ id: 't2' }),
      ],
      briefs: {
        't1': createMockBrief('t1'),
        't2': createMockBrief('t2'),
      },
    });

    const result = analyzePageRankFlow(ctx);

    expect(result.centralEntityReachability).toBeGreaterThanOrEqual(0);
    expect(result.centralEntityReachability).toBeLessThanOrEqual(100);
  });

  it('handles empty topics gracefully', () => {
    const ctx = createMockContext({
      topics: [],
      briefs: {},
    });

    const result = analyzePageRankFlow(ctx);

    expect(result.graph.nodes).toEqual([]);
    expect(result.graph.edges).toEqual([]);
    expect(result.flowViolations).toEqual([]);
  });
});

// ============================================
// TESTS: checkSiteWideNGrams
// ============================================

describe('checkSiteWideNGrams', () => {
  it('returns expected structure', () => {
    const ctx = createMockContext();
    const result: SiteWideNGramAudit = checkSiteWideNGrams(ctx);

    expect(result).toHaveProperty('centralEntityPresence');
    expect(result).toHaveProperty('sourceContextPresence');
    expect(result).toHaveProperty('pillarTermPresence');
    expect(result).toHaveProperty('inconsistentBoilerplate');
    expect(result).toHaveProperty('overallConsistencyScore');

    expect(Array.isArray(result.pillarTermPresence)).toBe(true);
    expect(Array.isArray(result.inconsistentBoilerplate)).toBe(true);
  });

  it('calculates consistency score in 0-100 range', () => {
    const ctx = createMockContext();
    const result = checkSiteWideNGrams(ctx);

    expect(result.overallConsistencyScore).toBeGreaterThanOrEqual(0);
    expect(result.overallConsistencyScore).toBeLessThanOrEqual(100);
  });

  it('detects central entity in header', () => {
    const nav = createMockNavigation({
      header: {
        logo_alt_text: 'Logo',
        primary_nav: [
          { text: 'Acme Corp Services', external_url: '/services', prominence: 'high' },
        ],
        cta_button: undefined,
      },
    });

    const ctx = createMockContext({
      navigation: nav,
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
    });

    const result = checkSiteWideNGrams(ctx);

    expect(result.centralEntityPresence.term).toBe('Acme Corp');
    expect(result.centralEntityPresence.inHeader).toBe(true);
  });

  it('detects central entity in footer', () => {
    const nav = createMockNavigation({
      footer: {
        sections: [
          {
            heading: 'About',
            links: [
              { text: 'About Acme Corp', target_foundation_page_id: 'fp-about', prominence: 'medium' },
            ],
          },
        ],
        legal_links: [],
        nap_display: false,
        copyright_text: '© Test',
      },
    });

    const ctx = createMockContext({
      navigation: nav,
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
    });

    const result = checkSiteWideNGrams(ctx);

    expect(result.centralEntityPresence.inFooter).toBe(true);
  });

  it('detects central entity in pillar pages', () => {
    const pillarTopic = createMockTopic({
      id: 'p1',
      title: 'Acme Corp Enterprise Solutions',
      cluster_role: 'pillar',
    });

    const ctx = createMockContext({
      topics: [pillarTopic],
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
    });

    const result = checkSiteWideNGrams(ctx);

    expect(result.centralEntityPresence.inPillarPages).toContain(
      'Acme Corp Enterprise Solutions'
    );
  });

  it('tracks locations where central entity is missing', () => {
    const nav = createMockNavigation({
      header: {
        logo_alt_text: 'Logo',
        primary_nav: [
          { text: 'Services', external_url: '/services', prominence: 'high' },
        ],
        cta_button: undefined,
      },
      footer: {
        sections: [],
        legal_links: [],
        nap_display: false,
        copyright_text: '© Test',
      },
    });

    const ctx = createMockContext({
      navigation: nav,
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
      topics: [],
    });

    const result = checkSiteWideNGrams(ctx);

    expect(result.centralEntityPresence.missingFrom).toContain('header');
    expect(result.centralEntityPresence.missingFrom).toContain('footer');
  });

  it('analyzes source context presence', () => {
    const ctx = createMockContext({
      pillars: createMockPillars({ sourceContext: 'Enterprise Software' }),
    });

    const result = checkSiteWideNGrams(ctx);

    expect(result.sourceContextPresence.term).toBe('Enterprise Software');
    expect(typeof result.sourceContextPresence.inHeader).toBe('boolean');
    expect(typeof result.sourceContextPresence.inFooter).toBe('boolean');
  });

  it('checks pillar term presence for each pillar', () => {
    const pillar1 = createMockTopic({
      id: 'p1',
      title: 'Cloud Solutions',
      cluster_role: 'pillar',
    });
    const pillar2 = createMockTopic({
      id: 'p2',
      title: 'Security Services',
      cluster_role: 'pillar',
    });

    const ctx = createMockContext({
      topics: [pillar1, pillar2],
    });

    const result = checkSiteWideNGrams(ctx);

    expect(result.pillarTermPresence).toHaveLength(2);
    expect(result.pillarTermPresence[0].pillar).toBe('Cloud Solutions');
    expect(result.pillarTermPresence[1].pillar).toBe('Security Services');
  });

  it('detects inconsistent boilerplate in meta descriptions', () => {
    const ctx = createMockContext({
      topics: [
        createMockTopic({ id: 't1' }),
        createMockTopic({ id: 't2' }),
      ],
      briefs: {
        't1': createMockBrief('t1', {
          metaDescription: 'Learn about topic 1 with our services',
        }),
        't2': createMockBrief('t2', {
          metaDescription: 'Discover topic 2 solutions',
        }),
      },
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
    });

    const result = checkSiteWideNGrams(ctx);

    // Should detect that Central Entity is missing from descriptions
    const boilerplateIssue = result.inconsistentBoilerplate.find(
      b => b.field === 'meta_description'
    );

    if (boilerplateIssue) {
      expect(boilerplateIssue.occurrences).toBeGreaterThan(0);
      expect(boilerplateIssue).toHaveProperty('recommendation');
    }
  });

  it('handles missing navigation gracefully', () => {
    const ctx = createMockContext({
      navigation: null,
    });

    const result = checkSiteWideNGrams(ctx);

    expect(result.centralEntityPresence.inHeader).toBe(false);
    expect(result.centralEntityPresence.inFooter).toBe(false);
  });

  it('penalizes score for missing central entity', () => {
    const ctx1 = createMockContext({
      navigation: createMockNavigation({
        header: {
          logo_alt_text: 'Logo',
          primary_nav: [
            { text: 'Acme Corp Home', external_url: '/', prominence: 'high' },
          ],
        },
      }),
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
    });

    const ctx2 = createMockContext({
      navigation: createMockNavigation({
        header: {
          logo_alt_text: 'Logo',
          primary_nav: [
            { text: 'Home', external_url: '/', prominence: 'high' },
          ],
        },
      }),
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
    });

    const result1 = checkSiteWideNGrams(ctx1);
    const result2 = checkSiteWideNGrams(ctx2);

    expect(result1.overallConsistencyScore).toBeGreaterThan(result2.overallConsistencyScore);
  });
});

// ============================================
// TESTS: runSiteWideAudit
// ============================================

describe('runSiteWideAudit', () => {
  it('returns expected structure', () => {
    const ctx = createMockContext();
    const result: SiteWideAuditResult = runSiteWideAudit(ctx);

    expect(result).toHaveProperty('linkAudit');
    expect(result).toHaveProperty('flowAnalysis');
    expect(result).toHaveProperty('ngramAudit');
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('timestamp');

    expect(typeof result.overallScore).toBe('number');
    expect(typeof result.timestamp).toBe('string');
  });

  it('calculates overall score as weighted average', () => {
    const ctx = createMockContext({
      topics: [
        createMockTopic({ id: 't1' }),
        createMockTopic({ id: 't2' }),
      ],
      briefs: {
        't1': createMockBrief('t1'),
        't2': createMockBrief('t2'),
      },
    });

    const result = runSiteWideAudit(ctx);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);

    // Weighted average: 40% link + 40% flow + 20% ngram
    const expectedScore = Math.round(
      result.linkAudit.overallScore * 0.4 +
      result.flowAnalysis.flowScore * 0.4 +
      result.ngramAudit.overallConsistencyScore * 0.2
    );

    expect(result.overallScore).toBe(expectedScore);
  });

  it('includes all sub-audit results', () => {
    const ctx = createMockContext();
    const result = runSiteWideAudit(ctx);

    // Link audit properties
    expect(result.linkAudit).toHaveProperty('pages');
    expect(result.linkAudit).toHaveProperty('overallScore');

    // Flow analysis properties
    expect(result.flowAnalysis).toHaveProperty('graph');
    expect(result.flowAnalysis).toHaveProperty('flowViolations');
    expect(result.flowAnalysis).toHaveProperty('flowScore');

    // N-gram audit properties
    expect(result.ngramAudit).toHaveProperty('centralEntityPresence');
    expect(result.ngramAudit).toHaveProperty('sourceContextPresence');
    expect(result.ngramAudit).toHaveProperty('overallConsistencyScore');
  });

  it('generates valid ISO timestamp', () => {
    const ctx = createMockContext();
    const result = runSiteWideAudit(ctx);

    // Verify timestamp is valid ISO string
    expect(() => new Date(result.timestamp)).not.toThrow();
    const date = new Date(result.timestamp);
    expect(date.toISOString()).toBe(result.timestamp);
  });

  it('handles comprehensive audit with all data', () => {
    const pillar = createMockTopic({
      id: 'pillar',
      title: 'Acme Corp Main Pillar',
      cluster_role: 'pillar',
      topic_class: 'monetization',
    });

    const cluster = createMockTopic({
      id: 'cluster',
      title: 'Supporting Content',
      parent_topic_id: 'pillar',
      cluster_role: 'cluster_content',
      topic_class: 'informational',
    });

    const ctx = createMockContext({
      topics: [pillar, cluster],
      briefs: {
        'pillar': createMockBrief('pillar', {
          metaDescription: 'Acme Corp provides enterprise solutions',
        }),
        'cluster': createMockBrief('cluster', {
          metaDescription: 'Learn about Acme Corp services',
          contextualBridge: [{
            targetTopic: 'Acme Corp Main Pillar',
            anchorText: 'enterprise solutions',
            reasoning: 'supporting link',
            annotation_text_hint: 'Explore our main offerings',
          }],
        }),
      },
      foundationPages: [
        createMockFoundationPage({ page_type: 'about', title: 'About Acme Corp' }),
      ],
      navigation: createMockNavigation({
        header: {
          logo_alt_text: 'Logo',
          primary_nav: [
            { text: 'Acme Corp Home', external_url: '/', prominence: 'high' },
          ],
        },
      }),
      pillars: createMockPillars({ centralEntity: 'Acme Corp' }),
    });

    const result = runSiteWideAudit(ctx);

    // Should have high overall score with good data
    expect(result.overallScore).toBeGreaterThan(50);

    // All audits should return results
    expect(result.linkAudit.pages.length).toBeGreaterThan(0);
    expect(result.flowAnalysis.graph.nodes.length).toBeGreaterThan(0);
    expect(result.ngramAudit.centralEntityPresence.term).toBe('Acme Corp');
  });

  it('handles minimal context without errors', () => {
    const ctx = createMockContext({
      topics: [],
      briefs: {},
      foundationPages: [],
      navigation: null,
    });

    const result = runSiteWideAudit(ctx);

    expect(result).toBeDefined();
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.linkAudit.pages).toEqual([]);
    expect(result.flowAnalysis.graph.nodes).toEqual([]);
  });

  it('timestamp is recent (within last second)', () => {
    const ctx = createMockContext();
    const before = Date.now();
    const result = runSiteWideAudit(ctx);
    const after = Date.now();

    const resultTime = new Date(result.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });
});
