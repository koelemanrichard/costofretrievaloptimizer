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
import { dispatchToProvider } from './providerDispatcher';
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
  return dispatchToProvider(businessInfo, {
    gemini: () => geminiService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch),
    openai: () => openAiService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch),
    anthropic: () => anthropicService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch),
    perplexity: () => perplexityService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch),
    openrouter: () => openRouterService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch),
  });
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
  return dispatchToProvider(businessInfo, {
    gemini: () => geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch),
    openai: () => openAiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch),
    anthropic: () => anthropicService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch),
    perplexity: () => perplexityService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch),
    openrouter: () => openRouterService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch),
  });
};
