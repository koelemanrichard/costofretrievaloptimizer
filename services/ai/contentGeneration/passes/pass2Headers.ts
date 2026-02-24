// services/ai/contentGeneration/passes/pass2Headers.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, SectionProgressCallback } from '../../../../types';
import type { StructuralAnalysis } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { executeSectionPass } from './baseSectionPass';
import { buildPass2Prompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Build structural guidance from competitor analysis for heading optimization.
 */
export function buildStructuralGuidance(competitorStructural?: StructuralAnalysis[]): string {
  if (!competitorStructural?.length) return '';

  const avgH2 = Math.round(
    competitorStructural.reduce((s, a) => s + a.sections.length, 0) / competitorStructural.length
  );
  const avgHeadingMentionRate = Math.round(
    competitorStructural.reduce((s, a) => s + a.entityProminence.headingMentionRate, 0) /
    competitorStructural.length * 100
  );

  return `\nSTRUCTURAL BASELINE (from ${competitorStructural.length} competitor pages):\n` +
    `- Competitor pages average ${avgH2} H2 sections. Ensure comparable depth.\n` +
    `- Competitors mention the main entity in ${avgHeadingMentionRate}% of headings.\n`;
}

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
