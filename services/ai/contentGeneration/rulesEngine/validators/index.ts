// services/ai/contentGeneration/rulesEngine/validators/index.ts

import { RulesValidationResult, ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { ProhibitedLanguageValidator } from './prohibitedLanguage';
import { EAVDensityValidator } from './eavDensity';
import { ModalityValidator } from './modalityValidator';
import { CenterpieceValidator } from './centerpieceValidator';
import { CentralEntityFocusValidator } from './centralEntityFocusValidator';
import { YMYLValidator } from './ymylValidator';
import { FormatCodeValidator } from './formatCodeValidator';
import { StructureValidator } from './structureValidator';
import { ContextualBridgeValidator } from './contextualBridgeValidator';
import { RepetitionValidator } from './repetitionValidator';
import { CrossSectionRepetitionValidator } from './crossSectionRepetitionValidator';
import { ContextualVectorValidator } from './contextualVectorValidator';
import { LanguageOutputValidator } from './languageOutputValidator';
import { WordCountValidator } from './wordCountValidator';
import { EavPlacementValidator } from './eavPlacementValidator';
import { PillarAlignmentValidator } from './pillarAlignmentValidator';
import { ListStructureValidator } from './listStructureValidator';
import { TableStructureValidator } from './tableStructureValidator';
import { ReadabilityValidator } from './readabilityValidator';
import { DiscourseChainingValidator } from './discourseChainingValidator';
import { EavPerSentenceValidator } from './eavPerSentenceValidator';
import { AttributeOrderingValidator } from './attributeOrderingValidator';
import { EavPresenceValidator } from './eavPresenceValidator';
import { FactConsistencyValidator } from './factConsistencyValidator';
import { HierarchyValidator } from './hierarchyValidator';
import { BriefCompletenessValidator } from './briefCompletenessValidator';
import { EavDistributionValidator } from './eavDistributionValidator';
import { ActiveVoiceValidator } from './activeVoiceValidator';
import { SentenceLengthValidator } from './sentenceLengthValidator';
import { StopWordValidator } from './stopWordValidator';
import { FutureTenseValidator } from './futureTenseValidator';
import { NegativeConstraintValidator } from './negativeConstraintValidator';
import { QueryOrderingValidator } from './queryOrderingValidator';

export class RulesValidator {
  /**
   * Validators that should run during Pass 1 (draft generation).
   * These are fundamental issues that should be caught early.
   * Other validators address issues that later passes will fix.
   */
  private static readonly PASS1_VALIDATORS = new Set([
    'language',      // Content must be in correct language
    'prohibited',    // Avoid AI-speak patterns
    'wordcount',     // Basic length requirements
    'structure',     // Basic S-P-O structure
    'eavpresence',   // UNIQUE/ROOT EAVs must appear in content
  ]);

  /**
   * Run validators against generated content.
   * @param content The generated content to validate
   * @param context The section generation context
   * @param pass Optional pass number (1-9). If provided, only pass-appropriate validators run.
   *             Pass 1 runs minimal validators; Pass 8+ runs all validators.
   */
  static validate(content: string, context: SectionGenerationContext, pass?: number): RulesValidationResult {
    const violations: ValidationViolation[] = [];

    // Determine if we should run all validators or just pass-specific ones
    const isPass1 = pass === 1;
    const runAll = !pass || pass >= 8; // Pass 8 (audit) and later run all validators

    // S1. Language Output Validation (content must be in expected language)
    // Always run - fundamental requirement
    violations.push(...LanguageOutputValidator.validateWithViolations(content, context));

    // 1. Prohibited Language (with language-aware patterns)
    // Always run - AI-speak should be caught early
    violations.push(...ProhibitedLanguageValidator.validate(content, context));

    // 1b. EAV Presence (lightweight check: do assigned EAVs appear at all?)
    // Run in Pass 1 as warnings - triggers retry with fix instructions
    if (isPass1 || runAll) {
      violations.push(...EavPresenceValidator.validate(content, context));
    }

    // 1c. EAV Distribution (no single section should hog all EAVs)
    // Skip in Pass 1 - distribution only matters with full article
    if (runAll || !isPass1) {
      violations.push(...EavDistributionValidator.validate(content, context));
    }

    // 2. EAV Density (with language-aware verb patterns)
    // Skip in Pass 1 - later passes add semantic richness
    if (runAll || !isPass1) {
      violations.push(...EAVDensityValidator.validate(content, context));
    }

    // 3. Modality
    // Skip in Pass 1 - Pass 5 (Micro Semantics) handles modality
    if (runAll || !isPass1) {
      violations.push(...ModalityValidator.validate(content, context));
    }

    // 4. Format Code Compliance
    // Skip in Pass 1 - formatting is refined in later passes
    if ((runAll || !isPass1) && context.section.format_code) {
      violations.push(...FormatCodeValidator.validate(content, context.section.format_code));
    }

    // 5. Centerpiece and Heading-Answer validation
    // Skip in Pass 1 - Pass 7 (Introduction Synthesis) handles intro
    // Now runs for ALL sections, not just intro
    if (runAll || !isPass1) {
      violations.push(...CenterpieceValidator.validate(content, context));
    }

    // 6. YMYL Safe Answer Protocol
    // Always run for YMYL content - safety is fundamental
    if (context.isYMYL) {
      violations.push(...YMYLValidator.validate(content, context));
    }

    // 7. S-P-O Structure
    // Always run - basic structure is fundamental
    violations.push(...StructureValidator.validate(content, context));

    // 7b. Heading Hierarchy (H1-H6 nesting rules)
    if ((runAll || !isPass1) && context.allSections && context.allSections.length > 0) {
      violations.push(...HierarchyValidator.validateStructure(context.allSections));
    }

    // 8. Contextual Bridge (for SUPPLEMENTARY zones)
    // Skip in Pass 1 - Pass 6 (Discourse Integration) handles bridges
    if (runAll || !isPass1) {
      violations.push(...ContextualBridgeValidator.validate(content, context));
    }

    // 9. Repetition Detection
    // Skip in Pass 1 - later passes refine language
    if (runAll || !isPass1) {
      violations.push(...RepetitionValidator.validate(content));
    }

    // 10. Central Entity Focus (lenient - info level)
    // Skip in Pass 1 - later passes strengthen entity focus
    if (runAll || !isPass1) {
      violations.push(...CentralEntityFocusValidator.validate(content, context));
    }

    // 11. Contextual Vector (heading flow logic)
    // Skip in Pass 1 - Pass 2 (Header Optimization) handles this
    if (runAll || !isPass1) {
      violations.push(...ContextualVectorValidator.validate(content, context));
    }

    // 12. Word Count (G2-G4 section word count rules)
    // Run in Pass 1 - basic length is fundamental
    violations.push(...WordCountValidator.validate(content, context));

    // 13. EAV Per Sentence (one EAV per sentence rule)
    // Skip in Pass 1 - semantic structure refined in later passes
    if (runAll || !isPass1) {
      violations.push(...EavPerSentenceValidator.validate(content, context));
    }

    // 14. EAV Placement (C2-C3: UNIQUE in first 300 words, ROOT in first 500 words)
    // Skip in Pass 1 - semantic placement is refined later
    if (runAll || !isPass1) {
      violations.push(...EavPlacementValidator.validate(content, context));
    }

    // 15. S3 Pillar Alignment (content must align with SEO pillars)
    // Skip in Pass 1 - alignment is validated in audit
    if (runAll || !isPass1) {
      violations.push(...PillarAlignmentValidator.validate(content, context));
    }

    // 15b. Attribute Ordering (UNIQUE -> ROOT -> RARE -> COMMON)
    // Skip in Pass 1 - structure is established in brief generation
    if (runAll || !isPass1) {
      violations.push(...AttributeOrderingValidator.validate(content, context));
    }

    // 16. K4-K5 List Structure (item count 3-7, parallel structure)
    // Skip in Pass 1 - Pass 3 (Lists & Tables) handles this
    if (runAll || !isPass1) {
      violations.push(...ListStructureValidator.validate(content, context));
    }

    // 17. L2-L5 Table Structure (dimensions, headers, no merged cells, consistent types)
    // Skip in Pass 1 - Pass 3 (Lists & Tables) handles this
    if (runAll || !isPass1) {
      violations.push(...TableStructureValidator.validate(content, context));
    }

    // 18. H9 Cross-Section Repetition Detection
    // Skip in Pass 1 - requires all sections, validated in audit
    if (runAll || !isPass1) {
      violations.push(...CrossSectionRepetitionValidator.validate(content, context));
    }

    // 19. S4 Readability Match (Flesch-Kincaid grade level vs audience)
    // Skip in Pass 1 - readability improves through passes
    if (runAll || !isPass1) {
      violations.push(...ReadabilityValidator.validate(content, context));
    }

    // 20. D5 Discourse Chaining (sentence-to-sentence cohesion)
    // Skip in Pass 1 - Pass 6 (Discourse Integration) handles this
    if (runAll || !isPass1) {
      violations.push(...DiscourseChainingValidator.validate(content, context));
    }

    // 21. Fact Consistency (hallucination detection via brief data cross-reference)
    // Skip in Pass 1 - content isn't complete enough for cross-referencing yet
    if (runAll || !isPass1) {
      violations.push(...FactConsistencyValidator.validate(content, context));
    }

    // 22. Brief Completeness (all brief sections covered, UNIQUE/ROOT EAVs present, keyword present)
    // Only runs during Pass 8+ audit — requires full article assembled
    if (runAll) {
      violations.push(...BriefCompletenessValidator.validate(content, context));
    }

    // 23. Active Voice (>70% sentences should use active voice)
    // Skip in Pass 1 - voice quality refined in later passes
    if (runAll || !isPass1) {
      violations.push(...ActiveVoiceValidator.validate(content, context));
    }

    // 24. Sentence Length by Type (definitional 15-20, explanatory 20-30, instructional 10-15)
    // Skip in Pass 1 - sentence structure refined in later passes
    if (runAll || !isPass1) {
      violations.push(...SentenceLengthValidator.validate(content, context));
    }

    // 25. Stop Word Ratio + Information Density (<30% stop words)
    // Skip in Pass 1 - density improves through passes
    if (runAll || !isPass1) {
      violations.push(...StopWordValidator.validate(content, context));
    }

    // 26. Future Tense for Facts (use present tense for permanent facts)
    // Skip in Pass 1 - tense refined in later passes
    if (runAll || !isPass1) {
      violations.push(...FutureTenseValidator.validate(content, context));
    }

    // 27. Negative Constraints (definitions should include "what X is NOT")
    // Only runs during audit - requires full section context
    if (runAll) {
      violations.push(...NegativeConstraintValidator.validate(content, context));
    }

    // 28. Query Probability Ordering (sections ordered by search volume)
    // Only runs during audit - requires all sections
    if (runAll) {
      violations.push(...QueryOrderingValidator.validate(content, context));
    }

    // Build fix instructions
    const fixInstructions = this.buildFixInstructions(violations);

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      fixInstructions,
    };
  }

  private static buildFixInstructions(violations: ValidationViolation[]): string {
    if (violations.length === 0) return '';

    const errorViolations = violations.filter(v => v.severity === 'error');
    if (errorViolations.length === 0) return '';

    let instructions = 'FIX REQUIRED:\n';
    errorViolations.forEach((v, i) => {
      instructions += `${i + 1}. [${v.rule}] ${v.suggestion}\n`;
    });

    return instructions;
  }
}

export { ProhibitedLanguageValidator } from './prohibitedLanguage';
export { EAVDensityValidator } from './eavDensity';
export type { EavDensityResult, EavDensityWarning } from './eavDensity';
export { ModalityValidator } from './modalityValidator';
export { CenterpieceValidator } from './centerpieceValidator';
export { CentralEntityFocusValidator } from './centralEntityFocusValidator';
export type { CentralEntityFocusResult, CentralEntityFocusWarning } from './centralEntityFocusValidator';
export { YMYLValidator } from './ymylValidator';
export { FormatCodeValidator } from './formatCodeValidator';
export { StructureValidator } from './structureValidator';
export { ContextualBridgeValidator } from './contextualBridgeValidator';
export { HierarchyValidator } from './hierarchyValidator';
export { RepetitionValidator } from './repetitionValidator';
export { CrossSectionRepetitionValidator } from './crossSectionRepetitionValidator';
export { ContextualVectorValidator } from './contextualVectorValidator';
export type { ContextualVectorResult, ContextualVectorIssue } from './contextualVectorValidator';
export { LanguageOutputValidator } from './languageOutputValidator';
export type { LanguageDetectionResult } from './languageOutputValidator';
export { WordCountValidator } from './wordCountValidator';
export { EavPlacementValidator } from './eavPlacementValidator';
export type { EavPlacementResult } from './eavPlacementValidator';
export { PillarAlignmentValidator } from './pillarAlignmentValidator';
export type { PillarAlignmentResult } from './pillarAlignmentValidator';
export { ListStructureValidator } from './listStructureValidator';
export { TableStructureValidator } from './tableStructureValidator';
export type { ExtractedTable } from './tableStructureValidator';
export { ReadabilityValidator } from './readabilityValidator';
export type { AudienceLevel, FleschKincaidResult } from './readabilityValidator';
export { AUDIENCE_GRADE_RANGES } from './readabilityValidator';
export { DiscourseChainingValidator } from './discourseChainingValidator';
export type { DiscourseChainAnalysis } from './discourseChainingValidator';
export { validateCrossPageEavConsistency } from './crossPageEavValidator';
export type { EavContradiction, EavConsistencyWarning, EavConsistencyResult } from './crossPageEavValidator';
export { EavPerSentenceValidator } from './eavPerSentenceValidator';
export { AttributeOrderingValidator } from './attributeOrderingValidator';
export { EavPresenceValidator } from './eavPresenceValidator';
export { FactConsistencyValidator } from './factConsistencyValidator';
export { LinkInsertionValidator, validateLinkInsertion, extractContextualBridgeLinks, generateMissingLinksFallback } from './linkInsertionValidator';
export type { LinkInsertionResult } from './linkInsertionValidator';
export { BriefCompletenessValidator } from './briefCompletenessValidator';
export { EavDistributionValidator } from './eavDistributionValidator';
export { ActiveVoiceValidator } from './activeVoiceValidator';
export { SentenceLengthValidator } from './sentenceLengthValidator';
export { StopWordValidator } from './stopWordValidator';
export { FutureTenseValidator } from './futureTenseValidator';
export { NegativeConstraintValidator } from './negativeConstraintValidator';
export { QueryOrderingValidator } from './queryOrderingValidator';
