// services/ai/autoFixService.ts
// AI-powered auto-fix service for improvement suggestions

import { BusinessInfo, SEOPillars, SemanticTriple, EnrichedTopic, TopicalMap } from '../../types';
import { AutoFixType } from '../../utils/gamification/scoreCalculations';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import { AppAction } from '../../state/appState';
import { Type } from '@google/genai';
import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AutoFixPreview<T = unknown> {
  type: AutoFixType;
  items: T[];
  description: string;
  estimatedImpact: {
    scoreIncrease: number;
    category: string;
  };
}

export interface AutoFixContext {
  map: TopicalMap;
  businessInfo: BusinessInfo;
  pillars: SEOPillars;
  dispatch: React.Dispatch<AppAction>;
}

export interface TopicIntentUpdate {
  topicId: string;
  title: string;
  currentIntent?: string;
  inferredIntent: 'informational' | 'commercial' | 'commercial_investigation' | 'transactional' | 'navigational';
  confidence: number;
  reasoning: string;
}

// ============================================================================
// SCHEMA FOR INTENT ANALYSIS
// ============================================================================

const INTENT_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          intent: {
            type: Type.STRING,
            enum: ['informational', 'commercial', 'commercial_investigation', 'transactional', 'navigational']
          },
          confidence: { type: Type.NUMBER, description: "0-100 confidence score" },
          reasoning: { type: Type.STRING, description: "Brief explanation of why this intent was chosen" }
        },
        required: ['title', 'intent', 'confidence', 'reasoning']
      }
    }
  },
  required: ['topics']
};

// ============================================================================
// EAV GENERATION SCHEMA - Uses nested SemanticTriple structure
// ============================================================================

const EAV_GENERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    eavs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          subject: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING, description: "The entity/subject being described" },
              type: { type: Type.STRING, description: "Type of entity (e.g., 'Organization', 'Product', 'Service')" }
            },
            required: ['label', 'type']
          },
          predicate: {
            type: Type.OBJECT,
            properties: {
              relation: { type: Type.STRING, description: "The attribute/relationship" },
              type: { type: Type.STRING, description: "Type of predicate (e.g., 'hasProperty', 'provides')" },
              category: {
                type: Type.STRING,
                enum: ['UNIQUE', 'ROOT', 'RARE', 'COMMON'],
                description: "Category of the attribute"
              },
              classification: {
                type: Type.STRING,
                enum: ['TYPE', 'COMPONENT', 'BENEFIT', 'RISK', 'PROCESS', 'SPECIFICATION'],
                description: "Classification type"
              }
            },
            required: ['relation', 'type', 'category', 'classification']
          },
          object: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING, description: "The value/object of the triple" },
              type: { type: Type.STRING, description: "Type of object (e.g., 'Literal', 'Concept')" }
            },
            required: ['value', 'type']
          }
        },
        required: ['subject', 'predicate', 'object']
      }
    }
  },
  required: ['eavs']
};

// ============================================================================
// UNIQUE EAV FIX
// ============================================================================

/**
 * Generate UNIQUE category E-A-Vs to differentiate the brand
 */
export async function generateUniqueEavsFix(
  context: AutoFixContext,
  count: number = 10
): Promise<AutoFixPreview<SemanticTriple>> {
  const { map, businessInfo, pillars, dispatch } = context;
  const existingEavs = (map.eavs as SemanticTriple[]) || [];
  const existingUnique = existingEavs.filter(e => e.category === 'UNIQUE');

  // Calculate how many we need
  const needed = Math.max(count - existingUnique.length, 5);

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'AutoFix',
      message: `Generating ${needed} UNIQUE category E-A-Vs...`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  try {
    // Format existing EAVs for the prompt (using nested structure)
    const existingEavStrings = existingUnique.slice(0, 10).map(e => {
      const entity = e.subject?.label || e.entity || 'Unknown';
      const attr = e.predicate?.relation || e.attribute || 'has';
      const val = e.object?.value || e.value || 'value';
      return `- ${entity} | ${attr} | ${val}`;
    }).join('\n') || 'None yet';

    const prompt = `
You are an SEO expert generating E-A-V (Entity-Attribute-Value) semantic triples for "${businessInfo.projectName || 'this business'}".

Generate ${needed} UNIQUE category E-A-V triples. UNIQUE triples highlight what makes this business different:
- Proprietary methodologies or frameworks
- Unique selling propositions (USPs)
- Distinctive approaches or processes
- Awards, certifications, or achievements
- Specific guarantees or commitments
- Data assets or proprietary insights

Business Context:
- Business Name: ${businessInfo.projectName || 'Not specified'}
- Industry: ${businessInfo.industry || 'Not specified'}
- Domain: ${businessInfo.domain || 'Not specified'}
- Target Audience: ${businessInfo.audience || 'Not specified'}
- Unique Data Assets: ${businessInfo.uniqueDataAssets || 'Not specified'}
- Central Entity: ${pillars.centralEntity || businessInfo.projectName}
- Source Context: ${pillars.sourceContext || 'Expert'}

Existing UNIQUE E-A-Vs (DO NOT duplicate these):
${existingEavStrings}

Generate ${needed} NEW, CREATIVE, and SPECIFIC E-A-V triples that differentiate this brand.

IMPORTANT: Use the NESTED structure format:
{
  "eavs": [
    {
      "subject": { "label": "EntityName", "type": "Organization" },
      "predicate": { "relation": "offers", "type": "hasProperty", "category": "UNIQUE", "classification": "BENEFIT" },
      "object": { "value": "the specific value", "type": "Literal" }
    }
  ]
}

Subject types: Organization, Product, Service, Person, Concept
Predicate types: hasProperty, provides, specializes_in, guarantees, uses
Object types: Literal, Concept, Quantity
Categories: UNIQUE (always for this task)
Classifications: TYPE, COMPONENT, BENEFIT, RISK, PROCESS, SPECIFICATION

Return as JSON: { "eavs": [...] }
`;

    // Interface for the AI response with nested structure
    interface NestedEav {
      subject: { label: string; type: string };
      predicate: { relation: string; type: string; category?: string; classification?: string };
      object: { value: string | number; type: string };
    }
    type EavResult = { eavs: NestedEav[] };
    const fallback: EavResult = { eavs: [] };
    const provider = businessInfo.aiProvider || 'gemini';

    let result: EavResult;
    if (provider === 'openai') {
      result = await openAiService.generateJson<EavResult>(prompt, businessInfo, dispatch, fallback);
    } else if (provider === 'anthropic') {
      result = await anthropicService.generateJson<EavResult>(prompt, businessInfo, dispatch, fallback);
    } else {
      result = await geminiService.generateJson<EavResult>(prompt, businessInfo, dispatch, fallback, EAV_GENERATION_SCHEMA);
    }

    // Ensure all EAVs have proper nested structure and UNIQUE category
    const uniqueEavs: SemanticTriple[] = (result?.eavs || [])
      .filter(eav => eav.subject?.label && eav.predicate?.relation && eav.object?.value)
      .map(eav => ({
        // Nested structure (primary)
        subject: {
          label: eav.subject.label,
          type: eav.subject.type || 'Entity'
        },
        predicate: {
          relation: eav.predicate.relation,
          type: eav.predicate.type || 'hasProperty',
          category: 'UNIQUE' as const,
          classification: (eav.predicate.classification || 'BENEFIT') as 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS' | 'SPECIFICATION'
        },
        object: {
          value: eav.object.value,
          type: eav.object.type || 'Literal'
        },
        // Also set flat aliases for backwards compatibility
        entity: eav.subject.label,
        attribute: eav.predicate.relation,
        value: eav.object.value,
        category: 'UNIQUE' as const,
        classification: (eav.predicate.classification || 'BENEFIT') as 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS' | 'SPECIFICATION',
        source: 'auto_fix',
        confidence: 0.85
      }));

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Generated ${uniqueEavs.length} UNIQUE E-A-Vs`,
        status: 'success',
        timestamp: Date.now()
      }
    });

    return {
      type: 'add_unique_eavs',
      items: uniqueEavs,
      description: `Add ${uniqueEavs.length} UNIQUE E-A-Vs to differentiate your brand`,
      estimatedImpact: {
        scoreIncrease: Math.min(8, uniqueEavs.length),
        category: 'Entity Clarity'
      }
    };
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Failed to generate UNIQUE E-A-Vs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now()
      }
    });
    throw error;
  }
}

// ============================================================================
// SEARCH INTENT FIX
// ============================================================================

/**
 * Batch analyze and assign search intents to topics
 */
export async function analyzeSearchIntentsFix(
  context: AutoFixContext,
  maxTopics: number = 20
): Promise<AutoFixPreview<TopicIntentUpdate>> {
  const { map, businessInfo, pillars, dispatch } = context;
  const topics = (map.topics || []) as EnrichedTopic[];

  // Find topics without search intent
  const needsIntent = topics.filter(t => !t.search_intent);
  const toAnalyze = needsIntent.slice(0, maxTopics);

  if (toAnalyze.length === 0) {
    return {
      type: 'analyze_intents',
      items: [],
      description: 'All topics already have search intent assigned',
      estimatedImpact: { scoreIncrease: 0, category: 'Intent Alignment' }
    };
  }

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'AutoFix',
      message: `Analyzing search intent for ${toAnalyze.length} topics...`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  try {
    const prompt = `
You are a search intent classification expert. Analyze each topic and determine the primary search intent.

Business Context:
- Business: ${businessInfo.projectName || 'Unknown'}
- Industry: ${businessInfo.industry || 'Unknown'}
- Central Entity: ${pillars.centralEntity || businessInfo.projectName}

Search Intent Types:
1. **informational** - User wants to learn/understand (how-to, what-is, guides, explanations)
2. **commercial** - User is researching before buying (best, top, reviews, comparisons, vs)
3. **commercial_investigation** - User is comparing specific products/services
4. **transactional** - User is ready to buy/sign up/download (buy, order, pricing, signup)
5. **navigational** - User wants to find a specific page/site

Topics to analyze:
${toAnalyze.map((t, i) => `${i + 1}. "${t.title}"`).join('\n')}

For each topic, provide a JSON object with:
{
  "topics": [
    {
      "title": "the topic title exactly as given",
      "intent": "informational|commercial|commercial_investigation|transactional|navigational",
      "confidence": 0-100,
      "reasoning": "brief explanation"
    }
  ]
}

Respond ONLY with the JSON object, no other text.
`;

    type IntentResult = {
      topics: Array<{
        title: string;
        intent: 'informational' | 'commercial' | 'commercial_investigation' | 'transactional' | 'navigational';
        confidence: number;
        reasoning: string;
      }>;
    };

    const fallback: IntentResult = { topics: [] };

    // Use the primary provider's generateJson function
    let result: IntentResult;
    const provider = businessInfo.aiProvider || 'gemini';

    if (provider === 'openai') {
      result = await openAiService.generateJson<IntentResult>(prompt, businessInfo, dispatch, fallback);
    } else if (provider === 'anthropic') {
      result = await anthropicService.generateJson<IntentResult>(prompt, businessInfo, dispatch, fallback);
    } else {
      result = await geminiService.generateJson<IntentResult>(prompt, businessInfo, dispatch, fallback, INTENT_ANALYSIS_SCHEMA);
    }

    // Map results to TopicIntentUpdate format
    const updates: TopicIntentUpdate[] = [];

    if (result && result.topics) {
      for (let i = 0; i < toAnalyze.length; i++) {
        const topic = toAnalyze[i];
        const analysis = result.topics[i];

        if (analysis) {
          updates.push({
            topicId: topic.id,
            title: topic.title,
            currentIntent: topic.search_intent,
            inferredIntent: analysis.intent,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning
          });
        }
      }
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Analyzed intent for ${updates.length} topics`,
        status: 'success',
        timestamp: Date.now()
      }
    });

    // Calculate score impact based on how many topics we're fixing
    const intentImpact = Math.min(15, Math.round(updates.length * 0.8));

    return {
      type: 'analyze_intents',
      items: updates,
      description: `Assign search intent to ${updates.length} topics`,
      estimatedImpact: {
        scoreIncrease: intentImpact,
        category: 'Intent Alignment'
      }
    };
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Failed to analyze search intents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now()
      }
    });
    throw error;
  }
}

// ============================================================================
// BUYER TOPICS FIX
// ============================================================================

export interface TopicSuggestion {
  title: string;
  description: string;
  type: 'core' | 'outer';
  suggestedParent?: string;
  search_intent?: 'informational' | 'commercial' | 'commercial_investigation' | 'transactional' | 'navigational';
}

/**
 * Generate commercial/transactional topics targeting buyers ready to convert
 */
export async function generateBuyerTopicsFix(
  context: AutoFixContext,
  count: number = 5
): Promise<AutoFixPreview<TopicSuggestion>> {
  const { map, businessInfo, pillars, dispatch } = context;
  const topics = (map.topics || []) as EnrichedTopic[];
  const coreTopics = topics.filter(t => t.type === 'core');

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'AutoFix',
      message: `Generating ${count} buyer-intent topics...`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  try {
    const prompt = `
You are an SEO expert specializing in conversion-focused content. Generate ${count} NEW topics specifically targeting buyers who are ready to convert.

Business Context:
- Business: ${businessInfo.projectName || 'Unknown'}
- Industry: ${businessInfo.industry || 'Unknown'}
- Domain: ${businessInfo.domain || 'Unknown'}
- Central Entity: ${pillars.centralEntity || businessInfo.projectName}
- Target Audience: ${businessInfo.audience || 'Not specified'}
- Conversion Goal: ${businessInfo.conversionGoal || 'Not specified'}

IMPORTANT: Generate only COMMERCIAL and TRANSACTIONAL intent topics:
- Commercial: "best X", "X vs Y", "top X for Y", reviews, comparisons
- Transactional: "buy X", "X pricing", "hire X", "X near me", "get X"

Existing core topics to build upon:
${coreTopics.slice(0, 10).map(t => `- ${t.title}`).join('\n') || 'None yet'}

Generate ${count} buyer-intent topics as JSON array:
[
  {
    "title": "topic title",
    "description": "brief description of what this topic covers",
    "type": "outer",
    "suggestedParent": "name of relevant core topic or empty string",
    "search_intent": "commercial" or "transactional"
  }
]

Respond ONLY with the JSON array.
`;

    type TopicResult = TopicSuggestion[];
    const fallback: TopicResult = [];
    const provider = businessInfo.aiProvider || 'gemini';

    let result: TopicResult;
    if (provider === 'openai') {
      result = await openAiService.generateJson<TopicResult>(prompt, businessInfo, dispatch, fallback);
    } else if (provider === 'anthropic') {
      result = await anthropicService.generateJson<TopicResult>(prompt, businessInfo, dispatch, fallback);
    } else {
      result = await geminiService.generateJson<TopicResult>(prompt, businessInfo, dispatch, fallback);
    }

    // Filter to ensure we only have buyer-intent topics
    const buyerTopics = result.filter(t =>
      t.search_intent === 'commercial' ||
      t.search_intent === 'commercial_investigation' ||
      t.search_intent === 'transactional'
    );

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Generated ${buyerTopics.length} buyer-intent topics`,
        status: 'success',
        timestamp: Date.now()
      }
    });

    return {
      type: 'add_buyer_topics',
      items: buyerTopics,
      description: `Add ${buyerTopics.length} conversion-focused topics`,
      estimatedImpact: {
        scoreIncrease: Math.min(10, buyerTopics.length * 2),
        category: 'Intent Alignment'
      }
    };
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Failed to generate buyer topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now()
      }
    });
    throw error;
  }
}

// ============================================================================
// SUPPORTING TOPICS FIX
// ============================================================================

/**
 * Generate supporting/outer topics to build semantic depth
 */
export async function generateSupportingTopicsFix(
  context: AutoFixContext,
  count: number = 8
): Promise<AutoFixPreview<TopicSuggestion>> {
  const { map, businessInfo, pillars, dispatch } = context;
  const topics = (map.topics || []) as EnrichedTopic[];
  const coreTopics = topics.filter(t => t.type === 'core');
  const outerTopics = topics.filter(t => t.type !== 'core');

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'AutoFix',
      message: `Generating ${count} supporting topics...`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  try {
    const prompt = `
You are an SEO expert specializing in topical authority and semantic SEO. Generate ${count} NEW supporting/outer topics to strengthen the topical coverage.

Business Context:
- Business: ${businessInfo.projectName || 'Unknown'}
- Industry: ${businessInfo.industry || 'Unknown'}
- Central Entity: ${pillars.centralEntity || businessInfo.projectName}
- Source Context: ${pillars.sourceContext || 'Expert'}

Existing core topics (HUBS):
${coreTopics.slice(0, 10).map(t => `- ${t.title}`).join('\n') || 'None yet'}

Existing supporting topics:
${outerTopics.slice(0, 10).map(t => `- ${t.title}`).join('\n') || 'None yet'}

IMPORTANT: Generate topics that:
1. Support and link to existing core topics (build topical clusters)
2. Fill semantic gaps in the coverage
3. Cover related questions, subtopics, and long-tail variations
4. Mix informational, commercial, and navigational intents

Generate ${count} supporting topics as JSON array:
[
  {
    "title": "topic title",
    "description": "brief description",
    "type": "outer",
    "suggestedParent": "name of the core topic this supports",
    "search_intent": "informational" or "commercial" or "transactional"
  }
]

Respond ONLY with the JSON array.
`;

    type TopicResult = TopicSuggestion[];
    const fallback: TopicResult = [];
    const provider = businessInfo.aiProvider || 'gemini';

    let result: TopicResult;
    if (provider === 'openai') {
      result = await openAiService.generateJson<TopicResult>(prompt, businessInfo, dispatch, fallback);
    } else if (provider === 'anthropic') {
      result = await anthropicService.generateJson<TopicResult>(prompt, businessInfo, dispatch, fallback);
    } else {
      result = await geminiService.generateJson<TopicResult>(prompt, businessInfo, dispatch, fallback);
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Generated ${result.length} supporting topics`,
        status: 'success',
        timestamp: Date.now()
      }
    });

    return {
      type: 'add_supporting_topics',
      items: result,
      description: `Add ${result.length} supporting topics to strengthen topical coverage`,
      estimatedImpact: {
        scoreIncrease: Math.min(12, result.length * 1.5),
        category: 'Topical Coverage'
      }
    };
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AutoFix',
        message: `Failed to generate supporting topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now()
      }
    });
    throw error;
  }
}

// ============================================================================
// BRIEFS FIX - List topics that need briefs
// ============================================================================

export interface BriefSuggestion {
  topicId: string;
  topicTitle: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Identify topics that need briefs generated
 */
export function identifyTopicsNeedingBriefs(
  context: AutoFixContext,
  existingBriefs: { topicId: string }[],
  maxCount: number = 10
): AutoFixPreview<BriefSuggestion> {
  const { map } = context;
  const topics = (map.topics || []) as EnrichedTopic[];
  const briefedTopicIds = new Set(existingBriefs.map(b => b.topicId));

  // Find topics without briefs
  const needsBrief = topics.filter(t => !briefedTopicIds.has(t.id));

  // Prioritize by type and intent
  const prioritized = needsBrief.map(topic => {
    let priority: 'high' | 'medium' | 'low' = 'low';
    let reason = 'Supporting content';

    if (topic.type === 'core') {
      priority = 'high';
      reason = 'Core pillar content - establishes topical authority';
    } else if (
      topic.search_intent === 'transactional' ||
      topic.search_intent === 'commercial'
    ) {
      priority = 'high';
      reason = 'Buyer-intent content - drives conversions';
    } else if (topic.search_intent === 'informational') {
      priority = 'medium';
      reason = 'Informational content - builds trust and traffic';
    }

    return {
      topicId: topic.id,
      topicTitle: topic.title,
      priority,
      reason
    };
  });

  // Sort by priority
  const sorted = prioritized.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, maxCount);

  return {
    type: 'generate_briefs',
    items: sorted,
    description: `${sorted.length} topics ready for brief generation`,
    estimatedImpact: {
      scoreIncrease: Math.min(15, sorted.length * 2),
      category: 'Content Readiness'
    }
  };
}

// ============================================================================
// GENERIC FIX GENERATOR
// ============================================================================

/**
 * Generate a fix preview based on the suggestion type
 */
export async function generateFixPreview(
  fixType: AutoFixType,
  context: AutoFixContext
): Promise<AutoFixPreview | null> {
  if (!fixType) return null;

  switch (fixType) {
    case 'add_unique_eavs':
      return generateUniqueEavsFix(context, 10);

    case 'add_root_eavs':
      return generateUniqueEavsFix(context, 15); // ROOT EAVs: more breadth needed

    case 'add_common_eavs':
      return generateUniqueEavsFix(context, 20); // COMMON EAVs: highest volume

    case 'expand_eavs':
      return generateUniqueEavsFix(context, 10);

    case 'analyze_intents':
      return analyzeSearchIntentsFix(context, 20);

    case 'add_buyer_topics':
      return generateBuyerTopicsFix(context, 5);

    case 'add_supporting_topics':
      return generateSupportingTopicsFix(context, 8);

    case 'generate_briefs':
    case 'complete_briefs':
      // Brief generation is complex - defer to existing flow
      return {
        type: fixType,
        items: [],
        description: 'Brief generation available through the topic panel',
        estimatedImpact: { scoreIncrease: 0, category: 'Content Readiness' }
      };

    case 'add_competitors':
      // Competitor addition is manual
      return {
        type: 'add_competitors',
        items: [],
        description: 'Add competitors manually in the Competitor panel',
        estimatedImpact: { scoreIncrease: 0, category: 'Competitive Parity' }
      };

    case 'add_value_props':
      return {
        type: 'add_value_props',
        items: [],
        description: 'Add value propositions manually in the Business Info panel under "Unique Selling Points"',
        estimatedImpact: { scoreIncrease: 0, category: 'Entity Clarity' }
      };

    default:
      return null;
  }
}

// ============================================================================
// APPLY FIXES (placeholders for now - will integrate with actual save logic)
// ============================================================================

export interface ApplyFixResult {
  success: boolean;
  message: string;
  itemsApplied: number;
}

/**
 * Apply EAV fix - adds new EAVs to the map
 */
export async function applyEavFix(
  preview: AutoFixPreview<SemanticTriple>,
  context: AutoFixContext,
  onSave: (eavs: SemanticTriple[]) => Promise<void>
): Promise<ApplyFixResult> {
  try {
    const { map } = context;
    const existingEavs = (map.eavs as SemanticTriple[]) || [];
    const mergedEavs = [...existingEavs, ...preview.items];

    await onSave(mergedEavs);

    return {
      success: true,
      message: `Added ${preview.items.length} new E-A-Vs`,
      itemsApplied: preview.items.length
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to apply fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
      itemsApplied: 0
    };
  }
}

/**
 * Apply intent fix - updates topic search intents
 */
export async function applyIntentFix(
  preview: AutoFixPreview<TopicIntentUpdate>,
  context: AutoFixContext,
  onSave: (topics: EnrichedTopic[]) => Promise<void>
): Promise<ApplyFixResult> {
  try {
    const { map } = context;
    const topics = [...(map.topics || [])] as EnrichedTopic[];

    // Update topics with new intents
    let updated = 0;
    for (const update of preview.items) {
      const topicIndex = topics.findIndex(t => t.id === update.topicId);
      if (topicIndex >= 0) {
        topics[topicIndex] = {
          ...topics[topicIndex],
          search_intent: update.inferredIntent,
          metadata: {
            ...topics[topicIndex].metadata,
            intent_confidence: update.confidence,
            intent_source: 'auto_fix'
          }
        };
        updated++;
      }
    }

    await onSave(topics);

    return {
      success: true,
      message: `Updated search intent for ${updated} topics`,
      itemsApplied: updated
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to apply fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
      itemsApplied: 0
    };
  }
}

/**
 * Apply topic fix - adds new topics to the map
 */
export async function applyTopicsFix(
  preview: AutoFixPreview<TopicSuggestion>,
  context: AutoFixContext,
  onAddTopic: (topic: { title: string; type: 'core' | 'outer'; search_intent?: string; parentId?: string }) => Promise<void>,
  getParentIdByTitle?: (title: string) => string | undefined
): Promise<ApplyFixResult> {
  try {
    let added = 0;

    for (const suggestion of preview.items) {
      // Find parent ID if suggestedParent is provided
      let parentId: string | undefined;
      if (suggestion.suggestedParent && getParentIdByTitle) {
        parentId = getParentIdByTitle(suggestion.suggestedParent);
      }

      await onAddTopic({
        title: suggestion.title,
        type: suggestion.type || 'outer',
        search_intent: suggestion.search_intent,
        parentId
      });
      added++;
    }

    return {
      success: true,
      message: `Added ${added} new topics`,
      itemsApplied: added
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to apply fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
      itemsApplied: 0
    };
  }
}
