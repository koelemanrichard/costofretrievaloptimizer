// services/ai/briefRegeneration/passes/linkingBridge.ts
// Pass N+1: Regenerate linking, contextual bridge, and visual semantics

import { BusinessInfo, ContentBrief, EnrichedTopic, SEOPillars, BriefSection } from '../../../../types';
import { AppAction } from '../../../../state/appState';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';
import React from 'react';

export interface LinkingBridgeResult {
  success: boolean;
  linking?: {
    contextualBridge: any;
    discourse_anchors: string[];
    visual_semantics: any[];
  };
  error?: string;
}

const LINKING_BRIDGE_PROMPT = (
  info: BusinessInfo,
  topic: EnrichedTopic,
  sections: BriefSection[],
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[]
): string => `
You are an expert Holistic SEO Strategist finalizing the LINKING and CONTEXTUAL elements of a content brief.

**LANGUAGE: ${info.language || 'English'} | Target Market: ${info.targetMarket || 'Global'}**

## Brief Context
- Title: ${currentBrief.title}
- Section Headings: ${sections.map(s => s.heading).join(' → ')}

## Current Linking Data (may be empty - YOU MUST GENERATE NEW CONTENT)
- Contextual Bridge Links: ${Array.isArray(currentBrief.contextualBridge) ? currentBrief.contextualBridge.length : (currentBrief.contextualBridge?.links?.length || 0)} existing
- Discourse Anchors: ${currentBrief.discourse_anchors?.length || 0} existing
- Visual Semantics: ${currentBrief.visual_semantics?.length || 0} existing

**IMPORTANT:** If any of these counts are 0, you MUST generate new content for those fields. Do not return empty arrays.

## User's Feedback & Instructions
"${userInstructions}"

## SEO Pillars
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}

## Available Topics for Internal Linking
${allTopics.map(t => `- ${t.title} (${t.id})`).slice(0, 30).join('\n')}

## Your Task
Regenerate the contextual bridge, discourse anchors, and visual semantics to complement the updated sections.

Return a JSON object:
{
  "contextualBridge": {
    "type": "section",
    "content": "string (1-2 paragraph bridge connecting to related topics)",
    "links": [
      {
        "targetTopic": "string (topic title from available topics)",
        "anchorText": "string (contextually relevant anchor text)",
        "annotation_text_hint": "string (how to introduce this link)",
        "reasoning": "string (why this link adds value)"
      }
    ]
  },
  "discourse_anchors": [
    "string (discourse marker or transition phrase for coherence)"
  ],
  "visual_semantics": [
    {
      "type": "INFOGRAPHIC | CHART | PHOTO | DIAGRAM",
      "description": "string (what the visual should show)",
      "caption_data": "string (caption with entity attribute enrichment)"
    }
  ]
}

Include 2-4 internal links, 3-5 discourse anchors, and 2-4 visual semantics.
Respond with ONLY valid JSON. No markdown formatting.
`;

/**
 * Regenerate linking and contextual bridge
 */
export async function regenerateLinkingAndBridge(
  businessInfo: BusinessInfo,
  topic: EnrichedTopic,
  sections: BriefSection[],
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<AppAction>
): Promise<LinkingBridgeResult> {
  const prompt = LINKING_BRIDGE_PROMPT(
    businessInfo,
    topic,
    sections,
    currentBrief,
    userInstructions,
    pillars,
    allTopics
  );

  // IMPORTANT: Always provide structure for fallback, but don't rely on current brief
  // if it's empty - the AI should generate new content for these fields
  const contextualBridgeLinks = Array.isArray(currentBrief.contextualBridge)
    ? currentBrief.contextualBridge
    : currentBrief.contextualBridge?.links || [];
  const fallback = {
    contextualBridge: (contextualBridgeLinks.length > 0)
      ? currentBrief.contextualBridge
      : { type: 'section', content: '', links: [] },
    discourse_anchors: (currentBrief.discourse_anchors?.length > 0)
      ? currentBrief.discourse_anchors
      : [],
    visual_semantics: (currentBrief.visual_semantics?.length > 0)
      ? currentBrief.visual_semantics
      : []
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

    // Validate the result
    const contextualBridge = result.contextualBridge && typeof result.contextualBridge === 'object'
      ? result.contextualBridge
      : fallback.contextualBridge;

    const discourse_anchors = Array.isArray(result.discourse_anchors)
      ? result.discourse_anchors.filter((d: any) => typeof d === 'string')
      : fallback.discourse_anchors;

    const visual_semantics = Array.isArray(result.visual_semantics)
      ? result.visual_semantics.filter((v: any) => v && typeof v === 'object')
      : fallback.visual_semantics;

    return {
      success: true,
      linking: {
        contextualBridge,
        discourse_anchors,
        visual_semantics
      }
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `Linking & Bridge pass failed: ${message}`,
        status: 'warning',
        timestamp: Date.now()
      }
    });

    // Return original values on failure (soft failure)
    return {
      success: false,
      linking: fallback,
      error: message
    };
  }
}
