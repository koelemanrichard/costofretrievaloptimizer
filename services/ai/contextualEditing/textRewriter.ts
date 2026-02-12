/**
 * Text Rewriter Service
 *
 * Generates AI-powered text rewrites following Semantic SEO
 * algorithmic authorship rules.
 */

import { callProviderWithFallback } from '../contentGeneration/providerUtils';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../types';
import {
  RewriteRequest,
  RewriteResult,
  QuickAction,
  EditScope,
} from '../../../types/contextualEditor';
import { getLanguageAndRegionInstruction } from '../../../utils/languageUtils';

// Algorithmic authorship rules to include in prompts
const ALGORITHMIC_AUTHORSHIP_RULES = `
## Writing Rules (Algorithmic Authorship)

Follow these rules strictly:

1. **S-P-O Structure**: Every sentence must have clear Subject-Predicate-Object structure.
   - Correct: "The iPhone 15 weighs 171 grams."
   - Incorrect: "At 171 grams, the weight of the iPhone 15 is something users appreciate."

2. **one fact per sentence**: Each sentence delivers one unique EAV (Entity-Attribute-Value) triple.

3. **Short sentences**: Maximum 30 words per sentence. Keep dependency trees short.

4. **Explicit entity naming**: Avoid ambiguous pronouns. Name entities explicitly.

5. **Important terms first**: Place the most important terms early in sentences.

6. **No fluff words**: Remove: actually, basically, really, very, quite, rather, somewhat, overall, in conclusion.

7. **No generic AI phrases**: Avoid: "in today's world", "it's important to note", "firstly/secondly", "furthermore".

8. **Proper modality**:
   - Use "is/are" for established facts
   - Use "can/may" for possibilities
   - Use "should/must" for recommendations

9. **Specific values**: Replace vague terms ("many", "some") with exact numbers when possible.

10. **Direct answers**: Answer questions immediately without preamble.
`;

/**
 * Map quick actions to human-readable instructions
 */
const ACTION_INSTRUCTIONS: Record<QuickAction, string> = {
  fix_accuracy: 'Fix any factual inaccuracies. Ensure claims are accurate and verifiable.',
  remove_service: 'Remove or rephrase mentions of services that may not be offered. Keep the meaning but remove specific service claims.',
  fix_grammar: 'Fix grammar, spelling, and punctuation errors. Keep the meaning unchanged.',
  improve_flow: 'Improve the flow and readability. Ensure smooth transitions between sentences.',
  simplify: 'Simplify the text. Use shorter sentences and simpler words while preserving meaning.',
  expand_detail: 'Expand with more specific details and facts. Add concrete EAV triples.',
  change_tone_formal: 'Rewrite in a more formal, professional tone.',
  change_tone_casual: 'Rewrite in a more casual, conversational tone.',
  change_tone_persuasive: 'Rewrite to be more persuasive and action-oriented.',
  seo_optimize: 'Optimize for SEO. Ensure clear S-P-O structure, remove fluff, add specific facts.',
  custom: '',
};

/**
 * Build the rewrite prompt including all rules
 */
export function buildRewritePrompt(params: {
  selectedText: string;
  action: QuickAction;
  customInstruction?: string;
  surroundingContext: string;
  businessInfo?: BusinessInfo;
  eavs?: SemanticTriple[];
}): string {
  const { selectedText, action, customInstruction, surroundingContext, businessInfo, eavs } = params;

  const instruction = action === 'custom' && customInstruction
    ? customInstruction
    : ACTION_INSTRUCTIONS[action];

  let prompt = `You are an expert content editor following Semantic SEO principles.

${ALGORITHMIC_AUTHORSHIP_RULES}

## Task

Rewrite the following text according to this instruction:
**${instruction}**

## Text to Rewrite

"${selectedText}"

## Surrounding Context (for reference, do not modify)

${surroundingContext}
`;

  if (businessInfo?.offerings && businessInfo.offerings.length > 0) {
    prompt += `
## Business Services (only mention these)

${businessInfo.offerings.join(', ')}
`;
  }

  if (eavs && eavs.length > 0) {
    prompt += `
## Relevant Facts (EAVs) to incorporate if appropriate

${eavs.slice(0, 5).map(e => `- ${e.entity} → ${e.attribute} → ${e.value}`).join('\n')}
`;
  }

  if (businessInfo?.language) {
    prompt += `
${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}
`;
  }

  prompt += `
## Output Format

Respond with ONLY the rewritten text. No explanations, no quotes, no markdown formatting around the text itself.
Keep the same general length unless expanding/simplifying was requested.
`;

  return prompt;
}

/**
 * Detect the optimal scope for the edit based on action type
 */
export function detectOptimalScope(action: QuickAction, selectedText: string): EditScope {
  if (['fix_grammar', 'fix_accuracy'].includes(action)) {
    return 'selection';
  }

  if (['improve_flow', 'simplify', 'expand_detail'].includes(action)) {
    return 'paragraph';
  }

  if (action.startsWith('change_tone_')) {
    return 'section';
  }

  if (action === 'seo_optimize') {
    return 'paragraph';
  }

  return 'sentence';
}

/**
 * Determine if inline diff should be used vs panel preview
 */
export function shouldUseInlineDiff(original: string, rewritten: string): boolean {
  const originalWords = original.split(/\s+/).length;
  const rewrittenWords = rewritten.split(/\s+/).length;
  const wordCountChange = Math.abs(originalWords - rewrittenWords);
  const characterChange = Math.abs(original.length - rewritten.length);

  // For inline diff, changes should be modest in both word count and character count
  return wordCountChange < 20 && characterChange < 100;
}

/**
 * Calculate simple compliance score based on rules
 */
function calculateComplianceScore(text: string): number {
  let score = 100;

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  for (const sentence of sentences) {
    if (sentence.split(/\s+/).length > 30) {
      score -= 5;
    }
  }

  const fluffWords = ['actually', 'basically', 'really', 'very', 'quite', 'overall'];
  for (const fluff of fluffWords) {
    if (text.toLowerCase().includes(fluff)) {
      score -= 3;
    }
  }

  return Math.max(0, score);
}

/**
 * Main rewrite function
 */
export async function rewriteText(params: {
  request: RewriteRequest;
  fullArticle: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  eavs: SemanticTriple[];
  dispatch: React.Dispatch<any>;
}): Promise<RewriteResult> {
  const { request, fullArticle, businessInfo, brief, eavs, dispatch } = params;

  const optimalScope = detectOptimalScope(request.action, request.selectedText);
  const actualScope = request.forceNarrowScope ? 'selection' : optimalScope;

  const prompt = buildRewritePrompt({
    selectedText: request.selectedText,
    action: request.action,
    customInstruction: request.customInstruction,
    surroundingContext: request.surroundingContext,
    businessInfo,
    eavs,
  });

  const rewrittenText = await callProviderWithFallback(
    businessInfo,
    prompt
  );

  const originalWords = request.selectedText.split(/\s+/).length;
  const newWords = rewrittenText.split(/\s+/).length;

  return {
    originalText: request.selectedText,
    rewrittenText: rewrittenText.trim(),
    scopeExpanded: actualScope !== 'selection',
    expandedTo: actualScope,
    expandReason: actualScope !== 'selection'
      ? `"${request.action}" works better with ${actualScope} context`
      : undefined,
    changesDescription: `Rewrote text using "${request.action}" action`,
    affectedHeading: undefined,
    wordCountDelta: newWords - originalWords,
    complianceScore: calculateComplianceScore(rewrittenText),
  };
}
