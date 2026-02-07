
import {
    BusinessInfo, CandidateEntity, SourceContextOption, SEOPillars,
    SemanticTriple, EnrichedTopic, ContentBrief, BriefSection, ResponseCode,
    GscRow, GscOpportunity, ValidationResult, ValidationIssue,
    MapImprovementSuggestion, MergeSuggestion, SemanticAnalysisResult,
    ContextualCoverageMetrics, InternalLinkAuditResult, TopicalAuthorityScore,
    PublicationPlan, ContentIntegrityResult, SchemaGenerationResult,
    TopicViabilityResult, TopicBlueprint, FlowAuditResult, ContextualFlowIssue,
    KnowledgeGraph, MapMergeAnalysis, TopicSimilarityResult, TopicMergeDecision, TopicalMap,
    StreamingProgressCallback
} from '../types';
import * as prompts from '../config/prompts';
import { CONTENT_BRIEF_FALLBACK } from '../config/schemas';
import { AIResponseSanitizer } from './aiResponseSanitizer';
import { AppAction } from '../state/appState';
import React from 'react';
import { calculateTopicSimilarityPairs } from '../utils/helpers';
import { logAiUsage, estimateTokens, AIUsageContext } from './telemetryService';
import { getSupabaseClient } from './supabaseClient';
import { anthropicLogger } from './apiCallLogger';

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
            console.warn(`[Anthropic] Network error on attempt ${attempt}/${maxRetries}, retrying in ${delayMs}ms...`, lastError.message);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw lastError || new Error('Max retries exceeded');
};

// Current operation context for logging (set by callers)
let currentUsageContext: AIUsageContext = {};
let currentOperation: string = 'unknown';

// Use shared extraction utility (previously duplicated across all providers)
import { extractMarkdownFromResponse } from './ai/shared/extractJson';

/**
 * Set the context for AI usage logging (should be called before AI operations)
 */
export function setUsageContext(context: AIUsageContext, operation?: string): void {
    currentUsageContext = context;
    if (operation) currentOperation = operation;
}

/**
 * Call Anthropic API via streaming to avoid timeouts on long-running requests
 * Streaming keeps the connection alive while the AI generates its response
 * @param onProgress - Optional callback to report streaming progress (for activity-based timeouts)
 * @param expectJson - Whether to append JSON formatting instructions (default: true for backward compat)
 */
const callApiWithStreaming = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    operationName?: string,
    onProgress?: StreamingProgressCallback,
    expectJson: boolean = true
): Promise<T> => {
    const startTime = Date.now();
    const operation = operationName || currentOperation;

    console.log('[Anthropic STREAMING] Starting streaming request:', { operation, model: businessInfo.aiModel, promptLength: prompt.length, expectJson });
    dispatch({ type: 'LOG_EVENT', payload: { service: 'Anthropic', message: `Sending streaming request to ${businessInfo.aiModel}...`, status: 'info', timestamp: Date.now() } });

    if (!businessInfo.anthropicApiKey) {
        throw new Error("Anthropic API key is not configured.");
    }

    if (!businessInfo.supabaseUrl) {
        throw new Error("Supabase URL is not configured. Required for Anthropic proxy.");
    }

    // Only append JSON formatting requirements when expecting JSON output
    const effectivePrompt = expectJson
        ? `${prompt}\n\nCRITICAL FORMATTING REQUIREMENT: Your response must be ONLY a valid JSON object. Do NOT include any text before or after the JSON. Do NOT wrap it in markdown code blocks. Start your response directly with { and end with }.`
        : prompt;
    const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/anthropic-proxy`;

    const validClaudeModels = [
        'claude-opus-4-5-20251101', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001',
        'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514',
        'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307',
    ];
    const defaultModel = 'claude-sonnet-4-5-20250929';
    const isValidClaudeModel = businessInfo.aiModel && validClaudeModels.includes(businessInfo.aiModel);
    const modelToUse = isValidClaudeModel ? businessInfo.aiModel : defaultModel;

    const requestBody = {
        model: modelToUse,
        max_tokens: 32768,
        stream: true, // Enable streaming
        messages: [{ role: "user", content: effectivePrompt }],
        system: "You are a helpful, expert SEO strategist. You ALWAYS output valid JSON when requested. Never include explanatory text, markdown formatting, or code blocks around your JSON response. Start directly with { and end with }. IMPORTANT: When generating content briefs, you MUST include ALL required fields including 'structured_outline' with detailed section breakdowns - never truncate or skip any fields in the JSON schema."
    };

    try {
        console.log('[Anthropic STREAMING] Making fetch request to:', proxyUrl);
        console.log('[Anthropic STREAMING] Request body:', {
            model: requestBody.model,
            max_tokens: requestBody.max_tokens,
            stream: requestBody.stream,
            promptLength: requestBody.messages[0]?.content?.length
        });

        // Create abort controller for timeout (5 minutes for streaming)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error('[Anthropic STREAMING] Request timed out after 5 minutes');
            controller.abort();
        }, 300000); // 5 minute timeout

        let response: Response;
        try {
            // Use fetchWithRetry to handle intermittent network failures
            response = await fetchWithRetry(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-anthropic-api-key': businessInfo.anthropicApiKey,
                    'apikey': businessInfo.supabaseAnonKey,
                    'Authorization': `Bearer ${businessInfo.supabaseAnonKey}`,
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }

        console.log('[Anthropic STREAMING] Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Anthropic STREAMING] Error response body:', errorText);
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText || response.statusText };
            }
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Process the streaming response
        const contentType = response.headers.get('content-type');
        console.log('[Anthropic STREAMING] Response content-type:', contentType);

        // Check if response is actually streaming (SSE) or JSON
        if (contentType?.includes('application/json')) {
            // Proxy returned JSON instead of stream - parse directly
            console.log('[Anthropic STREAMING] Got JSON response, not stream');
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            const textBlock = data.content?.find((b: any) => b.type === 'text');
            const fullText = textBlock?.text || '';
            console.log('[Anthropic STREAMING] JSON response text length:', fullText.length);
            return sanitizerFn(fullText);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            console.error('[Anthropic STREAMING] No response body reader available');
            throw new Error('Failed to get response reader');
        }

        console.log('[Anthropic STREAMING] Starting to read stream...');

        const decoder = new TextDecoder();
        let fullText = '';
        let eventCount = 0;
        let chunkCount = 0;
        let buffer = ''; // Buffer for incomplete lines across chunks

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('[Anthropic STREAMING] Stream ended (done=true)');
                break;
            }

            chunkCount++;
            const chunk = decoder.decode(value, { stream: true });

            // Log first few chunks and their raw content to debug
            if (chunkCount <= 5) {
                console.log(`[Anthropic STREAMING] Chunk ${chunkCount} (${chunk.length} bytes):`, chunk.substring(0, 300));
            }

            // Add chunk to buffer and process complete lines
            buffer += chunk;
            const lines = buffer.split('\n');

            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();

                // Skip empty lines and event type lines
                if (!trimmedLine || trimmedLine.startsWith('event:')) continue;

                if (trimmedLine.startsWith('data: ')) {
                    const data = trimmedLine.slice(6);
                    if (data === '[DONE]') {
                        console.log('[Anthropic STREAMING] Received [DONE] signal');
                        continue;
                    }

                    try {
                        const event = JSON.parse(data);

                        // Handle different event types from Anthropic
                        if (event.type === 'content_block_delta') {
                            // Anthropic uses delta.type = 'text_delta' and delta.text for the actual text
                            const deltaText = event.delta?.text;
                            if (deltaText) {
                                fullText += deltaText;
                                eventCount++;
                                // Log progress and report to caller every 50 events
                                if (eventCount % 50 === 0) {
                                    console.log(`[Anthropic STREAMING] Progress: ${fullText.length} chars, ${eventCount} events`);
                                    // Report progress to caller for activity-based timeout resets
                                    onProgress?.({
                                        charsReceived: fullText.length,
                                        eventsProcessed: eventCount,
                                        elapsedMs: Date.now() - startTime,
                                        lastActivity: Date.now()
                                    });
                                }
                            }
                        } else if (event.type === 'message_start') {
                            console.log('[Anthropic STREAMING] Message started');
                        } else if (event.type === 'message_stop') {
                            console.log('[Anthropic STREAMING] Message stopped');
                        } else if (event.type === 'error') {
                            console.error('[Anthropic STREAMING] Error event:', event.error);
                            throw new Error(event.error?.message || 'Stream error');
                        }
                    } catch (parseError) {
                        // Log parse errors for debugging (but don't crash on partial data)
                        if (chunkCount <= 5) {
                            console.warn('[Anthropic STREAMING] Parse error for data:', data.substring(0, 100), parseError);
                        }
                    }
                }
            }
        }

        // Process any remaining data in the buffer
        if (buffer.trim()) {
            console.log('[Anthropic STREAMING] Processing remaining buffer:', buffer.substring(0, 100));
        }

        console.log('[Anthropic STREAMING] Stream complete:', {
            chunkCount,
            eventCount,
            textLength: fullText.length,
            textPreview: fullText.substring(0, 200)
        });

        // Validate we got actual content
        if (!fullText || fullText.trim().length === 0) {
            console.error('[Anthropic STREAMING] CRITICAL: Stream completed but no text content was extracted!', {
                chunkCount,
                eventCount,
                contentType
            });
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Anthropic',
                message: `CRITICAL: Streaming returned empty content after ${chunkCount} chunks. Check console for details.`,
                status: 'failure',
                timestamp: Date.now()
            }});
            throw new Error('Streaming completed but no content was received. The AI response may have been empty or malformed.');
        }

        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Anthropic',
            message: `Streaming complete: ${fullText.length} chars in ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
            status: 'success',
            timestamp: Date.now()
        }});

        // Log usage
        const durationMs = Date.now() - startTime;
        let supabase;
        try {
            if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
                supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            }
        } catch (e) {
            // Ignore if supabase not available
        }

        logAiUsage({
            provider: 'anthropic',
            model: modelToUse,
            operation,
            tokensIn: estimateTokens(effectivePrompt.length),
            tokensOut: estimateTokens(fullText.length),
            durationMs,
            success: true,
            requestSizeBytes: JSON.stringify(requestBody).length,
            responseSizeBytes: fullText.length,
            context: currentUsageContext
        }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

        return sanitizerFn(fullText);

    } catch (error) {
        const durationMs = Date.now() - startTime;
        let supabase;
        try {
            if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
                supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            }
        } catch (e) {
            // Ignore if supabase not available
        }

        logAiUsage({
            provider: 'anthropic',
            model: businessInfo.aiModel || 'unknown',
            operation,
            tokensIn: estimateTokens(prompt.length),
            tokensOut: 0,
            durationMs,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            context: currentUsageContext
        }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

        const message = error instanceof Error ? error.message : "Unknown Anthropic error";
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Anthropic', message: `Streaming error: ${message}`, status: 'failure', timestamp: Date.now() } });
        // Avoid double-wrapping if error already has our prefix
        if (message.startsWith('Anthropic API Call Failed:')) {
            throw new Error(message);
        }
        throw new Error(`Anthropic API Call Failed: ${message}`);
    }
};

/**
 * Call Anthropic API via Supabase Edge Function proxy to avoid CORS issues
 * The proxy endpoint handles the actual Anthropic API call server-side
 */
const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    operationName?: string
): Promise<T> => {
    const startTime = Date.now();
    const operation = operationName || currentOperation;

    dispatch({ type: 'LOG_EVENT', payload: { service: 'Anthropic', message: `Sending request to ${businessInfo.aiModel}...`, status: 'info', timestamp: Date.now() } });

    if (!businessInfo.anthropicApiKey) {
        throw new Error("Anthropic API key is not configured.");
    }

    if (!businessInfo.supabaseUrl) {
        throw new Error("Supabase URL is not configured. Required for Anthropic proxy.");
    }

    // Claude works best if we explicitly ask for JSON in the prefill or user message
    const effectivePrompt = `${prompt}\n\nCRITICAL FORMATTING REQUIREMENT: Your response must be ONLY a valid JSON object. Do NOT include any text before or after the JSON. Do NOT wrap it in markdown code blocks. Start your response directly with { and end with }.`;

    // Use Supabase Edge Function as proxy to avoid CORS issues
    const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/anthropic-proxy`;

    // Ensure we use a valid Claude model - if aiModel is not a Claude model, use default
    // Valid Anthropic model IDs: https://docs.claude.com/en/docs/about-claude/models/overview
    const validClaudeModels = [
        // Claude 4.5 models (Latest - November 2025)
        'claude-opus-4-5-20251101',
        'claude-sonnet-4-5-20250929',
        'claude-haiku-4-5-20251001',
        // Claude 4.x models (Legacy but still available)
        'claude-opus-4-1-20250805',
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-3-7-sonnet-20250219',
        // Claude 3.5 models (Legacy)
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307',
    ];
    const defaultModel = 'claude-sonnet-4-5-20250929'; // Claude Sonnet 4.5 - best price/performance
    const isValidClaudeModel = businessInfo.aiModel && validClaudeModels.includes(businessInfo.aiModel);
    const modelToUse = isValidClaudeModel ? businessInfo.aiModel : defaultModel;

    // Validate configuration before making request
    if (!businessInfo.supabaseAnonKey) {
        console.warn('[Anthropic callApi] Supabase anon key is missing - request may fail');
    }

    const requestBody = {
        model: modelToUse,
        max_tokens: 32768,  // Increased for comprehensive content brief generation
        messages: [
            { role: "user", content: effectivePrompt }
        ],
        system: "You are a helpful, expert SEO strategist. You ALWAYS output valid JSON when requested. Never include explanatory text, markdown formatting, or code blocks around your JSON response. Start directly with { and end with }. IMPORTANT: When generating content briefs, you MUST include ALL required fields including 'structured_outline' with detailed section breakdowns - never truncate or skip any fields in the JSON schema."
    };

    const bodyString = JSON.stringify(requestBody);
    const bodySizeKB = (bodyString.length / 1024).toFixed(2);

    // Validate required configuration
    if (!businessInfo.anthropicApiKey) {
        throw new Error('Anthropic API key is not configured. Please add your API key in Settings.');
    }
    if (!businessInfo.supabaseAnonKey) {
        throw new Error('Supabase anon key is not configured.');
    }

    console.log('[Anthropic callApi] Making request to proxy:', {
        proxyUrl,
        model: modelToUse,
        hasApiKey: !!businessInfo.anthropicApiKey,
        apiKeyPreview: businessInfo.anthropicApiKey ? `${businessInfo.anthropicApiKey.substring(0, 10)}...` : 'MISSING',
        hasAnonKey: !!businessInfo.supabaseAnonKey,
        promptLength: effectivePrompt.length,
        requestBodySizeKB: bodySizeKB
    });

    // Warn if request body is very large (could cause issues)
    if (bodyString.length > 500000) { // 500KB
        console.warn(`[Anthropic callApi] Request body is very large (${bodySizeKB}KB). This may cause issues.`);
    }

    // Start API call logging
    const apiCallLog = anthropicLogger.start(operation, 'POST');

    try {
        // Use fetchWithRetry to handle intermittent network failures
        const response = await fetchWithRetry(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-anthropic-api-key': businessInfo.anthropicApiKey,
                'apikey': businessInfo.supabaseAnonKey,
                'Authorization': `Bearer ${businessInfo.supabaseAnonKey}`,
            },
            body: bodyString,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));

            // Provide more helpful error messages for common issues
            if (response.status === 504) {
                throw new Error(
                    'Anthropic API Call Failed: Request timed out. This usually happens with complex content briefs. ' +
                    'Try switching to Gemini (Settings → AI Provider) which is faster, ' +
                    'or upgrade your Supabase plan for longer timeouts.'
                );
            }

            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('[Anthropic callApi] Response received:', {
            hasError: !!data.error,
            hasContent: !!data.content,
            contentLength: data.content?.length,
            stopReason: data.stop_reason
        });

        // Handle error responses from proxy
        if (data.error) {
            console.error('[Anthropic callApi] Proxy returned error:', data.error);
            throw new Error(data.error);
        }

        // Claude's response content is an array of blocks. We assume the first block is text.
        const textBlock = data.content?.[0];
        const responseText = textBlock?.type === 'text' ? textBlock.text : '';
        const stopReason = data.stop_reason || 'unknown';

        console.log('[Anthropic callApi] Extracted text:', {
            blockType: textBlock?.type,
            textLength: responseText?.length,
            textPreview: responseText?.substring(0, 300)
        });

        // Log stop reason if it indicates truncation
        if (stopReason === 'max_tokens') {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Anthropic',
                message: 'WARNING: Response was truncated due to max_tokens limit. Consider increasing limit or making prompt more specific.',
                status: 'warning',
                timestamp: Date.now()
            }});
        }

        // Check if we got an empty response
        if (!responseText) {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Anthropic',
                message: 'Received empty response from Claude.',
                status: 'warning',
                timestamp: Date.now(),
                data: { contentBlocks: data.content, textBlockType: textBlock?.type }
            }});
        } else {
            // Log preview directly in message for visibility (data field may not display)
            const preview = responseText.substring(0, 150).replace(/\n/g, ' ').replace(/\s+/g, ' ');
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Anthropic',
                message: `Received response (${responseText.length} chars, stop: ${stopReason}). Preview: "${preview}..."`,
                status: 'info',
                timestamp: Date.now()
            }});
        }

        // Log successful usage
        const durationMs = Date.now() - startTime;
        const tokensIn = estimateTokens(effectivePrompt.length);
        const tokensOut = estimateTokens(responseText?.length || 0);

        // Get supabase client for database logging (if available)
        let supabase;
        try {
            if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
                supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            }
        } catch (e) {
            // Ignore if supabase not available
        }

        logAiUsage({
            provider: 'anthropic',
            model: modelToUse,
            operation,
            tokensIn,
            tokensOut,
            durationMs,
            success: true,
            requestSizeBytes: bodyString.length,
            responseSizeBytes: responseText?.length || 0,
            context: currentUsageContext
        }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

        // Log successful API call
        anthropicLogger.success(apiCallLog.id, {
            model: modelToUse,
            requestSize: bodyString.length,
            responseSize: responseText?.length || 0,
            tokenCount: tokensIn + tokensOut,
        });

        return sanitizerFn(responseText);

    } catch (error) {
        // Log failed usage
        const durationMs = Date.now() - startTime;
        const tokensIn = estimateTokens(prompt.length);

        let supabase;
        try {
            if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
                supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            }
        } catch (e) {
            // Ignore if supabase not available
        }

        logAiUsage({
            provider: 'anthropic',
            model: businessInfo.aiModel || 'unknown',
            operation,
            tokensIn,
            tokensOut: 0,
            durationMs,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            context: currentUsageContext
        }, supabase).catch(e => console.warn('Failed to log AI usage:', e));

        // Log failed API call
        anthropicLogger.error(apiCallLog.id, error, {
            model: businessInfo.aiModel || 'unknown',
            requestSize: bodyString.length,
        });

        let message = error instanceof Error ? error.message : "Unknown Anthropic error";

        // Provide more specific error messages for common issues
        if (message === 'Failed to fetch' || message.includes('NetworkError')) {
            console.error('[Anthropic callApi] Network error details:', {
                proxyUrl,
                hasApiKey: !!businessInfo.anthropicApiKey,
                hasAnonKey: !!businessInfo.supabaseAnonKey,
                supabaseUrl: businessInfo.supabaseUrl
            });
            message = `Network error connecting to proxy. Please check: 1) Your internet connection, 2) Supabase URL is correct (${businessInfo.supabaseUrl}), 3) The anthropic-proxy function is deployed.`;
        } else if (message.includes('TypeError')) {
            message = `Configuration error: ${message}. Check that all required API keys are configured.`;
        }

        dispatch({ type: 'LOG_EVENT', payload: { service: 'Anthropic', message: `Error: ${message}`, status: 'failure', timestamp: Date.now(), data: error } });
        // Avoid double-wrapping if error already has our prefix (e.g., from 504 timeout handler)
        if (message.startsWith('Anthropic API Call Failed:')) {
            throw new Error(message);
        }
        throw new Error(`Anthropic API Call Failed: ${message}`);
    }
};

// Re-export logic mirroring openAiService but using the local callApi
// For brevity, we assume the function signatures match exactly.
// We import the implementations from a shared utility or copy-paste them but swap the callApi.
// Since we can't easily share the implementation code without a refactor, we copy the function bodies
// but use the local `callApi`.

// --- Implemented Functions ---
// Note: Implementation details are identical to openAiService except for the `callApi` function.

export const suggestCentralEntityCandidates = async (info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT(info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), 'suggestCentralEntityCandidates');
};

export const suggestSourceContextOptions = async (info: BusinessInfo, entity: string, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT(info, entity), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), 'suggestSourceContextOptions');
};

export const suggestCentralSearchIntent = async (info: BusinessInfo, entity: string, context: string, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT(info, entity, context), info, dispatch, (text) => sanitizer.sanitizeArray<{ intent: string, reasoning: string }>(text, []), 'suggestCentralSearchIntent');
};

export const discoverCoreSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT(info, pillars), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), 'discoverCoreSemanticTriples');
};

export const expandSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, existing: SemanticTriple[], dispatch: React.Dispatch<any>, count: number = 15): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // For large counts, use batched generation to avoid token limits
    const BATCH_SIZE = 30;

    if (count <= BATCH_SIZE) {
        return callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, existing, count), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), 'expandSemanticTriples');
    }

    // Batched generation for larger counts
    const allNewTriples: SemanticTriple[] = [];
    const batches = Math.ceil(count / BATCH_SIZE);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Anthropic',
        message: `Starting batched EAV expansion: ${count} triples in ${batches} batches`,
        status: 'info',
        timestamp: Date.now()
    }});

    for (let i = 0; i < batches; i++) {
        const batchCount = Math.min(BATCH_SIZE, count - allNewTriples.length);
        const combinedExisting = [...existing, ...allNewTriples];

        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Anthropic',
            message: `Generating batch ${i + 1}/${batches}: ${batchCount} triples (${allNewTriples.length}/${count} complete)`,
            status: 'info',
            timestamp: Date.now()
        }});

        const batchResults = await callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, combinedExisting, batchCount), info, dispatch, (text) => sanitizer.sanitizeArray(text, []), 'expandSemanticTriples');
        allNewTriples.push(...batchResults);

        if (allNewTriples.length >= count) break;
    }

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Anthropic',
        message: `Batched EAV expansion complete: Generated ${allNewTriples.length} new triples`,
        status: 'success',
        timestamp: Date.now()
    }});

    return allNewTriples.slice(0, count);
};

export const generateInitialTopicalMap = async (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>, serpIntel?: import('../config/prompts').SerpIntelligenceForMap) => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // Use chunked generation to avoid token truncation
    // Generate each section in a separate API call
    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Anthropic',
        message: 'Starting chunked map generation (monetization + informational sections in parallel)...',
        status: 'info',
        timestamp: Date.now()
    }});

    const monetizationPrompt = prompts.GENERATE_MONETIZATION_SECTION_PROMPT(info, pillars, eavs, competitors, serpIntel);
    const informationalPrompt = prompts.GENERATE_INFORMATIONAL_SECTION_PROMPT(info, pillars, eavs, competitors, serpIntel);

    const fallbackSection = { topics: [] };

    // Run both calls in parallel for faster generation
    const [monetizationResult, informationalResult] = await Promise.all([
        callApi(monetizationPrompt, info, dispatch, (text) =>
            sanitizer.sanitize(text, { topics: Array }, fallbackSection), 'generateTopicalMap:monetization'
        ).catch(err => {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Anthropic',
                message: `Monetization section failed: ${err.message}`,
                status: 'failure',
                timestamp: Date.now()
            }});
            return fallbackSection;
        }),
        callApi(informationalPrompt, info, dispatch, (text) =>
            sanitizer.sanitize(text, { topics: Array }, fallbackSection), 'generateTopicalMap:informational'
        ).catch(err => {
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Anthropic',
                message: `Informational section failed: ${err.message}`,
                status: 'failure',
                timestamp: Date.now()
            }});
            return fallbackSection;
        })
    ]);

    const monetizationTopics = monetizationResult.topics || [];
    const informationalTopics = informationalResult.topics || [];

    // Log the parsed result for debugging with topic_class info
    const monetizationWithSpokes = monetizationTopics.reduce((acc: number, t: any) => acc + (t.spokes?.length || 0), 0);
    const informationalWithSpokes = informationalTopics.reduce((acc: number, t: any) => acc + (t.spokes?.length || 0), 0);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Anthropic',
        message: `Chunked generation complete. Monetization: ${monetizationTopics.length} core + ${monetizationWithSpokes} spokes (topic_class=monetization), Informational: ${informationalTopics.length} core + ${informationalWithSpokes} spokes (topic_class=informational)`,
        status: monetizationTopics.length || informationalTopics.length ? 'info' : 'warning',
        timestamp: Date.now()
    }});

    // Flatten into coreTopics and outerTopics
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
    process(monetizationTopics, 'monetization');
    process(informationalTopics, 'informational');
    return { coreTopics, outerTopics };
};

export const suggestResponseCode = async (info: BusinessInfo, topic: string, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_RESPONSE_CODE_PROMPT(info, topic), info, dispatch, (text) => sanitizer.sanitize(text, { responseCode: String, reasoning: String }, { responseCode: ResponseCode.INFORMATIONAL, reasoning: '' }), 'suggestResponseCode');
};

export const generateContentBrief = async (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns,
    eavs?: import('../types').SemanticTriple[]) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code, marketPatterns, eavs);
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

    // Use streaming to avoid timeouts on large content brief generation
    const result = await callApiWithStreaming(prompt, info, dispatch, (text) => sanitizer.sanitize(text, schema, CONTENT_BRIEF_FALLBACK), 'generateContentBrief');

    // Validate structured_outline was returned
    if (!result.structured_outline || result.structured_outline.length === 0) {
        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Anthropic',
            message: `CRITICAL: AI did not return structured_outline. Content brief will have empty sections. Try regenerating.`,
            status: 'error',
            timestamp: Date.now()
        }});
    } else {
        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Anthropic',
            message: `Content brief generated with ${result.structured_outline.length} sections in structured_outline.`,
            status: 'success',
            timestamp: Date.now()
        }});
    }

    return result;
};

// Use streaming for article draft generation to avoid timeouts
// expectJson: false because this returns markdown content, not JSON
export const generateArticleDraft = async (brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>) => callApiWithStreaming(
    prompts.GENERATE_ARTICLE_DRAFT_PROMPT(brief, info),
    info,
    dispatch,
    t => t,
    'generateArticleDraft',
    undefined, // no progress callback
    false // expectJson = false, returns markdown
);

// Use streaming for polish to avoid timeouts with large drafts
// expectJson: false because this returns polished markdown content, not JSON
export const polishDraft = async (
    draft: string,
    brief: ContentBrief,
    info: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
) => callApiWithStreaming(
    prompts.POLISH_ARTICLE_DRAFT_PROMPT(draft, brief, info),
    info,
    dispatch,
    extractMarkdownFromResponse,
    'polishDraft',
    onProgress,
    false // expectJson = false, returns markdown
);

// Use streaming for audit to avoid timeouts with large drafts
export const auditContentIntegrity = async (
    brief: ContentBrief,
    draft: string,
    info: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback: ContentIntegrityResult = {
        overallSummary: '',
        draftText: draft,
        eavCheck: { isPassing: false, details: '' },
        linkCheck: { isPassing: false, details: '' },
        linguisticModality: { score: 0, summary: '' },
        frameworkRules: []
    };
    const schema = { overallSummary: String, eavCheck: Object, linkCheck: Object, linguisticModality: Object, frameworkRules: Array };
    return callApiWithStreaming(
        prompts.AUDIT_CONTENT_INTEGRITY_PROMPT(brief, draft, info),
        info,
        dispatch,
        t => sanitizer.sanitize(t, schema, fallback),
        'auditContentIntegrity',
        onProgress
    );
};

export const refineDraftSection = async (text: string, violation: string, instr: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const res = await callApi(prompts.REFINE_DRAFT_SECTION_PROMPT(text, violation, instr, info), info, dispatch, t => sanitizer.sanitize(t, { refinedText: String }, { refinedText: text }), 'refineDraftSection');
    return res.refinedText;
};

export const generateSchema = async (brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_SCHEMA_PROMPT(brief), info, dispatch, t => sanitizer.sanitize(t, { schema: String, reasoning: String }, { schema: '', reasoning: '' }), 'generateSchema');
};

export const validateTopicalMap = async (topics: EnrichedTopic[], pillars: SEOPillars, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.VALIDATE_TOPICAL_MAP_PROMPT(topics, pillars, info), info, dispatch, t => sanitizer.sanitize(t, { overallScore: Number, summary: String, issues: Array }, { overallScore: 0, summary: '', issues: [] }), 'validateTopicalMap');
};

export const analyzeGscDataForOpportunities = async (rows: GscRow[], kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ANALYZE_GSC_DATA_PROMPT(rows, kg), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'analyzeGscData');
};

export const improveTopicalMap = async (topics: EnrichedTopic[], issues: ValidationIssue[], info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<MapImprovementSuggestion> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const fallback: MapImprovementSuggestion = { newTopics: [], topicTitlesToDelete: [], topicMerges: [], hubSpokeGapFills: [], typeReclassifications: [] };
    return callApi(prompts.IMPROVE_TOPICAL_MAP_PROMPT(topics, issues, info), info, dispatch, t => sanitizer.sanitize(t, { newTopics: Array, topicTitlesToDelete: Array }, fallback), 'improveTopicalMap');
};

export const findMergeOpportunities = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_MERGE_OPPORTUNITIES_PROMPT(topics, info), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'findMergeOpportunities');
};

export const findMergeOpportunitiesForSelection = async (info: BusinessInfo, selected: EnrichedTopic[], dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT(info, selected), info, dispatch, t => sanitizer.sanitize(t, { topicIds: Array, topicTitles: Array, newTopic: Object, reasoning: String, canonicalQuery: String }, { topicIds: [], topicTitles: [], newTopic: { title: '', description: '' }, reasoning: '', canonicalQuery: '' }), 'findMergeOpportunitiesForSelection');
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
    return callApi(prompt, info, dispatch, t => sanitizer.sanitize(t, schema, fallback), 'analyzeSemanticRelationships');
};

export const analyzeContextualCoverage = async (info: BusinessInfo, topics: EnrichedTopic[], pillars: SEOPillars, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ANALYZE_CONTEXTUAL_COVERAGE_PROMPT(info, topics, pillars), info, dispatch, t => sanitizer.sanitize(t, { summary: String, macroCoverage: Number, microCoverage: Number, temporalCoverage: Number, intentionalCoverage: Number, gaps: Array }, { summary: '', macroCoverage: 0, microCoverage: 0, temporalCoverage: 0, intentionalCoverage: 0, gaps: [] }), 'analyzeContextualCoverage');
};

export const auditInternalLinking = async (topics: EnrichedTopic[], briefs: any, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.AUDIT_INTERNAL_LINKING_PROMPT(topics, briefs, info), info, dispatch, t => sanitizer.sanitize(t, { summary: String, missedLinks: Array, dilutionRisks: Array }, { summary: '', missedLinks: [], dilutionRisks: [] }), 'auditInternalLinking');
};

export const calculateTopicalAuthority = async (topics: EnrichedTopic[], briefs: any, kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.CALCULATE_TOPICAL_AUTHORITY_PROMPT(topics, briefs, kg, info), info, dispatch, t => sanitizer.sanitize(t, { overallScore: Number, summary: String, breakdown: Object }, { overallScore: 0, summary: '', breakdown: { contentDepth: 0, contentBreadth: 0, interlinking: 0, semanticRichness: 0 } }), 'calculateTopicalAuthority');
};

export const generatePublicationPlan = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_PUBLICATION_PLAN_PROMPT(topics, info), info, dispatch, t => sanitizer.sanitize(t, { total_duration_weeks: Number, phases: Array }, { total_duration_weeks: 0, phases: [] }), 'generatePublicationPlan');
};

export const findLinkingOpportunitiesForTopic = async (target: EnrichedTopic, all: EnrichedTopic[], kg: KnowledgeGraph, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.FIND_LINKING_OPPORTUNITIES_PROMPT(target, all, kg, info), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'findLinkingOpportunities');
};

export const addTopicIntelligently = async (title: string, desc: string, all: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ADD_TOPIC_INTELLIGENTLY_PROMPT(title, desc, all, info), info, dispatch, t => sanitizer.sanitize(t, { parentTopicId: String, type: String }, { parentTopicId: null, type: 'outer' }), 'addTopicIntelligently');
};

export const expandCoreTopic = async (info: BusinessInfo, pillars: SEOPillars, core: EnrichedTopic, all: EnrichedTopic[], kg: KnowledgeGraph, dispatch: React.Dispatch<any>, mode: any, context?: string) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.EXPAND_CORE_TOPIC_PROMPT(info, pillars, core, all, kg, mode, context), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'expandCoreTopic');
};

export const analyzeTopicViability = async (topic: string, desc: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ANALYZE_TOPIC_VIABILITY_PROMPT(topic, desc, info), info, dispatch, t => sanitizer.sanitize(t, { decision: String, reasoning: String, targetParent: String }, { decision: 'PAGE', reasoning: '', targetParent: undefined }), 'analyzeTopicViability');
};

export const generateCoreTopicSuggestions = async (thoughts: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT(thoughts, info), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'generateCoreTopicSuggestions');
};

export const generateStructuredTopicSuggestions = async (thoughts: string, existing: any[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT(thoughts, existing, info), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'generateStructuredTopicSuggestions');
};

export const enrichTopicMetadata = async (topics: any[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.ENRICH_TOPIC_METADATA_PROMPT(topics, info), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'enrichTopicMetadata');
};

export const generateTopicBlueprints = async (topics: any[], info: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const flatResults = await callApi(prompts.GENERATE_TOPIC_BLUEPRINT_PROMPT(topics, info, pillars), info, dispatch, t => sanitizer.sanitizeArray(t, []), 'generateTopicBlueprints');
    return flatResults.map((item: any) => ({ id: item.id, blueprint: { ...item } }));
};

// Use streaming for flow analysis to avoid timeouts with large drafts
export const analyzeContextualFlow = async (
    text: string,
    entity: string,
    info: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
) => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // Track progress from both parallel calls and combine them
    let vectorChars = 0;
    let discourseChars = 0;
    const combineProgress = () => {
        onProgress?.({
            charsReceived: vectorChars + discourseChars,
            eventsProcessed: 0, // Not tracked for combined
            elapsedMs: 0,
            lastActivity: Date.now()
        });
    };

    // Run both analyses in parallel with streaming
    const vProm = callApiWithStreaming(
        prompts.AUDIT_INTRA_PAGE_FLOW_PROMPT(text, entity),
        info,
        dispatch,
        t => sanitizer.sanitize(t, { headingVector: Array, vectorIssues: Array, attributeOrderIssues: Array }, { headingVector: [], vectorIssues: [], attributeOrderIssues: [] }),
        'auditIntraPageFlow',
        (p) => { vectorChars = p.charsReceived; combineProgress(); }
    );
    const dProm = callApiWithStreaming(
        prompts.AUDIT_DISCOURSE_INTEGRATION_PROMPT(text),
        info,
        dispatch,
        t => sanitizer.sanitize(t, { discourseGaps: Array, gapDetails: Array }, { discourseGaps: [], gapDetails: [] }),
        'auditDiscourseIntegration',
        (p) => { discourseChars = p.charsReceived; combineProgress(); }
    );
    const [vRes, dRes] = await Promise.all([vProm, dProm]);

    const issues: ContextualFlowIssue[] = [];
    if(vRes.vectorIssues) vRes.vectorIssues.forEach((i: any) => issues.push({ category: 'VECTOR', rule: 'Vector Straightness', score: 0, details: i.issue, offendingSnippet: i.heading, remediation: i.remediation }));
    if(vRes.attributeOrderIssues) vRes.attributeOrderIssues.forEach((i: any) => issues.push({ category: 'MACRO', rule: 'Attribute Order', score: 0, details: i.issue, offendingSnippet: i.section, remediation: i.remediation }));
    if(dRes.gapDetails) dRes.gapDetails.forEach((i: any) => issues.push({ category: 'LINGUISTIC', rule: 'Discourse Integration', score: 0, details: i.details, offendingSnippet: `Gap #${i.paragraphIndex}`, remediation: i.suggestedBridge }));

    return { overallFlowScore: 85, vectorStraightness: 80, informationDensity: 90, issues, headingVector: vRes.headingVector || [], discourseGaps: dRes.discourseGaps || [] };
};

export const applyFlowRemediation = async (snippet: string, issue: ContextualFlowIssue, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = await callApi(prompts.APPLY_FLOW_REMEDIATION_PROMPT(snippet, issue.details, issue.remediation, info), info, dispatch, t => sanitizer.sanitize(t, { refinedText: String }, { refinedText: snippet }), 'applyFlowRemediation');
    return result.refinedText;
};

export const applyBatchFlowRemediation = async (draft: string, issues: ContextualFlowIssue[], info: BusinessInfo, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = await callApi(prompts.BATCH_FLOW_REMEDIATION_PROMPT(draft, issues, info), info, dispatch, t => sanitizer.sanitize(t, { polishedDraft: String }, { polishedDraft: draft }), 'applyBatchFlowRemediation');
    return result.polishedDraft;
};

// --- Generic AI methods for Migration Service ---

/**
 * Helper to extract JSON from response that might have markdown code blocks
 */
const extractJsonFromText = (text: string): string => {
    if (!text) return '{}';

    // Try to extract JSON from markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        return jsonBlockMatch[1].trim();
    }

    // Try to find JSON object directly (starts with { ends with })
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return jsonMatch[0];
    }

    return text.trim();
};

/**
 * Attempt to repair common JSON issues from LLM responses
 * - Unescaped newlines in strings
 * - Unescaped quotes in strings
 * - Trailing commas
 */
const repairJson = (jsonStr: string): string => {
    // Replace literal newlines inside strings with escaped versions
    // This regex finds strings and replaces unescaped newlines within them
    let repaired = jsonStr;

    // First, try to fix unescaped newlines in string values
    // Match strings and escape any literal newlines inside
    repaired = repaired.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
        // Replace actual newlines with \n escape sequence
        return match
            .replace(/\r\n/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/\t/g, '\\t');
    });

    // Remove trailing commas before ] or }
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    return repaired;
};

/**
 * Try multiple JSON parsing strategies
 */
const parseJsonRobust = <T>(text: string, fallback: T): { success: boolean; data: T } => {
    // Strategy 1: Direct parse
    try {
        return { success: true, data: JSON.parse(text) };
    } catch (e1) {
        console.log('[parseJsonRobust] Direct parse failed, trying repair...');
    }

    // Strategy 2: Repair and parse
    try {
        const repaired = repairJson(text);
        return { success: true, data: JSON.parse(repaired) };
    } catch (e2) {
        console.log('[parseJsonRobust] Repaired parse failed, trying line-by-line fix...');
    }

    // Strategy 3: Try to find complete JSON by matching braces
    try {
        let depth = 0;
        let start = -1;
        let end = -1;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (start === -1) start = i;
                depth++;
            } else if (text[i] === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                    end = i + 1;
                    break;
                }
            }
        }

        if (start !== -1 && end !== -1) {
            const extracted = text.substring(start, end);
            const repaired = repairJson(extracted);
            return { success: true, data: JSON.parse(repaired) };
        }
    } catch (e3) {
        console.log('[parseJsonRobust] Brace matching failed');
    }

    // Strategy 4: Try to parse partial JSON up to the error point
    try {
        // Find where JSON might be truncated/broken and try to close it
        const lines = text.split('\n');
        for (let i = lines.length; i > 0; i--) {
            const partial = lines.slice(0, i).join('\n');
            // Try to close any open structures
            let attempt = partial;
            const openBraces = (attempt.match(/\{/g) || []).length;
            const closeBraces = (attempt.match(/\}/g) || []).length;
            const openBrackets = (attempt.match(/\[/g) || []).length;
            const closeBrackets = (attempt.match(/\]/g) || []).length;

            // Add missing closures
            attempt += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
            attempt += '}'.repeat(Math.max(0, openBraces - closeBraces));

            try {
                const repaired = repairJson(attempt);
                const parsed = JSON.parse(repaired);
                console.log('[parseJsonRobust] Partial parse succeeded at line', i);
                return { success: true, data: parsed };
            } catch {
                continue;
            }
        }
    } catch (e4) {
        console.log('[parseJsonRobust] Partial parse strategy failed');
    }

    return { success: false, data: fallback };
};

/**
 * Generic JSON generation method for migration workflows
 */
export const generateJson = async <T extends object>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    fallback: T
): Promise<T> => {
    return callApi(prompt, businessInfo, dispatch, (text) => {
        // Log the raw response for debugging
        console.log('[Anthropic generateJson] Raw response length:', text?.length);
        console.log('[Anthropic generateJson] Raw response preview:', text?.substring(0, 500));

        if (!text || text.trim().length === 0) {
            console.error('[Anthropic generateJson] Empty response received, returning fallback');
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'Anthropic',
                message: 'Empty response from API, using fallback',
                status: 'warning',
                timestamp: Date.now()
            }});
            return fallback;
        }

        // Extract JSON from potential markdown code blocks
        const cleanedText = extractJsonFromText(text);
        console.log('[Anthropic generateJson] Cleaned text preview:', cleanedText?.substring(0, 300));

        // Use robust JSON parser with multiple strategies
        const { success, data } = parseJsonRobust<T>(cleanedText, fallback);

        if (success) {
            console.log('[Anthropic generateJson] Successfully parsed JSON with keys:', Object.keys(data as object));
            return data;
        }

        console.error('[Anthropic generateJson] All JSON parse strategies failed');
        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Anthropic',
            message: `JSON parse failed after all repair attempts. Using fallback.`,
            status: 'warning',
            timestamp: Date.now()
        }});

        return fallback;
    }, 'generateJson');
};

/**
 * Generic text generation method using STREAMING to avoid timeouts
 * This function does NOT request JSON output - returns human-readable text
 * Uses streaming to keep connection alive during long generation (critical for Anthropic via Supabase proxy)
 */
export const generateText = async (
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    const startTime = Date.now();
    dispatch({ type: 'LOG_EVENT', payload: { service: 'Anthropic', message: `Generating text response (streaming)...`, status: 'info', timestamp: Date.now() } });

    if (!businessInfo.anthropicApiKey) {
        throw new Error("Anthropic API key is not configured.");
    }

    if (!businessInfo.supabaseUrl) {
        throw new Error("Supabase URL is not configured. Required for Anthropic proxy.");
    }

    const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/anthropic-proxy`;

    const validClaudeModels = [
        'claude-opus-4-5-20251101', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001',
        'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514',
        'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307',
    ];
    const defaultModel = 'claude-sonnet-4-5-20250929';
    const isValidClaudeModel = businessInfo.aiModel && validClaudeModels.includes(businessInfo.aiModel);
    const modelToUse = isValidClaudeModel ? businessInfo.aiModel : defaultModel;

    // Start API call logging
    const apiCallLog = anthropicLogger.start('generateText', 'POST');

    try {
        // Use streaming to avoid timeouts on long content generation
        const requestBody = {
            model: modelToUse,
            max_tokens: 16384, // Higher limit for content generation
            stream: true, // Enable streaming to avoid timeouts
            messages: [
                { role: "user", content: prompt }
            ],
            system: "You are a helpful, expert SEO strategist specializing in semantic optimization and content creation. Write high-quality, comprehensive content that follows SEO best practices. Use markdown formatting for structure."
        };

        // Create abort controller for timeout (5 minutes for streaming)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error('[Anthropic generateText] Streaming request timed out after 5 minutes');
            controller.abort();
        }, 300000); // 5 minute timeout

        let response: Response;
        try {
            // Use fetchWithRetry to handle intermittent network failures
            response = await fetchWithRetry(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-anthropic-api-key': businessInfo.anthropicApiKey,
                    'apikey': businessInfo.supabaseAnonKey || '',
                    'Authorization': `Bearer ${businessInfo.supabaseAnonKey || ''}`,
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText || response.statusText };
            }

            // Handle 504 timeout with helpful message
            if (response.status === 504) {
                throw new Error(
                    'Request timed out. The Anthropic API is taking longer than expected. ' +
                    'This can happen with complex content. Please try again.'
                );
            }

            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if response is streaming (SSE) or JSON
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            // Proxy returned JSON instead of stream - parse directly
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            const textBlock = data.content?.find((b: any) => b.type === 'text');
            const fullText = textBlock?.text || '';

            anthropicLogger.success(apiCallLog.id, {
                model: modelToUse,
                requestSize: JSON.stringify(requestBody).length,
                responseSize: fullText.length,
            });

            return fullText;
        }

        // Process streaming response
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Failed to get response reader');
        }

        const decoder = new TextDecoder();
        let fullText = '';
        let eventCount = 0;
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('event:')) continue;

                if (trimmedLine.startsWith('data: ')) {
                    const data = trimmedLine.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const event = JSON.parse(data);
                        if (event.type === 'content_block_delta') {
                            const deltaText = event.delta?.text;
                            if (deltaText) {
                                fullText += deltaText;
                                eventCount++;
                            }
                        } else if (event.type === 'error') {
                            throw new Error(event.error?.message || 'Stream error');
                        }
                    } catch (parseError) {
                        // Ignore parse errors for partial data
                    }
                }
            }
        }

        if (!fullText || fullText.trim().length === 0) {
            throw new Error('Streaming completed but no content was received.');
        }

        const durationMs = Date.now() - startTime;
        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'Anthropic',
            message: `Streaming complete: ${fullText.length} chars in ${(durationMs / 1000).toFixed(1)}s`,
            status: 'success',
            timestamp: Date.now()
        }});

        // Log successful API call
        anthropicLogger.success(apiCallLog.id, {
            model: modelToUse,
            requestSize: JSON.stringify(requestBody).length,
            responseSize: fullText.length,
            tokenCount: estimateTokens(prompt.length) + estimateTokens(fullText.length),
        });

        return fullText;

    } catch (error) {
        // Log failed API call
        anthropicLogger.error(apiCallLog.id, error, {
            model: modelToUse,
            requestSize: prompt.length,
        });

        console.error('[Anthropic generateText] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Anthropic', message: `Streaming error: ${message}`, status: 'failure', timestamp: Date.now() } });
        throw error;
    }
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
  // Must override both aiProvider AND aiModel to avoid passing Claude model to Gemini
  const geminiService = await import('./geminiService');
  return geminiService.analyzeMapMerge(mapsToMerge, {
    ...businessInfo,
    aiProvider: 'gemini',
    aiModel: 'gemini-2.5-pro-preview-06-05' // Use valid Gemini model
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
  // Must override both aiProvider AND aiModel to avoid passing Claude model to Gemini
  const geminiService = await import('./geminiService');
  return geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, {
    ...businessInfo,
    aiProvider: 'gemini',
    aiModel: 'gemini-2.5-pro-preview-06-05' // Use valid Gemini model
  }, dispatch);
};

// ============================================
// BRIEF EDITING FUNCTIONS
// Native Anthropic implementation - respects user's provider choice
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
      service: 'Anthropic',
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
      service: 'Anthropic',
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
      service: 'Anthropic',
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
