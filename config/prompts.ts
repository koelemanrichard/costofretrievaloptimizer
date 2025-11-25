
// config/prompts.ts
import { BusinessInfo, SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, ResponseCode, GscRow, ValidationIssue, ExpansionMode, AuthorProfile, ContextualFlowIssue } from '../types';
import { KnowledgeGraph } from '../lib/knowledgeGraph';

const jsonResponseInstruction = `
Respond with a valid JSON object. Do not include any explanatory text or markdown formatting before or after the JSON.
`;

const businessContext = (info: BusinessInfo): string => `
Business Context:
- Domain: ${info.domain}
- Industry: ${info.industry}
- Business Model: ${info.model}
- Target Audience: ${info.audience}
- Unique Value Proposition: ${info.valueProp}
- Stated Expertise Level: ${info.expertise}
- Main Topic / Seed Keyword: ${info.seedKeyword}
- Target Market: ${info.targetMarket}
- Language: ${info.language}
${info.authorName ? `- Author: ${info.authorName} (${info.authorBio || ''})` : ''}
${info.authorCredentials ? `- Author Credentials: ${info.authorCredentials}` : ''}
${info.uniqueDataAssets ? `- Unique Data Assets: ${info.uniqueDataAssets}` : ''}
`;

const getStylometryInstructions = (profile?: AuthorProfile): string => {
    if (!profile) return "Tone: Professional and authoritative.";

    let stylePrompt = "";
    switch (profile.stylometry) {
        case 'ACADEMIC_FORMAL':
            stylePrompt = "Tone: Academic and Formal. Use objective language. Prioritize precision, nuance, and citation of principles. Avoid colloquialisms. Complex sentence structures are permitted if they add precision.";
            break;
        case 'DIRECT_TECHNICAL':
            stylePrompt = "Tone: Direct and Technical. Use short, declarative sentences. Focus on mechanics, specifications, and 'how-to'. Avoid adjectives and fluff. Prioritize clarity and brevity over elegance.";
            break;
        case 'PERSUASIVE_SALES':
            stylePrompt = "Tone: Persuasive and Benefit-Driven. Use active voice. Focus on outcomes, value propositions, and solving user pain points. Use rhetorical questions sparingly to drive engagement.";
            break;
        case 'INSTRUCTIONAL_CLEAR':
        default:
            stylePrompt = "Tone: Instructional and Clear. Use simple, accessible language (EL15). Focus on step-by-step logic. Define technical terms immediately upon introduction.";
            break;
    }

    if (profile.customStylometryRules && profile.customStylometryRules.length > 0) {
        stylePrompt += "\n\nNEGATIVE CONSTRAINTS (Strictly Forbidden):";
        profile.customStylometryRules.forEach(rule => {
            stylePrompt += `\n- ${rule}`;
        });
    }

    return stylePrompt;
};

export const SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT = (info: BusinessInfo): string => `
You are an expert SEO strategist specializing in semantic content modeling. Based on the following business context, identify 3-5 potential "Central Entities".

A Central Entity is the core concept the business wants to be known for. It should be a noun or noun phrase that can be the subject of many articles.

For each candidate, provide:
1.  "entity": The candidate entity (e.g., "Contract Management Software").
2.  "reasoning": A brief explanation of why it's a strong candidate.
3.  "score": A confidence score from 0.0 to 1.0, where 1.0 is a perfect fit.

${businessContext(info)}

${jsonResponseInstruction}
Your output should be an array of objects, like this:
[
  {"entity": "...", "reasoning": "...", "score": 0.9},
  ...
]
`;

export const SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT = (info: BusinessInfo, centralEntity: string): string => `
You are an expert SEO strategist. The chosen Central Entity is "${centralEntity}". Now, create 3 distinct "Source Context" options.

A Source Context is a statement that defines the unique angle, authority, and perspective of the business. It's the "why you should listen to us" statement that will guide all content creation. It should reflect the business's value proposition and expertise.

For each option, provide:
1.  "context": The source context statement.
2.  "reasoning": Why this context is effective for the business.
3.  "score": A confidence score from 0.0 to 1.0.

${businessContext(info)}

${jsonResponseInstruction}
Your output should be an array of objects.
`;

export const SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT = (info: BusinessInfo, centralEntity: string, sourceContext: string): string => `
You are an expert SEO strategist.
- Central Entity: "${centralEntity}"
- Source Context: "${sourceContext}"

Based on the above and the full business context, define the "Central Search Intent". This should be a concise phrase representing the primary goal or question a user has when they are searching for the central entity, which this business is best positioned to answer.

Provide your answer in a JSON object with two keys: "intent" and "reasoning".

${businessContext(info)}
${jsonResponseInstruction}
`;

export const DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT = (info: BusinessInfo, pillars: SEOPillars): string => `
You are an expert in semantic modeling and knowledge graphs. Based on the SEO Pillars and business context, generate a list of 15-20 fundamental semantic triples (Entity-Attribute-Value, or Subject-Predicate-Object).

These triples represent the core, undisputed facts about the Central Entity. They will form the semantic skeleton of the topical map.

SEO Pillars:
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

${businessContext(info)}

Each triple must be a JSON object with the structure:
{
  "subject": { "label": "string", "type": "string" },
  "predicate": { "relation": "string", "type": "string" },
  "object": { "value": "string or number", "type": "string" }
}

Example:
{
  "subject": { "label": "Contract Management Software", "type": "Concept" },
  "predicate": { "relation": "HAS_FEATURE", "type": "Property" },
  "object": { "value": "Automated Workflows", "type": "Feature" }
}

${jsonResponseInstruction}
Your output should be a JSON array of these triple objects.
`;

export const EXPAND_SEMANTIC_TRIPLES_PROMPT = (info: BusinessInfo, pillars: SEOPillars, existingTriples: SemanticTriple[]): string => `
You are an expert in semantic modeling. The user has provided a list of existing semantic triples. Expand upon this list by adding 10-15 new, related triples.

Focus on adding more detail, related concepts, features, benefits, use cases, and other relevant factual connections. Do not repeat existing triples.

SEO Pillars:
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}

Existing Triples (for context):
${JSON.stringify(existingTriples, null, 2)}

${businessContext(info)}

${jsonResponseInstruction}
Your output should be a JSON array of the NEW triple objects only.
`;

export const GENERATE_INITIAL_TOPICAL_MAP_PROMPT = (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string => `
You are a Holistic SEO Architect. Your task is to generate a massive, high-authority Topical Map based on the provided strategic inputs.

**CRITICAL OBJECTIVE:** You must exhaustively explore every facet of the topic. You CANNOT be lazy. You MUST generate depth.

Strategic Inputs:
- SEO Pillars: ${JSON.stringify(pillars, null, 2)}
- Core Semantic Triples (EAVs): ${JSON.stringify(eavs.slice(0, 20), null, 2)}
- Key Competitors: ${competitors.join(', ')}

${businessContext(info)}

**Expansion Strategy (Think in ${info.language}):**
1.  **Monetization Section (Core Section / Money Pages):**
    *   **MANDATORY: Generate a MINIMUM of 6 distinct Core Topics.**
    *   **HARD CONSTRAINT (1:7 HUB-SPOKE RATIO):** For EVERY single Core Topic you generate, you **MUST** generate exactly **7 unique 'Spokes' (Outer Topics)**. 
    *   If you generate a Core Topic with 0 spokes, the entire map fails. You must provide depth.
    *   *Spoke Ideas:* Specific use cases, variations, problems solved, benefits, comparisons, implementation steps.
    *   *Example:* Entity 'Ontruimingen' -> Core 'Woningontruiming' -> Spokes: 'Kosten woningontruiming', 'Spoed woningontruiming', 'Woningontruiming na overlijden', 'Woningontruiming tips', 'Woningontruiming vs verhuizing', 'Woningontruiming checklist', 'Woningontruiming bedrijf kiezen'.

2.  **Informational Section (Author Section / Trust Pages):**
    *   Topics related to "${pillars.centralEntity} + Knowledge/Background/Trust".
    *   Generate 3-5 distinct clusters (e.g., Laws, Costs, Procedures).
    *   Ensure these also have supporting spokes (3-5 each).

**Granular Node Identity (REQUIRED for each topic):**
For every topic generated (Core AND Spoke), provide:
- "canonical_query": The single, most representative search query (User Intent).
- "query_network": An array of 3-5 related mid-string keywords.
- "url_slug_hint": A concise version of the title (max 3 words).

**Token Optimization:** Keep "description" fields concise (1-2 sentences) to allow space for MORE TOPICS.

Output Format:
Respond with a single JSON object containing two arrays:
- "monetizationSection": Array of Core Topics.
- "informationalSection": Array of Core Topics.

Each Core Topic object structure:
{
  "title": "string",
  "description": "string",
  "freshness": "EVERGREEN",
  "canonical_query": "string",
  "query_network": ["string"],
  "url_slug_hint": "string",
  "spokes": [
      {
        "title": "string",
        "description": "string",
        "freshness": "STANDARD",
        "canonical_query": "string",
        "query_network": ["string"],
        "url_slug_hint": "string"
      }
      // ... MUST HAVE 7 SPOKES HERE ...
  ]
}

${jsonResponseInstruction}
`;

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

export const GENERATE_CONTENT_BRIEF_PROMPT = (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, knowledgeGraph: KnowledgeGraph, responseCode: ResponseCode): string => {
    const kgContext = knowledgeGraph 
        ? JSON.stringify(knowledgeGraph.query(`SELECT ?term WHERE { ?node term ?term . } LIMIT 15`), null, 2)
        : "No Knowledge Graph available.";

    const userContextInstruction = topic.metadata?.userContext ? `\n**USER GUIDANCE:** The user specifically requested: "${topic.metadata.userContext}". Ensure the brief aligns with this intent.` : "";

    return `
You are an expert Algorithmic Architect and Holistic SEO Strategist.
Your goal is to generate a content brief that strictly minimizes the **Cost of Retrieval** for search engines.
You do not write generic outlines. You engineer data structures for information retrieval.

**Target Topic:** "${topic.title}"
**Description:** "${topic.description}"
**Response Code:** ${responseCode}
${userContextInstruction}

${businessContext(info)}
**SEO Pillars:** ${JSON.stringify(pillars, null, 2)}
**Knowledge Graph Context:** ${kgContext}
**Available Topics for Linking:** ${allTopics.map(t => t.title).join(', ')}

---

### **STRICT EXECUTION RULES**

#### **I. FOUNDATIONAL STRATEGY & ENTITY ALIGNMENT**
1.  **Central Entity Focus (Rule I.A):** Every heading and sub-heading must modify the Central Entity ("${pillars.centralEntity}"). Reject broad generalizations.
2.  **Source Context Alignment (Rule I.B):** Filter attributes based on the Source Context ("${pillars.sourceContext}"). Only include attributes relevant to the monetization intent (e.g., if context is "Enterprise", exclude "Free" or "Cheap").
3.  **Attribute Prioritization (Rule I.D):** Structure the 'outline' to prioritize **Unique Attributes** (definitive features/IDs) FIRST, followed by **Root Attributes** (Definitions/Nature), then **Rare Attributes** (Specific details).

#### **II. STRUCTURE & FLOW**
1.  **Contextual Vector (Rule II.B):** Ensure a strictly ordered heading hierarchy (H1 -> H2 -> H3) that creates a logical dependency chain.
2.  **The Contextual Bridge (Rule II.D):** You MUST define a specific 'contextualBridge' object. This is a dedicated section (transition paragraph) that bridges the **Macro Context** (The Site's Core Entity) to the **Micro Context** (This Article's Topic).
3.  **Subordinate Text (Rule II.F):** For every H2/H3 in the 'structured_outline', provide a 'subordinate_text_hint'. This MUST dictate the syntax of the *very first sentence* (e.g., "Define [Topic] as [Category] that [Function]...").
4.  **Introductory Summary (Rule II.E):** Mandate an abstractive summary at the start.

#### **III. LINGUISTIC DIRECTIVES**
1.  **Explicit Naming (Rule III.D):** Instruct the writer to use **Explicit Naming**. Strictly FORBID ambiguous pronouns ("it", "they", "this") when referring to the Central Entity.
2.  **No Opinion (Rule III.G):** Strictly FORBID subjective phrases ("I think", "In my opinion", "Ideally"). Require declarative facts.
3.  **Discourse Integration (Rule III.H):** Generate a list of 'discourse_anchors'. These are specific mutual words/phrases to use at the end of Paragraph A and the start of Paragraph B to ensure flow.
4.  **Featured Snippet Target (Rule III.C):** Identify the SINGLE most important question this article answers. Define it as the 'featured_snippet_target'. The answer target length must be < 40 words.

#### **IV. VISUAL SEMANTICS**
1.  **Data over Photos (Rule IV.A):** Do not request generic stock photos. Populate 'visual_semantics' with specific descriptions of **Infographics**, **Charts**, or **Data Tables** that represent the EAVs.

#### **V. INTERLINKING**
1.  **Post-Definition Linking (Rule V.C):** In the 'contextualBridge' instructions, specify that links must be placed *after* the entity has been defined, never in the first sentence of a paragraph.

---

### **OUTPUT JSON STRUCTURE**

Respond with a SINGLE valid JSON object matching this schema exactly:

{
  "title": "string",
  "slug": "string",
  "metaDescription": "string (Must include Central Search Intent)",
  "query_type_format": "string (e.g. 'Ordered List', 'Comparison Table', 'Prose')",
  "keyTakeaways": ["string", "string", "string"],
  "outline": "string (Markdown format)",
  "structured_outline": [
    {
      "heading": "string",
      "level": number,
      "subordinate_text_hint": "string (Specific first-sentence syntax instruction)",
      "methodology_note": "string"
    }
  ],
  "perspectives": ["string", "string"],
  "methodology_note": "string",
  "featured_snippet_target": {
    "question": "string",
    "answer_target_length": 40,
    "required_predicates": ["string", "string"],
    "target_type": "PARAGRAPH" | "LIST" | "TABLE"
  },
  "visual_semantics": [
    {
      "type": "INFOGRAPHIC" | "CHART" | "DIAGRAM",
      "description": "string",
      "caption_data": "string (Data points to include)",
      "height_hint": "string (e.g. '1080px')",
      "width_hint": "string (e.g. '1920px')"
    }
  ],
  "discourse_anchors": ["string", "string"],
  "serpAnalysis": {
    "peopleAlsoAsk": ["string"],
    "competitorHeadings": []
  },
  "visuals": {
    "featuredImagePrompt": "string",
    "imageAltText": "string"
  },
  "contextualVectors": [],
  "contextualBridge": {
    "type": "section",
    "content": "string (The transition paragraph text)",
    "links": [
      {
        "targetTopic": "string",
        "anchorText": "string",
        "annotation_text_hint": "string (Text surrounding the anchor)",
        "reasoning": "string"
      }
    ]
  },
  "predicted_user_journey": "string"
}

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

export const GENERATE_ARTICLE_DRAFT_PROMPT = (brief: ContentBrief, info: BusinessInfo): string => `
You are an expert **Algorithmic Author** and Subject Matter Expert in ${info.industry}.
Your goal is to write a high-authority article that minimizes the **Cost of Retrieval** for search engines while maximizing user value.

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

export const POLISH_ARTICLE_DRAFT_PROMPT = (draft: string, brief: ContentBrief, info: BusinessInfo): string => `
You are a Senior Editor and Content Finisher.
Your goal is to prepare this draft for final publication (Pass 2 Polish).

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

export const REFINE_DRAFT_SECTION_PROMPT = (originalText: string, violationType: string, instruction: string, info: BusinessInfo): string => `
You are an expert Editor and Algorithmic Author.
Your task is to rewrite a specific text segment to fix a detected authorship violation.

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

export const AUDIT_CONTENT_INTEGRITY_PROMPT = (brief: ContentBrief, draft: string, info: BusinessInfo): string => `
You are a strict SEO content auditor. Audit the provided article draft against its content brief and framework rules.

Content Brief: ${JSON.stringify(brief, null, 2)}
Article Draft (Markdown):
---
${draft.substring(0, 5000)}... (truncated)
---

${businessContext(info)}

Audit Criteria:
1.  **eavCheck**: Are the semantic vectors (EAVs) included?
2.  **linkCheck**: Are the internal linking suggestions implemented?
3.  **linguisticModality**: Score 0-100 on authoritativeness.
4.  **frameworkRules**: Check for compliance:
    - "Do Not Delay the Answer": Does it answer quickly?
    - "PoST Consistency in Lists": Are list items parallel?
    - "Bold the Answer, Not the Keyword".
    - "Mandatory N-Grams": Does the text contain specific keywords/phrases from the Value Proposition ("${info.valueProp}") in the Introduction and Conclusion?

${jsonResponseInstruction}
Provide a JSON object with: "overallSummary", "eavCheck", "linkCheck", "linguisticModality", "frameworkRules".
`;

export const GENERATE_SCHEMA_PROMPT = (brief: ContentBrief): string => `
You are an expert in Schema.org and JSON-LD. Generate the schema for this article.

- Primary type: Article/BlogPosting.
- Include standard properties.
- **Authorship Signals:** Use a Person schema for the author (if known) and Organization schema for the publisher to boost E-E-A-T.

Content Brief:
${JSON.stringify(brief, null, 2)}

${jsonResponseInstruction}
Respond with "schema" (stringified JSON) and "reasoning".
`;


export const ANALYZE_GSC_DATA_PROMPT = (gscRows: GscRow[], knowledgeGraph: KnowledgeGraph): string => {
    const kgTerms = knowledgeGraph 
        ? Array.from(knowledgeGraph.getNodes().values()).map(n => n.term).join(', ')
        : "No knowledge graph available.";

    return `
You are an expert SEO data analyst. Identify "Opportunity Queries" from GSC data.

GSC Data (Top 100 rows):
${JSON.stringify(gscRows.slice(0, 100), null, 2)}

Knowledge Graph Terms:
${kgTerms}

For the top 5-7 opportunities (High Impressions, Low CTR), provide:
- "query", "impressions", "ctr".
- "reasoning": Why is this an opportunity?
- "relatedKnowledgeTerms": Related terms from the graph.

${jsonResponseInstruction}
Return a JSON array of opportunity objects.
`;
};

export const VALIDATE_TOPICAL_MAP_PROMPT = (topics: EnrichedTopic[], pillars: SEOPillars, info: BusinessInfo): string => `
You are a Holistic SEO Auditor. Validate the topical map against strict semantic rules.

Topical Map:
${JSON.stringify(topics.map(t => ({title: t.title, type: t.type, description: t.description})), null, 2)}

SEO Pillars:
${JSON.stringify(pillars, null, 2)}

${businessContext(info)}

Instructions:
1.  Calculate "overallScore" (0-100).
2.  Provide "summary".
3.  Identify "issues" using these specific Holistic Checks:
    - **Focus Check (Rule A):** Identify any topic that deviates from the Central Entity ("${pillars.centralEntity}"). If a topic is about a related but distinct entity (e.g., "Sales Software" vs "Contract Software"), flag it as CRITICAL.
    - **Context Check (Rule B):** Identify any topic that contradicts or ignores the Source Context ("${pillars.sourceContext}"). Example: If context is "Enterprise", flag "Free/Cheap" topics as WARNING.
    - **Flow Check (Rule C):** Identify "Orphaned Clusters" in the Author Section that do not semantically bridge back to a Core Section hub.

${jsonResponseInstruction}
Return a single JSON object with "overallScore", "summary", and "issues" (rule, message, severity, offendingTopics).
`;

export const IMPROVE_TOPICAL_MAP_PROMPT = (topics: EnrichedTopic[], issues: ValidationIssue[], info: BusinessInfo): string => `
You are an AI SEO strategist. Generate improvements for the topical map based on validation issues.

Current Topics:
${JSON.stringify(topics.map(t => ({title: t.title, type: t.type})), null, 2)}

Validation Issues:
${JSON.stringify(issues, null, 2)}

${businessContext(info)}

Instructions:
Generate concrete actions to resolve the issues.
1.  "newTopics": Array of new topics to add (title, description, type) to fill gaps or fix broken flows.
2.  "topicTitlesToDelete": Array of titles to remove (e.g. Out of Focus topics).

${jsonResponseInstruction}
`;

export const FIND_MERGE_OPPORTUNITIES_PROMPT = (topics: EnrichedTopic[], info: BusinessInfo): string => `
You are an expert SEO strategist. Find semantically redundant topics to merge.

Topics:
${JSON.stringify(topics.map(t => ({ id: t.id, title: t.title })), null, 2)}

${businessContext(info)}

**Canonical Query Analysis:**
Identify the "Canonical Query" (Search Intent) that shared topics target.

For each opportunity:
- "topicIds", "topicTitles".
- "canonicalQuery".
- "newTopic" (title, description).
- "reasoning".

${jsonResponseInstruction}
Return a JSON array of merge suggestion objects.
`;

export const FIND_LINKING_OPPORTUNITIES_PROMPT = (targetTopic: EnrichedTopic, allTopics: EnrichedTopic[], knowledgeGraph: KnowledgeGraph, businessInfo: BusinessInfo): string => `
You are an expert SEO for internal linking. Find relevant linking opportunities *pointing to* the target topic.

Target Topic: ${targetTopic.title}
Available Source Topics: ${JSON.stringify(allTopics.filter(t => t.id !== targetTopic.id).map(t => ({title: t.title})), null, 2)}

${businessContext(businessInfo)}

Instructions:
Identify top 3-5 source topics. For each, provide:
- "sourceTopicTitle"
- "anchorText"
- "reasoning"

${jsonResponseInstruction}
Return a JSON array of linking opportunity objects.
`;

export const ANALYZE_CONTEXTUAL_COVERAGE_PROMPT = (info: BusinessInfo, topics: EnrichedTopic[], pillars: SEOPillars): string => `
You are an expert SEO strategist. Analyze contextual coverage of the map.

Topical Map: ${JSON.stringify(topics.map(t => t.title), null, 2)}
Pillars: ${JSON.stringify(pillars, null, 2)}

${businessContext(info)}

Instructions:
Evaluate coverage across:
1.  **Macro Context**
2.  **Micro Context**
3.  **Temporal Context**
4.  **Intentional Context**

Provide JSON with: "summary", "macroCoverage" (0-100), "microCoverage" (0-100), "temporalCoverage" (0-100), "intentionalCoverage" (0-100), and "gaps" (array of {context, reasoning, type}).

${jsonResponseInstruction}
`;

export const AUDIT_INTERNAL_LINKING_PROMPT = (topics: EnrichedTopic[], briefs: Record<string, ContentBrief>, info: BusinessInfo): string => `
You are an expert SEO auditor. Analyze internal linking architecture.

Topics: ${JSON.stringify(topics.map(t => t.title), null, 2)}
Existing Links: ${JSON.stringify(Object.values(briefs).map(b => ({ source: topics.find(t => t.id === b.topic_id)?.title, links_to: (Array.isArray(b.contextualBridge) ? b.contextualBridge : b.contextualBridge?.links || []).map(l => l.targetTopic) })), null, 2)}

${businessContext(info)}

Instructions:
1.  Identify "missedLinks".
2.  Identify "dilutionRisks".

Provide JSON with "summary", "missedLinks", "dilutionRisks".

${jsonResponseInstruction}
`;

export const CALCULATE_TOPICAL_AUTHORITY_PROMPT = (topics: EnrichedTopic[], briefs: Record<string, ContentBrief>, knowledgeGraph: KnowledgeGraph, info: BusinessInfo): string => {
    const kgSize = knowledgeGraph ? knowledgeGraph.getNodes().size : 0;

    return `
You are an expert SEO analyst. Calculate "Topical Authority Score" (0-100).

Data Provided:
- Topics: ${topics.length}
- Briefs: ${Object.keys(briefs).length}
- KG Size: ${kgSize} nodes

${businessContext(info)}

Instructions:
Provide JSON with "overallScore", "summary", and "breakdown" ({contentDepth, contentBreadth, interlinking, semanticRichness}).

${jsonResponseInstruction}
`;
};

export const GENERATE_PUBLICATION_PLAN_PROMPT = (topics: EnrichedTopic[], info: BusinessInfo): string => `
You are an expert content strategist. Create a 2-Phase publication plan.

**Rules:**
1.  **Phase 1 (Authority Anchor):** Must include ALL 'Monetization' (Core Section) topics and Trust pages. 0% 'Informational' (Author Section) topics unless critical dependencies.
2.  **Phase 2 (Contextual Support):** Introduce 'Informational' topics.

Topics:
${JSON.stringify(topics.map(t => ({ title: t.title, type: t.type, class: t.topic_class })), null, 2)}

${businessContext(info)}

${jsonResponseInstruction}
Return a JSON object with "total_duration_weeks" and an array of "phases" (phase, name, duration_weeks, publishing_rate, content: [{title, type}]).
`;


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

export const AUDIT_INTRA_PAGE_FLOW_PROMPT = (text: string, centralEntity: string): string => `
You are a Semantic Auditor specializing in Information Retrieval.
Analyze the following text for "Vector Straightness" and "Attribute Order".

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

export const AUDIT_DISCOURSE_INTEGRATION_PROMPT = (text: string): string => `
You are a Linguistic Auditor. Analyze the following text for "Discourse Integration".

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

export const APPLY_FLOW_REMEDIATION_PROMPT = (originalSnippet: string, issueDetails: string, remediationInstruction: string, info: BusinessInfo): string => `
You are a Semantic Editor.
Your task is to rewrite a specific text segment to fix a semantic flow issue detected by the audit.

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

export const BATCH_FLOW_REMEDIATION_PROMPT = (fullDraft: string, issues: ContextualFlowIssue[], info: BusinessInfo): string => `
You are a Senior Semantic Editor and Algorithmic Author.
Your goal is to rewrite the provided article draft to resolve a list of specific flow and vector violations, creating a cohesive, high-authority document.

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
