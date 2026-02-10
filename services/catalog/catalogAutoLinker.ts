/**
 * Catalog Auto-Linker - AI-powered category-to-topic matching
 *
 * Analyzes category names against topic titles and suggests matches
 * with confidence scores. Supports creating new topics for unmatched categories.
 */

import type { BusinessInfo, EnrichedTopic } from '../../types';
import type { CatalogCategory, AutoLinkSuggestion, NewTopicSuggestion } from '../../types/catalog';
import { dispatchToProvider } from '../ai/providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as openRouterService from '../openRouterService';
import * as perplexityService from '../perplexityService';
import { AIResponseSanitizer } from '../aiResponseSanitizer';

interface AutoLinkResult {
  suggestions: AutoLinkSuggestion[];
  newTopicSuggestions: NewTopicSuggestion[];
}

/**
 * Use AI to match catalog categories to existing topical map topics.
 */
export async function autoLinkCategoriesToTopics(
  categories: CatalogCategory[],
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<AutoLinkResult> {
  const unlinnkedCategories = categories.filter(c => !c.linked_topic_id && c.status === 'active');

  if (unlinnkedCategories.length === 0) {
    return { suggestions: [], newTopicSuggestions: [] };
  }

  const categoryNames = unlinnkedCategories.map(c => ({ id: c.id, name: c.name }));
  const topicNames = topics.map(t => ({ id: t.id, title: t.title, type: t.type }));

  const prompt = buildAutoLinkPrompt(categoryNames, topicNames);

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'CatalogAutoLinker',
      message: `Auto-linking ${unlinnkedCategories.length} categories to ${topics.length} topics...`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  try {
    const responseText = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
      openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
      perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
    });

    const sanitizer = new AIResponseSanitizer(dispatch);
    const parsed = sanitizer.sanitize<{ matches: any[] }>(
      responseText,
      { matches: Array },
      { matches: [] }
    );

    if (!parsed || !Array.isArray(parsed.matches) || parsed.matches.length === 0) {
      throw new Error('Invalid auto-link response');
    }

    const suggestions: AutoLinkSuggestion[] = [];
    const newTopicSuggestions: NewTopicSuggestion[] = [];

    for (const match of parsed.matches) {
      const category = unlinnkedCategories.find(c => c.id === match.category_id);
      if (!category) continue;

      if (match.topic_id) {
        const topic = topics.find(t => t.id === match.topic_id);
        suggestions.push({
          categoryId: match.category_id,
          categoryName: category.name,
          suggestedTopicId: match.topic_id,
          suggestedTopicTitle: topic?.title || null,
          confidence: match.confidence || 0,
          action: 'accept',
        });
      } else {
        // No match — suggest creating a new topic
        suggestions.push({
          categoryId: match.category_id,
          categoryName: category.name,
          suggestedTopicId: null,
          suggestedTopicTitle: null,
          confidence: 0,
          action: 'create',
        });

        newTopicSuggestions.push({
          categoryId: match.category_id,
          categoryName: category.name,
          suggestedTitle: match.suggested_title || category.name,
          suggestedParentTopicId: match.suggested_parent_id,
          suggestedType: match.suggested_type || 'core',
          suggestedTopicClass: 'monetization',
        });
      }
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'CatalogAutoLinker',
        message: `Found ${suggestions.filter(s => s.suggestedTopicId).length} matches, ${newTopicSuggestions.length} need new topics`,
        status: 'success',
        timestamp: Date.now(),
      },
    });

    return { suggestions, newTopicSuggestions };
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'CatalogAutoLinker',
        message: `Auto-link failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        timestamp: Date.now(),
      },
    });
    throw error;
  }
}

function buildAutoLinkPrompt(
  categories: { id: string; name: string }[],
  topics: { id: string; title: string; type: string }[]
): string {
  return `You are a semantic SEO expert. Match these ecommerce store categories to existing topical map topics.

## Store Categories
${categories.map(c => `- id: "${c.id}", name: "${c.name}"`).join('\n')}

## Existing Topics
${topics.map(t => `- id: "${t.id}", title: "${t.title}", type: "${t.type}"`).join('\n')}

## Instructions
For each category, find the best matching topic based on semantic similarity. Consider:
- Category "Organic Baby Bodysuits" matches topic "Organic Baby Bodysuits Guide" (high confidence)
- Category "Accessories" might match topic "Baby Accessories" (medium confidence)
- If NO good match exists (< 50% confidence), set topic_id to null

Return JSON:
\`\`\`json
{
  "matches": [
    {
      "category_id": "...",
      "topic_id": "..." or null,
      "confidence": 0-100,
      "suggested_title": "..." (only if topic_id is null — suggested new topic title),
      "suggested_parent_id": "..." (only if topic_id is null — best parent topic),
      "suggested_type": "core" | "outer" | "child" (only if topic_id is null)
    }
  ]
}
\`\`\`

Only return the JSON, no other text.`;
}
