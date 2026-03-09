/**
 * Content Types Module
 *
 * Contains content and topic types including:
 * - EnrichedTopic: Topic with metadata and structure
 * - ContentBrief: Full brief with outline and analysis
 * - BriefSection: Section structure for content
 * - Supporting types for SERP, visuals, and bridges
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/content
 */

import { SemanticTriple, TopicBlueprint, FreshnessProfile, AttributeCategory, BriefVisualSemantics } from './semantic';
import { BusinessInfo, SEOPillars, ImageStyle, ImageProviderPreference, ImageGenerationSettings } from './business';
import type { ContentGenerationSection, PassesStatus } from './contentGeneration';
import type { ContentIntegrityResult } from './audit';
import { TemplateName, DepthMode } from './contentTemplates';

// ============================================================================
// RESPONSE AND FORMAT CODES
// ============================================================================

/**
 * Response code for content type classification
 */
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

/**
 * Format code for section formatting
 */
export const FormatCode = {
  FS: 'FS',
  PAA: 'PAA',
  LISTING: 'LISTING',
  DEFINITIVE: 'DEFINITIVE',
  TABLE: 'TABLE',
  PROSE: 'PROSE',
} as const;
export type FormatCode = typeof FormatCode[keyof typeof FormatCode];

/**
 * Content zone classification
 */
export const ContentZone = {
  MAIN: 'MAIN',
  SUPPLEMENTARY: 'SUPPLEMENTARY',
} as const;
export type ContentZone = typeof ContentZone[keyof typeof ContentZone];

// ============================================================================
// TOPIC METADATA
// ============================================================================

/**
 * Topic metadata interface with known fields
 * Uses index signature for extensibility while documenting known properties
 */
export interface TopicMetadata {
  /** Publication planning data */
  publication_plan?: {
    status?: string;
    phase?: string;
    priority?: number | string;
    scheduled_date?: string;
    priority_score?: number;
    optimal_publication_date?: string;
    dependencies?: string[];
  };

  /** Last enrichment timestamp */
  last_enriched_at?: string;

  /** Source of topic creation */
  source?: 'manual' | 'ai_generated' | 'imported' | 'merged' | 'import' | 'inventory_promotion' | 'content_gap' | 'faq_action';

  /** Custom user tags */
  tags?: string[];

  /** Notes from user */
  notes?: string;

  /** Allow additional unknown properties */
  [key: string]: unknown;
}

// ============================================================================
// TOPIC TYPES
// ============================================================================

/**
 * Topic viability analysis result
 */
export interface TopicViabilityResult {
  decision: 'PAGE' | 'SECTION';
  reasoning: string;
  targetParent?: string;
}

/**
 * Enriched topic with full metadata
 */
export interface EnrichedTopic {
  id: string;
  map_id: string;
  parent_topic_id: string | null;
  display_parent_id?: string | null; // Visual parent for business presentations (does NOT affect SEO)
  title: string;
  slug: string;
  description: string;
  type: 'core' | 'outer' | 'child';
  freshness: FreshnessProfile;

  // Database timestamps
  created_at?: string;
  updated_at?: string;

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

  // Search intent (used by gamification/tierAssignment)
  search_intent?: string;

  // Target URL for existing content
  target_url?: string;

  // Keywords for matching (used by migration/bridge)
  keywords?: string[];

  // Response code for content type classification
  response_code?: ResponseCode | string;

  // Typed metadata container
  metadata?: TopicMetadata;
}

// ============================================================================
// CONTEXTUAL BRIDGE
// ============================================================================

/**
 * Link in contextual bridge for internal linking
 */
export interface ContextualBridgeLink {
  targetTopic: string;
  anchorText: string;
  annotation_text_hint?: string; // Text surrounding the anchor text for relevance signaling
  reasoning: string;
}

/**
 * Contextual bridge section with transition paragraph
 */
export interface ContextualBridgeSection {
  type: 'section';
  content: string; // The transition paragraph
  links: ContextualBridgeLink[];
}

// ============================================================================
// BRIEF SECTION
// ============================================================================

/**
 * Section structure within a content brief
 */
export interface BriefSection {
  key?: string; // Section identifier (e.g., 'section-0', 'section-1')
  heading: string;
  level: number;
  order?: number; // Position in article

  // Content Brief Codes
  format_code?: FormatCode;

  // Attribute classification for ordering
  attribute_category?: AttributeCategory;

  // Query priority from GSC/DataForSEO
  query_priority?: number;
  related_queries?: string[];

  // Existing fields (enhanced)
  subordinate_text_hint?: string; // Instructions for the first sentence
  /** Answer capsule: 40-70 word direct answer for this section (LLM/RAG/Featured Snippet optimization) */
  answer_capsule?: {
    text_hint: string;
    target_length: number;
    required_predicates?: string[];
  };
  methodology_note?: string; // Formatting instructions

  // Required phrases from ["..."] codes
  required_phrases?: string[];

  // Internal linking targets
  anchor_texts?: { phrase: string; target_topic_id?: string }[];

  // Section classification
  content_zone?: ContentZone;

  // Content type and format classification
  content_type?: string;
  format?: string;

  // EAVs mapped to this section
  mapped_eavs?: import('./semantic').SemanticTriple[];

  // Legacy/alternative field names (backward compatibility)
  section_heading?: string;   // Alias for heading
  heading_level?: number;     // Alias for level
  key_points?: string[];      // Key points for the section
  content_brief?: string;     // Text brief for the section

  subsections?: BriefSection[]; // Nested subsections (H3s under H2s)
}

// ============================================================================
// VISUAL SEMANTICS
// ============================================================================

/**
 * Visual semantics for content imagery
 */
export interface VisualSemantics {
  type: 'INFOGRAPHIC' | 'CHART' | 'PHOTO' | 'DIAGRAM';
  description: string;
  caption_data: string; // Data points or specific caption text
  height_hint?: string;
  width_hint?: string;
}

/**
 * Featured snippet target configuration
 */
export interface FeaturedSnippetTarget {
  question: string;
  answer_target_length: number; // e.g. 40
  required_predicates: string[]; // Verbs/terms to include
  target_type: 'PARAGRAPH' | 'LIST' | 'TABLE';
}

// ============================================================================
// SERP TYPES
// ============================================================================

/**
 * Single SERP result
 */
export interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
}

/**
 * Full SERP data from analysis
 */
export interface FullSerpData {
  organicResults: SerpResult[];
  peopleAlsoAsk: string[];
  relatedQueries: string[];
}

/**
 * Scraped content from competitor pages
 */
export interface ScrapedContent {
  url: string;
  title: string;
  headings: { level: number; text: string }[];
  rawText: string;
}

// ============================================================================
// CONTENT BRIEF
// ============================================================================

// ContentIntegrityResult imported from ./audit
// BriefVisualSemantics imported from ./semantic

/**
 * Full content brief with all analysis and structure
 */
export interface ContentBrief {
  id: string;
  topic_id: string;
  title: string;
  slug: string;
  created_at?: string;
  metaDescription: string;
  keyTakeaways: string[];
  outline: string;
  targetKeyword?: string; // Primary keyword for this content
  searchIntent?: string; // Search intent (informational, navigational, transactional, commercial)
  serpAnalysis: {
    peopleAlsoAsk: string[];
    competitorHeadings: { title: string; url: string; headings: { level: number; text: string }[] }[];
    // Optional aggregated SERP data
    avgWordCount?: number;
    avgHeadings?: number;
    commonStructure?: string;
    contentGaps?: string[];
    query_type?: string; // Query type format (Definitional, Comparative, etc)
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
  /** Map of image placements anchored to entity mentions */
  visual_placement_map?: VisualPlacementEntry[];
  discourse_anchors?: string[]; // List of mutual words for transitions
  /** Structured sequence of discourse anchors for section transitions */
  discourse_anchor_sequence?: DiscourseAnchorEntry[];

  // Enhanced Visual Semantics (Koray's "Pixels, Letters, and Bytes" Framework)
  enhanced_visual_semantics?: BriefVisualSemantics;

  // Business fields
  cta?: string; // Call to action for business conversion

  // Compliance scoring fields (optional)
  eavs?: SemanticTriple[]; // Entity-Attribute-Value triples for this brief
  mapped_eavs?: Record<string, SemanticTriple[]>; // EAVs mapped to sections by section key
  suggested_internal_links?: { anchor: string; target_topic_id?: string; url?: string; anchor_text?: string; title?: string }[];
  schema_suggestions?: Record<string, unknown>[];

  // Backwards-compatible properties for legacy code
  topic?: string;           // Legacy: same as title
  description?: string;     // Legacy: brief description
  freshness?: FreshnessProfile | string; // Legacy: freshness profile
  suggested_h1?: string;    // Legacy: suggested H1 headline
  response_code?: ResponseCode | string; // Legacy: response format code
  topic_class?: 'monetization' | 'informational'; // Legacy: topic classification

  // Competitor-derived specifications (Phase 3 Enhancement)
  competitorSpecs?: CompetitorSpecs;

  // Content length suggestion based on topic type and market data
  suggestedLengthPreset?: 'minimal' | 'short' | 'standard' | 'comprehensive';
  suggestedLengthReason?: string;

  // Generation change tracking (populated during content generation)
  generation_changes?: BriefChangeLogEntry[];
  generation_summary?: BriefGenerationSummary;

  // Template routing fields (Brief Sync Mechanism)
  /** Selected template name */
  selectedTemplate?: TemplateName;

  /** Template selection confidence from AI */
  templateConfidence?: number;

  /** User-selected depth mode */
  depthMode?: DepthMode;

  /** Resolved conflict choice */
  conflictResolution?: 'template' | 'brief' | 'merge';

  // Ecommerce category page context (product catalog data for content grounding)
  categoryContext?: import('./catalog').CategoryPageContext;
}

/**
 * Competitor-derived specifications for content brief
 * Generated from market pattern analysis (Phase 3)
 */
export interface CompetitorSpecs {
  dataQuality: 'high' | 'medium' | 'low' | 'none';
  analysisDate: string;
  competitorsAnalyzed: number;

  // Word count targets
  targetWordCount: number;
  wordCountRange: { min: number; max: number };
  wordCountConfidence: 'high' | 'medium' | 'low';

  // Visual requirements
  targetImageCount: number;
  recommendedImageTypes: string[];
  hasVideoPercentage: number;

  // Schema requirements
  requiredSchemaTypes: string[];
  schemaPresencePercentage: number;

  // Content structure
  avgH2Count: number;
  avgH3Count: number;
  dominantContentTemplate: string;
  dominantAudienceLevel: string;

  // Semantic requirements
  requiredTopics: string[];
  differentiationTopics: string[];
  rootAttributes: { attribute: string; coverage: number }[];
  rareAttributes: { attribute: string; coverage: number }[];

  // Benchmarks
  benchmarks: {
    topCompetitorWordCount: number;
    avgCompetitorWordCount: number;
    topCompetitorImageCount: number;
  };

  // Analysis warnings
  warnings: string[];
}

// ============================================================================
// BRIEF CHANGE TRACKING
// ============================================================================

/**
 * Log entry for tracking changes made during content generation
 * that deviate from the original brief specification.
 */
export interface BriefChangeLogEntry {
  id: string;
  timestamp: string;
  pass: number;
  change_type: 'image_added' | 'image_modified' | 'image_removed' | 'section_modified';
  section_key: string;
  field: string;
  original_value?: string | number | null;
  new_value: string | number;
  reason: string;
  criteria_met: string[];
}

/**
 * Summary of generation changes for UI display
 */
export interface BriefGenerationSummary {
  total_changes: number;
  images_added: number;
  images_modified: number;
  sections_modified: number;
  last_updated: string;
}

// ============================================================================
// GENERATION LOG
// ============================================================================

/**
 * Entry in content generation log
 */
export interface GenerationLogEntry {
  service: string;
  message: string;
  status: 'success' | 'failure' | 'info' | 'skipped' | 'warning';
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// GSC (Google Search Console) TYPES
// ============================================================================

/**
 * GSC query row data
 */
export interface GscRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * GSC-derived content opportunity
 */
export interface GscOpportunity {
  query: string;
  impressions: number;
  ctr: number;
  reasoning: string;
  relatedKnowledgeTerms: string[];
}

// ContentGenerationSection and PassesStatus imported from ./contentGeneration

// ============================================================================
// DISCOURSE & SECTION GENERATION TYPES
// ============================================================================

export interface DiscourseContext {
  previousParagraph: string;
  lastSentence: string;
  lastObject: string;
  subjectHint: string;
}

/**
 * Flow guidance for section generation - provides context for smooth transitions
 * and proper article structure during content generation.
 */
export interface SectionFlowGuidance {
  // Position awareness
  sectionIndex: number;              // 0-based index
  totalSections: number;             // Total count
  isFirstSection: boolean;
  isLastSection: boolean;
  isIntroduction: boolean;
  isConclusion: boolean;

  // Neighbor context
  previousSectionHeading?: string;
  nextSectionHeading?: string;

  // Content zone (from brief)
  contentZone: 'MAIN' | 'SUPPLEMENTARY';
  isZoneTransition: boolean;         // True if crossing MAIN->SUPPLEMENTARY boundary

  // Attribute context (from brief)
  attributeCategory?: AttributeCategory;
  attributeProgression: string;      // e.g., "Building from definition to specifics"

  // Flow patterns
  transitionPattern: 'opening' | 'deepening' | 'parallel' | 'bridging' | 'concluding';
  suggestedOpener?: string;          // From discourse_anchors or contextualBridge
  bridgeContent?: string;            // Full contextual bridge content for zone transitions

  // Article context
  centralEntity: string;
  articleTitle: string;
}

export interface SectionGenerationContext {
  section: BriefSection;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  discourseContext?: DiscourseContext;
  allSections: BriefSection[];
  isYMYL: boolean;
  ymylCategory?: 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY';
  /** ISO language code (e.g., 'nl', 'en', 'de', 'fr', 'es') for multilingual validation */
  language?: string;
  /** Total number of sections in the article (used by contextual vector validation) */
  totalSections?: number;
  /** SEO pillars for pillar alignment validation (S3 rule) */
  pillars?: SEOPillars;
  /** Content length guidance for this section */
  lengthGuidance?: {
    targetWords: { min: number; max: number };
    presetName: string;
    isShortContent: boolean;
  };
  /** Flow guidance for smooth transitions and article structure */
  flowGuidance?: SectionFlowGuidance;
  /** Previous section context for cross-section transition validation */
  previousSection?: {
    heading: string;
    content?: string;
  };
  /** EAVs assigned to this specific section via brief.mapped_eavs */
  sectionEavs?: SemanticTriple[];
}

// ============================================================================
// VISUAL PLACEMENT & DISCOURSE ANCHOR TYPES
// ============================================================================

export interface VisualPlacementEntry {
  /** The section heading where image should appear */
  section_heading: string;
  /** The entity mention this image supports */
  entity_anchor: string;
  /** The EAV triple this image illustrates (if applicable) */
  eav_reference?: {
    subject: string;
    predicate: string;
    object: string;
  };
  /** Image type from visual_semantics */
  image_type: 'data_visualization' | 'comparison_table' | 'process_diagram' | 'infographic' | 'photograph' | 'screenshot';
  /** Why this image belongs at this location */
  placement_rationale: string;
}

/**
 * Defines the discourse anchor sequence for progressive context flow.
 * Framework: "Each transition requires a Contextual Bridge"
 */
export interface DiscourseAnchorEntry {
  /** The section this anchor leads FROM */
  from_section: string;
  /** The section this anchor leads TO */
  to_section: string;
  /** The bridging concept that connects the two sections */
  bridge_concept: string;
  /** Key terms that should appear in the transition */
  transition_terms: string[];
  /** Type of transition */
  transition_type: 'elaboration' | 'contrast' | 'cause_effect' | 'sequence' | 'example' | 'summary';
}

// ============================================================================
// IMAGE GENERATION TYPES
// ============================================================================

// Photographic-first image types (Tier 1: Photography, Tier 2: Minimal diagrams)
export type ImageType =
  // Tier 1: Photographic types (default)
  | 'HERO'        // Featured/hero image at top of content
  | 'SCENE'       // Environmental photography (default fallback)
  | 'OBJECT'      // Product/object close-ups
  | 'ACTION'      // Activity/demonstration shots
  | 'CONCEPT'     // Abstract/metaphorical imagery
  | 'PORTRAIT'    // People portraits/headshots
  // Tier 2: Minimal diagrams (only for explicit process content)
  | 'FLOWCHART'   // Process flows
  | 'HIERARCHY'   // Tree structures/org charts
  | 'COMPARISON'  // Side-by-side comparisons
  | 'RELATIONSHIP' // Network/connection diagrams
  // Legacy types (maintained for backward compatibility)
  | 'SECTION'     // Generic section image (maps to SCENE)
  | 'INFOGRAPHIC' // Statistics/infographics
  | 'CHART'       // Data charts/graphs
  | 'DIAGRAM'     // Generic diagrams
  | 'AUTHOR';     // Author profile images

export interface ImagePlaceholder {
  id: string;
  type: ImageType;
  position: number;
  sectionKey?: string;
  description: string;
  altTextSuggestion: string;
  status: 'placeholder' | 'generating' | 'uploaded' | 'generated' | 'error';
  generatedUrl?: string;
  userUploadUrl?: string;
  specs: ImageSpecs;
  metadata?: ImageMetadata;
  errorMessage?: string; // Error details when status is 'error'
  /** Figcaption text for the image (displayed below image in <figcaption>) */
  figcaption?: string;
}

// Image Generation Progress Types
export type ImageGenerationPhase = 'idle' | 'generating' | 'uploading' | 'complete' | 'error';

export interface ImageGenerationError {
  phase: ImageGenerationPhase;
  provider: string;
  message: string;
  code?: string;
  retryable: boolean;
  suggestion: string;
}

export interface ImageGenerationProgress {
  phase: ImageGenerationPhase;
  provider?: string;
  progress: number;
  message?: string;
  previewUrl?: string;
  finalUrl?: string;
  error?: ImageGenerationError;
}

export interface ImageSpecs {
  width: number;
  height: number;
  format: 'avif' | 'webp' | 'png' | 'jpeg';
  maxFileSize: number;
  textOverlay?: {
    text: string;
    position: 'center' | 'bottom' | 'top';
    style: string;
  };
  logoOverlay?: {
    position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    opacity: number;
  };
}

export interface ImageMetadata {
  filename: string;
  altText: string;
  caption?: string;
  generatedBy?: string; // Provider name that generated this image
  exif: {
    author: string;
    copyright: string;
    software: string;
    description: string;
  };
  iptc: {
    creator: string;
    rights: string;
    source: string;
    keywords: string[];
  };
  schema: {
    "@type": "ImageObject";
    url: string;
    width: number;
    height: number;
    caption: string;
    license?: string;
    acquireLicensePage?: string;
  };
}

// ImageStyle, ImageProviderPreference, ImageGenerationSettings imported from ./business

// ============================================================================
// MAP IMPROVEMENT & SEMANTIC ANALYSIS TYPES
// ============================================================================

export interface MapImprovementSuggestion {
  newTopics: {
    title: string;
    description: string;
    type: 'core' | 'outer' | 'child';
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
  hubDemotions?: {
    hubTitle: string;
    newParentTitle: string;
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

// ============================================================================
// TOPICAL AUTHORITY TYPES
// ============================================================================

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

// ============================================================================
// SECTION-BY-SECTION OPTIMIZATION TYPES
// ============================================================================

/**
 * Holistic summary context computed once per pass from the full article.
 * This compact representation (~2-4KB) preserves full article metrics
 * without requiring each section to receive the entire article.
 */
export interface HolisticSummaryContext {
  articleStructure: {
    title: string;
    totalWordCount: number;
    totalSections: number;
    headingOutline: {
      key: string;
      heading: string;
      level: number;
      wordCount: number;
      order: number;
    }[];
  };
  vocabularyMetrics: {
    typeTokenRatio: number;        // Unique words / total words (0-1)
    uniqueWordCount: number;
    totalWordCount: number;
    overusedTerms: { term: string; count: number }[];  // Terms appearing >3x
  };
  coverageDistribution: {
    sectionKey: string;
    heading: string;
    percentage: number;            // % of total word count
  }[];
  anchorTextsUsed: {
    text: string;
    sectionKey: string;
    count: number;
  }[];
  sectionKeyTerms: {
    sectionKey: string;
    keyTerms: string[];            // Top 5 TF-IDF terms per section
    lastSentence: string;          // For discourse chaining (S-P-O pattern)
  }[];
  introductionSummary: {
    content: string;               // Full intro for alignment checks
    topicsPreviewedInOrder: string[];
  };
  centralEntity: string;           // From SEO pillars
  discourseAnchors: string[];      // Key entities for discourse integration
  featuredSnippetTarget?: {
    question: string;
    targetType: string;            // 'paragraph' | 'list' | 'table'
  };
}

/**
 * Lightweight holistic summary for quality-preserving polish fallback.
 * Captures global document context (themes, voice, terminology) to maintain
 * coherence when processing sections individually during timeout recovery.
 */
export interface HolisticSummary {
  themes: string[];           // Main themes/arguments (3-5)
  voice: string;              // Writing style description
  terminology: string[];      // Key terms to maintain consistency
  semanticAnchors: string[];  // Concepts tying content together
  structuralFlow: string;     // How sections relate to each other
}

/**
 * Context provided to each section during optimization passes.
 * Contains the section content, holistic summary, and adjacent sections.
 */
export interface SectionOptimizationContext {
  section: ContentGenerationSection;
  holistic: HolisticSummaryContext;
  adjacentContext: {
    previousSection?: {
      key: string;
      heading: string;
      lastParagraph: string;       // For discourse continuity
      keyTerms: string[];          // For vocabulary variety
    };
    nextSection?: {
      key: string;
      heading: string;
      firstParagraph: string;      // For transition preparation
    };
  };
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  passNumber: number;
  /** All sections in the article - used for deduplication checks in Pass 4 (Visual Semantics) */
  allSections?: ContentGenerationSection[];
}

/**
 * Configuration for section-level pass execution.
 */
export interface SectionPassConfig {
  passNumber: number;
  passKey: keyof PassesStatus;
  nextPassNumber: number;
  promptBuilder: (ctx: SectionOptimizationContext) => string;
  /** If true, only process the intro section (for Pass 7) */
  introOnly?: boolean;
  /** Custom section filter - return true to process section */
  sectionFilter?: (section: ContentGenerationSection, holistic: HolisticSummaryContext) => boolean;

  // New: Format budget integration
  /** Number of sections to process per batch (default: 1) */
  batchSize?: number;
  /** Filter sections based on format budget (selective processing) */
  filterSections?: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => ContentGenerationSection[];
  /** Build prompt for batch of sections (alternative to single section promptBuilder) */
  buildBatchPrompt?: (
    batch: ContentGenerationSection[],
    holistic: HolisticSummaryContext,
    budget: ContentFormatBudget,
    brief: ContentBrief,
    businessInfo: BusinessInfo
  ) => string;
}

/**
 * Callback for section-level progress reporting.
 */
export type SectionProgressCallback = (
  sectionKey: string,
  currentIndex: number,
  totalSections: number
) => void;

/**
 * Progress information from streaming AI operations.
 * Used for activity-based timeout handling in long-running operations.
 */
export interface StreamingProgress {
  /** Number of characters received so far */
  charsReceived: number;
  /** Number of streaming events processed */
  eventsProcessed: number;
  /** Elapsed time in milliseconds since operation started */
  elapsedMs: number;
  /** Timestamp of last activity (for inactivity detection) */
  lastActivity: number;
}

/**
 * Callback for streaming progress reporting.
 * Used to reset inactivity timeouts during long AI operations.
 */
export type StreamingProgressCallback = (progress: StreamingProgress) => void;

/**
 * Section type classification for content format budgeting.
 * Based on the "Baker Principle" from research - different section types
 * have different optimal prose/structured content ratios.
 */
export type SectionContentType = 'macro' | 'body' | 'comparison' | 'bridge' | 'supplementary';

/**
 * Content format budget tracking for balanced optimization.
 * Prevents over-optimization with lists/tables by tracking article-wide distribution.
 */
export interface ContentFormatBudget {
  /** Current content format statistics */
  currentStats: {
    totalSections: number;
    sectionsWithLists: number;
    sectionsWithTables: number;
    sectionsWithImages: number;
    /** Prose to structured content ratio (0-1, e.g., 0.7 = 70% prose) */
    proseToStructuredRatio: number;
  };

  /** Per-section type classification */
  sectionClassifications: {
    sectionKey: string;
    heading: string;
    type: SectionContentType;
    hasListAlready: boolean;
    hasTableAlready: boolean;
    hasImageAlready: boolean;
  }[];

  /** Sections identified as needing specific optimizations */
  sectionsNeedingOptimization: {
    /** Sections that should get lists (based on query semantics) */
    lists: string[];
    /** Sections that should get tables (comparative content) */
    tables: string[];
    /** Sections that should get images */
    images: string[];
    /** Sections needing discourse improvement */
    discourse: string[];
  };

  /** Budget constraints to maintain balance */
  constraints: {
    /** Maximum sections that can have lists (e.g., 40% of total) */
    maxListSections: number;
    /** Maximum sections that can have tables (e.g., 15% of total) */
    maxTableSections: number;
    /** Maximum sections that can have images (e.g., 50% of total) */
    maxImageSections: number;
    /** Target prose ratio (0.6-0.8 = 60-80% prose) */
    targetProseRatio: number;
  };
}
