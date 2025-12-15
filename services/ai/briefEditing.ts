// services/ai/briefEditing.ts
// AI service for content brief editing: regeneration, section refinement, and new section generation

import { BusinessInfo, ContentBrief, EnrichedTopic, SEOPillars, BriefSection, SemanticTriple } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { regenerateBriefMultiPass, RegenerationProgress, RegenerationResult } from './briefRegeneration';
import React from 'react';

// Re-export types for consumers
export type { RegenerationProgress, RegenerationResult };

// Threshold for using multi-pass regeneration
// Briefs with more sections than this will use multi-pass
const MULTI_PASS_THRESHOLD = 10;

export type ProgressCallback = (progress: RegenerationProgress) => void;

/**
 * Regenerate an entire content brief with user feedback/instructions
 * Automatically uses multi-pass regeneration for large briefs (>10 sections)
 *
 * @param onProgress - Optional callback for progress updates during multi-pass regeneration
 * @param eavs - Optional EAVs for section generation when structured_outline is empty
 */
export const regenerateBrief = async (
    businessInfo: BusinessInfo,
    topic: EnrichedTopic,
    currentBrief: ContentBrief,
    userInstructions: string,
    pillars: SEOPillars,
    allTopics: EnrichedTopic[],
    dispatch: React.Dispatch<any>,
    onProgress?: ProgressCallback,
    eavs?: SemanticTriple[]
): Promise<ContentBrief> => {
    const sectionCount = currentBrief.structured_outline?.length || 0;

    // Use multi-pass for large briefs, when progress callback is provided, OR when sections are empty
    // (so we can generate them from scratch using the new sectionsGeneration pass)
    if (sectionCount > MULTI_PASS_THRESHOLD || onProgress || sectionCount === 0) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefEditing',
                message: `Using multi-pass regeneration (${sectionCount} sections${sectionCount === 0 ? ' - will generate from scratch' : ''})`,
                status: 'info',
                timestamp: Date.now()
            }
        });

        const result = await regenerateBriefMultiPass(
            businessInfo,
            topic,
            currentBrief,
            userInstructions,
            pillars,
            allTopics,
            dispatch,
            onProgress,
            eavs  // Pass EAVs for section generation when empty
        );

        if (!result.success || !result.brief) {
            throw new Error(result.error || 'Multi-pass regeneration failed');
        }

        return result.brief;
    }

    // For smaller briefs, use single-pass regeneration (original behavior)
    switch (businessInfo.aiProvider) {
        case 'openai':
            return openAiService.regenerateBrief(businessInfo, topic, currentBrief, userInstructions, pillars, allTopics, dispatch);
        case 'anthropic':
            return anthropicService.regenerateBrief(businessInfo, topic, currentBrief, userInstructions, pillars, allTopics, dispatch);
        case 'perplexity':
            return perplexityService.regenerateBrief(businessInfo, topic, currentBrief, userInstructions, pillars, allTopics, dispatch);
        case 'openrouter':
            return openRouterService.regenerateBrief(businessInfo, topic, currentBrief, userInstructions, pillars, allTopics, dispatch);
        case 'gemini':
        default:
            return geminiService.regenerateBrief(businessInfo, topic, currentBrief, userInstructions, pillars, allTopics, dispatch);
    }
};

/**
 * AI-assisted refinement of a single brief section
 * Uses context from the full brief to maintain coherence and follows
 * Holistic SEO rules for attribute ordering, format codes, etc.
 */
export const refineBriefSection = async (
    section: BriefSection,
    userInstruction: string,
    briefContext: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<BriefSection> => {
    switch (businessInfo.aiProvider) {
        case 'openai':
            return openAiService.refineBriefSection(section, userInstruction, briefContext, businessInfo, dispatch);
        case 'anthropic':
            return anthropicService.refineBriefSection(section, userInstruction, briefContext, businessInfo, dispatch);
        case 'perplexity':
            return perplexityService.refineBriefSection(section, userInstruction, briefContext, businessInfo, dispatch);
        case 'openrouter':
            return openRouterService.refineBriefSection(section, userInstruction, briefContext, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.refineBriefSection(section, userInstruction, briefContext, businessInfo, dispatch);
    }
};

/**
 * Generate a new section to be inserted at a specific position
 * Creates section with all BriefSection fields based on user instruction
 * and surrounding context from the brief.
 */
export const generateNewSection = async (
    insertPosition: number,
    parentHeading: string | null,
    userInstruction: string,
    briefContext: ContentBrief,
    businessInfo: BusinessInfo,
    pillars: SEOPillars,
    dispatch: React.Dispatch<any>
): Promise<BriefSection> => {
    switch (businessInfo.aiProvider) {
        case 'openai':
            return openAiService.generateNewSection(insertPosition, parentHeading, userInstruction, briefContext, businessInfo, pillars, dispatch);
        case 'anthropic':
            return anthropicService.generateNewSection(insertPosition, parentHeading, userInstruction, briefContext, businessInfo, pillars, dispatch);
        case 'perplexity':
            return perplexityService.generateNewSection(insertPosition, parentHeading, userInstruction, briefContext, businessInfo, pillars, dispatch);
        case 'openrouter':
            return openRouterService.generateNewSection(insertPosition, parentHeading, userInstruction, briefContext, businessInfo, pillars, dispatch);
        case 'gemini':
        default:
            return geminiService.generateNewSection(insertPosition, parentHeading, userInstruction, briefContext, businessInfo, pillars, dispatch);
    }
};
