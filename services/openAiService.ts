
import OpenAI from 'openai';
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

const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    isJson: boolean = true
): Promise<T> => {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'OpenAI', message: `Sending request to ${businessInfo.aiModel}...`, status: 'info', timestamp: Date.now() } });

    if (!businessInfo.openAiApiKey) {
        throw new Error("OpenAI API key is not configured.");
    }

    const openai = new OpenAI({
        apiKey: businessInfo.openAiApiKey,
        dangerouslyAllowBrowser: true // Client-side usage
    });

    // Valid OpenAI model IDs: https://platform.openai.com/docs/models
    const validOpenAIModels = [
        // GPT-5 series (Latest - 2025)
        'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
        // GPT-4.1 series (April 2025)
        'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
        // O-series reasoning models
        'o3', 'o4-mini', 'o4-mini-high',
        // Legacy GPT-4o (still supported)
        'gpt-4o', 'gpt-4o-mini',
    ];
    const defaultModel = 'gpt-5.1'; // Latest flagship model
    const isValidModel = businessInfo.aiModel && validOpenAIModels.includes(businessInfo.aiModel);
    const modelToUse = isValidModel ? businessInfo.aiModel : defaultModel;

    try {
        const completion = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
                { role: "system", content: "You are a helpful, expert SEO strategist and content architect. You output strict JSON when requested." },
                { role: "user", content: prompt }
            ],
            response_format: isJson ? { type: "json_object" } : undefined,
        });

        const responseText = completion.choices[0].message.content || '';
        
        dispatch({ type: 'LOG_EVENT', payload: { service: 'OpenAI', message: `Received response.`, status: 'info', timestamp: Date.now() } });
        
        return sanitizerFn(responseText);

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown OpenAI error";
        dispatch({ type: 'LOG_EVENT', payload: { service: 'OpenAI', message: `Error: ${message}`, status: 'failure', timestamp: Date.now(), data: error } });
        throw new Error(`OpenAI API Call Failed: ${message}`);
    }
};

// --- Implemented Functions ---

export const suggestCentralEntityCandidates = async (info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<CandidateEntity[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT(info), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const suggestSourceContextOptions = async (info: BusinessInfo, entity: string, dispatch: React.Dispatch<any>): Promise<SourceContextOption[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT(info, entity), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const suggestCentralSearchIntent = async (info: BusinessInfo, entity: string, context: string, dispatch: React.Dispatch<any>): Promise<{ intent: string, reasoning: string }[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT(info, entity, context), info, dispatch, (text) => sanitizer.sanitizeArray<{ intent: string, reasoning: string }>(text, []));
};

export const discoverCoreSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT(info, pillars), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const expandSemanticTriples = async (info: BusinessInfo, pillars: SEOPillars, existing: SemanticTriple[], dispatch: React.Dispatch<any>): Promise<SemanticTriple[]> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    return callApi(prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(info, pillars, existing), info, dispatch, (text) => sanitizer.sanitizeArray(text, []));
};

export const generateInitialTopicalMap = async (info: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>): Promise<{ coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[] }> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_INITIAL_TOPICAL_MAP_PROMPT(info, pillars, eavs, competitors);
    
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
    info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code);
    
    // Define expected schema for sanitizer (mirroring Gemini schema but for sanitizer consumption)
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

export const generateArticleDraft = async (brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    return callApi(prompts.GENERATE_ARTICLE_DRAFT_PROMPT(brief, info), info, dispatch, (text) => text, false);
};

export const polishDraft = async (draft: string, brief: ContentBrief, info: BusinessInfo, dispatch: React.Dispatch<any>): Promise<string> => {
    return callApi(prompts.POLISH_ARTICLE_DRAFT_PROMPT(draft, brief, info), info, dispatch, (text) => text, false);
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
    return Promise.resolve({ summary: "Mocked analysis (OpenAI)", pairs: [], actionableSuggestions: [] });
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
