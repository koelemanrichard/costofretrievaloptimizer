// services/ai/contentGeneration/passes/pass4Visuals.ts
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
import { buildPass4Prompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 4: Visual Semantics
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing images
 * - Ensures proper image placement (never between heading and first paragraph)
 * - Uses vocabulary-extending alt text
 *
 * Batches sections to reduce API calls.
 */
export async function executePass4(
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
      passNumber: 7,  // Now Pass 7 in new 10-pass order (aliased via index.ts)
      passKey: 'pass_7_visuals',
      nextPassNumber: 8,  // Proceed to Pass 8 (Final Polish)
      promptBuilder: buildPass4Prompt,

      // Batch processing: 5 sections per API call
      batchSize: 5,

      // Selective processing: Only sections needing images
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        return sections.filter(s =>
          budget.sectionsNeedingOptimization.images.includes(s.section_key)
        );
      }
    },
    onSectionProgress,
    shouldAbort
  );
}
