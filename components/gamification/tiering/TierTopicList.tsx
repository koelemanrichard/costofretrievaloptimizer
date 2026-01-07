/**
 * TierTopicList
 *
 * Expandable list of topics within a tier
 */

import React, { useState } from 'react';
import type { EnrichedTopic, ContentBrief } from '../../../types';

interface TierTopicListProps {
  topics: EnrichedTopic[];
  briefsMap: Map<string, ContentBrief | undefined>;
  tierColor: string;
  onTopicClick?: (topicId: string) => void;
  initialExpanded?: boolean;
  className?: string;
}

type TopicStatus = 'complete' | 'in-progress' | 'not-started';

function getTopicStatus(topic: EnrichedTopic, brief?: ContentBrief): TopicStatus {
  if (!brief) return 'not-started';
  if (brief.articleDraft) return 'complete';
  if (brief.structured_outline?.length > 0) return 'in-progress';
  return 'not-started';
}

const STATUS_CONFIG: Record<TopicStatus, { emoji: string; label: string; textClass: string }> = {
  'complete': { emoji: '✅', label: 'Brief ready', textClass: 'text-green-400' },
  'in-progress': { emoji: '⏳', label: 'In progress', textClass: 'text-amber-400' },
  'not-started': { emoji: '⬜', label: 'Not started', textClass: 'text-gray-500' }
};

export const TierTopicList: React.FC<TierTopicListProps> = ({
  topics,
  briefsMap,
  tierColor,
  onTopicClick,
  initialExpanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Sort topics: complete first, then in-progress, then not-started
  const sortedTopics = [...topics].sort((a, b) => {
    const statusOrder: Record<TopicStatus, number> = {
      'complete': 0,
      'in-progress': 1,
      'not-started': 2
    };
    const aStatus = getTopicStatus(a, briefsMap.get(a.id));
    const bStatus = getTopicStatus(b, briefsMap.get(b.id));
    return statusOrder[aStatus] - statusOrder[bStatus];
  });

  return (
    <div className={className}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 transition-colors"
      >
        <span className="text-sm text-gray-300">
          {isExpanded ? '▼' : '▶'} View Topics
        </span>
        <span className="text-xs text-gray-500">
          {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
        </span>
      </button>

      {/* Topic list */}
      {isExpanded && (
        <div className="mt-2 bg-gray-800/30 rounded-lg border border-gray-700/50 divide-y divide-gray-700/50">
          {sortedTopics.map((topic) => {
            const brief = briefsMap.get(topic.id);
            const status = getTopicStatus(topic, brief);
            const config = STATUS_CONFIG[status];

            return (
              <div
                key={topic.id}
                className={`
                  flex items-center justify-between p-3
                  hover:bg-gray-700/30 transition-colors
                  ${onTopicClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onTopicClick?.(topic.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span>{config.emoji}</span>
                  <span className={`text-sm truncate ${
                    status === 'complete' ? 'text-gray-300' :
                    status === 'in-progress' ? 'text-white' :
                    'text-gray-400'
                  }`}>
                    {topic.title}
                  </span>
                </div>
                <span className={`text-xs whitespace-nowrap ml-2 ${config.textClass}`}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * TierTopicBadge - Small badge showing topic tier
 */
interface TierTopicBadgeProps {
  tierId: 'core' | 'supporting' | 'extended';
  reason?: string;
  size?: 'sm' | 'md';
}

const TIER_BADGE_CONFIG = {
  core: { emoji: '🔴', label: 'Tier 1', color: '#EF4444' },
  supporting: { emoji: '🟡', label: 'Tier 2', color: '#F59E0B' },
  extended: { emoji: '🟢', label: 'Tier 3', color: '#10B981' }
};

export const TierTopicBadge: React.FC<TierTopicBadgeProps> = ({
  tierId,
  reason,
  size = 'sm'
}) => {
  const config = TIER_BADGE_CONFIG[tierId];

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{
        backgroundColor: `${config.color}15`,
        borderColor: `${config.color}40`
      }}
      title={reason}
    >
      <span>{config.emoji}</span>
      <span style={{ color: config.color }}>{config.label}</span>
    </div>
  );
};

export default TierTopicList;
