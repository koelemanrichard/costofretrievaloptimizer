// services/ai/briefRegeneration/passes/sectionsGeneration.ts
// Pass for generating sections from scratch when structured_outline is empty

import { BusinessInfo, ContentBrief, EnrichedTopic, SEOPillars, BriefSection, SemanticTriple, KnowledgeGraph } from '../../../../types';
import { AppAction } from '../../../../state/appState';
import { AIResponseSanitizer } from '../../../aiResponseSanitizer';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';
import React from 'react';

export interface SectionsGenerationResult {
  success: boolean;
  sections?: BriefSection[];
  error?: string;
}

const GENERATE_SECTIONS_PROMPT = (
  info: BusinessInfo,
  topic: EnrichedTopic,
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  eavs: SemanticTriple[]
): string => `
You are an expert Holistic SEO Strategist creating a COMPREHENSIVE STRUCTURED OUTLINE for a content brief.

**LANGUAGE: ${info.language || 'English'} | Target Market: ${info.targetMarket || 'Global'}**

## Topic
- Title: "${topic.title}"
- Description: ${topic.description || 'Not provided'}
- Query Type: ${topic.query_type || 'Definitional'}
- Parent Topic: ${topic.parent_topic_id ? allTopics.find(t => t.id === topic.parent_topic_id)?.title || 'Unknown' : 'None (Core Topic)'}

## Current Brief Context
- Title: ${currentBrief.title}
- Slug: ${currentBrief.slug || 'not-set'}
- Meta Description: ${currentBrief.metaDescription || 'Not provided'}
- Key Takeaways: ${JSON.stringify(currentBrief.keyTakeaways || [])}

## User Instructions
"${userInstructions || 'Create a comprehensive structured outline that covers all essential aspects of this topic.'}"

## SEO Pillars
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

## Semantic Triples (EAVs) to Cover
${eavs.length > 0 ? eavs.slice(0, 15).map(e =>
  `- ${e.subject.label} [${e.predicate.relation}] ${e.object.value} (${e.predicate.category || 'COMMON'})`
).join('\n') : 'No EAVs available - generate based on topic semantics'}

## Available Topics for Internal Linking
${allTopics.filter(t => t.id !== topic.id).slice(0, 20).map(t => `- ${t.title} (${t.id})`).join('\n')}

## Holistic SEO Framework Rules

### 1. Attribute Priority Order (MANDATORY)
Sections MUST follow this priority order:
1. **UNIQUE attributes first** - What differentiates the entity from competitors
2. **ROOT attributes second** - Core defining characteristics
3. **RARE attributes third** - Specialized/niche information
4. **COMMON attributes last** - General knowledge (minimize these)

### 2. Format Codes (Choose Appropriate for Each Section)
- **FS** (Featured Snippet): 40-50 word direct answers, definitional format
- **PAA** (People Also Ask): Question-heading with immediate answer
- **LISTING**: Enumerated list with count preamble ("5 key factors:")
- **DEFINITIVE**: Comprehensive definition/explanation
- **TABLE**: Structured comparison data
- **PROSE**: Narrative flow for context

### 3. Content Zones
- **MAIN**: Core content essential to the topic (70-80% of sections)
- **SUPPLEMENTARY**: Supporting context, related information (20-30%)

### 4. Section Requirements
Each section MUST include:
- A clear, keyword-rich heading (H2 or H3)
- Format code matching the content type
- Attribute category based on SEO priority
- Subordinate text hint (first sentence template)
- Methodology note with specific writing guidance

## YOUR TASK

Generate 5-8 sections that comprehensively cover this topic. Structure the outline following attribute priority order.

Return a JSON object with this EXACT structure:
{
  "sections": [
    {
      "heading": "string (H2/H3 heading text with target keyword)",
      "level": 2,
      "format_code": "FS" | "PAA" | "LISTING" | "DEFINITIVE" | "TABLE" | "PROSE",
      "attribute_category": "ROOT" | "UNIQUE" | "RARE" | "COMMON",
      "content_zone": "MAIN" | "SUPPLEMENTARY",
      "subordinate_text_hint": "string (template for first sentence, e.g., '[Entity] is a [category] that [core function].')",
      "methodology_note": "string (detailed writing guidance specific to this section and format)",
      "required_phrases": ["phrase1", "phrase2"],
      "anchor_texts": [
        { "phrase": "anchor text", "target_topic_id": "topic-uuid-here" }
      ],
      "key": "section-0"
    }
  ]
}

## CRITICAL REQUIREMENTS

1. Generate EXACTLY 5-8 sections
2. First section should be UNIQUE or ROOT attribute (never start with COMMON)
3. Include at least one FS (Featured Snippet) optimized section
4. Include at least one LISTING section
5. Each section must have meaningful subordinate_text_hint and methodology_note
6. Use actual topic IDs from the Available Topics list for anchor_texts
7. Sections must be in ${info.language || 'English'}
8. Key field must be "section-0", "section-1", etc.

Respond with ONLY valid JSON. No markdown code blocks. No explanations.
`;

/**
 * Generate sections from scratch when structured_outline is empty
 */
export async function generateSectionsFromScratch(
  businessInfo: BusinessInfo,
  topic: EnrichedTopic,
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  eavs: SemanticTriple[],
  dispatch: React.Dispatch<AppAction>
): Promise<SectionsGenerationResult> {

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'BriefRegeneration',
      message: `Generating structured outline from scratch (no existing sections)`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  const prompt = GENERATE_SECTIONS_PROMPT(
    businessInfo,
    topic,
    currentBrief,
    userInstructions,
    pillars,
    allTopics,
    eavs
  );

  const fallback = {
    sections: [] as BriefSection[]
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

    const resultSections = result.sections || [];

    if (resultSections.length === 0) {
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'BriefRegeneration',
          message: `WARNING: AI returned 0 sections. Generation failed.`,
          status: 'failure',
          timestamp: Date.now()
        }
      });

      return {
        success: false,
        sections: [],
        error: 'AI failed to generate sections'
      };
    }

    // Validate and transform each section
    const validatedSections = resultSections.map((s: any, i: number) => ({
      ...validateSection(s),
      key: s.key || `section-${i}`
    }));

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `Successfully generated ${validatedSections.length} sections from scratch`,
        status: 'success',
        timestamp: Date.now()
      }
    });

    return {
      success: true,
      sections: validatedSections
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `Section generation failed: ${message}`,
        status: 'failure',
        timestamp: Date.now()
      }
    });

    return {
      success: false,
      sections: [],
      error: message
    };
  }
}

/**
 * Validate and sanitize a section from AI response
 */
function validateSection(s: any): Partial<BriefSection> {
  if (!s || typeof s !== 'object') return {};

  return {
    heading: typeof s.heading === 'string' ? s.heading : 'Untitled Section',
    level: typeof s.level === 'number' && s.level >= 1 && s.level <= 6 ? s.level : 2,
    format_code: isValidFormatCode(s.format_code) ? s.format_code : 'PROSE',
    attribute_category: isValidAttributeCategory(s.attribute_category) ? s.attribute_category : 'COMMON',
    content_zone: isValidContentZone(s.content_zone) ? s.content_zone : 'MAIN',
    subordinate_text_hint: typeof s.subordinate_text_hint === 'string' ? s.subordinate_text_hint : '',
    methodology_note: typeof s.methodology_note === 'string' ? s.methodology_note : '',
    required_phrases: Array.isArray(s.required_phrases) ? s.required_phrases.filter((p: any) => typeof p === 'string') : [],
    anchor_texts: Array.isArray(s.anchor_texts) ? s.anchor_texts.filter((a: any) =>
      a && typeof a === 'object' && typeof a.phrase === 'string'
    ) : []
  };
}

function isValidFormatCode(code: any): boolean {
  return ['FS', 'PAA', 'LISTING', 'DEFINITIVE', 'TABLE', 'PROSE'].includes(code);
}

function isValidAttributeCategory(cat: any): boolean {
  return ['ROOT', 'UNIQUE', 'RARE', 'COMMON'].includes(cat);
}

function isValidContentZone(zone: any): boolean {
  return ['MAIN', 'SUPPLEMENTARY'].includes(zone);
}
