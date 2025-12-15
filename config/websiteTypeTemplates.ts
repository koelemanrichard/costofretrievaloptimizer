/**
 * Website Type Templates Configuration
 *
 * Comprehensive rules for each website type based on Holistic SEO research:
 * - Core Section Rules (monetization focus)
 * - Author Section Rules (topical authority)
 * - Linking Rules (PageRank flow)
 * - EAV Priorities (attribute focus)
 * - Template Patterns (content structure)
 * - Hub-Spoke Ratios (optimal structure)
 */

import { WebsiteType } from '../types';

// Core Section Rules - defines what should be in the monetization-focused section
export interface CoreSectionRules {
  description: string;
  requiredPageTypes: string[];
  optionalPageTypes: string[];
  contentDepth: 'deep' | 'moderate' | 'shallow';
  attributePriority: ('ROOT' | 'UNIQUE' | 'RARE' | 'COMMON')[];
  formatPreferences: {
    tables: boolean;
    lists: boolean;
    comparisons: boolean;
    howTo: boolean;
    faq: boolean;
  };
  schemaTypes: string[];
}

// Author Section Rules - defines what builds topical authority
export interface AuthorSectionRules {
  description: string;
  requiredPageTypes: string[];
  optionalPageTypes: string[];
  contentDepth: 'deep' | 'moderate' | 'shallow';
  linkBackStrategy: 'strong' | 'moderate' | 'weak';
  freshnessPriority: 'high' | 'medium' | 'low';
  formatPreferences: {
    longForm: boolean;
    news: boolean;
    tutorials: boolean;
    caseStudies: boolean;
  };
}

// Linking Rules - defines how pages should interconnect
export interface LinkingRules {
  maxAnchorsPerPage: number;
  maxAnchorRepetition: number;
  preferredLinkDirection: 'author_to_core' | 'bidirectional' | 'hub_and_spoke';
  contextualBridgeRequired: boolean;
  boilerplateLinks: {
    header: number;
    footer: number;
    sidebar: number;
  };
  qualityNodePriority: 'high' | 'medium' | 'low';
}

// EAV Priority Configuration
export interface EavPriorityConfig {
  dominantAttribute: string;
  requiredCategories: {
    ROOT: string[];
    UNIQUE: string[];
    RARE: string[];
    COMMON: string[];
  };
  compositeAttributes: string[];
  validationRules: string[];
}

// Template Pattern for content structure
export interface TemplatePattern {
  name: string;
  description: string;
  sections: string[];
  requiredVisuals: string[];
  schemaType: string;
}

// Full Website Type Configuration
export interface WebsiteTypeConfig {
  type: WebsiteType;
  label: string;
  description: string;
  coreSectionRules: CoreSectionRules;
  authorSectionRules: AuthorSectionRules;
  linkingRules: LinkingRules;
  eavPriority: EavPriorityConfig;
  templatePatterns: TemplatePattern[];
  hubSpokeRatio: {
    optimal: number;
    min: number;
    max: number;
  };
  stylometryDefault: 'ACADEMIC_FORMAL' | 'DIRECT_TECHNICAL' | 'PERSUASIVE_SALES' | 'INSTRUCTIONAL_CLEAR';
}

// =============================================================================
// WEBSITE TYPE CONFIGURATIONS
// =============================================================================

export const ECOMMERCE_CONFIG: WebsiteTypeConfig = {
  type: 'ECOMMERCE',
  label: 'E-commerce',
  description: 'Online stores with product taxonomy and shopping intent',

  coreSectionRules: {
    description: 'Product categories, buying guides, and direct conversion pages',
    requiredPageTypes: ['product_category', 'product_page', 'buying_guide'],
    optionalPageTypes: ['comparison', 'review', 'size_guide', 'care_guide'],
    contentDepth: 'moderate',
    attributePriority: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    formatPreferences: {
      tables: true,
      lists: true,
      comparisons: true,
      howTo: true,
      faq: true
    },
    schemaTypes: ['Product', 'Offer', 'AggregateRating', 'BreadcrumbList', 'FAQPage']
  },

  authorSectionRules: {
    description: 'Industry trends, educational content, brand storytelling',
    requiredPageTypes: ['blog_category', 'educational_guide'],
    optionalPageTypes: ['trend_report', 'brand_story', 'sustainability'],
    contentDepth: 'moderate',
    linkBackStrategy: 'strong',
    freshnessPriority: 'medium',
    formatPreferences: {
      longForm: true,
      news: true,
      tutorials: true,
      caseStudies: false
    }
  },

  linkingRules: {
    maxAnchorsPerPage: 100,
    maxAnchorRepetition: 3,
    preferredLinkDirection: 'author_to_core',
    contextualBridgeRequired: true,
    boilerplateLinks: {
      header: 10,
      footer: 20,
      sidebar: 15
    },
    qualityNodePriority: 'high'
  },

  eavPriority: {
    dominantAttribute: 'price',
    requiredCategories: {
      ROOT: ['product_type', 'material', 'brand'],
      UNIQUE: ['specifications', 'features', 'warranty'],
      RARE: ['manufacturing_process', 'certifications'],
      COMMON: ['color', 'size', 'availability']
    },
    compositeAttributes: ['dimensions', 'weight', 'price_range'],
    validationRules: ['price_must_be_numeric', 'availability_is_boolean']
  },

  templatePatterns: [
    {
      name: 'Product Category',
      description: 'Hub page for product category with links to products',
      sections: ['category_overview', 'top_picks', 'buying_considerations', 'product_grid', 'faq'],
      requiredVisuals: ['category_hero', 'product_thumbnails', 'comparison_table'],
      schemaType: 'CollectionPage'
    },
    {
      name: 'Product Page',
      description: 'Individual product with full details',
      sections: ['product_summary', 'specifications', 'features', 'reviews', 'related_products'],
      requiredVisuals: ['product_gallery', 'size_chart', 'feature_diagram'],
      schemaType: 'Product'
    },
    {
      name: 'Buying Guide',
      description: 'Educational content to help purchase decisions',
      sections: ['intro', 'what_to_look_for', 'top_recommendations', 'comparison', 'faq'],
      requiredVisuals: ['comparison_table', 'decision_flowchart'],
      schemaType: 'Article'
    }
  ],

  hubSpokeRatio: {
    optimal: 7,
    min: 5,
    max: 10
  },

  stylometryDefault: 'PERSUASIVE_SALES'
};

export const SAAS_CONFIG: WebsiteTypeConfig = {
  type: 'SAAS',
  label: 'SaaS / Software',
  description: 'Software-as-a-service with user role segmentation',

  coreSectionRules: {
    description: 'Features, use cases, integrations, and pricing',
    requiredPageTypes: ['feature_page', 'use_case', 'pricing', 'integrations'],
    optionalPageTypes: ['demo', 'comparison_vs', 'security', 'api_docs'],
    contentDepth: 'deep',
    attributePriority: ['UNIQUE', 'ROOT', 'RARE', 'COMMON'],
    formatPreferences: {
      tables: true,
      lists: true,
      comparisons: true,
      howTo: true,
      faq: true
    },
    schemaTypes: ['SoftwareApplication', 'Product', 'FAQPage', 'HowTo']
  },

  authorSectionRules: {
    description: 'Industry insights, best practices, tutorials',
    requiredPageTypes: ['blog', 'tutorial', 'documentation'],
    optionalPageTypes: ['webinar', 'template', 'resource_library'],
    contentDepth: 'deep',
    linkBackStrategy: 'moderate',
    freshnessPriority: 'high',
    formatPreferences: {
      longForm: true,
      news: true,
      tutorials: true,
      caseStudies: true
    }
  },

  linkingRules: {
    maxAnchorsPerPage: 80,
    maxAnchorRepetition: 3,
    preferredLinkDirection: 'hub_and_spoke',
    contextualBridgeRequired: true,
    boilerplateLinks: {
      header: 8,
      footer: 15,
      sidebar: 10
    },
    qualityNodePriority: 'high'
  },

  eavPriority: {
    dominantAttribute: 'features',
    requiredCategories: {
      ROOT: ['product_name', 'category', 'target_user'],
      UNIQUE: ['features', 'integrations', 'differentiators'],
      RARE: ['security_certifications', 'compliance', 'api_capabilities'],
      COMMON: ['pricing_tier', 'trial_availability', 'support_options']
    },
    compositeAttributes: ['feature_matrix', 'pricing_comparison', 'user_role_benefits'],
    validationRules: ['pricing_has_tiers', 'features_have_descriptions']
  },

  templatePatterns: [
    {
      name: 'Feature Page',
      description: 'Deep dive into a specific feature',
      sections: ['feature_overview', 'benefits', 'how_it_works', 'use_cases', 'cta'],
      requiredVisuals: ['feature_screenshot', 'workflow_diagram', 'benefit_icons'],
      schemaType: 'SoftwareApplication'
    },
    {
      name: 'Use Case',
      description: 'How specific user segments benefit',
      sections: ['challenge', 'solution', 'features_used', 'results', 'testimonial'],
      requiredVisuals: ['before_after', 'workflow', 'testimonial_photo'],
      schemaType: 'Article'
    },
    {
      name: 'Integration Page',
      description: 'How the product connects with other tools',
      sections: ['integration_overview', 'setup_guide', 'features', 'use_cases'],
      requiredVisuals: ['integration_diagram', 'setup_steps'],
      schemaType: 'HowTo'
    }
  ],

  hubSpokeRatio: {
    optimal: 7,
    min: 4,
    max: 9
  },

  stylometryDefault: 'DIRECT_TECHNICAL'
};

export const SERVICE_B2B_CONFIG: WebsiteTypeConfig = {
  type: 'SERVICE_B2B',
  label: 'Service / B2B',
  description: 'Professional services with deep expertise',

  coreSectionRules: {
    description: 'Service offerings, case studies, expertise areas',
    requiredPageTypes: ['service_page', 'case_study', 'expertise_area'],
    optionalPageTypes: ['methodology', 'team', 'industries_served'],
    contentDepth: 'deep',
    attributePriority: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    formatPreferences: {
      tables: false,
      lists: true,
      comparisons: false,
      howTo: true,
      faq: true
    },
    schemaTypes: ['Service', 'Organization', 'LocalBusiness', 'FAQPage']
  },

  authorSectionRules: {
    description: 'Thought leadership, research, industry analysis',
    requiredPageTypes: ['research', 'thought_leadership', 'industry_report'],
    optionalPageTypes: ['whitepaper', 'webinar', 'podcast'],
    contentDepth: 'deep',
    linkBackStrategy: 'strong',
    freshnessPriority: 'medium',
    formatPreferences: {
      longForm: true,
      news: false,
      tutorials: true,
      caseStudies: true
    }
  },

  linkingRules: {
    maxAnchorsPerPage: 60,
    maxAnchorRepetition: 3,
    preferredLinkDirection: 'author_to_core',
    contextualBridgeRequired: true,
    boilerplateLinks: {
      header: 6,
      footer: 12,
      sidebar: 8
    },
    qualityNodePriority: 'medium'
  },

  eavPriority: {
    dominantAttribute: 'methodology',
    requiredCategories: {
      ROOT: ['service_type', 'industry_focus', 'target_client'],
      UNIQUE: ['methodology', 'credentials', 'differentiators'],
      RARE: ['certifications', 'awards', 'partnerships'],
      COMMON: ['location', 'team_size', 'years_experience']
    },
    compositeAttributes: ['service_process', 'outcome_metrics', 'client_profile'],
    validationRules: ['credentials_are_verifiable', 'case_studies_have_metrics']
  },

  templatePatterns: [
    {
      name: 'Service Page',
      description: 'Overview of a specific service offering',
      sections: ['service_overview', 'process', 'outcomes', 'case_studies', 'cta'],
      requiredVisuals: ['process_diagram', 'outcome_stats', 'team_photo'],
      schemaType: 'Service'
    },
    {
      name: 'Case Study',
      description: 'Detailed client success story',
      sections: ['challenge', 'approach', 'solution', 'results', 'testimonial'],
      requiredVisuals: ['before_after', 'results_chart', 'client_logo'],
      schemaType: 'Article'
    },
    {
      name: 'Thought Leadership',
      description: 'Expert analysis and insights',
      sections: ['thesis', 'analysis', 'evidence', 'implications', 'conclusion'],
      requiredVisuals: ['data_visualization', 'expert_quote'],
      schemaType: 'Article'
    }
  ],

  hubSpokeRatio: {
    optimal: 5,
    min: 3,
    max: 7
  },

  stylometryDefault: 'ACADEMIC_FORMAL'
};

export const INFORMATIONAL_CONFIG: WebsiteTypeConfig = {
  type: 'INFORMATIONAL',
  label: 'Blog / Informational',
  description: 'Content-focused with query-driven topics',

  coreSectionRules: {
    description: 'Cornerstone content, comprehensive guides',
    requiredPageTypes: ['pillar_page', 'comprehensive_guide', 'resource_page'],
    optionalPageTypes: ['tools', 'calculators', 'glossary'],
    contentDepth: 'deep',
    attributePriority: ['UNIQUE', 'ROOT', 'RARE', 'COMMON'],
    formatPreferences: {
      tables: true,
      lists: true,
      comparisons: true,
      howTo: true,
      faq: true
    },
    schemaTypes: ['Article', 'FAQPage', 'HowTo', 'BreadcrumbList']
  },

  authorSectionRules: {
    description: 'Trending topics, news, community content',
    requiredPageTypes: ['blog_post', 'news', 'opinion'],
    optionalPageTypes: ['interview', 'roundup', 'listicle'],
    contentDepth: 'moderate',
    linkBackStrategy: 'strong',
    freshnessPriority: 'high',
    formatPreferences: {
      longForm: true,
      news: true,
      tutorials: true,
      caseStudies: false
    }
  },

  linkingRules: {
    maxAnchorsPerPage: 80,
    maxAnchorRepetition: 3,
    preferredLinkDirection: 'hub_and_spoke',
    contextualBridgeRequired: true,
    boilerplateLinks: {
      header: 8,
      footer: 15,
      sidebar: 12
    },
    qualityNodePriority: 'high'
  },

  eavPriority: {
    dominantAttribute: 'comprehensiveness',
    requiredCategories: {
      ROOT: ['topic', 'category', 'expertise_level'],
      UNIQUE: ['unique_insights', 'original_research', 'expert_quotes'],
      RARE: ['data_sources', 'methodology', 'limitations'],
      COMMON: ['publish_date', 'last_updated', 'read_time']
    },
    compositeAttributes: ['topic_coverage', 'source_quality', 'expertise_signals'],
    validationRules: ['sources_are_cited', 'claims_have_evidence']
  },

  templatePatterns: [
    {
      name: 'Pillar Page',
      description: 'Comprehensive hub for a major topic',
      sections: ['introduction', 'overview', 'subtopics', 'resources', 'faq'],
      requiredVisuals: ['topic_diagram', 'infographic', 'chapter_icons'],
      schemaType: 'Article'
    },
    {
      name: 'How-To Guide',
      description: 'Step-by-step instructional content',
      sections: ['intro', 'requirements', 'steps', 'tips', 'troubleshooting'],
      requiredVisuals: ['step_images', 'video', 'checklist'],
      schemaType: 'HowTo'
    },
    {
      name: 'Listicle',
      description: 'Curated list with commentary',
      sections: ['intro', 'methodology', 'list_items', 'conclusion'],
      requiredVisuals: ['item_images', 'comparison_table'],
      schemaType: 'Article'
    }
  ],

  hubSpokeRatio: {
    optimal: 7,
    min: 5,
    max: 12
  },

  stylometryDefault: 'INSTRUCTIONAL_CLEAR'
};

export const AFFILIATE_REVIEW_CONFIG: WebsiteTypeConfig = {
  type: 'AFFILIATE_REVIEW',
  label: 'Affiliate / Review',
  description: 'Product reviews with commerce-like structure and trust signals',

  coreSectionRules: {
    description: 'Product reviews, comparisons, buying guides',
    requiredPageTypes: ['single_review', 'comparison', 'best_of', 'buying_guide'],
    optionalPageTypes: ['brand_review', 'alternative_guide', 'deal_page'],
    contentDepth: 'deep',
    attributePriority: ['UNIQUE', 'ROOT', 'RARE', 'COMMON'],
    formatPreferences: {
      tables: true,
      lists: true,
      comparisons: true,
      howTo: true,
      faq: true
    },
    schemaTypes: ['Review', 'Product', 'AggregateRating', 'FAQPage', 'ItemList']
  },

  authorSectionRules: {
    description: 'Industry news, trends, how-to content',
    requiredPageTypes: ['industry_news', 'buying_tips', 'maintenance_guide'],
    optionalPageTypes: ['trend_report', 'brand_history', 'technology_explainer'],
    contentDepth: 'moderate',
    linkBackStrategy: 'strong',
    freshnessPriority: 'high',
    formatPreferences: {
      longForm: true,
      news: true,
      tutorials: true,
      caseStudies: false
    }
  },

  linkingRules: {
    maxAnchorsPerPage: 100,
    maxAnchorRepetition: 3,
    preferredLinkDirection: 'hub_and_spoke',
    contextualBridgeRequired: true,
    boilerplateLinks: {
      header: 10,
      footer: 20,
      sidebar: 15
    },
    qualityNodePriority: 'high'
  },

  eavPriority: {
    dominantAttribute: 'rating',
    requiredCategories: {
      ROOT: ['product_category', 'brand', 'model', 'target_user'],
      UNIQUE: ['rating', 'pros', 'cons', 'verdict', 'testing_results'],
      RARE: ['testing_methodology', 'comparison_criteria', 'expert_opinion'],
      COMMON: ['price', 'availability', 'where_to_buy']
    },
    compositeAttributes: ['feature_comparison', 'value_score', 'user_rating_breakdown'],
    validationRules: ['ratings_have_methodology', 'prices_are_current', 'affiliate_disclosure_present']
  },

  templatePatterns: [
    {
      name: 'Single Product Review',
      description: 'In-depth review of one product',
      sections: ['verdict', 'overview', 'testing', 'pros_cons', 'alternatives', 'faq'],
      requiredVisuals: ['product_photos', 'rating_breakdown', 'pros_cons_graphic'],
      schemaType: 'Review'
    },
    {
      name: 'Best Of Roundup',
      description: 'Curated list of top products in category',
      sections: ['methodology', 'top_picks', 'comparison_table', 'buying_guide', 'faq'],
      requiredVisuals: ['comparison_table', 'product_cards', 'winner_badges'],
      schemaType: 'ItemList'
    },
    {
      name: 'Vs Comparison',
      description: 'Head-to-head product comparison',
      sections: ['verdict', 'overview', 'feature_comparison', 'use_cases', 'conclusion'],
      requiredVisuals: ['side_by_side', 'feature_matrix', 'winner_graphic'],
      schemaType: 'Article'
    }
  ],

  hubSpokeRatio: {
    optimal: 8,
    min: 5,
    max: 12
  },

  stylometryDefault: 'DIRECT_TECHNICAL'
};

// =============================================================================
// CONFIGURATION MAP
// =============================================================================

export const WEBSITE_TYPE_TEMPLATES: Record<WebsiteType, WebsiteTypeConfig> = {
  ECOMMERCE: ECOMMERCE_CONFIG,
  SAAS: SAAS_CONFIG,
  SERVICE_B2B: SERVICE_B2B_CONFIG,
  INFORMATIONAL: INFORMATIONAL_CONFIG,
  AFFILIATE_REVIEW: AFFILIATE_REVIEW_CONFIG
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the configuration for a specific website type
 */
export function getWebsiteTypeConfig(type: WebsiteType): WebsiteTypeConfig {
  return WEBSITE_TYPE_TEMPLATES[type] || WEBSITE_TYPE_TEMPLATES.INFORMATIONAL;
}

/**
 * Get EAV predicate suggestions based on website type
 */
export function getTypeSpecificPredicates(type: WebsiteType): string[] {
  const config = getWebsiteTypeConfig(type);
  const predicates: string[] = [];

  // Flatten all required categories into predicate suggestions
  Object.values(config.eavPriority.requiredCategories).forEach(attrs => {
    predicates.push(...attrs);
  });

  predicates.push(...config.eavPriority.compositeAttributes);

  return [...new Set(predicates)]; // Remove duplicates
}

/**
 * Get template patterns for a website type
 */
export function getTemplatePatterns(type: WebsiteType): TemplatePattern[] {
  return getWebsiteTypeConfig(type).templatePatterns;
}

/**
 * Validate hub-spoke ratio for a website type
 */
export function validateHubSpokeRatio(type: WebsiteType, ratio: number): {
  valid: boolean;
  message: string;
  recommendation?: string;
} {
  const config = getWebsiteTypeConfig(type);
  const { optimal, min, max } = config.hubSpokeRatio;

  if (ratio < min) {
    return {
      valid: false,
      message: `Hub-spoke ratio ${ratio} is below minimum (${min}) for ${config.label}`,
      recommendation: `Consider adding ${min - ratio} more spoke pages per hub`
    };
  }

  if (ratio > max) {
    return {
      valid: false,
      message: `Hub-spoke ratio ${ratio} exceeds maximum (${max}) for ${config.label}`,
      recommendation: `Consider creating additional hub pages to distribute content`
    };
  }

  if (ratio !== optimal) {
    return {
      valid: true,
      message: `Hub-spoke ratio ${ratio} is acceptable but not optimal (${optimal}) for ${config.label}`,
      recommendation: ratio < optimal
        ? `Adding ${optimal - ratio} spokes per hub would improve structure`
        : `Ratio is slightly high; monitor for topic dilution`
    };
  }

  return {
    valid: true,
    message: `Hub-spoke ratio ${ratio} is optimal for ${config.label}`
  };
}

/**
 * Get required schema types for a website type
 */
export function getRequiredSchemaTypes(type: WebsiteType): string[] {
  const config = getWebsiteTypeConfig(type);
  return config.coreSectionRules.schemaTypes;
}
