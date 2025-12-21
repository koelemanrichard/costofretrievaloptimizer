
// services/geminiService.ts
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import {
  BusinessInfo,
  CandidateEntity,
  SourceContextOption,
  SEOPillars,
  SemanticTriple,
  EnrichedTopic,
  ContentBrief,
  BriefSection,
  ResponseCode,
  GscRow,
  GscOpportunity,
  ValidationIssue,
  ValidationResult,
  MapImprovementSuggestion,
  MergeSuggestion,
  SemanticAnalysisResult,
  ContextualCoverageMetrics,
  InternalLinkAuditResult,
  TopicalAuthorityScore,
  PublicationPlan,
  ContentIntegrityResult,
  SchemaGenerationResult,
  FreshnessProfile,
  ExpansionMode,
  TopicViabilityResult,
  TopicBlueprint,
  FlowAuditResult,
  ContextualFlowIssue,
  MapMergeAnalysis,
  TopicSimilarityResult,
  TopicMergeDecision,
  TopicalMap,
} from '../types';
import * as prompts from '../config/prompts';
import { CONTENT_BRIEF_SCHEMA, CONTENT_BRIEF_FALLBACK } from '../config/schemas';
import { AIResponseSanitizer } from './aiResponseSanitizer';
import { KnowledgeGraph } from "../lib/knowledgeGraph";
import { AppAction } from "../state/appState";
import React from "react";
import { v4 as uuidv4 } from 'uuid';
import { calculateTopicSimilarityPairs } from '../utils/helpers';
import { logAiUsage, estimateTokens, AIUsageContext } from './telemetryService';
import { getSupabaseClient } from './supabaseClient';

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

// Valid Gemini models (December 2025)
// Reference: https://ai.google.dev/gemini-api/docs/models
const validGeminiModels = [
    // Gemini 3 series (Latest - November 2025)
    'gemini-3-pro-preview',        // Latest reasoning model
    'gemini-3-pro-image-preview',  // With image generation
    // Gemini 2.5 series (Production - September 2025)
    'gemini-2.5-flash',            // RECOMMENDED - Fast, stable production
    'gemini-2.5-flash-lite',       // Ultra-efficient for high-throughput
    'gemini-2.5-pro',              // Advanced reasoning
    'gemini-2.5-flash-preview-09-2025',
    'gemini-2.5-flash-lite-preview-09-2025',
    // Gemini 2.0 series (Still supported)
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-lite',
    // Gemini 1.5 series (Legacy)
    'gemini-1.5-flash',
    'gemini-1.5-pro',
];

// Default to gemini-3-pro-preview as the latest model (November 2025)
// Fallback to gemini-2.5-flash if empty response is received
const GEMINI_DEFAULT_MODEL = 'gemini-3-pro-preview';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;

/**
 * Delay helper with exponential backoff
 */
const delay = (attempt: number): Promise<void> => {
    const backoff = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
    const jitter = Math.random() * 500; // Add jitter to avoid thundering herd
    return new Promise(resolve => setTimeout(resolve, backoff + jitter));
};

/**
 * Check if an error is retryable
 */
const isRetryableError = (error: any): boolean => {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.statusCode;

    // Rate limit errors
    if (status === 429 || message.includes('rate limit') || message.includes('quota')) {
        return true;
    }
    // Server errors
    if (status >= 500 && status < 600) {
        return true;
    }
    // Empty response errors
    if (message.includes('empty response')) {
        return true;
    }
    // Network/timeout errors
    if (message.includes('timeout') || message.includes('network') || message.includes('econnreset')) {
        return true;
    }
    return false;
};

const validateModel = (model: string | undefined, dispatch?: React.Dispatch<AppAction>): string => {
    if (!model) {
        dispatch?.({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `No model specified, using default: ${GEMINI_DEFAULT_MODEL}`, status: 'info', timestamp: Date.now() } });
        return GEMINI_DEFAULT_MODEL;
    }

    // Check if the model is in our valid list
    if (validGeminiModels.includes(model)) {
        return model;
    }

    // Check for partial matches (e.g., "gemini-2.5" might match "gemini-2.5-flash")
    const partialMatch = validGeminiModels.find(m =>
        m.startsWith(model) || model.includes(m.split('-').slice(0, 2).join('-'))
    );

    if (partialMatch) {
        console.warn(`Gemini model "${model}" not found, using closest match: ${partialMatch}`);
        dispatch?.({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `Model "${model}" not found, using closest match: ${partialMatch}. Update your settings to avoid this warning.`, status: 'warning', timestamp: Date.now() } });
        return partialMatch;
    }

    console.warn(`Invalid Gemini model "${model}", falling back to ${GEMINI_DEFAULT_MODEL}`);
    dispatch?.({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `Invalid model "${model}", falling back to ${GEMINI_DEFAULT_MODEL}. Please update your AI model in Settings.`, status: 'warning', timestamp: Date.now() } });
    return GEMINI_DEFAULT_MODEL;
};

const getAi = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set it in the application settings.");
  }
  return new GoogleGenAI({ apiKey });
};

const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    isJson: boolean = true,
    responseSchema?: any,
    maxTokens: number = 8192,
    retryWithFallback: boolean = true,
    operationName?: string
): Promise<T> => {
    const startTime = Date.now();
    const operation = operationName || currentOperation;

    const apiKey = businessInfo.geminiApiKey;
    if (!apiKey) {
        const errorMsg = "Gemini API key is not configured. Please set it in the application settings.";
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: errorMsg, status: 'failure', timestamp: Date.now() } });
        throw new Error(errorMsg);
    }

    const ai = getAi(apiKey);
    const validatedModel = validateModel(businessInfo.aiModel, dispatch);

    // Get supabase client for database logging (if available)
    let supabase: any;
    try {
        if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
            supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        }
    } catch (e) {
        // Ignore if supabase not available
    }

    // Helper to make a single API attempt
    const makeSingleAttempt = async (modelToUse: string): Promise<{ result: T | null; responseText: string | null; error: Error | null }> => {
        const requestStartTime = Date.now();

        const config: any = {
            maxOutputTokens: maxTokens,
        };
        if (isJson) config.responseMimeType = "application/json";
        if (responseSchema) config.responseSchema = responseSchema;

        const contents = [{
            role: 'user',
            parts: [{ text: prompt }]
        }];

        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: modelToUse,
                contents: contents,
                config: config,
            });

            const responseText = response.text;
            const durationMs = Date.now() - requestStartTime;

            // Check finish reason for better diagnostics
            const candidates = response.candidates;
            let finishReason = 'UNKNOWN';
            if (candidates && candidates.length > 0) {
                finishReason = candidates[0].finishReason || 'UNKNOWN';
                if (finishReason === 'MAX_TOKENS') {
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'Gemini',
                        message: 'WARNING: Response was truncated due to max token limit.',
                        status: 'warning',
                        timestamp: Date.now()
                    }});
                } else if (finishReason === 'SAFETY') {
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'Gemini',
                        message: 'WARNING: Response was blocked by safety filters.',
                        status: 'warning',
                        timestamp: Date.now()
                    }});
                }
            }

            if (!responseText) {
                // Log failed usage
                logAiUsage({
                    provider: 'gemini',
                    model: modelToUse,
                    operation,
                    tokensIn: estimateTokens(prompt.length),
                    tokensOut: 0,
                    durationMs,
                    success: false,
                    errorMessage: `Empty response (finishReason: ${finishReason})`,
                    context: currentUsageContext
                }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

                return { result: null, responseText: null, error: new Error(`Empty response from Gemini (model: ${modelToUse}, finishReason: ${finishReason})`) };
            }

            // Log successful usage
            const tokensIn = estimateTokens(prompt.length);
            const tokensOut = estimateTokens(responseText.length);

            logAiUsage({
                provider: 'gemini',
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

            dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `Received response (${responseText.length} chars). Sanitizing...`, status: 'info', timestamp: Date.now() } });

            return { result: sanitizerFn(responseText), responseText, error: null };
        } catch (error: any) {
            const durationMs = Date.now() - requestStartTime;

            // Log failed attempt
            logAiUsage({
                provider: 'gemini',
                model: modelToUse,
                operation,
                tokensIn: estimateTokens(prompt.length),
                tokensOut: 0,
                durationMs,
                success: false,
                errorMessage: error?.message || 'Unknown error',
                errorCode: error?.status?.toString() || error?.code,
                context: currentUsageContext
            }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

            return { result: null, responseText: null, error };
        }
    };

    // Helper to make the actual API call with retries
    const makeRequest = async (modelToUse: string): Promise<T> => {
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `Sending request with model: ${modelToUse}...`, status: 'info', timestamp: Date.now(), data: { model: modelToUse, promptLength: prompt.length } } });

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'Gemini',
                    message: `Retry attempt ${attempt + 1}/${MAX_RETRIES} for model ${modelToUse}...`,
                    status: 'info',
                    timestamp: Date.now()
                }});
                await delay(attempt);
            }

            const { result, error } = await makeSingleAttempt(modelToUse);

            if (result !== null) {
                return result;
            }

            lastError = error;

            // Check if we should retry
            if (!isRetryableError(error)) {
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'Gemini',
                    message: `Non-retryable error: ${error?.message}`,
                    status: 'failure',
                    timestamp: Date.now()
                }});
                break;
            }

            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Gemini',
                message: `Retryable error on attempt ${attempt + 1}: ${error?.message}`,
                status: 'warning',
                timestamp: Date.now()
            }});
        }

        throw lastError || new Error('Request failed after all retries');
    };

    try {
        return await makeRequest(validatedModel);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred with the Gemini API.";

        // If it's an empty response error and we haven't retried yet, try fallback model
        if (retryWithFallback && message.includes('Empty response') && validatedModel !== GEMINI_FALLBACK_MODEL) {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Gemini',
                message: `Model ${validatedModel} returned empty. Retrying with fallback model ${GEMINI_FALLBACK_MODEL}...`,
                status: 'warning',
                timestamp: Date.now()
            }});

            try {
                return await makeRequest(GEMINI_FALLBACK_MODEL);
            } catch (retryError) {
                const retryMessage = retryError instanceof Error ? retryError.message : "Retry also failed";
                dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `Fallback also failed: ${retryMessage}`, status: 'failure', timestamp: Date.now() } });
                throw new Error(`Gemini API Call Failed (both models): ${retryMessage}`);
            }
        }

        // Log failed usage (if not already logged in makeRequest)
        if (!message.includes('Empty response')) {
            const durationMs = Date.now() - startTime;
            logAiUsage({
                provider: 'gemini',
                model: validatedModel,
                operation,
                tokensIn: estimateTokens(prompt.length),
                tokensOut: 0,
                durationMs,
                success: false,
                errorMessage: message,
                context: currentUsageContext
            }, supabase).catch(e => console.warn('Failed to log AI usage:', e));
        }

        dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message, status: 'failure', timestamp: Date.now(), data: error } });
        throw new Error(`Gemini API Call Failed: ${message}`);
    }
};


export const suggestCentralEntityCandidates = async (businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<CandidateEntity[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT(businessInfo);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<CandidateEntity>(text, []), true, undefined, 8192, true, 'suggestCentralEntityCandidates');
};

export const suggestSourceContextOptions = async (businessInfo: BusinessInfo, centralEntity: string, dispatch: React.Dispatch<any>): Promise<SourceContextOption[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT(businessInfo, centralEntity);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<SourceContextOption>(text, []), true, undefined, 8192, true, 'suggestSourceContextOptions');
};

export const suggestCentralSearchIntent = async (businessInfo: BusinessInfo, centralEntity: string, sourceContext: string, dispatch: React.Dispatch<any>): Promise<{ intent: string, reasoning: string }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT(businessInfo, centralEntity, sourceContext);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<{ intent: string, reasoning: string }>(text, []), true, undefined, 8192, true, 'suggestCentralSearchIntent');
};

export const discoverCoreSemanticTriples = async (businessInfo: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT(businessInfo, pillars);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<SemanticTriple>(text, []), true, undefined, 8192, true, 'discoverCoreSemanticTriples');
};

export const expandSemanticTriples = async (businessInfo: BusinessInfo, pillars: SEOPillars, existingTriples: SemanticTriple[], dispatch: React.Dispatch<any>, count: number = 15): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // For large counts, use batched generation to avoid token limits
    const BATCH_SIZE = 30; // Optimal batch size for reliable generation

    if (count <= BATCH_SIZE) {
        // Single call for smaller counts
        const prompt = prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(businessInfo, pillars, existingTriples, count);
        return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<SemanticTriple>(text, []));
    }

    // Batched generation for larger counts
    const allNewTriples: SemanticTriple[] = [];
    const batches = Math.ceil(count / BATCH_SIZE);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Starting batched EAV expansion: ${count} triples in ${batches} batches of ${BATCH_SIZE}`,
        status: 'info',
        timestamp: Date.now()
    }});

    for (let i = 0; i < batches; i++) {
        const batchCount = Math.min(BATCH_SIZE, count - allNewTriples.length);
        const combinedExisting = [...existingTriples, ...allNewTriples]; // Include previously generated in context

        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Gemini',
            message: `Generating batch ${i + 1}/${batches}: ${batchCount} triples (${allNewTriples.length}/${count} complete)`,
            status: 'info',
            timestamp: Date.now()
        }});

        const prompt = prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(businessInfo, pillars, combinedExisting, batchCount);
        const batchResults = await callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<SemanticTriple>(text, []));

        allNewTriples.push(...batchResults);

        // Early exit if we've reached the target
        if (allNewTriples.length >= count) break;
    }

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Batched EAV expansion complete: Generated ${allNewTriples.length} new triples`,
        status: 'success',
        timestamp: Date.now()
    }});

    return allNewTriples.slice(0, count); // Ensure we don't return more than requested
};

export const generateInitialTopicalMap = async (businessInfo: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>): Promise<{ coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[] }> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_INITIAL_TOPICAL_MAP_PROMPT(businessInfo, pillars, eavs, competitors);
    
    // Define the response schema for the API call
    // FIX: Added 'required' fields to enforce the 1:7 ratio logic. The model MUST return 'spokes'.
    const apiSchema = {
        type: Type.OBJECT,
        properties: {
            monetizationSection: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        freshness: { type: Type.STRING },
                        canonical_query: { type: Type.STRING },
                        query_network: { type: Type.ARRAY, items: { type: Type.STRING } },
                        url_slug_hint: { type: Type.STRING },
                        spokes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    freshness: { type: Type.STRING },
                                    canonical_query: { type: Type.STRING },
                                    query_network: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    url_slug_hint: { type: Type.STRING },
                                },
                                required: ["title", "canonical_query"]
                            }
                        }
                    },
                    required: ["title", "spokes", "canonical_query"]
                }
            },
            informationalSection: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        freshness: { type: Type.STRING },
                        canonical_query: { type: Type.STRING },
                        query_network: { type: Type.ARRAY, items: { type: Type.STRING } },
                        url_slug_hint: { type: Type.STRING },
                        spokes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    freshness: { type: Type.STRING },
                                    canonical_query: { type: Type.STRING },
                                    query_network: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    url_slug_hint: { type: Type.STRING },
                                },
                                required: ["title", "canonical_query"]
                            }
                        }
                    },
                    required: ["title", "spokes", "canonical_query"]
                }
            }
        },
        required: ["monetizationSection", "informationalSection"]
    };

    const sanitizerSchema = {
        monetizationSection: Array,
        informationalSection: Array
    };
    const fallback = { monetizationSection: [], informationalSection: [] };

    // Use higher token limit for topical maps which can be large with many topics
    const result = await callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, sanitizerSchema, fallback), true, apiSchema, 32768);

    // Log the raw result for debugging
    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Topical map response parsed. Monetization sections: ${result.monetizationSection?.length || 0}, Informational sections: ${result.informationalSection?.length || 0}`,
        status: result.monetizationSection?.length || result.informationalSection?.length ? 'info' : 'warning',
        timestamp: Date.now(),
        data: { sectionCounts: { monetization: result.monetizationSection?.length, informational: result.informationalSection?.length } }
    }});

    const coreTopics: EnrichedTopic[] = [];
    const outerTopics: EnrichedTopic[] = [];

    // Helper to process sections and flatten the nested AI response
    const processSection = (sectionData: any[], sectionType: 'monetization' | 'informational') => {
        if (!Array.isArray(sectionData)) return;

        sectionData.forEach((core: any) => {
            const tempId = `temp_${Math.random().toString(36).substr(2, 9)}`; 
            
            const coreTopic: EnrichedTopic = {
                id: tempId,
                map_id: '', 
                parent_topic_id: null,
                title: core.title,
                slug: '', 
                description: core.description,
                type: 'core',
                freshness: (core.freshness as FreshnessProfile) || FreshnessProfile.EVERGREEN,
                topic_class: sectionType,
                canonical_query: core.canonical_query,
                query_network: Array.isArray(core.query_network) ? core.query_network : [],
                url_slug_hint: core.url_slug_hint
            };
            
            coreTopics.push(coreTopic);

            if (Array.isArray(core.spokes)) {
                core.spokes.forEach((spoke: any) => {
                    const outerTopic: EnrichedTopic = {
                        id: `temp_${Math.random().toString(36).substr(2, 9)}`,
                        map_id: '',
                        parent_topic_id: tempId,
                        title: spoke.title,
                        slug: '', 
                        description: spoke.description,
                        type: 'outer',
                        freshness: (spoke.freshness as FreshnessProfile) || FreshnessProfile.STANDARD,
                        topic_class: sectionType,
                        canonical_query: spoke.canonical_query,
                        query_network: Array.isArray(spoke.query_network) ? spoke.query_network : [],
                        url_slug_hint: spoke.url_slug_hint
                    };
                    outerTopics.push(outerTopic);
                });
            }
        });
    };

    processSection(result.monetizationSection, 'monetization');
    processSection(result.informationalSection, 'informational');

    return { coreTopics, outerTopics };
};

export const suggestResponseCode = async (businessInfo: BusinessInfo, topicTitle: string, dispatch: React.Dispatch<any>): Promise<{ responseCode: ResponseCode; reasoning: string }> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.SUGGEST_RESPONSE_CODE_PROMPT(businessInfo, topicTitle);
    const fallback = { responseCode: ResponseCode.INFORMATIONAL, reasoning: 'Default fallback' };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { responseCode: String, reasoning: String }, fallback));
};

export const generateContentBrief = async (
    businessInfo: BusinessInfo,
    topic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    pillars: SEOPillars,
    knowledgeGraph: KnowledgeGraph,
    responseCode: ResponseCode,
    dispatch: React.Dispatch<any>
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode);

    // Using the detailed sanitizer schema as a fallback/parser for the structured output
    const sanitizerSchema = {
        title: String,
        slug: String,
        metaDescription: String,
        keyTakeaways: Array,
        outline: String,
        structured_outline: Array,
        perspectives: Array,
        methodology_note: String,
        serpAnalysis: {
            peopleAlsoAsk: Array,
            competitorHeadings: Array,
            avgWordCount: Number,
            avgHeadings: Number,
            commonStructure: String,
            contentGaps: Array
        },
        visuals: {
            featuredImagePrompt: String,
            imageAltText: String,
        },
        contextualVectors: Array,
        contextualBridge: {
            type: String,
            content: String,
            links: Array
        },
        predicted_user_journey: String,
        // Holistic SEO Fields
        query_type_format: String,
        featured_snippet_target: {
            question: String,
            answer_target_length: Number,
            required_predicates: Array,
            target_type: String
        },
        visual_semantics: Array,
        discourse_anchors: Array
    };

    // Sanitizer function that validates critical fields
    const sanitizeBrief = (text: string) => {
        const parsed = sanitizer.sanitize(text, sanitizerSchema, CONTENT_BRIEF_FALLBACK);
        // Log what fields are populated vs empty for debugging
        const emptyFields: string[] = [];

        // CRITICAL: Check for structured_outline - this is the most important field
        if (!parsed.structured_outline || parsed.structured_outline.length === 0) {
            emptyFields.push('structured_outline (CRITICAL)');
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Gemini',
                message: `CRITICAL: AI did not return structured_outline. Content brief will have empty sections.`,
                status: 'error',
                timestamp: Date.now()
            }});
        } else {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Gemini',
                message: `Content brief generated with ${parsed.structured_outline.length} sections in structured_outline.`,
                status: 'success',
                timestamp: Date.now()
            }});
        }

        if (!parsed.visual_semantics || parsed.visual_semantics.length === 0) emptyFields.push('visual_semantics');
        if (!parsed.contextualBridge?.links || parsed.contextualBridge.links.length === 0) emptyFields.push('contextualBridge.links');
        if (!parsed.discourse_anchors || parsed.discourse_anchors.length === 0) emptyFields.push('discourse_anchors');
        if (emptyFields.length > 0) {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Gemini',
                message: `Content brief generated with empty fields: ${emptyFields.join(', ')}. AI may not have generated these sections.`,
                status: 'warning',
                timestamp: Date.now()
            }});
        }
        return parsed;
    };

    // Custom brief generation with validation and fallback model retry
    const generateBriefWithValidation = async (): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
        // First attempt with current model
        let result = await callApi(
            prompt,
            businessInfo,
            dispatch,
            sanitizeBrief,
            true,
            CONTENT_BRIEF_SCHEMA,
            32768,  // Increased token limit - content briefs with structured_outline need more space
            false,  // Don't use built-in fallback retry, we handle it ourselves
            'generateContentBrief'
        );

        // If structured_outline is empty, retry with fallback model
        if (!result.structured_outline || result.structured_outline.length === 0) {
            const currentModel = validateModel(businessInfo.aiModel, dispatch);

            if (currentModel !== GEMINI_FALLBACK_MODEL) {
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'Gemini',
                    message: `Empty structured_outline detected. Retrying with fallback model ${GEMINI_FALLBACK_MODEL}...`,
                    status: 'warning',
                    timestamp: Date.now()
                }});

                // Create modified business info with fallback model
                const fallbackBusinessInfo = { ...businessInfo, aiModel: GEMINI_FALLBACK_MODEL };

                try {
                    result = await callApi(
                        prompt,
                        fallbackBusinessInfo,
                        dispatch,
                        sanitizeBrief,
                        true,
                        CONTENT_BRIEF_SCHEMA,
                        32768,
                        false,
                        'generateContentBrief (fallback)'
                    );

                    // If still empty after fallback, try one more time with higher tokens
                    if (!result.structured_outline || result.structured_outline.length === 0) {
                        dispatch({ type: 'LOG_EVENT', payload: {
                            service: 'Gemini',
                            message: `Still empty after fallback model. Trying with increased token limit (65536)...`,
                            status: 'warning',
                            timestamp: Date.now()
                        }});

                        result = await callApi(
                            prompt,
                            fallbackBusinessInfo,
                            dispatch,
                            sanitizeBrief,
                            true,
                            CONTENT_BRIEF_SCHEMA,
                            65536,  // Double the token limit
                            false,
                            'generateContentBrief (extended tokens)'
                        );
                    }
                } catch (fallbackError) {
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'Gemini',
                        message: `Fallback model also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
                        status: 'failure',
                        timestamp: Date.now()
                    }});
                    // Return the original result even if empty, better than throwing
                }
            }
        }

        // Final validation - ensure we have at least a minimal outline
        if (!result.structured_outline || result.structured_outline.length === 0) {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Gemini',
                message: `WARNING: All attempts returned empty structured_outline. Brief will need manual regeneration.`,
                status: 'error',
                timestamp: Date.now()
            }});
        }

        return result;
    };

    return generateBriefWithValidation();
};

export const findMergeOpportunitiesForSelection = async (businessInfo: BusinessInfo, selectedTopics: EnrichedTopic[], dispatch: React.Dispatch<AppAction>): Promise<MergeSuggestion> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT(businessInfo, selectedTopics);
    const fallback: MergeSuggestion = { topicIds: [], topicTitles: [], newTopic: { title: '', description: '' }, reasoning: '', canonicalQuery: '' };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { topicIds: Array, topicTitles: Array, newTopic: Object, reasoning: String, canonicalQuery: String }, fallback));
};

export const findLinkingOpportunitiesForTopic = async (
    targetTopic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    knowledgeGraph: KnowledgeGraph,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>
): Promise<any[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.FIND_LINKING_OPPORTUNITIES_PROMPT(targetTopic, allTopics, knowledgeGraph, businessInfo);
    return callApi(prompt, businessInfo, dispatch, text => sanitizer.sanitizeArray(text, []));
};

export const generateArticleDraft = async (brief: ContentBrief, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    const prompt = prompts.GENERATE_ARTICLE_DRAFT_PROMPT(brief, businessInfo);
    return callApi(prompt, businessInfo, dispatch, (text) => text, false);
};

export const polishDraft = async (draft: string, brief: ContentBrief, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    const prompt = prompts.POLISH_ARTICLE_DRAFT_PROMPT(draft, brief, businessInfo);
    return callApi(prompt, businessInfo, dispatch, extractMarkdownFromResponse, false);
};

export const auditContentIntegrity = async (brief: ContentBrief, draft: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<ContentIntegrityResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.AUDIT_CONTENT_INTEGRITY_PROMPT(brief, draft, businessInfo);
    // FIX: Added missing draftText to fallback object
    const fallback: ContentIntegrityResult = { overallSummary: '', draftText: draft, eavCheck: { isPassing: false, details: '' }, linkCheck: { isPassing: false, details: '' }, linguisticModality: { score: 0, summary: '' }, frameworkRules: [] };
    const schema = {
        overallSummary: String,
        eavCheck: Object,
        linkCheck: Object,
        linguisticModality: Object,
        frameworkRules: Array
    };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const refineDraftSection = async (
    originalText: string, 
    violationType: string, 
    instruction: string, 
    businessInfo: BusinessInfo, 
    dispatch: React.Dispatch<any>
): Promise<string> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.REFINE_DRAFT_SECTION_PROMPT(originalText, violationType, instruction, businessInfo);
    
    const schema = {
        refinedText: String
    };
    const fallback = { refinedText: originalText };

    const result = await callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
    return result.refinedText;
};

export const generateSchema = async (brief: ContentBrief, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<SchemaGenerationResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_SCHEMA_PROMPT(brief);
    const fallback: SchemaGenerationResult = { schema: '', reasoning: '' };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { schema: String, reasoning: String }, fallback));
};

export const analyzeGscDataForOpportunities = async (gscRows: GscRow[], knowledgeGraph: KnowledgeGraph, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<GscOpportunity[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.ANALYZE_GSC_DATA_PROMPT(gscRows, knowledgeGraph);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<GscOpportunity>(text, []));
};

export const validateTopicalMap = async (topics: EnrichedTopic[], pillars: SEOPillars, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<ValidationResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.VALIDATE_TOPICAL_MAP_PROMPT(topics, pillars, businessInfo);
    const fallback: ValidationResult = { overallScore: 0, summary: '', issues: [] };
    const schema = {
        overallScore: Number,
        summary: String,
        issues: Array
    };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const improveTopicalMap = async (topics: EnrichedTopic[], issues: ValidationIssue[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<MapImprovementSuggestion> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.IMPROVE_TOPICAL_MAP_PROMPT(topics, issues, businessInfo);
    const fallback: MapImprovementSuggestion = { newTopics: [], topicTitlesToDelete: [], topicMerges: [], hubSpokeGapFills: [], typeReclassifications: [] };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { newTopics: Array, topicTitlesToDelete: Array }, fallback));
};

export const findMergeOpportunities = async (topics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<MergeSuggestion[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.FIND_MERGE_OPPORTUNITIES_PROMPT(topics, businessInfo);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<MergeSuggestion>(text, []));
};

export const analyzeSemanticRelationships = async (topics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<SemanticAnalysisResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // Pre-calculate similarity pairs based on topic hierarchy
    // This gives the AI structured data to work with
    const preCalculatedPairs = calculateTopicSimilarityPairs(topics);

    // Limit pairs to prevent token overflow (top 20 most relevant pairs)
    const limitedPairs = preCalculatedPairs.slice(0, 20);

    const prompt = prompts.ANALYZE_SEMANTIC_RELATIONSHIPS_PROMPT(topics, businessInfo, limitedPairs);

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

    const schema = {
        summary: String,
        pairs: Array,
        actionableSuggestions: Array
    };

    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const analyzeContextualCoverage = async (businessInfo: BusinessInfo, topics: EnrichedTopic[], pillars: SEOPillars, dispatch: React.Dispatch<any>): Promise<ContextualCoverageMetrics> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.ANALYZE_CONTEXTUAL_COVERAGE_PROMPT(businessInfo, topics, pillars);
    const fallback: ContextualCoverageMetrics = { summary: '', macroCoverage: 0, microCoverage: 0, temporalCoverage: 0, intentionalCoverage: 0, gaps: [] };
    const schema = {
        summary: String,
        macroCoverage: Number,
        microCoverage: Number,
        temporalCoverage: Number,
        intentionalCoverage: Number,
        gaps: Array
    };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const auditInternalLinking = async (topics: EnrichedTopic[], briefs: Record<string, ContentBrief>, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<InternalLinkAuditResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.AUDIT_INTERNAL_LINKING_PROMPT(topics, briefs, businessInfo);
    const fallback: InternalLinkAuditResult = { summary: '', missedLinks: [], dilutionRisks: [] };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { summary: String, missedLinks: Array, dilutionRisks: Array }, fallback));
};

export const calculateTopicalAuthority = async (topics: EnrichedTopic[], briefs: Record<string, ContentBrief>, knowledgeGraph: KnowledgeGraph, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<TopicalAuthorityScore> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.CALCULATE_TOPICAL_AUTHORITY_PROMPT(topics, briefs, knowledgeGraph, businessInfo);
    const fallback: TopicalAuthorityScore = { overallScore: 0, summary: '', breakdown: { contentDepth: 0, contentBreadth: 0, interlinking: 0, semanticRichness: 0 } };
    const schema = {
        overallScore: Number,
        summary: String,
        breakdown: Object
    };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
};

export const generatePublicationPlan = async (topics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<PublicationPlan> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_PUBLICATION_PLAN_PROMPT(topics, businessInfo);
    const fallback: PublicationPlan = { total_duration_weeks: 0, phases: [] };
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { total_duration_weeks: Number, phases: Array }, fallback));
};

export const addTopicIntelligently = async (
    newTopicTitle: string,
    newTopicDescription: string,
    allTopics: EnrichedTopic[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>
): Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.ADD_TOPIC_INTELLIGENTLY_PROMPT(newTopicTitle, newTopicDescription, allTopics, businessInfo);
    const fallback = { parentTopicId: null, type: 'outer' as 'core' | 'outer' };
    return callApi(prompt, businessInfo, dispatch, text => sanitizer.sanitize(text, { parentTopicId: String, type: String }, fallback));
};

export const expandCoreTopic = async (
    businessInfo: BusinessInfo,
    pillars: SEOPillars,
    coreTopicToExpand: EnrichedTopic,
    allTopics: EnrichedTopic[],
    knowledgeGraph: KnowledgeGraph,
    dispatch: React.Dispatch<AppAction>,
    mode: ExpansionMode = 'CONTEXT',
    userContext?: string
): Promise<{title: string, description: string}[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.EXPAND_CORE_TOPIC_PROMPT(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, mode, userContext);
    const fallback: {title: string, description: string}[] = [];
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray(text, fallback));
};

export const analyzeTopicViability = async (
    topic: string, description: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>
): Promise<TopicViabilityResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.ANALYZE_TOPIC_VIABILITY_PROMPT(topic, description, businessInfo);
    const fallback: TopicViabilityResult = { decision: 'PAGE', reasoning: 'Default fallback', targetParent: undefined };
    return callApi(prompt, businessInfo, dispatch, text => sanitizer.sanitize(text, { decision: String, reasoning: String, targetParent: String }, fallback));
};

export const generateCoreTopicSuggestions = async (
    userThoughts: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ title: string, description: string, reasoning: string }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT(userThoughts, businessInfo);
    const fallback = [{ title: 'Error generating topic', description: 'Please try again', reasoning: '' }];
    
    return callApi(
        prompt, 
        businessInfo, 
        dispatch, 
        (text) => sanitizer.sanitizeArray(text, fallback)
    );
};

export const generateStructuredTopicSuggestions = async (
    userThoughts: string,
    existingCoreTopics: { title: string, id: string }[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ title: string, description: string, type: 'core' | 'outer', suggestedParent: string }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT(userThoughts, existingCoreTopics, businessInfo);
    // Fallback with a safe structure
    const fallback: { title: string, description: string, type: 'core' | 'outer', suggestedParent: string }[] = [];
    
    return callApi(
        prompt, 
        businessInfo, 
        dispatch, 
        (text) => sanitizer.sanitizeArray(text, fallback)
    );
};

export const enrichTopicMetadata = async (
    topics: {id: string, title: string, description: string}[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ 
    id: string, 
    canonical_query: string, 
    query_network: string[], 
    url_slug_hint: string,
    attribute_focus: string,
    query_type: string,
    topical_border_note: string
}[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.ENRICH_TOPIC_METADATA_PROMPT(topics, businessInfo);
    const fallback: { id: string, canonical_query: string, query_network: string[], url_slug_hint: string, attribute_focus: string, query_type: string, topical_border_note: string }[] = [];
    
    // Use Gemini response schema for strict output
    const apiSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                canonical_query: { type: Type.STRING },
                query_network: { type: Type.ARRAY, items: { type: Type.STRING } },
                url_slug_hint: { type: Type.STRING },
                attribute_focus: { type: Type.STRING },
                query_type: { type: Type.STRING },
                topical_border_note: { type: Type.STRING }
            },
            required: ["id", "canonical_query", "query_network", "url_slug_hint", "attribute_focus", "query_type", "topical_border_note"]
        }
    };

    return callApi(
        prompt,
        businessInfo,
        dispatch,
        (text) => sanitizer.sanitizeArray(text, fallback),
        true,
        apiSchema
    );
};

export const generateTopicBlueprints = async (
    topics: { title: string, id: string }[],
    businessInfo: BusinessInfo,
    pillars: SEOPillars,
    dispatch: React.Dispatch<any>
): Promise<{ id: string, blueprint: TopicBlueprint }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_TOPIC_BLUEPRINT_PROMPT(topics, businessInfo, pillars);
    
    // Construct API Schema
    const apiSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                blueprint: {
                    type: Type.OBJECT,
                    properties: {
                        contextual_vector: { type: Type.STRING },
                        methodology: { type: Type.STRING },
                        subordinate_hint: { type: Type.STRING },
                        perspective: { type: Type.STRING },
                        interlinking_strategy: { type: Type.STRING },
                        anchor_text: { type: Type.STRING },
                        annotation_hint: { type: Type.STRING }
                    },
                    required: ["contextual_vector", "methodology", "subordinate_hint", "perspective", "interlinking_strategy", "anchor_text", "annotation_hint"]
                }
            },
            required: ["id", "blueprint"]
        }
    };

    // The AI might return a flat object, we need to instruct it or parse it correctly. 
    // The prompt asks for keys like 'contextual_vector' directly in the object.
    // Let's adjust the schema to match the prompt output structure (flat), and then map it to nested 'blueprint' object in sanitizer.
    
    // REVISED Prompt Output Schema (Flat) based on GENERATE_TOPIC_BLUEPRINT_PROMPT
    const flatApiSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                contextual_vector: { type: Type.STRING },
                methodology: { type: Type.STRING },
                subordinate_hint: { type: Type.STRING },
                perspective: { type: Type.STRING },
                interlinking_strategy: { type: Type.STRING },
                anchor_text: { type: Type.STRING },
                annotation_hint: { type: Type.STRING }
            },
            required: ["id", "contextual_vector", "methodology", "subordinate_hint", "perspective", "interlinking_strategy", "anchor_text", "annotation_hint"]
        }
    };

    const fallback: any[] = [];
    
    const rawResults = await callApi(
        prompt,
        businessInfo,
        dispatch,
        (text) => sanitizer.sanitizeArray(text, fallback),
        true,
        flatApiSchema
    );

    // Transform flat results to nested structure
    return rawResults.map((item: any) => ({
        id: item.id,
        blueprint: {
            contextual_vector: item.contextual_vector,
            methodology: item.methodology,
            subordinate_hint: item.subordinate_hint,
            perspective: item.perspective,
            interlinking_strategy: item.interlinking_strategy,
            anchor_text: item.anchor_text,
            annotation_hint: item.annotation_hint,
            image_alt_text: undefined // Not generated in this prompt
        }
    }));
};

// --- Flow Audit ---

export const analyzeContextualFlow = async (text: string, centralEntity: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<FlowAuditResult> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const vectorPrompt = prompts.AUDIT_INTRA_PAGE_FLOW_PROMPT(text, centralEntity);
    const discoursePrompt = prompts.AUDIT_DISCOURSE_INTEGRATION_PROMPT(text);

    const vectorFallback = { headingVector: [], vectorIssues: [], attributeOrderIssues: [] };
    const discourseFallback = { discourseGaps: [], gapDetails: [] };

    // Run parallel requests
    const [vectorResult, discourseResult] = await Promise.all([
        callApi(vectorPrompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { headingVector: Array, vectorIssues: Array, attributeOrderIssues: Array }, vectorFallback)),
        callApi(discoursePrompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, { discourseGaps: Array, gapDetails: Array }, discourseFallback))
    ]);

    // Map to final FlowAuditResult
    const issues: ContextualFlowIssue[] = [];

    // Map Vector Issues
    if(vectorResult.vectorIssues) {
        vectorResult.vectorIssues.forEach((vi: any) => {
            issues.push({
                category: 'VECTOR',
                rule: 'Vector Straightness',
                score: 0, // Deduct later
                details: vi.issue,
                offendingSnippet: vi.heading,
                remediation: vi.remediation
            });
        });
    }

    // Map Attribute Order Issues
    if(vectorResult.attributeOrderIssues) {
        vectorResult.attributeOrderIssues.forEach((ai: any) => {
            issues.push({
                category: 'MACRO',
                rule: 'Attribute Order',
                score: 0,
                details: ai.issue,
                offendingSnippet: ai.section,
                remediation: ai.remediation
            });
        });
    }

    // Map Discourse Gaps
    if(discourseResult.gapDetails) {
        discourseResult.gapDetails.forEach((gap: any) => {
            issues.push({
                category: 'LINGUISTIC',
                rule: 'Discourse Integration',
                score: 0,
                details: gap.details,
                offendingSnippet: `Paragraph Transition #${gap.paragraphIndex}`,
                remediation: gap.suggestedBridge
            });
        });
    }

    // Calculate scores
    const vectorScore = Math.max(0, 100 - (issues.filter(i => i.category === 'VECTOR' || i.category === 'MACRO').length * 20));
    const infoDensityScore = 100; // Placeholder for now, or needs separate analysis
    
    // Overall Score
    const overallScore = Math.round((vectorScore + infoDensityScore) / 2);

    return {
        overallFlowScore: overallScore,
        vectorStraightness: vectorScore,
        informationDensity: infoDensityScore,
        issues: issues,
        headingVector: vectorResult.headingVector || [],
        discourseGaps: discourseResult.discourseGaps || []
    };
}

export const applyFlowRemediation = async (
    originalSnippet: string,
    issue: ContextualFlowIssue,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.APPLY_FLOW_REMEDIATION_PROMPT(originalSnippet, issue.details, issue.remediation, businessInfo);
    
    const schema = { refinedText: String };
    const fallback = { refinedText: originalSnippet };
    
    const result = await callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
    return result.refinedText;
};

export const applyBatchFlowRemediation = async (
    fullDraft: string,
    issues: ContextualFlowIssue[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.BATCH_FLOW_REMEDIATION_PROMPT(fullDraft, issues, businessInfo);

    const schema = { polishedDraft: String };
    const fallback = { polishedDraft: fullDraft };

    const result = await callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, schema, fallback));
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
    fallback: T,
    responseSchema?: any
): Promise<T> => {
    console.log('[GeminiService] generateJson called', {
        promptLength: prompt?.length,
        hasResponseSchema: !!responseSchema,
        schemaKeys: responseSchema ? Object.keys(responseSchema) : null
    });
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompt, businessInfo, dispatch, (text) => {
        console.log('[GeminiService] generateJson sanitizer called with text length:', text?.length);
        console.log('[GeminiService] generateJson raw text (first 500 chars):', text?.substring(0, 500));
        try {
            const parsed = JSON.parse(text);
            console.log('[GeminiService] generateJson JSON.parse SUCCESS, keys:', Object.keys(parsed));
            return parsed;
        } catch (e) {
            console.error('[GeminiService] generateJson JSON.parse FAILED:', e);
            console.log('[GeminiService] generateJson falling back to sanitizer');
            return sanitizer.sanitize(text, {}, fallback);
        }
    }, true, responseSchema);
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

/**
 * Classifies topics into Core Section (monetization) or Author Section (informational)
 * Uses batching for large topic sets to avoid AI output truncation
 */
export const classifyTopicSections = async (
    topics: { id: string, title: string, description: string, type?: string, parent_topic_id?: string | null }[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ id: string, topic_class: 'monetization' | 'informational', suggestedType?: 'core' | 'outer' | null, suggestedParentTitle?: string | null, typeChangeReason?: string | null }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // Batch size for classification to avoid AI output truncation
    const BATCH_SIZE = 20;

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Classifying ${topics.length} topics into Core/Author sections and verifying hierarchy types...`,
        status: 'info',
        timestamp: Date.now()
    }});

    // For small sets, process in a single call
    if (topics.length <= BATCH_SIZE) {
        const prompt = prompts.CLASSIFY_TOPIC_SECTIONS_PROMPT(businessInfo, topics);
        const result = await callApi(
            prompt,
            businessInfo,
            dispatch,
            (text) => sanitizer.sanitizeArray(text, []),
            true
        );

        const validResults = result.filter((item: any) =>
            item.id && (item.topic_class === 'monetization' || item.topic_class === 'informational')
        );

        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Gemini',
            message: `Classification complete. Monetization: ${validResults.filter((r: any) => r.topic_class === 'monetization').length}, Informational: ${validResults.filter((r: any) => r.topic_class === 'informational').length}`,
            status: 'info',
            timestamp: Date.now()
        }});

        return validResults;
    }

    // Batched classification for larger sets
    const allResults: { id: string, topic_class: 'monetization' | 'informational', suggestedType?: 'core' | 'outer' | null, suggestedParentTitle?: string | null, typeChangeReason?: string | null }[] = [];
    const batches = Math.ceil(topics.length / BATCH_SIZE);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Processing ${topics.length} topics in ${batches} batches of ${BATCH_SIZE}...`,
        status: 'info',
        timestamp: Date.now()
    }});

    for (let i = 0; i < batches; i++) {
        const batchTopics = topics.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Gemini',
            message: `Classifying batch ${i + 1}/${batches} (${batchTopics.length} topics)...`,
            status: 'info',
            timestamp: Date.now()
        }});

        const prompt = prompts.CLASSIFY_TOPIC_SECTIONS_PROMPT(businessInfo, batchTopics);
        const result = await callApi(
            prompt,
            businessInfo,
            dispatch,
            (text) => sanitizer.sanitizeArray(text, []),
            true
        );

        const validBatchResults = result.filter((item: any) =>
            item.id && (item.topic_class === 'monetization' || item.topic_class === 'informational')
        );

        allResults.push(...validBatchResults);
    }

    // Log final counts
    const monetizationCount = allResults.filter(r => r.topic_class === 'monetization').length;
    const informationalCount = allResults.filter(r => r.topic_class === 'informational').length;
    const typeChanges = allResults.filter(r => r.suggestedType && r.suggestedType !== null).length;

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Classification complete. Monetization: ${monetizationCount}, Informational: ${informationalCount}, Type changes suggested: ${typeChanges}`,
        status: 'success',
        timestamp: Date.now()
    }});

    return allResults;
};

// ============================================
// MAP MERGE ANALYSIS
// ============================================

export const analyzeMapMerge = async (
  mapsToMerge: TopicalMap[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<MapMergeAnalysis> => {
  const sanitizer = new AIResponseSanitizer(dispatch);

  const mapSummaries = mapsToMerge.map(map => ({
    id: map.id,
    name: map.name,
    pillars: map.pillars,
    businessInfo: map.business_info,
    eavCount: map.eavs?.length || 0,
    topics: (map.topics || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      parentId: t.parent_topic_id,
    })),
  }));

  const prompt = `You are an SEO expert analyzing multiple topical maps for a potential merge.

## Maps to Analyze:
${JSON.stringify(mapSummaries, null, 2)}

## Your Task:
Analyze these maps and provide recommendations for merging them into a single unified map.

### 1. Context Recommendations
For each business context field that differs between maps, recommend which value to use and why.
Fields to check: industry, audience, expertise, valueProp, targetMarket, language

### 2. Pillar Recommendations
For SEO pillars (centralEntity, sourceContext, centralSearchIntent), recommend the best value if they differ.

### 3. Topic Similarity Analysis
Identify topics across maps that are:
- EXACT matches (same or very similar titles)
- SEMANTIC matches (different titles but same topic - similarity > 80%)
- PARENT_CHILD candidates (one topic could be a subtopic of another)

For each match, provide:
- Similarity score (0-100)
- Suggested action: "merge", "parent_child", or "keep_separate"
- If merge: suggested combined title
- Reasoning for your suggestion

Return a JSON object with this exact structure:
{
  "contextRecommendations": [
    { "field": "industry", "recommendation": "value", "reasoning": "why", "confidence": 85 }
  ],
  "eavAnalysis": {
    "unique": [{ "mapId": "map1", "eav": {...} }],
    "duplicates": [{ "eavs": [...], "keep": {...} }],
    "conflicts": [{ "subject": "x", "predicate": "y", "values": [...], "recommendation": "value", "reasoning": "why" }]
  },
  "topicSimilarities": [
    {
      "id": "sim_1",
      "topicA": { "id": "...", "title": "...", "description": "...", "type": "core" },
      "topicB": { "id": "...", "title": "...", "description": "...", "type": "core" },
      "similarityScore": 92,
      "matchType": "semantic",
      "aiSuggestedAction": "merge",
      "aiSuggestedTitle": "Combined Title",
      "reasoning": "Both topics cover..."
    }
  ]
}`;

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'Gemini',
      message: `Analyzing ${mapsToMerge.length} maps for merge opportunities`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  try {
    const fallback: MapMergeAnalysis = {
      contextRecommendations: [],
      eavAnalysis: { unique: [], duplicates: [], conflicts: [] },
      topicSimilarities: [],
    };
    const result = await callApi(
      prompt,
      businessInfo,
      dispatch,
      (text) => sanitizer.sanitize(text, {}, fallback),
      true
    );

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'Gemini',
        message: `Found ${result.topicSimilarities?.length || 0} topic similarities`,
        status: 'success',
        timestamp: Date.now(),
      },
    });

    return result as MapMergeAnalysis;
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'Gemini',
        message: `Map merge analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });
    throw error;
  }
};

export const reanalyzeTopicSimilarity = async (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<TopicSimilarityResult[]> => {
  const sanitizer = new AIResponseSanitizer(dispatch);

  const prompt = `Analyze topic similarities between two sets of topics.

## Topics from Map A:
${JSON.stringify(topicsA.map(t => ({ id: t.id, title: t.title, description: t.description, type: t.type })), null, 2)}

## Topics from Map B:
${JSON.stringify(topicsB.map(t => ({ id: t.id, title: t.title, description: t.description, type: t.type })), null, 2)}

## Existing Decisions (for context):
${JSON.stringify(existingDecisions, null, 2)}

Find topic pairs that are similar (>70% similarity). For each pair provide:
- id: unique identifier for this similarity pair (e.g., "sim_1", "sim_2", etc.)
- topicA: the full topic object from Map A
- topicB: the full topic object from Map B
- similarityScore (0-100)
- matchType: "exact", "semantic", or "parent_child"
- aiSuggestedAction: "merge", "parent_child", or "keep_separate"
- aiSuggestedTitle (if merge)
- reasoning

Return a JSON array of TopicSimilarityResult objects.`;

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'Gemini',
      message: `Re-analyzing topic similarities between ${topicsA.length} and ${topicsB.length} topics`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  try {
    const result = await callApi(
      prompt,
      businessInfo,
      dispatch,
      (text) => sanitizer.sanitizeArray(text, []),
      true
    );

    return Array.isArray(result) ? result : [];
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'Gemini',
        message: `Topic reanalysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });
    throw error;
  }
};

// === BRIEF EDITING FUNCTIONS ===

/**
 * Regenerate an entire content brief with user feedback/instructions
 */
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
      service: 'Gemini',
      message: `Regenerating brief for "${topic.title}" with user instructions`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  const schema = {
    title: String,
    slug: String,
    metaDescription: String,
    keyTakeaways: Array,
    outline: String,
    structured_outline: Array,
    perspectives: Array,
    methodology_note: String,
    featured_snippet_target: Object,
    visual_semantics: Array,
    discourse_anchors: Array,
    contextualBridge: Object,
    predicted_user_journey: String,
    query_type_format: String,
  };

  const result = await callApi(
    prompt,
    businessInfo,
    dispatch,
    (text) => sanitizer.sanitize(text, schema, CONTENT_BRIEF_FALLBACK),
    true,
    CONTENT_BRIEF_SCHEMA
  );

  // Preserve the original ID and topic_id
  return {
    ...result,
    id: currentBrief.id,
    topic_id: currentBrief.topic_id,
  } as ContentBrief;
};

/**
 * AI-assisted refinement of a single brief section
 */
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
      service: 'Gemini',
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

  // Preserve the key from the original section
  return {
    ...result,
    key: section.key,
  } as BriefSection;
};

/**
 * Generate a new section to be inserted at a specific position
 */
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
      service: 'Gemini',
      message: `Generating new section at position ${insertPosition + 1}`,
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
    heading: 'New Section',
    level: parentHeading ? 3 : 2,
    format_code: 'PROSE',
    subordinate_text_hint: '',
    methodology_note: '',
  };

  const result = await callApi(
    prompt,
    businessInfo,
    dispatch,
    (text) => sanitizer.sanitize(text, schema, fallback)
  );

  // Generate a unique key for the new section
  return {
    ...result,
    key: `section-${Date.now()}`,
  } as BriefSection;
};
