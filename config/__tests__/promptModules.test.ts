import { describe, it, expect } from 'vitest';

describe('Prompt module re-exports', () => {
  it('should export all prompts from config/prompts (backward compat)', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.businessContext).toBe('function');
    expect(typeof prompts.GENERATE_CONTENT_BRIEF_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_INITIAL_TOPICAL_MAP_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_ARTICLE_DRAFT_PROMPT).toBe('function');
    expect(typeof prompts.VALIDATE_TOPICAL_MAP_PROMPT).toBe('function');
    expect(typeof prompts.AUDIT_INTERNAL_LINKING_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_PUBLICATION_PLAN_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_FOUNDATION_PAGES_PROMPT).toBe('function');
  });

  it('should export helper functions from _common', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.getStylometryInstructions).toBe('function');
    expect(typeof prompts.getMarketDataPromptSection).toBe('function');
    expect(typeof prompts.getWebsiteTypeInstructions).toBe('function');
    expect(typeof prompts.condenseBriefForPrompt).toBe('function');
    expect(typeof prompts.getLanguageAndRegionInstruction).toBe('function');
  });

  it('should export SERP intelligence functions', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.buildSerpIntelligenceForMap).toBe('function');
    expect(typeof prompts.buildSerpIntelligenceBlock).toBe('function');
  });

  it('should export map generation prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT).toBe('function');
    expect(typeof prompts.SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT).toBe('function');
    expect(typeof prompts.SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT).toBe('function');
    expect(typeof prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT).toBe('function');
    expect(typeof prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_MONETIZATION_SECTION_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_INFORMATIONAL_SECTION_PROMPT).toBe('function');
    expect(typeof prompts.CLASSIFY_TOPIC_SECTIONS_PROMPT).toBe('function');
  });

  it('should export content brief prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.SUGGEST_RESPONSE_CODE_PROMPT).toBe('function');
    expect(typeof prompts.FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT).toBe('function');
    expect(typeof prompts.REGENERATE_BRIEF_PROMPT).toBe('function');
    expect(typeof prompts.REFINE_BRIEF_SECTION_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_NEW_SECTION_PROMPT).toBe('function');
  });

  it('should export draft writing prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.POLISH_ARTICLE_DRAFT_PROMPT).toBe('function');
    expect(typeof prompts.POLISH_SECTION_PROMPT).toBe('function');
    expect(typeof prompts.HOLISTIC_SUMMARY_PROMPT).toBe('function');
    expect(typeof prompts.POLISH_SECTION_WITH_CONTEXT_PROMPT).toBe('function');
    expect(typeof prompts.COHERENCE_PASS_PROMPT).toBe('function');
    expect(typeof prompts.REFINE_DRAFT_SECTION_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_SECTION_DRAFT_PROMPT).toBe('function');
  });

  it('should export auditing prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.AUDIT_CONTENT_INTEGRITY_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_SCHEMA_PROMPT).toBe('function');
    expect(typeof prompts.ANALYZE_GSC_DATA_PROMPT).toBe('function');
  });

  it('should export map analysis prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.IMPROVE_TOPICAL_MAP_PROMPT).toBe('function');
    expect(typeof prompts.FIND_MERGE_OPPORTUNITIES_PROMPT).toBe('function');
    expect(typeof prompts.FIND_LINKING_OPPORTUNITIES_PROMPT).toBe('function');
    expect(typeof prompts.ANALYZE_CONTEXTUAL_COVERAGE_PROMPT).toBe('function');
    expect(typeof prompts.CALCULATE_TOPICAL_AUTHORITY_PROMPT).toBe('function');
    expect(typeof prompts.ANALYZE_SEMANTIC_RELATIONSHIPS_PROMPT).toBe('function');
  });

  it('should export topic operation prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.ADD_TOPIC_INTELLIGENTLY_PROMPT).toBe('function');
    expect(typeof prompts.EXPAND_CORE_TOPIC_PROMPT).toBe('function');
    expect(typeof prompts.ANALYZE_TOPIC_VIABILITY_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT).toBe('function');
    expect(typeof prompts.ENRICH_TOPIC_METADATA_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_TOPIC_BLUEPRINT_PROMPT).toBe('function');
  });

  it('should export flow remediation prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.AUDIT_INTRA_PAGE_FLOW_PROMPT).toBe('function');
    expect(typeof prompts.AUDIT_DISCOURSE_INTEGRATION_PROMPT).toBe('function');
    expect(typeof prompts.APPLY_FLOW_REMEDIATION_PROMPT).toBe('function');
    expect(typeof prompts.BATCH_FLOW_REMEDIATION_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_TASK_SUGGESTION_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_BATCH_TASK_SUGGESTIONS_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_CONTEXT_AWARE_TASK_SUGGESTION_PROMPT).toBe('function');
  });

  it('should export navigation and foundation prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.SEMANTIC_CHUNKING_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_MIGRATION_DECISION_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_DEFAULT_NAVIGATION_PROMPT).toBe('function');
    expect(typeof prompts.VALIDATE_FOUNDATION_PAGES_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_ALTERNATIVE_ANCHORS_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_CONTEXTUAL_BRIDGE_PROMPT).toBe('function');
    expect(typeof prompts.FIND_LINK_SOURCE_PROMPT).toBe('function');
    expect(typeof prompts.VALIDATE_EXTERNAL_LINKS_PROMPT).toBe('function');
    expect(typeof prompts.RESEARCH_BUSINESS_PROMPT).toBe('function');
  });

  it('should export multi-pass prompts', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.PASS_2_HEADER_OPTIMIZATION_PROMPT).toBe('function');
    expect(typeof prompts.PASS_3_LIST_TABLE_PROMPT).toBe('function');
    expect(typeof prompts.PASS_4_VISUAL_SEMANTICS_PROMPT).toBe('function');
    expect(typeof prompts.PASS_5_MICRO_SEMANTICS_PROMPT).toBe('function');
    expect(typeof prompts.PASS_6_DISCOURSE_PROMPT).toBe('function');
    expect(typeof prompts.PASS_7_INTRO_SYNTHESIS_PROMPT).toBe('function');
  });

  it('should export PromptBuilder utilities', async () => {
    const prompts = await import('../prompts');
    expect(typeof prompts.PromptBuilder).toBe('function');
    expect(typeof prompts.createPromptBuilder).toBe('function');
    expect(typeof prompts.composePrompt).toBe('function');
    expect(typeof prompts.criticalRequirement).toBe('function');
    expect(typeof prompts.PROMPT_CONSTRAINTS).toBe('object');
  });
});
