// services/ai/contentGeneration/passes/pass8FinalPolish.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, SectionProgressCallback } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { getLanguageAndRegionInstruction, getStylometryInstructions, businessContext } from '../../../../config/prompts';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';

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

/**
 * Pass 8: Final Polish
 *
 * This pass performs publication-ready polishing of the complete article.
 * It absorbs the functionality of the manual "Polish" button, ensuring
 * that the generated content is ready for publication without additional
 * user intervention.
 *
 * CRITICAL: This pass MUST preserve all [IMAGE: ... | ...] placeholders
 * that were added in Pass 7 (Visual Semantics). It also preserves the
 * heading hierarchy established in earlier passes.
 *
 * Key responsibilities:
 * 1. Smooth transitions between paragraphs and sections
 * 2. Consistent tone and voice throughout
 * 3. Clear, engaging prose with no redundancy
 * 4. Strengthen weak sentences
 * 5. Ensure publication readiness
 */

const FINAL_POLISH_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo,
  imageCount: number
): string => {
  const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

  // Extract visual semantics from brief for reference
  const visualSemanticsContext = brief.visual_semantics?.length
    ? `\n**Visual Semantics (for reference):**\n${JSON.stringify(brief.visual_semantics, null, 2)}`
    : '';

  // Extract EAVs for semantic coherence check
  const eavContext = brief.eavs?.length
    ? `\n**Semantic Triples (EAVs) - ensure these are reflected:**\n${JSON.stringify(brief.eavs.slice(0, 10), null, 2)}`
    : '';

  return `You are a Senior Editor performing the FINAL polish pass on an article before publication.

${languageInstruction}

**ARTICLE TO POLISH:**
${draft}

**CONTENT BRIEF CONTEXT:**
- Target Keyword: ${brief.targetKeyword || 'Not specified'}
- Meta Description: ${brief.metaDescription || 'Not specified'}
${visualSemanticsContext}
${eavContext}

**BUSINESS CONTEXT:**
${businessContext(info)}
${getStylometryInstructions(info.authorProfile)}

---

### **POLISHING TASKS:**

1. **Smooth Transitions:** Ensure every paragraph flows naturally into the next. Add transitional phrases where needed.

2. **Consistent Voice:** Maintain the same tone, reading level, and style throughout the article.

3. **Remove Redundancy:** Eliminate repetitive phrases, sentences that add no value, and unnecessary filler words.

4. **Strengthen Weak Sentences:** Improve sentences that are passive, vague, or lack impact. Use definitive statements.

5. **Final Formatting Check:**
   - Ensure clean Markdown headers (H1, H2, H3 hierarchy)
   - **Bold** key entities and definitions for scannability
   - Ensure lists have introductory sentences ending with colons

---

### **CRITICAL PRESERVATION REQUIREMENTS:**

**IMAGE PLACEHOLDERS - COUNT BEFORE: ${imageCount}**
- You MUST preserve ALL [IMAGE: description | alt text] placeholders EXACTLY as they appear
- Do NOT modify, move, reword, remove, or merge any text matching the pattern [IMAGE: ... | ...]
- Your output MUST contain exactly ${imageCount} image placeholder(s)
- If you see [IMAGE: ...], copy it character-for-character to your output

**STRUCTURE PRESERVATION:**
- DO NOT change the heading hierarchy (H1, H2, H3 structure)
- DO NOT remove or modify any internal links [text](url)
- DO NOT remove any lists or tables - only improve their content
- DO NOT significantly shorten sections - maintain content depth

---

**OUTPUT:**
Return the fully polished, publication-ready article draft in Markdown.
Do not wrap in JSON or code blocks. Return raw Markdown only.
The article must contain exactly ${imageCount} [IMAGE: ...] placeholder(s).`;
};

/**
 * Counts image placeholders in content
 */
function countImagePlaceholders(content: string): number {
  const matches = content.match(/\[IMAGE:[^\]]+\]/g);
  return matches ? matches.length : 0;
}

/**
 * Validates that image placeholders were preserved
 */
function validateImagePreservation(before: string, after: string): { valid: boolean; beforeCount: number; afterCount: number } {
  const beforeCount = countImagePlaceholders(before);
  const afterCount = countImagePlaceholders(after);
  return {
    valid: afterCount >= beforeCount,
    beforeCount,
    afterCount
  };
}

/**
 * Execute Pass 8: Final Polish
 */
export async function executePass8(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<string> {
  console.log('[Pass 8] Starting Final Polish pass');

  // Get the assembled draft from all sections
  const sections = await orchestrator.getSections(job.id);
  const assembledDraft = orchestrator.assembleDraft(sections, brief);

  // Count images before polishing
  const imageCountBefore = countImagePlaceholders(assembledDraft);
  console.log(`[Pass 8] Image placeholders before polish: ${imageCountBefore}`);

  // Report progress
  if (onSectionProgress) {
    onSectionProgress({
      sectionKey: 'final_polish',
      status: 'processing',
      passNumber: 8
    });
  }

  // Check for abort
  if (shouldAbort?.()) {
    console.log('[Pass 8] Aborted before API call');
    throw new Error('Generation aborted by user');
  }

  // Build the polish prompt
  const prompt = FINAL_POLISH_PROMPT(assembledDraft, brief, businessInfo, imageCountBefore);

  // Call the AI service using the user's configured provider
  const polishedContent = await callProviderWithPrompt(businessInfo, prompt);

  // Validate image preservation
  const validation = validateImagePreservation(assembledDraft, polishedContent);
  if (!validation.valid) {
    console.warn(`[Pass 8] WARNING: Image count decreased from ${validation.beforeCount} to ${validation.afterCount}`);
    // Log but don't fail - the content may still be usable
  } else {
    console.log(`[Pass 8] Image preservation validated: ${validation.afterCount} images preserved`);
  }

  // Update job with polished draft
  await orchestrator.updateJob(job.id, {
    draft_content: polishedContent,
    passes_status: {
      ...job.passes_status,
      pass_8: 'completed'
    },
    current_pass: 9 // Move to audit
  });

  // Report completion
  if (onSectionProgress) {
    onSectionProgress({
      sectionKey: 'final_polish',
      status: 'completed',
      passNumber: 8
    });
  }

  console.log('[Pass 8] Final Polish complete');
  return polishedContent;
}
