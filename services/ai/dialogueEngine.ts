/**
 * Dialogue Engine Service
 *
 * Core AI service for the Intelligent Dialogue Engine. Generates step-specific
 * clarification questions, processes user answers into structured data, detects
 * cascade impacts when foundational fields change, and builds dialogue context
 * sections for downstream prompts.
 *
 * Follows the dispatch pattern from pillarSuggestion.ts and eavGeneration.ts.
 */

import type { BusinessInfo, SemanticTriple } from '../../types';
import type {
  DialogueContext,
  StepDialogueState,
  DialogueQuestion,
  DialogueQuestionsResult,
  AnswerProcessingResult,
  CascadeImpact,
  ExtractedData,
  DialogueStep,
} from '../../types/dialogue';
import type { AppAction } from '../../state/appState';
import { dispatchToProvider } from './providerDispatcher';
import { getLanguageAndRegionInstruction, getLanguageName } from '../../utils/languageUtils';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';

// ── Constants ──

const MAX_STEP_OUTPUT_LENGTH = 5000;

// ── Helpers ──

/** Truncate a string to a max length, appending an ellipsis indicator if trimmed. */
function truncate(text: string, maxLength: number = MAX_STEP_OUTPUT_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n... [truncated]';
}

/** Safely stringify and truncate step output for inclusion in prompts. */
function stringifyStepOutput(data: unknown): string {
  try {
    const raw = JSON.stringify(data, null, 2);
    return truncate(raw);
  } catch {
    return '[Unable to serialize step output]';
  }
}

/** Format previous dialogue answers into a readable prompt section. */
function formatPreviousAnswers(answers: Array<{ question: string; answer: string; extractedData?: ExtractedData }>): string {
  if (!answers.length) return '';
  return answers
    .map(a => {
      const insight = a.extractedData?.rawInsight || '';
      return `Q: ${a.question}\nA: ${a.answer}${insight ? ` → ${insight}` : ''}`;
    })
    .join('\n\n');
}

// ── Empty Context Factory ──

/** Create an empty DialogueContext with default state for all 3 steps. */
export function createEmptyDialogueContext(): DialogueContext {
  const emptyStep = (): StepDialogueState => ({
    answers: [],
    status: 'pending',
    questionsGenerated: 0,
    questionsAnswered: 0,
  });

  return {
    strategy: emptyStep(),
    eavs: emptyStep(),
    map_planning: emptyStep(),
  };
}

// ── Prompt Builders ──

function buildStepQuestionPrompt(
  step: DialogueStep,
  stepOutput: unknown,
  businessInfo: BusinessInfo,
  dialogueContext: DialogueContext
): string {
  const { language, region } = businessInfo;
  const languageInstruction = getLanguageAndRegionInstruction(language, region);
  const languageName = getLanguageName(language);
  const outputStr = stringifyStepOutput(stepOutput);

  // Gather previous dialogue answers for cross-step awareness
  const priorAnswers: string[] = [];
  if (step === 'eavs' || step === 'map_planning') {
    const strategyFormatted = formatPreviousAnswers(dialogueContext.strategy.answers);
    if (strategyFormatted) priorAnswers.push(`STRATEGY DIALOGUE:\n${strategyFormatted}`);
  }
  if (step === 'map_planning') {
    const eavsFormatted = formatPreviousAnswers(dialogueContext.eavs.answers);
    if (eavsFormatted) priorAnswers.push(`EAV DIALOGUE:\n${eavsFormatted}`);
  }

  const priorContextSection = priorAnswers.length
    ? `\nPREVIOUS DIALOGUE CONTEXT (user-confirmed answers from earlier steps):\n${priorAnswers.join('\n\n')}\n`
    : '';

  // Step-specific analysis focus
  let stepFocus = '';
  switch (step) {
    case 'strategy':
      stepFocus = `ANALYSIS FOCUS — Strategy Step:
- Analyze the Central Entity (CE): Is it a clear noun phrase? Is it ambiguous or too broad?
- Analyze the Source Context (SC): Does it describe the authority type properly? Is it specific enough?
- Analyze the Central Search Intent (CSI): Are the predicates verbs? Do they cover the main user intents?
- Check for completeness: Are any required fields missing or generic?
- Check for scope: Is the CE too narrow or too broad for the business?`;
      break;
    case 'eavs':
      stepFocus = `ANALYSIS FOCUS — EAV Step:
- Find gaps: Are there missing trust signals (certifications, reviews, guarantees)?
- Check for pending values: Are there clipboard emoji (📋) values that need real business data?
- Check sub-entity coverage: Are important sub-entities of the CE missing?
- Check pricing/specification gaps: Are there attributes that competitors would cover?
- Verify layer balance: Is there a good mix of CE (domain knowledge) and SC (business) triples?`;
      break;
    case 'map_planning':
      stepFocus = `ANALYSIS FOCUS — Map Planning Step:
- Detect overlapping topics: Are there topics that are too similar and risk cannibalization?
- Check coverage gaps: Are there important aspects of the CE not covered by any topic?
- Assess depth imbalance: Are some pillars/clusters much deeper than others?
- Verify intent coverage: Do the topics cover informational, commercial, and navigational intents?
- Check topic hierarchy: Are parent-child relationships logical?`;
      break;
  }

  return `${languageInstruction}

You are an intelligent SEO dialogue assistant reviewing the output of a pipeline step.
Your job is to identify ambiguities, gaps, or issues and generate clarification questions.

${stepFocus}

BUSINESS CONTEXT:
- Industry: ${businessInfo.industry || 'not specified'}
- Audience: ${businessInfo.audience || 'not specified'}
- Domain: ${businessInfo.domain || 'not specified'}
- Language: ${languageName}
${priorContextSection}
STEP OUTPUT TO REVIEW:
${outputStr}

INSTRUCTIONS:
1. Analyze the step output for ambiguities, gaps, or issues based on the analysis focus above.
2. Generate 0-5 questions. Generate 0 questions if the output is complete and unambiguous.
3. Each question must be in ${languageName}.
4. Prioritize questions that would have the highest impact on downstream quality.

Return JSON:
{
  "questions": [
    {
      "questionId": "q-<short-unique-id>",
      "question": "The question text in ${languageName}",
      "questionType": "choice|text|confirm|multi_text",
      "choices": [
        { "label": "Option text", "description": "Why this option" }
      ],
      "allowCustomInput": true,
      "context": "Why this question matters for SEO quality",
      "priority": "critical|important|optional",
      "triggerCondition": "What in the output triggered this question"
    }
  ],
  "introText": "A brief intro in ${languageName} (e.g., 'Based on your strategy, I have a few questions...')",
  "allClear": false,
  "allClearMessage": null
}

If everything looks complete and unambiguous, return:
{
  "questions": [],
  "introText": "",
  "allClear": true,
  "allClearMessage": "A brief confirmation message in ${languageName}"
}

IMPORTANT: The "choices" array is only for questionType "choice". Omit it for other types.
For "confirm" questions, do NOT include choices — the UI will show Yes/No automatically.`;
}

function buildAnswerProcessingPrompt(
  question: DialogueQuestion,
  answer: string,
  step: DialogueStep,
  stepContext: { pillars?: any; eavs?: SemanticTriple[]; topics?: any[] },
  businessInfo: BusinessInfo
): string {
  const { language, region } = businessInfo;
  const languageInstruction = getLanguageAndRegionInstruction(language, region);
  const languageName = getLanguageName(language);

  const contextStr = stringifyStepOutput(stepContext);

  return `${languageInstruction}

You are an intelligent SEO dialogue assistant processing a user's answer to a clarification question.
Interpret the answer — even if informal, shorthand, or in conversational ${languageName} (e.g., "ja dat klopt", "ook sedum", "BRL-2312 en Komo").

ORIGINAL QUESTION:
- ID: ${question.questionId}
- Type: ${question.questionType}
- Question: ${question.question}
- Context: ${question.context}
${question.choices?.length ? `- Choices offered: ${question.choices.map(c => c.label).join(', ')}` : ''}

USER'S ANSWER: "${answer}"

CURRENT STEP DATA:
${contextStr}

BUSINESS CONTEXT:
- Central Entity: ${stepContext.pillars?.centralEntity || 'not set'}
- Industry: ${businessInfo.industry || 'not specified'}
- Language: ${languageName}

INSTRUCTIONS:
1. Interpret the user's answer in context of the question and current data.
2. Extract structured data changes where applicable.
3. If the answer is a "no" to a confirm question, suggest alternatives.
4. If the answer is unclear or ambiguous, generate a follow-up question instead of guessing.
5. Set confidence (0-1) based on how clearly the answer maps to data changes.

For new EAV triples, use this structure:
{
  "subject": { "label": "entity name", "type": "Entity" },
  "predicate": { "relation": "snake_case_attribute", "type": "Property" },
  "object": { "value": "the value", "type": "Value" },
  "confidence": 0.8,
  "source": "dialogue",
  "entity": "entity name",
  "attribute": "snake_case_attribute",
  "value": "the value"
}

Return JSON:
{
  "interpretation": "Human-readable description of what will change, in ${languageName}",
  "extractedData": {
    "newTriples": [],
    "updatedFields": {},
    "topicDecisions": {},
    "rawInsight": "Key insight from the answer"
  },
  "confidence": 0.85,
  "followUpQuestion": null,
  "alternativesOffered": null
}

If the answer is unclear, set confidence < 0.5 and include a followUpQuestion:
{
  "followUpQuestion": {
    "questionId": "fq-<short-id>",
    "question": "Clarification question in ${languageName}",
    "questionType": "text",
    "allowCustomInput": true,
    "context": "Why clarification is needed",
    "priority": "important",
    "triggerCondition": "Unclear answer"
  }
}

If the answer is "no" to a confirm question, include alternativesOffered as an array of suggestion strings.`;
}

// ── Response Processing ──

function processQuestionsResponse(raw: any): DialogueQuestionsResult {
  const fallbackResult: DialogueQuestionsResult = {
    questions: [],
    introText: '',
    allClear: true,
    allClearMessage: 'Review complete',
  };

  if (!raw || typeof raw !== 'object') return fallbackResult;

  const allClear = raw.allClear === true;
  const questions: DialogueQuestion[] = [];

  if (Array.isArray(raw.questions)) {
    for (const q of raw.questions) {
      if (!q?.questionId || !q?.question || !q?.questionType) continue;

      const validTypes = ['choice', 'text', 'confirm', 'multi_text'] as const;
      const questionType = validTypes.includes(q.questionType) ? q.questionType : 'text';

      const validPriorities = ['critical', 'important', 'optional'] as const;
      const priority = validPriorities.includes(q.priority) ? q.priority : 'optional';

      questions.push({
        questionId: String(q.questionId),
        question: String(q.question),
        questionType,
        choices: Array.isArray(q.choices)
          ? q.choices.filter((c: any) => c?.label).map((c: any) => ({
              label: String(c.label),
              description: c.description ? String(c.description) : undefined,
            }))
          : undefined,
        allowCustomInput: q.allowCustomInput !== false,
        context: String(q.context || ''),
        priority,
        triggerCondition: String(q.triggerCondition || ''),
      });
    }
  }

  return {
    questions: questions.slice(0, 5), // Max 5 questions
    introText: typeof raw.introText === 'string' ? raw.introText : '',
    allClear: allClear && questions.length === 0,
    allClearMessage: typeof raw.allClearMessage === 'string' ? raw.allClearMessage : undefined,
  };
}

function processAnswerResponse(raw: any): AnswerProcessingResult {
  const fallbackResult: AnswerProcessingResult = {
    interpretation: '',
    extractedData: { rawInsight: '' },
    confidence: 0.5,
  };

  if (!raw || typeof raw !== 'object') return fallbackResult;

  // Process new triples with proper structure
  const newTriples: SemanticTriple[] = [];
  if (Array.isArray(raw.extractedData?.newTriples)) {
    for (const t of raw.extractedData.newTriples) {
      if (!t?.subject?.label || !t?.predicate?.relation) continue;

      newTriples.push({
        subject: {
          label: String(t.subject.label),
          type: String(t.subject.type || 'Entity'),
        },
        predicate: {
          relation: String(t.predicate.relation),
          type: String(t.predicate.type || 'Property'),
        },
        object: {
          value: t.object?.value != null ? t.object.value : '',
          type: String(t.object?.type || 'Value'),
        },
        confidence: typeof t.confidence === 'number' ? t.confidence : 0.7,
        source: 'dialogue',
        entity: String(t.entity || t.subject?.label || ''),
        attribute: String(t.attribute || t.predicate?.relation || ''),
        value: t.value != null ? t.value : (t.object?.value != null ? t.object.value : ''),
      } as SemanticTriple);
    }
  }

  // Process follow-up question
  let followUpQuestion: DialogueQuestion | undefined;
  if (raw.followUpQuestion && typeof raw.followUpQuestion === 'object') {
    const fq = raw.followUpQuestion;
    if (fq.questionId && fq.question) {
      const validTypes = ['choice', 'text', 'confirm', 'multi_text'] as const;
      const validPriorities = ['critical', 'important', 'optional'] as const;
      followUpQuestion = {
        questionId: String(fq.questionId),
        question: String(fq.question),
        questionType: validTypes.includes(fq.questionType) ? fq.questionType : 'text',
        allowCustomInput: fq.allowCustomInput !== false,
        context: String(fq.context || ''),
        priority: validPriorities.includes(fq.priority) ? fq.priority : 'important',
        triggerCondition: String(fq.triggerCondition || 'Unclear answer'),
      };
    }
  }

  const extractedData: ExtractedData = {
    newTriples: newTriples.length > 0 ? newTriples : undefined,
    updatedFields: raw.extractedData?.updatedFields && typeof raw.extractedData.updatedFields === 'object'
      ? raw.extractedData.updatedFields
      : undefined,
    topicDecisions: raw.extractedData?.topicDecisions && typeof raw.extractedData.topicDecisions === 'object'
      ? raw.extractedData.topicDecisions
      : undefined,
    rawInsight: typeof raw.extractedData?.rawInsight === 'string'
      ? raw.extractedData.rawInsight
      : undefined,
  };

  return {
    interpretation: typeof raw.interpretation === 'string' ? raw.interpretation : '',
    extractedData,
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
    followUpQuestion,
    alternativesOffered: Array.isArray(raw.alternativesOffered)
      ? raw.alternativesOffered.filter((a: any) => typeof a === 'string')
      : undefined,
  };
}

// ── Main Exports ──

/**
 * Generate step-specific clarification questions by analyzing step output.
 * Returns 0-5 questions or allClear if the output is complete and unambiguous.
 */
export async function generateStepQuestions(
  step: DialogueStep,
  stepOutput: unknown,
  businessInfo: BusinessInfo,
  dialogueContext: DialogueContext,
  dispatch: React.Dispatch<AppAction>
): Promise<DialogueQuestionsResult> {
  const prompt = buildStepQuestionPrompt(step, stepOutput, businessInfo, dialogueContext);

  const fallback = {
    questions: [] as any[],
    introText: '',
    allClear: true,
    allClearMessage: 'Review complete',
  };

  try {
    const result = await dispatchToProvider<any>(businessInfo, {
      gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
    });

    return processQuestionsResponse(result);
  } catch (err) {
    console.warn('[dialogueEngine] generateStepQuestions failed, returning allClear fallback:', err);
    return { questions: [], allClear: true, allClearMessage: 'Review complete', introText: '' };
  }
}

/**
 * Process a user's answer to a dialogue question, extracting structured data changes.
 * Returns an interpretation, extracted data, confidence, and optional follow-up.
 */
export async function processAnswer(
  question: DialogueQuestion,
  answer: string,
  step: DialogueStep,
  stepContext: { pillars?: any; eavs?: SemanticTriple[]; topics?: any[] },
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<AnswerProcessingResult> {
  const prompt = buildAnswerProcessingPrompt(question, answer, step, stepContext, businessInfo);

  const fallback = {
    interpretation: answer,
    extractedData: { rawInsight: answer },
    confidence: 0.5,
  };

  try {
    const result = await dispatchToProvider<any>(businessInfo, {
      gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
    });

    return processAnswerResponse(result);
  } catch (err) {
    console.warn('[dialogueEngine] processAnswer failed, returning raw answer as insight:', err);
    return {
      interpretation: answer,
      extractedData: { rawInsight: answer },
      confidence: 0.3,
    };
  }
}

/**
 * Detect cascade impact when a foundational strategy field changes.
 * Pure logic — no AI call. Counts affected EAVs and topics.
 */
export function detectCascadeImpact(
  changedField: 'centralEntity' | 'sourceContext' | 'centralSearchIntent',
  newValue: string,
  oldValue: string,
  currentData: { eavs?: SemanticTriple[]; topics?: any[] }
): CascadeImpact {
  const oldLower = (oldValue || '').toLowerCase();

  if (!oldLower) {
    return {
      hasImpact: false,
      affectedEavCount: 0,
      affectedTopicCount: 0,
      affectedFields: [],
      description: 'No previous value to compare against.',
      severity: 'info',
    };
  }

  // Count affected EAVs — match subject.label against oldValue (case-insensitive)
  const eavs = currentData.eavs || [];
  const affectedEavCount = eavs.filter(eav => {
    const label = (eav.subject?.label || eav.entity || '').toLowerCase();
    return label.includes(oldLower) || oldLower.includes(label);
  }).length;

  // Count affected topics — match title or entity references against oldValue
  const topics = currentData.topics || [];
  const affectedTopicCount = topics.filter((t: any) => {
    const title = (t.title || t.name || '').toLowerCase();
    const entity = (t.centralEntity || t.entity || '').toLowerCase();
    return title.includes(oldLower) || entity.includes(oldLower);
  }).length;

  const totalAffected = affectedEavCount + affectedTopicCount;
  const hasImpact = totalAffected > 0;

  // Determine severity
  let severity: 'info' | 'warning' | 'critical';
  if (totalAffected > 20) {
    severity = 'critical';
  } else if (totalAffected > 5) {
    severity = 'warning';
  } else {
    severity = 'info';
  }

  // Build affected fields list
  const affectedFields: string[] = [];
  if (affectedEavCount > 0) affectedFields.push('eavs');
  if (affectedTopicCount > 0) affectedFields.push('topics');

  // Build description
  const fieldLabel =
    changedField === 'centralEntity' ? 'Central Entity' :
    changedField === 'sourceContext' ? 'Source Context' :
    'Central Search Intent';

  const parts: string[] = [];
  if (affectedEavCount > 0) parts.push(`${affectedEavCount} EAV triple${affectedEavCount !== 1 ? 's' : ''}`);
  if (affectedTopicCount > 0) parts.push(`${affectedTopicCount} topic${affectedTopicCount !== 1 ? 's' : ''}`);

  const description = hasImpact
    ? `Changing ${fieldLabel} from "${oldValue}" to "${newValue}" affects ${parts.join(' and ')}. These may need to be regenerated.`
    : `Changing ${fieldLabel} from "${oldValue}" to "${newValue}" has no downstream impact.`;

  return {
    hasImpact,
    affectedEavCount,
    affectedTopicCount,
    affectedFields,
    description,
    severity,
  };
}

/**
 * Build a dialogue context section for inclusion in downstream AI prompts.
 * Formats confirmed dialogue answers into a structured prompt section.
 */
export function buildDialogueContextSection(
  dialogueContext: DialogueContext,
  forStep: DialogueStep
): string {
  // Strategy step has no prior context
  if (forStep === 'strategy') return '';

  const sections: string[] = [];

  // For eavs step: include strategy answers
  // For map_planning step: include strategy + eavs answers
  if (forStep === 'eavs' || forStep === 'map_planning') {
    const strategyAnswers = dialogueContext.strategy.answers;
    if (strategyAnswers.length > 0) {
      const formatted = formatPreviousAnswers(strategyAnswers);
      if (formatted) sections.push(`Strategy Clarifications:\n${formatted}`);
    }
  }

  if (forStep === 'map_planning') {
    const eavAnswers = dialogueContext.eavs.answers;
    if (eavAnswers.length > 0) {
      const formatted = formatPreviousAnswers(eavAnswers);
      if (formatted) sections.push(`EAV Clarifications:\n${formatted}`);
    }
  }

  if (sections.length === 0) return '';

  return `\n--- VALIDATED BUSINESS CONTEXT (from dialogue) ---\n${sections.join('\n\n')}\n--- END VALIDATED CONTEXT ---\n`;
}
