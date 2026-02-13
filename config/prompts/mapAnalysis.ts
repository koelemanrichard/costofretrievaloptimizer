// config/prompts/mapAnalysis.ts
// Prompts for topical map validation, improvement, linking, coverage, authority, and publication planning

import { BusinessInfo, SEOPillars, EnrichedTopic, ContentBrief, ValidationIssue, FoundationPage, NavigationStructure } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import {
    businessContext,
    jsonResponseInstruction,
    getLanguageName,
} from './_common';
import { summarizeTopicsForPrompt, samplePairsForPrompt, capTopicsForMerge } from '../../utils/topicSummarizer';

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
${summarizeTopicsForPrompt(topics, 150)}

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

**Write summary, issue messages, and suggestedAction text in ${getLanguageName(info.language)}.**

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
${summarizeTopicsForPrompt(outerTopics)}

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

5. **All new topic titles and descriptions MUST be in ${getLanguageName(info.language)}**

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

export const FIND_MERGE_OPPORTUNITIES_PROMPT = (topics: EnrichedTopic[], info: BusinessInfo): string => {
    const { topics: cappedTopics, wasTruncated, totalTopics } = capTopicsForMerge(topics, 300);
    const truncationNote = wasTruncated ? `\n\nNote: Showing ${cappedTopics.length} of ${totalTopics} topics. Focus merge analysis on these.` : '';
    return `
You are an expert SEO strategist. Find semantically redundant topics to merge.

Topics:
${JSON.stringify(cappedTopics, null, 2)}${truncationNote}

${businessContext(info)}

**Canonical Query Analysis:**
Identify the "Canonical Query" (Search Intent) that shared topics target.

For each opportunity:
- "topicIds", "topicTitles".
- "canonicalQuery".
- "newTopic" (title, description).
- "reasoning".

**Write newTopic title and description in ${getLanguageName(info.language)}.**

${jsonResponseInstruction}
Return a JSON array of merge suggestion objects.
`;
};

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
- **anchorText MUST be in ${getLanguageName(businessInfo.language)}** — it will be inserted into ${getLanguageName(businessInfo.language)} content

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

**Write summary and gap descriptions in ${getLanguageName(info.language)}.**

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

**Write summary and recommendations in ${getLanguageName(info.language)}.**

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

**Write summary in ${getLanguageName(info.language)}.**

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
): string => {
    const { pairs: sampledPairs, wasTruncated, totalPairs } = samplePairsForPrompt(preCalculatedPairs, 200);
    const pairsTruncationNote = wasTruncated ? `\n\nNote: Showing top ${sampledPairs.length} of ${totalPairs} pairs (highest similarity first).` : '';

    return `
You are an expert SEO strategist analyzing semantic relationships between topics for internal linking strategy.

${businessContext(businessInfo)}

TOPIC LIST:
${summarizeTopicsForPrompt(topics)}

PRE-CALCULATED SIMILARITY SCORES (based on Knowledge Graph analysis):
${JSON.stringify(sampledPairs.map(p => ({
    topicA: p.topicA,
    topicB: p.topicB,
    similarityScore: p.similarity.toFixed(2),
    interpretation: p.similarity >= 0.9 ? 'DIRECTLY_CONNECTED' :
                    p.similarity >= 0.5 ? 'STRONGLY_RELATED' :
                    p.similarity >= 0.3 ? 'MODERATELY_RELATED' : 'WEAKLY_RELATED'
})), null, 2)}${pairsTruncationNote}

INSTRUCTIONS:
Analyze the semantic relationships and provide:

1. **pairs**: For each pre-calculated pair, determine:
   - relationship.type: 'SIBLING' (same parent or same level), 'RELATED' (different clusters but connected), 'DISTANT' (weak connection)
   - relationship.internalLinkingPriority: 'high' (must link), 'medium' (should link), 'low' (optional link)
   - relationship.bridge_topic_suggestion: If topics are distant but should be connected, suggest a bridge topic
   - distance.weightedScore: Convert similarity to distance (1 - similarity)

2. **summary**: A 2-3 sentence overview of the semantic structure (clustering patterns, isolated topics, etc.)

3. **actionableSuggestions**: 3-5 specific recommendations for improving topic connectivity

**Write summary and actionableSuggestions in ${getLanguageName(businessInfo.language)}.**

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
};
