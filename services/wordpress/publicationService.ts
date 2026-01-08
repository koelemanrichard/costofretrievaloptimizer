/**
 * WordPress Publication Service
 *
 * Handles publishing content to WordPress including:
 * - Creating new posts from topics/briefs
 * - Updating existing publications
 * - Status synchronization
 * - Version tracking and conflict detection
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  WordPressPublication,
  PublishOptions,
  PublicationStatus,
  ConflictReport,
  ConflictResolution,
  CreatePostRequest,
  PublicationHistoryEntry,
  WpPost
} from '../../types/wordpress';
import { EnrichedTopic, ContentBrief } from '../../types';
import { verifiedInsert, verifiedUpdate } from '../verifiedDatabaseService';
import { getAuthenticatedClient } from './connectionService';
import { generateContentHash, WordPressApiClient } from './apiClient';

// ============================================================================
// Types
// ============================================================================

export interface PublishResult {
  success: boolean;
  publication?: WordPressPublication;
  wpPost?: WpPost;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  publication?: WordPressPublication;
  hasChanges?: boolean;
  error?: string;
}

// ============================================================================
// Content Formatting
// ============================================================================

/**
 * Convert article draft to WordPress-ready HTML
 * Handles image placeholders, formatting, etc.
 */
function formatContentForWordPress(
  articleDraft: string,
  brief?: ContentBrief
): string {
  let content = articleDraft;

  // Convert markdown-style headers to HTML if needed
  content = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Convert markdown bold/italic
  content = content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert markdown lists
  content = content.replace(/^- (.+)$/gm, '<li>$1</li>');
  content = content.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Keep image placeholders for now - they'll be replaced when images are uploaded
  // Format: [IMAGE:hero|alt:Description|caption:Caption text]

  // Note: Schema markup is generated separately in the content generation process
  // and would be added by the WordPress plugin during publication

  return content;
}

/**
 * Generate excerpt from content
 */
function generateExcerpt(content: string, maxLength: number = 160): string {
  // Strip HTML tags
  const textOnly = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (textOnly.length <= maxLength) {
    return textOnly;
  }

  // Truncate at word boundary
  const truncated = textOnly.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Generate URL slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

// ============================================================================
// Publication Functions
// ============================================================================

/**
 * Publish a topic to WordPress
 */
export async function publishTopic(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  topic: EnrichedTopic,
  articleDraft: string,
  brief: ContentBrief | undefined,
  options: PublishOptions
): Promise<PublishResult> {
  try {
    // Get authenticated client
    const clientResult = await getAuthenticatedClient(supabase, userId, connectionId);
    if ('error' in clientResult) {
      return { success: false, error: clientResult.error };
    }

    const { client, connection } = clientResult;

    // Check if already published to this connection
    const { data: existingPub } = await supabase
      .from('wordpress_publications')
      .select('id, wp_post_id')
      .eq('connection_id', connectionId)
      .eq('topic_id', topic.id)
      .single();

    if (existingPub) {
      // Update existing post instead
      return updatePublication(
        supabase,
        userId,
        existingPub.id,
        articleDraft,
        brief,
        options
      );
    }

    // Format content
    const content = formatContentForWordPress(articleDraft, brief);
    const contentHash = await generateContentHash(content);

    // Prepare post data
    const postData: CreatePostRequest = {
      title: topic.title,
      content,
      status: options.status,
      slug: generateSlug(topic.title),
      excerpt: brief?.metaDescription || generateExcerpt(content),
      categories: options.categories || [],
      tags: options.tags || [],
      featured_media: options.featured_image_id,
      cutthecrap_topic_id: topic.id,
      cutthecrap_brief_id: brief?.id,
      cutthecrap_version_hash: contentHash
    };

    // Add scheduling if future post
    if (options.status === 'future' && options.scheduled_at) {
      postData.date = options.scheduled_at;
    }

    // Add SEO meta if Yoast is configured
    if (options.yoast_meta) {
      postData.meta = {
        ...postData.meta,
        _yoast_wpseo_focuskw: options.yoast_meta.focus_keyword,
        _yoast_wpseo_metadesc: options.yoast_meta.meta_description
      };
    }

    // Create post in WordPress
    const createResult = await client.createPost(postData);

    if (!createResult.success || !createResult.data) {
      return {
        success: false,
        error: createResult.error || 'Failed to create WordPress post'
      };
    }

    const wpPost = createResult.data;

    // Determine publication status
    let pubStatus: PublicationStatus = 'draft';
    if (wpPost.status === 'publish') pubStatus = 'published';
    else if (wpPost.status === 'future') pubStatus = 'scheduled';
    else if (wpPost.status === 'pending') pubStatus = 'pending_review';

    // Save publication record
    const publicationData = {
      connection_id: connectionId,
      topic_id: topic.id,
      brief_id: brief?.id || null,
      wp_post_id: wpPost.id,
      wp_post_url: wpPost.link,
      wp_post_slug: wpPost.slug,
      status: pubStatus,
      scheduled_at: options.status === 'future' ? options.scheduled_at : null,
      published_at: wpPost.status === 'publish' ? new Date().toISOString() : null,
      app_version_hash: contentHash,
      wp_version_hash: contentHash,
      has_wp_changes: false,
      last_pushed_at: new Date().toISOString(),
      last_sync_status: 'success'
    };

    const insertResult = await verifiedInsert(
      supabase,
      { table: 'wordpress_publications', operationDescription: 'create publication record' },
      publicationData,
      '*'
    );

    if (!insertResult.success || !insertResult.data) {
      // Post was created but we failed to save the record - this is bad
      console.error('[WP Publish] Created WP post but failed to save publication record:', insertResult.error);
      return {
        success: true, // Post was created
        wpPost,
        error: 'Post created but failed to save tracking record. Post ID: ' + wpPost.id
      };
    }

    const publication = insertResult.data as unknown as WordPressPublication;

    // Record history
    await recordHistory(supabase, publication.id, {
      action: 'created',
      new_status: pubStatus,
      triggered_by: 'user'
    });

    return {
      success: true,
      publication,
      wpPost
    };
  } catch (error) {
    console.error('[WP Publish] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Publication failed'
    };
  }
}

/**
 * Update an existing publication
 */
export async function updatePublication(
  supabase: SupabaseClient,
  userId: string,
  publicationId: string,
  articleDraft?: string,
  brief?: ContentBrief,
  options?: Partial<PublishOptions>
): Promise<PublishResult> {
  try {
    // Get publication
    const { data: publication, error: fetchError } = await supabase
      .from('wordpress_publications')
      .select('*, wordpress_connections!inner(user_id)')
      .eq('id', publicationId)
      .single();

    if (fetchError || !publication) {
      return { success: false, error: 'Publication not found' };
    }

    // Verify ownership
    if ((publication.wordpress_connections as { user_id: string }).user_id !== userId) {
      return { success: false, error: 'Access denied' };
    }

    // Get authenticated client
    const clientResult = await getAuthenticatedClient(supabase, userId, publication.connection_id);
    if ('error' in clientResult) {
      return { success: false, error: clientResult.error };
    }

    const { client } = clientResult;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (articleDraft) {
      const content = formatContentForWordPress(articleDraft, brief);
      updateData.content = content;
      updateData.cutthecrap_version_hash = await generateContentHash(content);
    }

    if (options?.status) {
      updateData.status = options.status;
    }

    if (options?.scheduled_at && options.status === 'future') {
      updateData.date = options.scheduled_at;
    }

    if (options?.categories) {
      updateData.categories = options.categories;
    }

    if (options?.tags) {
      updateData.tags = options.tags;
    }

    if (options?.featured_image_id) {
      updateData.featured_media = options.featured_image_id;
    }

    // Update in WordPress
    const updateResult = await client.updatePost(publication.wp_post_id, updateData);

    if (!updateResult.success || !updateResult.data) {
      return {
        success: false,
        error: updateResult.error || 'Failed to update WordPress post'
      };
    }

    const wpPost = updateResult.data;

    // Update publication record
    const newContentHash = updateData.cutthecrap_version_hash as string || publication.app_version_hash;

    let pubStatus: PublicationStatus = publication.status;
    if (wpPost.status === 'publish') pubStatus = 'published';
    else if (wpPost.status === 'future') pubStatus = 'scheduled';
    else if (wpPost.status === 'pending') pubStatus = 'pending_review';
    else if (wpPost.status === 'draft') pubStatus = 'draft';

    await verifiedUpdate(
      supabase,
      { table: 'wordpress_publications', operationDescription: 'update publication' },
      { column: 'id', value: publicationId },
      {
        status: pubStatus,
        app_version_hash: newContentHash,
        wp_version_hash: newContentHash,
        has_wp_changes: false,
        last_pushed_at: new Date().toISOString(),
        last_sync_status: 'success',
        published_at: wpPost.status === 'publish' ? new Date().toISOString() : publication.published_at
      },
      '*'
    );

    // Record history
    await recordHistory(supabase, publicationId, {
      action: 'updated',
      previous_status: publication.status,
      new_status: pubStatus,
      triggered_by: 'user'
    });

    return {
      success: true,
      publication: { ...publication, status: pubStatus } as WordPressPublication,
      wpPost
    };
  } catch (error) {
    console.error('[WP Update] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed'
    };
  }
}

/**
 * Sync publication status from WordPress
 */
export async function syncPublicationStatus(
  supabase: SupabaseClient,
  userId: string,
  publicationId: string
): Promise<SyncResult> {
  try {
    // Get publication
    const { data: publication, error: fetchError } = await supabase
      .from('wordpress_publications')
      .select('*, wordpress_connections!inner(user_id)')
      .eq('id', publicationId)
      .single();

    if (fetchError || !publication) {
      return { success: false, error: 'Publication not found' };
    }

    if ((publication.wordpress_connections as { user_id: string }).user_id !== userId) {
      return { success: false, error: 'Access denied' };
    }

    // Get authenticated client
    const clientResult = await getAuthenticatedClient(supabase, userId, publication.connection_id);
    if ('error' in clientResult) {
      return { success: false, error: clientResult.error };
    }

    const { client } = clientResult;

    // Get post from WordPress
    const postResult = await client.getPost(publication.wp_post_id);

    if (!postResult.success || !postResult.data) {
      // Post might have been deleted
      if (postResult.statusCode === 404) {
        await verifiedUpdate(
          supabase,
          { table: 'wordpress_publications', operationDescription: 'mark as trashed' },
          { column: 'id', value: publicationId },
          {
            status: 'trashed' as PublicationStatus,
            last_sync_status: 'post_not_found'
          },
          '*'
        );

        await recordHistory(supabase, publicationId, {
          action: 'deleted',
          triggered_by: 'sync'
        });

        return {
          success: true,
          hasChanges: true
        };
      }

      return { success: false, error: postResult.error };
    }

    const wpPost = postResult.data;

    // Calculate content hash
    const wpContentHash = await generateContentHash(wpPost.content.raw || wpPost.content.rendered);

    // Determine if WP has changes
    const hasChanges = wpContentHash !== publication.app_version_hash;

    // Map WordPress status to our status
    let pubStatus: PublicationStatus = publication.status;
    if (wpPost.status === 'publish') pubStatus = 'published';
    else if (wpPost.status === 'future') pubStatus = 'scheduled';
    else if (wpPost.status === 'pending') pubStatus = 'pending_review';
    else if (wpPost.status === 'draft') pubStatus = 'draft';
    else if (wpPost.status === 'trash') pubStatus = 'trashed';

    // Update publication record
    await verifiedUpdate(
      supabase,
      { table: 'wordpress_publications', operationDescription: 'sync status' },
      { column: 'id', value: publicationId },
      {
        status: pubStatus,
        wp_version_hash: wpContentHash,
        has_wp_changes: hasChanges,
        last_pulled_at: new Date().toISOString(),
        last_sync_status: 'success',
        wp_post_url: wpPost.link,
        published_at: wpPost.status === 'publish' ? wpPost.date : publication.published_at
      },
      '*'
    );

    // Record status change if applicable
    if (pubStatus !== publication.status) {
      await recordHistory(supabase, publicationId, {
        action: 'status_changed',
        previous_status: publication.status,
        new_status: pubStatus,
        triggered_by: 'sync'
      });
    }

    // Record conflict detection
    if (hasChanges && !publication.has_wp_changes) {
      await recordHistory(supabase, publicationId, {
        action: 'conflict_detected',
        triggered_by: 'sync',
        content_diff_summary: 'WordPress content differs from last pushed version'
      });
    }

    // Fetch updated publication
    const { data: updated } = await supabase
      .from('wordpress_publications')
      .select('*')
      .eq('id', publicationId)
      .single();

    return {
      success: true,
      publication: updated,
      hasChanges
    };
  } catch (error) {
    console.error('[WP Sync] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    };
  }
}

/**
 * Get conflict report for a publication
 */
export async function detectConflict(
  supabase: SupabaseClient,
  userId: string,
  publicationId: string,
  appContent: string
): Promise<ConflictReport | null> {
  try {
    // Get publication
    const { data: publication, error: fetchError } = await supabase
      .from('wordpress_publications')
      .select('*, wordpress_connections!inner(user_id)')
      .eq('id', publicationId)
      .single();

    if (fetchError || !publication) {
      return null;
    }

    if ((publication.wordpress_connections as { user_id: string }).user_id !== userId) {
      return null;
    }

    // Get authenticated client
    const clientResult = await getAuthenticatedClient(supabase, userId, publication.connection_id);
    if ('error' in clientResult) {
      return null;
    }

    const { client } = clientResult;

    // Get current WP content
    const postResult = await client.getPost(publication.wp_post_id);
    if (!postResult.success || !postResult.data) {
      return null;
    }

    const wpPost = postResult.data;
    const wpContent = wpPost.content.raw || wpPost.content.rendered;

    // Calculate hashes
    const appHash = await generateContentHash(appContent);
    const wpHash = await generateContentHash(wpContent);

    if (appHash === wpHash) {
      // No conflict
      return null;
    }

    // Calculate word counts
    const appWordCount = appContent.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w).length;
    const wpWordCount = wpContent.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w).length;

    return {
      publication_id: publicationId,
      detected_at: new Date().toISOString(),
      app_version: {
        hash: appHash,
        last_modified: publication.last_pushed_at || publication.created_at,
        word_count: appWordCount,
        content_preview: appContent.substring(0, 200)
      },
      wp_version: {
        hash: wpHash,
        last_modified: wpPost.modified,
        word_count: wpWordCount,
        content_preview: wpContent.substring(0, 200)
      },
      diff_summary: {
        sections_changed: Math.abs(appWordCount - wpWordCount) > 50 ? 1 : 0,
        words_added: Math.max(0, wpWordCount - appWordCount),
        words_removed: Math.max(0, appWordCount - wpWordCount)
      }
    };
  } catch (error) {
    console.error('[WP Conflict] Detection failed:', error);
    return null;
  }
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(
  supabase: SupabaseClient,
  userId: string,
  publicationId: string,
  resolution: ConflictResolution,
  appContent?: string
): Promise<PublishResult> {
  try {
    const { data: publication, error: fetchError } = await supabase
      .from('wordpress_publications')
      .select('*, wordpress_connections!inner(user_id)')
      .eq('id', publicationId)
      .single();

    if (fetchError || !publication) {
      return { success: false, error: 'Publication not found' };
    }

    if ((publication.wordpress_connections as { user_id: string }).user_id !== userId) {
      return { success: false, error: 'Access denied' };
    }

    const clientResult = await getAuthenticatedClient(supabase, userId, publication.connection_id);
    if ('error' in clientResult) {
      return { success: false, error: clientResult.error };
    }

    const { client } = clientResult;

    if (resolution === 'keep_app') {
      // Push app content to WordPress
      if (!appContent) {
        return { success: false, error: 'App content required for keep_app resolution' };
      }

      const content = formatContentForWordPress(appContent);
      const contentHash = await generateContentHash(content);

      const updateResult = await client.updatePost(publication.wp_post_id, { content });

      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      await verifiedUpdate(
        supabase,
        { table: 'wordpress_publications', operationDescription: 'resolve conflict' },
        { column: 'id', value: publicationId },
        {
          app_version_hash: contentHash,
          wp_version_hash: contentHash,
          has_wp_changes: false,
          last_pushed_at: new Date().toISOString()
        },
        '*'
      );

      await recordHistory(supabase, publicationId, {
        action: 'conflict_resolved',
        content_diff_summary: 'Kept app version, overwrote WordPress',
        triggered_by: 'user'
      });

      return { success: true, wpPost: updateResult.data };
    }

    if (resolution === 'keep_wp') {
      // Just update our hash to match WP
      const postResult = await client.getPost(publication.wp_post_id);
      if (!postResult.success || !postResult.data) {
        return { success: false, error: 'Failed to fetch WordPress content' };
      }

      const wpContent = postResult.data.content.raw || postResult.data.content.rendered;
      const wpHash = await generateContentHash(wpContent);

      await verifiedUpdate(
        supabase,
        { table: 'wordpress_publications', operationDescription: 'accept WP version' },
        { column: 'id', value: publicationId },
        {
          app_version_hash: wpHash,
          wp_version_hash: wpHash,
          has_wp_changes: false,
          last_pulled_at: new Date().toISOString()
        },
        '*'
      );

      await recordHistory(supabase, publicationId, {
        action: 'conflict_resolved',
        content_diff_summary: 'Accepted WordPress version',
        triggered_by: 'user',
        wp_content_snapshot: wpContent.substring(0, 1000)
      });

      return { success: true, wpPost: postResult.data };
    }

    // merge - not implemented yet
    return { success: false, error: 'Merge resolution not yet implemented' };
  } catch (error) {
    console.error('[WP Conflict] Resolution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conflict resolution failed'
    };
  }
}

/**
 * Get publication for a topic
 */
export async function getPublicationForTopic(
  supabase: SupabaseClient,
  topicId: string,
  connectionId?: string
): Promise<WordPressPublication | null> {
  let query = supabase
    .from('wordpress_publications')
    .select('*')
    .eq('topic_id', topicId);

  if (connectionId) {
    query = query.eq('connection_id', connectionId);
  }

  const { data } = await query.maybeSingle();
  return data;
}

/**
 * Get all publications for a connection
 */
export async function getPublicationsForConnection(
  supabase: SupabaseClient,
  connectionId: string
): Promise<WordPressPublication[]> {
  const { data } = await supabase
    .from('wordpress_publications')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false });

  return data || [];
}

// ============================================================================
// History Functions
// ============================================================================

async function recordHistory(
  supabase: SupabaseClient,
  publicationId: string,
  entry: Partial<Omit<PublicationHistoryEntry, 'id' | 'publication_id' | 'created_at'>>
): Promise<void> {
  try {
    await supabase
      .from('publication_history')
      .insert({
        publication_id: publicationId,
        ...entry
      });
  } catch (error) {
    console.error('[WP History] Failed to record:', error);
  }
}

/**
 * Get publication history
 */
export async function getPublicationHistory(
  supabase: SupabaseClient,
  publicationId: string,
  limit: number = 50
): Promise<PublicationHistoryEntry[]> {
  const { data } = await supabase
    .from('publication_history')
    .select('*')
    .eq('publication_id', publicationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}
