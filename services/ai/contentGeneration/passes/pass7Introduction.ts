// services/ai/contentGeneration/passes/pass7Introduction.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, SectionProgressCallback } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { executeSectionPass } from './baseSectionPass';
import { buildPass7Prompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 7: Introduction Synthesis
 *
 * Rewrites the introduction AFTER the full article exists.
 * Only processes the intro section, using holistic context to synthesize
 * all H2/H3 topics in the correct order with proper centerpiece annotation.
 */
export async function executePass7(
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
      passNumber: 7,
      passKey: 'pass_7_intro',
      nextPassNumber: 8,
      promptBuilder: buildPass7Prompt,
      // Only process the introduction section
      introOnly: true
    },
    onSectionProgress,
    shouldAbort
  );
}
