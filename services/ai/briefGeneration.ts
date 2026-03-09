
import { BusinessInfo, ResponseCode, ContentBrief, EnrichedTopic, SEOPillars, KnowledgeGraph, ContentIntegrityResult, SchemaGenerationResult, AuditRuleResult, BriefVisualSemantics, StreamingProgressCallback, HolisticSummary, CompetitorSpecs, SemanticTriple, BriefSection } from '../../types';
import type { StructuralAnalysis } from '../../types';
import { MarketPatterns } from '../../types/competitiveIntelligence';
import type { CategoryPageContext } from '../../types/catalog';
import type { TopicConfig } from '../../types/actionPlan';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';
import * as prompts from '../../config/prompts';
import { AIResponseSanitizer } from '../aiResponseSanitizer';
import { analyzeImageRequirements } from '../visualSemanticsService';
import { shouldApplyMonetizationEnhancement, getMonetizationValidationRules } from './briefOptimization';
import { validateLanguageSettings } from '../../utils/languageUtils';
import React from 'react';

/**
 * Compute a deterministic hash of an outline's structure for symmetry checks.
 * Extracts level + format_code + attribute_category per section, joins with '|',
 * and applies djb2 hashing to produce a hex string.
 */
export function computeStructuralTemplateHash(outline?: BriefSection[]): string {
    if (!outline || outline.length === 0) return '';

    const structureString = outline
        .map(section => {
            const level = section.level ?? section.heading_level ?? 0;
            const formatCode = section.format_code || 'PROSE';
            const category = section.attribute_category || 'COMMON';
            return `${level}:${formatCode}:${category}`;
        })
        .join('|');

    // djb2 hash algorithm
    let hash = 5381;
    for (let i = 0; i < structureString.length; i++) {
        hash = ((hash << 5) + hash + structureString.charCodeAt(i)) | 0; // hash * 33 + char
    }

    // Convert to unsigned 32-bit hex
    return (hash >>> 0).toString(16);
}

/**
 * Build a structural template section from competitor structural analysis data.
 * Included in content brief prompts to guide article structure.
 */
export function buildStructuralTemplateSection(
  competitorAnalyses: StructuralAnalysis[]
): string {
  if (competitorAnalyses.length === 0) return '';

  const avgH2Count = Math.round(
    competitorAnalyses.reduce((s, a) => s + a.sections.length, 0) / competitorAnalyses.length
  );
  const avgMainWords = Math.round(
    competitorAnalyses.reduce((s, a) => s + a.mainContentWordCount, 0) / competitorAnalyses.length
  );
  const avgListsPerSection = Math.round(
    competitorAnalyses.reduce((s, a) => s + a.sections.reduce((ls, sec) => ls + sec.listCount, 0), 0) /
    Math.max(competitorAnalyses.reduce((s, a) => s + a.sections.length, 0), 1) * 10
  ) / 10;
  const schemaTypes = [...new Set(
    competitorAnalyses.flatMap(a => a.schemaMarkup.map(s => s.type))
  )];

  return `\n## Structural Template (from ${competitorAnalyses.length} competitor pages)\n` +
    `- Average H2 sections: ${avgH2Count}\n` +
    `- Average main content word count: ${avgMainWords}\n` +
    `- Average lists per section: ${avgListsPerSection}\n` +
    `- Schema types found: ${schemaTypes.join(', ') || 'none'}\n`;
}

/**
 * Convert MarketPatterns to CompetitorSpecs for storage in ContentBrief
 */
const convertToCompetitorSpecs = (marketPatterns: MarketPatterns): CompetitorSpecs => {
    // Find top competitor word count (max in range)
    const topWordCount = marketPatterns.content.wordCountRange.max;

    return {
        dataQuality: marketPatterns.dataQuality,
        analysisDate: marketPatterns.analyzedAt.toISOString(),
        competitorsAnalyzed: marketPatterns.competitorsAnalyzed,

        targetWordCount: marketPatterns.content.recommendedWordCount,
        wordCountRange: marketPatterns.content.wordCountRange,
        wordCountConfidence: marketPatterns.content.wordCountConfidence,

        targetImageCount: marketPatterns.visuals.recommendedImageCount,
        recommendedImageTypes: marketPatterns.visuals.commonImageTypes,
        hasVideoPercentage: marketPatterns.visuals.hasVideoPercentage,

        requiredSchemaTypes: marketPatterns.technical.recommendedSchemaTypes,
        schemaPresencePercentage: marketPatterns.technical.schemaPresencePercentage,

        avgH2Count: marketPatterns.structure.avgH2Count,
        avgH3Count: marketPatterns.structure.avgH3Count,
        dominantContentTemplate: marketPatterns.structure.dominantContentTemplate,
        dominantAudienceLevel: marketPatterns.content.dominantAudienceLevel,

        requiredTopics: marketPatterns.semantic.requiredTopics,
        differentiationTopics: marketPatterns.semantic.differentiationTopics,
        rootAttributes: marketPatterns.semantic.rootAttributes,
        rareAttributes: marketPatterns.semantic.rareAttributes,

        benchmarks: {
            topCompetitorWordCount: topWordCount,
            avgCompetitorWordCount: marketPatterns.content.avgWordCount,
            topCompetitorImageCount: marketPatterns.visuals.imageCountRange.max,
        },

        warnings: marketPatterns.warnings,
    };
};

/**
 * Validate language and region settings before generation
 * Logs warnings if settings are incomplete (won't block generation)
 */
const validateLanguageAndRegion = (
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): void => {
    const validation = validateLanguageSettings(businessInfo.language, businessInfo.region);

    if (validation.warnings.length > 0) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'ContentGeneration',
                message: `Language/Region Settings Warning: ${validation.warnings.join(' | ')}`,
                status: 'warning',
                timestamp: Date.now()
            }
        });
    }
};

/**
 * Validate monetization brief meets minimum requirements
 * Logs warnings if critical fields are missing (won't block generation)
 */
const validateMonetizationBrief = (
    brief: Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>,
    dispatch: React.Dispatch<any>
): void => {
    const rules = getMonetizationValidationRules();
    const warnings: string[] = [];

    for (const rule of rules) {
        const value = rule.field.includes('.')
            ? rule.field.split('.').reduce((obj: any, key) => obj?.[key], brief)
            : (brief as any)[rule.field];

        if (!rule.rule(value)) {
            warnings.push(rule.message);
        }
    }

    if (warnings.length > 0) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefGeneration',
                message: `Monetization brief missing recommended fields: ${warnings.join('; ')}`,
                status: 'warning',
                timestamp: Date.now()
            }
        });
    }
};

// --- Post-Brief Validation Helpers ---

/**
 * Extract links from contextualBridge, handling both array and section union types.
 */
function getBridgeLinks(bridge: any): any[] {
    if (!bridge) return [];
    if (Array.isArray(bridge)) return bridge;
    if (bridge.links && Array.isArray(bridge.links)) return bridge.links;
    return [];
}

// --- Algorithmic Audit Helpers ---

const checkSubjectivity = (text: string): AuditRuleResult => {
    const regex = /\b(I|my|we|our) (think|feel|believe|opinion|hope|guess)\b/i;
    const matches = text.match(regex);
    if (matches) {
        return { 
            ruleName: "No Opinion / Subjectivity",
            isPassing: false, 
            details: `Found subjective language ('${matches[0]}'). Use declarative facts.`,
            affectedTextSnippet: matches[0],
            remediation: "Rewrite using objective language. Remove 'I think' or 'We believe'."
        };
    }
    return { ruleName: "No Opinion / Subjectivity", isPassing: true, details: "Tone is objective." };
};

const checkPronounDensity = (text: string, topicTitle: string): AuditRuleResult => {
    const pronouns = (text.match(/\b(it|they|he|she|this|that)\b/gi) || []).length;
    const wordCount = text.split(/\s+/).length;
    const ratio = wordCount > 0 ? pronouns / wordCount : 0;
    
    if (ratio > 0.05) {
        return { 
            ruleName: "Explicit Naming (No Pronouns)",
            isPassing: false, 
            details: `High pronoun density (${(ratio*100).toFixed(1)}%). Use explicit naming ("${topicTitle}") more often.`,
            remediation: `Replace 'it', 'they', or 'this' with the specific entity name ("${topicTitle}") to improve NER tracking.`
        };
    }
    return { ruleName: "Explicit Naming (No Pronouns)", isPassing: true, details: "Explicit naming usage is good." };
};

const checkLinkPositioning = (text: string): AuditRuleResult => {
    const paragraphs = text.split('\n\n');
    let prematureLinks = 0;
    let affectedSnippet = '';
    
    paragraphs.forEach(p => {
        const linkMatch = p.match(/\[([^\]]+)\]\(([^)]+)\)/);
        // Check if link appears in the first 20 characters of the paragraph
        if (linkMatch && linkMatch.index !== undefined && linkMatch.index < 20) {
            // Exclude list items which naturally start with links sometimes
            if (!p.trim().startsWith('-') && !p.trim().startsWith('*')) {
                prematureLinks++;
                if(!affectedSnippet) affectedSnippet = p.substring(0, 50) + "...";
            }
        }
    });
    
    if (prematureLinks > 0) {
        return { 
            ruleName: "Link Positioning (Post-Definition)",
            isPassing: false, 
            details: `Found ${prematureLinks} paragraphs starting with links.`,
            affectedTextSnippet: affectedSnippet,
            remediation: "Move the internal link to the second or third sentence. Define the concept first before linking away."
        };
    }
    return { ruleName: "Link Positioning (Post-Definition)", isPassing: true, details: "Link positioning is correct." };
};

const checkFirstSentencePrecision = (text: string): AuditRuleResult => {
    const lines = text.split('\n');
    let badSentences = 0;
    let sampleBadSentence = '';
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('##')) {
            // Find next non-empty line (the paragraph)
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;
            
            if (j < lines.length) {
                const p = lines[j].trim();
                // Skip if it's a list or table
                if (p.startsWith('-') || p.startsWith('*') || p.startsWith('|')) continue;

                const firstSentence = p.split('.')[0];
                const words = firstSentence.split(/\s+/).length;
                
                // Check for definitive verbs
                const hasDefinitiveVerb = /\b(is|are|means|refers to|consists of|defines)\b/i.test(firstSentence);
                
                if (words > 35 || !hasDefinitiveVerb) {
                     badSentences++;
                     if (!sampleBadSentence) sampleBadSentence = firstSentence;
                }
            }
        }
    }
    
    if (badSentences > 0) {
        return { 
            ruleName: "First Sentence Precision",
            isPassing: false, 
            details: `Found ${badSentences} sections with weak first sentences (>35 words or missing definitive verb).`,
            affectedTextSnippet: sampleBadSentence,
            remediation: "Rewrite the first sentence to be a concise definition using verbs like 'is', 'are', or 'means'."
        };
    }
    return { ruleName: "First Sentence Precision", isPassing: true, details: "First sentences are precise." };
};

const checkQuestionProtection = (text: string): AuditRuleResult => {
    const lines = text.split('\n');
    let failedQuestions = 0;
    let sampleFailure = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Match headings that are questions
        if (line.match(/^(#{2,3})\s*(What|How|Why|When|Where|Who|Can|Does)\b.*\?$/i)) {
            // Find next non-empty content line
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;

            if (j < lines.length) {
                const nextLine = lines[j].trim();
                const firstFiveWords = nextLine.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
                // Definitive verbs expected in the start
                const hasDefinitiveStart = /\b(is|are|means|refers|consists|causes|allows)\b/.test(firstFiveWords);
                
                // "How to" often starts with "To [verb]" or "Start by"
                const hasProceduralStart = /\b(to|start|begin|use)\b/.test(firstFiveWords);

                if (!hasDefinitiveStart && !hasProceduralStart) {
                    failedQuestions++;
                    if (!sampleFailure) sampleFailure = `${line} -> ${nextLine.substring(0, 40)}...`;
                }
            }
        }
    }

    if (failedQuestions > 0) {
        return {
            ruleName: "Question Protection (Candidate Answer)",
            isPassing: false,
            details: `Found ${failedQuestions} questions where the immediate answer is delayed.`,
            affectedTextSnippet: sampleFailure,
            remediation: "Ensure the very first sentence after a question heading contains the direct answer or definition. Do not start with 'When looking at...'."
        };
    }
    return { ruleName: "Question Protection (Candidate Answer)", isPassing: true, details: "Questions are answered immediately." };
};

const checkListLogic = (text: string): AuditRuleResult => {
    const lines = text.split('\n');
    let weakLists = 0;
    let sampleFailure = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Detect start of a list
        if (line.match(/^(\-|\*|\d+\.)\s+/)) {
            // Check the previous non-empty line
            let j = i - 1;
            while (j >= 0 && !lines[j].trim()) j--;

            if (j >= 0) {
                const prevLine = lines[j].trim();
                // Check for colon or count
                const hasColon = prevLine.endsWith(':');
                const hasCount = /\b\d+\b/.test(prevLine) && /\b(steps|ways|factors|reasons|benefits|types|items)\b/i.test(prevLine);

                if (!hasColon && !hasCount && !prevLine.startsWith('#')) {
                    weakLists++;
                    if (!sampleFailure) sampleFailure = prevLine;
                }
            }
            // Skip the rest of this list to avoid counting every item
            while (i < lines.length && lines[i].trim().match(/^(\-|\*|\d+\.)\s+/)) i++;
        }
    }

    if (weakLists > 0) {
        return {
            ruleName: "List Logic Preamble",
            isPassing: false,
            details: `Found ${weakLists} lists without a definitive introductory sentence.`,
            affectedTextSnippet: sampleFailure,
            remediation: "Precede every list with a sentence ending in a colon ':' or stating the specific count (e.g., 'The 5 key factors are:')."
        };
    }
    return { ruleName: "List Logic Preamble", isPassing: true, details: "Lists have proper preambles." };
};

const checkSentenceDensity = (text: string): AuditRuleResult => {
    // Split by sentence delimiters roughly
    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
    let longSentences = 0;
    let sampleFailure = '';

    sentences.forEach(s => {
        const wordCount = s.split(/\s+/).length;
        // Check for overly complex sentences (compound clauses)
        const conjunctions = (s.match(/\b(and|but|or|however|although)\b/gi) || []).length;
        
        if (wordCount > 35 && conjunctions > 2) {
            longSentences++;
            if (!sampleFailure) sampleFailure = s.trim();
        }
    });

    if (longSentences > 0) {
        return {
            ruleName: "Linguistic Density (One Fact Per Sentence)",
            isPassing: false,
            details: `Found ${longSentences} overly complex sentences (long dependency tree).`,
            affectedTextSnippet: sampleFailure,
            remediation: "Split complex sentences. Adhere to 'One Fact Per Sentence'. Avoid multiple conjunctions."
        };
    }
    return { ruleName: "Linguistic Density (One Fact Per Sentence)", isPassing: true, details: "Sentence density is optimal." };
};

// --- Exported Services ---

export const suggestResponseCode = (
    businessInfo: BusinessInfo, topicTitle: string, dispatch: React.Dispatch<any>
): Promise<{ responseCode: ResponseCode; reasoning: string }> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        openai: () => openAiService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        anthropic: () => anthropicService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        perplexity: () => perplexityService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        openrouter: () => openRouterService.suggestResponseCode(businessInfo, topicTitle, dispatch),
    });
};

/**
 * Enrich a brief with enhanced visual semantics analysis
 * This applies Koray's "Pixels, Letters, and Bytes" framework
 */
export const enrichBriefWithVisualSemantics = (
    brief: Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>,
    topic: EnrichedTopic
): Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'> => {
    try {
        // Determine search intent from topic metadata
        const searchIntent: string = (typeof topic.metadata?.search_intent === 'string' ? topic.metadata.search_intent : null) ||
            (topic.topic_class === 'monetization' ? 'transactional' : 'informational');

        // Generate enhanced visual semantics
        const enhancedVisualSemantics = analyzeImageRequirements(
            brief as ContentBrief,
            searchIntent
        );

        return {
            ...brief,
            enhanced_visual_semantics: enhancedVisualSemantics,
        };
    } catch (error) {
        console.warn('[briefGeneration] Failed to enrich visual semantics:', error);
        return brief;
    }
};

/**
 * Suggest content length preset based on topic type and characteristics
 * Per Korayanese framework:
 * - Core topics (monetization): comprehensive (2000+ words)
 * - Outer topics (authority): short (600 words)
 * - Bridge topics: minimal (350 words)
 */
const suggestLengthPreset = (topic: EnrichedTopic): {
    preset: 'minimal' | 'short' | 'standard' | 'comprehensive';
    reason: string;
} => {
    // Core/monetization topics need comprehensive coverage
    if (topic.topic_class === 'monetization' || topic.type === 'core') {
        return {
            preset: 'comprehensive',
            reason: 'CORE topic (monetization) - comprehensive coverage needed to address all user criteria and outrank competitors.'
        };
    }

    // Outer topics should be flat & informative, not deep
    if (topic.type === 'outer') {
        return {
            preset: 'short',
            reason: 'OUTER topic (authority building) - flat & informative content, not deep guides. Supports the topical map without competing with core pages.'
        };
    }

    // Child topics (bridge content) need minimal coverage
    if (topic.type === 'child') {
        return {
            preset: 'minimal',
            reason: 'BRIDGE topic - completes the semantic network. Only needs minimal content to establish topical relationship.'
        };
    }

    // Default to standard (SERP-based)
    return {
        preset: 'standard',
        reason: 'Standard length based on SERP competitor analysis.'
    };
};

export const generateContentBrief = async (
    businessInfo: BusinessInfo,
    topic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    pillars: SEOPillars,
    knowledgeGraph: KnowledgeGraph,
    responseCode: ResponseCode,
    dispatch: React.Dispatch<any>,
    marketPatterns?: MarketPatterns,  // Optional: competitor-derived market patterns
    eavs?: SemanticTriple[],  // Semantic triples from topical map
    categoryContext?: CategoryPageContext,  // Optional: ecommerce category page data
    actionType?: string,  // Optional: action context (OPTIMIZE, REWRITE, MERGE, etc.) for tailored briefs
    topicConfig?: TopicConfig,  // Per-topic config (content length, FS format, etc.)
    existingBriefs?: Record<string, ContentBrief>  // Existing briefs for template consistency
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
    // Validate language and region settings before generation
    validateLanguageAndRegion(businessInfo, dispatch);

    // Log if using market data
    if (marketPatterns && marketPatterns.dataQuality !== 'none') {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefGeneration',
                message: `Using competitor analysis data (${marketPatterns.competitorsAnalyzed} competitors, quality: ${marketPatterns.dataQuality})`,
                status: 'info',
                timestamp: Date.now()
            }
        });
    }

    // Log if using catalog data
    if (categoryContext) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefGeneration',
                message: `Using catalog data: "${categoryContext.categoryName}" with ${categoryContext.totalProductCount} products (${categoryContext.isSketchMode ? 'sketch' : 'full data'} mode)`,
                status: 'info',
                timestamp: Date.now()
            }
        });
    }

    const brief = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs, actionType, topicConfig, existingBriefs),
        openai: () => openAiService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs, actionType, topicConfig, existingBriefs),
        anthropic: () => anthropicService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs, actionType, topicConfig, existingBriefs),
        perplexity: () => perplexityService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs, actionType, topicConfig, existingBriefs),
        openrouter: () => openRouterService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs, actionType, topicConfig, existingBriefs),
    });

    // ── Structural Validation Gate ──
    // Hard validation BEFORE any post-processing. Prevents empty/truncated briefs
    // from silently passing through and being marked "generated".
    if (!brief.structured_outline || brief.structured_outline.length < 3) {
        const sectionCount = brief.structured_outline?.length ?? 0;
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefGeneration',
                message: `Structural validation failed: ${sectionCount} sections (minimum 3). Topic: "${topic.title}". The AI response was likely truncated.`,
                status: 'error',
                timestamp: Date.now(),
            },
        });
        throw new Error(
            `Brief generation produced ${sectionCount} sections (minimum 3). ` +
            `Topic: "${topic.title}". The AI response was likely truncated.`
        );
    }
    if (!brief.title || !brief.metaDescription) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefGeneration',
                message: `Structural validation failed: missing title or metaDescription for "${topic.title}".`,
                status: 'error',
                timestamp: Date.now(),
            },
        });
        throw new Error(`Brief missing title or metaDescription for "${topic.title}".`);
    }

    // ── Enrichment Phase (two-phase generation) ──
    // If the outline is valid but secondary fields are missing (truncated response),
    // run a focused enrichment call to fill them in. This is cheaper than full regeneration.
    const missingSerpAnalysis = !brief.serpAnalysis || typeof brief.serpAnalysis === 'string' ||
        (!brief.serpAnalysis.peopleAlsoAsk?.length && !brief.serpAnalysis.contentGaps?.length);
    const missingVisualSemantics = !brief.visual_semantics || brief.visual_semantics.length === 0;
    const missingDiscourseAnchors = !brief.discourse_anchors || brief.discourse_anchors.length === 0;

    if (missingSerpAnalysis || missingVisualSemantics || missingDiscourseAnchors) {
        const missingFields = [
            missingSerpAnalysis && 'serpAnalysis',
            missingVisualSemantics && 'visual_semantics',
            missingDiscourseAnchors && 'discourse_anchors',
        ].filter(Boolean).join(', ');

        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefGeneration',
                message: `Outline valid (${brief.structured_outline.length} sections) but missing enrichment fields: ${missingFields}. Running enrichment phase...`,
                status: 'info',
                timestamp: Date.now(),
            },
        });

        try {
            const enrichmentPrompt = prompts.GENERATE_BRIEF_ENRICHMENT_PROMPT(businessInfo, topic, pillars, brief);
            const enrichmentFallback = {
                serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [], avgWordCount: 1500, avgHeadings: 8, commonStructure: '', contentGaps: [] },
                visual_semantics: [],
                visual_placement_map: [],
                discourse_anchors: [],
                discourse_anchor_sequence: [],
                perspectives: [],
                predicted_user_journey: '',
            };

            const enrichment = await dispatchToProvider(businessInfo, {
                gemini: () => geminiService.generateJson(enrichmentPrompt, businessInfo, dispatch, enrichmentFallback),
                openai: () => openAiService.generateJson(enrichmentPrompt, businessInfo, dispatch, enrichmentFallback),
                anthropic: () => anthropicService.generateJson(enrichmentPrompt, businessInfo, dispatch, enrichmentFallback),
                perplexity: () => perplexityService.generateJson(enrichmentPrompt, businessInfo, dispatch, enrichmentFallback),
                openrouter: () => openRouterService.generateJson(enrichmentPrompt, businessInfo, dispatch, enrichmentFallback),
            });

            // Merge enrichment into brief — only fill missing fields, don't overwrite existing
            if (missingSerpAnalysis && enrichment.serpAnalysis && typeof enrichment.serpAnalysis === 'object') {
                (brief as any).serpAnalysis = enrichment.serpAnalysis;
            }
            if (missingVisualSemantics && enrichment.visual_semantics?.length > 0) {
                (brief as any).visual_semantics = enrichment.visual_semantics;
            }
            if (missingDiscourseAnchors && enrichment.discourse_anchors?.length > 0) {
                (brief as any).discourse_anchors = enrichment.discourse_anchors;
            }
            if (!brief.perspectives?.length && enrichment.perspectives?.length > 0) {
                (brief as any).perspectives = enrichment.perspectives;
            }
            if (!brief.predicted_user_journey && enrichment.predicted_user_journey) {
                (brief as any).predicted_user_journey = enrichment.predicted_user_journey;
            }
            if (enrichment.visual_placement_map?.length > 0 && !brief.visual_placement_map?.length) {
                (brief as any).visual_placement_map = enrichment.visual_placement_map;
            }
            if (enrichment.discourse_anchor_sequence?.length > 0 && !brief.discourse_anchor_sequence?.length) {
                (brief as any).discourse_anchor_sequence = enrichment.discourse_anchor_sequence;
            }

            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BriefGeneration',
                    message: `Enrichment phase complete. Filled missing fields for "${topic.title}".`,
                    status: 'success',
                    timestamp: Date.now(),
                },
            });
        } catch (enrichmentError) {
            // Enrichment is nice-to-have — the skeleton brief is still usable
            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BriefGeneration',
                    message: `Enrichment phase failed (non-fatal): ${enrichmentError instanceof Error ? enrichmentError.message : 'Unknown error'}. Proceeding with outline-only brief.`,
                    status: 'warning',
                    timestamp: Date.now(),
                },
            });
        }
    }

    // Validate monetization briefs meet minimum requirements
    if (shouldApplyMonetizationEnhancement(topic.topic_class)) {
        validateMonetizationBrief(brief, dispatch);
    }

    // Suggest content length based on topic type and market data
    const lengthSuggestion = suggestLengthPreset(topic);

    // Enrich with enhanced visual semantics and length suggestion
    const enrichedBrief = await enrichBriefWithVisualSemantics(brief, topic);

    // Attach competitor specs if market patterns provided
    const competitorSpecs = marketPatterns && marketPatterns.dataQuality !== 'none'
        ? convertToCompetitorSpecs(marketPatterns)
        : undefined;

    // Validate featured snippet target is achievable by the outline
    if (enrichedBrief.featured_snippet_target && enrichedBrief.structured_outline) {
        const fsTarget = enrichedBrief.featured_snippet_target;
        const outlineHeadings = enrichedBrief.structured_outline.map(s => s.heading?.toLowerCase() || '');
        const questionWords = (fsTarget.question || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);

        const hasMatchingSection = outlineHeadings.some(h =>
            questionWords.some(w => h.includes(w))
        );

        if (!hasMatchingSection && questionWords.length > 0) {
            // Auto-add a section heading matching the FS target question
            enrichedBrief.structured_outline.push({
                heading: fsTarget.question,
                key_points: [`Direct answer to "${fsTarget.question}" for Featured Snippet optimization`],
                mapped_eavs: [],
            } as any);
            (enrichedBrief as any).fs_heading_auto_added = true;

            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BriefGeneration',
                    message: `Auto-added outline section "${fsTarget.question}" to target Featured Snippet`,
                    status: 'info',
                    timestamp: Date.now(),
                },
            });
        }
    }

    // --- Post-brief validation ---

    // 1. FS target_type matching query type
    if (enrichedBrief.featured_snippet_target) {
        const titleLower = topic.title.toLowerCase();
        let expectedType: string | null = null;

        if (/\b(what is|definition|meaning)\b/.test(titleLower)) {
            expectedType = 'PARAGRAPH';
        } else if (/\b(types of|best|top\s+\d+)\b/.test(titleLower)) {
            expectedType = 'LIST';
        } else if (/\b(vs|versus|compared)\b/.test(titleLower)) {
            expectedType = 'TABLE';
        } else if (/\b(how to|steps|process)\b/.test(titleLower)) {
            expectedType = 'LIST';
        }

        if (expectedType && enrichedBrief.featured_snippet_target.target_type !== expectedType) {
            const oldType = enrichedBrief.featured_snippet_target.target_type;
            enrichedBrief.featured_snippet_target.target_type = expectedType as any;
            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BriefGeneration',
                    message: `Auto-fixed FS target_type: "${oldType}" → "${expectedType}" (query pattern mismatch for "${topic.title}")`,
                    status: 'warning',
                    timestamp: Date.now(),
                },
            });
        }
    }

    // 2. mapped_eavs coverage check
    if (eavs && eavs.length > 0) {
        const outline = enrichedBrief.structured_outline || [];
        const hasAnyMappedEavs = outline.some(
            (section: any) => section.mapped_eavs && section.mapped_eavs.length > 0
        );

        if (!hasAnyMappedEavs) {
            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BriefGeneration',
                    message: `No EAVs mapped to any outline section despite ${eavs.length} EAVs being provided. Sections may lack semantic triple coverage.`,
                    status: 'warning',
                    timestamp: Date.now(),
                },
            });
        }

        if (!enrichedBrief.eavs || (Array.isArray(enrichedBrief.eavs) && enrichedBrief.eavs.length === 0)) {
            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BriefGeneration',
                    message: `Brief eavs field is empty despite ${eavs.length} EAVs being provided as input.`,
                    status: 'warning',
                    timestamp: Date.now(),
                },
            });
        }
    }

    // 3. contextualBridge.links max-3 anchor rule
    const bridgeLinks = getBridgeLinks(enrichedBrief.contextualBridge);
    if (bridgeLinks.length > 0) {
        const anchorCounts = new Map<string, number>();
        bridgeLinks.forEach((link: any) => {
            const anchor = (link.anchorText || '').toLowerCase().trim();
            if (anchor) {
                anchorCounts.set(anchor, (anchorCounts.get(anchor) || 0) + 1);
            }
        });

        const duplicatedAnchors = [...anchorCounts.entries()].filter(([, count]) => count > 3);
        if (duplicatedAnchors.length > 0) {
            // Deduplicate: keep only first 3 occurrences of each anchor
            const anchorSeen = new Map<string, number>();
            const deduped = bridgeLinks.filter((link: any) => {
                const anchor = (link.anchorText || '').toLowerCase().trim();
                if (!anchor) return true;
                const seen = anchorSeen.get(anchor) || 0;
                anchorSeen.set(anchor, seen + 1);
                return seen < 3;
            });

            // Apply deduplication back to the bridge
            if (Array.isArray(enrichedBrief.contextualBridge)) {
                (enrichedBrief as any).contextualBridge = deduped;
            } else if (enrichedBrief.contextualBridge && (enrichedBrief.contextualBridge as any).links) {
                (enrichedBrief.contextualBridge as any).links = deduped;
            }

            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BriefGeneration',
                    message: `Deduplicated contextualBridge anchors (max 3 per anchor). Affected: ${duplicatedAnchors.map(([a, c]) => `"${a}" (${c}x)`).join(', ')}`,
                    status: 'warning',
                    timestamp: Date.now(),
                },
            });
        }
    }

    // --- End post-brief validation ---

    // Compute structural_template_hash for symmetry checks
    const outlineHash = computeStructuralTemplateHash(enrichedBrief.structured_outline);

    return {
        ...enrichedBrief,
        suggestedLengthPreset: lengthSuggestion.preset,
        suggestedLengthReason: lengthSuggestion.reason,
        competitorSpecs,
        eavs: eavs || [],
        ...(categoryContext ? { categoryContext } : {}),
        structural_template_hash: outlineHash,
    };
};

export const generateArticleDraft = (
    brief: ContentBrief, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<string> => {
    // Validate language and region settings before generation
    validateLanguageAndRegion(businessInfo, dispatch);

    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateArticleDraft(brief, businessInfo, dispatch),
        openai: () => openAiService.generateArticleDraft(brief, businessInfo, dispatch),
        anthropic: () => anthropicService.generateArticleDraft(brief, businessInfo, dispatch),
        perplexity: () => perplexityService.generateArticleDraft(brief, businessInfo, dispatch),
        openrouter: () => openRouterService.generateArticleDraft(brief, businessInfo, dispatch),
    });
};

export const polishDraft = async (
    draft: string,
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
): Promise<string> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.polishDraft(draft, brief, businessInfo, dispatch),
        openai: () => openAiService.polishDraft(draft, brief, businessInfo, dispatch),
        anthropic: () => anthropicService.polishDraft(draft, brief, businessInfo, dispatch, onProgress),
        perplexity: () => perplexityService.polishDraft(draft, brief, businessInfo, dispatch),
        openrouter: () => openRouterService.polishDraft(draft, brief, businessInfo, dispatch),
    });
};

// Deprecated alias for backward compatibility during refactor
export const finalizeDraft = polishDraft;

// Threshold for hierarchical fallback (only applies after timeout AND size check)
const FALLBACK_POLISH_THRESHOLD = 15000;

/**
 * Split a markdown draft into sections by H2 headings
 */
function splitDraftIntoSections(draft: string): string[] {
    // Split by H2 headings, keeping the heading with each section
    const sections: string[] = [];
    const h2Pattern = /^## /m;

    // First, check if there's content before the first H2 (intro)
    const firstH2Index = draft.search(h2Pattern);
    if (firstH2Index > 0) {
        const intro = draft.substring(0, firstH2Index).trim();
        if (intro) {
            sections.push(intro);
        }
    }

    // Split by H2 headings
    const parts = draft.split(/(?=^## )/m);
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed && trimmed.startsWith('## ')) {
            sections.push(trimmed);
        } else if (trimmed && sections.length === 0) {
            // Content before first H2
            sections.push(trimmed);
        }
    }

    return sections;
}

/**
 * Generate a holistic summary of the document for context-aware section polishing.
 * This captures global themes, voice, terminology, and structure.
 */
async function generateHolisticSummary(
    draft: string,
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<HolisticSummary> {
    const prompt = prompts.HOLISTIC_SUMMARY_PROMPT(draft, brief, businessInfo);

    const response = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
        openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
        anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
        perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
        openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
    });

    // Parse JSON response with fallback defaults
    try {
        // Try to extract JSON from the response (in case of markdown wrapping)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(response);
    } catch {
        console.warn('[generateHolisticSummary] Failed to parse JSON, using defaults');
        return {
            themes: [brief.targetKeyword || brief.title],
            voice: 'professional and informative',
            terminology: [brief.targetKeyword || '', brief.title].filter(Boolean),
            semanticAnchors: [],
            structuralFlow: 'sequential'
        };
    }
}

/**
 * Polish a single section with holistic context preserved.
 * Part of the hierarchical fallback strategy.
 */
async function polishSectionWithContext(
    section: string,
    sectionIndex: number,
    totalSections: number,
    holisticSummary: HolisticSummary,
    adjacentContext: { previous?: string; next?: string },
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> {
    const prompt = prompts.POLISH_SECTION_WITH_CONTEXT_PROMPT(
        section,
        sectionIndex,
        totalSections,
        holisticSummary,
        adjacentContext,
        brief,
        businessInfo
    );

    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
        openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
        anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
        perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
        openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
    });
}

/**
 * Run a lightweight coherence pass to fix discontinuities after reassembling polished sections.
 */
async function runCoherencePass(
    polishedDraft: string,
    holisticSummary: HolisticSummary,
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> {
    const prompt = prompts.COHERENCE_PASS_PROMPT(polishedDraft, holisticSummary, brief, businessInfo);

    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
        openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
        anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
        perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
        openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
    });
}

/**
 * Polish draft using hierarchical approach that preserves global context.
 * Used as fallback when full document polish times out.
 *
 * Process:
 * 1. Generate holistic summary (themes, voice, terminology)
 * 2. Polish each section with summary context prepended
 * 3. Reassemble sections
 * 4. Run coherence pass for smooth transitions
 */
async function polishDraftHierarchical(
    draft: string,
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
): Promise<string> {
    // Phase 1: Generate holistic summary
    dispatch({
        type: 'LOG_EVENT',
        payload: {
            service: 'Polish',
            message: 'Analyzing document themes and structure for context preservation...',
            status: 'info',
            timestamp: Date.now()
        }
    });

    const holisticSummary = await generateHolisticSummary(draft, brief, businessInfo, dispatch);

    dispatch({
        type: 'LOG_EVENT',
        payload: {
            service: 'Polish',
            message: `Holistic summary: ${holisticSummary.themes.length} themes, ${holisticSummary.terminology.length} key terms identified`,
            status: 'success',
            timestamp: Date.now()
        }
    });

    // Phase 2: Split into sections
    const sections = splitDraftIntoSections(draft);

    dispatch({
        type: 'LOG_EVENT',
        payload: {
            service: 'Polish',
            message: `Polishing ${sections.length} sections with global context preserved...`,
            status: 'info',
            timestamp: Date.now()
        }
    });

    // Phase 3: Polish each section with context
    const polishedSections: string[] = [];
    for (let i = 0; i < sections.length; i++) {
        const sectionName = sections[i].split('\n')[0].replace(/^#+\s*/, '').substring(0, 50);

        if (onProgress) {
            onProgress({
                charsReceived: i * 1000,
                eventsProcessed: i + 1,
                elapsedMs: Date.now(),
                lastActivity: Date.now()
            });
        }

        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'Polish',
                message: `Polishing section ${i + 1}/${sections.length}: ${sectionName}...`,
                status: 'info',
                timestamp: Date.now()
            }
        });

        const adjacentContext = {
            previous: i > 0 ? sections[i - 1].slice(-500) : undefined,
            next: i < sections.length - 1 ? sections[i + 1].slice(0, 500) : undefined
        };

        try {
            const polished = await polishSectionWithContext(
                sections[i],
                i,
                sections.length,
                holisticSummary,
                adjacentContext,
                brief,
                businessInfo,
                dispatch
            );
            polishedSections.push(polished.trim());

            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'Polish',
                    message: `Section ${i + 1}/${sections.length} polished (${sections[i].length} → ${polished.length} chars)`,
                    status: 'success',
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.warn(`[polishDraftHierarchical] Section ${i + 1} polish failed, keeping original:`, error);
            polishedSections.push(sections[i]);

            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'Polish',
                    message: `Section ${i + 1} polish failed, keeping original`,
                    status: 'warning',
                    timestamp: Date.now()
                }
            });
        }
    }

    // Phase 4: Reassemble
    const reassembled = polishedSections.join('\n\n');

    // Phase 5: Coherence pass
    dispatch({
        type: 'LOG_EVENT',
        payload: {
            service: 'Polish',
            message: 'Running coherence pass for smooth transitions...',
            status: 'info',
            timestamp: Date.now()
        }
    });

    let finalDraft: string;
    try {
        finalDraft = await runCoherencePass(reassembled, holisticSummary, brief, businessInfo, dispatch);

        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'Polish',
                message: `Coherence pass complete: ${reassembled.length} → ${finalDraft.length} chars`,
                status: 'success',
                timestamp: Date.now()
            }
        });
    } catch (error) {
        console.warn('[polishDraftHierarchical] Coherence pass failed, using reassembled draft:', error);
        finalDraft = reassembled;

        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'Polish',
                message: 'Coherence pass skipped due to error, using reassembled draft',
                status: 'warning',
                timestamp: Date.now()
            }
        });
    }

    dispatch({
        type: 'LOG_EVENT',
        payload: {
            service: 'Polish',
            message: `Hierarchical polish complete: ${draft.length} → ${finalDraft.length} chars`,
            status: 'success',
            timestamp: Date.now()
        }
    });

    return finalDraft;
}

/**
 * Smart polish with quality-preserving fallback strategy.
 *
 * Strategy:
 * 1. ALWAYS try full document polish first (best quality)
 * 2. Only fall back to hierarchical approach if:
 *    - Full polish times out AND
 *    - Draft is large (>15,000 chars)
 *
 * The hierarchical fallback preserves semantic quality by:
 * - Extracting global context (themes, voice, terminology) first
 * - Prepending this context to each section during polish
 * - Running a final coherence pass
 */
export const polishDraftSmart = async (
    draft: string,
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
): Promise<string> => {
    // ALWAYS try full polish first - best quality
    try {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'Polish',
                message: `Polishing full document (${draft.length} chars)...`,
                status: 'info',
                timestamp: Date.now()
            }
        });

        return await polishDraft(draft, brief, businessInfo, dispatch, onProgress);

    } catch (error: any) {
        // Check if it's a timeout AND draft is large enough for fallback
        const errorMessage = error?.message || '';
        const isTimeout = errorMessage.includes('timed out') ||
                          errorMessage.includes('timeout') ||
                          errorMessage.includes('overloaded');
        const isLargeEnough = draft.length > FALLBACK_POLISH_THRESHOLD;

        if (!isTimeout || !isLargeEnough) {
            // Re-throw for non-timeout errors or small drafts
            throw error;
        }

        // Fall back to hierarchical approach with quality preservation
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'Polish',
                message: `Full polish timed out (${draft.length} chars). Using hierarchical approach with preserved context...`,
                status: 'warning',
                timestamp: Date.now()
            }
        });

        return polishDraftHierarchical(draft, brief, businessInfo, dispatch, onProgress);
    }
};

export const auditContentIntegrity = async (
    brief: ContentBrief,
    draft: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
): Promise<ContentIntegrityResult> => {
    // 1. Run AI Audit (Semantic & Contextual Checks)
    const aiResult = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
        openai: () => openAiService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
        anthropic: () => anthropicService.auditContentIntegrity(brief, draft, businessInfo, dispatch, onProgress),
        perplexity: () => perplexityService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
        openrouter: () => openRouterService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
    });

    // 2. Run Algorithmic Checks (Pattern Matching)
    // These checks are deterministic and enforce the "Cost of Retrieval" rules strictly.
    const subj = checkSubjectivity(draft);
    const pronouns = checkPronounDensity(draft, brief.title);
    const links = checkLinkPositioning(draft);
    const sentences = checkFirstSentencePrecision(draft);
    const questions = checkQuestionProtection(draft);
    const lists = checkListLogic(draft);
    const density = checkSentenceDensity(draft);

    // 3. Merge Results
    // We convert the simple AI result objects into rich AuditRuleResult objects where possible
    const enrichedAiRules = aiResult.frameworkRules.map(r => ({
        ruleName: r.ruleName,
        isPassing: r.isPassing,
        details: r.details,
        remediation: r.isPassing ? undefined : "Review the AI feedback and adjust context manually."
    }));

    const algorithmicRules = [
        subj,
        pronouns,
        links,
        sentences,
        questions,
        lists,
        density
    ];

    return {
        ...aiResult,
        draftText: draft, // Pass through the original text to enable Auto-Fix
        frameworkRules: [...enrichedAiRules, ...algorithmicRules]
    };
};

export const refineDraftSection = (
    originalText: string,
    violationType: string,
    instruction: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        openai: () => openAiService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        anthropic: () => anthropicService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        perplexity: () => perplexityService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        openrouter: () => openRouterService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
    });
};

export const generateSchema = (
    brief: ContentBrief, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<SchemaGenerationResult> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateSchema(brief, businessInfo, dispatch),
        openai: () => openAiService.generateSchema(brief, businessInfo, dispatch),
        anthropic: () => anthropicService.generateSchema(brief, businessInfo, dispatch),
        perplexity: () => perplexityService.generateSchema(brief, businessInfo, dispatch),
        openrouter: () => openRouterService.generateSchema(brief, businessInfo, dispatch),
    });
};
