// services/navigationService.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectSegment,
  getDefaultRule,
  createDefaultConfig,
  generateDynamicNavigation,
  previewNavigationForAllSegments,
  type DynamicNavigationContext,
} from './navigationService';
import {
  FreshnessProfile,
  type EnrichedTopic,
  type FoundationPage,
  type NavigationStructure,
  type DynamicNavigationConfig,
  type NavigationSegment,
} from '../types';

// ============================================
// MOCK FACTORIES
// ============================================

function createMockTopic(overrides: Partial<EnrichedTopic> = {}): EnrichedTopic {
  return {
    id: overrides.id || 'topic-1',
    map_id: overrides.map_id || 'map-1',
    parent_topic_id: overrides.parent_topic_id || null,
    title: overrides.title || 'Test Topic',
    slug: overrides.slug || 'test-topic',
    description: overrides.description || 'Test description',
    type: overrides.type || 'core',
    freshness: overrides.freshness || FreshnessProfile.STANDARD,
    topic_class: overrides.topic_class,
    cluster_role: overrides.cluster_role,
    attribute_focus: overrides.attribute_focus,
    canonical_query: overrides.canonical_query,
    query_network: overrides.query_network,
    query_type: overrides.query_type,
    topical_border_note: overrides.topical_border_note,
    planned_publication_date: overrides.planned_publication_date,
    url_slug_hint: overrides.url_slug_hint,
    blueprint: overrides.blueprint,
    decay_score: overrides.decay_score,
    metadata: overrides.metadata || {},
  };
}

function createMockFoundationPage(overrides: Partial<FoundationPage> = {}): FoundationPage {
  return {
    id: overrides.id || 'fp-1',
    map_id: overrides.map_id || 'map-1',
    user_id: overrides.user_id || 'user-1',
    page_type: overrides.page_type || 'about',
    title: overrides.title || 'About Us',
    slug: overrides.slug || 'about',
    meta_description: overrides.meta_description,
    h1_template: overrides.h1_template,
    schema_type: overrides.schema_type,
    sections: overrides.sections,
    nap_data: overrides.nap_data,
    deleted_at: overrides.deleted_at,
    deletion_reason: overrides.deletion_reason,
    metadata: overrides.metadata || {},
    created_at: overrides.created_at,
    updated_at: overrides.updated_at,
  };
}

function createMockNavigationStructure(overrides: Partial<NavigationStructure> = {}): NavigationStructure {
  return {
    id: overrides.id || 'nav-1',
    map_id: overrides.map_id || 'map-1',
    header: overrides.header || {
      logo_alt_text: 'Logo',
      primary_nav: [],
    },
    footer: overrides.footer || {
      sections: [],
      legal_links: [],
      nap_display: true,
      copyright_text: '© 2025',
    },
    max_header_links: overrides.max_header_links || 10,
    max_footer_links: overrides.max_footer_links || 30,
    dynamic_by_section: overrides.dynamic_by_section !== undefined ? overrides.dynamic_by_section : false,
    metadata: overrides.metadata || {},
    created_at: overrides.created_at,
    updated_at: overrides.updated_at,
  };
}

function createMockDynamicNavigationConfig(overrides: Partial<DynamicNavigationConfig> = {}): DynamicNavigationConfig {
  return {
    enabled: overrides.enabled !== undefined ? overrides.enabled : false,
    rules: overrides.rules || [],
    defaultSegment: overrides.defaultSegment,
    fallbackToStatic: overrides.fallbackToStatic !== undefined ? overrides.fallbackToStatic : true,
  };
}

function createMockContext(overrides: Partial<DynamicNavigationContext> = {}): DynamicNavigationContext {
  return {
    currentPageId: overrides.currentPageId || 'topic-1',
    currentPageType: overrides.currentPageType || 'topic',
    topics: overrides.topics || [],
    foundationPages: overrides.foundationPages || [],
    baseNavigation: overrides.baseNavigation || createMockNavigationStructure(),
    config: overrides.config || createMockDynamicNavigationConfig(),
  };
}

// ============================================
// DETECT SEGMENT TESTS
// ============================================

describe('detectSegment', () => {
  it('returns "foundation" for foundation page type', () => {
    const topics: EnrichedTopic[] = [];
    const result = detectSegment('fp-1', 'foundation', topics);
    expect(result).toBe('foundation');
  });

  it('returns "pillar" for topic with cluster_role="pillar"', () => {
    const topics = [
      createMockTopic({ id: 'topic-1', cluster_role: 'pillar' }),
    ];
    const result = detectSegment('topic-1', 'topic', topics);
    expect(result).toBe('pillar');
  });

  it('returns "core_section" for topic with topic_class="monetization"', () => {
    const topics = [
      createMockTopic({ id: 'topic-1', topic_class: 'monetization', cluster_role: 'cluster_content' }),
    ];
    const result = detectSegment('topic-1', 'topic', topics);
    expect(result).toBe('core_section');
  });

  it('returns "author_section" for topic with topic_class="informational"', () => {
    const topics = [
      createMockTopic({ id: 'topic-1', topic_class: 'informational', cluster_role: 'cluster_content' }),
    ];
    const result = detectSegment('topic-1', 'topic', topics);
    expect(result).toBe('author_section');
  });

  it('returns "cluster" for topic without special classification', () => {
    const topics = [
      createMockTopic({ id: 'topic-1', cluster_role: 'cluster_content' }),
    ];
    const result = detectSegment('topic-1', 'topic', topics);
    expect(result).toBe('cluster');
  });

  it('returns "cluster" when topic is not found', () => {
    const topics: EnrichedTopic[] = [];
    const result = detectSegment('non-existent', 'topic', topics);
    expect(result).toBe('cluster');
  });

  it('prioritizes cluster_role="pillar" over topic_class', () => {
    const topics = [
      createMockTopic({
        id: 'topic-1',
        cluster_role: 'pillar',
        topic_class: 'monetization',
      }),
    ];
    const result = detectSegment('topic-1', 'topic', topics);
    expect(result).toBe('pillar');
  });
});

// ============================================
// GET DEFAULT RULE TESTS
// ============================================

describe('getDefaultRule', () => {
  it('returns default rule for core_section', () => {
    const rule = getDefaultRule('core_section');
    expect(rule.segment).toBe('core_section');
    expect(rule.headerLinks.include).toContain('pillar');
    expect(rule.headerLinks.include).toContain('monetization');
    expect(rule.headerLinks.maxLinks).toBe(8);
    expect(rule.headerLinks.prioritizeBy).toBe('authority');
    expect(rule.sidebarLinks?.showClusterSiblings).toBe(true);
    expect(rule.sidebarLinks?.showParentPillar).toBe(true);
  });

  it('returns default rule for author_section', () => {
    const rule = getDefaultRule('author_section');
    expect(rule.segment).toBe('author_section');
    expect(rule.headerLinks.include).toContain('pillar');
    expect(rule.headerLinks.include).toContain('informational');
    expect(rule.headerLinks.exclude).toContain('monetization');
    expect(rule.headerLinks.maxLinks).toBe(8);
    expect(rule.headerLinks.prioritizeBy).toBe('relevance');
    expect(rule.sidebarLinks?.maxLinks).toBe(15);
  });

  it('returns default rule for pillar', () => {
    const rule = getDefaultRule('pillar');
    expect(rule.segment).toBe('pillar');
    expect(rule.headerLinks.include).toContain('pillar');
    expect(rule.headerLinks.maxLinks).toBe(10);
    expect(rule.headerLinks.prioritizeBy).toBe('authority');
    expect(rule.sidebarLinks?.showClusterSiblings).toBe(false);
    expect(rule.sidebarLinks?.showParentPillar).toBe(false);
    expect(rule.sidebarLinks?.maxLinks).toBe(20); // Show all child clusters
  });

  it('returns default rule for cluster', () => {
    const rule = getDefaultRule('cluster');
    expect(rule.segment).toBe('cluster');
    expect(rule.headerLinks.include).toContain('pillar');
    expect(rule.headerLinks.maxLinks).toBe(8);
    expect(rule.headerLinks.prioritizeBy).toBe('relevance');
    expect(rule.footerLinks.prioritizeByProximity).toBe(true);
  });

  it('returns default rule for foundation', () => {
    const rule = getDefaultRule('foundation');
    expect(rule.segment).toBe('foundation');
    expect(rule.headerLinks.include).toContain('pillar');
    expect(rule.headerLinks.include).toContain('foundation');
    expect(rule.headerLinks.maxLinks).toBe(8);
    expect(rule.footerLinks.include).toContain('foundation');
    expect(rule.footerLinks.prioritizeByProximity).toBe(false);
  });

  it('all rules have required fields', () => {
    const segments: NavigationSegment[] = ['core_section', 'author_section', 'pillar', 'cluster', 'foundation'];

    segments.forEach(segment => {
      const rule = getDefaultRule(segment);
      expect(rule.segment).toBe(segment);
      expect(rule.headerLinks).toBeDefined();
      expect(rule.headerLinks.include).toBeDefined();
      expect(rule.headerLinks.exclude).toBeDefined();
      expect(rule.headerLinks.maxLinks).toBeGreaterThan(0);
      expect(rule.headerLinks.prioritizeBy).toBeDefined();
      expect(rule.footerLinks).toBeDefined();
      expect(rule.footerLinks.include).toBeDefined();
      expect(rule.footerLinks.exclude).toBeDefined();
    });
  });
});

// ============================================
// CREATE DEFAULT CONFIG TESTS
// ============================================

describe('createDefaultConfig', () => {
  it('creates config with enabled=false by default', () => {
    const config = createDefaultConfig();
    expect(config.enabled).toBe(false);
  });

  it('creates config with fallbackToStatic=true', () => {
    const config = createDefaultConfig();
    expect(config.fallbackToStatic).toBe(true);
  });

  it('creates config with rules for all segments', () => {
    const config = createDefaultConfig();
    expect(config.rules).toHaveLength(5);

    const segments = config.rules.map(r => r.segment);
    expect(segments).toContain('core_section');
    expect(segments).toContain('author_section');
    expect(segments).toContain('pillar');
    expect(segments).toContain('cluster');
    expect(segments).toContain('foundation');
  });

  it('creates config with default rules for each segment', () => {
    const config = createDefaultConfig();

    const coreRule = config.rules.find(r => r.segment === 'core_section');
    expect(coreRule).toBeDefined();
    expect(coreRule?.headerLinks.include).toContain('pillar');
    expect(coreRule?.headerLinks.include).toContain('monetization');
  });
});

// ============================================
// GENERATE DYNAMIC NAVIGATION TESTS
// ============================================

describe('generateDynamicNavigation', () => {
  describe('header links generation', () => {
    it('generates header links for pillar pages', () => {
      const pillarTopic = createMockTopic({ id: 'pillar-1', title: 'Main Pillar', cluster_role: 'pillar' });
      const topics = [pillarTopic];
      const ctx = createMockContext({
        currentPageId: 'pillar-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.headerLinks).toBeDefined();
      expect(Array.isArray(result.headerLinks)).toBe(true);
    });

    it('respects maxLinks limit for header', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar 1', cluster_role: 'pillar' }),
        createMockTopic({ id: 'pillar-2', title: 'Pillar 2', cluster_role: 'pillar' }),
        createMockTopic({ id: 'pillar-3', title: 'Pillar 3', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Topic 1', cluster_role: 'cluster_content' }),
      ];

      const customConfig = createDefaultConfig();
      // Set maxLinks to 2 for cluster segment (topic-1 is cluster)
      const clusterRuleIndex = customConfig.rules.findIndex(r => r.segment === 'cluster');
      customConfig.rules[clusterRuleIndex].headerLinks.maxLinks = 2; // Limit to 2
      customConfig.rules[clusterRuleIndex].headerLinks.include = ['pillar']; // No foundation pages

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: customConfig,
      });

      const result = generateDynamicNavigation(ctx);

      // Should have at most 2 topic links (no foundation pages added)
      const topicLinks = result.headerLinks.filter(l => l.target_topic_id);
      expect(topicLinks.length).toBeLessThanOrEqual(2);
    });

    it('includes foundation pages in header when configured', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
      ];
      const foundationPages = [
        createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
        createMockFoundationPage({ id: 'fp-2', title: 'Contact', page_type: 'contact' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'fp-1',
        currentPageType: 'foundation',
        topics,
        foundationPages,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.headerLinks.length).toBeGreaterThan(0);
      // Foundation pages should be included (max 3)
      const fpLinks = result.headerLinks.filter(l => l.target_foundation_page_id);
      expect(fpLinks.length).toBeGreaterThan(0);
      expect(fpLinks.length).toBeLessThanOrEqual(3);
    });

    it('filters out deleted foundation pages', () => {
      const topics: EnrichedTopic[] = [];
      const foundationPages = [
        createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
        createMockFoundationPage({ id: 'fp-2', title: 'Deleted', page_type: 'contact', deleted_at: '2025-01-01' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'fp-1',
        currentPageType: 'foundation',
        topics,
        foundationPages,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      const deletedLink = result.headerLinks.find(l => l.target_foundation_page_id === 'fp-2');
      expect(deletedLink).toBeUndefined();
    });

    it('sets prominence=high for pillar topics', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Topic', cluster_role: 'cluster_content', topic_class: 'monetization' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      const pillarLink = result.headerLinks.find(l => l.target_topic_id === 'pillar-1');
      expect(pillarLink?.prominence).toBe('high');
    });
  });

  describe('footer links generation', () => {
    it('includes foundation pages in footer when configured', () => {
      const topics: EnrichedTopic[] = [];
      const foundationPages = [
        createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
        createMockFoundationPage({ id: 'fp-2', title: 'Contact', page_type: 'contact' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        foundationPages,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.footerLinks.length).toBeGreaterThan(0);
      const fpLinks = result.footerLinks.filter(l => l.target_foundation_page_id);
      expect(fpLinks.length).toBe(2);
    });

    it('includes pillar pages in footer when configured', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar 1', cluster_role: 'pillar' }),
        createMockTopic({ id: 'pillar-2', title: 'Pillar 2', cluster_role: 'pillar' }),
      ];
      const foundationPages: FoundationPage[] = [];

      const ctx = createMockContext({
        currentPageId: 'pillar-1',
        currentPageType: 'topic',
        topics,
        foundationPages,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      const pillarLinks = result.footerLinks.filter(l => l.target_topic_id &&
        topics.find(t => t.id === l.target_topic_id && t.cluster_role === 'pillar'));
      expect(pillarLinks.length).toBeGreaterThan(0);
      expect(pillarLinks.length).toBeLessThanOrEqual(5); // Max 5 pillars in footer
    });

    it('filters deleted foundation pages from footer', () => {
      const topics: EnrichedTopic[] = [];
      const foundationPages = [
        createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
        createMockFoundationPage({ id: 'fp-2', title: 'Deleted', page_type: 'contact', deleted_at: '2025-01-01' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        foundationPages,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      const deletedLink = result.footerLinks.find(l => l.target_foundation_page_id === 'fp-2');
      expect(deletedLink).toBeUndefined();
    });
  });

  describe('sidebar links generation', () => {
    it('includes parent pillar when showParentPillar=true', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Parent Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Child Topic', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.sidebarLinks).toBeDefined();
      const parentLink = result.sidebarLinks?.find(l => l.target_topic_id === 'pillar-1');
      expect(parentLink).toBeDefined();
      expect(parentLink?.prominence).toBe('high');
    });

    it('includes cluster siblings when showClusterSiblings=true', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Topic 1', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
        createMockTopic({ id: 'topic-2', title: 'Topic 2', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
        createMockTopic({ id: 'topic-3', title: 'Topic 3', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.sidebarLinks).toBeDefined();
      // Should include siblings (topic-2, topic-3) but not self (topic-1) or parent pillar
      const siblingLinks = result.sidebarLinks?.filter(l =>
        l.target_topic_id === 'topic-2' || l.target_topic_id === 'topic-3'
      );
      expect(siblingLinks?.length).toBe(2);
    });

    it('excludes pillar from siblings list', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Topic 1', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
        createMockTopic({ id: 'topic-2', title: 'Topic 2', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      // Siblings should not include pillars
      const siblingLinks = result.sidebarLinks?.filter(l =>
        topics.find(t => t.id === l.target_topic_id && t.cluster_role === 'pillar')
      );
      // Parent pillar appears separately, not in siblings
      expect(siblingLinks?.length).toBeLessThanOrEqual(1);
    });

    it('shows child clusters for pillar pages', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Child 1', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
        createMockTopic({ id: 'topic-2', title: 'Child 2', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'pillar-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.sidebarLinks).toBeDefined();
      const childLinks = result.sidebarLinks?.filter(l =>
        l.target_topic_id === 'topic-1' || l.target_topic_id === 'topic-2'
      );
      expect(childLinks?.length).toBe(2);
    });

    it('respects maxLinks for sidebar', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Current', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
        ...Array.from({ length: 20 }, (_, i) =>
          createMockTopic({
            id: `topic-${i + 2}`,
            title: `Topic ${i + 2}`,
            parent_topic_id: 'pillar-1',
            cluster_role: 'cluster_content'
          })
        ),
      ];

      const config = createDefaultConfig();
      config.rules[3].sidebarLinks!.maxLinks = 5; // cluster rule

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config,
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.sidebarLinks).toBeDefined();
      // Should include parent + siblings (max 5)
      expect(result.sidebarLinks!.length).toBeLessThanOrEqual(6); // 1 parent + 5 max siblings
    });

    it('sidebar is undefined when no sidebarLinks rule configured', () => {
      const topics = [
        createMockTopic({ id: 'fp-1', title: 'Foundation' }),
      ];
      const foundationPages = [
        createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
      ];

      const config = createDefaultConfig();
      // Foundation rule doesn't have sidebarLinks by default

      const ctx = createMockContext({
        currentPageId: 'fp-1',
        currentPageType: 'foundation',
        topics,
        foundationPages,
        config,
      });

      const result = generateDynamicNavigation(ctx);

      // Foundation segment should not have sidebar
      const foundationRule = config.rules.find(r => r.segment === 'foundation');
      if (!foundationRule?.sidebarLinks) {
        expect(result.sidebarLinks).toBeUndefined();
      }
    });
  });

  describe('breadcrumbs generation', () => {
    it('includes Home link', () => {
      const topics: EnrichedTopic[] = [];
      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.breadcrumbs).toBeDefined();
      expect(result.breadcrumbs[0].text).toBe('Home');
      expect(result.breadcrumbs[0].url).toBe('/');
    });

    it('includes parent pillar in breadcrumbs', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Parent Pillar', slug: 'parent-pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Child Topic', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.breadcrumbs.length).toBe(3); // Home > Parent Pillar > Current
      expect(result.breadcrumbs[1].text).toBe('Parent Pillar');
      expect(result.breadcrumbs[1].url).toBe('/parent-pillar');
    });

    it('shows current page as last breadcrumb without URL', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Parent', slug: 'parent', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Current Page', parent_topic_id: 'pillar-1', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      const lastBreadcrumb = result.breadcrumbs[result.breadcrumbs.length - 1];
      expect(lastBreadcrumb.text).toBe('Current Page');
      expect(lastBreadcrumb.url).toBeUndefined();
    });

    it('handles foundation page breadcrumbs', () => {
      const topics: EnrichedTopic[] = [];
      const foundationPages = [
        createMockFoundationPage({ id: 'fp-1', title: 'About Us', page_type: 'about' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'fp-1',
        currentPageType: 'foundation',
        topics,
        foundationPages,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.breadcrumbs.length).toBe(2); // Home > About Us
      expect(result.breadcrumbs[1].text).toBe('About Us');
      expect(result.breadcrumbs[1].url).toBeUndefined();
    });

    it('handles topic without parent', () => {
      const topics = [
        createMockTopic({ id: 'topic-1', title: 'Standalone Topic', parent_topic_id: null, cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.breadcrumbs.length).toBe(2); // Home > Standalone Topic
    });
  });

  describe('custom rules', () => {
    it('uses custom rule when provided in config', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Topic', topic_class: 'monetization', cluster_role: 'cluster_content' }),
      ];

      const config = createDefaultConfig();
      // Override core_section rule with custom maxLinks
      config.rules[0].headerLinks.maxLinks = 3;

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config,
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.headerLinks.length).toBeLessThanOrEqual(3);
    });

    it('falls back to default rule when no custom rule provided', () => {
      const topics = [
        createMockTopic({ id: 'topic-1', title: 'Topic', cluster_role: 'cluster_content' }),
      ];

      const config = createDefaultConfig();
      config.rules = []; // Clear all rules

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config,
      });

      const result = generateDynamicNavigation(ctx);

      // Should still generate navigation using default rules
      expect(result.headerLinks).toBeDefined();
      expect(result.footerLinks).toBeDefined();
      expect(result.breadcrumbs).toBeDefined();
    });
  });

  describe('filtering and exclusion', () => {
    it('excludes topics based on exclude rules', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Monetization', topic_class: 'monetization', cluster_role: 'cluster_content' }),
        createMockTopic({ id: 'topic-2', title: 'Info', topic_class: 'informational', cluster_role: 'cluster_content' }),
      ];

      const config = createDefaultConfig();
      // Author section excludes monetization
      const authorRule = config.rules.find(r => r.segment === 'author_section')!;

      const ctx = createMockContext({
        currentPageId: 'topic-2',
        currentPageType: 'topic',
        topics,
        config,
      });

      const result = generateDynamicNavigation(ctx);

      // Should not include monetization topics in author section
      const monetizationLink = result.headerLinks.find(l => l.target_topic_id === 'topic-1');
      expect(monetizationLink).toBeUndefined();
    });

    it('includes only specified topics when include filter is set', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
        createMockTopic({ id: 'topic-1', title: 'Monetization', topic_class: 'monetization', cluster_role: 'cluster_content' }),
        createMockTopic({ id: 'topic-2', title: 'Info', topic_class: 'informational', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      // Core section includes pillar and monetization
      const headerTopicIds = result.headerLinks
        .filter(l => l.target_topic_id)
        .map(l => l.target_topic_id);

      // Should include pillar
      expect(headerTopicIds).toContain('pillar-1');
      // Should not include informational (not in include list)
      expect(headerTopicIds).not.toContain('topic-2');
    });
  });

  describe('edge cases', () => {
    it('handles empty topics array', () => {
      const topics: EnrichedTopic[] = [];
      const ctx = createMockContext({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result.headerLinks).toEqual([]);
      expect(result.footerLinks).toEqual([]);
      expect(result.breadcrumbs.length).toBe(1); // Only Home
    });

    it('handles empty foundation pages array', () => {
      const topics = [
        createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
      ];
      const foundationPages: FoundationPage[] = [];

      const ctx = createMockContext({
        currentPageId: 'fp-1',
        currentPageType: 'foundation',
        topics,
        foundationPages,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result).toBeDefined();
      expect(result.footerLinks.filter(l => l.target_foundation_page_id)).toEqual([]);
    });

    it('handles non-existent current page gracefully', () => {
      const topics = [
        createMockTopic({ id: 'topic-1', title: 'Topic', cluster_role: 'cluster_content' }),
      ];

      const ctx = createMockContext({
        currentPageId: 'non-existent',
        currentPageType: 'topic',
        topics,
        config: createDefaultConfig(),
      });

      const result = generateDynamicNavigation(ctx);

      expect(result).toBeDefined();
      expect(result.breadcrumbs.length).toBe(1); // Only Home
    });
  });
});

// ============================================
// PREVIEW NAVIGATION FOR ALL SEGMENTS TESTS
// ============================================

describe('previewNavigationForAllSegments', () => {
  it('generates preview for all 5 segments', () => {
    const topics = [
      createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
      createMockTopic({ id: 'topic-1', title: 'Core', topic_class: 'monetization', cluster_role: 'cluster_content' }),
      createMockTopic({ id: 'topic-2', title: 'Author', topic_class: 'informational', cluster_role: 'cluster_content' }),
      createMockTopic({ id: 'topic-3', title: 'Cluster', cluster_role: 'cluster_content' }),
    ];
    const foundationPages = [
      createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
    ];
    const baseNav = createMockNavigationStructure();
    const config = createDefaultConfig();

    const result = previewNavigationForAllSegments(topics, foundationPages, baseNav, config);

    expect(Object.keys(result)).toHaveLength(5);
    expect(result.core_section).toBeDefined();
    expect(result.author_section).toBeDefined();
    expect(result.pillar).toBeDefined();
    expect(result.cluster).toBeDefined();
    expect(result.foundation).toBeDefined();
  });

  it('each preview has required navigation properties', () => {
    const topics = [
      createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
      createMockTopic({ id: 'topic-1', title: 'Core', topic_class: 'monetization', cluster_role: 'cluster_content' }),
    ];
    const foundationPages = [
      createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
    ];
    const baseNav = createMockNavigationStructure();
    const config = createDefaultConfig();

    const result = previewNavigationForAllSegments(topics, foundationPages, baseNav, config);

    Object.values(result).forEach(preview => {
      expect(preview.headerLinks).toBeDefined();
      expect(preview.footerLinks).toBeDefined();
      expect(preview.breadcrumbs).toBeDefined();
      expect(Array.isArray(preview.headerLinks)).toBe(true);
      expect(Array.isArray(preview.footerLinks)).toBe(true);
      expect(Array.isArray(preview.breadcrumbs)).toBe(true);
    });
  });

  it('uses correct sample topic for each segment', () => {
    const topics = [
      createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
      createMockTopic({ id: 'topic-1', title: 'Core', topic_class: 'monetization', cluster_role: 'cluster_content' }),
      createMockTopic({ id: 'topic-2', title: 'Author', topic_class: 'informational', cluster_role: 'cluster_content' }),
      createMockTopic({ id: 'topic-3', title: 'Cluster', cluster_role: 'cluster_content' }),
    ];
    const foundationPages = [
      createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
    ];
    const baseNav = createMockNavigationStructure();
    const config = createDefaultConfig();

    const result = previewNavigationForAllSegments(topics, foundationPages, baseNav, config);

    // Each segment should have different navigation based on its sample topic
    expect(result.pillar).not.toEqual(result.core_section);
    expect(result.author_section).not.toEqual(result.cluster);
  });

  it('handles empty topics array gracefully', () => {
    const topics: EnrichedTopic[] = [];
    const foundationPages = [
      createMockFoundationPage({ id: 'fp-1', title: 'About', page_type: 'about' }),
    ];
    const baseNav = createMockNavigationStructure();
    const config = createDefaultConfig();

    const result = previewNavigationForAllSegments(topics, foundationPages, baseNav, config);

    expect(Object.keys(result)).toHaveLength(5);
    // Should still generate previews with sample IDs
    expect(result.foundation).toBeDefined();
  });

  it('handles empty foundation pages array gracefully', () => {
    const topics = [
      createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
    ];
    const foundationPages: FoundationPage[] = [];
    const baseNav = createMockNavigationStructure();
    const config = createDefaultConfig();

    const result = previewNavigationForAllSegments(topics, foundationPages, baseNav, config);

    expect(Object.keys(result)).toHaveLength(5);
    // Should use fallback sample IDs
    expect(result.foundation).toBeDefined();
  });

  it('applies custom config rules to previews', () => {
    const topics = [
      createMockTopic({ id: 'pillar-1', title: 'Pillar', cluster_role: 'pillar' }),
      createMockTopic({ id: 'topic-1', title: 'Core', topic_class: 'monetization', cluster_role: 'cluster_content' }),
    ];
    const foundationPages: FoundationPage[] = [];
    const baseNav = createMockNavigationStructure();
    const config = createDefaultConfig();

    // Customize a rule
    config.rules[0].headerLinks.maxLinks = 2;

    const result = previewNavigationForAllSegments(topics, foundationPages, baseNav, config);

    // Core section should respect custom maxLinks
    expect(result.core_section.headerLinks.length).toBeLessThanOrEqual(2);
  });
});
