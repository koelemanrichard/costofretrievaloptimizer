/**
 * Image Prompt Generator Service
 *
 * Generates optimal image prompts from selected context text,
 * following Visual Semantics rules for SEO.
 */

import { callProviderWithFallback } from '../contentGeneration/providerUtils';
import { BusinessInfo } from '../../../types';
import {
  ImagePromptRequest,
  ImagePromptResult,
  ImageStyle,
  AspectRatio,
  PlacementSuggestion,
  ImageTier,
} from '../../../types/contextualEditor';

import { resolvePersonalityToTokens } from '../../publishing/tokenResolver';
import { DesignPersonalityId } from '../../../config/designTokens/personalities';
import {
  routeContentToImageType,
  getPromptModifiers,
  buildNoTextInstruction,
  IMAGE_TYPE_PROMPTS,
} from '../../../config/imageTypeRouting';

/**
 * Build a style descriptor for the AI prompt based on design personality
 */
function getVisualVibeDescriptor(personalityId?: string): string {
  if (!personalityId) return '';

  const id = personalityId as DesignPersonalityId;
  switch (id) {
    case 'modern-minimal':
      return 'minimalist aesthetic, clean composition, pastel colors, generous white space, soft lighting, 4k resolution';
    case 'bold-creative':
    case 'tech-clean':
      return 'vibrant high-contrast style, futuristic elements, glassmorphism, dynamic lighting, sharp edges, professional digital art';
    case 'warm-friendly':
      return 'approachable organic style, soft focus, natural textures, inviting composition';
    case 'corporate-professional':
    case 'bold-editorial':
      return 'premium editorial photography style, high-end magazine aesthetic, sophisticated composition, balanced lighting';
    default:
      return '';
  }
}

/**
 * Convert hex color to simple color name for AI prompts
 */
function getColorKeyword(hex?: string): string {
  if (!hex) return '';
  // Very basic mapping for major brand colors
  if (hex.startsWith('#f') || hex.startsWith('#F')) return 'vibrant orange and warm tones';
  if (hex.startsWith('#e') || hex.startsWith('#E')) return 'energetic red and warm accents';
  if (hex.startsWith('#3') || hex.startsWith('#2')) return 'professional blue and cool tones';
  if (hex.startsWith('#0') || hex.startsWith('#1')) return 'sleek dark and moody tones';
  return 'branded color accents';
}

/**
 * Suggest image style based on content analysis
 * Uses photographic-first routing - only suggests diagrams for explicitly technical content
 */
export function suggestImageStyle(contextText: string, personalityId?: string): ImageStyle {
  const { imageType } = routeContentToImageType(contextText);
  return imageType;
}

/**
 * Get the image tier for a given style
 */
export function getImageTier(style: ImageStyle): ImageTier {
  const mapping = IMAGE_TYPE_PROMPTS[style];
  return mapping?.tier || 'photographic';
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
 * - Uses photographic-first routing with proper tier differentiation
 */
async function buildImagePrompt(params: {
  contextText: string;
  sectionHeading: string;
  articleTitle: string;
  style: ImageStyle;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<any>;
  personalityId?: string;
}): Promise<string> {
  const { contextText, sectionHeading, articleTitle, style, businessInfo, dispatch, personalityId } = params;

  const vibeDescriptor = getVisualVibeDescriptor(personalityId);
  const colorHint = getColorKeyword((businessInfo as any)?.branding?.colors?.primary);

  // Get routing info for the content
  const routingInfo = routeContentToImageType(contextText);
  const tier = getImageTier(style);
  const promptModifiers = getPromptModifiers(style);
  const noTextInstruction = buildNoTextInstruction(style);

  // Build style-specific instructions based on tier
  const tierInstruction = tier === 'photographic'
    ? `Create a PHOTOGRAPH - real-world photography with no text, labels, or watermarks.`
    : `Create a MINIMAL DIAGRAM - simple geometric shapes and lines only, no text labels or annotations.`;

  const styleModifiersText = promptModifiers.join(', ');

  const systemPrompt = `You are an expert at creating image generation prompts for SEO content.

IMAGE TYPE: ${style.toUpperCase()} (${tier} tier)
${tierInstruction}

${noTextInstruction}

Your task is to create a detailed, specific prompt for generating a ${style} that:
1. Directly relates to the content context
2. Adds visual value without being generic
3. Matches the brand's visual identity: ${vibeDescriptor || 'professional and clean'}
4. Incorporates brand colors: ${colorHint || 'natural lighting'}
5. Avoids copyrighted characters, logos, or trademarked content
6. Is appropriate for professional/business content

REQUIRED STYLE MODIFIERS: ${styleModifiersText}

Context from the article:
"${contextText}"

Section: ${sectionHeading}
Article: ${articleTitle}
${(businessInfo as any)?.projectName ? `Business: ${(businessInfo as any).projectName}` : ''}
${(businessInfo as any)?.targetMarket ? `Location: ${(businessInfo as any).targetMarket}` : ''}

Generate a single, detailed prompt (50-100 words) for creating this ${style}.
Include the required style modifiers and keywords for composition, lighting, and "vibe": ${vibeDescriptor || 'standard professional'}.
Emphasize these tones: ${colorHint || 'balanced lighting'}.
${tier === 'photographic' ? 'Emphasize: PHOTOGRAPH, real photography, no text visible.' : 'Emphasize: MINIMAL DIAGRAM, geometric shapes only, no labels.'}
Do not include any explanations, just the prompt.`;

  // Use the user's preferred AI provider with fallback support
  const result = await callProviderWithFallback(businessInfo, systemPrompt);

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
  personalityId?: string;
}): Promise<ImagePromptResult> {
  const { request, businessInfo, dispatch, imageType = 'content', personalityId } = params;

  // Analyze context to suggest appropriate style
  const suggestedStyle = suggestImageStyle(request.contextText, personalityId);

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
