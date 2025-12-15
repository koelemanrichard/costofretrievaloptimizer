
// FIX: Implemented the TopicalMapDisplay component to render the topical map UI.
import React, { useState, useMemo, useCallback } from 'react';
import { EnrichedTopic, ContentBrief, MergeSuggestion, FreshnessProfile, ExpansionMode } from '../types';
import TopicItem from './TopicItem';
import { Button } from './ui/Button';
import TopicalMapGraphView from './TopicalMapGraphView';
import { ReportExportButton, ReportModal } from './reports';
import { useTopicalMapReport } from '../hooks/useReportGeneration';
import * as aiService from '../services/aiService';
import { useAppState } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';
import MergeConfirmationModal from './ui/MergeConfirmationModal';
import { InfoTooltip } from './ui/InfoTooltip';
import { BriefHealthStatsBar } from './ui/BriefHealthBadge';
import { calculateBriefHealthStats } from '../utils/briefQualityScore';

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
  const { activeMapId, businessInfo, isLoading, briefGenerationStatus } = state;

  // Parse the generating topic title from status string like 'Generating 1/5: "Topic Title"'
  const generatingTopicTitle = useMemo(() => {
    if (!briefGenerationStatus) return null;
    const match = briefGenerationStatus.match(/"([^"]+)"$/);
    return match ? match[1] : null;
  }, [briefGenerationStatus]);

  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [collapsedCoreIds, setCollapsedCoreIds] = useState<Set<string>>(new Set());
  const [isRepairingLabels, setIsRepairingLabels] = useState(false);
  const [repairingTopicId, setRepairingTopicId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'updated_desc' | 'updated_asc'>('created_desc');

  // Report generation hook
  const allTopicsForReport = useMemo(() => [...coreTopics, ...outerTopics], [coreTopics, outerTopics]);
  const currentMap = state.topicalMaps.find(m => m.id === activeMapId);
  const reportHook = useTopicalMapReport(currentMap || undefined, allTopicsForReport);

  // Sorting function for topics
  const sortTopics = useCallback((topics: EnrichedTopic[]) => {
    return [...topics].sort((a, b) => {
      switch (sortOption) {
        case 'created_desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'created_asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'updated_desc':
          return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
        case 'updated_asc':
          return new Date(a.updated_at || a.created_at || 0).getTime() - new Date(b.updated_at || b.created_at || 0).getTime();
        default:
          return 0;
      }
    });
  }, [sortOption]);

  // Sorted core topics
  const sortedCoreTopics = useMemo(() => sortTopics(coreTopics), [coreTopics, sortTopics]);

  const topicsByParent = useMemo(() => {
    const map = new Map<string, EnrichedTopic[]>();
    outerTopics.forEach(topic => {
      const parentId = topic.parent_topic_id || 'uncategorized';
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(topic);
    });
    // Sort outer topics within each parent group
    map.forEach((topics, key) => {
      map.set(key, sortTopics(topics));
    });
    return map;
  }, [outerTopics, sortTopics]);

  const allTopics = useMemo(() => [...coreTopics, ...outerTopics], [coreTopics, outerTopics]);

  // Calculate brief health statistics
  const briefHealthStats = useMemo(() => {
    const topicIds = allTopics.map(t => t.id);
    return calculateBriefHealthStats(briefs, topicIds);
  }, [allTopics, briefs]);

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

  // Delete topic from database and local state
  const handleDeleteTopic = useCallback(async (topicId: string) => {
    if (!activeMapId) return;

    if (!window.confirm("Are you sure you want to delete this topic? This action cannot be undone.")) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: { key: 'deleteTopic', value: true } });
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // First delete any content briefs associated with this topic
      await supabase.from('content_briefs').delete().eq('topic_id', topicId);

      // Then delete the topic itself
      const { error } = await supabase.from('topics').delete().eq('id', topicId);
      if (error) throw error;

      // Update local state
      dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId } });
      dispatch({ type: 'SET_NOTIFICATION', payload: "Topic deleted successfully." });
    } catch (e) {
      console.error('Delete topic error:', e);
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to delete topic." });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteTopic', value: false } });
    }
  }, [activeMapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

  // Repair missing brief fields for a specific topic
  const handleRepairBriefMissing = useCallback(async (topicId: string, missingFields: string[]) => {
    if (!activeMapId) return;
    const activeMap = state.topicalMaps.find(m => m.id === activeMapId);
    if (!activeMap?.pillars) {
      dispatch({ type: 'SET_ERROR', payload: 'SEO Pillars must be defined to repair briefs.' });
      return;
    }

    const topic = allTopics.find(t => t.id === topicId);
    const brief = briefs[topicId];
    if (!topic || !brief) {
      dispatch({ type: 'SET_ERROR', payload: 'Topic or brief not found.' });
      return;
    }

    setRepairingTopicId(topicId);
    try {
      // Dynamic import to avoid circular dependencies
      const { repairBriefMissingFields } = await import('../services/ai/briefRepair');

      const repairedFields = await repairBriefMissingFields(
        brief,
        missingFields,
        topic,
        activeMap.pillars,
        businessInfo,
        allTopics,
        dispatch
      );

      if (repairedFields) {
        // Build update payload for Supabase (snake_case)
        // Note: targetKeyword and searchIntent exist in TypeScript interface but NOT in database schema
        const dbUpdates: Record<string, any> = {};
        if (repairedFields.metaDescription !== undefined) dbUpdates.meta_description = repairedFields.metaDescription;
        if (repairedFields.structured_outline !== undefined) dbUpdates.structured_outline = repairedFields.structured_outline;
        if (repairedFields.serpAnalysis !== undefined) dbUpdates.serp_analysis = repairedFields.serpAnalysis;
        if (repairedFields.contextualBridge !== undefined) dbUpdates.contextual_bridge = repairedFields.contextualBridge;
        if (repairedFields.visuals !== undefined) dbUpdates.visuals = repairedFields.visuals;

        // Persist to Supabase
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const { error: dbError } = await supabase
          .from('content_briefs')
          .update(dbUpdates)
          .eq('id', brief.id);

        if (dbError) {
          console.error('[TopicalMapDisplay] Failed to persist repaired brief:', dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }

        // Update local state
        dispatch({
          type: 'UPDATE_BRIEF',
          payload: {
            mapId: activeMapId,
            topicId,
            updates: repairedFields
          }
        });
        dispatch({ type: 'SET_NOTIFICATION', payload: `Repaired ${missingFields.length} missing field(s) for "${topic.title}".` });
      } else {
        dispatch({ type: 'SET_NOTIFICATION', payload: 'No fields needed repair.' });
      }
    } catch (error) {
      console.error('[TopicalMapDisplay] Brief repair error:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to repair brief.' });
    } finally {
      setRepairingTopicId(null);
    }
  }, [activeMapId, state.topicalMaps, allTopics, briefs, businessInfo, dispatch]);

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
                        {/* Sorting dropdown */}
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                            className="bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="created_desc">Newest first</option>
                            <option value="created_asc">Oldest first</option>
                            <option value="title_asc">Title A-Z</option>
                            <option value="title_desc">Title Z-A</option>
                            <option value="updated_desc">Recently updated</option>
                            <option value="updated_asc">Least recently updated</option>
                        </select>
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
                        {reportHook.canGenerate && (
                            <ReportExportButton
                                reportType="topical-map"
                                onClick={reportHook.open}
                                variant="primary"
                                size="sm"
                                label="Generate Report"
                            />
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
             <div className="space-y-4">
                {/* Brief Health Stats Bar */}
                {briefHealthStats.total > 0 && (
                    <div className="px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                        <BriefHealthStatsBar
                            complete={briefHealthStats.complete}
                            partial={briefHealthStats.partial}
                            empty={briefHealthStats.empty}
                            withoutBriefs={briefHealthStats.withoutBriefs}
                        />
                    </div>
                )}
                <div className="space-y-6">
                {sortedCoreTopics.map(core => {
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
                                        brief={briefs[core.id]}
                                        onHighlight={() => setHighlightedTopicId(core.id)}
                                        onGenerateBrief={() => onSelectTopicForBrief(core)}
                                        onDelete={() => handleDeleteTopic(core.id)}
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
                                        isGeneratingBrief={generatingTopicTitle === core.title}
                                        onRepairMissing={(missingFields) => handleRepairBriefMissing(core.id, missingFields)}
                                        isRepairingBrief={repairingTopicId === core.id}
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
                                            brief={briefs[outer.id]}
                                            onHighlight={() => setHighlightedTopicId(outer.id)}
                                            onGenerateBrief={() => onSelectTopicForBrief(outer)}
                                            onDelete={() => handleDeleteTopic(outer.id)}
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
                                            isGeneratingBrief={generatingTopicTitle === outer.title}
                                            onRepairMissing={(missingFields) => handleRepairBriefMissing(outer.id, missingFields)}
                                            isRepairingBrief={repairingTopicId === outer.id}
                                        />
                                ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            </div>
        ) : (
            <TopicalMapGraphView 
                coreTopics={coreTopics}
                outerTopics={outerTopics}
                briefs={briefs}
                onSelectTopic={onSelectTopicForBrief}
                onExpandCoreTopic={onExpandCoreTopic}
                onDeleteTopic={(topicId) => handleDeleteTopic(topicId)}
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

      {/* Report Modal */}
      {reportHook.data && (
        <ReportModal
          isOpen={reportHook.isOpen}
          onClose={reportHook.close}
          reportType="topical-map"
          data={reportHook.data}
          projectName={currentMap?.name || businessInfo?.projectName}
        />
      )}
    </div>
  );
};

export default TopicalMapDisplay;
