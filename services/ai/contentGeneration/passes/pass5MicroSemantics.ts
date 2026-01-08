// services/ai/contentGeneration/passes/pass5MicroSemantics.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, SectionProgressCallback } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { executeSectionPass } from './baseSectionPass';
import { buildPass5Prompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 5: Micro Semantics Optimization
 *
 * The most comprehensive linguistic optimization pass, applied section by section.
 * Applies modality certainty, stop word removal, subject positioning,
 * information density, and reference principle rules.
 * Uses holistic vocabulary metrics to guide synonym usage.
 *
 * Processes ALL sections (no selective filtering) as all content benefits from
 * linguistic polish. Uses format budget for article-wide vocabulary awareness.
 */
export async function executePass5(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<string> {
  return executeSectionPass(
    orchestrator,
    job,
    brief,
    businessInfo,
    {
      passNumber: 6,  // Now Pass 6 in new 10-pass order (aliased via index.ts)
      passKey: 'pass_6_microsemantics',
      nextPassNumber: 7,  // Proceed to Pass 7 (Visual Semantics)
      promptBuilder: buildPass5Prompt,
      // All sections need micro-semantic optimization (no selective filtering)
      // Linguistic polish benefits every section
      batchSize: 1 // Individual processing (micro-semantics requires careful per-section attention)
    },
    onSectionProgress,
    shouldAbort
  );
}
