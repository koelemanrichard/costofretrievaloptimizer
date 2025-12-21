// services/ai/briefRegeneration/passes/metaStrategy.ts
// Pass 1: Regenerate meta information and strategy

import { BusinessInfo, ContentBrief, EnrichedTopic, SEOPillars } from '../../../../types';
import { AppAction } from '../../../../state/appState';
import { AIResponseSanitizer } from '../../../aiResponseSanitizer';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';
import React from 'react';

export interface MetaStrategyResult {
  success: boolean;
  meta?: {
    title: string;
    slug: string;
    metaDescription: string;
    keyTakeaways: string[];
    perspectives: string[];
    methodology_note?: string;
    predicted_user_journey?: string;
    query_type_format?: string;
    featured_snippet_target?: any;
  };
  error?: string;
}

const META_STRATEGY_PROMPT = (
  info: BusinessInfo,
  topic: EnrichedTopic,
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars
): string => `
You are an expert Holistic SEO Strategist updating the META information of a content brief.

**LANGUAGE: ${info.language || 'English'} | Target Market: ${info.targetMarket || 'Global'}**

## Current Meta Information
- Title: ${currentBrief.title}
- Slug: ${currentBrief.slug}
- Meta Description: ${currentBrief.metaDescription}
- Key Takeaways: ${JSON.stringify(currentBrief.keyTakeaways || [])}
- Perspectives: ${JSON.stringify(currentBrief.perspectives || [])}

## User's Feedback & Instructions
"${userInstructions}"

## SEO Pillars
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

## Business Context
- Domain: ${info.domain}
- Industry: ${info.industry}
- Target Audience: ${info.audience}

## Your Task
Regenerate ONLY the meta information based on user feedback. Keep all content in ${info.language || 'English'}.

Return a JSON object with these fields:
{
  "title": "string (optimized title following Central Entity focus)",
  "slug": "string (URL-safe slug)",
  "metaDescription": "string (155 chars max, compelling for CTR)",
  "keyTakeaways": ["string", "string", "string"] (3-5 key points),
  "perspectives": ["string"] (unique angles/perspectives),
  "methodology_note": "string (overall methodology guidance)",
  "predicted_user_journey": "string",
  "query_type_format": "string",
  "featured_snippet_target": {
    "question": "string",
    "answer_target_length": number,
    "required_predicates": ["string"],
    "target_type": "PARAGRAPH | LIST | TABLE"
  }
}

Respond with ONLY valid JSON. No markdown formatting.
`;

/**
 * Regenerate meta information and strategy
 */
export async function regenerateMetaAndStrategy(
  businessInfo: BusinessInfo,
  topic: EnrichedTopic,
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  dispatch: React.Dispatch<AppAction>
): Promise<MetaStrategyResult> {
  const prompt = META_STRATEGY_PROMPT(businessInfo, topic, currentBrief, userInstructions, pillars);
  const sanitizer = new AIResponseSanitizer(dispatch);

  const schema = {
    title: String,
    slug: String,
    metaDescription: String,
    keyTakeaways: Array,
    perspectives: Array,
    methodology_note: String,
    predicted_user_journey: String,
    query_type_format: String,
    featured_snippet_target: Object
  };

  const fallback = {
    title: currentBrief.title,
    slug: currentBrief.slug,
    metaDescription: currentBrief.metaDescription || '',
    keyTakeaways: currentBrief.keyTakeaways || [],
    perspectives: currentBrief.perspectives || [],
    methodology_note: currentBrief.methodology_note,
    predicted_user_journey: currentBrief.predicted_user_journey,
    query_type_format: currentBrief.query_type_format,
    featured_snippet_target: currentBrief.featured_snippet_target
  };

  try {
    // Call the appropriate provider
    const result = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
    });

    return {
      success: true,
      meta: {
        title: result.title || fallback.title,
        slug: result.slug || fallback.slug,
        metaDescription: result.metaDescription || fallback.metaDescription,
        keyTakeaways: Array.isArray(result.keyTakeaways) ? result.keyTakeaways : fallback.keyTakeaways,
        perspectives: Array.isArray(result.perspectives) ? result.perspectives : fallback.perspectives,
        methodology_note: result.methodology_note || fallback.methodology_note,
        predicted_user_journey: result.predicted_user_journey || fallback.predicted_user_journey,
        query_type_format: result.query_type_format || fallback.query_type_format,
        featured_snippet_target: result.featured_snippet_target || fallback.featured_snippet_target
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `Meta & Strategy pass failed: ${message}. Using original values.`,
        status: 'warning',
        timestamp: Date.now()
      }
    });

    // Return original values on failure
    return {
      success: true, // Soft failure - return original
      meta: fallback
    };
  }
}
