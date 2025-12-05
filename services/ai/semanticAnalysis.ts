// services/ai/semanticAnalysis.ts
// Semantic audit service based on Koray Tugberk GUBUR's Holistic SEO framework
// PURPOSE: Check page content alignment against user-defined Central Entity, Source Context, and Central Search Intent

import {
  BusinessInfo,
  SEOPillars,
  SemanticAuditResult,
  SemanticActionItem,
  SemanticActionCategory,
  SemanticActionType,
  SemanticActionImpact,
  AlignmentScores
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
/**
 * Creates the semantic analysis prompt
 * When pillars are provided, focuses on ALIGNMENT checking against user-defined CE/SC/CSI
 * When no pillars, does general semantic detection
 */
const SEMANTIC_ANALYSIS_PROMPT = (content: string, url: string, businessInfo: BusinessInfo, pillars?: SEOPillars) => {
  const hasPillars = pillars && pillars.centralEntity && pillars.sourceContext && pillars.centralSearchIntent;

  // Build business context section from available info
  const businessContextParts: string[] = [];
  if (businessInfo.targetMarket) businessContextParts.push(`- **Target Market/Region**: ${businessInfo.targetMarket}`);
  if (businessInfo.language) businessContextParts.push(`- **Content Language**: ${businessInfo.language}`);
  if (businessInfo.audience) businessContextParts.push(`- **Target Audience**: ${businessInfo.audience}`);
  if (businessInfo.industry) businessContextParts.push(`- **Industry/Niche**: ${businessInfo.industry}`);
  if (businessInfo.expertise) businessContextParts.push(`- **Authority/Expertise Level**: ${businessInfo.expertise}`);
  if (businessInfo.projectName) businessContextParts.push(`- **Business/Project Name**: ${businessInfo.projectName}`);
  if (businessInfo.valueProp) businessContextParts.push(`- **Value Proposition**: ${businessInfo.valueProp}`);

  const businessContext = businessContextParts.length > 0
    ? `
BUSINESS CONTEXT (use this to give region-specific, audience-appropriate advice):
${businessContextParts.join('\n')}

IMPORTANT: All recommendations must be relevant to the specified target market and audience.
Do NOT suggest US-specific regulations, agencies, or practices if the target market is elsewhere.
Use region-appropriate examples, compliance standards, and cultural context.
`
    : '';

  // Koray's framework definitions for the prompt
  const frameworkDefinitions = `
KORAY TUGBERK GUBUR'S HOLISTIC SEO FRAMEWORK - KEY DEFINITIONS:

**Central Entity (CE)**: The single, unambiguous main subject of the content. NOT a keyword - it's the conceptual anchor.
- Example: "iPhone 15 Pro Max" not "best smartphones"
- The CE should be identifiable from the H1 and reinforced throughout

**Source Context (SC)**: WHO is speaking? What type of entity/authority wrote this?
- Examples: "Apple Inc." (brand), "Tech Journalist" (profession), "Certified Doctor" (expertise)
- SC determines credibility signals and expected vocabulary
- The content should sound like it was written BY the Source Context

**Central Search Intent (CSI)**: What does the searcher want to ACCOMPLISH?
- NOT old-school "informational/navigational/transactional"
- Format: [VERB] + [OBJECT] - e.g., "Buy iPhone 15", "Learn Python basics", "Compare CRM software"
- The content must SATISFY this intent completely
`;

  if (hasPillars) {
    // ALIGNMENT CHECKING MODE - compare detected vs defined
    return `
You are an elite Semantic SEO Auditor using Koray Tugberk GUBUR's Holistic SEO framework.

YOUR TASK: Analyze this page and determine how well it ALIGNS with the user's defined semantic framework.
${businessContext}
${frameworkDefinitions}

USER'S DEFINED SEMANTIC FRAMEWORK (what the content SHOULD align to):
- **Central Entity (CE)**: "${pillars.centralEntity}"
- **Source Context (SC)**: "${pillars.sourceContext}"
- **Central Search Intent (CSI)**: "${pillars.centralSearchIntent}"

FRAMEWORK RULES:
${SEMANTIC_FRAMEWORK}

ANALYSIS INSTRUCTIONS:
1. **DETECT** what CE/SC/CSI the page ACTUALLY communicates
2. **COMPARE** detected values against the user's DEFINED values above
3. **SCORE ALIGNMENT** for each (0-100):
   - 90-100: Perfect alignment, content clearly establishes the defined CE/SC/CSI
   - 70-89: Good alignment with minor gaps
   - 50-69: Partial alignment, significant improvements needed
   - Below 50: Misaligned or unclear
4. **IDENTIFY GAPS**: What specific changes would improve alignment?
5. **Analyze Macro-Semantics**: Heading hierarchy, topic flow, structural alignment
6. **Analyze Micro-Semantics**: Sentence modality (is vs can), information density, HTML semantics

INPUT CONTENT (URL: ${url}):
"""
${content.substring(0, 55000)}
"""

REQUIRED OUTPUT FORMAT (JSON):
{
  "overallScore": <number 0-100 - weighted average of alignment scores>,
  "summary": "<2-3 sentences: Is this page aligned with the defined CE/SC/CSI? What's the main issue?>",
  "coreEntities": {
    "centralEntity": "<what CE does the page ACTUALLY communicate?>",
    "searchIntent": "<what CSI does the page ACTUALLY satisfy?>",
    "detectedSourceContext": "<what SC does the page ACTUALLY project?>"
  },
  "alignmentScores": {
    "ceAlignment": <0-100 how well page aligns with defined CE: "${pillars.centralEntity}">,
    "scAlignment": <0-100 how well page aligns with defined SC: "${pillars.sourceContext}">,
    "csiAlignment": <0-100 how well page aligns with defined CSI: "${pillars.centralSearchIntent}">,
    "ceGap": "<specific explanation of CE alignment gap, or 'Aligned' if 80+>",
    "scGap": "<specific explanation of SC alignment gap, or 'Aligned' if 80+>",
    "csiGap": "<specific explanation of CSI alignment gap, or 'Aligned' if 80+>"
  },
  "macroAnalysis": {
    "contextualVector": "<markdown: Does the heading flow support the defined CE? Issues found?>",
    "hierarchy": "<markdown: Is heading structure optimized for the defined CSI?>",
    "sourceContext": "<markdown: Does tone/vocabulary match the defined SC?>"
  },
  "microAnalysis": {
    "sentenceStructure": "<markdown: Modality analysis - definitive (is/are) vs weak (can/might)>",
    "informationDensity": "<markdown: Fluff analysis, fact density>",
    "htmlSemantics": "<markdown: Lists, tables, alt text optimization>"
  },
  "actions": [
    {
      "title": "<action to improve alignment>",
      "description": "<specific fix with examples>",
      "category": "<Low Hanging Fruit | Mid Term | Long Term>",
      "impact": "<High | Medium | Low>",
      "type": "<Micro-Semantics | Macro-Semantics>",
      "ruleReference": "<CE Alignment | SC Alignment | CSI Alignment | Macro | Micro>"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks
- Generate 5-15 specific, actionable items to improve alignment
- Focus actions on CLOSING THE GAPS between detected and defined CE/SC/CSI
`;
  } else {
    // DETECTION MODE - no pillars defined, just detect what's there
    return `
You are an elite Semantic SEO Auditor using Koray Tugberk GUBUR's Holistic SEO framework.

YOUR TASK: Analyze this page and DETECT its semantic properties.
${businessContext}
${frameworkDefinitions}

FRAMEWORK RULES:
${SEMANTIC_FRAMEWORK}

ANALYSIS INSTRUCTIONS:
1. **DETECT** the Central Entity (CE), Source Context (SC), and Central Search Intent (CSI) from the content
2. **Analyze Macro-Semantics**: Heading hierarchy, topic flow, structural issues
3. **Analyze Micro-Semantics**: Sentence modality (is vs can), information density, HTML semantics
4. **Generate Action Plan**: Specific improvements for semantic quality

INPUT CONTENT (URL: ${url}):
"""
${content.substring(0, 55000)}
"""

REQUIRED OUTPUT FORMAT (JSON):
{
  "overallScore": <number 0-100 representing semantic quality>,
  "summary": "<2-3 sentences: What are the main semantic issues with this page?>",
  "coreEntities": {
    "centralEntity": "<the main subject/topic of the page>",
    "searchIntent": "<what intent does this page satisfy? Format: [VERB] + [OBJECT]>",
    "detectedSourceContext": "<who does this content sound like it was written by?>"
  },
  "macroAnalysis": {
    "contextualVector": "<markdown: H1-H6 flow analysis, linearity issues>",
    "hierarchy": "<markdown: Heading depth and order issues>",
    "sourceContext": "<markdown: Tone and vocabulary analysis>"
  },
  "microAnalysis": {
    "sentenceStructure": "<markdown: Modality analysis - definitive (is/are) vs weak (can/might)>",
    "informationDensity": "<markdown: Fluff words, fact density>",
    "htmlSemantics": "<markdown: Lists, tables, alt text analysis>"
  },
  "actions": [
    {
      "title": "<short action title>",
      "description": "<detailed description of what to fix>",
      "category": "<Low Hanging Fruit | Mid Term | Long Term>",
      "impact": "<High | Medium | Low>",
      "type": "<Micro-Semantics | Macro-Semantics>",
      "ruleReference": "<which framework rule this relates to>"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks. Generate 5-10 specific action items.
`;
  }
};

/**
 * Maps raw AI response to typed SemanticAuditResult
 * Handles multiple response formats from different providers:
 * - Gemini: Uses schema field names (overallScore, coreEntities, macroAnalysis, microAnalysis, actions)
 * - Anthropic/Others: May use alternative names (priorityScore, coreEntityDetection, macroSemantics, microSemantics, actionPlan)
 */
const mapResponseToResult = (response: any): SemanticAuditResult => {
  console.log('[mapResponseToResult] Input response keys:', Object.keys(response || {}));

  // Handle different field name conventions from various providers
  // Core entities: coreEntities OR coreEntityDetection
  const coreEntitiesRaw = response.coreEntities || response.coreEntityDetection || {};

  // Macro analysis: macroAnalysis OR macroSemantics
  const macroRaw = response.macroAnalysis || response.macroSemantics || {};

  // Micro analysis: microAnalysis OR microSemantics
  const microRaw = response.microAnalysis || response.microSemantics || {};

  // Actions: actions OR actionPlan (could be array, object with items, or object with categories)
  let actionsArray: any[] = [];
  const actionsSource = response.actions || response.actionPlan;

  if (Array.isArray(actionsSource)) {
    actionsArray = actionsSource;
  } else if (actionsSource && typeof actionsSource === 'object') {
    // Could be { items: [...] } or { lowHangingFruit: [...], midTerm: [...], longTerm: [...] }
    if (Array.isArray(actionsSource.items)) {
      actionsArray = actionsSource.items;
    } else {
      // Flatten category-based structure
      const categories = ['lowHangingFruit', 'low_hanging_fruit', 'quick', 'immediate',
                         'midTerm', 'mid_term', 'medium', 'shortTerm', 'short_term',
                         'longTerm', 'long_term', 'strategic', 'future'];
      for (const cat of categories) {
        if (Array.isArray(actionsSource[cat])) {
          // Tag each action with its category
          actionsSource[cat].forEach((a: any) => {
            actionsArray.push({ ...a, _category: cat });
          });
        }
      }
      // Also check for any array values that might be actions
      if (actionsArray.length === 0) {
        Object.values(actionsSource).forEach((val: any) => {
          if (Array.isArray(val)) {
            actionsArray.push(...val);
          }
        });
      }
    }
  }

  console.log('[mapResponseToResult] Actions extraction:', {
    hasActions: !!response.actions,
    hasActionPlan: !!response.actionPlan,
    actionPlanType: response.actionPlan ? typeof response.actionPlan : 'undefined',
    actionPlanKeys: response.actionPlan && typeof response.actionPlan === 'object' ? Object.keys(response.actionPlan) : [],
    extractedCount: actionsArray.length
  });

  // Overall score: overallScore OR overallScores.overall OR priorityScore/priorityMatrix
  let overallScore = response.overallScore;
  if (overallScore === undefined) {
    // Try overallScores (plural - Anthropic format)
    if (response.overallScores) {
      overallScore = typeof response.overallScores === 'object'
        ? response.overallScores.overall || response.overallScores.total || response.overallScores.score ||
          response.overallScores.semanticScore || response.overallScores.macro || 0
        : response.overallScores;
    }
    // Try priorityScore
    else if (response.priorityScore) {
      overallScore = typeof response.priorityScore === 'object'
        ? response.priorityScore.overall || response.priorityScore.score || 0
        : response.priorityScore;
    }
    // Try priorityMatrix (Anthropic format)
    else if (response.priorityMatrix) {
      overallScore = typeof response.priorityMatrix === 'object'
        ? response.priorityMatrix.overall || response.priorityMatrix.score || 0
        : response.priorityMatrix;
    }
  }
  overallScore = typeof overallScore === 'number' ? overallScore : 0;

  // Summary: Try multiple sources
  const summary = response.summary
    || response.overallScores?.summary
    || response.priorityScore?.summary
    || response.priorityMatrix?.summary
    || macroRaw.summary
    || macroRaw.overallAssessment
    || 'No summary available';

  console.log('[mapResponseToResult] Score extraction:', {
    rawOverallScore: response.overallScore,
    rawOverallScores: response.overallScores,
    rawPriorityMatrix: response.priorityMatrix,
    extractedScore: overallScore
  });

  // Map actions with flexible field names
  const actions: SemanticActionItem[] = actionsArray.map((action: any) => ({
    id: uuidv4(),
    title: action.title || action.action || action.issue || action.name || action.fix || 'Unknown Action',
    description: action.description || action.details || action.recommendation || action.explanation || action.rationale || '',
    category: mapCategory(action._category || action.category || action.priority || action.effort || action.timeframe),
    impact: mapImpact(action.impact || action.importance || action.severity || action.value),
    type: mapType(action.type || action.area || action.scope || action.level),
    ruleReference: action.ruleReference || action.rule || action.reference || undefined,
    smartFix: undefined
  }));

  console.log('[mapResponseToResult] Actions mapped:', actions.length, 'items');

  // Map core entities with flexible field names
  const coreEntities = {
    centralEntity: coreEntitiesRaw.centralEntity || coreEntitiesRaw.entity || coreEntitiesRaw.mainEntity || 'Unknown',
    searchIntent: coreEntitiesRaw.searchIntent || coreEntitiesRaw.intent || coreEntitiesRaw.userIntent || 'Unknown',
    detectedSourceContext: coreEntitiesRaw.detectedSourceContext || coreEntitiesRaw.sourceContext || coreEntitiesRaw.source || 'Unknown'
  };

  // Map macro analysis with flexible field names
  const macroAnalysis = {
    contextualVector: macroRaw.contextualVector || macroRaw.headingFlow || macroRaw.structure || '',
    hierarchy: macroRaw.hierarchy || macroRaw.headingHierarchy || macroRaw.headings || '',
    sourceContext: macroRaw.sourceContext || macroRaw.brandAlignment || macroRaw.tone || ''
  };

  // Map micro analysis with flexible field names
  const microAnalysis = {
    sentenceStructure: microRaw.sentenceStructure || microRaw.modality || microRaw.sentences || '',
    informationDensity: microRaw.informationDensity || microRaw.fluff || microRaw.density || '',
    htmlSemantics: microRaw.htmlSemantics || microRaw.html || microRaw.markup || ''
  };

  // Extract alignment scores if present (only in alignment checking mode)
  let alignmentScores: AlignmentScores | undefined;
  const alignmentRaw = response.alignmentScores || response.alignment || response.pillarAlignment;
  if (alignmentRaw && typeof alignmentRaw === 'object') {
    alignmentScores = {
      ceAlignment: typeof alignmentRaw.ceAlignment === 'number' ? alignmentRaw.ceAlignment :
                   typeof alignmentRaw.centralEntityAlignment === 'number' ? alignmentRaw.centralEntityAlignment : 0,
      scAlignment: typeof alignmentRaw.scAlignment === 'number' ? alignmentRaw.scAlignment :
                   typeof alignmentRaw.sourceContextAlignment === 'number' ? alignmentRaw.sourceContextAlignment : 0,
      csiAlignment: typeof alignmentRaw.csiAlignment === 'number' ? alignmentRaw.csiAlignment :
                    typeof alignmentRaw.searchIntentAlignment === 'number' ? alignmentRaw.searchIntentAlignment : 0,
      ceGap: alignmentRaw.ceGap || alignmentRaw.centralEntityGap || 'Not analyzed',
      scGap: alignmentRaw.scGap || alignmentRaw.sourceContextGap || 'Not analyzed',
      csiGap: alignmentRaw.csiGap || alignmentRaw.searchIntentGap || 'Not analyzed'
    };
    console.log('[mapResponseToResult] Alignment scores extracted:', alignmentScores);
  }

  const result: SemanticAuditResult = {
    overallScore,
    summary,
    coreEntities,
    macroAnalysis,
    microAnalysis,
    actions,
    analyzedAt: new Date().toISOString(),
    ...(alignmentScores && { alignmentScores })
  };

  console.log('[mapResponseToResult] Mapped result:', {
    overallScore: result.overallScore,
    summary: result.summary?.substring(0, 50),
    actionsCount: result.actions.length,
    coreEntities: result.coreEntities,
    hasAlignmentScores: !!result.alignmentScores,
    alignmentScores: result.alignmentScores
  });

  return result;
};

// Helper to map category strings to expected enum values
const mapCategory = (value: any): SemanticActionCategory => {
  if (!value) return 'Mid Term';
  const lower = String(value).toLowerCase();
  if (lower.includes('low') || lower.includes('quick') || lower.includes('easy')) return 'Low Hanging Fruit';
  if (lower.includes('long') || lower.includes('strategic')) return 'Long Term';
  return 'Mid Term';
};

// Helper to map impact strings to expected enum values
const mapImpact = (value: any): SemanticActionImpact => {
  if (!value) return 'Medium';
  const lower = String(value).toLowerCase();
  if (lower.includes('high') || lower.includes('critical')) return 'High';
  if (lower.includes('low') || lower.includes('minor')) return 'Low';
  return 'Medium';
};

// Helper to map type strings to expected enum values
const mapType = (value: any): SemanticActionType => {
  if (!value) return 'Macro-Semantics';
  const lower = String(value).toLowerCase();
  if (lower.includes('micro') || lower.includes('sentence') || lower.includes('word')) return 'Micro-Semantics';
  return 'Macro-Semantics';
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
  console.log('[SemanticAnalysis] callSemanticAnalysisApi called with provider:', businessInfo.aiProvider);
  let rawResponse: any;

  // Use the proper exported generateJson function from each provider
  // For Gemini, pass the schema for structured output
  try {
    switch (businessInfo.aiProvider) {
      case 'gemini':
        console.log('[SemanticAnalysis] Calling Gemini generateJson...');
        // Pass the Gemini-native schema for structured JSON output
        rawResponse = await geminiService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT, GEMINI_ANALYSIS_SCHEMA);
        break;

      case 'openai':
        console.log('[SemanticAnalysis] Calling OpenAI generateJson...');
        rawResponse = await openAiService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
        break;

      case 'anthropic':
        console.log('[SemanticAnalysis] Calling Anthropic generateJson...');
        rawResponse = await anthropicService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
        break;

      case 'perplexity':
        console.log('[SemanticAnalysis] Calling Perplexity generateJson...');
        rawResponse = await perplexityService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
        break;

      case 'openrouter':
        console.log('[SemanticAnalysis] Calling OpenRouter generateJson...');
        rawResponse = await openRouterService.generateJson(prompt, businessInfo, dispatch, FALLBACK_RESULT);
        break;

      default:
        throw new Error(`Unsupported AI provider: ${businessInfo.aiProvider}`);
    }

    console.log('[SemanticAnalysis] Raw API response:', rawResponse);
    console.log('[SemanticAnalysis] Raw response type:', typeof rawResponse);
    console.log('[SemanticAnalysis] Raw response keys:', rawResponse ? Object.keys(rawResponse) : 'null/undefined');
  } catch (error) {
    console.error('[SemanticAnalysis] API call error:', error);
    throw error;
  }

  const mappedResult = mapResponseToResult(rawResponse);
  console.log('[SemanticAnalysis] Mapped result:', mappedResult);
  return mappedResult;
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
  dispatch: React.Dispatch<AppAction>,
  pillars?: SEOPillars
): Promise<SemanticAuditResult> => {
  const hasPillars = pillars && pillars.centralEntity && pillars.sourceContext && pillars.centralSearchIntent;

  console.log('[SemanticAnalysis] ===== analyzePageSemantics START =====');
  console.log('[SemanticAnalysis] analyzePageSemantics called', {
    url,
    contentLength: content?.length,
    provider: businessInfo.aiProvider,
    hasPillars,
    pillars: hasPillars ? { ce: pillars.centralEntity, sc: pillars.sourceContext, csi: pillars.centralSearchIntent } : null
  });

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'SemanticAnalysis',
      message: hasPillars
        ? `Starting ALIGNMENT check for ${url} against CE: "${pillars.centralEntity}"`
        : `Starting semantic detection for ${url}`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  try {
    console.log('[SemanticAnalysis] Building prompt...', hasPillars ? 'ALIGNMENT MODE' : 'DETECTION MODE');
    const prompt = SEMANTIC_ANALYSIS_PROMPT(content, url, businessInfo, pillars);
    console.log('[SemanticAnalysis] Prompt length:', prompt.length);
    console.log('[SemanticAnalysis] Calling API with provider:', businessInfo.aiProvider);
    const result = await callSemanticAnalysisApi(prompt, businessInfo, dispatch);
    console.log('[SemanticAnalysis] API result:', result);

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
    // Build business context for region-specific, audience-appropriate suggestions
    const businessContextParts: string[] = [];
    if (businessInfo.targetMarket) businessContextParts.push(`- Target Market/Region: ${businessInfo.targetMarket}`);
    if (businessInfo.language) businessContextParts.push(`- Content Language: ${businessInfo.language}`);
    if (businessInfo.audience) businessContextParts.push(`- Target Audience: ${businessInfo.audience}`);
    if (businessInfo.industry) businessContextParts.push(`- Industry: ${businessInfo.industry}`);

    const businessContext = businessContextParts.length > 0
      ? `
BUSINESS CONTEXT (ensure suggestions are appropriate for this market):
${businessContextParts.join('\n')}
`
      : '';

    const prompt = SMART_FIX_PROMPT_TEMPLATE
      .replace('{title}', action.title)
      .replace('{description}', action.description)
      .replace('{ruleReference}', action.ruleReference || 'General semantic optimization')
      .replace('{businessContext}', businessContext)
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
