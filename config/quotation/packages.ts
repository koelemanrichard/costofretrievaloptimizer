/**
 * Package Presets
 *
 * Pre-bundled service packages with volume discounts.
 * These serve as starting points that users can customize.
 */

import { QuotationPackage, SiteSize } from '../../types/quotation';

// =============================================================================
// Package Definitions
// =============================================================================

type PackageDefinition = Omit<QuotationPackage, 'id'> & { id: string };

export const QUOTATION_PACKAGES: PackageDefinition[] = [
  {
    id: 'pkg_starter',
    name: 'SEO Starter',
    description: 'Essential SEO foundation for small businesses just getting started with search optimization',
    includedModules: [
      'tech_audit_basic',
      'tech_onpage_optimization',
      'content_briefs_4',
      'retainer_monitoring',
    ],
    basePrice: 1500,
    discountPercent: 10,
    targetSiteSizes: ['small'],
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'pkg_growth',
    name: 'Growth Accelerator',
    description: 'Comprehensive SEO package for businesses ready to scale their organic presence',
    includedModules: [
      'semantic_topical_map',
      'tech_audit_comprehensive',
      'tech_onpage_optimization',
      'tech_schema_implementation',
      'content_strategy',
      'content_articles_4',
      'local_gbp_optimization',
      'retainer_optimization',
    ],
    basePrice: 4500,
    discountPercent: 15,
    targetSiteSizes: ['small', 'medium'],
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'pkg_authority',
    name: 'Authority Builder',
    description: 'Full-service SEO with link building and content production for competitive markets',
    includedModules: [
      'semantic_topical_map',
      'semantic_entity_strategy',
      'tech_audit_comprehensive',
      'tech_cwv_optimization',
      'tech_schema_implementation',
      'tech_site_architecture',
      'content_strategy',
      'content_articles_8',
      'offsite_link_building',
      'local_gbp_optimization',
      'local_citation_management',
      'retainer_optimization',
    ],
    basePrice: 8500,
    discountPercent: 18,
    targetSiteSizes: ['medium', 'large'],
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'pkg_enterprise',
    name: 'Enterprise Suite',
    description: 'Complete digital marketing solution for large organizations requiring comprehensive SEO',
    includedModules: [
      'semantic_topical_map',
      'semantic_entity_strategy',
      'semantic_eav_optimization',
      'semantic_contextual_bridging',
      'tech_audit_comprehensive',
      'tech_cwv_optimization',
      'tech_onpage_optimization',
      'tech_schema_implementation',
      'tech_site_architecture',
      'content_strategy',
      'content_articles_8',
      'content_refresh',
      'offsite_link_building',
      'offsite_digital_pr',
      'ai_mention_strategy',
      'local_gbp_optimization',
      'local_citation_management',
      'local_content_creation',
      'retainer_full',
    ],
    basePrice: 18000,
    discountPercent: 22,
    targetSiteSizes: ['large', 'enterprise'],
    isActive: true,
    displayOrder: 4,
  },
  {
    id: 'pkg_local',
    name: 'Local Dominator',
    description: 'Specialized package for local businesses wanting to dominate their geographic area',
    includedModules: [
      'tech_audit_basic',
      'tech_onpage_optimization',
      'tech_schema_implementation',
      'content_briefs_4',
      'local_gbp_optimization',
      'local_citation_management',
      'local_review_management',
      'local_content_creation',
      'retainer_monitoring',
    ],
    basePrice: 2800,
    discountPercent: 12,
    targetSiteSizes: ['small', 'medium'],
    isActive: true,
    displayOrder: 5,
  },
  {
    id: 'pkg_content_focus',
    name: 'Content Focus',
    description: 'Content-centric package for businesses with solid technical foundations',
    includedModules: [
      'semantic_topical_map',
      'content_strategy',
      'content_articles_8',
      'content_refresh',
      'retainer_monitoring',
    ],
    basePrice: 5000,
    discountPercent: 12,
    targetSiteSizes: ['small', 'medium', 'large'],
    isActive: true,
    displayOrder: 6,
  },
  {
    id: 'pkg_technical_only',
    name: 'Technical Foundation',
    description: 'Pure technical SEO package for sites needing infrastructure improvements',
    includedModules: [
      'tech_audit_comprehensive',
      'tech_cwv_optimization',
      'tech_onpage_optimization',
      'tech_schema_implementation',
      'tech_site_architecture',
    ],
    basePrice: 3500,
    discountPercent: 10,
    targetSiteSizes: ['medium', 'large', 'enterprise'],
    isActive: true,
    displayOrder: 7,
  },
  {
    id: 'pkg_ai_ready',
    name: 'AI-Ready SEO',
    description: 'Future-proof your SEO for the AI search era',
    includedModules: [
      'semantic_entity_strategy',
      'tech_schema_implementation',
      'ai_mention_strategy',
      'ai_content_optimization',
      'ai_monitoring',
      'content_articles_4',
      'retainer_monitoring',
    ],
    basePrice: 3800,
    discountPercent: 10,
    targetSiteSizes: ['small', 'medium', 'large'],
    isActive: true,
    displayOrder: 8,
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get package by ID
 */
export function getPackageById(id: string): PackageDefinition | undefined {
  return QUOTATION_PACKAGES.find((p) => p.id === id);
}

/**
 * Get packages suitable for a site size
 */
export function getPackagesForSiteSize(siteSize: SiteSize): PackageDefinition[] {
  return QUOTATION_PACKAGES.filter(
    (p) => p.isActive && p.targetSiteSizes.includes(siteSize)
  ).sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get all active packages
 */
export function getActivePackages(): PackageDefinition[] {
  return QUOTATION_PACKAGES.filter((p) => p.isActive).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
}

import { BudgetRange } from '../../types/quotation';

/**
 * Get recommended package based on analysis, budget, and goals
 */
export function getRecommendedPackage(
  siteSize: SiteSize,
  hasLocalFocus: boolean = false,
  budgetRange?: BudgetRange
): PackageDefinition {
  // If budget is provided, prioritize budget-appropriate packages
  if (budgetRange) {
    // Map budget ranges to package price limits (monthly budget * ~3 months for project scope)
    const budgetPackageMap: Record<BudgetRange, string[]> = {
      under_1000: ['pkg_starter', 'pkg_local'], // $1500-2800
      '1000_2500': ['pkg_local', 'pkg_growth', 'pkg_technical_only', 'pkg_ai_ready'], // $2800-4500
      '2500_5000': ['pkg_growth', 'pkg_content_focus', 'pkg_authority'], // $4500-8500
      '5000_10000': ['pkg_authority', 'pkg_enterprise'], // $8500-18000
      '10000_25000': ['pkg_enterprise'], // $18000+
      over_25000: ['pkg_enterprise'], // $18000+
    };

    const affordablePackages = budgetPackageMap[budgetRange] || [];

    // If local focus, prefer local package if affordable
    if (hasLocalFocus && affordablePackages.includes('pkg_local')) {
      return getPackageById('pkg_local')!;
    }

    // Find the best package that matches both budget and site size
    for (const pkgId of affordablePackages) {
      const pkg = getPackageById(pkgId);
      if (pkg && pkg.targetSiteSizes.includes(siteSize)) {
        return pkg;
      }
    }

    // If no exact match, return the highest affordable package
    const lastAffordable = affordablePackages[affordablePackages.length - 1];
    if (lastAffordable) {
      return getPackageById(lastAffordable)!;
    }
  }

  // Fallback: use site size only (original logic)
  if (hasLocalFocus && (siteSize === 'small' || siteSize === 'medium')) {
    return getPackageById('pkg_local')!;
  }

  switch (siteSize) {
    case 'small':
      return getPackageById('pkg_starter')!;
    case 'medium':
      return getPackageById('pkg_growth')!;
    case 'large':
      return getPackageById('pkg_authority')!;
    case 'enterprise':
      return getPackageById('pkg_enterprise')!;
    default:
      return getPackageById('pkg_growth')!;
  }
}

// =============================================================================
// Package Feature Comparison
// =============================================================================

export interface PackageFeature {
  name: string;
  starter: boolean | string;
  growth: boolean | string;
  authority: boolean | string;
  enterprise: boolean | string;
}

export const PACKAGE_COMPARISON: PackageFeature[] = [
  { name: 'Technical Audit', starter: 'Basic', growth: 'Full', authority: 'Full', enterprise: 'Full' },
  { name: 'Topical Map', starter: false, growth: true, authority: true, enterprise: true },
  { name: 'Entity Strategy', starter: false, growth: false, authority: true, enterprise: true },
  { name: 'Content Articles', starter: false, growth: '4/mo', authority: '8/mo', enterprise: '8/mo' },
  { name: 'Schema Markup', starter: false, growth: true, authority: true, enterprise: true },
  { name: 'Link Building', starter: false, growth: false, authority: true, enterprise: true },
  { name: 'Digital PR', starter: false, growth: false, authority: false, enterprise: true },
  { name: 'Local SEO', starter: false, growth: 'Basic', authority: 'Full', enterprise: 'Full' },
  { name: 'AI Optimization', starter: false, growth: false, authority: false, enterprise: true },
  { name: 'Monthly Reporting', starter: true, growth: true, authority: true, enterprise: true },
  { name: 'Strategy Sessions', starter: false, growth: false, authority: true, enterprise: true },
  { name: 'Support Hours', starter: false, growth: '4hrs', authority: '4hrs', enterprise: '10hrs' },
];
