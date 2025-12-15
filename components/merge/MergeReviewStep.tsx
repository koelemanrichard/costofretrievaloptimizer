// components/merge/MergeReviewStep.tsx
import React, { useMemo } from 'react';
import {
  TopicalMap,
  ContextConflict,
  TopicMergeDecision,
  EnrichedTopic,
  SemanticTriple,
  TopicSimilarityResult,
} from '../../types';
import { Card } from '../ui/Card';

interface MergeReviewStepProps {
  sourceMaps: TopicalMap[];
  newMapName: string;
  onMapNameChange: (name: string) => void;
  contextConflicts: ContextConflict[];
  resolvedEavs: SemanticTriple[];
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  excludedTopicIds: string[];
  newTopics: EnrichedTopic[];
  isCreating: boolean;
  validationErrors: string[];
}

const MergeReviewStep: React.FC<MergeReviewStepProps> = ({
  sourceMaps,
  newMapName,
  onMapNameChange,
  contextConflicts,
  resolvedEavs,
  topicSimilarities,
  topicDecisions,
  excludedTopicIds,
  newTopics,
  isCreating,
  validationErrors,
}) => {
  // Calculate topic stats
  const topicStats = useMemo(() => {
    const allSourceTopics = sourceMaps.flatMap(m => m.topics || []);
    const inSimilarity = new Set<string>();
    topicSimilarities.forEach(sim => {
      const decision = topicDecisions.find(d => d.id === sim.id);
      if (decision) {
        if (decision.topicAId) inSimilarity.add(decision.topicAId);
        if (decision.topicBId) inSimilarity.add(decision.topicBId);
      }
    });

    const uniqueTopics = allSourceTopics.filter(t => !inSimilarity.has(t.id));
    const uniqueIncluded = uniqueTopics.filter(t => !excludedTopicIds.includes(t.id));

    const merged = topicDecisions.filter(d => d.userDecision === 'merge').length;
    const keptBoth = topicDecisions.filter(d => d.userDecision === 'keep_both').length * 2;
    const keptA = topicDecisions.filter(d => d.userDecision === 'keep_a').length;
    const keptB = topicDecisions.filter(d => d.userDecision === 'keep_b').length;
    const deleted = topicDecisions.filter(d => d.userDecision === 'delete').length * 2;
    const pending = topicDecisions.filter(d => d.userDecision === 'pending').length * 2;

    const fromDecisions = merged + keptBoth + keptA + keptB + pending;
    const total = fromDecisions + uniqueIncluded.length + newTopics.length;

    return {
      merged,
      keptBoth: keptBoth / 2,
      keptSingle: keptA + keptB,
      deleted: deleted / 2,
      pending: pending / 2,
      uniqueIncluded: uniqueIncluded.length,
      uniqueExcluded: excludedTopicIds.length,
      newTopics: newTopics.length,
      total,
    };
  }, [sourceMaps, topicSimilarities, topicDecisions, excludedTopicIds, newTopics]);

  // Calculate resolved context count
  const resolvedContextCount = contextConflicts.filter(c => c.resolution !== null).length;

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg">
          <p className="font-semibold text-red-300 mb-2">Please fix the following issues:</p>
          <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Map Name Input */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          New Map Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={newMapName}
          onChange={(e) => onMapNameChange(e.target.value)}
          placeholder="Enter a name for the merged map..."
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          disabled={isCreating}
        />
        <p className="text-xs text-gray-500 mt-1">
          Suggested: {sourceMaps.map(m => m.name).join(' + ')}
        </p>
      </Card>

      {/* Source Maps */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Source Maps</h3>
        <div className="flex flex-wrap gap-2">
          {sourceMaps.map(map => (
            <span
              key={map.id}
              className="px-3 py-1 bg-blue-900/50 text-blue-200 rounded-full text-sm"
            >
              {map.name} ({map.topicCounts?.total || map.topics?.length || 0} topics)
            </span>
          ))}
        </div>
      </Card>

      {/* Context Resolution Summary */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Context Resolution</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Conflicts Resolved:</span>
            <span className="text-white ml-2">{resolvedContextCount}/{contextConflicts.length}</span>
          </div>
          <div>
            <span className="text-gray-400">EAVs Included:</span>
            <span className="text-white ml-2">{resolvedEavs.length}</span>
          </div>
        </div>
      </Card>

      {/* Topic Summary */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Topic Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-green-900/30 rounded">
            <p className="text-green-400 font-semibold text-lg">{topicStats.merged}</p>
            <p className="text-gray-400">Merged Pairs</p>
          </div>
          <div className="p-3 bg-blue-900/30 rounded">
            <p className="text-blue-400 font-semibold text-lg">{topicStats.keptBoth}</p>
            <p className="text-gray-400">Kept Both</p>
          </div>
          <div className="p-3 bg-purple-900/30 rounded">
            <p className="text-purple-400 font-semibold text-lg">{topicStats.keptSingle}</p>
            <p className="text-gray-400">Kept Single</p>
          </div>
          <div className="p-3 bg-gray-800 rounded">
            <p className="text-gray-300 font-semibold text-lg">{topicStats.uniqueIncluded}</p>
            <p className="text-gray-400">Unique Included</p>
          </div>
          <div className="p-3 bg-red-900/30 rounded">
            <p className="text-red-400 font-semibold text-lg">{topicStats.deleted + topicStats.uniqueExcluded}</p>
            <p className="text-gray-400">Excluded/Deleted</p>
          </div>
          <div className="p-3 bg-yellow-900/30 rounded">
            <p className="text-yellow-400 font-semibold text-lg">{topicStats.newTopics}</p>
            <p className="text-gray-400">New Topics</p>
          </div>
        </div>

        {topicStats.pending > 0 && (
          <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-yellow-300 text-sm">
            Warning: {topicStats.pending} topic pairs have pending decisions
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xl font-bold text-white">
            Total Topics in New Map: <span className="text-green-400">{topicStats.total}</span>
          </p>
        </div>
      </Card>

      {/* Creating indicator */}
      {isCreating && (
        <div className="flex items-center justify-center gap-3 p-4 bg-blue-900/30 rounded-lg">
          <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-blue-300">Creating merged map...</span>
        </div>
      )}
    </div>
  );
};

export default MergeReviewStep;
