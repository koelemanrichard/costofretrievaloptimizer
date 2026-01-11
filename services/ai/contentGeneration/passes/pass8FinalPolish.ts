// services/ai/contentGeneration/passes/pass8FinalPolish.ts
import {
  ContentBrief,
  ContentGenerationJob,
  BusinessInfo,
  SectionProgressCallback
} from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { executeSectionPass } from './baseSectionPass';
import { buildPass8Prompt, buildPass8BatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 8: Final Polish (Section-by-Section)
 *
 * This pass performs publication-ready polishing of each section individually,
 * ensuring structural elements (lists, tables, images) from earlier passes
 * are preserved.
 *
 * CRITICAL CHANGE: Previously processed entire article at once, which allowed
 * AI to remove lists/tables/images added in earlier passes. Now uses
 * section-by-section processing like passes 2-7.
 *
 * Key responsibilities:
 * 1. Smooth transitions between paragraphs
 * 2. Consistent tone and voice throughout
 * 3. Remove redundancy and filler words
 * 4. Strengthen weak sentences
 * 5. Ensure publication readiness
 *
 * PRESERVATION: Lists, tables, images, headings MUST be preserved.
 * The prompt explicitly counts these elements and requires exact preservation.
 */
export async function executePass8(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<string> {
  console.log('[Pass 8] Starting Final Polish pass (section-by-section)');

  return executeSectionPass(
    orchestrator,
    job,
    brief,
    businessInfo,
    {
      passNumber: 8,
      passKey: 'pass_8_polish',
      nextPassNumber: 9,  // Proceed to Pass 9 (Audit)
      promptBuilder: buildPass8Prompt,

      // Batch processing: 3 sections per API call for efficiency
      batchSize: 3,

      // Process ALL sections (no filtering - this is final polish)
      // Note: Pass 8 is NOT in PASSES_EXCLUDE_INTRO_CONCLUSION,
      // so intro/conclusion sections WILL be processed
      filterSections: undefined,

      // Batch prompt with structural element tracking
      buildBatchPrompt: buildPass8BatchPrompt
    },
    onSectionProgress,
    shouldAbort
  );
}
