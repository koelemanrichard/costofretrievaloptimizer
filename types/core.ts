/**
 * Core Types Module
 *
 * Contains the fundamental enums and types used throughout the application.
 * This is part of the types.ts refactoring to split the monolithic file into domain modules.
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/core
 */

// ============================================================================
// APPLICATION STATE ENUMS
// ============================================================================

/**
 * Application navigation steps
 * Controls which screen/view is displayed
 */
export enum AppStep {
  AUTH,
  PROJECT_SELECTION,
  ANALYSIS_STATUS,
  PROJECT_WORKSPACE,
  BUSINESS_INFO,
  PILLAR_WIZARD,
  EAV_WIZARD,
  COMPETITOR_WIZARD,
  BLUEPRINT_WIZARD, // Website Blueprint (foundation pages & navigation preferences)
  PROJECT_DASHBOARD,
  SITE_ANALYSIS,
  ADMIN
}

// ============================================================================
// WEBSITE TYPE CONFIGURATION
// ============================================================================

/**
 * Website type determines AI strategy for content generation
 */
export enum WebsiteType {
  ECOMMERCE = 'ECOMMERCE',
  SAAS = 'SAAS',
  SERVICE_B2B = 'SERVICE_B2B',
  INFORMATIONAL = 'INFORMATIONAL',
  AFFILIATE_REVIEW = 'AFFILIATE_REVIEW',
}

/**
 * Configuration metadata for each website type
 * Used for UI display and AI prompt guidance
 */
export interface WebsiteTypeConfig {
  label: string;
  description: string;
  coreSectionFocus: string;
  authorSectionFocus: string;
  keyAttributes: string[];
}

/**
 * Website type metadata registry
 * Single source of truth for website type configurations
 */
export const WEBSITE_TYPE_CONFIG: Record<WebsiteType, WebsiteTypeConfig> = {
  ECOMMERCE: {
    label: 'E-commerce',
    description: 'Online stores selling products with product taxonomy and shopping intent',
    coreSectionFocus: 'Product categories, buying guides, comparisons',
    authorSectionFocus: 'Industry trends, educational content, brand story',
    keyAttributes: ['price', 'specifications', 'availability', 'reviews', 'variants']
  },
  SAAS: {
    label: 'SaaS / Software',
    description: 'Software-as-a-service with user role segmentation and feature-focused content',
    coreSectionFocus: 'Features, use cases, integrations, pricing',
    authorSectionFocus: 'Industry insights, best practices, tutorials',
    keyAttributes: ['features', 'pricing_tiers', 'integrations', 'user_roles', 'security']
  },
  SERVICE_B2B: {
    label: 'Service / B2B',
    description: 'Professional services with deep expertise and scientific-style content',
    coreSectionFocus: 'Service offerings, case studies, expertise areas',
    authorSectionFocus: 'Thought leadership, research, industry analysis',
    keyAttributes: ['methodology', 'credentials', 'case_studies', 'process', 'outcomes']
  },
  INFORMATIONAL: {
    label: 'Blog / Informational',
    description: 'Content-focused sites with query-driven topics and unique information gain',
    coreSectionFocus: 'Cornerstone content, comprehensive guides',
    authorSectionFocus: 'Trending topics, news, community content',
    keyAttributes: ['expertise_level', 'freshness', 'comprehensiveness', 'uniqueness']
  },
  AFFILIATE_REVIEW: {
    label: 'Affiliate / Review',
    description: 'Product reviews and comparisons with commerce-like structure and trust signals',
    coreSectionFocus: 'Product reviews, comparisons, buying guides',
    authorSectionFocus: 'Industry news, trends, how-to content',
    keyAttributes: ['rating', 'pros_cons', 'price_comparison', 'alternatives', 'verdict']
  }
};

// ============================================================================
// CONTENT STYLE TYPES
// ============================================================================

/**
 * Stylometry type for content generation
 * Determines the writing style/voice
 */
export enum StylometryType {
  ACADEMIC_FORMAL = 'ACADEMIC_FORMAL',
  DIRECT_TECHNICAL = 'DIRECT_TECHNICAL',
  PERSUASIVE_SALES = 'PERSUASIVE_SALES',
  INSTRUCTIONAL_CLEAR = 'INSTRUCTIONAL_CLEAR',
}

// ============================================================================
// AI PROVIDER TYPES
// ============================================================================

/**
 * Supported AI providers
 */
export enum AIProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity',
  OPENROUTER = 'openrouter',
}
