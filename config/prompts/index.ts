/**
 * Prompt Utilities - Barrel Exports
 *
 * This module exports all prompt-building utilities for use across the application.
 *
 * Created: 2024-12-20 - Prompt template engine
 */

export {
  // Constants
  PROMPT_CONSTRAINTS,
  jsonResponseInstruction,

  // Context builders
  businessContext,
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
