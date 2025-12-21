/**
 * E-commerce Semantics Configuration
 * Based on Koray Tugberk GÜBÜR's Semantic SEO Framework for E-commerce
 *
 * This configuration provides rules and patterns for building semantic
 * content networks for e-commerce sites, including:
 * - Contextual clusters and hierarchy
 * - Query-processing logic for intent mapping
 * - Semantic modifiers (season, material, age, gender, etc.)
 * - Entity relationships and rare attributes
 * - Interlinking patterns
 */

import type { WebsiteType } from '../types';

// =============================================================================
// SEMANTIC MODIFIER TYPES
// =============================================================================

export type SemanticModifierType =
  | 'season'
  | 'material'
  | 'age_group'
  | 'gender'
  | 'size'
  | 'color'
  | 'style'
  | 'price_range'
  | 'use_case'
  | 'brand'
  | 'certification'
  | 'audience';

export interface SemanticModifier {
  type: SemanticModifierType;
  name: string;
  values: string[];
  description: string;
  entityType: string;
}

// =============================================================================
// E-COMMERCE SEMANTIC MODIFIERS
// =============================================================================

export const ECOMMERCE_SEMANTIC_MODIFIERS: SemanticModifier[] = [
  {
    type: 'season',
    name: 'Season',
    values: ['Spring', 'Summer', 'Fall', 'Autumn', 'Winter', 'Year-round', 'Holiday'],
    description: 'Seasonal variations affecting product relevance',
    entityType: 'TimePeriod',
  },
  {
    type: 'material',
    name: 'Material',
    values: ['Cotton', 'Organic Cotton', 'Bamboo', 'Wool', 'Silk', 'Linen', 'Polyester', 'Recycled'],
    description: 'Product material composition',
    entityType: 'Material',
  },
  {
    type: 'age_group',
    name: 'Age Group',
    values: ['Newborn', 'Infant', 'Toddler', 'Kids', 'Teen', 'Adult', 'Senior'],
    description: 'Target demographic age range',
    entityType: 'AgeGroup',
  },
  {
    type: 'gender',
    name: 'Gender',
    values: ['Boys', 'Girls', 'Men', 'Women', 'Unisex', 'Gender-neutral'],
    description: 'Gender targeting for products',
    entityType: 'Gender',
  },
  {
    type: 'size',
    name: 'Size',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Plus Size', 'Petite', 'Tall'],
    description: 'Product sizing categories',
    entityType: 'SizeCategory',
  },
  {
    type: 'price_range',
    name: 'Price Range',
    values: ['Budget', 'Affordable', 'Mid-range', 'Premium', 'Luxury', 'Sale'],
    description: 'Price positioning categories',
    entityType: 'PriceRange',
  },
  {
    type: 'use_case',
    name: 'Use Case',
    values: ['Everyday', 'Special Occasion', 'Work', 'Sports', 'Travel', 'Sleep', 'Outdoor'],
    description: 'Intended product usage scenarios',
    entityType: 'UseCase',
  },
  {
    type: 'certification',
    name: 'Certification',
    values: ['GOTS Certified', 'Organic', 'Fair Trade', 'Vegan', 'Hypoallergenic', 'Eco-friendly'],
    description: 'Product certifications and standards',
    entityType: 'Certification',
  },
];

// =============================================================================
// CONTEXTUAL HIERARCHY PATTERNS
// =============================================================================

export interface HierarchyLevel {
  level: number;
  name: string;
  description: string;
  examples: string[];
  modifiers: SemanticModifierType[];
}

export const ECOMMERCE_HIERARCHY: HierarchyLevel[] = [
  {
    level: 1,
    name: 'Parent Category',
    description: 'Broad product category (core node)',
    examples: ['Baby Clothing', 'Electronics', 'Home Decor'],
    modifiers: [],
  },
  {
    level: 2,
    name: 'Semantic Hub',
    description: 'High-intent subtopic clusters based on search demand',
    examples: ['Organic Baby Clothes', 'Winter Baby Clothing', 'Baby Girl Outfits'],
    modifiers: ['material', 'season', 'gender'],
  },
  {
    level: 3,
    name: 'Context Page',
    description: 'Specific product type within semantic hub',
    examples: ['GOTS Certified Organic Baby Sleepwear', 'Wool Baby Winter Jackets'],
    modifiers: ['certification', 'use_case', 'material'],
  },
  {
    level: 4,
    name: 'Product Page',
    description: 'Individual product with full attribute coverage',
    examples: ['Organic Cotton Baby Sleep Sack - 0-6 Months'],
    modifiers: ['size', 'age_group', 'color'],
  },
];

// =============================================================================
// QUERY-PROCESSING PATTERNS
// =============================================================================

export interface QueryProcessingPattern {
  id: string;
  pattern: string;
  intent: 'informational' | 'transactional' | 'commercial' | 'navigational';
  modifiers: SemanticModifierType[];
  examples: string[];
  topicClass: 'monetization' | 'informational';
}

export const ECOMMERCE_QUERY_PATTERNS: QueryProcessingPattern[] = [
  // Transactional patterns
  {
    id: 'buy-product-modifier',
    pattern: 'Buy [Product] [Modifier]',
    intent: 'transactional',
    modifiers: ['material', 'brand', 'certification'],
    examples: ['Buy organic baby clothes', 'Buy GOTS certified onesies'],
    topicClass: 'monetization',
  },
  {
    id: 'best-product-for-audience',
    pattern: 'Best [Product] for [Audience]',
    intent: 'commercial',
    modifiers: ['age_group', 'use_case'],
    examples: ['Best baby clothes for newborns', 'Best sleepwear for toddlers'],
    topicClass: 'monetization',
  },
  {
    id: 'product-modifier-modifier',
    pattern: '[Modifier] [Modifier] [Product]',
    intent: 'commercial',
    modifiers: ['season', 'material', 'gender'],
    examples: ['Winter organic baby girl clothes', 'Summer cotton toddler outfits'],
    topicClass: 'monetization',
  },

  // Informational patterns
  {
    id: 'how-to-choose',
    pattern: 'How to choose [Product]',
    intent: 'informational',
    modifiers: [],
    examples: ['How to choose baby clothes', 'How to choose organic fabrics'],
    topicClass: 'informational',
  },
  {
    id: 'what-is-certification',
    pattern: 'What is [Certification]',
    intent: 'informational',
    modifiers: ['certification'],
    examples: ['What is GOTS certification', 'What is hypoallergenic fabric'],
    topicClass: 'informational',
  },
  {
    id: 'product-vs-product',
    pattern: '[Product A] vs [Product B]',
    intent: 'commercial',
    modifiers: ['material', 'brand'],
    examples: ['Organic cotton vs bamboo baby clothes', 'Wool vs fleece baby jackets'],
    topicClass: 'informational',
  },
  {
    id: 'size-guide',
    pattern: '[Product] size guide [Age/Size]',
    intent: 'informational',
    modifiers: ['age_group', 'size'],
    examples: ['Baby clothes size guide 0-3 months', 'Toddler shoe size chart'],
    topicClass: 'informational',
  },
];

// =============================================================================
// RARE ATTRIBUTE PATTERNS
// =============================================================================

export interface RareAttributePattern {
  id: string;
  category: string;
  description: string;
  examples: string[];
  seoValue: 'high' | 'medium' | 'low';
}

export const RARE_ATTRIBUTE_PATTERNS: RareAttributePattern[] = [
  {
    id: 'material-sourcing',
    category: 'Material Sourcing',
    description: 'Specific origin and sourcing details of materials',
    examples: [
      'Handwoven cotton sourced from GOTS-approved Indian mills',
      'Temperature-regulating organic bamboo fibers',
      'Japanese organic cotton with extra-long staple',
    ],
    seoValue: 'high',
  },
  {
    id: 'safety-testing',
    category: 'Safety Testing',
    description: 'Detailed safety certifications and testing results',
    examples: [
      '100% nickel-free snaps - certified safe for eczema-prone babies',
      'OEKO-TEX Standard 100 Class I certified',
      'Lead-free, phthalate-free dyes tested by independent labs',
    ],
    seoValue: 'high',
  },
  {
    id: 'production-process',
    category: 'Production Process',
    description: 'Unique manufacturing or production details',
    examples: [
      'Double-stitched seams for extra durability',
      'Pre-washed for softness without harsh chemicals',
      'Small-batch production ensuring quality control',
    ],
    seoValue: 'medium',
  },
  {
    id: 'environmental-impact',
    category: 'Environmental Impact',
    description: 'Sustainability and environmental metrics',
    examples: [
      '90% less water used compared to conventional cotton',
      'Carbon-neutral shipping for all orders',
      'Biodegradable packaging from recycled materials',
    ],
    seoValue: 'medium',
  },
  {
    id: 'unique-features',
    category: 'Unique Features',
    description: 'Distinctive product features competitors skip',
    examples: [
      'Expandable neck opening for easy dressing',
      'Enclosed foot cuffs to keep socks on',
      'Built-in scratch mittens on sleeves',
    ],
    seoValue: 'high',
  },
];

// =============================================================================
// INTERLINKING STRATEGIES
// =============================================================================

export interface InterlinkingRule {
  id: string;
  linkType: 'parent' | 'child' | 'sibling' | 'cross-contextual';
  anchorPattern: string;
  description: string;
  examples: string[];
}

export const ECOMMERCE_INTERLINKING_RULES: InterlinkingRule[] = [
  {
    id: 'child-to-parent',
    linkType: 'parent',
    anchorPattern: '[Modifier] [Parent Category]',
    description: 'Context pages link back to parent hub',
    examples: ['organic baby clothing', 'winter baby wear collection'],
  },
  {
    id: 'sibling-lateral',
    linkType: 'sibling',
    anchorPattern: '[Intent] [Sibling Product]',
    description: 'Cross-link between related context pages',
    examples: ['explore organic winter baby wear', 'see matching accessories'],
  },
  {
    id: 'cross-contextual',
    linkType: 'cross-contextual',
    anchorPattern: '[Action] [Related Context]',
    description: 'Link between different semantic hubs based on intent',
    examples: ['complete the look with organic bedding', 'pairs well with natural skincare'],
  },
  {
    id: 'parent-to-child',
    linkType: 'child',
    anchorPattern: 'Browse [Specific Product Type]',
    description: 'Parent category links to specific context pages',
    examples: ['browse GOTS certified sleepwear', 'shop organic cotton bodysuits'],
  },
];

// =============================================================================
// CONTEXTUAL COVERAGE CHECKLIST
// =============================================================================

export interface ContextualCoverageItem {
  id: string;
  category: string;
  items: string[];
  required: boolean;
}

export const CONTEXTUAL_COVERAGE_CHECKLIST: ContextualCoverageItem[] = [
  {
    id: 'material-coverage',
    category: 'Material Types',
    items: ['Primary material', 'Material benefits', 'Care instructions', 'Material comparisons'],
    required: true,
  },
  {
    id: 'certification-coverage',
    category: 'Certifications',
    items: ['Certification name', 'What it means', 'Verification process', 'Why it matters'],
    required: true,
  },
  {
    id: 'sizing-coverage',
    category: 'Sizing Information',
    items: ['Size chart', 'Measurement guide', 'Fit recommendations', 'Growth considerations'],
    required: true,
  },
  {
    id: 'care-coverage',
    category: 'Product Care',
    items: ['Washing guide', 'Drying instructions', 'Storage tips', 'Longevity advice'],
    required: false,
  },
  {
    id: 'sustainability-coverage',
    category: 'Sustainability',
    items: ['Environmental impact', 'Ethical sourcing', 'Packaging', 'Brand commitment'],
    required: false,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get applicable modifiers for a website type
 */
export function getModifiersForWebsiteType(websiteType: WebsiteType): SemanticModifier[] {
  switch (websiteType) {
    case 'ECOMMERCE':
      return ECOMMERCE_SEMANTIC_MODIFIERS;
    case 'AFFILIATE_REVIEW':
      return ECOMMERCE_SEMANTIC_MODIFIERS.filter(m =>
        ['brand', 'price_range', 'use_case', 'certification'].includes(m.type)
      );
    default:
      return [];
  }
}

/**
 * Generate semantic cluster variations
 */
export function generateSemanticClusters(
  coreCategory: string,
  modifiers: SemanticModifier[]
): string[] {
  const clusters: string[] = [];

  for (const modifier of modifiers) {
    for (const value of modifier.values.slice(0, 3)) { // Top 3 values
      clusters.push(`${value} ${coreCategory}`);
    }
  }

  return clusters;
}

/**
 * Get query patterns for intent
 */
export function getQueryPatternsForIntent(
  intent: 'informational' | 'transactional' | 'commercial'
): QueryProcessingPattern[] {
  return ECOMMERCE_QUERY_PATTERNS.filter(p => p.intent === intent);
}

/**
 * Build contextual hierarchy for a product category
 */
export function buildContextualHierarchy(
  category: string,
  modifiers: SemanticModifierType[]
): { level: number; title: string; modifiers: string[] }[] {
  const hierarchy: { level: number; title: string; modifiers: string[] }[] = [];

  hierarchy.push({
    level: 1,
    title: category,
    modifiers: [],
  });

  // Generate level 2 semantic hubs
  const applicableModifiers = ECOMMERCE_SEMANTIC_MODIFIERS.filter(m =>
    modifiers.includes(m.type)
  );

  for (const mod of applicableModifiers.slice(0, 3)) {
    for (const value of mod.values.slice(0, 2)) {
      hierarchy.push({
        level: 2,
        title: `${value} ${category}`,
        modifiers: [mod.type],
      });
    }
  }

  return hierarchy;
}

/**
 * Get rare attributes for a product category
 */
export function getRareAttributeSuggestions(
  productCategory: string
): RareAttributePattern[] {
  // Return all rare attribute patterns - in production, this could be filtered
  // based on the product category
  return RARE_ATTRIBUTE_PATTERNS;
}

/**
 * Calculate contextual coverage score
 */
export function calculateContextualCoverageScore(
  coveredItems: Record<string, string[]>
): number {
  let totalWeight = 0;
  let earnedScore = 0;

  for (const checklist of CONTEXTUAL_COVERAGE_CHECKLIST) {
    const weight = checklist.required ? 20 : 10;
    totalWeight += weight;

    const covered = coveredItems[checklist.id] || [];
    const coverage = covered.length / checklist.items.length;
    earnedScore += weight * coverage;
  }

  return Math.round((earnedScore / totalWeight) * 100);
}

/**
 * Generate anchor text variations for interlinking
 */
export function generateAnchorTextVariations(
  sourceCategory: string,
  targetCategory: string,
  linkType: InterlinkingRule['linkType']
): string[] {
  const rule = ECOMMERCE_INTERLINKING_RULES.find(r => r.linkType === linkType);
  if (!rule) return [`${targetCategory}`];

  return [
    `${targetCategory}`,
    `shop ${targetCategory}`,
    `explore ${targetCategory}`,
    `browse our ${targetCategory}`,
  ];
}
