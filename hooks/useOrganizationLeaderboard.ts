/**
 * useOrganizationLeaderboard Hook
 *
 * Hook for fetching and displaying organization leaderboards.
 * Provides ranking, achievements, and historical data.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 5
 */

import { useCallback, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { useOrganization } from './useOrganization';
import {
  OrganizationScore,
  OrganizationScoreWithDetails,
  OrganizationAchievement,
  LeaderboardEntry,
  LeaderboardPeriod,
} from '../types';

// ============================================================================
// Hook
// ============================================================================

export function useOrganizationLeaderboard() {
  const supabase = getSupabaseClient();
  const { current: organization } = useOrganization();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get the current organization's score
   */
  const getOwnScore = useCallback(async (): Promise<OrganizationScore | null> => {
    if (!organization) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('organization_scores')
        .select('*')
        .eq('organization_id', organization.id)
        .single();

      if (queryError && queryError.code !== 'PGRST116') throw queryError;

      return data;
    } catch (err) {
      console.error('Failed to get organization score:', err);
      setError(err instanceof Error ? err.message : 'Failed to get score');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [organization, supabase]);

  /**
   * Get global leaderboard
   */
  const getLeaderboard = useCallback(async (
    period: LeaderboardPeriod = { type: 'all' },
    limit = 10
  ): Promise<LeaderboardEntry[]> => {
    setIsLoading(true);
    setError(null);

    try {
      let scoreColumn = 'total_score';
      if (period.type === 'week') scoreColumn = 'score_this_week';
      if (period.type === 'month') scoreColumn = 'score_this_month';

      const { data, error: queryError } = await supabase
        .from('organization_scores')
        .select(`
          organization_id,
          total_score,
          score_this_week,
          score_this_month,
          total_articles_generated,
          avg_audit_score,
          global_rank,
          organization:organization_id (
            id,
            name,
            type
          )
        `)
        .gt(scoreColumn, 0)
        .order(scoreColumn, { ascending: false })
        .limit(limit);

      if (queryError) throw queryError;

      return (data || []).map((entry: any, index: number) => ({
        rank: entry.global_rank || index + 1,
        organizationId: entry.organization_id,
        organizationName: entry.organization?.name || 'Unknown',
        score: period.type === 'week'
          ? entry.score_this_week
          : period.type === 'month'
            ? entry.score_this_month
            : entry.total_score,
        articlesGenerated: entry.total_articles_generated,
        avgAuditScore: entry.avg_audit_score,
        isCurrentOrg: organization?.id === entry.organization_id,
      }));
    } catch (err) {
      console.error('Failed to get leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to get leaderboard');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [organization, supabase]);

  /**
   * Get organization achievements
   */
  const getAchievements = useCallback(async (
    orgId?: string
  ): Promise<OrganizationAchievement[]> => {
    const targetOrgId = orgId || organization?.id;
    if (!targetOrgId) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('organization_achievements')
        .select('*')
        .eq('organization_id', targetOrgId)
        .order('earned_at', { ascending: false });

      if (queryError) throw queryError;

      return data || [];
    } catch (err) {
      console.error('Failed to get achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to get achievements');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [organization, supabase]);

  /**
   * Get leaderboard history for the organization
   */
  const getLeaderboardHistory = useCallback(async (
    periodType: 'week' | 'month' = 'month',
    limit = 12
  ): Promise<{ period: string; rank: number; score: number }[]> => {
    if (!organization) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('organization_leaderboard_history')
        .select('period_start, rank, score')
        .eq('organization_id', organization.id)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(limit);

      if (queryError) throw queryError;

      return (data || []).map((entry: any) => ({
        period: entry.period_start,
        rank: entry.rank,
        score: entry.score,
      })).reverse();
    } catch (err) {
      console.error('Failed to get leaderboard history:', err);
      setError(err instanceof Error ? err.message : 'Failed to get history');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [organization, supabase]);

  /**
   * Refresh organization scores (triggers recalculation)
   */
  const refreshScores = useCallback(async (): Promise<boolean> => {
    if (!organization) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase
        .rpc('recalculate_organization_scores', {
          p_org_id: organization.id,
        });

      if (rpcError) throw rpcError;

      return true;
    } catch (err) {
      console.error('Failed to refresh scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh scores');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [organization, supabase]);

  /**
   * Get nearby organizations in the leaderboard
   */
  const getNearbyRanks = useCallback(async (
    range = 2
  ): Promise<LeaderboardEntry[]> => {
    if (!organization) return [];

    // First get own rank
    const ownScore = await getOwnScore();
    if (!ownScore?.global_rank) return [];

    setIsLoading(true);
    setError(null);

    try {
      const minRank = Math.max(1, ownScore.global_rank - range);
      const maxRank = ownScore.global_rank + range;

      const { data, error: queryError } = await supabase
        .from('organization_scores')
        .select(`
          organization_id,
          total_score,
          total_articles_generated,
          avg_audit_score,
          global_rank,
          organization:organization_id (
            id,
            name
          )
        `)
        .gte('global_rank', minRank)
        .lte('global_rank', maxRank)
        .order('global_rank', { ascending: true });

      if (queryError) throw queryError;

      return (data || []).map((entry: any) => ({
        rank: entry.global_rank,
        organizationId: entry.organization_id,
        organizationName: entry.organization?.name || 'Unknown',
        score: entry.total_score,
        articlesGenerated: entry.total_articles_generated,
        avgAuditScore: entry.avg_audit_score,
        isCurrentOrg: organization?.id === entry.organization_id,
      }));
    } catch (err) {
      console.error('Failed to get nearby ranks:', err);
      setError(err instanceof Error ? err.message : 'Failed to get nearby ranks');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [organization, supabase, getOwnScore]);

  return {
    // State
    isLoading,
    error,

    // Actions
    getOwnScore,
    getLeaderboard,
    getAchievements,
    getLeaderboardHistory,
    refreshScores,
    getNearbyRanks,

    // Context
    currentOrgId: organization?.id,
  };
}
