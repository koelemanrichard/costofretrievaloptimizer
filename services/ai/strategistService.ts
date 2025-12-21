
import { BusinessInfo, TopicalMap, EnrichedTopic, AppStep } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';
import React from 'react';

interface StrategistContext {
    appStep: AppStep;
    viewMode: 'CREATION' | 'MIGRATION';
    activeMap?: TopicalMap;
    activeTopic?: EnrichedTopic;
    userQuery: string;
}

export const askStrategist = async (
    context: StrategistContext,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    const { appStep, viewMode, activeMap, activeTopic, userQuery } = context;

    // Construct a context-aware prompt
    let systemContext = `You are "The Strategist", an elite Holistic SEO consultant built into this software workbench.
    Your goal is to guide the user in building a high-authority topical map.
    Be concise, actionable, and strategic. Do not be generic.
    
    Current Application State:
    - Step: ${AppStep[appStep]}
    - Mode: ${viewMode}
    `;

    if (activeMap) {
        systemContext += `
        Active Map: "${activeMap.name}"
        - Pillars: ${JSON.stringify(activeMap.pillars)}
        - Topics Count: ${activeMap.topics?.length || 0}
        `;
    }

    if (activeTopic) {
        systemContext += `
        Currently Selected Topic: "${activeTopic.title}" (${activeTopic.type})
        - Slug: ${activeTopic.slug}
        - Description: ${activeTopic.description}
        `;
    }

    const prompt = `
    ${systemContext}

    User Query: "${userQuery}"

    Provide a specific, helpful answer based on the Holistic SEO framework (Koray Tuğberk GÜBÜR).
    If the user asks what to do next, suggest a specific action based on the current state (e.g. "You have 0 topics, generate the map" or "You have a core topic, expand it").
    `;

    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
        openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
        anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
        perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
        openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
    });
};
