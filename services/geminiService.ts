
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
  ContextualFlowIssue
} from '../types';
import * as prompts from '../config/prompts';
import { CONTENT_BRIEF_SCHEMA, CONTENT_BRIEF_FALLBACK } from '../config/schemas';
import { AIResponseSanitizer } from './aiResponseSanitizer';
import { KnowledgeGraph } from "../lib/knowledgeGraph";
import { AppAction } from "../state/appState";
import React from "react";
import { v4 as uuidv4 } from 'uuid';

// Valid Gemini models (November 2025 - Latest)
const validGeminiModels = [
    // Gemini 3 series (Latest - November 2025)
    'gemini-3-pro-preview',   // Latest flagship - RECOMMENDED DEFAULT
    // Gemini 2.5 series (Stable - 2025)
    'gemini-2.5-flash',       // Fast, cost-effective
    'gemini-2.5-pro',         // Advanced reasoning
    'gemini-2.5-flash-lite',  // Lightweight variant
    // Gemini 2.0 series (Still supported)
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    // Legacy 1.5 models (being deprecated)
    'gemini-1.5-flash',
    'gemini-1.5-pro',
];

// Default to gemini-3-pro-preview as the latest flagship model
const GEMINI_DEFAULT_MODEL = 'gemini-3-pro-preview';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

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
    responseSchema?: any 
): Promise<T> => {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `Sending request...`, status: 'info', timestamp: Date.now(), data: { model: businessInfo.aiModel, prompt: prompt.substring(0, 200) + '...' } } });
    
    const apiKey = businessInfo.geminiApiKey;
    if (!apiKey) {
        const errorMsg = "Gemini API key is not configured. Please set it in the application settings.";
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: errorMsg, status: 'failure', timestamp: Date.now() } });
        throw new Error(errorMsg);
    }
    
    const ai = getAi(apiKey);
    
    try {
        const config: any = {};
        if (isJson) config.responseMimeType = "application/json";
        if (responseSchema) config.responseSchema = responseSchema;

        // Strictly format contents as per SDK requirements
        const contents = [{
            role: 'user',
            parts: [{ text: prompt }]
        }];

        // Validate and use the appropriate model, pass dispatch for logging
        const validatedModel = validateModel(businessInfo.aiModel, dispatch);

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: validatedModel,
            contents: contents,
            config: Object.keys(config).length > 0 ? config : undefined,
        });
        
        const responseText = response.text;
        
        if (!responseText) {
          throw new Error("Received an empty response from the Gemini API.");
        }
        
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message: `Received response. Sanitizing...`, status: 'info', timestamp: Date.now(), data: { response: responseText.substring(0, 200) + '...' } } });
        
        return sanitizerFn(responseText);

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred with the Gemini API.";
        dispatch({ type: 'LOG_EVENT', payload: { service: 'Gemini', message, status: 'failure', timestamp: Date.now(), data: error } });
        throw new Error(`Gemini API Call Failed: ${message}`);
    }
};


export const suggestCentralEntityCandidates = async (businessInfo: BusinessInfo, dispatch: React.Dispatch<any>): Promise<CandidateEntity[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT(businessInfo);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<CandidateEntity>(text, []));
};

export const suggestSourceContextOptions = async (businessInfo: BusinessInfo, centralEntity: string, dispatch: React.Dispatch<any>): Promise<SourceContextOption[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT(businessInfo, centralEntity);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<SourceContextOption>(text, []));
};

export const suggestCentralSearchIntent = async (businessInfo: BusinessInfo, centralEntity: string, sourceContext: string, dispatch: React.Dispatch<any>): Promise<{ intent: string, reasoning: string }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT(businessInfo, centralEntity, sourceContext);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<{ intent: string, reasoning: string }>(text, []));
};

export const discoverCoreSemanticTriples = async (businessInfo: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT(businessInfo, pillars);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<SemanticTriple>(text, []));
};

export const expandSemanticTriples = async (businessInfo: BusinessInfo, pillars: SEOPillars, existingTriples: SemanticTriple[], dispatch: React.Dispatch<any>): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(businessInfo, pillars, existingTriples);
    return callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitizeArray<SemanticTriple>(text, []));
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

    const result = await callApi(prompt, businessInfo, dispatch, (text) => sanitizer.sanitize(text, sanitizerSchema, fallback), true, apiSchema);

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
        structured_outline: Array, // New field
        perspectives: Array, // New field
        methodology_note: String, // New field
        serpAnalysis: {
            peopleAlsoAsk: Array,
            competitorHeadings: Array,
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
        predicted_user_journey: String
    };
    
    return callApi(
        prompt, 
        businessInfo, 
        dispatch, 
        (text) => sanitizer.sanitize(text, sanitizerSchema, CONTENT_BRIEF_FALLBACK), 
        true, 
        CONTENT_BRIEF_SCHEMA
    );
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
    return callApi(prompt, businessInfo, dispatch, (text) => text, false);
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
    return Promise.resolve({ summary: "Mocked: Analysis shows strong clustering around core topics.", pairs: [], actionableSuggestions: ["Consider creating a glossary page."] });
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

/**
 * Classifies topics into Core Section (monetization) or Author Section (informational)
 */
export const classifyTopicSections = async (
    topics: { id: string, title: string, description: string, type?: string, parent_topic_id?: string | null }[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ id: string, topic_class: 'monetization' | 'informational', suggestedType?: 'core' | 'outer' | null, suggestedParentTitle?: string | null, typeChangeReason?: string | null }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.CLASSIFY_TOPIC_SECTIONS_PROMPT(businessInfo, topics);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Classifying ${topics.length} topics into Core/Author sections and verifying hierarchy types...`,
        status: 'info',
        timestamp: Date.now()
    }});

    const result = await callApi(
        prompt,
        businessInfo,
        dispatch,
        (text) => sanitizer.sanitizeArray(text, []),
        false
    );

    // Validate and filter results
    const validResults = result.filter((item: any) =>
        item.id && (item.topic_class === 'monetization' || item.topic_class === 'informational')
    );

    // Count type changes
    const typeChanges = validResults.filter((r: any) => r.suggestedType && r.suggestedType !== null);

    dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Gemini',
        message: `Classification complete. Monetization: ${validResults.filter((r: any) => r.topic_class === 'monetization').length}, Informational: ${validResults.filter((r: any) => r.topic_class === 'informational').length}, Type changes suggested: ${typeChanges.length}`,
        status: 'info',
        timestamp: Date.now()
    }});

    return validResults;
};
