
// types.ts

// FIX: Corrected import path for database types to be a relative path, fixing module resolution error.
import { Json } from './database.types';
// FIX: Export KnowledgeGraph to be available for other modules.
export { KnowledgeGraph } from './lib/knowledgeGraph';

export enum AppStep {
  AUTH,
  PROJECT_SELECTION,
  ANALYSIS_STATUS,
  PROJECT_WORKSPACE,
  BUSINESS_INFO,
  PILLAR_WIZARD,
  EAV_WIZARD,
  COMPETITOR_WIZARD,
  PROJECT_DASHBOARD,
  SITE_ANALYSIS
}

export type StylometryType = 'ACADEMIC_FORMAL' | 'DIRECT_TECHNICAL' | 'PERSUASIVE_SALES' | 'INSTRUCTIONAL_CLEAR';

export interface AuthorProfile {
    name: string;
    bio: string;
    credentials: string; // "PhD in Computer Science"
    socialUrls: string[];
    stylometry: StylometryType;
    customStylometryRules?: string[]; // e.g. "Never use the word 'delve'"
}

export interface BusinessInfo {
  domain: string;
  projectName: string;
  industry: string;
  model: string;
  valueProp: string;
  audience: string;
  expertise: string;
  seedKeyword: string;
  language: string;
  targetMarket: string;
  
  // Holistic SEO - Authority Proof & Authorship
  uniqueDataAssets?: string;
  
  // New Structured Author Identity
  authorProfile?: AuthorProfile; 

  // Legacy fields (kept for backward compat until migration)
  authorName?: string;
  authorBio?: string;
  authorCredentials?: string;
  socialProfileUrls?: string[];

  dataforseoLogin?: string;
  dataforseoPassword?: string;
  apifyToken?: string;
  infranodusApiKey?: string;
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  apitemplateApiKey?: string;
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'perplexity' | 'openrouter';
  aiModel: string;
  geminiApiKey?: string;
  openAiApiKey?: string;
  anthropicApiKey?: string;
  perplexityApiKey?: string;
  openRouterApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  neo4jUri?: string;
  neo4jUser?: string;
  neo4jPassword?: string;
}

export interface SEOPillars {
  centralEntity: string;
  sourceContext: string;
  centralSearchIntent: string;
  
  // Holistic SEO - CSI Breakdown
  primary_verb?: string; // e.g. "Buy", "Hire"
  auxiliary_verb?: string; // e.g. "Learn", "Compare"
}

export interface CandidateEntity {
  entity: string;
  reasoning: string;
  score: number;
}

export interface SourceContextOption {
  context: string;
  reasoning: string;
  score: number;
}

export type AttributeCategory = 'UNIQUE' | 'ROOT' | 'RARE' | 'COMMON';
export type AttributeClass = 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS' | 'SPECIFICATION';

export interface SemanticTriple {
  subject: { 
      label: string; 
      type: string; 
  };
  predicate: { 
      relation: string; 
      type: string; 
      category?: AttributeCategory; // NEW: Rule I.B, I.C
      classification?: AttributeClass; // NEW: Rule II.D
  };
  object: { 
      value: string | number; 
      type: string; 
      unit?: string; // NEW: Rule III.B
      truth_range?: string; // NEW: Rule III.C (e.g. "7.0 - 7.8")
  };
}

export enum FreshnessProfile {
  EVERGREEN = 'EVERGREEN',
  STANDARD = 'STANDARD',
  FREQUENT = 'FREQUENT',
}

export type ExpansionMode = 'ATTRIBUTE' | 'ENTITY' | 'CONTEXT';

export interface TopicBlueprint {
    contextual_vector: string; // H2 sequence
    methodology: string;
    subordinate_hint: string;
    perspective: string;
    interlinking_strategy: string;
    anchor_text: string;
    annotation_hint: string;
    image_alt_text?: string; // Optional override
}

export interface EnrichedTopic {
  id: string;
  map_id: string;
  parent_topic_id: string | null;
  title: string;
  slug: string;
  description: string;
  type: 'core' | 'outer';
  freshness: FreshnessProfile;
  
  // Holistic SEO - Section & Quality Metadata
  topic_class?: 'monetization' | 'informational'; // Core Section vs Author Section
  cluster_role?: 'pillar' | 'cluster_content';
  attribute_focus?: string; // Specific attribute name (e.g. "Price", "History")
  
  // Node Identity & Logistics
  canonical_query?: string; // The single, most representative query
  query_network?: string[]; // Cluster of related mid-string queries
  query_type?: string; // e.g. "Definitional", "Comparative"
  topical_border_note?: string; // Notes defining where the topic ends
  planned_publication_date?: string; // ISO Date
  url_slug_hint?: string; // Instructions for URL optimization (max 3 words)
  
  blueprint?: TopicBlueprint; // Structural Blueprint for Content

  decay_score?: number; // 0-100
  
  // Generic metadata container
  metadata?: Record<string, any>;
}

export interface TopicViabilityResult {
    decision: 'PAGE' | 'SECTION';
    reasoning: string;
    targetParent?: string;
}

export enum ResponseCode {
  DEFINITION = 'DEFINITION',
  PROCESS = 'PROCESS',
  COMPARISON = 'COMPARISON',
  LIST = 'LIST',
  INFORMATIONAL = 'INFORMATIONAL',
  PRODUCT_SERVICE = 'PRODUCT_SERVICE',
  CAUSE_EFFECT = 'CAUSE_EFFECT',
  BENEFIT_ADVANTAGE = 'BENEFIT_ADVANTAGE',
}

export interface ContextualBridgeLink {
  targetTopic: string;
  anchorText: string;
  annotation_text_hint?: string; // Text surrounding the anchor text for relevance signaling
  reasoning: string;
}

export interface ContextualBridgeSection {
    type: 'section';
    content: string; // The transition paragraph
    links: ContextualBridgeLink[];
}

export interface BriefSection {
    heading: string;
    level: number;
    subordinate_text_hint: string; // Instructions for the first sentence
    methodology_note?: string; // Formatting instructions
}

export interface VisualSemantics {
    type: 'INFOGRAPHIC' | 'CHART' | 'PHOTO' | 'DIAGRAM';
    description: string;
    caption_data: string; // Data points or specific caption text
    height_hint?: string;
    width_hint?: string;
}

export interface FeaturedSnippetTarget {
    question: string;
    answer_target_length: number; // e.g. 40
    required_predicates: string[]; // Verbs/terms to include
    target_type: 'PARAGRAPH' | 'LIST' | 'TABLE';
}

export interface ContentBrief {
  id: string;
  topic_id: string;
  title: string;
  slug: string;
  metaDescription: string;
  keyTakeaways: string[];
  outline: string;
  serpAnalysis: {
    peopleAlsoAsk: string[];
    competitorHeadings: { title: string; url: string; headings: { level: number; text: string }[] }[];
  };
  visuals: {
    featuredImagePrompt: string;
    imageAltText: string;
  };
  contextualVectors: SemanticTriple[];
  
  // Holistic SEO - Enhanced Bridge
  // Union type: can be the old simple array or the new section object
  contextualBridge: ContextualBridgeLink[] | ContextualBridgeSection;
  
  // Contextual Structure
  perspectives?: string[]; // e.g. "Developer", "User", "Scientist"
  methodology_note?: string; // Specific formatting instructions (e.g., "Use a table")
  structured_outline?: BriefSection[]; // Detailed section breakdown
  
  structural_template_hash?: string; // For symmetry checks
  predicted_user_journey?: string; // Uncertain Inference (UI)
  
  articleDraft?: string;
  contentAudit?: ContentIntegrityResult;

  // New Holistic SEO Fields
  query_type_format?: string; // e.g., 'Ordered List', 'Prose'
  featured_snippet_target?: FeaturedSnippetTarget;
  visual_semantics?: VisualSemantics[];
  discourse_anchors?: string[]; // List of mutual words for transitions
}

export interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
}

export interface FullSerpData {
  organicResults: SerpResult[];
  peopleAlsoAsk: string[];
  relatedQueries: string[];
}

export interface ScrapedContent {
  url: string;
  title: string;
  headings: { level: number, text: string }[];
  rawText: string;
}

export interface GenerationLogEntry {
    service: string;
    message: string;
    status: 'success' | 'failure' | 'info' | 'skipped' | 'warning';
    timestamp: number;
    data?: any;
}

export interface GscRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscOpportunity {
  query: string;
  impressions: number;
  ctr: number;
  reasoning: string;
  relatedKnowledgeTerms: string[];
}

export interface ValidationIssue {
  rule: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  offendingTopics?: string[];
}

export interface HubSpokeMetric {
    hubId: string;
    hubTitle: string;
    spokeCount: number;
    status: 'OPTIMAL' | 'UNDER_SUPPORTED' | 'DILUTED';
}

export interface AnchorTextMetric {
    anchorText: string;
    count: number;
    isRepetitive: boolean;
}

export interface FreshnessMetric {
    topicId: string;
    title: string;
    freshness: FreshnessProfile;
    decayScore: number;
}

export interface ValidationResult {
  overallScore: number;
  summary: string;
  issues: ValidationIssue[];
  // Holistic SEO Metrics
  metrics?: {
      hubSpoke: HubSpokeMetric[];
      anchorText: AnchorTextMetric[];
      contentFreshness: FreshnessMetric[];
  };
}

export interface MapImprovementSuggestion {
  newTopics: { title: string, description: string, type: 'core' | 'outer' }[];
  topicTitlesToDelete: string[];
}

export interface MergeSuggestion {
  topicIds: string[];
  topicTitles: string[];
  newTopic: { title: string, description: string };
  reasoning: string;
  canonicalQuery?: string; // FIX: Added missing property
}

export interface SemanticPair {
    topicA: string;
    topicB: string;
    distance: {
        weightedScore: number;
    };
    relationship: {
        type: 'SIBLING' | 'RELATED' | 'DISTANT';
        internalLinkingPriority: 'high' | 'medium' | 'low';
    };
}

export interface SemanticAnalysisResult {
    summary: string;
    pairs: SemanticPair[];
    actionableSuggestions: string[];
}

export interface ContextualCoverageGap {
    context: string;
    reasoning: string;
    type: 'MACRO' | 'MICRO' | 'TEMPORAL' | 'INTENTIONAL';
}
export interface ContextualCoverageMetrics {
    summary: string;
    macroCoverage: number;
    microCoverage: number;
    temporalCoverage: number;
    intentionalCoverage: number;
    gaps: ContextualCoverageGap[];
}

export interface MissedLink {
    sourceTopic: string;
    targetTopic: string;
    suggestedAnchor: string;
    linkingPriority: 'high' | 'medium' | 'low';
}

export interface DilutionRisk {
    topic: string;
    issue: string;
}

export interface InternalLinkAuditResult {
    summary: string;
    missedLinks: MissedLink[];
    dilutionRisks: DilutionRisk[];
}

export interface TopicalAuthorityScore {
    overallScore: number;
    summary: string;
    breakdown: {
        contentDepth: number;
        contentBreadth: number;
        interlinking: number;
        semanticRichness: number;
    };
}

export interface PublicationPlanPhase {
    phase: number;
    name: string;
    duration_weeks: number;
    publishing_rate: string;
    content: { title: string, type: 'core' | 'outer' }[];
}

export interface PublicationPlan {
    total_duration_weeks: number;
    phases: PublicationPlanPhase[];
}

export interface AuditRuleResult {
    ruleName: string;
    isPassing: boolean;
    details: string;
    remediation?: string; // The suggested fix for the AI re-generation loop
    affectedTextSnippet?: string; // The specific sentence/paragraph failing the rule
}

export interface ContentIntegrityResult {
    overallSummary: string;
    draftText: string; // The text that was audited (needed for Auto-Fix)
    eavCheck: { isPassing: boolean, details: string };
    linkCheck: { isPassing: boolean, details: string };
    linguisticModality: { score: number, summary: string };
    frameworkRules: AuditRuleResult[];
}

export interface SchemaGenerationResult {
    schema: string;
    reasoning: string;
}

// --- Contextual Flow Audit Types (New) ---

export interface ContextualFlowIssue {
    category: 'VECTOR' | 'LINGUISTIC' | 'LINKING' | 'MACRO';
    rule: string; // e.g., "Attribute Order", "Discourse Integration"
    score: number; // 0-100, where 100 is perfect compliance
    details: string;
    offendingSnippet?: string;
    remediation: string;
}

export interface FlowAuditResult {
    overallFlowScore: number;
    vectorStraightness: number; // 0-100
    informationDensity: number; // 0-100
    issues: ContextualFlowIssue[];
    headingVector: string[]; // The extracted skeleton H1->H2->H3
    discourseGaps: number[]; // Indices of paragraphs where flow breaks
}

// -----------------------------------------

export interface Project {
    id: string;
    project_name: string;
    domain: string;
    created_at: string;
}

export interface TopicalMap {
    id: string;
    project_id: string;
    name: string;
    map_name?: string; // Alias for name (for DB compatibility)
    domain?: string;
    created_at: string;
    business_info?: Partial<BusinessInfo>;
    pillars?: SEOPillars;
    eavs?: SemanticTriple[];
    competitors?: string[];
    topics?: EnrichedTopic[];
    briefs?: Record<string, ContentBrief>;
    analysis_state?: {
        validationResult?: ValidationResult;
        semanticAnalysisResult?: SemanticAnalysisResult;
        contextualCoverageResult?: ContextualCoverageMetrics;
        internalLinkAuditResult?: InternalLinkAuditResult;
        topicalAuthorityScore?: TopicalAuthorityScore;
        publicationPlan?: PublicationPlan;
        gscOpportunities?: GscOpportunity[];
    };
}

export interface KnowledgeNode {
  id: string;
  term: string;
  type: string;
  definition: string;
  metadata: {
    importance: number;
    source: string;
    [key: string]: any;
  };
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  metadata: {
    source: string;
    [key: string]: any;
  };
}

export interface TopicRecommendation {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: 'GAP_FILLING' | 'COMPETITOR_BASED' | 'EXPANSION';
    reasoning: string;
}

export interface WordNetInterface {
  getHypernyms(concept: string): Promise<string[]>;
  getDepth(concept: string): Promise<number>;
  getMaxDepth(): Promise<number>;
  findLCS(concept1: string, concept2: string): Promise<string[]>;
  getShortestPath(concept1: string, concept2: string): Promise<number>;
}

export interface DashboardMetrics {
    briefGenerationProgress: number;
    knowledgeDomainCoverage: number;
    avgEAVsPerBrief: number;
    contextualFlowScore: number;
}

export interface ContentCalendarEntry {
    id: string;
    title: string;
    publishDate: Date;
    status: 'draft' | 'scheduled' | 'published';
}

// ============================================
// SITE ANALYSIS TYPES V2 (Site-First Architecture)
// ============================================

// Workflow status for site analysis
export type SiteAnalysisStatus =
  | 'created'
  | 'crawling'
  | 'extracting'
  | 'discovering_pillars'
  | 'awaiting_validation'
  | 'building_graph'
  | 'analyzing'
  | 'completed'
  | 'error';

// Site Analysis Project - Top-level container
export interface SiteAnalysisProject {
  id: string;
  userId: string;
  name: string;
  domain: string;
  status: SiteAnalysisStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  lastAuditAt?: string;

  // Input sources
  inputMethod: 'url' | 'sitemap' | 'gsc' | 'manual';
  sitemapUrl?: string;

  // Link to existing topical map (optional)
  linkedMapId?: string;

  // Semantic Foundation (CE/SC/CSI) - The Pillars
  centralEntity?: string;
  centralEntityType?: string;
  sourceContext?: string;
  sourceContextType?: string;
  centralSearchIntent?: string;
  pillarsValidated: boolean;
  pillarsValidatedAt?: string;
  pillarsSource?: 'inferred' | 'linked' | 'manual';

  // Pages (loaded separately for large sites)
  pages?: SitePageRecord[];
  pageCount?: number;

  // GSC data (if uploaded)
  gscData?: GscRow[];

  // Generated topical map
  generatedTopicalMapId?: string;

  // Crawl session tracking
  crawlSession?: CrawlSession;
}

// Discovered pillars from AI analysis
export interface DiscoveredPillars {
  centralEntity: {
    suggested: string;
    type: string;
    confidence: number;
    evidence: string[];
    alternatives: { value: string; confidence: number }[];
  };
  sourceContext: {
    suggested: string;
    type: string;
    confidence: number;
    evidence: string[];
    alternatives: { value: string; confidence: number }[];
  };
  centralSearchIntent: {
    suggested: string;
    confidence: number;
    evidence: string[];
    alternatives: { value: string; confidence: number }[];
  };
}

// Individual page record in site analysis
export interface SitePageRecord {
  id: string;
  projectId?: string; // Optional during construction
  url: string;
  path?: string;

  // Discovery
  discoveredVia?: 'sitemap' | 'crawl' | 'gsc' | 'manual' | 'link';
  sitemapLastmod?: string;
  sitemapPriority?: number;
  sitemapChangefreq?: string;

  // Crawl status
  crawlStatus?: 'pending' | 'crawling' | 'crawled' | 'failed' | 'skipped';
  crawlError?: string;
  error?: string; // Alias for crawlError
  crawledAt?: string;
  apifyCrawled?: boolean;
  jinaCrawled?: boolean;

  // Content basics
  contentHash?: string;
  contentChanged?: boolean;
  title?: string;
  metaDescription?: string;
  h1?: string;
  wordCount?: number;

  // Technical data (from Apify)
  statusCode?: number;
  canonicalUrl?: string;
  robotsMeta?: string;
  schemaTypes?: string[];
  schemaJson?: any[];
  ttfbMs?: number;
  loadTimeMs?: number;
  domNodes?: number;
  htmlSizeKb?: number;

  // Semantic data (from Jina)
  headings?: { level: number; text: string }[];
  links?: { href: string; text: string; isInternal: boolean; position?: string }[];
  images?: { src: string; alt: string; width?: number; height?: number }[];
  contentMarkdown?: string;

  // Raw extraction data
  jinaExtraction?: {
    title?: string;
    description?: string;
    content?: string;
    links?: any[];
    images?: any[];
    headings?: { level: number; text: string }[];
    wordCount?: number;
    schema?: any[];
  };
  gscData?: GscRow[];

  // Legacy status field (maps to crawlStatus for compatibility)
  status?: 'pending' | 'crawling' | 'crawled' | 'audited' | 'error' | 'failed';
  discoveredAt?: number;
  sitemapData?: {
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
  };
  gscMetrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };

  // GSC metrics
  gscClicks?: number;
  gscImpressions?: number;
  gscCtr?: number;
  gscPosition?: number;
  gscQueries?: GscRow[];

  // Latest audit (can load full audit separately)
  latestAuditId?: string;
  latestAuditScore?: number;
  latestAuditAt?: string;

  // Inline audit result (populated during runtime)
  auditResult?: PageAuditResult;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Crawl progress tracking (for UI)
export interface CrawlProgress {
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalUrls: number;
  crawledUrls: number;
  failedUrls: number;
  currentPhase: 'discovery' | 'apify' | 'jina' | 'complete';
  errors: string[];
  startedAt?: number;
  completedAt?: number;
}

// Crawl session tracking
export interface CrawlSession {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  totalUrls: number;
  crawledUrls: number;
  failedUrls: number;
  errors: string[];
  urlsDiscovered?: number;
  urlsCrawled?: number;
  urlsFailed?: number;
}

// ============================================
// PAGE AUDIT TYPES V2
// ============================================

// Full page audit result (stored in database)
export interface PageAudit {
  id: string;
  pageId: string;
  projectId: string;
  version: number;

  // Overall scores
  overallScore: number;
  technicalScore: number;
  semanticScore: number;
  linkStructureScore: number;
  contentQualityScore: number;
  visualSchemaScore: number;

  // Detailed phase results
  technicalChecks: AuditCheck[];
  semanticChecks: AuditCheck[];
  linkStructureChecks: AuditCheck[];
  contentQualityChecks: AuditCheck[];
  visualSchemaChecks: AuditCheck[];

  // AI Analysis (deep audit)
  aiAnalysisComplete: boolean;
  ceAlignmentScore?: number;
  ceAlignmentExplanation?: string;
  scAlignmentScore?: number;
  scAlignmentExplanation?: string;
  csiAlignmentScore?: number;
  csiAlignmentExplanation?: string;
  contentSuggestions?: string[];

  // Summary
  summary: string;
  criticalIssuesCount: number;
  highIssuesCount: number;
  mediumIssuesCount: number;
  lowIssuesCount: number;

  // Change detection
  contentHashAtAudit: string;

  // Audit type
  auditType: 'quick' | 'deep';

  createdAt: string;
}

// Legacy compatibility alias
export type PageAuditRecord = PageAudit;

// Inline audit result structure (used on SitePageRecord)
export interface PageAuditResult {
  url: string;
  timestamp: number;
  overallScore: number;
  summary: string;
  phases: {
    technical: PhaseAuditResult;
    semantic: PhaseAuditResult;
    linkStructure: PhaseAuditResult;
    contentQuality: PhaseAuditResult;
    visualSchema: PhaseAuditResult;
  };
  actionItems: PageAuditActionItem[];
  rawData?: {
    jinaExtraction?: any;
    gscData?: any;
  };
}

// Phase result for UI display
export interface PhaseAuditResult {
  phase: string;
  score: number;
  passedCount: number;
  totalCount: number;
  checks: AuditCheck[];
}

// Individual audit check
export interface AuditCheck {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score: number;
  value?: string | number;
  details: string;
  suggestion?: string;
}

// Audit task (actionable item)
export interface AuditTask {
  id: string;
  projectId?: string; // Optional for inline creation
  pageId?: string;
  auditId?: string;

  ruleId: string;
  title: string;
  description: string;
  remediation: string;

  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: 'high' | 'medium' | 'low';
  phase?: 'technical' | 'semantic' | 'linkStructure' | 'contentQuality' | 'visualSchema';

  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  completedAt?: string;
  dismissedReason?: string;
  issueGroup?: string;

  createdAt?: string;
  updatedAt?: string;
}

// Legacy alias
export type PageAuditActionItem = AuditTask;

// Audit history snapshot
export interface AuditHistoryEntry {
  id: string;
  projectId: string;
  auditDate: string;

  totalPages: number;
  pagesAudited: number;
  averageScore: number;

  avgTechnicalScore: number;
  avgSemanticScore: number;
  avgLinkStructureScore: number;
  avgContentQualityScore: number;
  avgVisualSchemaScore: number;

  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;

  pagesChanged: number;
  topIssues: { ruleId: string; ruleName: string; count: number }[];
}

// Raw extracted data types
export interface JinaExtraction {
  title: string;
  description: string;
  content: string;
  headings: { level: number; text: string }[];
  links: { href: string; text: string; isInternal: boolean; position?: string }[];
  images: { src: string; alt: string }[];
  schema: any[];
  wordCount: number;
  readingTime: number;
}

export interface ApifyPageData {
  url: string;
  statusCode: number;

  // Meta
  title: string;
  metaDescription: string;
  canonical: string;
  robotsMeta: string;

  // Schema
  schemaMarkup: any[];
  schemaTypes: string[];

  // Performance
  ttfbMs: number;
  loadTimeMs: number;
  htmlSizeKb: number;
  domNodes: number;

  // Full HTML for custom parsing
  html: string;

  // Links
  internalLinks: { href: string; text: string; rel?: string; position?: string }[];
  externalLinks: { href: string; text: string; rel?: string }[];

  // Images
  images: { src: string; alt: string; width?: number; height?: number }[];
}

// Legacy alias
export type ApifyTechnicalData = ApifyPageData;

// Combined extraction result
export interface PageExtraction {
  url: string;
  apify?: ApifyPageData;
  jina?: JinaExtraction;
  contentHash: string;
  extractedAt: string;
}

// Unified extraction result from pageExtractionService
export interface ExtractedPageData {
  url: string;
  technical: ApifyPageData | null;
  semantic: JinaExtraction | null;
  contentHash: string;
  extractedAt: number;
  errors?: string[];
}
