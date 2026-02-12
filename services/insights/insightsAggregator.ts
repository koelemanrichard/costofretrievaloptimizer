// services/insights/insightsAggregator.ts
// Central service for aggregating all insights data from various sources

import { SupabaseClient } from '@supabase/supabase-js';
import {
  loadQueryNetworkAuditHistory,
  loadEATScannerAuditHistory,
  loadCorpusAuditHistory,
  loadEnhancedMetricsHistory,
  StoredQueryNetworkAudit,
  StoredEATScannerAudit,
  StoredCorpusAudit,
  StoredEnhancedMetricsSnapshot,
} from '../auditPersistenceService';
import { generateEnhancedMetrics } from '../reportGenerationService';
import { calculateEavCompleteness } from '../../utils/eavAnalytics';
import type { SemanticTriple, EnrichedTopic, TopicalMap, ContentBrief } from '../../types';
import type {
  AggregatedInsights,
  ExecutiveSummaryData,
  TopicalAuthorityData,
  CompetitiveIntelData,
  AuthorityTrustData,
  ContentHealthData,
  PublicationProgressData,
  CostUsageData,
  ActionCenterData,
  AuditHistoryData,
  HealthScore,
  MetricCard,
  TrendDirection,
  TrendDataPoint,
  Alert,
  ContentGap,
  Question,
  EnhancedRecommendation,
  ActionItem,
} from '../../types/insights';

// =====================
// Data Loading Functions
// =====================

interface RawInsightsData {
  queryNetworkHistory: StoredQueryNetworkAudit[];
  eatScannerHistory: StoredEATScannerAudit[];
  corpusHistory: StoredCorpusAudit[];
  metricsHistory: StoredEnhancedMetricsSnapshot[];
  topics: EnrichedTopic[];
  eavs: SemanticTriple[];
  briefs: ContentBrief[];
  aiUsageLogs: AIUsageLog[];
}

interface AIUsageLog {
  id: string;
  provider: string;
  model: string;
  operation: string;
  tokens_in: number;
  tokens_out: number;
  total_tokens?: number;
  cost_usd: number;
  created_at: string;
}

// Note: Publication progress is derived from topics table columns (publication_status, publication_phase, etc.)
// rather than from a separate publication_plans table

// Optional overrides to use local state data instead of Supabase data
// This ensures consistency with the app's local state (e.g., after EAV expansion)
export interface LocalStateOverrides {
  eavs?: SemanticTriple[];
  topics?: EnrichedTopic[];
}

export async function loadAllInsightsData(
  supabase: SupabaseClient,
  mapId: string,
  historyLimit: number = 10,
  localStateOverrides?: LocalStateOverrides
): Promise<RawInsightsData> {
  console.log('[InsightsAggregator] Loading all data for mapId:', mapId);

  const [
    queryNetworkHistory,
    eatScannerHistory,
    corpusHistory,
    metricsHistory,
    topicsResult,
    mapResult,
    briefsResult,
    aiUsageResult,
  ] = await Promise.all([
    loadQueryNetworkAuditHistory(supabase, mapId, historyLimit),
    loadEATScannerAuditHistory(supabase, mapId, historyLimit),
    loadCorpusAuditHistory(supabase, mapId, historyLimit),
    loadEnhancedMetricsHistory(supabase, mapId, historyLimit),
    supabase.from('topics').select('*').eq('map_id', mapId),
    supabase.from('topical_maps').select('eavs, pillars, business_info').eq('id', mapId).single(),
    supabase.from('content_briefs').select('*').eq('map_id', mapId),
    supabase.from('ai_usage_logs').select('*').eq('map_id', mapId).order('created_at', { ascending: false }).limit(1000),
  ]);

  // Use local state overrides if provided (for consistency with app state)
  // Otherwise fall back to Supabase data
  const topics = localStateOverrides?.topics ?? (topicsResult.data || []) as EnrichedTopic[];
  const eavs = localStateOverrides?.eavs ?? ((mapResult.data?.eavs || []) as SemanticTriple[]);
  const briefs = (briefsResult.data || []) as ContentBrief[];
  const aiUsageLogs = (aiUsageResult.data || []) as AIUsageLog[];

  console.log('[InsightsAggregator] Data loaded:', {
    queryNetworkHistory: queryNetworkHistory.length,
    eatScannerHistory: eatScannerHistory.length,
    corpusHistory: corpusHistory.length,
    metricsHistory: metricsHistory.length,
    topics: topics.length,
    eavs: eavs.length,
    briefs: briefs.length,
    aiUsageLogs: aiUsageLogs.length,
  });

  return {
    queryNetworkHistory,
    eatScannerHistory,
    corpusHistory,
    metricsHistory,
    topics,
    eavs,
    briefs,
    aiUsageLogs,
  };
}

// =====================
// Aggregation Functions
// =====================

export function aggregateInsights(data: RawInsightsData): AggregatedInsights {
  const executiveSummary = buildExecutiveSummary(data);
  const topicalAuthority = buildTopicalAuthority(data);
  const competitiveIntel = buildCompetitiveIntel(data);
  const authorityTrust = buildAuthorityTrust(data);
  const contentHealth = buildContentHealth(data);
  const publicationProgress = buildPublicationProgress(data);
  const costUsage = buildCostUsage(data);
  const actionCenter = buildActionCenter(data, {
    executiveSummary,
    competitiveIntel,
    authorityTrust,
    contentHealth,
  });

  const auditHistory = buildAuditHistory(data);

  return {
    executiveSummary,
    topicalAuthority,
    competitiveIntel,
    authorityTrust,
    contentHealth,
    publicationProgress,
    costUsage,
    actionCenter,
    auditHistory,
    lastUpdated: new Date().toISOString(),
    dataFreshness: {
      queryNetwork: data.queryNetworkHistory[0]?.created_at,
      eatScanner: data.eatScannerHistory[0]?.created_at,
      corpusAudit: data.corpusHistory[0]?.created_at,
      metrics: data.metricsHistory[0]?.created_at,
    },
  };
}

// =====================
// Executive Summary Builder
// =====================

function buildExecutiveSummary(data: RawInsightsData): ExecutiveSummaryData {
  const latestMetrics = data.metricsHistory[0];
  const previousMetrics = data.metricsHistory[1];
  const latestQueryNetwork = data.queryNetworkHistory[0];
  const latestEat = data.eatScannerHistory[0];
  const latestCorpus = data.corpusHistory[0];

  // Calculate health score
  const semanticCompliance = latestMetrics?.semantic_compliance_score || 0;
  const eavAuthority = calculateEavAuthorityScore(data.eavs);
  const eatScore = latestEat?.overall_eat_score || 0;
  const contentHealth = latestCorpus?.semantic_coverage_percentage || 0;

  const overall = Math.round((semanticCompliance + eavAuthority + eatScore + contentHealth) / 4);
  const previousOverall = previousMetrics
    ? Math.round((previousMetrics.semantic_compliance_score + eavAuthority + (data.eatScannerHistory[1]?.overall_eat_score || eatScore)) / 3)
    : overall;

  const healthScore: HealthScore = {
    overall,
    components: {
      semanticCompliance,
      eavAuthority,
      eatScore,
      contentHealth,
    },
    trend: calculateTrend(overall, previousOverall),
    grade: getGrade(overall),
  };

  // Build key metrics
  const keyMetrics: MetricCard[] = [
    {
      label: 'Topics',
      value: `${data.topics.filter(t => t.type === 'core').length} core / ${data.topics.filter(t => t.type === 'outer').length} outer`,
      trend: undefined,
      description: 'Total topics in your map',
      tooltipExplanation: 'Core topics are your main content pillars. Outer topics support and interlink with core topics.',
      color: data.topics.length > 0 ? 'blue' : 'gray',
    },
    {
      label: 'EAVs',
      value: data.eavs.length,
      trend: undefined,
      description: 'Semantic triples defining your entity',
      tooltipExplanation: 'Entity-Attribute-Value triples are facts about your central entity that establish topical authority.',
      color: data.eavs.length >= 50 ? 'green' : data.eavs.length >= 20 ? 'yellow' : 'red',
    },
    {
      label: 'E-A-T Score',
      value: `${eatScore}%`,
      trend: data.eatScannerHistory[1] ? calculateTrend(eatScore, data.eatScannerHistory[1].overall_eat_score) : undefined,
      description: 'Expertise, Authority, Trust signals',
      tooltipExplanation: 'E-A-T measures how well your content demonstrates expertise, establishes authority, and builds trust with users and search engines.',
      color: eatScore >= 70 ? 'green' : eatScore >= 50 ? 'yellow' : 'red',
    },
    {
      label: 'Content Gaps',
      value: latestQueryNetwork?.total_content_gaps || 0,
      trend: data.queryNetworkHistory[1] ? calculateTrend(
        latestQueryNetwork?.total_content_gaps || 0,
        data.queryNetworkHistory[1].total_content_gaps || 0,
        true // invert: lower is better
      ) : undefined,
      description: 'Opportunities from competitor analysis',
      tooltipExplanation: 'Content gaps are topics your competitors cover that you don\'t. Filling these gaps increases topical authority.',
      color: (latestQueryNetwork?.total_content_gaps || 0) > 10 ? 'orange' : 'green',
    },
  ];

  // Build trend data
  const trendData: TrendDataPoint[] = data.metricsHistory.slice(0, 30).reverse().map((m, i) => ({
    date: m.created_at,
    semanticCompliance: m.semantic_compliance_score,
    eavCount: data.eavs.length, // Would need historical EAV count
    eatScore: data.eatScannerHistory[i]?.overall_eat_score || 0,
    contentGaps: data.queryNetworkHistory[i]?.total_content_gaps || 0,
  }));

  // Build alerts
  const alerts: Alert[] = [];

  if (latestCorpus && (latestCorpus.content_overlaps?.length || 0) > 0) {
    alerts.push({
      id: 'cannibalization-detected',
      severity: 'high',
      title: 'Cannibalization Detected',
      description: `${latestCorpus.content_overlaps?.length || 0} topic pairs have significant content overlap that may hurt rankings.`,
      source: 'corpus_audit',
      actionType: 'merge_topics',
      createdAt: latestCorpus.created_at,
    });
  }

  if (eatScore < 50) {
    alerts.push({
      id: 'low-eat-score',
      severity: 'high',
      title: 'Low E-A-T Score',
      description: 'Your E-A-T score is below 50%. Add author credentials, external citations, and trust signals.',
      source: 'eat_scanner',
      createdAt: new Date().toISOString(),
    });
  }

  if ((latestQueryNetwork?.total_content_gaps || 0) > 20) {
    alerts.push({
      id: 'many-content-gaps',
      severity: 'medium',
      title: 'Multiple Content Gaps',
      description: `${latestQueryNetwork?.total_content_gaps} content opportunities identified from competitor analysis.`,
      source: 'query_network',
      actionType: 'create_brief_from_gap',
      createdAt: latestQueryNetwork?.created_at || new Date().toISOString(),
    });
  }

  return {
    healthScore,
    keyMetrics,
    trendData,
    alerts: alerts.slice(0, 5),
    quickActions: [], // Populated in component
  };
}

// =====================
// Topical Authority Builder
// =====================

function buildTopicalAuthority(data: RawInsightsData): TopicalAuthorityData {
  const coreTopics = data.topics.filter(t => t.type === 'core');
  const outerTopics = data.topics.filter(t => t.type === 'outer');
  const orphanTopics = data.topics.filter(t => !t.parent_topic_id && t.type === 'outer');

  // Calculate hub-spoke ratio
  const hubSpokeRatio = coreTopics.length > 0
    ? Math.round((outerTopics.length / coreTopics.length) * 10) / 10
    : 0;

  // EAV distribution - with null checks
  const eavsByCategory: Record<string, number> = {};
  data.eavs.forEach(eav => {
    const category = eav?.predicate?.category || 'UNCATEGORIZED';
    eavsByCategory[category] = (eavsByCategory[category] || 0) + 1;
  });

  // Top entities by attribute count - with null checks
  const entityCounts: Record<string, number> = {};
  data.eavs.forEach(eav => {
    const entity = eav?.subject?.label;
    if (entity) {
      entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    }
  });
  const topEntities = Object.entries(entityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([entity, count]) => ({ entity, attributeCount: count }));

  // Missing categories
  const expectedCategories = ['UNIQUE', 'ROOT', 'RARE', 'COMMON'];
  const missingCategories = expectedCategories.filter(cat => !eavsByCategory[cat]);

  // Semantic compliance from metrics
  const latestMetrics = data.metricsHistory[0];
  const semanticCompliance: TopicalAuthorityData['semanticCompliance'] = {
    score: latestMetrics?.semantic_compliance_score || 0,
    breakdown: [], // Would need more detailed metrics
    nonCompliantTopics: [],
  };

  // Information density
  const averageFactsPerTopic = data.topics.length > 0
    ? Math.round(data.eavs.length / data.topics.length * 10) / 10
    : 0;

  return {
    mapHealth: {
      hubSpokeRatio,
      optimalRatio: '1:7-10',
      pillarCoverage: coreTopics.length,
      orphanTopicCount: orphanTopics.length,
      totalTopics: data.topics.length,
      coreTopics: coreTopics.length,
      outerTopics: outerTopics.length,
    },
    eavDistribution: {
      byCategory: eavsByCategory,
      topEntities,
      missingCategories,
      totalEavs: data.eavs.length,
    },
    semanticCompliance,
    informationDensity: {
      averageFactsPerTopic,
      lowDensityTopics: [], // Would need per-topic analysis
    },
  };
}

// =====================
// Competitive Intelligence Builder
// =====================

function buildCompetitiveIntel(data: RawInsightsData): CompetitiveIntelData {
  const latestQueryNetwork = data.queryNetworkHistory[0];

  // Query network summary
  const queryNetwork = latestQueryNetwork?.query_network || [];
  const intentCounts: Record<string, number> = {};
  queryNetwork.forEach((q: any) => {
    const intent = q.intent || 'unknown';
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });

  // Content gaps from query network
  const contentGaps: ContentGap[] = (latestQueryNetwork?.content_gaps || []).map((gap: any, i: number) => ({
    id: `gap-${i}`,
    title: gap.title || gap.topic || 'Unknown Gap',
    description: gap.description || gap.reasoning || '',
    competitorCoverageCount: gap.competitor_count || 1,
    potentialTrafficEstimate: gap.search_volume,
    difficulty: gap.difficulty || 'medium',
    priority: gap.priority || i + 1,
  }));

  // Questions from query network
  const questionsToAnswer: Question[] = queryNetwork
    .flatMap((q: any) => (q.questions || []).map((question: string, i: number) => ({
      id: `q-${q.query}-${i}`,
      question,
      source: q.query,
      relatedTopics: [],
    })))
    .slice(0, 50);

  // Competitor EAV comparison - with null checks for malformed data
  const competitorEavs: SemanticTriple[] = (latestQueryNetwork?.competitor_eavs || [])
    .filter((e: any) => e?.subject?.label && e?.predicate?.relation && e?.object?.value);
  const validUserEavs = data.eavs.filter(e => e?.subject?.label && e?.predicate?.relation && e?.object?.value);

  const yourEavLabels = new Set(validUserEavs.map(e => `${e.subject.label}|${e.predicate.relation}|${e.object.value}`));
  const compEavLabels = new Set(competitorEavs.map(e => `${e.subject.label}|${e.predicate.relation}|${e.object.value}`));

  const uniqueToCompetitors = competitorEavs.filter(e =>
    !yourEavLabels.has(`${e.subject.label}|${e.predicate.relation}|${e.object.value}`)
  );
  const uniqueToYou = validUserEavs.filter(e =>
    !compEavLabels.has(`${e.subject.label}|${e.predicate.relation}|${e.object.value}`)
  );

  // Recommendations
  const recommendations: EnhancedRecommendation[] = (latestQueryNetwork?.recommendations || []).map((rec: any, i: number) => ({
    id: `rec-${i}`,
    title: rec.title || rec.recommendation || 'Recommendation',
    description: rec.description || rec.details || '',
    businessImpact: rec.impact || 'Improves topical authority and search visibility',
    effort: rec.effort || 'medium',
    actionType: rec.action_type,
    implementable: !!rec.action_type,
  }));

  return {
    queryNetworkSummary: {
      totalQueries: queryNetwork.length,
      intentDistribution: intentCounts,
      yourCoverage: data.topics.length,
      competitorEavCount: competitorEavs.length, // Changed from queryNetwork.length to actual competitor EAV count
      contentGapsCount: contentGaps.length,
      lastUpdated: latestQueryNetwork?.created_at,
    },
    competitorEavComparison: {
      yourEavCount: data.eavs.length,
      competitorEavCount: competitorEavs.length,
      uniqueToCompetitors,
      uniqueToYou,
      sharedEavs: data.eavs.length - uniqueToYou.length,
    },
    contentGaps,
    questionsToAnswer,
    recommendations,
  };
}

// =====================
// Authority & Trust Builder
// =====================

function buildAuthorityTrust(data: RawInsightsData): AuthorityTrustData {
  const latestEat = data.eatScannerHistory[0];

  // Extract factors from eat_breakdown if available
  const eatBreakdownData = latestEat?.eat_breakdown as any;
  const eatBreakdown: AuthorityTrustData['eatBreakdown'] = {
    overall: latestEat?.overall_eat_score || 0,
    expertise: {
      score: latestEat?.expertise_score || 0,
      explanation: 'Measures demonstrated knowledge and credentials in your field.',
      factors: eatBreakdownData?.expertise?.factors || [],
    },
    authority: {
      score: latestEat?.authority_score || 0,
      explanation: 'Measures recognition and citations from other authoritative sources.',
      factors: eatBreakdownData?.authority?.factors || [],
    },
    trust: {
      score: latestEat?.trust_score || 0,
      explanation: 'Measures reliability, transparency, and user confidence signals.',
      factors: eatBreakdownData?.trust?.factors || [],
    },
  };

  // Extract entity recognition from entity_authority
  const entityAuthority = latestEat?.entity_authority as any;
  const entityRecognition: AuthorityTrustData['entityRecognition'] = {
    wikipediaPresence: entityAuthority?.wikipedia_presence || false,
    wikidataId: entityAuthority?.wikidata_id,
    knowledgeGraphStatus: entityAuthority?.knowledge_graph_status || 'not_found',
    structuredDataValid: entityAuthority?.structured_data_valid || false,
    structuredDataIssues: entityAuthority?.structured_data_issues || [],
  };

  const reputationSignals = (latestEat?.reputation_signals || []).map((signal: any) => ({
    source: signal.source,
    type: signal.type || 'mention',
    sentiment: signal.sentiment || 'neutral',
    url: signal.url,
  }));

  // Build improvement roadmap
  const improvementRoadmap: AuthorityTrustData['improvementRoadmap'] = [];

  if (eatBreakdown.expertise.score < 70) {
    improvementRoadmap.push({
      id: 'improve-expertise',
      category: 'expertise',
      title: 'Add Author Credentials',
      description: 'Include author bios with relevant qualifications, certifications, and experience.',
      priority: 1,
      external: false,
    });
  }

  if (eatBreakdown.authority.score < 70) {
    improvementRoadmap.push({
      id: 'improve-authority',
      category: 'authority',
      title: 'Build External Citations',
      description: 'Get mentioned or linked from authoritative industry publications.',
      priority: 2,
      external: true,
    });
  }

  if (eatBreakdown.trust.score < 70) {
    improvementRoadmap.push({
      id: 'improve-trust',
      category: 'trust',
      title: 'Add Trust Signals',
      description: 'Include contact information, privacy policy, and clear authorship.',
      priority: 3,
      external: false,
    });
  }

  return {
    eatBreakdown,
    entityRecognition,
    reputationSignals,
    improvementRoadmap,
  };
}

// =====================
// Content Health Builder
// =====================

function buildContentHealth(data: RawInsightsData): ContentHealthData {
  const latestCorpus = data.corpusHistory[0];

  // Extract metrics from corpus audit
  const corpusMetrics = latestCorpus?.metrics as any;
  const corpusOverview: ContentHealthData['corpusOverview'] = {
    totalPages: latestCorpus?.total_pages || 0,
    semanticCoverage: latestCorpus?.semantic_coverage_percentage || 0,
    overlapCount: latestCorpus?.content_overlaps?.length || latestCorpus?.total_overlaps || 0,
    averagePageScore: corpusMetrics?.average_page_score || 0,
  };

  // Create URL/slug to topic title mapping for resolving page URLs to topic names
  const urlToTopic = new Map<string, { title: string; id: string }>();
  data.topics.forEach(t => {
    // Map by target_url if available
    if (t.target_url) {
      urlToTopic.set(t.target_url, { title: t.title, id: t.id });
      // Also try just the pathname
      try {
        const pathname = new URL(t.target_url).pathname;
        urlToTopic.set(pathname, { title: t.title, id: t.id });
      } catch { /* ignore invalid URLs */ }
    }
    // Map by slug derived from title
    const slug = t.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    urlToTopic.set(slug, { title: t.title, id: t.id });
    // Map by id as well
    urlToTopic.set(t.id, { title: t.title, id: t.id });
  });

  // Helper to resolve a page URL/ID to a topic name
  const resolveTopicName = (urlOrId: string | undefined): string => {
    if (!urlOrId) return 'Unknown Topic';

    // Direct lookup
    const direct = urlToTopic.get(urlOrId);
    if (direct) return direct.title;

    // Try extracting pathname from URL
    try {
      const pathname = new URL(urlOrId).pathname;
      const byPath = urlToTopic.get(pathname);
      if (byPath) return byPath.title;
      // Return clean pathname if no topic match
      return pathname.replace(/^\//, '').replace(/-/g, ' ') || urlOrId;
    } catch {
      // Not a URL, try slug matching
      const slug = urlOrId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const bySlug = urlToTopic.get(slug);
      if (bySlug) return bySlug.title;
      return urlOrId;
    }
  };

  const resolveTopicId = (urlOrId: string | undefined): string | undefined => {
    if (!urlOrId) return undefined;
    const direct = urlToTopic.get(urlOrId);
    if (direct) return direct.id;
    try {
      const pathname = new URL(urlOrId).pathname;
      const byPath = urlToTopic.get(pathname);
      if (byPath) return byPath.id;
    } catch { /* ignore */ }
    return urlOrId;
  };

  const cannibalizationRisks: ContentHealthData['cannibalizationRisks'] = (latestCorpus?.content_overlaps || []).map((pair: any, i: number) => {
    const pageA = pair.pageA || pair.page_a || pair.topic_a;
    const pageB = pair.pageB || pair.page_b || pair.topic_b;
    const topicAId = pair.topic_a_id || pair.page_a_id || resolveTopicId(pageA);
    const topicBId = pair.topic_b_id || pair.page_b_id || resolveTopicId(pageB);
    const similarity = pair.similarity_score || pair.overlap_score || pair.overlapPercentage || 0;

    return {
      id: `cannibal-${i}`,
      topics: [resolveTopicName(pageA), resolveTopicName(pageB)] as [string, string],
      topicIds: [topicAId, topicBId] as [string, string],
      similarityScore: similarity,
      recommendation: (similarity > 80 ? 'merge' : 'differentiate') as 'merge' | 'differentiate',
    };
  });

  // Extract anchor analysis from anchor_patterns
  const anchorPatterns = latestCorpus?.anchor_patterns || [];
  const totalAnchors = anchorPatterns.length;
  const genericAnchors = anchorPatterns.filter((a: any) => a.type === 'generic' || a.is_generic).length;
  const overOptimizedAnchors = anchorPatterns.filter((a: any) => a.type === 'over_optimized' || a.is_over_optimized).length;
  const anchorTextAudit: ContentHealthData['anchorTextAudit'] = {
    totalAnchors,
    genericAnchors,
    overOptimizedAnchors,
    suggestions: anchorPatterns.filter((a: any) => a.suggestion).map((a: any) => a.suggestion),
  };

  // Content freshness
  const staleTopics = data.topics
    .filter(t => t.updated_at)
    .map(t => {
      const daysOld = Math.floor((Date.now() - new Date(t.updated_at!).getTime()) / (1000 * 60 * 60 * 24));
      return { topic: t.title, lastUpdate: t.updated_at!, daysOld };
    })
    .filter(t => t.daysOld > 90)
    .sort((a, b) => b.daysOld - a.daysOld);

  return {
    corpusOverview,
    cannibalizationRisks,
    anchorTextAudit,
    contentFreshness: {
      topicsWithDates: data.topics.filter(t => t.updated_at).length,
      staleTopics,
      decayRiskTopics: data.topics
        .filter(t => t.decay_score && t.decay_score > 50)
        .map(t => ({ topic: t.title, decayScore: t.decay_score! })),
    },
  };
}

// =====================
// Publication Progress Builder
// =====================

function buildPublicationProgress(data: RawInsightsData): PublicationProgressData {
  // Phase progress (would come from publication plans)
  const phaseProgress = [1, 2, 3, 4].map(phase => {
    const phaseTopics = data.topics.filter(t => {
      const metadata = t.metadata as any;
      return metadata?.publication_phase === phase;
    });
    const completed = phaseTopics.filter(t => {
      const metadata = t.metadata as any;
      return metadata?.publication_status === 'published';
    });

    return {
      phase,
      name: `Phase ${phase}`,
      completion: phaseTopics.length > 0 ? Math.round((completed.length / phaseTopics.length) * 100) : 0,
      totalItems: phaseTopics.length,
      completedItems: completed.length,
    };
  });

  // Content status board
  const contentStatusBoard = data.topics.map(t => {
    const metadata = t.metadata as any;
    const hasBrief = data.briefs.some(b => b.topic_id === t.id);
    let status: 'not_started' | 'brief_ready' | 'draft' | 'review' | 'published' = 'not_started';

    if (metadata?.publication_status === 'published') status = 'published';
    else if (metadata?.publication_status === 'review') status = 'review';
    else if (metadata?.publication_status === 'draft') status = 'draft';
    else if (hasBrief) status = 'brief_ready';

    return {
      id: t.id,
      topicId: t.id,
      title: t.title,
      status,
      scheduledDate: t.planned_publication_date,
    };
  });

  // Upcoming deadlines
  const now = new Date();
  const upcomingDeadlines = data.topics
    .filter(t => t.planned_publication_date)
    .map(t => {
      const dueDate = new Date(t.planned_publication_date!);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status: 'upcoming' | 'today' | 'overdue' = 'upcoming';
      if (diffDays < 0) status = 'overdue';
      else if (diffDays === 0) status = 'today';

      return {
        id: t.id,
        topicId: t.id,
        title: t.title,
        dueDate: t.planned_publication_date!,
        status,
        type: 'publish' as const,
      };
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  return {
    phaseProgress,
    contentStatusBoard,
    performanceTracking: [], // Would need GSC integration
    upcomingDeadlines,
  };
}

// =====================
// Cost & Usage Builder
// =====================

function buildCostUsage(data: RawInsightsData): CostUsageData {
  const logs = data.aiUsageLogs;

  // Helper to safely get numeric values (prevents NaN)
  const safeNumber = (val: any): number => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Token consumption by provider
  const byProvider: Record<string, number> = {};
  const byOperation: Record<string, number> = {};
  const costByProvider: Record<string, number> = {};

  // Helper to get total tokens from a log entry
  const getLogTokens = (log: AIUsageLog) => {
    return log.total_tokens ?? (safeNumber(log.tokens_in) + safeNumber(log.tokens_out));
  };

  logs.forEach(log => {
    const tokens = getLogTokens(log);
    const cost = safeNumber(log.cost_usd);
    const provider = log.provider || 'unknown';
    const operation = log.operation || 'unknown';

    byProvider[provider] = (byProvider[provider] || 0) + tokens;
    byOperation[operation] = (byOperation[operation] || 0) + tokens;
    costByProvider[provider] = (costByProvider[provider] || 0) + cost;
  });

  // Daily trends (last 30 days)
  const dailyTotals: Record<string, { tokens: number; cost: number }> = {};
  logs.forEach(log => {
    const date = log.created_at?.split('T')[0] || 'unknown';
    const tokens = getLogTokens(log);
    const cost = safeNumber(log.cost_usd);

    if (!dailyTotals[date]) dailyTotals[date] = { tokens: 0, cost: 0 };
    dailyTotals[date].tokens += tokens;
    dailyTotals[date].cost += cost;
  });

  const trends = Object.entries(dailyTotals)
    .filter(([date]) => date !== 'unknown')
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, data]) => ({ date, ...data }));

  const totalTokens = logs.reduce((sum, log) => sum + getLogTokens(log), 0);
  const totalCost = logs.reduce((sum, log) => sum + safeNumber(log.cost_usd), 0);

  // Efficiency metrics
  const operationStats: Record<string, { tokens: number; count: number }> = {};
  logs.forEach(log => {
    if (!operationStats[log.operation]) operationStats[log.operation] = { tokens: 0, count: 0 };
    operationStats[log.operation].tokens += getLogTokens(log);
    operationStats[log.operation].count += 1;
  });

  const tokensPerOperation: Record<string, number> = {};
  Object.entries(operationStats).forEach(([op, stats]) => {
    tokensPerOperation[op] = Math.round(stats.tokens / stats.count);
  });

  // Optimization suggestions
  const optimizationSuggestions = [];

  const providers = Object.keys(byProvider);
  if (providers.length > 1) {
    const mostExpensive = Object.entries(costByProvider).sort((a, b) => b[1] - a[1])[0];
    optimizationSuggestions.push({
      id: 'switch-provider',
      title: `Consider cheaper alternatives to ${mostExpensive[0]}`,
      description: `${mostExpensive[0]} accounts for the highest cost. Consider using a more cost-effective model for less critical operations.`,
      potentialSavings: mostExpensive[1] * 0.3,
      implementation: 'Update AI provider settings for specific operation types.',
    });
  }

  return {
    tokenConsumption: {
      byProvider,
      byOperation,
      trends,
      totalTokens,
      periodLabel: 'Last 30 days',
    },
    costBreakdown: {
      byProvider: costByProvider,
      costPerContent: data.briefs.length > 0 ? totalCost / data.briefs.length : 0,
      totalCost,
    },
    efficiencyMetrics: {
      tokensPerOperation,
      retryRate: 0, // Would need retry tracking
      modelComparison: [],
    },
    optimizationSuggestions,
  };
}

// =====================
// Action Center Builder
// =====================

function buildActionCenter(
  data: RawInsightsData,
  computed: {
    executiveSummary: ExecutiveSummaryData;
    competitiveIntel: CompetitiveIntelData;
    authorityTrust: AuthorityTrustData;
    contentHealth: ContentHealthData;
  }
): ActionCenterData {
  const actions: ActionItem[] = [];

  // Add critical actions from alerts
  computed.executiveSummary.alerts
    .filter(a => a.severity === 'critical' || a.severity === 'high')
    .forEach(alert => {
      actions.push({
        id: alert.id,
        what: alert.title,
        why: alert.description,
        how: getActionInstructions(alert.actionType),
        effort: 'medium',
        priority: alert.severity === 'critical' ? 'critical' : 'high',
        actionType: alert.actionType,
        implementable: !!alert.actionType,
        status: 'pending',
        source: alert.source,
        createdAt: alert.createdAt,
      });
    });

  // Add content gap actions
  computed.competitiveIntel.contentGaps.slice(0, 5).forEach((gap, i) => {
    actions.push({
      id: `gap-action-${gap.id}`,
      what: `Create content for: ${gap.title}`,
      why: `${gap.competitorCoverageCount} competitors cover this topic. Filling this gap improves topical authority.`,
      how: 'Click "Create Brief" to generate a content brief from this gap.',
      effort: 'medium',
      priority: i < 2 ? 'high' : 'medium',
      actionType: 'create_brief_from_gap',
      actionPayload: { gap },
      implementable: true,
      status: 'pending',
      source: 'query_network',
      createdAt: new Date().toISOString(),
    });
  });

  // Add EAV actions
  if (computed.competitiveIntel.competitorEavComparison.uniqueToCompetitors.length > 5) {
    actions.push({
      id: 'add-competitor-eavs',
      what: `Add ${computed.competitiveIntel.competitorEavComparison.uniqueToCompetitors.length} competitor EAVs`,
      why: 'Competitors have semantic triples you\'re missing. Adding these strengthens your topical authority.',
      how: 'Click "Add to Map" to import selected competitor EAVs.',
      effort: 'low',
      priority: 'medium',
      actionType: 'add_eavs_to_map',
      actionPayload: { eavs: computed.competitiveIntel.competitorEavComparison.uniqueToCompetitors },
      implementable: true,
      status: 'pending',
      source: 'query_network',
      createdAt: new Date().toISOString(),
    });
  }

  // Add E-A-T improvement actions
  computed.authorityTrust.improvementRoadmap.forEach(item => {
    actions.push({
      id: item.id,
      what: item.title,
      why: `Your ${item.category} score needs improvement.`,
      how: item.description,
      effort: item.external ? 'high' : 'medium',
      priority: item.priority === 1 ? 'high' : 'medium',
      implementable: !item.external,
      status: 'pending',
      source: 'eat_scanner',
      createdAt: new Date().toISOString(),
    });
  });

  // Add cannibalization fixes
  computed.contentHealth.cannibalizationRisks.forEach(risk => {
    actions.push({
      id: risk.id,
      what: `Resolve overlap: ${risk.topics[0]} vs ${risk.topics[1]}`,
      why: `${Math.round(risk.similarityScore)}% content overlap may hurt rankings for both topics.`,
      how: risk.recommendation === 'merge'
        ? 'These topics are too similar. Merge them into a single comprehensive topic.'
        : 'Differentiate these topics by adjusting their angles and focus.',
      effort: 'medium',
      priority: risk.similarityScore > 85 ? 'high' : 'medium',
      actionType: risk.recommendation === 'merge' ? 'merge_topics' : 'differentiate_topics',
      actionPayload: { topicIds: risk.topicIds, strategy: risk.recommendation },
      implementable: true,
      status: 'pending',
      source: 'corpus_audit',
      createdAt: new Date().toISOString(),
    });
  });

  // Categorize actions
  return {
    criticalActions: actions.filter(a => a.priority === 'critical'),
    highPriorityActions: actions.filter(a => a.priority === 'high'),
    mediumPriorityActions: actions.filter(a => a.priority === 'medium'),
    backlogActions: actions.filter(a => a.priority === 'backlog'),
    completedActions: [],
  };
}

// =====================
// Audit History Builder
// =====================

function buildAuditHistory(data: RawInsightsData): AuditHistoryData {
  return {
    queryNetworkHistory: data.queryNetworkHistory.map(audit => ({
      id: audit.id,
      type: 'query_network' as const,
      label: audit.seed_keyword || 'Query Network Audit',
      details: `${audit.total_queries} queries | ${audit.total_competitor_eavs} EAVs | ${audit.total_recommendations} recs`,
      created_at: audit.created_at,
    })),
    eatScannerHistory: data.eatScannerHistory.map(audit => ({
      id: audit.id,
      type: 'eat_scanner' as const,
      label: audit.entity_name || 'E-A-T Scan',
      score: audit.overall_eat_score || undefined,
      details: new Date(audit.created_at).toLocaleDateString(),
      created_at: audit.created_at,
    })),
    corpusHistory: data.corpusHistory.map(audit => ({
      id: audit.id,
      type: 'corpus' as const,
      label: audit.domain || 'Corpus Audit',
      score: audit.semantic_coverage_percentage ? Math.round(audit.semantic_coverage_percentage) : undefined,
      details: `${audit.total_pages} pages | ${audit.semantic_coverage_percentage?.toFixed(1) || 0}% coverage`,
      created_at: audit.created_at,
    })),
    metricsHistory: data.metricsHistory.map(snapshot => ({
      id: snapshot.id,
      type: 'metrics' as const,
      label: snapshot.snapshot_name || 'Auto Snapshot',
      score: snapshot.semantic_compliance_score || undefined,
      details: `${snapshot.eav_count} EAVs`,
      created_at: snapshot.created_at,
    })),
  };
}

// =====================
// Helper Functions
// =====================

function calculateEavAuthorityScore(eavs: SemanticTriple[]): number {
  if (eavs.length === 0) return 0;

  const completeness = calculateEavCompleteness(eavs);
  return completeness.overall;
}

function calculateTrend(current: number, previous: number, invert = false): TrendDirection {
  const percentChange = previous !== 0
    ? Math.round(((current - previous) / previous) * 100)
    : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (percentChange > 5) direction = 'up';
  else if (percentChange < -5) direction = 'down';

  // For metrics where lower is better (like content gaps), invert the direction
  if (invert && direction !== 'stable') {
    direction = direction === 'up' ? 'down' : 'up';
  }

  return { direction, percentChange, previousValue: previous };
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getActionInstructions(actionType?: string): string {
  switch (actionType) {
    case 'add_eavs_to_map':
      return 'Select the EAVs you want to add and click "Add to Map".';
    case 'create_brief_from_gap':
      return 'Click "Create Brief" to generate a content brief for this topic.';
    case 'add_questions_as_faq':
      return 'Select questions and click "Add as FAQ" to create FAQ content.';
    case 'merge_topics':
      return 'Review the overlapping topics and choose which to keep as primary.';
    case 'differentiate_topics':
      return 'Adjust the topic angles to make them distinct from each other.';
    default:
      return 'Review the issue and take appropriate action manually.';
  }
}
