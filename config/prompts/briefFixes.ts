/**
 * Brief Fix Prompts
 *
 * Small, focused prompts (~200 tokens each) for fixing specific
 * quality failures in generated content briefs. Used by the
 * multi-pass brief improvement service.
 *
 * @module config/prompts/briefFixes
 */

import type { ContentBrief, SemanticTriple, EnrichedTopic } from '../../types';
import { getLanguageAndRegionInstruction, jsonResponseInstruction } from './_common';

export const FIX_MISSING_SUBORDINATE_TEXT = (
  brief: ContentBrief,
  language?: string,
  region?: string
): string => `${getLanguageAndRegionInstruction(language, region)}

The following content brief sections are missing direct-answer subordinate text hints.
Add a subordinate_text_hint for each section that starts with a direct answer (not filler).

Rules:
- "What is X?" → "X is [definition]"
- "How to X?" → "To X, [first step]"
- No filler phrases like "In this section we will discuss..."

Current sections (JSON):
${JSON.stringify(
  (brief.structured_outline ?? []).map(s => ({
    heading: s.heading,
    subordinate_text_hint: s.subordinate_text_hint || null,
  })),
  null, 2
)}

${jsonResponseInstruction}
Return JSON: { "fixes": [{ "heading": "...", "subordinate_text_hint": "..." }] }`;


export const FIX_MISSING_INTERNAL_LINKS = (
  brief: ContentBrief,
  availableTopics: string[],
  language?: string,
  region?: string
): string => `${getLanguageAndRegionInstruction(language, region)}

This content brief "${brief.title}" needs internal links. Add 2-4 links.

Available topics to link to:
${availableTopics.slice(0, 15).map(t => `- "${t}"`).join('\n')}

Rules:
- targetTopic: EXACT title from the list above
- anchorText: 2-5 word natural phrase
- Place links AFTER the concept is defined, never before

${jsonResponseInstruction}
Return JSON: { "links": [{ "targetTopic": "...", "anchorText": "...", "annotation_text_hint": "...", "reasoning": "..." }] }`;


export const FIX_MISSING_FEATURED_SNIPPET = (
  brief: ContentBrief,
  topicTitle: string,
  language?: string,
  region?: string
): string => `${getLanguageAndRegionInstruction(language, region)}

Add a featured snippet target for the article "${topicTitle}".

Rules:
- Definitional ("What is X?") → PARAGRAPH (<40 words)
- Enumeration ("Types of", "Best") → LIST (3-8 items)
- Comparison ("X vs Y") → TABLE (3-5 rows)
- Process ("How to") → LIST (ordered steps)

${jsonResponseInstruction}
Return JSON: { "featured_snippet_target": { "question": "...", "answer_target_length": 40, "target_type": "PARAGRAPH|LIST|TABLE", "required_predicates": ["..."] } }`;


export const FIX_WEAK_CONTEXTUAL_BRIDGE = (
  brief: ContentBrief,
  centralEntity: string,
  language?: string,
  region?: string
): string => `${getLanguageAndRegionInstruction(language, region)}

The contextual bridge for "${brief.title}" is missing or weak. It should connect the macro context (${centralEntity}) to this article's specific scope.

Write a transition paragraph (2-3 sentences) that bridges the Central Entity to this article's topic.

${jsonResponseInstruction}
Return JSON: { "contextualBridge": { "type": "section", "content": "..." } }`;


export const FIX_MISSING_EAVS = (
  brief: ContentBrief,
  eavs: SemanticTriple[],
  language?: string,
  region?: string
): string => `${getLanguageAndRegionInstruction(language, region)}

Map the following EAV triples to sections of this brief. Each section should reference relevant EAVs by index.

EAV Triples:
${eavs.slice(0, 15).map((eav, i) =>
  `${i}. [${eav.predicate?.category || '?'}] ${eav.subject?.label || '?'} → ${eav.predicate?.relation || '?'} → ${eav.object?.value || '?'}`
).join('\n')}

Brief sections:
${(brief.structured_outline ?? []).map(s => `- "${s.heading}"`).join('\n')}

${jsonResponseInstruction}
Return JSON: { "mappings": [{ "heading": "...", "mapped_eavs": [0, 2, 5] }] }`;
