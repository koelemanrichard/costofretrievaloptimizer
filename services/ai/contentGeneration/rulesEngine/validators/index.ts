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

export class RulesValidator {
  /**
   * Run all validators against generated content
   */
  static validate(content: string, context: SectionGenerationContext): RulesValidationResult {
    const violations: ValidationViolation[] = [];

    // 1. Prohibited Language
    violations.push(...ProhibitedLanguageValidator.validate(content));

    // 2. EAV Density
    violations.push(...EAVDensityValidator.validate(content));

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
