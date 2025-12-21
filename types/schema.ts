/**
 * Schema Types Module
 *
 * Contains JSON-LD schema generation types including:
 * - SchemaPageType: Page type detection for schema selection
 * - ResolvedEntity: Wikidata/Wikipedia resolved entities
 * - Pass9Config: Schema generation configuration
 * - EnhancedSchemaResult: Full schema generation result
 * - ProgressiveSchemaData: Data collected during content passes
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/schema
 */

import { SchemaValidationResult } from './audit';

// ============================================================================
// SCHEMA PAGE AND ENTITY TYPES
// ============================================================================

/**
 * Page type detection for schema selection
 */
export type SchemaPageType =
  | 'HomePage'
  | 'Article'
  | 'BlogPosting'
  | 'NewsArticle'
  | 'Product'
  | 'ProfilePage'      // Author profile
  | 'CollectionPage'   // Category/tag page
  | 'FAQPage'
  | 'HowTo'
  | 'WebPage';         // Generic fallback

/**
 * Entity type for resolution
 */
export enum SchemaEntityType {
  PERSON = 'Person',
  ORGANIZATION = 'Organization',
  PLACE = 'Place',
  THING = 'Thing',
  EVENT = 'Event',
  CREATIVE_WORK = 'CreativeWork',
}

/**
 * Entity role in content
 */
export enum EntityRole {
  SUBJECT = 'subject',
  AUTHOR = 'author',
  PUBLISHER = 'publisher',
  MENTIONED = 'mentioned',
  ABOUT = 'about',
}

/**
 * Entity resolution source
 */
export enum EntityResolutionSource {
  WIKIDATA = 'wikidata',
  AI_INFERRED = 'ai_inferred',
  USER_PROVIDED = 'user_provided',
}

// ============================================================================
// ENTITY TYPES
// ============================================================================

/**
 * Resolved external entity (Wikidata/Wikipedia)
 */
export interface ResolvedEntity {
  id?: string;
  name: string;
  type: SchemaEntityType;
  wikidataId?: string;
  wikipediaUrl?: string;
  sameAs: string[];
  description?: string;
  properties: Record<string, unknown>;
  confidenceScore: number;
  source: EntityResolutionSource;
  lastVerifiedAt?: string;
  // Extended from EntityCandidate after resolution
  role?: EntityRole;
  isMainEntity?: boolean;
}

/**
 * Entity candidate extracted from content
 */
export interface EntityCandidate {
  name: string;
  type: SchemaEntityType;
  context: string;        // Surrounding text for disambiguation
  mentions: number;       // How many times mentioned
  isMainEntity: boolean;  // Is this the central entity of the content
  role: EntityRole;
}

/**
 * Entity resolution cache entry
 */
export interface EntityCacheEntry {
  id: string;
  userId: string;
  entityName: string;
  entityType: SchemaEntityType;
  wikidataId?: string;
  wikipediaUrl?: string;
  resolvedData?: Record<string, unknown>;
  sameAsUrls: string[];
  confidenceScore: number;
  resolutionSource: EntityResolutionSource;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PROGRESSIVE SCHEMA DATA
// ============================================================================

/**
 * Progressive schema data collected during passes 1-8
 */
export interface ProgressiveSchemaData {
  // From Pass 1 (Draft Generation)
  mainEntity?: string;
  headline?: string;
  description?: string;
  wordCount?: number;
  sections?: Array<{
    name: string;
    about: string;
    order: number;
  }>;

  // From Pass 3 (Lists & Tables)
  hasPart?: Array<{
    type: 'ItemList' | 'HowToStep' | 'FAQPage' | 'Table';
    name?: string;
    items: unknown[];
  }>;

  // From Pass 4 (Visual Semantics)
  images?: Array<{
    description: string;
    caption: string;
    contentUrl?: string;
    altText?: string;
  }>;

  // From Pass 5 (Micro Semantics)
  keywords?: string[];
  entities?: string[];

  // From Pass 7 (Introduction)
  abstractText?: string;

  // From Pass 8 (Audit)
  qualityScore?: number;
  readabilityScore?: number;

  // Collection metadata
  lastUpdatedAt?: string;
  passesContributed?: number[];
}

// ============================================================================
// PASS 9 CONFIGURATION
// ============================================================================

/**
 * Pass 9 (Schema Generation) configuration
 */
export interface Pass9Config {
  pageType?: SchemaPageType;        // Override auto-detection
  includeEntities: boolean;         // Resolve external entities
  maxEntityResolutions: number;     // Limit API calls
  validationLevel: 'basic' | 'standard' | 'strict';
  autoFix: boolean;                 // Apply auto-fixes
  maxAutoFixIterations: number;     // Max fix iterations
  externalValidation: boolean;      // Use external validators
  includeOrganizationSchema: boolean;
  includeAuthorSchema: boolean;
  includeBreadcrumb: boolean;
  includeWebPage: boolean;
}

/**
 * Default Pass 9 configuration
 */
export const DEFAULT_PASS9_CONFIG: Pass9Config = {
  includeEntities: true,
  maxEntityResolutions: 10,
  validationLevel: 'standard',
  autoFix: true,
  maxAutoFixIterations: 3,
  externalValidation: false,
  includeOrganizationSchema: true,
  includeAuthorSchema: true,
  includeBreadcrumb: true,
  includeWebPage: true
};

// ============================================================================
// SCHEMA GENERATION RESULTS
// ============================================================================

/**
 * Legacy schema generation result (kept for backward compatibility)
 * Note: schema can be string (JSON-LD string) or object (when AI response is parsed as JSON)
 */
export interface SchemaGenerationResult {
  schema: string | object;
  reasoning: string;
}

/**
 * Enhanced schema generation result (Pass 9)
 */
export interface EnhancedSchemaResult {
  // The generated schema
  schema: object;              // The full JSON-LD @graph
  schemaString: string;        // Stringified for display/export

  // Metadata
  pageType: SchemaPageType;
  detectedPageType: SchemaPageType;  // What was auto-detected
  pageTypeOverridden: boolean;

  // Entity resolution
  resolvedEntities: ResolvedEntity[];
  entityCandidates: EntityCandidate[];
  entitiesSkipped: string[];   // Entities that couldn't be resolved

  // Validation
  validation: SchemaValidationResult;

  // Generation metadata
  reasoning: string;           // AI reasoning for schema choices
  generatedAt: string;
  version: number;
  configUsed: Pass9Config;

  // Rich result eligibility
  richResultTypes: string[];   // Eligible rich result types
  richResultWarnings: string[];
}

// ============================================================================
// SITE-WIDE SCHEMA ENTITIES
// ============================================================================

/**
 * Site-wide schema entity (Organization, Author defined once)
 */
export interface SiteSchemaEntity {
  id: string;
  mapId: string;
  entityType: 'Organization' | 'Person' | 'WebSite';
  entityId: string;           // The @id value (e.g., "#organization")
  schemaData: object;         // Full schema JSON
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Schema template structure
 */
export interface SchemaTemplate {
  type: SchemaPageType;
  requiredProperties: string[];
  recommendedProperties: string[];
  optionalProperties: string[];
  nestedTypes: Record<string, string[]>;  // Nested schema types and their properties
}

/**
 * Schema @id reference for linking entities
 */
export interface SchemaIdReference {
  '@type': string;
  '@id': string;
}
