// services/ai/contentGeneration/passes/baseSectionPass.ts
import {
  ContentGenerationJob,
  ContentBrief,
  BusinessInfo,
  SectionPassConfig,
  SectionOptimizationContext,
  HolisticSummaryContext,
  ContentGenerationSection,
  SectionProgressCallback,
  ContentFormatBudget
} from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { buildHolisticSummary, buildAdjacentContext } from '../holisticAnalyzer';
import { analyzeContentFormatBudget, formatBudgetSummary } from '../formatBudgetAnalyzer';
import { callProviderWithFallback } from '../providerUtils';

/**
 * Execute a content optimization pass with selective + batch processing.
 *
 * This is the core function for passes 2-7 that:
 * 1. Analyzes format budget to determine which sections need optimization
 * 2. Filters sections based on budget (selective processing)
 * 3. Batches sections to reduce API calls
 *
 * Three-phase processing:
 * - Phase A: Build holistic summary + format budget (once per pass)
 * - Phase B: Filter sections based on optimization needs
 * - Phase C: Process sections (batched or individual)
 */
export async function executeSectionPass(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  config: SectionPassConfig,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<string> {
  // Mark pass as in_progress
  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, [config.passKey]: 'in_progress' }
  });

  // Get all sections
  const sections = await orchestrator.getSections(job.id);
  const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);

  if (sortedSections.length === 0) {
    console.warn(`[Pass${config.passNumber}] No sections found for job ${job.id}`);
    await orchestrator.updateJob(job.id, {
      passes_status: { ...job.passes_status, [config.passKey]: 'completed' },
      current_pass: config.nextPassNumber
    });
    return '';
  }

  // Phase A: Build holistic summary + format budget (once per pass)
  console.log(`[Pass${config.passNumber}] Phase A: Building holistic summary + format budget from ${sortedSections.length} sections...`);
  const holisticContext = buildHolisticSummary(sortedSections, brief, businessInfo);
  const formatBudget = analyzeContentFormatBudget(sortedSections, brief, businessInfo);

  console.log(`[Pass${config.passNumber}] Holistic context: ${holisticContext.articleStructure.totalWordCount} words, TTR: ${(holisticContext.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}%`);
  console.log(`[Pass${config.passNumber}] ${formatBudgetSummary(formatBudget)}`);

  // Phase B: Determine which sections to process (selective)
  let sectionsToProcess: ContentGenerationSection[];

  if (config.introOnly) {
    // For Pass 7 - only process introduction
    sectionsToProcess = sortedSections.filter(s =>
      s.section_key === 'intro' ||
      s.section_heading?.toLowerCase().includes('introduction')
    );
  } else if (config.filterSections) {
    // NEW: Use format budget filtering for selective processing
    sectionsToProcess = config.filterSections(sortedSections, formatBudget);
    console.log(`[Pass${config.passNumber}] Selective processing: ${sectionsToProcess.length}/${sortedSections.length} sections need optimization`);
  } else if (config.sectionFilter) {
    // Legacy holistic-based filtering
    sectionsToProcess = sortedSections.filter(s => config.sectionFilter!(s, holisticContext));
  } else {
    sectionsToProcess = sortedSections;
  }

  const totalSections = sectionsToProcess.length;

  if (totalSections === 0) {
    console.log(`[Pass${config.passNumber}] No sections need optimization, skipping pass`);
    await orchestrator.updateJob(job.id, {
      passes_status: { ...job.passes_status, [config.passKey]: 'completed' },
      current_pass: config.nextPassNumber
    });
    return await orchestrator.assembleDraft(job.id);
  }

  console.log(`[Pass${config.passNumber}] Phase C: Processing ${totalSections} sections...`);

  // Phase C: Process sections (batched or individual)
  const batchSize = config.batchSize || 1;
  const useBatchProcessing = batchSize > 1 && config.buildBatchPrompt;

  if (useBatchProcessing) {
    // Batch processing mode
    await processSectionsBatched(
      orchestrator,
      sortedSections,
      sectionsToProcess,
      holisticContext,
      formatBudget,
      brief,
      businessInfo,
      config,
      onSectionProgress,
      shouldAbort
    );
  } else {
    // Individual section processing (original mode)
    await processSectionsIndividually(
      orchestrator,
      sortedSections,
      sectionsToProcess,
      holisticContext,
      brief,
      businessInfo,
      config,
      onSectionProgress,
      shouldAbort
    );
  }

  // Assemble final draft from all sections
  const assembledDraft = await orchestrator.assembleDraft(job.id);
  console.log(`[Pass${config.passNumber}] Pass complete. Assembled draft: ${assembledDraft.length} chars`);

  // Update job with assembled draft and mark pass complete
  await orchestrator.updateJob(job.id, {
    draft_content: assembledDraft,
    passes_status: { ...job.passes_status, [config.passKey]: 'completed' },
    current_pass: config.nextPassNumber
  });

  return assembledDraft;
}

/**
 * Process sections in batches for reduced API calls.
 */
async function processSectionsBatched(
  orchestrator: ContentGenerationOrchestrator,
  allSections: ContentGenerationSection[],
  sectionsToProcess: ContentGenerationSection[],
  holisticContext: HolisticSummaryContext,
  formatBudget: ContentFormatBudget,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  config: SectionPassConfig,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<void> {
  const batchSize = config.batchSize || 3;
  const batches = createBatches(sectionsToProcess, batchSize);

  console.log(`[Pass${config.passNumber}] Processing ${sectionsToProcess.length} sections in ${batches.length} batches (batch size: ${batchSize})`);

  let processedCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    if (shouldAbort && shouldAbort()) {
      console.log(`[Pass${config.passNumber}] Aborted at batch ${batchIndex + 1}/${batches.length}`);
      throw new Error('Pass aborted by user');
    }

    const batch = batches[batchIndex];
    console.log(`[Pass${config.passNumber}] Processing batch ${batchIndex + 1}/${batches.length}: ${batch.map(s => s.section_key).join(', ')}`);

    // Report progress
    if (onSectionProgress) {
      onSectionProgress(batch[0].section_key, processedCount + 1, sectionsToProcess.length);
    }

    try {
      // Build batch prompt
      const prompt = config.buildBatchPrompt!(batch, holisticContext, formatBudget, brief, businessInfo);

      // Call AI with batch prompt
      const response = await callProviderWithFallback(businessInfo, prompt, 2);

      // Parse batch response
      const parsedResults = parseBatchResponse(response, batch);

      // Update each section
      for (const [section, optimizedContent] of parsedResults) {
        if (optimizedContent && optimizedContent.trim()) {
          const originalContent = section.current_content || '';
          const cleanedContent = cleanOptimizedContent(optimizedContent, originalContent);

          await orchestrator.upsertSection({
            ...section,
            current_content: cleanedContent,
            current_pass: config.passNumber,
            updated_at: new Date().toISOString()
          });

          console.log(`[Pass${config.passNumber}] Section ${section.section_key}: ${originalContent.length} → ${cleanedContent.length} chars`);
        }
      }

      processedCount += batch.length;

    } catch (error) {
      console.error(`[Pass${config.passNumber}] Error processing batch ${batchIndex + 1}:`, error);
      // Continue with next batch
    }
  }
}

/**
 * Process sections individually (original behavior).
 */
async function processSectionsIndividually(
  orchestrator: ContentGenerationOrchestrator,
  allSections: ContentGenerationSection[],
  sectionsToProcess: ContentGenerationSection[],
  holisticContext: HolisticSummaryContext,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  config: SectionPassConfig,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<void> {
  const totalSections = sectionsToProcess.length;

  for (let i = 0; i < sectionsToProcess.length; i++) {
    if (shouldAbort && shouldAbort()) {
      console.log(`[Pass${config.passNumber}] Aborted at section ${i + 1}/${totalSections}`);
      throw new Error('Pass aborted by user');
    }

    const section = sectionsToProcess[i];
    const sectionContent = section.current_content || '';

    if (!sectionContent.trim()) {
      console.log(`[Pass${config.passNumber}] Skipping empty section: ${section.section_key}`);
      continue;
    }

    if (onSectionProgress) {
      onSectionProgress(section.section_key, i + 1, totalSections);
    }

    console.log(`[Pass${config.passNumber}] Processing section ${i + 1}/${totalSections}: ${section.section_heading} (${sectionContent.length} chars)`);

    const adjacentContext = buildAdjacentContext(allSections, section);
    const ctx: SectionOptimizationContext = {
      section,
      holistic: holisticContext,
      adjacentContext,
      brief,
      businessInfo,
      passNumber: config.passNumber
    };

    try {
      const prompt = config.promptBuilder(ctx);
      const optimizedContent = await callProviderWithFallback(businessInfo, prompt, 2);

      if (typeof optimizedContent !== 'string' || !optimizedContent.trim()) {
        console.warn(`[Pass${config.passNumber}] Empty response for section ${section.section_key}, keeping original`);
        continue;
      }

      if (optimizedContent.length < sectionContent.length * 0.5) {
        console.warn(`[Pass${config.passNumber}] Warning: Section ${section.section_key} optimized content is ${Math.round((optimizedContent.length / sectionContent.length) * 100)}% of original`);
      }

      const cleanedContent = cleanOptimizedContent(optimizedContent, sectionContent);

      await orchestrator.upsertSection({
        ...section,
        current_content: cleanedContent,
        current_pass: config.passNumber,
        updated_at: new Date().toISOString()
      });

      console.log(`[Pass${config.passNumber}] Section ${section.section_key} optimized: ${sectionContent.length} → ${cleanedContent.length} chars`);

    } catch (error) {
      console.error(`[Pass${config.passNumber}] Error optimizing section ${section.section_key}:`, error);
    }
  }
}

/**
 * Split sections into batches.
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Parse AI response containing multiple section optimizations.
 *
 * Expected format:
 * [SECTION: section-key-1]
 * content...
 * [SECTION: section-key-2]
 * content...
 */
function parseBatchResponse(
  response: string,
  batch: ContentGenerationSection[]
): Map<ContentGenerationSection, string> {
  const results = new Map<ContentGenerationSection, string>();

  // Try to parse structured response with section markers
  const sectionPattern = /\[SECTION:\s*([^\]]+)\]\s*([\s\S]*?)(?=\[SECTION:|$)/gi;
  const matches = [...response.matchAll(sectionPattern)];

  if (matches.length > 0) {
    // Structured response found
    for (const match of matches) {
      const sectionKey = match[1].trim();
      const content = match[2].trim();

      const section = batch.find(s => s.section_key === sectionKey);
      if (section && content) {
        results.set(section, content);
      }
    }
  } else {
    // Fallback: If only one section in batch, use entire response
    if (batch.length === 1) {
      results.set(batch[0], response.trim());
    } else {
      // Multiple sections but no markers - try splitting by heading
      console.warn('[parseBatchResponse] No section markers found in batch response, attempting heading-based split');
      const headingSplit = response.split(/(?=^##+ )/m);

      for (let i = 0; i < Math.min(headingSplit.length, batch.length); i++) {
        if (headingSplit[i].trim()) {
          results.set(batch[i], headingSplit[i].trim());
        }
      }
    }
  }

  return results;
}

/**
 * Clean optimized content from AI response.
 * Handles common issues like:
 * - Markdown code blocks wrapping
 * - Extra whitespace
 * - Section heading duplication
 */
function cleanOptimizedContent(optimized: string, original: string): string {
  let content = optimized.trim();

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

  // If AI returned just a heading with no content, keep original
  if (content.match(/^##+ [^\n]+$/)) {
    console.warn('[cleanOptimizedContent] AI returned only a heading, keeping original');
    return original;
  }

  // Normalize whitespace
  content = content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

  return content;
}

/**
 * Extract only the section content from AI response.
 * Sometimes AI includes extra explanations - this strips them.
 */
export function extractSectionContent(response: string): string {
  // Look for common AI explanation patterns and remove them
  const explanationPatterns = [
    /^(?:Here's|Here is|I've|I have|The optimized|Below is)[^:]*:\s*/i,
    /^(?:Optimized|Updated|Revised) (?:version|content|section)[^:]*:\s*/i
  ];

  let content = response;
  for (const pattern of explanationPatterns) {
    content = content.replace(pattern, '');
  }

  // If there's a clear demarcation (like "---"), take only the content part
  if (content.includes('\n---\n')) {
    const parts = content.split('\n---\n');
    // Usually the actual content is the last substantial part
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].trim().length > 100) {
        return parts[i].trim();
      }
    }
  }

  return content.trim();
}
