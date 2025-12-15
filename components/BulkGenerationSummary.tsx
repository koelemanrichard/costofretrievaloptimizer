/**
 * BulkGenerationSummary
 *
 * Modal shown after bulk brief generation completes.
 * Displays summary of generation results with quality breakdown.
 */

import React, { useMemo } from 'react';
import { EnrichedTopic, ContentBrief } from '../types';
import { Button } from './ui/Button';
import {
  calculateBriefQualityScore,
  calculateBriefHealthStats,
  getHealthLevelColor,
  BriefHealthLevel,
} from '../utils/briefQualityScore';

interface BulkGenerationSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  onViewFailed?: () => void;
  onRegenerateFailed?: (topicIds: string[]) => void;
}

interface TopicWithQuality {
  topic: EnrichedTopic;
  quality: ReturnType<typeof calculateBriefQualityScore>;
  hasBrief: boolean;
}

const BulkGenerationSummary: React.FC<BulkGenerationSummaryProps> = ({
  isOpen,
  onClose,
  topics,
  briefs,
  onViewFailed,
  onRegenerateFailed,
}) => {
  // Analyze all topics with their brief quality
  const analysis = useMemo(() => {
    const topicsWithQuality: TopicWithQuality[] = topics.map((topic) => {
      const brief = briefs[topic.id];
      const quality = calculateBriefQualityScore(brief);
      return { topic, quality, hasBrief: !!brief };
    });

    const complete = topicsWithQuality.filter(
      (t) => t.hasBrief && t.quality.level === 'complete'
    );
    const partial = topicsWithQuality.filter(
      (t) => t.hasBrief && t.quality.level === 'partial'
    );
    const empty = topicsWithQuality.filter(
      (t) => t.hasBrief && t.quality.level === 'empty'
    );
    const noBrief = topicsWithQuality.filter((t) => !t.hasBrief);

    return {
      all: topicsWithQuality,
      complete,
      partial,
      empty,
      noBrief,
      failedIds: [...empty, ...noBrief].map((t) => t.topic.id),
    };
  }, [topics, briefs]);

  if (!isOpen) return null;

  const hasIssues = analysis.empty.length > 0 || analysis.noBrief.length > 0;
  const totalGenerated = analysis.complete.length + analysis.partial.length + analysis.empty.length;

  const StatBlock: React.FC<{
    count: number;
    label: string;
    level: BriefHealthLevel | 'none';
    icon: string;
  }> = ({ count, label, level, icon }) => {
    const colors =
      level === 'none'
        ? { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' }
        : getHealthLevelColor(level);

    return (
      <div
        className={`flex flex-col items-center p-4 rounded-lg ${colors.bg} border ${colors.border}`}
      >
        <span className="text-3xl mb-1">{icon}</span>
        <span className={`text-2xl font-bold ${colors.text}`}>{count}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {hasIssues ? (
              <>
                <span className="text-yellow-400">!</span>
                Bulk Generation Complete - Issues Found
              </>
            ) : (
              <>
                <span className="text-green-400">+</span>
                Bulk Generation Complete
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatBlock
              count={analysis.complete.length}
              label="Complete"
              level="complete"
              icon="+"
            />
            <StatBlock
              count={analysis.partial.length}
              label="Partial"
              level="partial"
              icon="!"
            />
            <StatBlock
              count={analysis.empty.length}
              label="Failed"
              level="empty"
              icon="-"
            />
            <StatBlock
              count={analysis.noBrief.length}
              label="No Brief"
              level="none"
              icon="o"
            />
          </div>

          {/* Summary Text */}
          <div className="text-sm text-gray-400 mb-4">
            <p>
              Generated <strong className="text-white">{totalGenerated}</strong> briefs
              for <strong className="text-white">{topics.length}</strong> topics.
            </p>
            {hasIssues && (
              <p className="mt-2 text-yellow-400">
                {analysis.empty.length + analysis.noBrief.length} topics need attention.
                Consider regenerating failed briefs for better content quality.
              </p>
            )}
          </div>

          {/* Failed Topics List */}
          {hasIssues && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Topics needing attention:</h3>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-800/50 rounded-lg p-2">
                {[...analysis.empty, ...analysis.noBrief].slice(0, 10).map((item) => (
                  <div
                    key={item.topic.id}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-700/50"
                  >
                    <span className="text-gray-300 truncate">{item.topic.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.hasBrief
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {item.hasBrief ? `${item.quality.score}%` : 'No brief'}
                    </span>
                  </div>
                ))}
                {analysis.failedIds.length > 10 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{analysis.failedIds.length - 10} more topics
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/30">
          {hasIssues && onViewFailed && (
            <Button
              variant="secondary"
              onClick={() => {
                onViewFailed();
                onClose();
              }}
            >
              View Failed
            </Button>
          )}
          {hasIssues && onRegenerateFailed && analysis.failedIds.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                onRegenerateFailed(analysis.failedIds);
                onClose();
              }}
            >
              Regenerate Failed ({analysis.failedIds.length})
            </Button>
          )}
          <Button onClick={onClose}>
            {hasIssues ? 'Continue Anyway' : 'Done'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkGenerationSummary;
