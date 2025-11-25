
import { BusinessInfo, EnrichedTopic, MergeSuggestion, KnowledgeGraph } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { AppAction } from '../../state/appState';
import React from 'react';

export const findMergeOpportunities = (
    topics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<MergeSuggestion[]> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.findMergeOpportunities(topics, businessInfo, dispatch);
        case 'anthropic': return anthropicService.findMergeOpportunities(topics, businessInfo, dispatch);
        case 'perplexity': return perplexityService.findMergeOpportunities(topics, businessInfo, dispatch);
        case 'openrouter': return openRouterService.findMergeOpportunities(topics, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.findMergeOpportunities(topics, businessInfo, dispatch);
    }
};

export const findMergeOpportunitiesForSelection = (
    businessInfo: BusinessInfo, selectedTopics: EnrichedTopic[], dispatch: React.Dispatch<AppAction>
): Promise<MergeSuggestion> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch);
        case 'anthropic': return anthropicService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch);
        case 'perplexity': return perplexityService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch);
        case 'openrouter': return openRouterService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch);
        case 'gemini':
        default:
            return geminiService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch);
    }
};

export const findLinkingOpportunitiesForTopic = (
    targetTopic: EnrichedTopic, allTopics: EnrichedTopic[], knowledgeGraph: KnowledgeGraph, businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>
): Promise<any[]> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch);
        case 'anthropic': return anthropicService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch);
        case 'perplexity': return perplexityService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch);
        case 'openrouter': return openRouterService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch);
    }
};
