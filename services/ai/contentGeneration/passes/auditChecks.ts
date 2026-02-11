/**
 * Audit Checks — Orchestrator
 *
 * Runs all algorithmic audit checks on draft content.
 * Individual check implementations are in the auditChecks/ directory.
 *
 * @module services/ai/contentGeneration/passes/auditChecks
 */

import { ContentBrief, BusinessInfo, AuditRuleResult, SemanticTriple } from '../../../../types';
import { TemplateConfig } from '../../../../types/contentTemplates';
import { splitSentences } from '../../../../utils/sentenceTokenizer';

// Import all checks from decomposed modules
import {
  checkModality,
  checkStopWords,
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
  checkRepetitiveLanguageCached,
  checkLLMSignaturePhrases,
  checkPredicateConsistency,
  checkCoverageWeight,
  checkVocabularyRichness,
  checkMacroMicroBorder,
  checkExtractiveSummaryAlignment,
  checkQueryFormatAlignment,
  checkAnchorTextVariety,
  checkAnnotationTextQuality,
  checkSupplementaryLinkPlacement,
  checkProseStructuredBalance,
  checkListDefinitionSentences,
  checkTableAppropriateness,
  checkImagePlacement,
  checkSentenceLengthCached,
  checkEavDensityCached,
  checkInternalLinkInsertion,
  checkTemplateFormatCompliance,
  checkTemplateSectionCoverage,
  checkContentZoneBalance,
} from './auditChecks/index';

// ============================================================================
// Yield Helper
// ============================================================================

/**
 * Yield to main thread to prevent browser freeze during long-running operations.
 * Uses setTimeout(0) which works reliably in both foreground and background tabs.
 * In test environments (vitest/jest), yields are skipped to avoid timer issues.
 */
const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const yieldToMainThread = (): Promise<void> => {
  // Skip yielding in test environment where setTimeout can cause issues
  if (isTestEnvironment) {
    return Promise.resolve();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
};

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Run algorithmic audit checks on the draft content
 * @param draft - The content to audit
 * @param brief - The content brief
 * @param info - Business information
 * @param language - ISO language code (e.g., 'nl', 'en', 'de', 'fr', 'es') for multilingual pattern matching
 * @param eavs - Optional SemanticTriple array for EAV density validation
 * @param template - Optional TemplateConfig for template compliance validation
 *
 * NOTE: This function is async and yields to the main thread periodically
 * to prevent browser freezing during the 30+ audit checks.
 */
export async function runAlgorithmicAudit(
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo,
  language?: string,
  eavs?: SemanticTriple[],
  template?: TemplateConfig
): Promise<AuditRuleResult[]> {
  const results: AuditRuleResult[] = [];

  // PERFORMANCE: Pre-compute sentences once (splitSentences is expensive - 50+ regex ops)
  // This avoids calling splitSentences 4+ times during the audit
  const cachedSentences = splitSentences(draft);

  // Phase A: Language & Style Checks (1-14)
  // 1. Modality Check
  results.push(checkModality(draft, language));

  // 2. Stop Words Check
  results.push(checkStopWords(draft, language));

  // 3. Subject Positioning (uses cached sentences)
  results.push(checkSubjectPositioningCached(cachedSentences, info.seedKeyword));

  // 4. Heading Hierarchy
  results.push(checkHeadingHierarchy(draft));

  // YIELD: Allow UI to update after first batch of checks
  await yieldToMainThread();

  // 5. Generic Headings Check (avoid "Introduction", "Conclusion")
  results.push(checkGenericHeadings(draft, language));

  // 6. Passive Voice Check
  results.push(checkPassiveVoice(draft, language));

  // 7. Heading-Entity Alignment Check
  results.push(checkHeadingEntityAlignment(draft, info.seedKeyword, brief.title, language));

  // 8. Future Tense for Facts Check
  results.push(checkFutureTenseForFacts(draft, language));

  // 9. Stop Word Density (full document)
  results.push(checkStopWordDensity(draft, language));

  // YIELD: Allow UI to update after second batch
  await yieldToMainThread();

  // 10. List Count Specificity
  results.push(checkListCountSpecificity(draft, language));

  // 11. Pronoun Density
  results.push(checkPronounDensity(draft, brief.title, language));

  // 12. Link Positioning
  results.push(checkLinkPositioning(draft));

  // 13. First Sentence Precision
  results.push(checkFirstSentencePrecision(draft, language));

  // 14. Centerpiece Annotation
  results.push(checkCenterpieceAnnotation(draft, info.seedKeyword, language));

  // YIELD: Allow UI to update after third batch
  await yieldToMainThread();

  // 15. Repetitive Language (uses cached sentences)
  results.push(checkRepetitiveLanguageCached(cachedSentences, info.seedKeyword));

  // 16. LLM Signature Phrases
  results.push(checkLLMSignaturePhrases(draft, language));

  // 17. Predicate Consistency
  results.push(checkPredicateConsistency(draft, brief.title, language));

  // 18. Content Coverage Weight
  results.push(checkCoverageWeight(draft));

  // 19. Vocabulary Richness
  results.push(checkVocabularyRichness(draft));

  // YIELD: Allow UI to update after fourth batch
  await yieldToMainThread();

  // Phase B: Structural Enhancements (20-22)
  // 20. Macro/Micro Border
  results.push(checkMacroMicroBorder(draft));

  // 21. Extractive Summary Alignment
  results.push(checkExtractiveSummaryAlignment(draft, language));

  // 22. Query-Format Alignment
  results.push(checkQueryFormatAlignment(draft, brief, language));

  // YIELD: Allow UI to update after Phase B
  await yieldToMainThread();

  // Phase C: Link Optimization (23-25)
  // 23. Anchor Text Variety
  results.push(checkAnchorTextVariety(draft));

  // 24. Annotation Text Quality
  results.push(checkAnnotationTextQuality(draft, language));

  // 25. Supplementary Link Placement
  results.push(checkSupplementaryLinkPlacement(draft, language));

  // Phase D: Content Format Balance (26-27) - Baker Principle
  // 26. Prose/Structured Balance
  results.push(checkProseStructuredBalance(draft));

  // 27. List Definition Sentences
  results.push(checkListDefinitionSentences(draft));

  // YIELD: Allow UI to update after Phase C/D start
  await yieldToMainThread();

  // 28. Table Appropriateness
  results.push(checkTableAppropriateness(draft));

  // 29. Image Placement
  results.push(checkImagePlacement(draft));

  // 30. Sentence Length (uses cached sentences)
  results.push(checkSentenceLengthCached(cachedSentences, language));

  // 31. EAV Density (uses cached sentences) - now async to prevent browser freeze
  results.push(await checkEavDensityCached(cachedSentences, draft, eavs, language));

  // 32. Internal Link Insertion (Contextual Bridge Links)
  results.push(checkInternalLinkInsertion(draft, brief));

  // YIELD: Allow UI to update before final phase
  await yieldToMainThread();

  // Phase E: Template Compliance (33-35)
  // 33. Template Format Code Compliance
  results.push(checkTemplateFormatCompliance(draft, brief, template));

  // 34. Template Section Coverage
  results.push(checkTemplateSectionCoverage(draft, brief, template));

  // 35. Content Zone Balance
  results.push(checkContentZoneBalance(draft, brief));

  return results;
}

// ============================================================================
// Backward-Compatible Re-Exports
// ============================================================================

// Re-export everything from the decomposed modules for backward compatibility
export {
  checkProseStructuredBalance,
  checkListDefinitionSentences,
  checkTableAppropriateness,
  checkImagePlacement,
  checkTemplateFormatCompliance,
  checkTemplateSectionCoverage,
  checkContentZoneBalance,
  convertToAuditIssues,
  generateAutoFix,
  applyAutoFix,
  batchApplyAutoFixes,
} from './auditChecks/index';
export type { AutoFixContext } from './auditChecks/index';
