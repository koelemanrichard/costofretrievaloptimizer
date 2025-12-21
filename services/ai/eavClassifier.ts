/**
 * EAV Classifier Service
 *
 * Automatically classifies EAVs that don't have categories assigned.
 * Uses heuristics and optionally AI to determine category and classification.
 */

import { SemanticTriple, AttributeCategory, AttributeClass } from '../../types';

/**
 * Heuristic rules for automatic classification based on predicate patterns
 */
const PREDICATE_CATEGORY_HINTS: Record<string, { category: AttributeCategory; classification?: AttributeClass }> = {
  // ROOT predicates - core identity
  'is_a': { category: 'ROOT', classification: 'TYPE' },
  'type_of': { category: 'ROOT', classification: 'TYPE' },
  'belongs_to': { category: 'ROOT', classification: 'TYPE' },
  'has_category': { category: 'ROOT', classification: 'TYPE' },
  'defined_as': { category: 'ROOT', classification: 'TYPE' },
  'located_in': { category: 'ROOT', classification: 'SPECIFICATION' },
  'founded_in': { category: 'ROOT', classification: 'SPECIFICATION' },
  'has_price': { category: 'ROOT', classification: 'SPECIFICATION' },
  'costs': { category: 'ROOT', classification: 'SPECIFICATION' },

  // UNIQUE predicates - differentiators
  'has_feature': { category: 'UNIQUE', classification: 'COMPONENT' },
  'unique_feature': { category: 'UNIQUE', classification: 'COMPONENT' },
  'differentiates_by': { category: 'UNIQUE', classification: 'BENEFIT' },
  'advantage': { category: 'UNIQUE', classification: 'BENEFIT' },
  'specializes_in': { category: 'UNIQUE', classification: 'COMPONENT' },
  'integrates_with': { category: 'UNIQUE', classification: 'COMPONENT' },
  'has_patent': { category: 'UNIQUE', classification: 'SPECIFICATION' },
  'proprietary': { category: 'UNIQUE', classification: 'COMPONENT' },

  // RARE predicates - technical details
  'requires': { category: 'RARE', classification: 'SPECIFICATION' },
  'technical_spec': { category: 'RARE', classification: 'SPECIFICATION' },
  'compatible_with': { category: 'RARE', classification: 'SPECIFICATION' },
  'made_of': { category: 'RARE', classification: 'COMPONENT' },
  'weighs': { category: 'RARE', classification: 'SPECIFICATION' },
  'measures': { category: 'RARE', classification: 'SPECIFICATION' },
  'certified_by': { category: 'RARE', classification: 'SPECIFICATION' },
  'complies_with': { category: 'RARE', classification: 'SPECIFICATION' },

  // COMMON predicates - general
  'has': { category: 'COMMON', classification: 'COMPONENT' },
  'includes': { category: 'COMMON', classification: 'COMPONENT' },
  'supports': { category: 'COMMON', classification: 'SPECIFICATION' },
  'available': { category: 'COMMON', classification: 'SPECIFICATION' },

  // Process predicates
  'how_to': { category: 'RARE', classification: 'PROCESS' },
  'process': { category: 'RARE', classification: 'PROCESS' },
  'method': { category: 'RARE', classification: 'PROCESS' },
  'steps': { category: 'RARE', classification: 'PROCESS' },

  // Benefit predicates
  'benefits': { category: 'UNIQUE', classification: 'BENEFIT' },
  'advantage_of': { category: 'UNIQUE', classification: 'BENEFIT' },
  'helps_with': { category: 'UNIQUE', classification: 'BENEFIT' },
  'improves': { category: 'UNIQUE', classification: 'BENEFIT' },
  'reduces': { category: 'UNIQUE', classification: 'BENEFIT' },
  'saves': { category: 'UNIQUE', classification: 'BENEFIT' },

  // Risk predicates
  'risk': { category: 'RARE', classification: 'RISK' },
  'limitation': { category: 'RARE', classification: 'RISK' },
  'challenge': { category: 'RARE', classification: 'RISK' },
  'warning': { category: 'RARE', classification: 'RISK' },
  'side_effect': { category: 'RARE', classification: 'RISK' },
  'contraindication': { category: 'RARE', classification: 'RISK' },
};

/**
 * Classify a single EAV predicate based on heuristics
 */
export const classifyPredicate = (relation: string): { category: AttributeCategory; classification: AttributeClass } => {
  const normalized = relation.toLowerCase().replace(/[\s\-_]+/g, '_');

  // Check exact match first
  if (PREDICATE_CATEGORY_HINTS[normalized]) {
    return {
      category: PREDICATE_CATEGORY_HINTS[normalized].category,
      classification: PREDICATE_CATEGORY_HINTS[normalized].classification || 'TYPE',
    };
  }

  // Check partial matches
  for (const [pattern, hint] of Object.entries(PREDICATE_CATEGORY_HINTS)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return {
        category: hint.category,
        classification: hint.classification || 'TYPE',
      };
    }
  }

  // Keyword-based classification
  const lower = normalized;

  // BENEFIT indicators
  if (lower.includes('benefit') || lower.includes('advantage') || lower.includes('improve') ||
      lower.includes('help') || lower.includes('save') || lower.includes('reduce')) {
    return { category: 'UNIQUE', classification: 'BENEFIT' };
  }

  // RISK indicators
  if (lower.includes('risk') || lower.includes('warn') || lower.includes('limit') ||
      lower.includes('challenge') || lower.includes('issue') || lower.includes('problem')) {
    return { category: 'RARE', classification: 'RISK' };
  }

  // PROCESS indicators
  if (lower.includes('process') || lower.includes('method') || lower.includes('step') ||
      lower.includes('how') || lower.includes('procedure') || lower.includes('workflow')) {
    return { category: 'RARE', classification: 'PROCESS' };
  }

  // COMPONENT indicators
  if (lower.includes('component') || lower.includes('part') || lower.includes('include') ||
      lower.includes('contain') || lower.includes('feature') || lower.includes('element')) {
    return { category: 'UNIQUE', classification: 'COMPONENT' };
  }

  // SPECIFICATION indicators
  if (lower.includes('spec') || lower.includes('require') || lower.includes('size') ||
      lower.includes('weight') || lower.includes('dimension') || lower.includes('version') ||
      lower.includes('date') || lower.includes('price') || lower.includes('cost')) {
    return { category: 'ROOT', classification: 'SPECIFICATION' };
  }

  // TYPE indicators (is_a, type_of, etc.)
  if (lower.includes('is_') || lower.includes('type') || lower.includes('kind') ||
      lower.includes('category') || lower.includes('class')) {
    return { category: 'ROOT', classification: 'TYPE' };
  }

  // Default to COMMON/TYPE for unknown predicates
  return { category: 'COMMON', classification: 'TYPE' };
};

/**
 * Auto-classify all unclassified EAVs in a list
 */
export const autoClassifyEavs = (eavs: SemanticTriple[]): SemanticTriple[] => {
  return eavs.map(eav => {
    // Skip if already classified
    if (eav.predicate?.category && eav.predicate.category !== 'UNCLASSIFIED') {
      return eav;
    }

    const relation = eav.predicate?.relation || '';
    const { category, classification } = classifyPredicate(relation);

    return {
      ...eav,
      predicate: {
        ...eav.predicate,
        relation: eav.predicate?.relation || '',
        type: eav.predicate?.type || 'Property',
        category,
        classification,
      },
    };
  });
};

/**
 * Get classification statistics for a list of EAVs
 */
export const getClassificationStats = (eavs: SemanticTriple[]): {
  total: number;
  classified: number;
  unclassified: number;
  byCategory: Record<string, number>;
  byClassification: Record<string, number>;
} => {
  const byCategory: Record<string, number> = {};
  const byClassification: Record<string, number> = {};
  let classified = 0;
  let unclassified = 0;

  for (const eav of eavs) {
    const category = eav.predicate?.category || 'UNCLASSIFIED';
    const classification = eav.predicate?.classification || 'UNCLASSIFIED';

    byCategory[category] = (byCategory[category] || 0) + 1;
    byClassification[classification] = (byClassification[classification] || 0) + 1;

    if (category && category !== 'UNCLASSIFIED') {
      classified++;
    } else {
      unclassified++;
    }
  }

  return {
    total: eavs.length,
    classified,
    unclassified,
    byCategory,
    byClassification,
  };
};

export default {
  classifyPredicate,
  autoClassifyEavs,
  getClassificationStats,
};
