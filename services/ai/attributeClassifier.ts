/**
 * Attribute Classifier Service
 *
 * Classifies EAV attributes based on their frequency across competitors.
 * This is distinct from eavClassifier.ts which classifies by predicate patterns.
 *
 * Classification Rules (from Semantic SEO research):
 * - ROOT: Appears in 70%+ of top competitors (definitional, expected)
 * - RARE: Appears in 20-69% of competitors (authority signal)
 * - UNIQUE: Appears in <20% or only this competitor (differentiation)
 *
 * Usage:
 * ```typescript
 * const classified = classifyAttributesByFrequency(competitorEAVs);
 * console.log(classified.distribution); // { root: 5, rare: 12, unique: 3 }
 * ```
 */

import { SemanticTriple, AttributeCategory } from '../../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Rarity classification based on competitor frequency
 */
export type AttributeRarity = 'root' | 'rare' | 'unique' | 'unknown';

/**
 * Result of classifying a single attribute
 */
export interface AttributeClassificationResult {
  attribute: string;
  rarity: AttributeRarity;
  reasoning: string;
  competitorCount: number;
  competitorPercentage: number;
  examples: {
    value: string;
    source: string;
  }[];
}

/**
 * Aggregated classification results for all attributes
 */
export interface AttributeDistribution {
  root: number;
  rare: number;
  unique: number;
  total: number;

  rootCoverage: number;   // % of market root attributes this competitor covers
  rareCoverage: number;   // % of market rare attributes this competitor covers

  details: AttributeClassificationResult[];
}

/**
 * Gap analysis based on attribute classification
 */
export interface AttributeGaps {
  missingRoot: {
    attribute: string;
    competitorsCovering: number;
    priority: 'critical';
    examples: string[];
  }[];

  missingRare: {
    attribute: string;
    competitorsCovering: number;
    priority: 'high';
    examples: string[];
  }[];

  uniqueAdvantages: {
    attribute: string;
    value: string;
    priority: 'medium';
  }[];
}

/**
 * Source of competitor EAVs with metadata
 */
export interface CompetitorEAVSource {
  url: string;
  domain: string;
  position: number;
  eavs: SemanticTriple[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize an attribute name for comparison
 * Handles variations in phrasing, case, underscores, etc.
 */
export function normalizeAttribute(attribute: string): string {
  return attribute
    .toLowerCase()
    .replace(/[\s\-_]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .trim();
}

/**
 * Check if two attributes are semantically similar
 */
export function attributesMatch(attr1: string, attr2: string): boolean {
  const norm1 = normalizeAttribute(attr1);
  const norm2 = normalizeAttribute(attr2);

  // Exact match
  if (norm1 === norm2) return true;

  // One contains the other (for partial matches)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Common synonyms (expand as needed)
  const synonymGroups: string[][] = [
    ['price', 'cost', 'pricing'],
    ['feature', 'capability', 'functionality'],
    ['benefit', 'advantage', 'pro'],
    ['risk', 'disadvantage', 'con', 'limitation'],
    ['type', 'category', 'kind', 'class'],
    ['size', 'dimension', 'measurement'],
    ['weight', 'mass'],
    ['color', 'colour'],
    ['material', 'made_of', 'composed_of'],
    ['use', 'application', 'purpose'],
  ];

  for (const group of synonymGroups) {
    const inGroup1 = group.some(s => norm1.includes(s));
    const inGroup2 = group.some(s => norm2.includes(s));
    if (inGroup1 && inGroup2) return true;
  }

  return false;
}

// =============================================================================
// Core Classification Functions
// =============================================================================

/**
 * Count how many competitors mention an attribute
 */
export function countCompetitorMentions(
  attribute: string,
  competitorEAVs: CompetitorEAVSource[]
): {
  count: number;
  percentage: number;
  examples: { value: string; source: string }[];
} {
  const examples: { value: string; source: string }[] = [];
  let count = 0;

  for (const competitor of competitorEAVs) {
    const match = competitor.eavs.find(eav =>
      attributesMatch(eav.predicate?.relation || '', attribute)
    );

    if (match) {
      count++;
      examples.push({
        value: String(match.object?.value || ''),
        source: competitor.domain,
      });
    }
  }

  return {
    count,
    percentage: competitorEAVs.length > 0 ? count / competitorEAVs.length : 0,
    examples,
  };
}

/**
 * Classify a single attribute based on competitor frequency
 *
 * Rules from research:
 * - ROOT: Appears in 70%+ of top competitors (definitional, expected)
 * - RARE: Appears in 20-69% of competitors (authority signal)
 * - UNIQUE: Appears in <20% (differentiation opportunity)
 */
export function classifyAttributeByFrequency(
  attribute: string,
  competitorEAVs: CompetitorEAVSource[]
): AttributeClassificationResult {
  const { count, percentage, examples } = countCompetitorMentions(attribute, competitorEAVs);

  let rarity: AttributeRarity;
  let reasoning: string;

  if (percentage >= 0.7) {
    rarity = 'root';
    reasoning = `Found in ${count}/${competitorEAVs.length} competitors (${Math.round(percentage * 100)}%) - Definitional attribute, expected by searchers`;
  } else if (percentage >= 0.2) {
    rarity = 'rare';
    reasoning = `Found in ${count}/${competitorEAVs.length} competitors (${Math.round(percentage * 100)}%) - Authority signal, demonstrates expertise`;
  } else {
    rarity = 'unique';
    reasoning = `Found in only ${count}/${competitorEAVs.length} competitors (${Math.round(percentage * 100)}%) - Differentiation opportunity`;
  }

  return {
    attribute,
    rarity,
    reasoning,
    competitorCount: count,
    competitorPercentage: percentage,
    examples: examples.slice(0, 3), // Top 3 examples
  };
}

/**
 * Extract all unique attributes from competitor EAVs
 */
export function extractAllAttributes(competitorEAVs: CompetitorEAVSource[]): string[] {
  const attributeSet = new Set<string>();

  for (const competitor of competitorEAVs) {
    for (const eav of competitor.eavs) {
      const attr = eav.predicate?.relation;
      if (attr) {
        attributeSet.add(normalizeAttribute(attr));
      }
    }
  }

  return Array.from(attributeSet);
}

/**
 * Classify all attributes from competitors by frequency
 */
export function classifyAllAttributes(
  competitorEAVs: CompetitorEAVSource[]
): AttributeClassificationResult[] {
  const allAttributes = extractAllAttributes(competitorEAVs);

  return allAttributes.map(attr =>
    classifyAttributeByFrequency(attr, competitorEAVs)
  );
}

/**
 * Calculate attribute distribution for a specific page/content
 *
 * @param pageEAVs - EAVs from the page being analyzed
 * @param marketClassification - Classification from all competitors
 */
export function calculateAttributeDistribution(
  pageEAVs: SemanticTriple[],
  marketClassification: AttributeClassificationResult[]
): AttributeDistribution {
  const pageAttributes = new Set(
    pageEAVs.map(eav => normalizeAttribute(eav.predicate?.relation || ''))
  );

  // Count how many of each type this page covers
  let rootCount = 0;
  let rareCount = 0;
  let uniqueCount = 0;

  // Track market totals for coverage calculation
  let marketRootTotal = 0;
  let marketRareTotal = 0;

  const details: AttributeClassificationResult[] = [];

  for (const classification of marketClassification) {
    const normalizedAttr = normalizeAttribute(classification.attribute);
    const pageHasAttribute = pageAttributes.has(normalizedAttr);

    if (classification.rarity === 'root') {
      marketRootTotal++;
      if (pageHasAttribute) rootCount++;
    } else if (classification.rarity === 'rare') {
      marketRareTotal++;
      if (pageHasAttribute) rareCount++;
    } else if (classification.rarity === 'unique') {
      if (pageHasAttribute) uniqueCount++;
    }

    if (pageHasAttribute) {
      details.push(classification);
    }
  }

  return {
    root: rootCount,
    rare: rareCount,
    unique: uniqueCount,
    total: rootCount + rareCount + uniqueCount,
    rootCoverage: marketRootTotal > 0 ? (rootCount / marketRootTotal) * 100 : 100,
    rareCoverage: marketRareTotal > 0 ? (rareCount / marketRareTotal) * 100 : 0,
    details,
  };
}

/**
 * Identify attribute gaps for a page compared to competitors
 *
 * @param pageEAVs - EAVs from the page being analyzed
 * @param marketClassification - Classification from all competitors
 */
export function identifyAttributeGaps(
  pageEAVs: SemanticTriple[],
  marketClassification: AttributeClassificationResult[]
): AttributeGaps {
  const pageAttributes = new Set(
    pageEAVs.map(eav => normalizeAttribute(eav.predicate?.relation || ''))
  );

  const missingRoot: AttributeGaps['missingRoot'] = [];
  const missingRare: AttributeGaps['missingRare'] = [];
  const uniqueAdvantages: AttributeGaps['uniqueAdvantages'] = [];

  for (const classification of marketClassification) {
    const normalizedAttr = normalizeAttribute(classification.attribute);
    const pageHasAttribute = pageAttributes.has(normalizedAttr);

    if (classification.rarity === 'root' && !pageHasAttribute) {
      missingRoot.push({
        attribute: classification.attribute,
        competitorsCovering: classification.competitorCount,
        priority: 'critical',
        examples: classification.examples.map(e => e.value),
      });
    } else if (classification.rarity === 'rare' && !pageHasAttribute) {
      missingRare.push({
        attribute: classification.attribute,
        competitorsCovering: classification.competitorCount,
        priority: 'high',
        examples: classification.examples.map(e => e.value),
      });
    }
  }

  // Find unique attributes only this page has
  for (const eav of pageEAVs) {
    const attr = normalizeAttribute(eav.predicate?.relation || '');
    const inMarket = marketClassification.find(
      c => normalizeAttribute(c.attribute) === attr
    );

    if (!inMarket || inMarket.competitorCount === 0) {
      uniqueAdvantages.push({
        attribute: eav.predicate?.relation || attr,
        value: String(eav.object?.value || ''),
        priority: 'medium',
      });
    }
  }

  // Sort by importance
  missingRoot.sort((a, b) => b.competitorsCovering - a.competitorsCovering);
  missingRare.sort((a, b) => b.competitorsCovering - a.competitorsCovering);

  return {
    missingRoot,
    missingRare,
    uniqueAdvantages,
  };
}

// =============================================================================
// Utility Functions for Integration
// =============================================================================

/**
 * Convert legacy AttributeCategory to AttributeRarity
 */
export function categoryToRarity(category: AttributeCategory | undefined): AttributeRarity {
  switch (category) {
    case 'ROOT':
      return 'root';
    case 'RARE':
      return 'rare';
    case 'UNIQUE':
      return 'unique';
    default:
      return 'unknown';
  }
}

/**
 * Convert AttributeRarity to legacy AttributeCategory
 */
export function rarityToCategory(rarity: AttributeRarity): AttributeCategory {
  switch (rarity) {
    case 'root':
      return 'ROOT';
    case 'rare':
      return 'RARE';
    case 'unique':
      return 'UNIQUE';
    default:
      return 'UNCLASSIFIED';
  }
}

/**
 * Enrich EAVs with rarity classification from market analysis
 */
export function enrichEavsWithRarity(
  eavs: SemanticTriple[],
  marketClassification: AttributeClassificationResult[]
): SemanticTriple[] {
  return eavs.map(eav => {
    const attr = normalizeAttribute(eav.predicate?.relation || '');
    const classification = marketClassification.find(
      c => normalizeAttribute(c.attribute) === attr
    );

    if (!classification) {
      return eav; // No market data, keep as-is
    }

    return {
      ...eav,
      predicate: {
        ...eav.predicate,
        relation: eav.predicate?.relation || '',
        type: eav.predicate?.type || 'Property',
        category: rarityToCategory(classification.rarity),
      },
    };
  });
}

// =============================================================================
// Export
// =============================================================================

export default {
  normalizeAttribute,
  attributesMatch,
  countCompetitorMentions,
  classifyAttributeByFrequency,
  extractAllAttributes,
  classifyAllAttributes,
  calculateAttributeDistribution,
  identifyAttributeGaps,
  categoryToRarity,
  rarityToCategory,
  enrichEavsWithRarity,
};
