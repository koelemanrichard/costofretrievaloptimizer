/**
 * Prompt Utilities - Barrel Exports
 *
 * This module exports all prompt-building utilities for use across the application.
 * The monolithic config/prompts.ts has been decomposed into domain-specific modules.
 *
 * Created: 2024-12-20 - Prompt template engine
 * Updated: 2026-01-27 - Added modular prompt exports
 * Updated: 2026-02-11 - Decomposed into 9 domain modules
 */

// ============================================================================
// Shared helpers and constants
// ============================================================================
export {
  // Constants & instructions
  jsonResponseInstruction,

  // Context builders
  businessContext,
  getWebsiteTypeInstructions,
  getStylometryInstructions,
  getMarketDataPromptSection,
  condenseBriefForPrompt,
  condenseBriefForPromptFull,

  // SERP intelligence
  buildSerpIntelligenceForMap,
  buildSerpIntelligenceBlock,
  getCategoryDistribution,

  // Re-exported utility functions
  getLanguageAndRegionInstruction,
  getLanguageName,
  getRegionalLanguageVariant,
  getMonetizationPromptEnhancement,
  shouldApplyMonetizationEnhancement,
  getWebsiteTypeConfig,

  // Types
  type SerpIntelligenceForMap,
} from './_common';

// ============================================================================
// PromptBuilder class and composition utilities
// ============================================================================
export {
  // Constants
  PROMPT_CONSTRAINTS,

  // Context builders (PromptBuilder versions — these are the simplified/compact versions)
  compactBusinessContext,
  pillarsContext,
  compactPillarsContext,
  stylometryInstructions,
  websiteTypeInstructions,

  // Composition utilities
  composePrompt,
  criticalRequirement,
  numberedListFormat,
  jsonArrayExample,

  // Fluent builder
  PromptBuilder,
  createPromptBuilder,

  // Types
  type PromptPart,
} from './PromptBuilder';

// ============================================================================
// Domain modules
// ============================================================================

// Map generation: pillar suggestions, semantic triples, topical map structure
export {
  SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT,
  SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT,
  SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT,
  DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT,
  EXPAND_SEMANTIC_TRIPLES_PROMPT,
  GENERATE_INITIAL_TOPICAL_MAP_PROMPT,
  GENERATE_MONETIZATION_SECTION_PROMPT,
  GENERATE_INFORMATIONAL_SECTION_PROMPT,
  CLASSIFY_TOPIC_SECTIONS_PROMPT,
} from './mapGeneration';

// Content briefs: response codes, brief generation, merge opportunities, brief editing
export {
  SUGGEST_RESPONSE_CODE_PROMPT,
  GENERATE_CONTENT_BRIEF_PROMPT,
  FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT,
  REGENERATE_BRIEF_PROMPT,
  REFINE_BRIEF_SECTION_PROMPT,
  GENERATE_NEW_SECTION_PROMPT,
} from './contentBriefs';

// Draft writing: article generation, polishing, coherence, section drafts
export {
  GENERATE_ARTICLE_DRAFT_PROMPT,
  POLISH_ARTICLE_DRAFT_PROMPT,
  POLISH_SECTION_PROMPT,
  HOLISTIC_SUMMARY_PROMPT,
  POLISH_SECTION_WITH_CONTEXT_PROMPT,
  COHERENCE_PASS_PROMPT,
  REFINE_DRAFT_SECTION_PROMPT,
  GENERATE_SECTION_DRAFT_PROMPT,
} from './draftWriting';

// Auditing: content integrity, schema, GSC analysis
export {
  AUDIT_CONTENT_INTEGRITY_PROMPT,
  GENERATE_SCHEMA_PROMPT,
  ANALYZE_GSC_DATA_PROMPT,
} from './auditing';

// Map analysis: validation, improvement, linking, coverage, authority, publication planning
export {
  VALIDATE_TOPICAL_MAP_PROMPT,
  IMPROVE_TOPICAL_MAP_PROMPT,
  FIND_MERGE_OPPORTUNITIES_PROMPT,
  FIND_LINKING_OPPORTUNITIES_PROMPT,
  ANALYZE_CONTEXTUAL_COVERAGE_PROMPT,
  AUDIT_INTERNAL_LINKING_PROMPT,
  CALCULATE_TOPICAL_AUTHORITY_PROMPT,
  GENERATE_PUBLICATION_PLAN_PROMPT,
  ANALYZE_SEMANTIC_RELATIONSHIPS_PROMPT,
} from './mapAnalysis';

// Topic operations: add, expand, analyze, suggest, enrich, blueprint
export {
  ADD_TOPIC_INTELLIGENTLY_PROMPT,
  EXPAND_CORE_TOPIC_PROMPT,
  ANALYZE_TOPIC_VIABILITY_PROMPT,
  GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT,
  GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT,
  ENRICH_TOPIC_METADATA_PROMPT,
  GENERATE_TOPIC_BLUEPRINT_PROMPT,
} from './topicOperations';

// Flow remediation: flow auditing, discourse integration, remediation, task suggestions
export {
  AUDIT_INTRA_PAGE_FLOW_PROMPT,
  AUDIT_DISCOURSE_INTEGRATION_PROMPT,
  APPLY_FLOW_REMEDIATION_PROMPT,
  BATCH_FLOW_REMEDIATION_PROMPT,
  GENERATE_TASK_SUGGESTION_PROMPT,
  GENERATE_BATCH_TASK_SUGGESTIONS_PROMPT,
  GENERATE_CONTEXT_AWARE_TASK_SUGGESTION_PROMPT,
} from './flowRemediation';

// Navigation: migration, foundation pages, navigation, linking audit, business research
export {
  SEMANTIC_CHUNKING_PROMPT,
  GENERATE_MIGRATION_DECISION_PROMPT,
  GENERATE_FOUNDATION_PAGES_PROMPT,
  GENERATE_DEFAULT_NAVIGATION_PROMPT,
  VALIDATE_FOUNDATION_PAGES_PROMPT,
  GENERATE_ALTERNATIVE_ANCHORS_PROMPT,
  GENERATE_CONTEXTUAL_BRIDGE_PROMPT,
  FIND_LINK_SOURCE_PROMPT,
  VALIDATE_EXTERNAL_LINKS_PROMPT,
  RESEARCH_BUSINESS_PROMPT,
} from './navigation';

// Multi-pass content optimization prompts
export {
  PASS_2_HEADER_OPTIMIZATION_PROMPT,
  PASS_3_LIST_TABLE_PROMPT,
  PASS_4_VISUAL_SEMANTICS_PROMPT,
  PASS_5_MICRO_SEMANTICS_PROMPT,
  PASS_6_DISCOURSE_PROMPT,
  PASS_7_INTRO_SYNTHESIS_PROMPT,
} from './multiPass';
