import React, { useMemo, useState } from 'react';
import { EnrichedTopic, ContentBrief, BusinessInfo, ContextualBridgeLink, KnowledgeGraph } from '../../types';
import * as aiService from '../../services/aiService';
import { useAppState } from '../../state/appState';
import { Card } from '../ui/Card';
import { GraphVisualization, GraphNode, GraphEdge } from '../ui/GraphVisualization';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { getSupabaseClient } from '../../services/supabaseClient';
import { Modal } from '../ui/Modal';

interface InternalLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  businessInfo: BusinessInfo | null;
  knowledgeGraph: KnowledgeGraph | null;
}

export const InternalLinkingModal: React.FC<InternalLinkingModalProps> = ({ isOpen, onClose, coreTopics, outerTopics, briefs, businessInfo, knowledgeGraph }) => {
  const { dispatch, state } = useAppState();
  const { activeMapId } = state;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFindingLinks, setIsFindingLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTopics = useMemo(() => [...coreTopics, ...outerTopics], [coreTopics, outerTopics]);

  const { nodes, edges } = useMemo(() => {
    // FIX: Explicitly typed the Map to ensure topic retrieval returns EnrichedTopic instead of unknown/any.
    const topicMapById = new Map<string, EnrichedTopic>(allTopics.map(t => [t.id, t]));
    
    // 1. Process Contextual Bridge Links (from briefs)
    // SYSTEMATIC FIX: Robustly filter briefs to ensure they are valid objects with required arrays.
    // This prevents runtime crashes if 'briefs' contains nulls, empty objects, or malformed data from the DB/AI.
    const validBriefs = Object.values(briefs).filter((b): b is ContentBrief => {
        return (
            !!b && 
            typeof b === 'object' && 
            'topic_id' in b
        );
    });

    const contextualEdges: GraphEdge[] = [];
    
    for (const brief of validBriefs) {
      const sourceTopic = allTopics.find(t => t.id === brief.topic_id);
      if (!sourceTopic) continue;

      // FIX: Handle both array and object formats for contextualBridge
      const bridgeLinks = Array.isArray(brief.contextualBridge) 
          ? brief.contextualBridge 
          : brief.contextualBridge?.links || [];

      for (const link of bridgeLinks) {
        // Defensive coding: ensure link properties are strings before comparison
        const targetTopicTitle = String(link.targetTopic || '');
        if (!targetTopicTitle) continue;

        const targetTopic = allTopics.find(t => t.title === targetTopicTitle);
        if (targetTopic) {
          contextualEdges.push({
            id: `contextual-${sourceTopic.id}-${targetTopic.id}-${String(link.anchorText || 'link')}`,
            source: sourceTopic.id,
            target: targetTopic.id,
            anchorText: String(link.anchorText || ''),
            linkType: 'contextual',
          });
        }
      }
    }

    // 2. Process Hierarchical Links (from core to outer topics)
    const hierarchicalEdges: GraphEdge[] = [];
    for (const outerTopic of outerTopics) {
        const parentCoreTopic = outerTopic.parent_topic_id ? topicMapById.get(outerTopic.parent_topic_id) : null;
        if (parentCoreTopic) {
             hierarchicalEdges.push({
                id: `hierarchical-${parentCoreTopic.id}-${outerTopic.id}`,
                source: parentCoreTopic.id,
                target: outerTopic.id,
                linkType: 'hierarchical',
            });
        }
    }
    
    // 3. Combine Edges and Define Nodes
    const allEdges = [...hierarchicalEdges, ...contextualEdges];

    const processedNodes: GraphNode[] = allTopics.map((topic) => {
        const hasIncomingLink = allEdges.some(edge => edge.target === topic.id);
        // Check existence in the validated list instead of raw object lookup
        const hasBrief = validBriefs.some(b => b.topic_id === topic.id);
        
        return {
          id: topic.id,
          label: topic.title,
          // FIX: Cast topic.type from string to the required literal type.
          type: topic.type as 'core' | 'outer',
          isOrphan: !hasIncomingLink && topic.type !== 'core',
          hasBrief,
          x: Math.random() * 1200,
          y: Math.random() * 800,
        };
    });

    return { nodes: processedNodes, edges: allEdges };
  }, [coreTopics, outerTopics, briefs, allTopics]);
  
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(prevId => (prevId === nodeId ? null : nodeId));
    setError(null);
  };

  const handleFindLinks = async () => {
    if (!selectedNodeId || !businessInfo || !knowledgeGraph || !activeMapId) return;
    const targetTopic = allTopics.find(t => t.id === selectedNodeId);
    if (!targetTopic) return;

    setIsFindingLinks(true);
    setError(null);

    try {
        // FIX: Explicitly cast the result of aiService call to any[] to resolve property access errors.
        const opportunities: any[] = await aiService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch);
        
        if (opportunities.length > 0) {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            let linksAddedCount = 0;

            for (const opp of opportunities) {
                const sourceTopic = allTopics.find(t => t.title === opp.sourceTopicTitle);
                if (sourceTopic && activeMapId) {
                    const brief = briefs[sourceTopic.id];
                    
                    // Can only add links if a brief exists
                    if (brief) {
                        const linkToAdd = {
                            anchorText: opp.anchorText,
                            targetTopic: targetTopic.title,
                            reasoning: opp.reasoning,
                        };
                        
                        // 1. Update DB
                        // Normalize bridge before adding
                        const currentBridge = Array.isArray(brief.contextualBridge) 
                            ? brief.contextualBridge 
                            : brief.contextualBridge?.links || [];

                        const newContextualBridge = [...currentBridge, linkToAdd];
                        
                        const { error } = await supabase
                            .from('content_briefs')
                            .update({ contextual_bridge: newContextualBridge as any })
                            .eq('id', brief.id);

                        if (!error) {
                            // 2. Update State (Optimistic UI)
                            dispatch({
                                type: 'UPDATE_BRIEF_LINKS',
                                payload: {
                                    mapId: activeMapId,
                                    sourceTopicId: sourceTopic.id,
                                    linkToAdd: linkToAdd
                                }
                            });
                            linksAddedCount++;
                        }
                    }
                }
            }
            
            if (linksAddedCount > 0) {
                 dispatch({ type: 'SET_NOTIFICATION', payload: `Added ${linksAddedCount} new link suggestions pointing to "${targetTopic.title}".`});
            } else {
                 dispatch({ type: 'SET_NOTIFICATION', payload: `Found opportunities, but source topics don't have briefs yet. Generate briefs first.`});
            }
        } else {
             dispatch({ type: 'SET_NOTIFICATION', payload: `AI could not find any new linking opportunities for "${targetTopic.title}".`});
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to find links: ${message}`);
    } finally {
        setIsFindingLinks(false);
    }
  };
  
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  const customHeader = (
    <div className="flex-1">
        <h2 className="text-xl font-bold text-white">Internal Linking Visualization</h2>
        <p className="text-sm text-gray-400">Green = Core, Purple = Outer. Dashed lines are contextual links, solid are hierarchical.</p>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Internal Linking Visualization"
      description="Visualize and manage internal links between topics in your topical map"
      maxWidth="max-w-full"
      customHeader={customHeader}
      className="h-full"
    >
      <div className="flex-grow relative -m-6 h-[calc(100vh-200px)]">
        {allTopics.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                    <p className="text-lg font-semibold">No topics to visualize.</p>
                    <p className="text-sm mt-2">Add topics to your map to see the internal linking structure.</p>
                </div>
            </div>
        ) : (
            <>
                <GraphVisualization
                    nodes={nodes}
                    edges={edges}
                    onNodeClick={handleNodeClick}
                    selectedNodeId={selectedNodeId}
                    isLinkingMap={true}
                />
                {selectedNode && (
                    <Card className="absolute top-4 left-4 w-80 max-w-sm bg-gray-800/80 backdrop-blur-md z-10">
                        <div className="p-4">
                            <h3 className="text-lg font-bold text-white">{selectedNode.label}</h3>
                            <p className={`text-sm font-semibold ${selectedNode.type === 'core' ? 'text-green-400' : 'text-purple-400'}`}>
                                {selectedNode.type === 'core' ? 'Core Topic' : 'Outer Topic'}
                            </p>
                            {selectedNode.isOrphan && (
                                <p className="text-xs text-yellow-400 mt-1" role="alert">
                                    Warning: This is an orphan page with no incoming links.
                                </p>
                            )}
                            <div className="mt-4 pt-4 border-t border-gray-600">
                                <Button onClick={handleFindLinks} disabled={isFindingLinks} className="w-full">
                                    {isFindingLinks ? <Loader /> : 'Find Linking Opportunities'}
                                </Button>
                                {error && <p className="text-xs text-red-400 mt-2" role="alert">{error}</p>}
                            </div>
                        </div>
                    </Card>
                )}
            </>
        )}
      </div>
    </Modal>
  );
};
