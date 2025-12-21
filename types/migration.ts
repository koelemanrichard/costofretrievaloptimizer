/**
 * Migration Types Module
 *
 * Contains migration and merge types including:
 * - TransitionStatus: Site migration workflow status
 * - SiteInventoryItem: Page inventory for migration
 * - MergeWizardStep: Map merge wizard steps
 * - MapMergeState: Full merge wizard state
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/migration
 */

import { SemanticTriple } from './semantic';

// ============================================================================
// FORWARD DECLARATIONS (to avoid circular dependencies)
// ============================================================================

// Forward declaration for EnrichedTopic
interface EnrichedTopicRef {
  id: string;
  title: string;
  description: string;
  type: 'core' | 'outer' | 'child';
  parent_topic_id: string | null;
}

// Forward declaration for TopicalMap
interface TopicalMapRef {
  id: string;
  name: string;
  project_id: string;
}

// Forward declaration for BusinessInfo
interface BusinessInfoRef {
  domain?: string;
  projectName?: string;
}

// Forward declaration for SEOPillars
interface SEOPillarsRef {
  centralEntity?: string;
  sourceContext?: string;
  centralSearchIntent?: string;
}

// ============================================================================
// SITE MIGRATION TYPES
// ============================================================================

/**
 * Transition status for site migration
 */
export enum TransitionStatus {
  AUDIT_PENDING = 'AUDIT_PENDING',
  GAP_ANALYSIS = 'GAP_ANALYSIS',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  IN_PROGRESS = 'IN_PROGRESS',
  OPTIMIZED = 'OPTIMIZED',
}

/**
 * Action type for migration decisions
 */
export enum ActionType {
  KEEP = 'KEEP',
  REWRITE = 'REWRITE',
  MERGE = 'MERGE',
  REDIRECT_301 = 'REDIRECT_301',
  PRUNE_410 = 'PRUNE_410',
  CANONICALIZE = 'CANONICALIZE',
}

/**
 * Section type classification
 */
export enum SectionType {
  CORE_SECTION = 'CORE_SECTION',
  AUTHOR_SECTION = 'AUTHOR_SECTION',
  ORPHAN = 'ORPHAN',
}

/**
 * Site inventory item for migration workbench
 */
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
  striking_distance_keywords?: string[];

  // Strategy & Mapping
  mapped_topic_id: string | null;
  section?: SectionType;
  status: TransitionStatus;
  action?: ActionType;

  created_at: string;
  updated_at: string;
}

/**
 * Content snapshot for migration history
 */
export interface TransitionSnapshot {
  id: string;
  inventory_id: string;
  created_at: string;
  content_markdown: string;
  snapshot_type: 'ORIGINAL_IMPORT' | 'PRE_OPTIMIZATION' | 'POST_OPTIMIZATION';
}

// ============================================================================
// SMART MIGRATION TYPES (Content Harvesting)
// ============================================================================

/**
 * Content chunk for harvesting
 */
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

/**
 * Migration decision with AI recommendation
 */
export interface MigrationDecision {
  sourceUrl: string;
  targetTopicId: string;
  recommendation: 'REDIRECT_301' | 'MERGE' | 'PRUNE' | 'KEEP' | 'REWRITE';
  confidence: number;
  pros: string[];
  cons: string[];
  reasoning: string;
}

// ============================================================================
// MAP MERGE TYPES
// ============================================================================

/**
 * Merge wizard step
 */
export enum MergeWizardStep {
  SELECT = 'select',
  CONTEXT = 'context',
  EAVS = 'eavs',
  TOPICS = 'topics',
  REVIEW = 'review',
}

/**
 * Context conflict during merge
 */
export interface ContextConflict {
  field: string;
  values: { mapId: string; mapName: string; value: unknown }[];
  aiSuggestion: { value: unknown; reasoning: string } | null;
  resolution: 'mapA' | 'mapB' | 'ai' | 'custom' | null;
  customValue?: unknown;
}

/**
 * EAV decision during merge
 */
export interface EavDecision {
  eavId: string;
  sourceMapId: string;
  action: 'include' | 'exclude' | 'merge';
  conflictWith?: string;
  resolvedValue?: string;
}

/**
 * Topic similarity result from AI analysis
 */
export interface TopicSimilarityResult {
  id: string;
  topicA: EnrichedTopicRef;
  topicB: EnrichedTopicRef;
  similarityScore: number;
  matchType: 'exact' | 'semantic' | 'parent_child';
  aiSuggestedAction: 'merge' | 'parent_child' | 'keep_separate';
  aiSuggestedTitle?: string;
  aiSuggestedParent?: string;
  reasoning: string;
}

/**
 * Topic merge decision
 */
export interface TopicMergeDecision {
  id: string;
  topicAId: string | null;
  topicBId: string | null;
  userDecision: 'merge' | 'keep_both' | 'keep_a' | 'keep_b' | 'delete' | 'pending';
  finalTitle: string;
  finalDescription: string;
  finalType: 'core' | 'outer';
  finalParentId: string | null;
}

/**
 * Map merge analysis result from AI
 */
export interface MapMergeAnalysis {
  contextRecommendations: {
    field: string;
    recommendation: unknown;
    reasoning: string;
    confidence: number;
  }[];
  eavAnalysis: {
    unique: { mapId: string; eav: SemanticTriple }[];
    duplicates: { eavs: SemanticTriple[]; keep: SemanticTriple }[];
    conflicts: {
      subject: string;
      predicate: string;
      values: { mapId: string; value: unknown }[];
      recommendation: unknown;
      reasoning: string;
    }[];
  };
  topicSimilarities: TopicSimilarityResult[];
}

/**
 * Import history entry for merge tracking
 */
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

/**
 * Full map merge wizard state
 */
export interface MapMergeState {
  step: MergeWizardStep;
  selectedMapIds: string[];
  sourceMaps: TopicalMapRef[];

  // Step 2: Context
  resolvedContext: {
    businessInfo: Partial<BusinessInfoRef>;
    pillars: SEOPillarsRef | null;
  };
  contextConflicts: ContextConflict[];

  // Step 3: EAVs
  resolvedEavs: SemanticTriple[];
  eavDecisions: EavDecision[];

  // Step 4: Topics
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopicRef[];
  excludedTopicIds: string[];

  // Step 5: Review
  finalTopics: EnrichedTopicRef[];
  newMapName: string;

  // Import/Export
  importHistory: ImportHistoryEntry[];

  // Analysis state
  isAnalyzing: boolean;
  analysisError: string | null;
  isCreating: boolean;
}

/**
 * Export row for Excel/CSV merge export
 */
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

/**
 * Merge execution input
 */
export interface MergeExecutionInput {
  sourceMaps: TopicalMapRef[];
  newMapName: string;
  projectId: string;
  userId: string;
  resolvedContext: {
    businessInfo: Partial<BusinessInfoRef>;
    pillars: SEOPillarsRef | null;
  };
  resolvedEavs: SemanticTriple[];
  resolvedCompetitors: string[];
  topicDecisions: TopicMergeDecision[];
  excludedTopicIds: string[];
  newTopics: EnrichedTopicRef[];
}
