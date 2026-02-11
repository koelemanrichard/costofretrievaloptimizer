// config/prompts/topicOperations.ts
// Prompts for topic CRUD: add, expand, analyze viability, suggestions, metadata enrichment, blueprints

import { BusinessInfo, SEOPillars, EnrichedTopic, ExpansionMode } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import {
    businessContext,
    jsonResponseInstruction,
} from './_common';

export const ADD_TOPIC_INTELLIGENTLY_PROMPT = (newTopicTitle: string, newTopicDescription: string, allTopics: EnrichedTopic[], businessInfo: BusinessInfo): string => `
You are an expert topical map architect. Determine the best placement for a new topic.

New Topic: "${newTopicTitle}" - "${newTopicDescription}"
Existing Structure: ${JSON.stringify(allTopics.map(t => ({id: t.id, title: t.title, type: t.type})), null, 2)}

${businessContext(businessInfo)}

Instructions:
Decide:
1.  Should it be 'core' or 'outer'?
2.  If 'outer', which 'core' parent?

${jsonResponseInstruction}
Return JSON with "parentTopicId" and "type".
`;

export const EXPAND_CORE_TOPIC_PROMPT = (
    businessInfo: BusinessInfo,
    pillars: SEOPillars,
    coreTopicToExpand: EnrichedTopic,
    allTopics: EnrichedTopic[],
    knowledgeGraph: KnowledgeGraph,
    mode: ExpansionMode = 'CONTEXT',
    userContext?: string
): string => {
    let specificInstruction = "";
    switch (mode) {
        case 'ATTRIBUTE':
            specificInstruction = "EXPANSION MODE: ATTRIBUTE (DEEP DIVE). Analyze the specific attributes, features, components, or technical specifications of the Core Entity. Generate topics that explain 'How it works', 'Specifications', 'Features', or 'Components'.";
            break;
        case 'ENTITY':
            specificInstruction = "EXPANSION MODE: ENTITY (BREADTH). Identify related entities, direct competitors, alternatives, or complimentary concepts. Generate 'Comparison' or 'Alternative' topics.";
            break;
        case 'FRAME':
            specificInstruction = `EXPANSION MODE: FRAME SEMANTICS (SCENE-BASED).
Use Fillmore's Frame Semantics to analyze the SCENE this topic evokes:
1. Core Actions: What verbs/processes are central to this concept?
2. Participants: Who performs the action (agent)? Who/what receives it (patient)? What tools are used (instrument)?
3. Setting: Where/when does this typically occur? In what social/professional context?
4. Consequences: What results or outcomes follow from these actions?

Generate topics exploring:
- Different participant perspectives (agent vs beneficiary viewpoints)
- Prerequisite actions (what must happen before)
- Consequent actions (what happens after, results, outcomes)
- Environmental variations (different settings/contexts)
- Instrument/method alternatives (different ways to accomplish)
- Manner variations (how it's done differently)

This mode is especially effective for abstract concepts, process-oriented topics, or topics with limited keyword data.`;
            break;
        case 'CHILD':
            specificInstruction = `EXPANSION MODE: CHILD (SUB-TOPIC GENERATION).
Generate granular child topics that drill deeper into this specific topic:
1. FAQ Topics: Common questions people ask about this exact topic
2. Variation Topics: Different versions, types, or categories
3. Audience-Specific Topics: The same topic tailored for specific user segments
4. Use-Case Topics: Specific applications or scenarios
5. Comparison Sub-topics: Comparing aspects within this topic

Examples of child topic patterns:
- "[Topic] FAQ" or "Common [Topic] Questions"
- "[Topic] for [Audience]" (beginners, professionals, small businesses)
- "[Topic] vs [Alternative within same category]"
- "Best [Topic] for [Use Case]"
- "[Topic] [Variation/Type]"

These become child-level content pieces that support the parent outer topic.`;
            break;
        case 'CONTEXT':
        default:
            specificInstruction = "EXPANSION MODE: CONTEXT (BACKGROUND). Look at the history, future trends, origin, or broader societal impact. Generate 'History of', 'Future of', or 'Trends' topics.";
            break;
    }

    const userGuidance = userContext ? `\nUSER GUIDANCE: "${userContext}"\nEnsure the generated topics align strictly with this guidance.` : "";

    return `
You are an expert SEO strategist. Expand a core topic by suggesting new, highly relevant sub-topics (outer topics).

Core Topic: "${coreTopicToExpand.title}"
${specificInstruction}
${userGuidance}

Existing Topics (Do not duplicate): ${allTopics.map(t => `- ${t.title}`).join('\n')}
Pillars: ${JSON.stringify(pillars, null, 2)}

${businessContext(businessInfo)}

Instructions:
Generate 3-5 new, highly relevant 'outer' topics based strictly on the Expansion Mode.
Provide "title" and "description".

${jsonResponseInstruction}
Return a JSON array of topic objects.
`;
};

export const ANALYZE_TOPIC_VIABILITY_PROMPT = (topic: string, context: string, businessInfo: BusinessInfo): string => `
You are an expert SEO strategist. Analyze the viability of a proposed topic.

Topic: "${topic}"
Context/Description: "${context}"

${businessContext(businessInfo)}

**The Page vs. Section Test:**
Determine if this topic justifies a dedicated URL (Index) or if it is too thin/niche and should be merged as a section into a parent page.

Criteria:
1.  **Search Demand:** Is there specific search intent?
2.  **Complexity:** Can it be fully explained in >300 words without fluff?

${jsonResponseInstruction}
Return a JSON object with:
- "decision": 'PAGE' or 'SECTION'
- "reasoning": Explanation of the decision.
- "targetParent": If SECTION, suggest a parent topic title (or null).
`;

export const GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT = (userThoughts: string, info: BusinessInfo): string => `
You are an expert SEO Strategist. The user wants to add new "Core Topics" (Pillar Pages) to their topical map.

User Input/Thoughts: "${userThoughts}"

${businessContext(info)}

Instructions:
Based on the user's input and the business context, suggest 3-5 high-value Core Topics.
These topics should be distinct, substantial concepts suitable for a pillar page.

${jsonResponseInstruction}
Return a JSON array of objects:
[
  {
    "title": "Topic Title",
    "description": "Brief description of what this pillar covers.",
    "reasoning": "Why this fits the user's request and business goals."
  }
]
`;

export const GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT = (
  userThoughts: string,
  existingCoreTopics: { title: string, id: string }[],
  info: BusinessInfo
): string => {
  const existingTopicsList = existingCoreTopics.map(t => `- ${t.title}`).join('\n');

  return `
You are an expert SEO Strategist and Information Architect. The user wants to add a cluster of topics to their topical map.
Your goal is to analyze their input and structure it into a hierarchy of **Core Topics** (Pillar Pages) and **Outer Topics** (Cluster Content).

User Input: "${userThoughts}"

${businessContext(info)}

Existing Core Topics (Pillars) in the map:
${existingTopicsList}

Instructions:
1.  Identify all distinct topics implied or requested by the user.
2.  Classify each topic as either 'core' or 'outer' (supporting content).
3.  For every 'outer' topic, you MUST assign a "suggestedParent".
    *   This parent can be one of the **Existing Core Topics** listed above.
    *   OR, it can be one of the **New Core Topics** you are creating in this very response.
    *   If it creates a new hierarchy, ensure the Core topic is listed first.

${jsonResponseInstruction}
Return a JSON array of objects. Each object must have:
- "title": string
- "description": string (brief summary)
- "type": "core" | "outer"
- "suggestedParent": string (The exact title of the parent topic. Required if type is 'outer', null if type is 'core').

Example Output:
[
  { "title": "Office Cleaning Guide", "description": "Comprehensive guide to office hygiene.", "type": "core", "suggestedParent": null },
  { "title": "Desk Sanitization", "description": "How to clean desks properly.", "type": "outer", "suggestedParent": "Office Cleaning Guide" }
]
`;
};

export const ENRICH_TOPIC_METADATA_PROMPT = (topics: {id: string, title: string, description: string}[], info: BusinessInfo): string => `
You are an expert SEO Data Analyst.
Your task is to enrich existing topics with specific metadata required for a Holistic SEO strategy to reduce the Cost of Retrieval.

Topics to Enrich:
${JSON.stringify(topics.map(t => ({ id: t.id, title: t.title, description: t.description })), null, 2)}

${businessContext(info)}

Instructions:
For EACH topic provided, you must generate the following specific data points:

1.  "canonical_query": The single, most representative search query (User Intent) this page targets.
2.  "query_network": An array of 3-5 related mid-string keywords or queries that cluster with the canonical query.
3.  "url_slug_hint": A concise version of the title, max 3 words, optimized for URL structure (e.g. "visa-requirements").
4.  "attribute_focus": The specific subtopic/facet of the Central Entity being covered (e.g., 'Cost', 'History', 'Features', 'Definition').
5.  "query_type": The classification of the query (e.g., 'Definitional', 'Comparative', 'Instructional', 'Commercial').
6.  "topical_border_note": A brief note defining what this topic covers and where it ends to avoid cannibalization with neighbors.

${jsonResponseInstruction}
Return a JSON array of objects, where each object corresponds to a topic and includes:
- "id": (The original ID provided)
- "canonical_query": string
- "query_network": string[]
- "url_slug_hint": string
- "attribute_focus": string
- "query_type": string
- "topical_border_note": string
`;

export const GENERATE_TOPIC_BLUEPRINT_PROMPT = (topics: { title: string, id: string }[], info: BusinessInfo, pillars: SEOPillars): string => `
You are an expert Content Architect and Semantic SEO Specialist.
Your task is to create "Topic Blueprints" for a batch of topics. These blueprints act as the structural specification for writers.

**Strategic Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}

**Business Context:**
${businessContext(info)}

**Topics to Process:**
${JSON.stringify(topics.map(t => ({ id: t.id, title: t.title })), null, 2)}

**Instructions:**
For EACH topic, generate a blueprint containing:
1.  **contextual_vector**: A logical sequence of 3-5 H2 headings that define the content flow (e.g., "H2: Definition > H2: Benefits > H2: Process").
2.  **methodology**: The specific article format (e.g., "Comparative Analysis with Table", "Step-by-Step Guide", "Definitive List").
3.  **subordinate_hint**: Specific instructions for the *first sentence* of the article (e.g., "Define X as Y using a definitive verb").
4.  **perspective**: The specific persona/angle required (e.g., "Technical Analyst", "Consumer Advocate").
5.  **interlinking_strategy**: A rule for how this page should link to other pages (e.g., "Link to Core Section for definition of [Entity]").
6.  **anchor_text**: The recommended anchor text to use when OTHER pages link TO this topic.
7.  **annotation_hint**: A hint for the text surrounding the anchor link (e.g., "Mention this when discussing cost efficiencies").

${jsonResponseInstruction}
Return a JSON array of objects. Each object must contain:
- "id": (The topic ID provided)
- "contextual_vector": string
- "methodology": string
- "subordinate_hint": string
- "perspective": string
- "interlinking_strategy": string
- "anchor_text": string
- "annotation_hint": string
`;
