// services/ai/contentGeneration/passes/pass1DraftGeneration.ts
import { ContentBrief, ContentGenerationJob, SectionDefinition, BusinessInfo, BriefSection, SectionGenerationContext, DiscourseContext } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { ContextChainer } from '../rulesEngine/contextChainer';
import { AttributeRanker } from '../rulesEngine/attributeRanker';
import { RulesValidator } from '../rulesEngine/validators';
import { SectionPromptBuilder } from '../rulesEngine/prompts/sectionPromptBuilder';
import { YMYLValidator } from '../rulesEngine/validators/ymylValidator';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';
import { createLogger } from '../../../../utils/debugLogger';

const log = createLogger('Pass1');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No-op dispatch for standalone calls
const noOpDispatch = () => {};

// Helper to call AI based on provider
async function callProviderWithPrompt(
  info: BusinessInfo,
  prompt: string
): Promise<string> {
  return dispatchToProvider(info, {
    gemini: () => geminiService.generateText(prompt, info, noOpDispatch),
    openai: () => openAiService.generateText(prompt, info, noOpDispatch),
    anthropic: () => anthropicService.generateText(prompt, info, noOpDispatch),
    perplexity: () => perplexityService.generateText(prompt, info, noOpDispatch),
    openrouter: () => openRouterService.generateText(prompt, info, noOpDispatch),
  });
}

export async function executePass1(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionComplete: (key: string, heading: string, current: number, total: number) => void,
  shouldAbort: () => boolean
): Promise<string> {
  // 1. Parse sections from brief
  let sections = orchestrator.parseSectionsFromBrief(brief);

  // 2. Order sections using AttributeRanker (ROOT → UNIQUE → RARE → COMMON)
  // Convert to BriefSection for ordering, then convert back
  const briefSections: BriefSection[] = sections.map(s => ({
    key: s.key,
    heading: s.heading,
    level: s.level,
    order: s.order,
    subordinate_text_hint: s.subordinateTextHint,
  }));

  const orderedBriefSections = AttributeRanker.orderSections(briefSections);

  // Convert back to SectionDefinition maintaining the order
  sections = orderedBriefSections.map(bs =>
    sections.find(s => s.key === bs.key)!
  );

  // 3. Find where to resume (if any sections already completed)
  const existingSections = await orchestrator.getSections(job.id);
  const completedKeys = new Set(
    existingSections
      .filter(s => s.status === 'completed' && s.pass_1_content)
      .map(s => s.section_key)
  );

  // Use actual completed count from DB, not stale job value
  let completedCount = completedKeys.size;

  // 4. Update job with section count and current progress
  await orchestrator.updateJob(job.id, {
    total_sections: sections.length,
    completed_sections: completedCount, // Sync with actual completed count
    status: 'in_progress',
    started_at: job.started_at || new Date().toISOString(), // Don't overwrite if resuming
    passes_status: { ...job.passes_status, pass_1_draft: 'in_progress' }
  });

  // 5. Track discourse context for S-P-O chaining
  let previousContent: string | null = null;

  // 6. Generate each section
  for (const section of sections) {
    // Check for abort
    if (shouldAbort()) {
      return '';
    }

    // Skip already completed sections
    if (completedKeys.has(section.key)) {
      // Load completed content to maintain discourse chain
      const existingSection = existingSections.find(s => s.section_key === section.key);
      if (existingSection?.pass_1_content) {
        previousContent = existingSection.pass_1_content;
      }
      continue;
    }

    // Update current section
    await orchestrator.updateJob(job.id, { current_section_key: section.key });

    // Build discourse context from previous section
    const discourseContext = previousContent
      ? ContextChainer.extractForNext(previousContent)
      : null;

    // Generate with retry and validation
    const content = await generateSectionWithRetry(
      section,
      brief,
      businessInfo,
      sections,
      discourseContext,
      3
    );

    // Save to sections table
    await orchestrator.upsertSection({
      job_id: job.id,
      section_key: section.key,
      section_heading: section.heading,
      section_order: Math.round(section.order * 10), // Convert to integer
      section_level: section.level,
      pass_1_content: content,
      current_content: content,
      current_pass: 1,
      status: 'completed'
    });

    // Update discourse context for next section
    previousContent = content;

    // Update progress
    completedCount++;
    await orchestrator.updateJob(job.id, {
      completed_sections: completedCount
    });

    // Callback
    onSectionComplete(section.key, section.heading, completedCount, sections.length);

    // Small delay between sections to avoid rate limiting
    await delay(500);
  }

  // 7. Assemble full draft
  const fullDraft = await orchestrator.assembleDraft(job.id);

  // 8. Mark pass complete
  await orchestrator.updateJob(job.id, {
    draft_content: fullDraft,
    passes_status: { ...job.passes_status, pass_1_draft: 'completed' },
    current_pass: 2,
    current_section_key: null
  });

  return fullDraft;
}

async function generateSectionWithRetry(
  section: SectionDefinition,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  allSections: SectionDefinition[],
  discourseContext: DiscourseContext | null,
  maxRetries: number
): Promise<string> {
  let lastError: Error | null = null;
  let fixInstructions: string | undefined = undefined;

  // Convert SectionDefinition to BriefSection for Rules Engine
  const briefSection: BriefSection = {
    key: section.key,
    heading: section.heading,
    level: section.level,
    order: section.order,
    subordinate_text_hint: section.subordinateTextHint,
  };

  // Convert allSections to BriefSection array
  const allBriefSections: BriefSection[] = allSections.map(s => ({
    key: s.key,
    heading: s.heading,
    level: s.level,
    order: s.order,
    subordinate_text_hint: s.subordinateTextHint,
  }));

  // Detect YMYL content
  const ymylDetection = YMYLValidator.detectYMYL(
    `${brief.title} ${section.heading} ${businessInfo.industry}`
  );

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Build SectionGenerationContext
      const context: SectionGenerationContext = {
        section: briefSection,
        brief,
        businessInfo,
        discourseContext: discourseContext || undefined,
        allSections: allBriefSections,
        isYMYL: ymylDetection.isYMYL,
        ymylCategory: ymylDetection.category,
        language: businessInfo.language, // Pass language for multilingual validation
      };

      // Use SectionPromptBuilder instead of legacy prompt
      const prompt = SectionPromptBuilder.build(context, fixInstructions);

      const response = await callProviderWithPrompt(
        businessInfo,
        prompt
      );

      if (typeof response !== 'string') {
        throw new Error('AI returned non-string response');
      }

      const content = response.trim();

      // Validate generated content (pass=1: only fundamental validators)
      const validationResult = RulesValidator.validate(content, context, 1);

      // Log warnings (non-blocking) - only when verbose logging enabled
      const warnings = validationResult.violations.filter(v => v.severity === 'warning');
      if (warnings.length > 0) {
        log.warn(`Section "${section.heading}" has ${warnings.length} validation warnings:`, warnings);
      }

      // If validation failed with errors, retry with fix instructions
      if (!validationResult.passed) {
        const errors = validationResult.violations.filter(v => v.severity === 'error');
        log.warn(`Section "${section.heading}" validation failed (attempt ${attempt}/${maxRetries}):`, errors);

        if (attempt < maxRetries) {
          fixInstructions = validationResult.fixInstructions;
          // Exponential backoff before retry
          await delay(1000 * Math.pow(2, attempt - 1));
          continue; // Retry with fix instructions
        } else {
          // Max retries reached, return content with errors logged
          log.error(`Section "${section.heading}" failed validation after ${maxRetries} attempts. Proceeding with last attempt.`);
          return content;
        }
      }

      // Validation passed
      return content;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff
        await delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
