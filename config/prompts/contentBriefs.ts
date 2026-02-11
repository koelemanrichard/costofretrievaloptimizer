// config/prompts/contentBriefs.ts
// Prompts for content brief generation, response codes, merge opportunities, and brief editing

import { BusinessInfo, SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, ResponseCode, BriefSection } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import { MarketPatterns } from '../../types/competitiveIntelligence';
import {
    businessContext,
    jsonResponseInstruction,
    getMarketDataPromptSection,
    getStylometryInstructions,
    condenseBriefForPromptFull,
    getLanguageAndRegionInstruction,
    getLanguageName,
    shouldApplyMonetizationEnhancement,
    getMonetizationPromptEnhancement,
} from './_common';

export const SUGGEST_RESPONSE_CODE_PROMPT = (info: BusinessInfo, topicTitle: string): string => `
You are an expert content strategist. For the given topic title, suggest the most effective "Response Code" (content template).

Topic Title: "${topicTitle}"

Available Response Codes:
- DEFINITION: Explains "What is X?".
- PROCESS: Provides step-by-step "How to..." instructions.
- COMPARISON: Compares "X vs Y".
- LIST: A listicle, "Top 10...".
- INFORMATIONAL: A general overview of a concept.
- PRODUCT_SERVICE: Describes a product or service.
- CAUSE_EFFECT: Explains causes and consequences.
- BENEFIT_ADVANTAGE: Focuses on positive outcomes.

${businessContext(info)}

${jsonResponseInstruction}
Respond with a JSON object containing "responseCode" and "reasoning".
`;

export const GENERATE_CONTENT_BRIEF_PROMPT = (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, knowledgeGraph: KnowledgeGraph, responseCode: ResponseCode, marketPatterns?: MarketPatterns, eavs?: SemanticTriple[]): string => {
    // Extract up to 30 topic-relevant nodes from knowledge graph (sorted by relevance to current topic)
    const kgContext = knowledgeGraph
        ? (() => {
            const allNodes = Array.from(knowledgeGraph.getNodes().values());
            const topicTerms = [topic.title, topic.canonical_query, topic.attribute_focus]
              .filter(Boolean).map(s => s!.toLowerCase());

            // Score nodes by relevance to this specific topic
            const scored = allNodes.map(n => {
              const termLower = n.term.toLowerCase();
              let relevance = 0;
              for (const t of topicTerms) {
                if (t.includes(termLower) || termLower.includes(t)) relevance += 3;
                else if (t.split(/\s+/).some((w: string) => w.length > 2 && termLower.includes(w))) relevance += 1;
              }
              return { node: n, relevance };
            });

            const topNodes = scored
              .sort((a, b) => b.relevance - a.relevance || a.node.term.localeCompare(b.node.term))
              .slice(0, 30)
              .map(s => ({ term: s.node.term }));

            return JSON.stringify(topNodes, null, 2);
          })()
        : "No Knowledge Graph available.";

    // Format EAVs for prompt inclusion
    const eavContext = eavs && eavs.length > 0
        ? `\n**Semantic Triples (Entity-Attribute-Value) for this topic:**\n${eavs.slice(0, 30).map((eav, i) => {
            const category = eav.predicate?.category || 'UNCLASSIFIED';
            return `${i + 1}. [${category}] ${eav.subject?.label || '?'} → ${eav.predicate?.relation || '?'} → ${eav.object?.value || '?'}`;
          }).join('\n')}\n\nYou MUST incorporate these semantic triples into the structured_outline. Each section should map to at least one triple. Prioritize UNIQUE and ROOT triples in early sections. Populate the brief's 'eavs' field with these triples.\n`
        : '';

    const userContextInstruction = topic.metadata?.userContext ? `\n**USER GUIDANCE:** The user specifically requested: "${topic.metadata.userContext}". Ensure the brief aligns with this intent.` : "";

    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    const marketDataSection = getMarketDataPromptSection(marketPatterns);

    return `
You are an expert Algorithmic Architect and Holistic SEO Strategist.
Your goal is to generate a content brief that strictly minimizes the **Cost of Retrieval** for search engines.
You do not write generic outlines. You engineer data structures for information retrieval.

${languageInstruction}
${marketDataSection}

**Target Topic:** "${topic.title}"
**Description:** "${topic.description}"
**Response Code:** ${responseCode}
${userContextInstruction}

${businessContext(info)}
**SEO Pillars:** ${JSON.stringify(pillars, null, 2)}
**Knowledge Graph Context:** ${kgContext}
**Available Topics for Linking (with relationships):**
${allTopics.slice(0, 20).map(t => {
  const isParent = topic.parent_topic_id === t.id;
  const isSibling = topic.parent_topic_id && topic.parent_topic_id === t.parent_topic_id && t.id !== topic.id;
  const isChild = t.parent_topic_id === topic.id;
  const isSelf = t.id === topic.id;
  if (isSelf) return null;
  const relationship = isParent ? 'PARENT' : isChild ? 'CHILD' : isSibling ? 'SIBLING' : 'RELATED';
  return `- "${t.title}" [${relationship}] (${t.type || 'topic'})`;
}).filter(Boolean).join('\n')}
Prioritize PARENT and SIBLING topics for internal links. CHILD topics are good for "learn more" links.
${eavContext}
---

### **STRICT EXECUTION RULES**

#### **I. FOUNDATIONAL STRATEGY & ENTITY ALIGNMENT**
1.  **Central Entity Focus (Rule I.A):** Every heading and sub-heading must modify the Central Entity ("${pillars.centralEntity}"). Reject broad generalizations.
2.  **Source Context Alignment (Rule I.B):** Filter attributes based on the Source Context ("${pillars.sourceContext}"). Only include attributes relevant to the monetization intent (e.g., if context is "Enterprise", exclude "Free" or "Cheap").
3.  **Attribute Prioritization (Rule I.D):** Structure the 'outline' to prioritize **Unique Attributes** (definitive features/IDs) FIRST, followed by **Root Attributes** (Definitions/Nature), then **Rare Attributes** (Specific details).
4.  **EAV-Section Mapping (Rule I.E):** For each section in 'structured_outline', include a 'mapped_eavs' field listing which Semantic Triples (by index from the list above) that section is responsible for covering. Every UNIQUE and ROOT triple MUST appear in at least one section's mapped_eavs. Example: { "heading": "Robot Materials", "mapped_eavs": [2, 5, 8] }

#### **II. STRUCTURE & FLOW**
1.  **Contextual Vector (Rule II.B):** Ensure a strictly ordered heading hierarchy (H1 -> H2 -> H3) that creates a logical dependency chain.
2.  **The Contextual Bridge (Rule II.D):** You MUST define a specific 'contextualBridge' object. This is a dedicated section (transition paragraph) that bridges the **Macro Context** (The Site's Core Entity) to the **Micro Context** (This Article's Topic).
3.  **Subordinate Text (Rule II.F):** For every H2/H3 in the 'structured_outline', provide a 'subordinate_text_hint'. This MUST dictate the syntax of the *very first sentence* (e.g., "Define [Topic] as [Category] that [Function]...").
4.  **Introductory Summary (Rule II.E):** Mandate an abstractive summary at the start.
5.  **Discourse Anchor Sequence (Rule II.G):** For each section transition, define in 'discourse_anchor_sequence':
    - Which section leads to which (from_section -> to_section)
    - The bridging concept that connects them
    - Key terms that should appear in the transition sentence
    - Type of transition (elaboration, contrast, cause_effect, sequence, example, summary)

#### **III. LINGUISTIC DIRECTIVES**
1.  **Explicit Naming (Rule III.D):** Instruct the writer to use **Explicit Naming**. Strictly FORBID ambiguous pronouns ("it", "they", "this") when referring to the Central Entity.
2.  **No Opinion (Rule III.G):** Strictly FORBID subjective phrases ("I think", "In my opinion", "Ideally"). Require declarative facts.
3.  **Discourse Integration (Rule III.H):** Generate a list of 'discourse_anchors'. These are specific mutual words/phrases to use at the end of Paragraph A and the start of Paragraph B to ensure flow.
4.  **Featured Snippet Target (Rule III.C):** Identify the SINGLE most important question this article answers. Define it as the 'featured_snippet_target'. The answer target length must be < 40 words.

#### **IV. VISUAL SEMANTICS (Pixels, Letters, and Bytes Framework)**
1.  **Data over Photos (Rule IV.A):** Do not request generic stock photos. Populate 'visual_semantics' with specific descriptions of **Infographics**, **Charts**, or **Data Tables** that represent the EAVs.
2.  **Centerpiece Alignment (Rule IV.B):** Each image MUST reinforce the page's centerpiece annotation. Include at least one entity name in the description.
3.  **Alt Text Requirements (Rule IV.C):**
    - Alt text must contain at least one entity name from the topic
    - Use vocabulary that EXTENDS the page content (synonyms, related terms NOT in headings)
    - Keep under 125 characters, natural language flow
    - Describe both visual content AND contextual purpose
4.  **File Naming Convention (Rule IV.D):** Specify filenames following pattern: [primary-entity]-[descriptor]-[context].jpg
5.  **Image Placement (Rule IV.E):** NEVER suggest placing an image between a heading and its first paragraph. Images go AFTER the definitional text.
6.  **Hero Image (Rule IV.F):** For transactional/monetization topics, specify a hero image that demonstrates the service/product with strong entity relevance.
7.  **Expected Image Types (Rule IV.G):** Based on search intent, suggest appropriate image types:
    - Informational: Diagrams, infographics, process charts, data visualizations
    - Transactional: Product photos, before/after, trust badges, team photos
    - Commercial: Comparison tables, feature matrices, pricing visuals
8.  **Visual Placement Anchoring (Rule IV.H):** For each image in visual_semantics, specify in 'visual_placement_map':
    - Which section heading it belongs under
    - Which entity mention it anchors to
    - Which EAV triple it illustrates (if applicable)
    - Rationale for placement (why here, not elsewhere)

#### **V. INTERLINKING**
1.  **Post-Definition Linking (Rule V.C):** In the 'contextualBridge' instructions, specify that links must be placed *after* the entity has been defined, never in the first sentence of a paragraph.
2.  **Generate 2-4 Internal Links (Rule V.A):** You MUST populate the 'contextualBridge.links' array with 2-4 internal link suggestions. For each link:
    - **targetTopic**: Use the EXACT topic title from "Available Topics for Linking" - copy it exactly, no modifications or explanations
    - **anchorText**: Write a SHORT natural anchor phrase (2-5 words ONLY) that can be used as clickable hyperlink text. Example: "semantic content strategy" or "topical map structure"
    - **annotation_text_hint**: Provide context on where this link should be placed
    - **reasoning**: Explain why this link adds value for the reader's journey
3.  **Semantic Relevance (Rule V.B):** Prioritize links to topics that share semantic overlap with this article. Sibling topics and parent topics are ideal candidates.
4.  **CRITICAL**: targetTopic MUST be a verbatim copy of a topic title from the available list. anchorText MUST be 2-5 words only.

#### **VI. FORMAT CODE ASSIGNMENT**
1.  **[FS] Featured Snippet**: Assign to the primary definition/answer section. 40-50 words max.
2.  **[PAA] People Also Ask**: Assign to FAQ-style questions.
3.  **[LISTING]**: Assign when listing features, steps, benefits, etc.
4.  **[DEFINITIVE]**: Assign to comprehensive explanations.
5.  **[TABLE]**: Assign to comparative data sections.
6.  **[PROSE]**: Default for standard prose sections.

#### **VII. ATTRIBUTE CATEGORY CLASSIFICATION**
For each section in 'structured_outline', classify using 'attribute_category':
- **ROOT**: Core defining attributes (definitions, what is, overview)
- **UNIQUE**: Differentiating features (vs competitors, unique aspects)
- **RARE**: Specific/technical details (specifications, advanced usage)
- **COMMON**: General/shared attributes (general info, context)

---

### **OUTPUT JSON STRUCTURE**

**CRITICAL: The 'structured_outline' field is MANDATORY and MUST be included with at least 5-8 sections. Do NOT skip this field.**

Respond with a SINGLE valid JSON object. Generate the 'structured_outline' FIRST as it is the most important field:

{
  "structured_outline": [
    {
      "heading": "string (H2/H3 heading text)",
      "level": 2,
      "format_code": "FS | PAA | LISTING | DEFINITIVE | TABLE | PROSE",
      "attribute_category": "ROOT | UNIQUE | RARE | COMMON",
      "content_zone": "MAIN | SUPPLEMENTARY",
      "subordinate_text_hint": "string (First-sentence syntax instruction)",
      "methodology_note": "string",
      "required_phrases": ["string"],
      "anchor_texts": [{ "phrase": "string", "target_topic_id": "string" }],
      "mapped_eavs": [0, 1, 2]
    }
  ],
  "title": "string",
  "slug": "string",
  "metaDescription": "string (Must include Central Search Intent)",
  "keyTakeaways": ["string", "string", "string"],
  "outline": "string (Markdown format)",
  "query_type_format": "string (e.g. 'Ordered List', 'Comparison Table', 'Prose')",
  "perspectives": ["string", "string"],
  "methodology_note": "string",
  "featured_snippet_target": {
    "question": "string",
    "answer_target_length": 40,
    "required_predicates": ["string"],
    "target_type": "PARAGRAPH"
  },
  "visual_semantics": [
    {
      "type": "INFOGRAPHIC | CHART | DIAGRAM",
      "description": "string",
      "caption_data": "string"
    }
  ],
  "visual_placement_map": [
    {
      "section_heading": "Section title where image appears",
      "entity_anchor": "The entity name mentioned near image",
      "eav_reference": { "subject": "Entity", "predicate": "attribute", "object": "value" },
      "image_type": "data_visualization|comparison_table|process_diagram|infographic|photograph|screenshot",
      "placement_rationale": "Why this image supports this entity mention"
    }
  ],
  "discourse_anchors": ["string", "string"],
  "discourse_anchor_sequence": [
    {
      "from_section": "Previous section heading",
      "to_section": "Next section heading",
      "bridge_concept": "The concept linking these sections",
      "transition_terms": ["term1", "term2"],
      "transition_type": "elaboration|contrast|cause_effect|sequence|example|summary"
    }
  ],
  "serpAnalysis": {
    "peopleAlsoAsk": ["string"],
    "competitorHeadings": [],
    "avgWordCount": 1500,
    "avgHeadings": 8,
    "commonStructure": "Introduction, Overview, Key Features, Implementation, Examples, FAQ, Conclusion",
    "contentGaps": ["string - topics competitors miss"]
  },
  "visuals": {
    "featuredImagePrompt": "string",
    "imageAltText": "string"
  },
  "contextualVectors": [],
  "contextualBridge": {
    "type": "section",
    "content": "string (The transition paragraph text that bridges macro context to this article's micro context)",
    "links": [
      {
        "targetTopic": "EXACT topic title from Available Topics list - NO reasoning, NO embellishments, JUST the title",
        "anchorText": "2-5 word anchor phrase (REQUIRED - this is the clickable hyperlink text, e.g. 'semantic content strategy')",
        "annotation_text_hint": "Context sentence explaining where this link fits",
        "reasoning": "Why this link adds value for the reader"
      }
    ]
  },
  "predicted_user_journey": "string"
}

**CRITICAL REQUIREMENTS:**
1. **structured_outline** MUST contain 5-8 detailed section objects. This is the most critical field.
2. **serpAnalysis.avgWordCount** MUST be a realistic word count estimate (typically 1500-3000 based on topic complexity). Do NOT skip this field.
3. **serpAnalysis.avgHeadings** MUST be a realistic heading count estimate (typically 6-12).
4. **contextualBridge.links** MUST contain 2-4 internal link suggestions to related topics from the "Available Topics for Linking" list.

All of these fields are MANDATORY and will cause brief validation to fail if missing or empty.

${shouldApplyMonetizationEnhancement(topic.topic_class) ? getMonetizationPromptEnhancement(info.language || 'English') : ''}

${jsonResponseInstruction}
`;
};

export const FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT = (info: BusinessInfo, selectedTopics: EnrichedTopic[]): string => `
You are an expert SEO strategist. Analyze the following selected topics. Determine if they are semantically redundant and should be merged.

Selected Topics:
${JSON.stringify(selectedTopics, null, 2)}

${businessContext(info)}

**Canonical Query Analysis:**
Identify the "Canonical Query" (User Search Intent) that these topics share. A merge is valid ONLY if both topics target the same intent cluster.

If a merge is recommended:
- Provide "reasoning".
- Provide "newTopic" (title, description).
- Include "topicIds", "topicTitles".
- Include "canonicalQuery".

If no merge is recommended, return an empty object for "newTopic".

${jsonResponseInstruction}
Respond with a single JSON object.
`;

// === BRIEF EDITING PROMPTS ===

export const REGENERATE_BRIEF_PROMPT = (
  info: BusinessInfo,
  topic: EnrichedTopic,
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[]
): string => `
You are an expert Algorithmic Architect and Holistic SEO Strategist.
The user has reviewed their existing content brief and wants specific changes.

**LANGUAGE: ${getLanguageName(info.language)} | Target Market: ${info.targetMarket || 'Global'}**

## Current Brief (condensed for reference - ${currentBrief.structured_outline?.length || 0} sections)
${condenseBriefForPromptFull(currentBrief)}

## User's Feedback & Instructions
"${userInstructions}"

## Context
${businessContext(info)}
**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

**Available Topics for Internal Linking:** ${allTopics.map(t => t.title).join(', ')}

---

## Your Task
Regenerate the content brief incorporating the user's feedback. You MUST:

1. **Address User Feedback Directly**: Make the specific changes the user requested
2. **CRITICAL - PRESERVE SECTIONS**: The current brief has ${currentBrief.structured_outline?.length || 0} sections.
   - You MUST return a complete structured_outline array with sections
   - Modify sections per user feedback, but DO NOT return an empty array
   - If user wants to remove sections, only remove those specifically mentioned
   - If unsure, keep all existing sections and modify them
3. **Maintain Framework Rules**:
   - Central Entity Focus: Every heading modifies "${pillars.centralEntity}"
   - Source Context Alignment: Filter for "${pillars.sourceContext}"
   - Attribute Priority: UNIQUE → ROOT → RARE → COMMON ordering
4. **Preserve Quality**: Keep format_codes, subordinate_text_hints, and methodology_notes
5. **Keep Language**: All content in ${getLanguageName(info.language)}

${getStylometryInstructions(info.authorProfile)}

${jsonResponseInstruction}

Return the complete regenerated brief as a JSON object with this structure:
{
  "title": "string",
  "slug": "string",
  "metaDescription": "string (155 chars max)",
  "keyTakeaways": ["string", "string", "string"],
  "outline": "string (markdown format)",
  "structured_outline": [
    {
      "heading": "string",
      "level": number,
      "format_code": "FS | PAA | LISTING | DEFINITIVE | TABLE | PROSE",
      "attribute_category": "ROOT | UNIQUE | RARE | COMMON",
      "content_zone": "MAIN | SUPPLEMENTARY",
      "subordinate_text_hint": "string",
      "methodology_note": "string",
      "required_phrases": ["string"],
      "anchor_texts": [{ "phrase": "string", "target_topic_id": "string" }]
    }
  ],
  "perspectives": ["string"],
  "methodology_note": "string",
  "featured_snippet_target": {
    "question": "string",
    "answer_target_length": number,
    "required_predicates": ["string"],
    "target_type": "PARAGRAPH | LIST | TABLE"
  },
  "visual_semantics": [
    { "type": "INFOGRAPHIC | CHART | PHOTO | DIAGRAM", "description": "string", "caption_data": "string" }
  ],
  "discourse_anchors": ["string"],
  "serpAnalysis": {
    "peopleAlsoAsk": ["string"],
    "competitorHeadings": [],
    "avgWordCount": 1500,
    "avgHeadings": 8,
    "commonStructure": "string",
    "contentGaps": ["string"]
  },
  "contextualBridge": {
    "type": "section",
    "content": "string",
    "links": [{ "targetTopic": "string", "anchorText": "string", "annotation_text_hint": "string", "reasoning": "string" }]
  },
  "predicted_user_journey": "string",
  "query_type_format": "string"
}

**CRITICAL REQUIREMENTS:**
1. **structured_outline** MUST contain sections. DO NOT return empty.
2. **serpAnalysis.avgWordCount** MUST be a realistic word count estimate (1500-3000).
3. **contextualBridge.links** MUST contain 2-4 internal link suggestions.
`;

/**
 * Refine a single section of a content brief based on user instruction
 */
export const REFINE_BRIEF_SECTION_PROMPT = (
  section: BriefSection,
  userInstruction: string,
  briefContext: ContentBrief,
  info: BusinessInfo
): string => `
You are an expert Holistic SEO Strategist editing a single section of a content brief.

**LANGUAGE: ${getLanguageName(info.language)} | Target Market: ${info.targetMarket || 'Global'}**

## Current Section
${JSON.stringify(section, null, 2)}

## User's Instruction
"${userInstruction}"

## Brief Context (for coherence)
- Title: ${briefContext.title}
- Seed Keyword: ${info.seedKeyword}
- Other Sections: ${briefContext.structured_outline?.map(s => s.heading).join(' → ') || 'N/A'}
- Key Takeaways: ${briefContext.keyTakeaways?.join(', ') || 'N/A'}

${businessContext(info)}

---

## Your Task
Refine this section based on the user's instruction while maintaining:

1. **Holistic SEO Framework Rules**:
   - Central Entity as subject where appropriate
   - format_code compliance (FS=40-50 words, LISTING=preamble required, etc.)
   - attribute_category alignment (ROOT for definitions, UNIQUE for differentiators, etc.)

2. **Section Coherence**:
   - subordinate_text_hint must dictate first sentence syntax
   - methodology_note must include format code and required phrases
   - Keep heading hierarchy logical (level 2 = H2, level 3 = H3)

3. **Language**: All content in ${getLanguageName(info.language)}

${getStylometryInstructions(info.authorProfile)}

${jsonResponseInstruction}

Return the refined section as a JSON object:
{
  "heading": "string",
  "level": number,
  "format_code": "FS | PAA | LISTING | DEFINITIVE | TABLE | PROSE",
  "attribute_category": "ROOT | UNIQUE | RARE | COMMON",
  "content_zone": "MAIN | SUPPLEMENTARY",
  "subordinate_text_hint": "string (first sentence syntax instruction)",
  "methodology_note": "string (formatting notes with codes)",
  "required_phrases": ["string"],
  "anchor_texts": [{ "phrase": "string", "target_topic_id": "string" }]
}
`;

/**
 * Generate a new section to insert into a content brief
 */
export const GENERATE_NEW_SECTION_PROMPT = (
  insertPosition: number,
  parentHeading: string | null,
  userInstruction: string,
  briefContext: ContentBrief,
  info: BusinessInfo,
  pillars: SEOPillars
): string => `
You are an expert Holistic SEO Strategist creating a new section for a content brief.

**LANGUAGE: ${getLanguageName(info.language)} | Target Market: ${info.targetMarket || 'Global'}**

## Position Information
- Insert at position: ${insertPosition + 1} (after ${insertPosition === 0 ? 'the beginning' : `section ${insertPosition}`})
- Parent Heading (if H3): ${parentHeading || 'None (creating H2)'}

## User's Request
"${userInstruction}"

## Existing Sections
${briefContext.structured_outline?.map((s, i) => `${i + 1}. [H${s.level}] ${s.heading} (${s.format_code || 'PROSE'})`).join('\n') || 'No existing sections'}

## Brief Context
- Title: ${briefContext.title}
- Key Takeaways: ${briefContext.keyTakeaways?.join(', ') || 'N/A'}

${businessContext(info)}

**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

---

## Your Task
Create a new section that:

1. **Fits Naturally**: Logical flow from previous section to this one to next
2. **Follows Framework Rules**:
   - Heading must modify Central Entity "${pillars.centralEntity}"
   - Choose appropriate format_code (FS for featured snippet targets, PAA for questions, LISTING for lists, etc.)
   - Assign correct attribute_category (ROOT, UNIQUE, RARE, or COMMON)

3. **Provides Complete Guidance**:
   - subordinate_text_hint: Exact syntax for first sentence
   - methodology_note: Format requirements and codes
   - required_phrases: Key terms that must appear

4. **Language**: All content in ${getLanguageName(info.language)}

${getStylometryInstructions(info.authorProfile)}

${jsonResponseInstruction}

Return the new section as a JSON object:
{
  "heading": "string",
  "level": ${parentHeading ? 3 : 2},
  "format_code": "FS | PAA | LISTING | DEFINITIVE | TABLE | PROSE",
  "attribute_category": "ROOT | UNIQUE | RARE | COMMON",
  "content_zone": "MAIN | SUPPLEMENTARY",
  "subordinate_text_hint": "string (first sentence syntax instruction)",
  "methodology_note": "string (formatting notes with codes)",
  "required_phrases": ["string"],
  "anchor_texts": [{ "phrase": "string", "target_topic_id": "string" }]
}
`;
