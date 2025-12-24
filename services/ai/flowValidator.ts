
import { BusinessInfo, FlowAuditResult, ContextualFlowIssue, StreamingProgressCallback } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';
import React from 'react';

export const analyzeContextualFlow = (
    text: string,
    centralEntity: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
): Promise<FlowAuditResult> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch),
        openai: () => openAiService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch),
        anthropic: () => anthropicService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch, onProgress),
        perplexity: () => perplexityService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch),
        openrouter: () => openRouterService.analyzeContextualFlow(text, centralEntity, businessInfo, dispatch),
    });
};

export const applyFlowRemediation = (
    originalSnippet: string,
    issue: ContextualFlowIssue,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch),
        openai: () => openAiService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch),
        anthropic: () => anthropicService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch),
        perplexity: () => perplexityService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch),
        openrouter: () => openRouterService.applyFlowRemediation(originalSnippet, issue, businessInfo, dispatch),
    });
};

export const applyBatchFlowRemediation = (
    fullDraft: string,
    issues: ContextualFlowIssue[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch),
        openai: () => openAiService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch),
        anthropic: () => anthropicService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch),
        perplexity: () => perplexityService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch),
        openrouter: () => openRouterService.applyBatchFlowRemediation(fullDraft, issues, businessInfo, dispatch),
    });
};
