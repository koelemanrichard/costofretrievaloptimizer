import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AuditTask } from '../../../types';

interface AuditTaskListProps {
    tasks: AuditTask[];
    expandedTaskIds: Set<string>;
    onToggleExpand: (taskId: string) => void;
    onExpandAll: (taskIds: string[]) => void;
    onCollapseAll: (taskIds: string[]) => void;
    onUpdateStatus: (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'dismissed') => void;
    onSuggestionClick: (task: AuditTask) => void;
    isUpdatingTask: string | null;
}

export const AuditTaskList: React.FC<AuditTaskListProps> = ({
    tasks,
    expandedTaskIds,
    onToggleExpand,
    onExpandAll,
    onCollapseAll,
    onUpdateStatus,
    onSuggestionClick,
    isUpdatingTask
}) => {
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

    if (pendingTasks.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>Open Tasks</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                        {pendingTasks.length}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onExpandAll(pendingTasks.map(t => t.id))}
                        className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={() => onCollapseAll(pendingTasks.map(t => t.id))}
                        className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                    >
                        Collapse All
                    </button>
                </div>
            </h4>
            <div className="space-y-2">
                {pendingTasks.map(task => {
                    const isExpanded = expandedTaskIds.has(task.id);
                    const hasRemediation = task.remediation && task.remediation.trim().length > 0;
                    const remediationPreview = hasRemediation
                        ? task.remediation.replace(/[#*_`\[\]]/g, '').substring(0, 80) + (task.remediation.length > 80 ? '...' : '')
                        : '';

                    return (
                        <div
                            key={task.id}
                            className={`rounded-lg border ${task.priority === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                                task.priority === 'high' ? 'border-orange-500/30 bg-orange-500/5' :
                                    'border-gray-700 bg-gray-800/50'
                                }`}
                        >
                            {/* Collapsible Header */}
                            <div
                                className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={() => onToggleExpand(task.id)}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-gray-500 text-xs flex-shrink-0">
                                            {isExpanded ? '▼' : '▶'}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                            task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {task.priority}
                                        </span>
                                        <span className="text-sm font-medium text-white truncate">{task.title}</span>
                                        {!isExpanded && hasRemediation && (
                                            <span className="text-xs text-purple-400/70 truncate ml-1 hidden sm:inline">
                                                — {remediationPreview}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {hasRemediation && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400" title="AI suggestion applied">
                                                🤖
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'completed'); }}
                                            disabled={isUpdatingTask === task.id}
                                            className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                                        >
                                            Done
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSuggestionClick(task);
                                            }}
                                            className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                                        >
                                            🤖
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && hasRemediation && (
                                <div className="px-3 pb-3 border-t border-gray-700/50">
                                    <div className="pt-2 text-xs text-purple-400 prose prose-xs max-w-none">
                                        <ReactMarkdown>{task.remediation}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
