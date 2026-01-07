/**
 * TierCard
 *
 * Individual tier display card with progress and topic list
 */

import React from 'react';
import type { EnrichedTopic, ContentBrief } from '../../../types';
import type { TierSummary } from '../../../utils/gamification/tierAssignment';
import { Card } from '../../ui/Card';
import { TierProgressBar, ImpactBar } from './TierProgressBar';
import { TierTopicList } from './TierTopicList';

interface TierCardProps {
  summary: TierSummary;
  briefsMap: Map<string, ContentBrief | undefined>;
  onTopicClick?: (topicId: string) => void;
  expanded?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const TierCard: React.FC<TierCardProps> = ({
  summary,
  briefsMap,
  onTopicClick,
  expanded = false,
  showDetails = true,
  className = ''
}) => {
  const { tier, topics, briefsReady, briefsTotal, progressPercent, statusEmoji, statusLabel } = summary;

  return (
    <Card
      className={`p-4 ${className}`}
      style={{
        borderColor: `${tier.color}40`,
        backgroundColor: tier.bgColor
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{tier.emoji}</span>
            <h3 className="font-bold text-white" style={{ color: tier.color }}>
              {tier.name}
            </h3>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {tier.description}
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-semibold text-white">{topics.length}</span>
          <span className="text-sm text-gray-400 ml-1">
            {topics.length === 1 ? 'topic' : 'topics'}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <TierProgressBar
          progress={progressPercent}
          color={tier.color}
          label={`${briefsReady} of ${briefsTotal} briefs ready`}
          size="md"
        />
      </div>

      {/* Why important */}
      {showDetails && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Why essential?</p>
          <ul className="space-y-1">
            {tier.whyImportant.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-gray-500">-</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Effort & Impact */}
      {showDetails && (
        <div className="flex items-center justify-between mb-4 text-sm">
          <div>
            <span className="text-gray-500">Est. effort:</span>{' '}
            <span className="text-gray-300">{tier.effort}</span>
          </div>
          <ImpactBar
            level={tier.impactBars}
            color={tier.color}
            label="Impact:"
          />
        </div>
      )}

      {/* Topic list */}
      <TierTopicList
        topics={topics}
        briefsMap={briefsMap}
        tierColor={tier.color}
        onTopicClick={onTopicClick}
        initialExpanded={expanded}
      />

      {/* Status footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
        <button
          className="text-sm text-gray-400 hover:text-white transition-colors"
          onClick={() => {
            // TODO: Export tier functionality
            console.log('Export Tier:', tier.id);
          }}
        >
          Export {tier.name} Only
        </button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Status:</span>
          <span className="text-sm">{statusEmoji}</span>
          <span className="text-sm font-medium" style={{ color: tier.color }}>
            {statusLabel}
          </span>
        </div>
      </div>
    </Card>
  );
};

/**
 * TierCardCompact - Smaller version for sidebar/overview
 */
interface TierCardCompactProps {
  summary: TierSummary;
  onClick?: () => void;
  className?: string;
}

export const TierCardCompact: React.FC<TierCardCompactProps> = ({
  summary,
  onClick,
  className = ''
}) => {
  const { tier, topics, briefsReady, progressPercent, statusEmoji } = summary;

  return (
    <div
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        hover:scale-[1.02] hover:shadow-lg
        ${className}
      `}
      style={{
        borderColor: `${tier.color}40`,
        backgroundColor: tier.bgColor
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{tier.emoji}</span>
          <span className="text-sm font-medium text-white">{tier.name}</span>
        </div>
        <span className="text-lg">{statusEmoji}</span>
      </div>

      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-gray-400">{topics.length} topics</span>
        <span className="text-gray-400">{briefsReady} ready</span>
      </div>

      <TierProgressBar
        progress={progressPercent}
        color={tier.color}
        showPercentage={false}
        size="sm"
      />
    </div>
  );
};

export default TierCard;
