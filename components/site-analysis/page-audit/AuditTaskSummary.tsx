import React from 'react';
import { AuditTask } from '../../../types';

interface AuditTaskSummaryProps {
    tasks: AuditTask[];
}

export const AuditTaskSummary: React.FC<AuditTaskSummaryProps> = ({ tasks }) => {
    if (tasks.length === 0) return null;

    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const dismissed = tasks.filter(t => t.status === 'dismissed').length;

    return (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Task Status</span>
                <div className="flex items-center gap-3 text-xs">
                    {pending > 0 && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            <span className="text-yellow-400">{pending} pending</span>
                        </span>
                    )}
                    {inProgress > 0 && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-blue-400">{inProgress} in progress</span>
                        </span>
                    )}
                    {completed > 0 && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-green-400">{completed} completed</span>
                        </span>
                    )}
                    {dismissed > 0 && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            <span className="text-gray-400">{dismissed} dismissed</span>
                        </span>
                    )}
                </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                {completed > 0 && (
                    <div className="bg-green-500 h-full" style={{ width: `${(completed / tasks.length) * 100}%` }}></div>
                )}
                {inProgress > 0 && (
                    <div className="bg-blue-500 h-full" style={{ width: `${(inProgress / tasks.length) * 100}%` }}></div>
                )}
                {pending > 0 && (
                    <div className="bg-yellow-500 h-full" style={{ width: `${(pending / tasks.length) * 100}%` }}></div>
                )}
                {dismissed > 0 && (
                    <div className="bg-gray-500 h-full" style={{ width: `${(dismissed / tasks.length) * 100}%` }}></div>
                )}
            </div>
        </div>
    );
};
