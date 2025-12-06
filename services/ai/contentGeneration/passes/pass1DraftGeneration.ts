// services/ai/contentGeneration/passes/pass1DraftGeneration.ts
import { ContentBrief, ContentGenerationJob, SectionDefinition, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { GENERATE_SECTION_DRAFT_PROMPT } from '../../../../config/prompts';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No-op dispatch for standalone calls
const noOpDispatch = () => {};

// Helper to call AI based on provider
async function callProviderWithPrompt(
  info: BusinessInfo,
  prompt: string
): Promise<string> {
  switch (info.aiProvider) {
    case 'openai':
      return openAiService.generateText(prompt, info, noOpDispatch);
    case 'anthropic':
      return anthropicService.generateText(prompt, info, noOpDispatch);
    case 'perplexity':
      return perplexityService.generateText(prompt, info, noOpDispatch);
    case 'openrouter':
      return openRouterService.generateText(prompt, info, noOpDispatch);
    case 'gemini':
    default:
      return geminiService.generateText(prompt, info, noOpDispatch);
  }
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
  const sections = orchestrator.parseSectionsFromBrief(brief);

  // 2. Find where to resume (if any sections already completed)
  const existingSections = await orchestrator.getSections(job.id);
  const completedKeys = new Set(
    existingSections
      .filter(s => s.status === 'completed' && s.pass_1_content)
      .map(s => s.section_key)
  );

  // Use actual completed count from DB, not stale job value
  let completedCount = completedKeys.size;

  // 3. Update job with section count and current progress
  await orchestrator.updateJob(job.id, {
    total_sections: sections.length,
    completed_sections: completedCount, // Sync with actual completed count
    status: 'in_progress',
    started_at: job.started_at || new Date().toISOString(), // Don't overwrite if resuming
    passes_status: { ...job.passes_status, pass_1_draft: 'in_progress' }
  });

  // 4. Generate each section
  for (const section of sections) {
    // Check for abort
    if (shouldAbort()) {
      return '';
    }

    // Skip already completed sections
    if (completedKeys.has(section.key)) {
      continue;
    }

    // Update current section
    await orchestrator.updateJob(job.id, { current_section_key: section.key });

    // Generate with retry
    const content = await generateSectionWithRetry(
      section,
      brief,
      businessInfo,
      sections,
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

  // 5. Assemble full draft
  const fullDraft = await orchestrator.assembleDraft(job.id);

  // 6. Mark pass complete
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
  maxRetries: number
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prompt = GENERATE_SECTION_DRAFT_PROMPT(
        section,
        brief,
        businessInfo,
        allSections
      );

      const response = await callProviderWithPrompt(
        businessInfo,
        prompt
      );

      if (typeof response === 'string') {
        return response.trim();
      }

      throw new Error('AI returned non-string response');
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
