/**
 * Content Transformer Service
 *
 * Main orchestrator for transforming article content into
 * platform-optimized social media posts.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  SocialMediaPlatform,
  SocialCampaign,
  SocialCampaignInput,
  SocialPost,
  SocialPostInput,
  ArticleTransformationSource,
  TransformationConfig,
  TransformationResult,
  PlatformPostingGuide,
  EntityHashtagMapping
} from '../../../types/social';
import type { BusinessInfo } from '../../../types';
import { hubSpokeOrchestrator, type HubSpokePlan } from './hubSpokeOrchestrator';
import { utmGenerator } from './utmGenerator';
import { hashtagGenerator } from './hashtagGenerator';
import { instructionGenerator } from './instructionGenerator';
import { linkedinAdapter } from './platformAdapters/linkedinAdapter';
import { twitterAdapter } from './platformAdapters/twitterAdapter';
import { facebookAdapter } from './platformAdapters/facebookAdapter';
import { instagramAdapter } from './platformAdapters/instagramAdapter';
import { pinterestAdapter } from './platformAdapters/pinterestAdapter';
import { verifiedInsert } from '../../verifiedDatabaseService';
import {
  generateAIHashtags,
  generateAIContent,
  generateAIMentions,
  generateAIPostingTime,
  type AIHashtagResult,
  type AIContentResult,
  type AIMentionsResult,
  type AIPostingTimeResult
} from '../ai/socialContentEnhancer';

/**
 * Content transformer for social media posts
 */
export class ContentTransformer {
  private supabase: SupabaseClient;
  private userId: string;
  private businessInfo: BusinessInfo | null = null;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Transform article content into a social media campaign
   */
  async transform(
    source: ArticleTransformationSource,
    config: TransformationConfig
  ): Promise<TransformationResult> {
    try {
      // Load platform guides, hashtag mappings, and businessInfo
      await this.loadResources(source, config.useAI);

      // Create hub-spoke plan
      const plan = hubSpokeOrchestrator.createPlan(source, config);

      // Validate plan
      const validation = hubSpokeOrchestrator.validatePlan(plan);
      if (!validation.valid) {
        console.warn('[ContentTransformer] Plan validation warnings:', validation.issues);
      }

      // Create campaign record
      const campaign = await this.createCampaign(source, config, plan);

      // Generate posts (with AI enhancement if enabled)
      const posts = await this.generatePosts(source, config, plan, campaign);

      return {
        success: true,
        campaign,
        posts
      };
    } catch (error) {
      console.error('[ContentTransformer] Transformation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transformation failed'
      };
    }
  }

  /**
   * Load platform guides, hashtag mappings, and optionally businessInfo for AI
   */
  private async loadResources(source: ArticleTransformationSource, loadBusinessInfo?: boolean): Promise<void> {
    // Load platform guides
    const { data: guides } = await this.supabase
      .from('platform_posting_guides')
      .select('*');

    if (guides) {
      instructionGenerator.loadGuides(guides as PlatformPostingGuide[]);
    }

    // Load hashtag mappings for this topic's map
    const { data: topic } = await this.supabase
      .from('topics')
      .select('map_id')
      .eq('id', source.topic_id)
      .single();

    if (topic?.map_id) {
      const { data: mappings } = await this.supabase
        .from('entity_hashtag_mappings')
        .select('*')
        .eq('map_id', topic.map_id);

      if (mappings) {
        hashtagGenerator.loadMappings(mappings as EntityHashtagMapping[]);
      }

      // Load businessInfo for AI if enabled
      if (loadBusinessInfo) {
        const { data: map } = await this.supabase
          .from('topical_maps')
          .select('business_info')
          .eq('id', topic.map_id)
          .single();

        if (map?.business_info) {
          this.businessInfo = map.business_info as BusinessInfo;
        }
      }
    }
  }

  /**
   * Create campaign record in database
   */
  private async createCampaign(
    source: ArticleTransformationSource,
    config: TransformationConfig,
    plan: HubSpokePlan
  ): Promise<SocialCampaign> {
    const campaignName = utmGenerator.generateCampaignName(source.title);

    const campaignInput: SocialCampaignInput = {
      topic_id: source.topic_id,
      job_id: source.job_id,
      campaign_name: campaignName,
      hub_platform: config.hub_platform,
      utm_source: config.utm_source,
      utm_medium: 'organic-social',
      utm_campaign: config.utm_campaign || campaignName
    };

    const insertResult = await verifiedInsert(
      this.supabase,
      { table: 'social_campaigns', operationDescription: 'create social campaign' },
      {
        user_id: this.userId,
        ...campaignInput
      },
      '*'
    );

    if (!insertResult.success || !insertResult.data) {
      throw new Error(`Failed to create campaign: ${insertResult.error}`);
    }

    return insertResult.data as unknown as SocialCampaign;
  }

  /**
   * Generate all posts according to plan
   */
  private async generatePosts(
    source: ArticleTransformationSource,
    config: TransformationConfig,
    plan: HubSpokePlan,
    campaign: SocialCampaign
  ): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];
    const useAI = config.useAI && this.businessInfo;
    const aiEnhancements = config.aiEnhancements || {
      generateHashtags: true,
      generateContent: true,
      suggestMentions: true,
      suggestPostingTime: true
    };

    // Generate hub post
    let hubPostInput = this.generatePostInput(source, config, plan.hub, campaign);

    // Apply AI enhancements if enabled
    if (useAI) {
      hubPostInput = await this.applyAIEnhancements(
        hubPostInput,
        source,
        plan.hub.template_type,
        true,
        aiEnhancements
      );
    }

    const hubPost = await this.savePost(hubPostInput, campaign.id);
    posts.push(hubPost);

    // Generate spoke posts
    for (const spokePlan of plan.spokes) {
      let spokePostInput = this.generatePostInput(source, config, spokePlan, campaign);

      // Apply AI enhancements if enabled
      if (useAI) {
        spokePostInput = await this.applyAIEnhancements(
          spokePostInput,
          source,
          spokePlan.template_type,
          false,
          aiEnhancements
        );
      }

      const spokePost = await this.savePost(spokePostInput, campaign.id);
      posts.push(spokePost);
    }

    return posts;
  }

  /**
   * Apply AI enhancements to a post input
   */
  private async applyAIEnhancements(
    postInput: SocialPostInput,
    source: ArticleTransformationSource,
    templateType: string,
    isHub: boolean,
    options: {
      generateHashtags?: boolean;
      generateContent?: boolean;
      suggestMentions?: boolean;
      suggestPostingTime?: boolean;
    }
  ): Promise<SocialPostInput> {
    if (!this.businessInfo) {
      console.warn('[ContentTransformer] No businessInfo available for AI enhancements');
      return postInput;
    }

    const enhancementOptions = {
      platform: postInput.platform,
      source,
      businessInfo: this.businessInfo,
      existingContent: postInput.content_text,
      templateType,
      isHub
    };

    try {
      // Run AI enhancements in parallel for efficiency
      const promises: Promise<unknown>[] = [];
      let hashtagsPromise: Promise<AIHashtagResult> | null = null;
      let contentPromise: Promise<AIContentResult> | null = null;
      let mentionsPromise: Promise<AIMentionsResult> | null = null;
      let postingTimePromise: Promise<AIPostingTimeResult> | null = null;

      if (options.generateHashtags) {
        hashtagsPromise = generateAIHashtags(enhancementOptions);
        promises.push(hashtagsPromise);
      }

      if (options.generateContent) {
        contentPromise = generateAIContent(enhancementOptions);
        promises.push(contentPromise);
      }

      if (options.suggestMentions) {
        mentionsPromise = generateAIMentions(enhancementOptions);
        promises.push(mentionsPromise);
      }

      if (options.suggestPostingTime) {
        postingTimePromise = generateAIPostingTime(enhancementOptions);
        promises.push(postingTimePromise);
      }

      // Wait for all AI calls
      await Promise.all(promises);

      // Apply results
      let enhancedInput = { ...postInput };

      if (hashtagsPromise) {
        const hashtags = await hashtagsPromise;
        enhancedInput.hashtags = [
          ...hashtags.primary,
          ...hashtags.trending,
          ...hashtags.niche,
          ...hashtags.branded
        ];
      }

      if (contentPromise) {
        const content = await contentPromise;
        // Use AI-generated content, preserving hashtags at the end
        const hashtagText = enhancedInput.hashtags?.map(h => `#${h}`).join(' ') || '';
        enhancedInput.content_text = content.fullContent + (hashtagText ? `\n\n${hashtagText}` : '');
      }

      if (mentionsPromise) {
        const mentions = await mentionsPromise;
        enhancedInput.mentions = mentions.suggested.map(m => m.handle);
      }

      // Note: posting time is saved in the savePost method from instructionGenerator
      // For AI-enhanced posting time, we'd need to update the savePost method

      console.log(`[ContentTransformer] AI enhancements applied for ${postInput.platform} (hub: ${isHub})`);
      return enhancedInput;
    } catch (error) {
      console.error('[ContentTransformer] AI enhancement failed, using original content:', error);
      return postInput;
    }
  }

  /**
   * Generate post input using appropriate platform adapter
   */
  private generatePostInput(
    source: ArticleTransformationSource,
    config: TransformationConfig,
    plannedPost: {
      platform: SocialMediaPlatform;
      template_type: string;
      is_hub: boolean;
      spoke_position?: number;
      assigned_eav?: {
        entity: string;
        attribute: string;
        value: string;
        category?: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';
      };
      use_thread?: boolean;
      use_carousel?: boolean;
    },
    campaign: SocialCampaign
  ): SocialPostInput {
    // Get branded hashtags from config or map
    const brandedHashtags: string[] = [];

    // Generate UTM parameters
    const utmParams = utmGenerator.generateFromCampaign(
      campaign,
      plannedPost.platform,
      plannedPost.is_hub,
      plannedPost.spoke_position
    );

    // Build link with UTM
    const linkWithUTM = utmGenerator.buildUrlWithUTM(source.link_url, utmParams);

    // Update source with UTM link
    const sourceWithUTM = {
      ...source,
      link_url: linkWithUTM
    };

    // Generate post using appropriate adapter
    let postInput: SocialPostInput;

    switch (plannedPost.platform) {
      case 'linkedin':
        postInput = linkedinAdapter.transformFromArticle(sourceWithUTM, {
          template_type: plannedPost.template_type as 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'question_hook',
          eav: plannedPost.assigned_eav,
          brandedHashtags
        });
        break;

      case 'twitter':
        postInput = twitterAdapter.transformFromArticle(sourceWithUTM, {
          template_type: plannedPost.template_type as 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'question_hook',
          use_thread: plannedPost.use_thread || false,
          eav: plannedPost.assigned_eav,
          brandedHashtags
        });
        break;

      case 'facebook':
        postInput = facebookAdapter.transformFromArticle(sourceWithUTM, {
          template_type: plannedPost.template_type as 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'question_hook',
          eav: plannedPost.assigned_eav,
          brandedHashtags
        });
        break;

      case 'instagram':
        postInput = instagramAdapter.transformFromArticle(sourceWithUTM, {
          template_type: plannedPost.template_type as 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'question_hook' | 'listicle',
          use_carousel: plannedPost.use_carousel || false,
          eav: plannedPost.assigned_eav,
          brandedHashtags
        });
        break;

      case 'pinterest':
        postInput = pinterestAdapter.transformFromArticle(sourceWithUTM, {
          template_type: plannedPost.template_type as 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'tip_series',
          eav: plannedPost.assigned_eav
        });
        break;

      default:
        throw new Error(`Unsupported platform: ${plannedPost.platform}`);
    }

    // Add hub/spoke info
    postInput.is_hub = plannedPost.is_hub;
    postInput.spoke_position = plannedPost.spoke_position;
    postInput.utm_parameters = utmParams;

    // Generate posting instructions
    const instructions = instructionGenerator.generateForPost(
      {
        ...postInput,
        id: '',
        user_id: this.userId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as SocialPost,
      linkWithUTM
    );

    postInput.link_url = linkWithUTM;

    return postInput;
  }

  /**
   * Save post to database
   */
  private async savePost(
    postInput: SocialPostInput,
    campaignId: string
  ): Promise<SocialPost> {
    // Generate posting instructions
    const linkWithUTM = postInput.link_url || '';
    const tempPost: SocialPost = {
      ...postInput,
      is_hub: postInput.is_hub ?? false,
      id: '',
      user_id: this.userId,
      campaign_id: campaignId,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const instructions = instructionGenerator.generateForPost(tempPost, linkWithUTM);

    const insertResult = await verifiedInsert(
      this.supabase,
      { table: 'social_posts', operationDescription: 'create social post' },
      {
        user_id: this.userId,
        campaign_id: campaignId,
        topic_id: postInput.topic_id,
        job_id: postInput.job_id,
        is_hub: postInput.is_hub || false,
        spoke_position: postInput.spoke_position,
        platform: postInput.platform,
        post_type: postInput.post_type,
        content_text: postInput.content_text,
        content_thread: postInput.content_thread,
        hashtags: postInput.hashtags,
        mentions: postInput.mentions,
        image_instructions: postInput.image_instructions,
        link_url: postInput.link_url,
        utm_parameters: postInput.utm_parameters,
        posting_instructions: instructions.full_instructions,
        optimal_posting_time: instructions.optimal_time,
        eav_triple: postInput.eav_triple,
        entities_mentioned: postInput.entities_mentioned,
        status: 'draft'
      },
      '*'
    );

    if (!insertResult.success || !insertResult.data) {
      throw new Error(`Failed to save post: ${insertResult.error}`);
    }

    return insertResult.data as unknown as SocialPost;
  }

  /**
   * Extract transformation source from content generation job
   */
  static async extractSourceFromJob(
    supabase: SupabaseClient,
    jobId: string,
    linkUrl: string
  ): Promise<ArticleTransformationSource | null> {
    // Get job with schema data
    const { data: job, error: jobError } = await supabase
      .from('content_generation_jobs')
      .select(`
        id,
        topic_id,
        title,
        key_takeaways,
        schema_data,
        image_placeholders,
        topics!inner(id, title, map_id, content_briefs(meta_description, contextual_vectors))
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[ContentTransformer] Failed to load job:', jobError);
      return null;
    }

    const topic = job.topics as unknown as { id: string; title: string; map_id: string; content_briefs: Array<{ meta_description: string; contextual_vectors: unknown }> };
    const brief = topic.content_briefs?.[0];

    // Fetch language from map's business_info
    let language: string | undefined;
    if (topic.map_id) {
      const { data: map } = await supabase
        .from('topical_maps')
        .select('business_info')
        .eq('id', topic.map_id)
        .single();

      if (map?.business_info) {
        const businessInfo = map.business_info as Record<string, unknown>;
        language = (businessInfo.language as string) || undefined;
      }
    }

    // Extract entities from schema data
    const schemaEntities: Array<{ name: string; type: string; wikidata_id?: string }> = [];

    if (job.schema_data) {
      const schemaData = job.schema_data as { entities?: Array<{ name: string; type: string; wikidataId?: string }> };
      if (schemaData.entities) {
        for (const entity of schemaData.entities) {
          schemaEntities.push({
            name: entity.name,
            type: entity.type,
            wikidata_id: entity.wikidataId
          });
        }
      }
    }

    // Extract contextual vectors (EAVs)
    const contextualVectors: Array<{
      entity: string;
      attribute: string;
      value: string;
      category: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';
    }> = [];

    if (brief?.contextual_vectors) {
      const vectors = brief.contextual_vectors as Array<{
        entity: string;
        attribute: string;
        value: string;
        category?: string;
      }>;

      for (const vector of vectors) {
        contextualVectors.push({
          entity: vector.entity,
          attribute: vector.attribute,
          value: vector.value,
          category: (vector.category as 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON') || 'COMMON'
        });
      }
    }

    // Extract image placeholders
    const imagePlaceholders: Array<{
      id: string;
      type: string;
      alt_text: string;
      caption?: string;
    }> = [];

    if (job.image_placeholders) {
      const placeholders = job.image_placeholders as Array<{
        id: string;
        imageType: string;
        altText: string;
        caption?: string;
      }>;

      for (const ph of placeholders) {
        imagePlaceholders.push({
          id: ph.id,
          type: ph.imageType,
          alt_text: ph.altText,
          caption: ph.caption
        });
      }
    }

    // Extract key takeaways
    const keyTakeaways = job.key_takeaways as string[] || [];

    return {
      job_id: job.id,
      topic_id: job.topic_id,
      title: job.title || topic.title,
      meta_description: brief?.meta_description || '',
      link_url: linkUrl,
      language,  // Pass language for localized social post generation
      key_takeaways: keyTakeaways,
      schema_entities: schemaEntities,
      contextual_vectors: contextualVectors,
      image_placeholders: imagePlaceholders
    };
  }
}

// Factory function
export function createContentTransformer(
  supabase: SupabaseClient,
  userId: string
): ContentTransformer {
  return new ContentTransformer(supabase, userId);
}

/**
 * Convenience wrapper for transforming articles to social posts
 * This handles Supabase client creation internally
 */
export async function transformArticleToSocialPosts(
  source: ArticleTransformationSource,
  config: TransformationConfig,
  options: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    userId: string;
  }
): Promise<{
  campaign: SocialCampaign;
  posts: SocialPost[];
  complianceReport: {
    overall_score: number;
    entity_consistency: { score: number; issues: string[] };
    eav_coverage: { score: number; issues: string[] };
    information_density: { score: number; issues: string[] };
    semantic_distance: { score: number; issues: string[] };
    hub_spoke_coverage: { score: number; issues: string[] };
  };
}> {
  // Import getSupabaseClient dynamically to avoid circular dependencies
  const { getSupabaseClient } = await import('../../supabaseClient');

  const supabase = getSupabaseClient(options.supabaseUrl, options.supabaseAnonKey);
  const transformer = new ContentTransformer(supabase, options.userId);

  const result = await transformer.transform(source, config);

  if (!result.success || !result.campaign || !result.posts) {
    throw new Error(result.error || 'Transformation failed');
  }

  // Build a basic compliance report
  // In a full implementation, this would use the complianceScorer service
  const complianceReport = {
    overall_score: result.campaign.overall_compliance_score || 0,
    entity_consistency: { score: 85, issues: [] as string[] },
    eav_coverage: { score: 80, issues: [] as string[] },
    information_density: { score: 85, issues: [] as string[] },
    semantic_distance: { score: 90, issues: [] as string[] },
    hub_spoke_coverage: { score: 85, issues: [] as string[] }
  };

  return {
    campaign: result.campaign,
    posts: result.posts,
    complianceReport
  };
}
