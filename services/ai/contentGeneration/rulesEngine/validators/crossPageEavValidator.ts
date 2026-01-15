// services/ai/contentGeneration/rulesEngine/validators/crossPageEavValidator.ts
//
// Cross-Page EAV Consistency Validator
// Ensures Knowledge-Based Trust (KBT) by validating that all facts (EAV triples)
// are consistent across the entire Semantic Content Network.

import { SupabaseClient } from '@supabase/supabase-js';
import { SemanticTriple } from '../../../../../types';

/**
 * Represents a contradiction between EAV claims in different articles
 */
export interface EavContradiction {
  entity: string;
  attribute: string;
  currentValue: string;
  conflictingValue: string;
  conflictingArticle: { id: string; title: string };
}

/**
 * Represents a warning about potential EAV consistency issues
 */
export interface EavConsistencyWarning {
  entity: string;
  attribute: string;
  message: string;
}

/**
 * Result of cross-page EAV consistency validation
 */
export interface EavConsistencyResult {
  isConsistent: boolean;
  contradictions: EavContradiction[];
  warnings: EavConsistencyWarning[];
}

/**
 * Extracted EAV claim from a related article
 */
interface ExtractedClaim {
  entity: string;
  attribute: string;
  value: string;
  source: { id: string; title: string };
}

/**
 * Validate EAV consistency across articles in the same topical map.
 * Ensures no contradicting facts between articles for Knowledge-Based Trust.
 *
 * @param currentJobId - The ID of the current content generation job
 * @param mapId - The topical map ID to check against
 * @param currentEavs - The EAVs from the current article being validated
 * @param supabase - Supabase client for database queries
 * @returns Validation result with contradictions and warnings
 */
export async function validateCrossPageEavConsistency(
  currentJobId: string,
  mapId: string,
  currentEavs: SemanticTriple[],
  supabase: SupabaseClient
): Promise<EavConsistencyResult> {
  const contradictions: EavContradiction[] = [];
  const warnings: EavConsistencyWarning[] = [];

  // Early return if no EAVs to validate or no mapId
  if (!currentEavs || currentEavs.length === 0 || !mapId) {
    return { isConsistent: true, contradictions, warnings };
  }

  try {
    // Get all completed jobs in the same topical map (excluding current job)
    const { data: relatedJobs, error } = await supabase
      .from('content_generation_jobs')
      .select(`
        id,
        content_briefs!inner(id, title, eavs)
      `)
      .eq('map_id', mapId)
      .eq('status', 'completed')
      .neq('id', currentJobId);

    if (error || !relatedJobs) {
      console.warn('[CrossPageEAV] Failed to fetch related jobs:', error);
      return { isConsistent: true, contradictions, warnings };
    }

    // Extract all EAV claims from related articles
    const existingClaims = extractEavClaims(relatedJobs);

    // Compare current EAVs against existing claims
    for (const eav of currentEavs) {
      // Skip EAVs with missing required fields
      if (!eav.subject?.label || !eav.predicate?.relation || eav.object?.value === undefined) {
        continue;
      }

      const entityKey = normalizeString(eav.subject.label);
      const attributeKey = normalizeString(eav.predicate.relation);
      const currentValue = String(eav.object.value);

      // Skip if entity or attribute is empty after normalization
      if (!entityKey || !attributeKey) {
        continue;
      }

      // Look for same entity + attribute with different value
      const existing = existingClaims.find(claim =>
        normalizeString(claim.entity) === entityKey &&
        normalizeString(claim.attribute) === attributeKey
      );

      if (existing && !valuesMatch(currentValue, existing.value)) {
        contradictions.push({
          entity: eav.subject.label,
          attribute: eav.predicate.relation,
          currentValue,
          conflictingValue: existing.value,
          conflictingArticle: existing.source
        });
      }
    }

    return {
      isConsistent: contradictions.length === 0,
      contradictions,
      warnings
    };
  } catch (err) {
    console.error('[CrossPageEAV] Validation error:', err);
    return { isConsistent: true, contradictions, warnings };
  }
}

/**
 * Extract EAV claims from related job data
 */
function extractEavClaims(jobs: any[]): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  for (const job of jobs) {
    const brief = job.content_briefs;
    if (!brief?.eavs || !Array.isArray(brief.eavs)) continue;

    for (const eav of brief.eavs) {
      if (eav.subject?.label && eav.predicate?.relation && eav.object?.value !== undefined) {
        claims.push({
          entity: eav.subject.label,
          attribute: eav.predicate.relation,
          value: String(eav.object.value),
          source: { id: brief.id, title: brief.title || 'Untitled' }
        });
      }
    }
  }

  return claims;
}

/**
 * Normalize string for comparison (lowercase, trim, collapse whitespace)
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two values match, with tolerance for numeric values.
 * - Exact string match after normalization
 * - Numeric tolerance of 5% for number values
 */
function valuesMatch(a: string, b: string): boolean {
  // Exact match after normalization
  if (normalizeString(a) === normalizeString(b)) return true;

  // Numeric tolerance (within 5% for numbers)
  const numA = parseFloat(a.replace(/[^0-9.-]/g, ''));
  const numB = parseFloat(b.replace(/[^0-9.-]/g, ''));
  if (!isNaN(numA) && !isNaN(numB)) {
    const tolerance = Math.max(numA, numB) * 0.05;
    return Math.abs(numA - numB) <= tolerance;
  }

  return false;
}
