// services/ai/contentGeneration/passes/pass5MicroSemantics.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { PASS_5_MICRO_SEMANTICS_PROMPT } from '../../../../config/prompts';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';

const noOpDispatch = () => {};

async function callProviderWithPrompt(info: BusinessInfo, prompt: string): Promise<string> {
  switch (info.aiProvider) {
    case 'openai': return openAiService.generateText(prompt, info, noOpDispatch);
    case 'anthropic': return anthropicService.generateText(prompt, info, noOpDispatch);
    case 'perplexity': return perplexityService.generateText(prompt, info, noOpDispatch);
    case 'openrouter': return openRouterService.generateText(prompt, info, noOpDispatch);
    case 'gemini':
    default: return geminiService.generateText(prompt, info, noOpDispatch);
  }
}

export async function executePass5(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_5_microsemantics: 'in_progress' }
  });

  const prompt = PASS_5_MICRO_SEMANTICS_PROMPT(draft, brief, businessInfo);
  const optimizedDraft = await callProviderWithPrompt(businessInfo, prompt);
  const result = typeof optimizedDraft === 'string' ? optimizedDraft : draft;

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_5_microsemantics: 'completed' },
    current_pass: 6
  });

  return result;
}
