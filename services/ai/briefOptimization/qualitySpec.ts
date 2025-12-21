/**
 * Quality Specification - Single Source of Truth
 *
 * Maps each 4 Pillars check to the exact fields and keywords it evaluates.
 * This is the foundation for the modify-first, append-only-if-necessary strategy.
 *
 * Research-backed constraints:
 * - Rule III.B: Information Density - every sentence must deliver a unique EAV triple
 * - Rule II.B: Contextual Vector - headings must form a "straight line" of meaning
 * - Rule I.E: Compliance Threshold target >85%
 */

import { KeywordCategory } from '../../../config/moneyPageKeywords';

export type FixStrategy = 'modify_field' | 'create_if_missing' | 'add_to_outline' | 'add_visual';

export interface CheckRequirement {
  checkId: string;
  pillar: 'verbalization' | 'contextualization' | 'monetization' | 'visualization';
  label: string;
  weight: number;
  /** Fields this check evaluates (from moneyPagePillarScore.ts) */
  fields: string[];
  /** Keyword categories used for matching (from moneyPageKeywords.ts) */
  keywordCategories: KeywordCategory[];
  /** Minimum keyword matches required */
  minKeywordMatches: number;
  /** Strategy for fixing */
  strategy: FixStrategy;
  /** For text fields, minimum length if applicable */
  minLength?: number;
  /** Whether this is a critical item */
  isCritical: boolean;
  /** Priority for fixing (lower = more important) */
  priority: number;
}

/**
 * Complete specification of all 4 Pillars checks
 * Mapped from utils/moneyPagePillarScore.ts evaluator functions
 */
export const CHECK_REQUIREMENTS: CheckRequirement[] = [
  // =============================================================================
  // VERBALIZATION (25% weight)
  // =============================================================================
  {
    checkId: 'v1',
    pillar: 'verbalization',
    label: 'Benefit-focused headline',
    weight: 15,
    fields: ['title'],
    keywordCategories: ['benefit', 'howTo'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: true,
    priority: 1,
  },
  {
    checkId: 'v2',
    pillar: 'verbalization',
    label: 'Power words in H1/H2',
    weight: 10,
    fields: ['title', 'metaDescription', 'outline'],
    keywordCategories: ['power'],
    minKeywordMatches: 2,
    strategy: 'modify_field',
    isCritical: false,
    priority: 5,
  },
  {
    checkId: 'v3',
    pillar: 'verbalization',
    label: 'Subheadline supports main claim',
    weight: 8,
    fields: ['structured_outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 15,
  },
  {
    checkId: 'v4',
    pillar: 'verbalization',
    label: 'Social proof language',
    weight: 12,
    fields: ['outline', 'metaDescription'],
    keywordCategories: ['socialProof'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 6,
  },
  {
    checkId: 'v5',
    pillar: 'verbalization',
    label: 'Urgency triggers',
    weight: 8,
    fields: ['outline', 'cta'],
    keywordCategories: ['urgency'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 12,
  },
  {
    checkId: 'v6',
    pillar: 'verbalization',
    label: 'Scarcity indicators',
    weight: 7,
    fields: ['outline', 'cta'],
    keywordCategories: ['scarcity'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 14,
  },
  {
    checkId: 'v7',
    pillar: 'verbalization',
    label: 'Risk reversal language',
    weight: 10,
    fields: ['outline', 'cta'],
    keywordCategories: ['riskReversal'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 7,
  },
  {
    checkId: 'v8',
    pillar: 'verbalization',
    label: 'Features translated to benefits',
    weight: 12,
    fields: ['structured_outline'],
    keywordCategories: ['benefit'],
    minKeywordMatches: 1,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 10,
  },
  {
    checkId: 'v9',
    pillar: 'verbalization',
    label: 'Problem agitation',
    weight: 10,
    fields: ['structured_outline', 'outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 11,
  },
  {
    checkId: 'v10',
    pillar: 'verbalization',
    label: 'Outcome visualization',
    weight: 8,
    fields: ['outline'],
    keywordCategories: ['outcome'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 13,
  },

  // =============================================================================
  // CONTEXTUALIZATION (25% weight)
  // =============================================================================
  {
    checkId: 'c1',
    pillar: 'contextualization',
    label: 'Industry context established',
    weight: 15,
    fields: ['structured_outline', 'outline'],
    keywordCategories: ['industry'],
    minKeywordMatches: 1,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 8,
  },
  {
    checkId: 'c2',
    pillar: 'contextualization',
    label: 'Problem landscape defined',
    weight: 12,
    fields: ['structured_outline', 'outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 9,
  },
  {
    checkId: 'c3',
    pillar: 'contextualization',
    label: 'Target audience identified',
    weight: 10,
    fields: ['outline', 'metaDescription'],
    keywordCategories: ['targetAudience'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 10,
  },
  {
    checkId: 'c4',
    pillar: 'contextualization',
    label: 'Competitor differentiation',
    weight: 12,
    fields: ['outline'],
    keywordCategories: ['differentiation'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 9,
  },
  {
    checkId: 'c5',
    pillar: 'contextualization',
    label: 'Unique value proposition clear',
    weight: 15,
    fields: ['metaDescription', 'outline'],
    keywordCategories: ['differentiation', 'power'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: true,
    priority: 2,
  },
  {
    checkId: 'c6',
    pillar: 'contextualization',
    label: 'Use case specificity',
    weight: 10,
    fields: ['structured_outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 16,
  },
  {
    checkId: 'c7',
    pillar: 'contextualization',
    label: 'Expert positioning',
    weight: 10,
    fields: ['outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'modify_field',
    isCritical: false,
    priority: 15,
  },
  {
    checkId: 'c8',
    pillar: 'contextualization',
    label: 'Methodology explanation',
    weight: 8,
    fields: ['structured_outline'],
    keywordCategories: ['methodology'],
    minKeywordMatches: 1,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 17,
  },
  {
    checkId: 'c9',
    pillar: 'contextualization',
    label: 'Results/data backed claims',
    weight: 8,
    fields: ['outline'],
    keywordCategories: ['dataBacked'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 16,
  },

  // =============================================================================
  // MONETIZATION (30% weight) - Most important pillar
  // =============================================================================
  {
    checkId: 'm1',
    pillar: 'monetization',
    label: 'Primary CTA above fold',
    weight: 18,
    fields: ['cta'],
    keywordCategories: ['cta'],
    minKeywordMatches: 1,
    strategy: 'create_if_missing',
    isCritical: true,
    priority: 3,
  },
  {
    checkId: 'm2',
    pillar: 'monetization',
    label: 'Multiple CTA placements',
    weight: 12,
    fields: ['structured_outline', 'cta'],
    keywordCategories: ['cta'],
    minKeywordMatches: 2,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 11,
  },
  {
    checkId: 'm3',
    pillar: 'monetization',
    label: 'CTA action-oriented copy',
    weight: 10,
    fields: ['cta'],
    keywordCategories: ['cta'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 8,
  },
  {
    checkId: 'm4',
    pillar: 'monetization',
    label: 'Secondary CTA option',
    weight: 8,
    fields: ['outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'modify_field',
    isCritical: false,
    priority: 18,
  },
  {
    checkId: 'm5',
    pillar: 'monetization',
    label: 'Clear pricing/value proposition',
    weight: 15,
    fields: ['structured_outline', 'outline'],
    keywordCategories: ['pricing'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 6,
  },
  {
    checkId: 'm6',
    pillar: 'monetization',
    label: 'ROI or value justification',
    weight: 10,
    fields: ['outline'],
    keywordCategories: ['roi'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 9,
  },
  {
    checkId: 'm7',
    pillar: 'monetization',
    label: 'Pricing psychology elements',
    weight: 8,
    fields: ['outline'],
    keywordCategories: ['pricing'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 17,
  },
  {
    checkId: 'm8',
    pillar: 'monetization',
    label: 'Lead capture form',
    weight: 10,
    fields: ['outline'],
    keywordCategories: ['leadCapture'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 14,
  },
  {
    checkId: 'm9',
    pillar: 'monetization',
    label: 'Contact information visible',
    weight: 5,
    fields: ['outline'],
    keywordCategories: ['contact'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 19,
  },
  {
    checkId: 'm10',
    pillar: 'monetization',
    label: 'Checkout/booking flow clear',
    weight: 4,
    fields: ['outline'],
    keywordCategories: ['checkout'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 20,
  },

  // =============================================================================
  // VISUALIZATION (20% weight)
  // =============================================================================
  {
    checkId: 'vis1',
    pillar: 'visualization',
    label: 'Hero image with entity relevance',
    weight: 15,
    fields: ['visuals.featuredImagePrompt'],
    keywordCategories: [],
    minKeywordMatches: 0,
    minLength: 20,
    strategy: 'create_if_missing',
    isCritical: true,
    priority: 4,
  },
  {
    checkId: 'vis2',
    pillar: 'visualization',
    label: 'Trust badges/certifications',
    weight: 12,
    fields: ['outline'],
    keywordCategories: ['trustBadges'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 10,
  },
  {
    checkId: 'vis3',
    pillar: 'visualization',
    label: 'Customer testimonials with photos',
    weight: 12,
    fields: ['outline'],
    keywordCategories: ['socialProof'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 11,
  },
  {
    checkId: 'vis4',
    pillar: 'visualization',
    label: 'Before/after or process visuals',
    weight: 10,
    fields: ['outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'modify_field',
    isCritical: false,
    priority: 15,
  },
  {
    checkId: 'vis5',
    pillar: 'visualization',
    label: 'Logo wall of clients/partners',
    weight: 8,
    fields: ['outline'],
    keywordCategories: ['socialProof'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 16,
  },
  {
    checkId: 'vis6',
    pillar: 'visualization',
    label: 'Product/service screenshots',
    weight: 10,
    fields: ['visual_semantics'],
    keywordCategories: ['visualization'],
    minKeywordMatches: 1,
    strategy: 'add_visual',
    isCritical: false,
    priority: 13,
  },
  {
    checkId: 'vis7',
    pillar: 'visualization',
    label: 'Demo video or walkthrough',
    weight: 10,
    fields: ['outline'],
    keywordCategories: ['visualization'],
    minKeywordMatches: 1,
    strategy: 'modify_field',
    isCritical: false,
    priority: 14,
  },
  {
    checkId: 'vis8',
    pillar: 'visualization',
    label: 'Comparison tables/charts',
    weight: 8,
    fields: ['structured_outline'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'add_to_outline',
    isCritical: false,
    priority: 17,
  },
  {
    checkId: 'vis9',
    pillar: 'visualization',
    label: 'Consistent brand imagery',
    weight: 8,
    fields: ['visual_semantics'],
    keywordCategories: [],
    minKeywordMatches: 0,
    strategy: 'add_visual',
    isCritical: false,
    priority: 18,
  },
  {
    checkId: 'vis10',
    pillar: 'visualization',
    label: 'Professional visual quality',
    weight: 7,
    fields: ['visuals.featuredImagePrompt', 'visuals.imageAltText'],
    keywordCategories: [],
    minKeywordMatches: 0,
    minLength: 10,
    strategy: 'create_if_missing',
    isCritical: false,
    priority: 19,
  },
];

/**
 * Get all critical requirements
 */
export function getCriticalRequirements(): CheckRequirement[] {
  return CHECK_REQUIREMENTS.filter(r => r.isCritical);
}

/**
 * Get requirements sorted by priority
 */
export function getRequirementsByPriority(): CheckRequirement[] {
  return [...CHECK_REQUIREMENTS].sort((a, b) => a.priority - b.priority);
}

/**
 * Get requirements for a specific pillar
 */
export function getRequirementsForPillar(pillar: CheckRequirement['pillar']): CheckRequirement[] {
  return CHECK_REQUIREMENTS.filter(r => r.pillar === pillar);
}

/**
 * Get requirement by check ID
 */
export function getRequirementById(checkId: string): CheckRequirement | undefined {
  return CHECK_REQUIREMENTS.find(r => r.checkId === checkId);
}

/**
 * Field mapping for modify operations
 * Maps brief fields to their paths for modification
 */
export const FIELD_PATHS: Record<string, {
  getter: (brief: any) => string | undefined;
  setter: (brief: any, value: string) => void;
}> = {
  'title': {
    getter: (b) => b.title,
    setter: (b, v) => { b.title = v; }
  },
  'metaDescription': {
    getter: (b) => b.metaDescription,
    setter: (b, v) => { b.metaDescription = v; }
  },
  'outline': {
    getter: (b) => b.outline,
    setter: (b, v) => { b.outline = v; }
  },
  'cta': {
    getter: (b) => b.cta,
    setter: (b, v) => { b.cta = v; }
  },
  'visuals.featuredImagePrompt': {
    getter: (b) => b.visuals?.featuredImagePrompt,
    setter: (b, v) => { b.visuals = { ...b.visuals, featuredImagePrompt: v }; }
  },
  'visuals.imageAltText': {
    getter: (b) => b.visuals?.imageAltText,
    setter: (b, v) => { b.visuals = { ...b.visuals, imageAltText: v }; }
  }
};

/**
 * Anti-bloat rules - hard limits
 */
export const ANTI_BLOAT_RULES = {
  /** Maximum new sections to add per fix operation */
  maxNewSections: 2,
  /** Minimum score improvement required to justify a new section */
  minScoreImprovementForSection: 5,
  /** Maximum percentage increase in outline length */
  maxOutlineLengthIncrease: 0.3, // 30%
  /** Prefer modification over addition when possible */
  preferModification: true,
};
