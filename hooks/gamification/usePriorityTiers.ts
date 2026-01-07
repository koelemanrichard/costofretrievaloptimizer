/**
 * usePriorityTiers
 *
 * React hook for managing topic priority tiers
 */

import { useMemo } from 'react';
import type { TopicalMap, ContentBrief, EnrichedTopic } from '../../types';
import {
  assignTopicTiers,
  getAllTierSummaries,
  getTierProTip,
  TierAssignment,
  TierSummary,
  TierId
} from '../../utils/gamification/tierAssignment';

export interface UsePriorityTiersOptions {
  competitorTopics?: Set<string>;
}

export interface UsePriorityTiersResult {
  tierAssignments: Map<string, TierAssignment>;
  tierSummaries: TierSummary[];
  proTip: string;
  getTierForTopic: (topicId: string) => TierId | undefined;
  getReasonForTopic: (topicId: string) => string | undefined;
  coreSummary: TierSummary | undefined;
  supportingSummary: TierSummary | undefined;
  extendedSummary: TierSummary | undefined;
  totalTopics: number;
  totalBriefsReady: number;
  overallProgress: number;
}

/**
 * Hook for calculating and managing priority tiers
 */
export function usePriorityTiers(
  map: TopicalMap | null | undefined,
  briefs: ContentBrief[] = [],
  options: UsePriorityTiersOptions = {}
): UsePriorityTiersResult {
  const { competitorTopics = new Set() } = options;

  // Compute tier assignments
  const tierAssignments = useMemo(() => {
    if (!map?.topics) return new Map<string, TierAssignment>();

    const topics = map.topics as EnrichedTopic[];
    return assignTopicTiers(topics, map, competitorTopics);
  }, [map, competitorTopics]);

  // Build briefs map (topicId -> hasCompleteBrief)
  const briefsMap = useMemo(() => {
    const bMap = new Map<string, boolean>();

    briefs.forEach(brief => {
      // A brief is "ready" if it has a complete outline or draft
      const isReady = !!(
        brief.structured_outline?.length > 0 ||
        brief.articleDraft
      );
      bMap.set(brief.topic_id, isReady);
    });

    return bMap;
  }, [briefs]);

  // Calculate tier summaries
  const tierSummaries = useMemo(() => {
    if (!map?.topics) return [];

    const topics = map.topics as EnrichedTopic[];
    return getAllTierSummaries(topics, tierAssignments, briefsMap);
  }, [map?.topics, tierAssignments, briefsMap]);

  // Get pro tip based on progress
  const proTip = useMemo(() => {
    return getTierProTip(tierSummaries);
  }, [tierSummaries]);

  // Helper to get tier for a specific topic
  const getTierForTopic = (topicId: string): TierId | undefined => {
    return tierAssignments.get(topicId)?.tierId;
  };

  // Helper to get reason for tier assignment
  const getReasonForTopic = (topicId: string): string | undefined => {
    return tierAssignments.get(topicId)?.reason;
  };

  // Convenience accessors
  const coreSummary = tierSummaries.find(s => s.tier.id === 'core');
  const supportingSummary = tierSummaries.find(s => s.tier.id === 'supporting');
  const extendedSummary = tierSummaries.find(s => s.tier.id === 'extended');

  // Calculate overall stats
  const totalTopics = tierSummaries.reduce((sum, s) => sum + s.topics.length, 0);
  const totalBriefsReady = tierSummaries.reduce((sum, s) => sum + s.briefsReady, 0);
  const overallProgress = totalTopics > 0
    ? Math.round((totalBriefsReady / totalTopics) * 100)
    : 0;

  return {
    tierAssignments,
    tierSummaries,
    proTip,
    getTierForTopic,
    getReasonForTopic,
    coreSummary,
    supportingSummary,
    extendedSummary,
    totalTopics,
    totalBriefsReady,
    overallProgress
  };
}

export default usePriorityTiers;
