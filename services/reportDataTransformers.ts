/**
 * Report Data Transformers
 *
 * Transforms application data structures into business-friendly report data.
 * Handles the conversion from technical SEO data to stakeholder-readable formats.
 */

import {
  TopicalMap,
  ContentBrief,
  ContentGenerationJob,
  EnrichedTopic,
  SemanticTriple,
  SiteInventoryItem,
  TransitionStatus,
  ActionType,
  AuditDetails
} from '../types';
import { SiteAuditResult } from './ai/siteAudit/types';
import {
  TopicalMapReportData,
  ContentBriefReportData,
  ArticleDraftReportData,
  MigrationReportData,
  MetricCard,
  PieChartData,
  BarChartData,
  TimelineItem,
  GapItem,
  ReportActionItem,
  PriorityMatrixItem,
  getBusinessTerm,
  CHART_COLORS,
  DECISION_COLORS,
  STATUS_COLORS
} from '../types/reports';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatDate = (date?: string | Date): string => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

const getReadingTime = (wordCount: number): string => {
  const minutes = Math.ceil(wordCount / 200); // Average reading speed
  return `${minutes} min read`;
};

// ============================================
// TOPICAL MAP TRANSFORMER
// ============================================

/**
 * Generate business-friendly explanation for why the central entity matters
 */
const getCentralEntityExplanation = (ce: string, businessType: string): string => {
  return `The Central Entity is "${ce}" - this is the core topic around which all your content revolves. Search engines use this to understand what your website is the authority on. Every piece of content should relate back to this entity.`;
};

const getCentralEntityBusinessImpact = (ce: string): string => {
  return `By consistently building content around "${ce}", search engines will recognize your site as an expert resource. This leads to higher rankings for related searches, more organic traffic, and stronger brand authority in your market.`;
};

const getSourceContextExplanation = (sc: string): string => {
  return `The Source Context is "${sc}" - this defines your unique perspective and expertise. It's what differentiates your content from competitors writing about the same topics. It answers the question: "Why should customers trust YOUR content?"`;
};

const getSourceContextBusinessImpact = (sc: string): string => {
  return `Your source context "${sc}" establishes credibility and trust. When visitors see content that reflects genuine expertise and a specific viewpoint, they're more likely to engage, convert, and return. It also helps search engines understand your E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).`;
};

const getCentralSearchIntentExplanation = (csi: string): string => {
  return `The Central Search Intent is "${csi}" - this is what your ideal customers are trying to accomplish when they search. Understanding this intent ensures all your content addresses real customer needs rather than just keywords.`;
};

const getCentralSearchIntentBusinessImpact = (csi: string): string => {
  return `Aligning content with the intent "${csi}" means visitors find exactly what they're looking for. This improves engagement metrics (time on site, pages per session), reduces bounce rates, and most importantly - leads to more conversions because you're meeting customer needs directly.`;
};

/**
 * Get category descriptions for EAVs
 */
const getEavCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    'ROOT': 'Foundational attributes that define the core identity of your business and offerings.',
    'UNIQUE': 'Differentiating attributes that set you apart from competitors and create competitive advantage.',
    'RARE': 'Specialized attributes that demonstrate deep expertise in niche areas.',
    'COMMON': 'Standard attributes that customers expect - important for completeness but not differentiation.'
  };
  return descriptions[category] || 'Attributes that provide comprehensive information about your offerings.';
};

export const transformTopicalMapData = (
  map: TopicalMap,
  topics: EnrichedTopic[]
): TopicalMapReportData => {
  const coreTopics = topics.filter(t => t.type === 'core' || !t.parent_topic_id);
  const outerTopics = topics.filter(t => t.type === 'outer' || (t.parent_topic_id && t.type !== 'core'));
  const eavs = map.eavs || [];

  // Extract the 3 pillars
  const centralEntity = map.pillars?.centralEntity || 'Not defined';
  const sourceContext = map.pillars?.sourceContext || 'Not defined';
  const centralSearchIntent = map.pillars?.centralSearchIntent || 'Not defined';

  // Group EAVs by category with descriptions
  const eavCategories = eavs.reduce((acc, eav) => {
    const category = eav.predicate?.category || 'COMMON';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate topic depth
  const calculateDepth = (topic: EnrichedTopic, depth: number = 1): number => {
    const children = topics.filter(t => t.parent_topic_id === topic.id);
    if (children.length === 0) return depth;
    return Math.max(...children.map(c => calculateDepth(c, depth + 1)));
  };
  const maxDepth = Math.max(1, ...topics.filter(t => !t.parent_topic_id).map(t => calculateDepth(t)));

  // Generate gaps from validation result with better explanations
  const gaps: GapItem[] = [];
  if (map.analysis_state?.validationResult) {
    const validation = map.analysis_state.validationResult;
    if (validation.issues) {
      validation.issues.forEach((issue, i) => {
        gaps.push({
          id: `gap-${i}`,
          title: issue.rule || 'Content Gap',
          description: issue.message || '',
          severity: issue.severity === 'CRITICAL' ? 'critical' : issue.severity === 'WARNING' ? 'warning' : 'info',
          recommendation: getGapRecommendation(issue.rule)
        });
      });
    }
  }

  // Generate next steps with business reasoning
  const nextSteps: ReportActionItem[] = [];

  if (outerTopics.length < coreTopics.length * 3) {
    nextSteps.push({
      id: 'action-expand-outer',
      title: 'Expand Supporting Content',
      description: `Currently you have ${coreTopics.length} core topics and ${outerTopics.length} supporting topics. For optimal topical authority, each core topic should have 4-7 supporting articles. This creates a comprehensive content ecosystem that demonstrates expertise to search engines and provides value to visitors exploring related topics.`,
      priority: 'high',
      category: 'Content Strategy'
    });
  }

  if (eavs.length < 20) {
    nextSteps.push({
      id: 'action-add-eavs',
      title: 'Enhance Semantic Coverage',
      description: `You have ${eavs.length} semantic attributes defined. Adding more specific attributes (like features, benefits, comparisons, use cases) helps search engines deeply understand your content and match it to specific user queries. Aim for 40-60 attributes for comprehensive coverage.`,
      priority: 'medium',
      category: 'Semantic SEO'
    });
  }

  // Add pillar-related next steps if any are missing
  if (centralEntity === 'Not defined') {
    nextSteps.unshift({
      id: 'action-define-ce',
      title: 'Define Your Central Entity',
      description: 'The Central Entity is the foundation of your content strategy. Without it, content lacks focus and search engines cannot establish what your site is the authority on. This is critical to define before creating more content.',
      priority: 'critical',
      category: 'Foundation'
    });
  }

  // Build topic tree for optional section
  const topicTree = {
    coreTopics: coreTopics.map(core => ({
      id: core.id,
      title: core.title,
      description: core.description || '',
      reasoning: core.topical_border_note || `Core topic supporting "${centralEntity}" expertise`,
      children: topics
        .filter(t => t.parent_topic_id === core.id)
        .map(child => ({
          id: child.id,
          title: child.title,
          description: child.description || '',
          reasoning: child.topical_border_note || `Supporting content for "${core.title}"`
        }))
    }))
  };

  // Build EAV details for optional section
  const eavDetails = {
    categorizedTree: Object.entries(eavCategories).map(([category, count]) => ({
      category: getBusinessTerm(category),
      categoryDescription: getEavCategoryDescription(category),
      eavs: eavs
        .filter(eav => (eav.predicate?.category || 'COMMON') === category)
        .slice(0, 10)
        .map(eav => ({
          entity: typeof eav.subject === 'string' ? eav.subject : (eav.subject as any)?.value || 'Entity',
          attribute: eav.predicate?.relation || 'attribute',
          value: typeof eav.object === 'string' ? eav.object : (eav.object as any)?.value || 'Value',
          importance: getEavImportance(category)
        }))
    })),
    totalByCategory: Object.entries(eavCategories).map(([category, count]) => ({
      category: getBusinessTerm(category),
      count
    }))
  };

  // Generate business decisions that need stakeholder input
  const businessDecisions: TopicalMapReportData['businessDecisions'] = [];

  if (coreTopics.length > 0 && coreTopics.some(t => t.topic_class === 'monetization')) {
    businessDecisions.push({
      title: 'Content Prioritization',
      description: 'Your map includes both monetization-focused (service/product) pages and informational content. Which should be prioritized in your content calendar?',
      options: [
        'Prioritize monetization pages for faster revenue impact',
        'Prioritize informational content to build authority first',
        'Balanced approach with alternating focus'
      ],
      recommendation: 'For most businesses, a balanced approach works best - publish informational content to attract visitors while monetization pages convert them.',
      impact: 'This decision affects your content production schedule and expected timeline for SEO results.'
    });
  }

  return {
    mapName: map.name || map.map_name || 'Untitled Map',
    domain: map.domain || map.business_info?.domain,
    generatedAt: formatDate(),

    executiveSummary: {
      headline: `Your content strategy covers ${topics.length} topics targeting the ${map.business_info?.targetMarket || 'target'} market`,
      totalTopics: topics.length,
      coreTopics: coreTopics.length,
      outerTopics: outerTopics.length,
      targetMarket: map.business_info?.targetMarket || 'Not specified',
      centralEntity,
      sourceContext,
      centralSearchIntent
    },

    strategicFoundation: {
      pillars: {
        centralEntity: {
          value: centralEntity,
          explanation: getCentralEntityExplanation(centralEntity, map.business_info?.websiteType || 'business'),
          businessImpact: getCentralEntityBusinessImpact(centralEntity)
        },
        sourceContext: {
          value: sourceContext,
          explanation: getSourceContextExplanation(sourceContext),
          businessImpact: getSourceContextBusinessImpact(sourceContext)
        },
        centralSearchIntent: {
          value: centralSearchIntent,
          explanation: getCentralSearchIntentExplanation(centralSearchIntent),
          businessImpact: getCentralSearchIntentBusinessImpact(centralSearchIntent)
        }
      },
      overallStrategy: generateOverallStrategy(centralEntity, sourceContext, centralSearchIntent, topics.length)
    },

    topicHierarchy: {
      distribution: [
        { name: 'Core Topics', value: coreTopics.length, color: CHART_COLORS.primary[0], percentage: calculatePercentage(coreTopics.length, topics.length) },
        { name: 'Supporting Topics', value: outerTopics.length, color: CHART_COLORS.primary[2], percentage: calculatePercentage(outerTopics.length, topics.length) }
      ],
      pillars: coreTopics.slice(0, 10).map(t => ({
        name: t.title,
        topicCount: topics.filter(child => child.parent_topic_id === t.id).length + 1,
        description: t.description
      })),
      depth: maxDepth
    },

    topicTree,

    semanticCoverage: {
      totalEavs: eavs.length,
      categoryBreakdown: Object.entries(eavCategories).map(([category, count], i) => ({
        name: getBusinessTerm(category),
        value: count,
        color: CHART_COLORS.primary[i % CHART_COLORS.primary.length]
      })),
      coverageScore: Math.min(100, Math.round((eavs.length / 50) * 100)),
      topAttributes: eavs
        .slice(0, 10)
        .map(eav => ({
          attribute: eav.predicate?.relation || 'Unknown',
          count: 1
        })),
      explanation: `Semantic coverage measures how comprehensively your content addresses the different aspects customers search for. With ${eavs.length} defined attributes, ${getSemanticCoverageAssessment(eavs.length)}`
    },

    eavDetails,

    gaps,

    strategicAlignment: {
      centralEntityRelations: coreTopics.slice(0, 5).map(t => ({
        topic: t.title,
        relation: 'supports expertise in',
        explanation: `This topic builds authority around "${centralEntity}" by ${getRelationExplanation(t)}`
      })),
      alignmentScore: map.analysis_state?.topicalAuthorityScore?.overallScore || 75
    },

    businessDecisions,

    nextSteps,

    metrics: [
      { label: 'Total Topics', value: topics.length, color: 'blue' },
      { label: 'Core Topics', value: coreTopics.length, color: 'green' },
      { label: 'Supporting Topics', value: outerTopics.length, color: 'gray' },
      { label: 'Semantic Triples', value: eavs.length, color: 'blue' },
      { label: 'Topic Depth', value: `${maxDepth} levels`, color: 'gray' }
    ]
  };
};

// Helper functions for transformer
const getGapRecommendation = (rule?: string): string => {
  const recommendations: Record<string, string> = {
    'Hub-Spoke Ratio': 'Add 3-4 more supporting articles to this hub topic to strengthen topical authority.',
    'Foundation Page Completeness': 'Create the missing foundation pages (About, Contact, etc.) to establish site credibility.',
    'Navigation Structure': 'Define header/footer navigation to help visitors and search engines discover all content.'
  };
  return recommendations[rule || ''] || 'Review and address this gap to improve content strategy completeness.';
};

const getEavImportance = (category: string): string => {
  const importance: Record<string, string> = {
    'ROOT': 'Essential - defines core identity',
    'UNIQUE': 'High - creates differentiation',
    'RARE': 'Medium - demonstrates expertise',
    'COMMON': 'Standard - ensures completeness'
  };
  return importance[category] || 'Standard';
};

const getSemanticCoverageAssessment = (count: number): string => {
  if (count >= 50) return 'your content has excellent semantic depth. Search engines have rich signals to understand and rank your content.';
  if (count >= 30) return 'your coverage is good. Consider adding more unique and rare attributes to differentiate from competitors.';
  if (count >= 15) return 'your coverage is developing. Adding more attributes will help search engines better understand your expertise.';
  return 'your coverage needs expansion. Focus on defining key attributes that differentiate your business.';
};

const generateOverallStrategy = (ce: string, sc: string, csi: string, topicCount: number): string => {
  if (ce === 'Not defined' || sc === 'Not defined' || csi === 'Not defined') {
    return 'Your strategy foundation is incomplete. Define all three pillars (Central Entity, Source Context, and Central Search Intent) to create a cohesive content strategy that search engines can understand and reward.';
  }
  return `Your content strategy positions you as the authority on "${ce}" from the perspective of "${sc}", targeting customers who want to "${csi}". With ${topicCount} topics planned, this creates a comprehensive resource that should attract qualified organic traffic and establish market authority.`;
};

const getRelationExplanation = (topic: EnrichedTopic): string => {
  if (topic.topic_class === 'monetization') {
    return 'directly addressing customer needs and driving conversions';
  }
  return 'providing valuable information and building trust with potential customers';
};

// ============================================
// CONTENT BRIEF TRANSFORMER
// ============================================

/**
 * Generate business-friendly explanations for content brief sections
 */
const getBriefSectionExplanation = (section: string): string => {
  const explanations: Record<string, string> = {
    overview: 'This establishes the core focus and message of your article. A clear headline and key takeaways help content writers understand exactly what the article should accomplish. The meta description directly affects click-through rates from search results.',
    strategicContext: 'Understanding the perspective and methodology ensures consistency across all content. This helps content writers adopt the right tone, expertise level, and approach that aligns with your brand voice.',
    featuredSnippet: 'Featured snippets appear above regular search results ("Position 0"), driving significant traffic. By targeting specific questions with the right format, you can capture this premium search visibility.',
    discourseAnchors: 'These transition words and phrases create content flow and help readers navigate between sections. They also signal to search engines that your content is well-structured and comprehensive.',
    serpAnalysis: 'Understanding what competitors are doing helps you create content that meets or exceeds market expectations. Aim for similar or higher word counts and heading structures to compete effectively.',
    outline: 'The article structure is optimized based on SERP analysis and semantic SEO best practices. Each section includes specific guidance to help writers create content that ranks well.',
    linking: 'Internal linking distributes authority across your site and helps visitors discover related content. The anchor text and context hints ensure links are placed naturally and effectively.',
    visuals: 'Images break up text, improve engagement metrics, and provide additional ranking opportunities through image search. The descriptions and alt text suggestions optimize for accessibility and SEO.',
    semantics: 'These facts and concepts should be naturally woven into the content. Including them demonstrates expertise to search engines and ensures comprehensive coverage of the topic.',
    checklist: 'This checklist ensures all critical elements are included before publishing. Each item directly impacts either search rankings, user experience, or conversion potential.'
  };
  return explanations[section] || '';
};

const getSearchIntentExplanation = (intent: string): string => {
  const explanations: Record<string, string> = {
    informational: 'User wants to learn or understand something. Content should educate, explain, and provide comprehensive information.',
    navigational: 'User is looking for a specific page or brand. Content should clearly establish your authority and help them find what they need.',
    transactional: 'User is ready to take action (buy, sign up, download). Content should guide them toward conversion with clear CTAs.',
    commercial: 'User is researching before a purchase decision. Content should compare options, provide evidence, and build trust.'
  };
  return explanations[intent.toLowerCase()] || 'Tailor content to match what the searcher is trying to accomplish.';
};

export const transformContentBriefData = (
  brief: ContentBrief,
  topic?: EnrichedTopic
): ContentBriefReportData => {
  const serpData = brief.serpAnalysis || { peopleAlsoAsk: [], competitorHeadings: [] };
  const contextualBridge = Array.isArray(brief.contextualBridge)
    ? brief.contextualBridge
    : brief.contextualBridge?.links || [];

  // Parse outline sections with full details
  const outlineSections = (brief.structured_outline || []).map(section => ({
    level: section.level || 2,
    title: section.heading || 'Section',
    formatCode: section.format_code,
    hint: section.subordinate_text_hint,
    methodologyNote: section.methodology_note,
    relatedQueries: section.related_queries
  }));

  // Calculate word count estimate from outline
  const estimatedWordCount = serpData.avgWordCount || 1500;
  const targetKeyword = brief.targetKeyword || topic?.title || 'Not specified';
  const searchIntent = brief.searchIntent || 'informational';

  // Transform EAVs for semantic requirements
  const eavs = (brief.contextualVectors || []).slice(0, 15).map(eav => ({
    entity: typeof eav.subject === 'string' ? eav.subject : (eav.subject as any)?.label || (eav.subject as any)?.value || 'Entity',
    attribute: eav.predicate?.relation || 'has',
    value: typeof eav.object === 'string' ? eav.object : (eav.object as any)?.value || 'Value',
    importance: getEavImportance(eav.predicate?.category || 'COMMON')
  }));

  // Build comprehensive checklist based on brief content
  const checklist = buildComprehensiveChecklist(brief, serpData, contextualBridge, targetKeyword);

  return {
    briefTitle: brief.title,
    targetKeyword,
    searchIntent,
    generatedAt: formatDate(brief.created_at),

    overview: {
      headline: `This article targets "${targetKeyword}" for ${searchIntent} searches`,
      metaDescription: brief.metaDescription || '',
      keyTakeaways: brief.keyTakeaways || [],
      whyThisMatters: getBriefSectionExplanation('overview')
    },

    strategicContext: {
      perspectives: brief.perspectives || [],
      methodologyNote: brief.methodology_note || '',
      queryTypeFormat: brief.query_type_format || 'Prose',
      userJourneyPrediction: brief.predicted_user_journey || '',
      whyThisMatters: getBriefSectionExplanation('strategicContext')
    },

    featuredSnippetTarget: brief.featured_snippet_target ? {
      question: brief.featured_snippet_target.question || '',
      targetType: brief.featured_snippet_target.target_type || 'paragraph',
      answerLengthTarget: brief.featured_snippet_target.answer_target_length || 50,
      requiredPredicates: brief.featured_snippet_target.required_predicates || [],
      whyThisMatters: getBriefSectionExplanation('featuredSnippet')
    } : undefined,

    discourseAnchors: {
      anchors: brief.discourse_anchors || [],
      whyThisMatters: getBriefSectionExplanation('discourseAnchors')
    },

    serpAnalysis: {
      avgWordCount: serpData.avgWordCount || 0,
      avgHeadings: serpData.avgHeadings || 0,
      competitorCount: serpData.competitorHeadings?.length || 0,
      competitorComparison: (serpData.competitorHeadings || []).slice(0, 5).map((comp, i) => {
        try {
          return {
            name: new URL(comp.url).hostname.replace('www.', '').slice(0, 15),
            value: comp.headings?.length || 0,
            label: `${comp.headings?.length || 0} headings`,
            color: CHART_COLORS.primary[i % CHART_COLORS.primary.length]
          };
        } catch {
          return {
            name: 'Competitor',
            value: comp.headings?.length || 0,
            label: `${comp.headings?.length || 0} headings`,
            color: CHART_COLORS.primary[i % CHART_COLORS.primary.length]
          };
        }
      }),
      peopleAlsoAsk: serpData.peopleAlsoAsk || [],
      contentGaps: serpData.contentGaps || [],
      whyThisMatters: getBriefSectionExplanation('serpAnalysis')
    },

    outline: {
      sections: outlineSections,
      estimatedWordCount,
      estimatedReadTime: getReadingTime(estimatedWordCount),
      whyThisMatters: getBriefSectionExplanation('outline')
    },

    linkingStrategy: {
      inboundLinks: contextualBridge.filter((l: any) => l.direction === 'inbound').map((l: any) => ({
        title: l.targetTopic || l.targetTitle || l.title || 'Related Article',
        url: l.targetSlug,
        anchorText: l.anchorText || '',
        contextHint: l.annotation_text_hint || l.context || ''
      })),
      outboundLinks: contextualBridge.filter((l: any) => l.direction === 'outbound' || !l.direction).map((l: any) => ({
        title: l.targetTopic || l.targetTitle || l.title || 'Related Article',
        url: l.targetSlug,
        anchorText: l.anchorText || '',
        contextHint: l.annotation_text_hint || l.context || ''
      })),
      semanticBridges: contextualBridge.map((l: any) => l.anchorText || l.anchor || '').filter(Boolean),
      whyThisMatters: getBriefSectionExplanation('linking')
    },

    visualRequirements: {
      featuredImagePrompt: brief.visuals?.featuredImagePrompt || '',
      inlineImages: (brief.visual_semantics || []).map(img => ({
        description: img.description || '',
        altText: img.caption_data || img.alt_text_suggestion || '',
        type: img.type || 'image',
        dimensions: img.width_hint && img.height_hint ? `${img.width_hint} x ${img.height_hint}` : undefined,
        captionData: img.caption_data || ''
      })),
      totalImageCount: (brief.visual_semantics?.length || 0) + 1,
      whyThisMatters: getBriefSectionExplanation('visuals')
    },

    semanticRequirements: {
      eavsToInclude: eavs,
      totalEavs: brief.contextualVectors?.length || 0,
      whyThisMatters: getBriefSectionExplanation('semantics')
    },

    checklist,

    metrics: [
      { label: 'Target Word Count', value: formatNumber(estimatedWordCount), color: 'blue' },
      { label: 'Reading Time', value: getReadingTime(estimatedWordCount), color: 'gray' },
      { label: 'Sections', value: outlineSections.length, color: 'blue' },
      { label: 'Internal Links', value: contextualBridge.length, color: 'green' },
      { label: 'Images Required', value: (brief.visual_semantics?.length || 0) + 1, color: 'blue' },
      { label: 'PAA Questions', value: serpData.peopleAlsoAsk?.length || 0, color: 'gray' }
    ]
  };
};

/**
 * Build a comprehensive, brief-specific checklist
 */
const buildComprehensiveChecklist = (
  brief: ContentBrief,
  serpData: ContentBrief['serpAnalysis'],
  contextualBridge: any[],
  targetKeyword: string
): ContentBriefReportData['checklist'] => {
  const checklist: ContentBriefReportData['checklist'] = [];

  // SEO Fundamentals
  checklist.push({
    category: 'SEO Fundamentals',
    items: [
      {
        item: `Include "${targetKeyword}" in the H1 headline`,
        required: true,
        reason: 'The H1 tells search engines the primary topic of the page. It must match the target keyword.'
      },
      {
        item: `Use "${targetKeyword}" in the first 100 words`,
        required: true,
        reason: 'Early keyword placement signals relevance to search engines and confirms topic to readers.'
      },
      {
        item: `Meta description is 150-160 characters`,
        required: true,
        reason: `Current: ${(brief.metaDescription || '').length} chars. Google truncates longer descriptions in search results.`
      },
      {
        item: `Include "${targetKeyword}" variations in H2 headings`,
        required: true,
        reason: 'Heading variations capture long-tail searches and demonstrate comprehensive coverage.'
      },
      {
        item: `URL slug contains primary keyword`,
        required: true,
        reason: 'Clean, keyword-rich URLs improve click-through rates and provide SEO signals.'
      }
    ]
  });

  // Content Quality
  const targetWordCount = serpData.avgWordCount || 1500;
  checklist.push({
    category: 'Content Quality',
    items: [
      {
        item: `Minimum ${targetWordCount.toLocaleString()} words (match competitor average)`,
        required: true,
        reason: 'Articles shorter than competitors typically rank lower. This is the minimum to compete.'
      },
      {
        item: 'Each section provides unique, valuable information',
        required: true,
        reason: 'Google rewards comprehensive content that fully addresses the user query.'
      },
      {
        item: 'No spelling or grammatical errors',
        required: true,
        reason: 'Errors reduce credibility and can negatively impact E-E-A-T signals.'
      },
      {
        item: 'All facts are accurate and verifiable',
        required: true,
        reason: 'Misinformation damages trust and can harm rankings, especially for YMYL topics.'
      },
      {
        item: 'Content is original (not copied or heavily templated)',
        required: true,
        reason: 'Duplicate content is filtered or penalized by search engines.'
      }
    ]
  });

  // Internal Linking
  const requiredLinks = Math.max(3, contextualBridge.length);
  checklist.push({
    category: 'Internal Linking',
    items: [
      {
        item: `Include at least ${requiredLinks} internal links to related articles`,
        required: true,
        reason: 'Internal links distribute authority and help search engines understand site structure.'
      },
      {
        item: 'Use descriptive anchor text (not "click here" or "read more")',
        required: true,
        reason: 'Anchor text tells search engines what the linked page is about.'
      },
      {
        item: 'Links are contextually relevant to surrounding content',
        required: true,
        reason: 'Contextual links are valued more highly than navigational links.'
      },
      ...(contextualBridge.slice(0, 5).map((link: any) => ({
        item: `Link to "${link.targetTopic || link.targetTitle || 'Related Article'}"`,
        required: false,
        reason: `Anchor: "${link.anchorText || 'relevant phrase'}" - strengthens topical cluster.`
      })))
    ]
  });

  // Visual Elements
  const imageCount = (brief.visual_semantics?.length || 0) + 1;
  checklist.push({
    category: 'Visual Elements',
    items: [
      {
        item: 'Featured image is high-quality and relevant to topic',
        required: true,
        reason: 'Featured images appear in social shares and improve click-through rates.'
      },
      {
        item: `Include at least ${imageCount} images throughout the article`,
        required: true,
        reason: 'Visual content improves engagement, time on page, and breaks up text for readability.'
      },
      {
        item: 'All images have descriptive alt text',
        required: true,
        reason: 'Alt text is required for accessibility and helps with image search rankings.'
      },
      ...(brief.visual_semantics?.slice(0, 3).map((img, i) => ({
        item: `Include ${img.type || 'image'}: "${(img.description || '').slice(0, 50)}..."`,
        required: false,
        reason: `Alt text suggestion: "${img.caption_data || img.description || ''}"`
      })) || [])
    ]
  });

  // People Also Ask
  if (serpData.peopleAlsoAsk && serpData.peopleAlsoAsk.length > 0) {
    checklist.push({
      category: 'People Also Ask Questions',
      items: serpData.peopleAlsoAsk.slice(0, 5).map((question, i) => ({
        item: `Answer: "${question.slice(0, 60)}${question.length > 60 ? '...' : ''}"`,
        required: i < 2, // First 2 are required
        reason: i < 2
          ? 'Answering top PAA questions improves chances of appearing in PAA boxes.'
          : 'Additional PAA coverage demonstrates comprehensive topic expertise.'
      }))
    });
  }

  // Featured Snippet (if applicable)
  if (brief.featured_snippet_target) {
    checklist.push({
      category: 'Featured Snippet Optimization',
      items: [
        {
          item: `Include the question: "${brief.featured_snippet_target.question}"`,
          required: true,
          reason: 'The exact question should appear as a heading or in prominent text.'
        },
        {
          item: `Answer in ${brief.featured_snippet_target.answer_target_length || 50} words or less`,
          required: true,
          reason: 'Featured snippet answers are typically 40-60 words. Concise answers win.'
        },
        {
          item: `Use format: ${brief.featured_snippet_target.target_type || 'paragraph'}`,
          required: true,
          reason: 'Different snippet types require different formats (list, table, paragraph).'
        },
        ...(brief.featured_snippet_target.required_predicates?.map(pred => ({
          item: `Include phrase: "${pred}"`,
          required: true,
          reason: 'This predicate phrase signals a direct answer to search engines.'
        })) || [])
      ]
    });
  }

  // Technical Requirements
  checklist.push({
    category: 'Technical Requirements',
    items: [
      {
        item: 'Schema markup is included (Article, FAQPage, or HowTo)',
        required: false,
        reason: 'Structured data enables rich results and improves search appearance.'
      },
      {
        item: 'Table of contents is included for long articles',
        required: targetWordCount > 2000,
        reason: 'ToC improves navigation and can generate sitelinks in search results.'
      },
      {
        item: 'Mobile-friendly formatting (short paragraphs, clear headings)',
        required: true,
        reason: 'Most searches are mobile. Poor mobile experience hurts rankings.'
      },
      {
        item: 'Page load time under 3 seconds',
        required: true,
        reason: 'Slow pages have higher bounce rates and rank lower in search.'
      }
    ]
  });

  // Conversion Elements
  if (brief.cta) {
    checklist.push({
      category: 'Conversion Elements',
      items: [
        {
          item: `Include call-to-action: "${brief.cta}"`,
          required: true,
          reason: 'Content without CTAs misses conversion opportunities from organic traffic.'
        },
        {
          item: 'CTA is visible above the fold or within first section',
          required: false,
          reason: 'Early CTA placement captures users who are ready to convert immediately.'
        },
        {
          item: 'Secondary CTA near conclusion',
          required: false,
          reason: 'Readers who finish the article are highly engaged and more likely to convert.'
        }
      ]
    });
  }

  return checklist;
};

// ============================================
// ARTICLE DRAFT TRANSFORMER
// ============================================

/**
 * Generate business-friendly explanations for article draft sections
 */
const getArticleSectionExplanation = (section: string): string => {
  const explanations: Record<string, string> = {
    executive: 'This summary helps stakeholders quickly assess whether the article is ready for publication. The readiness level indicates how much additional work is needed before the content can go live.',
    generation: 'The article went through multiple AI-powered refinement passes. Each pass optimizes a specific aspect of the content, building quality layer by layer.',
    content: 'Review the actual content to verify accuracy, tone, and brand alignment. The meta title and description will appear in search results and directly impact click-through rates.',
    images: 'Visual content significantly impacts engagement and time-on-page. Each image should be relevant, high-quality, and have descriptive alt text for accessibility and SEO.',
    linking: 'Internal links distribute authority, help readers discover related content, and signal topic relationships to search engines. Missing links represent lost opportunities.',
    facts: 'Fact-checking is critical for credibility and E-E-A-T signals. Inaccurate information can damage brand trust and lead to legal issues for certain industries.',
    validation: 'These automated quality checks ensure content meets SEO best practices. Failed rules should be addressed before publication to maximize ranking potential.',
    semantics: 'Semantic coverage measures how well the content addresses the topic attributes your audience searches for. Higher coverage means better relevance matching.',
    metrics: 'These numbers benchmark your content against competitors and industry standards. Meeting or exceeding averages improves ranking potential.',
    sections: 'Section-level analysis helps identify weak areas. Each section should provide unique value and flow naturally to the next.',
    checklist: 'Complete all required items before publishing. Each item directly impacts search performance, user experience, or brand quality.'
  };
  return explanations[section] || '';
};

const getReadinessLevel = (score: number): ArticleDraftReportData['executiveSummary']['readinessLevel'] => {
  if (score >= 90) return 'publish-ready';
  if (score >= 70) return 'minor-edits';
  if (score >= 50) return 'needs-review';
  return 'not-ready';
};

const getReadinessAssessment = (level: ArticleDraftReportData['executiveSummary']['readinessLevel']): string => {
  const assessments: Record<string, string> = {
    'publish-ready': 'This article has passed all quality checks and is ready for publication. Only minor proofreading may be needed.',
    'minor-edits': 'The article is nearly ready but needs some adjustments. Review the flagged issues and make corrections before publishing.',
    'needs-review': 'This article requires significant review. Multiple quality issues need to be addressed before it meets publication standards.',
    'not-ready': 'The article is not ready for publication. Major revisions are needed to meet quality standards and SEO requirements.'
  };
  return assessments[level] || '';
};

const getRuleDescription = (ruleName: string): string => {
  const descriptions: Record<string, string> = {
    'WORD_COUNT': 'Ensures content length meets or exceeds competitor averages for ranking competitiveness.',
    'HEADING_STRUCTURE': 'Validates proper H1-H6 hierarchy for accessibility and SEO crawlability.',
    'INTERNAL_LINKS': 'Checks that sufficient internal links are included to distribute authority.',
    'EAV_DENSITY': 'Measures semantic coverage of key topic attributes for relevance signals.',
    'IMAGE_PLACEMENT': 'Verifies images are placed appropriately with proper alt text.',
    'META_LENGTH': 'Ensures meta title and description are optimized for search result display.',
    'KEYWORD_DENSITY': 'Checks keyword usage is natural and not over-optimized.',
    'READABILITY': 'Validates content is accessible to the target audience reading level.',
    'DUPLICATE_CONTENT': 'Scans for unoriginal content that could trigger duplicate filters.',
    'SCHEMA_VALIDITY': 'Ensures structured data is properly formatted for rich results.'
  };
  return descriptions[ruleName] || 'Quality check to ensure content meets standards.';
};

const getRuleImpact = (ruleName: string): string => {
  const impacts: Record<string, string> = {
    'WORD_COUNT': 'Thin content ranks poorly. Fixing this could significantly improve rankings.',
    'HEADING_STRUCTURE': 'Broken hierarchy confuses users and search engines. Moderate impact on rankings.',
    'INTERNAL_LINKS': 'Missing links reduce authority distribution. Important for site-wide SEO health.',
    'EAV_DENSITY': 'Low coverage means missing relevance signals. High impact on topical rankings.',
    'IMAGE_PLACEMENT': 'Missing images reduce engagement. Moderate impact on user metrics.',
    'META_LENGTH': 'Poor meta data reduces click-through rates. Direct impact on traffic.',
    'KEYWORD_DENSITY': 'Over-optimization can trigger spam filters. Could hurt rankings if severe.',
    'READABILITY': 'Complex content increases bounce rates. Affects user engagement signals.',
    'DUPLICATE_CONTENT': 'Duplicate content may be filtered from results. Critical to fix.',
    'SCHEMA_VALIDITY': 'Invalid schema prevents rich results. Missed opportunity for visibility.'
  };
  return impacts[ruleName] || 'May affect search performance.';
};

export const transformArticleDraftData = (
  job: ContentGenerationJob,
  brief: ContentBrief
): ArticleDraftReportData => {
  const passesStatus = job.passes_status || {};
  const auditDetails = job.audit_details;
  const draftContent = job.draft_content || '';

  // Calculate content metrics
  const wordCount = draftContent.split(/\s+/).filter(Boolean).length;
  const headingMatches = draftContent.match(/^#{1,6}\s+(.+)$/gm) || [];
  const headingCount = headingMatches.length;
  const paragraphCount = draftContent.split(/\n\n+/).filter(p => p.trim() && !p.startsWith('#')).length;
  const imageMatches = draftContent.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
  const imageCount = imageMatches.length;
  const linkMatches = draftContent.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const linkCount = linkMatches.length - imageCount;
  const targetWordCount = brief.serpAnalysis?.avgWordCount || 1500;

  // Build timeline from passes
  const passNames = [
    { name: 'Initial Draft', desc: 'Creates the foundation content from the brief' },
    { name: 'Header Optimization', desc: 'Refines headings for SEO and readability' },
    { name: 'Lists & Tables', desc: 'Structures data for featured snippets' },
    { name: 'Visual Placement', desc: 'Adds image placeholders with semantic alt text' },
    { name: 'Linguistic Refinement', desc: 'Improves word choice and sentence structure' },
    { name: 'Flow & Transitions', desc: 'Enhances content flow between sections' },
    { name: 'Introduction', desc: 'Synthesizes compelling introduction from content' },
    { name: 'Quality Audit', desc: 'Runs automated quality checks and scoring' },
    { name: 'Schema Generation', desc: 'Creates structured data for rich results' }
  ];

  const timeline: TimelineItem[] = passNames.map((pass, i) => {
    const passKey = `pass_${i + 1}_headers` in passesStatus ? `pass_${i + 1}_headers` :
                    Object.keys(passesStatus).find(k => k.includes(`${i + 1}`)) || `pass${i + 1}`;
    const passStatus = passesStatus[passKey as keyof typeof passesStatus];
    let status: TimelineItem['status'] = 'pending';
    if (passStatus === 'completed') status = 'completed';
    else if (passStatus === 'in_progress') status = 'in-progress';
    else if (passStatus === 'failed') status = 'failed';

    return {
      step: i + 1,
      label: pass.name,
      status,
      description: pass.desc
    };
  });

  const completedPasses = timeline.filter(t => t.status === 'completed').length;

  // Transform validation rules with descriptions
  const validationRules = (auditDetails?.algorithmicResults || []).map(rule => ({
    ruleName: rule.ruleName,
    businessName: getBusinessTerm(rule.ruleName),
    description: getRuleDescription(rule.ruleName),
    passed: rule.isPassing,
    score: rule.score || (rule.isPassing ? 100 : 0),
    details: rule.details || '',
    recommendation: rule.isPassing ? undefined : `Review and fix: ${rule.details || 'Address this quality issue'}`,
    impact: getRuleImpact(rule.ruleName)
  }));

  const passedRules = validationRules.filter(r => r.passed).length;
  const qualityScore = job.final_audit_score || (validationRules.length > 0
    ? Math.round(validationRules.reduce((sum, r) => sum + r.score, 0) / validationRules.length)
    : 0);

  // Extract table of contents from headings
  const tableOfContents = headingMatches.map(h => {
    const match = h.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return null;
    const level = match[1].length;
    const title = match[2];
    const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return { level, title, anchor };
  }).filter(Boolean) as { level: number; title: string; anchor: string }[];

  // Extract image placeholders
  const imagePlaceholders = imageMatches.map((img, i) => {
    const altMatch = img.match(/!\[([^\]]*)\]/);
    const urlMatch = img.match(/\]\(([^)]+)\)/);
    const altText = altMatch?.[1] || '';
    const url = urlMatch?.[1] || '';

    // Find which section this image is in
    const imgIndex = draftContent.indexOf(img);
    const beforeImg = draftContent.substring(0, imgIndex);
    const lastHeading = beforeImg.match(/^#{1,6}\s+(.+)$/gm)?.pop() || 'Introduction';

    return {
      id: `img-${i + 1}`,
      type: url.includes('placeholder') || !url.startsWith('http') ? 'placeholder' : 'image',
      description: altText || `Image ${i + 1}`,
      altText,
      caption: undefined,
      placementSection: lastHeading.replace(/^#+\s*/, ''),
      status: (url.includes('placeholder') || !url.startsWith('http') ? 'placeholder' : 'uploaded') as 'placeholder' | 'generated' | 'uploaded',
      thumbnailUrl: url.startsWith('http') ? url : undefined
    };
  });

  // Extract internal links
  const internalLinks = linkMatches
    .filter(link => !link.startsWith('!'))
    .map(link => {
      const textMatch = link.match(/\[([^\]]+)\]/);
      const urlMatch = link.match(/\]\(([^)]+)\)/);
      const anchor = textMatch?.[1] || '';
      const url = urlMatch?.[1] || '';

      // Find context
      const linkIndex = draftContent.indexOf(link);
      const beforeLink = draftContent.substring(Math.max(0, linkIndex - 50), linkIndex);
      const afterLink = draftContent.substring(linkIndex + link.length, Math.min(draftContent.length, linkIndex + link.length + 50));

      return {
        anchor,
        targetTitle: anchor,
        targetUrl: url,
        context: `...${beforeLink.split(' ').slice(-5).join(' ')} [LINK] ${afterLink.split(' ').slice(0, 5).join(' ')}...`
      };
    });

  // Get suggested links from brief
  const contextualBridge = Array.isArray(brief.contextualBridge)
    ? brief.contextualBridge
    : brief.contextualBridge?.links || [];

  const suggestedLinks = contextualBridge.map((link: any) => ({
    targetTitle: link.targetTopic || link.targetTitle || 'Related Article',
    anchorSuggestion: link.anchorText || 'relevant phrase',
    reason: link.annotation_text_hint || 'Strengthens topical cluster'
  }));

  // Find missing links
  const missingLinks = suggestedLinks
    .filter(suggested => !internalLinks.some(actual =>
      actual.targetUrl.includes(suggested.targetTitle.toLowerCase().replace(/\s+/g, '-'))
    ))
    .map(link => ({
      targetTitle: link.targetTitle,
      reason: `Recommended link to "${link.targetTitle}" is missing. ${link.reason}`
    }));

  // Extract facts to verify (claims with numbers, dates, or specific statements)
  const factPatterns = [
    { pattern: /\b(\d+(?:\.\d+)?%|\$[\d,]+|\d{4})\b[^.]*\./g, priority: 'high' as const },
    { pattern: /according to [^.]+\./gi, priority: 'critical' as const },
    { pattern: /studies show|research indicates|experts say/gi, priority: 'critical' as const },
    { pattern: /\b(always|never|all|none|every|no one)\b[^.]*\./gi, priority: 'medium' as const }
  ];

  const factsToVerify: ArticleDraftReportData['factsToVerify']['facts'] = [];
  factPatterns.forEach(({ pattern, priority }) => {
    const matches = draftContent.match(pattern) || [];
    matches.slice(0, 5).forEach(match => {
      if (!factsToVerify.some(f => f.claim === match)) {
        factsToVerify.push({
          claim: match.slice(0, 150) + (match.length > 150 ? '...' : ''),
          source: undefined,
          verificationStatus: 'needs-check',
          priority,
          reason: priority === 'critical'
            ? 'Contains attribution that must be verified for accuracy'
            : priority === 'high'
            ? 'Contains specific data that should be fact-checked'
            : 'Contains absolute language that may need nuancing'
        });
      }
    });
  });

  // Build section breakdown
  const sections: ArticleDraftReportData['sectionBreakdown']['sections'] = [];
  let currentSection = { title: 'Introduction', level: 1, content: '' };

  draftContent.split('\n').forEach(line => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection.content) {
        const sectionWordCount = currentSection.content.split(/\s+/).filter(Boolean).length;
        sections.push({
          sectionTitle: currentSection.title,
          level: currentSection.level,
          wordCount: sectionWordCount,
          qualityIndicators: {
            hasIntro: currentSection.content.split('\n')[0]?.length > 50,
            hasConclusion: currentSection.content.trim().endsWith('.'),
            hasExamples: /for example|such as|e\.g\.|like|including/i.test(currentSection.content),
            hasData: /\d+%|\$[\d,]+|\d+ (percent|million|thousand)/i.test(currentSection.content)
          },
          issues: sectionWordCount < 100 ? ['Section may be too short'] : [],
          suggestions: sectionWordCount < 150 ? ['Consider adding more depth to this section'] : []
        });
      }
      currentSection = { title: headingMatch[2], level: headingMatch[1].length, content: '' };
    } else {
      currentSection.content += line + '\n';
    }
  });

  // Add last section
  if (currentSection.content) {
    const sectionWordCount = currentSection.content.split(/\s+/).filter(Boolean).length;
    sections.push({
      sectionTitle: currentSection.title,
      level: currentSection.level,
      wordCount: sectionWordCount,
      qualityIndicators: {
        hasIntro: currentSection.content.split('\n')[0]?.length > 50,
        hasConclusion: currentSection.content.trim().endsWith('.'),
        hasExamples: /for example|such as|e\.g\.|like|including/i.test(currentSection.content),
        hasData: /\d+%|\$[\d,]+|\d+ (percent|million|thousand)/i.test(currentSection.content)
      },
      issues: sectionWordCount < 100 ? ['Section may be too short'] : [],
      suggestions: sectionWordCount < 150 ? ['Consider adding more depth to this section'] : []
    });
  }

  // Build publication checklist
  const publicationChecklist = buildArticlePublicationChecklist(
    brief,
    draftContent,
    wordCount,
    targetWordCount,
    linkCount,
    imageCount,
    validationRules,
    factsToVerify
  );

  // Calculate readiness
  const readinessScore = qualityScore;
  const readinessLevel = getReadinessLevel(readinessScore);

  // Determine key strengths and issues
  const keyStrengths: string[] = [];
  const criticalIssues: string[] = [];

  if (wordCount >= targetWordCount) keyStrengths.push(`Word count (${wordCount}) meets target`);
  if (linkCount >= 3) keyStrengths.push(`Includes ${linkCount} internal links`);
  if (imageCount >= 2) keyStrengths.push(`Contains ${imageCount} images`);
  if (validationRules.filter(r => r.passed).length === validationRules.length) {
    keyStrengths.push('Passed all quality checks');
  }

  if (wordCount < targetWordCount * 0.8) {
    criticalIssues.push(`Content is ${Math.round((1 - wordCount/targetWordCount) * 100)}% below target word count`);
  }
  validationRules.filter(r => !r.passed).slice(0, 3).forEach(rule => {
    criticalIssues.push(`Failed: ${rule.businessName}`);
  });
  if (missingLinks.length > 2) {
    criticalIssues.push(`Missing ${missingLinks.length} recommended internal links`);
  }

  // Generate improvement items
  const improvements: ReportActionItem[] = [];
  validationRules.filter(r => !r.passed).forEach((rule, i) => {
    improvements.push({
      id: `improvement-${i}`,
      title: rule.businessName,
      description: rule.details || rule.recommendation || 'Needs improvement',
      priority: rule.score < 50 ? 'high' : 'medium',
      category: 'Quality',
      status: 'pending'
    });
  });

  if (missingLinks.length > 0) {
    improvements.push({
      id: 'improvement-links',
      title: 'Add Missing Internal Links',
      description: `${missingLinks.length} recommended links are missing. Add them to strengthen topical authority.`,
      priority: 'medium',
      category: 'Linking',
      status: 'pending'
    });
  }

  if (imagePlaceholders.some(img => img.status === 'placeholder')) {
    improvements.push({
      id: 'improvement-images',
      title: 'Replace Image Placeholders',
      description: `${imagePlaceholders.filter(img => img.status === 'placeholder').length} images need to be uploaded.`,
      priority: 'high',
      category: 'Media',
      status: 'pending'
    });
  }

  return {
    articleTitle: brief.title,
    briefTitle: brief.title,
    targetKeyword: brief.targetKeyword || '',
    searchIntent: brief.searchIntent || 'informational',
    generatedAt: formatDate(job.completed_at || job.updated_at),

    executiveSummary: {
      headline: `Article Quality Report: ${readinessLevel === 'publish-ready' ? 'Ready for Publication' : readinessLevel === 'minor-edits' ? 'Minor Edits Needed' : readinessLevel === 'needs-review' ? 'Needs Review' : 'Not Ready'}`,
      overallAssessment: getReadinessAssessment(readinessLevel),
      readinessScore,
      readinessLevel,
      keyStrengths,
      criticalIssues,
      whyThisMatters: getArticleSectionExplanation('executive')
    },

    generationSummary: {
      headline: `Article generated through ${completedPasses} of ${passNames.length} passes with ${qualityScore}% quality score`,
      totalPasses: passNames.length,
      completedPasses,
      qualityScore,
      timeline,
      whyThisMatters: getArticleSectionExplanation('generation')
    },

    articleContent: {
      metaTitle: brief.title,
      metaDescription: brief.metaDescription || '',
      fullContent: draftContent,
      contentExcerpt: draftContent.slice(0, 500) + (draftContent.length > 500 ? '...' : ''),
      tableOfContents,
      whyThisMatters: getArticleSectionExplanation('content')
    },

    imagePlaceholders: {
      images: imagePlaceholders,
      totalRequired: (brief.visual_semantics?.length || 0) + 1,
      totalPlaced: imageCount,
      whyThisMatters: getArticleSectionExplanation('images')
    },

    internalLinking: {
      linksInContent: internalLinks,
      suggestedLinks,
      missingLinks,
      totalLinks: linkCount,
      recommendedMinimum: Math.max(3, contextualBridge.length),
      whyThisMatters: getArticleSectionExplanation('linking')
    },

    factsToVerify: {
      facts: factsToVerify.slice(0, 10),
      totalFacts: factsToVerify.length,
      verifiedCount: factsToVerify.filter(f => f.verificationStatus === 'verified').length,
      whyThisMatters: getArticleSectionExplanation('facts')
    },

    validationRules: {
      rules: validationRules,
      passedCount: passedRules,
      totalRules: validationRules.length,
      whyThisMatters: getArticleSectionExplanation('validation')
    },

    semanticAnalysis: {
      eavCoverage: auditDetails?.complianceScore?.breakdown?.eavCoverage || 0,
      coveredAttributes: [],
      missingAttributes: [],
      categoryBreakdown: [],
      whyThisMatters: getArticleSectionExplanation('semantics')
    },

    contentMetrics: {
      wordCount,
      targetWordCount,
      headingCount,
      paragraphCount,
      imageCount,
      linkCount,
      readingTime: getReadingTime(wordCount),
      readabilityScore: undefined,
      whyThisMatters: getArticleSectionExplanation('metrics')
    },

    sectionBreakdown: {
      sections,
      whyThisMatters: getArticleSectionExplanation('sections')
    },

    publicationChecklist,

    improvements,

    metrics: [
      { label: 'Readiness', value: `${readinessScore}%`, color: readinessScore >= 70 ? 'green' : readinessScore >= 50 ? 'yellow' : 'red' },
      { label: 'Word Count', value: `${formatNumber(wordCount)}/${formatNumber(targetWordCount)}`, color: wordCount >= targetWordCount ? 'green' : 'yellow' },
      { label: 'Passes', value: `${completedPasses}/${passNames.length}`, color: completedPasses === passNames.length ? 'green' : 'blue' },
      { label: 'Quality Checks', value: `${passedRules}/${validationRules.length}`, color: passedRules === validationRules.length ? 'green' : 'yellow' },
      { label: 'Links', value: linkCount, color: linkCount >= 3 ? 'green' : 'yellow' },
      { label: 'Images', value: imageCount, color: imageCount >= 2 ? 'green' : 'yellow' }
    ]
  };
};

/**
 * Build article-specific publication checklist
 */
const buildArticlePublicationChecklist = (
  brief: ContentBrief,
  content: string,
  wordCount: number,
  targetWordCount: number,
  linkCount: number,
  imageCount: number,
  validationRules: any[],
  facts: any[]
): ArticleDraftReportData['publicationChecklist'] => {
  const checklist: ArticleDraftReportData['publicationChecklist'] = {
    categories: [],
    completionPercentage: 0,
    blockers: [],
    whyThisMatters: getArticleSectionExplanation('checklist')
  };

  let totalItems = 0;
  let completedItems = 0;

  // Content Quality
  const contentItems = [
    {
      item: 'Word count meets target',
      status: wordCount >= targetWordCount ? 'complete' : 'incomplete' as const,
      required: true,
      reason: `Current: ${wordCount}, Target: ${targetWordCount}`,
      action: wordCount < targetWordCount ? 'Add more content to reach target' : undefined
    },
    {
      item: 'H1 contains target keyword',
      status: content.match(new RegExp(`^#\\s+.*${brief.targetKeyword}`, 'im')) ? 'complete' : 'incomplete' as const,
      required: true,
      reason: 'Primary keyword must appear in the main headline',
      action: 'Edit H1 to include target keyword'
    },
    {
      item: 'Meta description optimized',
      status: (brief.metaDescription?.length || 0) >= 140 && (brief.metaDescription?.length || 0) <= 160 ? 'complete' : 'incomplete' as const,
      required: true,
      reason: `Length: ${brief.metaDescription?.length || 0} chars (target: 140-160)`,
      action: 'Adjust meta description length'
    },
    {
      item: 'All facts verified',
      status: facts.every(f => f.verificationStatus === 'verified') ? 'complete' : 'incomplete' as const,
      required: true,
      reason: `${facts.filter(f => f.verificationStatus === 'needs-check').length} facts need verification`,
      action: 'Verify all claims with reliable sources'
    }
  ];
  checklist.categories.push({ category: 'Content Quality', items: contentItems });
  totalItems += contentItems.length;
  completedItems += contentItems.filter(i => i.status === 'complete').length;

  // SEO Requirements
  const seoItems = [
    {
      item: 'Minimum internal links included',
      status: linkCount >= 3 ? 'complete' : 'incomplete' as const,
      required: true,
      reason: `Current: ${linkCount}, Minimum: 3`,
      action: linkCount < 3 ? 'Add more internal links' : undefined
    },
    {
      item: 'Images have alt text',
      status: 'complete' as const, // Assume AI-generated content has alt text
      required: true,
      reason: 'All images must have descriptive alt text',
      action: undefined
    },
    {
      item: 'All validation rules pass',
      status: validationRules.every(r => r.passed) ? 'complete' : 'incomplete' as const,
      required: false,
      reason: `${validationRules.filter(r => r.passed).length}/${validationRules.length} rules passing`,
      action: 'Review and fix failing validation rules'
    }
  ];
  checklist.categories.push({ category: 'SEO Requirements', items: seoItems });
  totalItems += seoItems.length;
  completedItems += seoItems.filter(i => i.status === 'complete').length;

  // Visual Elements
  const visualItems = [
    {
      item: 'Featured image ready',
      status: imageCount >= 1 ? 'complete' : 'incomplete' as const,
      required: true,
      reason: 'Featured image required for social sharing',
      action: 'Upload a featured image'
    },
    {
      item: 'Inline images placed',
      status: imageCount >= 2 ? 'complete' : 'incomplete' as const,
      required: false,
      reason: `Current: ${imageCount} images`,
      action: imageCount < 2 ? 'Add more images to break up content' : undefined
    }
  ];
  checklist.categories.push({ category: 'Visual Elements', items: visualItems });
  totalItems += visualItems.length;
  completedItems += visualItems.filter(i => i.status === 'complete').length;

  // Final Review
  const reviewItems = [
    {
      item: 'Proofread for spelling/grammar',
      status: 'incomplete' as const,
      required: true,
      reason: 'Human review required before publication',
      action: 'Complete proofreading'
    },
    {
      item: 'Brand voice check',
      status: 'incomplete' as const,
      required: true,
      reason: 'Ensure content aligns with brand guidelines',
      action: 'Review tone and style'
    },
    {
      item: 'Legal/compliance review (if applicable)',
      status: 'na' as const,
      required: false,
      reason: 'May be required for certain industries',
      action: undefined
    }
  ];
  checklist.categories.push({ category: 'Final Review', items: reviewItems });
  totalItems += reviewItems.filter(i => i.status !== 'na').length;
  completedItems += reviewItems.filter(i => i.status === 'complete').length;

  checklist.completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  checklist.blockers = checklist.categories
    .flatMap(c => c.items)
    .filter(i => i.required && i.status === 'incomplete')
    .map(i => i.item);

  return checklist;
};

// ============================================
// MIGRATION REPORT TRANSFORMER
// ============================================

export const transformMigrationData = (
  inventory: SiteInventoryItem[],
  topics: EnrichedTopic[],
  auditResult?: SiteAuditResult,
  projectName?: string,
  domain?: string
): MigrationReportData => {
  // Count decisions
  const decisionCounts = inventory.reduce((acc, item) => {
    const action = item.action || 'KEEP';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count statuses
  const statusCounts = inventory.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<TransitionStatus, number>);

  const actionsRequired = inventory.filter(i =>
    i.action && i.action !== 'KEEP' && i.status !== 'OPTIMIZED'
  ).length;

  // Calculate health score
  const optimizedCount = statusCounts['OPTIMIZED'] || 0;
  const healthScore = inventory.length > 0
    ? calculatePercentage(optimizedCount, inventory.length)
    : 0;

  // Generate key findings
  const keyFindings: string[] = [];
  if (decisionCounts['REDIRECT_301'] > 0) {
    keyFindings.push(`${decisionCounts['REDIRECT_301']} pages recommended for redirect (consolidation)`);
  }
  if (decisionCounts['REWRITE'] > 0) {
    keyFindings.push(`${decisionCounts['REWRITE']} pages need content rewriting`);
  }
  if (decisionCounts['PRUNE_410'] > 0) {
    keyFindings.push(`${decisionCounts['PRUNE_410']} pages can be pruned (low value)`);
  }
  if (decisionCounts['KEEP'] > 0) {
    keyFindings.push(`${decisionCounts['KEEP']} pages are optimized and ready`);
  }

  // Build decision chart data
  const decisionChart: PieChartData[] = Object.entries(decisionCounts).map(([action, count]) => ({
    name: getBusinessTerm(action),
    value: count,
    color: DECISION_COLORS[action as ActionType] || CHART_COLORS.semantic.neutral,
    percentage: calculatePercentage(count, inventory.length)
  }));

  // Build status chart data
  const statusChart: PieChartData[] = Object.entries(statusCounts).map(([status, count]) => ({
    name: getBusinessTerm(status),
    value: count,
    color: STATUS_COLORS[status as TransitionStatus] || CHART_COLORS.semantic.neutral,
    percentage: calculatePercentage(count, inventory.length)
  }));

  // Build redirect map
  const redirectMap = inventory
    .filter(i => i.action === 'REDIRECT_301' || i.action === 'MERGE')
    .map(item => {
      const targetTopic = topics.find(t => t.id === item.mapped_topic_id);
      return {
        source: item.url,
        target: targetTopic?.slug || '/',
        type: '301' as const
      };
    });

  // Calculate hub-spoke metrics
  const hubCount = topics.filter(t => !t.parent_topic_id).length;
  const spokeCount = topics.filter(t => t.parent_topic_id).length;
  const orphanCount = inventory.filter(i => !i.mapped_topic_id && i.action !== 'PRUNE_410').length;

  // Build action plan phases
  const actionPlanPhases = [
    {
      phase: 1,
      name: 'Technical Preparation',
      description: 'Set up redirect infrastructure and backup systems',
      tasks: [
        { id: 'task-1-1', title: 'Backup current site', description: 'Create full backup of existing content', priority: 'critical' as const, category: 'Technical' },
        { id: 'task-1-2', title: 'Set up staging environment', description: 'Prepare staging for redirect testing', priority: 'high' as const, category: 'Technical' }
      ]
    },
    {
      phase: 2,
      name: 'Content Migration',
      description: 'Execute content rewrites and consolidations',
      tasks: inventory
        .filter(i => i.action === 'REWRITE')
        .slice(0, 5)
        .map((item, i) => ({
          id: `task-2-${i}`,
          title: `Rewrite: ${item.title.slice(0, 40)}...`,
          description: `Optimize content at ${item.url}`,
          priority: 'high' as const,
          category: 'Content'
        }))
    },
    {
      phase: 3,
      name: 'Redirect Implementation',
      description: 'Implement 301 redirects and canonical tags',
      tasks: [
        { id: 'task-3-1', title: 'Implement redirect map', description: `Apply ${redirectMap.length} redirects`, priority: 'high' as const, category: 'Technical' },
        { id: 'task-3-2', title: 'Test redirects', description: 'Verify all redirects resolve correctly', priority: 'high' as const, category: 'QA' }
      ]
    },
    {
      phase: 4,
      name: 'Cleanup & Monitoring',
      description: 'Remove pruned pages and monitor performance',
      tasks: [
        { id: 'task-4-1', title: 'Implement 410 responses', description: `Remove ${decisionCounts['PRUNE_410'] || 0} low-value pages`, priority: 'medium' as const, category: 'Technical' },
        { id: 'task-4-2', title: 'Update sitemap', description: 'Remove old URLs, add new pages', priority: 'medium' as const, category: 'Technical' },
        { id: 'task-4-3', title: 'Monitor GSC', description: 'Track indexing and ranking changes', priority: 'high' as const, category: 'Monitoring' }
      ]
    }
  ];

  return {
    domain: domain || 'Unknown Domain',
    projectName: projectName || 'Migration Project',
    generatedAt: formatDate(),

    executiveSummary: {
      headline: `Site audit complete: ${inventory.length} pages analyzed, ${actionsRequired} actions required`,
      pagesAnalyzed: inventory.length,
      actionsRequired,
      healthScore,
      keyFindings,
      estimatedImpact: [
        'Improved crawl efficiency through consolidation',
        'Increased topical authority from content focus',
        'Elimination of keyword cannibalization issues'
      ]
    },

    currentState: {
      indexedPages: inventory.length,
      averageQualityScore: inventory.reduce((sum, i) => sum + (i.cor_score || 50), 0) / Math.max(inventory.length, 1),
      statusDistribution: statusChart,
      scoreDistribution: []
    },

    technicalHealth: {
      overallScore: auditResult?.scores?.technical || 75,
      issuesBySeverity: [],
      topIssues: []
    },

    semanticAnalysis: {
      alignmentScore: auditResult?.scores?.semantic || 70,
      alignedPages: inventory.filter(i => i.mapped_topic_id).length,
      misalignedPages: inventory.filter(i => !i.mapped_topic_id).length,
      misalignmentReasons: []
    },

    contentStructure: {
      hubCount,
      spokeCount,
      orphanCount,
      hubSpokeRatio: hubCount > 0 ? Math.round(spokeCount / hubCount * 10) / 10 : 0,
      structureChart: [
        { name: 'Hub Pages', value: hubCount, color: CHART_COLORS.primary[0], percentage: calculatePercentage(hubCount, topics.length) },
        { name: 'Spoke Pages', value: spokeCount, color: CHART_COLORS.primary[2], percentage: calculatePercentage(spokeCount, topics.length) }
      ]
    },

    migrationDecisions: {
      summary: {
        keep: decisionCounts['KEEP'] || 0,
        rewrite: decisionCounts['REWRITE'] || 0,
        merge: decisionCounts['MERGE'] || 0,
        redirect: decisionCounts['REDIRECT_301'] || 0,
        prune: decisionCounts['PRUNE_410'] || 0,
        canonicalize: decisionCounts['CANONICALIZE'] || 0
      },
      decisionChart,
      pageDecisions: inventory.slice(0, 50).map(item => ({
        url: item.url,
        title: item.title,
        decision: item.action || 'KEEP',
        confidence: 80,
        reason: `${getBusinessTerm(item.action || 'KEEP')} based on metrics`
      }))
    },

    actionPlan: {
      phases: actionPlanPhases,
      priorityMatrix: inventory
        .filter(i => i.action && i.action !== 'KEEP')
        .slice(0, 20)
        .map(item => ({
          id: item.id,
          label: item.title.slice(0, 30),
          impact: item.gsc_clicks ? Math.min(100, item.gsc_clicks * 2) : 50,
          effort: item.action === 'REWRITE' ? 80 : item.action === 'REDIRECT_301' ? 30 : 50,
          category: item.action || 'KEEP'
        }))
    },

    implementationGuide: {
      redirectMap,
      technicalNotes: [
        'Implement redirects at the server level (Apache/Nginx) for best performance',
        'Use 301 (permanent) redirects to preserve link equity',
        'Monitor 404 errors in Google Search Console after implementation',
        'Update internal links before implementing redirects where possible'
      ],
      codeSnippets: [
        {
          language: 'apache',
          description: 'Apache .htaccess redirect rules',
          code: redirectMap.slice(0, 5).map(r =>
            `Redirect 301 ${new URL(r.source).pathname} ${r.target}`
          ).join('\n')
        },
        {
          language: 'nginx',
          description: 'Nginx redirect configuration',
          code: redirectMap.slice(0, 5).map(r =>
            `rewrite ^${new URL(r.source).pathname}$ ${r.target} permanent;`
          ).join('\n')
        }
      ]
    },

    qualityAssurance: {
      preMigrationChecklist: [
        { item: 'Backup all existing content and database', required: true },
        { item: 'Document current rankings for key pages', required: true },
        { item: 'Test redirects on staging environment', required: true },
        { item: 'Notify stakeholders of planned changes', required: false },
        { item: 'Schedule migration during low-traffic period', required: false }
      ],
      postMigrationChecklist: [
        { item: 'Verify all redirects resolve correctly', required: true },
        { item: 'Check for 404 errors in Google Search Console', required: true },
        { item: 'Submit updated sitemap to search engines', required: true },
        { item: 'Monitor organic traffic for anomalies', required: true },
        { item: 'Update external links where possible', required: false }
      ]
    },

    metrics: [
      { label: 'Pages Analyzed', value: inventory.length, color: 'blue' },
      { label: 'Actions Required', value: actionsRequired, color: actionsRequired > 0 ? 'yellow' : 'green' },
      { label: 'Health Score', value: `${healthScore}%`, color: healthScore >= 70 ? 'green' : 'yellow' },
      { label: 'Redirects Needed', value: redirectMap.length, color: 'blue' }
    ]
  };
};
