// services/ai/contentGeneration/passes/pass2Headers.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, SectionProgressCallback } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { executeSectionPass } from './baseSectionPass';
import { buildPass2Prompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 2: Header Optimization
 *
 * Optimizes heading hierarchy and contextual overlap, section by section.
 * Uses holistic context to ensure each heading connects to the central entity
 * while maintaining logical H1→H2→H3 flow.
 *
 * Uses format budget awareness for article-wide context.
 */
export async function executePass2(
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
      passNumber: 2,
      passKey: 'pass_2_headers',
      nextPassNumber: 3,
      promptBuilder: buildPass2Prompt,
      // All sections need header optimization (no selective filtering)
      // Format budget context is still available for article-wide awareness
      batchSize: 1 // Individual processing for now (headers need careful per-section attention)
    },
    onSectionProgress,
    shouldAbort
  );
}
