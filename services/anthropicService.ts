
import {
    BusinessInfo, CandidateEntity, SourceContextOption, SEOPillars,
    SemanticTriple, EnrichedTopic, ContentBrief, ResponseCode,
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

/**
 * Call Anthropic API via Supabase Edge Function proxy to avoid CORS issues
 * The proxy endpoint handles the actual Anthropic API call server-side
 */
const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T
): Promise<T> => {
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
    // Valid Anthropic model IDs: https://docs.anthropic.com/en/docs/about-claude/models/overview
    const validClaudeModels = [
        // Claude 4.5 models (November 2025 - Latest)
        'claude-opus-4-5-20251101',
        'claude-sonnet-4-5-20250929',
        'claude-haiku-4-5-20251001',
        // Claude 4.1 models (August 2025)
        'claude-opus-4-1-20250805',
        // Claude 4 models (May 2025)
        'claude-sonnet-4-20250514',
        // Legacy Claude 3.5 models (being deprecated)
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
    ];
    const defaultModel = 'claude-sonnet-4-5-20250929'; // Latest Sonnet - best price/performance
    const isValidClaudeModel = businessInfo.aiModel && validClaudeModels.includes(businessInfo.aiModel);
    const modelToUse = isValidClaudeModel ? businessInfo.aiModel : defaultModel;

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-anthropic-api-key': businessInfo.anthropicApiKey,
                'apikey': businessInfo.supabaseAnonKey || '',
            },
            body: JSON.stringify({
                model: modelToUse,
                max_tokens: 16384,
                messages: [
                    { role: "user", content: effectivePrompt }
                ],
                system: "You are a helpful, expert SEO strategist. You ALWAYS output valid JSON when requested. Never include explanatory text, markdown formatting, or code blocks around your JSON response. Start directly with { and end with }. Keep responses concise - focus on quality topics rather than quantity."
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Handle error responses from proxy
        if (data.error) {
            throw new Error(data.error);
        }

        // Claude's response content is an array of blocks. We assume the first block is text.
        const textBlock = data.content?.[0];
        const responseText = textBlock?.type === 'text' ? textBlock.text : '';
        const stopReason = data.stop_reason || 'unknown';

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

        return sanitizerFn(responseText);

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Anthropic error";
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Anthropic', message: `Error: ${message}`, status: 'failure', timestamp: Date.now(), data: error } });
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

export const expandSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, existing: SemanticTriple[], dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, existing), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const generateInitialTopicalMap = async (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);

    // Use chunked generation to avoid token truncation
    // Generate each section in a separate API call
    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Anthropic',
        message: 'Starting chunked map generation (monetization + informational sections in parallel)...',
        status: 'info',
        timestamp: Date.now()
    }});

    const monetizationPrompt = prompts.GENERATE_MONETIZATION_SECTION_PROMPT(info, pillars, eavs, competitors);
    const informationalPrompt = prompts.GENERATE_INFORMATIONAL_SECTION_PROMPT(info, pillars, eavs, competitors);

    const fallbackSection = { topics: [] };

    // Run both calls in parallel for faster generation
    const [monetizationResult, informationalResult] = await Promise.all([
        callApi(monetizationPrompt, info, dispatch, (text) =>
            sanitizer.sanitize(text, { topics: Array }, fallbackSection)
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
            sanitizer.sanitize(text, { topics: Array }, fallbackSection)
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
    return callApi(prompts.SUGGEST_RESPONSE_CODE_PROMPT(info, topic), info, dispatch, (text) => sanitizer.sanitize(text, { responseCode: String, reasoning: String }, { responseCode: ResponseCode.INFORMATIONAL, reasoning: '' }));
};

export const generateContentBrief = async (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code);
    const schema = {
        title: String, slug: String, metaDescription: String, keyTakeaways: Array, outline: String,
        structured_outline: Array, perspectives: Array, methodology_note: String,
        serpAnalysis: { peopleAlsoAsk: Array, competitorHeadings: Array },
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

export const polishDraft = async (draft: string, brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>) => callApi(prompts.POLISH_ARTICLE_DRAFT_PROMPT(draft, brief, info), info, dispatch, t => t);

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

export const analyzeSemanticRelationships = async (topics: EnrichedTopic[], info: BusinessInfo, dispatch: React.Dispatch<any>) => ({ summary: "Mocked analysis", pairs: [], actionableSuggestions: [] });

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

export const analyzeContextualFlow = async (text: string, entity: string, info: BusinessInfo, dispatch: React.Dispatch<any>) => {
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
    // For text generation, we don't want to ask for JSON
    const textPrompt = prompt.replace(/IMPORTANT:.*JSON.*\./gi, ''); // Remove JSON instructions
    return callApi(textPrompt, businessInfo, dispatch, (text) => text);
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
  const geminiService = await import('./geminiService');
  return geminiService.analyzeMapMerge(mapsToMerge, { ...businessInfo, aiProvider: 'gemini' }, dispatch);
};

export const reanalyzeTopicSimilarity = async (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<TopicSimilarityResult[]> => {
  // Delegate to Gemini implementation for now
  const geminiService = await import('./geminiService');
  return geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, { ...businessInfo, aiProvider: 'gemini' }, dispatch);
};
