/**
 * PriorityTieringSystem
 *
 * Main component for displaying and managing topic priority tiers
 */

import React, { useMemo } from 'react';
import type { TopicalMap, ContentBrief } from '../../../types';
import { usePriorityTiers } from '../../../hooks/gamification/usePriorityTiers';
import { Card } from '../../ui/Card';
import { TierCard, TierCardCompact } from './TierCard';
import { TierProgressBar } from './TierProgressBar';

interface PriorityTieringSystemProps {
  map: TopicalMap | null;
  briefs?: ContentBrief[];
  onTopicClick?: (topicId: string) => void;
  compact?: boolean;
  className?: string;
}

export const PriorityTieringSystem: React.FC<PriorityTieringSystemProps> = ({
  map,
  briefs = [],
  onTopicClick,
  compact = false,
  className = ''
}) => {
  const {
    tierSummaries,
    proTip,
    totalTopics,
    totalBriefsReady,
    overallProgress
  } = usePriorityTiers(map, briefs);

  // Build briefs map for topic list
  const briefsMap = useMemo(() => {
    const bMap = new Map<string, ContentBrief | undefined>();
    briefs.forEach(brief => {
      bMap.set(brief.topic_id, brief);
    });
    return bMap;
  }, [briefs]);

  if (!map) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Select a map to see priority tiers</p>
        </div>
      </Card>
    );
  }

  if (!map.topics?.length) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No topics found. Generate a topical map first.</p>
        </div>
      </Card>
    );
  }

  // Compact view for sidebar/widget
  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <h3 className="font-semibold text-white mb-3">Priority Tiers</h3>

        {/* Quick stats */}
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-gray-400">{totalBriefsReady}/{totalTopics} briefs</span>
          <span className="text-gray-300 font-medium">{overallProgress}% complete</span>
        </div>

        {/* Tier cards */}
        <div className="space-y-2">
          {tierSummaries.map(summary => (
            <TierCardCompact
              key={summary.tier.id}
              summary={summary}
              onClick={() => {
                // Could expand to full view or scroll to tier
              }}
            />
          ))}
        </div>
      </Card>
    );
  }

  // Full view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Content Priority Tiers
            </h2>
            <p className="text-gray-400 text-sm max-w-xl">
              {proTip}
            </p>
          </div>

          {/* Overall progress */}
          <div className="w-full lg:w-64">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-white font-medium">
                {totalBriefsReady} / {totalTopics}
              </span>
            </div>
            <TierProgressBar
              progress={overallProgress}
              color="#8B5CF6"
              showPercentage={false}
              size="md"
            />
          </div>
        </div>

        {/* Quick tier overview */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {tierSummaries.map(summary => (
            <div
              key={summary.tier.id}
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: summary.tier.bgColor }}
            >
              <div className="text-2xl mb-1">{summary.tier.emoji}</div>
              <div className="text-sm font-medium" style={{ color: summary.tier.color }}>
                {summary.topics.length} topics
              </div>
              <div className="text-xs text-gray-400">
                {summary.briefsReady} ready
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tier cards */}
      <div className="space-y-4">
        {tierSummaries.map(summary => (
          <TierCard
            key={summary.tier.id}
            summary={summary}
            briefsMap={briefsMap}
            onTopicClick={onTopicClick}
            showDetails={true}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * TierQuickView - Ultra-compact tier indicator for headers
 */
interface TierQuickViewProps {
  map: TopicalMap | null;
  briefs?: ContentBrief[];
  className?: string;
}

export const TierQuickView: React.FC<TierQuickViewProps> = ({
  map,
  briefs = [],
  className = ''
}) => {
  const { tierSummaries, overallProgress } = usePriorityTiers(map, briefs);

  if (!map?.topics?.length) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {tierSummaries.map(summary => (
        <div
          key={summary.tier.id}
          className="flex items-center gap-1"
          title={`${summary.tier.name}: ${summary.topics.length} topics, ${summary.briefsReady} ready`}
        >
          <span>{summary.tier.emoji}</span>
          <span className="text-xs text-gray-400">
            {summary.briefsReady}/{summary.topics.length}
          </span>
        </div>
      ))}
      <div className="text-xs text-gray-500 border-l border-gray-600 pl-3">
        {overallProgress}%
      </div>
    </div>
  );
};

export default PriorityTieringSystem;
