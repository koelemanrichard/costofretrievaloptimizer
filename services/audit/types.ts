export type AuditPhaseName =
  | 'strategicFoundation'
  | 'eavSystem'
  | 'microSemantics'
  | 'informationDensity'
  | 'contextualFlow'
  | 'internalLinking'
  | 'semanticDistance'
  | 'contentFormat'
  | 'htmlTechnical'
  | 'metaStructuredData'
  | 'costOfRetrieval'
  | 'urlArchitecture'
  | 'crossPageConsistency'
  | 'websiteTypeSpecific'
  | 'factValidation';

export const DEFAULT_AUDIT_WEIGHTS: Record<string, number> = {
  strategicFoundation: 10,
  eavSystem: 15,
  microSemantics: 13,
  informationDensity: 8,
  contextualFlow: 15,
  internalLinking: 10,
  semanticDistance: 3,
  contentFormat: 5,
  htmlTechnical: 7,
  metaStructuredData: 5,
  costOfRetrieval: 4,
  urlArchitecture: 3,
  crossPageConsistency: 2,
  // websiteTypeSpecific and factValidation are bonus/optional, not in the 100% total
};

export type AuditWeightConfig = Partial<Record<AuditPhaseName, number>>;

export interface AuditRequest {
  type: 'internal' | 'external' | 'published';
  projectId: string;
  mapId?: string;
  topicId?: string;
  jobId?: string;
  url?: string;
  relatedUrls?: string[];
  depth: 'quick' | 'deep';
  phases: AuditPhaseName[];
  scrapingProvider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  language: string;
  includeFactValidation: boolean;
  includePerformanceData: boolean;
  customWeights?: AuditWeightConfig;
}

export interface AuditPhaseResult {
  phase: AuditPhaseName;
  score: number;
  weight: number;
  passedChecks: number;
  totalChecks: number;
  findings: AuditFinding[];
  summary: string;
}

export interface AuditFinding {
  id: string;
  phase: AuditPhaseName;
  ruleId: string;
  checklistRuleNumber?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  whyItMatters: string;
  currentValue?: string;
  expectedValue?: string;
  exampleFix?: string;
  affectedElement?: string;
  autoFixAvailable: boolean;
  autoFixAction?: () => Promise<void>;
  estimatedImpact: 'high' | 'medium' | 'low';
  category: string;
  language?: string;
}

export interface UnifiedAuditReport {
  id: string;
  projectId: string;
  auditType: AuditRequest['type'];
  url?: string;
  overallScore: number;
  phaseResults: AuditPhaseResult[];
  contentMergeSuggestions: ContentMergeSuggestion[];
  missingKnowledgeGraphTopics: string[];
  cannibalizationRisks: CannibalizationRisk[];
  performanceData?: PerformanceSnapshot;
  performanceCorrelation?: PerformanceCorrelation;
  relatedUrlScores?: { url: string; score: number; summary: string }[];
  language: string;
  version: number;
  createdAt: string;
  auditDurationMs: number;
  prerequisitesMet: {
    businessInfo: boolean;
    pillars: boolean;
    eavs: boolean;
  };
}

export interface FetchedContent {
  url: string;
  semanticText: string;
  rawHtml: string;
  title: string;
  metaDescription: string;
  headings: { level: number; text: string }[];
  images: { src: string; alt: string }[];
  internalLinks: { href: string; anchor: string }[];
  externalLinks: { href: string; anchor: string }[];
  schemaMarkup: object[];
  language: string;
  provider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  fetchDurationMs: number;
}

export interface FetchOptions {
  preferredProvider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  fallbackEnabled?: boolean;
}

export interface FactClaim {
  id: string;
  text: string;
  claimType: 'statistic' | 'date' | 'attribution' | 'definition' | 'comparison' | 'general';
  confidence: number;
  sourceInContent?: string;
  verificationStatus: 'verified' | 'unverified' | 'disputed' | 'outdated' | 'unable_to_verify';
  verificationSources: VerificationSource[];
  suggestion?: string;
}

export interface VerificationSource {
  url: string;
  title: string;
  snippet: string;
  agreesWithClaim: boolean;
  retrievedAt: string;
}

export interface ContentMergeSuggestion {
  sourceUrl: string;
  targetUrl: string;
  overlapPercentage: number;
  reason: string;
  suggestedAction: 'merge' | 'differentiate' | 'redirect';
}

export interface CannibalizationRisk {
  urls: string[];
  sharedEntity: string;
  sharedKeywords: string[];
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface PerformanceSnapshot {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  pageviews?: number;
  bounceRate?: number;
  avgSessionDuration?: number;
  period: { start: string; end: string };
}

export interface PerformanceCorrelation {
  auditScoreTrend: { date: string; score: number }[];
  clicksTrend: { date: string; value: number }[];
  impressionsTrend: { date: string; value: number }[];
  correlationCoefficient: number;
  insight: string;
}
