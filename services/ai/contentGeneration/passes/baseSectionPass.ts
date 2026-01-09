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
  ContentFormatBudget,
  PASSES_EXCLUDE_INTRO_CONCLUSION
} from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { buildHolisticSummary, buildAdjacentContext } from '../holisticAnalyzer';
import { analyzeContentFormatBudget, formatBudgetSummary } from '../formatBudgetAnalyzer';
import { callProviderWithFallback } from '../providerUtils';
import { createLogger } from '../../../../utils/debugLogger';

// Create namespaced logger - will respect verbose logging setting
const createPassLogger = (passNumber: number) => createLogger(`Pass${passNumber}`);

// Checkpoint interval - save progress after every N sections
const CHECKPOINT_INTERVAL = 3;

/**
 * Check if a section should be processed based on pass number.
 * Intro/conclusion sections are excluded from certain passes to prevent
 * wasted work (they get rewritten in Pass 3: Introduction Synthesis).
 */
function shouldProcessSection(section: ContentGenerationSection, passNumber: number): boolean {
  if (!PASSES_EXCLUDE_INTRO_CONCLUSION.includes(passNumber)) {
    return true; // This pass processes all sections
  }

  // Check if section is intro or conclusion
  const key = section.section_key?.toLowerCase() || '';
  const heading = section.section_heading?.toLowerCase() || '';

  const isIntro = key.includes('intro') || heading.includes('introduction') || heading.includes('inleiding');
  const isConclusion = key.includes('conclusion') || heading.includes('conclusion') || heading.includes('conclusie');

  if (isIntro || isConclusion) {
    return false; // Skip intro/conclusion for these passes
  }

  return true;
}

/**
 * Save per-pass content version for rollback capability.
 */
async function savePassVersion(
  orchestrator: ContentGenerationOrchestrator,
  section: ContentGenerationSection,
  passNumber: number
): Promise<void> {
  try {
    const passContents = section.pass_contents || {};
    passContents[`pass_${passNumber}`] = section.current_content || '';

    await orchestrator.upsertSection({
      ...section,
      pass_contents: passContents
    });
  } catch (error) {
    console.warn(`[Pass ${passNumber}] Failed to save pass version for section ${section.section_key}:`, error);
    // Don't fail the pass if versioning fails
  }
}

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

  // Create logger for this pass
  const log = createPassLogger(config.passNumber);

  if (sortedSections.length === 0) {
    log.warn(`No sections found for job ${job.id}`);
    await orchestrator.updateJob(job.id, {
      passes_status: { ...job.passes_status, [config.passKey]: 'completed' },
      current_pass: config.nextPassNumber
    });
    return '';
  }

  // Phase A: Build holistic summary + format budget (once per pass)
  log.log(`Phase A: Building holistic summary + format budget from ${sortedSections.length} sections...`);
  const holisticContext = buildHolisticSummary(sortedSections, brief, businessInfo);
  const formatBudget = analyzeContentFormatBudget(sortedSections, brief, businessInfo);

  log.log(`Holistic context: ${holisticContext.articleStructure.totalWordCount} words, TTR: ${(holisticContext.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}%`);
  log.log(formatBudgetSummary(formatBudget));

  // Phase B: Determine which sections to process (selective)
  let sectionsToProcess: ContentGenerationSection[];

  // First, apply intro/conclusion filtering based on pass number
  // Passes 2, 4, 5, 6 exclude intro/conclusion (they're handled in Pass 3)
  const passFilteredSections = sortedSections.filter(s => shouldProcessSection(s, config.passNumber));

  if (passFilteredSections.length < sortedSections.length) {
    log.log(`Pass ${config.passNumber}: Excluded ${sortedSections.length - passFilteredSections.length} intro/conclusion section(s)`);
  }

  if (config.introOnly) {
    // For Pass 3 (Introduction Synthesis) - only process introduction
    sectionsToProcess = sortedSections.filter(s =>
      s.section_key === 'intro' ||
      s.section_heading?.toLowerCase().includes('introduction') ||
      s.section_heading?.toLowerCase().includes('inleiding')
    );
  } else if (config.filterSections) {
    // Use format budget filtering for selective processing
    sectionsToProcess = config.filterSections(passFilteredSections, formatBudget);
    log.log(`Selective processing: ${sectionsToProcess.length}/${passFilteredSections.length} sections need optimization`);
  } else if (config.sectionFilter) {
    // Legacy holistic-based filtering
    sectionsToProcess = passFilteredSections.filter(s => config.sectionFilter!(s, holisticContext));
  } else {
    sectionsToProcess = passFilteredSections;
  }

  const totalSections = sectionsToProcess.length;

  if (totalSections === 0) {
    log.log(`No sections need optimization, skipping pass`);
    await orchestrator.updateJob(job.id, {
      passes_status: { ...job.passes_status, [config.passKey]: 'completed' },
      current_pass: config.nextPassNumber
    });
    return await orchestrator.assembleDraft(job.id);
  }

  log.log(`Phase C: Processing ${totalSections} sections...`);

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
  log.log(`Pass complete. Assembled draft: ${assembledDraft.length} chars`);

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
 * Includes checkpoint saves after each batch to ensure progress is preserved.
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
  const log = createPassLogger(config.passNumber);
  const batchSize = config.batchSize || 3;
  const batches = createBatches(sectionsToProcess, batchSize);

  log.log(`Processing ${sectionsToProcess.length} sections in ${batches.length} batches (batch size: ${batchSize})`);

  let processedCount = 0;
  const jobId = sectionsToProcess[0]?.job_id;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    if (shouldAbort && shouldAbort()) {
      log.log(`Aborted at batch ${batchIndex + 1}/${batches.length}`);
      throw new Error('Pass aborted by user');
    }

    const batch = batches[batchIndex];
    log.log(`Processing batch ${batchIndex + 1}/${batches.length}: ${batch.map(s => s.section_key).join(', ')}`);

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
          const cleanedContent = cleanOptimizedContent(optimizedContent, originalContent, section.section_key, config.passNumber);

          const updatedSection: ContentGenerationSection = {
            ...section,
            current_content: cleanedContent,
            current_pass: config.passNumber,
            updated_at: new Date().toISOString()
          };

          await orchestrator.upsertSection(updatedSection);

          // Save per-pass version for rollback capability
          await savePassVersion(orchestrator, updatedSection, config.passNumber);

          log.log(`Section ${section.section_key}: ${originalContent.length} → ${cleanedContent.length} chars`);
        }
      }

      processedCount += batch.length;

      // Checkpoint: Save progress after each batch
      if (jobId) {
        log.log(`Checkpoint: Saving progress after batch ${batchIndex + 1}/${batches.length} (${processedCount}/${sectionsToProcess.length} sections)`);
        const partialDraft = await orchestrator.assembleDraft(jobId);
        await orchestrator.updateJob(jobId, {
          draft_content: partialDraft,
          completed_sections: processedCount,
          updated_at: new Date().toISOString()
        });
      }

    } catch (error) {
      log.error(`Error processing batch ${batchIndex + 1}:`, error);
      // Continue with next batch - don't fail entire pass for one batch
    }
  }
}

/**
 * Process sections individually (original behavior).
 * Includes checkpoint saves after every CHECKPOINT_INTERVAL sections to ensure
 * progress is preserved and resumable.
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
  const log = createPassLogger(config.passNumber);
  const totalSections = sectionsToProcess.length;
  let processedCount = 0;

  for (let i = 0; i < sectionsToProcess.length; i++) {
    if (shouldAbort && shouldAbort()) {
      log.log(`Aborted at section ${i + 1}/${totalSections}`);
      throw new Error('Pass aborted by user');
    }

    const section = sectionsToProcess[i];
    const sectionContent = section.current_content || '';

    if (!sectionContent.trim()) {
      log.log(`Skipping empty section: ${section.section_key}`);
      continue;
    }

    if (onSectionProgress) {
      onSectionProgress(section.section_key, i + 1, totalSections);
    }

    log.log(`Processing section ${i + 1}/${totalSections}: ${section.section_heading} (${sectionContent.length} chars)`);

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
        log.warn(`Empty response for section ${section.section_key}, keeping original`);
        continue;
      }

      if (optimizedContent.length < sectionContent.length * 0.5) {
        log.warn(`Warning: Section ${section.section_key} optimized content is ${Math.round((optimizedContent.length / sectionContent.length) * 100)}% of original`);
      }

      const cleanedContent = cleanOptimizedContent(optimizedContent, sectionContent, section.section_key, config.passNumber);

      // Update section with optimized content
      const updatedSection: ContentGenerationSection = {
        ...section,
        current_content: cleanedContent,
        current_pass: config.passNumber,
        updated_at: new Date().toISOString()
      };

      await orchestrator.upsertSection(updatedSection);

      // Save per-pass version for rollback capability
      await savePassVersion(orchestrator, updatedSection, config.passNumber);

      processedCount++;
      log.log(`Section ${section.section_key} optimized: ${sectionContent.length} → ${cleanedContent.length} chars`);

      // Checkpoint: Save progress every CHECKPOINT_INTERVAL sections
      if (processedCount % CHECKPOINT_INTERVAL === 0) {
        log.log(`Checkpoint: Saving progress after ${processedCount}/${totalSections} sections`);
        // Assemble and save partial draft to ensure progress is preserved
        const partialDraft = await orchestrator.assembleDraft(section.job_id);
        await orchestrator.updateJob(section.job_id, {
          draft_content: partialDraft,
          completed_sections: processedCount,
          updated_at: new Date().toISOString()
        });
      }

    } catch (error) {
      log.error(`Error optimizing section ${section.section_key}:`, error);
      // Continue to next section - don't fail entire pass for one section
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
 * Count image placeholders in content.
 * Matches pattern: [IMAGE: description | alt text]
 */
function countImagePlaceholders(content: string): number {
  const matches = content.match(/\[IMAGE:[^\]]+\]/g);
  return matches ? matches.length : 0;
}

/**
 * Validate that image placeholders are preserved after optimization.
 * Logs a warning if images were lost but doesn't block the process.
 */
function validateImagePreservation(
  before: string,
  after: string,
  sectionKey: string,
  passNumber: number
): boolean {
  const countBefore = countImagePlaceholders(before);
  const countAfter = countImagePlaceholders(after);

  if (countBefore > 0 && countAfter < countBefore) {
    console.warn(`[Pass ${passNumber}] Image count DECREASED in section ${sectionKey}: ${countBefore} → ${countAfter}`);
    return false;
  }

  return true;
}

/**
 * Clean optimized content from AI response.
 * Handles common issues like:
 * - Markdown code blocks wrapping
 * - Extra whitespace
 * - Section heading duplication
 * - Image placeholder preservation validation
 */
function cleanOptimizedContent(optimized: string, original: string, sectionKey?: string, passNumber?: number): string {
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

  // Validate image preservation
  if (sectionKey && passNumber) {
    validateImagePreservation(original, content, sectionKey, passNumber);
  }

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
