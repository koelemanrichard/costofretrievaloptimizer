// services/ai/contentGeneration/passes/pass7Introduction.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, SectionProgressCallback, ContentGenerationSection, SectionOptimizationContext, HolisticSummaryContext } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { buildPass7Prompt, buildPass7ConclusionPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';
import { buildHolisticSummary, buildAdjacentContext } from '../holisticAnalyzer';
import { callProviderWithFallback } from '../providerUtils';
import { createLogger } from '../../../../utils/debugLogger';

const log = createLogger('Pass7');

/**
 * Pass 7: Introduction & Conclusion Synthesis
 *
 * Rewrites both introduction AND conclusion AFTER the full article exists.
 * Uses holistic context to:
 * - Synthesize intro with all H2/H3 topics in correct order with centerpiece annotation
 * - Synthesize conclusion with key takeaways and topic-specific heading
 *
 * Both sections get topic-specific headings (not generic "Introduction"/"Conclusion").
 */
export async function executePass7(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<string> {
  // Mark pass as in_progress
  // NOTE: This is now Pass 3 in the new 10-pass order (aliased via index.ts)
  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_3_intro: 'in_progress' }
  });

  // Get all sections
  const sections = await orchestrator.getSections(job.id);
  const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);

  if (sortedSections.length === 0) {
    log.warn(' No sections found for job', job.id);
    await orchestrator.updateJob(job.id, {
      passes_status: { ...job.passes_status, pass_3_intro: 'completed' },
      current_pass: 4  // Proceed to Pass 4 (Lists & Tables)
    });
    return '';
  }

  // Build holistic summary (once for both intro and conclusion)
  log.log(' Building holistic summary from', sortedSections.length, 'sections...');
  const holisticContext = buildHolisticSummary(sortedSections, brief, businessInfo);

  // Find intro and conclusion sections
  const introSection = sortedSections.find(s =>
    s.section_key === 'intro' ||
    s.section_heading?.toLowerCase().includes('introduction') ||
    s.section_heading?.toLowerCase().includes('introductie') ||
    s.section_heading?.toLowerCase().startsWith('wat is')
  );

  const conclusionSection = sortedSections.find(s =>
    s.section_key === 'conclusion' ||
    s.section_heading?.toLowerCase().includes('conclusion') ||
    s.section_heading?.toLowerCase().includes('conclusie') ||
    s.section_heading?.toLowerCase().includes('samenvatting')
  );

  let processedCount = 0;
  const totalToProcess = (introSection ? 1 : 0) + (conclusionSection ? 1 : 0);

  // Process Introduction
  if (introSection) {
    if (shouldAbort && shouldAbort()) {
      throw new Error('Pass aborted by user');
    }

    if (onSectionProgress) {
      onSectionProgress(introSection.section_key, ++processedCount, totalToProcess);
    }

    log.log(' Processing introduction section...');
    await processIntroOrConclusion(
      orchestrator,
      introSection,
      sortedSections,
      holisticContext,
      brief,
      businessInfo,
      'intro'
    );
  }

  // Process Conclusion
  if (conclusionSection) {
    if (shouldAbort && shouldAbort()) {
      throw new Error('Pass aborted by user');
    }

    if (onSectionProgress) {
      onSectionProgress(conclusionSection.section_key, ++processedCount, totalToProcess);
    }

    log.log(' Processing conclusion section...');
    await processIntroOrConclusion(
      orchestrator,
      conclusionSection,
      sortedSections,
      holisticContext,
      brief,
      businessInfo,
      'conclusion'
    );
  }

  // Assemble final draft
  const assembledDraft = await orchestrator.assembleDraft(job.id);
  log.log(' Pass complete. Assembled draft:', assembledDraft.length, 'chars');

  // Update job with assembled draft and mark pass complete
  await orchestrator.updateJob(job.id, {
    draft_content: assembledDraft,
    passes_status: { ...job.passes_status, pass_3_intro: 'completed' },
    current_pass: 4  // Proceed to Pass 4 (Lists & Tables)
  });

  return assembledDraft;
}

/**
 * Process either introduction or conclusion section
 */
async function processIntroOrConclusion(
  orchestrator: ContentGenerationOrchestrator,
  section: ContentGenerationSection,
  allSections: ContentGenerationSection[],
  holisticContext: HolisticSummaryContext,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  type: 'intro' | 'conclusion'
): Promise<void> {
  const adjacentContext = buildAdjacentContext(allSections, section);
  const ctx: SectionOptimizationContext = {
    section,
    holistic: holisticContext,
    adjacentContext,
    brief,
    businessInfo,
    passNumber: 3  // Now Pass 3 in new 10-pass order
  };

  try {
    // Use appropriate prompt builder
    const prompt = type === 'intro'
      ? buildPass7Prompt(ctx)
      : buildPass7ConclusionPrompt(ctx);

    const optimizedContent = await callProviderWithFallback(businessInfo, prompt, 2);

    if (typeof optimizedContent !== 'string' || !optimizedContent.trim()) {
      console.warn(`[Pass7] Empty response for ${type} section, keeping original`);
      return;
    }

    // Clean the content
    let content = optimizedContent.trim();

    // Remove markdown code block wrapper if present
    if (content.startsWith('```markdown')) {
      content = content.slice(11);
    } else if (content.startsWith('```')) {
      content = content.slice(3);
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    // Normalize whitespace
    content = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();

    // Update section
    await orchestrator.upsertSection({
      ...section,
      current_content: content,
      current_pass: 3,  // Now Pass 3 in new 10-pass order
      updated_at: new Date().toISOString()
    });

    console.log(`[Pass7] ${type} section optimized: ${section.current_content?.length || 0} → ${content.length} chars`);

  } catch (error) {
    console.error(`[Pass7] Error optimizing ${type} section:`, error);
  }
}
