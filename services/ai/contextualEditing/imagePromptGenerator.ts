/**
 * Image Prompt Generator Service
 *
 * Generates optimal image prompts from selected context text,
 * following Visual Semantics rules for SEO.
 */

import { generateText } from '../../geminiService';
import { BusinessInfo } from '../../../types';
import {
  ImagePromptRequest,
  ImagePromptResult,
  ImageStyle,
  AspectRatio,
  PlacementSuggestion,
} from '../../../types/contextualEditor';

/**
 * Suggest image style based on content analysis
 */
export function suggestImageStyle(contextText: string): ImageStyle {
  const lower = contextText.toLowerCase();

  // How-to, process, step-by-step content -> diagram
  if (/how to|step|process|install|guide|tutorial/i.test(lower)) {
    return 'diagram';
  }

  // Statistics, data, comparisons -> infographic
  if (/statistics|data|percent|%|comparison|chart|graph/i.test(lower)) {
    return 'infographic';
  }

  // Location, office, team content -> photograph
  if (/office|location|building|team|staff|city|region/i.test(lower)) {
    return 'photograph';
  }

  // Conceptual content -> illustration
  if (/concept|idea|strategy|approach|method|benefit/i.test(lower)) {
    return 'illustration';
  }

  // Default to photograph for general content
  return 'photograph';
}

/**
 * Suggest aspect ratio based on image type
 */
export function suggestAspectRatio(imageType: 'hero' | 'content' | 'inline'): AspectRatio {
  switch (imageType) {
    case 'hero':
      return '16:9';
    case 'content':
      return '4:3';
    case 'inline':
      return '1:1';
    default:
      return '4:3';
  }
}

/**
 * Generate SEO-optimized alt text from context
 *
 * Extracts key phrases (capitalized words/phrases) from the context
 * and combines them with section heading keywords.
 */
export function generateAltText(contextText: string, sectionHeading: string): string {
  const words = contextText.split(/\s+/);
  const keyPhrases: string[] = [];

  // Extract capitalized word sequences as key phrases
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i];
    const nextWord = words[i + 1];

    if (/^[A-Z]/.test(word) && word.length > 2) {
      if (/^[A-Z]/.test(nextWord)) {
        keyPhrases.push(`${word} ${nextWord}`);
        i++; // Skip next word since we already used it
      } else {
        keyPhrases.push(word);
      }
    }
  }

  // Extract keywords from section heading
  const headingWords = sectionHeading.replace(/[^\w\s]/g, '').split(/\s+/);

  // Combine key phrases (limit to first 3) with heading words (limit to first 2)
  const allPhrases = [...new Set([...keyPhrases.slice(0, 3), ...headingWords.slice(0, 2)])];
  const altText = allPhrases.join(' - ').toLowerCase();

  // Provide fallback if no key phrases were extracted
  return altText || 'image related to ' + sectionHeading.toLowerCase();
}

/**
 * Determine optimal image placement based on Visual Semantics rules
 *
 * Following SEO best practices:
 * - Images should be placed near the content they illustrate
 * - after_paragraph placement associates image with preceding text
 */
export function determinePlacement(
  contextText: string,
  sectionKey: string
): PlacementSuggestion {
  return {
    position: 'after_paragraph',
    rationale: 'Placed after paragraph to associate image with preceding text context',
    sectionKey,
  };
}

/**
 * Build the image prompt using AI
 *
 * Creates a detailed, specific prompt for image generation that:
 * - Directly relates to the content context
 * - Adds visual value without being generic
 * - Avoids copyrighted content
 * - Is appropriate for professional/business content
 */
async function buildImagePrompt(params: {
  contextText: string;
  sectionHeading: string;
  articleTitle: string;
  style: ImageStyle;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<any>;
}): Promise<string> {
  const { contextText, sectionHeading, articleTitle, style, businessInfo, dispatch } = params;

  const systemPrompt = `You are an expert at creating image generation prompts for SEO content.

Your task is to create a detailed, specific prompt for generating a ${style} that:
1. Directly relates to the content context
2. Adds visual value without being generic
3. Avoids copyrighted characters, logos, or trademarked content
4. Is appropriate for professional/business content

Context from the article:
"${contextText}"

Section: ${sectionHeading}
Article: ${articleTitle}
${businessInfo?.name ? `Business: ${businessInfo.name}` : ''}
${businessInfo?.location ? `Location: ${businessInfo.location}` : ''}

Generate a single, detailed prompt (50-100 words) for creating this ${style}.
Focus on specific visual elements, composition, and style.
Do not include any explanations, just the prompt.`;

  // Use a specific Gemini model to avoid using non-Gemini models from user settings
  const result = await generateText(
    systemPrompt,
    businessInfo,
    dispatch,
    'gemini-3-pro-preview'  // Explicit model to avoid Claude/other model warnings
  );

  return result.trim();
}

/**
 * Main function to generate complete image prompt result
 *
 * Combines all helper functions to produce a comprehensive
 * ImagePromptResult with:
 * - AI-generated prompt
 * - Suggested style (diagram/photograph/illustration/infographic)
 * - Suggested aspect ratio based on image type
 * - SEO-optimized alt text
 * - Placement suggestion with rationale
 */
export async function generateImagePrompt(params: {
  request: ImagePromptRequest;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<any>;
  imageType?: 'hero' | 'content' | 'inline';
}): Promise<ImagePromptResult> {
  const { request, businessInfo, dispatch, imageType = 'content' } = params;

  // Analyze context to suggest appropriate style
  const suggestedStyle = suggestImageStyle(request.contextText);

  // Get aspect ratio based on image placement type
  const suggestedAspectRatio = suggestAspectRatio(imageType);

  // Generate AI-powered image prompt
  const prompt = await buildImagePrompt({
    contextText: request.contextText,
    sectionHeading: request.sectionHeading,
    articleTitle: request.articleTitle,
    style: suggestedStyle,
    businessInfo,
    dispatch,
  });

  // Generate SEO-optimized alt text
  const altTextSuggestion = generateAltText(request.contextText, request.sectionHeading);

  // Determine optimal placement
  const placementSuggestion = determinePlacement(
    request.contextText,
    'current-section'
  );

  return {
    prompt,
    suggestedStyle,
    suggestedAspectRatio,
    altTextSuggestion,
    placementSuggestion,
  };
}
