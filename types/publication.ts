/**
 * Publication Types Module
 *
 * Contains publication planning and tracking types including:
 * - PublicationStatus: Workflow status for content
 * - PublicationPhase: Strategic publication phases
 * - TopicPublicationPlan: Per-topic planning data
 * - PerformanceSnapshot: GSC performance tracking
 * - PriorityScoreBreakdown: Priority calculation details
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/publication
 */

// ============================================================================
// PUBLICATION STATUS AND PHASE TYPES
// ============================================================================

/**
 * Publication status workflow
 */
export type PublicationStatus =
  | 'not_started'
  | 'brief_ready'
  | 'draft_in_progress'
  | 'draft_ready'
  | 'in_review'
  | 'scheduled'
  | 'published'
  | 'needs_update';

/**
 * Publication phase based on semantic SEO guidelines
 */
export type PublicationPhase =
  | 'phase_1_authority'    // Batch publish 20-60 topics (monetization + pillars)
  | 'phase_2_support'      // 3-7/week (remaining monetization + high-priority informational)
  | 'phase_3_expansion'    // 2-5/week (informational with RARE/UNIQUE EAVs)
  | 'phase_4_longtail';    // 1-2/week (remaining topics)

/**
 * Priority level for publication ordering
 */
export enum PublicationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// ============================================================================
// PUBLICATION PLAN TYPES
// ============================================================================

/**
 * Phase within a publication plan
 */
export interface PublicationPlanPhase {
  phase: number;
  name: string;
  duration_weeks: number;
  publishing_rate: string;
  content: { title: string; type: 'core' | 'outer' }[];
}

/**
 * Full publication plan with phases
 */
export interface PublicationPlan {
  total_duration_weeks: number;
  phases: PublicationPlanPhase[];
}

/**
 * Per-topic publication planning data
 * Stored in EnrichedTopic.metadata.publication_plan
 */
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

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Performance snapshot from GSC CSV import
 */
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

// ============================================================================
// PRIORITY SCORING
// ============================================================================

/**
 * Priority calculation breakdown (100 points max)
 */
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

/**
 * Planning generation result from AI service
 */
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

// ============================================================================
// PLANNING FILTERS
// ============================================================================

/**
 * Filters for planning dashboard views
 */
export interface PlanningFilters {
  status?: PublicationStatus[];
  phase?: PublicationPhase[];
  priority?: PublicationPriority[];
  topic_type?: ('core' | 'outer')[];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}

// ============================================================================
// CALENDAR TYPES
// ============================================================================

/**
 * Calendar item for publication scheduling
 */
export interface PublicationCalendarItem {
  id: string;
  topic_id: string;
  title: string;
  type: 'core' | 'outer';
  status: PublicationStatus;
  scheduled_date: string;
  phase: PublicationPhase;
  priority: PublicationPriority;
}

/**
 * Calendar view configuration
 */
export interface CalendarViewConfig {
  view: 'month' | 'week' | 'list';
  startDate: string;
  endDate: string;
  showCompleted: boolean;
  groupByPhase: boolean;
}
