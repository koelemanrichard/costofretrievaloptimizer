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
 * Intro/conclusion sections are excluded from passes 2-6 (body polish)
 * because they get rewritten in Pass 7: Introduction Synthesis.
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
  // Always log pass start (visible in console regardless of verbose mode)
  console.log(`[Pass ${config.passNumber}] STARTING - passKey: ${config.passKey}, nextPass: ${config.nextPassNumber}`);

  // Mark pass as in_progress
  console.log(`[Pass ${config.passNumber}] Updating job status to in_progress...`);
  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, [config.passKey]: 'in_progress' }
  });
  console.log(`[Pass ${config.passNumber}] Job status updated successfully`);

  // Get all sections
  console.log(`[Pass ${config.passNumber}] Fetching sections...`);
  const sections = await orchestrator.getSections(job.id);
  console.log(`[Pass ${config.passNumber}] Fetched ${sections.length} sections`);
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
  console.log(`[Pass ${config.passNumber}] Phase A: Building holistic summary from ${sortedSections.length} sections...`);
  log.log(`Phase A: Building holistic summary + format budget from ${sortedSections.length} sections...`);
  const holisticContext = buildHolisticSummary(sortedSections, brief, businessInfo);
  console.log(`[Pass ${config.passNumber}] Holistic summary complete, analyzing format budget...`);
  const formatBudget = analyzeContentFormatBudget(sortedSections, brief, businessInfo);
  console.log(`[Pass ${config.passNumber}] Format budget analysis complete`);

  log.log(`Holistic context: ${holisticContext.articleStructure.totalWordCount} words, TTR: ${(holisticContext.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}%`);
  log.log(formatBudgetSummary(formatBudget));

  // Phase B: Determine which sections to process (selective)
  console.log(`[Pass ${config.passNumber}] Phase B: Filtering sections for processing...`);
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
    console.log(`[Pass ${config.passNumber}] Intro-only mode: ${sectionsToProcess.length} sections to process`);
  } else if (config.filterSections) {
    // Use format budget filtering for selective processing
    console.log(`[Pass ${config.passNumber}] Running custom section filter...`);
    sectionsToProcess = config.filterSections(passFilteredSections, formatBudget);
    console.log(`[Pass ${config.passNumber}] Custom filter complete: ${sectionsToProcess.length}/${passFilteredSections.length} sections need optimization`);
    log.log(`Selective processing: ${sectionsToProcess.length}/${passFilteredSections.length} sections need optimization`);
  } else if (config.sectionFilter) {
    // Legacy holistic-based filtering
    console.log(`[Pass ${config.passNumber}] Running legacy section filter...`);
    sectionsToProcess = passFilteredSections.filter(s => config.sectionFilter!(s, holisticContext));
    console.log(`[Pass ${config.passNumber}] Legacy filter complete: ${sectionsToProcess.length} sections`);
  } else {
    sectionsToProcess = passFilteredSections;
    console.log(`[Pass ${config.passNumber}] No filter applied: ${sectionsToProcess.length} sections`);
  }

  const totalSections = sectionsToProcess.length;

  if (totalSections === 0) {
    console.log(`[Pass ${config.passNumber}] SKIPPED - No sections need optimization for ${config.passKey}`);
    log.log(`No sections need optimization, skipping pass`);
    await orchestrator.updateJob(job.id, {
      passes_status: { ...job.passes_status, [config.passKey]: 'completed' },
      current_pass: config.nextPassNumber
    });
    return await orchestrator.assembleDraft(job.id);
  }

  console.log(`[Pass ${config.passNumber}] Phase C: Processing ${totalSections} sections...`);
  log.log(`Phase C: Processing ${totalSections} sections...`);

  // Phase C: Process sections (batched or individual)
  const batchSize = config.batchSize || 1;
  const useBatchProcessing = batchSize > 1 && config.buildBatchPrompt;
  console.log(`[Pass ${config.passNumber}] Processing mode: ${useBatchProcessing ? `batched (size ${batchSize})` : 'individual'}`);

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
      formatBudget,
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
  console.log(`[Pass ${config.passNumber}] COMPLETED - ${config.passKey} → advancing to pass ${config.nextPassNumber}`);
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
      console.log(`[Pass ${config.passNumber}] Building batch prompt for batch ${batchIndex + 1}...`);
      const prompt = config.buildBatchPrompt!(batch, holisticContext, formatBudget, brief, businessInfo);

      // Call AI with batch prompt
      console.log(`[Pass ${config.passNumber}] Calling AI provider for batch ${batchIndex + 1}...`);
      const startTime = Date.now();
      const response = await callProviderWithFallback(businessInfo, prompt, 2);
      console.log(`[Pass ${config.passNumber}] AI response received for batch ${batchIndex + 1} (${Date.now() - startTime}ms)`);

      // Parse batch response
      const parsedResults = parseBatchResponse(response, batch);

      // Check if batch parsing failed (returned empty map for multi-section batch)
      if (parsedResults.size === 0 && batch.length > 1) {
        log.warn(`Batch parsing failed for ${batch.length} sections - falling back to individual processing`);

        // Fall back to individual processing for this batch
        for (const section of batch) {
          if (shouldAbort && shouldAbort()) {
            throw new Error('Pass aborted by user');
          }

          try {
            const adjacentContext = buildAdjacentContext(allSections, section);
            const ctx: SectionOptimizationContext = {
              section,
              holistic: holisticContext,
              adjacentContext,
              brief,
              businessInfo,
              passNumber: config.passNumber,
              allSections  // For deduplication checks in Pass 4 (Visual Semantics)
            };

            const individualPrompt = config.promptBuilder(ctx);
            const individualResponse = await callProviderWithFallback(businessInfo, individualPrompt, 2);

            if (typeof individualResponse === 'string' && individualResponse.trim()) {
              const originalContent = section.current_content || '';
              const cleanedContent = cleanOptimizedContent(individualResponse, originalContent, section.section_key, config.passNumber, formatBudget);

              const updatedSection: ContentGenerationSection = {
                ...section,
                current_content: cleanedContent,
                current_pass: config.passNumber,
                updated_at: new Date().toISOString()
              };

              await orchestrator.upsertSection(updatedSection);
              await savePassVersion(orchestrator, updatedSection, config.passNumber);
              log.log(`Section ${section.section_key} (individual fallback): ${originalContent.length} → ${cleanedContent.length} chars`);
            }
          } catch (individualError) {
            log.error(`Error processing section ${section.section_key} individually:`, individualError);
          }
        }
      } else {
        // Batch parsing succeeded - update each section
        for (const [section, optimizedContent] of parsedResults) {
          if (optimizedContent && optimizedContent.trim()) {
            const originalContent = section.current_content || '';
            // Pass format budget for smart preservation decisions
            const cleanedContent = cleanOptimizedContent(optimizedContent, originalContent, section.section_key, config.passNumber, formatBudget);

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
  formatBudget: ContentFormatBudget,
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
      passNumber: config.passNumber,
      allSections  // For deduplication checks in Pass 4 (Visual Semantics)
    };

    try {
      const prompt = config.promptBuilder(ctx);
      console.log(`[Pass ${config.passNumber}] Calling AI for section ${section.section_key}...`);
      const startTime = Date.now();
      const optimizedContent = await callProviderWithFallback(businessInfo, prompt, 2);
      console.log(`[Pass ${config.passNumber}] AI response for ${section.section_key} (${Date.now() - startTime}ms)`);

      if (typeof optimizedContent !== 'string' || !optimizedContent.trim()) {
        log.warn(`Empty response for section ${section.section_key}, keeping original`);
        continue;
      }

      if (optimizedContent.length < sectionContent.length * 0.5) {
        log.warn(`Warning: Section ${section.section_key} optimized content is ${Math.round((optimizedContent.length / sectionContent.length) * 100)}% of original`);
      }

      // Pass format budget for smart preservation decisions
      const cleanedContent = cleanOptimizedContent(optimizedContent, sectionContent, section.section_key, config.passNumber, formatBudget);

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
 *
 * IMPORTANT: This parser requires explicit section markers to prevent content duplication.
 * If markers are missing for multi-section batches, it returns an empty map which signals
 * to the caller that individual processing should be used instead.
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
    // Structured response found - parse each section
    for (const match of matches) {
      const sectionKey = match[1].trim();
      const content = match[2].trim();

      const section = batch.find(s => s.section_key === sectionKey);
      if (section && content) {
        // Check for duplicate content assignment (critical for preventing duplication bug)
        const existingContent = [...results.values()];
        const isDuplicate = existingContent.some(existing =>
          existing.length > 200 && content.length > 200 &&
          existing.substring(0, 200) === content.substring(0, 200)
        );

        if (isDuplicate) {
          console.error(`[parseBatchResponse] DUPLICATE CONTENT DETECTED for section ${sectionKey} - skipping to prevent duplication`);
          continue;
        }

        results.set(section, content);
      } else if (!section) {
        console.warn(`[parseBatchResponse] Unknown section key in response: ${sectionKey}`);
      }
    }

    // Validate that we got all expected sections
    if (results.size < batch.length) {
      const missingKeys = batch
        .filter(s => !results.has(s))
        .map(s => s.section_key);
      console.warn(`[parseBatchResponse] Missing ${missingKeys.length} sections in response: ${missingKeys.join(', ')}`);
    }
  } else {
    // No section markers found
    if (batch.length === 1) {
      // Single section batch - safe to use entire response
      results.set(batch[0], response.trim());
    } else {
      // CRITICAL: Multiple sections without markers - DO NOT use heading-based split
      // This was causing the duplication bug where the same content got assigned to multiple sections
      console.error(`[parseBatchResponse] CRITICAL: No section markers found for batch of ${batch.length} sections. ` +
        `This would cause content duplication. Returning empty map - sections will need individual processing.`);
      // Return empty map - caller should handle this by falling back to individual processing
      // DO NOT attempt heading-based split as it causes content duplication
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
 * Count list blocks in content (both Markdown and HTML).
 *
 * Counts both unordered lists (- or *) and ordered lists (1. 2. 3.).
 * A list block is a group of consecutive list items.
 */
function countLists(content: string): number {
  // Split content into lines for analysis
  const lines = content.split('\n');
  let listCount = 0;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Check if line is a list item (unordered: - or *, ordered: 1. 2. etc.)
    const isListItem = /^[-*]\s+.+/.test(line) || /^\d+\.\s+.+/.test(line);

    if (isListItem && !inList) {
      // Starting a new list block
      listCount++;
      inList = true;
    } else if (!isListItem && line.length > 0) {
      // Non-empty, non-list line ends the list block
      inList = false;
    }
    // Empty lines don't end list blocks (allows spacing between items)
  }

  // Also count HTML lists
  const htmlLists = (content.match(/<[ou]l[^>]*>/gi) || []).length;

  return listCount + htmlLists;
}

/**
 * Count tables in content (both Markdown and HTML).
 *
 * A markdown table is identified by its separator line which contains
 * only pipes, dashes, colons, and spaces (e.g., |---|---|---|).
 * We count separator lines (one per table), not individual cells.
 */
function countTables(content: string): number {
  // Markdown tables: count separator lines (lines with |---| pattern that
  // consist only of |, -, :, and spaces - one separator line per table)
  // Match lines like: |---|---| or | --- | :--: | --: |
  const separatorLinePattern = /^[\s]*\|[\s\-:|]+\|[\s]*$/gm;
  const markdownTables = (content.match(separatorLinePattern) || []).length;

  // HTML tables
  const htmlTables = (content.match(/<table[^>]*>/gi) || []).length;

  return markdownTables + htmlTables;
}

/**
 * Count all structural elements in content.
 */
interface StructuralElementCounts {
  images: number;
  lists: number;
  tables: number;
  headings: number;
  wordCount: number;
}

function countStructuralElements(content: string): StructuralElementCounts {
  return {
    images: countImagePlaceholders(content),
    lists: countLists(content),
    tables: countTables(content),
    headings: countHeadings(content).total,
    wordCount: content.split(/\s+/).filter(w => w.length > 0).length
  };
}

/**
 * Smart preservation decision based on format budget.
 * Returns 'block' if element should be preserved, 'allow' if reduction is OK.
 */
type PreservationDecision = 'block' | 'allow';

interface SmartPreservationContext {
  budget?: ContentFormatBudget;
  passNumber: number;
}

function shouldPreserveElement(
  elementType: 'image' | 'list' | 'table',
  beforeCount: number,
  afterCount: number,
  context: SmartPreservationContext
): PreservationDecision {
  const { budget, passNumber } = context;

  // If no budget info, default to blocking reduction (safe default)
  if (!budget) {
    return afterCount < beforeCount ? 'block' : 'allow';
  }

  // Images: always preserve (no over-saturation concept)
  if (elementType === 'image') {
    return afterCount < beforeCount ? 'block' : 'allow';
  }

  // Lists: check against budget constraints
  if (elementType === 'list') {
    const maxLists = budget.constraints.maxListSections;
    const minLists = Math.floor(maxLists * 0.3); // 30% of max = minimum threshold
    const currentLists = budget.currentStats.sectionsWithLists;

    // If we're ABOVE max budget and reduction keeps us above minimum, allow
    if (currentLists > maxLists && afterCount >= 0) {
      return 'allow';
    }
    // If we're at or below max budget, preserve
    if (beforeCount > 0 && afterCount < beforeCount) {
      return 'block';
    }
  }

  // Tables: check against budget constraints
  if (elementType === 'table') {
    const maxTables = budget.constraints.maxTableSections;
    const minTables = Math.floor(maxTables * 0.3);
    const currentTables = budget.currentStats.sectionsWithTables;

    // If we're ABOVE max budget and reduction keeps us above minimum, allow
    if (currentTables > maxTables && afterCount >= 0) {
      return 'allow';
    }
    // If we're at or below max budget, preserve
    if (beforeCount > 0 && afterCount < beforeCount) {
      return 'block';
    }
  }

  return 'allow';
}

/**
 * Smart preservation validation result.
 */
interface SmartPreservationResult {
  shouldKeepOriginal: boolean;
  blockedElements: string[];
  decisions: Record<string, PreservationDecision>;
}

/**
 * Perform smart preservation validation using format budget.
 * Returns whether to keep original content and which elements were blocked.
 */
function validateSmartPreservation(
  original: string,
  optimized: string,
  sectionKey: string,
  passNumber: number,
  budget?: ContentFormatBudget
): SmartPreservationResult {
  const log = createPassLogger(passNumber);

  const beforeCounts = countStructuralElements(original);
  const afterCounts = countStructuralElements(optimized);

  const context: SmartPreservationContext = { budget, passNumber };

  const decisions = {
    images: shouldPreserveElement('image', beforeCounts.images, afterCounts.images, context),
    lists: shouldPreserveElement('list', beforeCounts.lists, afterCounts.lists, context),
    tables: shouldPreserveElement('table', beforeCounts.tables, afterCounts.tables, context),
  };

  const blockedElements: string[] = [];

  // Check each element type
  if (decisions.images === 'block' && afterCounts.images < beforeCounts.images) {
    blockedElements.push(`images (${beforeCounts.images} → ${afterCounts.images})`);
    log.warn(`[${sectionKey}] BLOCKED: Image loss detected (${beforeCounts.images} → ${afterCounts.images})`);
  }

  if (decisions.lists === 'block' && afterCounts.lists < beforeCounts.lists) {
    blockedElements.push(`lists (${beforeCounts.lists} → ${afterCounts.lists})`);
    log.warn(`[${sectionKey}] BLOCKED: List loss detected (${beforeCounts.lists} → ${afterCounts.lists})`);
  }

  if (decisions.tables === 'block' && afterCounts.tables < beforeCounts.tables) {
    blockedElements.push(`tables (${beforeCounts.tables} → ${afterCounts.tables})`);
    log.warn(`[${sectionKey}] BLOCKED: Table loss detected (${beforeCounts.tables} → ${afterCounts.tables})`);
  }

  // Also check for severe content reduction (>50%)
  const lengthRatio = optimized.length / Math.max(original.length, 1);
  if (lengthRatio < 0.5 && original.length > 200) {
    blockedElements.push(`content (${Math.round(lengthRatio * 100)}% of original)`);
    log.warn(`[${sectionKey}] BLOCKED: Severe content reduction (${Math.round(lengthRatio * 100)}% of original)`);
  }

  const shouldKeepOriginal = blockedElements.length > 0;

  if (shouldKeepOriginal) {
    log.error(`[${sectionKey}] Smart preservation BLOCKED changes: ${blockedElements.join(', ')}. Keeping original content.`);
  }

  return {
    shouldKeepOriginal,
    blockedElements,
    decisions
  };
}

/**
 * Count heading levels in content.
 */
function countHeadings(content: string): { h2: number; h3: number; total: number } {
  const h2Matches = content.match(/^##\s+[^\n]+/gm);
  const h3Matches = content.match(/^###\s+[^\n]+/gm);
  return {
    h2: h2Matches ? h2Matches.length : 0,
    h3: h3Matches ? h3Matches.length : 0,
    total: (h2Matches?.length || 0) + (h3Matches?.length || 0)
  };
}

/**
 * Post-pass validation result.
 */
interface PreservationValidationResult {
  passed: boolean;
  violations: string[];
  imagesBefore: number;
  imagesAfter: number;
  headingsBefore: number;
  headingsAfter: number;
}

/**
 * Comprehensive post-pass validation to prevent cascade destruction.
 * Validates:
 * - Image placeholder preservation (after Pass 7)
 * - Heading structure preservation (after Pass 2)
 * - Content not significantly shortened
 */
function validatePreservation(
  before: string,
  after: string,
  sectionKey: string,
  passNumber: number
): PreservationValidationResult {
  const violations: string[] = [];
  const log = createPassLogger(passNumber);

  // Image preservation check (critical after Pass 7 when images are added)
  const imagesBefore = countImagePlaceholders(before);
  const imagesAfter = countImagePlaceholders(after);

  if (imagesBefore > 0 && imagesAfter < imagesBefore) {
    const msg = `Image count DECREASED: ${imagesBefore} → ${imagesAfter}`;
    violations.push(msg);
    log.warn(`[${sectionKey}] ${msg}`);
  }

  // Heading preservation check (critical after Pass 2 when headers are optimized)
  const headingsBefore = countHeadings(before);
  const headingsAfter = countHeadings(after);

  if (passNumber > 2 && headingsBefore.total > 0) {
    if (headingsAfter.total < headingsBefore.total) {
      const msg = `Heading count DECREASED: ${headingsBefore.total} → ${headingsAfter.total}`;
      violations.push(msg);
      log.warn(`[${sectionKey}] ${msg}`);
    }
    if (headingsAfter.h2 !== headingsBefore.h2) {
      const msg = `H2 count CHANGED: ${headingsBefore.h2} → ${headingsAfter.h2}`;
      violations.push(msg);
      log.warn(`[${sectionKey}] ${msg}`);
    }
  }

  // Content length check - warn if significantly shortened (>30% reduction)
  const lengthRatio = after.length / Math.max(before.length, 1);
  if (lengthRatio < 0.7 && before.length > 200) {
    const msg = `Content significantly SHORTENED: ${before.length} → ${after.length} chars (${Math.round(lengthRatio * 100)}% of original)`;
    violations.push(msg);
    log.warn(`[${sectionKey}] ${msg}`);
  }

  const passed = violations.length === 0;

  if (!passed) {
    log.error(`[${sectionKey}] Post-pass validation FAILED with ${violations.length} violation(s)`);
  }

  return {
    passed,
    violations,
    imagesBefore,
    imagesAfter,
    headingsBefore: headingsBefore.total,
    headingsAfter: headingsAfter.total
  };
}

/**
 * Validate that image placeholders are preserved after optimization.
 * Logs a warning if images were lost but doesn't block the process.
 * @deprecated Use validatePreservation() for comprehensive validation
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
 * - Smart preservation validation (blocks changes that lose critical elements)
 *
 * @param optimized - The AI-optimized content
 * @param original - The original content before optimization
 * @param sectionKey - The section key for logging
 * @param passNumber - The current pass number
 * @param budget - Optional format budget for smart preservation decisions
 */
function cleanOptimizedContent(
  optimized: string,
  original: string,
  sectionKey?: string,
  passNumber?: number,
  budget?: ContentFormatBudget
): string {
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

  // Smart preservation validation (BLOCKING)
  // This ensures structural elements (lists, tables, images) are preserved
  // unless we're over-budget and reduction is acceptable
  if (sectionKey && passNumber) {
    const smartResult = validateSmartPreservation(original, content, sectionKey, passNumber, budget);

    if (smartResult.shouldKeepOriginal) {
      // Critical elements were lost - keep original content
      console.warn(`[Pass ${passNumber}] Smart preservation: Keeping original for ${sectionKey} due to: ${smartResult.blockedElements.join(', ')}`);
      return original;
    }

    // Also run legacy validation for logging (non-blocking)
    const validation = validatePreservation(original, content, sectionKey, passNumber);
    if (!validation.passed) {
      // Log but don't block - smart preservation already handled blocking cases
    }
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
