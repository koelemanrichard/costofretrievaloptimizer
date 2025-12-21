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

import { SemanticTriple, TopicBlueprint, FreshnessProfile, AttributeCategory } from './semantic';

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
export enum FormatCode {
  FS = 'FS',
  PAA = 'PAA',
  LISTING = 'LISTING',
  DEFINITIVE = 'DEFINITIVE',
  TABLE = 'TABLE',
  PROSE = 'PROSE',
}

/**
 * Content zone classification
 */
export enum ContentZone {
  MAIN = 'MAIN',
  SUPPLEMENTARY = 'SUPPLEMENTARY',
}

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
    priority?: number;
    scheduled_date?: string;
  };

  /** Last enrichment timestamp */
  last_enriched_at?: string;

  /** Source of topic creation */
  source?: 'manual' | 'ai_generated' | 'imported' | 'merged';

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
  methodology_note?: string; // Formatting instructions

  // Required phrases from ["..."] codes
  required_phrases?: string[];

  // Internal linking targets
  anchor_texts?: { phrase: string; target_topic_id?: string }[];

  // Section classification
  content_zone?: ContentZone;

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

// Forward declaration for ContentIntegrityResult (defined in audit module)
// Using interface extension pattern to avoid circular dependencies
export interface ContentIntegrityResult {
  overallScore: number;
  sections: Array<{
    key: string;
    heading: string;
    score: number;
    issues: string[];
  }>;
  summary: string;
}

// Forward declaration for BriefVisualSemantics
export interface BriefVisualSemantics {
  heroImagePrompt?: string;
  heroImageAltText?: string;
  sectionImages?: Array<{
    sectionKey: string;
    type: VisualSemantics['type'];
    description: string;
    altText: string;
  }>;
}

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

  // Enhanced Visual Semantics (Koray's "Pixels, Letters, and Bytes" Framework)
  enhanced_visual_semantics?: BriefVisualSemantics;

  // Business fields
  cta?: string; // Call to action for business conversion
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
