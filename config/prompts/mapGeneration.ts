// config/prompts/mapGeneration.ts
// Prompts for topical map generation: pillar suggestions, semantic triples, map structure

import { BusinessInfo, SEOPillars, SemanticTriple } from '../../types';
import {
    businessContext,
    jsonResponseInstruction,
    getWebsiteTypeInstructions,
    buildSerpIntelligenceBlock,
    getCategoryDistribution,
    getLanguageAndRegionInstruction,
    getLanguageName,
    getRegionalLanguageVariant,
    getWebsiteTypeConfig,
} from './_common';
import type { SerpIntelligenceForMap } from './_common';

export const SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT = (info: BusinessInfo): string => `
You are an expert SEO strategist specializing in semantic content modeling. Based on the following business context, identify EXACTLY 5 potential "Central Entities".

A Central Entity is the core concept the business wants to be known for. It should be a noun or noun phrase that can be the subject of many articles.

**CRITICAL: You MUST return EXACTLY 5 different candidates. Do not return fewer than 5.**

${getLanguageAndRegionInstruction(info.language, info.targetMarket)}
**The "entity" field MUST be written in the target language specified above. The "reasoning" field should also be in the target language.**

For each candidate, provide:
1.  "entity": The candidate entity in the target language (e.g., for Dutch: "Contractbeheer Software", for English: "Contract Management Software").
2.  "reasoning": A brief explanation of why it's a strong candidate (in the target language).
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

${getLanguageAndRegionInstruction(info.language, info.targetMarket)}
**The "context" field MUST be written in the target language specified above. The "reasoning" field should also be in the target language.**

For each option, provide:
1.  "context": The source context statement in the target language.
2.  "reasoning": Why this context is effective for the business (in the target language).
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

${getLanguageAndRegionInstruction(info.language, info.targetMarket)}
**The "intent" field MUST be written in the target language specified above - this is the actual search query users would type. The "reasoning" field should also be in the target language.**

For each option, provide:
1. "intent": The search intent phrase in the target language (e.g., for Dutch: "Appartement kopen Amsterdam", for English: "Buy apartment Amsterdam")
2. "reasoning": Why this intent is effective (in the target language)

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

export const GENERATE_INITIAL_TOPICAL_MAP_PROMPT = (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], serpIntel?: SerpIntelligenceForMap): string => {
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
${buildSerpIntelligenceBlock(serpIntel)}

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
export const GENERATE_MONETIZATION_SECTION_PROMPT = (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], serpIntel?: SerpIntelligenceForMap): string => {
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
${buildSerpIntelligenceBlock(serpIntel)}

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

export const GENERATE_INFORMATIONAL_SECTION_PROMPT = (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], serpIntel?: SerpIntelligenceForMap): string => {
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
${buildSerpIntelligenceBlock(serpIntel)}

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
