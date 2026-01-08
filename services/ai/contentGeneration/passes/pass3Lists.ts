// services/ai/contentGeneration/passes/pass3Lists.ts
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
import { buildPass3Prompt, buildPass3BatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 3: List & Table Optimization
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing lists/tables
 * - Respects the 40% list / 15% table budget
 * - Batches sections to reduce API calls
 *
 * This prevents over-optimization with lists/tables (Baker Principle).
 */
export async function executePass3(
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
      passNumber: 4,  // Now Pass 4 in new 10-pass order (aliased via index.ts)
      passKey: 'pass_4_lists',
      nextPassNumber: 5,  // Proceed to Pass 5 (Discourse Integration)
      promptBuilder: buildPass3Prompt,

      // Batch processing: 3 sections per API call
      batchSize: 3,

      // Selective processing: Only sections that need lists/tables
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        const needsOptimization = new Set([
          ...budget.sectionsNeedingOptimization.lists,
          ...budget.sectionsNeedingOptimization.tables
        ]);
        return sections.filter(s => needsOptimization.has(s.section_key));
      },

      // Batch prompt with format budget context
      buildBatchPrompt: buildPass3BatchPrompt
    },
    onSectionProgress,
    shouldAbort
  );
}
