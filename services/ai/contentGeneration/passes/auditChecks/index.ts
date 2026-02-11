/**
 * Audit Checks Module Index
 *
 * Re-exports all audit check functions from their respective modules.
 *
 * @module services/ai/contentGeneration/passes/auditChecks
 */

// Phase A: Language & Style Checks (1-19)
export {
  checkModality,
  checkStopWords,
  checkSubjectPositioning,
  checkSubjectPositioningCached,
  checkHeadingHierarchy,
  checkGenericHeadings,
  checkPassiveVoice,
  checkHeadingEntityAlignment,
  checkFutureTenseForFacts,
  checkStopWordDensity,
  checkListCountSpecificity,
  checkPronounDensity,
  checkLinkPositioning,
  checkFirstSentencePrecision,
  checkCenterpieceAnnotation,
  checkRepetitiveLanguage,
  checkRepetitiveLanguageCached,
  checkLLMSignaturePhrases,
  checkPredicateConsistency,
  checkCoverageWeight,
  checkVocabularyRichness,
} from './languageStyleChecks';

// Phase B: Structural Enhancement Checks (20-22)
export {
  SUPPLEMENTARY_HEADING_PATTERNS,
  checkMacroMicroBorder,
  checkExtractiveSummaryAlignment,
  checkQueryFormatAlignment,
} from './structuralChecks';

// Phase C: Link Optimization Checks (23-25)
export {
  checkAnchorTextVariety,
  checkAnnotationTextQuality,
  checkSupplementaryLinkPlacement,
} from './linkChecks';

// Phase D: Content Format Balance Checks (26-32)
export {
  checkProseStructuredBalance,
  checkListDefinitionSentences,
  checkTableAppropriateness,
  checkImagePlacement,
  checkSentenceLength,
  checkSentenceLengthCached,
  checkEavDensity,
  checkEavDensityCached,
  checkInternalLinkInsertion,
} from './contentFormatChecks';

// Phase E: Template Compliance Checks (33-35)
export {
  checkTemplateFormatCompliance,
  checkTemplateSectionCoverage,
  checkContentZoneBalance,
} from './templateChecks';

// Auto-Fix System
export {
  convertToAuditIssues,
  generateAutoFix,
  applyAutoFix,
  batchApplyAutoFixes,
} from './autoFixSystem';
export type { AutoFixContext } from './autoFixSystem';
