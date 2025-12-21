
import { BusinessInfo, SiteInventoryItem, EnrichedTopic, ContentChunk, MigrationDecision, TopicalMap, SEOPillars } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';
import React from 'react';
import { SEMANTIC_CHUNKING_PROMPT, GENERATE_MIGRATION_DECISION_PROMPT } from '../../config/prompts';
import { v4 as uuidv4 } from 'uuid';

export const semanticChunking = async (
    content: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<ContentChunk[]> => {
    const prompt = SEMANTIC_CHUNKING_PROMPT(content, businessInfo);

    // Fallback
    const fallback: ContentChunk[] = [{
        id: uuidv4(),
        content: content.substring(0, 200),
        summary: "Content parsing failed.",
        quality_score: 0,
        tags: []
    }];

    try {
        const result = await dispatchToProvider(businessInfo, {
            gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
            openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
            anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
            perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
            openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
        });
        return Array.isArray(result) ? result : fallback;
    } catch {
        return fallback;
    }
};

export const generateDecisionMatrix = async (
    source: SiteInventoryItem,
    topicalMap: { pillars: SEOPillars; topics: EnrichedTopic[] },
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<MigrationDecision> => {
    const inventoryItem = {
        url: source.url,
        title: source.title,
        content_summary: undefined,
        metrics: {
            word_count: source.word_count,
            gsc_clicks: source.gsc_clicks,
            gsc_impressions: source.gsc_impressions,
            cor_score: source.cor_score
        }
    };

    const prompt = GENERATE_MIGRATION_DECISION_PROMPT(inventoryItem, topicalMap, businessInfo);

    const fallback: MigrationDecision = {
        sourceUrl: source.url,
        targetTopicId: null,
        recommendation: 'KEEP',
        confidence: 50,
        pros: [],
        cons: [],
        reasoning: 'AI Analysis unavailable.'
    };

    try {
        return await dispatchToProvider(businessInfo, {
            gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
            openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
            anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
            perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
            openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
        });
    } catch {
        return fallback;
    }
};

// Future expansion: promoteToCoreTopic, bulkCreateOuterTopics
