/**
 * Competitive Intelligence Types Module
 *
 * Contains types for the Topic-Level Competitive Intelligence system:
 * - Content Layer Analysis (EAV classification, Central Entity consistency)
 * - Technical Layer Analysis (Schema, Navigation)
 * - Link Layer Analysis (PageRank flow, Anchor quality, Bridge justification)
 * - Gap Analysis (Attribute gaps, Technical gaps, Link gaps)
 *
 * Created: December 25, 2024
 *
 * @module types/competitiveIntelligence
 */

import { SemanticTriple } from './semantic';

// =============================================================================
// ATTRIBUTE RARITY CLASSIFICATION
// =============================================================================

/**
 * Attribute rarity based on competitor frequency
 * - root: 70%+ competitors (definitional, expected)
 * - rare: 20-69% competitors (authority signal)
 * - unique: <20% competitors (differentiation)
 */
export type AttributeRarity = 'root' | 'rare' | 'unique' | 'unknown';

/**
 * Rarity source tracking
 */
export interface RaritySource {
  method: 'competitor_frequency' | 'wikidata_check' | 'ai_inference';
  competitorCoverage?: number;  // % of top 10 that have this attribute
  confidence: number;           // 0-1
}

/**
 * Extended SemanticTriple with rarity classification
 */
export interface ClassifiedSemanticTriple extends SemanticTriple {
  attributeRarity?: AttributeRarity;
  raritySource?: RaritySource;
}

// =============================================================================
// ATTRIBUTE DISTRIBUTION
// =============================================================================

/**
 * Attribute distribution summary for a page/content
 */
export interface AttributeDistribution {
  root: number;      // Count of root attributes covered
  rare: number;      // Count of rare attributes covered
  unique: number;    // Count of unique attributes covered
  total: number;

  // Comparison to competitors
  rootCoverage: number;    // % of market root attributes covered
  rareCoverage: number;    // % of market rare attributes covered
  uniqueAdvantage: string[]; // Unique attributes only this competitor has
}

/**
 * Attribute gap analysis
 */
export interface AttributeGapAnalysis {
  missingRoot: {
    attribute: string;
    competitorsCovering: number;
    priority: 'critical';
    example: string;
  }[];

  missingRare: {
    attribute: string;
    competitorsCovering: number;
    priority: 'high';
    example: string;
  }[];

  uniqueOpportunities: {
    attribute: string;
    noCompetitorHas: boolean;
    potentialValue: string;
    priority: 'medium';
  }[];
}

// =============================================================================
// CENTRAL ENTITY ANALYSIS
// =============================================================================

/**
 * Detection source for central entity
 */
export type EntityDetectionSource = 'h1' | 'title' | 'schema' | 'frequency';

/**
 * Detected central entity
 */
export interface DetectedEntity {
  name: string;
  confidence: number;
  sources: EntityDetectionSource[];
}

/**
 * Heading presence analysis
 */
export interface HeadingPresence {
  h2Count: number;
  h2WithEntity: number;
  h3Count: number;
  h3WithEntity: number;
  ratio: number;
}

/**
 * Body distribution analysis
 */
export interface BodyPresence {
  totalParagraphs: number;
  paragraphsWithEntity: number;
  ratio: number;
  presentInFirstThird: boolean;
  presentInMiddleThird: boolean;
  presentInLastThird: boolean;
  distributionScore: number;
}

/**
 * N-gram analysis for entity mentions
 */
export interface EntityNGrams {
  exactMatch: number;
  partialMatch: number;
  synonymMatch: number;
}

/**
 * Contextual drift point
 */
export interface ContextualDriftPoint {
  position: number;
  driftedTo: string;
  severity: 'minor' | 'major';
}

/**
 * Contextual vector analysis
 */
export interface ContextualVector {
  isConsistent: boolean;
  driftPoints: ContextualDriftPoint[];
  vectorScore: number;
}

/**
 * Central entity consistency analysis
 */
export interface CentralEntityAnalysis {
  detectedEntity: DetectedEntity;

  consistency: {
    inH1: boolean;
    inTitle: boolean;
    inIntroduction: boolean;
    inSchema: boolean;
    headingPresence: HeadingPresence;
    bodyPresence: BodyPresence;
    entityNGrams: EntityNGrams;
  };

  contextualVector: ContextualVector;
  consistencyScore: number;

  issues: {
    issue: 'missing_in_h1' | 'missing_in_intro' | 'low_heading_presence' |
           'uneven_distribution' | 'contextual_drift';
    severity: 'critical' | 'warning' | 'info';
    description: string;
    location: string;
  }[];
}

// =============================================================================
// CONTENT LAYER ANALYSIS
// =============================================================================

/**
 * Complete content layer analysis for a page
 */
export interface ContentLayerAnalysis {
  url: string;
  domain: string;
  analyzedAt: Date;

  // EAV triples with classification
  eavTriples: ClassifiedSemanticTriple[];

  // Attribute distribution
  attributeDistribution: AttributeDistribution;

  // Central entity analysis
  centralEntityAnalysis: CentralEntityAnalysis;

  // Overall content score
  contentScore: number;
}

// =============================================================================
// SCHEMA ENTITY LINKING
// =============================================================================

/**
 * Entity in schema markup
 */
export interface SchemaEntity {
  name: string;
  type: string;
  wikidataId: string | null;
  wikipediaUrl: string | null;
  isProperlyReconciled: boolean;
}

/**
 * About property analysis
 */
export interface AboutAnalysis {
  present: boolean;
  entities: SchemaEntity[];
  quality: 'excellent' | 'good' | 'poor' | 'missing';
  issues: string[];
}

/**
 * Mentions property analysis
 */
export interface MentionsAnalysis {
  present: boolean;
  count: number;
  entities: SchemaEntity[];
  quality: 'excellent' | 'good' | 'poor' | 'missing';
}

/**
 * Schema entity linking analysis
 */
export interface EntityLinkingAnalysis {
  about: AboutAnalysis;
  mentions: MentionsAnalysis;
  disambiguationScore: number;
  recommendations: {
    action: string;
    impact: 'high' | 'medium' | 'low';
    implementation: string;
  }[];
}

// =============================================================================
// NAVIGATION ANALYSIS
// =============================================================================

/**
 * Navigation element analysis
 */
export interface NavigationElementAnalysis {
  linkCount: number;
  isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';
  dynamicSignals: string[];
  staticSignals: string[];
}

/**
 * Header navigation analysis
 */
export interface HeaderAnalysis extends NavigationElementAnalysis {
  isMegaMenu: boolean;
  megaMenuCategories: number;
}

/**
 * Footer navigation analysis
 */
export interface FooterAnalysis extends NavigationElementAnalysis {
  hasCorporateLinks: {
    aboutUs: boolean;
    privacyPolicy: boolean;
    termsOfService: boolean;
    contact: boolean;
  };
}

/**
 * Sidebar analysis
 */
export interface SidebarAnalysis {
  present: boolean;
  linkCount: number;
  isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';
  linksRelevantToPage: number;
  relevanceScore: number;
}

/**
 * Navigation issue
 */
export interface NavigationIssue {
  issue: 'mega_menu_dilution' | 'static_footer' | 'irrelevant_sidebar' | 'missing_corporate';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  recommendation: string;
}

/**
 * Complete navigation analysis
 */
export interface NavigationAnalysis {
  header: HeaderAnalysis;
  footer: FooterAnalysis;
  sidebar: SidebarAnalysis;
  navigationScore: number;
  issues: NavigationIssue[];
}

// =============================================================================
// TECHNICAL LAYER ANALYSIS
// =============================================================================

/**
 * Complete technical layer analysis
 */
export interface TechnicalLayerAnalysis {
  url: string;
  domain: string;
  analyzedAt: Date;

  // Schema analysis
  schema: {
    hasSchema: boolean;
    schemaTypes: string[];
    entityLinking: EntityLinkingAnalysis;
    validationErrors: string[];
  };

  // Navigation analysis
  navigationAnalysis: NavigationAnalysis;

  // HTML semantic tags
  semanticTags: {
    hasArticle: boolean;
    hasMain: boolean;
    hasAside: boolean;
    hasNav: boolean;
    hasHeader: boolean;
    hasFooter: boolean;
  };

  // Overall technical score
  technicalScore: number;
}

// =============================================================================
// LINK POSITION ANALYSIS
// =============================================================================

/**
 * Link position in content
 */
export interface LinkPosition {
  contentZone: 'early' | 'middle' | 'late';
  percentageThrough: number;
  paragraphNumber: number;
  totalParagraphs: number;
  contentType: 'main' | 'supplementary' | 'navigation';
  isOptimalPlacement: boolean;
  placementScore: number;
}

/**
 * Internal link with position
 */
export interface InternalLink {
  href: string;
  anchorText: string;
  context: string;
  placement: 'in-content' | 'sidebar' | 'footer' | 'nav' | 'related-posts';
  followStatus: 'follow' | 'nofollow';
  isImage: boolean;
  position: LinkPosition;
}

// =============================================================================
// ANCHOR TEXT QUALITY
// =============================================================================

/**
 * Anchor text repetition issue
 */
export interface AnchorRepetitionIssue {
  anchorText: string;
  count: number;
  targetUrl: string;
  isViolation: boolean;
}

/**
 * Generic anchor issue
 */
export interface GenericAnchorIssue {
  anchorText: string;
  href: string;
  suggestion: string;
}

/**
 * First-word link issue
 */
export interface FirstWordLinkIssue {
  anchorText: string;
  href: string;
  paragraphStart: string;
}

/**
 * Anchor text quality analysis
 */
export interface AnchorTextQuality {
  repetitionIssues: AnchorRepetitionIssue[];
  genericAnchors: GenericAnchorIssue[];
  genericCount: number;
  firstWordLinks: FirstWordLinkIssue[];
  firstWordCount: number;

  scores: {
    repetition: number;
    descriptiveness: number;
    placement: number;
    annotation: number;
    overall: number;
  };

  issues: {
    severity: 'critical' | 'warning' | 'info';
    type: 'repetition' | 'generic' | 'placement' | 'annotation';
    description: string;
    count: number;
  }[];
}

// =============================================================================
// PAGERANK FLOW ANALYSIS
// =============================================================================

/**
 * Page type classification
 */
export type PageType = 'core' | 'author' | 'bridge' | 'unknown';

/**
 * Flow direction classification
 */
export type FlowDirection = 'correct' | 'reversed' | 'balanced' | 'unclear';

/**
 * Flow issue
 */
export interface FlowIssue {
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  affectedLinks: string[];
}

/**
 * Links to section analysis
 */
export interface SectionLinks {
  count: number;
  urls: string[];
  anchorTexts: string[];
  placement: ('early' | 'middle' | 'late')[];
}

/**
 * PageRank flow analysis
 */
export interface PageRankFlowAnalysis {
  pageType: PageType;
  pageTypeConfidence: number;
  pageTypeSignals: string[];

  flowAnalysis: {
    linksToCore: SectionLinks;
    linksToAuthor: SectionLinks;
    flowDirection: FlowDirection;
    flowScore: number;
    issues: FlowIssue[];
  };

  strategicAssessment: {
    isOptimal: boolean;
    recommendation: string;
    potentialImprovement: string;
  };
}

// =============================================================================
// BRIDGE JUSTIFICATION ANALYSIS
// =============================================================================

/**
 * Bridge justification issue
 */
export interface BridgeJustificationIssue {
  issue: 'no_context' | 'abrupt_transition' | 'semantic_disconnect' | 'early_placement';
  description: string;
  suggestion: string;
}

/**
 * Bridge topic justification
 */
export interface BridgeJustification {
  hasSubordinateText: boolean;
  subordinateHeading: string | null;
  hasContextualIntro: boolean;
  contextualText: string | null;
  linkPlacement: 'inline' | 'section_end' | 'standalone';
  isJustified: boolean;
  justificationScore: number;
  issues: BridgeJustificationIssue[];
}

/**
 * Bridge topic with justification
 */
export interface BridgeTopic {
  topic: string;
  function: 'connects' | 'supports' | 'expands';
  connectsClusters: string[];
  linkJuiceFlow: 'inbound' | 'outbound' | 'bidirectional';
  strategicValue: 'high' | 'medium' | 'low';
  justification: BridgeJustification;
}

// =============================================================================
// LINK LAYER ANALYSIS
// =============================================================================

/**
 * Placement patterns summary
 */
export interface PlacementPatterns {
  coreLinksPlacements: {
    early: number;
    middle: number;
    late: number;
    optimal: number;
  };
  authorLinksPlacements: {
    early: number;
    middle: number;
    late: number;
  };
  overallPlacementScore: number;
  recommendations: {
    action: string;
    currentPlacement: string;
    suggestedPlacement: string;
    affectedLinks: string[];
  }[];
}

/**
 * Complete link layer analysis
 */
export interface LinkLayerAnalysis {
  url: string;
  domain: string;
  analyzedAt: Date;

  // Internal links
  internal: {
    links: InternalLink[];
    totalCount: number;
    uniqueTargets: number;
    anchorTextQuality: AnchorTextQuality;
  };

  // External links
  external: {
    links: { href: string; anchorText: string; nofollow: boolean }[];
    totalCount: number;
  };

  // PageRank flow
  pageRankFlow: PageRankFlowAnalysis;

  // Bridge topics
  bridgeTopics: BridgeTopic[];

  // Placement patterns
  placementPatterns: PlacementPatterns;

  // Overall link score
  linkScore: number;
}

// =============================================================================
// COMPETITOR ANALYSIS
// =============================================================================

/**
 * Single competitor analysis result
 */
export interface CompetitorAnalysis {
  url: string;
  domain: string;
  position: number;
  analyzedAt: Date;

  content: ContentLayerAnalysis;
  technical: TechnicalLayerAnalysis;
  links: LinkLayerAnalysis;

  overallScore: number;
  strengths: string[];
  weaknesses: string[];
}

// =============================================================================
// GAP ANALYSIS
// =============================================================================

/**
 * Comprehensive gap analysis
 */
export interface ComprehensiveGapAnalysis {
  // Attribute gaps
  attributes: AttributeGapAnalysis;

  // Technical gaps
  technical: {
    missingSchemaTypes: string[];
    entityLinkingGap: boolean;
    navigationIssues: string[];
  };

  // Link gaps
  links: {
    flowIssues: string[];
    anchorQualityIssues: string[];
    bridgeOpportunities: string[];
  };

  // Priority actions
  priorityActions: {
    action: string;
    category: 'content' | 'technical' | 'links';
    priority: 'critical' | 'high' | 'medium' | 'low';
    expectedImpact: string;
  }[];
}

// =============================================================================
// TOPIC SERP INTELLIGENCE
// =============================================================================

/**
 * Complete SERP intelligence for a topic
 */
export interface TopicSerpIntelligence {
  topic: string;
  analyzedAt: Date;
  mode: 'fast' | 'deep';

  // SERP snapshot
  serp: {
    totalResults: number;
    features: string[];
    topCompetitors: {
      position: number;
      url: string;
      domain: string;
      title: string;
    }[];
  };

  // Competitor analyses
  competitors: CompetitorAnalysis[];

  // Aggregated patterns
  patterns: {
    dominantContentType: string;
    avgWordCount: number;
    commonSchemaTypes: string[];
    topAttributes: { attribute: string; coverage: number }[];
  };

  // Gap analysis (compared to competitors)
  gaps: ComprehensiveGapAnalysis;

  // Overall scores
  scores: {
    contentOpportunity: number;
    technicalOpportunity: number;
    linkOpportunity: number;
    overallDifficulty: number;
  };
}
