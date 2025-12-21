// config/auditRules.ts
// Unified Audit System Configuration - Phase 6

import { AuditCategory, AuditRule, AuditSeverity } from '../types';

/**
 * Audit Rule Definitions
 * Organized by category for the unified audit system
 */

// =============================================================================
// CONTENT COMPLETENESS RULES
// =============================================================================
const contentCompletenessRules: AuditRule[] = [
  {
    id: 'content-no-briefs',
    name: 'Topics without content briefs',
    severity: 'warning',
    category: 'content-completeness',
    description: 'Core topics should have content briefs generated for content planning',
  },
  {
    id: 'content-empty-headings',
    name: 'Content briefs with empty headings',
    severity: 'warning',
    category: 'content-completeness',
    description: 'Content briefs should have H2/H3 headings defined for structure',
  },
  {
    id: 'content-missing-serp',
    name: 'Missing SERP analysis',
    severity: 'suggestion',
    category: 'content-completeness',
    description: 'Content briefs should include SERP analysis for competitive insights',
  },
  {
    id: 'content-no-target-keywords',
    name: 'No target keywords defined',
    severity: 'warning',
    category: 'content-completeness',
    description: 'Topics should have primary and secondary keywords defined',
  },
  {
    id: 'content-missing-intent',
    name: 'Search intent not specified',
    severity: 'suggestion',
    category: 'content-completeness',
    description: 'Topics should have search intent (informational, transactional, etc.) specified',
  },
];

// =============================================================================
// HIERARCHY STRUCTURE RULES
// =============================================================================
const hierarchyStructureRules: AuditRule[] = [
  {
    id: 'hierarchy-orphan-topics',
    name: 'Orphaned topics (no parent)',
    severity: 'critical',
    category: 'hierarchy-structure',
    description: 'Topics without a parent pillar break the topical map structure',
  },
  {
    id: 'hierarchy-deep-nesting',
    name: 'Excessive topic depth',
    severity: 'warning',
    category: 'hierarchy-structure',
    description: 'Topics nested more than 3 levels deep may be hard to navigate',
  },
  {
    id: 'hierarchy-pillar-imbalance',
    name: 'Unbalanced pillar content',
    severity: 'suggestion',
    category: 'hierarchy-structure',
    description: 'Pillars should have a balanced number of supporting topics',
  },
  {
    id: 'hierarchy-missing-pillars',
    name: 'No pillar pages defined',
    severity: 'critical',
    category: 'hierarchy-structure',
    description: 'Topical map needs at least one pillar for proper structure',
  },
  {
    id: 'hierarchy-circular-reference',
    name: 'Circular parent-child references',
    severity: 'critical',
    category: 'hierarchy-structure',
    description: 'Topics cannot be their own parent or create circular references',
  },
];

// =============================================================================
// INTERNAL LINKING RULES
// =============================================================================
const internalLinkingRules: AuditRule[] = [
  {
    id: 'linking-orphan-pages',
    name: 'Pages with no internal links',
    severity: 'critical',
    category: 'internal-linking',
    description: 'Every page should have at least one internal link pointing to it',
  },
  {
    id: 'linking-broken-links',
    name: 'Broken internal links',
    severity: 'critical',
    category: 'internal-linking',
    description: 'Internal links pointing to non-existent pages',
  },
  {
    id: 'linking-generic-anchors',
    name: 'Generic anchor text usage',
    severity: 'warning',
    category: 'internal-linking',
    description: 'Avoid "click here", "read more" - use descriptive anchor text',
  },
  {
    id: 'linking-excessive-links',
    name: 'Too many links per page',
    severity: 'warning',
    category: 'internal-linking',
    description: 'Pages should not exceed 150 internal links',
  },
  {
    id: 'linking-anchor-repetition',
    name: 'Same anchor text used excessively',
    severity: 'warning',
    category: 'internal-linking',
    description: 'Same anchor text should not be used more than 3 times for one target',
  },
  {
    id: 'linking-missing-contextual-bridge',
    name: 'Missing contextual bridges',
    severity: 'suggestion',
    category: 'internal-linking',
    description: 'Distant topics need bridge content for smooth user flow',
  },
];

// =============================================================================
// NAVIGATION STRUCTURE RULES
// =============================================================================
const navigationStructureRules: AuditRule[] = [
  {
    id: 'nav-missing-header',
    name: 'Header navigation not defined',
    severity: 'critical',
    category: 'navigation-structure',
    description: 'Website needs header navigation for primary access to key pages',
  },
  {
    id: 'nav-missing-footer',
    name: 'Footer navigation not defined',
    severity: 'warning',
    category: 'navigation-structure',
    description: 'Footer should include important links for E-A-T signals',
  },
  {
    id: 'nav-excessive-header-items',
    name: 'Too many header navigation items',
    severity: 'warning',
    category: 'navigation-structure',
    description: 'Header navigation should have maximum 10 items for usability',
  },
  {
    id: 'nav-missing-eat-links',
    name: 'Missing E-A-T footer links',
    severity: 'warning',
    category: 'navigation-structure',
    description: 'Footer should include About, Privacy, and Contact links',
  },
  {
    id: 'nav-duplicate-anchors',
    name: 'Duplicate anchor text in header/footer',
    severity: 'suggestion',
    category: 'navigation-structure',
    description: 'Header and footer should use different anchor text for same destinations',
  },
];

// =============================================================================
// SEMANTIC CONSISTENCY RULES
// =============================================================================
const semanticConsistencyRules: AuditRule[] = [
  {
    id: 'semantic-missing-eavs',
    name: 'No EAV triples defined',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'Topics should have Entity-Attribute-Value semantic triples for clarity',
  },
  {
    id: 'semantic-inconsistent-entities',
    name: 'Inconsistent entity naming',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'Same entity should use consistent naming across topics',
  },
  {
    id: 'semantic-missing-schema',
    name: 'Missing structured data suggestions',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'Content briefs should recommend appropriate schema.org types',
  },
  {
    id: 'semantic-conflicting-attributes',
    name: 'Conflicting attribute values',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'Same entity-attribute pairs should not have conflicting values',
  },
  {
    id: 'semantic-low-eav-density',
    name: 'Low EAV density per topic',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'Topics should have at least 3 EAV triples for comprehensive semantic coverage',
  },
  {
    id: 'semantic-missing-categories',
    name: 'Missing EAV categories',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'EAV triples should cover UNIQUE, ROOT, RARE, and COMMON categories for authority',
  },
  {
    id: 'semantic-predicate-diversity',
    name: 'Low predicate diversity',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'EAV triples should use diverse predicates (TYPE, COMPONENT, BENEFIT, RISK, PROCESS, SPECIFICATION)',
  },
  {
    id: 'semantic-orphan-eavs',
    name: 'EAVs not linked to topics',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'EAV triples should be associated with specific topics for content planning',
  },
];

// =============================================================================
// FOUNDATION PAGES RULES
// =============================================================================
const foundationPagesRules: AuditRule[] = [
  {
    id: 'foundation-missing-homepage',
    name: 'No homepage defined',
    severity: 'critical',
    category: 'foundation-pages',
    description: 'Website needs a homepage as the central hub',
  },
  {
    id: 'foundation-missing-about',
    name: 'No about page defined',
    severity: 'warning',
    category: 'foundation-pages',
    description: 'About page is essential for E-A-T signals',
  },
  {
    id: 'foundation-missing-contact',
    name: 'No contact page defined',
    severity: 'warning',
    category: 'foundation-pages',
    description: 'Contact page builds trust and credibility',
  },
  {
    id: 'foundation-incomplete-nap',
    name: 'Incomplete NAP information',
    severity: 'warning',
    category: 'foundation-pages',
    description: 'Name, Address, Phone should be complete for local SEO',
  },
  {
    id: 'foundation-missing-service-pages',
    name: 'No service/product pages',
    severity: 'suggestion',
    category: 'foundation-pages',
    description: 'Commercial sites should have dedicated service or product pages',
  },
];

// =============================================================================
// AUDIT CATEGORIES CONFIGURATION
// =============================================================================
export const AUDIT_CATEGORIES: AuditCategory[] = [
  {
    id: 'content-completeness',
    name: 'Content Completeness',
    rules: contentCompletenessRules,
    weight: 25,  // 25% of overall score
  },
  {
    id: 'hierarchy-structure',
    name: 'Hierarchy Structure',
    rules: hierarchyStructureRules,
    weight: 20,  // 20% of overall score
  },
  {
    id: 'internal-linking',
    name: 'Internal Linking',
    rules: internalLinkingRules,
    weight: 20,  // 20% of overall score
  },
  {
    id: 'navigation-structure',
    name: 'Navigation Structure',
    rules: navigationStructureRules,
    weight: 15,  // 15% of overall score
  },
  {
    id: 'semantic-consistency',
    name: 'Semantic Consistency',
    rules: semanticConsistencyRules,
    weight: 10,  // 10% of overall score
  },
  {
    id: 'foundation-pages',
    name: 'Foundation Pages',
    rules: foundationPagesRules,
    weight: 10,  // 10% of overall score
  },
];

// =============================================================================
// SEVERITY CONFIGURATION
// =============================================================================
export const SEVERITY_PENALTIES = {
  critical: 15,   // -15 points per critical issue
  warning: 5,     // -5 points per warning
  suggestion: 1,  // -1 point per suggestion
} as const;

export const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-900/20', text: 'text-red-300', border: 'border-red-700' },
  warning: { bg: 'bg-yellow-900/20', text: 'text-yellow-300', border: 'border-yellow-700' },
  suggestion: { bg: 'bg-blue-900/20', text: 'text-blue-300', border: 'border-blue-700' },
} as const;

// =============================================================================
// AUTO-FIX CONFIGURATION
// =============================================================================
export const FIX_THRESHOLDS = {
  autoApply: 90,      // Auto-apply fixes with confidence >= 90%
  suggest: 70,        // Show as suggestion for confidence >= 70%
  requireReview: 0,   // Always require review below 70%
} as const;

// Rules that can be auto-fixed
// NOTE: Only include rules that have WORKING auto-fix implementations
// For Health Check, we show info only - no broken "Fix" buttons
export const AUTO_FIXABLE_RULES: Record<string, {
  fixType: 'auto' | 'ai-assisted' | 'manual';
  description: string;
}> = {
  // Currently no auto-fixable rules are implemented
  // All issues require manual intervention or using other tools
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all rules as a flat array
 */
export const getAllRules = (): AuditRule[] => {
  return AUDIT_CATEGORIES.flatMap(category => category.rules);
};

/**
 * Get rule by ID
 */
export const getRuleById = (ruleId: string): AuditRule | undefined => {
  return getAllRules().find(rule => rule.id === ruleId);
};

/**
 * Get category by ID
 */
export const getCategoryById = (categoryId: string): AuditCategory | undefined => {
  return AUDIT_CATEGORIES.find(category => category.id === categoryId);
};

/**
 * Check if a rule is auto-fixable
 */
export const isAutoFixable = (ruleId: string): boolean => {
  return ruleId in AUTO_FIXABLE_RULES;
};

/**
 * Get fix info for a rule
 */
export const getFixInfo = (ruleId: string) => {
  return AUTO_FIXABLE_RULES[ruleId];
};

/**
 * Calculate category score based on issues
 */
export const calculateCategoryScore = (
  issues: { severity: AuditSeverity }[]
): number => {
  let score = 100;
  for (const issue of issues) {
    score -= SEVERITY_PENALTIES[issue.severity];
  }
  return Math.max(0, score);
};

/**
 * Calculate overall audit score
 */
export const calculateOverallScore = (
  categoryResults: { score: number; weight: number }[]
): number => {
  const totalWeight = categoryResults.reduce((sum, cat) => sum + cat.weight, 0);
  if (totalWeight === 0) return 100;

  const weightedSum = categoryResults.reduce(
    (sum, cat) => sum + (cat.score * cat.weight),
    0
  );

  return Math.round(weightedSum / totalWeight);
};

export default {
  AUDIT_CATEGORIES,
  SEVERITY_PENALTIES,
  SEVERITY_COLORS,
  FIX_THRESHOLDS,
  AUTO_FIXABLE_RULES,
  getAllRules,
  getRuleById,
  getCategoryById,
  isAutoFixable,
  getFixInfo,
  calculateCategoryScore,
  calculateOverallScore,
};
