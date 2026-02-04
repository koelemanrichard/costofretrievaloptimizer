/**
 * Export Service
 *
 * Main coordinator for all social media export operations.
 * Provides unified interface for clipboard, JSON, text, and package exports.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  SocialCampaign,
  SocialPost,
  SocialMediaPlatform,
  ExportType,
  ExportFormat,
  SocialExportHistory,
  SinglePostExport,
  CampaignExport
} from '../../../types/social';
import { clipboardExporter } from './clipboardExporter';
import { jsonExporter } from './jsonExporter';
import { textExporter } from './textExporter';
import { packageExporter } from './packageExporter';
import { verifiedInsert } from '../../verifiedDatabaseService';

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  include_instructions?: boolean;
  include_compliance?: boolean;
  include_image_specs?: boolean;
}

/**
 * Main export service
 */
export class ExportService {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Export a single post
   */
  async exportPost(
    post: SocialPost,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      let data: string;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case 'clipboard':
          data = clipboardExporter.formatForPlatform(post, post.platform);
          await clipboardExporter.copyToClipboard(data);
          filename = '';
          mimeType = 'text/plain';
          break;

        case 'json':
          data = jsonExporter.exportPost(post, {
            include_instructions: options.include_instructions,
            include_compliance: options.include_compliance,
            pretty_print: true
          });
          filename = `post-${post.platform}-${post.id.slice(0, 8)}.json`;
          mimeType = 'application/json';
          break;

        case 'txt':
          data = textExporter.exportPost(post, {
            format: 'markdown',
            include_instructions: options.include_instructions,
            include_image_specs: options.include_image_specs
          });
          filename = `post-${post.platform}-${post.id.slice(0, 8)}.md`;
          mimeType = 'text/markdown';
          break;

        default:
          return { success: false, error: `Unsupported format: ${options.format}` };
      }

      // Record export history
      await this.recordExport(
        post.campaign_id || undefined,
        'single_post',
        options.format,
        [post.id]
      );

      // Update post exported_at
      await this.updatePostExported(post.id);

      return {
        success: true,
        data,
        filename,
        mimeType
      };
    } catch (error) {
      console.error('[ExportService] Post export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export full campaign
   */
  async exportCampaign(
    campaign: SocialCampaign,
    posts: SocialPost[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      let data: string;
      let filename: string;
      let mimeType: string;

      const slug = this.generateSlug(campaign.campaign_name || campaign.id);

      switch (options.format) {
        case 'json':
          data = jsonExporter.exportCampaign(campaign, posts, {
            include_instructions: options.include_instructions,
            include_compliance: options.include_compliance,
            include_metadata: true,
            pretty_print: true
          });
          filename = `campaign-${slug}.json`;
          mimeType = 'application/json';
          break;

        case 'txt':
          data = textExporter.exportCampaign(campaign, posts, {
            format: 'markdown',
            include_instructions: options.include_instructions,
            include_image_specs: options.include_image_specs,
            include_compliance: options.include_compliance
          });
          filename = `campaign-${slug}.md`;
          mimeType = 'text/markdown';
          break;

        case 'zip':
          // For ZIP, we return the structure; actual ZIP creation happens in frontend
          const zipData = packageExporter.getZipStructure(campaign, posts);
          data = JSON.stringify(zipData, null, 2);
          filename = `social-campaign-${slug}.zip`;
          mimeType = 'application/zip';
          break;

        default:
          return { success: false, error: `Unsupported format: ${options.format}` };
      }

      // Record export history
      await this.recordExport(
        campaign.id,
        'full_campaign',
        options.format,
        posts.map(p => p.id)
      );

      // Update campaign status if all posts exported
      await this.updateCampaignStatus(campaign.id, 'exported');

      // Update all posts exported_at
      for (const post of posts) {
        await this.updatePostExported(post.id);
      }

      return {
        success: true,
        data,
        filename,
        mimeType
      };
    } catch (error) {
      console.error('[ExportService] Campaign export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export selected posts as bulk package
   */
  async exportBulk(
    campaign: SocialCampaign | undefined,
    posts: SocialPost[],
    options: ExportOptions
  ): Promise<ExportResult> {
    if (!campaign && posts.length > 0) {
      // Create a pseudo-campaign for export
      const pseudoCampaign: SocialCampaign = {
        id: 'bulk-export',
        user_id: this.userId,
        topic_id: posts[0].topic_id,
        campaign_name: 'Bulk Export',
        utm_medium: 'organic-social',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return this.exportCampaign(pseudoCampaign, posts, options);
    }

    if (campaign) {
      return this.exportCampaign(campaign, posts, options);
    }

    return { success: false, error: 'No posts to export' };
  }

  /**
   * Copy post content to clipboard
   */
  async copyToClipboard(
    post: SocialPost,
    options: { include_hashtags?: boolean; include_link?: boolean } = {}
  ): Promise<boolean> {
    const content = clipboardExporter.formatForPlatform(post, post.platform);
    const success = await clipboardExporter.copyToClipboard(content);

    if (success) {
      await this.recordExport(
        post.campaign_id || undefined,
        'single_post',
        'clipboard',
        [post.id]
      );
    }

    return success;
  }

  /**
   * Get export preview
   */
  getExportPreview(
    post: SocialPost
  ): { content: string; preview: string; charCount: number } {
    return clipboardExporter.getClipboardPreview(post);
  }

  /**
   * Get package file structure (for ZIP creation in frontend)
   */
  getPackageStructure(
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): { files: Array<{ path: string; content: string }>; totalSize: number } {
    return packageExporter.getZipStructure(campaign, posts);
  }

  /**
   * Export for scheduling tools
   */
  async exportForSchedulingTool(
    campaign: SocialCampaign,
    posts: SocialPost[],
    tool: 'buffer' | 'hootsuite' | 'generic'
  ): Promise<ExportResult> {
    try {
      const data = jsonExporter.exportForSchedulingTool(campaign, posts, tool);
      const slug = this.generateSlug(campaign.campaign_name || campaign.id);

      await this.recordExport(
        campaign.id,
        'full_campaign',
        'json',
        posts.map(p => p.id)
      );

      return {
        success: true,
        data,
        filename: `campaign-${slug}-${tool}.json`,
        mimeType: 'application/json'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Get export history for a campaign
   */
  async getExportHistory(campaignId: string): Promise<SocialExportHistory[]> {
    const { data } = await this.supabase
      .from('social_export_history')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(50);

    return data || [];
  }

  /**
   * Record export in history
   */
  private async recordExport(
    campaignId: string | undefined,
    exportType: ExportType,
    exportFormat: ExportFormat,
    postIds: string[]
  ): Promise<void> {
    try {
      await verifiedInsert(
        this.supabase,
        { table: 'social_export_history', operationDescription: 'record export' },
        {
          campaign_id: campaignId,
          user_id: this.userId,
          export_type: exportType,
          export_format: exportFormat,
          posts_included: postIds
        },
        '*'
      );
    } catch (error) {
      console.error('[ExportService] Failed to record export history:', error);
    }
  }

  /**
   * Update post exported_at timestamp
   */
  private async updatePostExported(postId: string): Promise<void> {
    try {
      await this.supabase
        .from('social_posts')
        .update({
          exported_at: new Date().toISOString(),
          status: 'exported'
        })
        .eq('id', postId);
    } catch (error) {
      console.error('[ExportService] Failed to update post exported_at:', error);
    }
  }

  /**
   * Update campaign status
   */
  private async updateCampaignStatus(
    campaignId: string,
    status: 'exported' | 'partially_posted' | 'completed'
  ): Promise<void> {
    try {
      await this.supabase
        .from('social_campaigns')
        .update({ status })
        .eq('id', campaignId);
    } catch (error) {
      console.error('[ExportService] Failed to update campaign status:', error);
    }
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }
}

/**
 * Factory function
 */
export function createExportService(
  supabase: SupabaseClient,
  userId: string
): ExportService {
  return new ExportService(supabase, userId);
}

// ============================================================================
// Convenience functions for direct export (used by useSocialExport hook)
// ============================================================================

/**
 * Export single post to clipboard
 */
export async function exportToClipboard(
  post: SocialPost,
  options: { includeHashtags?: boolean; includeLink?: boolean; includeMentions?: boolean } = {}
): Promise<boolean> {
  try {
    const content = clipboardExporter.formatForClipboard(post, {
      include_hashtags: options.includeHashtags ?? true,
      include_link: options.includeLink ?? true,
    });
    return await clipboardExporter.copyToClipboard(content);
  } catch {
    return false;
  }
}

/**
 * Export posts to JSON
 */
export async function exportToJSON(
  campaign: SocialCampaign,
  posts: SocialPost[]
): Promise<string> {
  return jsonExporter.exportCampaign(campaign, posts, {
    pretty_print: true,
    include_metadata: true,
    include_compliance: true,
  });
}

/**
 * Export posts to text
 */
export async function exportToText(
  posts: SocialPost[],
  campaign?: SocialCampaign,
  options: { includeInstructions?: boolean; includeImageSpecs?: boolean; format?: 'plain' | 'markdown' } = {}
): Promise<string> {
  if (campaign) {
    return textExporter.exportCampaign(campaign, posts, {
      format: options.format || 'markdown',
      include_instructions: options.includeInstructions ?? true,
      include_image_specs: options.includeImageSpecs ?? true,
      include_compliance: true,
    });
  }
  // If no campaign, export individual posts joined together
  return posts.map(post =>
    textExporter.exportPost(post, {
      format: options.format || 'markdown',
      include_instructions: options.includeInstructions ?? true,
      include_image_specs: options.includeImageSpecs ?? true,
    })
  ).join('\n\n---\n\n');
}

/**
 * Export campaign to ZIP package
 */
export async function exportToPackage(
  campaign: SocialCampaign,
  posts: SocialPost[],
  _options: {
    includeInstructions?: boolean;
    includeImageSpecs?: boolean;
    includeUtmLinks?: boolean;
    platformsToInclude?: SocialMediaPlatform[];
    groupByPlatform?: boolean;
  } = {}
): Promise<Blob> {
  const zipStructure = packageExporter.getZipStructure(campaign, posts);
  const content = JSON.stringify(zipStructure, null, 2);
  return new Blob([content], { type: 'application/json' });
}
