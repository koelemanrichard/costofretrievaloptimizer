/**
 * Centralized Scoring Constants
 *
 * This file extracts magic numbers and scoring constants from across the codebase.
 * Each constant includes its source file and original purpose for easier maintenance
 * and consistency across all scoring systems.
 */

// =============================================================================
// EAV AUDIT SCORING (eavAudit.ts)
// =============================================================================

/**
 * Penalty points for critical EAV inconsistency issues
 * Source: eavAudit.ts line 237-240
 * Applied to: Critical severity inconsistencies (e.g., numeric value conflicts)
 */
export const EAV_CRITICAL_PENALTY = 15;

/**
 * Penalty points for warning-level EAV inconsistencies
 * Source: eavAudit.ts line 237-240
 * Applied to: Warning severity issues (e.g., non-numeric value conflicts)
 */
export const EAV_WARNING_PENALTY = 5;

/**
 * Penalty points for info-level EAV inconsistencies
 * Source: eavAudit.ts line 237-240
 * Applied to: Informational issues (e.g., category mismatches)
 */
export const EAV_INFO_PENALTY = 1;

/**
 * Base score for EAV audit (before penalties applied)
 * Source: eavAudit.ts line 240
 */
export const EAV_BASE_SCORE = 100;

/**
 * Grade thresholds for EAV audit scoring
 * Source: eavAudit.ts lines 402-407
 * Maps: score >= threshold -> letter grade
 */
export const EAV_GRADE_THRESHOLDS = {
  excellent: 95,
  good: 90,
  fair: 80,
  needsWork: 70,
  poor: 60,
};

// =============================================================================
// CENTRAL ENTITY ANALYSIS (centralEntityAnalyzer.ts)
// =============================================================================

/**
 * Minimum word length for entity extraction
 * Source: centralEntityAnalyzer.ts line 225
 * Used in: extractFrequentTerms() for filtering meaningful terms
 */
export const ENTITY_MIN_WORD_LENGTH = 4;

/**
 * Number of top frequent terms to extract for entity detection
 * Source: centralEntityAnalyzer.ts line 225
 * Used in: extractFrequentTerms() and detectCentralEntity()
 */
export const ENTITY_TOP_N_TERMS = 10;

/**
 * Confidence score for schema-detected central entity
 * Source: centralEntityAnalyzer.ts line 291
 * Priority 1: Schema "about" property (highest confidence)
 */
export const ENTITY_SCHEMA_CONFIDENCE = 0.95;

/**
 * Confidence score for H1-detected central entity
 * Source: centralEntityAnalyzer.ts line 299
 * Priority 2: H1 heading (high confidence)
 */
export const ENTITY_H1_CONFIDENCE = 0.85;

/**
 * Confidence score for title-detected central entity
 * Source: centralEntityAnalyzer.ts line 306
 * Priority 3: Title tag (moderate confidence)
 */
export const ENTITY_TITLE_CONFIDENCE = 0.75;

/**
 * Confidence score for frequency-detected central entity
 * Source: centralEntityAnalyzer.ts line 315
 * Priority 4: Frequency analysis (lowest confidence)
 */
export const ENTITY_FREQUENCY_CONFIDENCE = 0.6;

/**
 * Penalty for major contextual drift in content
 * Source: centralEntityAnalyzer.ts line 501
 * Applied to: Major drift points (3+ paragraphs without mention)
 */
export const ENTITY_MAJOR_DRIFT_PENALTY = 20;

/**
 * Penalty for minor contextual drift in content
 * Source: centralEntityAnalyzer.ts line 502
 * Applied to: Minor drift points (isolated paragraphs)
 */
export const ENTITY_MINOR_DRIFT_PENALTY = 5;

/**
 * Ratio threshold for heading presence of central entity
 * Source: centralEntityAnalyzer.ts line 549
 * If ratio < this value, triggers "low_heading_presence" warning
 */
export const ENTITY_HEADING_RATIO_THRESHOLD = 0.3;

/**
 * Distribution score threshold for even entity distribution
 * Source: centralEntityAnalyzer.ts line 558
 * If distributionScore < this, triggers "uneven_distribution" warning
 */
export const ENTITY_DISTRIBUTION_THRESHOLD = 66;

// =============================================================================
// INTERNAL LINKING AUDIT (linkingAudit.ts)
// =============================================================================

/**
 * Maximum allowed internal links per page
 * Source: linkingAudit.ts lines 136, 700
 * PageRank dilution risk when exceeded
 */
export const MAX_LINKS_PER_PAGE = 150;

/**
 * Maximum repetition count for same anchor text to same target
 * Source: linkingAudit.ts lines 183, 700
 * Signals over-optimization or templated linking
 */
export const MAX_ANCHOR_TEXT_REPETITION = 3;

/**
 * Maximum internal links allowed in header navigation
 * Source: linkingAudit.ts line 288
 * Prevents header bloat and maintains PageRank
 */
export const MAX_HEADER_LINKS = 10;

/**
 * Maximum internal links allowed in footer navigation
 * Source: linkingAudit.ts line 306
 * Broader than header but prevents excessive footer linking
 */
export const MAX_FOOTER_LINKS = 30;

/**
 * Critical penalty for linking issues in audit scoring
 * Source: linkingAudit.ts line 651
 * Applied to: Critical issues (wrong flow direction, orphaned pages)
 */
export const LINK_CRITICAL_PENALTY = 10;

/**
 * Warning penalty for linking issues in audit scoring
 * Source: linkingAudit.ts line 651
 * Applied to: Warning issues (header overflow, flow violations)
 */
export const LINK_WARNING_PENALTY = 3;

/**
 * Suggestion penalty for linking issues in audit scoring
 * Source: linkingAudit.ts line 651
 * Applied to: Informational suggestions
 */
export const LINK_SUGGESTION_PENALTY = 1;

/**
 * Quality threshold for linking to quality nodes
 * Source: linkingAudit.ts line 709
 * Links should preferentially target pages with score >= this value
 */
export const LINK_QUALITY_NODE_THRESHOLD = 70;

/**
 * High threshold for link dilution risk detection
 * Source: linkingAudit.ts line 1366
 * Link dilution: 'high' if total links > this
 */
export const LINK_DILUTION_HIGH = 150;

/**
 * Medium threshold for link dilution risk detection
 * Source: linkingAudit.ts line 1366
 * Link dilution: 'medium' if total links > this
 */
export const LINK_DILUTION_MEDIUM = 100;

/**
 * Low threshold for link dilution risk detection
 * Source: linkingAudit.ts line 1375
 * Link dilution: 'low' if total links > this
 */
export const LINK_DILUTION_LOW = 50;

/**
 * Threshold for excessive outbound links from a single page
 * Source: linkingAudit.ts line 1586
 * Triggers "link_hoarding" flow violation if exceeded
 */
export const LINK_EXCESSIVE_OUTBOUND = 20;

// =============================================================================
// CORPUS AUDIT (corpusAudit.ts)
// =============================================================================

/**
 * Default threshold for content overlap detection
 * Source: corpusAudit.ts line 111
 * Pages with overlap >= this are flagged for review
 */
export const CONTENT_OVERLAP_THRESHOLD = 0.3;

/**
 * Threshold for duplicate content classification
 * Source: corpusAudit.ts line 136
 * overlapPercentage >= 0.8 is classified as 'duplicate'
 */
export const OVERLAP_DUPLICATE = 0.8;

/**
 * Threshold for near-duplicate content classification
 * Source: corpusAudit.ts line 138
 * overlapPercentage >= 0.6 is classified as 'near_duplicate'
 */
export const OVERLAP_NEAR_DUPLICATE = 0.6;

/**
 * Threshold for partial content overlap classification
 * Source: corpusAudit.ts line 140
 * overlapPercentage >= 0.4 is classified as 'partial'
 */
export const OVERLAP_PARTIAL = 0.4;

/**
 * Word count threshold for thin content detection
 * Source: corpusAudit.ts line 303
 * Pages with < this word count are flagged as thin content
 */
export const THIN_PAGE_WORD_COUNT = 300;

/**
 * Default maximum pages to crawl in corpus audit
 * Source: corpusAudit.ts line 501
 * Used when maxPages not specified in config
 */
export const MAX_PAGES_DEFAULT = 50;

/**
 * Rate limiting delay between page crawls (milliseconds)
 * Source: corpusAudit.ts line 522
 * Prevents server overload during site crawling
 */
export const CORPUS_RATE_LIMIT_DELAY = 500;

/**
 * Threshold for coverage percentage in corpus audit
 * Source: corpusAudit.ts line 350
 * If topicalCoverage < this, triggers coverage_gap issue
 */
export const COVERAGE_THRESHOLD = 70;

/**
 * High severity threshold for coverage gaps
 * Source: corpusAudit.ts line 353
 * If coverage < this, marked as 'high' severity
 */
export const COVERAGE_HIGH_SEVERITY = 50;

// =============================================================================
// SEMANTIC CLUSTERING (clustering.ts)
// =============================================================================

/**
 * Default semantic distance threshold for clustering
 * Source: clustering.ts line 43
 * Topics with distance < threshold are clustered together
 */
export const DEFAULT_DISTANCE_THRESHOLD = 0.5;

/**
 * Optimal semantic distance for topic relevance
 * Source: clustering.ts line 149
 * Used to calculate relevance score (peak at this distance)
 */
export const OPTIMAL_SEMANTIC_DISTANCE = 0.45;

/**
 * Threshold for cannibalization risk detection
 * Source: clustering.ts line 193
 * Topics with distance < this are too similar (cannibalization risk)
 */
export const CANNIBALIZATION_THRESHOLD = 0.2;

/**
 * Threshold for title-based cannibalization detection
 * Source: clustering.ts line 234
 * Jaccard similarity >= this indicates potential merge
 */
export const TITLE_CANNIBALIZATION_THRESHOLD = 0.7;

/**
 * Optimal range for internal linking between topics
 * Source: clustering.ts lines 147-157
 * shouldLink = true if distance in this range
 */
export const LINKING_SWEET_SPOT = { min: 0.3, max: 0.7 };

/**
 * Ideal semantic distance range for hub-spoke relationships
 * Source: clustering.ts line 283
 * Spokes should maintain distance in this range from hub
 */
export const IDEAL_SPOKE_DISTANCE = { min: 0.3, max: 0.6 };

/**
 * Optimal number of spoke topics per hub
 * Source: clustering.ts line 253
 * Used in suggestHubSpokeStructure() for topical authority
 */
export const OPTIMAL_SPOKE_COUNT = 7;

// =============================================================================
// ENTITY EXTRACTION (entityExtraction.ts)
// =============================================================================

/**
 * Maximum characters to sample from content for entity extraction
 * Source: entityExtraction.ts line 81
 * Limits AI API payload size
 */
export const CONTENT_SAMPLE_SIZE = 3000;

/**
 * Maximum content length for entity context analysis
 * Source: entityExtraction.ts line 81
 * Used in extractEntitiesWithAI() prompt
 */
export const ENTITY_CONTENT_LIMIT = 8000;

/**
 * Context window size for entity mentions
 * Source: entityExtraction.ts line 340
 * Characters on either side of entity mention
 */
export const ENTITY_CONTEXT_SAMPLE = 500;

/**
 * Sample size for word-level frequency analysis
 * Source: entityExtraction.ts line 272
 * Used in extractEntitiesFromContext()
 */
export const ENTITY_WORD_SAMPLE = 200;

/**
 * Threshold for high-mention-count entities
 * Source: entityExtraction.ts (used in prioritization)
 * Entities mentioned >= this many times are high priority
 */
export const ENTITY_HIGH_MENTION_COUNT = 10;

/**
 * Default maximum entities to extract and prioritize
 * Source: entityExtraction.ts line 301
 * Used in prioritizeEntities()
 */
export const DEFAULT_MAX_ENTITIES = 10;

// =============================================================================
// BRIEF REPAIR (briefRepair.ts)
// =============================================================================

/**
 * Meta description character length constraints
 * Source: briefRepair.ts line 107
 * Meta descriptions should be within this range for optimal display
 */
export const META_DESCRIPTION_LENGTH = { min: 150, max: 160 };

/**
 * Recommended word count for guide-type content
 * Source: briefRepair.ts line 194
 * Used as avgWordCount for guide topics
 */
export const GUIDE_WORD_COUNT = 2500;

/**
 * Default recommended word count for standard content
 * Source: briefRepair.ts line 194
 * Used as avgWordCount for non-guide topics
 */
export const DEFAULT_WORD_COUNT = 1800;

// =============================================================================
// CONTENT GENERATION
// =============================================================================

/**
 * Minimum length for contextual bridge content
 * Source: (General content generation constraint)
 * Contextual bridges with < this length may not provide sufficient context
 */
export const MIN_BRIDGE_CONTENT_LENGTH = 50;

/**
 * Maximum possible score in any audit/scoring system
 * Source: Multiple files (eavAudit, linkingAudit, etc.)
 * Standard maximum score across all scoring systems
 */
export const MAX_SCORE = 100;
