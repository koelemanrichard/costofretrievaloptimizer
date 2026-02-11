// config/prompts/_common.ts
// Shared utilities and helpers for prompt generation

import { BusinessInfo, AuthorProfile, WebsiteType, SemanticTriple, ContentBrief } from '../../types';
import { MarketPatterns } from '../../types/competitiveIntelligence';
import { getWebsiteTypeConfig } from '../websiteTypeTemplates';
import { getLanguageName, getLanguageAndRegionInstruction, getRegionalLanguageVariant } from '../../utils/languageUtils';
import { getMonetizationPromptEnhancement, shouldApplyMonetizationEnhancement } from '../../utils/monetizationPromptUtils';
import type { InferredSerpData } from '../../services/ai/serpInference';

// Re-export for use in content generation passes
export { getLanguageAndRegionInstruction };

/**
 * Condensed SERP intelligence for topic map generation.
 * Built from batchInferSerpData() results on pillar queries.
 */
export interface SerpIntelligenceForMap {
    /** Per-pillar SERP analysis */
    pillarInsights: Array<{
        pillar: string;
        intent: string;
        contentType: string;
        difficulty: string;
        difficultyScore: number;
        serpFeatures: string[];
        paaQuestions: string[];
        headlinePatterns: string[];
        opportunities: string[];
        estimatedWordCount: { min: number; max: number };
    }>;
}

/**
 * Build a SerpIntelligenceForMap from batch inferred data
 */
export function buildSerpIntelligenceForMap(
    pillarQueries: string[],
    serpResults: Map<string, InferredSerpData>
): SerpIntelligenceForMap {
    const pillarInsights = pillarQueries.map(query => {
        const data = serpResults.get(query);
        if (!data) {
            return {
                pillar: query,
                intent: 'unknown',
                contentType: 'unknown',
                difficulty: 'unknown',
                difficultyScore: 50,
                serpFeatures: [],
                paaQuestions: [],
                headlinePatterns: [],
                opportunities: [],
                estimatedWordCount: { min: 800, max: 2000 },
            };
        }
        const features: string[] = [];
        if (data.likelyFeatures.featuredSnippet.likely) features.push(`Featured Snippet (${data.likelyFeatures.featuredSnippet.type || 'paragraph'})`);
        if (data.likelyFeatures.peopleAlsoAsk.likely) features.push('People Also Ask');
        if (data.likelyFeatures.imagesPack) features.push('Image Pack');
        if (data.likelyFeatures.videoCarousel) features.push('Video Carousel');
        if (data.likelyFeatures.localPack) features.push('Local Pack');
        if (data.likelyFeatures.knowledgePanel) features.push('Knowledge Panel');
        if (data.likelyFeatures.faq) features.push('FAQ Rich Result');

        return {
            pillar: query,
            intent: data.dominantIntent,
            contentType: data.dominantContentType,
            difficulty: data.competitiveLandscape.difficulty,
            difficultyScore: data.competitiveLandscape.difficultyScore,
            serpFeatures: features,
            paaQuestions: data.likelyFeatures.peopleAlsoAsk.estimatedQuestions || [],
            headlinePatterns: data.estimatedHeadlinePatterns || [],
            opportunities: data.competitiveLandscape.opportunities || [],
            estimatedWordCount: { min: data.estimatedWordCount.min, max: data.estimatedWordCount.max },
        };
    });

    return { pillarInsights };
}

/**
 * Build a SERP intelligence block for map generation prompts.
 * Returns empty string if no SERP data available.
 */
export const buildSerpIntelligenceBlock = (serpIntel?: SerpIntelligenceForMap): string => {
    if (!serpIntel || serpIntel.pillarInsights.length === 0) return '';

    const insights = serpIntel.pillarInsights.map(p => {
        const features = p.serpFeatures.length > 0 ? p.serpFeatures.join(', ') : 'none detected';
        const paa = p.paaQuestions.length > 0 ? `\n    PAA Questions: ${p.paaQuestions.slice(0, 3).join(' | ')}` : '';
        const opps = p.opportunities.length > 0 ? `\n    Opportunities: ${p.opportunities.slice(0, 2).join(' | ')}` : '';
        return `  - "${p.pillar}": intent=${p.intent}, type=${p.contentType}, difficulty=${p.difficulty} (${p.difficultyScore}/100)
    SERP Features: ${features}
    Word Count Range: ${p.estimatedWordCount.min}-${p.estimatedWordCount.max}${paa}${opps}`;
    }).join('\n');

    return `
**SEARCH LANDSCAPE INTELLIGENCE (use this to inform topic structure):**
${insights}

**How to use this data:**
- Prioritize topics where difficulty is "easy" or "medium" for faster ranking
- Create Featured Snippet-optimized content for pillars with FS likelihood
- Use PAA questions as spoke topic ideas
- Target identified opportunities as content gaps to fill
- Adjust content depth (word count) to match or exceed SERP expectations
`;
};

/**
 * Helper function to calculate category distribution for expansion prompt
 */
export const getCategoryDistribution = (triples: SemanticTriple[]): string => {
    const counts: Record<string, number> = { ROOT: 0, UNIQUE: 0, RARE: 0, COMMON: 0 };
    triples.forEach(t => {
        const cat = t.predicate?.category || 'COMMON';
        if (cat in counts) counts[cat]++;
    });
    return Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`).join('\n');
};

/**
 * Condense a content brief for prompt inclusion with full structure (used by brief editing prompts)
 */
export const condenseBriefForPromptFull = (brief: ContentBrief): string => {
    const condensed = {
        title: brief.title,
        slug: brief.slug,
        metaDescription: brief.metaDescription,
        keyTakeaways: brief.keyTakeaways,
        structured_outline: brief.structured_outline?.map(s => ({
            heading: s.heading,
            level: s.level,
            format_code: s.format_code,
            attribute_category: s.attribute_category,
            content_zone: s.content_zone,
            subordinate_text_hint: s.subordinate_text_hint?.substring(0, 200),
            methodology_note: s.methodology_note?.substring(0, 200),
        })) || [],
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

export const jsonResponseInstruction = `
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
export const getWebsiteTypeInstructions = (websiteType?: WebsiteType): string => {
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
};

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

/**
 * Generate market data section for content brief prompt
 * Injects real competitor analysis data to enhance brief generation
 */
export const getMarketDataPromptSection = (marketPatterns?: MarketPatterns): string => {
    if (!marketPatterns || marketPatterns.dataQuality === 'none') {
        return '';
    }

    const sections: string[] = [];

    sections.push(`
## COMPETITOR ANALYSIS DATA (Real SERP Analysis)

Based on analysis of ${marketPatterns.competitorsAnalyzed} competitors (Data Quality: ${marketPatterns.dataQuality.toUpperCase()}):

### Content Benchmarks
- **Average word count**: ${marketPatterns.content.avgWordCount} words (Confidence: ${marketPatterns.content.wordCountConfidence})
- **Recommended target**: ${marketPatterns.content.recommendedWordCount} words
- **Word count range**: ${marketPatterns.content.wordCountRange.min} - ${marketPatterns.content.wordCountRange.max} words
- **Average headings**: ${marketPatterns.structure.avgH2Count} H2s, ${marketPatterns.structure.avgH3Count} H3s
- **Dominant audience level**: ${marketPatterns.content.dominantAudienceLevel}
- **Dominant content template**: ${marketPatterns.structure.dominantContentTemplate}`);

    if (marketPatterns.semantic.requiredTopics.length > 0) {
        sections.push(`
### Required Topics (70%+ competitors cover)
${marketPatterns.semantic.requiredTopics.slice(0, 10).map(t => `- ${t}`).join('\n')}`);
    }

    if (marketPatterns.semantic.differentiationTopics.length > 0) {
        sections.push(`
### Differentiation Opportunities (rare/unique topics)
${marketPatterns.semantic.differentiationTopics.slice(0, 8).map(t => `- ${t}`).join('\n')}`);
    }

    sections.push(`
### Visual Requirements
- **Average images**: ${marketPatterns.visuals.avgImageCount}
- **${marketPatterns.visuals.hasVideoPercentage}%** of competitors have video content
- **Recommended image count**: ${marketPatterns.visuals.recommendedImageCount}
${marketPatterns.visuals.commonImageTypes.length > 0 ? `- **Common image types**: ${marketPatterns.visuals.commonImageTypes.join(', ')}` : ''}`);

    sections.push(`
### Technical Requirements
- **Common schema types**: ${marketPatterns.technical.commonSchemaTypes.join(', ') || 'Article'}
- **${marketPatterns.technical.schemaPresencePercentage}%** use structured data
- **Recommended schema types**: ${marketPatterns.technical.recommendedSchemaTypes.join(', ')}`);

    if (marketPatterns.warnings.length > 0) {
        sections.push(`
### Analysis Notes
${marketPatterns.warnings.map(w => `⚠️ ${w}`).join('\n')}`);
    }

    sections.push(`
### IMPORTANT: Use This Data
- Set **serpAnalysis.avgWordCount** to approximately ${marketPatterns.content.recommendedWordCount}
- Set **serpAnalysis.avgHeadings** to approximately ${marketPatterns.structure.avgH2Count + marketPatterns.structure.avgH3Count}
- Include the **Required Topics** in your structured_outline
- Prioritize **Differentiation Opportunities** for unique content angles
- Ensure visual recommendations align with the competitor benchmarks
`);

    return sections.join('\n');
};

/**
 * Condense a content brief for prompt inclusion (reduces token usage)
 */
export const condenseBriefForPrompt = (brief: any): string => {
    return JSON.stringify({
        title: brief.title,
        targetKeyword: brief.targetKeyword,
        searchIntent: brief.searchIntent,
        metaDescription: brief.metaDescription,
        keyTakeaways: brief.keyTakeaways?.slice(0, 5),
        structured_outline: brief.structured_outline?.map((s: any) => ({
            heading: s.heading,
            format_code: s.format_code,
        })),
    }, null, 2);
};

// Re-export utility functions that may be needed by prompt modules
export {
    getLanguageName,
    getRegionalLanguageVariant,
    getMonetizationPromptEnhancement,
    shouldApplyMonetizationEnhancement,
    getWebsiteTypeConfig,
};
