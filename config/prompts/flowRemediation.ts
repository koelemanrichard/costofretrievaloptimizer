// config/prompts/flowRemediation.ts
// Prompts for content flow auditing, discourse integration, remediation, and AI task suggestions

import { BusinessInfo, ContextualFlowIssue } from '../../types';
import {
    businessContext,
    jsonResponseInstruction,
    getStylometryInstructions,
    getLanguageAndRegionInstruction,
    getLanguageName,
} from './_common';

export const AUDIT_INTRA_PAGE_FLOW_PROMPT = (text: string, centralEntity: string, info?: BusinessInfo): string => `
You are a Semantic Auditor specializing in Information Retrieval.
${info?.language ? getLanguageAndRegionInstruction(info.language, info.region) : ''}
Analyze the following text for "Vector Straightness" and "Attribute Order".
${info?.language ? `\n**IMPORTANT: All issue descriptions, remediations, and suggested text MUST be in ${getLanguageName(info.language)}. Only JSON keys remain in English.**` : ''}

**Central Entity:** "${centralEntity}"

**Text to Analyze:**
${text.substring(0, 15000)}... (Truncated for analysis)

**Audit Rules:**
1.  **Vector Straightness (Rule I.A):** Extract the H1, H2, and H3 headings. Check if they form a logical, incremental progression (e.g. Definition -> Features -> Benefits). Flag any heading that deviates from the main topic or backtracks contextually.
2.  **Attribute Order (Rule I.B):** The content should ideally present **Unique Attributes** (Specific identifiers) before **Root Attributes** (Definitions) and **Rare Attributes** (Deep details). Flag sections where deep/rare details appear before the core definition is established.

${jsonResponseInstruction}
Return a JSON object with:
- "headingVector": Array of strings showing the hierarchy (e.g. "H1: Title", "H2: Intro").
- "vectorIssues": Array of objects { "heading": string, "issue": string, "remediation": string } for headers that break flow.
- "attributeOrderIssues": Array of objects { "section": string, "issue": string, "remediation": string }.
`;

export const AUDIT_DISCOURSE_INTEGRATION_PROMPT = (text: string, info?: BusinessInfo): string => `
You are a Linguistic Auditor. Analyze the following text for "Discourse Integration".
${info?.language ? getLanguageAndRegionInstruction(info.language, info.region) : ''}
${info?.language ? `\n**IMPORTANT: All gap details, suggested bridges, and descriptive text MUST be in ${getLanguageName(info.language)}. Only JSON keys remain in English.**` : ''}

**Objective:** Ensure sequential paragraphs are semantically linked using "Anchor Segments" (mutual words, concepts, or logical connectors).

**Text to Analyze:**
${text.substring(0, 15000)}...

**Audit Logic:**
For every sequential pair of paragraphs (Para A -> Para B):
1. Check the *last sentence* of Para A.
2. Check the *first sentence* of Para B.
3. Do they share a mutual term, concept, or explicit transition?
4. If the subject changes abruptly without a bridge, it is a "Discourse Gap".

${jsonResponseInstruction}
Return a JSON object with:
- "discourseGaps": Array of numbers. Each number is the index of "Para A" in the flow where the transition to the next paragraph failed. (e.g., if Para 0 -> Para 1 fails, include 0).
- "gapDetails": Array of objects { "paragraphIndex": number, "details": "Why the transition failed", "suggestedBridge": "A phrase to link them" }.
`;

export const APPLY_FLOW_REMEDIATION_PROMPT = (originalSnippet: string, issueDetails: string, remediationInstruction: string, info: BusinessInfo): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are a Semantic Editor.
Your task is to rewrite a specific text segment to fix a semantic flow issue detected by the audit.

${languageInstruction}

**Business Context:**
${businessContext(info)}
${getStylometryInstructions(info.authorProfile)}

**The Issue:**
- **Snippet causing issue:** "${originalSnippet}"
- **Violation:** ${issueDetails}
- **Required Fix:** ${remediationInstruction}

**Instructions:**
Rewrite the snippet (and only the snippet) to resolve the issue while maintaining the original meaning and tone.
Ensure the new text bridges the gap or corrects the flow as requested.

${jsonResponseInstruction}
Return a JSON object with a single key "refinedText".
`;
};

export const BATCH_FLOW_REMEDIATION_PROMPT = (fullDraft: string, issues: ContextualFlowIssue[], info: BusinessInfo): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are a Senior Semantic Editor and Algorithmic Author.
Your goal is to rewrite the provided article draft to resolve a list of specific flow and vector violations, creating a cohesive, high-authority document.

${languageInstruction}

**Context:**
${businessContext(info)}
${getStylometryInstructions(info.authorProfile)}

**Original Draft:**
"""
${fullDraft}
"""

**Issues to Resolve (Batch):**
${issues.map((issue, idx) => `
${idx + 1}. [${issue.category}] Rule: ${issue.rule}
   - Details: ${issue.details}
   - Required Fix: ${issue.remediation}
   - Near Snippet: "${issue.offendingSnippet?.substring(0, 100)}..."
`).join('\n')}

**Instructions:**
1.  **Holistic Rewrite:** Rewrite the article to fix ALL the listed issues. Do not just patch sentences; ensure the flow between corrected sections is seamless.
2.  **Vector Straightness:** Ensure the heading order creates a logical progression (Definition -> Features -> Benefits -> etc.).
3.  **Discourse Integration:** Ensure every paragraph transition uses "Anchor Segments" (mutual words/concepts) to link the end of one thought to the start of the next.
4.  **Preserve Facts:** Do not change the core facts (EAVs) or removing valid sections that are not flagged.
5.  **Tone:** Maintain the specific stylometry defined in the context.

${jsonResponseInstruction}
Return a JSON object with a single key "polishedDraft" containing the full rewritten markdown.
`;
};

// ============================================
// AI TASK SUGGESTION PROMPTS
// ============================================

export const GENERATE_TASK_SUGGESTION_PROMPT = (
  task: { ruleId: string; title: string; description: string; remediation: string; priority: string; phase?: string },
  page: { url: string; title?: string; h1?: string; contentMarkdown?: string },
  project: { domain: string; centralEntity?: string; sourceContext?: string; centralSearchIntent?: string; language?: string; region?: string }
): string => `
You are an expert SEO consultant specializing in Holistic SEO and technical audits.
Generate a specific, actionable remediation for this audit issue.
${project.language ? `\n${getLanguageAndRegionInstruction(project.language, project.region)}` : ''}
${project.language ? `\n**OUTPUT LANGUAGE: All suggestion text, remediation instructions, and reasoning MUST be written in ${getLanguageName(project.language)}. Only JSON keys remain in English.**` : ''}

**Project Context:**
- Domain: ${project.domain}
${project.centralEntity ? `- Central Entity: ${project.centralEntity}` : ''}
${project.sourceContext ? `- Source Context: ${project.sourceContext}` : ''}
${project.centralSearchIntent ? `- Central Search Intent: ${project.centralSearchIntent}` : ''}
${project.language ? `- Content Language: ${getLanguageName(project.language)}${project.region ? ` (${project.region})` : ''}` : ''}

**Issue to Fix:**
- Rule ID: ${task.ruleId}
- Problem: ${task.title}
- Details: ${task.description}
- Current Suggestion (generic): ${task.remediation}
- Priority: ${task.priority}
${task.phase ? `- Phase: ${task.phase}` : ''}

**Page Context:**
- URL: ${page.url}
- Title: ${page.title || 'N/A'}
- H1: ${page.h1 || 'N/A'}
${page.contentMarkdown ? `
Content Excerpt (first 2000 chars):
"""
${page.contentMarkdown.slice(0, 2000)}
"""
` : ''}

**Your Task:**
Generate a SPECIFIC remediation that:
1. References actual content from this page when possible
2. Provides concrete, actionable steps (e.g., "Add H2 heading 'Benefits of X' after the introduction section")
3. Aligns with the Central Entity and Source Context if provided
4. Is immediately actionable by a content editor or developer
5. Explains WHY this specific fix will improve the page

**Quality Guidelines:**
- High confidence (80-100): Very specific suggestion with clear evidence from page content
- Medium confidence (50-79): Good suggestion but limited context available
- Low confidence (30-49): General guidance, human review strongly recommended

${jsonResponseInstruction}
Return a JSON object:
{
  "suggestedValue": "Your specific, actionable remediation text here...",
  "confidence": 85,
  "reasoning": "Brief explanation of why this suggestion is better than the generic one and how it addresses the issue..."
}
`;

export const GENERATE_BATCH_TASK_SUGGESTIONS_PROMPT = (
  tasks: Array<{
    sequence: number;
    task: { ruleId: string; title: string; description: string; remediation: string; priority: string };
    pageContext?: { url: string; title?: string; h1?: string };
  }>,
  project: { domain: string; centralEntity?: string; sourceContext?: string; language?: string; region?: string }
): string => `
You are an expert SEO consultant. Generate specific remediations for multiple audit issues.
${project.language ? `\n${getLanguageAndRegionInstruction(project.language, project.region)}` : ''}
${project.language ? `\n**OUTPUT LANGUAGE: All suggestion text, remediation instructions, and reasoning MUST be written in ${getLanguageName(project.language)}. Only JSON keys remain in English.**` : ''}

**Project Context:**
- Domain: ${project.domain}
${project.centralEntity ? `- Central Entity: ${project.centralEntity}` : ''}
${project.sourceContext ? `- Source Context: ${project.sourceContext}` : ''}
${project.language ? `- Content Language: ${getLanguageName(project.language)}${project.region ? ` (${project.region})` : ''}` : ''}

**Tasks to Process:**
${tasks.map((t, idx) => `
### Task ${idx + 1} (sequence: ${t.sequence})
- Rule: ${t.task.ruleId} - ${t.task.title}
- Details: ${t.task.description}
- Current Suggestion: ${t.task.remediation}
- Priority: ${t.task.priority}
${t.pageContext ? `- Page: ${t.pageContext.url} (Title: ${t.pageContext.title || 'N/A'}, H1: ${t.pageContext.h1 || 'N/A'})` : ''}
`).join('\n---\n')}

**Instructions:**
For each task, generate a specific, actionable suggestion that improves upon the generic remediation.

${jsonResponseInstruction}
Return a JSON array with exactly ${tasks.length} objects in sequence order:
[
  {
    "sequence": 0,
    "suggestedValue": "Specific remediation...",
    "confidence": 85,
    "reasoning": "Why this is better..."
  },
  ...
]
`;

/**
 * Context-aware task suggestion prompt for use in batch processing
 * Includes previous suggestions to ensure consistency across all recommendations
 */
export const GENERATE_CONTEXT_AWARE_TASK_SUGGESTION_PROMPT = (
  task: { ruleId: string; title: string; description: string; remediation: string; priority: string; phase?: string },
  page: { url: string; title?: string; h1?: string; contentMarkdown?: string },
  project: { domain: string; centralEntity?: string; sourceContext?: string; centralSearchIntent?: string; language?: string; region?: string },
  previousSuggestions: Array<{
    ruleId: string;
    title: string;
    suggestedValue: string;
    reasoning: string;
  }>
): string => `
You are an expert SEO consultant specializing in Holistic SEO and technical audits.
Generate a specific, actionable remediation for this audit issue.
${project.language ? `\n${getLanguageAndRegionInstruction(project.language, project.region)}` : ''}
${project.language ? `\n**OUTPUT LANGUAGE: All suggestion text, remediation instructions, and reasoning MUST be written in ${getLanguageName(project.language)}. Only JSON keys remain in English.**` : ''}

**CRITICAL: CONTEXT AWARENESS & CONSISTENCY**
You are part of a batch processing workflow. Previous suggestions have already been made for other tasks on this page.
Your suggestion MUST be consistent with and build upon these previous suggestions. DO NOT contradict them.

${previousSuggestions.length > 0 ? `
**Previous Suggestions Made (YOU MUST ALIGN WITH THESE):**
${previousSuggestions.map((ps, idx) => `
${idx + 1}. [${ps.ruleId}] ${ps.title}
   → Suggested: "${ps.suggestedValue.substring(0, 500)}${ps.suggestedValue.length > 500 ? '...' : ''}"
   → Reasoning: ${ps.reasoning}
`).join('')}

**CONSISTENCY RULES:**
- If a previous suggestion recommends a specific H1, title, or entity name, USE THAT EXACT TEXT in your suggestion
- If a previous suggestion establishes a content structure, BUILD UPON it
- If a previous suggestion defines the Central Entity framing, MAINTAIN that framing
- Your suggestion should feel like part of a UNIFIED PLAN, not an isolated fix
` : '**Note:** This is the first task in the batch. Your suggestion will set the baseline for consistency.'}

**Project Context:**
- Domain: ${project.domain}
${project.centralEntity ? `- Central Entity: ${project.centralEntity}` : ''}
${project.sourceContext ? `- Source Context: ${project.sourceContext}` : ''}
${project.centralSearchIntent ? `- Central Search Intent: ${project.centralSearchIntent}` : ''}
${project.language ? `- Content Language: ${getLanguageName(project.language)}${project.region ? ` (${project.region})` : ''}` : ''}

**Issue to Fix:**
- Rule ID: ${task.ruleId}
- Problem: ${task.title}
- Details: ${task.description}
- Current Suggestion (generic): ${task.remediation}
- Priority: ${task.priority}
${task.phase ? `- Phase: ${task.phase}` : ''}

**Page Context:**
- URL: ${page.url}
- Title: ${page.title || 'N/A'}
- H1: ${page.h1 || 'N/A'}
${page.contentMarkdown ? `
Content Excerpt (first 2000 chars):
"""
${page.contentMarkdown.slice(0, 2000)}
"""
` : ''}

**Your Task:**
Generate a SPECIFIC remediation that:
1. Is CONSISTENT with all previous suggestions listed above
2. References actual content from this page when possible
3. Provides concrete, actionable steps
4. Aligns with the Central Entity and Source Context if provided
5. Is immediately actionable by a content editor or developer
6. Explains WHY this specific fix will improve the page

**Quality Guidelines:**
- High confidence (80-100): Very specific suggestion with clear evidence from page content
- Medium confidence (50-79): Good suggestion but limited context available
- Low confidence (30-49): General guidance, human review strongly recommended

${jsonResponseInstruction}
Return a JSON object:
{
  "suggestedValue": "Your specific, actionable remediation text here...",
  "confidence": 85,
  "reasoning": "Brief explanation of why this suggestion is better than the generic one and how it aligns with other suggestions..."
}
`;
