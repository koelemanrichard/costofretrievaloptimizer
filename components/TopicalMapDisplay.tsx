
// FIX: Implemented the TopicalMapDisplay component to render the topical map UI.
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { EnrichedTopic, ContentBrief, MergeSuggestion, FreshnessProfile, ExpansionMode } from '../types';
import TopicItem from './TopicItem';
import { TopicTableView } from './TopicTableView';
import { Button } from './ui/Button';
import TopicalMapGraphView from './TopicalMapGraphView';
import { ReportModal } from './reports';
import { useTopicalMapReport } from '../hooks/useReportGeneration';
import * as aiService from '../services/aiService';
import { useAppState } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import { verifiedDelete, verifiedBulkDelete } from '../services/verifiedDatabaseService';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';
import MergeConfirmationModal from './ui/MergeConfirmationModal';
import { BriefHealthStatsBar } from './ui/BriefHealthBadge';
import { calculateBriefHealthStats } from '../utils/briefQualityScore';
import MapUsageReport from './admin/MapUsageReport';
import { useTopicPublications } from '../hooks/useTopicPublications';
import { MapSizeWarning } from './ui/MapSizeWarning';
import { TopicToolbar } from './TopicToolbar';
import { TopicBulkActionBar } from './TopicBulkActionBar';
import { useTopicSearch } from '../hooks/useTopicSearch';
import type { ExpandedTemplateResult } from '../types';

interface TopicalMapDisplayProps {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  childTopics?: EnrichedTopic[]; // Level 3: children of outer topics
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
  childTopics = [],
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
  const { activeMapId, businessInfo, isLoading, briefGenerationStatus, user } = state;

  // Supabase client for publication status
  const supabase = useMemo(() => {
    if (!businessInfo.supabaseUrl || !businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  // Get all topic IDs for publication status lookup
  const allTopicIds = useMemo(() => {
    return [...coreTopics, ...outerTopics, ...childTopics].map(t => t.id);
  }, [coreTopics, outerTopics, childTopics]);

  // Fetch publication status for all topics
  const { publications: topicPublications } = useTopicPublications(
    supabase,
    user?.id || null,
    allTopicIds
  );

  // Helper to get publication info for a topic
  const getPublicationInfo = useCallback((topicId: string) => {
    const pubInfo = topicPublications.get(topicId);
    if (!pubInfo) return { publicationStatus: null, wpPostUrl: null };
    return {
      publicationStatus: pubInfo.publication.status,
      wpPostUrl: pubInfo.publication.wp_post_url || null
    };
  }, [topicPublications]);

  // Parse the generating topic title from status string like 'Generating 1/5: "Topic Title"'
  const generatingTopicTitle = useMemo(() => {
    if (!briefGenerationStatus) return null;
    const match = briefGenerationStatus.match(/"([^"]+)"$/);
    return match ? match[1] : null;
  }, [briefGenerationStatus]);

  const [viewMode, setViewMode] = useState<'list' | 'table' | 'graph'>(() => {
    // Default to table view for maps with 30+ topics
    const totalTopics = coreTopics.length + outerTopics.length + childTopics.length;
    if (totalTopics >= 30) return 'table';
    // Try to load from localStorage
    const saved = localStorage.getItem('topicViewMode');
    if (saved === 'list' || saved === 'table' || saved === 'graph') return saved;
    return 'list';
  });
  const [hierarchyMode, setHierarchyMode] = useState<'seo' | 'business'>('seo');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [openDetailPanelTopicId, setOpenDetailPanelTopicId] = useState<string | null>(null);
  const [collapsedCoreIds, setCollapsedCoreIds] = useState<Set<string>>(new Set());
  const [isRepairingLabels, setIsRepairingLabels] = useState(false);
  const [repairingTopicId, setRepairingTopicId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'updated_desc' | 'updated_asc'>('created_desc');
  const [showUsageReport, setShowUsageReport] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState<'all' | 'needs-brief' | 'needs-draft' | 'needs-audit' | 'published'>('all');
  const [listViewLimit, setListViewLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');

  const allTopics = useMemo(() => [...coreTopics, ...outerTopics, ...childTopics], [coreTopics, outerTopics, childTopics]);

  // Pipeline-filtered topic IDs (used to hide non-matching topics)
  const pipelineFilteredIds = useMemo(() => {
    if (pipelineFilter === 'all') return null; // null = show all
    const ids = new Set<string>();
    for (const t of [...coreTopics, ...outerTopics, ...childTopics]) {
      const brief = briefs[t.id];
      let matches = false;
      switch (pipelineFilter) {
        case 'needs-brief': matches = !brief; break;
        case 'needs-draft': matches = !!brief && !(brief.articleDraft && brief.articleDraft.length > 100); break;
        case 'needs-audit': matches = !!brief && !!(brief.articleDraft && brief.articleDraft.length > 100) && !brief.contentAudit?.algorithmicResults; break;
        case 'published': matches = false; break; // TODO: wire up
      }
      if (matches) ids.add(t.id);
      // Also show parent core topics when their children match
      if (matches && t.parent_topic_id) ids.add(t.parent_topic_id);
    }
    return ids;
  }, [pipelineFilter, coreTopics, outerTopics, childTopics, briefs]);
  // Search-filtered topic IDs
  const searchFilteredIds = useTopicSearch(allTopics, briefs, searchQuery);

  // Combined filter: intersection when both search + pipeline active
  const combinedFilteredIds = useMemo(() => {
    if (!pipelineFilteredIds && !searchFilteredIds) return null;
    if (!pipelineFilteredIds) return searchFilteredIds;
    if (!searchFilteredIds) return pipelineFilteredIds;
    const combined = new Set<string>();
    for (const id of pipelineFilteredIds) {
      if (searchFilteredIds.has(id)) combined.add(id);
    }
    return combined;
  }, [pipelineFilteredIds, searchFilteredIds]);

  // Template panel moved to AddTopicModal - no longer needed here
  // const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  // const [showLocationManager, setShowLocationManager] = useState(false);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('topicViewMode', viewMode);
  }, [viewMode]);

  // Track which topics are expanding or generating briefs (for table view)
  const expandingTopicIds = useMemo(() => {
    const ids = new Set<string>();
    if (expandingCoreTopicId) ids.add(expandingCoreTopicId);
    return ids;
  }, [expandingCoreTopicId]);

  const generatingBriefTopicIds = useMemo(() => {
    const ids = new Set<string>();
    if (generatingTopicTitle) {
      const topic = [...coreTopics, ...outerTopics, ...childTopics].find(t => t.title === generatingTopicTitle);
      if (topic) ids.add(topic.id);
    }
    return ids;
  }, [generatingTopicTitle, coreTopics, outerTopics, childTopics]);

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

  // Sorted core topics (filtered by pipeline filter when active)
  const sortedCoreTopics = useMemo(() => {
    const sorted = sortTopics(coreTopics);
    if (!combinedFilteredIds) return sorted;
    return sorted.filter(t => combinedFilteredIds.has(t.id));
  }, [coreTopics, sortTopics, combinedFilteredIds]);

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

  // Sorted outer topics (flat list for table view, filtered by pipeline)
  const sortedOuterTopics = useMemo(() => {
    const sorted = sortTopics(outerTopics);
    if (!combinedFilteredIds) return sorted;
    return sorted.filter(t => combinedFilteredIds.has(t.id));
  }, [outerTopics, sortTopics, combinedFilteredIds]);

  // Convert briefs object to Map (for table view)
  const briefsMap = useMemo(() => {
    const map = new Map<string, ContentBrief>();
    Object.entries(briefs).forEach(([id, brief]) => {
      if (brief) map.set(id, brief);
    });
    return map;
  }, [briefs]);

  // Convert selectedTopicIds array to Set (for table view)
  const selectedTopicIdsSet = useMemo(() => new Set(selectedTopicIds), [selectedTopicIds]);

  // Group child topics by their outer topic parent (Level 3)
  const childTopicsByParent = useMemo(() => {
    const map = new Map<string, EnrichedTopic[]>();
    childTopics.forEach(topic => {
      const parentId = topic.parent_topic_id || 'uncategorized';
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(topic);
    });
    // Sort child topics within each parent group
    map.forEach((topics, key) => {
      map.set(key, sortTopics(topics));
    });
    return map;
  }, [childTopics, sortTopics]);

  // Get uncategorized outer topics (no parent or parent is not a core topic)
  const uncategorizedOuterTopics = useMemo(() => {
    const coreTopicIds = new Set(coreTopics.map(t => t.id));
    return outerTopics.filter(topic =>
      !topic.parent_topic_id || !coreTopicIds.has(topic.parent_topic_id)
    );
  }, [outerTopics, coreTopics]);

  // Get uncategorized child topics (no parent or parent is not an outer topic)
  const uncategorizedChildTopics = useMemo(() => {
    const outerTopicIds = new Set(outerTopics.map(t => t.id));
    return childTopics.filter(topic =>
      !topic.parent_topic_id || !outerTopicIds.has(topic.parent_topic_id)
    );
  }, [childTopics, outerTopics]);

  // Pipeline filter counts
  const pipelineFilterCounts = useMemo(() => {
    let needsBrief = 0, needsDraft = 0, needsAudit = 0, published = 0;
    for (const t of allTopics) {
      const brief = briefs[t.id];
      if (!brief) { needsBrief++; continue; }
      const hasDraft = !!(brief.articleDraft && brief.articleDraft.length > 100);
      if (!hasDraft) { needsDraft++; continue; }
      const hasAudit = !!(brief.contentAudit?.algorithmicResults);
      if (!hasAudit) { needsAudit++; continue; }
    }
    return {
      all: allTopics.length,
      'needs-brief': needsBrief,
      'needs-draft': needsDraft,
      'needs-audit': needsAudit,
      published,
    };
  }, [allTopics, briefs]);

  // Filter function for pipeline filter
  const matchesPipelineFilter = useCallback((topicId: string) => {
    if (pipelineFilter === 'all') return true;
    const brief = briefs[topicId];
    switch (pipelineFilter) {
      case 'needs-brief': return !brief;
      case 'needs-draft': return !!brief && !(brief.articleDraft && brief.articleDraft.length > 100);
      case 'needs-audit': return !!brief && !!(brief.articleDraft && brief.articleDraft.length > 100) && !brief.contentAudit?.algorithmicResults;
      case 'published': return false; // TODO: wire up publication status
      default: return true;
    }
  }, [pipelineFilter, briefs]);

  // Business View: Group topics by display_parent_id (visual hierarchy)
  const topicsByDisplayParent = useMemo(() => {
    const map = new Map<string, EnrichedTopic[]>();
    // All topics can have a display_parent, regardless of their SEO type
    allTopics.forEach(topic => {
      const displayParentId = topic.display_parent_id || 'no-visual-parent';
      if (!map.has(displayParentId)) {
        map.set(displayParentId, []);
      }
      map.get(displayParentId)!.push(topic);
    });
    // Sort within each group
    map.forEach((topics, key) => {
      map.set(key, sortTopics(topics));
    });
    return map;
  }, [allTopics, sortTopics]);

  // Get topics without display_parent (root level in business view)
  const rootBusinessTopics = useMemo(() => {
    // Topics that either have no display_parent OR are themselves display parents
    const topicsWithDisplayChildren = new Set<string>();
    allTopics.forEach(t => {
      if (t.display_parent_id) {
        topicsWithDisplayChildren.add(t.display_parent_id);
      }
    });
    // Root topics are those without a display_parent OR that have children
    return sortTopics(allTopics.filter(t =>
      !t.display_parent_id || topicsWithDisplayChildren.has(t.id)
    ).filter(t => !t.display_parent_id));
  }, [allTopics, sortTopics]);

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
      const briefsResult = await verifiedBulkDelete(
        supabase,
        { table: 'content_briefs', operationDescription: `delete briefs for topic ${topicId}` },
        { column: 'topic_id', operator: 'eq', value: topicId }
      );
      if (!briefsResult.success && briefsResult.error && !briefsResult.error.includes('0 records')) {
        console.warn(`[DeleteTopic] Content briefs deletion issue:`, briefsResult.error);
      }

      // Then delete the topic itself with verification
      const result = await verifiedDelete(
        supabase,
        { table: 'topics', operationDescription: `delete topic ${topicId}` },
        { column: 'id', value: topicId }
      );

      if (!result.success) {
        throw new Error(result.error || 'Topic deletion verification failed');
      }

      // Update local state
      dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId } });
      dispatch({ type: 'SET_NOTIFICATION', payload: "✓ Topic deleted successfully (verified)." });
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

  // Template generation moved to ProjectDashboard - no longer needed here
  // const handleTemplateGeneratedTopics = useCallback(async ...

  const handleToggleSelection = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };
  
  const handleFindMergeOpportunities = async () => {
    if (selectedTopicIds.length < 2 || !activeMapId) return;
    const activeMap = state.topicalMaps.find(m => m.id === activeMapId);
    if (!activeMap || !businessInfo) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'merge', value: true } });
    try {
        const selected = allTopics.filter(t => selectedTopicIds.includes(t.id));
        // Use global businessInfo which has correct AI settings from user_settings
        const suggestion = await aiService.findMergeOpportunitiesForSelection(businessInfo, selected, dispatch);
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

    // Find the topic being moved (can be outer or child)
    const outerTopic = outerTopics.find(t => t.id === topicId);
    const childTopic = childTopics.find(t => t.id === topicId);
    const topic = outerTopic || childTopic;

    if (!topic) return;

    // Determine valid parent based on topic type
    if (topic.type === 'outer') {
      // Outer topics can only be parented to core topics
      const newParent = coreTopics.find(t => t.id === newParentId);
      if (!newParent) return;
      const newSlug = `${newParent.slug}/${slugify(topic.title)}`;
      onUpdateTopic(topicId, { parent_topic_id: newParentId, slug: newSlug });
    } else if (topic.type === 'child') {
      // Child topics can only be parented to outer topics
      const newParent = outerTopics.find(t => t.id === newParentId);
      if (!newParent) return;
      const newSlug = `${newParent.slug}/${slugify(topic.title)}`;
      onUpdateTopic(topicId, { parent_topic_id: newParentId, slug: newSlug });
    }
  }, [activeMapId, coreTopics, outerTopics, childTopics, onUpdateTopic]);
  
  const handleDragStart = (e: React.DragEvent, topicId: string) => {
    const topic = allTopics.find(t => t.id === topicId);
    // Allow dragging outer and child topics (not core topics)
    if(topic && (topic.type === 'outer' || topic.type === 'child')) {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedTopicId(topicId);
    } else {
        e.preventDefault();
    }
  };

  const handleDropOnTopic = (e: React.DragEvent, targetTopicId: string) => {
    e.preventDefault();
    if (!draggedTopicId) return;

    const draggedTopic = allTopics.find(t => t.id === draggedTopicId);
    if (!draggedTopic || draggedTopicId === targetTopicId) {
        setDraggedTopicId(null);
        return;
    }

    // Determine valid drop targets based on dragged topic type
    if (draggedTopic.type === 'outer') {
        // Outer topics can only be dropped on core topics
        const targetTopic = coreTopics.find(t => t.id === targetTopicId);
        if (targetTopic) {
            handleReparent(draggedTopicId, targetTopicId);
        }
    } else if (draggedTopic.type === 'child') {
        // Child topics can only be dropped on outer topics
        const targetTopic = outerTopics.find(t => t.id === targetTopicId);
        if (targetTopic) {
            handleReparent(draggedTopicId, targetTopicId);
        }
    }
    setDraggedTopicId(null);
  };

  // Core delete logic (without per-topic confirm) for bulk operations
  const handleDeleteTopicCore = useCallback(async (topicId: string) => {
    if (!activeMapId) return;
    const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

    // Delete content briefs
    const briefsResult = await verifiedBulkDelete(
      supabase,
      { table: 'content_briefs', operationDescription: `delete briefs for topic ${topicId}` },
      { column: 'topic_id', operator: 'eq', value: topicId }
    );
    if (!briefsResult.success && briefsResult.error && !briefsResult.error.includes('0 records')) {
      console.warn(`[BulkDelete] Content briefs deletion issue:`, briefsResult.error);
    }

    // Delete the topic
    const result = await verifiedDelete(
      supabase,
      { table: 'topics', operationDescription: `delete topic ${topicId}` },
      { column: 'id', value: topicId }
    );
    if (!result.success) {
      throw new Error(result.error || 'Topic deletion verification failed');
    }

    dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId } });
  }, [activeMapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

  // Bulk delete with single confirmation
  const handleBulkDeleteTopics = useCallback(async () => {
    if (selectedTopicIds.length === 0 || !activeMapId) return;
    if (!window.confirm(`Delete ${selectedTopicIds.length} selected topic(s)? This action cannot be undone.`)) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'deleteTopic', value: true } });
    try {
      for (const topicId of selectedTopicIds) {
        await handleDeleteTopicCore(topicId);
      }
      dispatch({ type: 'SET_NOTIFICATION', payload: `Deleted ${selectedTopicIds.length} topic(s).` });
      setSelectedTopicIds([]);
    } catch (e) {
      console.error('Bulk delete error:', e);
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete topics.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteTopic', value: false } });
    }
  }, [selectedTopicIds, activeMapId, handleDeleteTopicCore, dispatch]);

  // Bulk promote: outer -> core
  const handleBulkPromote = useCallback(() => {
    const outerSelected = allTopics.filter(t => selectedTopicIds.includes(t.id) && t.type === 'outer');
    if (outerSelected.length === 0) return;
    if (!window.confirm(`Promote ${outerSelected.length} topic(s) to Core?`)) return;

    for (const topic of outerSelected) {
      onUpdateTopic(topic.id, { type: 'core', parent_topic_id: null });
    }
    dispatch({ type: 'SET_NOTIFICATION', payload: `Promoted ${outerSelected.length} topic(s) to Core.` });
  }, [selectedTopicIds, allTopics, onUpdateTopic, dispatch]);

  // Bulk demote: core -> outer under a chosen parent
  const handleBulkDemote = useCallback((parentCoreId: string) => {
    const coreSelected = allTopics.filter(t => selectedTopicIds.includes(t.id) && t.type === 'core');
    if (coreSelected.length === 0) return;

    // Safety: at least 1 core must remain
    const remainingCoreCount = coreTopics.filter(t => !selectedTopicIds.includes(t.id)).length;
    if (remainingCoreCount < 1) {
      dispatch({ type: 'SET_ERROR', payload: 'Cannot demote all core topics. At least 1 must remain.' });
      return;
    }

    const parentCore = coreTopics.find(t => t.id === parentCoreId);
    if (!parentCore) return;

    if (!window.confirm(`Demote ${coreSelected.length} topic(s) to Outer under "${parentCore.title}"?`)) return;

    for (const topic of coreSelected) {
      const newSlug = `${parentCore.slug}/${slugify(topic.title)}`;
      onUpdateTopic(topic.id, { type: 'outer', parent_topic_id: parentCoreId, slug: newSlug });
    }
    dispatch({ type: 'SET_NOTIFICATION', payload: `Demoted ${coreSelected.length} topic(s) to Outer.` });
  }, [selectedTopicIds, allTopics, coreTopics, onUpdateTopic, dispatch]);

  // Bulk generate briefs for selected topics without briefs
  const handleBulkGenerateBriefs = useCallback(() => {
    const topicsNeedingBriefs = allTopics.filter(t => selectedTopicIds.includes(t.id) && !briefs[t.id]);
    for (const topic of topicsNeedingBriefs) {
      onSelectTopicForBrief(topic);
    }
  }, [selectedTopicIds, allTopics, briefs, onSelectTopicForBrief]);

  // Search result count for the toolbar
  const searchResultCount = searchFilteredIds ? searchFilteredIds.size : null;

  return (
    <div className="space-y-6">
        <TopicToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResultCount={searchResultCount}
            totalTopicCount={allTopics.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hierarchyMode={hierarchyMode}
            onHierarchyModeChange={setHierarchyMode}
            sortOption={sortOption}
            onSortChange={(opt) => setSortOption(opt as typeof sortOption)}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            pipelineFilter={pipelineFilter}
            onPipelineFilterChange={(f) => setPipelineFilter(f as typeof pipelineFilter)}
            pipelineFilterCounts={pipelineFilterCounts}
            onRepairSectionLabels={handleRepairSectionLabels}
            isRepairingLabels={isRepairingLabels}
            onRepairFoundationPages={onRepairFoundationPages}
            isRepairingFoundation={isRepairingFoundation}
            onOpenNavigation={onOpenNavigation}
            onGenerateReport={reportHook.canGenerate ? reportHook.open : undefined}
            onShowUsageReport={activeMapId ? () => setShowUsageReport(true) : undefined}
            hasTopics={allTopics.length > 0}
        />

        {activeMapId && <MapSizeWarning topicCount={allTopics.length} mapId={activeMapId} />}

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

                {/* Query Template Panel moved to AddTopicModal */}

                {/* Business View - Visual hierarchy by display_parent_id */}
                {hierarchyMode === 'business' ? (
                    <div className="space-y-6">
                        <div className="px-3 py-2 bg-purple-900/20 rounded-lg border border-purple-700/50">
                            <p className="text-xs text-purple-300">
                                <strong>Business View:</strong> Topics are grouped by their visual display parent for business presentations.
                                This grouping does NOT affect SEO behavior - use SEO View to see the actual behavioral hierarchy.
                            </p>
                        </div>

                        {/* Render root-level topics (no display_parent) */}
                        {rootBusinessTopics.map(topic => {
                            const displayChildren = topicsByDisplayParent.get(topic.id) || [];
                            const hasDisplayChildren = displayChildren.length > 0;
                            const isCollapsed = collapsedCoreIds.has(topic.id);

                            return (
                                <div key={topic.id} className="rounded-lg border-l-4 border-purple-500 bg-purple-900/10 p-2">
                                    <div className="flex items-center gap-2">
                                        {hasDisplayChildren && (
                                            <button onClick={() => handleToggleCollapse(topic.id)} className="p-1 text-gray-500 hover:text-white" aria-label={isCollapsed ? 'Expand section' : 'Collapse section'} aria-expanded={!isCollapsed}>
                                                <svg className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-[-90deg]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        )}
                                        {!hasDisplayChildren && <div className="w-7" />}
                                        <div className="flex-grow relative">
                                            <div className="absolute -top-3 left-2 flex gap-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 rounded border ${
                                                    topic.type === 'core'
                                                        ? 'text-green-400 bg-green-900/30 border-green-700/50'
                                                        : topic.type === 'child'
                                                        ? 'text-orange-400 bg-orange-900/30 border-orange-700/50'
                                                        : 'text-purple-400 bg-purple-900/30 border-purple-700/50'
                                                }`}>
                                                    {topic.type.toUpperCase()}
                                                </span>
                                                {hasDisplayChildren && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-900/30 px-1.5 rounded border border-purple-700/50">
                                                        {displayChildren.length} Visual Children
                                                    </span>
                                                )}
                                            </div>
                                            <TopicItem
                                                topic={topic}
                                                hasBrief={!!briefs[topic.id]}
                                                brief={briefs[topic.id]}
                                                onHighlight={() => setHighlightedTopicId(topic.id)}
                                                onGenerateBrief={() => onSelectTopicForBrief(topic)}
                                                onDelete={() => handleDeleteTopic(topic.id)}
                                                onUpdateTopic={onUpdateTopic}
                                                isChecked={selectedTopicIds.includes(topic.id)}
                                                onToggleSelection={handleToggleSelection}
                                                isHighlighted={highlightedTopicId === topic.id}
                                                onDragStart={handleDragStart}
                                                onDropOnTopic={handleDropOnTopic}
                                                onDragEnd={() => setDraggedTopicId(null)}
                                                onExpand={topic.type === 'core' ? onExpandCoreTopic : undefined}
                                                isExpanding={expandingCoreTopicId === topic.id}
                                                canExpand={topic.type === 'core' && canExpandTopics}
                                                canGenerateBriefs={canGenerateBriefs}
                                                allCoreTopics={coreTopics}
                                                allOuterTopics={outerTopics}
                                                allTopics={allTopics}
                                                onReparent={handleReparent}
                                                isGeneratingBrief={generatingTopicTitle === topic.title}
                                                onRepairMissing={(missingFields) => handleRepairBriefMissing(topic.id, missingFields)}
                                                isRepairingBrief={repairingTopicId === topic.id}
                                                isDetailPanelOpen={openDetailPanelTopicId === topic.id}
                                                onOpenDetailPanel={setOpenDetailPanelTopicId}
                                                businessInfo={businessInfo}
                                                publicationStatus={getPublicationInfo(topic.id).publicationStatus}
                                                wpPostUrl={getPublicationInfo(topic.id).wpPostUrl}
                                            />
                                        </div>
                                    </div>
                                    {!isCollapsed && hasDisplayChildren && (
                                        <div className="pl-4 sm:pl-8 mt-2 space-y-2 border-l-2 border-purple-700/50 ml-6">
                                            {displayChildren.map(child => (
                                                <div key={child.id} className="relative">
                                                    <div className="absolute -top-1 left-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 rounded border ${
                                                            child.type === 'core'
                                                                ? 'text-green-400 bg-green-900/30 border-green-700/50'
                                                                : child.type === 'child'
                                                                ? 'text-orange-400 bg-orange-900/30 border-orange-700/50'
                                                                : 'text-purple-400 bg-purple-900/30 border-purple-700/50'
                                                        }`}>
                                                            {child.type.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <TopicItem
                                                        topic={child}
                                                        hasBrief={!!briefs[child.id]}
                                                        brief={briefs[child.id]}
                                                        onHighlight={() => setHighlightedTopicId(child.id)}
                                                        onGenerateBrief={() => onSelectTopicForBrief(child)}
                                                        onDelete={() => handleDeleteTopic(child.id)}
                                                        onUpdateTopic={onUpdateTopic}
                                                        isChecked={selectedTopicIds.includes(child.id)}
                                                        onToggleSelection={handleToggleSelection}
                                                        isHighlighted={highlightedTopicId === child.id}
                                                        onDragStart={handleDragStart}
                                                        onDropOnTopic={handleDropOnTopic}
                                                        onDragEnd={() => setDraggedTopicId(null)}
                                                        onExpand={child.type === 'core' ? onExpandCoreTopic : undefined}
                                                        isExpanding={expandingCoreTopicId === child.id}
                                                        canExpand={child.type === 'core' && canExpandTopics}
                                                        canGenerateBriefs={canGenerateBriefs}
                                                        allCoreTopics={coreTopics}
                                                        allOuterTopics={outerTopics}
                                                        allTopics={allTopics}
                                                        onReparent={handleReparent}
                                                        isGeneratingBrief={generatingTopicTitle === child.title}
                                                        onRepairMissing={(missingFields) => handleRepairBriefMissing(child.id, missingFields)}
                                                        isRepairingBrief={repairingTopicId === child.id}
                                                        isDetailPanelOpen={openDetailPanelTopicId === child.id}
                                                        onOpenDetailPanel={setOpenDetailPanelTopicId}
                                                        publicationStatus={getPublicationInfo(child.id).publicationStatus}
                                                        wpPostUrl={getPublicationInfo(child.id).wpPostUrl}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Topics with display_parent but parent doesn't exist */}
                        {(() => {
                            const orphanedDisplayTopics = allTopics.filter(t =>
                                t.display_parent_id && !allTopics.some(p => p.id === t.display_parent_id)
                            );
                            if (orphanedDisplayTopics.length === 0) return null;
                            return (
                                <div className="mt-6 pt-4 border-t-2 border-dashed border-orange-600/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-orange-500">⚠️</span>
                                        <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">
                                            Orphaned Visual Topics ({orphanedDisplayTopics.length})
                                        </h3>
                                        <span className="text-xs text-gray-500">— Visual parent no longer exists</span>
                                    </div>
                                    <div className="space-y-2 pl-4 border-l-2 border-orange-600/30">
                                        {orphanedDisplayTopics.map(topic => (
                                            <TopicItem
                                                key={topic.id}
                                                topic={topic}
                                                hasBrief={!!briefs[topic.id]}
                                                brief={briefs[topic.id]}
                                                onHighlight={() => setHighlightedTopicId(topic.id)}
                                                onGenerateBrief={() => onSelectTopicForBrief(topic)}
                                                onDelete={() => handleDeleteTopic(topic.id)}
                                                onUpdateTopic={onUpdateTopic}
                                                isChecked={selectedTopicIds.includes(topic.id)}
                                                onToggleSelection={handleToggleSelection}
                                                isHighlighted={highlightedTopicId === topic.id}
                                                onDragStart={handleDragStart}
                                                onDropOnTopic={handleDropOnTopic}
                                                onDragEnd={() => setDraggedTopicId(null)}
                                                canExpand={topic.type === 'core' && canExpandTopics}
                                                canGenerateBriefs={canGenerateBriefs}
                                                allCoreTopics={coreTopics}
                                                allOuterTopics={outerTopics}
                                                allTopics={allTopics}
                                                onReparent={handleReparent}
                                                isGeneratingBrief={generatingTopicTitle === topic.title}
                                                onRepairMissing={(missingFields) => handleRepairBriefMissing(topic.id, missingFields)}
                                                isRepairingBrief={repairingTopicId === topic.id}
                                                isDetailPanelOpen={openDetailPanelTopicId === topic.id}
                                                onOpenDetailPanel={setOpenDetailPanelTopicId}
                                                businessInfo={businessInfo}
                                                publicationStatus={getPublicationInfo(topic.id).publicationStatus}
                                                wpPostUrl={getPublicationInfo(topic.id).wpPostUrl}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                /* SEO View - Behavioral hierarchy by parent_topic_id (default) */
                <div className="space-y-6">
                {allTopics.length > 100 && viewMode === 'list' && (
                    <div className="px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                            Showing {Math.min(listViewLimit, allTopics.length)} of {allTopics.length} topics. Switch to <button onClick={() => setViewMode('table')} className="text-blue-400 underline">Table view</button> for best performance with large maps.
                        </span>
                    </div>
                )}
                {sortedCoreTopics.slice(0, listViewLimit).map(core => {
                    const isCollapsed = collapsedCoreIds.has(core.id);
                    const outerTopicsOfCore = topicsByParent.get(core.id) || [];
                    const spokeCount = outerTopicsOfCore.length;
                    const isMonetization = core.topic_class === 'monetization';
                    const isLowRatio = isMonetization && spokeCount < 3;

                    return (
                        <div key={core.id} className={`rounded-lg border-l-4 ${isMonetization ? 'border-yellow-500 bg-yellow-900/5' : 'border-blue-500 bg-blue-900/5'} p-2`}>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleToggleCollapse(core.id)} className="p-1 text-gray-500 hover:text-white" aria-label={isCollapsed ? 'Expand section' : 'Collapse section'} aria-expanded={!isCollapsed}>
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
                                        allOuterTopics={outerTopics}
                                        allTopics={allTopics}
                                        onReparent={handleReparent}
                                        isGeneratingBrief={generatingTopicTitle === core.title}
                                        onRepairMissing={(missingFields) => handleRepairBriefMissing(core.id, missingFields)}
                                        isRepairingBrief={repairingTopicId === core.id}
                                        isDetailPanelOpen={openDetailPanelTopicId === core.id}
                                        onOpenDetailPanel={setOpenDetailPanelTopicId}
                                        businessInfo={businessInfo}
                                        publicationStatus={getPublicationInfo(core.id).publicationStatus}
                                        wpPostUrl={getPublicationInfo(core.id).wpPostUrl}
                                    />
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className="pl-4 sm:pl-8 mt-2 space-y-2 border-l-2 border-gray-700 ml-6">
                                {outerTopicsOfCore.map(outer => {
                                    const childrenOfOuter = childTopicsByParent.get(outer.id) || [];
                                    const hasChildren = childrenOfOuter.length > 0;
                                    return (
                                        <div key={outer.id} className="space-y-1">
                                            <TopicItem
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
                                                allOuterTopics={outerTopics}
                                                allTopics={allTopics}
                                                onReparent={handleReparent}
                                                isGeneratingBrief={generatingTopicTitle === outer.title}
                                                onRepairMissing={(missingFields) => handleRepairBriefMissing(outer.id, missingFields)}
                                                isRepairingBrief={repairingTopicId === outer.id}
                                                isDetailPanelOpen={openDetailPanelTopicId === outer.id}
                                                onOpenDetailPanel={setOpenDetailPanelTopicId}
                                                businessInfo={businessInfo}
                                                publicationStatus={getPublicationInfo(outer.id).publicationStatus}
                                                wpPostUrl={getPublicationInfo(outer.id).wpPostUrl}
                                            />
                                            {/* Level 3: Child topics under outer topics */}
                                            {hasChildren && (
                                                <div className="pl-4 sm:pl-6 mt-1 space-y-1 border-l-2 border-gray-600 ml-4">
                                                    {childrenOfOuter.map(child => (
                                                        <TopicItem
                                                            key={child.id}
                                                            topic={child}
                                                            hasBrief={!!briefs[child.id]}
                                                            brief={briefs[child.id]}
                                                            onHighlight={() => setHighlightedTopicId(child.id)}
                                                            onGenerateBrief={() => onSelectTopicForBrief(child)}
                                                            onDelete={() => handleDeleteTopic(child.id)}
                                                            onUpdateTopic={onUpdateTopic}
                                                            isChecked={selectedTopicIds.includes(child.id)}
                                                            onToggleSelection={handleToggleSelection}
                                                            isHighlighted={highlightedTopicId === child.id}
                                                            onDragStart={handleDragStart}
                                                            onDropOnTopic={handleDropOnTopic}
                                                            onDragEnd={() => setDraggedTopicId(null)}
                                                            canExpand={false}
                                                            canGenerateBriefs={canGenerateBriefs}
                                                            allCoreTopics={coreTopics}
                                                            allOuterTopics={outerTopics}
                                                            allTopics={allTopics}
                                                            onReparent={handleReparent}
                                                            isGeneratingBrief={generatingTopicTitle === child.title}
                                                            onRepairMissing={(missingFields) => handleRepairBriefMissing(child.id, missingFields)}
                                                            isRepairingBrief={repairingTopicId === child.id}
                                                            isDetailPanelOpen={openDetailPanelTopicId === child.id}
                                                            onOpenDetailPanel={setOpenDetailPanelTopicId}
                                                            businessInfo={businessInfo}
                                                            publicationStatus={getPublicationInfo(child.id).publicationStatus}
                                                            wpPostUrl={getPublicationInfo(child.id).wpPostUrl}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Uncategorized Outer Topics - outer topics without a valid core parent */}
                {uncategorizedOuterTopics.length > 0 && (
                    <div className="mt-6 pt-4 border-t-2 border-dashed border-orange-600/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-orange-500">⚠️</span>
                            <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">
                                Orphaned Outer Topics ({uncategorizedOuterTopics.length})
                            </h3>
                            <span className="text-xs text-gray-500">— Assign to a Core topic using the parent dropdown</span>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-orange-600/30">
                            {uncategorizedOuterTopics.map(outer => {
                                // Get any child topics for this orphaned outer topic
                                const children = childTopicsByParent.get(outer.id) || [];
                                return (
                                    <div key={outer.id}>
                                        <TopicItem
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
                                            canExpand={false}
                                            canGenerateBriefs={canGenerateBriefs}
                                            allCoreTopics={coreTopics}
                                            allOuterTopics={outerTopics}
                                            allTopics={allTopics}
                                            onReparent={handleReparent}
                                            isGeneratingBrief={generatingTopicTitle === outer.title}
                                            onRepairMissing={(missingFields) => handleRepairBriefMissing(outer.id, missingFields)}
                                            isRepairingBrief={repairingTopicId === outer.id}
                                            isDetailPanelOpen={openDetailPanelTopicId === outer.id}
                                            onOpenDetailPanel={setOpenDetailPanelTopicId}
                                            businessInfo={businessInfo}
                                            publicationStatus={getPublicationInfo(outer.id).publicationStatus}
                                            wpPostUrl={getPublicationInfo(outer.id).wpPostUrl}
                                        />
                                        {/* Show child topics under this orphaned outer topic */}
                                        {children.length > 0 && (
                                            <div className="ml-6 mt-1 space-y-1 border-l-2 border-orange-700/30 pl-3">
                                                {children.map(child => (
                                                    <TopicItem
                                                        key={child.id}
                                                        topic={child}
                                                        hasBrief={!!briefs[child.id]}
                                                        brief={briefs[child.id]}
                                                        onHighlight={() => setHighlightedTopicId(child.id)}
                                                        onGenerateBrief={() => onSelectTopicForBrief(child)}
                                                        onDelete={() => handleDeleteTopic(child.id)}
                                                        onUpdateTopic={onUpdateTopic}
                                                        isChecked={selectedTopicIds.includes(child.id)}
                                                        onToggleSelection={handleToggleSelection}
                                                        isHighlighted={highlightedTopicId === child.id}
                                                        onDragStart={handleDragStart}
                                                        onDropOnTopic={handleDropOnTopic}
                                                        onDragEnd={() => setDraggedTopicId(null)}
                                                        canExpand={false}
                                                        canGenerateBriefs={canGenerateBriefs}
                                                        allCoreTopics={coreTopics}
                                                        allOuterTopics={outerTopics}
                                                        allTopics={allTopics}
                                                        onReparent={handleReparent}
                                                        isGeneratingBrief={generatingTopicTitle === child.title}
                                                        onRepairMissing={(missingFields) => handleRepairBriefMissing(child.id, missingFields)}
                                                        isRepairingBrief={repairingTopicId === child.id}
                                                        isDetailPanelOpen={openDetailPanelTopicId === child.id}
                                                        onOpenDetailPanel={setOpenDetailPanelTopicId}
                                                        businessInfo={businessInfo}
                                                        publicationStatus={getPublicationInfo(child.id).publicationStatus}
                                                        wpPostUrl={getPublicationInfo(child.id).wpPostUrl}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Uncategorized Child Topics - topics that need a parent */}
                {uncategorizedChildTopics.length > 0 && (
                    <div className="mt-6 pt-4 border-t-2 border-dashed border-amber-600/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-amber-500">⚠️</span>
                            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                                Uncategorized Child Topics ({uncategorizedChildTopics.length})
                            </h3>
                            <span className="text-xs text-gray-500">— Assign to an Outer topic</span>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-amber-600/30">
                            {uncategorizedChildTopics.map(child => (
                                <TopicItem
                                    key={child.id}
                                    topic={child}
                                    hasBrief={!!briefs[child.id]}
                                    brief={briefs[child.id]}
                                    onHighlight={() => setHighlightedTopicId(child.id)}
                                    onGenerateBrief={() => onSelectTopicForBrief(child)}
                                    onDelete={() => handleDeleteTopic(child.id)}
                                    onUpdateTopic={onUpdateTopic}
                                    isChecked={selectedTopicIds.includes(child.id)}
                                    onToggleSelection={handleToggleSelection}
                                    isHighlighted={highlightedTopicId === child.id}
                                    onDragStart={handleDragStart}
                                    onDropOnTopic={handleDropOnTopic}
                                    onDragEnd={() => setDraggedTopicId(null)}
                                    canExpand={false}
                                    canGenerateBriefs={canGenerateBriefs}
                                    allCoreTopics={coreTopics}
                                    allOuterTopics={outerTopics}
                                    allTopics={allTopics}
                                    onReparent={handleReparent}
                                    isGeneratingBrief={generatingTopicTitle === child.title}
                                    onRepairMissing={(missingFields) => handleRepairBriefMissing(child.id, missingFields)}
                                    isRepairingBrief={repairingTopicId === child.id}
                                    isDetailPanelOpen={openDetailPanelTopicId === child.id}
                                    onOpenDetailPanel={setOpenDetailPanelTopicId}
                                    businessInfo={businessInfo}
                                    publicationStatus={getPublicationInfo(child.id).publicationStatus}
                                    wpPostUrl={getPublicationInfo(child.id).wpPostUrl}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            )}
            {sortedCoreTopics.length > listViewLimit && (
                <button
                    onClick={() => setListViewLimit(prev => prev + 50)}
                    className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                    Show {Math.min(50, sortedCoreTopics.length - listViewLimit)} more core topics ({sortedCoreTopics.length - listViewLimit} remaining)
                </button>
            )}
            </div>
        ) : viewMode === 'table' ? (
            <TopicTableView
                coreTopics={sortedCoreTopics}
                outerTopics={sortedOuterTopics}
                childTopics={childTopics}
                briefs={briefsMap}
                selectedTopicIds={selectedTopicIdsSet}
                onToggleSelection={handleToggleSelection}
                onSelectAll={() => {
                  const allIds = [...sortedCoreTopics, ...sortedOuterTopics, ...childTopics].map(t => t.id);
                  setSelectedTopicIds(allIds);
                }}
                onDeselectAll={() => setSelectedTopicIds([])}
                onGenerateBrief={onSelectTopicForBrief}
                onExpand={onExpandCoreTopic}
                onDelete={handleDeleteTopic}
                onHighlight={(topic) => setHighlightedTopicId(topic.id)}
                expandingTopicIds={expandingTopicIds}
                generatingBriefTopicIds={generatingBriefTopicIds}
                canExpand={canExpandTopics}
                canGenerateBriefs={canGenerateBriefs}
                hierarchyMode={hierarchyMode}
                onUpdateTopic={onUpdateTopic}
                onBulkGenerateBriefs={handleBulkGenerateBriefs}
                onBulkMerge={handleFindMergeOpportunities}
                onBulkPromote={handleBulkPromote}
                onBulkDemote={handleBulkDemote}
                onBulkDelete={handleBulkDeleteTopics}
                isMerging={!!isLoading.merge}
            />
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
                allTopics={allTopics}
                onReparent={handleReparent}
                canExpandTopics={canExpandTopics}
                onUpdateTopic={onUpdateTopic}
                businessInfo={businessInfo}
            />
        )}

      {/* Bulk Action Bar (shared across card + table view) */}
      {selectedTopicIds.length > 0 && viewMode !== 'graph' && (
        <TopicBulkActionBar
          selectedTopicIds={selectedTopicIds}
          allTopics={allTopics}
          briefs={briefs}
          coreTopics={coreTopics}
          onBulkGenerateBriefs={handleBulkGenerateBriefs}
          onMerge={handleFindMergeOpportunities}
          onBulkPromote={handleBulkPromote}
          onBulkDemote={handleBulkDemote}
          onBulkDelete={handleBulkDeleteTopics}
          onClearSelection={() => setSelectedTopicIds([])}
          canGenerateBriefs={canGenerateBriefs}
          isMerging={!!isLoading.merge}
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

      {/* AI Usage Report Modal */}
      {showUsageReport && activeMapId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg">
            <MapUsageReport
              mapId={activeMapId}
              mapName={currentMap?.name}
              onClose={() => setShowUsageReport(false)}
            />
          </div>
        </div>
      )}

      {/* Location Manager Modal moved to ProjectDashboard */}
    </div>
  );
};

export default TopicalMapDisplay;
