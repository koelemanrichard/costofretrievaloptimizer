// services/navigationService.ts
// Dynamic Navigation Service for Phase D Feature 2
// Generates segment-specific navigation based on topic context

import {
  NavigationStructure,
  NavigationLink,
  DynamicNavigationRule,
  DynamicNavigationConfig,
  NavigationSegment,
  EnrichedTopic,
  FoundationPage,
} from '../types';

export interface DynamicNavigationContext {
  currentPageId: string;
  currentPageType: 'topic' | 'foundation';
  topics: EnrichedTopic[];
  foundationPages: FoundationPage[];
  baseNavigation: NavigationStructure;
  config: DynamicNavigationConfig;
}

export interface GeneratedNavigation {
  headerLinks: NavigationLink[];
  footerLinks: NavigationLink[];
  sidebarLinks?: NavigationLink[];
  breadcrumbs: { text: string; url?: string }[];
}

/**
 * Determine which segment a page belongs to
 */
export const detectSegment = (
  pageId: string,
  pageType: 'topic' | 'foundation',
  topics: EnrichedTopic[]
): NavigationSegment => {
  if (pageType === 'foundation') {
    return 'foundation';
  }

  const topic = topics.find(t => t.id === pageId);
  if (!topic) return 'cluster'; // Default

  // Check if pillar
  if (topic.cluster_role === 'pillar') {
    return 'pillar';
  }

  // Check topic_class for core vs author section
  if (topic.topic_class === 'monetization') {
    return 'core_section';
  }

  if (topic.topic_class === 'informational') {
    return 'author_section';
  }

  // Default to cluster for other content
  return 'cluster';
};

/**
 * Get the default rule for a segment
 */
export const getDefaultRule = (segment: NavigationSegment): DynamicNavigationRule => {
  const defaults: Record<NavigationSegment, DynamicNavigationRule> = {
    core_section: {
      segment: 'core_section',
      headerLinks: {
        include: ['pillar', 'monetization'],
        exclude: [],
        maxLinks: 8,
        prioritizeBy: 'authority',
      },
      footerLinks: {
        include: ['foundation', 'pillar'],
        exclude: [],
        prioritizeByProximity: true,
      },
      sidebarLinks: {
        showClusterSiblings: true,
        showParentPillar: true,
        maxLinks: 10,
      },
    },
    author_section: {
      segment: 'author_section',
      headerLinks: {
        include: ['pillar', 'informational'],
        exclude: ['monetization'],
        maxLinks: 8,
        prioritizeBy: 'relevance',
      },
      footerLinks: {
        include: ['foundation'],
        exclude: [],
        prioritizeByProximity: true,
      },
      sidebarLinks: {
        showClusterSiblings: true,
        showParentPillar: true,
        maxLinks: 15,
      },
    },
    pillar: {
      segment: 'pillar',
      headerLinks: {
        include: ['pillar'],
        exclude: [],
        maxLinks: 10,
        prioritizeBy: 'authority',
      },
      footerLinks: {
        include: ['foundation', 'pillar'],
        exclude: [],
        prioritizeByProximity: false,
      },
      sidebarLinks: {
        showClusterSiblings: false,
        showParentPillar: false,
        maxLinks: 20, // Show all child clusters
      },
    },
    cluster: {
      segment: 'cluster',
      headerLinks: {
        include: ['pillar'],
        exclude: [],
        maxLinks: 8,
        prioritizeBy: 'relevance',
      },
      footerLinks: {
        include: ['foundation'],
        exclude: [],
        prioritizeByProximity: true,
      },
      sidebarLinks: {
        showClusterSiblings: true,
        showParentPillar: true,
        maxLinks: 10,
      },
    },
    foundation: {
      segment: 'foundation',
      headerLinks: {
        include: ['pillar', 'foundation'],
        exclude: [],
        maxLinks: 8,
        prioritizeBy: 'authority',
      },
      footerLinks: {
        include: ['foundation'],
        exclude: [],
        prioritizeByProximity: false,
      },
    },
  };

  return defaults[segment];
};

/**
 * Filter topics based on rule includes/excludes
 */
const filterTopicsByRule = (
  topics: EnrichedTopic[],
  rule: { include: string[]; exclude: string[] }
): EnrichedTopic[] => {
  return topics.filter(topic => {
    // Check includes
    const matchesInclude = rule.include.length === 0 || rule.include.some(inc => {
      if (inc === 'pillar') return topic.cluster_role === 'pillar';
      if (inc === 'monetization') return topic.topic_class === 'monetization';
      if (inc === 'informational') return topic.topic_class === 'informational';
      // 'navigational' would be for foundation pages, not topics
      return topic.id === inc; // Direct ID match
    });

    // Check excludes
    const matchesExclude = rule.exclude.some(exc => {
      if (exc === 'pillar') return topic.cluster_role === 'pillar';
      if (exc === 'monetization') return topic.topic_class === 'monetization';
      if (exc === 'informational') return topic.topic_class === 'informational';
      return topic.id === exc;
    });

    return matchesInclude && !matchesExclude;
  });
};

/**
 * Sort topics by priority strategy
 */
const sortTopicsByPriority = (
  topics: EnrichedTopic[],
  strategy: 'relevance' | 'recency' | 'authority',
  currentTopic?: EnrichedTopic
): EnrichedTopic[] => {
  return [...topics].sort((a, b) => {
    switch (strategy) {
      case 'authority':
        // Pillars first, then by cluster_role
        const roleOrder = { pillar: 0, cluster_content: 1, standalone: 2 };
        return (roleOrder[a.cluster_role || 'standalone'] || 2) - (roleOrder[b.cluster_role || 'standalone'] || 2);

      case 'recency':
        // Newer topics first (if we had creation dates)
        return 0; // No recency data available

      case 'relevance':
      default:
        // Same parent pillar first, then same topic_class
        if (currentTopic) {
          const aSameParent = a.parent_topic_id === currentTopic.parent_topic_id;
          const bSameParent = b.parent_topic_id === currentTopic.parent_topic_id;
          if (aSameParent && !bSameParent) return -1;
          if (!aSameParent && bSameParent) return 1;
        }
        return 0;
    }
  });
};

/**
 * Convert topic to NavigationLink
 */
const topicToLink = (topic: EnrichedTopic, prominence: 'high' | 'medium' | 'low' = 'medium'): NavigationLink => ({
  id: `nav-${topic.id}`,
  text: topic.title,
  target_topic_id: topic.id,
  prominence,
});

/**
 * Convert foundation page to NavigationLink
 */
const foundationToLink = (page: FoundationPage, prominence: 'high' | 'medium' | 'low' = 'medium'): NavigationLink => ({
  id: `nav-fp-${page.id}`,
  text: page.title,
  target_foundation_page_id: page.id,
  prominence,
});

/**
 * Generate dynamic navigation for a specific page context
 */
export const generateDynamicNavigation = (ctx: DynamicNavigationContext): GeneratedNavigation => {
  const segment = detectSegment(ctx.currentPageId, ctx.currentPageType, ctx.topics);

  // Get rule for this segment (custom or default)
  const customRule = ctx.config.rules.find(r => r.segment === segment);
  const rule = customRule || getDefaultRule(segment);

  const currentTopic = ctx.topics.find(t => t.id === ctx.currentPageId);

  // Generate header links
  let headerTopics = filterTopicsByRule(ctx.topics, rule.headerLinks);
  headerTopics = sortTopicsByPriority(headerTopics, rule.headerLinks.prioritizeBy, currentTopic);
  headerTopics = headerTopics.slice(0, rule.headerLinks.maxLinks);

  const headerLinks: NavigationLink[] = headerTopics.map(t =>
    topicToLink(t, t.cluster_role === 'pillar' ? 'high' : 'medium')
  );

  // Add foundation pages to header if included
  if (rule.headerLinks.include.includes('foundation')) {
    const fpLinks = ctx.foundationPages
      .filter(fp => !fp.deleted_at)
      .slice(0, 3) // Max 3 foundation pages in header
      .map(fp => foundationToLink(fp, 'low'));
    headerLinks.push(...fpLinks);
  }

  // Generate footer links
  const footerLinks: NavigationLink[] = [];

  // Foundation pages in footer
  if (rule.footerLinks.include.includes('foundation')) {
    ctx.foundationPages
      .filter(fp => !fp.deleted_at)
      .forEach(fp => footerLinks.push(foundationToLink(fp, 'low')));
  }

  // Pillar pages in footer
  if (rule.footerLinks.include.includes('pillar')) {
    ctx.topics
      .filter(t => t.cluster_role === 'pillar')
      .slice(0, 5)
      .forEach(t => footerLinks.push(topicToLink(t, 'medium')));
  }

  // Generate sidebar links (if enabled)
  let sidebarLinks: NavigationLink[] | undefined;
  if (rule.sidebarLinks) {
    sidebarLinks = [];

    // Parent pillar link
    if (rule.sidebarLinks.showParentPillar && currentTopic?.parent_topic_id) {
      const parentPillar = ctx.topics.find(t => t.id === currentTopic.parent_topic_id);
      if (parentPillar) {
        sidebarLinks.push(topicToLink(parentPillar, 'high'));
      }
    }

    // Sibling cluster links
    if (rule.sidebarLinks.showClusterSiblings && currentTopic) {
      const siblings = ctx.topics.filter(t =>
        t.parent_topic_id === currentTopic.parent_topic_id &&
        t.id !== currentTopic.id &&
        t.cluster_role !== 'pillar'
      );
      siblings
        .slice(0, rule.sidebarLinks.maxLinks)
        .forEach(t => sidebarLinks!.push(topicToLink(t, 'low')));
    }

    // If this is a pillar, show child clusters
    if (segment === 'pillar' && currentTopic) {
      const children = ctx.topics.filter(t => t.parent_topic_id === currentTopic.id);
      children
        .slice(0, rule.sidebarLinks.maxLinks)
        .forEach(t => sidebarLinks!.push(topicToLink(t, 'medium')));
    }
  }

  // Generate breadcrumbs
  const breadcrumbs: { text: string; url?: string }[] = [
    { text: 'Home', url: '/' },
  ];

  if (currentTopic) {
    // Add parent pillar if exists
    if (currentTopic.parent_topic_id) {
      const parent = ctx.topics.find(t => t.id === currentTopic.parent_topic_id);
      if (parent) {
        breadcrumbs.push({ text: parent.title, url: `/${parent.slug || parent.id}` });
      }
    }
    // Current page
    breadcrumbs.push({ text: currentTopic.title });
  } else {
    // Foundation page
    const fp = ctx.foundationPages.find(p => p.id === ctx.currentPageId);
    if (fp) {
      breadcrumbs.push({ text: fp.title });
    }
  }

  return {
    headerLinks,
    footerLinks,
    sidebarLinks,
    breadcrumbs,
  };
};

/**
 * Create default dynamic navigation config
 */
export const createDefaultConfig = (): DynamicNavigationConfig => ({
  enabled: false,
  rules: [
    getDefaultRule('core_section'),
    getDefaultRule('author_section'),
    getDefaultRule('pillar'),
    getDefaultRule('cluster'),
    getDefaultRule('foundation'),
  ],
  fallbackToStatic: true,
});

/**
 * Preview what navigation would look like for different page types
 */
export const previewNavigationForAllSegments = (
  topics: EnrichedTopic[],
  foundationPages: FoundationPage[],
  baseNavigation: NavigationStructure,
  config: DynamicNavigationConfig
): Record<NavigationSegment, GeneratedNavigation> => {
  const segments: NavigationSegment[] = ['core_section', 'author_section', 'pillar', 'cluster', 'foundation'];
  const result: Partial<Record<NavigationSegment, GeneratedNavigation>> = {};

  for (const segment of segments) {
    // Find a sample page for this segment
    let samplePageId: string;
    let samplePageType: 'topic' | 'foundation';

    if (segment === 'foundation') {
      samplePageId = foundationPages[0]?.id || 'sample-foundation';
      samplePageType = 'foundation';
    } else {
      const sampleTopic = topics.find(t => {
        if (segment === 'pillar') return t.cluster_role === 'pillar';
        if (segment === 'core_section') return t.topic_class === 'monetization' && t.cluster_role !== 'pillar';
        if (segment === 'author_section') return t.topic_class === 'informational' && t.cluster_role !== 'pillar';
        return t.cluster_role === 'cluster_content';
      });
      samplePageId = sampleTopic?.id || 'sample-topic';
      samplePageType = 'topic';
    }

    result[segment] = generateDynamicNavigation({
      currentPageId: samplePageId,
      currentPageType: samplePageType,
      topics,
      foundationPages,
      baseNavigation,
      config,
    });
  }

  return result as Record<NavigationSegment, GeneratedNavigation>;
};

export default {
  detectSegment,
  getDefaultRule,
  generateDynamicNavigation,
  createDefaultConfig,
  previewNavigationForAllSegments,
};
