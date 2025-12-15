/**
 * EAV Analytics Module
 *
 * Provides completeness scoring and category distribution analysis
 * for Entity-Attribute-Value (Semantic Triple) data.
 */

import { SemanticTriple, AttributeCategory } from '../types';

/**
 * Breakdown of EAV completeness by category
 */
export interface EavCompletenessBreakdown {
  rootCoverage: number;      // 0-100: % of expected ROOT attributes
  uniqueCoverage: number;    // 0-100: Has differentiating UNIQUE attributes
  rareCoverage: number;      // 0-100: Has depth via RARE attributes
  categoryBalance: number;   // 0-100: How well-distributed across categories
}

/**
 * Information about missing categories and suggestions
 */
export interface MissingCategoryInfo {
  category: AttributeCategory;
  count: number;
  suggestions: string[];
}

/**
 * Complete EAV completeness score result
 */
export interface EavCompletenessScore {
  overall: number;  // 0-100: Combined score
  breakdown: EavCompletenessBreakdown;
  missing: MissingCategoryInfo[];
  recommendations: string[];
  categoryCounts: Record<AttributeCategory | 'UNCATEGORIZED', number>;
  totalEavs: number;
}

/**
 * Category distribution for visualization
 */
export interface CategoryDistribution {
  category: AttributeCategory | 'UNCATEGORIZED';
  count: number;
  percentage: number;
  color: string;
}

// Color scheme for categories
export const CATEGORY_COLORS: Record<AttributeCategory | 'UNCATEGORIZED', string> = {
  ROOT: '#3b82f6',           // Blue - Foundation
  CORE_DEFINITION: '#3b82f6', // Blue - Same as ROOT
  UNIQUE: '#8b5cf6',         // Purple - Differentiation
  COMPETITIVE_EXPANSION: '#8b5cf6', // Purple - Same as UNIQUE
  RARE: '#f97316',           // Orange - Depth
  SEARCH_DEMAND: '#f97316',  // Orange - Same as RARE
  COMMON: '#6b7280',         // Gray - Generic
  COMPOSITE: '#6b7280',      // Gray - Same as COMMON
  UNCATEGORIZED: '#9ca3af'   // Light gray
};

// Expected minimum counts for good coverage
const EXPECTED_COUNTS = {
  ROOT: 3,      // At least 3 ROOT/CORE_DEFINITION attributes
  UNIQUE: 2,    // At least 2 UNIQUE/COMPETITIVE_EXPANSION attributes
  RARE: 2,      // At least 2 RARE/SEARCH_DEMAND attributes
  COMMON: 0     // No minimum for COMMON
};

/**
 * Normalize category to base category (handles legacy naming)
 */
export const normalizeCategory = (category: string | undefined): AttributeCategory | 'UNCATEGORIZED' => {
  if (!category) return 'UNCATEGORIZED';

  const normalized = category.toUpperCase();

  // Handle legacy naming
  if (normalized === 'CORE_DEFINITION') return 'ROOT';
  if (normalized === 'COMPETITIVE_EXPANSION') return 'UNIQUE';
  if (normalized === 'SEARCH_DEMAND') return 'RARE';
  if (normalized === 'COMPOSITE') return 'COMMON';

  if (['ROOT', 'UNIQUE', 'RARE', 'COMMON'].includes(normalized)) {
    return normalized as AttributeCategory;
  }

  return 'UNCATEGORIZED';
};

/**
 * Count EAVs by category
 */
export const countByCategory = (
  eavs: SemanticTriple[]
): Record<AttributeCategory | 'UNCATEGORIZED', number> => {
  const counts: Record<AttributeCategory | 'UNCATEGORIZED', number> = {
    ROOT: 0,
    CORE_DEFINITION: 0,
    UNIQUE: 0,
    COMPETITIVE_EXPANSION: 0,
    RARE: 0,
    SEARCH_DEMAND: 0,
    COMMON: 0,
    COMPOSITE: 0,
    UNCATEGORIZED: 0
  };

  for (const eav of eavs) {
    const category = normalizeCategory(eav.predicate?.category);
    counts[category]++;
  }

  return counts;
};

/**
 * Get normalized counts (combining legacy categories)
 */
export const getNormalizedCounts = (
  eavs: SemanticTriple[]
): Record<string, number> => {
  const raw = countByCategory(eavs);

  return {
    ROOT: raw.ROOT + raw.CORE_DEFINITION,
    UNIQUE: raw.UNIQUE + raw.COMPETITIVE_EXPANSION,
    RARE: raw.RARE + raw.SEARCH_DEMAND,
    COMMON: raw.COMMON + raw.COMPOSITE,
    UNCATEGORIZED: raw.UNCATEGORIZED
  };
};

/**
 * Calculate category balance score (0-100)
 * Higher score means better distribution across categories
 */
const calculateBalanceScore = (counts: Record<string, number>): number => {
  const { ROOT, UNIQUE, RARE, COMMON } = counts;
  const total = ROOT + UNIQUE + RARE + COMMON;

  if (total === 0) return 0;

  // Ideal distribution: 30% ROOT, 30% UNIQUE, 25% RARE, 15% COMMON
  const idealDistribution = { ROOT: 0.30, UNIQUE: 0.30, RARE: 0.25, COMMON: 0.15 };

  const actualDistribution = {
    ROOT: ROOT / total,
    UNIQUE: UNIQUE / total,
    RARE: RARE / total,
    COMMON: COMMON / total
  };

  // Calculate deviation from ideal
  let totalDeviation = 0;
  for (const [cat, ideal] of Object.entries(idealDistribution)) {
    const actual = actualDistribution[cat as keyof typeof actualDistribution];
    totalDeviation += Math.abs(ideal - actual);
  }

  // Max deviation is 2 (completely wrong distribution)
  // Score = 100 * (1 - deviation/2)
  return Math.round(100 * (1 - totalDeviation / 2));
};

/**
 * Generate recommendations based on category counts
 */
const generateRecommendations = (
  counts: Record<string, number>,
  entityType?: string
): string[] => {
  const recommendations: string[] = [];

  const { ROOT, UNIQUE, RARE, COMMON } = counts;
  const total = ROOT + UNIQUE + RARE + COMMON;

  // Check for missing critical categories
  if (ROOT === 0) {
    recommendations.push('Add ROOT attributes that define the core identity of your entity (what it is, essential characteristics).');
  } else if (ROOT < EXPECTED_COUNTS.ROOT) {
    recommendations.push(`Consider adding more ROOT attributes (${ROOT}/${EXPECTED_COUNTS.ROOT} recommended).`);
  }

  if (UNIQUE === 0) {
    recommendations.push('Add UNIQUE attributes that differentiate your entity from competitors.');
  } else if (UNIQUE < EXPECTED_COUNTS.UNIQUE) {
    recommendations.push(`Consider adding more UNIQUE differentiating attributes (${UNIQUE}/${EXPECTED_COUNTS.UNIQUE} recommended).`);
  }

  if (RARE === 0 && total > 5) {
    recommendations.push('Add RARE attributes to demonstrate deep expertise (technical specs, advanced details).');
  }

  // Check for imbalance
  if (total > 10) {
    if (COMMON > total * 0.5) {
      recommendations.push('Too many COMMON attributes. Prioritize ROOT/UNIQUE attributes for better authority.');
    }
    if (ROOT > total * 0.6) {
      recommendations.push('Consider adding more UNIQUE and RARE attributes for competitive differentiation.');
    }
  }

  // Entity-type specific suggestions
  if (entityType) {
    const type = entityType.toLowerCase();
    if (type.includes('software') || type.includes('saas')) {
      if (UNIQUE < 3) {
        recommendations.push('For software entities, add more UNIQUE attributes (features, integrations, pricing tiers).');
      }
    }
    if (type.includes('product') || type.includes('ecommerce')) {
      if (ROOT < 3) {
        recommendations.push('For products, ensure ROOT attributes cover price, availability, and specifications.');
      }
    }
  }

  return recommendations;
};

/**
 * Identify missing categories and generate suggestions
 */
const identifyMissing = (counts: Record<string, number>): MissingCategoryInfo[] => {
  const missing: MissingCategoryInfo[] = [];

  if (counts.ROOT < EXPECTED_COUNTS.ROOT) {
    missing.push({
      category: 'ROOT',
      count: EXPECTED_COUNTS.ROOT - counts.ROOT,
      suggestions: [
        'Define what the entity IS (type, category, classification)',
        'Add core characteristics that cannot be removed',
        'Include foundational facts (origin, purpose, definition)'
      ]
    });
  }

  if (counts.UNIQUE < EXPECTED_COUNTS.UNIQUE) {
    missing.push({
      category: 'UNIQUE',
      count: EXPECTED_COUNTS.UNIQUE - counts.UNIQUE,
      suggestions: [
        'What makes this entity different from competitors?',
        'Identify proprietary features or unique selling points',
        'Add exclusive capabilities or patents'
      ]
    });
  }

  if (counts.RARE < EXPECTED_COUNTS.RARE) {
    missing.push({
      category: 'RARE',
      count: EXPECTED_COUNTS.RARE - counts.RARE,
      suggestions: [
        'Add technical specifications not commonly discussed',
        'Include expert-level details that prove authority',
        'Document edge cases or advanced use scenarios'
      ]
    });
  }

  return missing;
};

/**
 * Calculate comprehensive EAV completeness score
 */
export const calculateEavCompleteness = (
  eavs: SemanticTriple[],
  entityType?: string
): EavCompletenessScore => {
  const categoryCounts = countByCategory(eavs);
  const normalizedCounts = getNormalizedCounts(eavs);

  // Calculate individual scores
  const rootScore = Math.min(100, (normalizedCounts.ROOT / EXPECTED_COUNTS.ROOT) * 100);
  const uniqueScore = normalizedCounts.UNIQUE > 0 ? Math.min(100, (normalizedCounts.UNIQUE / EXPECTED_COUNTS.UNIQUE) * 100) : 0;
  const rareScore = normalizedCounts.RARE > 0 ? Math.min(100, (normalizedCounts.RARE / EXPECTED_COUNTS.RARE) * 100) : 0;
  const balanceScore = calculateBalanceScore(normalizedCounts);

  // Weighted overall score (ROOT is most important)
  const overall = Math.round(
    (rootScore * 0.35) +
    (uniqueScore * 0.30) +
    (rareScore * 0.20) +
    (balanceScore * 0.15)
  );

  return {
    overall,
    breakdown: {
      rootCoverage: Math.round(rootScore),
      uniqueCoverage: Math.round(uniqueScore),
      rareCoverage: Math.round(rareScore),
      categoryBalance: balanceScore
    },
    missing: identifyMissing(normalizedCounts),
    recommendations: generateRecommendations(normalizedCounts, entityType),
    categoryCounts,
    totalEavs: eavs.length
  };
};

/**
 * Get category distribution for visualization
 */
export const getCategoryDistribution = (eavs: SemanticTriple[]): CategoryDistribution[] => {
  const normalizedCounts = getNormalizedCounts(eavs);
  const total = eavs.length || 1; // Avoid division by zero

  const distribution: CategoryDistribution[] = [];

  // Only include categories with count > 0
  for (const [category, count] of Object.entries(normalizedCounts)) {
    if (count > 0) {
      distribution.push({
        category: category as AttributeCategory | 'UNCATEGORIZED',
        count,
        percentage: Math.round((count / total) * 100),
        color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.UNCATEGORIZED
      });
    }
  }

  // Sort by count descending
  return distribution.sort((a, b) => b.count - a.count);
};

/**
 * Get a simple grade for the EAV completeness
 */
export const getCompletenessGrade = (score: number): {
  grade: string;
  label: string;
  color: string;
} => {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
  if (score >= 80) return { grade: 'B', label: 'Good', color: '#84cc16' };
  if (score >= 70) return { grade: 'C', label: 'Adequate', color: '#eab308' };
  if (score >= 60) return { grade: 'D', label: 'Needs Work', color: '#f97316' };
  return { grade: 'F', label: 'Poor', color: '#ef4444' };
};

/**
 * Check if EAV set meets minimum requirements
 */
export const meetsMinimumRequirements = (eavs: SemanticTriple[]): boolean => {
  const counts = getNormalizedCounts(eavs);
  return (
    counts.ROOT >= EXPECTED_COUNTS.ROOT &&
    counts.UNIQUE >= EXPECTED_COUNTS.UNIQUE &&
    counts.RARE >= EXPECTED_COUNTS.RARE
  );
};
