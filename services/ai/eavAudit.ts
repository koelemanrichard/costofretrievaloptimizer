/**
 * EAV Audit Service
 *
 * Validates consistency of EAV values across content briefs and topics.
 * Ensures the same entity doesn't have conflicting attribute values.
 */

import { SemanticTriple, ContentBrief, EnrichedTopic } from '../../types';

/**
 * Inconsistency severity levels
 */
export type InconsistencySeverity = 'critical' | 'warning' | 'info';

/**
 * EAV inconsistency found during audit
 */
export interface EavInconsistency {
  id: string;
  severity: InconsistencySeverity;
  type: 'value_conflict' | 'missing_attribute' | 'type_mismatch' | 'category_mismatch';
  subject: string;
  attribute: string;
  description: string;
  locations: {
    briefId?: string;
    topicTitle?: string;
    value: string;
  }[];
  suggestion: string;
}

/**
 * Full audit report result
 */
export interface EavAuditReport {
  timestamp: string;
  totalEavs: number;
  uniqueSubjects: number;
  uniqueAttributes: number;
  inconsistencies: EavInconsistency[];
  score: number;  // 0-100, higher is better
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

/**
 * EAV value occurrence across briefs
 */
interface EavOccurrence {
  value: string | number;
  briefId?: string;
  topicTitle?: string;
  category?: string;
  type?: string;
}

/**
 * Generate unique ID for inconsistency
 */
const generateInconsistencyId = (subject: string, attribute: string, type: string): string => {
  return `${subject.toLowerCase().replace(/\s+/g, '_')}_${attribute.toLowerCase().replace(/\s+/g, '_')}_${type}`;
};

/**
 * Group EAVs by subject and attribute for comparison
 */
const groupEavsBySubjectAttribute = (
  eavs: SemanticTriple[],
  contextInfo?: { briefId?: string; topicTitle?: string }
): Map<string, Map<string, EavOccurrence[]>> => {
  const grouped = new Map<string, Map<string, EavOccurrence[]>>();

  eavs.forEach(eav => {
    const subject = eav.subject?.label?.toLowerCase() || '';
    const attribute = eav.predicate?.relation?.toLowerCase() || '';

    if (!subject || !attribute) return;

    if (!grouped.has(subject)) {
      grouped.set(subject, new Map());
    }

    const subjectMap = grouped.get(subject)!;
    if (!subjectMap.has(attribute)) {
      subjectMap.set(attribute, []);
    }

    subjectMap.get(attribute)!.push({
      value: eav.object?.value ?? '',
      briefId: contextInfo?.briefId,
      topicTitle: contextInfo?.topicTitle,
      category: eav.predicate?.category,
      type: eav.object?.type
    });
  });

  return grouped;
};

/**
 * Check for value conflicts (same subject+attribute with different values)
 */
const findValueConflicts = (
  occurrences: EavOccurrence[],
  subject: string,
  attribute: string
): EavInconsistency | null => {
  if (occurrences.length < 2) return null;

  // Get unique values (normalized)
  const uniqueValues = new Set(
    occurrences.map(o => String(o.value).toLowerCase().trim())
  );

  if (uniqueValues.size <= 1) return null;

  // There's a conflict!
  const values = Array.from(uniqueValues);
  const isNumeric = occurrences.every(o => !isNaN(Number(o.value)));

  return {
    id: generateInconsistencyId(subject, attribute, 'value_conflict'),
    severity: isNumeric ? 'critical' : 'warning',
    type: 'value_conflict',
    subject,
    attribute,
    description: `The attribute "${attribute}" for "${subject}" has ${values.length} different values across content.`,
    locations: occurrences.map(o => ({
      briefId: o.briefId,
      topicTitle: o.topicTitle,
      value: String(o.value)
    })),
    suggestion: `Standardize the value for "${attribute}". Current values: ${values.join(', ')}`
  };
};

/**
 * Check for category mismatches (same attribute classified differently)
 */
const findCategoryMismatches = (
  occurrences: EavOccurrence[],
  subject: string,
  attribute: string
): EavInconsistency | null => {
  if (occurrences.length < 2) return null;

  const categories = new Set(
    occurrences.filter(o => o.category).map(o => o.category)
  );

  if (categories.size <= 1) return null;

  return {
    id: generateInconsistencyId(subject, attribute, 'category_mismatch'),
    severity: 'info',
    type: 'category_mismatch',
    subject,
    attribute,
    description: `The attribute "${attribute}" is categorized differently across EAVs.`,
    locations: occurrences.map(o => ({
      briefId: o.briefId,
      topicTitle: o.topicTitle,
      value: `Category: ${o.category || 'unknown'}`
    })),
    suggestion: `Standardize the category for "${attribute}" to ensure consistent semantic treatment.`
  };
};

/**
 * Check for type mismatches (same attribute with different value types)
 */
const findTypeMismatches = (
  occurrences: EavOccurrence[],
  subject: string,
  attribute: string
): EavInconsistency | null => {
  if (occurrences.length < 2) return null;

  const types = new Set(
    occurrences.filter(o => o.type).map(o => o.type)
  );

  if (types.size <= 1) return null;

  return {
    id: generateInconsistencyId(subject, attribute, 'type_mismatch'),
    severity: 'warning',
    type: 'type_mismatch',
    subject,
    attribute,
    description: `The attribute "${attribute}" has different value types.`,
    locations: occurrences.map(o => ({
      briefId: o.briefId,
      topicTitle: o.topicTitle,
      value: `Type: ${o.type || 'unknown'}, Value: ${o.value}`
    })),
    suggestion: `Ensure consistent value types for "${attribute}".`
  };
};

/**
 * Audit a single set of EAVs
 */
export const auditEavs = (eavs: SemanticTriple[]): EavAuditReport => {
  const grouped = groupEavsBySubjectAttribute(eavs);
  const inconsistencies: EavInconsistency[] = [];

  // Check each subject+attribute combination
  grouped.forEach((attributes, subject) => {
    attributes.forEach((occurrences, attribute) => {
      // Check for value conflicts
      const valueConflict = findValueConflicts(occurrences, subject, attribute);
      if (valueConflict) inconsistencies.push(valueConflict);

      // Check for category mismatches
      const categoryMismatch = findCategoryMismatches(occurrences, subject, attribute);
      if (categoryMismatch) inconsistencies.push(categoryMismatch);

      // Check for type mismatches
      const typeMismatch = findTypeMismatches(occurrences, subject, attribute);
      if (typeMismatch) inconsistencies.push(typeMismatch);
    });
  });

  // Calculate summary
  const summary = {
    critical: inconsistencies.filter(i => i.severity === 'critical').length,
    warning: inconsistencies.filter(i => i.severity === 'warning').length,
    info: inconsistencies.filter(i => i.severity === 'info').length
  };

  // Calculate score (100 - penalties)
  const criticalPenalty = summary.critical * 15;
  const warningPenalty = summary.warning * 5;
  const infoPenalty = summary.info * 1;
  const score = Math.max(0, 100 - criticalPenalty - warningPenalty - infoPenalty);

  return {
    timestamp: new Date().toISOString(),
    totalEavs: eavs.length,
    uniqueSubjects: grouped.size,
    uniqueAttributes: Array.from(grouped.values()).reduce((sum, attrs) => sum + attrs.size, 0),
    inconsistencies,
    score,
    summary
  };
};

/**
 * Audit EAVs across multiple content briefs
 */
export const auditBriefEavConsistency = (
  mapEavs: SemanticTriple[],
  briefs: ContentBrief[]
): EavAuditReport => {
  // Combine all EAVs with their source context
  const allGrouped = new Map<string, Map<string, EavOccurrence[]>>();

  // First, add the map-level EAVs
  const mapGrouped = groupEavsBySubjectAttribute(mapEavs, { topicTitle: '[Map-Level]' });
  mapGrouped.forEach((attrs, subject) => {
    if (!allGrouped.has(subject)) {
      allGrouped.set(subject, new Map());
    }
    attrs.forEach((occurrences, attr) => {
      if (!allGrouped.get(subject)!.has(attr)) {
        allGrouped.get(subject)!.set(attr, []);
      }
      allGrouped.get(subject)!.get(attr)!.push(...occurrences);
    });
  });

  // Then, add each brief's EAVs (from contextualVectors)
  briefs.forEach(brief => {
    const briefEavs = brief.contextualVectors || [];
    if (briefEavs.length === 0) return;

    const briefGrouped = groupEavsBySubjectAttribute(
      briefEavs,
      { briefId: brief.id, topicTitle: brief.title }
    );

    briefGrouped.forEach((attrs, subject) => {
      if (!allGrouped.has(subject)) {
        allGrouped.set(subject, new Map());
      }
      attrs.forEach((occurrences, attr) => {
        if (!allGrouped.get(subject)!.has(attr)) {
          allGrouped.get(subject)!.set(attr, []);
        }
        allGrouped.get(subject)!.get(attr)!.push(...occurrences);
      });
    });
  });

  // Run consistency checks
  const inconsistencies: EavInconsistency[] = [];

  allGrouped.forEach((attributes, subject) => {
    attributes.forEach((occurrences, attribute) => {
      // Only check if there are multiple occurrences from different sources
      if (occurrences.length < 2) return;

      const valueConflict = findValueConflicts(occurrences, subject, attribute);
      if (valueConflict) inconsistencies.push(valueConflict);

      const categoryMismatch = findCategoryMismatches(occurrences, subject, attribute);
      if (categoryMismatch) inconsistencies.push(categoryMismatch);

      const typeMismatch = findTypeMismatches(occurrences, subject, attribute);
      if (typeMismatch) inconsistencies.push(typeMismatch);
    });
  });

  // Calculate totals
  const totalEavs = mapEavs.length + briefs.reduce((sum, b) => sum + (b.contextualVectors?.length || 0), 0);

  const summary = {
    critical: inconsistencies.filter(i => i.severity === 'critical').length,
    warning: inconsistencies.filter(i => i.severity === 'warning').length,
    info: inconsistencies.filter(i => i.severity === 'info').length
  };

  const criticalPenalty = summary.critical * 15;
  const warningPenalty = summary.warning * 5;
  const infoPenalty = summary.info * 1;
  const score = Math.max(0, 100 - criticalPenalty - warningPenalty - infoPenalty);

  return {
    timestamp: new Date().toISOString(),
    totalEavs,
    uniqueSubjects: allGrouped.size,
    uniqueAttributes: Array.from(allGrouped.values()).reduce((sum, attrs) => sum + attrs.size, 0),
    inconsistencies,
    score,
    summary
  };
};

/**
 * Find missing required EAVs in briefs (compared to map-level EAVs)
 */
export const findMissingBriefEavs = (
  mapEavs: SemanticTriple[],
  brief: ContentBrief
): {
  missing: { subject: string; attribute: string; expectedValue: string }[];
  coverage: number;
} => {
  const briefEavs = brief.contextualVectors || [];

  // Get unique subject+attribute combinations from map
  const mapAttributes = new Set(
    mapEavs.map(eav =>
      `${eav.subject?.label?.toLowerCase()}_${eav.predicate?.relation?.toLowerCase()}`
    )
  );

  // Get unique subject+attribute combinations from brief
  const briefAttributes = new Set(
    briefEavs.map(eav =>
      `${eav.subject?.label?.toLowerCase()}_${eav.predicate?.relation?.toLowerCase()}`
    )
  );

  // Find ROOT EAVs in map that are missing from brief
  const rootEavs = mapEavs.filter(eav =>
    eav.predicate?.category === 'ROOT' || eav.predicate?.category === 'CORE_DEFINITION'
  );

  const missing = rootEavs
    .filter(eav => {
      const key = `${eav.subject?.label?.toLowerCase()}_${eav.predicate?.relation?.toLowerCase()}`;
      return !briefAttributes.has(key);
    })
    .map(eav => ({
      subject: eav.subject?.label || '',
      attribute: eav.predicate?.relation || '',
      expectedValue: String(eav.object?.value || '')
    }));

  // Calculate coverage
  const coverage = mapAttributes.size > 0
    ? Math.round(([...mapAttributes].filter(k => briefAttributes.has(k)).length / mapAttributes.size) * 100)
    : 100;

  return { missing, coverage };
};

/**
 * Get audit grade based on score
 */
export const getAuditGrade = (score: number): {
  grade: string;
  label: string;
  color: string;
} => {
  if (score >= 95) return { grade: 'A+', label: 'Excellent Consistency', color: '#22c55e' };
  if (score >= 90) return { grade: 'A', label: 'Great Consistency', color: '#22c55e' };
  if (score >= 80) return { grade: 'B', label: 'Good Consistency', color: '#84cc16' };
  if (score >= 70) return { grade: 'C', label: 'Acceptable', color: '#eab308' };
  if (score >= 60) return { grade: 'D', label: 'Needs Attention', color: '#f97316' };
  return { grade: 'F', label: 'Inconsistent', color: '#ef4444' };
};

export default {
  auditEavs,
  auditBriefEavConsistency,
  findMissingBriefEavs,
  getAuditGrade
};
