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

export class RulesValidator {
  /**
   * Run all validators against generated content
   */
  static validate(content: string, context: SectionGenerationContext): RulesValidationResult {
    const violations: ValidationViolation[] = [];

    // S1. Language Output Validation (content must be in expected language)
    violations.push(...LanguageOutputValidator.validateWithViolations(content, context));

    // 1. Prohibited Language (with language-aware patterns)
    violations.push(...ProhibitedLanguageValidator.validate(content, context));

    // 2. EAV Density (with language-aware verb patterns)
    violations.push(...EAVDensityValidator.validate(content, context));

    // 3. Modality
    violations.push(...ModalityValidator.validate(content, context));

    // 4. Format Code Compliance
    if (context.section.format_code) {
      violations.push(...FormatCodeValidator.validate(content, context.section.format_code));
    }

    // 5. Centerpiece (intro only)
    if (context.section.level === 1 || context.section.heading.toLowerCase().includes('introduction')) {
      violations.push(...CenterpieceValidator.validate(content, context));
    }

    // 6. YMYL Safe Answer Protocol
    if (context.isYMYL) {
      violations.push(...YMYLValidator.validate(content, context));
    }

    // 7. S-P-O Structure
    violations.push(...StructureValidator.validate(content, context));

    // 8. Contextual Bridge (for SUPPLEMENTARY zones)
    violations.push(...ContextualBridgeValidator.validate(content, context));

    // 9. Repetition Detection
    violations.push(...RepetitionValidator.validate(content));

    // 10. Central Entity Focus (lenient - info level)
    violations.push(...CentralEntityFocusValidator.validate(content, context));

    // 11. Contextual Vector (heading flow logic)
    violations.push(...ContextualVectorValidator.validate(content, context));

    // 12. Word Count (G2-G4 section word count rules)
    violations.push(...WordCountValidator.validate(content, context));

    // 13. EAV Placement (C2-C3: UNIQUE in first 300 words, ROOT in first 500 words)
    violations.push(...EavPlacementValidator.validate(content, context));

    // 14. S3 Pillar Alignment (content must align with SEO pillars)
    violations.push(...PillarAlignmentValidator.validate(content, context));

    // 15. K4-K5 List Structure (item count 3-7, parallel structure)
    violations.push(...ListStructureValidator.validate(content, context));

    // 16. L2-L5 Table Structure (dimensions, headers, no merged cells, consistent types)
    violations.push(...TableStructureValidator.validate(content, context));

    // 17. H9 Cross-Section Repetition Detection
    violations.push(...CrossSectionRepetitionValidator.validate(content, context));

    // 18. S4 Readability Match (Flesch-Kincaid grade level vs audience)
    violations.push(...ReadabilityValidator.validate(content, context));

    // 19. D5 Discourse Chaining (sentence-to-sentence cohesion)
    violations.push(...DiscourseChainingValidator.validate(content, context));

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
