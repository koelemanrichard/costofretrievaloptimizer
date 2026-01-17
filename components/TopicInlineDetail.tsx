/**
 * TopicInlineDetail.tsx
 *
 * Inline expandable detail panel that shows within the table view.
 * Provides quick access to topic details without opening a full modal.
 */

import React, { useMemo } from 'react';
import { EnrichedTopic, ExpansionMode, ContentBrief } from '../types';
import { safeString } from '../utils/parsers';
import { calculateBriefQualityScore } from '../utils/briefQualityScore';
import { Button } from './ui/Button';
import { SmartLoader } from './ui/FunLoaders';

interface TopicInlineDetailProps {
  topic: EnrichedTopic;
  brief?: ContentBrief | null;
  hasBrief: boolean;
  onGenerateBrief: () => void;
  onExpand?: (topic: EnrichedTopic, mode: ExpansionMode) => void;
  isExpanding?: boolean;
  onDelete: () => void;
  onClose: () => void;
  canExpand: boolean;
  canGenerateBriefs: boolean;
  isGeneratingBrief?: boolean;
  onOpenFullDetail?: () => void;
  onUpdateTopic?: (topicId: string, updates: Partial<EnrichedTopic>) => void;
}

export const TopicInlineDetail: React.FC<TopicInlineDetailProps> = ({
  topic,
  brief,
  hasBrief,
  onGenerateBrief,
  onExpand,
  isExpanding,
  onDelete,
  onClose,
  canExpand,
  canGenerateBriefs,
  isGeneratingBrief = false,
  onOpenFullDetail,
  onUpdateTopic,
}) => {
  const title = safeString(topic.title);
  const slug = safeString(topic.slug);
  const description = safeString(topic.description);

  // Calculate brief quality
  const briefQuality = useMemo(() => {
    return calculateBriefQualityScore(brief);
  }, [brief]);

  // Get parent info if available
  const parentLabel = topic.parent_topic_id ? 'Has parent' : 'Root topic';

  return (
    <div className="bg-gray-800/80 border-l-4 border-blue-500 p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                topic.type === 'core'
                  ? 'bg-green-900/50 text-green-400'
                  : topic.type === 'outer'
                  ? 'bg-purple-900/50 text-purple-400'
                  : 'bg-orange-900/50 text-orange-400'
              }`}
            >
              {topic.type.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{parentLabel}</span>
          </div>

          {/* Title & Slug */}
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-green-400 font-mono mb-2">/{slug}</p>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">{description}</p>
          )}

          {/* Brief Status */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Brief:</span>
              {hasBrief ? (
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    (briefQuality?.score || 0) >= 70
                      ? 'bg-green-900/50 text-green-400'
                      : (briefQuality?.score || 0) >= 40
                      ? 'bg-yellow-900/50 text-yellow-400'
                      : 'bg-red-900/50 text-red-400'
                  }`}
                >
                  Quality: {briefQuality?.score || 0}%
                </span>
              ) : (
                <span className="text-gray-500 text-xs">Not generated</span>
              )}
            </div>

            {/* Metadata */}
            {topic.metadata?.estimated_search_volume && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Volume:</span>
                <span className="text-gray-300 text-xs">
                  {topic.metadata.estimated_search_volume.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Generate/View Brief */}
          <Button
            variant={hasBrief ? 'secondary' : 'primary'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onGenerateBrief();
            }}
            disabled={!hasBrief && !canGenerateBriefs}
            className="text-xs whitespace-nowrap"
          >
            {isGeneratingBrief ? 'Generating...' : hasBrief ? 'View Brief' : 'Generate Brief'}
          </Button>

          {/* Expand (core topics only) */}
          {topic.type === 'core' && onExpand && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onExpand(topic, 'CONTEXT');
              }}
              disabled={isExpanding || !canExpand}
              className="text-xs whitespace-nowrap"
            >
              {isExpanding ? <SmartLoader context="expanding" size="sm" showText={false} /> : 'Expand Topic'}
            </Button>
          )}

          {/* Promote to Core (outer topics only) */}
          {topic.type === 'outer' && onUpdateTopic && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateTopic(topic.id, {
                  type: 'core',
                  parent_topic_id: null
                });
              }}
              className="text-xs whitespace-nowrap bg-green-900/40 text-green-300 hover:bg-green-800/60 border border-green-800/50"
            >
              Promote to Core
            </Button>
          )}

          {/* View Full Details */}
          {onOpenFullDetail && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFullDetail();
              }}
              className="text-xs whitespace-nowrap"
            >
              Full Details
            </Button>
          )}

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 p-1"
        title="Close"
      >
        ✕
      </button>

      {/* Brief Preview (if exists) */}
      {hasBrief && brief && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase">Brief Preview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Target Keyword */}
            <div>
              <span className="text-gray-500">Target Keyword:</span>
              <p className="text-white truncate">{brief.targetKeyword || '-'}</p>
            </div>

            {/* Search Intent */}
            <div>
              <span className="text-gray-500">Intent:</span>
              <p className="text-white capitalize">{brief.searchIntent || '-'}</p>
            </div>

            {/* Word Count */}
            <div>
              <span className="text-gray-500">Word Count:</span>
              <p className="text-white">{brief.serpAnalysis?.avgWordCount || '-'}</p>
            </div>

            {/* Sections */}
            <div>
              <span className="text-gray-500">Sections:</span>
              <p className="text-white">{brief.structured_outline?.length || '-'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicInlineDetail;
