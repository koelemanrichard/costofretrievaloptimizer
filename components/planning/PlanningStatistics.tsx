/**
 * PlanningStatistics
 *
 * Summary cards showing publication progress and phase distribution.
 */

import React from 'react';
import { PublicationPlanResult, PublicationPhase } from '../../types';

interface ProgressData {
    total: number;
    published: number;
    percentage: number;
    byPhase: Record<PublicationPhase, { total: number; published: number; percentage: number }>;
}

interface PlanningStatisticsProps {
    progress: ProgressData;
    planResult: PublicationPlanResult | null;
}

const PHASE_CONFIG: Record<PublicationPhase, { label: string; color: string; bgColor: string }> = {
    'phase_1_authority': {
        label: 'Authority',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20'
    },
    'phase_2_support': {
        label: 'Support',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20'
    },
    'phase_3_expansion': {
        label: 'Expansion',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20'
    },
    'phase_4_longtail': {
        label: 'Long-tail',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20'
    }
};

const PlanningStatistics: React.FC<PlanningStatisticsProps> = ({ progress, planResult }) => {
    return (
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/30">
            <div className="flex items-center gap-6">
                {/* Overall progress */}
                <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                className="text-gray-700"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={`${progress.percentage * 1.76} 176`}
                                className="text-green-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold text-white">{progress.percentage}%</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-400">Published</div>
                        <div className="text-xl font-semibold text-white">
                            {progress.published} / {progress.total}
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-gray-700" />

                {/* Phase breakdown */}
                <div className="flex items-center gap-4">
                    {(Object.entries(PHASE_CONFIG) as [PublicationPhase, typeof PHASE_CONFIG[PublicationPhase]][]).map(([phase, config]) => {
                        const phaseProgress = progress.byPhase[phase];
                        if (!phaseProgress || phaseProgress.total === 0) return null;

                        return (
                            <div
                                key={phase}
                                className={`px-3 py-2 rounded-lg ${config.bgColor}`}
                            >
                                <div className={`text-xs font-medium ${config.color} uppercase tracking-wide`}>
                                    {config.label}
                                </div>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-lg font-semibold text-white">
                                        {phaseProgress.published}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        / {phaseProgress.total}
                                    </span>
                                </div>
                                {/* Mini progress bar */}
                                <div className="w-full h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className={`h-full ${config.color.replace('text-', 'bg-')}`}
                                        style={{ width: `${phaseProgress.percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-gray-700" />

                {/* Plan summary */}
                {planResult && (
                    <div className="flex items-center gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Duration: </span>
                            <span className="text-white font-medium">
                                {planResult.summary.total_duration_weeks} weeks
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Batch Launch: </span>
                            <span className="text-white font-medium">
                                {formatDate(planResult.summary.batch_launch_date)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

export default PlanningStatistics;
