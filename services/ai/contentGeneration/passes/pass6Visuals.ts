// services/ai/contentGeneration/passes/pass6Visuals.ts
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
import { buildVisualSemanticsPrompt, buildVisualSemanticsBatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';
import { BriefChangeTracker } from '../briefChangeTracker';
import { ImageProcessingService } from '../../../imageProcessingService';

/**
 * Filter sections for visual semantics processing with format budget enforcement.
 *
 * Prioritization order:
 * 1. Brief-designated sections (from enhanced_visual_semantics)
 * 2. Sections with existing images (from Pass 1)
 * 3. Auto-justified additions via BriefChangeTracker evaluation
 *
 * Budget enforcement: tracks an `imagesAdded` counter and stops adding
 * sections once `budget.constraints.maxImageSections` is reached.
 * Brief-designated and existing-image sections are counted first (priority tier),
 * then auto-justified sections fill remaining budget capacity.
 */
export function filterVisualSections(
  sections: ContentGenerationSection[],
  budget: ContentFormatBudget,
  brief: ContentBrief,
  changeTracker?: BriefChangeTracker
): ContentGenerationSection[] {
  const maxImages = budget?.constraints?.maxImageSections ?? Infinity;

  // Build set of brief-designated image sections
  const briefImageSections = new Set<string>();
  if (brief.enhanced_visual_semantics?.section_images) {
    Object.keys(brief.enhanced_visual_semantics.section_images).forEach(key => {
      briefImageSections.add(key.toLowerCase());
      briefImageSections.add(key.toLowerCase().replace(/-/g, '_'));
      briefImageSections.add(key.toLowerCase().replace(/_/g, '-'));
    });
  }
  // Always include intro for hero image
  briefImageSections.add('intro');

  // Two-pass approach: priority sections first, then auto-justified
  const prioritySections: ContentGenerationSection[] = [];
  const autoJustifiedSections: ContentGenerationSection[] = [];
  let imagesAdded = 0;

  for (const s of sections) {
    const sectionKeyLower = s.section_key.toLowerCase();
    const sectionKeyNormalized = sectionKeyLower.replace(/-/g, '_');

    // 1. Brief-designated sections (priority tier)
    if (briefImageSections.has(sectionKeyLower) || briefImageSections.has(sectionKeyNormalized)) {
      prioritySections.push(s);
      imagesAdded++;
      continue;
    }

    // 2. Sections with existing images from Pass 1 (priority tier)
    const hasImage = (s.current_content || '').includes('[IMAGE:');
    if (hasImage) {
      prioritySections.push(s);
      imagesAdded++;
      continue;
    }

    // 3. Evaluate if adding an image is justified (auto-justified tier)
    const isFSTarget = brief.featured_snippet_target?.question?.toLowerCase().includes(
      s.section_heading?.toLowerCase().split(' ')[0] || ''
    ) || false;

    const evaluation = BriefChangeTracker.evaluateImageAddition(
      s.current_content || '',
      s.section_heading || '',
      false,
      isFSTarget
    );

    if (evaluation.justified) {
      if (changeTracker) {
        changeTracker.logImageAdded(
          6,
          s.section_key,
          `Auto-generated visual for ${s.section_heading}`,
          evaluation.criteria,
          evaluation.reason
        );
      }
      autoJustifiedSections.push(s);
      imagesAdded++;
    }
  }

  // Enforce budget cap: priority sections first, then fill with auto-justified
  const result: ContentGenerationSection[] = [];
  let budgetUsed = 0;

  // Add priority sections (brief-designated + existing images) first
  for (const s of prioritySections) {
    if (budgetUsed >= maxImages) break;
    result.push(s);
    budgetUsed++;
  }

  // Fill remaining budget with auto-justified sections
  for (const s of autoJustifiedSections) {
    if (budgetUsed >= maxImages) break;
    result.push(s);
    budgetUsed++;
  }

  return result;
}

/**
 * Pass 6: Visual Semantics
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing images
 * - Enforces maxImageSections budget cap to prevent over-saturation
 * - Ensures proper image placement (never between heading and first paragraph)
 * - Uses vocabulary-extending alt text
 * - Excludes intro/conclusion (handled in Pass 7)
 *
 * Batches sections to reduce API calls.
 */
export async function executePass6(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean,
  changeTracker?: BriefChangeTracker
): Promise<string> {
  return executeSectionPass(
    orchestrator,
    job,
    brief,
    businessInfo,
    {
      passNumber: 6,  // Pass 6: Visual Semantics
      passKey: 'pass_6_visuals',
      nextPassNumber: 7,  // Proceed to Pass 7 (Introduction Synthesis)
      promptBuilder: buildVisualSemanticsPrompt,

      // Batch processing: 5 sections per API call with proper batch prompt
      batchSize: 5,
      buildBatchPrompt: buildVisualSemanticsBatchPrompt,

      // Brief-led processing with budget enforcement
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        return filterVisualSections(sections, budget, brief, changeTracker);
      }
    },
    onSectionProgress,
    shouldAbort
  );
}

/**
 * Get hybrid category strategy for image recommendations.
 * Uses ImageProcessingService to determine optimal image category
 * based on content type and entity type.
 */
export function getImageCategoryRecommendation(contentType: string, entityType?: string) {
  return ImageProcessingService.getHybridCategoryStrategy(contentType, entityType);
}
