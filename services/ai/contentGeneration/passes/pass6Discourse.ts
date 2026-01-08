// services/ai/contentGeneration/passes/pass6Discourse.ts
import {
  ContentBrief,
  ContentGenerationJob,
  BusinessInfo,
  SectionProgressCallback,
  ContentGenerationSection,
  ContentFormatBudget
} from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { executeSectionPass } from './baseSectionPass';
import { buildPass6Prompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 6: Discourse Integration
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing discourse improvement
 * - Uses adjacent section context to ensure smooth transitions
 * - Applies discourse anchors for contextual bridges
 *
 * Batches sections to reduce API calls.
 */
export async function executePass6(
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
      passNumber: 5,  // Now Pass 5 in new 10-pass order (aliased via index.ts)
      passKey: 'pass_5_discourse',
      nextPassNumber: 6,  // Proceed to Pass 6 (Micro Semantics)
      promptBuilder: buildPass6Prompt,

      // Batch processing: 3 sections per API call
      batchSize: 3,

      // Selective processing: Only sections needing discourse improvement
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        return sections.filter(s =>
          budget.sectionsNeedingOptimization.discourse.includes(s.section_key)
        );
      }
    },
    onSectionProgress,
    shouldAbort
  );
}
