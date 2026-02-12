// types/insights.ts
// Types for the SEO Insights Hub

import type { SemanticTriple, EnrichedTopic, ContentBrief } from '../types';

// =====================
// Core Insights Types
// =====================

export type InsightsTabId =
  | 'executive-summary'
  | 'topical-authority'
  | 'competitive-intel'
  | 'authority-trust'
  | 'content-health'
  | 'semantic-map'
  | 'gap-analysis'
  | 'publication-progress'
  | 'cost-usage'
  | 'audit-history'
  | 'action-center';

export interface TrendDirection {
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  previousValue: number;
}

export interface HealthScore {
  overall: number;
  components: {
    semanticCompliance: number;
    eavAuthority: number;
    eatScore: number;
    contentHealth: number;
  };
  trend?: TrendDirection;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface MetricCard {
  label: string;
  value: number | string;
  trend?: TrendDirection;
  description: string;
  tooltipExplanation: string;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'gray';
}

export interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source: 'query_network' | 'eat_scanner' | 'corpus_audit' | 'metrics' | 'system';
  actionType?: InsightActionType;
  actionPayload?: Record<string, any>;
  createdAt: string;
}

// =====================
// Executive Summary Types
// =====================

export interface ExecutiveSummaryData {
  healthScore: HealthScore;
  keyMetrics: MetricCard[];
  trendData: TrendDataPoint[];
  alerts: Alert[];
  quickActions: QuickAction[];
}

export interface TrendDataPoint {
  date: string;
  semanticCompliance: number;
  eavCount: number;
  eatScore: number;
  contentGaps: number;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => void;
}

// =====================
// Topical Authority Types
// =====================

export interface TopicalAuthorityData {
  mapHealth: MapHealthMetrics;
  eavDistribution: EAVDistribution;
  semanticCompliance: SemanticComplianceDetail;
  informationDensity: InformationDensityMetrics;
}

export interface MapHealthMetrics {
  hubSpokeRatio: number;
  optimalRatio: string;
  pillarCoverage: number;
  orphanTopicCount: number;
  totalTopics: number;
  coreTopics: number;
  outerTopics: number;
}

export interface EAVDistribution {
  byCategory: Record<string, number>;
  topEntities: Array<{ entity: string; attributeCount: number }>;
  missingCategories: string[];
  totalEavs: number;
}

export interface SemanticComplianceDetail {
  score: number;
  breakdown: Array<{ category: string; score: number; issues: string[] }>;
  nonCompliantTopics: Array<{ topic: string; issues: string[] }>;
}

export interface InformationDensityMetrics {
  averageFactsPerTopic: number;
  competitorComparison?: number;
  lowDensityTopics: Array<{ topic: string; factCount: number }>;
}

// =====================
// Competitive Intelligence Types
// =====================

export interface CompetitiveIntelData {
  queryNetworkSummary: QueryNetworkSummary;
  competitorEavComparison: CompetitorEAVComparison;
  contentGaps: ContentGap[];
  questionsToAnswer: Question[];
  recommendations: EnhancedRecommendation[];
}

export interface QueryNetworkSummary {
  totalQueries: number;
  intentDistribution: Record<string, number>;
  yourCoverage: number;
  competitorEavCount: number;  // Actual competitor EAV count (not query count)
  contentGapsCount: number;    // Number of content gaps identified
  lastUpdated?: string;
}

export interface CompetitorEAVComparison {
  yourEavCount: number;
  competitorEavCount: number;
  uniqueToCompetitors: SemanticTriple[];
  uniqueToYou: SemanticTriple[];
  sharedEavs: number;
}

export interface ContentGap {
  id: string;
  title: string;
  description: string;
  competitorCoverageCount: number;
  potentialTrafficEstimate?: number;
  searchVolume?: number;
  difficulty?: 'low' | 'medium' | 'high';
  priority: number;
}

export interface Question {
  id: string;
  question: string;
  searchVolume?: number;
  source: string;
  relatedTopics?: string[];
}

export interface EnhancedRecommendation {
  id: string;
  title: string;
  description: string;
  businessImpact: string;
  effort: 'low' | 'medium' | 'high';
  actionType?: InsightActionType;
  actionPayload?: Record<string, any>;
  implementable: boolean;
}

// =====================
// Authority & Trust Types
// =====================

export interface AuthorityTrustData {
  eatBreakdown: EATBreakdown;
  entityRecognition: EntityRecognitionStatus;
  reputationSignals: ReputationSignal[];
  improvementRoadmap: ImprovementItem[];
}

export interface EATBreakdown {
  overall: number;
  expertise: { score: number; explanation: string; factors: string[] };
  authority: { score: number; explanation: string; factors: string[] };
  trust: { score: number; explanation: string; factors: string[] };
}

export interface EntityRecognitionStatus {
  wikipediaPresence: boolean;
  wikidataId?: string;
  knowledgeGraphStatus: 'registered' | 'partial' | 'not_found';
  structuredDataValid: boolean;
  structuredDataIssues: string[];
}

export interface ReputationSignal {
  source: string;
  type: 'review' | 'mention' | 'citation' | 'social';
  sentiment: 'positive' | 'neutral' | 'negative';
  url?: string;
}

export interface ImprovementItem {
  id: string;
  category: 'expertise' | 'authority' | 'trust';
  title: string;
  description: string;
  priority: number;
  external: boolean;
}

// =====================
// Content Health Types
// =====================

export interface ContentHealthData {
  corpusOverview: CorpusOverview;
  cannibalizationRisks: CannibalizationRisk[];
  anchorTextAudit: AnchorTextAudit;
  contentFreshness: ContentFreshnessData;
}

export interface CorpusOverview {
  totalPages: number;
  semanticCoverage: number;
  overlapCount: number;
  averagePageScore: number;
}

export interface CannibalizationRisk {
  id: string;
  topics: [string, string];
  topicIds: [string, string];
  similarityScore: number;
  recommendation: 'merge' | 'differentiate';
}

export interface AnchorTextAudit {
  totalAnchors: number;
  genericAnchors: number;
  overOptimizedAnchors: number;
  suggestions: string[];
}

export interface ContentFreshnessData {
  topicsWithDates: number;
  staleTopics: Array<{ topic: string; lastUpdate: string; daysOld: number }>;
  decayRiskTopics: Array<{ topic: string; decayScore: number }>;
}

// =====================
// Publication Progress Types
// =====================

export interface PublicationProgressData {
  phaseProgress: PhaseProgress[];
  contentStatusBoard: ContentStatusItem[];
  performanceTracking: PerformanceMetric[];
  upcomingDeadlines: Deadline[];
}

export interface PhaseProgress {
  phase: number;
  name: string;
  completion: number;
  totalItems: number;
  completedItems: number;
}

export interface ContentStatusItem {
  id: string;
  topicId: string;
  title: string;
  status: 'not_started' | 'brief_ready' | 'draft' | 'review' | 'published';
  scheduledDate?: string;
  actualDate?: string;
}

export interface PerformanceMetric {
  topicId: string;
  title: string;
  baseline: { impressions: number; clicks: number; position: number };
  current: { impressions: number; clicks: number; position: number };
  change: { impressions: number; clicks: number; position: number };
}

export interface Deadline {
  id: string;
  topicId: string;
  title: string;
  dueDate: string;
  status: 'upcoming' | 'today' | 'overdue';
  type: 'brief' | 'draft' | 'review' | 'publish';
}

// =====================
// Cost & Usage Types
// =====================

export interface CostUsageData {
  tokenConsumption: TokenConsumption;
  costBreakdown: CostBreakdown;
  efficiencyMetrics: EfficiencyMetrics;
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface TokenConsumption {
  byProvider: Record<string, number>;
  byOperation: Record<string, number>;
  trends: Array<{ date: string; tokens: number; cost: number }>;
  totalTokens: number;
  periodLabel: string;
}

export interface CostBreakdown {
  byProvider: Record<string, number>;
  costPerContent: number;
  budgetRemaining?: number;
  budgetTotal?: number;
  totalCost: number;
}

export interface EfficiencyMetrics {
  tokensPerOperation: Record<string, number>;
  retryRate: number;
  modelComparison: Array<{ model: string; avgTokens: number; successRate: number }>;
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  potentialSavings?: number;
  implementation: string;
}

// =====================
// Action Center Types
// =====================

export interface ActionCenterData {
  criticalActions: ActionItem[];
  highPriorityActions: ActionItem[];
  mediumPriorityActions: ActionItem[];
  backlogActions: ActionItem[];
  completedActions: ActionItem[];
}

export interface ActionItem {
  id: string;
  what: string;
  why: string;
  how: string;
  effort: 'low' | 'medium' | 'high';
  priority: 'critical' | 'high' | 'medium' | 'backlog';
  actionType?: InsightActionType;
  actionPayload?: Record<string, any>;
  implementable: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  source: string;
  createdAt: string;
  completedAt?: string;
}

// =====================
// AI Action Types
// =====================

export type InsightActionType =
  | 'add_eavs_to_map'
  | 'create_brief_from_gap'
  | 'add_questions_as_faq'
  | 'merge_topics'
  | 'differentiate_topics'
  | 'regenerate_content'
  | 'schedule_update'
  | 'run_audit'
  | 'expand_eavs'
  | 'run_query_network'
  | 'run_eat_scan'
  | 'run_corpus_audit';

export interface InsightAction {
  id: string;
  mapId: string;
  userId: string;
  actionType: InsightActionType;
  sourceType?: 'query_network' | 'eat_scanner' | 'corpus_audit' | 'metrics';
  sourceId?: string;
  targetType?: 'topic' | 'eav' | 'brief';
  targetId?: string;
  payload: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AddEavsToMapPayload {
  selectedEavs: SemanticTriple[];
  deduplicateAgainstExisting: boolean;
  autoClassify: boolean;
  addLexicalData: boolean;
}

export interface CreateBriefFromGapPayload {
  gap: ContentGap;
  topicType: 'core' | 'outer';
  parentTopicId?: string;
  includeCompetitorAnalysis: boolean;
  targetWordCount?: number;
}

export interface AddQuestionsAsFaqPayload {
  questions: string[];
  createNewTopic: boolean;
  existingTopicId?: string;
  generateAnswers: boolean;
}

export interface MergeTopicsPayload {
  topicIds: [string, string];
  strategy: 'merge' | 'differentiate';
  primaryTopicId?: string;
  differentiationAngles?: string[];
}

// =====================
// Export Types
// =====================

export type ExportFormat = 'pdf' | 'xlsx' | 'html' | 'json' | 'calendar';

export type ExportType =
  | 'executive_summary'
  | 'technical_audit'
  | 'content_plan'
  | 'competitor_analysis'
  | 'eat_report'
  | 'full_data';

export interface ExportConfig {
  type: ExportType;
  format: ExportFormat;
  dateRange?: { start: string; end: string };
  includeHistorical: boolean;
  sections: string[];
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  blob?: Blob;
  error?: string;
}

// =====================
// Audit History Types
// =====================

export interface AuditHistoryEntry {
  id: string;
  type: 'query_network' | 'eat_scanner' | 'corpus' | 'metrics';
  label: string;
  score?: number;
  details: string;
  created_at: string;
}

export interface AuditHistoryData {
  queryNetworkHistory: AuditHistoryEntry[];
  eatScannerHistory: AuditHistoryEntry[];
  corpusHistory: AuditHistoryEntry[];
  metricsHistory: AuditHistoryEntry[];
}

// =====================
// Aggregated Insights
// =====================

export interface AggregatedInsights {
  executiveSummary: ExecutiveSummaryData;
  topicalAuthority: TopicalAuthorityData;
  competitiveIntel: CompetitiveIntelData;
  authorityTrust: AuthorityTrustData;
  contentHealth: ContentHealthData;
  publicationProgress: PublicationProgressData;
  costUsage: CostUsageData;
  actionCenter: ActionCenterData;
  auditHistory: AuditHistoryData;
  lastUpdated: string;
  dataFreshness: {
    queryNetwork?: string;
    eatScanner?: string;
    corpusAudit?: string;
    metrics?: string;
  };
}
