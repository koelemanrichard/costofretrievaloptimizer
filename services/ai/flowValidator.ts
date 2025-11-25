
import { BusinessInfo, FlowAuditResult, ContextualFlowIssue } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import React from 'react';

export const analyzeContextualFlow = (
    text: string, centralEntity: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<FlowAuditResult> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch);
        case 'anthropic': return anthropicService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch);
        case 'perplexity': return perplexityService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch);
        case 'openrouter': return openRouterService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch);
    }
};

export const applyFlowRemediation = (
    originalSnippet: string,
    issue: ContextualFlowIssue,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch);
        case 'anthropic': return anthropicService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch);
        case 'perplexity': return perplexityService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch);
        case 'openrouter': return openRouterService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch);
    }
};

export const applyBatchFlowRemediation = (
    fullDraft: string,
    issues: ContextualFlowIssue[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch);
        case 'anthropic': return anthropicService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch);
        case 'perplexity': return perplexityService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch);
        case 'openrouter': return openRouterService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch);
    }
};
