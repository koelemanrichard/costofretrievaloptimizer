
// FIX: Implemented the TopicalMapDisplay component to render the topical map UI.
import React, { useState, useMemo, useCallback } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Added FreshnessProfile to imports to use the enum.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { EnrichedTopic, ContentBrief, MergeSuggestion, FreshnessProfile, ExpansionMode } from '../types';
import TopicItem from './TopicItem';
import { Button } from './ui/Button';
import TopicalMapGraphView from './TopicalMapGraphView';
// FIX: Corrected import path for aiService to be relative.
import * as aiService from '../services/aiService';
import { useAppState } from '../state/appState';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';
import MergeConfirmationModal from './ui/MergeConfirmationModal';
import { InfoTooltip } from './ui/InfoTooltip';

interface TopicalMapDisplayProps {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  onSelectTopicForBrief: (topic: EnrichedTopic) => void;
  onExpandCoreTopic: (coreTopic: EnrichedTopic, mode: ExpansionMode) => void;
  expandingCoreTopicId: string | null;
  onExecuteMerge: (mapId: string, topicsToDelete: EnrichedTopic[], newTopicData: { title: string, description: string }) => void;
  canExpandTopics: boolean;
  canGenerateBriefs: boolean;
  onGenerateInitialMap?: () => void;
  onUpdateTopic: (topicId: string, updates: Partial<EnrichedTopic>) => void;
  // Migration-specific props (optional)
  onDeleteTopic?: (topicId: string) => void;
  onInventoryDrop?: (inventoryId: string, topicId: string) => void;
  // Foundation Pages Quick Actions (optional)
  onRepairFoundationPages?: () => void;
  isRepairingFoundation?: boolean;
  onOpenNavigation?: () => void;
}

export type { TopicalMapDisplayProps };

const TopicalMapDisplay: React.FC<TopicalMapDisplayProps> = ({
  coreTopics,
  outerTopics,
  briefs,
  onSelectTopicForBrief,
  onExpandCoreTopic,
  expandingCoreTopicId,
  canExpandTopics,
  canGenerateBriefs,
  onGenerateInitialMap,
  onUpdateTopic,
  onRepairFoundationPages,
  isRepairingFoundation,
  onOpenNavigation
}) => {
  const { state, dispatch } = useAppState();
  const { activeMapId, businessInfo, isLoading } = state;

  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [collapsedCoreIds, setCollapsedCoreIds] = useState<Set<string>>(new Set());
  const [isRepairingLabels, setIsRepairingLabels] = useState(false);

  const topicsByParent = useMemo(() => {
    const map = new Map<string, EnrichedTopic[]>();
    outerTopics.forEach(topic => {
      const parentId = topic.parent_topic_id || 'uncategorized';
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(topic);
    });
    return map;
  }, [outerTopics]);
  
  const allTopics = useMemo(() => [...coreTopics, ...outerTopics], [coreTopics, outerTopics]);

  const handleToggleCollapse = (coreTopicId: string) => {
    setCollapsedCoreIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(coreTopicId)) {
            newSet.delete(coreTopicId);
        } else {
            newSet.add(coreTopicId);
        }
        return newSet;
    });
  };
  const handleCollapseAll = () => setCollapsedCoreIds(new Set(coreTopics.map(c => c.id)));
  const handleExpandAll = () => setCollapsedCoreIds(new Set());

  // Repair Section Labels - classifies topics into Core Section (monetization) vs Author Section (informational)
  // Also verifies and fixes topic type (core vs outer) misclassifications
  const handleRepairSectionLabels = async () => {
    if (allTopics.length === 0 || !activeMapId) return;
    const activeMap = state.topicalMaps.find(m => m.id === activeMapId);
    if (!activeMap || !businessInfo) return;

    setIsRepairingLabels(true);
    dispatch({ type: 'SET_LOADING', payload: { key: 'repairLabels', value: true } });

    try {
      // Call the classification service (now includes type verification)
      const classifications = await aiService.classifyTopicSections(allTopics, businessInfo, dispatch);

      // Track changes
      let monetizationCount = 0;
      let informationalCount = 0;
      let typeChangesCount = 0;

      // Build lookup for core topics
      const coreTopicsByTitle = new Map<string, string>();
      allTopics.filter(t => t.type === 'core').forEach(t => {
        coreTopicsByTitle.set(t.title.toLowerCase(), t.id);
      });

      for (const classification of classifications) {
        const topic = allTopics.find(t => t.id === classification.id);
        if (!topic) continue;

        // Build update object
        const updates: Record<string, any> = {};

        // Check topic_class change
        if (topic.topic_class !== classification.topic_class) {
          updates.topic_class = classification.topic_class;
          if (classification.topic_class === 'monetization') monetizationCount++;
          else informationalCount++;
        }

        // Check type change (core -> outer or vice versa)
        if (classification.suggestedType && classification.suggestedType !== topic.type) {
          updates.type = classification.suggestedType;

          // If changing to outer, assign parent
          if (classification.suggestedType === 'outer' && classification.suggestedParentTitle) {
            const parentId = coreTopicsByTitle.get(classification.suggestedParentTitle.toLowerCase());
            if (parentId) {
              updates.parent_topic_id = parentId;
            }
          } else if (classification.suggestedType === 'core') {
            // If promoting to core, remove parent
            updates.parent_topic_id = null;
          }

          typeChangesCount++;
          dispatch({ type: 'LOG_EVENT', payload: {
            service: 'RepairLabels',
            message: `Type change: "${topic.title}" ${topic.type} → ${classification.suggestedType}${classification.typeChangeReason ? ` (${classification.typeChangeReason})` : ''}`,
            status: 'info',
            timestamp: Date.now()
          }});
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await onUpdateTopic(classification.id, updates);
        }
      }

      const messages = [];
      if (monetizationCount > 0 || informationalCount > 0) {
        messages.push(`Section labels: ${monetizationCount} Core, ${informationalCount} Author`);
      }
      if (typeChangesCount > 0) {
        messages.push(`Type changes: ${typeChangesCount}`);
      }

      dispatch({ type: 'SET_NOTIFICATION', payload: messages.length > 0 ? `Repaired: ${messages.join('. ')}` : 'No changes needed.' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to repair section labels.' });
    } finally {
      setIsRepairingLabels(false);
      dispatch({ type: 'SET_LOADING', payload: { key: 'repairLabels', value: false } });
    }
  };

  const handleToggleSelection = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };
  
  const handleFindMergeOpportunities = async () => {
    if (selectedTopicIds.length < 2 || !activeMapId) return;
    const activeMap = state.topicalMaps.find(m => m.id === activeMapId);
    if (!activeMap || !activeMap.business_info) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'merge', value: true } });
    try {
        const selected = allTopics.filter(t => selectedTopicIds.includes(t.id));
        const suggestion = await aiService.findMergeOpportunitiesForSelection(activeMap.business_info as any, selected, dispatch);
        setMergeSuggestion(suggestion);
        setIsMergeModalOpen(true);
    } catch(e) {
        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to find merge opportunities.' });
    } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'merge', value: false } });
    }
  };
  
  const handleExecuteMerge = (newTopicData: {title: string, description: string}) => {
    if (!mergeSuggestion || !activeMapId) return;
    dispatch({ type: 'SET_LOADING', payload: { key: 'executeMerge', value: true } });
    const topicsToDelete = allTopics.filter(t => mergeSuggestion.topicIds.includes(t.id));

    // This is a simplified version of the logic from ProjectDashboard
    const newTopic: EnrichedTopic = {
        id: uuidv4(),
        map_id: activeMapId,
        parent_topic_id: null,
        title: newTopicData.title,
        slug: slugify(newTopicData.title),
        description: newTopicData.description,
        type: 'core',
// FIX: Used the FreshnessProfile enum instead of a raw string.
        freshness: FreshnessProfile.EVERGREEN
    };

    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: newTopic } });
    topicsToDelete.forEach(t => {
        dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId: t.id } });
    });
    
    setIsMergeModalOpen(false);
    setMergeSuggestion(null);
    setSelectedTopicIds([]);
    dispatch({ type: 'SET_LOADING', payload: { key: 'executeMerge', value: false } });
    dispatch({ type: 'SET_NOTIFICATION', payload: 'Topics merged successfully.' });
  };
  
  const handleReparent = useCallback((topicId: string, newParentId: string) => {
    if(!activeMapId) return;
    const topic = outerTopics.find(t => t.id === topicId);
    const newParent = coreTopics.find(t => t.id === newParentId);
    if (!topic || !newParent) return;

    const newSlug = `${newParent.slug}/${slugify(topic.title)}`;
    // This update is primarily structural, so we assume it's safe to call the prop
    onUpdateTopic(topicId, { parent_topic_id: newParentId, slug: newSlug });
  }, [activeMapId, coreTopics, outerTopics, onUpdateTopic]);
  
  const handleDragStart = (e: React.DragEvent, topicId: string) => {
    const topic = allTopics.find(t => t.id === topicId);
    if(topic && topic.type === 'outer') {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedTopicId(topicId);
    } else {
        e.preventDefault();
    }
  };

  const handleDropOnTopic = (e: React.DragEvent, targetTopicId: string) => {
    e.preventDefault();
    if (!draggedTopicId) return;
    const targetTopic = coreTopics.find(t => t.id === targetTopicId);
    if (targetTopic && draggedTopicId !== targetTopicId) {
        handleReparent(draggedTopicId, targetTopicId);
    }
    setDraggedTopicId(null);
  };


  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Topical Map</h2>
            <div className="flex items-center gap-4">
                 <Button onClick={handleFindMergeOpportunities} disabled={selectedTopicIds.length < 2 || isLoading.merge}>
                    {isLoading.merge ? 'Analyzing...' : `Merge Selected (${selectedTopicIds.length})`}
                </Button>
                {viewMode === 'list' && coreTopics.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button onClick={handleExpandAll} variant="secondary" className="!py-1 !px-3 text-xs">Expand All</Button>
                        <Button onClick={handleCollapseAll} variant="secondary" className="!py-1 !px-3 text-xs">Collapse All</Button>
                        <div className="flex items-center gap-1">
                            <Button
                                onClick={handleRepairSectionLabels}
                                variant="secondary"
                                className="!py-1 !px-3 text-xs"
                                disabled={isRepairingLabels || allTopics.length === 0}
                            >
                                {isRepairingLabels ? 'Classifying...' : 'Repair Section Labels'}
                            </Button>
                            <InfoTooltip text="Uses AI to classify topics into Core Section (monetization/service pages) or Author Section (informational/trust pages). Useful for fixing maps generated before section labels were implemented." />
                        </div>
                        {onRepairFoundationPages && (
                            <div className="flex items-center gap-1">
                                <Button
                                    onClick={onRepairFoundationPages}
                                    variant="secondary"
                                    className="!py-1 !px-3 text-xs bg-purple-900/30 border-purple-700 hover:bg-purple-800/40"
                                    disabled={isRepairingFoundation}
                                >
                                    {isRepairingFoundation ? 'Generating...' : 'Foundation Pages'}
                                </Button>
                                <InfoTooltip text="Generate or repair foundation pages (Homepage, About, Contact, Privacy, Terms) for complete website structure." />
                            </div>
                        )}
                        {onOpenNavigation && (
                            <Button
                                onClick={onOpenNavigation}
                                variant="secondary"
                                className="!py-1 !px-3 text-xs bg-teal-900/30 border-teal-700 hover:bg-teal-800/40"
                            >
                                Navigation
                            </Button>
                        )}
                    </div>
                )}
                <div className="flex rounded-lg bg-gray-700 p-1">
                    <Button onClick={() => setViewMode('list')} variant={viewMode === 'list' ? 'primary' : 'secondary'} className="!py-1 !px-3 text-sm">List</Button>
                    <Button onClick={() => setViewMode('graph')} variant={viewMode === 'graph' ? 'primary' : 'secondary'} className="!py-1 !px-3 text-sm">Graph</Button>
                </div>
            </div>
        </div>
        
        {coreTopics.length === 0 && outerTopics.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30 flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Topical Map is Empty</h3>
                <p className="text-gray-400 max-w-md mb-6">This map has no topics yet. You can add topics manually or generate the initial structure using your SEO Pillars.</p>
                {onGenerateInitialMap && (
                     <Button onClick={onGenerateInitialMap} disabled={isLoading.map}>
                        {isLoading.map ? 'Generating...' : '✨ Generate Initial Map Structure'}
                    </Button>
                )}
            </div>
        ) : viewMode === 'list' ? (
             <div className="space-y-6">
                {coreTopics.map(core => {
                    const isCollapsed = collapsedCoreIds.has(core.id);
                    const childTopics = topicsByParent.get(core.id) || [];
                    const spokeCount = childTopics.length;
                    const isMonetization = core.topic_class === 'monetization';
                    const isLowRatio = isMonetization && spokeCount < 7;

                    return (
                        <div key={core.id} className={`rounded-lg border-l-4 ${isMonetization ? 'border-yellow-500 bg-yellow-900/5' : 'border-blue-500 bg-blue-900/5'} p-2`}>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleToggleCollapse(core.id)} className="p-1 text-gray-500 hover:text-white">
                                    <svg className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-[-90deg]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div className="flex-grow relative">
                                    <div className="absolute -top-3 left-2 flex gap-2">
                                        {isMonetization && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 bg-yellow-900/30 px-1.5 rounded border border-yellow-700/50">
                                                Core Section
                                            </span>
                                        )}
                                        {!isMonetization && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-900/30 px-1.5 rounded border border-blue-700/50">
                                                Author Section
                                            </span>
                                        )}
                                        {isLowRatio && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-900/30 px-1.5 rounded border border-red-700/50 flex items-center gap-1">
                                                ⚠️ Low Ratio ({spokeCount}/7)
                                            </span>
                                        )}
                                    </div>
                                    <TopicItem 
                                        topic={core}
                                        hasBrief={!!briefs[core.id]}
                                        onHighlight={() => onSelectTopicForBrief(core)}
                                        onGenerateBrief={() => onSelectTopicForBrief(core)}
                                        onDelete={() => activeMapId && dispatch({ type: 'DELETE_TOPIC', payload: {mapId: activeMapId, topicId: core.id} })}
                                        onUpdateTopic={onUpdateTopic}
                                        isChecked={selectedTopicIds.includes(core.id)}
                                        onToggleSelection={handleToggleSelection}
                                        isHighlighted={highlightedTopicId === core.id}
                                        onDragStart={handleDragStart}
                                        onDropOnTopic={handleDropOnTopic}
                                        onDragEnd={() => setDraggedTopicId(null)}
                                        onExpand={onExpandCoreTopic}
                                        isExpanding={expandingCoreTopicId === core.id}
                                        canExpand={canExpandTopics}
                                        canGenerateBriefs={canGenerateBriefs}
                                        allCoreTopics={coreTopics}
                                        onReparent={handleReparent}
                                    />
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className="pl-4 sm:pl-8 mt-2 space-y-2 border-l-2 border-gray-700 ml-6">
                                {childTopics.map(outer => (
                                    <TopicItem 
                                            key={outer.id}
                                            topic={outer}
                                            hasBrief={!!briefs[outer.id]}
                                            onHighlight={() => onSelectTopicForBrief(outer)}
                                            onGenerateBrief={() => onSelectTopicForBrief(outer)}
                                            onDelete={() => activeMapId && dispatch({ type: 'DELETE_TOPIC', payload: {mapId: activeMapId, topicId: outer.id} })}
                                            onUpdateTopic={onUpdateTopic}
                                            isChecked={selectedTopicIds.includes(outer.id)}
                                            onToggleSelection={handleToggleSelection}
                                            isHighlighted={highlightedTopicId === outer.id}
                                            onDragStart={handleDragStart}
                                            onDropOnTopic={handleDropOnTopic}
                                            onDragEnd={() => setDraggedTopicId(null)}
                                            canExpand={false} // Only core topics can be expanded
                                            canGenerateBriefs={canGenerateBriefs}
                                            allCoreTopics={coreTopics}
                                            onReparent={handleReparent}
                                        />
                                ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        ) : (
            <TopicalMapGraphView 
                coreTopics={coreTopics}
                outerTopics={outerTopics}
                briefs={briefs}
                onSelectTopic={onSelectTopicForBrief}
                onExpandCoreTopic={onExpandCoreTopic}
                onDeleteTopic={(topicId) => activeMapId && dispatch({ type: 'DELETE_TOPIC', payload: {mapId: activeMapId, topicId} })}
                expandingCoreTopicId={expandingCoreTopicId}
                allCoreTopics={coreTopics}
                onReparent={handleReparent}
                canExpandTopics={canExpandTopics}
                onUpdateTopic={onUpdateTopic}
            />
        )}
      <MergeConfirmationModal 
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        suggestion={mergeSuggestion}
        onConfirm={handleExecuteMerge}
        isLoading={!!isLoading.executeMerge}
      />
    </div>
  );
};

export default TopicalMapDisplay;
