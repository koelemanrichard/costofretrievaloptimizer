// OpenAI service using Supabase Edge Function proxy to avoid CORS issues
import {
    BusinessInfo, CandidateEntity, SourceContextOption, SEOPillars,
    SemanticTriple, EnrichedTopic, ContentBrief, BriefSection, ResponseCode,
    GscRow, GscOpportunity, ValidationResult, ValidationIssue,
    MapImprovementSuggestion, MergeSuggestion, SemanticAnalysisResult,
    ContextualCoverageMetrics, InternalLinkAuditResult, TopicalAuthorityScore,
    PublicationPlan, ContentIntegrityResult, SchemaGenerationResult,
    TopicViabilityResult, TopicBlueprint, FlowAuditResult, ContextualFlowIssue,
    KnowledgeGraph, MapMergeAnalysis, TopicSimilarityResult, TopicMergeDecision, TopicalMap
} from '../types';
import * as prompts from '../config/prompts';
import { CONTENT_BRIEF_FALLBACK } from '../config/schemas';
import { AIResponseSanitizer } from './aiResponseSanitizer';
import { AppAction } from '../state/appState';
import React from 'react';
import { calculateTopicSimilarityPairs } from '../utils/helpers';
import { logAiUsage, estimateTokens } from './telemetryService';
import { getSupabaseClient } from './supabaseClient';
import { openAiLogger } from './apiCallLogger';
import { isValidModel as isValidRegistryModel, getDefaultModel, SERVICE_REGISTRY } from '../config/serviceRegistry';

// Retry configuration for network failures
const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_BASE_DELAY_MS = 2000; // 2 seconds initial delay

/**
 * Helper to retry fetch on network errors with exponential backoff
 * Only retries on network-level failures (Failed to fetch), not API errors
 */
const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    maxRetries: number = NETWORK_RETRY_ATTEMPTS
): Promise<Response> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            return response; // Success - return even if status is error (handled by caller)
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const isNetworkError = lastError.message === 'Failed to fetch' ||
                                   lastError.message.includes('NetworkError') ||
                                   lastError.message.includes('network') ||
                                   lastError.name === 'TypeError'; // fetch throws TypeError on network failure

            if (!isNetworkError || attempt >= maxRetries) {
                throw lastError;
            }

            // Exponential backoff: 2s, 4s, 8s
            const delayMs = NETWORK_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(`[OpenAI] Network error on attempt ${attempt}/${maxRetries}, retrying in ${delayMs}ms...`, lastError.message);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw lastError || new Error('Max retries exceeded');
};

// Shared provider context (replaces duplicated context pattern)
import { createProviderContext } from './ai/shared/providerContext';
const ctx = createProviderContext('openai');
export const setUsageContext = ctx.setUsageContext;

// Use shared extraction utility (previously duplicated across all providers)
import { extractMarkdownFromResponse } from './ai/shared/extractJson';

const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    isJson: boolean = true,
    operationName?: string
): Promise<T> => {
    const startTime = Date.now();
    const operation = operationName || ctx.getOperation();

    dispatch({ type: 'LOG_EVENT', payload: { service: 'OpenAI', message: `Sending request to ${businessInfo.aiModel}...`, status: 'info', timestamp: Date.now() } });

    if (!businessInfo.openAiApiKey) {
        throw new Error("OpenAI API key is not configured.");
    }

    if (!businessInfo.supabaseUrl) {
        throw new Error("Supabase URL is not configured. Required for OpenAI proxy.");
    }

    const modelToUse = (businessInfo.aiModel && isValidRegistryModel('openai', businessInfo.aiModel))
        ? businessInfo.aiModel : getDefaultModel('openai');

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
    const apiCallLog = openAiLogger.start(operation, 'POST');

    // Build proxy URL
    const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/openai-proxy`;

    try {
        // Build request body for the proxy
        const requestBody: any = {
            model: modelToUse,
            messages: [
                { role: "system", content: "You are a helpful, expert SEO strategist and content architect. You output strict JSON when requested." },
                { role: "user", content: prompt }
            ],
            max_tokens: 8192,
        };

        // Add response format for JSON responses
        if (isJson) {
            requestBody.response_format = { type: "json_object" };
        }

        // Call the proxy instead of OpenAI directly, with retry on network failures
        const response = await fetchWithRetry(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-openai-api-key': businessInfo.openAiApiKey,
                'apikey': businessInfo.supabaseAnonKey || '',
            },
            body: JSON.stringify(requestBody),
        });

        const durationMs = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
            const suggestion = errorData.suggestion || '';

            // Log failed usage
            logAiUsage({
                provider: 'openai',
                model: modelToUse,
                operation,
                tokensIn: estimateTokens(prompt.length),
                tokensOut: 0,
                durationMs,
                success: false,
                errorMessage,
                context: ctx.getUsageContext()
            }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

            // Log failed API call
            openAiLogger.error(apiCallLog.id, new Error(errorMessage), {
                model: modelToUse,
                requestSize: prompt.length,
            });

            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'OpenAI',
                message: `Error: ${errorMessage}${suggestion ? ` - ${suggestion}` : ''}`,
                status: 'failure',
                timestamp: Date.now()
            }});
            throw new Error(`OpenAI API Call Failed: ${errorMessage}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || '';

        // Log successful usage
        const tokensIn = data.usage?.prompt_tokens || estimateTokens(prompt.length);
        const tokensOut = data.usage?.completion_tokens || estimateTokens(responseText.length);

        logAiUsage({
            provider: 'openai',
            model: modelToUse,
            operation,
            tokensIn,
            tokensOut,
            durationMs,
            success: true,
            requestSizeBytes: prompt.length,
            responseSizeBytes: responseText.length,
            context: ctx.getUsageContext()
        }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

        // Log successful API call
        openAiLogger.success(apiCallLog.id, {
            model: modelToUse,
            requestSize: prompt.length,
            responseSize: responseText.length,
            tokenCount: tokensIn + tokensOut,
        });

        dispatch({ type: 'LOG_EVENT', payload: { service: 'OpenAI', message: `Received response via proxy.`, status: 'info', timestamp: Date.now() } });

        return sanitizerFn(responseText);

    } catch (error) {
        const durationMs = Date.now() - startTime;
        const message = error instanceof Error ? error.message : "Unknown OpenAI error";

        // Only log if not already logged above
        if (!message.includes('OpenAI API Call Failed')) {
            // Log failed usage
            logAiUsage({
                provider: 'openai',
                model: modelToUse,
                operation,
                tokensIn: estimateTokens(prompt.length),
                tokensOut: 0,
                durationMs,
                success: false,
                errorMessage: message,
                context: ctx.getUsageContext()
            }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

            // Log failed API call
            openAiLogger.error(apiCallLog.id, error, {
                model: modelToUse,
                requestSize: prompt.length,
            });

            dispatch({ type: 'LOG_EVENT', payload: { service: 'OpenAI', message: `Error: ${message}`, status: 'failure', timestamp: Date.now(), data: error } });
        }

        throw error instanceof Error && error.message.includes('OpenAI API Call Failed')
            ? error
            : new Error(`OpenAI API Call Failed: ${message}`);
    }
};

// --- Implemented Functions ---

export const suggestCentralEntityCandidates = async (info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<CandidateEntity[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT(info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), true, 'suggestCentralEntityCandidates');
};

export const suggestSourceContextOptions = async (info: BusinessInfo, entity: string, dispatch: React.Dispatch<any>): Promise<SourceContextOption[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT(info, entity), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), true, 'suggestSourceContextOptions');
};

export const suggestCentralSearchIntent = async (info: BusinessInfo, entity: string, context: string, dispatch: React.Dispatch<any>): Promise<{ intent: string, reasoning: string }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT(info, entity, context), info, dispatch, (text) => sanitizer.sanitizeArray<{ intent: string, reasoning: string }>(text, []), true, 'suggestCentralSearchIntent');
};

export const discoverCoreSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT(info, pillars), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), true, 'discoverCoreSemanticTriples');
};

export const expandSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, existing: SemanticTriple[], dispatch: React.Dispatch<any>, count: number = 15): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // For large counts, use batched generation to avoid token limits
    const BATCH_SIZE = SERVICE_REGISTRY.limits.batchSize.default;

    if (count <= BATCH_SIZE) {
        return callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, existing, count), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), true, 'expandSemanticTriples');
    }

    // Batched generation for larger counts
    const allNewTriples: SemanticTriple[] = [];
    const batches = Math.ceil(count / BATCH_SIZE);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'OpenAI',
        message: `Starting batched EAV expansion: ${count} triples in ${batches} batches`,
        status: 'info',
        timestamp: Date.now()
    }});

    for (let i = 0; i < batches; i++) {
        const batchCount = Math.min(BATCH_SIZE, count - allNewTriples.length);
        const combinedExisting = [...existing, ...allNewTriples];

        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'OpenAI',
            message: `Generating batch ${i + 1}/${batches}: ${batchCount} triples (${allNewTriples.length}/${count} complete)`,
            status: 'info',
            timestamp: Date.now()
        }});

        const batchResults = await callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, combinedExisting, batchCount), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
        allNewTriples.push(...batchResults);

        if (allNewTriples.length >= count) break;
    }

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'OpenAI',
        message: `Batched EAV expansion complete: Generated ${allNewTriples.length} new triples`,
        status: 'success',
        timestamp: Date.now()
    }});

    return allNewTriples.slice(0, count);
};

export const generateInitialTopicalMap = async (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>, serpIntel?: import('../config/prompts').SerpIntelligenceForMap): Promise<{ coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[] }> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_INITIAL_TOPICAL_MAP_PROMPT(info, pillars, eavs, competitors, serpIntel);
    
    const fallback = { monetizationSection: [], informationalSection: [] };
    const result = await callApi(prompt, info, dispatch, (text) => sanitizer.sanitize(text, { monetizationSection: Array, informationalSection: Array }, fallback));

    // Flatten logic reused from geminiService pattern
    const coreTopics: EnrichedTopic[] = [];
    const outerTopics: EnrichedTopic[] = [];
    
    const processSection = (sectionData: any[], sectionType: 'monetization' | 'informational') => {
        if (!Array.isArray(sectionData)) return;
        sectionData.forEach((core: any) => {
            const tempId = `temp_${Math.random().toString(36).substr(2, 9)}`; 
            coreTopics.push({
                ...core,
                id: tempId,
                topic_class: sectionType,
                type: 'core',
                parent_topic_id: null,
                slug: '', 
            } as any);

            if (Array.isArray(core.spokes)) {
                core.spokes.forEach((spoke: any) => {
                    outerTopics.push({
                        ...spoke,
                        id: `temp_${Math.random().toString(36).substr(2, 9)}`,
                        parent_topic_id: tempId,
                        topic_class: sectionType,
                        type: 'outer',
                        slug: '',
                    } as any);
                });
            }
        });
    };

    processSection(result.monetizationSection, 'monetization');
    processSection(result.informationalSection, 'informational');

    return { coreTopics, outerTopics };
};

export const suggestResponseCode = async (info: BusinessInfo, topic: string, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_RESPONSE_CODE_PROMPT(info, topic), info, dispatch, (text) => sanitizer.sanitize(text, { responseCode: String, reasoning: String }, { responseCode: ResponseCode.INFORMATIONAL, reasoning: '' }));
};

export const generateContentBrief = async (
    info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns,
    eavs?: import('../types').SemanticTriple[]
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code, marketPatterns, eavs);
    
    // Define expected schema for sanitizer (mirroring Gemini schema but for sanitizer consumption)
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

export const generateArticleDraft = async (brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    return callApi(prompts.GENERATE_ARTICLE_DRAFT_PROMPT(brief, info), info, dispatch, (text) => text, false);
};

export const polishDraft = async (draft: string, brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    return callApi(prompts.POLISH_ARTICLE_DRAFT_PROMPT(draft, brief, info), info, dispatch, extractMarkdownFromResponse, false);
};

export const auditContentIntegrity = async (brief: ContentBrief, draft: string, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<ContentIntegrityResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback: ContentIntegrityResult = { overallSummary: '', draftText: draft, eavCheck: { isPassing: false, details: '' }, linkCheck: { isPassing: false, details: '' }, linguisticModality: { score: 0, summary: '' }, frameworkRules: [] };
    const schema = { overallSummary: String, eavCheck: Object, linkCheck: Object, linguisticModality: Object, frameworkRules: Array };
    return callApi(prompts.AUDIT_CONTENT_INTEGRITY_PROMPT(brief, draft, info), info, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const refineDraftSection = async (text: string, violation: string, instr: string, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = await callApi(prompts.REFINE_DRAFT_SECTION_PROMPT(text, violation, instr, info), info, dispatch, (t) => sanitizer.sanitize(t, { refinedText: String }, { refinedText: text }));
    return result.refinedText;
};

export const generateSchema = async (brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<SchemaGenerationResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_SCHEMA_PROMPT(brief), info, dispatch, (text) => sanitizer.sanitize(text, { schema: String, reasoning: String }, { schema: '', reasoning: '' }));
};

export const validateTopicalMap = async (topics: EnrichedTopic[], pillars: SEOPillars, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<ValidationResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback = { overallScore: 0, summary: '', issues: [] };
    return callApi(prompts.VALIDATE_TOPICAL_MAP_PROMPT(topics, pillars, info), info, dispatch, (text) => sanitizer.sanitize(text, { overallScore: Number, summary: String, issues: Array }, fallback));
};

// Passthroughs for analysis functions
export const analyzeGscDataForOpportunities = async (rows: GscRow[], kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<GscOpportunity[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ANALYZE_GSC_DATA_PROMPT(rows, kg), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const improveTopicalMap = async (topics: EnrichedTopic[], issues: ValidationIssue[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<MapImprovementSuggestion> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback: MapImprovementSuggestion = { newTopics: [], topicTitlesToDelete: [], topicMerges: [], hubSpokeGapFills: [], typeReclassifications: [] };
    return callApi(prompts.IMPROVE_TOPICAL_MAP_PROMPT(topics, issues, info), info, dispatch, (text) => sanitizer.sanitize(text, { newTopics: Array, topicTitlesToDelete: Array }, fallback));
};

export const findMergeOpportunities = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<MergeSuggestion[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_MERGE_OPPORTUNITIES_PROMPT(topics, info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const findMergeOpportunitiesForSelection = async (info: BusinessInfo, selected: EnrichedTopic[], dispatch: React.Dispatch<any>): Promise<MergeSuggestion> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback = { topicIds: [], topicTitles: [], newTopic: { title: '', description: '' }, reasoning: '', canonicalQuery: '' };
    return callApi(prompts.FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT(info, selected), info, dispatch, (text) => sanitizer.sanitize(text, { topicIds: Array, topicTitles: Array, newTopic: Object, reasoning: String, canonicalQuery: String }, fallback));
};

export const analyzeSemanticRelationships = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<SemanticAnalysisResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // Pre-calculate similarity pairs based on topic hierarchy
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
    return callApi(prompt, info, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const analyzeContextualCoverage = async (info: BusinessInfo, topics: EnrichedTopic[], pillars: SEOPillars, dispatch: React.Dispatch<any>): Promise<ContextualCoverageMetrics> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback = { summary: '', macroCoverage: 0, microCoverage: 0, temporalCoverage: 0, intentionalCoverage: 0, gaps: [] };
    const schema = { summary: String, macroCoverage: Number, microCoverage: Number, temporalCoverage: Number, intentionalCoverage: Number, gaps: Array };
    return callApi(prompts.ANALYZE_CONTEXTUAL_COVERAGE_PROMPT(info, topics, pillars), info, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const auditInternalLinking = async (topics: EnrichedTopic[], briefs: any, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<InternalLinkAuditResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.AUDIT_INTERNAL_LINKING_PROMPT(topics, briefs, info), info, dispatch, (text) => sanitizer.sanitize(text, { summary: String, missedLinks: Array, dilutionRisks: Array }, { summary: '', missedLinks: [], dilutionRisks: [] }));
};

export const calculateTopicalAuthority = async (topics: EnrichedTopic[], briefs: any, kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<TopicalAuthorityScore> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback = { overallScore: 0, summary: '', breakdown: { contentDepth: 0, contentBreadth: 0, interlinking: 0, semanticRichness: 0 } };
    const schema = { overallScore: Number, summary: String, breakdown: Object };
    return callApi(prompts.CALCULATE_TOPICAL_AUTHORITY_PROMPT(topics, briefs, kg, info), info, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const generatePublicationPlan = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<PublicationPlan> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_PUBLICATION_PLAN_PROMPT(topics, info), info, dispatch, (text) => sanitizer.sanitize(text, { total_duration_weeks: Number, phases: Array }, { total_duration_weeks: 0, phases: [] }));
};

export const findLinkingOpportunitiesForTopic = async (target: EnrichedTopic, all: EnrichedTopic[], kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<any[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_LINKING_OPPORTUNITIES_PROMPT(target, all, kg, info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const addTopicIntelligently = async (title: string, desc: string, all: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ADD_TOPIC_INTELLIGENTLY_PROMPT(title, desc, all, info), info, dispatch, (text) => sanitizer.sanitize(text, { parentTopicId: String, type: String }, { parentTopicId: null, type: 'outer' }));
};

export const expandCoreTopic = async (info: BusinessInfo, pillars: SEOPillars, core: EnrichedTopic, all: EnrichedTopic[], kg: KnowledgeGraph, dispatch: React.Dispatch<any>, mode: any, context?: string) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.EXPAND_CORE_TOPIC_PROMPT(info, pillars, core, all, kg, mode, context), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const analyzeTopicViability = async (topic: string, desc: string, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<TopicViabilityResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback: TopicViabilityResult = { decision: 'PAGE', reasoning: 'Fallback', targetParent: undefined };
    return callApi(prompts.ANALYZE_TOPIC_VIABILITY_PROMPT(topic, desc, info), info, dispatch, (text) => sanitizer.sanitize(text, { decision: String, reasoning: String, targetParent: String }, fallback));
};

export const generateCoreTopicSuggestions = async (thoughts: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT(thoughts, info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const generateStructuredTopicSuggestions = async (thoughts: string, existing: any[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT(thoughts, existing, info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const enrichTopicMetadata = async (topics: any[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const schema = {
        id: String, canonical_query: String, query_network: Array, url_slug_hint: String,
        attribute_focus: String, query_type: String, topical_border_note: String
    };
    return callApi(prompts.ENRICH_TOPIC_METADATA_PROMPT(topics, info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const generateTopicBlueprints = async (topics: any[], info: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const schema = {
        id: String, contextual_vector: String, methodology: String, subordinate_hint: String,
        perspective: String, interlinking_strategy: String, anchor_text: String, annotation_hint: String
    };
    // Prompt returns flat list, we map to nested structure in sanitizer logic if needed, but here we trust prompt output
    const flatResults = await callApi(prompts.GENERATE_TOPIC_BLUEPRINT_PROMPT(topics, info, pillars), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
    
    return flatResults.map((item: any) => ({
        id: item.id,
        blueprint: { ...item }
    }));
};

export const analyzeContextualFlow = async (text: string, entity: string, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<FlowAuditResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const vProm = callApi(prompts.AUDIT_INTRA_PAGE_FLOW_PROMPT(text, entity), info, dispatch, t => sanitizer.sanitize(t, { headingVector: Array, vectorIssues: Array, attributeOrderIssues: Array }, { headingVector: [], vectorIssues: [], attributeOrderIssues: [] }));
    const dProm = callApi(prompts.AUDIT_DISCOURSE_INTEGRATION_PROMPT(text), info, dispatch, t => sanitizer.sanitize(t, { discourseGaps: Array, gapDetails: Array }, { discourseGaps: [], gapDetails: [] }));

    const [vRes, dRes] = await Promise.all([vProm, dProm]);

    const issues: ContextualFlowIssue[] = [];
    // Mapping logic similar to geminiService...
    if(vRes.vectorIssues) vRes.vectorIssues.forEach((i: any) => issues.push({ category: 'VECTOR', rule: 'Vector Straightness', score: 0, details: i.issue, offendingSnippet: i.heading, remediation: i.remediation }));
    if(vRes.attributeOrderIssues) vRes.attributeOrderIssues.forEach((i: any) => issues.push({ category: 'MACRO', rule: 'Attribute Order', score: 0, details: i.issue, offendingSnippet: i.section, remediation: i.remediation }));
    if(dRes.gapDetails) dRes.gapDetails.forEach((i: any) => issues.push({ category: 'LINGUISTIC', rule: 'Discourse Integration', score: 0, details: i.details, offendingSnippet: `Gap #${i.paragraphIndex}`, remediation: i.suggestedBridge }));

    return {
        overallFlowScore: 85, // Mock calc
        vectorStraightness: 80,
        informationDensity: 90,
        issues,
        headingVector: vRes.headingVector || [],
        discourseGaps: dRes.discourseGaps || []
    };
};

export const applyFlowRemediation = async (snippet: string, issue: ContextualFlowIssue, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = await callApi(prompts.APPLY_FLOW_REMEDIATION_PROMPT(snippet, issue.details, issue.remediation, info), info, dispatch, (text) => sanitizer.sanitize(text, { refinedText: String }, { refinedText: snippet }));
    return result.refinedText;
};

export const applyBatchFlowRemediation = async (draft: string, issues: ContextualFlowIssue[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = await callApi(prompts.BATCH_FLOW_REMEDIATION_PROMPT(draft, issues, info), info, dispatch, (text) => sanitizer.sanitize(text, { polishedDraft: String }, { polishedDraft: draft }));
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
    }, true);
};

/**
 * Generic text generation method for migration workflows
 */
export const generateText = async (
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    return callApi(prompt, businessInfo, dispatch, (text) => text, false);
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
  // Must override both aiProvider AND aiModel to avoid passing OpenAI model to Gemini
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
  // Must override both aiProvider AND aiModel to avoid passing OpenAI model to Gemini
  const geminiService = await import('./geminiService');
  return geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, {
    ...businessInfo,
    aiProvider: 'gemini',
    aiModel: 'gemini-2.5-pro-preview-06-05'
  }, dispatch);
};

// ============================================
// BRIEF EDITING FUNCTIONS
// Native OpenAI implementation - respects user's provider choice
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
      service: 'OpenAI',
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
      service: 'OpenAI',
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
      service: 'OpenAI',
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
