// services/navigationService.ts
// Dynamic Navigation Service for Phase D Feature 2
// Generates segment-specific navigation based on topic context
//
// HOLISTIC SEO PRINCIPLES (from research):
// 1. PageRank Distribution - Critical pages should be 1 click from homepage
// 2. Internal Link Count - Max ~150 links per page to concentrate PageRank
// 3. N-gram Injection - Header/footer links reinforce central entity
// 4. Quality Nodes - Focus PageRank flow to monetization/high-authority pages
// 5. Context-Aware Navigation - Sidebar changes based on current page context
// 6. Semantic Relevance - Links prioritized by topical/entity overlap
// 7. Annotation Text - Surrounding text describes *why* the link is necessary

import {
  NavigationStructure,
  NavigationLink,
  DynamicNavigationRule,
  DynamicNavigationConfig,
  NavigationSegment,
  EnrichedTopic,
  FoundationPage,
  SEOPillars,
  SemanticTriple,
} from '../types';

export interface DynamicNavigationContext {
  currentPageId: string;
  currentPageType: 'topic' | 'foundation';
  topics: EnrichedTopic[];
  foundationPages: FoundationPage[];
  baseNavigation: NavigationStructure;
  config: DynamicNavigationConfig;
  // NEW: Semantic context for smarter navigation
  pillars?: SEOPillars;
  eavs?: SemanticTriple[];
}

export interface GeneratedNavigation {
  headerLinks: NavigationLink[];
  footerLinks: NavigationLink[];
  sidebarLinks?: NavigationLink[];
  breadcrumbs: { text: string; url?: string }[];
  // NEW: Annotation hints for contextual bridge text
  linkAnnotations?: Map<string, string>;
}

// NEW: Semantic relevance score for link prioritization
interface TopicRelevanceScore {
  topicId: string;
  score: number;
  reasons: string[];
}

// NEW: Quality Node detection - pages that should receive more PageRank
interface QualityNodeScore {
  pageId: string;
  isQualityNode: boolean;
  score: number;
  factors: {
    isMonetization: boolean;
    isPillar: boolean;
    hasHighSearchVolume: boolean;
    hasUniqueContent: boolean;
  };
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
 * NEW: Calculate semantic relevance score between two topics
 * Based on Holistic SEO principle of contextual linking
 */
const calculateSemanticRelevance = (
  topicA: EnrichedTopic,
  topicB: EnrichedTopic,
  eavs?: SemanticTriple[]
): TopicRelevanceScore => {
  let score = 0;
  const reasons: string[] = [];

  // 1. Same parent cluster (highest relevance)
  if (topicA.parent_topic_id && topicA.parent_topic_id === topicB.parent_topic_id) {
    score += 30;
    reasons.push('same_cluster');
  }

  // 2. Same topic class (monetization/informational)
  if (topicA.topic_class && topicA.topic_class === topicB.topic_class) {
    score += 15;
    reasons.push('same_topic_class');
  }

  // 3. Shared EAV entities via metadata (semantic overlap)
  // Topics may have matched_eavs in metadata from enrichment
  const aMatchedEavs = (topicA.metadata?.matched_eavs as SemanticTriple[] | undefined) || [];
  const bMatchedEavs = (topicB.metadata?.matched_eavs as SemanticTriple[] | undefined) || [];
  if (aMatchedEavs.length > 0 && bMatchedEavs.length > 0) {
    // SemanticTriple uses subject.label for the entity name
    const aEntities = new Set(aMatchedEavs.map(e => e.subject.label.toLowerCase()));
    const bEntities = new Set(bMatchedEavs.map(e => e.subject.label.toLowerCase()));
    const sharedEntities = [...aEntities].filter(e => bEntities.has(e));
    if (sharedEntities.length > 0) {
      score += Math.min(sharedEntities.length * 10, 25);
      reasons.push(`shared_entities:${sharedEntities.length}`);
    }
  }

  // 4. Title word overlap (lightweight semantic similarity)
  const aWords = new Set(topicA.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const bWords = new Set(topicB.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const sharedWords = [...aWords].filter(w => bWords.has(w));
  if (sharedWords.length > 0) {
    score += Math.min(sharedWords.length * 5, 15);
    reasons.push(`title_overlap:${sharedWords.length}`);
  }

  // 5. Query type alignment (from query_type field)
  if (topicA.query_type && topicB.query_type && topicA.query_type === topicB.query_type) {
    score += 10;
    reasons.push('same_query_type');
  }

  // 6. Attribute focus overlap (from attribute_focus field)
  if (topicA.attribute_focus && topicB.attribute_focus &&
      topicA.attribute_focus.toLowerCase() === topicB.attribute_focus.toLowerCase()) {
    score += 15;
    reasons.push('same_attribute_focus');
  }

  return { topicId: topicB.id, score, reasons };
};

/**
 * NEW: Detect Quality Nodes - pages that should receive more PageRank
 * Based on Holistic SEO principle of directing PageRank to money pages
 */
const detectQualityNode = (topic: EnrichedTopic): QualityNodeScore => {
  // Check metadata for search volume and unique content indicators
  const searchVolume = (topic.metadata?.search_volume as number | undefined) || 0;
  const hasUniqueAngle = !!(topic.metadata?.unique_angle || topic.metadata?.content_gap);

  const factors = {
    isMonetization: topic.topic_class === 'monetization',
    isPillar: topic.cluster_role === 'pillar',
    hasHighSearchVolume: searchVolume > 1000,
    hasUniqueContent: hasUniqueAngle || !!topic.attribute_focus, // attribute_focus indicates unique angle
  };

  // Calculate quality score
  let score = 0;
  if (factors.isMonetization) score += 40; // Money pages are highest priority
  if (factors.isPillar) score += 30;       // Pillars distribute authority
  if (factors.hasHighSearchVolume) score += 20;
  if (factors.hasUniqueContent) score += 10;

  return {
    pageId: topic.id,
    isQualityNode: score >= 40, // Threshold for being a Quality Node
    score,
    factors,
  };
};

/**
 * NEW: Generate annotation text hint for contextual bridge
 * Based on Holistic SEO principle that surrounding text describes *why* link is necessary
 */
const generateAnnotationHint = (
  currentTopic: EnrichedTopic | undefined,
  targetTopic: EnrichedTopic,
  relevanceScore: TopicRelevanceScore
): string => {
  if (!currentTopic) return '';

  // Build contextual bridge hint based on relationship
  if (relevanceScore.reasons.includes('same_cluster')) {
    return `For more on ${targetTopic.title.toLowerCase()} within this topic area...`;
  }
  if (relevanceScore.reasons.some(r => r.startsWith('shared_entities'))) {
    return `Related concept: ${targetTopic.title}`;
  }
  if (relevanceScore.reasons.includes('same_intent')) {
    return `Also relevant: ${targetTopic.title}`;
  }
  return `See also: ${targetTopic.title}`;
};

/**
 * Sort topics by priority strategy
 * ENHANCED: Now uses semantic relevance scoring
 */
const sortTopicsByPriority = (
  topics: EnrichedTopic[],
  strategy: 'relevance' | 'recency' | 'authority',
  currentTopic?: EnrichedTopic,
  eavs?: SemanticTriple[]
): EnrichedTopic[] => {
  return [...topics].sort((a, b) => {
    switch (strategy) {
      case 'authority':
        // Quality Nodes first, then pillars, then by cluster_role
        const aQuality = detectQualityNode(a);
        const bQuality = detectQualityNode(b);
        if (aQuality.isQualityNode !== bQuality.isQualityNode) {
          return aQuality.isQualityNode ? -1 : 1;
        }
        // Pillars next
        const roleOrder: Record<string, number> = { pillar: 0, cluster_content: 1, standalone: 2 };
        return (roleOrder[a.cluster_role || 'standalone'] || 2) - (roleOrder[b.cluster_role || 'standalone'] || 2);

      case 'recency':
        // Newer topics first (if we had creation dates)
        return 0; // No recency data available

      case 'relevance':
      default:
        // ENHANCED: Use semantic relevance scoring
        if (currentTopic) {
          const aRelevance = calculateSemanticRelevance(currentTopic, a, eavs);
          const bRelevance = calculateSemanticRelevance(currentTopic, b, eavs);
          if (aRelevance.score !== bRelevance.score) {
            return bRelevance.score - aRelevance.score; // Higher score first
          }
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
 * ENHANCED with Holistic SEO principles:
 * - Quality Node prioritization for PageRank flow
 * - Semantic relevance scoring for contextual linking
 * - Annotation text hints for contextual bridges
 */
export const generateDynamicNavigation = (ctx: DynamicNavigationContext): GeneratedNavigation => {
  const segment = detectSegment(ctx.currentPageId, ctx.currentPageType, ctx.topics);

  // Get rule for this segment (custom or default)
  const customRule = ctx.config.rules.find(r => r.segment === segment);
  const rule = customRule || getDefaultRule(segment);

  const currentTopic = ctx.topics.find(t => t.id === ctx.currentPageId);

  // NEW: Track annotation hints for contextual bridge text
  const linkAnnotations = new Map<string, string>();

  // Generate header links - ENHANCED with Quality Node detection
  let headerTopics = filterTopicsByRule(ctx.topics, rule.headerLinks);

  // HOLISTIC SEO: Prioritize Quality Nodes (monetization pages) in header
  // Research: "The primary function of internal linking is directing PageRank to core monetization sections"
  headerTopics = sortTopicsByPriority(headerTopics, rule.headerLinks.prioritizeBy, currentTopic, ctx.eavs);
  headerTopics = headerTopics.slice(0, rule.headerLinks.maxLinks);

  const headerLinks: NavigationLink[] = headerTopics.map(t => {
    const quality = detectQualityNode(t);
    // Quality Nodes get high prominence to signal importance
    const prominence = quality.isQualityNode ? 'high' : (t.cluster_role === 'pillar' ? 'high' : 'medium');
    return topicToLink(t, prominence);
  });

  // Add foundation pages to header if included
  // HOLISTIC SEO: Only include essential foundation pages (About, Contact) - NOT legal pages
  // Research: "If most linked pages are low-traffic corporate pages, Google may ignore internal link factor"
  if (rule.headerLinks.include.includes('foundation')) {
    const prioritizedFPs = ctx.foundationPages
      .filter(fp => !fp.deleted_at)
      .filter(fp => ['homepage', 'about', 'contact'].includes(fp.page_type)) // Exclude legal pages from header
      .slice(0, 3);
    prioritizedFPs.forEach(fp => headerLinks.push(foundationToLink(fp, 'low')));
  }

  // Generate footer links - ENHANCED with semantic grouping
  const footerLinks: NavigationLink[] = [];

  // Foundation pages in footer - but deprioritize legal pages
  // HOLISTIC SEO: Legal pages should be at bottom, not competing with Quality Nodes
  if (rule.footerLinks.include.includes('foundation')) {
    const nonLegalFPs = ctx.foundationPages
      .filter(fp => !fp.deleted_at && !['privacy', 'terms'].includes(fp.page_type));
    const legalFPs = ctx.foundationPages
      .filter(fp => !fp.deleted_at && ['privacy', 'terms'].includes(fp.page_type));

    // Add non-legal first with medium prominence
    nonLegalFPs.forEach(fp => footerLinks.push(foundationToLink(fp, 'medium')));
    // Legal pages at end with low prominence
    legalFPs.forEach(fp => footerLinks.push(foundationToLink(fp, 'low')));
  }

  // Pillar pages in footer - these are important for PageRank distribution
  if (rule.footerLinks.include.includes('pillar')) {
    ctx.topics
      .filter(t => t.cluster_role === 'pillar')
      .slice(0, 5)
      .forEach(t => footerLinks.push(topicToLink(t, 'medium')));
  }

  // Generate sidebar links (if enabled) - ENHANCED with semantic relevance
  let sidebarLinks: NavigationLink[] | undefined;
  if (rule.sidebarLinks) {
    sidebarLinks = [];

    // Parent pillar link - always important for authority flow
    if (rule.sidebarLinks.showParentPillar && currentTopic?.parent_topic_id) {
      const parentPillar = ctx.topics.find(t => t.id === currentTopic.parent_topic_id);
      if (parentPillar) {
        sidebarLinks.push(topicToLink(parentPillar, 'high'));
        linkAnnotations.set(parentPillar.id, `Return to ${parentPillar.title} overview`);
      }
    }

    // Sibling cluster links - ENHANCED with semantic relevance scoring
    // HOLISTIC SEO: "Links in sidebar should change dynamically based on current page's context"
    if (rule.sidebarLinks.showClusterSiblings && currentTopic) {
      let siblings = ctx.topics.filter(t =>
        t.parent_topic_id === currentTopic.parent_topic_id &&
        t.id !== currentTopic.id &&
        t.cluster_role !== 'pillar'
      );

      // Sort siblings by semantic relevance to current topic
      siblings = sortTopicsByPriority(siblings, 'relevance', currentTopic, ctx.eavs);

      siblings
        .slice(0, rule.sidebarLinks.maxLinks)
        .forEach(t => {
          sidebarLinks!.push(topicToLink(t, 'low'));
          // Generate annotation hint for contextual bridge
          const relevance = calculateSemanticRelevance(currentTopic, t, ctx.eavs);
          linkAnnotations.set(t.id, generateAnnotationHint(currentTopic, t, relevance));
        });
    }

    // If this is a pillar, show child clusters - sorted by Quality Node score
    if (segment === 'pillar' && currentTopic) {
      let children = ctx.topics.filter(t => t.parent_topic_id === currentTopic.id);

      // Sort children: Quality Nodes (monetization) first
      children = children.sort((a, b) => {
        const aQuality = detectQualityNode(a);
        const bQuality = detectQualityNode(b);
        return bQuality.score - aQuality.score;
      });

      children
        .slice(0, rule.sidebarLinks.maxLinks)
        .forEach(t => {
          const quality = detectQualityNode(t);
          sidebarLinks!.push(topicToLink(t, quality.isQualityNode ? 'high' : 'medium'));
        });
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
    // NEW: Annotation hints for contextual bridge text around links
    linkAnnotations: linkAnnotations.size > 0 ? linkAnnotations : undefined,
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

/**
 * NEW: Analyze Quality Nodes in the topical map
 * Returns insights for PageRank optimization strategy
 */
export const analyzeQualityNodes = (
  topics: EnrichedTopic[]
): { qualityNodes: QualityNodeScore[]; summary: string } => {
  const allScores = topics.map(t => detectQualityNode(t));
  const qualityNodes = allScores.filter(s => s.isQualityNode).sort((a, b) => b.score - a.score);

  const monetizationCount = allScores.filter(s => s.factors.isMonetization).length;
  const pillarCount = allScores.filter(s => s.factors.isPillar).length;
  const highVolumeCount = allScores.filter(s => s.factors.hasHighSearchVolume).length;

  const summary = `Found ${qualityNodes.length} Quality Nodes from ${topics.length} topics. ` +
    `Breakdown: ${monetizationCount} monetization pages, ${pillarCount} pillars, ${highVolumeCount} high-volume pages. ` +
    `These pages should receive priority in navigation links for optimal PageRank flow.`;

  return { qualityNodes, summary };
};

/**
 * NEW: Get semantic link suggestions between two pages
 * Returns contextual bridge recommendations based on entity overlap
 */
export const getSemanticLinkSuggestions = (
  sourceTopic: EnrichedTopic,
  allTopics: EnrichedTopic[],
  eavs?: SemanticTriple[],
  maxSuggestions: number = 5
): Array<{ topic: EnrichedTopic; relevance: TopicRelevanceScore; annotation: string }> => {
  const suggestions = allTopics
    .filter(t => t.id !== sourceTopic.id)
    .map(t => {
      const relevance = calculateSemanticRelevance(sourceTopic, t, eavs);
      const annotation = generateAnnotationHint(sourceTopic, t, relevance);
      return { topic: t, relevance, annotation };
    })
    .filter(s => s.relevance.score > 0)
    .sort((a, b) => b.relevance.score - a.relevance.score)
    .slice(0, maxSuggestions);

  return suggestions;
};

/**
 * Validate anchor text quality
 * Returns issues found with the anchor text
 */
const validateAnchorText = (text: string): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  const lowerText = text.toLowerCase().trim();

  // Generic/bad anchor text patterns
  const genericPhrases = [
    'click here', 'read more', 'learn more', 'here', 'this link',
    'more info', 'click', 'link', 'details', 'see more', 'view more'
  ];

  if (genericPhrases.some(p => lowerText === p || lowerText.includes(p))) {
    issues.push(`"${text}" uses generic anchor text - reduces SEO value`);
  }

  if (text.length < 2) {
    issues.push(`"${text}" is too short - anchor text should be descriptive`);
  }

  if (text.length > 60) {
    issues.push(`"${text.substring(0, 30)}..." is too long (${text.length} chars) - keep under 60`);
  }

  // Check for URL-like text
  if (text.includes('http') || text.includes('www.')) {
    issues.push(`"${text}" appears to be a URL - use descriptive text instead`);
  }

  return { valid: issues.length === 0, issues };
};

/**
 * NEW: Validate navigation against Holistic SEO best practices
 */
export const validateNavigationSEO = (
  navigation: GeneratedNavigation,
  topics: EnrichedTopic[],
  foundationPages: FoundationPage[]
): { score: number; issues: string[]; recommendations: string[] } => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check 1: Total link count (should be under 150)
  const totalLinks = navigation.headerLinks.length + navigation.footerLinks.length + (navigation.sidebarLinks?.length || 0);
  if (totalLinks > 150) {
    issues.push(`Total link count (${totalLinks}) exceeds 150. This dilutes PageRank.`);
    score -= 20;
  } else if (totalLinks > 100) {
    recommendations.push(`Consider reducing link count (currently ${totalLinks}) for better PageRank concentration.`);
    score -= 5;
  }

  // Check 2: Quality Node representation in header
  const qualityNodeTopicIds = new Set(
    topics.filter(t => detectQualityNode(t).isQualityNode).map(t => t.id)
  );
  const headerQualityNodes = navigation.headerLinks.filter(l =>
    l.target_topic_id && qualityNodeTopicIds.has(l.target_topic_id)
  );
  if (headerQualityNodes.length === 0 && qualityNodeTopicIds.size > 0) {
    issues.push('No Quality Nodes (monetization pages) in header navigation. PageRank flow not optimized.');
    score -= 15;
  }

  // Check 3: Legal pages prominence
  const legalPageIds = new Set(
    foundationPages.filter(fp => ['privacy', 'terms'].includes(fp.page_type)).map(fp => fp.id)
  );
  const headerLegalPages = navigation.headerLinks.filter(l =>
    l.target_foundation_page_id && legalPageIds.has(l.target_foundation_page_id)
  );
  if (headerLegalPages.length > 0) {
    issues.push('Legal pages (Privacy, Terms) should not be in header navigation - they dilute relevance signals.');
    score -= 10;
  }

  // Check 4: Pillar representation
  const pillarIds = new Set(topics.filter(t => t.cluster_role === 'pillar').map(t => t.id));
  const headerPillars = navigation.headerLinks.filter(l =>
    l.target_topic_id && pillarIds.has(l.target_topic_id)
  );
  if (headerPillars.length === 0 && pillarIds.size > 0) {
    issues.push('No pillar pages in header navigation - authority distribution is not optimized.');
    score -= 10;
  } else if (headerPillars.length > 0 && headerPillars.length < pillarIds.size) {
    recommendations.push(`Only ${headerPillars.length}/${pillarIds.size} pillar pages in header. Consider adding more.`);
    score -= 3;
  }

  // Check 5: Breadcrumb depth (should be 2-4 levels)
  if (navigation.breadcrumbs.length > 5) {
    recommendations.push('Breadcrumb depth exceeds recommended maximum. Consider flattening site structure.');
    score -= 5;
  }

  // Check 6: Anchor text quality
  const allLinks = [...navigation.headerLinks, ...navigation.footerLinks];
  const anchorIssues: string[] = [];
  for (const link of allLinks) {
    const validation = validateAnchorText(link.text);
    if (!validation.valid) {
      anchorIssues.push(...validation.issues);
    }
  }
  if (anchorIssues.length > 0) {
    // Only show first 3 anchor issues to avoid overwhelming
    const displayIssues = anchorIssues.slice(0, 3);
    displayIssues.forEach(issue => issues.push(issue));
    if (anchorIssues.length > 3) {
      issues.push(`...and ${anchorIssues.length - 3} more anchor text issues`);
    }
    score -= Math.min(15, anchorIssues.length * 3); // Cap penalty at 15 points
  }

  // Check 7: Monetization priority in header (should be in top 5 positions)
  const monetizationTopicIds = new Set(
    topics.filter(t => t.topic_class === 'monetization').map(t => t.id)
  );
  if (monetizationTopicIds.size > 0) {
    const top5HeaderTopics = navigation.headerLinks.slice(0, 5).filter(l =>
      l.target_topic_id && monetizationTopicIds.has(l.target_topic_id)
    );
    if (top5HeaderTopics.length === 0) {
      recommendations.push('No monetization (money) pages in top 5 header positions. Consider promoting them for PageRank.');
      score -= 5;
    }
  }

  // Check 8: Header link count (should be 8-10 for optimal UX and PageRank)
  if (navigation.headerLinks.length > 10) {
    recommendations.push(`Header has ${navigation.headerLinks.length} links - consider reducing to 8-10 for better UX.`);
    score -= 5;
  } else if (navigation.headerLinks.length < 4) {
    recommendations.push(`Header has only ${navigation.headerLinks.length} links - consider adding more key pages.`);
    score -= 3;
  }

  return { score: Math.max(0, score), issues, recommendations };
};

// ============================================
// FEATURE 2: Contextual Bridge Detection
// ============================================

export interface LinkBridgeAnalysis {
  linkId: string;
  targetTopicId?: string;
  targetTitle: string;
  needsBridge: boolean;
  relevanceScore: number;
  suggestedBridge?: string;
  reasons: string[];
}

/**
 * Identify links that need contextual bridge text
 * Links with semantic relevance score < 20 need bridges to justify the connection
 */
export const identifyLinksNeedingBridge = (
  navigation: GeneratedNavigation,
  currentTopic: EnrichedTopic | undefined,
  topics: EnrichedTopic[],
  eavs?: SemanticTriple[]
): LinkBridgeAnalysis[] => {
  const results: LinkBridgeAnalysis[] = [];
  const BRIDGE_THRESHOLD = 20; // Links below this score need bridges

  const allLinks = [
    ...navigation.headerLinks,
    ...navigation.footerLinks,
    ...(navigation.sidebarLinks || []),
  ];

  for (const link of allLinks) {
    if (!link.target_topic_id) continue;

    const targetTopic = topics.find(t => t.id === link.target_topic_id);
    if (!targetTopic) continue;

    // Calculate relevance between current topic and target
    let relevanceScore = 0;
    const reasons: string[] = [];

    if (currentTopic) {
      const relevance = calculateSemanticRelevance(currentTopic, targetTopic, eavs);
      relevanceScore = relevance.score;
      reasons.push(...relevance.reasons);
    } else {
      // Foundation pages - use basic scoring
      relevanceScore = targetTopic.cluster_role === 'pillar' ? 30 : 15;
      reasons.push('foundation_page_context');
    }

    const needsBridge = relevanceScore < BRIDGE_THRESHOLD;

    let suggestedBridge: string | undefined;
    if (needsBridge && currentTopic) {
      // Generate bridge suggestion
      if (currentTopic.topic_class !== targetTopic.topic_class) {
        suggestedBridge = `For a different perspective on this topic, explore ${targetTopic.title.toLowerCase()}`;
      } else if (currentTopic.parent_topic_id !== targetTopic.parent_topic_id) {
        suggestedBridge = `Related topic from another cluster: ${targetTopic.title}`;
      } else {
        suggestedBridge = `Learn more about ${targetTopic.title.toLowerCase()} in this related guide`;
      }
    }

    results.push({
      linkId: link.id || `link-${link.target_topic_id}`,
      targetTopicId: link.target_topic_id,
      targetTitle: targetTopic.title,
      needsBridge,
      relevanceScore,
      suggestedBridge,
      reasons,
    });
  }

  return results;
};

// ============================================
// FEATURE 4: N-gram Validation (Central Entity in Header)
// ============================================

export interface NavigationNGramAnalysis {
  linksWithCentralEntity: NavigationLink[];
  linksWithoutCentralEntity: NavigationLink[];
  entityReinforcement: number; // 0-100 score
  centralEntityWords: string[];
  suggestions: string[];
}

/**
 * Analyze navigation links for Central Entity n-gram presence
 * Research: Header links should reinforce the central entity for topical authority
 */
export const analyzeNavigationNGrams = (
  navigation: NavigationStructure,
  pillars: SEOPillars
): NavigationNGramAnalysis => {
  // Extract meaningful words from central entity (lowercase, no stop words)
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'will', 'can', 'has', 'have', 'had', 'been', 'being', 'its', 'your', 'our']);
  const centralEntityWords = (pillars.centralEntity || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Also check source context for additional entity words
  const sourceContextWords = (pillars.sourceContext || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const allEntityWords = [...new Set([...centralEntityWords, ...sourceContextWords])];

  const linksWithCentralEntity: NavigationLink[] = [];
  const linksWithoutCentralEntity: NavigationLink[] = [];

  const headerLinks = navigation.header?.primary_nav || [];

  for (const link of headerLinks) {
    const linkText = link.text.toLowerCase();
    const linkWords = linkText.split(/\s+/);

    // Check if any entity word appears in the link text
    const hasEntity = allEntityWords.some(entityWord =>
      linkWords.some(linkWord => linkWord.includes(entityWord) || entityWord.includes(linkWord))
    );

    if (hasEntity) {
      linksWithCentralEntity.push(link);
    } else {
      linksWithoutCentralEntity.push(link);
    }
  }

  // Calculate entity reinforcement score (0-100)
  const totalLinks = headerLinks.length;
  const entityReinforcement = totalLinks > 0
    ? Math.round((linksWithCentralEntity.length / totalLinks) * 100)
    : 0;

  // Generate suggestions
  const suggestions: string[] = [];
  if (entityReinforcement < 30) {
    suggestions.push(`Only ${entityReinforcement}% of header links contain central entity terms. Consider adding more topic-focused links.`);
  }
  if (linksWithoutCentralEntity.length > 5) {
    const examples = linksWithoutCentralEntity.slice(0, 3).map(l => `"${l.text}"`).join(', ');
    suggestions.push(`These links lack entity reinforcement: ${examples}. Consider rephrasing or replacing with more topical links.`);
  }
  if (allEntityWords.length === 0) {
    suggestions.push('No central entity defined. Set up SEO pillars to enable n-gram validation.');
  }

  return {
    linksWithCentralEntity,
    linksWithoutCentralEntity,
    entityReinforcement,
    centralEntityWords: allEntityWords,
    suggestions,
  };
};

// ============================================
// FEATURE 5: Anchor Text Repetition Counter
// ============================================

export interface AnchorRepetitionViolation {
  targetId: string;
  targetTitle: string;
  anchor: string;
  count: number;
  sources: string[];
  riskLevel: 'warning' | 'critical';
}

export interface AnchorDiversificationSuggestion {
  currentAnchor: string;
  targetTitle: string;
  alternatives: string[];
}

export interface AnchorRepetitionResult {
  violations: AnchorRepetitionViolation[];
  diversificationSuggestions: AnchorDiversificationSuggestion[];
  overallScore: number; // 0-100, higher is better (less repetition)
  summary: string;
}

/**
 * Analyze anchor text repetition across topics and navigation
 * Research: Same anchor text used >3 times for same target is a warning, >5 is critical
 */
export const analyzeAnchorRepetition = (
  topics: EnrichedTopic[],
  briefs: Record<string, any>,
  navigation: NavigationStructure
): AnchorRepetitionResult => {
  // Track anchor text usage per target
  const anchorUsageByTarget = new Map<string, Map<string, string[]>>();

  // Analyze navigation anchor texts
  const allNavLinks = [
    ...(navigation.header?.primary_nav || []),
    ...(navigation.footer?.sections?.flatMap(s => s.links) || []),
    ...(navigation.footer?.legal_links || []),
  ];

  for (const link of allNavLinks) {
    const targetId = link.target_topic_id || link.target_foundation_page_id || 'unknown';
    const anchorText = link.text.toLowerCase().trim();

    if (!anchorUsageByTarget.has(targetId)) {
      anchorUsageByTarget.set(targetId, new Map());
    }
    const targetAnchors = anchorUsageByTarget.get(targetId)!;

    if (!targetAnchors.has(anchorText)) {
      targetAnchors.set(anchorText, []);
    }
    targetAnchors.get(anchorText)!.push('navigation');
  }

  // Analyze briefs for contextual bridge links
  for (const [topicId, brief] of Object.entries(briefs)) {
    const contextualBridge = (brief as any).contextualBridge;
    if (!contextualBridge) continue;

    // Handle both array and section formats
    const links = Array.isArray(contextualBridge)
      ? contextualBridge
      : (contextualBridge as any).links || [];

    for (const link of links) {
      if (!link.targetTopic || !link.anchorText) continue;

      const targetTitle = link.targetTopic.toLowerCase();
      const anchorText = link.anchorText.toLowerCase().trim();

      // Find target topic ID by title
      const targetTopic = topics.find(t => t.title.toLowerCase() === targetTitle);
      const targetId = targetTopic?.id || targetTitle;

      if (!anchorUsageByTarget.has(targetId)) {
        anchorUsageByTarget.set(targetId, new Map());
      }
      const targetAnchors = anchorUsageByTarget.get(targetId)!;

      if (!targetAnchors.has(anchorText)) {
        targetAnchors.set(anchorText, []);
      }
      const sourceTopic = topics.find(t => t.id === topicId);
      targetAnchors.get(anchorText)!.push(sourceTopic?.title || topicId);
    }
  }

  // Find violations
  const violations: AnchorRepetitionViolation[] = [];
  let totalAnchors = 0;
  let repetitiveAnchors = 0;

  for (const [targetId, anchors] of anchorUsageByTarget) {
    const targetTopic = topics.find(t => t.id === targetId);
    const targetTitle = targetTopic?.title || targetId;

    for (const [anchor, sources] of anchors) {
      totalAnchors++;
      const count = sources.length;

      if (count > 3) {
        repetitiveAnchors++;
        violations.push({
          targetId,
          targetTitle,
          anchor,
          count,
          sources,
          riskLevel: count > 5 ? 'critical' : 'warning',
        });
      }
    }
  }

  // Generate diversification suggestions for top violations
  const diversificationSuggestions: AnchorDiversificationSuggestion[] = violations
    .slice(0, 5)
    .map(v => {
      const topic = topics.find(t => t.id === v.targetId);
      const alternatives: string[] = [];

      // Generate alternatives based on topic data
      if (topic) {
        if (topic.description) {
          // Extract key phrases from description
          const descWords = topic.description.split(' ').slice(0, 4).join(' ');
          alternatives.push(descWords.toLowerCase());
        }
        if (topic.attribute_focus) {
          alternatives.push(`${topic.title.toLowerCase()} ${topic.attribute_focus.toLowerCase()}`);
        }
        if (topic.canonical_query) {
          alternatives.push(topic.canonical_query.toLowerCase());
        }
        // Action-based alternatives
        alternatives.push(`learn about ${topic.title.toLowerCase()}`);
        alternatives.push(`explore ${topic.title.toLowerCase()}`);
        alternatives.push(`${topic.title.toLowerCase()} guide`);
      }

      return {
        currentAnchor: v.anchor,
        targetTitle: v.targetTitle,
        alternatives: [...new Set(alternatives)].slice(0, 4),
      };
    });

  // Calculate overall score
  const overallScore = totalAnchors > 0
    ? Math.round(100 - (repetitiveAnchors / totalAnchors) * 100)
    : 100;

  const criticalCount = violations.filter(v => v.riskLevel === 'critical').length;
  const warningCount = violations.filter(v => v.riskLevel === 'warning').length;

  const summary = violations.length === 0
    ? 'No anchor text repetition issues detected.'
    : `Found ${violations.length} repetition issues (${criticalCount} critical, ${warningCount} warnings). Consider diversifying anchor text.`;

  return {
    violations,
    diversificationSuggestions,
    overallScore,
    summary,
  };
};

// ============================================
// FEATURE 6: DOM Size Monitoring
// ============================================

export interface DOMEstimate {
  estimatedNodes: number;
  breakdown: {
    headerNav: number;
    footerSections: number;
    legalLinks: number;
    napData: number;
    wrappers: number;
  };
  corScore: number; // Cost of Retrieval (0-100, lower is better)
  status: 'optimal' | 'warning' | 'critical';
  recommendations: string[];
}

/**
 * Estimate DOM node count for navigation elements
 * Research: Navigation should stay under ~150 nodes to leave room for content (page budget ~1,200)
 */
export const estimateNavigationDOMSize = (
  navigation: NavigationStructure,
  hasNapData: boolean
): DOMEstimate => {
  const breakdown = {
    headerNav: 0,
    footerSections: 0,
    legalLinks: 0,
    napData: 0,
    wrappers: 0,
  };

  // Header navigation estimation
  // Each link: <li> + <a> + text node = ~3 nodes
  // Header wrapper: <header> + <nav> + <ul> = ~3 nodes
  const headerLinks = navigation.header?.primary_nav?.length || 0;
  breakdown.headerNav = 3 + (headerLinks * 3); // wrapper + links

  // CTA button: ~3 nodes
  if (navigation.header?.cta_button) {
    breakdown.headerNav += 3;
  }

  // Footer sections estimation
  // Each section: <div> + <h4> + <ul> = ~3 nodes
  // Each link in section: <li> + <a> + text = ~3 nodes
  const footerSections = navigation.footer?.sections || [];
  for (const section of footerSections) {
    breakdown.footerSections += 3; // Section wrapper
    breakdown.footerSections += (section.links?.length || 0) * 3;
  }

  // Legal links: similar structure
  const legalLinks = navigation.footer?.legal_links?.length || 0;
  breakdown.legalLinks = legalLinks * 3;

  // NAP data estimation (if displayed)
  // Company name, address, phone, email = ~10 nodes
  if (hasNapData && navigation.footer?.nap_display) {
    breakdown.napData = 12; // Typical NAP block
  }

  // Wrapper elements (header, footer, containers)
  breakdown.wrappers = 10; // Conservative estimate for structural elements

  const estimatedNodes = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // Calculate Cost of Retrieval score (0-100, lower is better)
  // Based on navigation taking up portion of 1,200 node budget
  const PAGE_BUDGET = 1200;
  const NAV_BUDGET = 150; // Ideal max for navigation
  const corScore = Math.min(100, Math.round((estimatedNodes / NAV_BUDGET) * 100));

  // Determine status
  let status: 'optimal' | 'warning' | 'critical';
  if (estimatedNodes <= 150) {
    status = 'optimal';
  } else if (estimatedNodes <= 200) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (status === 'warning' || status === 'critical') {
    if (breakdown.headerNav > 30) {
      recommendations.push(`Header has ${headerLinks} links (~${breakdown.headerNav} nodes). Consider reducing to 8-10 links.`);
    }
    if (breakdown.footerSections > 60) {
      recommendations.push(`Footer sections use ~${breakdown.footerSections} nodes. Consider consolidating sections.`);
    }
    if (footerSections.length > 4) {
      recommendations.push(`${footerSections.length} footer sections may be excessive. Aim for 3-4 sections.`);
    }
  }
  if (estimatedNodes > 200) {
    recommendations.push(`Navigation uses ${estimatedNodes} nodes (~${Math.round(estimatedNodes / PAGE_BUDGET * 100)}% of page budget). This impacts Cost of Retrieval.`);
  }
  if (recommendations.length === 0 && status === 'optimal') {
    recommendations.push(`Navigation is optimized at ${estimatedNodes} nodes. Good Cost of Retrieval performance.`);
  }

  return {
    estimatedNodes,
    breakdown,
    corScore,
    status,
    recommendations,
  };
};

export default {
  detectSegment,
  getDefaultRule,
  generateDynamicNavigation,
  createDefaultConfig,
  previewNavigationForAllSegments,
  analyzeQualityNodes,
  getSemanticLinkSuggestions,
  validateNavigationSEO,
  // New exports
  identifyLinksNeedingBridge,
  analyzeNavigationNGrams,
  analyzeAnchorRepetition,
  estimateNavigationDOMSize,
};
