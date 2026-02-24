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

import type { BusinessInfo, SEOPillars } from './business';
import type { SemanticTriple } from './semantic';
import type { EnrichedTopic, ContentBrief, SemanticAnalysisResult, ContextualCoverageMetrics, TopicalAuthorityScore, GscOpportunity } from './content';
import type { ValidationResult, InternalLinkAuditResult } from './audit';
import type { FoundationPage, NavigationStructure } from './navigation';

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
  ADMIN, // Admin Dashboard
  QUALITY_DEMO, // Quality Enforcement Demo Page
  QUOTATION // SEO Quotation Tool
}

// ============================================================================
// WEBSITE TYPE CONFIGURATION
// ============================================================================

/**
 * Website type determines AI strategy for content generation
 */
export type WebsiteType =
  | 'ECOMMERCE' | 'SAAS' | 'SERVICE_B2B' | 'INFORMATIONAL' | 'AFFILIATE_REVIEW'
  | 'LEAD_GENERATION' | 'REAL_ESTATE' | 'MARKETPLACE' | 'RECRUITMENT'
  | 'HEALTHCARE' | 'EDUCATION' | 'HOSPITALITY' | 'EVENTS'
  | 'NEWS_MEDIA' | 'DIRECTORY' | 'COMMUNITY' | 'NONPROFIT';

// Website type metadata for UI and AI guidance
export const WEBSITE_TYPE_CONFIG: Record<WebsiteType, {
  label: string;
  description: string;
  coreSectionFocus: string;
  authorSectionFocus: string;
  keyAttributes: string[];
}> = {
  // === COMMERCIAL / TRANSACTIONAL ===
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
  MARKETPLACE: {
    label: 'Marketplace / Classifieds',
    description: 'User-generated listings with two-sided network of buyers and sellers',
    coreSectionFocus: 'Category pages, trending listings, seller profiles, quality guides',
    authorSectionFocus: 'Market insights, selling tips, fraud prevention, negotiation guides',
    keyAttributes: ['category', 'condition', 'price', 'location', 'seller_rating', 'item_specifics']
  },
  EVENTS: {
    label: 'Events / Ticketing',
    description: 'Time-bound events with urgency signals and performer/venue focus',
    coreSectionFocus: 'Event pages, performer profiles, venue info, ticket pricing',
    authorSectionFocus: 'Artist news, event previews, venue reviews, what-to-expect guides',
    keyAttributes: ['event_type', 'date', 'venue', 'performer', 'ticket_price', 'availability', 'genre']
  },

  // === LEAD GENERATION / LOCAL ===
  SERVICE_B2B: {
    label: 'Service / B2B',
    description: 'Professional services with deep expertise and scientific-style content',
    coreSectionFocus: 'Service offerings, case studies, expertise areas',
    authorSectionFocus: 'Thought leadership, research, industry analysis',
    keyAttributes: ['methodology', 'credentials', 'case_studies', 'process', 'outcomes']
  },
  LEAD_GENERATION: {
    label: 'Lead Generation / Local',
    description: 'Local services focused on generating inquiries, quotes, and appointments',
    coreSectionFocus: 'Service pages, location pages, pricing guides, project galleries',
    authorSectionFocus: 'Local tips, maintenance guides, seasonal advice, DIY tutorials',
    keyAttributes: ['service_type', 'service_area', 'availability', 'pricing_model', 'reviews', 'credentials', 'response_time']
  },
  REAL_ESTATE: {
    label: 'Real Estate / Property',
    description: 'Property listings for sale or rent with location-based search and lead generation',
    coreSectionFocus: 'Property listings, neighborhood guides, market analysis, buying/renting guides',
    authorSectionFocus: 'Market trends, investment insights, relocation guides, mortgage tips',
    keyAttributes: ['property_type', 'location', 'price', 'sqft', 'bedrooms', 'bathrooms', 'amenities', 'year_built']
  },
  HEALTHCARE: {
    label: 'Healthcare / Medical',
    description: 'Medical practices with high E-A-T requirements and patient education focus',
    coreSectionFocus: 'Condition guides, treatment options, provider profiles, appointment booking',
    authorSectionFocus: 'Medical research, wellness tips, preventive care, patient stories',
    keyAttributes: ['condition', 'treatment', 'provider_credentials', 'insurance_accepted', 'success_rate']
  },
  HOSPITALITY: {
    label: 'Hospitality / Travel',
    description: 'Accommodation and travel with real-time availability and booking focus',
    coreSectionFocus: 'Property pages, destination guides, amenity comparisons, booking info',
    authorSectionFocus: 'Travel guides, local tips, seasonal recommendations, packing guides',
    keyAttributes: ['property_type', 'nightly_rate', 'capacity', 'amenities', 'availability', 'guest_reviews']
  },

  // === CONTENT / INFORMATIONAL ===
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
  },
  NEWS_MEDIA: {
    label: 'News / Media',
    description: 'Journalism and news with freshness signals and source attribution focus',
    coreSectionFocus: 'Breaking news, category archives, investigations, exclusives',
    authorSectionFocus: 'Analysis, opinion, expert interviews, trend reports',
    keyAttributes: ['article_type', 'publish_date', 'author', 'source', 'category', 'update_frequency']
  },
  EDUCATION: {
    label: 'Education / Courses',
    description: 'Online courses and educational content with credential and outcome focus',
    coreSectionFocus: 'Course pages, curriculum, instructor profiles, career outcomes',
    authorSectionFocus: 'Industry trends, skill guides, career advancement, learning tips',
    keyAttributes: ['course_level', 'duration', 'price', 'credential', 'completion_rate', 'job_placement']
  },

  // === SPECIALIZED / NICHE ===
  RECRUITMENT: {
    label: 'Recruitment / Jobs',
    description: 'Job listings and career resources connecting employers with candidates',
    coreSectionFocus: 'Job listings, company profiles, salary guides, skill requirements',
    authorSectionFocus: 'Career tips, resume guides, interview prep, industry trends',
    keyAttributes: ['job_type', 'seniority', 'salary_range', 'location', 'skills', 'experience_level', 'remote_options']
  },
  DIRECTORY: {
    label: 'Directory / Listings',
    description: 'Aggregated listings and reviews with curation and discovery focus',
    coreSectionFocus: 'Entity pages, category pages, top-rated lists, comparison pages',
    authorSectionFocus: 'Category analysis, trend reports, methodology, quality standards',
    keyAttributes: ['entity_type', 'category', 'location', 'rating', 'review_count', 'verification_status']
  },
  COMMUNITY: {
    label: 'Community / Forum',
    description: 'User discussions and Q&A with community consensus and reputation systems',
    coreSectionFocus: 'Popular threads, category hubs, best answers, user profiles',
    authorSectionFocus: 'Moderator insights, community trends, meta discussions, guidelines',
    keyAttributes: ['thread_type', 'category', 'author_reputation', 'response_count', 'solution_flag']
  },
  NONPROFIT: {
    label: 'Nonprofit / Charity',
    description: 'Mission-driven organizations with impact metrics and transparency focus',
    coreSectionFocus: 'Mission pages, impact reports, donation options, volunteer opportunities',
    authorSectionFocus: 'Cause updates, beneficiary stories, research, advocacy',
    keyAttributes: ['cause_area', 'impact_metrics', 'donation_type', 'overhead_ratio', 'tax_status']
  }
};

// ============================================================================
// CONTENT STYLE TYPES
// ============================================================================

/**
 * Stylometry type for content generation
 * Determines the writing style/voice
 */
export type StylometryType = 'ACADEMIC_FORMAL' | 'DIRECT_TECHNICAL' | 'PERSUASIVE_SALES' | 'INSTRUCTIONAL_CLEAR';

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

// ============================================================================
// PROJECT & TOPICAL MAP TYPES
// ============================================================================

/**
 * Project data structure
 */
export interface Project {
  id: string;
  project_name: string;
  domain: string;
  created_at: string;
  organization_id?: string;
  api_key_mode?: 'inherit' | 'byok';
  map_count?: number;
  last_activity?: string | null;
}

/** Extended Project interface for admin management (includes user info) */
export interface AdminProject extends Project {
  user_id: string;
  user_email: string;
  map_count: number;
  updated_at: string;
}

/**
 * Topical map container
 */
export interface TopicalMap {
  id: string;
  project_id: string;
  name: string;
  map_name?: string;
  domain?: string;
  created_at?: string;
  user_id?: string;
  business_info?: Partial<BusinessInfo>;
  pillars?: SEOPillars;
  eavs?: SemanticTriple[];
  competitors?: string[];
  topics?: EnrichedTopic[];
  briefs?: Record<string, ContentBrief>;
  topicCounts?: { core: number; outer: number; total: number };
  analysis_state?: {
    validationResult?: ValidationResult;
    semanticAnalysisResult?: SemanticAnalysisResult;
    contextualCoverageResult?: ContextualCoverageMetrics;
    internalLinkAuditResult?: InternalLinkAuditResult;
    topicalAuthorityScore?: TopicalAuthorityScore;
    publicationPlan?: Record<string, unknown>;
    gscOpportunities?: GscOpportunity[];
  };
  foundationPages?: FoundationPage[];
  navigation?: NavigationStructure;
  styleguide_data?: import('../services/styleguide-generator/types').BrandStyleguideData | null;
  pipeline_state?: import('../state/slices/pipelineSlice').PipelineState | null;
  dialogue_context?: import('./dialogue').DialogueContext;
}

/**
 * Dashboard metrics
 */
export interface DashboardMetrics {
  totalTopics?: number;
  coreTopics?: number;
  outerTopics?: number;
  briefsGenerated?: number;
  overallScore?: number;
  briefGenerationProgress?: number;
  knowledgeDomainCoverage?: number;
  avgEAVsPerBrief?: number;
  contextualFlowScore?: number;
}
