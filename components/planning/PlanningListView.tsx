/**
 * PlanningListView
 *
 * Enhanced table view for publication planning with:
 * - Auto-detected status from briefs/drafts
 * - Publication requirements (linking checklist)
 * - Expandable rows for detailed requirements
 */

import React, { useState, useMemo } from 'react';
import {
    EnrichedTopic,
    PublicationPlanResult,
    PublicationStatus,
    PublicationPhase,
    PublicationPriority,
    ContentBrief
} from '../../types';
import { useAppState } from '../../state/appState';

interface PlanningListViewProps {
    topics: EnrichedTopic[];
    allTopics: EnrichedTopic[];
    selectedTopicIds: string[];
    planResult: PublicationPlanResult | null;
    briefs: Record<string, ContentBrief>;
    onTopicSelect: (topicId: string) => void;
}

type SortField = 'title' | 'status' | 'phase' | 'priority' | 'optimal_date' | 'type' | 'requirements';
type SortDirection = 'asc' | 'desc';

interface PublicationRequirements {
    slug: string;
    homepageLinkNeeded: boolean;
    parentLinkNeeded: { id: string; title: string; slug: string } | null;
    siblingLinks: { id: string; title: string; slug: string }[];
    childLinks: { id: string; title: string; slug: string }[];
    totalRequirements: number;
    completedRequirements: number;
}

const STATUS_CONFIG: Record<PublicationStatus, { label: string; color: string; bgColor: string }> = {
    'not_started': { label: 'Not Started', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
    'brief_ready': { label: 'Brief Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    'draft_in_progress': { label: 'Drafting', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    'draft_ready': { label: 'Draft Ready', color: 'text-green-400', bgColor: 'bg-green-500/20' },
    'in_review': { label: 'In Review', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    'scheduled': { label: 'Scheduled', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
    'published': { label: 'Published', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
    'needs_update': { label: 'Needs Update', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

const PHASE_CONFIG: Record<PublicationPhase, { label: string; short: string; color: string }> = {
    'phase_1_authority': { label: 'Phase 1: Authority', short: 'P1', color: 'text-red-400' },
    'phase_2_support': { label: 'Phase 2: Support', short: 'P2', color: 'text-orange-400' },
    'phase_3_expansion': { label: 'Phase 3: Expansion', short: 'P3', color: 'text-yellow-400' },
    'phase_4_longtail': { label: 'Phase 4: Long-tail', short: 'P4', color: 'text-blue-400' },
};

const PRIORITY_CONFIG: Record<PublicationPriority, { label: string; color: string; bgColor: string }> = {
    'critical': { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
    'high': { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    'medium': { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    'low': { label: 'Low', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
};

/**
 * Auto-detect publication status from brief/draft state
 */
function detectStatus(
    topic: EnrichedTopic,
    brief: ContentBrief | undefined,
    manualStatus?: PublicationStatus
): PublicationStatus {
    // Manual override takes precedence
    if (manualStatus && manualStatus !== 'not_started') {
        return manualStatus;
    }

    // Check actual publication date
    const plan = topic.metadata?.publication_plan;
    if (plan?.actual_publication_date) {
        const pubDate = new Date(plan.actual_publication_date);
        if (pubDate <= new Date()) {
            return 'published';
        }
    }

    // Check scheduled date
    if (plan?.scheduled_date) {
        return 'scheduled';
    }

    // Check draft state
    if (brief?.articleDraft && brief.articleDraft.length > 100) {
        return 'draft_ready';
    }

    // Check if brief exists
    if (brief) {
        return 'brief_ready';
    }

    return 'not_started';
}

/**
 * Calculate publication requirements for a topic
 */
function calculateRequirements(
    topic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    brief: ContentBrief | undefined
): PublicationRequirements {
    const slug = topic.slug || topic.title.toLowerCase().replace(/\s+/g, '-');

    // Core topics and pillars need homepage links
    const homepageLinkNeeded = topic.type === 'core' ||
        topic.topic_class === 'monetization' ||
        topic.cluster_role === 'pillar';

    // Find parent topic
    const parentTopic = topic.parent_topic_id
        ? allTopics.find(t => t.id === topic.parent_topic_id)
        : null;

    const parentLinkNeeded = parentTopic ? {
        id: parentTopic.id,
        title: parentTopic.title,
        slug: parentTopic.slug || parentTopic.title.toLowerCase().replace(/\s+/g, '-')
    } : null;

    // Find sibling topics (same parent)
    const siblingLinks = topic.parent_topic_id
        ? allTopics
            .filter(t => t.parent_topic_id === topic.parent_topic_id && t.id !== topic.id)
            .slice(0, 3) // Limit to 3 most important siblings
            .map(t => ({
                id: t.id,
                title: t.title,
                slug: t.slug || t.title.toLowerCase().replace(/\s+/g, '-')
            }))
        : [];

    // Find child topics
    const childLinks = allTopics
        .filter(t => t.parent_topic_id === topic.id)
        .slice(0, 5) // Limit to 5 children
        .map(t => ({
            id: t.id,
            title: t.title,
            slug: t.slug || t.title.toLowerCase().replace(/\s+/g, '-')
        }));

    // Calculate completion (placeholder - would need tracking)
    const totalRequirements = (homepageLinkNeeded ? 1 : 0) +
        (parentLinkNeeded ? 1 : 0) +
        siblingLinks.length +
        childLinks.length +
        1; // +1 for slug/URL

    return {
        slug,
        homepageLinkNeeded,
        parentLinkNeeded,
        siblingLinks,
        childLinks,
        totalRequirements,
        completedRequirements: 0 // Would need actual tracking
    };
}

const PlanningListView: React.FC<PlanningListViewProps> = ({
    topics,
    allTopics,
    selectedTopicIds,
    planResult,
    briefs,
    onTopicSelect
}) => {
    const { state, dispatch } = useAppState();
    const [sortField, setSortField] = useState<SortField>('optimal_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

    // Build plan lookup
    const planByTopic = useMemo(() => {
        if (!planResult) return new Map();
        return new Map(planResult.topics.map(p => [p.topic_id, p]));
    }, [planResult]);

    // Calculate requirements for all topics
    const requirementsByTopic = useMemo(() => {
        const reqs = new Map<string, PublicationRequirements>();
        topics.forEach(t => {
            reqs.set(t.id, calculateRequirements(t, allTopics, briefs[t.id]));
        });
        return reqs;
    }, [topics, allTopics, briefs]);

    // Sort topics
    const sortedTopics = useMemo(() => {
        const sorted = [...topics].sort((a, b) => {
            const planA = a.metadata?.publication_plan || planByTopic.get(a.id);
            const planB = b.metadata?.publication_plan || planByTopic.get(b.id);
            const briefA = briefs[a.id];
            const briefB = briefs[b.id];
            const reqA = requirementsByTopic.get(a.id);
            const reqB = requirementsByTopic.get(b.id);

            let comparison = 0;

            switch (sortField) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'status':
                    const statusA = detectStatus(a, briefA, planA?.status);
                    const statusB = detectStatus(b, briefB, planB?.status);
                    comparison = statusA.localeCompare(statusB);
                    break;
                case 'phase':
                    comparison = (planA?.phase || '').localeCompare(planB?.phase || '');
                    break;
                case 'priority':
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    comparison = (priorityOrder[planA?.priority as PublicationPriority] ?? 4) -
                        (priorityOrder[planB?.priority as PublicationPriority] ?? 4);
                    break;
                case 'optimal_date':
                    const dateA = planA?.optimal_publication_date || '';
                    const dateB = planB?.optimal_publication_date || '';
                    comparison = dateA.localeCompare(dateB);
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
                case 'requirements':
                    comparison = (reqA?.totalRequirements || 0) - (reqB?.totalRequirements || 0);
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [topics, sortField, sortDirection, planByTopic, briefs, requirementsByTopic]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleStatusChange = (topicId: string, status: PublicationStatus) => {
        if (!state.activeMapId) return;
        dispatch({
            type: 'UPDATE_TOPIC_PUBLICATION_STATUS',
            payload: { mapId: state.activeMapId, topicId, status }
        });
    };

    const toggleExpand = (topicId: string) => {
        setExpandedTopicId(prev => prev === topicId ? null : topicId);
    };

    const SortHeader: React.FC<{ field: SortField; label: string; className?: string }> = ({
        field,
        label,
        className = ''
    }) => (
        <th
            onClick={() => handleSort(field)}
            className={`px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white ${className}`}
        >
            <div className="flex items-center gap-1">
                {label}
                {sortField === field && (
                    <svg
                        className={`w-3 h-3 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                )}
            </div>
        </th>
    );

    return (
        <div className="h-full overflow-auto">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800 z-10">
                    <tr>
                        <th className="w-8 px-3 py-3">
                            <input
                                type="checkbox"
                                checked={selectedTopicIds.length === topics.length && topics.length > 0}
                                onChange={() => {
                                    if (selectedTopicIds.length === topics.length) {
                                        dispatch({ type: 'CLEAR_PLANNING_SELECTION' });
                                    } else {
                                        dispatch({
                                            type: 'SET_PLANNING_SELECTED_TOPICS',
                                            payload: topics.map(t => t.id)
                                        });
                                    }
                                }}
                                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                        </th>
                        <th className="w-8 px-2 py-3"></th>
                        <SortHeader field="title" label="Topic" className="min-w-[180px]" />
                        <SortHeader field="type" label="Type" />
                        <SortHeader field="status" label="Status" />
                        <SortHeader field="phase" label="Phase" />
                        <SortHeader field="priority" label="Priority" />
                        <SortHeader field="optimal_date" label="Optimal Date" />
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actual
                        </th>
                        <SortHeader field="requirements" label="Requirements" />
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Score
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                    {sortedTopics.map(topic => {
                        const plan = topic.metadata?.publication_plan || planByTopic.get(topic.id);
                        const brief = briefs[topic.id];
                        const detectedStatus = detectStatus(topic, brief, plan?.status);
                        const phase = plan?.phase;
                        const priority = plan?.priority;
                        const priorityScore = plan?.priority_score;
                        const optimalDate = plan?.optimal_publication_date;
                        const actualDate = plan?.actual_publication_date;
                        const isSelected = selectedTopicIds.includes(topic.id);
                        const isExpanded = expandedTopicId === topic.id;
                        const requirements = requirementsByTopic.get(topic.id);

                        const statusConfig = STATUS_CONFIG[detectedStatus];
                        const phaseConfig = phase ? PHASE_CONFIG[phase] : null;
                        const priorityConfig = priority ? PRIORITY_CONFIG[priority] : null;

                        return (
                            <React.Fragment key={topic.id}>
                                <tr className={`hover:bg-gray-800/50 ${isSelected ? 'bg-blue-900/20' : ''}`}>
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onTopicSelect(topic.id)}
                                            className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <button
                                            onClick={() => toggleExpand(topic.id)}
                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium text-sm">{topic.title}</span>
                                            <span className="text-xs text-gray-500 truncate max-w-[200px]">/{requirements?.slug}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${topic.type === 'core'
                                            ? 'bg-purple-500/20 text-purple-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {topic.type}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <select
                                            value={detectedStatus}
                                            onChange={(e) => handleStatusChange(topic.id, e.target.value as PublicationStatus)}
                                            className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${statusConfig.bgColor} ${statusConfig.color}`}
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                                                <option key={value} value={value} className="bg-gray-800 text-white">
                                                    {config.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        {phaseConfig ? (
                                            <span className={`text-xs font-medium ${phaseConfig.color}`}>
                                                {phaseConfig.short}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {priorityConfig ? (
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                                                {priorityConfig.label}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {optimalDate ? (
                                            <span className="text-sm text-white">
                                                {formatDate(optimalDate)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {actualDate ? (
                                            <span className={`text-sm ${actualDate > (optimalDate || '') ? 'text-red-400' : 'text-green-400'}`}>
                                                {formatDate(actualDate)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {requirements && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    {requirements.homepageLinkNeeded && (
                                                        <span className="w-2 h-2 rounded-full bg-purple-500" title="Homepage link" />
                                                    )}
                                                    {requirements.parentLinkNeeded && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-500" title="Parent link" />
                                                    )}
                                                    {requirements.childLinks.length > 0 && (
                                                        <span className="w-2 h-2 rounded-full bg-green-500" title="Child links" />
                                                    )}
                                                    {requirements.siblingLinks.length > 0 && (
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500" title="Sibling links" />
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-400">{requirements.totalRequirements}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {priorityScore !== undefined ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${priorityScore >= 75 ? 'bg-red-500' :
                                                            priorityScore >= 50 ? 'bg-orange-500' :
                                                                priorityScore >= 25 ? 'bg-yellow-500' :
                                                                    'bg-gray-500'
                                                            }`}
                                                        style={{ width: `${priorityScore}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400">{priorityScore}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500">-</span>
                                        )}
                                    </td>
                                </tr>
                                {/* Expanded Requirements Row */}
                                {isExpanded && requirements && (
                                    <tr className="bg-gray-800/30">
                                        <td colSpan={11} className="px-3 py-3">
                                            <div className="ml-10 space-y-3">
                                                <h4 className="text-sm font-medium text-gray-300">Publication Requirements</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Publication Location */}
                                                    <div className="bg-gray-800/50 rounded-lg p-3">
                                                        <h5 className="text-xs font-medium text-gray-400 uppercase mb-2">Publish Location</h5>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                </svg>
                                                                <code className="text-sm text-white bg-gray-700 px-2 py-0.5 rounded">/{requirements.slug}</code>
                                                            </div>
                                                            {requirements.homepageLinkNeeded && (
                                                                <div className="flex items-center gap-2 text-purple-400">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                                    </svg>
                                                                    <span className="text-xs">Add link from homepage</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Internal Linking Checklist */}
                                                    <div className="bg-gray-800/50 rounded-lg p-3">
                                                        <h5 className="text-xs font-medium text-gray-400 uppercase mb-2">Internal Links Required</h5>
                                                        <div className="space-y-2 text-xs">
                                                            {requirements.parentLinkNeeded && (
                                                                <div className="flex items-start gap-2">
                                                                    <input type="checkbox" className="mt-0.5 rounded border-gray-600" />
                                                                    <div>
                                                                        <span className="text-blue-400">From parent:</span>
                                                                        <span className="text-gray-300 ml-1">{requirements.parentLinkNeeded.title}</span>
                                                                        <code className="block text-gray-500">/{requirements.parentLinkNeeded.slug}</code>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {requirements.childLinks.length > 0 && (
                                                                <div className="flex items-start gap-2">
                                                                    <input type="checkbox" className="mt-0.5 rounded border-gray-600" />
                                                                    <div>
                                                                        <span className="text-green-400">Link to children ({requirements.childLinks.length}):</span>
                                                                        <div className="text-gray-500 mt-1">
                                                                            {requirements.childLinks.map(c => (
                                                                                <div key={c.id}>• {c.title}</div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {requirements.siblingLinks.length > 0 && (
                                                                <div className="flex items-start gap-2">
                                                                    <input type="checkbox" className="mt-0.5 rounded border-gray-600" />
                                                                    <div>
                                                                        <span className="text-yellow-400">Related siblings ({requirements.siblingLinks.length}):</span>
                                                                        <div className="text-gray-500 mt-1">
                                                                            {requirements.siblingLinks.map(s => (
                                                                                <div key={s.id}>• {s.title}</div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {!requirements.parentLinkNeeded && requirements.childLinks.length === 0 && requirements.siblingLinks.length === 0 && (
                                                                <span className="text-gray-500">No internal links required</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Status Indicators */}
                                                <div className="flex items-center gap-4 pt-2 border-t border-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        {brief ? (
                                                            <span className="text-green-400 text-xs flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                Brief generated
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                No brief
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {brief?.articleDraft ? (
                                                            <span className="text-green-400 text-xs flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                Draft ready
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                No draft
                                                            </span>
                                                        )}
                                                    </div>
                                                    {topic.topic_class && (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                                            {topic.topic_class}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            {sortedTopics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>No topics match your filters</p>
                </div>
            )}

            {/* Legend */}
            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-4 py-2">
                <div className="flex items-center gap-6 text-xs text-gray-400">
                    <span className="font-medium">Requirements:</span>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>Homepage</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Parent</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Children</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span>Siblings</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

export default PlanningListView;
