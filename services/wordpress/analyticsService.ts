/**
 * WordPress Analytics Service
 *
 * Handles fetching and aggregating analytics data from WordPress including:
 * - Post views and engagement metrics
 * - GSC data if available through plugin
 * - Performance tracking over time
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  WordPressAnalytics,
  AggregatedAnalytics,
  GscQueryData,
  WordPressPublication
} from '../../types/wordpress';
import { verifiedInsert, verifiedUpdate } from '../verifiedDatabaseService';
import { getAuthenticatedClient } from './connectionService';

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  start: string; // ISO date (YYYY-MM-DD)
  end: string;
}

export interface PullAnalyticsResult {
  success: boolean;
  recordsCreated: number;
  error?: string;
}

export interface PerformanceInsight {
  publication_id: string;
  topic_title: string;
  wp_post_url?: string;
  metric: 'views' | 'clicks' | 'engagement' | 'position';
  value: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

// ============================================================================
// Analytics Fetching
// ============================================================================

/**
 * Pull analytics for a single publication from WordPress
 */
export async function pullPublicationAnalytics(
  supabase: SupabaseClient,
  userId: string,
  publication: WordPressPublication,
  dateRange?: DateRange
): Promise<PullAnalyticsResult> {
  try {
    // Get authenticated client
    const clientResult = await getAuthenticatedClient(supabase, userId, publication.connection_id);
    if ('error' in clientResult) {
      return { success: false, recordsCreated: 0, error: clientResult.error };
    }

    const { client } = clientResult;

    // Set default date range (last 30 days)
    const range = dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    };

    // Fetch analytics from WordPress plugin
    const analyticsResult = await client.getPostAnalytics(publication.wp_post_id, range);

    if (!analyticsResult.success || !analyticsResult.data) {
      // No analytics available - this is okay for basic WP installs
      return { success: true, recordsCreated: 0 };
    }

    const data = analyticsResult.data;

    // Store today's analytics
    const today = new Date().toISOString().split('T')[0];

    const analyticsRecord = {
      publication_id: publication.id,
      date: today,
      wp_views: data.views || 0,
      wp_visitors: data.visitors || 0,
      wp_comments: data.comments || 0,
      gsc_impressions: data.gsc_data?.impressions || 0,
      gsc_clicks: data.gsc_data?.clicks || 0,
      gsc_ctr: data.gsc_data?.ctr || null,
      gsc_position: data.gsc_data?.position || null,
      gsc_queries: data.gsc_data?.queries ? JSON.stringify(data.gsc_data.queries) : null
    };

    // Upsert (update if exists for today, insert otherwise)
    const { data: existing } = await supabase
      .from('wordpress_analytics')
      .select('id')
      .eq('publication_id', publication.id)
      .eq('date', today)
      .single();

    if (existing) {
      await verifiedUpdate(
        supabase,
        { table: 'wordpress_analytics', operationDescription: 'update analytics' },
        { column: 'id', value: existing.id },
        analyticsRecord,
        'id'
      );
    } else {
      await verifiedInsert(
        supabase,
        { table: 'wordpress_analytics', operationDescription: 'insert analytics' },
        analyticsRecord,
        'id'
      );
    }

    return { success: true, recordsCreated: 1 };
  } catch (error) {
    console.error('[WP Analytics] Pull failed:', error);
    return {
      success: false,
      recordsCreated: 0,
      error: error instanceof Error ? error.message : 'Failed to pull analytics'
    };
  }
}

/**
 * Pull analytics for all publications of a connection
 */
export async function pullConnectionAnalytics(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  dateRange?: DateRange
): Promise<PullAnalyticsResult> {
  try {
    // Get all publications for this connection
    const { data: publications, error } = await supabase
      .from('wordpress_publications')
      .select('*')
      .eq('connection_id', connectionId);

    if (error || !publications) {
      return { success: false, recordsCreated: 0, error: 'Failed to fetch publications' };
    }

    let totalRecords = 0;
    let errors: string[] = [];

    for (const pub of publications) {
      const result = await pullPublicationAnalytics(supabase, userId, pub, dateRange);
      if (result.success) {
        totalRecords += result.recordsCreated;
      } else if (result.error) {
        errors.push(result.error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      success: errors.length === 0,
      recordsCreated: totalRecords,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  } catch (error) {
    return {
      success: false,
      recordsCreated: 0,
      error: error instanceof Error ? error.message : 'Failed to pull analytics'
    };
  }
}

// ============================================================================
// Analytics Retrieval
// ============================================================================

/**
 * Get analytics for a publication over a date range
 */
export async function getPublicationAnalytics(
  supabase: SupabaseClient,
  publicationId: string,
  dateRange: DateRange
): Promise<WordPressAnalytics[]> {
  const { data, error } = await supabase
    .from('wordpress_analytics')
    .select('*')
    .eq('publication_id', publicationId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)
    .order('date', { ascending: true });

  if (error) {
    console.error('[WP Analytics] Fetch failed:', error);
    return [];
  }

  // Parse GSC queries from JSON string
  return (data || []).map(row => ({
    ...row,
    gsc_queries: row.gsc_queries ? JSON.parse(row.gsc_queries) : undefined
  }));
}

/**
 * Get aggregated analytics for a publication
 */
export async function getAggregatedAnalytics(
  supabase: SupabaseClient,
  publicationId: string,
  dateRange: DateRange
): Promise<AggregatedAnalytics> {
  const dailyData = await getPublicationAnalytics(supabase, publicationId, dateRange);

  if (dailyData.length === 0) {
    return {
      total_views: 0,
      total_visitors: 0,
      total_comments: 0,
      total_impressions: 0,
      total_clicks: 0,
      avg_ctr: 0,
      avg_position: 0,
      top_queries: [],
      daily_data: []
    };
  }

  // Calculate totals
  const totals = dailyData.reduce((acc, day) => ({
    views: acc.views + day.wp_views,
    visitors: acc.visitors + day.wp_visitors,
    comments: acc.comments + day.wp_comments,
    impressions: acc.impressions + day.gsc_impressions,
    clicks: acc.clicks + day.gsc_clicks,
    ctrSum: acc.ctrSum + (day.gsc_ctr || 0),
    positionSum: acc.positionSum + (day.gsc_position || 0),
    ctrCount: acc.ctrCount + (day.gsc_ctr ? 1 : 0),
    positionCount: acc.positionCount + (day.gsc_position ? 1 : 0)
  }), {
    views: 0,
    visitors: 0,
    comments: 0,
    impressions: 0,
    clicks: 0,
    ctrSum: 0,
    positionSum: 0,
    ctrCount: 0,
    positionCount: 0
  });

  // Aggregate top queries
  const queryMap = new Map<string, GscQueryData>();
  dailyData.forEach(day => {
    (day.gsc_queries || []).forEach(q => {
      const existing = queryMap.get(q.query);
      if (existing) {
        existing.impressions += q.impressions;
        existing.clicks += q.clicks;
      } else {
        queryMap.set(q.query, { ...q });
      }
    });
  });

  // Recalculate CTR for aggregated queries
  const topQueries = Array.from(queryMap.values())
    .map(q => ({
      ...q,
      ctr: q.impressions > 0 ? q.clicks / q.impressions : 0
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return {
    total_views: totals.views,
    total_visitors: totals.visitors,
    total_comments: totals.comments,
    total_impressions: totals.impressions,
    total_clicks: totals.clicks,
    avg_ctr: totals.ctrCount > 0 ? totals.ctrSum / totals.ctrCount : 0,
    avg_position: totals.positionCount > 0 ? totals.positionSum / totals.positionCount : 0,
    top_queries: topQueries,
    daily_data: dailyData
  };
}

/**
 * Get project-wide analytics summary
 */
export async function getProjectAnalyticsSummary(
  supabase: SupabaseClient,
  projectId: string,
  dateRange: DateRange
): Promise<{
  total_publications: number;
  published_count: number;
  total_views: number;
  total_clicks: number;
  avg_position: number;
}> {
  // Get publications for project
  const { data: publications } = await supabase
    .from('wordpress_publications')
    .select(`
      id,
      status,
      topics!inner(
        map_id,
        topical_maps!inner(project_id)
      )
    `)
    .eq('topics.topical_maps.project_id', projectId);

  if (!publications || publications.length === 0) {
    return {
      total_publications: 0,
      published_count: 0,
      total_views: 0,
      total_clicks: 0,
      avg_position: 0
    };
  }

  const publicationIds = publications.map(p => p.id);
  const publishedCount = publications.filter(p => p.status === 'published').length;

  // Get aggregated analytics
  const { data: analytics } = await supabase
    .from('wordpress_analytics')
    .select('wp_views, gsc_clicks, gsc_position')
    .in('publication_id', publicationIds)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end);

  if (!analytics || analytics.length === 0) {
    return {
      total_publications: publications.length,
      published_count: publishedCount,
      total_views: 0,
      total_clicks: 0,
      avg_position: 0
    };
  }

  const totals = analytics.reduce((acc, row) => ({
    views: acc.views + (row.wp_views || 0),
    clicks: acc.clicks + (row.gsc_clicks || 0),
    positionSum: acc.positionSum + (row.gsc_position || 0),
    positionCount: acc.positionCount + (row.gsc_position ? 1 : 0)
  }), { views: 0, clicks: 0, positionSum: 0, positionCount: 0 });

  return {
    total_publications: publications.length,
    published_count: publishedCount,
    total_views: totals.views,
    total_clicks: totals.clicks,
    avg_position: totals.positionCount > 0 ? totals.positionSum / totals.positionCount : 0
  };
}

// ============================================================================
// Performance Insights
// ============================================================================

/**
 * Get top performing posts by metric
 */
export async function getTopPerformingPosts(
  supabase: SupabaseClient,
  connectionId: string,
  metric: 'views' | 'clicks' | 'engagement',
  limit: number = 5
): Promise<PerformanceInsight[]> {
  // Get publications with recent analytics
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: analytics } = await supabase
    .from('wordpress_analytics')
    .select(`
      publication_id,
      wp_views,
      wp_comments,
      gsc_clicks,
      wordpress_publications!inner(
        id,
        wp_post_url,
        topics!inner(title)
      )
    `)
    .eq('wordpress_publications.connection_id', connectionId)
    .gte('date', thirtyDaysAgo);

  if (!analytics || analytics.length === 0) {
    return [];
  }

  // Aggregate by publication
  const pubMap = new Map<string, {
    publication_id: string;
    topic_title: string;
    wp_post_url?: string;
    views: number;
    clicks: number;
    engagement: number;
  }>();

  analytics.forEach(row => {
    const pub = row.wordpress_publications as unknown as {
      id: string;
      wp_post_url: string;
      topics: { title: string }[] | { title: string };
    };

    // Handle topics as either array or single object
    const topicTitle = Array.isArray(pub.topics)
      ? pub.topics[0]?.title || 'Unknown'
      : pub.topics?.title || 'Unknown';

    const existing = pubMap.get(row.publication_id) || {
      publication_id: row.publication_id,
      topic_title: topicTitle,
      wp_post_url: pub.wp_post_url,
      views: 0,
      clicks: 0,
      engagement: 0
    };

    existing.views += row.wp_views || 0;
    existing.clicks += row.gsc_clicks || 0;
    existing.engagement += (row.wp_views || 0) + (row.wp_comments || 0) * 10 + (row.gsc_clicks || 0) * 5;

    pubMap.set(row.publication_id, existing);
  });

  // Sort by metric and return top N
  const sorted = Array.from(pubMap.values())
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit);

  return sorted.map(item => ({
    publication_id: item.publication_id,
    topic_title: item.topic_title,
    wp_post_url: item.wp_post_url,
    metric,
    value: item[metric],
    trend: 'stable' as const, // Would need historical comparison
    trendPercent: 0
  }));
}

/**
 * Get underperforming posts (low engagement, needs attention)
 */
export async function getUnderperformingPosts(
  supabase: SupabaseClient,
  connectionId: string,
  limit: number = 5
): Promise<PerformanceInsight[]> {
  // Get published posts with low views
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: publications } = await supabase
    .from('wordpress_publications')
    .select(`
      id,
      wp_post_url,
      published_at,
      topics!inner(title)
    `)
    .eq('connection_id', connectionId)
    .eq('status', 'published')
    .not('published_at', 'is', null);

  if (!publications || publications.length === 0) {
    return [];
  }

  // Get analytics for each
  const results: PerformanceInsight[] = [];

  for (const pub of publications) {
    const { data: analytics } = await supabase
      .from('wordpress_analytics')
      .select('wp_views, gsc_clicks')
      .eq('publication_id', pub.id)
      .gte('date', thirtyDaysAgo);

    const totalViews = analytics?.reduce((sum, a) => sum + (a.wp_views || 0), 0) || 0;
    const totalClicks = analytics?.reduce((sum, a) => sum + (a.gsc_clicks || 0), 0) || 0;

    // Consider underperforming if published > 7 days ago with < 100 views
    const publishedAt = new Date(pub.published_at);
    const daysSincePublish = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSincePublish > 7 && totalViews < 100) {
      results.push({
        publication_id: pub.id,
        topic_title: Array.isArray(pub.topics) ? (pub.topics[0]?.title || 'Unknown') : ((pub.topics as unknown as { title: string })?.title || 'Unknown'),
        wp_post_url: pub.wp_post_url || undefined,
        metric: 'views',
        value: totalViews,
        trend: 'down',
        trendPercent: -Math.round((100 - totalViews) / 100 * 100)
      });
    }
  }

  return results
    .sort((a, b) => a.value - b.value)
    .slice(0, limit);
}
