/**
 * PlanningCalendar
 *
 * Calendar view for publication planning.
 * Shows topics distributed across dates in month or week view.
 */

import React, { useMemo } from 'react';
import {
    EnrichedTopic,
    PublicationPlanResult,
    PublicationPhase,
    PublicationPriority
} from '../../types';

interface PlanningCalendarProps {
    topics: EnrichedTopic[];
    currentDate: string;
    calendarMode: 'month' | 'week';
    planResult: PublicationPlanResult | null;
    onDateChange: (date: string) => void;
}

const PHASE_COLORS: Record<PublicationPhase, string> = {
    'phase_1_authority': 'bg-red-500',
    'phase_2_support': 'bg-orange-500',
    'phase_3_expansion': 'bg-yellow-500',
    'phase_4_longtail': 'bg-blue-500',
};

const PRIORITY_BORDERS: Record<PublicationPriority, string> = {
    'critical': 'border-l-red-500',
    'high': 'border-l-orange-500',
    'medium': 'border-l-yellow-500',
    'low': 'border-l-gray-500',
};

const PlanningCalendar: React.FC<PlanningCalendarProps> = ({
    topics,
    currentDate,
    calendarMode,
    planResult,
    onDateChange
}) => {
    const currentDateObj = new Date(currentDate);

    // Build plan lookup
    const planByTopic = useMemo(() => {
        if (!planResult) return new Map();
        return new Map(planResult.topics.map(p => [p.topic_id, p]));
    }, [planResult]);

    // Group topics by date
    const topicsByDate = useMemo(() => {
        const grouped = new Map<string, EnrichedTopic[]>();

        topics.forEach(topic => {
            const plan = topic.metadata?.publication_plan || planByTopic.get(topic.id);
            const date = plan?.optimal_publication_date;

            if (date) {
                const existing = grouped.get(date) || [];
                existing.push(topic);
                grouped.set(date, existing);
            }
        });

        return grouped;
    }, [topics, planByTopic]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (calendarMode === 'month') {
            // Get first day of month
            const firstDay = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth(), 1);
            // Get last day of month
            const lastDay = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() + 1, 0);

            // Start from Sunday of the week containing the first day
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - startDate.getDay());

            // End on Saturday of the week containing the last day
            const endDate = new Date(lastDay);
            endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                days.push({
                    date: new Date(d),
                    dateStr: formatDateISO(d),
                    isCurrentMonth: d.getMonth() === currentDateObj.getMonth(),
                    isToday: d.getTime() === today.getTime()
                });
            }
        } else {
            // Week view: Get Monday to Sunday of current week
            const startOfWeek = new Date(currentDateObj);
            const dayOfWeek = startOfWeek.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is first day
            startOfWeek.setDate(startOfWeek.getDate() + diff);

            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(d.getDate() + i);
                days.push({
                    date: d,
                    dateStr: formatDateISO(d),
                    isCurrentMonth: true,
                    isToday: d.getTime() === today.getTime()
                });
            }
        }

        return days;
    }, [currentDate, calendarMode]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="h-full flex flex-col">
            {/* Calendar header */}
            <div className="flex items-center justify-center py-2 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">
                    {calendarMode === 'month'
                        ? currentDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : `Week of ${calendarDays[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    }
                </h2>
            </div>

            {/* Day headers */}
            <div className={`grid ${calendarMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'} border-b border-gray-700`}>
                {dayNames.map(day => (
                    <div key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-400 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className={`flex-1 grid ${calendarMode === 'month' ? 'grid-cols-7 grid-rows-6' : 'grid-cols-7'} overflow-hidden`}>
                {calendarDays.map(({ date, dateStr, isCurrentMonth, isToday }) => {
                    const dayTopics = topicsByDate.get(dateStr) || [];

                    return (
                        <div
                            key={dateStr}
                            className={`border-r border-b border-gray-700 ${isCurrentMonth ? 'bg-gray-900' : 'bg-gray-900/50'
                                } ${calendarMode === 'week' ? 'min-h-[300px]' : 'min-h-[100px]'} overflow-hidden`}
                        >
                            {/* Date header */}
                            <div className={`px-2 py-1 text-right ${isToday ? 'bg-blue-900/30' : ''}`}>
                                <span className={`text-sm ${isToday
                                    ? 'bg-blue-600 text-white px-1.5 py-0.5 rounded-full'
                                    : isCurrentMonth
                                        ? 'text-gray-300'
                                        : 'text-gray-600'
                                    }`}>
                                    {date.getDate()}
                                </span>
                            </div>

                            {/* Topics for this date */}
                            <div className="px-1 pb-1 space-y-0.5 overflow-y-auto max-h-[calc(100%-28px)]">
                                {dayTopics.slice(0, calendarMode === 'month' ? 3 : 10).map(topic => {
                                    const plan = topic.metadata?.publication_plan || planByTopic.get(topic.id);
                                    const phase = plan?.phase;
                                    const priority = plan?.priority;

                                    return (
                                        <div
                                            key={topic.id}
                                            className={`px-1.5 py-0.5 rounded text-xs truncate cursor-pointer
                                                ${phase ? PHASE_COLORS[phase] + '/20' : 'bg-gray-700'}
                                                ${priority ? 'border-l-2 ' + PRIORITY_BORDERS[priority] : ''}
                                                hover:bg-gray-600
                                            `}
                                            title={`${topic.title}\nPhase: ${phase || 'N/A'}\nPriority: ${priority || 'N/A'}`}
                                        >
                                            <span className={`${phase ? PHASE_COLORS[phase].replace('bg-', 'text-').replace('-500', '-300') : 'text-gray-300'}`}>
                                                {topic.title}
                                            </span>
                                        </div>
                                    );
                                })}
                                {dayTopics.length > (calendarMode === 'month' ? 3 : 10) && (
                                    <div className="text-xs text-gray-500 text-center">
                                        +{dayTopics.length - (calendarMode === 'month' ? 3 : 10)} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 py-2 border-t border-gray-700 bg-gray-800/50">
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">Phase:</span>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-red-500/50" />
                        <span className="text-gray-400">P1</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-orange-500/50" />
                        <span className="text-gray-400">P2</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-yellow-500/50" />
                        <span className="text-gray-400">P3</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-blue-500/50" />
                        <span className="text-gray-400">P4</span>
                    </div>
                </div>
                <div className="w-px h-4 bg-gray-700" />
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">Priority:</span>
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-3 rounded bg-red-500" />
                        <span className="text-gray-400">Critical</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-3 rounded bg-orange-500" />
                        <span className="text-gray-400">High</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-3 rounded bg-yellow-500" />
                        <span className="text-gray-400">Medium</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-3 rounded bg-gray-500" />
                        <span className="text-gray-400">Low</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
}

export default PlanningCalendar;
