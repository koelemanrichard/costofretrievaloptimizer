/**
 * Topic Analysis Persistence Service
 *
 * Handles saving and retrieving topic-level competitive intelligence
 * analysis results from Supabase.
 *
 * Created: December 25, 2024
 *
 * @module services/topicAnalysisPersistence
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TopicSerpIntelligence } from '../types/competitiveIntelligence';

// =============================================================================
// Types
// =============================================================================

/**
 * Database row for topic_serp_analysis
 */
export interface TopicSerpAnalysisRow {
  id: string;
  topic_id: string | null;
  user_id: string;
  topic_title: string;
  mode: 'fast' | 'deep';
  analyzed_at: string;
  analysis_time_ms: number | null;
  serp_data: Record<string, unknown>;
  competitors: Record<string, unknown>[];
  patterns: Record<string, unknown>;
  gaps: Record<string, unknown>;
  scores: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save analysis options
 */
export interface SaveAnalysisOptions {
  /** Topic ID (optional - can save without topic reference) */
  topicId?: string;
  /** Expiration in days (default: 7) */
  expirationDays?: number;
}

/**
 * Get analysis options
 */
export interface GetAnalysisOptions {
  /** Maximum age in hours to consider fresh (default: 168 = 7 days) */
  maxAgeHours?: number;
  /** Whether to accept stale data if no fresh data exists */
  acceptStale?: boolean;
}

/**
 * Saved analysis result
 */
export interface SavedAnalysis {
  id: string;
  intelligence: TopicSerpIntelligence;
  isFresh: boolean;
  analyzedAt: Date;
  expiresAt: Date;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert database row to TopicSerpIntelligence
 */
function rowToIntelligence(row: TopicSerpAnalysisRow): TopicSerpIntelligence {
  return {
    topic: row.topic_title,
    analyzedAt: new Date(row.analyzed_at),
    mode: row.mode,
    serp: row.serp_data as unknown as TopicSerpIntelligence['serp'],
    competitors: row.competitors as unknown as TopicSerpIntelligence['competitors'],
    patterns: row.patterns as unknown as TopicSerpIntelligence['patterns'],
    gaps: row.gaps as unknown as TopicSerpIntelligence['gaps'],
    scores: row.scores as unknown as TopicSerpIntelligence['scores'],
  };
}

/**
 * Convert TopicSerpIntelligence to database row data
 */
function intelligenceToRow(
  intelligence: TopicSerpIntelligence,
  userId: string,
  options: SaveAnalysisOptions
): Partial<TopicSerpAnalysisRow> {
  const expirationDays = options.expirationDays || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return {
    topic_id: options.topicId || null,
    user_id: userId,
    topic_title: intelligence.topic,
    mode: intelligence.mode,
    analyzed_at: intelligence.analyzedAt.toISOString(),
    serp_data: intelligence.serp as unknown as Record<string, unknown>,
    competitors: intelligence.competitors as unknown as Record<string, unknown>[],
    patterns: intelligence.patterns as unknown as Record<string, unknown>,
    gaps: intelligence.gaps as unknown as Record<string, unknown>,
    scores: intelligence.scores as unknown as Record<string, unknown>,
    expires_at: expiresAt.toISOString(),
  };
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Save analysis results to database
 */
export async function saveAnalysis(
  supabase: SupabaseClient,
  intelligence: TopicSerpIntelligence,
  analysisTimeMs: number,
  options: SaveAnalysisOptions = {}
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Prepare row data
    const rowData = intelligenceToRow(intelligence, user.id, options);
    rowData.analysis_time_ms = analysisTimeMs;

    // Insert or update
    const { data, error } = await supabase
      .from('topic_serp_analysis')
      .upsert(rowData, {
        onConflict: 'topic_id,user_id',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save analysis:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Exception saving analysis:', error);
    return { success: false, error: message };
  }
}

/**
 * Get saved analysis for a topic
 */
export async function getAnalysisByTopicId(
  supabase: SupabaseClient,
  topicId: string,
  options: GetAnalysisOptions = {}
): Promise<SavedAnalysis | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const maxAgeHours = options.maxAgeHours || 168; // 7 days
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

    let query = supabase
      .from('topic_serp_analysis')
      .select('*')
      .eq('topic_id', topicId)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('analyzed_at', { ascending: false })
      .limit(1);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0] as TopicSerpAnalysisRow;
    const analyzedAt = new Date(row.analyzed_at);
    const isFresh = analyzedAt > cutoffDate;

    // If not fresh and not accepting stale, return null
    if (!isFresh && !options.acceptStale) {
      return null;
    }

    return {
      id: row.id,
      intelligence: rowToIntelligence(row),
      isFresh,
      analyzedAt,
      expiresAt: new Date(row.expires_at),
    };
  } catch (error) {
    console.error('Exception getting analysis:', error);
    return null;
  }
}

/**
 * Get saved analysis by topic title (for topics without ID)
 */
export async function getAnalysisByTitle(
  supabase: SupabaseClient,
  topicTitle: string,
  options: GetAnalysisOptions = {}
): Promise<SavedAnalysis | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const maxAgeHours = options.maxAgeHours || 168;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

    const { data, error } = await supabase
      .from('topic_serp_analysis')
      .select('*')
      .eq('topic_title', topicTitle)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('analyzed_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0] as TopicSerpAnalysisRow;
    const analyzedAt = new Date(row.analyzed_at);
    const isFresh = analyzedAt > cutoffDate;

    if (!isFresh && !options.acceptStale) {
      return null;
    }

    return {
      id: row.id,
      intelligence: rowToIntelligence(row),
      isFresh,
      analyzedAt,
      expiresAt: new Date(row.expires_at),
    };
  } catch (error) {
    console.error('Exception getting analysis by title:', error);
    return null;
  }
}

/**
 * Delete analysis by ID
 */
export async function deleteAnalysis(
  supabase: SupabaseClient,
  analysisId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('topic_serp_analysis')
      .delete()
      .eq('id', analysisId);

    if (error) {
      console.error('Failed to delete analysis:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception deleting analysis:', error);
    return false;
  }
}

/**
 * Get all analyses for a user (for dashboard/history)
 */
export async function getUserAnalyses(
  supabase: SupabaseClient,
  limit: number = 20
): Promise<SavedAnalysis[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from('topic_serp_analysis')
      .select('*')
      .eq('user_id', user.id)
      .order('analyzed_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return data.map((row: TopicSerpAnalysisRow) => {
      const analyzedAt = new Date(row.analyzed_at);
      return {
        id: row.id,
        intelligence: rowToIntelligence(row),
        isFresh: analyzedAt > weekAgo,
        analyzedAt,
        expiresAt: new Date(row.expires_at),
      };
    });
  } catch (error) {
    console.error('Exception getting user analyses:', error);
    return [];
  }
}

/**
 * Cleanup expired analyses (called periodically)
 */
export async function cleanupExpiredAnalyses(
  supabase: SupabaseClient
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_topic_serp_analysis');

    if (error) {
      console.error('Failed to cleanup analyses:', error);
      return 0;
    }

    return data as number;
  } catch (error) {
    console.error('Exception cleaning up analyses:', error);
    return 0;
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  saveAnalysis,
  getAnalysisByTopicId,
  getAnalysisByTitle,
  deleteAnalysis,
  getUserAnalyses,
  cleanupExpiredAnalyses,
};
