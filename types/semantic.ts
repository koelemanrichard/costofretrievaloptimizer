/**
 * Semantic Types Module
 *
 * Contains semantic SEO types including:
 * - SemanticTriple: Entity-Attribute-Value triples
 * - AttributeCategory/AttributeClass: Classification types
 * - AttributeMetadata: Deep metadata for EAVs
 * - Related topic and expansion types
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/semantic
 */

import { KPMetadata } from './business';

// ============================================================================
// ATTRIBUTE CLASSIFICATION
// ============================================================================

/**
 * Research-based Attribute Classification
 * Used to categorize EAV predicates for content strategy
 */
export type AttributeCategory =
  | 'CORE_DEFINITION'        // Essential defining attributes
  | 'SEARCH_DEMAND'          // Attributes with search volume
  | 'COMPETITIVE_EXPANSION'  // Attributes competitors cover
  | 'COMPOSITE'              // Compound attributes
  | 'UNIQUE'                 // Legacy - unique differentiators
  | 'ROOT'                   // Legacy - fundamental attributes
  | 'RARE'                   // Legacy - less common attributes
  | 'COMMON';                // Legacy - frequently used attributes

/**
 * Attribute class for semantic organization
 */
export type AttributeClass =
  | 'TYPE'          // What something is
  | 'COMPONENT'     // Parts/elements
  | 'BENEFIT'       // Advantages/outcomes
  | 'RISK'          // Disadvantages/concerns
  | 'PROCESS'       // How-to/methodology
  | 'SPECIFICATION'; // Technical details

// ============================================================================
// ATTRIBUTE METADATA
// ============================================================================

/**
 * Deep metadata for EAV attributes
 * Provides validation, presentation, and computation rules
 */
export interface AttributeMetadata {
  validation?: {
    type: 'CURRENCY' | 'NUMBER' | 'STRING' | 'BOOLEAN';
    min?: number;
    max?: number;
    options?: string[];
  };
  presentation?: {
    prominence: 'CENTERPIECE' | 'STANDARD' | 'SUPPLEMENTARY';
  };
  dependency?: {
    dependsOn: string;
    rule: string;
  };
  computation?: {
    originalUnit: string;
    displayUnit: string;
    conversion: string;
  };
}

// ============================================================================
// SEMANTIC TRIPLE (EAV)
// ============================================================================

/**
 * Semantic Triple (Entity-Attribute-Value)
 * Core data structure for knowledge representation
 */
export interface SemanticTriple {
  subject: {
    label: string;
    type: string;
  };
  predicate: {
    relation: string;
    type: string;
    category?: AttributeCategory; // Research-based classification
    classification?: AttributeClass;
  };
  object: {
    value: string | number;
    type: string;
    unit?: string;
    truth_range?: string;
  };
  metadata?: AttributeMetadata; // Deep metadata for EAV
  lexical?: {
    synonyms?: string[];    // Alternative terms for the object value
    antonyms?: string[];    // Opposite/contrasting concepts
    hypernyms?: string[];   // Broader category terms
  };
  kpMetadata?: KPMetadata;    // Knowledge Panel contribution tracking
}

// ============================================================================
// TOPIC BLUEPRINT & EXPANSION
// ============================================================================

/**
 * Topic expansion mode for generating related content
 */
export enum ExpansionMode {
  ATTRIBUTE = 'ATTRIBUTE',
  ENTITY = 'ENTITY',
  CONTEXT = 'CONTEXT',
  FRAME = 'FRAME',
  CHILD = 'CHILD',
}

/**
 * Blueprint for topic content structure
 */
export interface TopicBlueprint {
  contextual_vector: string; // H2 sequence
  methodology: string;
  subordinate_hint: string;
  perspective: string;
  interlinking_strategy: string;
  anchor_text: string;
  annotation_hint: string;
}

// ============================================================================
// FRESHNESS PROFILE
// ============================================================================

/**
 * Content freshness requirements
 */
export enum FreshnessProfile {
  EVERGREEN = 'EVERGREEN',
  STANDARD = 'STANDARD',
  FREQUENT = 'FREQUENT',
}

// ============================================================================
// ENTITY/CONTEXT OPTIONS (for wizards)
// ============================================================================

/**
 * Candidate entity for pillar selection
 */
export interface CandidateEntity {
  entity: string;
  reasoning: string;
  score: number;
}

/**
 * Source context option for pillar selection
 */
export interface SourceContextOption {
  context: string;
  reasoning: string;
  score: number;
}
