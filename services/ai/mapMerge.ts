import {
  BusinessInfo,
  TopicalMap,
  MapMergeAnalysis,
  TopicSimilarityResult,
  TopicMergeDecision,
  EnrichedTopic,
} from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { AppAction } from '../../state/appState';
import React from 'react';

/**
 * Analyze multiple maps for merge, returning recommendations for
 * context alignment, EAV consolidation, and topic matching.
 */
export const analyzeMapMerge = (
  mapsToMerge: TopicalMap[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<MapMergeAnalysis> => {
  switch (businessInfo.aiProvider) {
    case 'openai':
      return openAiService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'anthropic':
      return anthropicService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'perplexity':
      return perplexityService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'openrouter':
      return openRouterService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'gemini':
    default:
      return geminiService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
  }
};

/**
 * Re-analyze specific topics after user makes changes.
 * Used when user modifies decisions and wants fresh AI suggestions.
 */
export const reanalyzeTopicSimilarity = (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<TopicSimilarityResult[]> => {
  switch (businessInfo.aiProvider) {
    case 'openai':
      return openAiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'anthropic':
      return anthropicService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'perplexity':
      return perplexityService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'openrouter':
      return openRouterService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'gemini':
    default:
      return geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
  }
};
