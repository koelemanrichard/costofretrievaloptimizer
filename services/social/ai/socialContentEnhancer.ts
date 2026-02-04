/**
 * AI-Powered Social Content Enhancer
 *
 * Uses AI to generate contextual hashtags, engaging content,
 * and smart recommendations for social media posts.
 */

import type {
  SocialMediaPlatform,
  SocialPostInput,
  ArticleTransformationSource
} from '../../../types/social';
import type { BusinessInfo } from '../../../types';
import { dispatchToProvider } from '../../ai/providerDispatcher';
import * as geminiService from '../../geminiService';
import * as openAiService from '../../openAiService';
import * as anthropicService from '../../anthropicService';

// No-op dispatch for AI calls that don't need state updates
const noopDispatch: React.Dispatch<any> = () => {};

/**
 * AI enhancement request options
 */
export interface EnhancementOptions {
  platform: SocialMediaPlatform;
  source: ArticleTransformationSource;
  businessInfo: BusinessInfo;
  existingContent?: string;
  templateType?: string;
  isHub?: boolean;
}

/**
 * AI-generated hashtag result
 */
export interface AIHashtagResult {
  primary: string[];      // Main topical hashtags (3-5)
  trending: string[];     // Currently trending related hashtags (1-2)
  niche: string[];        // Industry-specific hashtags (2-3)
  branded: string[];      // Brand/company hashtags (1-2)
  reasoning: string;      // Why these hashtags were chosen
}

/**
 * AI-generated content result
 */
export interface AIContentResult {
  hook: string;           // Attention-grabbing opening line
  body: string;           // Main content body
  cta: string;            // Call-to-action
  fullContent: string;    // Complete formatted content
  engagementTips: string[];
}

/**
 * AI-generated mentions result
 */
export interface AIMentionsResult {
  suggested: Array<{
    handle: string;
    reason: string;
    type: 'influencer' | 'brand' | 'publication' | 'organization';
  }>;
  reasoning: string;
}

/**
 * AI-generated posting time result
 */
export interface AIPostingTimeResult {
  optimal: string;        // e.g., "Tuesday 10am-12pm"
  alternative: string;    // e.g., "Thursday 2pm-4pm"
  reasoning: string;      // Why these times
  audienceInsight: string;
}

/**
 * Complete AI enhancement result
 */
export interface AIEnhancementResult {
  hashtags: AIHashtagResult;
  content: AIContentResult;
  mentions: AIMentionsResult;
  postingTime: AIPostingTimeResult;
  complianceSuggestions: string[];
}

// Platform-specific hashtag limits
const PLATFORM_HASHTAG_LIMITS: Record<SocialMediaPlatform, number> = {
  linkedin: 5,
  twitter: 2,
  facebook: 3,
  instagram: 10,
  pinterest: 5
};

// Platform-specific content guidelines
const PLATFORM_GUIDELINES: Record<SocialMediaPlatform, {
  tone: string;
  style: string;
  ctaStyle: string;
  hashtagPlacement: string;
}> = {
  linkedin: {
    tone: 'professional, insightful, thought-leadership',
    style: 'longer-form, storytelling with data points',
    ctaStyle: 'professional invitation to learn more',
    hashtagPlacement: 'at the end, after content'
  },
  twitter: {
    tone: 'concise, punchy, conversational',
    style: 'short, direct, use of line breaks for impact',
    ctaStyle: 'casual, urgent, create curiosity',
    hashtagPlacement: 'integrated naturally, 1-2 max'
  },
  facebook: {
    tone: 'friendly, community-focused, engaging',
    style: 'story-driven, relatable, ask questions',
    ctaStyle: 'soft invitation, ask for opinions',
    hashtagPlacement: 'minimal, at the end'
  },
  instagram: {
    tone: 'visual-first, inspirational, authentic',
    style: 'emojis welcome, break into paragraphs',
    ctaStyle: 'encourage saves/shares, bio link mention',
    hashtagPlacement: 'in first comment or at end of caption'
  },
  pinterest: {
    tone: 'inspirational, helpful, discovery-focused',
    style: 'keyword-rich, descriptive, actionable',
    ctaStyle: 'save for later, click for full guide',
    hashtagPlacement: 'as keywords in description'
  }
};

/**
 * Generate AI-powered hashtags for social posts
 */
export async function generateAIHashtags(
  options: EnhancementOptions
): Promise<AIHashtagResult> {
  const { platform, source, businessInfo } = options;
  const limit = PLATFORM_HASHTAG_LIMITS[platform];
  const guidelines = PLATFORM_GUIDELINES[platform];

  const prompt = `You are a social media hashtag expert. Generate optimal hashtags for a ${platform} post.

CONTENT CONTEXT:
- Title: ${source.title}
- Meta Description: ${source.meta_description}
- Key Takeaways: ${source.key_takeaways.slice(0, 3).join('; ')}
- Main Entities: ${source.schema_entities.map(e => `${e.name} (${e.type})`).join(', ')}
- Industry/Domain: ${businessInfo.domain || 'general'}
- Target Language: ${source.language || 'en'}

PLATFORM REQUIREMENTS:
- Platform: ${platform}
- Maximum hashtags: ${limit}
- Tone: ${guidelines.tone}
- Hashtag placement: ${guidelines.hashtagPlacement}

HASHTAG STRATEGY:
1. Primary hashtags: Core topic hashtags that directly relate to the content
2. Trending hashtags: Currently popular hashtags in this niche (research-based)
3. Niche hashtags: Industry-specific hashtags with engaged communities
4. Branded hashtags: Company or campaign-specific tags

RULES:
- No spaces in hashtags
- CamelCase for multi-word hashtags (e.g., ContentMarketing not contentmarketing)
- Mix high-volume and niche hashtags for reach + engagement
- Avoid banned or overused generic hashtags
- Consider the target language for hashtag selection

Return JSON only:
{
  "primary": ["hashtag1", "hashtag2", "hashtag3"],
  "trending": ["trending1"],
  "niche": ["niche1", "niche2"],
  "branded": [],
  "reasoning": "Brief explanation of hashtag strategy"
}`;

  try {
    const response = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, noopDispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, noopDispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, noopDispatch)
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultHashtags(source, platform);
    }

    const result = JSON.parse(jsonMatch[0]) as AIHashtagResult;

    // Validate and trim to limit
    const totalHashtags = [
      ...result.primary,
      ...result.trending,
      ...result.niche,
      ...result.branded
    ].slice(0, limit);

    return {
      primary: result.primary?.slice(0, 3) || [],
      trending: result.trending?.slice(0, 2) || [],
      niche: result.niche?.slice(0, 2) || [],
      branded: result.branded?.slice(0, 1) || [],
      reasoning: result.reasoning || 'AI-generated hashtag strategy'
    };
  } catch (error) {
    console.error('[SocialContentEnhancer] Hashtag generation failed:', error);
    return getDefaultHashtags(source, platform);
  }
}

/**
 * Generate AI-powered content for social posts
 */
export async function generateAIContent(
  options: EnhancementOptions
): Promise<AIContentResult> {
  const { platform, source, businessInfo, templateType, isHub } = options;
  const guidelines = PLATFORM_GUIDELINES[platform];

  const postType = isHub ? 'hub announcement (main article promotion)' : 'spoke post (supporting content)';
  const templateContext = templateType
    ? `Template style: ${templateType}`
    : 'Create engaging promotional content';

  const prompt = `You are a social media copywriter expert in ${platform}. Create engaging post content.

CONTENT TO PROMOTE:
- Title: ${source.title}
- Meta Description: ${source.meta_description}
- Key Takeaways:
${source.key_takeaways.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}
- Main Entities: ${source.schema_entities.map(e => e.name).join(', ')}
- Link: ${source.link_url || '[no link provided]'}
- Language: ${source.language || 'en'}

POST REQUIREMENTS:
- Platform: ${platform}
- Post Type: ${postType}
- ${templateContext}

PLATFORM STYLE GUIDE:
- Tone: ${guidelines.tone}
- Style: ${guidelines.style}
- CTA Style: ${guidelines.ctaStyle}

RULES:
1. Start with an attention-grabbing hook (first line is crucial)
2. Explicitly name entities - no vague "it" or "this"
3. Include ONE clear EAV fact (Entity-Attribute-Value)
4. Avoid filler phrases like "In this post" or "Let me share"
5. End with a clear CTA if link is provided
6. Match the language specified (${source.language || 'en'})
7. Keep semantic SEO compliance high

Return JSON only:
{
  "hook": "Attention-grabbing first line",
  "body": "Main content body with key message",
  "cta": "Call-to-action text",
  "fullContent": "Complete post ready to copy-paste",
  "engagementTips": ["Tip 1", "Tip 2"]
}`;

  try {
    const response = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, noopDispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, noopDispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, noopDispatch)
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultContent(source, platform, isHub);
    }

    return JSON.parse(jsonMatch[0]) as AIContentResult;
  } catch (error) {
    console.error('[SocialContentEnhancer] Content generation failed:', error);
    return getDefaultContent(source, platform, isHub);
  }
}

/**
 * Generate AI-powered mention suggestions
 */
export async function generateAIMentions(
  options: EnhancementOptions
): Promise<AIMentionsResult> {
  const { platform, source, businessInfo } = options;

  const prompt = `You are a social media strategist. Suggest relevant accounts to mention in a ${platform} post.

CONTENT CONTEXT:
- Topic: ${source.title}
- Industry: ${businessInfo.domain || 'general'}
- Main Entities: ${source.schema_entities.map(e => `${e.name} (${e.type})`).join(', ')}

MENTION CATEGORIES:
1. Influencers: Thought leaders in this topic space
2. Brands: Relevant companies or products mentioned
3. Publications: Industry publications that cover this topic
4. Organizations: Professional bodies, associations, research institutions

RULES:
- Only suggest REAL accounts that exist on ${platform}
- Prioritize accounts that engage with their mentions
- Don't suggest competitors of the business
- Limit to 2-3 most relevant mentions
- If uncertain about account existence, note it

Return JSON only:
{
  "suggested": [
    {
      "handle": "@accountname",
      "reason": "Why mention them",
      "type": "influencer|brand|publication|organization"
    }
  ],
  "reasoning": "Overall mention strategy explanation"
}`;

  try {
    const response = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, noopDispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, noopDispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, noopDispatch)
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { suggested: [], reasoning: 'Unable to generate mention suggestions' };
    }

    return JSON.parse(jsonMatch[0]) as AIMentionsResult;
  } catch (error) {
    console.error('[SocialContentEnhancer] Mention generation failed:', error);
    return { suggested: [], reasoning: 'Mention generation failed' };
  }
}

/**
 * Generate AI-powered optimal posting time
 */
export async function generateAIPostingTime(
  options: EnhancementOptions
): Promise<AIPostingTimeResult> {
  const { platform, source, businessInfo } = options;

  const prompt = `You are a social media timing expert. Recommend optimal posting times for a ${platform} post.

CONTENT CONTEXT:
- Topic: ${source.title}
- Industry: ${businessInfo.domain || 'general'}
- Content Type: ${source.key_takeaways.length > 3 ? 'detailed/educational' : 'quick insight'}
- Target Audience: B2B professional / B2C consumer (infer from industry)

PLATFORM: ${platform}

CONSIDER:
1. Platform-specific peak engagement times
2. Industry/niche audience behavior
3. Content type (educational content vs quick tips)
4. Global audience if applicable
5. Avoid posting during low-engagement periods

Return JSON only:
{
  "optimal": "Day Time-Range (e.g., Tuesday 10am-12pm)",
  "alternative": "Day Time-Range",
  "reasoning": "Brief explanation of timing strategy",
  "audienceInsight": "Insight about when this audience is most active"
}`;

  try {
    const response = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, noopDispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, noopDispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, noopDispatch)
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultPostingTime(platform);
    }

    return JSON.parse(jsonMatch[0]) as AIPostingTimeResult;
  } catch (error) {
    console.error('[SocialContentEnhancer] Posting time generation failed:', error);
    return getDefaultPostingTime(platform);
  }
}

/**
 * Generate complete AI enhancement for a social post
 */
export async function enhanceSocialPost(
  options: EnhancementOptions
): Promise<AIEnhancementResult> {
  // Run all AI enhancements in parallel for efficiency
  const [hashtags, content, mentions, postingTime] = await Promise.all([
    generateAIHashtags(options),
    generateAIContent(options),
    generateAIMentions(options),
    generateAIPostingTime(options)
  ]);

  // Generate compliance suggestions based on results
  const complianceSuggestions = generateComplianceSuggestions(
    content,
    hashtags,
    options.source
  );

  return {
    hashtags,
    content,
    mentions,
    postingTime,
    complianceSuggestions
  };
}

/**
 * Apply AI enhancements to a post input
 */
export function applyEnhancementsToPost(
  postInput: SocialPostInput,
  enhancements: AIEnhancementResult
): SocialPostInput {
  return {
    ...postInput,
    content_text: enhancements.content.fullContent,
    hashtags: [
      ...enhancements.hashtags.primary,
      ...enhancements.hashtags.trending,
      ...enhancements.hashtags.niche,
      ...enhancements.hashtags.branded
    ],
    mentions: enhancements.mentions.suggested.map(m => m.handle)
  };
}

// ============================================================================
// FALLBACK FUNCTIONS
// ============================================================================

function getDefaultHashtags(
  source: ArticleTransformationSource,
  platform: SocialMediaPlatform
): AIHashtagResult {
  const limit = PLATFORM_HASHTAG_LIMITS[platform];
  const entityHashtags = source.schema_entities
    .slice(0, limit)
    .map(e => e.name.replace(/\s+/g, ''));

  return {
    primary: entityHashtags,
    trending: [],
    niche: [],
    branded: [],
    reasoning: 'Default hashtags generated from entities'
  };
}

function getDefaultContent(
  source: ArticleTransformationSource,
  platform: SocialMediaPlatform,
  isHub?: boolean
): AIContentResult {
  const entity = source.schema_entities[0]?.name || 'this topic';
  const hook = isHub
    ? `New article: ${source.title}`
    : `Key insight about ${entity}`;
  const body = source.key_takeaways[0] || source.meta_description;
  const cta = source.link_url ? `Read more: ${source.link_url}` : '';

  return {
    hook,
    body,
    cta,
    fullContent: `${hook}\n\n${body}${cta ? `\n\n${cta}` : ''}`,
    engagementTips: ['Post when your audience is most active']
  };
}

function getDefaultPostingTime(platform: SocialMediaPlatform): AIPostingTimeResult {
  const defaults: Record<SocialMediaPlatform, AIPostingTimeResult> = {
    linkedin: {
      optimal: 'Tuesday 10am-12pm',
      alternative: 'Wednesday 8am-10am',
      reasoning: 'Peak B2B engagement times',
      audienceInsight: 'Professionals check LinkedIn during morning work hours'
    },
    twitter: {
      optimal: 'Monday-Thursday 9am-12pm',
      alternative: 'Tuesday-Wednesday 12pm-3pm',
      reasoning: 'Highest engagement during work breaks',
      audienceInsight: 'Twitter users scroll during commutes and breaks'
    },
    facebook: {
      optimal: 'Wednesday 11am-1pm',
      alternative: 'Friday 10am-12pm',
      reasoning: 'Midday engagement peaks',
      audienceInsight: 'Users most active during lunch hours'
    },
    instagram: {
      optimal: 'Monday-Friday 11am-1pm',
      alternative: 'Tuesday-Friday 7pm-9pm',
      reasoning: 'Mix of lunch and evening engagement',
      audienceInsight: 'Visual content performs well during breaks and evenings'
    },
    pinterest: {
      optimal: 'Saturday-Sunday 8pm-11pm',
      alternative: 'Friday evening',
      reasoning: 'Users plan and discover on weekends',
      audienceInsight: 'Pinterest is used for planning and inspiration'
    }
  };

  return defaults[platform];
}

function generateComplianceSuggestions(
  content: AIContentResult,
  hashtags: AIHashtagResult,
  source: ArticleTransformationSource
): string[] {
  const suggestions: string[] = [];

  // Check for entity mentions
  const contentText = content.fullContent.toLowerCase();
  const mentionedEntities = source.schema_entities.filter(
    e => contentText.includes(e.name.toLowerCase())
  );

  if (mentionedEntities.length === 0) {
    suggestions.push('Consider explicitly mentioning at least one entity by name');
  }

  // Check for vague pronouns
  const vaguePronouns = ['it is', 'this is', 'that is', 'these are'];
  for (const vague of vaguePronouns) {
    if (contentText.includes(vague)) {
      suggestions.push(`Replace vague "${vague}" with specific entity name`);
      break;
    }
  }

  // Check hashtag quality
  if (hashtags.primary.length < 2) {
    suggestions.push('Add more primary topic hashtags for discoverability');
  }

  // Check for filler phrases
  const fillerPhrases = ['in this post', 'let me share', 'basically', 'overall'];
  for (const filler of fillerPhrases) {
    if (contentText.includes(filler)) {
      suggestions.push(`Remove filler phrase "${filler}" for more impactful content`);
    }
  }

  return suggestions;
}
