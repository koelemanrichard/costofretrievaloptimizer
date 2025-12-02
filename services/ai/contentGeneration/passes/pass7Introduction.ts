// services/ai/contentGeneration/passes/pass7Introduction.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { PASS_7_INTRO_SYNTHESIS_PROMPT } from '../../../../config/prompts';
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

export async function executePass7(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_7_intro: 'in_progress' }
  });

  const prompt = PASS_7_INTRO_SYNTHESIS_PROMPT(draft, brief, businessInfo);
  const newIntro = await callProviderWithPrompt(businessInfo, prompt);

  // Replace the introduction section
  let result = draft;
  if (typeof newIntro === 'string') {
    // Find and replace introduction
    const introPattern = /## Introduction\n\n[\s\S]*?(?=\n## )/;
    if (introPattern.test(draft)) {
      result = draft.replace(introPattern, `## Introduction\n\n${newIntro.trim()}\n\n`);
    }
  }

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_7_intro: 'completed' },
    current_pass: 8
  });

  return result;
}
