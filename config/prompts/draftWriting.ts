// config/prompts/draftWriting.ts
// Prompts for article draft generation, polishing, coherence, and section refinement

import { BusinessInfo, ContentBrief, HolisticSummary } from '../../types';
import {
    businessContext,
    jsonResponseInstruction,
    getStylometryInstructions,
    getLanguageAndRegionInstruction,
    getLanguageName,
} from './_common';

export const GENERATE_ARTICLE_DRAFT_PROMPT = (brief: ContentBrief, info: BusinessInfo): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are an expert **Algorithmic Author** and Subject Matter Expert in ${info.industry}.
Your goal is to write a high-authority article that minimizes the **Cost of Retrieval** for search engines while maximizing user value.

${languageInstruction}

**Identity & Voice:**
Author: ${info.authorProfile?.name || info.authorName || 'Expert Writer'}
${info.authorProfile?.credentials ? `Credentials: ${info.authorProfile.credentials}` : ''}
${getStylometryInstructions(info.authorProfile)}

**Content Brief:**
${JSON.stringify(brief, null, 2)}

**Business Context:**
${businessContext(info)}

---

### **STRICT ALGORITHMIC AUTHORSHIP RULES**

#### **I. FOUNDATIONAL & STRATEGIC (IDENTITY & AUTHORITY)**
1.  **Entity Focus:** Maintain strict focus on the Central Entity. Avoid tangental topics that dilute relevance.
2.  **Expert Persona:** Write from the perspective of the defined Author Profile. Leverage specific credentials or experience where appropriate to demonstrate E-E-A-T.

#### **II. LINGUISTIC DENSITY & SYNTAX**
1.  **One Fact Per Sentence:** Maximize Information Density. Adhere to a strict 'One Fact Per Sentence' rule where possible.
2.  **Short Dependency Trees:** Construct sentences with a short Dependency Tree. One Subject-Predicate-Object per sentence. Avoid overly complex compound clauses that obscure the entity relationship.
3.  **Explicit Naming (No Pronouns):** Minimize the use of ambiguous pronouns (it, they, this, that) when referring to the Central Entity. Explicitly repeat the Noun to ensure **Named Entity Recognition (NER)** tracking.

#### **III. STRUCTURE & FORMAT RULES**
1.  **Question Protection (Rule III.C):** If a heading is a question (e.g., "What is X?"), the **IMMEDIATELY** following sentence must be the direct, definitive answer. Do not start with "When looking at..." or "It is important to note...".
    *   *Bad:* "H2: What is SEO? -> There are many factors to consider..."
    *   *Good:* "H2: What is SEO? -> SEO is the process of optimizing..."
2.  **List Logic (Rule III.D):** Before any list (bulleted or numbered), provide a definitive introductory sentence stating the count or nature of the list (e.g., "The 5 key factors are:", "The following components include:").
3.  **Subordinate Text:** The first sentence of *every* section must be a high-value candidate passage.

#### **IV. SPECIFIC BRIEF REQUIREMENTS**
${brief.featured_snippet_target ? `
- **FEATURED SNIPPET TARGET:**
  - **Target Question:** "${brief.featured_snippet_target.question}"
  - **Instruction:** The section addressing this question MUST answer it **immediately** in the first sentence.
  - **Constraint:** The answer passage must be **under ${brief.featured_snippet_target.answer_target_length} words** (approx 300-350 characters).
  - **Format:** ${brief.featured_snippet_target.target_type}
  - **Required Predicates:** Use definitive verbs like "${brief.featured_snippet_target.required_predicates.join(', ')}".
` : '- Identify the core definition and answer it concisely in the first sentence (<40 words).'}

#### **V. DISCOURSE INTEGRATION (FLOW)**
- **Rule:** Use the provided \`discourse_anchors\` to transition smoothly between paragraphs.
- **Logic:** The end of Paragraph A should semantically "hook" into the start of Paragraph B using mutual keywords or concepts.
- **Anchors:** ${brief.discourse_anchors ? brief.discourse_anchors.join(', ') : 'Ensure logical semantic transitions.'}

#### **VI. VISUAL SEMANTICS**
- **Rule:** Do not describe generic images. Insert specific placeholders for the defined data visualizations.
- **Format:** \`[VISUAL: {type} - {description} - Data: {caption_data}]\`
${brief.visual_semantics ? `- **Defined Visuals:** \n${brief.visual_semantics.map(v => `  - [VISUAL: ${v.type} - ${v.description}]`).join('\n')}` : ''}

#### **VII. LINK POSITONING**
- **Rule:** Insert internal links ONLY **after** the entity or concept has been fully defined.
- **Constraint:** **NEVER** place a link in the first sentence of a paragraph. Links belong in the supporting sentences (2nd or 3rd).

---

**Output Format:**
- Return the full article text in Markdown.
- Use standard H1, H2, H3 tags.
- Bold the **Answer**, not the keyword.
`;
};

export const POLISH_ARTICLE_DRAFT_PROMPT = (draft: string, brief: ContentBrief, info: BusinessInfo): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are a Senior Editor and Content Finisher.
Your goal is to prepare this draft for final publication (Pass 2 Polish).

${languageInstruction}

**Input Draft:**
${draft}

**Original Brief:**
${JSON.stringify(brief, null, 2)}

**Business Context:**
${businessContext(info)}
${getStylometryInstructions(info.authorProfile)}

---

### **POLISHING INSTRUCTIONS**

1.  **Rewrite Introduction:** Now that the content body is complete, rewrite the introduction to be a perfect abstractive summary of what follows. It must align perfectly with the final content.
2.  **Convert to HTML Structures:**
    *   Identify dense paragraphs that list items. Convert them to **Markdown Lists** (bullets or numbered).
    *   Identify comparative sections. Convert them to **Markdown Tables**.
    *   Ensure lists are preceded by a definitive sentence ending in a colon.
3.  **Insert Visual Placeholders:**
    *   Review the text for complex concepts.
    *   Insert \`[IMAGE: description]\` markers where a visual would aid comprehension.
    *   Ensure \`visual_semantics\` from the brief are represented if not already present.
4.  **Review First Sentences:**
    *   Scan the first sentence of every H2/H3 section.
    *   Ensure it is a definitive statement ("X is Y").
    *   Remove "fluff" transitions ("Turning to the next point...").
5.  **Formatting:**
    *   Ensure clean Markdown headers (H1, H2, H3).
    *   **Bold** key entities and definitions for scannability.

**Output:**
Return the fully polished, publication-ready article draft in Markdown. Do not wrap in JSON. Return raw Markdown.
`;
};

/**
 * Prompt for polishing a single section of the draft (chunked processing).
 * Used when the full draft is too large to process at once.
 */
export const POLISH_SECTION_PROMPT = (
    sectionContent: string,
    sectionIndex: number,
    totalSections: number,
    adjacentContext: { prev?: string; next?: string },
    brief: ContentBrief,
    info: BusinessInfo
): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are a Senior Editor and Content Finisher.
Your task is to polish a single section of an article for publication.

${languageInstruction}

**Section ${sectionIndex + 1} of ${totalSections}:**
${sectionContent}

${adjacentContext.prev ? `**Context - Previous Section (excerpt):**\n${adjacentContext.prev.substring(0, 500)}...\n` : ''}
${adjacentContext.next ? `**Context - Next Section (excerpt):**\n${adjacentContext.next.substring(0, 500)}...\n` : ''}

**Article Title:** ${brief.title}
**Target Keyword:** ${brief.targetKeyword || 'N/A'}

**Business Context:**
${businessContext(info)}
${getStylometryInstructions(info.authorProfile)}

---

### **POLISHING INSTRUCTIONS**

1.  **${sectionIndex === 0 ? 'Introduction Polish' : 'Section Polish'}:**
    ${sectionIndex === 0
        ? '- This is the introduction. Ensure it provides a compelling abstractive summary.'
        : '- Polish the section content while maintaining its core meaning and structure.'}
2.  **Convert to HTML Structures:**
    *   Identify dense paragraphs that list items. Convert them to **Markdown Lists**.
    *   Identify comparative sections. Convert them to **Markdown Tables**.
3.  **Review First Sentence:**
    *   Ensure the first sentence is definitive ("X is Y").
    *   Remove "fluff" transitions.
4.  **Formatting:**
    *   **Bold** key entities and definitions for scannability.
    *   Ensure proper Markdown formatting.

**Output:**
Return ONLY the polished section content in Markdown. Do not add commentary. Do not wrap in JSON.
Preserve the section's heading (H2/H3) at the start.
`;
};

/**
 * Generate a holistic summary of the document for context-aware section polishing.
 * Used when full document polish times out and we need to fall back to section-by-section processing.
 */
export const HOLISTIC_SUMMARY_PROMPT = (
    draft: string,
    brief: ContentBrief,
    info: BusinessInfo
): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are analyzing a content piece for "${brief.title}" about ${brief.targetKeyword}.

${languageInstruction}

**Your Task:**
Analyze this draft and extract its holistic characteristics to preserve coherence when polishing sections individually.

**Draft to analyze:**
${draft}

**Extract the following:**
1. **KEY THEMES**: The 3-5 main arguments or themes in this article
2. **WRITING VOICE**: Describe the tone, style, and vocabulary level (formal/informal, technical/accessible, etc.)
3. **CORE TERMINOLOGY**: List 8-12 key terms/phrases that appear consistently and must be maintained
4. **SEMANTIC ANCHORS**: List 3-5 concepts that tie sections together (recurring ideas, central entities)
5. **STRUCTURAL FLOW**: Briefly describe how sections relate to each other (e.g., "builds from basics to advanced", "problem-solution pairs")

${jsonResponseInstruction}

Return a JSON object with these exact keys:
{
  "themes": ["theme1", "theme2", ...],
  "voice": "description of writing style",
  "terminology": ["term1", "term2", ...],
  "semanticAnchors": ["concept1", "concept2", ...],
  "structuralFlow": "description of how sections connect"
}
`;
};

/**
 * Polish a section with holistic context preserved.
 * Used as part of the hierarchical fallback when full document polish times out.
 */
export const POLISH_SECTION_WITH_CONTEXT_PROMPT = (
    section: string,
    sectionIndex: number,
    totalSections: number,
    holisticSummary: HolisticSummary,
    adjacentContext: { previous?: string; next?: string },
    brief: ContentBrief,
    info: BusinessInfo
): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are polishing section ${sectionIndex + 1} of ${totalSections} for an article about "${brief.targetKeyword}".

${languageInstruction}

**GLOBAL CONTEXT (maintain throughout):**
- **Themes:** ${holisticSummary.themes.join(', ')}
- **Voice:** ${holisticSummary.voice}
- **Key terms to use consistently:** ${holisticSummary.terminology.join(', ')}
- **Semantic anchors:** ${holisticSummary.semanticAnchors.join(', ')}
- **Structural flow:** ${holisticSummary.structuralFlow}

${adjacentContext.previous ? `**PREVIOUS SECTION (last 500 chars for continuity):**
...${adjacentContext.previous}` : ''}

**SECTION TO POLISH:**
${section}

${adjacentContext.next ? `**NEXT SECTION (first 500 chars for transition):**
${adjacentContext.next}...` : ''}

**Business Context:**
${businessContext(info)}
${getStylometryInstructions(info.authorProfile)}

---

### **POLISHING INSTRUCTIONS**

1. **Maintain Global Coherence:**
   - Use the terminology listed above consistently
   - Reinforce the semantic anchors where naturally relevant
   - Match the voice and tone described above

2. **Smooth Transitions:**
   ${adjacentContext.previous ? '- Ensure this section flows naturally from the previous one' : '- Create a strong opening as this is near the start'}
   ${adjacentContext.next ? '- Set up a natural transition to the next section' : '- Create a satisfying conclusion as this is near the end'}

3. **Polish Content:**
   - Apply Holistic SEO principles
   - Use definitive first sentences
   - Bold key entities
   - Ensure proper Markdown formatting

**Output:**
Return ONLY the polished section content in Markdown. Do not add commentary. Do not wrap in JSON.
Preserve the section's heading (H2/H3) at the start.
`;
};

/**
 * Lightweight coherence pass to fix discontinuities after reassembling polished sections.
 * Used as the final step of hierarchical polish fallback.
 */
export const COHERENCE_PASS_PROMPT = (
    reassembledDraft: string,
    holisticSummary: HolisticSummary,
    brief: ContentBrief,
    info: BusinessInfo
): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are reviewing a reassembled article for "${brief.targetKeyword}" that was polished section-by-section.
Your task is to make LIGHT EDITS ONLY to ensure coherence.

${languageInstruction}

**Expected characteristics (from original analysis):**
- **Themes:** ${holisticSummary.themes.join(', ')}
- **Voice:** ${holisticSummary.voice}
- **Key terminology:** ${holisticSummary.terminology.slice(0, 8).join(', ')}
- **Structural flow:** ${holisticSummary.structuralFlow}

**Draft to review:**
${reassembledDraft}

---

### **COHERENCE REVIEW INSTRUCTIONS**

Make MINIMAL changes. Only fix:

1. **Transition smoothness:** Fix jarring jumps between sections
2. **Terminology consistency:** Ensure key terms are used consistently
3. **Thematic continuity:** Ensure themes flow logically throughout
4. **Tonal consistency:** Fix any jarring shifts in voice or style

**DO NOT:**
- Rewrite entire sections
- Add significant new content
- Change the article structure
- Remove important information

**Output:**
Return the coherence-checked draft in full Markdown. Make only the minimal edits needed for smooth reading.
`;
};

export const REFINE_DRAFT_SECTION_PROMPT = (originalText: string, violationType: string, instruction: string, info: BusinessInfo): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are an expert Editor and Algorithmic Author.
Your task is to rewrite a specific text segment to fix a detected authorship violation.

${languageInstruction}

**Violation Detected:** ${violationType}
**Specific Instruction:** ${instruction}

**Original Text:**
"${originalText}"

**Business Context:**
${businessContext(info)}
${getStylometryInstructions(info.authorProfile)}

**Rules:**
1.  Rewrite ONLY the provided text segment. Do not add commentary.
2.  Fix the violation completely while maintaining the original meaning.
3.  Ensure the tone matches the author's stylometry.

${jsonResponseInstruction}
Return a JSON object with a single key "refinedText".
`;
};

/**
 * Generate section-by-section draft content for multi-pass content generation
 */
export const GENERATE_SECTION_DRAFT_PROMPT = (
  section: { key: string; heading: string; level: number; subordinateTextHint?: string; methodologyNote?: string },
  brief: ContentBrief,
  info: BusinessInfo,
  allSections: { heading: string }[]
): string => {
  // Extract SERP-related data from brief
  const serpPAA = brief.serpAnalysis?.peopleAlsoAsk || [];
  const serpHeadings = brief.serpAnalysis?.competitorHeadings || [];
  const perspectives = brief.perspectives || [];
  const contextualVectors = brief.contextualVectors || [];

  return `
You are an expert content writer following the Holistic SEO framework.

**CRITICAL LANGUAGE REQUIREMENT**: Write ALL content in ${getLanguageName(info.language)}. Target market: ${info.targetMarket || 'Global'}. Do NOT write in English unless that is the specified language.

Write ONLY the content for this specific section. Do NOT include the heading itself - just the body text.

## Section to Write
Heading: ${section.heading}
Level: H${section.level}
${section.subordinateTextHint ? `**MANDATORY FIRST SENTENCE STRUCTURE**: ${section.subordinateTextHint}` : ''}
${section.methodologyNote ? `**FORMAT REQUIREMENT**: ${section.methodologyNote}` : ''}

## Article Context
Title: ${brief.title}
Central Entity: ${info.seedKeyword}
Meta Description: ${brief.metaDescription}
Key Takeaways: ${brief.keyTakeaways?.join(', ') || 'N/A'}
Search Intent: ${brief.searchIntent || 'informational'}
${perspectives.length > 0 ? `Perspectives to Include: ${perspectives.join(', ')}` : ''}

## Full Article Structure (for context only - stay focused on YOUR section)
${allSections.map((s, i) => `${i + 1}. ${s.heading}`).join('\n')}

${serpPAA.length > 0 ? `## Related Questions (Optional - ONLY if directly relevant to "${section.heading}")
${serpPAA.slice(0, 3).map(q => `- ${q}`).join('\n')}` : ''}

${serpHeadings.length > 0 ? `## Competitor Angles (Optional reference only)
${serpHeadings.slice(0, 3).map(h => `- ${h}`).join('\n')}` : ''}

${contextualVectors.length > 0 ? `## Contextual Themes (weave in naturally)
${contextualVectors.slice(0, 3).join(', ')}` : ''}

${businessContext(info)}

## STRICT WRITING RULES
1. **STAY ON TOPIC**: Write ONLY about "${section.heading}". Do NOT introduce topics covered in other sections. Do NOT add tangential information.
2. **FOLLOW THE BRIEF**: If a "MANDATORY FIRST SENTENCE STRUCTURE" is provided, your first sentence MUST follow that exact pattern.
3. **COMPLETE YOUR THOUGHTS**: Every sentence must be complete. Never end mid-sentence or trail off.
4. **LANGUAGE**: Write entirely in ${getLanguageName(info.language)}. Match native speaker quality for ${info.targetMarket || 'the target market'}.
5. **Varied Openings**: Start the section DIFFERENTLY from typical patterns - use questions, statistics, scenarios, comparisons, or direct statements.
6. **EAV Density**: Each sentence must contain an Entity-Attribute-Value triple about "${section.heading}"
7. **Subject Positioning**: "${info.seedKeyword}" should be the grammatical SUBJECT in some sentences
8. **No Fluff**: Avoid filler words like "also", "basically", "very", "maybe", "actually"
9. **Modality**: Use definitive verbs ("is", "are") not uncertainty ("can be", "might")
10. **Information Density**: Every sentence must add a new fact relevant to this section

${getStylometryInstructions(info.authorProfile)}

Write 150-300 words of content for this section in ${getLanguageName(info.language)}. Output ONLY the prose content, no headings or metadata.

CRITICAL CONSTRAINTS:
- Write ONLY about the topic indicated by the heading "${section.heading}"
- Do NOT mention schema markup, structured data, or technical SEO unless the heading specifically covers those topics
- Do NOT preview or discuss content from other sections in the article structure
- COMPLETE every sentence - never leave thoughts unfinished
- Write in ${getLanguageName(info.language)} with native-level fluency
`;
};
