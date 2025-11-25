
// services/ai/mapGeneration.ts
import { BusinessInfo, CandidateEntity, SourceContextOption, SEOPillars, SemanticTriple, EnrichedTopic, KnowledgeGraph, ExpansionMode, TopicViabilityResult, TopicBlueprint } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { AppAction } from '../../state/appState';
import React from 'react';

export const suggestCentralEntityCandidates = (
    businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<CandidateEntity[]> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.suggestCentralEntityCandidates(businessInfo, dispatch);
        case 'anthropic': return anthropicService.suggestCentralEntityCandidates(businessInfo, dispatch);
        case 'perplexity': return perplexityService.suggestCentralEntityCandidates(businessInfo, dispatch);
        case 'openrouter': return openRouterService.suggestCentralEntityCandidates(businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.suggestCentralEntityCandidates(businessInfo, dispatch);
    }
};

export const suggestSourceContextOptions = (
    businessInfo: BusinessInfo, centralEntity: string, dispatch: React.Dispatch<any>
): Promise<SourceContextOption[]> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch);
        case 'anthropic': return anthropicService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch);
        case 'perplexity': return perplexityService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch);
        case 'openrouter': return openRouterService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch);
        case 'gemini':
        default:
            return geminiService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch);
    }
};

export const suggestCentralSearchIntent = (
    businessInfo: BusinessInfo, centralEntity: string, sourceContext: string, dispatch: React.Dispatch<any>
): Promise<{ intent: string, reasoning: string }> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch);
        case 'anthropic': return anthropicService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch);
        case 'perplexity': return perplexityService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch);
        case 'openrouter': return openRouterService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch);
        case 'gemini':
        default:
            return geminiService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch);
    }
};

export const discoverCoreSemanticTriples = (
    businessInfo: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>
): Promise<SemanticTriple[]> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch);
        case 'anthropic': return anthropicService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch);
        case 'perplexity': return perplexityService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch);
        case 'openrouter': return openRouterService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch);
        case 'gemini':
        default:
            return geminiService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch);
    }
};

export const expandSemanticTriples = (
    businessInfo: BusinessInfo, pillars: SEOPillars, existingTriples: SemanticTriple[], dispatch: React.Dispatch<any>
): Promise<SemanticTriple[]> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch);
        case 'anthropic': return anthropicService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch);
        case 'perplexity': return perplexityService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch);
        case 'openrouter': return openRouterService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch);
        case 'gemini':
        default:
            return geminiService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch);
    }
};

export const generateInitialTopicalMap = (
    businessInfo: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>
): Promise<{ coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[] }> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch);
        case 'anthropic': return anthropicService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch);
        case 'perplexity': return perplexityService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch);
        case 'openrouter': return openRouterService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch);
        case 'gemini':
        default:
            return geminiService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch);
    }
};

export const addTopicIntelligently = (
    newTopicTitle: string, newTopicDescription: string, allTopics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>
): Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }> => {
    // Cast the generic string return types to the specific union types required by the interface
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>;
        case 'anthropic': return anthropicService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>;
        case 'perplexity': return perplexityService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>;
        case 'openrouter': return openRouterService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>;
        case 'gemini':
        default:
            return geminiService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch);
    }
};

export const expandCoreTopic = (
    businessInfo: BusinessInfo, pillars: SEOPillars, coreTopicToExpand: EnrichedTopic, allTopics: EnrichedTopic[], knowledgeGraph: KnowledgeGraph, dispatch: React.Dispatch<AppAction>, mode: ExpansionMode = 'CONTEXT', userContext?: string
): Promise<{title: string, description: string}[]> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext);
        case 'anthropic': return anthropicService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext);
        case 'perplexity': return perplexityService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext);
        case 'openrouter': return openRouterService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext);
        case 'gemini':
        default:
            return geminiService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext);
    }
};

export const analyzeTopicViability = (
    topic: string, description: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>
): Promise<TopicViabilityResult> => {
    // Cast the generic string return types to the specific union types required by the interface
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>;
        case 'anthropic': return anthropicService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>;
        case 'perplexity': return perplexityService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>;
        case 'openrouter': return openRouterService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>;
        case 'gemini':
        default:
            return geminiService.analyzeTopicViability(topic, description, businessInfo, dispatch);
    }
};

export const generateCoreTopicSuggestions = (
    userThoughts: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<{ title: string, description: string, reasoning: string }[]> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch);
        case 'anthropic': return anthropicService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch);
        case 'perplexity': return perplexityService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch);
        case 'openrouter': return openRouterService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch);
    }
};

export const generateStructuredTopicSuggestions = (
    userThoughts: string,
    existingCoreTopics: { title: string, id: string }[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ title: string, description: string, type: 'core' | 'outer', suggestedParent: string }[]> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch);
        case 'anthropic': return anthropicService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch);
        case 'perplexity': return perplexityService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch);
        case 'openrouter': return openRouterService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch);
    }
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
    topical_border_note: string,
    planned_publication_date: string
}[]> => {
    
    // 1. Call AI for semantic data
    let aiResults;
    switch (businessInfo.aiProvider) {
        case 'openai': 
            aiResults = await openAiService.enrichTopicMetadata(topics, businessInfo, dispatch); break;
        case 'anthropic': 
            aiResults = await anthropicService.enrichTopicMetadata(topics, businessInfo, dispatch); break;
        case 'perplexity': 
            aiResults = await perplexityService.enrichTopicMetadata(topics, businessInfo, dispatch); break;
        case 'openrouter': 
            aiResults = await openRouterService.enrichTopicMetadata(topics, businessInfo, dispatch); break;
        case 'gemini':
        default:
            aiResults = await geminiService.enrichTopicMetadata(topics, businessInfo, dispatch); break;
    }

    // 2. Apply Momentum Algorithm for Publication Dates
    // Logic: Start 3 days from now, space items by 3 days.
    // This prevents "date clumping" and simulates a content calendar.
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 3); // Start 3 days out

    const enrichedWithDates = aiResults.map((item: any, index: number) => {
        const pubDate = new Date(baseDate);
        pubDate.setDate(baseDate.getDate() + (index * 3)); // 3-day spacing
        return {
            ...item,
            planned_publication_date: pubDate.toISOString().split('T')[0] // YYYY-MM-DD
        };
    });

    return enrichedWithDates;
};

export const generateTopicBlueprints = (
    topics: { title: string, id: string }[],
    businessInfo: BusinessInfo,
    pillars: SEOPillars,
    dispatch: React.Dispatch<any>
): Promise<{ id: string, blueprint: TopicBlueprint }[]> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch);
        case 'anthropic': return anthropicService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch);
        case 'perplexity': return perplexityService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch);
        case 'openrouter': return openRouterService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch);
        case 'gemini':
        default:
            return geminiService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch);
    }
};
