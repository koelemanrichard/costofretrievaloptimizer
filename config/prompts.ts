
// config/prompts.ts
import { BusinessInfo, SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, BriefSection, ResponseCode, GscRow, ValidationIssue, ExpansionMode, AuthorProfile, ContextualFlowIssue, FoundationPage, NavigationStructure, WebsiteType, HolisticSummary } from '../types';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { getWebsiteTypeConfig } from './websiteTypeTemplates';
import { getMonetizationPromptEnhancement, shouldApplyMonetizationEnhancement } from '../utils/monetizationPromptUtils';
import { getLanguageName, getLanguageAndRegionInstruction, getRegionalLanguageVariant } from '../utils/languageUtils';

// Re-export for use in content generation passes
export { getLanguageAndRegionInstruction };

const jsonResponseInstruction = `
Respond with a valid JSON object. Do not include any explanatory text or markdown formatting before or after the JSON.
`;

export const businessContext = (info: BusinessInfo): string => {
    const typeConfig = info.websiteType ? getWebsiteTypeConfig(info.websiteType) : null;
    const regionalVariant = getRegionalLanguageVariant(info.language, info.region);
    return `
Business Context:
- Domain: ${info.domain}
- Industry: ${info.industry}
- Business Model: ${info.model}
- Website Type: ${typeConfig?.label || 'General/Informational'}
- Target Audience: ${info.audience}
- Unique Value Proposition: ${info.valueProp}
- Stated Expertise Level: ${info.expertise}
- Main Topic / Seed Keyword: ${info.seedKeyword}
- Target Market: ${info.targetMarket}
- Language: ${regionalVariant}
- Region/Location: ${info.region || 'Not specified'}
${info.authorName ? `- Author: ${info.authorName} (${info.authorBio || ''})` : ''}
${info.authorCredentials ? `- Author Credentials: ${info.authorCredentials}` : ''}
${info.uniqueDataAssets ? `- Unique Data Assets: ${info.uniqueDataAssets}` : ''}
`;
};

/**
 * Generate website type-specific instructions for topical map generation
 */
const getWebsiteTypeInstructions = (websiteType?: WebsiteType): string => {
    if (!websiteType) return '';

    const config = getWebsiteTypeConfig(websiteType);

    let instructions = `
**WEBSITE TYPE-SPECIFIC STRATEGY: ${config.label.toUpperCase()}**
${config.description}

**Core Section Focus (Monetization):**
${config.coreSectionRules.description}
- Required page types: ${config.coreSectionRules.requiredPageTypes.join(', ')}
- Optional page types: ${config.coreSectionRules.optionalPageTypes.join(', ')}
- Content depth: ${config.coreSectionRules.contentDepth}
- Attribute priority: ${config.coreSectionRules.attributePriority.join(' → ')}

**Author Section Focus (Authority Building):**
${config.authorSectionRules.description}
- Required page types: ${config.authorSectionRules.requiredPageTypes.join(', ')}
- Link-back strategy: ${config.authorSectionRules.linkBackStrategy} (PageRank should flow from Author → Core)

**Hub-Spoke Structure:**
- Optimal ratio: 1:${config.hubSpokeRatio.optimal} (min: ${config.hubSpokeRatio.min}, max: ${config.hubSpokeRatio.max})
- Generate ${config.hubSpokeRatio.optimal} spokes per core topic

**Linking Rules:**
- Max ${config.linkingRules.maxAnchorsPerPage} anchors per page
- Max ${config.linkingRules.maxAnchorRepetition} repetitions of same anchor text
- Link direction: ${config.linkingRules.preferredLinkDirection.replace(/_/g, ' ')}
`;

    // Add type-specific template patterns
    if (config.templatePatterns.length > 0) {
        instructions += `
**Recommended Topic Templates:**
`;
        config.templatePatterns.forEach(template => {
            instructions += `- ${template.name}: ${template.description} (Schema: ${template.schemaType})
`;
        });
    }

    // Add type-specific EAV priorities
    instructions += `
**Prioritized Attributes for this Website Type:**
- ROOT (Essential): ${config.eavPriority.requiredCategories.ROOT.join(', ')}
- UNIQUE (Differentiating): ${config.eavPriority.requiredCategories.UNIQUE.join(', ')}
- RARE (Detailed): ${config.eavPriority.requiredCategories.RARE.join(', ')}
- Composite: ${config.eavPriority.compositeAttributes.join(', ')}
`;

    return instructions;
}

export const getStylometryInstructions = (profile?: AuthorProfile): string => {
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
You are an expert SEO strategist specializing in semantic content modeling. Based on the following business context, identify EXACTLY 5 potential "Central Entities".

A Central Entity is the core concept the business wants to be known for. It should be a noun or noun phrase that can be the subject of many articles.

**CRITICAL: You MUST return EXACTLY 5 different candidates. Do not return fewer than 5.**

For each candidate, provide:
1.  "entity": The candidate entity (e.g., "Contract Management Software").
2.  "reasoning": A brief explanation of why it's a strong candidate.
3.  "score": A confidence score from 0.0 to 1.0, where 1.0 is a perfect fit.

${businessContext(info)}

${jsonResponseInstruction}
**IMPORTANT: Return a JSON ARRAY with EXACTLY 5 objects. Example format:**
[
  {"entity": "Option 1", "reasoning": "...", "score": 0.95},
  {"entity": "Option 2", "reasoning": "...", "score": 0.90},
  {"entity": "Option 3", "reasoning": "...", "score": 0.85},
  {"entity": "Option 4", "reasoning": "...", "score": 0.80},
  {"entity": "Option 5", "reasoning": "...", "score": 0.75}
]
`;

export const SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT = (info: BusinessInfo, centralEntity: string): string => `
You are an expert SEO strategist. The chosen Central Entity is "${centralEntity}". Now, create EXACTLY 4 distinct "Source Context" options.

A Source Context is a statement that defines the unique angle, authority, and perspective of the business. It's the "why you should listen to us" statement that will guide all content creation. It should reflect the business's value proposition and expertise.

**CRITICAL: You MUST return EXACTLY 4 different options. Do not return fewer than 4.**

For each option, provide:
1.  "context": The source context statement.
2.  "reasoning": Why this context is effective for the business.
3.  "score": A confidence score from 0.0 to 1.0.

${businessContext(info)}

${jsonResponseInstruction}
**IMPORTANT: Return a JSON ARRAY with EXACTLY 4 objects. Example format:**
[
  {"context": "Context statement 1", "reasoning": "...", "score": 0.95},
  {"context": "Context statement 2", "reasoning": "...", "score": 0.90},
  {"context": "Context statement 3", "reasoning": "...", "score": 0.85},
  {"context": "Context statement 4", "reasoning": "...", "score": 0.80}
]
`;

export const SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT = (info: BusinessInfo, centralEntity: string, sourceContext: string): string => `
You are an expert SEO strategist.
- Central Entity: "${centralEntity}"
- Source Context: "${sourceContext}"

Based on the above and the full business context, suggest EXACTLY 3 different "Central Search Intent" options. A Central Search Intent is a concise phrase representing the primary goal or question a user has when searching for the central entity.

**CRITICAL: You MUST return EXACTLY 3 different intent options. Do not return fewer than 3.**

For each option, provide:
1. "intent": The search intent phrase
2. "reasoning": Why this intent is effective

${businessContext(info)}
${jsonResponseInstruction}
**IMPORTANT: Return a JSON ARRAY with EXACTLY 3 objects. Example format:**
[
  {"intent": "Intent phrase 1", "reasoning": "..."},
  {"intent": "Intent phrase 2", "reasoning": "..."},
  {"intent": "Intent phrase 3", "reasoning": "..."}
]
`;

export const DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT = (info: BusinessInfo, pillars: SEOPillars): string => `
You are an expert in semantic modeling and knowledge graphs. Based on the SEO Pillars and business context, generate EXACTLY 15 fundamental semantic triples (Entity-Attribute-Value, or Subject-Predicate-Object).

**CRITICAL: You MUST return EXACTLY 15 different semantic triples. Do not return fewer than 15.**

These triples represent the core, undisputed facts about the Central Entity. They will form the semantic skeleton of the topical map.

SEO Pillars:
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

${businessContext(info)}

**ATTRIBUTE CATEGORIES (CRITICAL for semantic authority):**
Assign each triple ONE of these categories based on its importance:
- **ROOT**: Core defining attributes that establish entity identity (what it IS, essential characteristics). Target ~30% of triples.
- **UNIQUE**: Differentiating features that set the entity apart from competitors (USPs, exclusive capabilities). Target ~30% of triples.
- **RARE**: Detailed/technical attributes that demonstrate deep expertise (specs, advanced details). Target ~25% of triples.
- **COMMON**: General/shared attributes common across the industry. Target ~15% of triples.

**LEXICAL ENRICHMENT (for semantic richness):**
For each triple, provide:
- synonyms: 2-3 alternative terms for the object value
- antonyms: 1-2 opposite/contrasting concepts (if applicable, otherwise empty array)

Each triple must be a JSON object with the structure:
{
  "subject": { "label": "string", "type": "string" },
  "predicate": { "relation": "string", "type": "string", "category": "ROOT|UNIQUE|RARE|COMMON" },
  "object": { "value": "string or number", "type": "string" },
  "lexical": { "synonyms": ["string"], "antonyms": ["string"] }
}

Example:
{
  "subject": { "label": "Contract Management Software", "type": "Concept" },
  "predicate": { "relation": "HAS_FEATURE", "type": "Property", "category": "UNIQUE" },
  "object": { "value": "Automated Workflows", "type": "Feature" },
  "lexical": { "synonyms": ["workflow automation", "process automation", "automated processes"], "antonyms": ["manual processes", "hand-operated workflows"] }
}

${jsonResponseInstruction}
Your output should be a JSON array of these triple objects.
`;

// Helper function to calculate category distribution for expansion prompt
const getCategoryDistribution = (triples: SemanticTriple[]): string => {
  const counts: Record<string, number> = { ROOT: 0, UNIQUE: 0, RARE: 0, COMMON: 0 };
  triples.forEach(t => {
    const cat = t.predicate?.category || 'COMMON';
    if (cat in counts) counts[cat]++;
  });
  return Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`).join('\n');
};

export const EXPAND_SEMANTIC_TRIPLES_PROMPT = (info: BusinessInfo, pillars: SEOPillars, existingTriples: SemanticTriple[], count: number = 15): string => `
You are an expert in semantic modeling for SEO knowledge graphs.

**CRITICAL REQUIREMENT: Generate EXACTLY ${count} new semantic triples. NOT 10, NOT 15, but EXACTLY ${count} triples.**

Your task: Expand the existing semantic triples by adding ${count} NEW, unique triples that DO NOT duplicate any existing ones.

SEO Pillars:
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}

**Current Category Distribution (aim to balance):**
${getCategoryDistribution(existingTriples)}

**ATTRIBUTE CATEGORIES (distribute across all):**
- **ROOT** (~30%): Core defining attributes - identity, essential characteristics
- **UNIQUE** (~30%): Differentiating features - USPs, competitive advantages
- **RARE** (~25%): Technical/expert details - specs, deep knowledge
- **COMMON** (~15%): General/industry-standard attributes

**EXPANSION STRATEGIES (use ALL of these to generate ${count} triples):**
1. **Deep Features**: Technical specifications, components, variations
2. **Benefits & Outcomes**: Value propositions, user benefits, ROI factors
3. **Processes & Methods**: How things work, methodologies, procedures
4. **Comparisons**: Versus alternatives, differentiators, positioning
5. **Use Cases**: Applications, scenarios, industries, user types
6. **Requirements**: Prerequisites, dependencies, compatibility
7. **Risks & Challenges**: Common issues, limitations, considerations
8. **Related Concepts**: Adjacent topics, ecosystems, integrations

**LEXICAL ENRICHMENT (for each triple):**
- synonyms: 2-3 alternative terms for the object value
- antonyms: 1-2 contrasting concepts (if applicable, otherwise empty array)

**EXISTING TRIPLES TO AVOID DUPLICATING (${existingTriples.length} total):**
${JSON.stringify(existingTriples.slice(0, Math.min(30, existingTriples.length)), null, 2)}
${existingTriples.length > 30 ? `\n...and ${existingTriples.length - 30} more existing triples (all must be avoided)` : ''}

${businessContext(info)}

**OUTPUT FORMAT - JSON array with EXACTLY ${count} objects:**
[
  {
    "subject": { "label": "string", "type": "string" },
    "predicate": { "relation": "VERB_PHRASE", "type": "string", "category": "ROOT|UNIQUE|RARE|COMMON" },
    "object": { "value": "string or number", "type": "string" },
    "lexical": { "synonyms": ["string"], "antonyms": ["string"] }
  },
  // ... repeat for all ${count} triples
]

${jsonResponseInstruction}

**FINAL CHECK: Your response MUST contain EXACTLY ${count} triple objects in the array. Count them before responding.**
`;

export const GENERATE_INITIAL_TOPICAL_MAP_PROMPT = (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string => {
    const typeConfig = info.websiteType ? getWebsiteTypeConfig(info.websiteType) : null;
    const hubSpokeRatio = typeConfig?.hubSpokeRatio.optimal || 7;
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are a Holistic SEO Architect. Your task is to generate a massive, high-authority Topical Map based on the provided strategic inputs.

${languageInstruction}
**IMPORTANT:** All topic titles, descriptions, and canonical queries MUST be in ${getRegionalLanguageVariant(info.language, info.region)}. This is critical for SEO targeting.

**CRITICAL OBJECTIVE:** You must exhaustively explore every facet of the topic. You CANNOT be lazy. You MUST generate depth.

Strategic Inputs:
- SEO Pillars: ${JSON.stringify(pillars, null, 2)}
- Core Semantic Triples (EAVs): ${JSON.stringify(eavs.slice(0, 20), null, 2)}
- Key Competitors: ${competitors.join(', ')}

${businessContext(info)}

${getWebsiteTypeInstructions(info.websiteType)}

**SEMANTIC HIERARCHY RULES (CRITICAL):**
A **CORE TOPIC** represents a DISTINCT ATTRIBUTE FACET of the Central Entity. It must be a fundamentally different service, product category, problem type, or major functional area.
An **OUTER TOPIC (Spoke)** is a VARIATION, MODIFIER, or SPECIFIC INSTANCE of a Core Topic.

**FORBIDDEN AS CORE TOPICS (These MUST be SPOKES instead):**
- Location variants (e.g., "[Service] in Amsterdam" → SPOKE, not core)
- Price/cost modifiers (e.g., "Cheap [Service]" → SPOKE)
- Urgency variants (e.g., "Emergency [Service]" → SPOKE)
- Size/scope variants (e.g., "Small Business [Service]" → SPOKE)
- Brand comparisons (e.g., "[Service] vs [Competitor]" → SPOKE)

**VALID CORE TOPIC EXAMPLES:**
- Different service categories (Installation vs Repair vs Maintenance)
- Different product types (Residential vs Commercial systems)
- Different problem domains (Detection vs Prevention vs Response)
- Different functional areas (Assessment vs Implementation vs Support)

**Expansion Strategy (Think in ${getLanguageName(info.language)}):**
1.  **Monetization Section (Core Section / Money Pages):**
    *   **MANDATORY: Generate a MINIMUM of 6 SEMANTICALLY DISTINCT Core Topics.**
    *   Each Core Topic MUST target a different attribute/facet of "${pillars.centralEntity}"
    *   **HARD CONSTRAINT (1:${hubSpokeRatio} HUB-SPOKE RATIO):** For EVERY Core Topic, generate exactly **${hubSpokeRatio} unique Spokes**.
    *   *Spoke Ideas:* Location variants, price tiers, urgency levels, specific use cases, comparisons, checklists.
    *   *Example Structure:* "[Service Type]" (Core) → "Emergency [Service Type]", "[Service Type] Costs", "[Service Type] in [Location]", etc. (Spokes)

2.  **Informational Section (Author Section / Trust Pages):**
    *   Topics related to "${pillars.centralEntity} + Knowledge/Background/Trust".
    *   Generate 3-5 distinct clusters covering: Laws/Regulations, General Costs, Procedures, Industry Background.
    *   Each cluster must have 3-5 supporting spokes.

**Granular Node Identity (REQUIRED for each topic):**
For every topic (Core AND Spoke), provide:
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
      // ... MUST HAVE ${hubSpokeRatio} SPOKES HERE ...
  ]
}

${jsonResponseInstruction}
`;
};

// Section-specific prompts for chunked generation to avoid token truncation
export const GENERATE_MONETIZATION_SECTION_PROMPT = (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);
    const regionalLang = getRegionalLanguageVariant(info.language, info.region);

    return `
You are a Holistic SEO Architect. Your task is to generate the MONETIZATION SECTION of a topical map.

${languageInstruction}
**IMPORTANT:** All topic titles, descriptions, and canonical queries MUST be in ${regionalLang}. This is critical for SEO targeting.

Strategic Inputs:
- SEO Pillars: ${JSON.stringify(pillars, null, 2)}
- Core Semantic Triples (EAVs): ${JSON.stringify(eavs.slice(0, 15), null, 2)}
- Key Competitors: ${competitors.join(', ')}

${businessContext(info)}

**SEMANTIC HIERARCHY RULES (CRITICAL):**
A **CORE TOPIC** represents a DISTINCT ATTRIBUTE FACET of the Central Entity - a fundamentally different service, product category, or major functional area.
An **OUTER TOPIC (Spoke)** is a VARIATION, MODIFIER, or SPECIFIC INSTANCE of a Core Topic.

**FORBIDDEN AS CORE TOPICS (Must be SPOKES):**
- Location variants ("[Service] in [City]" → SPOKE)
- Price modifiers ("Cheap/Affordable [Service]" → SPOKE)
- Urgency variants ("Emergency [Service]" → SPOKE)
- Size variants ("Small Business [Service]" → SPOKE)
- Comparisons ("[Service] vs [Competitor]" → SPOKE)

**VALID CORE TOPICS:**
- Different service categories (Installation vs Repair vs Maintenance)
- Different product types (Residential vs Commercial)
- Different problem domains (Detection vs Prevention vs Response)

**Monetization Section (Core Section / Money Pages):**
- Generate 5-8 SEMANTICALLY DISTINCT Core Topics
- Each Core Topic MUST represent a different attribute/facet of "${pillars.centralEntity}"
- Each Core Topic MUST have 5-7 unique Spokes
- Spokes should include: location variants, price tiers, urgency levels, comparisons

**For each topic provide:**
- "title": Topic title in ${regionalLang} (must be distinct attribute, NOT a modifier variant)
- "description": Brief 1-2 sentence description in ${regionalLang}
- "canonical_query": The main search query in ${regionalLang}
- "query_network": 3-5 related keywords in ${regionalLang}
- "url_slug_hint": URL-friendly version (2-3 words)
- "spokes": Array of supporting topics (variations/modifiers) with same structure

Keep descriptions concise.

Output a JSON object with a single key "topics" containing an array of Core Topics.

${jsonResponseInstruction}
`;
};

export const GENERATE_INFORMATIONAL_SECTION_PROMPT = (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string => {
    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);
    const regionalLang = getRegionalLanguageVariant(info.language, info.region);

    return `
You are a Holistic SEO Architect. Your task is to generate the INFORMATIONAL SECTION of a topical map.

${languageInstruction}
**IMPORTANT:** All topic titles, descriptions, and canonical queries MUST be in ${regionalLang}. This is critical for SEO targeting.

Strategic Inputs:
- SEO Pillars: ${JSON.stringify(pillars, null, 2)}
- Core Semantic Triples (EAVs): ${JSON.stringify(eavs.slice(0, 15), null, 2)}
- Key Competitors: ${competitors.join(', ')}

${businessContext(info)}

**SEMANTIC HIERARCHY RULES:**
A **CORE TOPIC** represents a DISTINCT KNOWLEDGE DOMAIN related to the Central Entity.
An **OUTER TOPIC (Spoke)** is a specific aspect, sub-question, or variation within that knowledge domain.

**VALID CORE TOPICS for Informational Section:**
- Laws & Regulations governing "${pillars.centralEntity}"
- Cost Structures & Pricing Information
- Industry Standards & Best Practices
- Technical/How-It-Works Explanations
- History & Background of the Industry

**Informational Section (Trust & Authority Pages):**
- Generate 3-5 DISTINCT knowledge domain clusters
- Each Core Topic should have 3-5 supporting Spokes
- Focus on: educational content, guides, explanations, industry knowledge

**For each topic provide:**
- "title": Topic title in ${regionalLang} (distinct knowledge domain)
- "description": Brief 1-2 sentence description in ${regionalLang}
- "canonical_query": The main search query in ${regionalLang}
- "query_network": 3-5 related keywords in ${regionalLang}
- "url_slug_hint": URL-friendly version (2-3 words)
- "spokes": Array of specific aspects/questions within this domain

Keep descriptions concise.

Output a JSON object with a single key "topics" containing an array of Core Topics.

${jsonResponseInstruction}
`;
};

// Prompt to classify topics into Core Section (monetization) or Author Section (informational)
// Also checks topic type (core vs outer) for misclassifications
export const CLASSIFY_TOPIC_SECTIONS_PROMPT = (info: BusinessInfo, topics: { id: string, title: string, description: string, type?: string, parent_topic_id?: string | null }[]): string => `
You are a Holistic SEO Architect. Your task is to classify topics into the correct Topical Map Section AND verify their hierarchy type is correct.

**PART 1: Section Classification (topic_class)**

**Section Definitions:**
1. **Core Section (monetization)**: Money pages focused on conversion, services, products, pricing, quotes, comparisons of offerings.
   - Examples: "Roof Repair Services", "Get a Quote", "Pricing Plans", "Product Comparison", "[Service] Costs"

2. **Author Section (informational)**: Trust/authority pages focused on education, guides, explanations, background knowledge.
   - Examples: "What is [Topic]", "Guide to [Topic]", "History of [Topic]", "How [Topic] Works", "Benefits of [Topic]"

**PART 2: Type Verification (type: core vs outer)**

**Type Definitions:**
- **Core (Hub/Pillar)**: Represents a DISTINCT attribute facet - a fundamentally different service category, product type, or problem domain
- **Outer (Spoke/Cluster)**: A variation, modifier, or specific instance of a core topic

**MISCLASSIFIED AS CORE (Should be OUTER):**
- Location variants ("[Service] in [City]" → Should be outer)
- Price modifiers ("Cheap/Affordable [Service]" → Should be outer)
- Urgency variants ("Emergency [Service]" → Should be outer)
- Size variants ("Small Business [Service]" → Should be outer)
- Comparisons ("[Service] vs [Competitor]" → Should be outer)

**VALID CORE TOPICS:**
- Different service categories (Installation vs Repair vs Maintenance)
- Different product types (Residential vs Commercial systems)
- Different problem domains (Detection vs Prevention vs Response)

${businessContext(info)}

**Topics to Classify:**
${JSON.stringify(topics.map(t => ({ id: t.id, title: t.title, description: t.description, currentType: t.type || 'unknown' })), null, 2)}

**Rules for topic_class:**
- If a topic is about a SERVICE, PRODUCT, PRICING, QUOTE, or direct business offering → "monetization"
- If a topic is educational, explanatory, or provides background knowledge → "informational"

**Rules for type:**
- Only suggest a type change if the current type is clearly wrong
- If a topic marked as "core" is actually a modifier/variant, suggest changing to "outer"
- If suggesting "outer", also suggest which existing core topic should be its parent (suggestedParentTitle)

${jsonResponseInstruction}
Respond with a JSON array of objects:
[
  {
    "id": "topic-id",
    "topic_class": "monetization" | "informational",
    "suggestedType": "core" | "outer" | null,
    "suggestedParentTitle": "Title of parent core topic" | null,
    "typeChangeReason": "Why the type should change" | null
  }
]

Note: Only include suggestedType, suggestedParentTitle, and typeChangeReason if you're recommending a type change. Otherwise set them to null.
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

    const languageInstruction = getLanguageAndRegionInstruction(info.language, info.region);

    return `
You are an expert Algorithmic Architect and Holistic SEO Strategist.
Your goal is to generate a content brief that strictly minimizes the **Cost of Retrieval** for search engines.
You do not write generic outlines. You engineer data structures for information retrieval.

${languageInstruction}

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
      "anchor_texts": [{ "phrase": "string", "target_topic_id": "string" }]
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
  "discourse_anchors": ["string", "string"],
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

export const VALIDATE_TOPICAL_MAP_PROMPT = (
    topics: EnrichedTopic[],
    pillars: SEOPillars,
    info: BusinessInfo,
    foundationPages?: FoundationPage[],
    navigation?: NavigationStructure | null
): string => {
    // Build hierarchy context for validation
    const coreTopics = topics.filter(t => t.type === 'core');
    const outerTopics = topics.filter(t => t.type === 'outer');

    // Foundation pages context
    const foundationContext = foundationPages ? `
**FOUNDATION PAGES:**
${JSON.stringify(foundationPages.map(p => ({
    type: p.page_type,
    title: p.title,
    hasMetaDescription: !!p.meta_description,
    hasH1Template: !!p.h1_template,
    hasNAPData: !!p.nap_data,
    sectionsCount: p.sections?.length || 0,
    schemaType: p.schema_type,
    isDeleted: !!p.deleted_at
})), null, 2)}
` : '';

    // Navigation context
    const navigationContext = navigation ? `
**NAVIGATION STRUCTURE:**
- Header Links: ${navigation.header?.primary_nav?.length || 0} (max: ${navigation.max_header_links || 10})
- Footer Sections: ${navigation.footer?.sections?.length || 0}
- Footer Legal Links: ${navigation.footer?.legal_links?.length || 0}
- Total Footer Links: ${(navigation.footer?.sections?.reduce((acc: number, s: any) => acc + (s.links?.length || 0), 0) || 0) + (navigation.footer?.legal_links?.length || 0)} (max: ${navigation.max_footer_links || 30})
- NAP Display Enabled: ${navigation.footer?.nap_display ?? true}
- Dynamic by Section: ${navigation.dynamic_by_section ?? true}
` : '';

    // Calculate hub-spoke distribution
    const hubSpokeAnalysis = coreTopics.map(core => {
        const spokes = outerTopics.filter(o => o.parent_topic_id === core.id);
        return {
            title: core.title,
            topic_class: core.topic_class || 'unknown',
            spokeCount: spokes.length,
            spokeTitles: spokes.map(s => s.title)
        };
    });

    // Identify orphaned topics
    const orphanedTopics = outerTopics.filter(o =>
        !o.parent_topic_id || !coreTopics.find(c => c.id === o.parent_topic_id)
    );

    return `
You are a Holistic SEO Auditor. Validate the topical map against strict semantic and structural rules.

**HIERARCHY STRUCTURE:**
Core Topics (Hubs) with their Spokes:
${JSON.stringify(hubSpokeAnalysis, null, 2)}

Orphaned Topics (No Parent):
${JSON.stringify(orphanedTopics.map(t => ({ title: t.title, topic_class: t.topic_class })), null, 2)}

**FULL TOPIC LIST:**
${JSON.stringify(topics.map(t => ({
    title: t.title,
    type: t.type,
    topic_class: t.topic_class || 'unknown',
    parent: coreTopics.find(c => c.id === t.parent_topic_id)?.title || null,
    description: t.description
})), null, 2)}

**SEO Pillars:**
${JSON.stringify(pillars, null, 2)}

${foundationContext}
${navigationContext}

${businessContext(info)}

**VALIDATION RULES (Check ALL):**

1. **Hub-Spoke Ratio (Rule D - CRITICAL):**
   - Every Core Topic MUST have ~7 spokes (optimal range: 4-15)
   - Less than 4 spokes = UNDER_SUPPORTED (CRITICAL)
   - More than 15 spokes = DILUTED (WARNING)
   - Flag each hub with its actual spoke count

2. **Section Classification (Rule E - CRITICAL):**
   - All topics MUST have topic_class: "monetization" or "informational"
   - Monetization (Core Section): Services, products, pricing, quotes
   - Informational (Author Section): Educational, guides, explanations
   - Flag topics with missing or "unknown" classification

3. **Type Misclassification (Rule G - CRITICAL):**
   - Core topics MUST represent DISTINCT attribute facets, NOT variations/modifiers
   - **MISCLASSIFIED AS CORE (Should be OUTER):**
     * Location variants ("[Service] in [City]" → Should be outer)
     * Price modifiers ("Cheap/Affordable [Service]" → Should be outer)
     * Urgency variants ("Emergency [Service]" → Should be outer)
     * Size variants ("Small Business [Service]" → Should be outer)
     * Comparisons ("[Service] vs [Competitor]" → Should be outer)
   - **VALID CORE TOPICS:**
     * Different service categories (Installation vs Repair vs Maintenance)
     * Different product types (Residential vs Commercial systems)
     * Different problem domains (Detection vs Prevention vs Response)
   - Flag any core topic that appears to be a modifier/variant of another core topic
   - Suggest reclassification: which core topic it should become a spoke of

4. **Orphan Detection (Rule F - WARNING):**
   - All outer topics MUST have a valid parent_topic_id
   - Flag orphaned topics that need parent assignment

5. **Focus Check (Rule A - CRITICAL):**
   - Topics must align with Central Entity ("${pillars.centralEntity}")
   - Flag topics about related but distinct entities

6. **Context Check (Rule B - WARNING):**
   - Topics must align with Source Context ("${pillars.sourceContext}")
   - Flag contradicting topics (e.g., "Free" topics when context is "Enterprise")

7. **Flow Check (Rule C - WARNING):**
   - Author Section clusters must semantically bridge to Core Section
   - Flag orphaned clusters with no monetization connection

8. **Foundation Page Completeness (Rule H - WARNING):**
   - Check if foundation pages are provided
   - Required pages: homepage, about, contact, privacy, terms
   - Each page should have: title, meta_description, h1_template
   - Homepage and About pages should have NAP data for local SEO
   - Pages should have appropriate schema_type (Organization, AboutPage, ContactPage, WebPage)
   - Flag missing pages or incomplete page data

9. **Navigation Structure (Rule I - SUGGESTION):**
   - Check if navigation structure is provided
   - Header should have ≤10 primary navigation links
   - Footer should have ≤30 total links
   - Homepage must be in header navigation
   - Legal pages (privacy, terms) should be in footer
   - NAP display should be enabled for local businesses
   - Flag if link limits are exceeded or essential links missing

**Output Format:**
{
  "overallScore": 0-100,
  "summary": "Brief assessment of map health",
  "hubSpokeAnalysis": {
    "underSupported": [{ "hub": "Title", "spokeCount": 2, "spokesNeeded": 5 }],
    "diluted": [{ "hub": "Title", "spokeCount": 18 }],
    "optimal": [{ "hub": "Title", "spokeCount": 7 }]
  },
  "typeMisclassifications": [
    {
      "topicTitle": "Title of misclassified topic",
      "currentType": "core",
      "shouldBe": "outer",
      "reason": "This is a location variant of [Parent Topic]",
      "suggestedParent": "Title of the core topic it should belong to"
    }
  ],
  "issues": [
    {
      "rule": "Rule Name",
      "message": "Description of the issue",
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "offendingTopics": ["Topic 1", "Topic 2"],
      "suggestedAction": "What should be done to fix this"
    }
  ],
  "foundationPageIssues": {
    "missingPages": ["about", "contact"],
    "incompletePages": [
      { "pageType": "homepage", "missingFields": ["meta_description", "nap_data"] }
    ],
    "suggestions": ["Add NAP data for better local SEO", "Complete meta descriptions"]
  },
  "navigationIssues": {
    "headerLinkCount": 12,
    "headerLinkLimit": 10,
    "footerLinkCount": 25,
    "footerLinkLimit": 30,
    "missingInHeader": ["homepage"],
    "missingInFooter": ["privacy", "terms"],
    "suggestions": ["Reduce header links to 10 or fewer", "Add legal pages to footer"]
  }
}

${jsonResponseInstruction}
`;
};

export const IMPROVE_TOPICAL_MAP_PROMPT = (topics: EnrichedTopic[], issues: ValidationIssue[], info: BusinessInfo): string => {
    // Separate core and outer topics for hierarchy context
    const coreTopics = topics.filter(t => t.type === 'core');
    const outerTopics = topics.filter(t => t.type === 'outer');

    // Calculate hub-spoke ratios for context
    const hubSpokeInfo = coreTopics.map(core => {
        const spokeCount = outerTopics.filter(o => o.parent_topic_id === core.id).length;
        return {
            id: core.id,
            title: core.title,
            topic_class: core.topic_class || 'informational',
            spokeCount,
            needsSpokes: spokeCount < 7,
            spokesNeeded: Math.max(0, 7 - spokeCount)
        };
    });

    return `
You are a Holistic SEO Architect. Generate improvements for the topical map based on validation issues.

**CRITICAL HIERARCHY RULES (MUST FOLLOW):**
1. **Hub-Spoke Ratio (1:7)**: Every Core Topic (hub) MUST have approximately 7 Outer Topics (spokes).
2. **Section Classification**: New topics MUST be assigned to either "monetization" (Core Section) or "informational" (Author Section).
3. **Parent Assignment**: Every new Outer Topic MUST specify which Core Topic it belongs to.
4. **Link Flow Direction**: Author Section topics support Core Section topics with PageRank flow.

**Current Topical Map Structure:**
CORE TOPICS (Hubs):
${JSON.stringify(hubSpokeInfo, null, 2)}

OUTER TOPICS (Spokes):
${JSON.stringify(outerTopics.map(t => ({
    title: t.title,
    parent: coreTopics.find(c => c.id === t.parent_topic_id)?.title || 'ORPHANED',
    topic_class: t.topic_class || 'informational'
})), null, 2)}

**Validation Issues to Resolve:**
${JSON.stringify(issues, null, 2)}

${businessContext(info)}

**Instructions:**
Generate concrete actions to resolve ALL issues while maintaining proper hierarchy.

1. **For UNDER_SUPPORTED hubs** (spokeCount < 7): Add new outer topics as spokes. Each new spoke MUST specify:
   - "parentTopicTitle": The exact title of the core topic it belongs to
   - "topic_class": "monetization" or "informational"

2. **For new CORE topics**: They become new hubs and should have at least 3-5 initial spokes suggested.

3. **For topics to DELETE**: Consider if their semantic content should be MERGED into another topic instead of pure deletion.

4. **For MISCLASSIFIED topics** (core topics that should be outer):
   - Reclassify location variants, price modifiers, urgency variants as OUTER topics
   - Assign them to the appropriate core topic parent
   - Keep valid distinct attribute facets as CORE topics

**Output Format:**
{
  "newTopics": [
    {
      "title": "Topic Title",
      "description": "Brief description",
      "type": "core" | "outer",
      "topic_class": "monetization" | "informational",
      "parentTopicTitle": "Exact title of parent core topic (REQUIRED if type is 'outer', null if 'core')",
      "reasoning": "Why this topic is needed and where it fits in the hierarchy"
    }
  ],
  "topicTitlesToDelete": ["Topic Title 1"],
  "topicMerges": [
    {
      "sourceTitle": "Topic to be merged away",
      "targetTitle": "Topic to merge into",
      "reasoning": "Why these should be merged"
    }
  ],
  "hubSpokeGapFills": [
    {
      "hubTitle": "Core Topic Title",
      "newSpokes": [
        {
          "title": "New Spoke Title",
          "description": "Brief description",
          "topic_class": "monetization" | "informational"
        }
      ]
    }
  ],
  "typeReclassifications": [
    {
      "topicTitle": "Topic that needs reclassification",
      "newType": "outer",
      "newParentTitle": "Core topic it should belong to",
      "reasoning": "Why this is a modifier/variant not a distinct facet"
    }
  ]
}

${jsonResponseInstruction}
`;
};

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

export const ANALYZE_SEMANTIC_RELATIONSHIPS_PROMPT = (
    topics: EnrichedTopic[],
    businessInfo: BusinessInfo,
    preCalculatedPairs: { topicA: string; topicB: string; similarity: number }[]
): string => `
You are an expert SEO strategist analyzing semantic relationships between topics for internal linking strategy.

${businessContext(businessInfo)}

TOPIC LIST:
${JSON.stringify(topics.map(t => ({
    title: t.title,
    type: t.type,
    parentTitle: topics.find(p => p.id === t.parent_topic_id)?.title || null
})), null, 2)}

PRE-CALCULATED SIMILARITY SCORES (based on Knowledge Graph analysis):
${JSON.stringify(preCalculatedPairs.map(p => ({
    topicA: p.topicA,
    topicB: p.topicB,
    similarityScore: p.similarity.toFixed(2),
    interpretation: p.similarity >= 0.9 ? 'DIRECTLY_CONNECTED' :
                    p.similarity >= 0.5 ? 'STRONGLY_RELATED' :
                    p.similarity >= 0.3 ? 'MODERATELY_RELATED' : 'WEAKLY_RELATED'
})), null, 2)}

INSTRUCTIONS:
Analyze the semantic relationships and provide:

1. **pairs**: For each pre-calculated pair, determine:
   - relationship.type: 'SIBLING' (same parent or same level), 'RELATED' (different clusters but connected), 'DISTANT' (weak connection)
   - relationship.internalLinkingPriority: 'high' (must link), 'medium' (should link), 'low' (optional link)
   - relationship.bridge_topic_suggestion: If topics are distant but should be connected, suggest a bridge topic
   - distance.weightedScore: Convert similarity to distance (1 - similarity)

2. **summary**: A 2-3 sentence overview of the semantic structure (clustering patterns, isolated topics, etc.)

3. **actionableSuggestions**: 3-5 specific recommendations for improving topic connectivity

OUTPUT FORMAT (JSON):
{
    "summary": "string",
    "pairs": [
        {
            "topicA": "string",
            "topicB": "string",
            "distance": {
                "weightedScore": 0.0-1.0,
                "cosine_similarity": 0.0-1.0
            },
            "relationship": {
                "type": "SIBLING" | "RELATED" | "DISTANT",
                "internalLinkingPriority": "high" | "medium" | "low",
                "bridge_topic_suggestion": "string or null"
            }
        }
    ],
    "actionableSuggestions": ["string"]
}

${jsonResponseInstruction}
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
  project: { domain: string; centralEntity?: string; sourceContext?: string; centralSearchIntent?: string }
): string => `
You are an expert SEO consultant specializing in Holistic SEO and technical audits.
Generate a specific, actionable remediation for this audit issue.

**Project Context:**
- Domain: ${project.domain}
${project.centralEntity ? `- Central Entity: ${project.centralEntity}` : ''}
${project.sourceContext ? `- Source Context: ${project.sourceContext}` : ''}
${project.centralSearchIntent ? `- Central Search Intent: ${project.centralSearchIntent}` : ''}

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
  project: { domain: string; centralEntity?: string; sourceContext?: string }
): string => `
You are an expert SEO consultant. Generate specific remediations for multiple audit issues.

**Project Context:**
- Domain: ${project.domain}
${project.centralEntity ? `- Central Entity: ${project.centralEntity}` : ''}
${project.sourceContext ? `- Source Context: ${project.sourceContext}` : ''}

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
  project: { domain: string; centralEntity?: string; sourceContext?: string; centralSearchIntent?: string },
  previousSuggestions: Array<{
    ruleId: string;
    title: string;
    suggestedValue: string;
    reasoning: string;
  }>
): string => `
You are an expert SEO consultant specializing in Holistic SEO and technical audits.
Generate a specific, actionable remediation for this audit issue.

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

// ============================================
// MIGRATION WORKBENCH PROMPTS
// ============================================

export const SEMANTIC_CHUNKING_PROMPT = (markdown: string, businessInfo: BusinessInfo): string => `
You are an expert content analyst specializing in semantic segmentation.
Your task is to analyze the following markdown content and break it into semantically coherent chunks.

${businessContext(businessInfo)}

**Content to Analyze:**
"""
${markdown}
"""

**Chunking Rules:**
1. Each chunk should represent a single, coherent topic or concept
2. Chunks should be 100-500 words each (approximate)
3. Preserve heading hierarchy context
4. Identify the semantic focus of each chunk
5. Tag each chunk with relevant entity types

${jsonResponseInstruction}
Return a JSON array of chunk objects:
[
  {
    "id": "chunk_1",
    "content": "The chunk text...",
    "heading_context": "H2: Parent Heading > H3: Current Heading",
    "semantic_focus": "Brief description of what this chunk covers",
    "entity_tags": ["Entity1", "Entity2"],
    "word_count": 250,
    "position": 1
  }
]
`;

export const GENERATE_MIGRATION_DECISION_PROMPT = (
  inventoryItem: { url: string; title: string; content_summary?: string; metrics?: any },
  topicalMap: { pillars: any; topics: any[] },
  businessInfo: BusinessInfo
): string => `
You are an expert SEO strategist specializing in content migration and optimization.
Analyze this existing page and recommend a migration action.

${businessContext(businessInfo)}

**Page to Analyze:**
- URL: ${inventoryItem.url}
- Title: ${inventoryItem.title}
${inventoryItem.content_summary ? `- Content Summary: ${inventoryItem.content_summary}` : ''}
${inventoryItem.metrics ? `- Performance Metrics: ${JSON.stringify(inventoryItem.metrics)}` : ''}

**Strategic Context (Topical Map):**
- Central Entity: ${topicalMap.pillars?.centralEntity || 'Not defined'}
- Source Context: ${topicalMap.pillars?.sourceContext || 'Not defined'}
- Existing Topics: ${topicalMap.topics?.slice(0, 20).map((t: any) => t.title).join(', ') || 'None'}

**Decision Framework:**
Evaluate the page against these criteria:
1. **Relevance**: Does it align with the Central Entity and Source Context?
2. **Quality**: Is the content comprehensive and authoritative?
3. **Performance**: Are there traffic/ranking signals worth preserving?
4. **Redundancy**: Does it overlap with planned topical map content?

**Available Actions:**
- KEEP: Page is valuable, keep as-is with minor updates
- REWRITE: Content is relevant but needs significant improvement
- MERGE: Content should be consolidated with another page
- REDIRECT_301: Page should redirect to a more relevant destination
- PRUNE_410: Page should be removed (low value, no redirect target)
- CANONICALIZE: Page is duplicate, should point to canonical version

${jsonResponseInstruction}
Return a JSON object:
{
  "action": "KEEP" | "REWRITE" | "MERGE" | "REDIRECT_301" | "PRUNE_410" | "CANONICALIZE",
  "confidence": 85,
  "reasoning": "Detailed explanation of why this action is recommended...",
  "target_url": "If REDIRECT_301 or MERGE, the target URL or topic title",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "estimated_effort": "Brief effort estimate (e.g., '2-3 hours', 'Full rewrite needed')",
  "key_content_to_preserve": ["List of valuable content elements to keep if rewriting/merging"]
}
`;

// ============================================
// FOUNDATION PAGES & NAVIGATION PROMPTS
// ============================================

export const GENERATE_FOUNDATION_PAGES_PROMPT = (info: BusinessInfo, pillars: SEOPillars): string => `
You are an expert Holistic SEO Architect specializing in website structure and E-A-T optimization.
Your task is to generate Foundation Pages for a website based on the business context and SEO pillars.

${businessContext(info)}

**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

**Foundation Pages to Generate:**
Generate specifications for 5 essential foundation pages that establish authority and trust.

**CRITICAL E-A-T RULES:**
1. **Homepage** = Entity Home - The H1 MUST include the Central Entity + Source Context
2. **About Page** = E-A-T Corroboration - Must demonstrate expertise, credentials, team
3. **Contact Page** = NAP Consistency - Must include full Name, Address, Phone, Email
4. **Privacy Policy** = Legal Trust Signal - Standard but professional
5. **Terms of Service** = Legal Trust Signal - Standard but professional

**Homepage Specific Rules (from Holistic SEO):**
- H1 Template: Include Central Entity + Source Context (e.g., "[Central Entity]: [Source Context]")
- First 400 characters = "Centerpiece Text" - Must contain core value prop + CTA
- Target the canonical query for the main business offering
- Schema: Organization

**About Page Rules:**
- H1: "About [Company Name]" or "Over [Company Name]"
- Sections: Company Story, Mission/Values, Team/Expertise, Credentials/Awards
- Schema: AboutPage
- E-A-T Focus: Demonstrate WHY users should trust this entity

**Contact Page Rules:**
- H1: "Contact [Company Name]"
- Sections: Contact Form, NAP Data, Business Hours, Map/Location
- Schema: ContactPage
- NAP Consistency: Use EXACT same NAP across all pages

**For each page, generate:**
1. page_type: The type identifier
2. title: SEO-optimized title (include Central Entity where appropriate)
3. slug: URL slug (e.g., "/about", "/contact")
4. meta_description: 150-160 chars, include Central Entity + Source Context
5. h1_template: H1 heading template
6. schema_type: Appropriate Schema.org type
7. sections: Array of content sections with {heading, purpose, required}

**NAP Data Suggestions:**
Based on the business context, suggest appropriate NAP (Name, Address, Phone) structure.
If specific data isn't available, provide placeholder guidance.

${jsonResponseInstruction}
Return a JSON object:
{
  "foundationPages": [
    {
      "page_type": "homepage",
      "title": "...",
      "slug": "/",
      "meta_description": "...",
      "h1_template": "...",
      "schema_type": "Organization",
      "sections": [
        { "heading": "...", "purpose": "...", "required": true }
      ]
    }
  ],
  "napDataSuggestions": {
    "company_name": "Suggested company name based on domain/context",
    "address_hint": "Placeholder or guidance for address",
    "phone_hint": "Format suggestion (e.g., +31 XX XXX XXXX for Netherlands)",
    "email_hint": "Suggested email format (e.g., info@domain.com)"
  },
  "navigationSuggestions": {
    "headerLinks": ["Homepage", "About", "Services", "Contact"],
    "footerSections": [
      { "heading": "Company", "links": ["About Us", "Contact", "Careers"] },
      { "heading": "Legal", "links": ["Privacy Policy", "Terms of Service"] }
    ],
    "ctaButton": { "text": "Get Started", "target": "contact" }
  }
}
`;

export const GENERATE_DEFAULT_NAVIGATION_PROMPT = (
  foundationPages: { page_type: string; title: string; slug: string }[],
  coreTopics: { id: string; title: string; slug?: string; cluster_role?: string; topic_class?: string }[],
  info: BusinessInfo
): string => {
  // Identify pillars and monetization topics for prioritization
  const pillarTopics = coreTopics.filter(t => t.cluster_role === 'pillar');
  const monetizationTopics = coreTopics.filter(t => t.topic_class === 'monetization');
  const informationalTopics = coreTopics.filter(t => t.topic_class === 'informational');

  return `
You are an expert Information Architect specializing in website navigation.
Generate an optimal navigation structure based on the foundation pages and core topics.

${businessContext(info)}

**Available Foundation Pages:**
${JSON.stringify(foundationPages, null, 2)}

**PILLAR TOPICS (High Authority Hub Pages - MUST prioritize in header):**
${pillarTopics.length > 0
  ? pillarTopics.map(t => `- ${t.title} (${t.slug || 'no-slug'})`).join('\n')
  : '(No pillar topics identified - use monetization topics as priority)'}

**MONETIZATION TOPICS (Money Pages - High priority for PageRank):**
${monetizationTopics.slice(0, 8).map(t => `- ${t.title} (${t.slug || 'no-slug'})`).join('\n')}

**INFORMATIONAL TOPICS (Author Section - Medium priority):**
${informationalTopics.slice(0, 8).map(t => `- ${t.title} (${t.slug || 'no-slug'})`).join('\n')}

**NAVIGATION RULES (Holistic SEO):**
1. **Header Max Links: 10** - Only most important pages
2. **Footer Max Links: 30** - Organized into sections
3. **Total Page Links: Max 150** - Never exceed this
4. **Homepage MUST be in header** - Always first position
5. **PILLAR topics MUST be in header** - These are authority hubs
6. **Monetization topics HIGH priority** - These are money pages
7. **Legal pages in footer ONLY** - Privacy, Terms never in header
8. **Pure HTML links** - No JavaScript-dependent navigation
9. **Descriptive anchor text** - Never "Click here" or "Read more"
10. **N-gram injection** - Include Central Entity in header link text where natural

**PageRank Flow Strategy:**
- Direct PageRank to PILLAR pages first (hub pages)
- PILLAR pages distribute to their cluster content
- Monetization topics receive high placement for conversion
- Informational topics support but don't dominate header

**Header Structure:**
- Position 1: Homepage (Logo link)
- Positions 2-4: PILLAR topics (if available) or top monetization topics
- Positions 5-7: Key monetization/service pages
- Position 8-9: Key informational pages (if space)
- CTA Button: Contact or main conversion action

**Footer Structure:**
- Section 1: Main Services/Products (include PILLAR and monetization pages)
- Section 2: Resources/Information (informational topics)
- Section 3: Company (About, Contact, Careers)
- Section 4: Legal (Privacy, Terms)
- NAP Display: Company info at bottom

${jsonResponseInstruction}
Return a JSON object:
{
  "header": {
    "logo_alt_text": "Alt text for logo including Central Entity",
    "primary_nav": [
      {
        "text": "Link text",
        "target_foundation_page_id": "homepage|about|contact|null",
        "target_topic_id": "core-topic-id|null",
        "prominence": "high|medium",
        "order": 1
      }
    ],
    "cta_button": {
      "text": "CTA text",
      "target_foundation_page_id": "contact|null",
      "target_topic_id": "topic-id|null"
    }
  },
  "footer": {
    "sections": [
      {
        "heading": "Section Heading",
        "links": [
          {
            "text": "Link text",
            "target_foundation_page_id": "page-type|null",
            "target_topic_id": "topic-id|null",
            "prominence": "medium|low"
          }
        ]
      }
    ],
    "legal_links": [
      { "text": "Privacy Policy", "target_foundation_page_id": "privacy" },
      { "text": "Terms of Service", "target_foundation_page_id": "terms" }
    ],
    "nap_display": true,
    "copyright_text": "© ${new Date().getFullYear()} [Company Name]. All rights reserved."
  }
}
`;
};

export const VALIDATE_FOUNDATION_PAGES_PROMPT = (
  foundationPages: { page_type: string; title: string; h1_template?: string; meta_description?: string; sections?: any[]; nap_data?: any }[],
  navigation: { header?: any; footer?: any } | null,
  pillars: SEOPillars,
  info: BusinessInfo
): string => `
You are a Holistic SEO Auditor. Validate the foundation pages and navigation structure.

${businessContext(info)}

**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}

**Foundation Pages to Validate:**
${JSON.stringify(foundationPages, null, 2)}

**Navigation Structure:**
${navigation ? JSON.stringify(navigation, null, 2) : 'No navigation configured'}

**VALIDATION RULES:**

**1. Homepage Validation (CRITICAL):**
- H1 MUST include Central Entity
- Meta description MUST include Central Entity + Source Context
- Must have Organization schema

**2. About Page Validation (CRITICAL for E-A-T):**
- MUST exist for E-A-T compliance
- Should have sections for: Company Story, Team/Expertise, Credentials
- Schema should be AboutPage

**3. Contact Page Validation (CRITICAL):**
- MUST exist with NAP data
- NAP data MUST be consistent (same format everywhere)
- Schema should be ContactPage

**4. Legal Pages Validation (WARNING):**
- Privacy Policy recommended
- Terms of Service recommended

**5. Navigation Validation:**
- Header: Max 10 links
- Footer: Max 30 links per section
- Homepage MUST be in header
- Legal pages MUST be in footer
- No duplicate links
- No generic anchor text ("Click here", "Read more")

**6. Missing Pages Check:**
- Flag any standard foundation pages that don't exist
- Rate severity based on E-A-T impact

${jsonResponseInstruction}
Return a JSON object:
{
  "overallScore": 0-100,
  "summary": "Brief assessment",
  "foundationPageIssues": [
    {
      "page_type": "homepage|about|contact|etc",
      "issues": [
        {
          "rule": "Rule name",
          "message": "Issue description",
          "severity": "CRITICAL|WARNING|SUGGESTION",
          "fix": "How to fix"
        }
      ]
    }
  ],
  "navigationIssues": [
    {
      "location": "header|footer",
      "rule": "Rule name",
      "message": "Issue description",
      "severity": "CRITICAL|WARNING|SUGGESTION",
      "fix": "How to fix"
    }
  ],
  "missingPages": [
    {
      "page_type": "about|contact|etc",
      "reason": "Why this page is needed",
      "severity": "CRITICAL|WARNING",
      "impact": "E-A-T impact description"
    }
  ],
  "napConsistency": {
    "isConsistent": true|false,
    "issues": ["List of inconsistency issues if any"]
  }
}
`;

// ============================================
// INTERNAL LINKING AUDIT PROMPTS (Phase 5)
// ============================================

export const GENERATE_ALTERNATIVE_ANCHORS_PROMPT = (
  originalAnchor: string,
  targetTopicTitle: string,
  targetTopicDescription: string,
  info: BusinessInfo
): string => `
You are an SEO expert specializing in internal linking optimization.

${businessContext(info)}

**Task:** Generate 5 alternative anchor text variations for the following link to avoid repetition.

**Original Anchor Text:** "${originalAnchor}"
**Target Topic:** ${targetTopicTitle}
**Target Topic Description:** ${targetTopicDescription}

**Rules for Good Anchor Text:**
1. Must be descriptive and indicate what the target page is about
2. Avoid generic text like "click here", "read more", "learn more"
3. Include relevant keywords but don't over-optimize
4. Keep anchors natural and readable
5. Vary sentence structure (some can be noun phrases, others action-oriented)
6. Each variation should be distinctly different

${jsonResponseInstruction}
Return a JSON object:
{
  "originalAnchor": "${originalAnchor}",
  "alternatives": [
    {
      "anchor": "Alternative anchor text 1",
      "reasoning": "Why this variation works"
    },
    {
      "anchor": "Alternative anchor text 2",
      "reasoning": "Why this variation works"
    }
  ],
  "recommendedForUsage": "The best alternative anchor text"
}
`;

export const GENERATE_CONTEXTUAL_BRIDGE_PROMPT = (
  sourceTopicTitle: string,
  sourceTopicDescription: string,
  targetTopicTitle: string,
  targetTopicDescription: string,
  info: BusinessInfo
): string => `
You are an expert content strategist specializing in contextual linking.

${businessContext(info)}

**Task:** Create a contextual bridge paragraph that naturally connects two topics.
This bridge will appear at the end of the source article to create a logical transition.

**Source Topic:**
- Title: ${sourceTopicTitle}
- Description: ${sourceTopicDescription}

**Target Topic (to link to):**
- Title: ${targetTopicTitle}
- Description: ${targetTopicDescription}

**Requirements for the Bridge:**
1. The paragraph should be 2-4 sentences
2. Start by connecting the current topic to a related concept
3. Naturally introduce why the target topic is relevant
4. Include a natural anchor text placement (mark with [ANCHOR]text[/ANCHOR])
5. The transition should feel organic, not forced
6. Use H4 or H5 heading to introduce the bridge section

**Example structure:**
"While we've covered [source topic aspect], understanding [related concept] becomes crucial when [connection to target]. [ANCHOR]Target Topic[/ANCHOR] explores this in depth, covering [key aspect of target]."

${jsonResponseInstruction}
Return a JSON object:
{
  "heading": "Related: Heading text",
  "paragraph": "The bridge paragraph with [ANCHOR]anchor text[/ANCHOR] markup",
  "anchorText": "The exact anchor text to use",
  "annotationTextHint": "Surrounding context that reinforces the link relevance"
}
`;

export const FIND_LINK_SOURCE_PROMPT = (
  orphanedTopicTitle: string,
  orphanedTopicDescription: string,
  candidateTopics: { title: string; description: string; type: 'core' | 'outer' }[],
  info: BusinessInfo
): string => `
You are an SEO strategist specializing in internal link architecture.

${businessContext(info)}

**Task:** Identify the best topic(s) to link FROM to the orphaned topic below.

**Orphaned Topic (needs incoming links):**
- Title: ${orphanedTopicTitle}
- Description: ${orphanedTopicDescription}

**Candidate Source Topics:**
${candidateTopics.map((t, i) => `${i + 1}. [${t.type.toUpperCase()}] ${t.title}: ${t.description}`).join('\n')}

**Selection Criteria:**
1. Semantic relevance: Source topic should share related concepts
2. Link flow direction: Prefer informational to monetization flow (outer to core)
3. Reader journey: The link should make sense in context
4. Avoid redundancy: Don't suggest sources already linking to this topic
5. PageRank consideration: Core topics have more authority to share

${jsonResponseInstruction}
Return a JSON object:
{
  "bestSource": {
    "topicTitle": "Title of best source topic",
    "reasoning": "Why this is the best choice",
    "suggestedAnchor": "Recommended anchor text",
    "linkContext": "Brief description of where in the article to place the link"
  },
  "alternativeSources": [
    {
      "topicTitle": "Title of alternative source",
      "reasoning": "Why this could also work"
    }
  ]
}
`;

export const VALIDATE_EXTERNAL_LINKS_PROMPT = (
  externalLinks: { url: string; domain: string; anchorText: string; sourceTopic: string }[],
  info: BusinessInfo
): string => `
You are an E-A-T (Expertise, Authority, Trust) specialist.

${businessContext(info)}

**Task:** Evaluate external links for E-A-T compliance and authority signals.

**External Links to Evaluate:**
${externalLinks.map((l, i) => `${i + 1}. URL: ${l.url}\n   Domain: ${l.domain}\n   Anchor: "${l.anchorText}"\n   Source: ${l.sourceTopic}`).join('\n\n')}

**Evaluation Criteria:**
1. **Authority**: Is the domain a recognized authority in its field?
2. **Relevance**: Does the external content support the claims in your content?
3. **E-A-T Signal**: Does linking to this source strengthen your E-A-T?
4. **Competitor Check**: Is this a competitor domain?
5. **Integration**: Is the link naturally integrated in the text?

**Domain Categories to Identify:**
- .gov, .edu: High authority
- Industry associations: High authority
- Research institutions: High authority
- News/media: Medium authority
- Personal blogs: Low authority (unless expert)
- Competitor sites: Flag as issue

${jsonResponseInstruction}
Return a JSON object:
{
  "evaluations": [
    {
      "url": "External URL",
      "domain": "Domain name",
      "category": "government|academic|industry|research|news|blog|competitor|other",
      "authorityScore": 0-100,
      "eatValue": "HIGH|MEDIUM|LOW|NEGATIVE",
      "isCompetitor": false,
      "recommendation": "KEEP|REPLACE|REMOVE",
      "reasoning": "Why this recommendation"
    }
  ],
  "summary": "Overall assessment of external linking E-A-T value",
  "missingAuthoritySources": ["List of topic areas that could benefit from authoritative external sources"]
}
`;

// === Multi-Pass Content Generation Prompts ===

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

export const PASS_2_HEADER_OPTIMIZATION_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in heading optimization.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout.

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## Header H Rules to Apply:
1. **H1 contains Central Entity + Main Attribute** - Verify the title reflects the main topic
2. **Straight Line Flow**: H1→H2→H3 must follow logical, incremental order
3. **Contextual Overlap**: Each H2/H3 must contain terms linking back to the Central Entity
4. **No Level Skips**: Never skip from H2 to H4
5. **Heading Order**: Definition → Types → Benefits → How-to → Risks → Conclusion
6. **Query Pattern Matching**: Headings should match likely search queries in ${getLanguageName(info.language)}

## Instructions:
1. Review all headings for hierarchy and flow
2. Ensure each heading includes a contextual term related to "${info.seedKeyword}"
3. Reorder sections if they don't follow logical flow
4. Fix any level skips
5. Make headings more specific where generic
6. **KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate or change language

Return the COMPLETE optimized article with all content preserved. Do not summarize or truncate. Maintain ${getLanguageName(info.language)} language.
`;

export const PASS_3_LIST_TABLE_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in structured data optimization.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout.

## Current Draft
${draft}

## List & Table Rules to Apply:
1. **Ordered Lists (<ol>)**: Use ONLY for rankings, steps, or superlatives ("Top 10", "How to")
2. **Unordered Lists (<ul>)**: Use for types, examples, components where order doesn't matter
3. **List Preamble**: Every list MUST be preceded by a sentence with exact count ("The 5 main types include:")
4. **Table Structure**: Columns = attributes (Price, Speed), Rows = entities
5. **One Fact Per Item**: Each list item delivers ONE unique EAV triple
6. **Instructional Lists**: Items in how-to lists start with command verbs

## Instructions:
1. Convert appropriate prose to lists where Featured Snippet opportunity exists
2. Ensure every list has a proper count preamble
3. Verify ordered vs unordered is semantically correct
4. Keep prose where it's more appropriate than lists
5. **KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate

Return the COMPLETE optimized article in ${getLanguageName(info.language)}. Do not summarize or truncate.
`;

export const PASS_4_VISUAL_SEMANTICS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in visual semantics.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}**

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## Visual Semantics Rules:
1. **Alt Tag Vocabulary Extension**: Alt tags MUST use NEW vocabulary not in H1/Title (synonyms, related terms)
2. **Context Bridging**: Alt text bridges the image to surrounding content
3. **No Image Between H and Text**: NEVER place image between heading and its subordinate text
4. **Textual Qualification**: Sentence before/after image MUST reference it
5. **LCP Prominence**: First major image relates directly to Central Entity

## Image Types to Consider:
- **HERO**: Top of page, LCP element, includes text overlay with title/keyword
- **SECTION**: Supporting content, placed AFTER definitions/explanations
- **CHART**: For statistical data, comparisons, trends
- **INFOGRAPHIC**: For bullet points, statistics, process summaries
- **DIAGRAM**: For process flows, how-to steps, decision trees

## Instructions:
Insert image placeholders using this EXACT format:
[IMAGE: detailed description of what the image should show | alt="vocabulary-extending alt text"]

Placement rules:
- HERO image: After first paragraph (LCP position)
- SECTION images: After key definitions or explanations
- CHART/INFOGRAPHIC: Where data needs visualization
- NEVER immediately after a heading - always after subordinate text

Image description should include:
- What object/scene should be depicted
- What text overlay is needed (for HERO)
- What data should be visualized (for CHART)

Examples:
[IMAGE: Hero image showing modern contract management dashboard interface with title overlay "${brief.title}" | alt="digital contract workflow automation platform interface"]

[IMAGE: Bar chart comparing contract processing times before and after automation showing 60% reduction | alt="contract automation efficiency metrics comparison"]

[IMAGE: Step-by-step diagram showing document approval workflow from submission to signature | alt="automated document approval process stages"]

**Write all descriptions and alt text in ${getLanguageName(info.language)}.**

Return the COMPLETE article with image placeholders inserted. Do not summarize or truncate.
`;

export const PASS_5_MICRO_SEMANTICS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in micro-semantic optimization. This is the most comprehensive linguistic optimization pass.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout all optimizations.

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## MICRO SEMANTICS RULES TO APPLY:

### 1. Modality Certainty
- Replace uncertain language ("can be", "might be", "could be") with definitive verbs ("is", "are")
- Only keep uncertainty for genuinely uncertain claims backed by science
- BAD: "Water can be vital for life"
- GOOD: "Water is vital for life"

### 2. Stop Word Removal
- Remove fluff words: "also", "basically", "very", "maybe", "actually", "really", "just", "quite"
- Be ESPECIALLY strict in the first 2 paragraphs
- BAD: "It also helps with digestion"
- GOOD: "It helps digestion"

### 3. Subject Positioning
- The Central Entity ("${info.seedKeyword}") must be the grammatical SUBJECT, not object
- BAD: "Financial advisors help you achieve financial independence"
- GOOD: "Financial independence relies on sufficient savings"

### 4. Definition Structure (Is-A Hypernymy)
- Definitions must follow: "[Entity] is a [Category] that [Function]"
- BAD: "Penguins swim and don't fly"
- GOOD: "A penguin is a flightless sea bird native to the Southern Hemisphere"

### 5. Information Density
- Every sentence must add a NEW fact
- No entity repetition without new attribute
- BAD: "The Glock 19 is a gun. The Glock 19 is popular."
- GOOD: "The Glock 19 weighs 30oz. It has a 15-round capacity."

### 6. Reference Principle
- Never place links at the START of a sentence
- Make your declaration first, then cite
- BAD: "[According to research], the method works"
- GOOD: "The method works effectively, as [research confirms]"

### 7. Negative Constraints
- Add "is not" clarifications for disambiguation where helpful
- Example: "This visa is not for permanent residency"

### 8. Centerpiece Annotation
- The core answer/definition must appear in the first 400 characters of main content
- Front-load the most important information

## Instructions:
Apply ALL rules above. Go sentence by sentence if needed. This pass dramatically impacts search engine comprehension.
**KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate.

Return the COMPLETE optimized article in ${getLanguageName(info.language)}. Do not summarize or truncate.
`;

export const PASS_6_DISCOURSE_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in discourse integration.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout.

## Current Draft
${draft}

## Discourse Anchors (transition words to use)
${brief.discourse_anchors?.join(', ') || 'contextual, semantic, optimization, framework, methodology'}

## Discourse Rules:
1. **Paragraph Transitions**: End of paragraph A should hook into start of paragraph B
2. **Contextual Bridges**: Use bridge sentences when moving between sub-topics
3. **Anchor Segments**: Include mutual words (discourse anchors) at transitions
4. **Annotation Text**: Text surrounding links must explain WHY the link exists
5. **Link Micro-Context**: "For more details on **engine performance**, check our guide on [V8 Engines]"

## Instructions:
1. Add transitional sentences between major sections
2. Ensure internal links have proper annotation text
3. Use discourse anchors naturally at paragraph transitions
4. Smooth any abrupt topic changes
5. **KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate

Return the COMPLETE article with improved flow in ${getLanguageName(info.language)}. Do not summarize or truncate.
`;

export const PASS_7_INTRO_SYNTHESIS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor rewriting the introduction AFTER the full article exists.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Write the introduction in ${getLanguageName(info.language)}.

## Full Article
${draft}

## Brief Info
Title: ${brief.title}
Central Entity: ${info.seedKeyword}
Key Takeaways: ${brief.keyTakeaways?.join(', ') || 'N/A'}
Featured Snippet Target: ${brief.featured_snippet_target?.question || 'N/A'}

## Introduction Synthesis Rules:
1. **Centerpiece Annotation**: Core answer/definition in FIRST 400 characters
2. **Summary Alignment**: Synthesize all H2/H3 topics in the SAME ORDER as they appear
3. **Key Terms**: Include at least one term from each major section
4. **Featured Snippet**: Address the featured snippet target immediately
5. **No Fluff**: Maximum information density

## Instructions:
Write a NEW introduction (150-250 words) in ${getLanguageName(info.language)} that:
1. Starts with a direct definition/answer (centerpiece annotation)
2. Previews ALL major sections in order
3. Includes key terms from each section
4. Sets reader expectations clearly
5. **IS WRITTEN ENTIRELY IN ${getLanguageName(info.language)}** for ${info.targetMarket || 'the target market'}

Output ONLY the introduction paragraph content in ${getLanguageName(info.language)}. Do not include "## Introduction" heading.
`;

// === BRIEF EDITING PROMPTS ===

/**
 * Regenerate an entire content brief based on user feedback
 */
// Helper to create a condensed brief for the prompt (to avoid huge request bodies)
const condenseBriefForPrompt = (brief: ContentBrief): string => {
  // Create a condensed version with essential data only
  const condensed = {
    title: brief.title,
    slug: brief.slug,
    metaDescription: brief.metaDescription,
    keyTakeaways: brief.keyTakeaways,
    // Condensed outline - just headings and key metadata
    structured_outline: brief.structured_outline?.map(s => ({
      heading: s.heading,
      level: s.level,
      format_code: s.format_code,
      attribute_category: s.attribute_category,
      content_zone: s.content_zone,
      // Include hints but truncate if too long
      subordinate_text_hint: s.subordinate_text_hint?.substring(0, 200),
      methodology_note: s.methodology_note?.substring(0, 200),
    })) || [],
    // Include counts instead of full data for large arrays
    contextualVectors_count: brief.contextualVectors?.length || 0,
    visual_semantics_count: brief.visual_semantics?.length || 0,
    perspectives: brief.perspectives,
    discourse_anchors: brief.discourse_anchors,
    contextualBridge: brief.contextualBridge,
    predicted_user_journey: brief.predicted_user_journey,
    query_type_format: brief.query_type_format,
    featured_snippet_target: brief.featured_snippet_target,
  };
  return JSON.stringify(condensed, null, 2);
};

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
${condenseBriefForPrompt(currentBrief)}

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

// ============================================
// SMART WIZARD - Business Research
// ============================================

export const RESEARCH_BUSINESS_PROMPT = (
  input: string,
  inputType: 'url' | 'name' | 'description' | 'mixed',
  scrapedContent?: { title: string; description: string; content: string },
  userDescription?: string
): string => `
You are a business analyst expert. Analyze the provided information and extract structured business data to help auto-fill a content strategy form.

## Input Information
- **Input Type**: ${inputType}
- **User Input**: ${input}

${userDescription ? `
## User-Provided Description
${userDescription}
` : ''}

${scrapedContent ? `
## Scraped Website Content
- **Title**: ${scrapedContent.title}
- **Meta Description**: ${scrapedContent.description}
- **Page Content** (excerpt):
${scrapedContent.content}
` : ''}

## Your Task
Based on the above information, extract the following business details. If you cannot determine a value with reasonable confidence, leave it as an empty string.

**IMPORTANT**:
- Be specific and accurate. Do not make up information.
- For language and targetMarket, infer from the content language and business location/focus.
- For seedKeyword, identify the main topic or product/service the business focuses on.
- For valueProp, extract what makes this business unique or what value they provide.
- For audience, identify who the business is targeting.
${inputType === 'name' || inputType === 'description' || inputType === 'mixed' ? '- Use your knowledge about the business/industry to supplement any gaps.' : ''}

${jsonResponseInstruction}

Return a JSON object with these fields:
{
  "seedKeyword": "Main topic or primary keyword (e.g., 'contract management software', 'organic skincare')",
  "industry": "Business industry/vertical (e.g., 'SaaS', 'E-commerce', 'Healthcare')",
  "valueProp": "Unique value proposition - what makes this business special (2-3 sentences)",
  "audience": "Target audience description (e.g., 'Small business owners', 'Enterprise legal teams')",
  "language": "Language code (e.g., 'en', 'nl', 'de', 'es')",
  "targetMarket": "Target country/region (e.g., 'United States', 'Netherlands', 'European Union')",
  "authorName": "If identifiable, the main author/expert name, otherwise empty",
  "authorBio": "If identifiable, a brief bio of the expert, otherwise empty",
  "authorCredentials": "If identifiable, credentials/qualifications, otherwise empty"
}
`;
