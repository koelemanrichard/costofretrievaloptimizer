
import {
    BusinessInfo, CandidateEntity, SourceContextOption, SEOPillars,
    SemanticTriple, EnrichedTopic, ContentBrief, BriefSection, ResponseCode,
    GscRow, GscOpportunity, ValidationResult, ValidationIssue,
    MapImprovementSuggestion, MergeSuggestion, SemanticAnalysisResult,
    ContextualCoverageMetrics, InternalLinkAuditResult, TopicalAuthorityScore,
    PublicationPlan, ContentIntegrityResult, SchemaGenerationResult,
    TopicViabilityResult, TopicBlueprint, FlowAuditResult, ContextualFlowIssue,
    KnowledgeGraph, MapMergeAnalysis, TopicSimilarityResult, TopicMergeDecision, TopicalMap,
    SerpResult
} from '../types';
import * as prompts from '../config/prompts';
import { CONTENT_BRIEF_FALLBACK } from '../config/schemas';
import { AIResponseSanitizer } from './aiResponseSanitizer';
import { AppAction } from '../state/appState';
import React from 'react';
import { calculateTopicSimilarityPairs } from '../utils/helpers';
import { logAiUsage, estimateTokens, AIUsageContext } from './telemetryService';
import { getSupabaseClient } from './supabaseClient';
import { perplexityLogger } from './apiCallLogger';

// Current operation context for logging (set by callers)
let currentUsageContext: AIUsageContext = {};
let currentOperation: string = 'unknown';

/**
 * Set the context for AI usage logging (should be called before AI operations)
 */
export function setUsageContext(context: AIUsageContext, operation?: string): void {
    currentUsageContext = context;
    if (operation) currentOperation = operation;
}

/**
 * Extract markdown content from potentially JSON-wrapped AI responses.
 * Sometimes AI returns JSON like {"polished_article": "..."} even when asked for raw markdown.
 * This function gracefully handles such cases.
 */
const extractMarkdownFromResponse = (text: string): string => {
    if (!text) return text;

    // Strip markdown code block wrapper if present (```json ... ``` or ``` ... ```)
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        const firstNewline = cleaned.indexOf('\n');
        if (firstNewline !== -1) {
            cleaned = cleaned.substring(firstNewline + 1);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.substring(0, cleaned.length - 3).trimEnd();
        }
    }

    // Try to parse as JSON and extract content
    try {
        const parsed = JSON.parse(cleaned);
        // Check common key names for polished content (order matters - most specific first)
        const content = parsed.polished_content || parsed.polished_article ||
                       parsed.polishedContent || parsed.polishedArticle ||
                       parsed.polishedDraft || parsed.content || parsed.article ||
                       parsed.markdown || parsed.text || parsed.draft;
        if (typeof content === 'string') {
            console.log('[extractMarkdownFromResponse] Successfully extracted content from JSON wrapper');
            return content;
        }
    } catch (e) {
        // Not valid JSON, return original text (which is the expected case)
    }

    return text;
};

const API_URL = 'https://api.perplexity.ai/chat/completions';

const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    operationName?: string
): Promise<T> => {
    const startTime = Date.now();
    const operation = operationName || currentOperation;
    const modelToUse = businessInfo.aiModel || 'sonar-pro';

    dispatch({ type: 'LOG_EVENT', payload: { service: 'Perplexity', message: `Sending request to ${modelToUse}...`, status: 'info', timestamp: Date.now() } });

    if (!businessInfo.perplexityApiKey) {
        throw new Error("Perplexity API key is not configured.");
    }

    // Get supabase client for database logging (if available)
    let supabase: any;
    try {
        if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
            supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        }
    } catch (e) {
        // Ignore if supabase not available
    }

    // Start API call logging
    const apiCallLog = perplexityLogger.start(operation, 'POST');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${businessInfo.perplexityApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [
                    { role: "system", content: "You are a helpful, expert SEO strategist. You output strict JSON when requested." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 8192 // Prevent truncation for long content
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errText}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content || '';
        const durationMs = Date.now() - startTime;

        // Log successful usage
        const tokensIn = data.usage?.prompt_tokens || estimateTokens(prompt.length);
        const tokensOut = data.usage?.completion_tokens || estimateTokens(responseText.length);

        logAiUsage({
            provider: 'perplexity',
            model: modelToUse,
            operation,
            tokensIn,
            tokensOut,
            durationMs,
            success: true,
            requestSizeBytes: prompt.length,
            responseSizeBytes: responseText.length,
            context: currentUsageContext
        }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

        // Log successful API call
        perplexityLogger.success(apiCallLog.id, {
            model: modelToUse,
            requestSize: prompt.length,
            responseSize: responseText.length,
            tokenCount: tokensIn + tokensOut,
        });

        dispatch({ type: 'LOG_EVENT', payload: { service: 'Perplexity', message: `Received response.`, status: 'info', timestamp: Date.now() } });

        return sanitizerFn(responseText);

    } catch (error) {
        const durationMs = Date.now() - startTime;
        const message = error instanceof Error ? error.message : "Unknown Perplexity error";

        // Log failed usage
        logAiUsage({
            provider: 'perplexity',
            model: modelToUse,
            operation,
            tokensIn: estimateTokens(prompt.length),
            tokensOut: 0,
            durationMs,
            success: false,
            errorMessage: message,
            context: currentUsageContext
        }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

        // Log failed API call
        perplexityLogger.error(apiCallLog.id, error, {
            model: modelToUse,
            requestSize: prompt.length,
        });

        dispatch({ type: 'LOG_EVENT', payload: { service: 'Perplexity', message: `Error: ${message}`, status: 'failure', timestamp: Date.now(), data: error } });
        throw new Error(`Perplexity API Call Failed: ${message}`);
    }
};

// --- Reused implementations with callApi ---

export const suggestCentralEntityCandidates = async (info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT(info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const suggestSourceContextOptions = async (info: BusinessInfo, entity: string, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT(info, entity), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const suggestCentralSearchIntent = async (info: BusinessInfo, entity: string, context: string, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT(info, entity, context), info, dispatch, (text) => sanitizer.sanitizeArray<{ intent: string, reasoning: string }>(text, []));
};

export const discoverCoreSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT(info, pillars), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const expandSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, existing: SemanticTriple[], dispatch: React.Dispatch<any>, count: number = 15): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // For large counts, use batched generation to avoid token limits
    const BATCH_SIZE = 30;

    if (count <= BATCH_SIZE) {
        return callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, existing, count), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
    }

    // Batched generation for larger counts
    const allNewTriples: SemanticTriple[] = [];
    const batches = Math.ceil(count / BATCH_SIZE);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Perplexity',
        message: `Starting batched EAV expansion: ${count} triples in ${batches} batches`,
        status: 'info',
        timestamp: Date.now()
    }});

    for (let i = 0; i < batches; i++) {
        const batchCount = Math.min(BATCH_SIZE, count - allNewTriples.length);
        const combinedExisting = [...existing, ...allNewTriples];

        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Perplexity',
            message: `Generating batch ${i + 1}/${batches}: ${batchCount} triples (${allNewTriples.length}/${count} complete)`,
            status: 'info',
            timestamp: Date.now()
        }});

        const batchResults = await callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, combinedExisting, batchCount), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
        allNewTriples.push(...batchResults);

        if (allNewTriples.length >= count) break;
    }

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Perplexity',
        message: `Batched EAV expansion complete: Generated ${allNewTriples.length} new triples`,
        status: 'success',
        timestamp: Date.now()
    }});

    return allNewTriples.slice(0, count);
};

export const generateInitialTopicalMap = async (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_INITIAL_TOPICAL_MAP_PROMPT(info, pillars, eavs, competitors);
    const fallback = { monetizationSection: [], informationalSection: [] };
    const result = await callApi(prompt, info, dispatch, (text) => sanitizer.sanitize(text, { monetizationSection: Array, informationalSection: Array }, fallback));
    
    const coreTopics: any[] = [];
    const outerTopics: any[] = [];
    const process = (list: any[], cls: string) => {
         if(!list) return;
         list.forEach(c => {
             const tid = Math.random().toString();
             coreTopics.push({...c, id: tid, topic_class: cls, type: 'core', parent_topic_id: null});
             if(c.spokes) c.spokes.forEach((s: any) => outerTopics.push({...s, id: Math.random().toString(), parent_topic_id: tid, topic_class: cls, type: 'outer'}));
         });
    };
    process(result.monetizationSection, 'monetization');
    process(result.informationalSection, 'informational');
    return { coreTopics, outerTopics };
};

export const suggestResponseCode = async (info: BusinessInfo, topic: string, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_RESPONSE_CODE_PROMPT(info, topic), info, dispatch, (text) => sanitizer.sanitize(text, { responseCode: String, reasoning: String }, { responseCode: ResponseCode.INFORMATIONAL, reasoning: '' }));
};

export const generateContentBrief = async (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code, marketPatterns);
    const schema = {
        title: String, slug: String, metaDescription: String, keyTakeaways: Array, outline: String,
        structured_outline: Array, perspectives: Array, methodology_note: String,
        serpAnalysis: { peopleAlsoAsk: Array, competitorHeadings: Array, avgWordCount: Number, avgHeadings: Number, commonStructure: String, contentGaps: Array },
        visuals: { featuredImagePrompt: String, imageAltText: String },
        contextualVectors: Array,
        contextualBridge: { type: String, content: String, links: Array },
        predicted_user_journey: String,
        query_type_format: String, featured_snippet_target: Object,
        visual_semantics: Array, discourse_anchors: Array
    };
    return callApi(prompt, info, dispatch, (text) => sanitizer.sanitize(text, schema, CONTENT_BRIEF_FALLBACK));
};

export const generateArticleDraft = async (brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>) => callApi(prompts.GENERATE_ARTICLE_DRAFT_PROMPT(brief, info), info, dispatch, t => t);

export const polishDraft = async (draft: string, brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>) => callApi(prompts.POLISH_ARTICLE_DRAFT_PROMPT(draft, brief, info), info, dispatch, extractMarkdownFromResponse);

export const auditContentIntegrity = async (brief: ContentBrief, draft: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback: ContentIntegrityResult = { overallSummary: '', draftText: draft, eavCheck: { isPassing: false, details: '' }, linkCheck: { isPassing: false, details: '' }, linguisticModality: { score: 0, summary: '' }, frameworkRules: [] };
    const schema = { overallSummary: String, eavCheck: Object, linkCheck: Object, linguisticModality: Object, frameworkRules: Array };
    return callApi(prompts.AUDIT_CONTENT_INTEGRITY_PROMPT(brief, draft, info), info, dispatch, t => sanitizer.sanitize(t, schema, fallback));
};

export const refineDraftSection = async (text: string, violation: string, instr: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const res = await callApi(prompts.REFINE_DRAFT_SECTION_PROMPT(text, violation, instr, info), info, dispatch, t => sanitizer.sanitize(t, { refinedText: String }, { refinedText: text }));
    return res.refinedText;
};

export const generateSchema = async (brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_SCHEMA_PROMPT(brief), info, dispatch, t => sanitizer.sanitize(t, { schema: String, reasoning: String }, { schema: '', reasoning: '' }));
};

export const validateTopicalMap = async (topics: EnrichedTopic[], pillars: SEOPillars, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.VALIDATE_TOPICAL_MAP_PROMPT(topics, pillars, info), info, dispatch, t => sanitizer.sanitize(t, { overallScore: Number, summary: String, issues: Array }, { overallScore: 0, summary: '', issues: [] }));
};

export const analyzeGscDataForOpportunities = async (rows: GscRow[], kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ANALYZE_GSC_DATA_PROMPT(rows, kg), info, dispatch, t => sanitizer.sanitizeArray(t, []));
};

export const improveTopicalMap = async (topics: EnrichedTopic[], issues: ValidationIssue[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<MapImprovementSuggestion> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback: MapImprovementSuggestion = { newTopics: [], topicTitlesToDelete: [], topicMerges: [], hubSpokeGapFills: [], typeReclassifications: [] };
    return callApi(prompts.IMPROVE_TOPICAL_MAP_PROMPT(topics, issues, info), info, dispatch, t => sanitizer.sanitize(t, { newTopics: Array, topicTitlesToDelete: Array }, fallback));
};

export const findMergeOpportunities = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_MERGE_OPPORTUNITIES_PROMPT(topics, info), info, dispatch, t => sanitizer.sanitizeArray(t, []));
};

export const findMergeOpportunitiesForSelection = async (info: BusinessInfo, selected: EnrichedTopic[], dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT(info, selected), info, dispatch, t => sanitizer.sanitize(t, { topicIds: Array, topicTitles: Array, newTopic: Object, reasoning: String, canonicalQuery: String }, { topicIds: [], topicTitles: [], newTopic: { title: '', description: '' }, reasoning: '', canonicalQuery: '' }));
};

export const analyzeSemanticRelationships = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<SemanticAnalysisResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    const preCalculatedPairs = calculateTopicSimilarityPairs(topics);
    const limitedPairs = preCalculatedPairs.slice(0, 20);

    const prompt = prompts.ANALYZE_SEMANTIC_RELATIONSHIPS_PROMPT(topics, info, limitedPairs);

    const fallback: SemanticAnalysisResult = {
        summary: 'Unable to analyze semantic relationships. Please try again.',
        pairs: limitedPairs.map(p => ({
            topicA: p.topicA,
            topicB: p.topicB,
            distance: { weightedScore: 1 - p.similarity },
            relationship: {
                type: p.similarity >= 0.7 ? 'SIBLING' as const : p.similarity >= 0.4 ? 'RELATED' as const : 'DISTANT' as const,
                internalLinkingPriority: p.similarity >= 0.7 ? 'high' as const : p.similarity >= 0.4 ? 'medium' as const : 'low' as const
            }
        })),
        actionableSuggestions: ['Review topic hierarchy for better clustering.']
    };

    const schema = { summary: String, pairs: Array, actionableSuggestions: Array };
    return callApi(prompt, info, dispatch, t => sanitizer.sanitize(t, schema, fallback));
};

export const analyzeContextualCoverage = async (info: BusinessInfo, topics: EnrichedTopic[], pillars: SEOPillars, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ANALYZE_CONTEXTUAL_COVERAGE_PROMPT(info, topics, pillars), info, dispatch, t => sanitizer.sanitize(t, { summary: String, macroCoverage: Number, microCoverage: Number, temporalCoverage: Number, intentionalCoverage: Number, gaps: Array }, { summary: '', macroCoverage: 0, microCoverage: 0, temporalCoverage: 0, intentionalCoverage: 0, gaps: [] }));
};

export const auditInternalLinking = async (topics: EnrichedTopic[], briefs: any, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.AUDIT_INTERNAL_LINKING_PROMPT(topics, briefs, info), info, dispatch, t => sanitizer.sanitize(t, { summary: String, missedLinks: Array, dilutionRisks: Array }, { summary: '', missedLinks: [], dilutionRisks: [] }));
};

export const calculateTopicalAuthority = async (topics: EnrichedTopic[], briefs: any, kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.CALCULATE_TOPICAL_AUTHORITY_PROMPT(topics, briefs, kg, info), info, dispatch, t => sanitizer.sanitize(t, { overallScore: Number, summary: String, breakdown: Object }, { overallScore: 0, summary: '', breakdown: { contentDepth: 0, contentBreadth: 0, interlinking: 0, semanticRichness: 0 } }));
};

export const generatePublicationPlan = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_PUBLICATION_PLAN_PROMPT(topics, info), info, dispatch, t => sanitizer.sanitize(t, { total_duration_weeks: Number, phases: Array }, { total_duration_weeks: 0, phases: [] }));
};

export const findLinkingOpportunitiesForTopic = async (target: EnrichedTopic, all: EnrichedTopic[], kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_LINKING_OPPORTUNITIES_PROMPT(target, all, kg, info), info, dispatch, t => sanitizer.sanitizeArray(t, []));
};

export const addTopicIntelligently = async (title: string, desc: string, all: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ADD_TOPIC_INTELLIGENTLY_PROMPT(title, desc, all, info), info, dispatch, t => sanitizer.sanitize(t, { parentTopicId: String, type: String }, { parentTopicId: null, type: 'outer' }));
};

export const expandCoreTopic = async (info: BusinessInfo, pillars: SEOPillars, core: EnrichedTopic, all: EnrichedTopic[], kg: KnowledgeGraph, dispatch: React.Dispatch<any>, mode: any, context?: string) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.EXPAND_CORE_TOPIC_PROMPT(info, pillars, core, all, kg, mode, context), info, dispatch, t => sanitizer.sanitizeArray(t, []));
};

export const analyzeTopicViability = async (topic: string, desc: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ANALYZE_TOPIC_VIABILITY_PROMPT(topic, desc, info), info, dispatch, t => sanitizer.sanitize(t, { decision: String, reasoning: String, targetParent: String }, { decision: 'PAGE', reasoning: '', targetParent: undefined }));
};

export const generateCoreTopicSuggestions = async (thoughts: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT(thoughts, info), info, dispatch, t => sanitizer.sanitizeArray(t, []));
};

export const generateStructuredTopicSuggestions = async (thoughts: string, existing: any[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT(thoughts, existing, info), info, dispatch, t => sanitizer.sanitizeArray(t, []));
};

export const enrichTopicMetadata = async (topics: any[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ENRICH_TOPIC_METADATA_PROMPT(topics, info), info, dispatch, t => sanitizer.sanitizeArray(t, []));
};

export const generateTopicBlueprints = async (topics: any[], info: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const flatResults = await callApi(prompts.GENERATE_TOPIC_BLUEPRINT_PROMPT(topics, info, pillars), info, dispatch, t => sanitizer.sanitizeArray(t, []));
    return flatResults.map((item: any) => ({ id: item.id, blueprint: { ...item } }));
};

export const analyzeContextualFlow = async (text: string, entity: string, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<FlowAuditResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const vProm = callApi(prompts.AUDIT_INTRA_PAGE_FLOW_PROMPT(text, entity), info, dispatch, t => sanitizer.sanitize(t, { headingVector: Array, vectorIssues: Array, attributeOrderIssues: Array }, { headingVector: [], vectorIssues: [], attributeOrderIssues: [] }));
    const dProm = callApi(prompts.AUDIT_DISCOURSE_INTEGRATION_PROMPT(text), info, dispatch, t => sanitizer.sanitize(t, { discourseGaps: Array, gapDetails: Array }, { discourseGaps: [], gapDetails: [] }));

    const [vRes, dRes] = await Promise.all([vProm, dProm]);
    const issues: ContextualFlowIssue[] = [];
    if(vRes.vectorIssues) vRes.vectorIssues.forEach((i: any) => issues.push({ category: 'VECTOR', rule: 'Vector Straightness', score: 0, details: i.issue, offendingSnippet: i.heading, remediation: i.remediation }));
    if(vRes.attributeOrderIssues) vRes.attributeOrderIssues.forEach((i: any) => issues.push({ category: 'MACRO', rule: 'Attribute Order', score: 0, details: i.issue, offendingSnippet: i.section, remediation: i.remediation }));
    if(dRes.gapDetails) dRes.gapDetails.forEach((i: any) => issues.push({ category: 'LINGUISTIC', rule: 'Discourse Integration', score: 0, details: i.details, offendingSnippet: `Gap #${i.paragraphIndex}`, remediation: i.suggestedBridge }));

    return { overallFlowScore: 85, vectorStraightness: 80, informationDensity: 90, issues, headingVector: vRes.headingVector || [], discourseGaps: dRes.discourseGaps || [] };
};

export const applyFlowRemediation = async (snippet: string, issue: ContextualFlowIssue, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = await callApi(prompts.APPLY_FLOW_REMEDIATION_PROMPT(snippet, issue.details, issue.remediation, info), info, dispatch, t => sanitizer.sanitize(t, { refinedText: String }, { refinedText: snippet }));
    return result.refinedText;
};

export const applyBatchFlowRemediation = async (draft: string, issues: ContextualFlowIssue[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = await callApi(prompts.BATCH_FLOW_REMEDIATION_PROMPT(draft, issues, info), info, dispatch, t => sanitizer.sanitize(t, { polishedDraft: String }, { polishedDraft: draft }));
    return result.polishedDraft;
};

// --- Generic AI methods for Migration Service ---

/**
 * Generic JSON generation method for migration workflows
 */
export const generateJson = async <T extends object>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    fallback: T
): Promise<T> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompt, businessInfo, dispatch, (text) => {
        try {
            return JSON.parse(text);
        } catch {
            return sanitizer.sanitize(text, {}, fallback);
        }
    });
};

/**
 * Generic text generation method for migration workflows
 */
export const generateText = async (
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    return callApi(prompt, businessInfo, dispatch, (text) => text);
};

// ============================================
// MAP MERGE ANALYSIS - Stubs (delegates to Gemini)
// ============================================

export const analyzeMapMerge = async (
  mapsToMerge: TopicalMap[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<MapMergeAnalysis> => {
  // Delegate to Gemini implementation for now
  // Must override both aiProvider AND aiModel to avoid passing Perplexity model to Gemini
  const geminiService = await import('./geminiService');
  return geminiService.analyzeMapMerge(mapsToMerge, {
    ...businessInfo,
    aiProvider: 'gemini',
    aiModel: 'gemini-2.5-pro-preview-06-05'
  }, dispatch);
};

export const reanalyzeTopicSimilarity = async (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<TopicSimilarityResult[]> => {
  // Delegate to Gemini implementation for now
  // Must override both aiProvider AND aiModel to avoid passing Perplexity model to Gemini
  const geminiService = await import('./geminiService');
  return geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, {
    ...businessInfo,
    aiProvider: 'gemini',
    aiModel: 'gemini-2.5-pro-preview-06-05'
  }, dispatch);
};

// ============================================
// BRIEF EDITING FUNCTIONS
// Native Perplexity implementation - respects user's provider choice
// ============================================

export const regenerateBrief = async (
  businessInfo: BusinessInfo,
  topic: EnrichedTopic,
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
): Promise<ContentBrief> => {
  const sanitizer = new AIResponseSanitizer(dispatch);
  const prompt = prompts.REGENERATE_BRIEF_PROMPT(
    businessInfo,
    topic,
    currentBrief,
    userInstructions,
    pillars,
    allTopics
  );

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'Perplexity',
      message: `Regenerating brief for "${topic.title}" with user instructions`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  const schema = {
    title: String, slug: String, metaDescription: String, keyTakeaways: Array, outline: String,
    structured_outline: Array, perspectives: Array, methodology_note: String,
    serpAnalysis: { peopleAlsoAsk: Array, competitorHeadings: Array, avgWordCount: Number, avgHeadings: Number, commonStructure: String, contentGaps: Array },
    visuals: { featuredImagePrompt: String, imageAltText: String },
    contextualVectors: Array,
    contextualBridge: { type: String, content: String, links: Array },
    predicted_user_journey: String,
    query_type_format: String, featured_snippet_target: Object,
    visual_semantics: Array, discourse_anchors: Array
  };

  const result = await callApi(
    prompt,
    businessInfo,
    dispatch,
    (text) => sanitizer.sanitize(text, schema, CONTENT_BRIEF_FALLBACK)
  );

  // Preserve the original ID and topic_id
  return {
    ...result,
    id: currentBrief.id,
    topic_id: currentBrief.topic_id,
  } as ContentBrief;
};

export const refineBriefSection = async (
  section: BriefSection,
  userInstruction: string,
  briefContext: ContentBrief,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<BriefSection> => {
  const sanitizer = new AIResponseSanitizer(dispatch);
  const prompt = prompts.REFINE_BRIEF_SECTION_PROMPT(
    section,
    userInstruction,
    briefContext,
    businessInfo
  );

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'Perplexity',
      message: `Refining section "${section.heading}" with AI assistance`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  const schema = {
    heading: String,
    level: Number,
    format_code: String,
    attribute_category: String,
    content_zone: String,
    subordinate_text_hint: String,
    methodology_note: String,
    required_phrases: Array,
    anchor_texts: Array,
  };

  const fallback: BriefSection = { ...section };

  const result = await callApi(
    prompt,
    businessInfo,
    dispatch,
    (text) => sanitizer.sanitize(text, schema, fallback)
  );

  return {
    ...result,
    key: section.key, // Preserve the original key
  } as BriefSection;
};

export const generateNewSection = async (
  insertPosition: number,
  parentHeading: string | null,
  userInstruction: string,
  briefContext: ContentBrief,
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  dispatch: React.Dispatch<any>
): Promise<BriefSection> => {
  const sanitizer = new AIResponseSanitizer(dispatch);
  const prompt = prompts.GENERATE_NEW_SECTION_PROMPT(
    insertPosition,
    parentHeading,
    userInstruction,
    briefContext,
    businessInfo,
    pillars
  );

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'Perplexity',
      message: `Generating new section at position ${insertPosition}`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  const schema = {
    heading: String,
    level: Number,
    format_code: String,
    attribute_category: String,
    content_zone: String,
    subordinate_text_hint: String,
    methodology_note: String,
    required_phrases: Array,
    anchor_texts: Array,
  };

  const fallback: BriefSection = {
    key: `section-${Date.now()}`,
    heading: 'New Section',
    level: 2,
  };

  const result = await callApi(
    prompt,
    businessInfo,
    dispatch,
    (text) => sanitizer.sanitize(text, schema, fallback)
  );

  return {
    ...result,
    key: `section-${Date.now()}`,
  } as BriefSection;
};

// ============================================
// AI-BASED COMPETITOR DISCOVERY
// Uses Perplexity's web search to find competitors based on SEO pillars
// Fallback when SERP-based discovery fails (e.g., new domains)
// ============================================

/**
 * Discovers competitors using AI-powered web search.
 * This is useful when SERP-based discovery fails (e.g., for new domains).
 * Instead of looking at who ranks for the domain, this looks at who ranks
 * for the SUBJECT (Central Entity + Source Context + Central Search Intent).
 */
export const discoverCompetitorsWithAI = async (
  pillars: SEOPillars,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<SerpResult[]> => {
  const sanitizer = new AIResponseSanitizer(dispatch);

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'Perplexity',
      message: `Discovering competitors via AI for: ${pillars.centralEntity}`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  const prompt = `You are an expert SEO strategist with deep knowledge of competitive landscapes.

I need you to find the top competitors for a business with these SEO pillars:

**Central Entity (CE):** ${pillars.centralEntity}
**Source Context (SC):** ${pillars.sourceContext}
**Central Search Intent (CSI):** ${pillars.centralSearchIntent}
${businessInfo.domain ? `**Our Domain:** ${businessInfo.domain}` : ''}
${businessInfo.projectName ? `**Project:** ${businessInfo.projectName}` : ''}

Search the web and find 10-15 websites that are major competitors in this space. These should be:
1. Websites that rank well for queries related to the Central Search Intent
2. Websites that cover the same Central Entity and Source Context
3. Direct competitors who would compete for the same audience
4. Both large established players AND up-and-coming competitors

DO NOT include:
- Social media platforms (Facebook, Twitter, Instagram, LinkedIn, YouTube)
- Generic directories or aggregators (Wikipedia, Yelp, etc.)
- News sites unless they are specifically about this topic
- Our own domain: ${businessInfo.domain || 'N/A'}

Return a JSON array of competitors with this structure:
[
  {
    "position": 1,
    "title": "Competitor Name or Website Title",
    "link": "https://competitor-website.com",
    "snippet": "Brief description of why this is a relevant competitor"
  }
]

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.`;

  const fallback: SerpResult[] = [];

  try {
    // Force Perplexity-specific model since this function always uses Perplexity API
    // regardless of the user's global AI provider setting
    const perplexityBusinessInfo = {
      ...businessInfo,
      aiModel: 'sonar-pro' // Always use Perplexity's sonar-pro model for competitor discovery
    };

    const result = await callApi(
      prompt,
      perplexityBusinessInfo,
      dispatch,
      (text) => sanitizer.sanitizeArray<SerpResult>(text, fallback),
      'discoverCompetitorsWithAI'
    );

    // Filter out any results that match our own domain
    const filteredResults = result.filter((r: SerpResult) => {
      if (!businessInfo.domain) return true;
      try {
        const competitorDomain = new URL(r.link).hostname.replace('www.', '');
        const ourDomain = businessInfo.domain.replace('www.', '').replace(/^https?:\/\//, '');
        return !competitorDomain.includes(ourDomain) && !ourDomain.includes(competitorDomain);
      } catch {
        return true;
      }
    });

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'Perplexity',
        message: `AI discovered ${filteredResults.length} competitors`,
        status: 'success',
        timestamp: Date.now(),
      },
    });

    return filteredResults;
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'Perplexity',
        message: `AI competitor discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });
    return fallback;
  }
};
