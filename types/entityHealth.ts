/**
 * Entity Health Types
 *
 * Types for the Entity Health Dashboard system that tracks verification status,
 * issues, and overall health of entities in the semantic SEO framework.
 */

import { EntityAuthorityResult } from '../types';
import { EntityCriticalityResult } from '../lib/entityCriticality';

/**
 * Verification status for an entity
 */
export type EntityVerificationStatus =
  | 'verified'       // Matched in authoritative source
  | 'partial'        // Matched in some sources
  | 'unverified'     // No match found
  | 'proprietary'    // Marked as intentionally unverifiable
  | 'ambiguous'      // Multiple possible matches
  | 'pending';       // Not yet checked

/**
 * Type of issue detected with an entity
 */
export type EntityIssueType =
  | 'ambiguous'        // Multiple possible matches (e.g., "Apple")
  | 'unverified'       // Critical entity with no match
  | 'low_authority'    // Low authority score
  | 'inconsistent'     // Name varies across topics
  | 'proprietary';     // No external match (acceptable)

/**
 * Health record for a single entity
 */
export interface EntityHealthRecord {
  entityName: string;
  normalizedName: string; // Lowercase, trimmed
  criticality: EntityCriticalityResult;
  verificationStatus: EntityVerificationStatus;
  authorityResult?: EntityAuthorityResult;
  issues: EntityHealthIssue[];
  wikidataId?: string;
  wikipediaUrl?: string;
  lastCheckedAt?: string;
  userMarkedProprietary?: boolean;
}

/**
 * Issue detected with an entity
 */
export interface EntityHealthIssue {
  type: EntityIssueType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  disambiguationOptions?: Array<{
    name: string;
    description: string;
    wikidataId: string;
  }>;
}

/**
 * Summary of entity health across all entities
 */
export interface EntityHealthSummary {
  totalEntities: number;
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
  proprietaryCount: number;
  ambiguousCount: number;
  healthScore: number; // 0-100
  criticalEntities: number;
  criticalVerified: number;
  issuesByType: Record<EntityIssueType, number>;
  lastAnalyzedAt: string;
}

/**
 * Progress tracking for entity health analysis
 */
export interface EntityHealthProgress {
  phase: 'extracting' | 'calculating_criticality' | 'verifying' | 'categorizing' | 'complete' | 'error';
  currentEntity?: string;
  totalEntities: number;
  processedEntities: number;
  progress: number; // 0-100
  error?: string;
}

/**
 * Configuration for entity health analysis
 */
export interface EntityHealthConfig {
  criticalityThreshold?: number;
  includeKnowledgeGraph?: boolean;
  language?: string;
  apiDelayMs?: number;
  maxConcurrent?: number;
}

/**
 * Complete result of entity health analysis
 */
export interface EntityHealthAnalysisResult {
  summary: EntityHealthSummary;
  entities: EntityHealthRecord[];
  issuesRequiringAttention: EntityHealthRecord[];
  autoVerified: EntityHealthRecord[];
  markedProprietary: EntityHealthRecord[];
}
