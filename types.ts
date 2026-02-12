
// types.ts
//
// REFACTORING COMPLETE: This file re-exports from domain-specific modules.
// See docs/TYPES_REFACTORING_PLAN.md for details.
//
// Re-exports from domain modules:
// - types/core.ts - Core enums (AppStep, WebsiteType, StylometryType, AIProvider)
// - types/business.ts - Business types (BusinessInfo, AuthorProfile, SEOPillars, BrandKit, EntityIdentity)
// - types/semantic.ts - Semantic types (SemanticTriple, AttributeCategory, FreshnessProfile)
// - types/content.ts - Content types (EnrichedTopic, ContentBrief, BriefSection, GscRow)
// - types/audit.ts - Audit types (ValidationResult, AuditRule, UnifiedAuditResult, PageAuditResult)
// - types/schema.ts - JSON-LD schema types (SchemaPageType, Pass9Config, EnhancedSchemaResult)
// - types/publication.ts - Publication types (PublicationStatus, TopicPublicationPlan)
// - types/navigation.ts - Navigation types (FoundationPage, NavigationStructure, NAPData)
// - types/migration.ts - Migration types (TransitionStatus, MapMergeState, SiteInventoryItem)
// - types/siteAnalysis.ts - Site analysis V2 types (SiteAnalysisProject, SitePageRecord, JinaExtraction)
// - types/contentGeneration.ts - Content generation V2 types
// - types/contentTemplates.ts - Content template routing types
// - types/social.ts - Social media publishing types (campaigns, posts, compliance)

// FIX: Corrected import path for database types to be a relative path, fixing module resolution error.
import { Json } from './database.types';
// FIX: Export KnowledgeGraph to be available for other modules.
export { KnowledgeGraph } from './lib/knowledgeGraph';
// Import types needed for ContentBrief template fields
import { TemplateName, DepthMode } from './types/contentTemplates';
import { BriefChangeLogEntry, BriefGenerationSummary } from './types/content';

// Re-export from domain modules for backward compatibility
export * from './types/core';
export * from './types/business';
export * from './types/semantic';
export * from './types/content';
export * from './types/audit';
export * from './types/schema';
export * from './types/publication';
export * from './types/navigation';
export * from './types/migration';
export * from './types/siteAnalysis';
export * from './types/contentGeneration';
export * from './types/contentTemplates';
export * from './types/competitiveIntelligence';
export * from './types/wordpress';
export * from './types/organization';
export * from './types/social';
export * from './types/contextualEditor';
export * from './types/quotation';
export * from './types/designDna';
export * from './types/entityHealth';
export * from './types/brandExtraction';
export * from './types/catalog';

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
  ADMIN, // Admin Dashboard
  QUALITY_DEMO, // Quality Enforcement Demo Page
  QUOTATION // SEO Quotation Tool
}

export type WebsiteType =
  | 'ECOMMERCE' | 'SAAS' | 'SERVICE_B2B' | 'INFORMATIONAL' | 'AFFILIATE_REVIEW'
  | 'LEAD_GENERATION' | 'REAL_ESTATE' | 'MARKETPLACE' | 'RECRUITMENT'
  | 'HEALTHCARE' | 'EDUCATION' | 'HOSPITALITY' | 'EVENTS'
  | 'NEWS_MEDIA' | 'DIRECTORY' | 'COMMUNITY' | 'NONPROFIT';

// Website type metadata for UI and AI guidance
export const WEBSITE_TYPE_CONFIG: Record<WebsiteType, {
  label: string;
  description: string;
  coreSectionFocus: string;
  authorSectionFocus: string;
  keyAttributes: string[];
}> = {
  // === COMMERCIAL / TRANSACTIONAL ===
  ECOMMERCE: {
    label: 'E-commerce',
    description: 'Online stores selling products with product taxonomy and shopping intent',
    coreSectionFocus: 'Product categories, buying guides, comparisons',
    authorSectionFocus: 'Industry trends, educational content, brand story',
    keyAttributes: ['price', 'specifications', 'availability', 'reviews', 'variants']
  },
  SAAS: {
    label: 'SaaS / Software',
    description: 'Software-as-a-service with user role segmentation and feature-focused content',
    coreSectionFocus: 'Features, use cases, integrations, pricing',
    authorSectionFocus: 'Industry insights, best practices, tutorials',
    keyAttributes: ['features', 'pricing_tiers', 'integrations', 'user_roles', 'security']
  },
  MARKETPLACE: {
    label: 'Marketplace / Classifieds',
    description: 'User-generated listings with two-sided network of buyers and sellers',
    coreSectionFocus: 'Category pages, trending listings, seller profiles, quality guides',
    authorSectionFocus: 'Market insights, selling tips, fraud prevention, negotiation guides',
    keyAttributes: ['category', 'condition', 'price', 'location', 'seller_rating', 'item_specifics']
  },
  EVENTS: {
    label: 'Events / Ticketing',
    description: 'Time-bound events with urgency signals and performer/venue focus',
    coreSectionFocus: 'Event pages, performer profiles, venue info, ticket pricing',
    authorSectionFocus: 'Artist news, event previews, venue reviews, what-to-expect guides',
    keyAttributes: ['event_type', 'date', 'venue', 'performer', 'ticket_price', 'availability', 'genre']
  },

  // === LEAD GENERATION / LOCAL ===
  SERVICE_B2B: {
    label: 'Service / B2B',
    description: 'Professional services with deep expertise and scientific-style content',
    coreSectionFocus: 'Service offerings, case studies, expertise areas',
    authorSectionFocus: 'Thought leadership, research, industry analysis',
    keyAttributes: ['methodology', 'credentials', 'case_studies', 'process', 'outcomes']
  },
  LEAD_GENERATION: {
    label: 'Lead Generation / Local',
    description: 'Local services focused on generating inquiries, quotes, and appointments',
    coreSectionFocus: 'Service pages, location pages, pricing guides, project galleries',
    authorSectionFocus: 'Local tips, maintenance guides, seasonal advice, DIY tutorials',
    keyAttributes: ['service_type', 'service_area', 'availability', 'pricing_model', 'reviews', 'credentials', 'response_time']
  },
  REAL_ESTATE: {
    label: 'Real Estate / Property',
    description: 'Property listings for sale or rent with location-based search and lead generation',
    coreSectionFocus: 'Property listings, neighborhood guides, market analysis, buying/renting guides',
    authorSectionFocus: 'Market trends, investment insights, relocation guides, mortgage tips',
    keyAttributes: ['property_type', 'location', 'price', 'sqft', 'bedrooms', 'bathrooms', 'amenities', 'year_built']
  },
  HEALTHCARE: {
    label: 'Healthcare / Medical',
    description: 'Medical practices with high E-A-T requirements and patient education focus',
    coreSectionFocus: 'Condition guides, treatment options, provider profiles, appointment booking',
    authorSectionFocus: 'Medical research, wellness tips, preventive care, patient stories',
    keyAttributes: ['condition', 'treatment', 'provider_credentials', 'insurance_accepted', 'success_rate']
  },
  HOSPITALITY: {
    label: 'Hospitality / Travel',
    description: 'Accommodation and travel with real-time availability and booking focus',
    coreSectionFocus: 'Property pages, destination guides, amenity comparisons, booking info',
    authorSectionFocus: 'Travel guides, local tips, seasonal recommendations, packing guides',
    keyAttributes: ['property_type', 'nightly_rate', 'capacity', 'amenities', 'availability', 'guest_reviews']
  },

  // === CONTENT / INFORMATIONAL ===
  INFORMATIONAL: {
    label: 'Blog / Informational',
    description: 'Content-focused sites with query-driven topics and unique information gain',
    coreSectionFocus: 'Cornerstone content, comprehensive guides',
    authorSectionFocus: 'Trending topics, news, community content',
    keyAttributes: ['expertise_level', 'freshness', 'comprehensiveness', 'uniqueness']
  },
  AFFILIATE_REVIEW: {
    label: 'Affiliate / Review',
    description: 'Product reviews and comparisons with commerce-like structure and trust signals',
    coreSectionFocus: 'Product reviews, comparisons, buying guides',
    authorSectionFocus: 'Industry news, trends, how-to content',
    keyAttributes: ['rating', 'pros_cons', 'price_comparison', 'alternatives', 'verdict']
  },
  NEWS_MEDIA: {
    label: 'News / Media',
    description: 'Journalism and news with freshness signals and source attribution focus',
    coreSectionFocus: 'Breaking news, category archives, investigations, exclusives',
    authorSectionFocus: 'Analysis, opinion, expert interviews, trend reports',
    keyAttributes: ['article_type', 'publish_date', 'author', 'source', 'category', 'update_frequency']
  },
  EDUCATION: {
    label: 'Education / Courses',
    description: 'Online courses and educational content with credential and outcome focus',
    coreSectionFocus: 'Course pages, curriculum, instructor profiles, career outcomes',
    authorSectionFocus: 'Industry trends, skill guides, career advancement, learning tips',
    keyAttributes: ['course_level', 'duration', 'price', 'credential', 'completion_rate', 'job_placement']
  },

  // === SPECIALIZED / NICHE ===
  RECRUITMENT: {
    label: 'Recruitment / Jobs',
    description: 'Job listings and career resources connecting employers with candidates',
    coreSectionFocus: 'Job listings, company profiles, salary guides, skill requirements',
    authorSectionFocus: 'Career tips, resume guides, interview prep, industry trends',
    keyAttributes: ['job_type', 'seniority', 'salary_range', 'location', 'skills', 'experience_level', 'remote_options']
  },
  DIRECTORY: {
    label: 'Directory / Listings',
    description: 'Aggregated listings and reviews with curation and discovery focus',
    coreSectionFocus: 'Entity pages, category pages, top-rated lists, comparison pages',
    authorSectionFocus: 'Category analysis, trend reports, methodology, quality standards',
    keyAttributes: ['entity_type', 'category', 'location', 'rating', 'review_count', 'verification_status']
  },
  COMMUNITY: {
    label: 'Community / Forum',
    description: 'User discussions and Q&A with community consensus and reputation systems',
    coreSectionFocus: 'Popular threads, category hubs, best answers, user profiles',
    authorSectionFocus: 'Moderator insights, community trends, meta discussions, guidelines',
    keyAttributes: ['thread_type', 'category', 'author_reputation', 'response_count', 'solution_flag']
  },
  NONPROFIT: {
    label: 'Nonprofit / Charity',
    description: 'Mission-driven organizations with impact metrics and transparency focus',
    coreSectionFocus: 'Mission pages, impact reports, donation options, volunteer opportunities',
    authorSectionFocus: 'Cause updates, beneficiary stories, research, advocacy',
    keyAttributes: ['cause_area', 'impact_metrics', 'donation_type', 'overhead_ratio', 'tax_status']
  }
};

export type StylometryType = 'ACADEMIC_FORMAL' | 'DIRECT_TECHNICAL' | 'PERSUASIVE_SALES' | 'INSTRUCTIONAL_CLEAR';

// ============================================================================
// KNOWLEDGE PANEL (KP) TYPES
// ============================================================================

/**
 * Seed source entry for tracking external authoritative sources
 * that confirm entity facts for Knowledge Panel building
 */
export interface SeedSourceEntry {
  name: string;
  url: string;
  verified?: boolean;
}

/**
 * Seed Source Category for Knowledge Panel corroboration
 * Based on Kalicube's methodology for building entity credibility
 */
export type SeedSourceCategory =
  | 'authority'      // Wikipedia, Wikidata - highest trust
  | 'business'       // Crunchbase, LinkedIn, GBP
  | 'social'         // YouTube, Twitter, Instagram, Facebook
  | 'developer'      // GitHub, GitLab, npm, PyPI
  | 'industry'       // Industry directories, review sites
  | 'media';         // Podcast directories, press mentions

/**
 * Seed Source Definition for Knowledge Panel optimization
 * Defines sources that contribute to entity corroboration
 */
export interface SeedSourceDefinition {
  id: string;
  name: string;
  category: SeedSourceCategory;
  icon: string;
  createUrl: string;
  kpWeight: number;             // Importance for Knowledge Panel (1-10)
  entityTypes: string[];        // Which entity types this applies to
  verificationMethod?: string;  // How Google verifies this source
}

/**
 * Entity Identity for Knowledge Panel strategy
 * Defines the core identity attributes needed for KP eligibility
 */
export interface EntityIdentity {
  legalName: string;                    // Official registered name
  foundedYear?: number;                 // Year established
  headquartersLocation?: string;        // City, Country
  founderOrCEO: string;                 // Key person for E-A-T
  founderCredential?: string;           // Their primary credential
  primaryAttribute: string;             // Desired KP subtitle (e.g., "SEO Agency", "Dentist")
  secondaryAttributes?: string[];       // Backup subtitles
  existingSeedSources: {
    // Authority sources (highest KP weight)
    wikipedia?: string;                 // URL if exists
    wikidata?: string;                  // QID if exists (e.g., "Q12345")
    // Business sources
    crunchbase?: string;                // URL if exists
    linkedinCompany?: string;           // URL if exists
    googleBusinessProfile?: boolean;    // Claimed or not
    // Social sources (corroborative)
    youtube?: string;                   // Channel URL
    twitter?: string;                   // Profile URL (X)
    instagram?: string;                 // Profile URL
    facebook?: string;                  // Page URL
    // Developer sources
    github?: string;                    // Organization/user URL
    // Industry directories (custom entries)
    industryDirectories?: SeedSourceEntry[];
  };
  brandSearchDemand?: number;           // Monthly branded searches (from GSC/tools)
  brandSearchDemandTarget?: number;     // Target monthly branded searches
}

/**
 * KP Metadata for SemanticTriple
 * Tracks which EAVs contribute to Knowledge Panel building
 */
export interface KPMetadata {
  isFactual: boolean;                   // Declarative fact vs opinion
  isKPEligible: boolean;                // User-flagged for KP strategy
  seedSourcesRequired: string[];        // Which sources should confirm this fact
  seedSourcesConfirmed: string[];       // Which sources already confirm this fact
  consensusScore: number;               // 0-100 based on source agreement
  generatedStatement?: string;          // Auto-generated declarative sentence
}

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
  region?: string; // Geographic region (e.g., "Netherlands", "United States")
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
  offerings?: string[]; // List of services/products offered by the business

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

  // Image Generation & Brand Kit
  brandKit?: BrandKit;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryUploadPreset?: string;
  markupGoApiKey?: string;

  // Content Fetching (Audit System)
  auditScrapingProvider?: 'jina' | 'firecrawl' | 'direct';
  auditScrapingFallback?: boolean;

  // Entity Authority & Knowledge Graph
  googleKnowledgeGraphApiKey?: string;

  // Knowledge Panel Strategy
  entityIdentity?: EntityIdentity;

  // Developer/Admin Settings
  verboseLogging?: boolean; // When true, shows detailed console logs during content generation
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
export type AttributeCategory = 'CORE_DEFINITION' | 'SEARCH_DEMAND' | 'COMPETITIVE_EXPANSION' | 'COMPOSITE' | 'UNIQUE' | 'ROOT' | 'RARE' | 'COMMON' | 'UNCLASSIFIED'; // Including legacy types for compatibility
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
      id?: string;  // Optional unique identifier
  };
  predicate: {
      relation: string;
      type: string;
      category?: AttributeCategory; // Research-based classification
      classification?: AttributeClass;
  };
  object: {
      value: string | number;
      type: string;
      unit?: string;
      truth_range?: string;
  };
  metadata?: AttributeMetadata; // Deep metadata for EAV
  lexical?: {
      synonyms?: string[];    // Alternative terms for the object value
      antonyms?: string[];    // Opposite/contrasting concepts
      hypernyms?: string[];   // Broader category terms
  };
  kpMetadata?: KPMetadata;    // Knowledge Panel contribution tracking

  // Backwards-compatible flat accessors for legacy code
  entity?: string;             // Alias for subject.label
  attribute?: string;          // Alias for predicate.relation
  value?: string | number;     // Alias for object.value
  context?: string;            // Additional context string
  category?: AttributeCategory; // Alias for predicate.category
  classification?: AttributeClass; // Alias for predicate.classification

  // Additional metadata
  source?: string;             // Source of the triple (e.g., 'manual', 'ai-generated')
  confidence?: number;         // Confidence score 0-1
}

export enum FreshnessProfile {
  EVERGREEN = 'EVERGREEN',
  STANDARD = 'STANDARD',
  FREQUENT = 'FREQUENT',
  TIME_SENSITIVE = 'TIME_SENSITIVE', // For time-critical content
  FAST = 'FAST',                     // For rapidly changing topics
}

export type ExpansionMode = 'ATTRIBUTE' | 'ENTITY' | 'CONTEXT' | 'FRAME' | 'CHILD';

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

  // Typed metadata container (see TopicMetadata in types/content.ts)
  metadata?: Record<string, unknown>;

  // Backwards-compatible properties for legacy code
  response_code?: ResponseCode | string; // Response format code
  target_url?: string;                   // Target URL for the topic
  keywords?: string[];                   // Associated keywords
  search_intent?: string;                // Search intent (informational, transactional, etc)
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

export type FormatCode = 'FS' | 'PAA' | 'LISTING' | 'DEFINITIVE' | 'TABLE' | 'PROSE';
export type ContentZone = 'MAIN' | 'SUPPLEMENTARY';

export interface BriefSection {
    key?: string; // Section identifier (e.g., 'section-0', 'section-1')
    heading: string;
    section_heading?: string; // Alias for heading (backward compatibility)
    level: number;
    heading_level?: number; // Alias for level (used by compliance scoring)
    order?: number; // Position in article

    // Content type for format matching
    format?: string; // Legacy alias for format_code
    content_type?: string; // Content type hint

    // NEW: Content Brief Codes
    format_code?: FormatCode;

    // NEW: Attribute classification for ordering
    attribute_category?: AttributeCategory; // Uses existing type: 'ROOT' | 'UNIQUE' | 'RARE' | 'COMMON'

    // NEW: Query priority from GSC/DataForSEO
    query_priority?: number;
    related_queries?: string[];

    // Existing fields (enhanced)
    subordinate_text_hint?: string; // Instructions for the first sentence
    methodology_note?: string; // Formatting instructions

    // NEW: Required phrases from ["..."] codes
    required_phrases?: string[];

    // NEW: Internal linking targets
    anchor_texts?: { phrase: string; target_topic_id?: string }[];

    // NEW: Section classification
    content_zone?: ContentZone;

    subsections?: BriefSection[]; // Nested subsections (H3s under H2s)

    // EAV-to-section mapping
    mapped_eavs?: number[];  // Indices of SemanticTriple[] that this section covers

    // Backwards-compatible properties for legacy code
    key_points?: string[];        // Key points for this section
    content_brief?: string;       // Brief description of section content
}

// === Rules Engine Types ===

export interface ValidationViolation {
  rule: string;
  text: string;
  position: number;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
}

export interface RulesValidationResult {
  passed: boolean;
  violations: ValidationViolation[];
  fixInstructions: string;
}

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
  isZoneTransition: boolean;         // True if crossing MAIN→SUPPLEMENTARY boundary

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

export interface VisualSemantics {
    type: 'INFOGRAPHIC' | 'CHART' | 'PHOTO' | 'DIAGRAM';
    description: string;
    caption_data: string; // Data points or specific caption text
    height_hint?: string;
    width_hint?: string;
}

/**
 * Maps image placement to specific entity mentions in content.
 * Framework: "Images anchored to entity mentions"
 */
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

// Image Generation Types
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

export type ImageStyle = 'photorealistic' | 'illustration' | 'cartoon' | 'minimal' | 'artistic' | 'technical';
export type ImageProviderPreference = 'auto' | 'markupgo' | 'gemini' | 'dall-e';

export interface ImageGenerationSettings {
  preferredStyle: ImageStyle;
  preferredProvider: ImageProviderPreference;
  customInstructions?: string; // Additional prompt instructions for all images
  sizeOverrides?: {
    HERO?: { width: number; height: number };
    SECTION?: { width: number; height: number };
    INFOGRAPHIC?: { width: number; height: number };
    CHART?: { width: number; height: number };
    DIAGRAM?: { width: number; height: number };
  };
}

export interface BrandKit {
  logo?: {
    url: string;
    cloudinaryId?: string;
  };
  logoPlacement: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  logoOpacity: number;
  colors: {
    primary: string;
    secondary: string;
    textOnImage: string;
    overlayGradient?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  copyright: {
    holder: string;
    licenseUrl?: string;
  };
  heroTemplates: HeroTemplate[];
  markupGoDefaultTemplateId?: string; // Default MarkupGo template ID for this topical map
  imageGeneration?: ImageGenerationSettings; // Image generation preferences
}

export interface HeroTemplate {
  id: string;
  name: string;
  description: string;
  markupGoTemplateId?: string;
  style: {
    textPosition: 'center' | 'bottom-left' | 'bottom-center' | 'top-center';
    hasGradientOverlay: boolean;
    hasSubtitle: boolean;
    backgroundColor?: string;
  };
  preview?: string;
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
  suggested_internal_links?: { anchor: string; target_topic_id?: string; url?: string; anchor_text?: string; title?: string }[];
  schema_suggestions?: Record<string, unknown>[];

  // Backwards-compatible properties for legacy code
  topic?: string;           // Legacy: same as title
  description?: string;     // Legacy: brief description
  freshness?: FreshnessProfile | string; // Legacy: freshness profile
  suggested_h1?: string;    // Legacy: suggested H1 headline
  response_code?: ResponseCode | string; // Legacy: response format code
  topic_class?: 'monetization' | 'informational'; // Legacy: topic classification

  // Content length recommendation
  suggestedLengthPreset?: 'minimal' | 'short' | 'standard' | 'comprehensive';
  suggestedLengthReason?: string;

  // Competitor-derived specifications (from enhanced brief generation)
  competitorSpecs?: {
    dataQuality: 'high' | 'medium' | 'low' | 'none';
    analysisDate: string;
    competitorsAnalyzed: number;
    targetWordCount: number;
    wordCountRange: { min: number; max: number };
    wordCountConfidence: 'high' | 'medium' | 'low';
    targetImageCount: number;
    recommendedImageTypes: string[];
    hasVideoPercentage: number;
    requiredSchemaTypes: string[];
    schemaPresencePercentage: number;
    avgH2Count: number;
    avgH3Count: number;
    dominantContentTemplate: string;
    dominantAudienceLevel: string;
    requiredTopics: string[];
    differentiationTopics: string[];
    rootAttributes: { attribute: string; coverage: number }[];
    rareAttributes: { attribute: string; coverage: number }[];
    benchmarks: {
      topCompetitorWordCount: number;
      avgCompetitorWordCount: number;
      topCompetitorImageCount: number;
    };
    warnings: string[];
  };

  // Template routing fields (Task 12 - Brief Sync Mechanism)
  /** Selected template name */
  selectedTemplate?: TemplateName;

  /** Template selection confidence from AI */
  templateConfidence?: number;

  /** User-selected depth mode */
  depthMode?: DepthMode;

  /** Resolved conflict choice */
  conflictResolution?: 'template' | 'brief' | 'merge';

  // Ecommerce category page context (product catalog data for content grounding)
  categoryContext?: import('./types/catalog').CategoryPageContext;

  /** Changes made during content generation */
  generation_changes?: BriefChangeLogEntry[];
  /** Summary of generation changes */
  generation_summary?: BriefGenerationSummary;
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

// =============================================================================
// PUBLICATION PLANNING & TRACKING TYPES
// =============================================================================

/** Publication status workflow */
export type PublicationStatus =
  | 'not_started'
  | 'brief_ready'
  | 'draft_in_progress'
  | 'draft_ready'
  | 'in_review'
  | 'scheduled'
  | 'published'
  | 'needs_update';

/** Publication phase based on semantic SEO guidelines */
export type PublicationPhase =
  | 'phase_1_authority'    // Batch publish 20-60 topics (monetization + pillars)
  | 'phase_2_support'      // 3-7/week (remaining monetization + high-priority informational)
  | 'phase_3_expansion'    // 2-5/week (informational with RARE/UNIQUE EAVs)
  | 'phase_4_longtail';    // 1-2/week (remaining topics)

/** Priority level for publication ordering */
export type PublicationPriority = 'critical' | 'high' | 'medium' | 'low';

/** Per-topic publication planning data (stored in EnrichedTopic.metadata.publication_plan) */
export interface TopicPublicationPlan {
  // Dates
  optimal_publication_date?: string;   // AI calculated (ISO date)
  actual_publication_date?: string;    // When actually published
  scheduled_date?: string;             // User-set scheduled date

  // Status & Phase
  status: PublicationStatus;
  status_override?: PublicationStatus; // Manual override of auto-detected status
  phase: PublicationPhase;

  // Priority
  priority: PublicationPriority;
  priority_score?: number;             // 0-100 calculated score

  // Dependencies
  dependencies?: string[];             // Topic IDs that must be published first

  // Performance tracking
  baseline_snapshot_id?: string;       // Reference to baseline performance snapshot

  // User notes
  notes?: string;
}

/** Performance snapshot from GSC CSV import */
export interface PerformanceSnapshot {
  id: string;
  topic_id: string;
  map_id: string;
  user_id: string;

  // Capture metadata
  captured_at: string;                 // ISO timestamp
  capture_source: 'csv_import';
  is_baseline: boolean;                // First import becomes baseline

  // GSC metrics
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_ctr: number;                     // Click-through rate (0-1)
  gsc_position: number;                // Average position

  // Delta from baseline (calculated)
  delta_clicks?: number;
  delta_impressions?: number;
  delta_ctr?: number;
  delta_position?: number;
}

/** Priority calculation breakdown (100 points max) */
export interface PriorityScoreBreakdown {
  structural: {
    total: number;                     // Max 35
    core_type: number;                 // +15 for core topics
    pillar_role: number;               // +10 for pillar topics
    monetization: number;              // +10 for monetization class
  };
  semantic: {
    total: number;                     // Max 30
    unique_eavs: number;               // +8 each (max 16)
    rare_eavs: number;                 // +4 each (max 8)
    root_eavs: number;                 // +2 each (max 4)
    common_eavs: number;               // +0.5 each (max 2)
  };
  dependency: {
    total: number;                     // Max 20
    has_children: number;              // +10 if has children
    root_level: number;                // +10 if root/pillar
    depth_penalty: number;             // -2 per level deep
  };
  seasonal: {
    total: number;                     // Max 15
    timing_score: number;              // Based on freshness profile
  };
}

/** Planning generation result from AI service */
export interface PublicationPlanResult {
  topics: Array<{
    topic_id: string;
    phase: PublicationPhase;
    priority: PublicationPriority;
    priority_score: number;
    priority_breakdown: PriorityScoreBreakdown;
    optimal_publication_date: string;
    dependencies: string[];
  }>;
  summary: {
    phase_1_count: number;
    phase_2_count: number;
    phase_3_count: number;
    phase_4_count: number;
    total_duration_weeks: number;
    batch_launch_date: string;
  };
}

/** Filters for planning dashboard views */
export interface PlanningFilters {
  status?: PublicationStatus[];
  phase?: PublicationPhase[];
  priority?: PublicationPriority[];
  topic_type?: ('core' | 'outer' | 'child')[];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface AuditRuleResult {
    ruleName: string;
    isPassing: boolean;
    details: string;
    remediation?: string; // The suggested fix for the AI re-generation loop
    affectedTextSnippet?: string; // The specific sentence/paragraph failing the rule
    score?: number; // Optional numeric score (0-100) for rules that provide granular quality metrics
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
    // Computed fields for UI display
    overallScore?: number; // Computed 0-100 score
    algorithmicResults?: AuditRuleResult[]; // Alias for frameworkRules for backward compatibility
}

// Legacy schema result (kept for backward compatibility)
// Note: schema can be string (JSON-LD string) or object (when AI response is parsed as JSON)
export interface SchemaGenerationResult {
    schema: string | object;
    reasoning: string;
}

// =============================================================================
// SCHEMA GENERATION TYPES (Pass 9 - Comprehensive JSON-LD Generation)
// =============================================================================

// Page type detection for schema selection
export type SchemaPageType =
  | 'HomePage'
  | 'Article'
  | 'BlogPosting'
  | 'NewsArticle'
  | 'Product'
  | 'ProfilePage'      // Author profile
  | 'CollectionPage'   // Category/tag page
  | 'FAQPage'
  | 'HowTo'
  | 'WebPage';         // Generic fallback

// Entity type for resolution
export type SchemaEntityType = 'Person' | 'Organization' | 'Place' | 'Thing' | 'Event' | 'CreativeWork';

// Resolved external entity (Wikidata/Wikipedia)
export interface ResolvedEntity {
  id?: string;
  name: string;
  type: SchemaEntityType;
  wikidataId?: string;
  wikipediaUrl?: string;
  sameAs: string[];
  description?: string;
  properties: Record<string, unknown>;
  confidenceScore: number;
  source: 'wikidata' | 'ai_inferred' | 'user_provided' | 'pattern_inference';
  lastVerifiedAt?: string;
  // Extended from EntityCandidate after resolution
  role?: 'subject' | 'author' | 'publisher' | 'mentioned' | 'about';
  isMainEntity?: boolean;
}

// Entity candidate extracted from content
export interface EntityCandidate {
  name: string;
  type: SchemaEntityType;
  context: string;        // Surrounding text for disambiguation
  mentions: number;       // How many times mentioned
  isMainEntity: boolean;  // Is this the central entity of the content
  role: 'subject' | 'author' | 'publisher' | 'mentioned' | 'about';
}

// Validation error in schema
export interface SchemaValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  category: 'syntax' | 'schema_org' | 'content_parity' | 'eav_consistency' | 'entity' | 'freshness';
  suggestion?: string;
  autoFixable: boolean;
}

// Validation warning
export interface SchemaValidationWarning {
  path: string;
  message: string;
  recommendation: string;
  category: string;
}

// Full schema validation result
export interface SchemaValidationResult {
  isValid: boolean;
  overallScore: number;  // 0-100

  // Categorized errors
  syntaxErrors: SchemaValidationError[];
  schemaOrgErrors: SchemaValidationError[];
  contentParityErrors: SchemaValidationError[];
  eavConsistencyErrors: SchemaValidationError[];
  entityErrors: SchemaValidationError[];

  // Warnings
  warnings: SchemaValidationWarning[];

  // Auto-fix tracking
  autoFixApplied: boolean;
  autoFixChanges: string[];
  autoFixIterations: number;

  // External validation (optional)
  externalValidationRun: boolean;
  externalValidationResult?: {
    source: string;
    isValid: boolean;
    errors: string[];
  };
}

// Progressive schema data collected during passes 1-8
export interface ProgressiveSchemaData {
  // From Pass 1 (Draft Generation)
  mainEntity?: string;
  headline?: string;
  description?: string;
  wordCount?: number;
  sections?: Array<{
    name: string;
    about: string;
    order: number;
  }>;

  // From Pass 3 (Lists & Tables)
  hasPart?: Array<{
    type: 'ItemList' | 'HowToStep' | 'FAQPage' | 'Table';
    name?: string;
    items: unknown[];
  }>;

  // From Pass 4 (Visual Semantics)
  images?: Array<{
    description: string;
    caption: string;
    contentUrl?: string;
    altText?: string;
  }>;

  // From Pass 5 (Micro Semantics)
  keywords?: string[];
  entities?: string[];

  // From Pass 7 (Introduction)
  abstractText?: string;

  // From Pass 8 (Audit)
  qualityScore?: number;
  readabilityScore?: number;

  // Collection metadata
  lastUpdatedAt?: string;
  passesContributed?: number[];
}

// Pass 9 configuration
export interface Pass9Config {
  pageType?: SchemaPageType;        // Override auto-detection
  includeEntities: boolean;         // Resolve external entities
  maxEntityResolutions: number;     // Limit API calls
  validationLevel: 'basic' | 'standard' | 'strict';
  autoFix: boolean;                 // Apply auto-fixes
  maxAutoFixIterations: number;     // Max fix iterations
  externalValidation: boolean;      // Use external validators
  includeOrganizationSchema: boolean;
  includeAuthorSchema: boolean;
  includeBreadcrumb: boolean;
  includeWebPage: boolean;
}

// Default Pass 9 configuration
export const DEFAULT_PASS9_CONFIG: Pass9Config = {
  includeEntities: true,
  maxEntityResolutions: 10,
  validationLevel: 'standard',
  autoFix: true,
  maxAutoFixIterations: 3,
  externalValidation: false,
  includeOrganizationSchema: true,
  includeAuthorSchema: true,
  includeBreadcrumb: true,
  includeWebPage: true
};

// Enhanced schema generation result
export interface EnhancedSchemaResult {
  // The generated schema
  schema: object;              // The full JSON-LD @graph
  schemaString: string;        // Stringified for display/export

  // Metadata
  pageType: SchemaPageType;
  detectedPageType: SchemaPageType;  // What was auto-detected
  pageTypeOverridden: boolean;

  // Entity resolution
  resolvedEntities: ResolvedEntity[];
  entityCandidates: EntityCandidate[];
  entitiesSkipped: string[];   // Entities that couldn't be resolved

  // Validation
  validation: SchemaValidationResult;

  // Generation metadata
  reasoning: string;           // AI reasoning for schema choices
  generatedAt: string;
  version: number;
  configUsed: Pass9Config;

  // Rich result eligibility
  richResultTypes: string[];   // Eligible rich result types
  richResultWarnings: string[];
}

// Site-wide schema entity (Organization, Author defined once)
export interface SiteSchemaEntity {
  id: string;
  mapId: string;
  entityType: 'Organization' | 'Person' | 'WebSite';
  entityId: string;           // The @id value (e.g., "#organization")
  schemaData: object;         // Full schema JSON
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// Schema template structure
export interface SchemaTemplate {
  type: SchemaPageType;
  requiredProperties: string[];
  recommendedProperties: string[];
  optionalProperties: string[];
  nestedTypes: Record<string, string[]>;  // Nested schema types and their properties
}

// Schema @id reference
export interface SchemaIdReference {
  '@type': string;
  '@id': string;
}

// Entity resolution cache entry
export interface EntityCacheEntry {
  id: string;
  userId: string;
  entityName: string;
  entityType: SchemaEntityType;
  wikidataId?: string;
  wikipediaUrl?: string;
  resolvedData?: Record<string, unknown>;
  sameAsUrls: string[];
  confidenceScore: number;
  resolutionSource: 'wikidata' | 'ai_inferred' | 'user_provided' | 'pattern_inference';
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
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
    organization_id?: string;
    api_key_mode?: 'inherit' | 'byok';
    map_count?: number; // Populated via subquery when fetching projects
    last_activity?: string | null; // Most recent updated_at from related topical_maps
}

/** Extended Project interface for admin management (includes user info) */
export interface AdminProject extends Project {
    user_id: string;
    user_email: string;
    map_count: number;
    updated_at: string;
}

export interface TopicalMap {
    id: string;
    project_id: string;
    name: string;
    map_name?: string; // Alias for name (for DB compatibility)
    domain?: string;
    created_at: string;
    user_id?: string;
    business_info?: Partial<BusinessInfo>;
    pillars?: SEOPillars;
    eavs?: SemanticTriple[];
    competitors?: string[];
    topics?: EnrichedTopic[];
    briefs?: Record<string, ContentBrief>;
    // Lightweight topic counts for UI display (merge modal, etc.)
    // Kept separate from topics array to not interfere with useMapData hydration
    topicCounts?: { core: number; outer: number; total: number };
    analysis_state?: {
        validationResult?: ValidationResult;
        semanticAnalysisResult?: SemanticAnalysisResult;
        contextualCoverageResult?: ContextualCoverageMetrics;
        internalLinkAuditResult?: InternalLinkAuditResult;
        topicalAuthorityScore?: TopicalAuthorityScore;
        publicationPlan?: PublicationPlan;
        gscOpportunities?: GscOpportunity[];
    };
    // Foundation pages generated for this map (Homepage, About, Contact, etc.)
    foundationPages?: FoundationPage[];
    // Navigation structure for this map
    navigation?: NavigationStructure;
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
  url?: string;
  title: string;
  description: string;
  content: string;
  headings: { level: number; text: string }[];
  links: { href: string; text: string; isInternal: boolean; position?: string }[];
  images: { src: string; alt: string }[];
  schema: any[];
  wordCount: number;
  readingTime: number;
  author?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
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

  // Markdown content (if extracted)
  markdown?: string;

  // Links
  internalLinks: { href: string; text: string; rel?: string; position?: string }[];
  externalLinks: { href: string; text: string; rel?: string }[];

  // Link counts (computed)
  internalLinkCount?: number;
  externalLinkCount?: number;

  // Content metrics
  wordCount?: number;

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

  // Publication status
  status?: 'draft' | 'published';

  metadata?: Record<string, unknown>;
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

  // Sticky header behavior
  sticky?: boolean;

  metadata?: Record<string, unknown>;
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

export type JobStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'audit_failed';
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type PassStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PassesStatus {
  // Correct 10-pass order: Intro synthesis AFTER body polish
  pass_1_draft: PassStatus;
  pass_2_headers: PassStatus;
  pass_3_lists: PassStatus;           // Lists & Tables (body only)
  pass_4_discourse: PassStatus;       // Discourse Integration (body only)
  pass_5_microsemantics: PassStatus;  // Micro Semantics (body only)
  pass_6_visuals: PassStatus;         // Visual Semantics (body only)
  pass_7_intro: PassStatus;           // Introduction Synthesis (AFTER body is polished)
  pass_8_polish: PassStatus;          // Final Polish (entire article)
  pass_9_audit: PassStatus;           // Final Audit
  pass_10_schema: PassStatus;         // Schema Generation
}

// Context passed to content generation passes
export interface ContentGenerationContext {
  pillars: {
    centralEntity: string;
    sourceContext: string;
    centralSearchIntent: string;
    primaryVerb?: string;
    auxiliaryVerb?: string;
  };
  eavs: SemanticTriple[];
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  topic: {
    id: string;
    title: string;
    type: 'core' | 'outer' | 'child';
    parentTopicId?: string;
    topicClass?: 'monetization' | 'informational';
  };
  topicalMap: {
    id: string;
    name: string;
    totalTopics: number;
    relatedTopics: Array<{ id: string; title: string; type: string }>;
  };
  knowledgeGraphTerms?: string[];
}

// Audit issue types for auto-fix capability
export type AuditIssueType =
  | 'missing_h1'
  | 'duplicate_h2'
  | 'missing_image'
  | 'broken_link'
  | 'section_too_short'
  | 'section_too_long'
  | 'missing_conclusion'
  | 'weak_intro'
  | 'missing_eav_coverage'
  | 'no_lists'
  | 'missing_transition'
  | 'header_hierarchy_jump'
  | 'poor_flow'
  | 'weak_conclusion';

export interface AuditIssue {
  id: string;
  type: AuditIssueType;
  severity: 'critical' | 'warning' | 'suggestion';
  sectionId?: string;
  sectionTitle?: string;
  description: string;
  currentContent?: string;
  suggestedFix?: string;
  autoFixable: boolean;
  fixApplied?: boolean;
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

  // Schema generation fields (Pass 10)
  schema_data: EnhancedSchemaResult | null;
  schema_validation_results: SchemaValidationResult | null;
  schema_entities: ResolvedEntity[] | null;
  schema_page_type: SchemaPageType | null;
  progressive_schema_data: ProgressiveSchemaData | null;

  // Image generation fields
  image_placeholders?: ImagePlaceholder[];

  // Audit auto-fix support
  audit_issues?: AuditIssue[];

  // Quality enforcement report (comprehensive quality data)
  quality_report?: QualityReport | null;

  // Quality warning message (from strategy validation)
  quality_warning?: string | null;

  // Structural snapshots for tracking changes across passes
  structural_snapshots?: Record<string, unknown>;

  // Pass quality scores for tracking quality trends
  pass_quality_scores?: Record<string, number>;

  // Audit auto-retry count (max 1 auto-retry before manual intervention)
  audit_retry_count?: number;
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
  // Semantic Compliance Score (target >= 85%)
  complianceScore?: {
    overall: number;
    passed: boolean;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: {
      eavCoverage: number;
      contextualFlow: number;
      anchorDiversity: number;
      formatCompliance: number;
      schemaCompleteness: number;
      visualHierarchy: number;
      centralEntityFocus: number;
      subordinateText: number;
      freshnessSignals: number;
    };
    issues: Array<{
      factor: string;
      severity: 'critical' | 'major' | 'minor';
      message: string;
      recommendation: string;
    }>;
    recommendations: string[];
  };
  // Cross-page EAV consistency check results (Knowledge-Based Trust)
  crossPageContradictions?: Array<{
    entity: string;
    attribute: string;
    currentValue: string;
    conflictingValue: string;
    conflictingArticle: { id: string; title: string };
  }>;
}

/**
 * Comprehensive quality report stored with content generation jobs.
 * This captures the full quality enforcement state including rule compliance,
 * violations, pass tracking, and systemic checks.
 */
export interface QualityReport {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Scores by rule category (A-S) */
  categoryScores: Record<string, number>;
  /** Rule violations found during generation */
  violations: Array<{
    rule: string;
    text: string;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
  }>;
  /** Pass-by-pass quality deltas */
  passDeltas: Array<{
    passNumber: number;
    rulesFixed: string[];
    rulesRegressed: string[];
    netChange: number;
  }>;
  /** Systemic/structural checks (word count, image balance, etc.) */
  systemicChecks: Array<{
    checkId: string;
    name: string;
    status: 'pass' | 'warning' | 'fail';
    value: string;
  }>;
  /** When this report was generated */
  generatedAt: string;
  /** The generation mode used (autonomous or supervised) */
  generationMode: 'autonomous' | 'supervised';
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
  pass_9_content: string | null;
  pass_10_content: string | null;  // Schema-related section content
  current_content: string | null;
  current_pass: number;
  audit_scores: Record<string, number>;
  status: SectionStatus;
  created_at: string;
  updated_at: string;
  // Per-pass versioning for rollback capability
  pass_contents?: Record<string, string>;
  // Section type for intro/conclusion filtering
  section_type?: 'introduction' | 'conclusion' | 'body';
}

export interface SectionDefinition {
  key: string;
  heading: string;
  level: number;
  order: number;
  subordinateTextHint?: string;
  methodologyNote?: string;
  /** Section type - intro/conclusion headings can be AI-generated */
  section_type?: 'introduction' | 'conclusion' | 'body';
  /** When true, AI should generate appropriate heading (not use pre-defined) */
  generateHeading?: boolean;
}

export const PASS_NAMES: Record<number, string> = {
  1: 'Draft Generation',
  2: 'Header Optimization',
  3: 'Lists & Tables',           // Body content polish starts
  4: 'Discourse Integration',
  5: 'Micro Semantics',
  6: 'Visual Semantics',         // Body content polish ends
  7: 'Introduction Synthesis',   // AFTER body polish - intro sees polished content
  8: 'Final Polish',             // Entire article polish
  9: 'Final Audit',
  10: 'Schema Generation'
};

// Total number of passes in the content generation pipeline
export const TOTAL_PASSES = 10;

// Passes that should exclude intro/conclusion sections
// Passes 2-5 process body content only; Pass 7 rewrites intro/conclusion with full polished body context
// NOTE: Pass 6 (Visual Semantics) is NOT excluded - it needs to add hero image to intro section
export const PASSES_EXCLUDE_INTRO_CONCLUSION = [2, 3, 4, 5];

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

// Alignment scores when checking content against user-defined CE/SC/CSI pillars
export interface AlignmentScores {
  ceAlignment: number;   // 0-100 alignment with defined Central Entity
  scAlignment: number;   // 0-100 alignment with defined Source Context
  csiAlignment: number;  // 0-100 alignment with defined Central Search Intent
  ceGap: string;         // Explanation of CE gap, or 'Aligned'
  scGap: string;         // Explanation of SC gap, or 'Aligned'
  csiGap: string;        // Explanation of CSI gap, or 'Aligned'
}

export interface SemanticAuditResult {
  overallScore: number;
  summary: string;
  coreEntities: CoreEntities;
  macroAnalysis: MacroAnalysis;
  microAnalysis: MicroAnalysis;
  actions: SemanticActionItem[];
  analyzedAt: string;
  alignmentScores?: AlignmentScores;  // Present when pillars are provided
}

// =============================================================================
// TOPICAL MAP MERGE TYPES
// =============================================================================

export type MergeWizardStep = 'select' | 'context' | 'eavs' | 'topics' | 'review';

export interface ContextConflict {
  field: string;
  values: { mapId: string; mapName: string; value: any }[];
  aiSuggestion: { value: any; reasoning: string } | null;
  resolution: 'mapA' | 'mapB' | 'ai' | 'custom' | null;
  customValue?: any;
}

export interface EavDecision {
  eavId: string;
  sourceMapId: string;
  action: 'include' | 'exclude' | 'merge';
  conflictWith?: string;
  resolvedValue?: string;
}

export interface TopicSimilarityResult {
  id: string;
  topicA: EnrichedTopic;
  topicB: EnrichedTopic;
  similarityScore: number;
  matchType: 'exact' | 'semantic' | 'parent_child';
  aiSuggestedAction: 'merge' | 'parent_child' | 'keep_separate';
  aiSuggestedTitle?: string;
  aiSuggestedParent?: string;
  reasoning: string;
}

export interface TopicMergeDecision {
  id: string;
  topicAId: string | null;
  topicBId: string | null;
  userDecision: 'merge' | 'keep_both' | 'keep_a' | 'keep_b' | 'delete' | 'pending';
  finalTitle: string;
  finalDescription: string;
  finalType: 'core' | 'outer' | 'child';
  finalParentId: string | null;
}

export interface MapMergeAnalysis {
  contextRecommendations: {
    field: string;
    recommendation: any;
    reasoning: string;
    confidence: number;
  }[];
  eavAnalysis: {
    unique: { mapId: string; eav: SemanticTriple }[];
    duplicates: { eavs: SemanticTriple[]; keep: SemanticTriple }[];
    conflicts: {
      subject: string;
      predicate: string;
      values: { mapId: string; value: any }[];
      recommendation: any;
      reasoning: string;
    }[];
  };
  topicSimilarities: TopicSimilarityResult[];
}

export interface ImportHistoryEntry {
  timestamp: string;
  filename: string;
  changes: {
    topicsAdded: number;
    topicsDeleted: number;
    topicsModified: number;
    decisionsChanged: number;
  };
}

export interface MapMergeState {
  step: MergeWizardStep;
  selectedMapIds: string[];
  sourceMaps: TopicalMap[];

  // Step 2: Context
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars | null;
  };
  contextConflicts: ContextConflict[];

  // Step 3: EAVs
  resolvedEavs: SemanticTriple[];
  eavDecisions: EavDecision[];

  // Step 4: Topics
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopic[];
  excludedTopicIds: string[];

  // Step 5: Review
  finalTopics: EnrichedTopic[];
  newMapName: string;

  // Import/Export
  importHistory: ImportHistoryEntry[];

  // Analysis state
  isAnalyzing: boolean;
  analysisError: string | null;
  isCreating: boolean;
}

// Export row for Excel/CSV
export interface MergeExportTopicRow {
  id: string;
  sourceMap: string;
  title: string;
  description: string;
  type: 'core' | 'outer' | 'child';
  parentTitle: string | null;
  mergeDecision: 'keep' | 'merge' | 'delete' | 'new';
  mergePartnerTitle: string | null;
  finalTitle: string | null;
  include: 'yes' | 'no';
  notes: string;
}

// Merge execution types
export interface MergeExecutionInput {
  sourceMaps: TopicalMap[];
  newMapName: string;
  projectId: string;
  userId: string;
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars | null;
  };
  resolvedEavs: SemanticTriple[];
  resolvedCompetitors: string[];
  topicDecisions: TopicMergeDecision[];
  excludedTopicIds: string[];
  newTopics: EnrichedTopic[];
}

export interface MergeExecutionResult {
  newMap: TopicalMap;
  topicsCreated: number;
  warnings: string[];
}

// ============================================
// Section-by-Section Optimization Types
// ============================================

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
    /** Target prose ratio (0.6-0.8 = 60-80% prose) */
    targetProseRatio: number;
  };
}

// ============================================
// NAVIGATION ENHANCEMENT TYPES
// ============================================

/**
 * TOC Entry for Table of Contents generation
 */
export interface TOCEntry {
  id: string;
  heading: string;
  level: number;
  slug: string;           // URL-safe #hash
  children: TOCEntry[];
}

/**
 * Generated Table of Contents result
 */
export interface GeneratedTOC {
  entries: TOCEntry[];
  htmlOutput: string;
  markdownOutput: string;
  passageHints: string[];
  totalHeadings: number;
  maxDepth: number;
}

/**
 * Hreflang entry for multilingual support
 */
export interface HreflangEntry {
  language: string;       // ISO 639-1 (e.g., 'en', 'nl', 'de')
  region?: string;        // ISO 3166-1 Alpha-2 (e.g., 'US', 'NL')
  url: string;
  isDefault?: boolean;
}

/**
 * Hreflang configuration for international SEO
 */
export interface HreflangConfig {
  enabled: boolean;
  entries: HreflangEntry[];
  defaultLanguage: string;
  validateSymmetry: boolean;
}

/**
 * Hreflang validation result
 */
export interface HreflangValidationResult {
  isValid: boolean;
  symmetryIssues: { sourceUrl: string; missingReturnLinks: string[] }[];
  duplicateIssues: string[];
  formatIssues: string[];
  suggestions: string[];
  score: number;
}

/**
 * DOM size estimation for navigation elements
 * Used for Cost of Retrieval optimization
 */
export interface NavigationDOMEstimate {
  estimatedNodes: number;
  breakdown: {
    headerNav: number;
    footerSections: number;
    legalLinks: number;
    napData: number;
    wrappers: number;
  };
  corScore: number;    // Cost of Retrieval (0-100, lower is better)
  status: 'optimal' | 'warning' | 'critical';
  recommendations: string[];
}

/**
 * N-gram analysis for navigation entity reinforcement
 */
export interface NavigationNGramAnalysis {
  linksWithCentralEntity: NavigationLink[];
  linksWithoutCentralEntity: NavigationLink[];
  entityReinforcement: number; // 0-100 score
  centralEntityWords: string[];
  suggestions: string[];
}

/**
 * Anchor text repetition analysis result
 */
export interface AnchorRepetitionResult {
  violations: {
    targetId: string;
    targetTitle: string;
    anchor: string;
    count: number;
    sources: string[];
    riskLevel: 'warning' | 'critical';
  }[];
  diversificationSuggestions: {
    currentAnchor: string;
    targetTitle: string;
    alternatives: string[];
  }[];
  overallScore: number;
  summary: string;
}

/**
 * Link bridge analysis for contextual navigation
 */
export interface LinkBridgeAnalysis {
  linkId: string;
  targetTopicId?: string;
  targetTitle: string;
  needsBridge: boolean;
  relevanceScore: number;
  suggestedBridge?: string;
  reasons: string[];
}

// ============================================================================
// QUERY NETWORK AUDIT TYPES
// For LLM-driven competitive analysis and content gap identification
// ============================================================================

/**
 * Query intent classification for SERP analysis
 */
export type QueryIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';

/**
 * A query within the network with metadata
 */
export interface QueryNetworkNode {
  query: string;
  intent: QueryIntent;
  searchVolume?: number;
  difficulty?: number;
  relatedQueries: string[];
  questions: string[];
}

/**
 * SERP competitor data for a single query
 */
export interface SerpCompetitorData {
  url: string;
  title: string;
  position: number;
  domain: string;
  wordCount?: number;
  headings?: { level: number; text: string }[];
  featuredSnippet?: boolean;
}

/**
 * EAV (Entity-Attribute-Value) extracted from competitor content
 */
export interface CompetitorEAV {
  entity: string;
  attribute: string;
  value: string;
  source: string; // URL where this was found
  confidence: number;
  category?: AttributeCategory;
}

/**
 * Information density metrics for a piece of content
 */
export interface InformationDensityScore {
  factsPerSentence: number;
  uniqueEntitiesCount: number;
  uniqueAttributesCount: number;
  totalEAVs: number;
  densityScore: number; // 0-100
  benchmark?: number; // Industry/competitor average
}

/**
 * Content gap identified through competitive analysis
 */
export interface ContentGap {
  missingAttribute: string;
  foundInCompetitors: string[]; // URLs where this attribute exists
  frequency: number; // How many competitors cover this
  priority: 'high' | 'medium' | 'low';
  suggestedContent?: string;
}

// ============================================
// Gap Network Visualization Types
// ============================================

/**
 * Node types for competitor gap network visualization
 */
export type GapNodeType = 'your_eav' | 'gap' | 'competitor_eav';

/**
 * Node in the competitor gap network graph
 * Represents either your EAVs (coverage) or gaps (missing content)
 */
export interface GapNode {
  id: string;
  type: GapNodeType;

  // For your_eav and competitor_eav
  entity?: string;
  attribute?: string;
  value?: string;

  // For gap nodes
  missingAttribute?: string;
  suggestedContent?: string;

  // Competitor coverage info
  competitorCount: number;        // How many competitors cover this
  competitorUrls: string[];       // Which competitor URLs have this

  // Visual properties
  label: string;                  // Display label
  priority: 'high' | 'medium' | 'low';

  // Physics simulation (populated during render)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;

  // Metrics
  semanticDistance?: number;      // Distance from central entity (0-1)
  relatedTopicIds?: string[];     // Topics that could address this gap
}

/**
 * Edge types for competitor gap network visualization
 */
export type GapEdgeType = 'semantic' | 'hierarchical' | 'suggested_bridge';

/**
 * Edge connecting nodes in the competitor gap network
 */
export interface GapEdge {
  id: string;
  source: string;                 // Source node ID
  target: string;                 // Target node ID
  type: GapEdgeType;

  // Semantic relationship strength (0-1, lower = more related)
  semanticDistance: number;

  // For suggested_bridge edges
  bridgeReason?: string;          // Why this connection is suggested

  // Visual weight for rendering
  weight: number;                 // 1-10, affects line thickness
}

/**
 * Complete competitor gap network data for visualization
 */
export interface CompetitorGapNetwork {
  nodes: GapNode[];
  edges: GapEdge[];

  // Aggregated metrics
  metrics: {
    totalGaps: number;
    highPriorityGaps: number;
    yourCoverage: number;         // Percentage of topics you cover (0-100)
    avgCompetitorCoverage: number; // Average competitor coverage count
    centralEntity: string;        // The focus entity
    competitors: string[];        // List of competitor domains analyzed
  };

  // Cluster information
  clusters?: {
    id: string;
    label: string;
    nodeIds: string[];
    centroidNodeId?: string;      // Most central node in cluster
  }[];
}

/**
 * Heading hierarchy analysis for a competitor page
 */
export interface HeadingHierarchy {
  url: string;
  headings: {
    level: number;
    text: string;
    wordCount: number;
  }[];
  hierarchyScore: number; // 0-100, how well-structured
  issues: string[];
}

/**
 * Complete Query Network analysis result
 */
export interface QueryNetworkAnalysisResult {
  seedKeyword: string;
  queryNetwork: QueryNetworkNode[];
  serpResults: Map<string, SerpCompetitorData[]>;
  competitorEAVs: CompetitorEAV[];
  ownContentEAVs?: CompetitorEAV[];
  contentGaps: ContentGap[];
  informationDensity: {
    own?: InformationDensityScore;
    competitorAverage: InformationDensityScore;
    topCompetitor: InformationDensityScore;
  };
  headingAnalysis: HeadingHierarchy[];
  recommendations: QueryNetworkRecommendation[];
  timestamp: string;
}

/**
 * Actionable recommendation from Query Network analysis
 */
export interface QueryNetworkRecommendation {
  type: 'content_gap' | 'density_improvement' | 'structure_fix' | 'new_topic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedQueries: string[];
  estimatedImpact: string;
  suggestedAction: string;
}

/**
 * Wikipedia entity verification result
 */
export interface WikipediaEntityResult {
  found: boolean;
  title?: string;
  extract?: string;
  pageUrl?: string;
  wikidataId?: string;
  categories?: string[];
  relatedEntities?: string[];
}

/**
 * Wikidata entity data
 */
export interface WikidataEntityResult {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
  claims?: Record<string, unknown>;
  sitelinks?: Record<string, string>;
}

/**
 * Google Knowledge Graph entity result
 */
export interface KnowledgeGraphEntityResult {
  id: string;
  name: string;
  type: string[];
  description?: string;
  detailedDescription?: {
    articleBody: string;
    url: string;
    license: string;
  };
  image?: {
    url: string;
    contentUrl: string;
  };
  url?: string;
  resultScore: number;
}

/**
 * Combined entity authority validation result
 */
export interface EntityAuthorityResult {
  entityName: string;
  wikipedia: WikipediaEntityResult | null;
  wikidata: WikidataEntityResult | null;
  knowledgeGraph: KnowledgeGraphEntityResult | null;
  authorityScore: number; // 0-100
  verificationStatus: 'verified' | 'partial' | 'unverified';
  recommendations: string[];
}

/**
 * Query Network Audit configuration
 */
export interface QueryNetworkAuditConfig {
  seedKeyword: string;
  targetDomain?: string;
  language: string;
  region?: string;
  maxQueries?: number;
  maxCompetitors?: number;
  includeEntityValidation?: boolean;
  includeOwnContent?: boolean;
}

/**
 * Query Network Audit progress tracking
 */
export interface QueryNetworkAuditProgress {
  phase: 'generating_network' | 'fetching_serps' | 'extracting_eavs' | 'analyzing_gaps' | 'validating_entities' | 'complete' | 'error';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  progress: number; // 0-100
  error?: string;
}

/**
 * Audit report section for business/technical toggle
 */
export interface AuditReportSection {
  id: string;
  title: string;
  businessSummary: string; // High-level for business stakeholders
  technicalDetails: string; // Detailed for technical users
  metrics: Record<string, number | string>;
  visualizationType?: 'chart' | 'table' | 'list' | 'heatmap';
  data: unknown;
}

/**
 * Complete audit report with business/technical views
 */
export interface ComprehensiveAuditReport {
  id: string;
  title: string;
  generatedAt: string;
  auditType: 'query_network' | 'single_page' | 'multi_page' | 'authority';
  overallScore: number;
  sections: AuditReportSection[];
  executiveSummary: string;
  technicalSummary: string;
  prioritizedActions: QueryNetworkRecommendation[];
  exportFormats: ('xlsx' | 'pdf' | 'html')[];
}

// ============================================
// MENTION SCANNER TYPES
// ============================================

/**
 * Reputation signal from external source
 */
export interface ReputationSignal {
  source: string;
  sourceType: 'review_platform' | 'news' | 'social' | 'industry' | 'government';
  sentiment: 'positive' | 'neutral' | 'negative';
  mentionCount: number;
  avgRating?: number;
  url?: string;
  lastUpdated?: string;
}

/**
 * Entity co-occurrence in content
 */
export interface EntityCoOccurrence {
  entity: string;
  frequency: number;
  contexts: string[];
  associationType: 'competitor' | 'partner' | 'industry_term' | 'related_brand';
}

/**
 * E-A-T (Expertise, Authority, Trust) breakdown
 */
export interface EATBreakdown {
  expertise: {
    score: number;
    signals: string[];
  };
  authority: {
    score: number;
    signals: string[];
  };
  trust: {
    score: number;
    signals: string[];
  };
}

/**
 * Mention Scanner configuration
 */
export interface MentionScannerConfig {
  entityName: string;
  domain?: string;
  industry?: string;
  language: string;
  includeReviews: boolean;
  includeSocialMentions: boolean;
  includeNewsArticles: boolean;
}

/**
 * Mention Scanner progress
 */
export interface MentionScannerProgress {
  phase: 'initializing' | 'verifying_identity' | 'scanning_reputation' | 'analyzing_cooccurrences' | 'calculating_score' | 'complete' | 'error';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  progress: number;
  error?: string;
}

/**
 * Complete Mention Scanner result
 */
export interface MentionScannerResult {
  entityName: string;
  domain?: string;
  timestamp: string;

  // Identity verification
  entityAuthority: EntityAuthorityResult;

  // Reputation signals
  reputationSignals: ReputationSignal[];
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';

  // Co-occurrences
  coOccurrences: EntityCoOccurrence[];
  topicalAssociations: string[];

  // E-A-T Analysis
  eatBreakdown: EATBreakdown;
  eatScore: number; // 0-100

  // Recommendations
  recommendations: MentionScannerRecommendation[];
}

/**
 * Mention Scanner recommendation
 */
export interface MentionScannerRecommendation {
  type: 'identity' | 'reputation' | 'authority' | 'trust' | 'visibility';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedAction: string;
  estimatedImpact: string;
}

// ============================================
// CORPUS AUDIT TYPES
// ============================================

/**
 * Content overlap detection result
 */
export interface ContentOverlap {
  pageA: string;
  pageB: string;
  overlapPercentage: number;
  sharedPhrases: string[];
  overlapType: 'duplicate' | 'near_duplicate' | 'partial' | 'thematic';
}

/**
 * Anchor text pattern analysis
 */
export interface AnchorTextPattern {
  anchorText: string;
  frequency: number;
  targetUrls: string[];
  isGeneric: boolean;
  isOverOptimized: boolean;
}

/**
 * Page in the corpus
 */
export interface CorpusPage {
  url: string;
  title: string;
  wordCount: number;
  headings: { level: number; text: string }[];
  internalLinks: { url: string; anchorText: string }[];
  externalLinks: { url: string; anchorText: string }[];
  publishDate?: string;
  lastModified?: string;
}

/**
 * Corpus-wide metrics
 */
export interface CorpusMetrics {
  totalPages: number;
  totalWordCount: number;
  avgWordCount: number;
  avgInternalLinks: number;
  avgExternalLinks: number;
  avgHeadings: number;
  topicalCoverage: number; // 0-100
  contentFreshness: number; // 0-100
}

/**
 * Corpus Audit configuration
 */
export interface CorpusAuditConfig {
  domain: string;
  sitemapUrl?: string;
  maxPages?: number;
  targetEAVs?: SemanticTriple[];
  checkDuplicates: boolean;
  checkAnchors: boolean;
  checkCoverage: boolean;
}

/**
 * Corpus Audit progress
 */
export interface CorpusAuditProgress {
  phase: 'discovering' | 'crawling' | 'analyzing' | 'detecting_overlaps' | 'calculating_metrics' | 'complete' | 'error';
  currentStep: string;
  totalPages: number;
  processedPages: number;
  progress: number;
  error?: string;
}

/**
 * Complete Corpus Audit result
 */
export interface CorpusAuditResult {
  domain: string;
  timestamp: string;

  // Pages analyzed
  pages: CorpusPage[];

  // Content analysis
  contentOverlaps: ContentOverlap[];
  anchorPatterns: AnchorTextPattern[];

  // Coverage
  semanticCoverage: {
    covered: SemanticTriple[];
    missing: SemanticTriple[];
    coveragePercentage: number;
  };

  // Metrics
  metrics: CorpusMetrics;

  // Issues and recommendations
  issues: CorpusAuditIssue[];
  recommendations: CorpusAuditRecommendation[];
}

/**
 * Corpus audit issue
 */
export interface CorpusAuditIssue {
  type: 'duplicate_content' | 'thin_content' | 'orphan_page' | 'anchor_over_optimization' | 'generic_anchors' | 'coverage_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedUrls: string[];
  description: string;
  details?: string;
}

/**
 * Corpus audit recommendation
 */
export interface CorpusAuditRecommendation {
  type: 'consolidate' | 'expand' | 'relink' | 'diversify_anchors' | 'add_content';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedUrls: string[];
  suggestedAction: string;
}

// =============================================================================
// SEMANTIC SEO FRAMEWORK ENHANCEMENTS
// =============================================================================

// -----------------------------------------------------------------------------
// FEATURE 1: FRAME SEMANTICS (Fillmore's Linguistic Theory)
// Scene-based topic expansion for low keyword data scenarios
// -----------------------------------------------------------------------------

/**
 * Frame role types based on Fillmore's Frame Semantics
 */
export type FrameRole = 'agent' | 'patient' | 'instrument' | 'location' | 'time' | 'manner' | 'cause' | 'result' | 'beneficiary' | 'experiencer';

/**
 * An action within a semantic frame (verb + participants)
 */
export interface FrameAction {
  verb: string;
  agent: string;
  patient?: string;
  instrument?: string;
  result?: string;
}

/**
 * A single element within a semantic frame
 */
export interface FrameElement {
  role: FrameRole;
  entity: string;
  semantic_type: string;
  is_core: boolean; // Core vs peripheral frame element
}

/**
 * Scene setting for a semantic frame
 */
export interface SceneSetting {
  environment: string;
  temporal_context: string;
  social_context?: string;
  physical_context?: string;
}

/**
 * Complete semantic frame analysis result
 */
export interface SemanticFrame {
  frame_name: string;
  frame_description: string;
  actions: FrameAction[];
  core_elements: FrameElement[];
  peripheral_elements: FrameElement[];
  scene_setting: SceneSetting;
  related_frames?: string[]; // Linked frames for expanded coverage
}

/**
 * Result of frame-based topic expansion
 */
export interface FrameExpansionResult {
  source_topic: EnrichedTopic;
  frame_analysis: SemanticFrame;
  generated_topics: {
    topic: Partial<EnrichedTopic>;
    frame_derivation: string; // How this topic was derived from the frame
    element_source: FrameElement | FrameAction;
  }[];
  bridged_eavs: SemanticTriple[]; // EAVs extracted from frame analysis
}

// -----------------------------------------------------------------------------
// FEATURE 2: MONEY PAGE 4 PILLARS
// Commercial page optimization scoring system
// -----------------------------------------------------------------------------

/**
 * The four pillars of a money page
 */
export type MoneyPagePillar = 'verbalization' | 'contextualization' | 'monetization' | 'visualization';

/**
 * Single checklist item for pillar scoring
 */
export interface PillarChecklistItem {
  id: string;
  label: string;
  description: string;
  weight: number; // Points toward pillar score (0-100)
  checked: boolean;
  category?: string; // Sub-category within pillar
}

/**
 * Score for a single pillar
 */
export interface MoneyPagePillarScore {
  pillar: MoneyPagePillar;
  score: number; // 0-100
  max_score: number;
  checklist: PillarChecklistItem[];
  suggestions: string[];
  critical_missing: string[]; // Must-have items that are missing
}

/**
 * Complete 4-pillar analysis result
 */
export interface MoneyPagePillarsResult {
  overall_score: number; // 0-100
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  pillars: MoneyPagePillarScore[];
  missing_critical: string[]; // Aggregated critical issues
  improvement_priority: MoneyPagePillar[]; // Pillars to focus on first
  recommendations: string[];
}

/**
 * Configuration for 4 Pillars analysis
 */
export interface MoneyPagePillarsConfig {
  weights: Record<MoneyPagePillar, number>; // Relative weight of each pillar
  passing_threshold: number; // Minimum score to pass (e.g., 70)
  critical_items: string[]; // Item IDs that are mandatory
}

// -----------------------------------------------------------------------------
// FEATURE 3: QUERY TEMPLATES
// Search pattern templates for Local SEO and service variations
// -----------------------------------------------------------------------------

/**
 * Category of query template
 */
export type QueryTemplateCategory = 'local' | 'comparison' | 'how-to' | 'problem-solution' | 'best-of' | 'review' | 'cost' | 'ecommerce' | 'custom';

/**
 * Single placeholder within a query template
 */
export interface TemplatePlaceholder {
  name: string; // Display name (e.g., "City")
  bracket_syntax: string; // How it appears in template (e.g., "[City]")
  entity_type: string; // Schema.org or custom type (e.g., "AdministrativeArea")
  validation_pattern?: string; // Regex for validation
  example_values: string[];
  required: boolean;
}

/**
 * Query template definition
 */
export interface QueryTemplate {
  id: string;
  name: string;
  pattern: string; // "Best [Service] in [City] for [Audience]"
  description: string;
  placeholders: TemplatePlaceholder[];
  category: QueryTemplateCategory;
  search_intent: 'informational' | 'transactional' | 'navigational' | 'commercial';
  example_output: string;
  suggested_topic_class: 'monetization' | 'informational';
}

/**
 * Location entity for Local SEO templates
 */
export interface LocationEntity {
  id: string;
  name: string;
  type: 'city' | 'region' | 'neighborhood' | 'country' | 'district';
  parent_location_id?: string;
  population?: number;
  coordinates?: { lat: number; lng: number };
  language?: string;
  country_code?: string;
}

/**
 * Variable set for template expansion
 */
export interface TemplateVariableSet {
  [placeholderName: string]: string | string[];
}

/**
 * Result of template expansion
 */
export interface ExpandedTemplateResult {
  original_template: QueryTemplate;
  variable_combinations: TemplateVariableSet[];
  generated_queries: string[];
  generated_topics: Partial<EnrichedTopic>[];
  parent_topic_id?: string;
}

/**
 * Batch expansion configuration
 */
export interface TemplateBatchConfig {
  template: QueryTemplate;
  locations?: LocationEntity[];
  services?: string[];
  audiences?: string[];
  max_combinations?: number;
  parent_topic_id?: string;
}

// -----------------------------------------------------------------------------
// FEATURE 4: VISUAL SEMANTICS
// "Pixels, Letters, and Bytes" framework implementation
// -----------------------------------------------------------------------------

/**
 * Type of visual semantic rule
 */
export type VisualSemanticRuleType = 'alt_text' | 'placement' | 'format' | 'structure' | 'file_naming' | 'semantic_html';

/**
 * Visual semantic validation rule
 */
export interface VisualSemanticRule {
  id: string;
  rule_type: VisualSemanticRuleType;
  name: string;
  description: string;
  validation_fn?: string; // Function name for programmatic validation
  weight: number; // Importance weight (0-100)
  is_critical: boolean; // Must pass for valid image
}

/**
 * Image format specification
 */
export interface ImageOptimizationSpec {
  recommended_format: 'avif' | 'webp' | 'jpeg' | 'png';
  max_width: number; // 600px standard
  max_file_size_kb: number;
  required_attributes: string[];
  semantic_html_structure: string; // figure > picture > img pattern
}

/**
 * Complete visual semantic analysis for a single image
 */
export interface VisualSemanticAnalysis {
  image_description: string;
  alt_text_recommendation: string;
  title_attribute: string;
  file_name_recommendation: string;
  placement_context: string; // Where in content this should appear
  entity_connections: string[]; // Entities this image reinforces
  format_recommendation: ImageOptimizationSpec;
  html_template: string; // Ready-to-use HTML
  figcaption_text: string;
  n_gram_match: string[]; // Image types expected from SERP analysis
  centerpiece_alignment: number; // 0-100 score for topic alignment
}

/**
 * Complete visual semantics for a content brief
 */
export interface BriefVisualSemantics {
  hero_image: VisualSemanticAnalysis;
  section_images: Record<string, VisualSemanticAnalysis>; // Keyed by section ID
  image_n_grams: string[]; // Expected image types from SERP
  total_images_recommended: number;
  visual_hierarchy: {
    above_fold: string[]; // Image IDs to show above fold
    centerpiece: string; // Primary image reinforcing main topic
    supporting: string[]; // Secondary images
  };
  brand_alignment: {
    uses_brand_colors: boolean;
    has_logo_placement: boolean;
    consistent_style: boolean;
  };
}

/**
 * Alt text validation result
 */
export interface AltTextValidationResult {
  is_valid: boolean;
  score: number; // 0-100
  issues: {
    rule_id: string;
    message: string;
    severity: 'error' | 'warning' | 'suggestion';
  }[];
  suggestions: string[];
  entity_coverage: number; // % of entities mentioned
  keyword_stuffing_detected: boolean;
}

/**
 * File naming validation result
 */
export interface FileNameValidationResult {
  is_valid: boolean;
  original_name: string;
  recommended_name: string;
  issues: string[];
  pattern_match: boolean; // Follows [entity]-[descriptor]-[context] pattern
}

/**
 * Visual semantics validation result for entire brief
 */
export interface VisualSemanticsValidationResult {
  overall_score: number; // 0-100
  hero_image_score: number;
  section_images_score: number;
  n_gram_alignment_score: number;
  centerpiece_alignment_score: number;
  issues: {
    image_id: string;
    issue_type: VisualSemanticRuleType;
    message: string;
    severity: 'error' | 'warning';
    auto_fixable: boolean;
  }[];
  recommendations: string[];
}

// -----------------------------------------------------------------------------
// SOCIAL MEDIA SIGNALS
// Based on Google Patents for Social Media & Brand Signals
// -----------------------------------------------------------------------------

/**
 * Supported social media platforms
 */
export type SocialPlatform =
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'pinterest'
  | 'tiktok'
  | 'github';

/**
 * Type of social signal being measured
 */
export type SocialSignalType =
  | 'profile_completeness'
  | 'entity_consistency'
  | 'topical_relevance'
  | 'engagement'
  | 'influence'
  | 'expertise'
  | 'brand_mentions';

/**
 * Brand signal categories from Google Patents
 */
export type BrandSignalCategory =
  | 'brand_mentions'      // Implied Links Patent
  | 'entity_authority'    // Agent Rank Patent
  | 'social_influence'    // Social influence determination patent
  | 'reference_queries'   // Branded search impact
  | 'entity_consistency'; // Website Representation Vectors Patent

/**
 * Social signal rule definition
 */
export interface SocialSignalRule {
  id: string;
  signal_type: SocialSignalType;
  name: string;
  description: string;
  validation_fn?: string;
  weight: number;
  is_critical: boolean;
  patent_reference?: string;
}

/**
 * Social presence score result
 */
export interface SocialPresenceScore {
  overall_score: number;
  platform_scores: Record<SocialPlatform, number>;
  signal_scores: Record<SocialSignalType, number>;
  recommendations: string[];
  kp_readiness: number; // Knowledge Panel readiness from social signals
}

// -----------------------------------------------------------------------------
// E-COMMERCE SEMANTICS
// Semantic content network patterns for e-commerce sites
// -----------------------------------------------------------------------------

/**
 * Semantic modifier types for e-commerce
 */
export type EcommerceSemanticModifierType =
  | 'season'
  | 'material'
  | 'age_group'
  | 'gender'
  | 'size'
  | 'color'
  | 'style'
  | 'price_range'
  | 'use_case'
  | 'brand'
  | 'certification'
  | 'audience';

/**
 * Contextual hierarchy level for e-commerce
 */
export interface EcommerceHierarchyLevel {
  level: number; // 1 = Parent Category, 2 = Semantic Hub, 3 = Context Page, 4 = Product
  title: string;
  modifiers: EcommerceSemanticModifierType[];
  parent_id?: string;
}

/**
 * Query processing pattern for e-commerce
 */
export interface EcommerceQueryPattern {
  id: string;
  pattern: string;
  intent: 'informational' | 'transactional' | 'commercial' | 'navigational';
  modifiers: EcommerceSemanticModifierType[];
  topic_class: 'monetization' | 'informational';
}

/**
 * Rare attribute for SEO differentiation
 */
export interface EcommerceRareAttribute {
  id: string;
  category: string;
  attribute: string;
  seo_value: 'high' | 'medium' | 'low';
  differentiator: boolean;
}

/**
 * Interlinking rule for e-commerce semantic network
 */
export interface EcommerceInterlinkingRule {
  link_type: 'parent' | 'child' | 'sibling' | 'cross-contextual';
  anchor_pattern: string;
  weight: number;
}

/**
 * Contextual coverage assessment for e-commerce content
 */
export interface EcommerceContextualCoverage {
  category: string;
  covered_items: string[];
  total_items: number;
  coverage_score: number;
  missing_critical: string[];
}

// =============================================================================
// HERO IMAGE EDITOR TYPES
// Visual editor for creating semantically optimized hero images
// Following Koray Tugberk GUBUR's "Pixels, Letters, and Bytes" framework
// =============================================================================

/**
 * Layer types for the hero image editor
 */
export type HeroLayerType = 'background' | 'centralObject' | 'textOverlay' | 'logo';

/**
 * Position and dimensions for a layer (all values are percentages 0-100)
 */
export interface LayerPosition {
  x: number;       // X position as percentage of canvas width
  y: number;       // Y position as percentage of canvas height
  width: number;   // Width as percentage of canvas width
  height: number;  // Height as percentage of canvas height
}

/**
 * Base interface for all layer configurations
 */
export interface LayerBase {
  id: string;
  name: string;         // User-friendly layer name
  type: HeroLayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;      // 0-100
  zIndex: number;
  position: LayerPosition;
}

/**
 * Background layer configuration
 * Can be AI-generated, user-uploaded, or solid color
 */
export interface BackgroundLayerConfig extends LayerBase {
  type: 'background';
  source: 'ai-generated' | 'user-upload' | 'color';
  imageUrl?: string;
  backgroundColor?: string;
  aiPrompt?: string;
  aiProvider?: 'gemini' | 'dalle';
  isGenerating?: boolean;
}

/**
 * Central object layer configuration
 * Must be centered and fully visible per semantic SEO rules
 */
export interface CentralObjectLayerConfig extends LayerBase {
  type: 'centralObject';
  imageUrl?: string;
  entityName: string;           // The entity this object represents
  preserveAspectRatio?: boolean;
  centeredEnforced: true;       // Constraint: must be centered
  visibilityEnforced: true;     // Constraint: must be 100% visible
}

/**
 * Text overlay layer configuration
 * Placement restricted to top or bottom per semantic SEO rules
 */
export interface TextOverlayLayerConfig extends LayerBase {
  type: 'textOverlay';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'bolder' | number; // Supports numeric values (100-900)
  textColor: string;
  textShadow?: string;
  textAlign: 'left' | 'center' | 'right';
  placement: 'top' | 'bottom';  // Constraint: only top or bottom allowed
  padding: number;
  maxWidth?: number;            // Max width as percentage (optional)
  backgroundColor?: string;     // Optional background bar color
  backgroundOpacity?: number;
}

/**
 * Logo layer configuration
 * Position restricted to corners per semantic SEO rules
 */
export interface LogoLayerConfig extends LayerBase {
  type: 'logo';
  imageUrl?: string;
  cornerPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxSize?: number;             // Max dimension in pixels (optional)
}

/**
 * Union type for all layer configurations
 */
export type HeroLayerConfig =
  | BackgroundLayerConfig
  | CentralObjectLayerConfig
  | TextOverlayLayerConfig
  | LogoLayerConfig;

/**
 * Semantic validation rule definition
 */
/**
 * Validation severity level
 */
export type HeroValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Check result from a validation rule
 */
export interface HeroCheckResult {
  passed: boolean;
  details?: Record<string, unknown>;  // Flexible details object
}

/**
 * Validation rule for hero images
 */
export interface HeroValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'centerpiece' | 'text' | 'logo' | 'technical' | 'accessibility';
  severity: HeroValidationSeverity;
  checkMessage: string;           // Message shown when check fails
  passMessage: string;            // Message shown when check passes
  autoFixAvailable: boolean;      // Whether auto-fix is available
  autoFixDescription?: string;    // Description of what auto-fix does
  check: (composition: HeroImageComposition) => HeroCheckResult;
  autoFix?: (composition: HeroImageComposition) => HeroImageComposition;
}

/**
 * Validation issue returned by a rule
 */
export interface HeroValidationIssue {
  ruleId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  layerId?: string;
  autoFixAvailable: boolean;
  suggestion: string;
}

/**
 * Individual rule result for UI display
 */
export interface HeroRuleResult {
  ruleId: string;
  ruleName: string;
  category: 'centerpiece' | 'text' | 'logo' | 'technical' | 'accessibility';
  severity: HeroValidationSeverity;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
  autoFixAvailable: boolean;
}

/**
 * Complete validation result for a hero image composition
 */
export interface HeroValidationResult {
  isValid: boolean;
  score?: number;                // 0-100 (optional for simple validation)
  issues?: HeroValidationIssue[];
  passedRules?: string[];
  recommendations?: string[];
  // Extended properties for UI display
  errors: string[];             // Error messages
  warnings: string[];           // Warning messages
  ruleResults: HeroRuleResult[];
}

/**
 * IPTC metadata for embedding in image
 */
export interface HeroIPTCMetadata {
  creator?: string;
  credit?: string;
  copyright?: string;
  source?: string;
  caption?: string;
  headline?: string;
  keywords?: string[];
  city?: string;
  country?: string;
  dateCreated?: string;
}

/**
 * EXIF metadata for embedding in image
 */
export interface HeroEXIFMetadata {
  artist?: string;
  copyright?: string;
  software?: string;
  imageDescription?: string;
  userComment?: string;
  dateTimeOriginal?: string;
}

/**
 * Schema.org ImageObject for structured data
 */
export interface HeroSchemaOrgMetadata {
  '@type': 'ImageObject';
  name: string;
  description: string;
  contentUrl: string;
  url?: string;              // Public URL of the image
  width?: number;
  height?: number;
  encodingFormat?: string;
  caption?: string;
  author?: {                 // Can be Person or Organization
    '@type': 'Person' | 'Organization';
    name: string;
  };
  creator?: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  copyrightHolder?: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  copyrightYear?: number;
  license?: string;
  acquireLicensePage?: string;
  isPartOf?: {               // Reference to containing page
    '@type': 'WebPage';
    url: string;
  };
}

/**
 * Complete metadata for a hero image
 */
export interface HeroImageMetadata {
  iptc: HeroIPTCMetadata;
  exif: HeroEXIFMetadata;
  schemaOrg: HeroSchemaOrgMetadata;
  altText: string;
  fileName: string;
}

/**
 * Complete hero image composition
 */
export interface HeroImageComposition {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:2';  // Optional
  layers: HeroLayerConfig[];
  validation?: HeroValidationResult;             // Optional for new compositions
  metadata: HeroImageMetadata;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Editor state for the hero image visual editor
 */
export interface HeroEditorState {
  composition: HeroImageComposition;
  selectedLayerId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  history: HeroImageComposition[];
  historyIndex: number;
  zoom: number;
  previewMode: boolean;
  autoSaveEnabled: boolean;
}

/**
 * Export options for hero image
 */
export interface HeroExportOptions {
  format: 'avif' | 'webp' | 'png' | 'jpeg';
  quality: number;              // 0-100
  embedMetadata: boolean;
  generateSchemaJson: boolean;
  uploadToCloudinary: boolean;
}
