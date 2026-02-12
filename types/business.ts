/**
 * Business Types Module
 *
 * Contains business context types including:
 * - BusinessInfo: Main business configuration
 * - AuthorProfile: Author identity and stylometry
 * - SEOPillars: SEO strategy pillars
 * - BrandKit: Visual brand identity
 * - EntityIdentity: Knowledge Panel strategy
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/business
 */

import { WebsiteType, StylometryType } from './core';

// ============================================================================
// SEED SOURCE TYPES (for Knowledge Panel strategy)
// ============================================================================

/**
 * Entry for a seed source that confirms entity facts for Knowledge Panel building
 */
export interface SeedSourceEntry {
  name: string;
  url: string;
  verified?: boolean;
}

/**
 * Seed Source Category for Knowledge Panel corroboration
 * Based on Kalicube's methodology for building entity credibility
 */
export type SeedSourceCategory =
  | 'authority'      // Wikipedia, Wikidata - highest trust
  | 'business'       // Crunchbase, LinkedIn, GBP
  | 'social'         // YouTube, Twitter, Instagram, Facebook
  | 'developer'      // GitHub, GitLab, npm, PyPI
  | 'industry'       // Industry directories, review sites
  | 'media';         // Podcast directories, press mentions

/**
 * Seed Source Definition for Knowledge Panel optimization
 * Defines sources that contribute to entity corroboration
 */
export interface SeedSourceDefinition {
  id: string;
  name: string;
  category: SeedSourceCategory;
  icon: string;
  createUrl: string;
  kpWeight: number;             // Importance for Knowledge Panel (1-10)
  entityTypes: string[];        // Which entity types this applies to
  verificationMethod?: string;  // How Google verifies this source
}

// ============================================================================
// ENTITY IDENTITY (Knowledge Panel Strategy)
// ============================================================================

/**
 * Entity Identity for Knowledge Panel strategy
 * Defines the core identity attributes needed for KP eligibility
 */
export interface EntityIdentity {
  legalName: string;                    // Official registered name
  foundedYear?: number;                 // Year established
  headquartersLocation?: string;        // City, Country
  founderOrCEO: string;                 // Key person for E-A-T
  founderCredential?: string;           // Their primary credential
  primaryAttribute: string;             // Desired KP subtitle (e.g., "SEO Agency", "Dentist")
  secondaryAttributes?: string[];       // Backup subtitles
  existingSeedSources: {
    // Authority sources (highest KP weight)
    wikipedia?: string;                 // URL if exists
    wikidata?: string;                  // QID if exists (e.g., "Q12345")
    // Business sources
    crunchbase?: string;                // URL if exists
    linkedinCompany?: string;           // URL if exists
    googleBusinessProfile?: boolean;    // Claimed or not
    // Social sources (corroborative)
    youtube?: string;                   // Channel URL
    twitter?: string;                   // Profile URL (X)
    instagram?: string;                 // Profile URL
    facebook?: string;                  // Page URL
    // Developer sources
    github?: string;                    // Organization/user URL
    // Industry directories (custom entries)
    industryDirectories?: SeedSourceEntry[];
  };
  brandSearchDemand?: number;           // Monthly branded searches (from GSC/tools)
  brandSearchDemandTarget?: number;     // Target monthly branded searches
}

/**
 * KP Metadata for SemanticTriple
 * Tracks which EAVs contribute to Knowledge Panel building
 */
export interface KPMetadata {
  isFactual: boolean;                   // Declarative fact vs opinion
  isKPEligible: boolean;                // User-flagged for KP strategy
  seedSourcesRequired: string[];        // Which sources should confirm this fact
  seedSourcesConfirmed: string[];       // Which sources already confirm this fact
  consensusScore: number;               // 0-100 based on source agreement
  generatedStatement?: string;          // Auto-generated declarative sentence
}

// ============================================================================
// AUTHOR PROFILE
// ============================================================================

/**
 * Author profile for E-A-T signals and content stylometry
 */
export interface AuthorProfile {
  name: string;
  bio: string;
  credentials: string; // "PhD in Computer Science"
  socialUrls: string[];
  stylometry: StylometryType;
  customStylometryRules?: string[]; // e.g. "Never use the word 'delve'"
}

// ============================================================================
// IMAGE GENERATION & BRAND KIT
// ============================================================================

/**
 * Image style preferences for AI image generation
 */
export enum ImageStyle {
  PHOTOREALISTIC = 'photorealistic',
  ILLUSTRATION = 'illustration',
  CARTOON = 'cartoon',
  MINIMAL = 'minimal',
  ARTISTIC = 'artistic',
  TECHNICAL = 'technical',
}

/**
 * Preferred image generation provider
 */
export enum ImageProviderPreference {
  AUTO = 'auto',
  MARKUPGO = 'markupgo',
  GEMINI = 'gemini',
  DALL_E = 'dall-e',
}

/**
 * Image generation settings for the brand
 */
export interface ImageGenerationSettings {
  preferredStyle: ImageStyle;
  preferredProvider: ImageProviderPreference;
  customInstructions?: string; // Additional prompt instructions for all images
  sizeOverrides?: {
    HERO?: { width: number; height: number };
    SECTION?: { width: number; height: number };
    INFOGRAPHIC?: { width: number; height: number };
    CHART?: { width: number; height: number };
    DIAGRAM?: { width: number; height: number };
  };
}

/**
 * Hero image template configuration
 */
export interface HeroTemplate {
  id: string;
  name: string;
  description: string;
  markupGoTemplateId?: string;
  style: {
    textPosition: 'center' | 'bottom-left' | 'bottom-center' | 'top-center';
    hasGradientOverlay: boolean;
    hasSubtitle: boolean;
    backgroundColor?: string;
  };
  preview?: string;
}

/**
 * Brand visual identity kit
 */
export interface BrandKit {
  logo?: {
    url: string;
    cloudinaryId?: string;
  };
  logoPlacement: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  logoOpacity: number;
  colors: {
    primary: string;
    secondary: string;
    textOnImage: string;
    background?: string;
    surface?: string;
    text?: string;
    textMuted?: string;
    border?: string;
    overlayGradient?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  copyright: {
    holder: string;
    licenseUrl?: string;
  };
  heroTemplates: HeroTemplate[];
  markupGoDefaultTemplateId?: string; // Default MarkupGo template ID for this topical map
  imageGeneration?: ImageGenerationSettings; // Image generation preferences
}

// ============================================================================
// SEO PILLARS
// ============================================================================

/**
 * SEO strategy pillars defining central entity and search intent
 */
export interface SEOPillars {
  centralEntity: string;
  sourceContext: string;
  centralSearchIntent: string;

  // Holistic SEO - CSI Breakdown
  primary_verb?: string; // e.g. "Buy", "Hire"
  auxiliary_verb?: string; // e.g. "Learn", "Compare"
}

// ============================================================================
// BUSINESS INFO (Main Configuration)
// ============================================================================

/**
 * Main business configuration containing all business context
 */
export interface BusinessInfo {
  domain: string;
  projectName: string;
  industry: string;
  model: string;
  websiteType?: WebsiteType; // Determines the AI strategy (E-com, SaaS, etc.)
  valueProp: string;
  audience: string;
  expertise: string;
  seedKeyword: string;
  language: string;
  region?: string; // Geographic region (e.g., "Netherlands", "United States")
  targetMarket: string;

  // Holistic SEO - Authority Proof & Authorship
  uniqueDataAssets?: string;

  // New Structured Author Identity
  authorProfile?: AuthorProfile;

  // Legacy fields (kept for backward compat until migration)
  authorName?: string;
  authorBio?: string;
  authorCredentials?: string;
  socialProfileUrls?: string[];

  // Business conversion fields
  conversionGoal?: string; // Primary conversion goal (e.g., "sign up", "purchase", "contact")

  dataforseoLogin?: string;
  dataforseoPassword?: string;
  apifyToken?: string;
  infranodusApiKey?: string;
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  apitemplateApiKey?: string;
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'perplexity' | 'openrouter';
  aiModel: string;
  geminiApiKey?: string;
  openAiApiKey?: string;
  anthropicApiKey?: string;
  perplexityApiKey?: string;
  openRouterApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  neo4jUri?: string;
  neo4jUser?: string;
  neo4jPassword?: string;

  // Image Generation & Brand Kit
  brandKit?: BrandKit;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryUploadPreset?: string;
  markupGoApiKey?: string;

  // Content Fetching (Audit System)
  auditScrapingProvider?: 'jina' | 'firecrawl' | 'direct';
  auditScrapingFallback?: boolean;

  // Entity Authority & Knowledge Graph
  googleKnowledgeGraphApiKey?: string;

  // Knowledge Panel Strategy
  entityIdentity?: EntityIdentity;
}
