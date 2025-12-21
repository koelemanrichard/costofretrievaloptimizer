/**
 * Keyword Injector - Smart Keyword Injection
 *
 * Injects required keywords into existing text WITHOUT adding new sentences.
 * This is the core of the modify-first strategy that prevents bloat.
 *
 * Research-backed constraints:
 * - Rule III.B: Information Density - injected keywords must add semantic value
 * - Micro semantics: Use "is/are" not "can/might", remove fluff words
 * - Subject Positioning: Central Entity must remain the grammatical Subject
 */

import type { BusinessInfo } from '../../../types';
import * as geminiService from '../../geminiService';
import * as openAiService from '../../openAiService';
import * as anthropicService from '../../anthropicService';
import * as perplexityService from '../../perplexityService';
import * as openRouterService from '../../openRouterService';
import { getGenerateTextFunction } from '../providerDispatcher';
import { AIResponseSanitizer } from '../../aiResponseSanitizer';
import React from 'react';

/**
 * Result of keyword injection
 */
export interface InjectionResult {
  /** The modified text with keywords injected */
  modifiedText: string;
  /** Keywords that were successfully injected */
  keywordsInjected: string[];
  /** Keywords that could not be injected without adding sentences */
  keywordsSkipped: string[];
  /** Whether the original meaning was preserved */
  meaningPreserved: boolean;
  /** Approximate change in text length (percentage) */
  lengthChangePercent: number;
}

/**
 * Options for keyword injection
 */
export interface InjectionOptions {
  /** Maximum keywords to inject in one pass */
  maxKeywords?: number;
  /** Maximum allowed length increase (percentage) */
  maxLengthIncrease?: number;
  /** Central entity to keep as grammatical subject */
  centralEntity?: string;
  /** Whether to preserve exact word order where possible */
  preserveWordOrder?: boolean;
}

const DEFAULT_OPTIONS: InjectionOptions = {
  maxKeywords: 5,
  maxLengthIncrease: 0.2, // 20%
  preserveWordOrder: true,
};

/**
 * Get the appropriate AI service generateText function based on provider
 */
function getGenerateText(
  businessInfo: BusinessInfo
): (prompt: string, bi: BusinessInfo, dispatch: React.Dispatch<any>) => Promise<string> {
  return getGenerateTextFunction(businessInfo, {
    gemini: geminiService,
    openai: openAiService,
    anthropic: anthropicService,
    perplexity: perplexityService,
    openrouter: openRouterService,
  }) as (prompt: string, bi: BusinessInfo, dispatch: React.Dispatch<any>) => Promise<string>;
}

/**
 * Generate the prompt for keyword injection
 */
function generateInjectionPrompt(
  text: string,
  requiredKeywords: string[],
  language: string,
  options: InjectionOptions
): string {
  const keywordList = requiredKeywords.slice(0, options.maxKeywords || 5).join(', ');
  const entityContext = options.centralEntity
    ? `Keep "${options.centralEntity}" as the main subject where applicable.`
    : '';

  return `You are a precise text editor. Your task is to inject specific keywords into existing text WITHOUT changing its meaning or adding new sentences.

## CRITICAL RULES:
1. **DO NOT add new sentences** - only modify existing ones
2. **DO NOT significantly increase text length** - maximum ${Math.round((options.maxLengthIncrease || 0.2) * 100)}% longer
3. **PRESERVE the original meaning** exactly
4. **USE ${language.toUpperCase()} language** for all modifications
5. **REPLACE neutral words** with keyword synonyms where natural
6. ${entityContext}

## Micro-Semantics Rules:
- Use definitive verbs ("is", "are") for facts, NOT "can/might"
- Remove fluff words ("also", "very", "basically") when injecting
- Maintain information density - every word must add value

## Original Text:
${text}

## Keywords to Inject (${language}):
${keywordList}

## Output Format:
Return ONLY a JSON object:
{
  "modified_text": "The modified text with keywords naturally integrated",
  "keywords_injected": ["list", "of", "successfully", "injected", "keywords"],
  "keywords_skipped": ["keywords", "that", "couldn't", "fit", "naturally"]
}

## Examples of Good Injection:

**Original:** "Our service helps businesses grow."
**Keywords:** ["proven", "professional"]
**Good:** "Our proven professional service helps businesses grow."
**Bad:** "Our service helps businesses grow. It is proven and professional." (Added sentence = WRONG)

**Original:** "We offer website development."
**Keywords:** ["expert", "custom"]
**Good:** "We offer expert custom website development."
**Bad:** "We offer website development. Our experts create custom solutions." (Added sentence = WRONG)

Return ONLY the JSON object, no markdown.`;
}

/**
 * Inject keywords into existing text using AI
 */
export async function injectKeywordsIntoText(
  text: string,
  requiredKeywords: string[],
  language: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  options: InjectionOptions = {}
): Promise<InjectionResult> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // If text is too short, can't really inject keywords
  if (text.length < 10) {
    return {
      modifiedText: text,
      keywordsInjected: [],
      keywordsSkipped: requiredKeywords,
      meaningPreserved: true,
      lengthChangePercent: 0,
    };
  }

  // Check which keywords are already present
  const lowerText = text.toLowerCase();
  const missingKeywords = requiredKeywords.filter(
    kw => !lowerText.includes(kw.toLowerCase())
  );

  // If all keywords already present, nothing to do
  if (missingKeywords.length === 0) {
    return {
      modifiedText: text,
      keywordsInjected: [],
      keywordsSkipped: [],
      meaningPreserved: true,
      lengthChangePercent: 0,
    };
  }

  const generateText = getGenerateText(businessInfo);
  const prompt = generateInjectionPrompt(text, missingKeywords, language, mergedOptions);
  const sanitizer = new AIResponseSanitizer(dispatch);

  try {
    const response = await generateText(prompt, businessInfo, dispatch);

    interface InjectionResponse {
      modified_text?: string;
      keywords_injected?: string[];
      keywords_skipped?: string[];
    }

    const fallback: InjectionResponse = {
      modified_text: text,
      keywords_injected: [],
      keywords_skipped: missingKeywords,
    };

    const result = sanitizer.sanitize<InjectionResponse>(
      response,
      {
        modified_text: String,
        keywords_injected: Array,
        keywords_skipped: Array,
      },
      fallback
    );

    const modifiedText = result.modified_text || text;
    const keywordsInjected = result.keywords_injected || [];
    const keywordsSkipped = result.keywords_skipped || missingKeywords;

    // Validate the result
    const lengthChange = (modifiedText.length - text.length) / text.length;
    const maxAllowed = mergedOptions.maxLengthIncrease || 0.2;

    // If length increased too much, reject the modification
    if (lengthChange > maxAllowed) {
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'KeywordInjector',
          message: `Rejected modification - length increased by ${Math.round(lengthChange * 100)}% (max ${Math.round(maxAllowed * 100)}%)`,
          status: 'warning',
          timestamp: Date.now(),
        },
      });

      return {
        modifiedText: text,
        keywordsInjected: [],
        keywordsSkipped: missingKeywords,
        meaningPreserved: true,
        lengthChangePercent: 0,
      };
    }

    // Verify keywords were actually injected
    const verifiedInjected = keywordsInjected.filter(kw =>
      modifiedText.toLowerCase().includes(kw.toLowerCase())
    );

    return {
      modifiedText,
      keywordsInjected: verifiedInjected,
      keywordsSkipped: keywordsSkipped,
      meaningPreserved: true, // Assume AI followed instructions
      lengthChangePercent: Math.round(lengthChange * 100),
    };
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'KeywordInjector',
        message: `Injection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });

    return {
      modifiedText: text,
      keywordsInjected: [],
      keywordsSkipped: missingKeywords,
      meaningPreserved: true,
      lengthChangePercent: 0,
    };
  }
}

/**
 * Simple non-AI keyword injection for straightforward cases
 * Used when keywords can be added as simple modifiers
 */
export function injectKeywordSimple(
  text: string,
  keyword: string,
  position: 'before' | 'after' | 'replace'
): string {
  if (position === 'before') {
    // Add keyword before the first significant word
    const words = text.split(' ');
    if (words.length > 0) {
      words.splice(1, 0, keyword);
      return words.join(' ');
    }
  }

  if (position === 'after') {
    // Add keyword at the end, before punctuation
    return text.replace(/([.!?]?)$/, ` ${keyword}$1`);
  }

  return text;
}

/**
 * Check if a keyword can be injected into text without AI
 * Returns true for simple cases where keyword is a common modifier
 */
export function canInjectSimple(text: string, keyword: string): boolean {
  // Simple adjectives that can be inserted before nouns
  const simpleModifiers = [
    'proven', 'professional', 'expert', 'certified', 'trusted',
    'bewezen', 'professioneel', 'expert', 'gecertificeerd', 'vertrouwd',
  ];

  return simpleModifiers.includes(keyword.toLowerCase());
}

/**
 * Batch inject keywords into multiple fields
 */
export async function batchInjectKeywords(
  fields: Array<{ fieldName: string; text: string; keywords: string[] }>,
  language: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  options: InjectionOptions = {}
): Promise<Map<string, InjectionResult>> {
  const results = new Map<string, InjectionResult>();

  for (const field of fields) {
    if (field.keywords.length === 0) {
      results.set(field.fieldName, {
        modifiedText: field.text,
        keywordsInjected: [],
        keywordsSkipped: [],
        meaningPreserved: true,
        lengthChangePercent: 0,
      });
      continue;
    }

    const result = await injectKeywordsIntoText(
      field.text,
      field.keywords,
      language,
      businessInfo,
      dispatch,
      options
    );

    results.set(field.fieldName, result);
  }

  return results;
}
