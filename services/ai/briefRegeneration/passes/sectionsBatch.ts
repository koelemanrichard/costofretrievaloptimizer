// services/ai/briefRegeneration/passes/sectionsBatch.ts
// Pass 2+: Regenerate sections in batches

import { BusinessInfo, ContentBrief, EnrichedTopic, SEOPillars, BriefSection } from '../../../../types';
import { AppAction } from '../../../../state/appState';
import { AIResponseSanitizer } from '../../../aiResponseSanitizer';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';
import React from 'react';

export interface SectionsBatchResult {
  success: boolean;
  sections?: BriefSection[];
  error?: string;
}

const SECTIONS_BATCH_PROMPT = (
  info: BusinessInfo,
  topic: EnrichedTopic,
  sections: BriefSection[],
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  batchStartIndex: number,
  totalSections: number
): string => `
You are an expert Holistic SEO Strategist updating SPECIFIC SECTIONS of a content brief.

**LANGUAGE: ${info.language || 'English'} | Target Market: ${info.targetMarket || 'Global'}**

## Brief Context
- Title: ${currentBrief.title}
- Total Sections: ${totalSections}
- This Batch: Sections ${batchStartIndex + 1} to ${batchStartIndex + sections.length}

## Current Sections to Regenerate
${JSON.stringify(sections.map((s, i) => ({
  index: batchStartIndex + i + 1,
  heading: s.heading,
  level: s.level,
  format_code: s.format_code,
  attribute_category: s.attribute_category,
  content_zone: s.content_zone,
  subordinate_text_hint: s.subordinate_text_hint?.substring(0, 150),
  methodology_note: s.methodology_note?.substring(0, 150)
})), null, 2)}

## User's Feedback & Instructions
"${userInstructions}"

## SEO Pillars
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

## Available Topics for Internal Linking
${allTopics.slice(0, 20).map(t => t.title).join(', ')}${allTopics.length > 20 ? '...' : ''}

## Holistic SEO Framework Rules
1. **Central Entity Focus**: Each heading should relate to "${pillars.centralEntity}"
2. **Attribute Priority**: Order sections by UNIQUE → ROOT → RARE → COMMON
3. **Format Codes**:
   - FS (Featured Snippet): 40-50 words, direct answer format
   - PAA (People Also Ask): Question-answer format
   - LISTING: Enumerated list with preamble
   - DEFINITIVE: Comprehensive definition/explanation
   - TABLE: Structured comparison data
   - PROSE: Narrative flow

## Your Task
Regenerate these ${sections.length} sections based on user feedback. You MUST return EXACTLY ${sections.length} sections.

For each section include:
- heading: string (H2/H3/H4 based on level)
- level: number (2, 3, or 4)
- format_code: "FS" | "PAA" | "LISTING" | "DEFINITIVE" | "TABLE" | "PROSE"
- attribute_category: "ROOT" | "UNIQUE" | "RARE" | "COMMON"
- content_zone: "MAIN" | "SUPPLEMENTARY"
- subordinate_text_hint: string (first sentence syntax template)
- methodology_note: string (detailed writing guidance with format code)
- required_phrases: string[] (must-include phrases)
- anchor_texts: [{ phrase: string, target_topic_id: string }]

Return a JSON object:
{
  "sections": [
    { ...section1 },
    { ...section2 },
    ...
  ]
}

CRITICAL: Return EXACTLY ${sections.length} sections. Do not add or remove sections.
Respond with ONLY valid JSON. No markdown formatting.
`;

/**
 * Regenerate a batch of sections
 */
export async function regenerateSectionsBatch(
  businessInfo: BusinessInfo,
  topic: EnrichedTopic,
  sections: BriefSection[],
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<AppAction>,
  batchStartIndex: number,
  totalSections: number
): Promise<SectionsBatchResult> {
  if (sections.length === 0) {
    return { success: true, sections: [] };
  }

  const prompt = SECTIONS_BATCH_PROMPT(
    businessInfo,
    topic,
    sections,
    currentBrief,
    userInstructions,
    pillars,
    allTopics,
    batchStartIndex,
    totalSections
  );

  const sanitizer = new AIResponseSanitizer(dispatch);

  const schema = {
    sections: Array
  };

  const fallback = {
    sections: sections // Return original sections on failure
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

    // Validate we got the right number of sections
    const resultSections = result.sections || [];

    if (resultSections.length !== sections.length) {
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'BriefRegeneration',
          message: `Warning: AI returned ${resultSections.length} sections but expected ${sections.length}. Preserving original sections.`,
          status: 'warning',
          timestamp: Date.now()
        }
      });

      // Try to use what we can
      if (resultSections.length > 0 && resultSections.length < sections.length) {
        // Partial result - fill in with originals
        const merged = resultSections.map((s: any, i: number) => ({
          ...sections[i], // Original as base
          ...validateSection(s), // AI result overlay
          key: sections[i].key || `section-${batchStartIndex + i}` // Preserve key
        }));
        // Add remaining originals
        for (let i = resultSections.length; i < sections.length; i++) {
          merged.push(sections[i]);
        }
        return { success: true, sections: merged };
      }

      return { success: true, sections };
    }

    // Validate and transform each section
    const validatedSections = resultSections.map((s: any, i: number) => ({
      ...sections[i], // Original as base (for any missing fields)
      ...validateSection(s),
      key: sections[i].key || `section-${batchStartIndex + i}` // Preserve original key
    }));

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
        message: `Sections batch (${batchStartIndex + 1}-${batchStartIndex + sections.length}) failed: ${message}`,
        status: 'warning',
        timestamp: Date.now()
      }
    });

    // Return original sections on failure
    return {
      success: false,
      sections,
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
    heading: typeof s.heading === 'string' ? s.heading : undefined,
    level: typeof s.level === 'number' && s.level >= 1 && s.level <= 6 ? s.level : undefined,
    format_code: isValidFormatCode(s.format_code) ? s.format_code : undefined,
    attribute_category: isValidAttributeCategory(s.attribute_category) ? s.attribute_category : undefined,
    content_zone: isValidContentZone(s.content_zone) ? s.content_zone : undefined,
    subordinate_text_hint: typeof s.subordinate_text_hint === 'string' ? s.subordinate_text_hint : undefined,
    methodology_note: typeof s.methodology_note === 'string' ? s.methodology_note : undefined,
    required_phrases: Array.isArray(s.required_phrases) ? s.required_phrases.filter((p: any) => typeof p === 'string') : undefined,
    anchor_texts: Array.isArray(s.anchor_texts) ? s.anchor_texts.filter((a: any) =>
      a && typeof a === 'object' && typeof a.phrase === 'string'
    ) : undefined
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
