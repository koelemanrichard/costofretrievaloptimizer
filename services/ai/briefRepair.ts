/**
 * Brief Repair Service
 *
 * Generates only the missing fields of a content brief without regenerating
 * the entire brief. This is more efficient and preserves existing content.
 */

import { ContentBrief, EnrichedTopic, SEOPillars, BusinessInfo, BriefSection, ContextualBridgeLink } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { getGenerateTextFunction } from './providerDispatcher';

/**
 * Get the appropriate AI service generateText function based on provider
 */
function getGenerateText(businessInfo: BusinessInfo): (prompt: string, bi: BusinessInfo, dispatch: React.Dispatch<any>) => Promise<string> {
  return getGenerateTextFunction(businessInfo, {
    gemini: geminiService,
    openai: openAiService,
    anthropic: anthropicService,
    perplexity: perplexityService,
    openrouter: openRouterService,
  }) as (prompt: string, bi: BusinessInfo, dispatch: React.Dispatch<any>) => Promise<string>;
}

/**
 * Field repair functions map - each field has its own repair logic
 * Note: Only includes fields that can be persisted to the database.
 * targetKeyword and searchIntent exist in TypeScript interface but NOT in DB schema.
 */
const FIELD_REPAIR_MAP: Record<string, (
  brief: ContentBrief,
  topic: EnrichedTopic,
  pillars: SEOPillars,
  businessInfo: BusinessInfo,
  allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
) => Promise<Partial<ContentBrief>>> = {
  'Meta description': repairMetaDescription,
  'Content outline': repairContentOutline,
  'Competitor word count data': repairSerpWordCount,
  'People Also Ask questions': repairPeopleAlsoAsk,
  'Internal linking strategy': repairContextualBridge,
  'Featured image guidance': repairFeaturedImage,
};

/**
 * Repair missing fields in a brief
 */
export async function repairBriefMissingFields(
  brief: ContentBrief,
  missingFields: string[],
  topic: EnrichedTopic,
  pillars: SEOPillars,
  businessInfo: BusinessInfo,
  allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
): Promise<Partial<ContentBrief> | null> {
  console.log('[BriefRepair] Starting repair for fields:', missingFields);

  const updates: Partial<ContentBrief> = {};
  const errors: string[] = [];

  for (const field of missingFields) {
    const repairFn = FIELD_REPAIR_MAP[field];
    if (repairFn) {
      try {
        dispatch({ type: 'SET_NOTIFICATION', payload: `Repairing: ${field}...` });
        const fieldUpdates = await repairFn(brief, topic, pillars, businessInfo, allTopics, dispatch);
        Object.assign(updates, fieldUpdates);
        console.log(`[BriefRepair] Repaired: ${field}`);
      } catch (error) {
        console.error(`[BriefRepair] Failed to repair ${field}:`, error);
        errors.push(field);
      }
    } else {
      console.warn(`[BriefRepair] No repair function for field: ${field}`);
    }
  }

  if (errors.length > 0) {
    console.warn('[BriefRepair] Failed to repair fields:', errors);
  }

  if (Object.keys(updates).length === 0) {
    return null;
  }

  return updates;
}

/**
 * Repair meta description
 */
async function repairMetaDescription(
  brief: ContentBrief,
  topic: EnrichedTopic,
  pillars: SEOPillars,
  businessInfo: BusinessInfo,
  _allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
): Promise<Partial<ContentBrief>> {
  const generateText = getGenerateText(businessInfo);
  const prompt = `Generate a compelling meta description (150-160 characters) for this article:

Title: ${brief.title || topic.title}
Topic: ${topic.description}
Central Entity: ${pillars.centralEntity}
Business: ${businessInfo.valueProp || businessInfo.projectName || 'Not specified'}

Return ONLY the meta description text, nothing else.`;

  const response = await generateText(prompt, businessInfo, dispatch);
  const metaDescription = response.trim().replace(/^["']|["']$/g, '');

  return { metaDescription };
}

/**
 * Repair content outline (structured_outline)
 */
async function repairContentOutline(
  brief: ContentBrief,
  topic: EnrichedTopic,
  pillars: SEOPillars,
  businessInfo: BusinessInfo,
  _allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
): Promise<Partial<ContentBrief>> {
  const generateText = getGenerateText(businessInfo);
  const prompt = `Create a content outline for this article with 4-6 main sections:

Title: ${brief.title || topic.title}
Topic: ${topic.description}
Central Entity: ${pillars.centralEntity}
Source Context: ${pillars.sourceContext}
Search Intent: ${pillars.centralSearchIntent}

Return a JSON array of sections, each with:
- key: unique identifier (lowercase-with-dashes)
- heading: the section heading
- level: 2 for main sections, 3 for subsections
- subordinate_text_hint: brief hint for the first sentence
- subsections: array of child sections (can be empty)

Example:
[
  {"key": "introduction", "heading": "Introduction", "level": 2, "subordinate_text_hint": "Hook and overview", "subsections": []},
  ...
]`;

  const response = await generateText(prompt, businessInfo, dispatch);

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');

    const sections = JSON.parse(jsonMatch[0]);

    // Validate and clean sections to match BriefSection type
    const cleanedSections: BriefSection[] = sections.map((s: any, i: number) => ({
      key: s.key || `section-${i}`,
      heading: s.heading || `Section ${i + 1}`,
      level: s.level || 2,
      subordinate_text_hint: s.subordinate_text_hint || s.content_notes || '',
      subsections: s.subsections || [],
    }));

    return { structured_outline: cleanedSections };
  } catch (error) {
    console.error('[BriefRepair] Failed to parse outline:', error);
    throw error;
  }
}

/**
 * Repair SERP word count data
 */
async function repairSerpWordCount(
  brief: ContentBrief,
  topic: EnrichedTopic,
  _pillars: SEOPillars,
  _businessInfo: BusinessInfo,
  _allTopics: EnrichedTopic[],
  _dispatch: React.Dispatch<any>
): Promise<Partial<ContentBrief>> {
  // Use a reasonable default based on topic type
  const isGuide = topic.title.toLowerCase().includes('guide') ||
                  topic.title.toLowerCase().includes('how to');
  const avgWordCount = isGuide ? 2500 : 1800;

  return {
    serpAnalysis: {
      ...brief.serpAnalysis,
      avgWordCount,
      peopleAlsoAsk: brief.serpAnalysis?.peopleAlsoAsk || [],
      competitorHeadings: brief.serpAnalysis?.competitorHeadings || [],
    }
  };
}

/**
 * Repair People Also Ask questions
 */
async function repairPeopleAlsoAsk(
  brief: ContentBrief,
  topic: EnrichedTopic,
  pillars: SEOPillars,
  businessInfo: BusinessInfo,
  _allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
): Promise<Partial<ContentBrief>> {
  const generateText = getGenerateText(businessInfo);
  const prompt = `Generate 5-7 "People Also Ask" questions that users might search for related to this topic:

Topic: ${brief.title || topic.title}
Description: ${topic.description}
Central Entity: ${pillars.centralEntity}
Search Intent: ${pillars.centralSearchIntent}

Return ONLY a JSON array of question strings, like:
["Question 1?", "Question 2?", ...]`;

  const response = await generateText(prompt, businessInfo, dispatch);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');

    const questions: string[] = JSON.parse(jsonMatch[0]);

    return {
      serpAnalysis: {
        ...brief.serpAnalysis,
        avgWordCount: brief.serpAnalysis?.avgWordCount || 1800,
        competitorHeadings: brief.serpAnalysis?.competitorHeadings || [],
        peopleAlsoAsk: questions,
      }
    };
  } catch (error) {
    console.error('[BriefRepair] Failed to parse PAA questions:', error);
    throw error;
  }
}

/**
 * Repair contextual bridge / internal linking
 */
async function repairContextualBridge(
  brief: ContentBrief,
  topic: EnrichedTopic,
  _pillars: SEOPillars,
  businessInfo: BusinessInfo,
  allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
): Promise<Partial<ContentBrief>> {
  // Find related topics for internal linking
  const relatedTopics = allTopics
    .filter(t => t.id !== topic.id)
    .slice(0, 10)
    .map(t => ({ title: t.title, slug: t.slug }));

  if (relatedTopics.length === 0) {
    const emptyLinks: ContextualBridgeLink[] = [];
    return { contextualBridge: emptyLinks };
  }

  const generateText = getGenerateText(businessInfo);
  const prompt = `Suggest 3-5 internal links from this article to related topics:

Current Article: ${brief.title || topic.title}
Related Topics: ${JSON.stringify(relatedTopics)}

For each link, provide:
- targetTopic: the target article title
- anchorText: suggested anchor text
- reasoning: brief context for where to place the link

Return a JSON array:
[{"targetTopic": "...", "anchorText": "...", "reasoning": "..."}, ...]`;

  const response = await generateText(prompt, businessInfo, dispatch);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');

    const links = JSON.parse(jsonMatch[0]);

    const contextualBridgeLinks: ContextualBridgeLink[] = links.map((l: any) => ({
      targetTopic: l.targetTopic,
      anchorText: l.anchorText,
      reasoning: l.reasoning || l.context || '',
    }));

    return { contextualBridge: contextualBridgeLinks };
  } catch (error) {
    console.error('[BriefRepair] Failed to parse contextual bridge:', error);
    throw error;
  }
}

/**
 * Repair featured image guidance
 */
async function repairFeaturedImage(
  brief: ContentBrief,
  topic: EnrichedTopic,
  pillars: SEOPillars,
  businessInfo: BusinessInfo,
  _allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<any>
): Promise<Partial<ContentBrief>> {
  const generateText = getGenerateText(businessInfo);
  const prompt = `Create a featured image prompt for this article:

Title: ${brief.title || topic.title}
Topic: ${topic.description}
Central Entity: ${pillars.centralEntity}

Return a detailed image generation prompt (50-100 words) describing the ideal featured image.
Include style, composition, colors, and key elements.
Return ONLY the prompt text.`;

  const response = await generateText(prompt, businessInfo, dispatch);

  return {
    visuals: {
      ...brief.visuals,
      featuredImagePrompt: response.trim(),
      imageAltText: brief.visuals?.imageAltText || `Featured image for ${brief.title || topic.title}`,
    }
  };
}

// Note: repairTargetKeyword and repairSearchIntent were removed because
// the database schema doesn't have columns for these fields.
// They exist in the TypeScript interface but can't be persisted.
