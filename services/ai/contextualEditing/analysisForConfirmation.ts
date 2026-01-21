/**
 * Analysis for Confirmation Service
 *
 * Analyzes selected text to detect services/facts that require user confirmation
 * before rewriting. This enables the "fix_accuracy" action to show users what
 * the AI found before making changes.
 */

import { callProviderWithFallback } from '../contentGeneration/providerUtils';
import { BusinessInfo, SemanticTriple } from '../../../types';
import {
  AnalysisForConfirmation,
  DetectedItem,
  QuickAction,
} from '../../../types/contextualEditor';

/**
 * Generate a unique ID for detected items
 */
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Build prompt for service detection
 * Internal helper that asks AI to find service mentions in text
 */
export function buildServiceDetectionPrompt(
  selectedText: string,
  businessOfferings: string[]
): string {
  const offeringsList = businessOfferings.length > 0
    ? businessOfferings.join(', ')
    : 'No specific services listed';

  return `You are analyzing text to detect service or product mentions that may need verification.

## Business Services Offered
${offeringsList}

## Text to Analyze
"${selectedText}"

## Task
Identify any mentions of services, products, or offerings in the text. For each mention, assess whether:
1. It clearly matches one of the listed business services (likely correct)
2. It mentions a service NOT in the list (potentially incorrect - the business may not offer this)
3. It's a vague service reference that needs clarification

## Output Format
Return a JSON array of detected items. If no service mentions found, return an empty array [].

\`\`\`json
[
  {
    "textFragment": "the exact text fragment mentioning the service",
    "itemType": "service_mention",
    "aiAssessment": "potentially_incorrect" | "unverified" | "needs_review",
    "reason": "explanation of why this needs attention"
  }
]
\`\`\`

Rules:
- "potentially_incorrect": Service mentioned but NOT in the business offerings list
- "unverified": Service mentioned that partially matches offerings but needs confirmation
- "needs_review": Vague service reference or unclear claim

Return ONLY the JSON array, no other text.`;
}

/**
 * Build prompt for factual claim detection
 * Internal helper that asks AI to find factual claims that need verification
 */
export function buildFactDetectionPrompt(selectedText: string): string {
  return `You are analyzing text to detect factual claims that may need verification.

## Text to Analyze
"${selectedText}"

## Task
Identify any factual claims in the text that:
1. State specific numbers, statistics, or measurements
2. Make claims about dates, timelines, or historical facts
3. Assert scientific or technical facts
4. Reference specific studies, sources, or authorities
5. Make comparative claims (best, fastest, most, etc.)

For each claim, assess whether it appears verifiable or potentially problematic.

## Output Format
Return a JSON array of detected items. If no factual claims found, return an empty array [].

\`\`\`json
[
  {
    "textFragment": "the exact text fragment containing the claim",
    "itemType": "factual_claim" | "unverified_statement",
    "aiAssessment": "potentially_incorrect" | "unverified" | "needs_review",
    "reason": "explanation of why this needs verification"
  }
]
\`\`\`

Rules:
- "factual_claim": Specific fact with numbers, dates, or attributable claims
- "unverified_statement": General assertion that could be verified but lacks specificity
- "potentially_incorrect": Claim that seems suspicious or likely wrong
- "unverified": Claim that could be true but cannot be verified from context
- "needs_review": Claim that the user should double-check

Return ONLY the JSON array, no other text.`;
}

/**
 * Parse AI response to extract JSON array of detected items
 * Handles various JSON formatting issues gracefully
 */
function parseDetectedItemsFromResponse(
  response: string,
  fallbackItemType: 'service_mention' | 'factual_claim' | 'unverified_statement'
): Omit<DetectedItem, 'id' | 'userDecision'>[] {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();

    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find array in response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and normalize each item
    return parsed
      .filter((item: any) => item && typeof item === 'object' && item.textFragment)
      .map((item: any) => ({
        textFragment: String(item.textFragment || ''),
        itemType: ['service_mention', 'factual_claim', 'unverified_statement'].includes(item.itemType)
          ? item.itemType
          : fallbackItemType,
        aiAssessment: ['potentially_incorrect', 'unverified', 'needs_review'].includes(item.aiAssessment)
          ? item.aiAssessment
          : 'needs_review',
        reason: String(item.reason || 'Detected by AI analysis'),
      }));
  } catch (error) {
    // JSON parsing failed - return empty array
    console.warn('Failed to parse AI response for detected items:', error);
    return [];
  }
}

/**
 * Analyze selected text to detect services/facts that need user confirmation
 *
 * This is the main entry point for analysis. It calls AI to detect:
 * - Service mentions that may not match business offerings
 * - Factual claims that need verification
 *
 * @param selectedText - The text the user selected for editing
 * @param businessInfo - Business context including offerings and AI provider settings
 * @param eavs - Semantic triples for additional context
 * @returns Analysis result with detected items for user confirmation
 */
export async function analyzeForConfirmation(
  selectedText: string,
  businessInfo: BusinessInfo,
  eavs: SemanticTriple[]
): Promise<AnalysisForConfirmation> {
  const detectedItems: DetectedItem[] = [];
  const businessOfferings = businessInfo.offerings || [];

  // Run service detection and fact detection in parallel
  const [serviceResponse, factResponse] = await Promise.all([
    // Service detection (only if business has offerings defined)
    businessOfferings.length > 0
      ? callProviderWithFallback(
          businessInfo,
          buildServiceDetectionPrompt(selectedText, businessOfferings)
        ).catch((err) => {
          console.warn('Service detection failed:', err);
          return '[]';
        })
      : Promise.resolve('[]'),

    // Fact detection (always run)
    callProviderWithFallback(
      businessInfo,
      buildFactDetectionPrompt(selectedText)
    ).catch((err) => {
      console.warn('Fact detection failed:', err);
      return '[]';
    }),
  ]);

  // Parse service detection results
  const serviceItems = parseDetectedItemsFromResponse(serviceResponse, 'service_mention');
  for (const item of serviceItems) {
    detectedItems.push({
      ...item,
      id: generateItemId(),
      userDecision: null,
    });
  }

  // Parse fact detection results
  const factItems = parseDetectedItemsFromResponse(factResponse, 'factual_claim');
  for (const item of factItems) {
    detectedItems.push({
      ...item,
      id: generateItemId(),
      userDecision: null,
    });
  }

  // Generate summary based on findings
  let summary: string;
  if (detectedItems.length === 0) {
    summary = 'No items requiring confirmation were detected in the selected text.';
  } else {
    const serviceCount = detectedItems.filter(i => i.itemType === 'service_mention').length;
    const factCount = detectedItems.filter(i => i.itemType !== 'service_mention').length;
    const parts: string[] = [];
    if (serviceCount > 0) {
      parts.push(`${serviceCount} service mention${serviceCount > 1 ? 's' : ''}`);
    }
    if (factCount > 0) {
      parts.push(`${factCount} factual claim${factCount > 1 ? 's' : ''}`);
    }
    summary = `Found ${parts.join(' and ')} that may need your review before editing.`;
  }

  return {
    action: 'fix_accuracy' as QuickAction,
    detectedItems,
    summary,
  };
}

/**
 * Build a rewrite prompt that incorporates user's decisions on detected items
 *
 * Creates an AI prompt that instructs the model to:
 * - Keep items marked as 'keep'
 * - Fix items marked as 'fix' (using userCorrection if provided)
 * - Remove items marked as 'remove'
 *
 * @param selectedText - Original selected text
 * @param detectedItems - Items with userDecision populated
 * @param customInstruction - Optional additional instruction from user
 * @returns Prompt string for AI rewrite
 */
export function buildConfirmedRewritePrompt(
  selectedText: string,
  detectedItems: DetectedItem[],
  customInstruction?: string
): string {
  // Categorize items by user decision
  const keepItems = detectedItems.filter(i => i.userDecision === 'keep');
  const fixItems = detectedItems.filter(i => i.userDecision === 'fix');
  const removeItems = detectedItems.filter(i => i.userDecision === 'remove');

  let prompt = `You are an expert content editor. Rewrite the following text based on the user's decisions about specific items.

## Original Text
"${selectedText}"

## User's Decisions
`;

  if (keepItems.length > 0) {
    prompt += `
### Keep These Items Unchanged
The following items should remain in the text exactly as they are:
${keepItems.map(item => `- "${item.textFragment}" (${item.reason})`).join('\n')}
`;
  }

  if (fixItems.length > 0) {
    prompt += `
### Fix These Items
The following items should be corrected or improved:
${fixItems.map(item => {
  const correction = item.userCorrection
    ? ` -> Correct to: "${item.userCorrection}"`
    : ' -> Improve accuracy/clarity';
  return `- "${item.textFragment}"${correction} (${item.reason})`;
}).join('\n')}
`;
  }

  if (removeItems.length > 0) {
    prompt += `
### Remove These Items
The following items should be removed or rephrased to exclude them:
${removeItems.map(item => `- "${item.textFragment}" (${item.reason})`).join('\n')}
`;
  }

  if (customInstruction) {
    prompt += `
## Additional Instructions
${customInstruction}
`;
  }

  prompt += `
## Rules
1. Preserve the overall meaning and flow of the text
2. Keep items marked "keep" exactly as they appear
3. Apply the specified corrections for items marked "fix"
4. Remove or rephrase items marked "remove" without leaving awkward gaps
5. Maintain proper grammar and sentence structure
6. Follow S-P-O (Subject-Predicate-Object) sentence structure
7. Keep sentences under 30 words

## Output
Return ONLY the rewritten text. No explanations, no quotes around the output, no markdown formatting.`;

  return prompt;
}
