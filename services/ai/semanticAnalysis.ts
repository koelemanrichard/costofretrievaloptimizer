// services/ai/semanticAnalysis.ts
// Semantic audit service based on Koray Tugberk GUBUR's Holistic SEO framework

import {
  BusinessInfo,
  SemanticAuditResult,
  SemanticActionItem,
  SemanticActionCategory,
  SemanticActionType,
  SemanticActionImpact
} from '../../types';
import { SEMANTIC_FRAMEWORK, SMART_FIX_PROMPT_TEMPLATE } from '../../config/semanticFramework';
import { AppAction } from '../../state/appState';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * JSON Schema for structured semantic analysis output
 * This ensures the AI returns data in the correct format
 */
const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    overallScore: {
      type: "number",
      description: "Overall semantic quality score from 0-100"
    },
    summary: {
      type: "string",
      description: "Brief summary of the semantic audit findings"
    },
    coreEntities: {
      type: "object",
      properties: {
        centralEntity: { type: "string" },
        searchIntent: { type: "string" },
        detectedSourceContext: { type: "string" }
      },
      required: ["centralEntity", "searchIntent", "detectedSourceContext"]
    },
    macroAnalysis: {
      type: "object",
      properties: {
        contextualVector: { type: "string", description: "Analysis of H1-H6 flow and linearity" },
        hierarchy: { type: "string", description: "Heading depth and order analysis" },
        sourceContext: { type: "string", description: "Brand alignment and tone analysis" }
      },
      required: ["contextualVector", "hierarchy", "sourceContext"]
    },
    microAnalysis: {
      type: "object",
      properties: {
        sentenceStructure: { type: "string", description: "Modality, verbs, subject positioning" },
        informationDensity: { type: "string", description: "Fluff words and fact density" },
        htmlSemantics: { type: "string", description: "Lists, tables, alt tags" }
      },
      required: ["sentenceStructure", "informationDensity", "htmlSemantics"]
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: {
            type: "string",
            enum: ["Low Hanging Fruit", "Mid Term", "Long Term"]
          },
          impact: {
            type: "string",
            enum: ["High", "Medium", "Low"]
          },
          type: {
            type: "string",
            enum: ["Micro-Semantics", "Macro-Semantics"]
          },
          ruleReference: { type: "string" }
        },
        required: ["title", "description", "category", "impact", "type"]
      }
    }
  },
  required: ["overallScore", "summary", "coreEntities", "macroAnalysis", "microAnalysis", "actions"]
};

/**
 * Prompt template for semantic analysis
 */
const SEMANTIC_ANALYSIS_PROMPT = (content: string, url: string, businessInfo: BusinessInfo) => `
You are a Holistic SEO Semantic Analysis expert following Koray Tugberk GUBUR's methodology.

FRAMEWORK TO APPLY:
${SEMANTIC_FRAMEWORK}

BUSINESS CONTEXT:
- Domain: ${businessInfo.domain}
- Industry: ${businessInfo.industry}
- Source Context: ${businessInfo.expertise || businessInfo.model}
- Value Proposition: ${businessInfo.valueProp}

PAGE TO ANALYZE:
URL: ${url}
CONTENT:
"""
${content}
"""

TASK: Perform a comprehensive semantic audit of this page using the framework above.

Your response MUST be a valid JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence summary of findings>",
  "coreEntities": {
    "centralEntity": "<main topic/entity of the page>",
    "searchIntent": "<detected user intent: informational/transactional/navigational/commercial>",
    "detectedSourceContext": "<detected brand positioning and expertise angle>"
  },
  "macroAnalysis": {
    "contextualVector": "<analysis of H1-H6 flow, linearity, and whether content stays on topic>",
    "hierarchy": "<heading depth analysis, incremental ordering, feature snippet opportunities>",
    "sourceContext": "<brand alignment, tone definitiveness, authority signals>"
  },
  "microAnalysis": {
    "sentenceStructure": "<modality analysis (is/are vs can/might), stop words, subject positioning>",
    "informationDensity": "<fact density per sentence, fluff word identification>",
    "htmlSemantics": "<proper use of lists/tables, alt text quality, structured data>"
  },
  "actions": [
    {
      "title": "<specific action title>",
      "description": "<concrete description of what to fix>",
      "category": "Low Hanging Fruit" | "Mid Term" | "Long Term",
      "impact": "High" | "Medium" | "Low",
      "type": "Micro-Semantics" | "Macro-Semantics",
      "ruleReference": "<which framework rule this addresses>"
    }
  ]
}

Focus on:
1. MACRO: Does the H1-H6 structure form a straight contextual vector?
2. MACRO: Are headings incrementally ordered by importance?
3. MACRO: Are contextual bridges present between major sections?
4. MICRO: Is modality definitive (is/are) vs probabilistic (can/might)?
5. MICRO: Is information density high (facts per sentence)?
6. MICRO: Are HTML semantics correct (lists, tables, alt text)?

Prioritize "Low Hanging Fruit" actions that have "High" impact.
`;

/**
 * Maps raw AI response to typed SemanticAuditResult
 */
const mapResponseToResult = (response: any): SemanticAuditResult => {
  // Ensure actions have IDs
  const actions: SemanticActionItem[] = (response.actions || []).map((action: any) => ({
    id: uuidv4(),
    title: action.title || 'Unknown Action',
    description: action.description || '',
    category: action.category as SemanticActionCategory || 'Mid Term',
    impact: action.impact as SemanticActionImpact || 'Medium',
    type: action.type as SemanticActionType || 'Macro-Semantics',
    ruleReference: action.ruleReference || undefined,
    smartFix: undefined // Will be populated by generateSmartFix if requested
  }));

  return {
    overallScore: response.overallScore || 0,
    summary: response.summary || 'No summary available',
    coreEntities: {
      centralEntity: response.coreEntities?.centralEntity || 'Unknown',
      searchIntent: response.coreEntities?.searchIntent || 'Unknown',
      detectedSourceContext: response.coreEntities?.detectedSourceContext || 'Unknown'
    },
    macroAnalysis: {
      contextualVector: response.macroAnalysis?.contextualVector || '',
      hierarchy: response.macroAnalysis?.hierarchy || '',
      sourceContext: response.macroAnalysis?.sourceContext || ''
    },
    microAnalysis: {
      sentenceStructure: response.microAnalysis?.sentenceStructure || '',
      informationDensity: response.microAnalysis?.informationDensity || '',
      htmlSemantics: response.microAnalysis?.htmlSemantics || ''
    },
    actions,
    analyzedAt: new Date().toISOString()
  };
};

/**
 * Fallback result when analysis fails
 */
const FALLBACK_RESULT: SemanticAuditResult = {
  overallScore: 0,
  summary: 'Analysis could not be completed',
  coreEntities: { centralEntity: 'Unknown', searchIntent: 'Unknown', detectedSourceContext: 'Unknown' },
  macroAnalysis: { contextualVector: '', hierarchy: '', sourceContext: '' },
  microAnalysis: { sentenceStructure: '', informationDensity: '', htmlSemantics: '' },
  actions: [],
  analyzedAt: new Date().toISOString()
};

/**
 * Call the appropriate AI provider for semantic analysis using proper exported API
 */
const callSemanticAnalysisApi = async (
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<SemanticAuditResult> => {
  let rawResponse: any;

  // Use the proper exported generateJson function from each provider
  switch (businessInfo.aiProvider) {
    case 'gemini':
      rawResponse = await geminiService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
      break;

    case 'openai':
      rawResponse = await openAiService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
      break;

    case 'anthropic':
      rawResponse = await anthropicService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
      break;

    case 'perplexity':
      rawResponse = await perplexityService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
      break;

    case 'openrouter':
      rawResponse = await openRouterService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
      break;

    default:
      throw new Error(`Unsupported AI provider: ${businessInfo.aiProvider}`);
  }

  return mapResponseToResult(rawResponse);
};

/**
 * Analyzes page semantics using AI and the Holistic SEO framework
 *
 * @param content - The full HTML or text content of the page
 * @param url - The URL of the page being analyzed
 * @param businessInfo - User's business context and API keys
 * @param dispatch - React dispatch for logging
 * @returns Comprehensive semantic audit result
 */
export const analyzePageSemantics = async (
  content: string,
  url: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<SemanticAuditResult> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'SemanticAnalysis',
      message: `Starting semantic analysis for ${url}`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  try {
    const prompt = SEMANTIC_ANALYSIS_PROMPT(content, url, businessInfo);
    const result = await callSemanticAnalysisApi(prompt, businessInfo, dispatch);

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SemanticAnalysis',
        message: `Semantic analysis complete. Score: ${result.overallScore}/100`,
        status: 'success',
        timestamp: Date.now()
      }
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SemanticAnalysis',
        message: `Semantic analysis failed: ${message}`,
        status: 'failure',
        timestamp: Date.now(),
        data: error
      }
    });
    throw error;
  }
};

/**
 * Generates a Smart Fix suggestion for a specific action item
 *
 * @param action - The semantic action item to generate a fix for
 * @param pageContent - The content of the page being fixed
 * @param businessInfo - User's business context and API keys
 * @param dispatch - React dispatch for logging
 * @returns AI-generated fix suggestion with before/after examples
 */
export const generateSmartFix = async (
  action: SemanticActionItem,
  pageContent: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<string> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'SmartFix',
      message: `Generating fix for: ${action.title}`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  try {
    const prompt = SMART_FIX_PROMPT_TEMPLATE
      .replace('{title}', action.title)
      .replace('{description}', action.description)
      .replace('{ruleReference}', action.ruleReference || 'General semantic optimization')
      .replace('{pageContent}', pageContent.substring(0, 4000)); // Limit content to avoid token limits

    let smartFix: string;

    // Use the proper exported generateText function from each provider
    switch (businessInfo.aiProvider) {
      case 'gemini':
        smartFix = await geminiService.generateText(prompt, businessInfo, dispatch);
        break;

      case 'openai':
        smartFix = await openAiService.generateText(prompt, businessInfo, dispatch);
        break;

      case 'anthropic':
        smartFix = await anthropicService.generateText(prompt, businessInfo, dispatch);
        break;

      case 'perplexity':
        smartFix = await perplexityService.generateText(prompt, businessInfo, dispatch);
        break;

      case 'openrouter':
        smartFix = await openRouterService.generateText(prompt, businessInfo, dispatch);
        break;

      default:
        throw new Error(`Unsupported AI provider: ${businessInfo.aiProvider}`);
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SmartFix',
        message: 'Smart fix generated successfully',
        status: 'success',
        timestamp: Date.now()
      }
    });

    return smartFix;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SmartFix',
        message: `Smart fix generation failed: ${message}`,
        status: 'failure',
        timestamp: Date.now(),
        data: error
      }
    });
    throw error;
  }
};
