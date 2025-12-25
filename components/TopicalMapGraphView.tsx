
import React, { useState, useMemo } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { EnrichedTopic, ContentBrief, ExpansionMode, BusinessInfo } from '../types';
import { GraphVisualization, GraphNode, GraphEdge } from './ui/GraphVisualization';
import TopicDetailPanel from './ui/TopicDetailPanel';

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

  const { nodes, edges } = useMemo(() => {
    const coreTopicMap = new Map(coreTopics.map(t => [t.id, t]));

    const processedNodes: GraphNode[] = [
      ...coreTopics.map(topic => ({
        id: topic.id,
        label: topic.title,
        // FIX: Cast topic.type from string to the required literal type.
        type: topic.type as 'core' | 'outer',
        // FIX: Cast Object.values(briefs) to ContentBrief[] to resolve type errors
        hasBrief: !!(Object.values(briefs) as ContentBrief[]).find(b => b.topic_id === topic.id),
        x: Math.random() * 1200,
        y: Math.random() * 800,
      })),
      ...outerTopics.map(topic => {
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

    const processedEdges: GraphEdge[] = outerTopics
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
  }, [coreTopics, outerTopics, briefs]);

  const selectedTopic = useMemo(() => {
    if (!selectedTopicId) return null;
    return [...coreTopics, ...outerTopics].find(t => t.id === selectedTopicId) || null;
  }, [selectedTopicId, coreTopics, outerTopics]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedTopicId(prevId => (prevId === nodeId ? null : nodeId));
  };

  return (
    <div className="relative w-full h-[75vh] bg-gray-900/50 rounded-lg border border-gray-700">
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
