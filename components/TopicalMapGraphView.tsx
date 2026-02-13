
import React, { useState, useMemo } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { EnrichedTopic, ContentBrief, ExpansionMode, BusinessInfo } from '../types';
import { GraphVisualization, GraphNode, GraphEdge } from './ui/GraphVisualization';
import TopicDetailPanel from './ui/TopicDetailPanel';
import { SERVICE_REGISTRY } from '../config/serviceRegistry';

interface TopicalMapGraphViewProps {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  onSelectTopic: (topic: EnrichedTopic) => void;
  onExpandCoreTopic: (coreTopic: EnrichedTopic, mode: ExpansionMode) => void;
  onDeleteTopic: (topicId: string) => void;
  expandingCoreTopicId: string | null;
  allCoreTopics: EnrichedTopic[];
  allTopics?: EnrichedTopic[]; // All topics for visual parent selection
  onReparent: (topicId: string, newParentId: string) => void;
  canExpandTopics: boolean;
  onUpdateTopic: (topicId: string, updates: Partial<EnrichedTopic>) => void;
  /** Business info for competitive intelligence analysis */
  businessInfo?: BusinessInfo;
}

const GRAPH_VIEW_MAX = SERVICE_REGISTRY.limits.topicMap.graphViewMax;

const TopicalMapGraphView: React.FC<TopicalMapGraphViewProps> = ({
  coreTopics,
  outerTopics,
  briefs,
  onSelectTopic,
  onExpandCoreTopic,
  onDeleteTopic,
  expandingCoreTopicId,
  allCoreTopics,
  allTopics = [],
  onReparent,
  canExpandTopics,
  onUpdateTopic,
  businessInfo
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [clusterFilter, setClusterFilter] = useState<string | null>(null);

  const totalTopics = coreTopics.length + outerTopics.length;
  const exceedsMax = totalTopics > GRAPH_VIEW_MAX;

  // Filter topics by cluster when needed
  const filteredCoreTopics = useMemo(() => {
    if (!clusterFilter) return coreTopics;
    return coreTopics.filter(t => t.id === clusterFilter);
  }, [coreTopics, clusterFilter]);

  const filteredOuterTopics = useMemo(() => {
    if (!clusterFilter) return outerTopics;
    return outerTopics.filter(t => t.parent_topic_id === clusterFilter);
  }, [outerTopics, clusterFilter]);

  const { nodes, edges } = useMemo(() => {
    const coreTopicMap = new Map(filteredCoreTopics.map(t => [t.id, t]));

    const processedNodes: GraphNode[] = [
      ...filteredCoreTopics.map(topic => ({
        id: topic.id,
        label: topic.title,
        // FIX: Cast topic.type from string to the required literal type.
        type: topic.type as 'core' | 'outer',
        // FIX: Cast Object.values(briefs) to ContentBrief[] to resolve type errors
        hasBrief: !!(Object.values(briefs) as ContentBrief[]).find(b => b.topic_id === topic.id),
        x: Math.random() * 1200,
        y: Math.random() * 800,
      })),
      ...filteredOuterTopics.map(topic => {
        return {
          id: topic.id,
          label: topic.title,
          // FIX: Cast topic.type from string to the required literal type.
          type: topic.type as 'core' | 'outer',
          // FIX: Cast Object.values(briefs) to ContentBrief[] to resolve type errors
          hasBrief: !!(Object.values(briefs) as ContentBrief[]).find(b => b.topic_id === topic.id),
          x: Math.random() * 1200,
          y: Math.random() * 800,
          parentCoreId: topic.parent_topic_id || undefined,
        }
      }),
    ];

    const processedEdges: GraphEdge[] = filteredOuterTopics
      .map(topic => {
        if (!topic.parent_topic_id) return null;
        return {
          id: `${topic.parent_topic_id}-${topic.id}`,
          source: topic.parent_topic_id,
          target: topic.id,
          linkType: 'hierarchical',
        };
      })
      .filter((edge): edge is any => edge !== null);

    return { nodes: processedNodes, edges: processedEdges };
  }, [filteredCoreTopics, filteredOuterTopics, briefs]);

  const selectedTopic = useMemo(() => {
    if (!selectedTopicId) return null;
    return [...coreTopics, ...outerTopics].find(t => t.id === selectedTopicId) || null;
  }, [selectedTopicId, coreTopics, outerTopics]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedTopicId(prevId => (prevId === nodeId ? null : nodeId));
  };

  // When exceeding max and no filter selected, show cap message
  if (exceedsMax && !clusterFilter) {
    return (
      <div className="relative w-full h-[75vh] bg-gray-900/50 rounded-lg border border-gray-700 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <p className="text-lg text-gray-300 mb-2">
            Graph view supports up to {GRAPH_VIEW_MAX} topics
          </p>
          <p className="text-sm text-gray-400 mb-6">
            This map has {totalTopics} topics. Select a Core Topic cluster below to visualize, or switch to Table view.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {coreTopics.map(core => {
              const spokeCount = outerTopics.filter(t => t.parent_topic_id === core.id).length;
              return (
                <button
                  key={core.id}
                  onClick={() => setClusterFilter(core.id)}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  {core.title} <span className="text-gray-500">({spokeCount + 1})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[75vh] bg-gray-900/50 rounded-lg border border-gray-700">
      {/* Cluster filter bar (when filtering) */}
      {clusterFilter && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-gray-800/90 rounded-lg px-3 py-1.5 border border-gray-600">
          <span className="text-xs text-gray-400">Cluster:</span>
          <span className="text-xs text-white font-medium">
            {coreTopics.find(c => c.id === clusterFilter)?.title || 'Unknown'}
          </span>
          <button
            onClick={() => setClusterFilter(null)}
            className="text-gray-400 hover:text-white ml-1 text-sm"
          >
            &times;
          </button>
          {exceedsMax && (
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="ml-2 text-xs bg-gray-700 text-gray-300 border border-gray-600 rounded px-1 py-0.5"
            >
              {coreTopics.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}
        </div>
      )}
      <GraphVisualization
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedTopicId}
        onReparent={onReparent}
      />
      {selectedTopic && (
        <TopicDetailPanel
          topic={selectedTopic}
          // FIX: Cast Object.values(briefs) to ContentBrief[] to resolve type errors
          hasBrief={!!(Object.values(briefs) as ContentBrief[]).find(b => b.topic_id === selectedTopic.id)}
          isExpanding={expandingCoreTopicId === selectedTopic.id}
          onClose={() => setSelectedTopicId(null)}
          onGenerateBrief={() => onSelectTopic(selectedTopic)}
          onExpand={onExpandCoreTopic}
          onDelete={onDeleteTopic}
          allCoreTopics={allCoreTopics}
          allTopics={allTopics}
          onReparent={onReparent}
          canExpand={canExpandTopics}
          onUpdateTopic={onUpdateTopic}
          businessInfo={businessInfo}
        />
      )}
    </div>
  );
};

export default TopicalMapGraphView;
