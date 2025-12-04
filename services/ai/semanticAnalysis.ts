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
import { Type } from '@google/genai';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gemini-native response schema using Type for structured output
 * This ensures Gemini returns properly formatted JSON
 */
const GEMINI_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "0-100 score based on semantic adherence"
    },
    summary: {
      type: Type.STRING,
      description: "Executive summary of the audit findings (2-3 sentences)"
    },
    coreEntities: {
      type: Type.OBJECT,
      properties: {
        centralEntity: { type: Type.STRING, description: "The single main concept or entity of the page" },
        searchIntent: { type: Type.STRING, description: "User intent: Know, Do, Go, Commercial, etc." },
        detectedSourceContext: { type: Type.STRING, description: "Who does the text sound like? e.g. Medical Expert, Generic Blogger" }
      },
      required: ["centralEntity", "searchIntent", "detectedSourceContext"]
    },
    macroAnalysis: {
      type: Type.OBJECT,
      properties: {
        contextualVector: { type: Type.STRING, description: "Analysis of H1-H6 flow and linearity. Use bullet points for issues found." },
        hierarchy: { type: Type.STRING, description: "Heading depth and order analysis. Use bullet points." },
        sourceContext: { type: Type.STRING, description: "Brand alignment and tone analysis. Use bullet points." }
      },
      required: ["contextualVector", "hierarchy", "sourceContext"]
    },
    microAnalysis: {
      type: Type.OBJECT,
      properties: {
        sentenceStructure: { type: Type.STRING, description: "Modality analysis (is/are vs can/might), stop words, subject positioning. Use bullet points." },
        informationDensity: { type: Type.STRING, description: "Fluff words and fact density analysis. Use bullet points." },
        htmlSemantics: { type: Type.STRING, description: "Lists, tables, alt tags analysis. Use bullet points." }
      },
      required: ["sentenceStructure", "informationDensity", "htmlSemantics"]
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["Low Hanging Fruit", "Mid Term", "Long Term"] },
          impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          type: { type: Type.STRING, enum: ["Micro-Semantics", "Macro-Semantics"] },
          ruleReference: { type: Type.STRING, description: "Which specific rule from the framework does this fix?" }
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
You are an elite Semantic SEO Auditor. Your task is to analyze a specific webpage against the high-standards of Micro-Semantics and Macro-Semantics.

FRAMEWORK RULES:
${SEMANTIC_FRAMEWORK}

INSTRUCTIONS:
1. **Analyze Macro-Semantics**: Look at the "Skeleton". Is the H1 aligned? Is the H2-H3 hierarchy logical? Does the topic flow linearly or does it jump?
2. **Analyze Micro-Semantics**: Look at the "Muscles". Are sentences definitive ("is") or weak ("can")? Is there fluff? Are lists used correctly?
3. **Core Entity Detection**: You MUST explicitly identify the Central Entity, the implicit Source Context (who wrote this?), and the User's Search Intent.
4. **Generate Action Plan**: Create a COMPREHENSIVE and EXHAUSTIVE action plan. DO NOT LIMIT to 3 items. List EVERYTHING that is wrong or could be improved.
   - *Low Hanging Fruit*: HTML tags, Title fixes, Fluff removal, First sentence fixes.
   - *Mid Term*: Paragraph rewriting, Structural re-ordering, Internal linking anchors.
   - *Long Term*: Brand positioning, Sitewide N-Grams, Content gaps.

INPUT CONTENT (URL: ${url}):
"""
${content.substring(0, 60000)}
"""

OUTPUT FORMAT:
For text fields (like 'contextualVector', 'sentenceStructure'), use Markdown formatting (bullet points, **bold** terms) to make the analysis readable and detailed.
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
  // For Gemini, pass the schema for structured output
  switch (businessInfo.aiProvider) {
    case 'gemini':
      // Pass the Gemini-native schema for structured JSON output
      rawResponse = await geminiService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT, GEMINI_ANALYSIS_SCHEMA);
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
