
// types.ts

// FIX: Corrected import path for database types to be a relative path, fixing module resolution error.
import { Json } from './database.types';
// FIX: Export KnowledgeGraph to be available for other modules.
export { KnowledgeGraph } from './lib/knowledgeGraph';

// Content Generation V2 Types - Priority-based generation with user control
export * from './types/contentGeneration';

export enum AppStep {
  AUTH,
  PROJECT_SELECTION,
  ANALYSIS_STATUS,
  PROJECT_WORKSPACE,
  BUSINESS_INFO,
  PILLAR_WIZARD,
  EAV_WIZARD,
  COMPETITOR_WIZARD,
  BLUEPRINT_WIZARD, // Website Blueprint (foundation pages & navigation preferences)
  PROJECT_DASHBOARD,
  SITE_ANALYSIS,
  ADMIN // New Admin Step
}

export type WebsiteType = 'ECOMMERCE' | 'SAAS' | 'SERVICE' | 'INFORMATIONAL';

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
  websiteType?: WebsiteType; // NEW: Determines the AI strategy (E-com, SaaS, etc.)
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

  // Business conversion fields
  conversionGoal?: string; // Primary conversion goal (e.g., "sign up", "purchase", "contact")

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

// REVISED: Research-based Attribute Classification
export type AttributeCategory = 'CORE_DEFINITION' | 'SEARCH_DEMAND' | 'COMPETITIVE_EXPANSION' | 'COMPOSITE' | 'UNIQUE' | 'ROOT' | 'RARE' | 'COMMON'; // Including legacy types for compatibility
export type AttributeClass = 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS' | 'SPECIFICATION';

export interface AttributeMetadata {
    validation?: {
        type: 'CURRENCY' | 'NUMBER' | 'STRING' | 'BOOLEAN';
        min?: number;
        max?: number;
        options?: string[];
    };
    presentation?: {
        prominence: 'CENTERPIECE' | 'STANDARD' | 'SUPPLEMENTARY';
    };
    dependency?: {
        dependsOn: string;
        rule: string;
    };
    computation?: {
        originalUnit: string;
        displayUnit: string;
        conversion: string;
    };
}

export interface SemanticTriple {
  subject: {
      label: string;
      type: string;
  };
  predicate: {
      relation: string;
      type: string;
      category?: AttributeCategory; // NEW: Research-based classification
      classification?: AttributeClass;
  };
  object: {
      value: string | number;
      type: string;
      unit?: string;
      truth_range?: string;
  };
  metadata?: AttributeMetadata; // NEW: Deep metadata for EAV
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
    key?: string; // Section identifier (e.g., 'section-0', 'section-1')
    heading: string;
    level: number;
    order?: number; // Position in article
    subordinate_text_hint?: string; // Instructions for the first sentence
    methodology_note?: string; // Formatting instructions
    subsections?: BriefSection[]; // Nested subsections (H3s under H2s)
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
  targetKeyword?: string; // Primary keyword for this content
  searchIntent?: string; // Search intent (informational, navigational, transactional, commercial)
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

  // Business fields
  cta?: string; // Call to action for business conversion
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

export interface TypeMisclassification {
  topicTitle: string;
  currentType: 'core' | 'outer';
  shouldBe: 'core' | 'outer';
  reason: string;
  suggestedParent?: string;
}

export interface TopicClassificationResult {
  id: string;
  topic_class: 'monetization' | 'informational';
  suggestedType?: 'core' | 'outer' | null;
  suggestedParentTitle?: string | null;
  typeChangeReason?: string | null;
}

export interface ValidationResult {
  overallScore: number;
  summary: string;
  issues: ValidationIssue[];
  typeMisclassifications?: TypeMisclassification[];
  // Holistic SEO Metrics
  metrics?: {
      hubSpoke: HubSpokeMetric[];
      anchorText: AnchorTextMetric[];
      contentFreshness: FreshnessMetric[];
  };
  // Foundation Pages Validation
  foundationPageIssues?: {
      missingPages: FoundationPageType[];
      incompletePages: { pageType: FoundationPageType; missingFields: string[] }[];
      suggestions: string[];
  };
  // Navigation Validation
  navigationIssues?: {
      headerLinkCount: number;
      headerLinkLimit: number;
      footerLinkCount: number;
      footerLinkLimit: number;
      missingInHeader: string[];
      missingInFooter: string[];
      suggestions: string[];
  };
}

export interface MapImprovementSuggestion {
  newTopics: {
    title: string;
    description: string;
    type: 'core' | 'outer';
    topic_class?: 'monetization' | 'informational';
    parentTopicTitle?: string | null;
    reasoning?: string;
  }[];
  topicTitlesToDelete: string[];
  topicMerges?: {
    sourceTitle: string;
    targetTitle: string;
    reasoning: string;
  }[];
  hubSpokeGapFills?: {
    hubTitle: string;
    newSpokes: {
      title: string;
      description: string;
      topic_class?: 'monetization' | 'informational';
    }[];
  }[];
  typeReclassifications?: {
    topicTitle: string;
    newType: 'core' | 'outer';
    newParentTitle?: string;
    reasoning: string;
  }[];
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
        weightedScore: number; // 0 = Identity, 1 = Unrelated
        // Granular components
        cosine_similarity?: number; // 0-1
        context_weight?: number; // 0-1
        co_occurrence_score?: number; // 0-1
        connection_length?: number; // Hops
    };
    relationship: {
        type: 'SIBLING' | 'RELATED' | 'DISTANT';
        internalLinkingPriority: 'high' | 'medium' | 'low';
        bridge_topic_suggestion?: string; // If distance is high, suggest a bridge
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

// NEW: Triple Analysis Types
export interface TripleAuditResult {
    tripleDensityScore: number; // 0-100
    missingTriples: string[]; // List of required EAVs missing from text
    sentenceStructureIssues: string[]; // "Subject-Predicate-Object too far apart"
    consistencyIssues: string[]; // "Contradicts Knowledge Graph"
}

export interface ContentIntegrityResult {
    overallSummary: string;
    draftText: string; // The text that was audited (needed for Auto-Fix)
    eavCheck: { isPassing: boolean, details: string };
    linkCheck: { isPassing: boolean, details: string };
    linguisticModality: { score: number, summary: string };
    frameworkRules: AuditRuleResult[];
    // NEW: Semantic Triple Analysis
    tripleAnalysis?: TripleAuditResult;
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
  firecrawlCrawled?: boolean; // True if Firecrawl was used as fallback for Apify

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

// AI Suggestion for human-in-the-loop workflow
export interface AISuggestion {
  id: string;
  taskId: string;
  projectId: string;
  pageId?: string;
  originalValue: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
  modelUsed: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  userModifiedValue?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

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
  primaryProvider?: ScrapingProvider; // Which provider was used (first successful)
  fallbackUsed?: boolean; // True if primary failed and fallback succeeded
}

// ============================================
// SCRAPING PROVIDER TYPES
// ============================================

export type ExtractionType =
  | 'semantic_only'   // Content, headings, word count - Jina primary
  | 'technical_only'  // Schema, links, status, performance - Apify primary
  | 'full_audit'      // Both technical + semantic in parallel
  | 'auto';           // Smart selection based on available keys (default)

export type ScrapingProvider = 'jina' | 'firecrawl' | 'apify';

export interface ProviderResult {
  provider: ScrapingProvider;
  success: boolean;
  error?: string;
  duration?: number;
}

// ============================================
// PHASE 3: REPORT GENERATION TYPES
// ============================================

export type ReportScope = 'page' | 'site';
export type ReportAudience = 'business' | 'technical';
export type HealthStatus = 'excellent' | 'good' | 'needs-work' | 'critical';
export type EffortLevel = 'Quick Fix' | 'Moderate' | 'Complex';

export interface SEOAuditReport {
  id: string;
  projectId: string;
  pageId?: string;
  scope: ReportScope;
  generatedAt: string;

  executiveSummary: {
    overallScore: number;
    healthStatus: HealthStatus;
    keyFindings: string[];
    pagesAnalyzed: number;
    issuesCritical: number;
    issuesHigh: number;
    issuesMedium: number;
    issuesLow: number;
  };

  phaseScores: {
    technical: { score: number; passed: number; total: number };
    semantic: { score: number; passed: number; total: number };
    linkStructure: { score: number; passed: number; total: number };
    contentQuality: { score: number; passed: number; total: number };
    visualSchema: { score: number; passed: number; total: number };
  };

  pillarContext?: {
    centralEntity: string;
    centralEntityExplanation: string;
    sourceContext: string;
    sourceContextExplanation: string;
    centralSearchIntent: string;
  };

  issues: ReportIssue[];

  progress: {
    totalTasks: number;
    completed: number;
    pending: number;
    dismissed: number;
  };

  pages?: PageReportSummary[];
}

export interface ReportIssue {
  id: string;
  ruleId: string;
  phase: string;
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Business view fields
  headline: string;
  whyItMatters: string;
  businessImpact: string;
  suggestedAction: string;
  effortLevel: EffortLevel;

  // Technical view fields
  technicalDetails: {
    ruleName: string;
    actualValue?: string | number;
    expectedValue?: string | number;
    remediation: string;
    aiSuggestion?: string;
  };

  affectedPages: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

export interface PageReportSummary {
  url: string;
  title: string;
  overallScore: number;
  issueCount: number;
  topIssue?: string;
}

export interface BusinessLanguageTranslation {
  headline: string;
  whyItMatters: string;
  businessImpact: string;
  effortLevel: EffortLevel;
}

export interface PhaseBusinessName {
  name: string;
  explanation: string;
}

// ============================================
// MIGRATION WORKBENCH TYPES
// ============================================

export type TransitionStatus = 'AUDIT_PENDING' | 'GAP_ANALYSIS' | 'ACTION_REQUIRED' | 'IN_PROGRESS' | 'OPTIMIZED';
export type ActionType = 'KEEP' | 'REWRITE' | 'MERGE' | 'REDIRECT_301' | 'PRUNE_410' | 'CANONICALIZE';
export type SectionType = 'CORE_SECTION' | 'AUTHOR_SECTION' | 'ORPHAN';

export interface SiteInventoryItem {
    id: string;
    project_id: string;
    url: string;
    title: string;
    http_status: number;
    content_hash?: string;

    // Metrics
    word_count?: number;
    link_count?: number;
    dom_size?: number; // KB
    ttfb_ms?: number;
    cor_score?: number; // 0-100 (High = Bad)

    // GSC Metrics
    gsc_clicks?: number;
    gsc_impressions?: number;
    gsc_position?: number;
    index_status?: string;
    striking_distance_keywords?: string[]; // Array of strings

    // Strategy & Mapping
    mapped_topic_id: string | null;
    section?: SectionType;
    status: TransitionStatus;
    action?: ActionType;

    created_at: string;
    updated_at: string;
}

export interface TransitionSnapshot {
    id: string;
    inventory_id: string;
    created_at: string;
    content_markdown: string;
    snapshot_type: 'ORIGINAL_IMPORT' | 'PRE_OPTIMIZATION' | 'POST_OPTIMIZATION';
}

// --- Smart Migration Types (Harvesting) ---

export interface ContentChunk {
    id: string;
    content: string;
    heading?: string;
    summary: string;
    semantic_embedding?: number[]; // For future vector search
    suggested_topic_id?: string;
    quality_score: number; // 0-100
    tags: string[];
}

export interface MigrationDecision {
    sourceUrl: string;
    targetTopicId: string;
    recommendation: 'REDIRECT_301' | 'MERGE' | 'PRUNE' | 'KEEP' | 'REWRITE';
    confidence: number;
    pros: string[];
    cons: string[];
    reasoning: string;
}

// ============================================
// FOUNDATION PAGES & NAVIGATION TYPES
// ============================================

// Foundation page types
export type FoundationPageType =
  | 'homepage'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'author';

// Foundation page section specification
export interface FoundationPageSection {
  heading: string;
  purpose?: string;
  required?: boolean;
  content_type?: 'text' | 'team_grid' | 'faq' | 'contact_form' | 'map' | 'list';
  order?: number;
}

// Office location for multi-location support
export interface OfficeLocation {
  id: string;
  name: string;                    // e.g., "Headquarters", "Amsterdam Office"
  is_headquarters: boolean;
  address: string;
  city?: string;
  country?: string;                // ISO code: "NL", "US", "DE"
  phone: string;
  email?: string;
}

// NAP (Name, Address, Phone) data for E-A-T
export interface NAPData {
  company_name: string;
  // Primary location fields (backward compatible)
  address: string;
  phone: string;
  email: string;
  founded_year?: string;
  // Multi-location support
  locations?: OfficeLocation[];
}

// Foundation page specification
export interface FoundationPage {
  id: string;
  map_id: string;
  user_id?: string;
  page_type: FoundationPageType;
  title: string;
  slug: string;
  meta_description?: string;
  h1_template?: string;
  schema_type?: 'Organization' | 'AboutPage' | 'ContactPage' | 'WebPage';

  // Content structure hints
  sections?: FoundationPageSection[];

  // E-A-T fields (for about/contact)
  nap_data?: NAPData;

  // Soft delete support
  deleted_at?: string | null;
  deletion_reason?: 'user_deleted' | 'not_needed';

  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Navigation link definition
export interface NavigationLink {
  id?: string;
  text: string;
  target_topic_id?: string;
  target_foundation_page_id?: string;
  external_url?: string;
  prominence: 'high' | 'medium' | 'low';
  order?: number;
}

// Footer section with heading
export interface FooterSection {
  id?: string;
  heading: string;  // Will use H4/H5
  links: NavigationLink[];
}

// Navigation structure
export interface NavigationStructure {
  id: string;
  map_id: string;

  // Header configuration
  header: {
    logo_alt_text: string;
    primary_nav: NavigationLink[];
    cta_button?: {
      text: string;
      target_topic_id?: string;
      target_foundation_page_id?: string;
      url?: string;
    };
  };

  // Footer configuration
  footer: {
    sections: FooterSection[];
    legal_links: NavigationLink[];  // Privacy, Terms
    nap_display: boolean;
    copyright_text: string;
  };

  // Boilerplate rules
  max_header_links: number;  // Default: 10
  max_footer_links: number;  // Default: 30
  dynamic_by_section: boolean;  // Change nav based on topic_class

  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Navigation sync status - tracks changes between topical map and navigation
export interface NavigationSyncStatus {
  map_id: string;
  lastSyncedAt: string;
  topicsModifiedSince: number;  // Count of changes since last sync
  requiresReview: boolean;
  pendingChanges: {
    addedTopics: string[];
    deletedTopics: string[];
    renamedTopics: { id: string; oldTitle: string; newTitle: string }[];
  };
}

// Foundation page generation result
export interface FoundationPageGenerationResult {
  foundationPages: Omit<FoundationPage, 'id' | 'map_id' | 'user_id' | 'created_at'>[];
  napSuggestion: NAPData;
}

// Non-blocking notification for foundation pages
export interface FoundationNotification {
  id: string;
  type: 'info' | 'warning';  // Never 'error' for missing pages
  message: string;
  dismissable: boolean;
  showOnce: boolean;
  dismissed?: boolean;
  dismissedAt?: string;
  action?: {
    label: string;
    actionType: 'add_page' | 'configure_nav' | 'run_audit';
    targetPageType?: FoundationPageType;
  };
}

// Computed sitemap view (not stored, generated from topics + foundation pages)
export interface SitemapView {
  foundationPages: FoundationPage[];
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  totalUrls: number;
  hierarchicalView: SitemapNode[];
}

export interface SitemapNode {
  id: string;
  type: 'foundation' | 'core' | 'outer';
  title: string;
  slug: string;
  children?: SitemapNode[];
}

// ============================================
// INTERNAL LINKING SYSTEM TYPES
// ============================================

// Internal linking rules configuration
export interface InternalLinkingRules {
  maxLinksPerPage: number;  // 150
  maxAnchorTextRepetition: number;  // 3
  prioritizeMainContentLinks: boolean;
  useDescriptiveAnchorText: boolean;
  avoidGenericAnchors: string[];  // ['click here', 'read more', 'learn more']
  contextualBridgeRequired: boolean;
  delayLowRelevanceLinks: boolean;
  hubSpokeFlowDirection: 'bidirectional' | 'hub_to_spoke' | 'spoke_to_hub';
  linkToQualityNodesFirst: boolean;
  qualityNodeThreshold: number;  // Score threshold (0-100)
}

// Linking audit pass identifiers
export enum LinkingAuditPass {
  FUNDAMENTALS = 'fundamentals',
  NAVIGATION = 'navigation',
  FLOW_DIRECTION = 'flow_direction',
  EXTERNAL = 'external',
  SYMMETRY = 'symmetry'
}

// Linking issue type - comprehensive list from research
export type LinkingIssueType =
  // Pass 1: Fundamentals (PageRank & Anchor Text)
  | 'page_link_limit_exceeded'       // >150 links per page
  | 'anchor_repetition_per_target'   // Same anchor >3 times for same target
  | 'anchor_repetition'              // Legacy: global anchor repetition
  | 'generic_anchor'                 // "click here", "read more", etc.
  | 'link_in_first_sentence'         // Link before entity is defined
  | 'missing_annotation_text'        // No context around anchor
  // Pass 2: Navigation (Boilerplate)
  | 'header_link_overflow'           // Too many header links
  | 'footer_link_overflow'           // Too many footer links
  | 'duplicate_nav_anchor'           // Same anchor in header AND footer
  | 'missing_eat_link'               // About/Contact/Privacy not in footer
  | 'static_navigation'              // Non-dynamic nav warning
  // Pass 3: Flow Direction (Core ← Author)
  | 'wrong_flow_direction'           // Core linking TO Author (should be reverse)
  | 'premature_core_link'            // Core link not in Supplementary Content
  | 'missing_contextual_bridge'      // No bridge for discordant topics
  | 'unclosed_loop'                  // No path back to Central Entity
  | 'orphaned_topic'                 // No incoming links
  // Pass 4: External E-A-T
  | 'unvalidated_external'           // External link without E-A-T purpose
  | 'competitor_link'                // Linking to competitor domain
  | 'missing_eat_reference'          // No authoritative external refs
  | 'reference_not_integrated'       // References in bibliography, not text
  // Legacy types
  | 'missing_hub_link'
  | 'missing_spoke_link'
  | 'link_limit_exceeded'
  | 'missing_quality_node_link';

// Linking issue detected during audit
export interface LinkingIssue {
  id: string;
  type: LinkingIssueType;
  severity: 'critical' | 'warning' | 'suggestion';
  sourceTopic?: string;
  targetTopic?: string;
  anchorText?: string;
  currentCount?: number;
  limit?: number;
  message: string;
  autoFixable: boolean;
  suggestedFix?: string;
  // Enhanced fields for multi-pass audit
  pass?: LinkingAuditPass;
  sources?: string[];       // Topics using this anchor
  externalUrl?: string;     // For external link issues
  position?: 'intro' | 'first_paragraph' | 'main_content' | 'supplementary';
}

// Result of a single linking pass
export interface LinkingPassResult {
  pass: string;
  status: 'passed' | 'issues_found' | 'failed';
  issues: LinkingIssue[];
  autoFixable: boolean;
  summary: string;
}

// Full linking audit result
export interface LinkingAuditResult {
  id?: string;
  map_id: string;
  passResults: LinkingPassResult[];
  overallScore: number;
  summary: {
    totalLinks: number;
    averageLinksPerPage: number;
    orphanedTopics: string[];
    overLinkedTopics: string[];
    repetitiveAnchors: { text: string; count: number }[];
  };
  autoFixableCount?: number;
  created_at?: string;
}

// Input context for linking audit passes
export interface LinkingAuditContext {
  mapId: string;
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  foundationPages: FoundationPage[];
  navigation: NavigationStructure | null;
  pillars: SEOPillars;
  rules: InternalLinkingRules;
  domain?: string;           // For competitor link detection
  competitors?: string[];    // Competitor domains from topical map
}

// Auto-fix definition for linking issues
export interface LinkingAutoFix {
  issueId: string;
  fixType: 'add_link' | 'remove_link' | 'update_anchor' | 'add_bridge' | 'reposition_link' | 'add_nav_link';
  targetTable: 'content_briefs' | 'topics' | 'navigation_structures' | 'foundation_pages';
  targetId: string;
  field: string;
  oldValue: any;
  newValue: any;
  confidence: number;        // 0-100, higher = more confident in fix
  requiresAI: boolean;       // True if fix needs AI generation
  description?: string;      // Human-readable description of fix
}

// Fix history entry for undo capability
export interface LinkingFixHistoryEntry {
  id: string;
  auditId: string;
  issueId: string;
  fixType: string;
  changes: {
    table: string;
    recordId: string;
    field: string;
    oldValue: any;
    newValue: any;
  };
  appliedAt: string;
  undoneAt?: string;
  canUndo: boolean;
}

// Per-target anchor text analysis result
export interface AnchorTextByTargetMetric {
  targetTopic: string;
  targetTopicId?: string;
  anchorsUsed: {
    text: string;
    count: number;
    sourceTopics: string[];
  }[];
  hasRepetition: boolean;
  maxRepetition: number;
}

// External link analysis for E-A-T
export interface ExternalLinkAnalysis {
  url: string;
  domain: string;
  anchorText: string;
  sourceTopic: string;
  purpose?: 'authority' | 'reference' | 'citation' | 'social' | 'unknown';
  isCompetitor: boolean;
  isIntegratedInText: boolean;
  eatScore?: number;  // 0-100
}

// ============================================
// Phase D: Site-Wide Architecture Types
// ============================================

// Feature 3: Link Count Audit
export interface PageLinkAudit {
  pageId: string;
  pageTitle: string;
  pageType: 'topic' | 'foundation' | 'pillar';
  linkCounts: {
    navigation: number;      // Header + footer nav links
    content: number;         // Links from contextualBridge
    hierarchical: number;    // Parent/child links
    total: number;
  };
  isOverLimit: boolean;      // Total > 150
  dilutionRisk: 'none' | 'low' | 'medium' | 'high';
  topTargets: { target: string; count: number }[]; // Most linked-to pages
  recommendations: string[];
}

export interface SiteLinkAuditResult {
  pages: PageLinkAudit[];
  averageLinkCount: number;
  medianLinkCount: number;
  pagesOverLimit: number;
  totalLinks: number;
  linkDistribution: {
    range: string;           // e.g., "0-50", "51-100"
    count: number;
  }[];
  overallScore: number;      // 0-100
}

// Feature 4: PageRank Flow Analysis
export interface LinkGraphNode {
  id: string;
  title: string;
  topicClass: 'monetization' | 'informational' | 'navigational' | 'foundation';
  clusterRole: 'pillar' | 'cluster_content' | 'standalone';
  incomingLinks: number;
  outgoingLinks: number;
  pageRankScore?: number;    // Simplified PageRank estimate
}

export interface LinkGraphEdge {
  source: string;            // Source page ID
  target: string;            // Target page ID
  anchor: string;
  linkType: 'contextual' | 'hierarchical' | 'navigation';
}

export interface FlowViolation {
  type: 'reverse_flow' | 'orphaned' | 'no_cluster_support' | 'link_hoarding' | 'excessive_outbound';
  sourcePage: string;
  sourceTitle: string;
  targetPage?: string;
  targetTitle?: string;
  severity: 'warning' | 'critical';
  recommendation: string;
}

export interface LinkFlowAnalysis {
  graph: {
    nodes: LinkGraphNode[];
    edges: LinkGraphEdge[];
  };
  flowViolations: FlowViolation[];
  flowScore: number;                    // 0-100
  centralEntityReachability: number;    // % of pages that can reach CE
  coreToAuthorRatio: number;            // Links Core→Author vs Author→Core
  orphanedPages: string[];
  hubPages: string[];                   // Pages with most incoming links
}

// Feature 1: N-Gram Consistency
export interface NGramPresence {
  term: string;
  inHeader: boolean;
  inFooter: boolean;
  inHomepage: boolean;
  inPillarPages: string[];              // Pillar titles where present
  missingFrom: string[];                // Locations where missing
}

export interface BoilerplateInconsistency {
  field: string;                        // e.g., "meta_description_template"
  variations: string[];
  occurrences: number;
  recommendation: string;
}

export interface SiteWideNGramAudit {
  centralEntityPresence: NGramPresence;
  sourceContextPresence: NGramPresence;
  pillarTermPresence: { pillar: string; presence: NGramPresence }[];
  inconsistentBoilerplate: BoilerplateInconsistency[];
  overallConsistencyScore: number;      // 0-100
}

// Feature 2: Dynamic Navigation Rules
export type NavigationSegment = 'core_section' | 'author_section' | 'pillar' | 'cluster' | 'foundation';

export interface DynamicNavigationRule {
  segment: NavigationSegment;
  headerLinks: {
    include: string[];                  // Topic IDs or foundation page types
    exclude: string[];
    maxLinks: number;
    prioritizeBy: 'relevance' | 'recency' | 'authority';
  };
  footerLinks: {
    include: string[];
    exclude: string[];
    prioritizeByProximity: boolean;     // Show topically related pages
  };
  sidebarLinks?: {
    showClusterSiblings: boolean;
    showParentPillar: boolean;
    maxLinks: number;
  };
}

export interface DynamicNavigationConfig {
  enabled: boolean;
  rules: DynamicNavigationRule[];
  defaultSegment?: NavigationSegment;
  fallbackToStatic: boolean;
}

// Combined Site-Wide Audit Result
export interface SiteWideAuditResult {
  linkAudit: SiteLinkAuditResult;
  flowAnalysis: LinkFlowAnalysis;
  ngramAudit: SiteWideNGramAudit;
  dynamicNavConfig?: DynamicNavigationConfig;
  overallScore: number;
  timestamp: string;
}

// ============================================
// UNIFIED AUDIT SYSTEM TYPES
// ============================================

// Audit rule severity
export type AuditSeverity = 'critical' | 'warning' | 'suggestion';

// Audit rule definition
export interface AuditRule {
  id: string;
  name: string;
  severity: AuditSeverity;
  category: string;
  description?: string;
}

// Audit category with rules and weight
export interface AuditCategory {
  id: string;
  name: string;
  rules: AuditRule[];
  weight: number;  // Importance in overall score (0-100, all categories sum to 100)
}

// Individual audit issue found
export interface UnifiedAuditIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  category: string;
  severity: AuditSeverity;
  message: string;
  details?: string;
  affectedItems?: string[];  // Topic titles, page URLs, etc.
  autoFixable: boolean;
  fixType?: 'auto' | 'ai-assisted' | 'manual';
  suggestedFix?: string;
}

// Category result in unified audit
export interface AuditCategoryResult {
  categoryId: string;
  categoryName: string;
  score: number;
  weight: number;
  issueCount: number;
  autoFixableCount: number;
  issues: UnifiedAuditIssue[];
}

// Full unified audit result
export interface UnifiedAuditResult {
  id: string;
  map_id: string;
  overallScore: number;
  categories: AuditCategoryResult[];
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  suggestionCount: number;
  autoFixableCount: number;
  runAt: string;
  runBy?: string;
}

// Audit fix definition
export interface AuditFix {
  id: string;
  issueId: string;
  fixType: 'auto' | 'ai-assisted' | 'manual';
  description: string;
  changes?: {
    table: string;
    id: string;
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  aiPrompt?: string;
  canUndo: boolean;
  status: 'pending' | 'applied' | 'undone' | 'failed';
}

// Audit fix history entry (for undo support)
export interface AuditFixHistoryEntry {
  id: string;
  map_id: string;
  audit_run_id: string;
  category: string;
  issue_id: string;
  fix_description: string;
  changes: {
    table: string;
    id: string;
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  applied_at: string;
  applied_by?: string;
  undone_at?: string;
  can_undo: boolean;
}

// ============================================
// EXTENDED VALIDATION RESULT (for foundation pages)
// ============================================

// Extend ValidationResult with foundation page issues
export interface FoundationPageIssues {
  missingPages: FoundationPageType[];
  incompletePages: { type: FoundationPageType; missing: string[] }[];
  napIssues?: string[];
}

export interface NavigationIssues {
  headerLinkCount: number;
  footerLinkCount: number;
  warnings: string[];
}

// --- Telemetry Types ---
export interface TelemetryLog {
    id: string;
    timestamp: number;
    provider: string;
    model: string;
    operation: string;
    tokens_in: number;
    tokens_out: number;
    cost_est: number;
}

// === Multi-Pass Content Generation Types ===

export type JobStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type PassStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PassesStatus {
  pass_1_draft: PassStatus;
  pass_2_headers: PassStatus;
  pass_3_lists: PassStatus;
  pass_4_visuals: PassStatus;
  pass_5_microsemantics: PassStatus;
  pass_6_discourse: PassStatus;
  pass_7_intro: PassStatus;
  pass_8_audit: PassStatus;
}

export interface ContentGenerationJob {
  id: string;
  brief_id: string;
  user_id: string;
  map_id: string;
  status: JobStatus;
  current_pass: number;
  passes_status: PassesStatus;
  total_sections: number | null;
  completed_sections: number;
  current_section_key: string | null;
  draft_content: string | null;
  final_audit_score: number | null;
  audit_details: AuditDetails | null;
  last_error: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AuditDetails {
  algorithmicResults: AuditRuleResult[];
  aiAuditResult?: {
    semanticScore: number;
    suggestions: string[];
  };
  passingRules: number;
  totalRules: number;
  timestamp: string;
}

export interface ContentGenerationSection {
  id: string;
  job_id: string;
  section_key: string;
  section_heading: string | null;
  section_order: number;
  section_level: number;
  pass_1_content: string | null;
  pass_2_content: string | null;
  pass_3_content: string | null;
  pass_4_content: string | null;
  pass_5_content: string | null;
  pass_6_content: string | null;
  pass_7_content: string | null;
  pass_8_content: string | null;
  current_content: string | null;
  current_pass: number;
  audit_scores: Record<string, number>;
  status: SectionStatus;
  created_at: string;
  updated_at: string;
}

export interface SectionDefinition {
  key: string;
  heading: string;
  level: number;
  order: number;
  subordinateTextHint?: string;
  methodologyNote?: string;
}

export const PASS_NAMES: Record<number, string> = {
  1: 'Draft Generation',
  2: 'Header Optimization',
  3: 'Lists & Tables',
  4: 'Visual Semantics',
  5: 'Micro Semantics',
  6: 'Discourse Integration',
  7: 'Introduction Synthesis',
  8: 'Final Audit'
};

// =============================================================================
// SEMANTIC ANALYSIS TYPES (Macro/Micro Framework)
// =============================================================================

export interface CoreEntities {
  centralEntity: string;
  searchIntent: string;
  detectedSourceContext: string;
}

export interface MacroAnalysis {
  contextualVector: string;  // H1-H6 flow and linearity analysis
  hierarchy: string;         // Heading depth and order analysis
  sourceContext: string;     // Brand alignment and tone analysis
}

export interface MicroAnalysis {
  sentenceStructure: string;    // Modality, verbs, subject positioning
  informationDensity: string;   // Fluff words and fact density
  htmlSemantics: string;        // Lists, tables, alt tags
}

export type SemanticActionCategory = 'Low Hanging Fruit' | 'Mid Term' | 'Long Term';
export type SemanticActionType = 'Micro-Semantics' | 'Macro-Semantics';
export type SemanticActionImpact = 'High' | 'Medium' | 'Low';

export interface SemanticActionItem {
  id: string;
  title: string;
  description: string;
  category: SemanticActionCategory;
  impact: SemanticActionImpact;
  type: SemanticActionType;
  ruleReference?: string;
  smartFix?: string;  // AI-generated fix suggestion
}

export interface SemanticAuditResult {
  overallScore: number;
  summary: string;
  coreEntities: CoreEntities;
  macroAnalysis: MacroAnalysis;
  microAnalysis: MicroAnalysis;
  actions: SemanticActionItem[];
  analyzedAt: string;
}
