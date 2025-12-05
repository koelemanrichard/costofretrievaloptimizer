import React, { useMemo } from 'react';
import {
  TopicalMap,
  TopicSimilarityResult,
  TopicMergeDecision,
  EnrichedTopic,
} from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import TopicSimilarityCard from './TopicSimilarityCard';

interface MergeTopicsStepProps {
  sourceMaps: TopicalMap[];
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopic[];
  excludedTopicIds: string[];
  isAnalyzing: boolean;
  onDecisionChange: (decision: TopicMergeDecision) => void;
  onAddNewTopic: (topic: EnrichedTopic) => void;
  onToggleExcluded: (topicId: string) => void;
  onAnalyze: () => void;
  onExport: () => void;
  onImport: () => void;
}

const MergeTopicsStep: React.FC<MergeTopicsStepProps> = ({
  sourceMaps,
  topicSimilarities,
  topicDecisions,
  newTopics,
  excludedTopicIds,
  isAnalyzing,
  onDecisionChange,
  onAddNewTopic,
  onToggleExcluded,
  onAnalyze,
  onExport,
  onImport,
}) => {
  // Get all topics from all maps
  const allTopics = useMemo(() => {
    const topicMap = new Map<string, { topic: EnrichedTopic; mapName: string }>();
    sourceMaps.forEach(map => {
      (map.topics || []).forEach(topic => {
        topicMap.set(topic.id, { topic, mapName: map.name });
      });
    });
    return topicMap;
  }, [sourceMaps]);

  // Find unique topics (not in any similarity pair)
  const uniqueTopics = useMemo(() => {
    const inSimilarity = new Set<string>();
    topicSimilarities.forEach(sim => {
      inSimilarity.add(sim.topicA.id);
      inSimilarity.add(sim.topicB.id);
    });

    const unique: { topic: EnrichedTopic; mapName: string }[] = [];
    allTopics.forEach((value, id) => {
      if (!inSimilarity.has(id)) {
        unique.push(value);
      }
    });
    return unique;
  }, [allTopics, topicSimilarities]);

  // Group unique topics by source map
  const uniqueByMap = useMemo(() => {
    const byMap = new Map<string, { topic: EnrichedTopic; mapName: string }[]>();
    uniqueTopics.forEach(item => {
      const existing = byMap.get(item.mapName) || [];
      byMap.set(item.mapName, [...existing, item]);
    });
    return byMap;
  }, [uniqueTopics]);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader />
        <p className="text-gray-400 mt-4">Analyzing topic similarities...</p>
      </div>
    );
  }

  const getDecisionForSimilarity = (simId: string): TopicMergeDecision => {
    return topicDecisions.find(d => d.id === simId) || {
      id: simId,
      topicAId: null,
      topicBId: null,
      userDecision: 'pending',
      finalTitle: '',
      finalDescription: '',
      finalType: 'core',
      finalParentId: null,
    };
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {topicSimilarities.length} similarities found &bull; {uniqueTopics.length} unique topics
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onExport}>
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={onImport}>
            Import
          </Button>
          <Button variant="secondary" size="sm" onClick={onAnalyze}>
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Similar topics section */}
      {topicSimilarities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Similar Topics ({topicSimilarities.length})
          </h3>
          <div className="space-y-3">
            {topicSimilarities.map(sim => (
              <TopicSimilarityCard
                key={sim.id}
                similarity={sim}
                decision={getDecisionForSimilarity(sim.id)}
                mapAName={sourceMaps[0]?.name || 'Map A'}
                mapBName={sourceMaps[1]?.name || 'Map B'}
                onDecisionChange={onDecisionChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unique topics section */}
      {uniqueTopics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Unique Topics ({uniqueTopics.length})
          </h3>
          {Array.from(uniqueByMap.entries()).map(([mapName, topics]) => (
            <Card key={mapName} className="p-4 mb-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-white">{mapName}</h4>
                <span className="text-sm text-gray-400">{topics.length} topics</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {topics.map(({ topic }) => {
                  const isExcluded = excludedTopicIds.includes(topic.id);
                  return (
                    <div
                      key={topic.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
                        isExcluded ? 'opacity-50 bg-red-900/20' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                      onClick={() => onToggleExcluded(topic.id)}
                    >
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggleExcluded(topic.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="text-white text-sm">{topic.title}</p>
                        <p className="text-xs text-gray-500">{topic.type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New topics section */}
      {newTopics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            New Topics ({newTopics.length})
          </h3>
          <Card className="p-4">
            <div className="space-y-2">
              {newTopics.map(topic => (
                <div
                  key={topic.id}
                  className="flex items-center gap-3 p-2 bg-green-900/20 rounded"
                >
                  <span className="text-xs px-2 py-1 bg-green-700 rounded text-white">NEW</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{topic.title}</p>
                    <p className="text-xs text-gray-500">{topic.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Add new topic button */}
      <Button
        variant="secondary"
        onClick={() => {
          const newTopic: EnrichedTopic = {
            id: `new-${Date.now()}`,
            map_id: '',
            parent_topic_id: null,
            title: 'New Topic',
            slug: 'new-topic',
            description: 'New topic description',
            type: 'core',
            freshness: 'STANDARD' as any,
          };
          onAddNewTopic(newTopic);
        }}
      >
        + Add New Topic
      </Button>
    </div>
  );
};

export default MergeTopicsStep;
