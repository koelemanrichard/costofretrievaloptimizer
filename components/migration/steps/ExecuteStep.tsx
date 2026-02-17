import React, { useState, useMemo, useCallback } from 'react';
import { SiteInventoryItem, EnrichedTopic, ActionType, TransitionStatus } from '../../../types';
import { ACTION_EXPLANATIONS } from '../../../services/migration/MigrationPlanEngine';

interface ExecuteStepProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  onOpenWorkbench?: (item: SiteInventoryItem) => void;
  onCreateBrief?: (topicId: string) => void;
}

type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type ActionFilter = 'all' | ActionType;
type ExecutionStatus = 'todo' | 'in_progress' | 'done';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function getExecutionStatus(status: TransitionStatus): ExecutionStatus {
  switch (status) {
    case 'AUDIT_PENDING':
    case 'GAP_ANALYSIS':
      return 'todo';
    case 'ACTION_REQUIRED':
    case 'IN_PROGRESS':
      return 'in_progress';
    case 'OPTIMIZED':
      return 'done';
    default:
      return 'todo';
  }
}

function getStatusLabel(execStatus: ExecutionStatus): string {
  switch (execStatus) {
    case 'todo': return 'Todo';
    case 'in_progress': return 'In Progress';
    case 'done': return 'Done';
  }
}

function getStatusIcon(execStatus: ExecutionStatus): string {
  switch (execStatus) {
    case 'todo': return '\u2B1C'; // white square
    case 'in_progress': return '\uD83D\uDD04'; // arrows counterclockwise
    case 'done': return '\u2705'; // green checkmark
  }
}

function getStatusClasses(execStatus: ExecutionStatus): string {
  switch (execStatus) {
    case 'todo': return 'bg-gray-700/50 text-gray-300 border-gray-600';
    case 'in_progress': return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
    case 'done': return 'bg-green-900/30 text-green-300 border-green-700/50';
  }
}

function getPriorityClasses(priority: string | undefined): string {
  switch (priority) {
    case 'critical': return 'bg-red-900/40 text-red-300 border-red-700/50';
    case 'high': return 'bg-orange-900/40 text-orange-300 border-orange-700/50';
    case 'medium': return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50';
    case 'low': return 'bg-gray-700/40 text-gray-300 border-gray-600/50';
    default: return 'bg-gray-700/40 text-gray-400 border-gray-600/50';
  }
}

function getActionClasses(action: ActionType | undefined): string {
  switch (action) {
    case 'KEEP': return 'bg-green-900/30 text-green-400';
    case 'OPTIMIZE': return 'bg-blue-900/30 text-blue-400';
    case 'REWRITE': return 'bg-purple-900/30 text-purple-400';
    case 'MERGE': return 'bg-indigo-900/30 text-indigo-400';
    case 'REDIRECT_301': return 'bg-yellow-900/30 text-yellow-400';
    case 'PRUNE_410': return 'bg-red-900/30 text-red-400';
    case 'CANONICALIZE': return 'bg-cyan-900/30 text-cyan-400';
    case 'CREATE_NEW': return 'bg-emerald-900/30 text-emerald-400';
    default: return 'bg-gray-700/30 text-gray-400';
  }
}

function formatAction(action: ActionType | undefined): string {
  if (!action) return 'Unassigned';
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace('301', '301')
    .replace('410', '410');
}

const ACTION_TYPES: ActionType[] = [
  'KEEP', 'OPTIMIZE', 'REWRITE', 'MERGE', 'REDIRECT_301', 'PRUNE_410', 'CANONICALIZE', 'CREATE_NEW',
];

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const ExecuteStep: React.FC<ExecuteStepProps> = ({
  projectId: _projectId,
  mapId: _mapId,
  inventory,
  topics,
  onOpenWorkbench,
  onCreateBrief,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  const [createNewExpanded, setCreateNewExpanded] = useState(false);

  // Shared action item type
  type ActionItem = {
    id: string;
    label: string;
    url: string | null;
    topicId: string | null;
    topicTitle: string | null;
    action: ActionType | undefined;
    priority: string | undefined;
    status: TransitionStatus;
    execStatus: ExecutionStatus;
    isCreateNew: boolean;
    inventoryItem: SiteInventoryItem | null;
  };

  // Deduplicate inventory by URL, keeping the item with more data
  const deduplicatedInventory = useMemo(() => {
    const urlMap = new Map<string, SiteInventoryItem>();
    for (const item of inventory) {
      const url = item.url?.toLowerCase();
      if (!url) { urlMap.set(item.id, item); continue; }
      const existing = urlMap.get(url);
      if (!existing) {
        urlMap.set(url, item);
      } else {
        // Keep the one with more data (prefer one with action, then audit_score, then more GSC data)
        const existingScore = (existing.action ? 10 : 0) + (existing.audit_score ? 5 : 0) + (existing.gsc_clicks ?? 0);
        const newScore = (item.action ? 10 : 0) + (item.audit_score ? 5 : 0) + (item.gsc_clicks ?? 0);
        if (newScore > existingScore) {
          urlMap.set(url, item);
        }
      }
    }
    return Array.from(urlMap.values());
  }, [inventory]);

  // Build the action queue: inventory items with actions + CREATE_NEW topics without mapped URLs
  const { pageActions, createNewActions, actionQueue } = useMemo(() => {
    // Existing inventory items that have an action assigned (check both fields)
    const inventoryItems: ActionItem[] = deduplicatedInventory
      .filter(item => item.action || item.recommended_action)
      .map(item => {
        const effectiveAction = item.action || item.recommended_action;
        const mappedTopic = item.mapped_topic_id
          ? topics.find(t => t.id === item.mapped_topic_id)
          : null;
        return {
          id: item.id,
          label: item.url || item.title,
          url: item.url,
          topicId: item.mapped_topic_id,
          topicTitle: mappedTopic?.title || null,
          action: effectiveAction,
          priority: item.action_priority,
          status: item.status,
          execStatus: getExecutionStatus(item.status),
          isCreateNew: effectiveAction === 'CREATE_NEW',
          inventoryItem: item,
        };
      });

    // Split into existing pages vs CREATE_NEW from inventory
    const pages = inventoryItems.filter(i => i.action !== 'CREATE_NEW');
    const inventoryCreateNew = inventoryItems.filter(i => i.action === 'CREATE_NEW');

    // Topics that need new content (not mapped to any inventory item)
    const mappedTopicIds = new Set(deduplicatedInventory.map(i => i.mapped_topic_id).filter(Boolean));
    const unmappedTopics = topics.filter(t => !mappedTopicIds.has(t.id));
    const topicCreateNew: ActionItem[] = unmappedTopics.map(topic => ({
      id: `create-${topic.id}`,
      label: topic.title,
      url: null,
      topicId: topic.id,
      topicTitle: topic.title,
      action: 'CREATE_NEW' as ActionType,
      priority: topic.type === 'core' ? 'high' : 'medium',
      status: 'AUDIT_PENDING' as TransitionStatus,
      execStatus: 'todo' as ExecutionStatus,
      isCreateNew: true,
      inventoryItem: null,
    }));

    const allCreateNew = [...inventoryCreateNew, ...topicCreateNew];
    const combined = [...pages, ...allCreateNew];

    // Sort helper
    const sortByPriority = (arr: ActionItem[]) => {
      arr.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority || 'low'] ?? 4;
        const pb = PRIORITY_ORDER[b.priority || 'low'] ?? 4;
        if (pa !== pb) return pa - pb;
        const statusOrder: Record<ExecutionStatus, number> = { todo: 0, in_progress: 1, done: 2 };
        return statusOrder[a.execStatus] - statusOrder[b.execStatus];
      });
      return arr;
    };

    sortByPriority(pages);
    sortByPriority(allCreateNew);
    sortByPriority(combined);

    return { pageActions: pages, createNewActions: allCreateNew, actionQueue: combined };
  }, [deduplicatedInventory, topics]);

  // Apply filters
  const filteredQueue = useMemo(() => {
    return actionQueue.filter(item => {
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (actionFilter !== 'all' && item.action !== actionFilter) return false;
      return true;
    });
  }, [actionQueue, priorityFilter, actionFilter]);

  // Stats
  const totalActions = actionQueue.length;
  const completedActions = actionQueue.filter(a => a.execStatus === 'done').length;
  const progressPercent = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const handleActionClick = useCallback((item: typeof actionQueue[0]) => {
    if (item.isCreateNew && item.topicId && onCreateBrief) {
      onCreateBrief(item.topicId);
    } else if (item.inventoryItem && onOpenWorkbench) {
      onOpenWorkbench(item.inventoryItem);
    }
  }, [onOpenWorkbench, onCreateBrief]);

  const getButtonLabel = (item: typeof actionQueue[0]): string => {
    if (item.execStatus === 'done') return 'View';
    if (item.isCreateNew && !item.inventoryItem) return 'Create Brief';
    if (item.execStatus === 'in_progress') return 'Continue';
    return 'Open Workbench';
  };

  // Count per priority for filter badges
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: actionQueue.length, critical: 0, high: 0, medium: 0, low: 0 };
    for (const item of actionQueue) {
      const p = item.priority || 'low';
      if (p in counts) counts[p]++;
    }
    return counts;
  }, [actionQueue]);

  if (totalActions === 0) {
    return (
      <div className="px-4 py-3">
        <div>
          <h2 className="text-xl font-bold text-white">Improve your pages</h2>
          <p className="text-sm text-gray-400 mt-1">Work through each page to apply AI-suggested improvements.</p>
        </div>
        <div className="mt-6 flex flex-col items-center justify-center text-gray-400">
          <p className="text-lg font-medium text-white mb-2">No actions in the queue</p>
          <p className="text-sm max-w-md text-center">
            Go back to the Plan step and generate a migration plan to populate action items here.
          </p>
        </div>
      </div>
    );
  }

  // Find the first uncompleted item for "Start Next" button
  const nextItem = useMemo(() => {
    // Prioritize critical > high > medium > low, then todo > in_progress
    return actionQueue.find(a => a.execStatus !== 'done');
  }, [actionQueue]);

  // Remaining work stats
  const remainingStats = useMemo(() => {
    const remaining = actionQueue.filter(a => a.execStatus !== 'done');
    const critical = remaining.filter(a => a.priority === 'critical').length;
    const high = remaining.filter(a => a.priority === 'high').length;
    const medium = remaining.filter(a => a.priority === 'medium').length;
    const low = remaining.filter(a => a.priority === 'low').length;
    return { total: remaining.length, critical, high, medium, low };
  }, [actionQueue]);

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Improve your pages</h2>
        <p className="text-sm text-gray-400 mt-1">
          Work through each page below. Open the workbench to review and apply AI-suggested improvements.
        </p>
      </div>

      {/* Action Explanation Guide */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">What do these actions mean?</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div><span className="text-green-300 font-medium">KEEP</span> — Page is performing well, no changes needed</div>
          <div><span className="text-lime-300 font-medium">OPTIMIZE</span> — Improve content, headings, or internal links</div>
          <div><span className="text-yellow-300 font-medium">REWRITE</span> — Fundamental content overhaul needed</div>
          <div><span className="text-blue-300 font-medium">MERGE</span> — Combine content from competing pages into one</div>
          <div><span className="text-purple-300 font-medium">REDIRECT</span> — 301 redirect to a better-matching page</div>
          <div><span className="text-red-300 font-medium">PRUNE</span> — Remove page (410 Gone) — not adding value</div>
        </div>
      </div>

      {/* Start Next Item button + remaining work */}
      {nextItem && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">{remainingStats.total}</span> items remaining
              {remainingStats.critical > 0 && <span className="text-red-400 ml-2">{remainingStats.critical} critical</span>}
              {remainingStats.high > 0 && <span className="text-orange-400 ml-2">{remainingStats.high} high</span>}
              {remainingStats.medium > 0 && <span className="text-yellow-400 ml-2">{remainingStats.medium} medium</span>}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {nextItem.action ? ACTION_EXPLANATIONS[nextItem.action] || '' : ''}
              {nextItem.topicTitle && <span className="text-blue-300"> Target: &ldquo;{nextItem.topicTitle}&rdquo;</span>}
            </p>
          </div>
          <button
            onClick={() => handleActionClick(nextItem)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors flex-shrink-0 ml-4"
          >
            Start Next Item
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">
            Progress: <span className="font-semibold text-white">{completedActions}</span>
            <span className="text-gray-500">/{totalActions}</span> actions completed
          </span>
          <span className="text-sm font-semibold text-white">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-700 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent === 100
                ? '#22c55e'
                : 'linear-gradient(90deg, #3b82f6, #6366f1)',
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Priority Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Priority:</span>
          {PRIORITY_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setPriorityFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                priorityFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">
                {priorityCounts[f.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Action Type Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Action:</span>
          <button
            onClick={() => setActionFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              actionFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            All Actions
          </button>
          {ACTION_TYPES.map(action => {
            const count = actionQueue.filter(a => a.action === action).length;
            if (count === 0) return null;
            return (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  actionFilter === action
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {formatAction(action)}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Pages Section */}
      {(() => {
        const filteredPages = filteredQueue.filter(i => !i.isCreateNew);
        const filteredCreateNew = filteredQueue.filter(i => i.isCreateNew);

        return (
          <>
            {/* Your Pages */}
            <div className="border border-gray-700 rounded-lg bg-gray-800/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Your Pages
                  <span className="ml-2 text-xs text-gray-400 font-normal">({pageActions.length})</span>
                </h3>
              </div>
              {filteredPages.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  {pageActions.length === 0
                    ? 'No page actions found. Apply a plan first.'
                    : 'No pages match the current filters.'}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[45vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-800 z-10">
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium w-10">#</th>
                        <th className="px-4 py-3 font-medium">URL / Topic</th>
                        <th className="px-4 py-3 font-medium">Target Topic</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 font-medium">Why</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {filteredPages.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            item.execStatus === 'done'
                              ? 'bg-green-900/5 hover:bg-green-900/10'
                              : 'hover:bg-gray-700/30'
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{index + 1}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="truncate">
                              {item.url ? (
                                <span className="text-gray-300 font-mono text-xs" title={item.url}>
                                  {(() => { try { return new URL(item.url).pathname; } catch { return item.url; } })()}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">{item.label}</span>
                              )}
                            </div>
                            {item.topicTitle && item.url && (
                              <div className="text-xs text-gray-500 mt-0.5 truncate" title={item.topicTitle}>&rarr; {item.topicTitle}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.topicTitle ? (
                              <span className="text-xs text-blue-300 line-clamp-1" title={item.topicTitle}>{item.topicTitle}</span>
                            ) : (
                              <span className="text-xs text-gray-500 italic">No topic</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionClasses(item.action)}`}>
                              {formatAction(item.action)}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <span className="text-xs text-gray-400 line-clamp-2" title={item.inventoryItem?.action_reasoning}>
                              {item.inventoryItem?.action_reasoning || '\u2014'}
                            </span>
                            {item.action === 'MERGE' && item.inventoryItem?.action_data_points && (() => {
                              const mergeTarget = item.inventoryItem.action_data_points?.find(dp => dp.label === 'Merge Target');
                              if (!mergeTarget) return null;
                              return (
                                <div className="text-[10px] text-blue-400 mt-0.5 truncate" title={mergeTarget.value}>
                                  Merge into: {mergeTarget.value}
                                </div>
                              );
                            })()}
                            {item.action === 'REDIRECT_301' && item.inventoryItem?.action_data_points && (() => {
                              const redirectTarget = item.inventoryItem.action_data_points?.find(dp => dp.label === 'Redirect Target');
                              if (!redirectTarget) return null;
                              return (
                                <div className="text-[10px] text-purple-400 mt-0.5 truncate" title={redirectTarget.value}>
                                  Redirect to: {redirectTarget.value}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getPriorityClasses(item.priority)}`}>
                              {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Unset'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${getStatusClasses(item.execStatus)}`}>
                              <span className="text-[10px]">{getStatusIcon(item.execStatus)}</span>
                              {getStatusLabel(item.execStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleActionClick(item)}
                              disabled={!onOpenWorkbench && !onCreateBrief}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                item.execStatus === 'done'
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-blue-600 text-white hover:bg-blue-500'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {getButtonLabel(item)}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* New Content Needed — collapsed by default */}
            {createNewActions.length > 0 && (
              <div className="border border-gray-700 rounded-lg bg-gray-800/30 overflow-hidden">
                <button
                  onClick={() => setCreateNewExpanded(!createNewExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-white">
                    New Content Needed
                    <span className="ml-2 text-xs text-gray-400 font-normal">({createNewActions.length})</span>
                  </h3>
                  <span className="text-gray-400 text-xs">
                    {createNewExpanded ? '\u25BE Collapse' : '\u25B8 Expand'}
                  </span>
                </button>

                {createNewExpanded && (
                  <>
                    {filteredCreateNew.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm border-t border-gray-700/50">
                        No new content items match the current filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[35vh] overflow-y-auto border-t border-gray-700/50">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-800 z-10">
                            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                              <th className="px-4 py-3 font-medium w-10">#</th>
                              <th className="px-4 py-3 font-medium">Topic</th>
                              <th className="px-4 py-3 font-medium">Action</th>
                              <th className="px-4 py-3 font-medium">Priority</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                              <th className="px-4 py-3 font-medium text-right"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {filteredCreateNew.map((item, index) => (
                              <tr key={item.id} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{index + 1}</td>
                                <td className="px-4 py-3">
                                  <span className="text-gray-300 text-xs">{item.label}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionClasses('CREATE_NEW')}`}>
                                    Create New
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getPriorityClasses(item.priority)}`}>
                                    {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Unset'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${getStatusClasses(item.execStatus)}`}>
                                    <span className="text-[10px]">{getStatusIcon(item.execStatus)}</span>
                                    {getStatusLabel(item.execStatus)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleActionClick(item)}
                                    disabled={!onCreateBrief}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-700 text-white hover:bg-cyan-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Create Brief
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Footer count */}
            {filteredQueue.length > 0 && filteredQueue.length !== actionQueue.length && (
              <div className="text-xs text-gray-500 text-center">
                Showing {filteredQueue.length} of {actionQueue.length} total actions
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};

export default ExecuteStep;
