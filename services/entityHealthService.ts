/**
 * Entity Health Service
 *
 * Analyzes entity health across the semantic SEO framework by:
 * - Extracting entities from EAV triples
 * - Calculating criticality scores
 * - Verifying critical entities via Wikipedia/Wikidata/Knowledge Graph APIs
 * - Categorizing issues (ambiguous, unverified, low_authority, proprietary)
 * - Calculating overall health score weighted toward critical entities
 */

import { SemanticTriple, AttributeCategory, EntityAuthorityResult } from '../types';
import {
  EntityHealthRecord,
  EntityHealthSummary,
  EntityHealthIssue,
  EntityIssueType,
  EntityVerificationStatus,
  EntityHealthConfig,
  EntityHealthAnalysisResult,
  EntityHealthProgress,
} from '../types/entityHealth';
import {
  calculateCriticalityScore,
  EntityCriticalityInput,
  EntityCriticalityResult,
  CRITICALITY_THRESHOLD,
} from '../lib/entityCriticality';
import { validateEntityAuthority, KGProxyConfig } from './googleKnowledgeGraphService';

/**
 * Extracted entity from EAV triples
 */
export interface ExtractedEntity {
  entityName: string;
  isCentralEntity: boolean;
  attributeCategory: AttributeCategory | 'COMMON';
  isCoreSectionEntity: boolean;
  topicCount: number;
  sources: string[]; // Topic IDs
}

/**
 * Stats for health score calculation
 */
export interface HealthScoreStats {
  totalEntities: number;
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
  proprietaryCount: number;
  ambiguousCount: number;
  criticalEntities: number;
  criticalVerified: number;
}

/**
 * Default configuration for entity health analysis
 */
const DEFAULT_CONFIG: Required<EntityHealthConfig> = {
  criticalityThreshold: CRITICALITY_THRESHOLD,
  includeKnowledgeGraph: true,
  language: 'en',
  apiDelayMs: 300,
  maxConcurrent: 1,
};

/**
 * Check if a string looks like a proper noun (entity candidate)
 * - Starts with capital letter
 * - Not a number or measurement
 * - Not a common word that happens to be capitalized at sentence start
 */
function looksLikeProperNoun(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  const trimmed = value.trim();

  // Must start with capital letter
  if (!/^[A-Z]/.test(trimmed)) return false;

  // Should not be purely numeric or a measurement
  if (/^[\d.,]+(\s*[a-zA-Z]+)?$/.test(trimmed)) return false;

  // Should not be a common sentence-starting word
  const commonWords = [
    'The', 'This', 'That', 'These', 'Those', 'It', 'They', 'We', 'You', 'I',
    'A', 'An', 'Some', 'Any', 'Many', 'Much', 'Most', 'All', 'Both', 'Each',
    'Every', 'Either', 'Neither', 'No', 'None', 'Yes', 'True', 'False',
    'High', 'Low', 'Good', 'Bad', 'Very', 'More', 'Less', 'Most', 'Least',
  ];
  if (commonWords.includes(trimmed)) return false;

  // Should have at least 2 characters
  if (trimmed.length < 2) return false;

  return true;
}

/**
 * Normalize entity name for deduplication
 */
function normalizeEntityName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Get the highest priority category from a list
 * Priority: UNIQUE > ROOT > RARE > COMMON
 */
function getHighestPriorityCategory(
  categories: Array<AttributeCategory | 'COMMON'>
): AttributeCategory | 'COMMON' {
  const priority: Record<string, number> = {
    UNIQUE: 4,
    CORE_DEFINITION: 4,
    ROOT: 3,
    SEARCH_DEMAND: 3,
    RARE: 2,
    COMPETITIVE_EXPANSION: 2,
    COMPOSITE: 2,
    COMMON: 1,
    UNCLASSIFIED: 1,
  };

  let highest: AttributeCategory | 'COMMON' = 'COMMON';
  let highestPriority = 0;

  for (const category of categories) {
    const p = priority[category] || 1;
    if (p > highestPriority) {
      highestPriority = p;
      highest = category;
    }
  }

  return highest;
}

/**
 * Extract unique entities from EAV triples
 *
 * Extracts entities from:
 * - EAV `entity` (subject.label) field
 * - EAV `value` (object.value) field if it looks like a proper noun
 *
 * Deduplicates by lowercase name and tracks:
 * - Topic count (how many topics the entity appears in)
 * - Highest-priority attribute category
 * - Whether it's the central entity
 * - Whether it appears in core sections
 */
export function extractEntitiesFromEAVs(
  eavs: SemanticTriple[],
  centralEntity: string,
  coreTopicIds?: string[]
): ExtractedEntity[] {
  const entityMap = new Map<string, {
    entityName: string;
    categories: Array<AttributeCategory | 'COMMON'>;
    sources: Set<string>;
    isCentralEntity: boolean;
    isCoreSectionEntity: boolean;
  }>();

  const normalizedCentral = normalizeEntityName(centralEntity);
  const coreTopicSet = new Set(coreTopicIds || []);

  for (const eav of eavs) {
    // Extract source (topic) ID - use subject label as proxy if no explicit ID
    const sourceId = eav.subject.label;

    // Get category from predicate
    const category: AttributeCategory | 'COMMON' = eav.predicate.category || 'COMMON';

    // Extract entity from subject.label
    const subjectEntity = eav.subject.label;
    if (subjectEntity) {
      const normalized = normalizeEntityName(subjectEntity);
      const existing = entityMap.get(normalized);

      if (existing) {
        existing.categories.push(category);
        existing.sources.add(sourceId);
        if (coreTopicSet.has(sourceId)) {
          existing.isCoreSectionEntity = true;
        }
      } else {
        entityMap.set(normalized, {
          entityName: subjectEntity,
          categories: [category],
          sources: new Set([sourceId]),
          isCentralEntity: normalized === normalizedCentral,
          isCoreSectionEntity: coreTopicSet.has(sourceId),
        });
      }
    }

    // Extract entity from object.value if it looks like a proper noun
    const objectValue = eav.object.value;
    if (typeof objectValue === 'string' && looksLikeProperNoun(objectValue)) {
      const normalized = normalizeEntityName(objectValue);
      const existing = entityMap.get(normalized);

      if (existing) {
        existing.categories.push(category);
        existing.sources.add(sourceId);
        if (coreTopicSet.has(sourceId)) {
          existing.isCoreSectionEntity = true;
        }
      } else {
        entityMap.set(normalized, {
          entityName: objectValue,
          categories: [category],
          sources: new Set([sourceId]),
          isCentralEntity: normalized === normalizedCentral,
          isCoreSectionEntity: coreTopicSet.has(sourceId),
        });
      }
    }
  }

  // Convert map to array of ExtractedEntity
  return Array.from(entityMap.values()).map((entity) => ({
    entityName: entity.entityName,
    isCentralEntity: entity.isCentralEntity,
    attributeCategory: getHighestPriorityCategory(entity.categories),
    isCoreSectionEntity: entity.isCoreSectionEntity,
    topicCount: entity.sources.size,
    sources: Array.from(entity.sources),
  }));
}

/**
 * Categorize issues for an entity based on authority result and criticality
 *
 * Issue types:
 * - ambiguous: Multiple disambiguation options (severity: warning)
 * - unverified: No authority match - critical if score >= 0.7, info otherwise
 * - low_authority: Authority score < 30
 */
export function categorizeEntityIssues(
  entityName: string,
  authorityResult: EntityAuthorityResult | undefined,
  criticalityScore: number,
  disambiguationOptions?: Array<{ name: string; description: string; wikidataId: string }>
): EntityHealthIssue[] {
  const issues: EntityHealthIssue[] = [];

  // Check for ambiguity
  if (disambiguationOptions && disambiguationOptions.length > 1) {
    issues.push({
      type: 'ambiguous',
      severity: 'warning',
      message: `"${entityName}" has ${disambiguationOptions.length} possible matches. Disambiguation required.`,
      suggestion: 'Select the correct entity from disambiguation options to improve semantic clarity.',
      disambiguationOptions,
    });
  }

  // Check for unverified entity
  if (!authorityResult || authorityResult.verificationStatus === 'unverified') {
    const isCritical = criticalityScore >= CRITICALITY_THRESHOLD;
    issues.push({
      type: 'unverified',
      severity: isCritical ? 'critical' : 'info',
      message: isCritical
        ? `Critical entity "${entityName}" could not be verified in authoritative sources.`
        : `Entity "${entityName}" not found in Wikipedia, Wikidata, or Knowledge Graph.`,
      suggestion: isCritical
        ? 'Consider marking as proprietary if this is a brand-specific term, or verify the spelling.'
        : 'This may be a proprietary term or require alternative verification.',
    });
  }

  // Check for low authority score
  if (authorityResult && authorityResult.authorityScore < 30) {
    issues.push({
      type: 'low_authority',
      severity: 'warning',
      message: `Entity "${entityName}" has low authority score (${authorityResult.authorityScore}/100).`,
      suggestion: 'Strengthen entity presence by building authoritative mentions and structured data references.',
    });
  }

  return issues;
}

/**
 * Calculate overall health score for entities
 *
 * Formula:
 * - Critical entity verification = 70% of score: (criticalVerified / criticalEntities) * 70
 * - Overall verification = 30% of score: ((verified + partial*0.5) / (total - proprietary)) * 30
 * - Proprietary entities don't reduce score
 *
 * @returns Rounded integer 0-100
 */
export function calculateHealthScore(stats: HealthScoreStats): number {
  const {
    totalEntities,
    verifiedCount,
    partialCount,
    proprietaryCount,
    criticalEntities,
    criticalVerified,
  } = stats;

  // Handle edge cases
  if (totalEntities === 0) return 100;

  // Calculate critical entity score (70% weight)
  let criticalScore = 0;
  if (criticalEntities > 0) {
    criticalScore = (criticalVerified / criticalEntities) * 70;
  } else {
    // No critical entities - give full credit for this component
    criticalScore = 70;
  }

  // Calculate overall verification score (30% weight)
  // Proprietary entities are excluded from the denominator
  const verifiableEntities = totalEntities - proprietaryCount;
  let overallScore = 0;
  if (verifiableEntities > 0) {
    const verifiedEquivalent = verifiedCount + partialCount * 0.5;
    overallScore = (verifiedEquivalent / verifiableEntities) * 30;
  } else {
    // All entities are proprietary - give full credit
    overallScore = 30;
  }

  return Math.round(criticalScore + overallScore);
}

/**
 * Build EntityHealthSummary from array of EntityHealthRecord
 */
export function buildHealthSummary(records: EntityHealthRecord[]): EntityHealthSummary {
  const stats: HealthScoreStats = {
    totalEntities: records.length,
    verifiedCount: 0,
    partialCount: 0,
    unverifiedCount: 0,
    proprietaryCount: 0,
    ambiguousCount: 0,
    criticalEntities: 0,
    criticalVerified: 0,
  };

  const issuesByType: Record<EntityIssueType, number> = {
    ambiguous: 0,
    unverified: 0,
    low_authority: 0,
    inconsistent: 0,
    proprietary: 0,
  };

  for (const record of records) {
    // Count by verification status
    switch (record.verificationStatus) {
      case 'verified':
        stats.verifiedCount++;
        break;
      case 'partial':
        stats.partialCount++;
        break;
      case 'unverified':
        stats.unverifiedCount++;
        break;
      case 'proprietary':
        stats.proprietaryCount++;
        break;
      case 'ambiguous':
        stats.ambiguousCount++;
        break;
    }

    // Count critical entities
    if (record.criticality.isCritical) {
      stats.criticalEntities++;
      if (record.verificationStatus === 'verified' || record.verificationStatus === 'partial') {
        stats.criticalVerified++;
      }
    }

    // Count issues by type
    for (const issue of record.issues) {
      issuesByType[issue.type]++;
    }
  }

  return {
    totalEntities: stats.totalEntities,
    verifiedCount: stats.verifiedCount,
    partialCount: stats.partialCount,
    unverifiedCount: stats.unverifiedCount,
    proprietaryCount: stats.proprietaryCount,
    ambiguousCount: stats.ambiguousCount,
    healthScore: calculateHealthScore(stats),
    criticalEntities: stats.criticalEntities,
    criticalVerified: stats.criticalVerified,
    issuesByType,
    lastAnalyzedAt: new Date().toISOString(),
  };
}

/**
 * Mark an entity as proprietary
 * Returns updated EntityHealthRecord with status='proprietary' and issues filtered
 */
export function markAsProprietary(record: EntityHealthRecord): EntityHealthRecord {
  return {
    ...record,
    verificationStatus: 'proprietary',
    userMarkedProprietary: true,
    // Filter out unverified and low_authority issues since proprietary entities are intentionally unverifiable
    issues: record.issues.filter(
      (issue) => issue.type !== 'unverified' && issue.type !== 'low_authority'
    ),
  };
}

/**
 * Main entity health analysis function
 *
 * Process:
 * 1. Extract entities from EAV triples
 * 2. Calculate criticality for each entity
 * 3. Verify entities above threshold via validateEntityAuthority
 * 4. Categorize issues
 * 5. Build summary
 * 6. Return EntityHealthAnalysisResult
 */
export async function analyzeEntityHealth(
  eavs: SemanticTriple[],
  centralEntity: string,
  coreTopicIds?: string[],
  config?: EntityHealthConfig,
  onProgress?: (progress: EntityHealthProgress) => void,
  googleApiKey?: string,
  proxyConfig?: KGProxyConfig
): Promise<EntityHealthAnalysisResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const reportProgress = (
    phase: EntityHealthProgress['phase'],
    currentEntity: string | undefined,
    processedEntities: number,
    totalEntities: number,
    error?: string
  ) => {
    if (onProgress) {
      onProgress({
        phase,
        currentEntity,
        totalEntities,
        processedEntities,
        progress: totalEntities > 0 ? Math.round((processedEntities / totalEntities) * 100) : 0,
        error,
      });
    }
  };

  try {
    // Phase 1: Extract entities
    reportProgress('extracting', undefined, 0, 0);
    const extractedEntities = extractEntitiesFromEAVs(eavs, centralEntity, coreTopicIds);
    const totalEntities = extractedEntities.length;

    // Phase 2: Calculate criticality scores
    reportProgress('calculating_criticality', undefined, 0, totalEntities);
    const entitiesWithCriticality: Array<{
      extracted: ExtractedEntity;
      criticality: EntityCriticalityResult;
    }> = [];

    for (const extracted of extractedEntities) {
      const input: EntityCriticalityInput = {
        entityName: extracted.entityName,
        isCentralEntity: extracted.isCentralEntity,
        attributeCategory: extracted.attributeCategory,
        isCoreSectionEntity: extracted.isCoreSectionEntity,
        topicCount: extracted.topicCount,
        betweennessCentrality: 0, // Defaults to 0 until knowledge graph betweenness is computed
      };

      const criticality = calculateCriticalityScore(input);
      entitiesWithCriticality.push({ extracted, criticality });
    }

    // Phase 3: Verify critical entities
    reportProgress('verifying', undefined, 0, totalEntities);
    const records: EntityHealthRecord[] = [];
    let processed = 0;

    for (const { extracted, criticality } of entitiesWithCriticality) {
      reportProgress('verifying', extracted.entityName, processed, totalEntities);

      let authorityResult: EntityAuthorityResult | undefined;
      let verificationStatus: EntityVerificationStatus = 'pending';

      // Only verify entities above the criticality threshold
      if (criticality.score >= cfg.criticalityThreshold) {
        try {
          authorityResult = await validateEntityAuthority(
            extracted.entityName,
            undefined, // domain
            cfg.includeKnowledgeGraph ? googleApiKey : undefined,
            cfg.language,
            proxyConfig
          );

          verificationStatus = authorityResult.verificationStatus as EntityVerificationStatus;
        } catch (error) {
          console.warn(`[EntityHealth] Failed to verify ${extracted.entityName}:`, error);
          verificationStatus = 'unverified';
        }

        // Rate limiting between API calls
        if (cfg.apiDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, cfg.apiDelayMs));
        }
      } else {
        // Below threshold - skip verification but mark as pending
        verificationStatus = 'pending';
      }

      // Phase 4: Categorize issues
      const issues = categorizeEntityIssues(
        extracted.entityName,
        authorityResult,
        criticality.score
      );

      const record: EntityHealthRecord = {
        entityName: extracted.entityName,
        normalizedName: normalizeEntityName(extracted.entityName),
        criticality,
        verificationStatus,
        authorityResult,
        issues,
        wikidataId: authorityResult?.wikidata?.id,
        wikipediaUrl: authorityResult?.wikipedia?.pageUrl,
        lastCheckedAt: new Date().toISOString(),
      };

      records.push(record);
      processed++;
    }

    // Phase 5: Build summary
    reportProgress('categorizing', undefined, totalEntities, totalEntities);
    const summary = buildHealthSummary(records);

    // Categorize records for result
    const issuesRequiringAttention = records.filter(
      (r) => r.issues.some((i) => i.severity === 'critical' || i.severity === 'warning')
    );
    const autoVerified = records.filter(
      (r) => r.verificationStatus === 'verified' || r.verificationStatus === 'partial'
    );
    const markedProprietary = records.filter((r) => r.verificationStatus === 'proprietary');

    reportProgress('complete', undefined, totalEntities, totalEntities);

    return {
      summary,
      entities: records,
      issuesRequiringAttention,
      autoVerified,
      markedProprietary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reportProgress('error', undefined, 0, 0, errorMessage);
    throw error;
  }
}
