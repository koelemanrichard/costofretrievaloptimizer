/**
 * AI-Inferred SERP Analysis Service
 *
 * Provides fast-track SERP analysis using AI inference instead of actual API calls.
 * Used when:
 * - Exploring many topics quickly
 * - Initial prioritization
 * - Budget-constrained analysis
 * - DataForSEO credentials not available
 */

import { BusinessInfo } from '../../types';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as perplexityService from '../perplexityService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as openRouterService from '../openRouterService';
import { cacheService } from '../cacheService';
import React from 'react';

// Dummy dispatch for caching scenarios where we don't have a real dispatch
const noopDispatch: React.Dispatch<any> = () => {};

/**
 * Inferred SERP data from AI analysis
 */
export interface InferredSerpData {
  mode: 'inferred';
  confidence: number; // 0-1, how confident the AI is in this inference

  // Query analysis
  query: string;
  dominantIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  dominantContentType: 'guide' | 'listicle' | 'product' | 'comparison' | 'how-to' | 'faq' | 'news' | 'review';

  // Estimated SERP characteristics
  estimatedTopDomains: string[];
  estimatedHeadlinePatterns: string[];
  estimatedWordCount: { min: number; max: number; avg: number };

  // Likely SERP features
  likelyFeatures: {
    featuredSnippet: { likely: boolean; type?: 'paragraph' | 'list' | 'table' };
    peopleAlsoAsk: { likely: boolean; estimatedQuestions: string[] };
    imagesPack: boolean;
    videoCarousel: boolean;
    localPack: boolean;
    knowledgePanel: boolean;
    reviews: boolean;
    faq: boolean;
  };

  // For fast-track gap analysis
  estimatedRequirements: {
    schemaTypes: string[];
    contentElements: string[];
    authoritySignals: string[];
    minWordCount: number;
    recommendedStructure: string[];
  };

  // Competitive landscape estimation
  competitiveLandscape: {
    difficulty: 'easy' | 'medium' | 'hard';
    difficultyScore: number; // 0-100
    dominantPlayerType: 'big-brands' | 'niche-sites' | 'mixed' | 'publishers';
    opportunities: string[];
  };

  inferredAt: Date;
}

/**
 * Prompt for AI to infer SERP characteristics
 */
const buildSerpInferencePrompt = (
  topic: string,
  businessType: string,
  targetMarket: string
): string => `You are an expert SEO analyst. Based on your knowledge of search engine behavior and content patterns, infer what the Google SERP (Search Engine Results Page) would look like for this query.

QUERY: "${topic}"
BUSINESS CONTEXT: ${businessType}
TARGET MARKET: ${targetMarket}

Analyze this query and provide your best inference of the SERP characteristics. Base your analysis on:
- Typical search patterns for this type of query
- Common content formats that rank for similar queries
- Known SERP feature triggers
- Competitive landscape patterns

Return a JSON object with this exact structure:
{
  "confidence": 0.8,
  "dominantIntent": "informational",
  "dominantContentType": "guide",
  "estimatedTopDomains": ["example1.com", "example2.com", "example3.com"],
  "estimatedHeadlinePatterns": [
    "What is [topic]: Complete Guide",
    "[Number] Best [topic] in 2024",
    "How to [topic]: Step-by-Step"
  ],
  "estimatedWordCount": { "min": 1500, "max": 3000, "avg": 2200 },
  "likelyFeatures": {
    "featuredSnippet": { "likely": true, "type": "paragraph" },
    "peopleAlsoAsk": { "likely": true, "estimatedQuestions": ["Question 1?", "Question 2?", "Question 3?"] },
    "imagesPack": false,
    "videoCarousel": false,
    "localPack": false,
    "knowledgePanel": false,
    "reviews": false,
    "faq": true
  },
  "estimatedRequirements": {
    "schemaTypes": ["Article", "FAQPage"],
    "contentElements": ["definition", "examples", "step-by-step", "comparison table"],
    "authoritySignals": ["expert author", "citations", "updated date"],
    "minWordCount": 1500,
    "recommendedStructure": ["Introduction", "What is X", "How X works", "Benefits", "Examples", "FAQ", "Conclusion"]
  },
  "competitiveLandscape": {
    "difficulty": "medium",
    "difficultyScore": 55,
    "dominantPlayerType": "niche-sites",
    "opportunities": ["Missing FAQ schema", "No video content", "Outdated competitor content"]
  }
}

IMPORTANT:
- Be realistic based on actual search behavior patterns
- Adjust difficulty based on commercial value and competition
- Consider the business context when estimating requirements
- Provide actionable opportunities in the competitive landscape

Return ONLY the JSON object, no additional text.`;

/**
 * Sanitize JSON response - extract JSON from markdown code blocks if present
 */
function sanitizeJsonResponse(response: string): string {
  let text = response.trim();

  // Remove markdown code block wrapper if present
  if (text.startsWith('```json')) {
    text = text.slice(7);
  } else if (text.startsWith('```')) {
    text = text.slice(3);
  }

  if (text.endsWith('```')) {
    text = text.slice(0, -3);
  }

  return text.trim();
}

/**
 * Parse AI response into InferredSerpData
 */
function parseInferredSerpResponse(response: string, query: string): InferredSerpData {
  try {
    const sanitized = sanitizeJsonResponse(response);
    const parsed = JSON.parse(sanitized);

    return {
      mode: 'inferred',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      query,
      dominantIntent: parsed.dominantIntent || 'informational',
      dominantContentType: parsed.dominantContentType || 'guide',
      estimatedTopDomains: Array.isArray(parsed.estimatedTopDomains)
        ? parsed.estimatedTopDomains.slice(0, 10)
        : [],
      estimatedHeadlinePatterns: Array.isArray(parsed.estimatedHeadlinePatterns)
        ? parsed.estimatedHeadlinePatterns.slice(0, 5)
        : [],
      estimatedWordCount: {
        min: parsed.estimatedWordCount?.min || 1000,
        max: parsed.estimatedWordCount?.max || 3000,
        avg: parsed.estimatedWordCount?.avg || 2000
      },
      likelyFeatures: {
        featuredSnippet: parsed.likelyFeatures?.featuredSnippet || { likely: false },
        peopleAlsoAsk: parsed.likelyFeatures?.peopleAlsoAsk || { likely: false, estimatedQuestions: [] },
        imagesPack: parsed.likelyFeatures?.imagesPack || false,
        videoCarousel: parsed.likelyFeatures?.videoCarousel || false,
        localPack: parsed.likelyFeatures?.localPack || false,
        knowledgePanel: parsed.likelyFeatures?.knowledgePanel || false,
        reviews: parsed.likelyFeatures?.reviews || false,
        faq: parsed.likelyFeatures?.faq || false
      },
      estimatedRequirements: {
        schemaTypes: Array.isArray(parsed.estimatedRequirements?.schemaTypes)
          ? parsed.estimatedRequirements.schemaTypes
          : ['Article'],
        contentElements: Array.isArray(parsed.estimatedRequirements?.contentElements)
          ? parsed.estimatedRequirements.contentElements
          : [],
        authoritySignals: Array.isArray(parsed.estimatedRequirements?.authoritySignals)
          ? parsed.estimatedRequirements.authoritySignals
          : [],
        minWordCount: parsed.estimatedRequirements?.minWordCount || 1500,
        recommendedStructure: Array.isArray(parsed.estimatedRequirements?.recommendedStructure)
          ? parsed.estimatedRequirements.recommendedStructure
          : []
      },
      competitiveLandscape: {
        difficulty: parsed.competitiveLandscape?.difficulty || 'medium',
        difficultyScore: parsed.competitiveLandscape?.difficultyScore || 50,
        dominantPlayerType: parsed.competitiveLandscape?.dominantPlayerType || 'mixed',
        opportunities: Array.isArray(parsed.competitiveLandscape?.opportunities)
          ? parsed.competitiveLandscape.opportunities
          : []
      },
      inferredAt: new Date()
    };
  } catch (error) {
    console.error('Failed to parse SERP inference response:', error);
    // Return a default inference
    return createDefaultInference(query);
  }
}

/**
 * Create default inference when parsing fails
 */
function createDefaultInference(query: string): InferredSerpData {
  return {
    mode: 'inferred',
    confidence: 0.3,
    query,
    dominantIntent: 'informational',
    dominantContentType: 'guide',
    estimatedTopDomains: [],
    estimatedHeadlinePatterns: [],
    estimatedWordCount: { min: 1000, max: 2500, avg: 1750 },
    likelyFeatures: {
      featuredSnippet: { likely: false },
      peopleAlsoAsk: { likely: true, estimatedQuestions: [] },
      imagesPack: false,
      videoCarousel: false,
      localPack: false,
      knowledgePanel: false,
      reviews: false,
      faq: false
    },
    estimatedRequirements: {
      schemaTypes: ['Article'],
      contentElements: ['introduction', 'main content', 'conclusion'],
      authoritySignals: [],
      minWordCount: 1500,
      recommendedStructure: []
    },
    competitiveLandscape: {
      difficulty: 'medium',
      difficultyScore: 50,
      dominantPlayerType: 'mixed',
      opportunities: []
    },
    inferredAt: new Date()
  };
}

/**
 * Infer SERP data using AI
 *
 * @param topic - The search query/topic to analyze
 * @param businessInfo - Business context for AI provider selection
 * @param dispatch - Optional dispatch for logging (uses noop if not provided)
 * @returns Inferred SERP data
 */
export async function inferSerpData(
  topic: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any> = noopDispatch
): Promise<InferredSerpData> {
  const fetchFn = async (): Promise<InferredSerpData> => {
    const prompt = buildSerpInferencePrompt(
      topic,
      businessInfo.industry || 'general business',
      businessInfo.targetMarket || 'United States'
    );

    const response = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
      perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
      openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch)
    });

    return parseInferredSerpResponse(response, topic);
  };

  // Cache inferred SERP data for 7 days (same as real SERP data)
  return cacheService.cacheThrough(
    'serp:inferred',
    { topic, targetMarket: businessInfo.targetMarket, language: businessInfo.language },
    fetchFn,
    604800 // 7 days
  );
}

/**
 * Batch infer SERP data for multiple topics
 *
 * @param topics - Array of topics to analyze
 * @param businessInfo - Business context
 * @param onProgress - Optional progress callback
 * @returns Map of topic to inferred data
 */
export async function batchInferSerpData(
  topics: string[],
  businessInfo: BusinessInfo,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, InferredSerpData>> {
  const results = new Map<string, InferredSerpData>();

  for (let i = 0; i < topics.length; i++) {
    try {
      const data = await inferSerpData(topics[i], businessInfo);
      results.set(topics[i], data);
    } catch (error) {
      console.error(`Failed to infer SERP data for "${topics[i]}":`, error);
      results.set(topics[i], createDefaultInference(topics[i]));
    }

    if (onProgress) {
      onProgress(i + 1, topics.length);
    }

    // Small delay to avoid rate limiting
    if (i < topics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
