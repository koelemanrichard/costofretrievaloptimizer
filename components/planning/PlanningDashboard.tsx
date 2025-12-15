/**
 * PlanningDashboard
 *
 * Main container for the publication planning feature.
 * Provides calendar and list views for managing content publication schedules.
 */

import React, { useCallback, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import PlanningHeader from './PlanningHeader';
import PlanningStatistics from './PlanningStatistics';
import PlanningListView from './PlanningListView';
import PlanningCalendar from './PlanningCalendar';
import { generatePublicationPlan, calculateProgress } from '../../services/ai/publicationPlanning';
import { EnrichedTopic, PublicationPlanResult, ContentBrief } from '../../types';

interface PlanningDashboardProps {
    topics: EnrichedTopic[];
}

const PlanningDashboard: React.FC<PlanningDashboardProps> = ({ topics }) => {
    const { state, dispatch } = useAppState();
    const {
        viewMode,
        calendarMode,
        currentDate,
        filters,
        selectedTopicIds,
        planResult,
        isGeneratingPlan,
        batchLaunchDate
    } = state.publicationPlanning;

    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const eavs = activeMap?.eavs || [];
    const briefs = useMemo(() => (activeMap?.briefs || {}) as Record<string, ContentBrief>, [activeMap?.briefs]);

    // Get published topic IDs
    const publishedTopicIds = useMemo(() => {
        const published = new Set<string>();
        topics.forEach(t => {
            const plan = t.metadata?.publication_plan;
            if (plan?.status === 'published') {
                published.add(t.id);
            }
        });
        return published;
    }, [topics]);

    // Calculate progress if we have a plan
    const progress = useMemo(() => {
        if (!planResult) return null;
        return calculateProgress(planResult, publishedTopicIds);
    }, [planResult, publishedTopicIds]);

    // Filter topics based on current filters
    const filteredTopics = useMemo(() => {
        let filtered = topics;

        if (filters.status && filters.status.length > 0) {
            filtered = filtered.filter(t => {
                const status = t.metadata?.publication_plan?.status || 'not_started';
                return filters.status!.includes(status);
            });
        }

        if (filters.phase && filters.phase.length > 0) {
            filtered = filtered.filter(t => {
                const phase = t.metadata?.publication_plan?.phase;
                return phase && filters.phase!.includes(phase);
            });
        }

        if (filters.priority && filters.priority.length > 0) {
            filtered = filtered.filter(t => {
                const priority = t.metadata?.publication_plan?.priority;
                return priority && filters.priority!.includes(priority);
            });
        }

        if (filters.topic_type && filters.topic_type.length > 0) {
            filtered = filtered.filter(t => filters.topic_type!.includes(t.type));
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(searchLower) ||
                t.slug?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.date_range) {
            const start = new Date(filters.date_range.start);
            const end = new Date(filters.date_range.end);
            filtered = filtered.filter(t => {
                const optimalDate = t.metadata?.publication_plan?.optimal_publication_date;
                if (!optimalDate) return false;
                const date = new Date(optimalDate);
                return date >= start && date <= end;
            });
        }

        return filtered;
    }, [topics, filters]);

    // Handle generating a new plan
    const handleGeneratePlan = useCallback(() => {
        if (!activeMap) return;

        dispatch({ type: 'SET_GENERATING_PLAN', payload: true });

        try {
            const launchDate = batchLaunchDate || new Date().toISOString().split('T')[0];
            const plan = generatePublicationPlan({
                topics,
                eavs,
                batchLaunchDate: launchDate
            });

            dispatch({ type: 'SET_PUBLICATION_PLAN_RESULT', payload: plan });
            dispatch({ type: 'APPLY_PUBLICATION_PLAN', payload: { mapId: activeMap.id, planResult: plan } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Publication plan generated for ${plan.topics.length} topics` });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to generate publication plan' });
        } finally {
            dispatch({ type: 'SET_GENERATING_PLAN', payload: false });
        }
    }, [topics, eavs, batchLaunchDate, activeMap, dispatch]);

    // Handle view mode change
    const handleViewModeChange = useCallback((mode: 'calendar' | 'list') => {
        dispatch({ type: 'SET_PLANNING_VIEW_MODE', payload: mode });
    }, [dispatch]);

    // Handle calendar mode change
    const handleCalendarModeChange = useCallback((mode: 'month' | 'week') => {
        dispatch({ type: 'SET_PLANNING_CALENDAR_MODE', payload: mode });
    }, [dispatch]);

    // Handle date navigation
    const handleDateChange = useCallback((date: string) => {
        dispatch({ type: 'SET_PLANNING_CURRENT_DATE', payload: date });
    }, [dispatch]);

    // Handle filter changes
    const handleFilterChange = useCallback((newFilters: typeof filters) => {
        dispatch({ type: 'SET_PLANNING_FILTERS', payload: newFilters });
    }, [dispatch]);

    // Handle topic selection
    const handleTopicSelect = useCallback((topicId: string) => {
        dispatch({ type: 'TOGGLE_PLANNING_TOPIC_SELECTION', payload: topicId });
    }, [dispatch]);

    // Handle select all (filtered)
    const handleSelectAll = useCallback(() => {
        const allIds = filteredTopics.map(t => t.id);
        dispatch({ type: 'SET_PLANNING_SELECTED_TOPICS', payload: allIds });
    }, [filteredTopics, dispatch]);

    // Handle clear selection
    const handleClearSelection = useCallback(() => {
        dispatch({ type: 'CLEAR_PLANNING_SELECTION' });
    }, [dispatch]);

    // Handle batch launch date change
    const handleBatchLaunchDateChange = useCallback((date: string) => {
        dispatch({ type: 'SET_BATCH_LAUNCH_DATE', payload: date });
    }, [dispatch]);

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <PlanningHeader
                viewMode={viewMode}
                calendarMode={calendarMode}
                currentDate={currentDate}
                filters={filters}
                selectedCount={selectedTopicIds.length}
                totalCount={filteredTopics.length}
                isGeneratingPlan={isGeneratingPlan}
                batchLaunchDate={batchLaunchDate}
                onViewModeChange={handleViewModeChange}
                onCalendarModeChange={handleCalendarModeChange}
                onDateChange={handleDateChange}
                onFilterChange={handleFilterChange}
                onGeneratePlan={handleGeneratePlan}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onBatchLaunchDateChange={handleBatchLaunchDateChange}
            />

            {progress && <PlanningStatistics progress={progress} planResult={planResult} />}

            <div className="flex-1 overflow-hidden">
                {viewMode === 'list' ? (
                    <PlanningListView
                        topics={filteredTopics}
                        allTopics={topics}
                        selectedTopicIds={selectedTopicIds}
                        planResult={planResult}
                        briefs={briefs}
                        onTopicSelect={handleTopicSelect}
                    />
                ) : (
                    <PlanningCalendar
                        topics={filteredTopics}
                        currentDate={currentDate}
                        calendarMode={calendarMode}
                        planResult={planResult}
                        onDateChange={handleDateChange}
                    />
                )}
            </div>
        </div>
    );
};

export default PlanningDashboard;
