// components/insights/tabs/ActionCenterTab.tsx
// Action Center - Prioritized, actionable task list

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ActionButton } from '../widgets';
import type { AggregatedInsights, ActionItem, InsightActionType } from '../../../types/insights';

interface ActionCenterTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

type ActionFilter = 'all' | 'critical' | 'high' | 'medium' | 'backlog' | 'completed';

export const ActionCenterTab: React.FC<ActionCenterTabProps> = ({
  insights,
  mapId,
  onRefresh,
  onAction,
  actionLoading,
}) => {
  const { actionCenter } = insights;
  const [filter, setFilter] = useState<ActionFilter>('all');
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // Combine all actions
  const allActions = [
    ...actionCenter.criticalActions,
    ...actionCenter.highPriorityActions,
    ...actionCenter.mediumPriorityActions,
    ...actionCenter.backlogActions,
  ];

  // Filter actions
  const filteredActions = filter === 'all'
    ? allActions
    : filter === 'completed'
      ? actionCenter.completedActions
      : allActions.filter(a => a.priority === filter);

  // Count by priority
  const counts = {
    critical: actionCenter.criticalActions.length,
    high: actionCenter.highPriorityActions.length,
    medium: actionCenter.mediumPriorityActions.length,
    backlog: actionCenter.backlogActions.length,
    completed: actionCenter.completedActions.length,
  };

  const priorityConfig = {
    critical: {
      label: 'Critical',
      bg: 'bg-red-900/30',
      border: 'border-red-700/50',
      text: 'text-red-400',
      badge: 'bg-red-500/20 text-red-400',
    },
    high: {
      label: 'High Priority',
      bg: 'bg-orange-900/30',
      border: 'border-orange-700/50',
      text: 'text-orange-400',
      badge: 'bg-orange-500/20 text-orange-400',
    },
    medium: {
      label: 'Medium Priority',
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-700/50',
      text: 'text-yellow-400',
      badge: 'bg-yellow-500/20 text-yellow-400',
    },
    backlog: {
      label: 'Backlog',
      bg: 'bg-gray-800/50',
      border: 'border-gray-700',
      text: 'text-gray-400',
      badge: 'bg-gray-700 text-gray-400',
    },
  };

  const effortConfig = {
    low: { label: 'Low Effort', bg: 'bg-green-500/20', text: 'text-green-400' },
    medium: { label: 'Medium Effort', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    high: { label: 'High Effort', bg: 'bg-red-500/20', text: 'text-red-400' },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => setFilter('critical')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'critical' ? 'bg-red-900/40 border-red-600' : 'bg-red-900/20 border-red-700/50 hover:border-red-600'
          }`}
        >
          <div className="text-2xl font-bold text-red-400">{counts.critical}</div>
          <div className="text-sm text-gray-400">Critical</div>
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'high' ? 'bg-orange-900/40 border-orange-600' : 'bg-orange-900/20 border-orange-700/50 hover:border-orange-600'
          }`}
        >
          <div className="text-2xl font-bold text-orange-400">{counts.high}</div>
          <div className="text-sm text-gray-400">High</div>
        </button>
        <button
          onClick={() => setFilter('medium')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'medium' ? 'bg-yellow-900/40 border-yellow-600' : 'bg-yellow-900/20 border-yellow-700/50 hover:border-yellow-600'
          }`}
        >
          <div className="text-2xl font-bold text-yellow-400">{counts.medium}</div>
          <div className="text-sm text-gray-400">Medium</div>
        </button>
        <button
          onClick={() => setFilter('backlog')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'backlog' ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className="text-2xl font-bold text-gray-400">{counts.backlog}</div>
          <div className="text-sm text-gray-400">Backlog</div>
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'completed' ? 'bg-green-900/40 border-green-600' : 'bg-green-900/20 border-green-700/50 hover:border-green-600'
          }`}
        >
          <div className="text-2xl font-bold text-green-400">{counts.completed}</div>
          <div className="text-sm text-gray-400">Done</div>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
        {(['all', 'critical', 'high', 'medium', 'backlog', 'completed'] as ActionFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && f !== 'completed' && (
              <span className="ml-1 text-xs opacity-70">
                ({counts[f as keyof typeof counts]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action List */}
      {filteredActions.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-green-400 font-medium">
            {filter === 'completed' ? 'No completed actions yet' : 'No actions in this category'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {filter === 'all' ? 'Run audits to generate actionable insights.' : 'Great job keeping up!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredActions.map((action) => {
            const config = priorityConfig[action.priority];
            const effort = effortConfig[action.effort];
            const isExpanded = expandedAction === action.id;

            return (
              <Card
                key={action.id}
                className={`overflow-hidden border ${config.border} ${
                  action.status === 'completed' ? 'opacity-60' : ''
                }`}
              >
                <div
                  className={`p-4 ${config.bg} cursor-pointer`}
                  onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {action.status === 'completed' ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          action.priority === 'critical' ? 'border-red-400' :
                          action.priority === 'high' ? 'border-orange-400' :
                          action.priority === 'medium' ? 'border-yellow-400' :
                          'border-gray-400'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{action.what}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
                          {config.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${effort.bg} ${effort.text}`}>
                          {effort.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{action.why}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {action.implementable && action.actionType && action.status !== 'completed' && (
                        <ActionButton
                          label={actionLoading === action.actionType ? 'Working...' : 'Implement'}
                          actionType={action.actionType}
                          onClick={() => onAction?.(action.actionType!, action.actionPayload)}
                          variant="primary"
                          size="sm"
                          disabled={!!actionLoading}
                        />
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="text-xs font-medium text-gray-400 mb-1">WHY</h5>
                        <p className="text-sm text-gray-300">{action.why}</p>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-400 mb-1">HOW</h5>
                        <p className="text-sm text-gray-300">{action.how}</p>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-400 mb-1">SOURCE</h5>
                        <p className="text-sm text-gray-300 capitalize">{action.source.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Added: {new Date(action.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      {action.status !== 'completed' && (
                        <>
                          <Button variant="secondary" className="text-sm">
                            Dismiss
                          </Button>
                          <Button variant="primary" className="text-sm">
                            Mark Complete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Explanation Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4m0-4h.01" />
          </svg>
          How Actions Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="font-medium text-white">Critical</span>
            </div>
            <p className="text-gray-400">
              Issues that may be actively hurting your SEO. Address immediately.
            </p>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <span className="font-medium text-white">High Priority</span>
            </div>
            <p className="text-gray-400">
              Important improvements. Plan to complete this week.
            </p>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="font-medium text-white">Medium Priority</span>
            </div>
            <p className="text-gray-400">
              Good-to-do items. Schedule for this month.
            </p>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="font-medium text-white">Backlog</span>
            </div>
            <p className="text-gray-400">
              Nice-to-have improvements. Consider when you have time.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
