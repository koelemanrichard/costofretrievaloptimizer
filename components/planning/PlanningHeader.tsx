/**
 * PlanningHeader
 *
 * Header controls for the planning dashboard including:
 * - View mode toggle (calendar/list)
 * - Calendar mode toggle (month/week)
 * - Date navigation
 * - Filters
 * - Actions (generate plan, bulk operations)
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { PlanningFilters, PublicationStatus, PublicationPhase, PublicationPriority } from '../../types';

interface PlanningHeaderProps {
    viewMode: 'calendar' | 'list';
    calendarMode: 'month' | 'week';
    currentDate: string;
    filters: PlanningFilters;
    selectedCount: number;
    totalCount: number;
    isGeneratingPlan: boolean;
    batchLaunchDate: string | null;
    onViewModeChange: (mode: 'calendar' | 'list') => void;
    onCalendarModeChange: (mode: 'month' | 'week') => void;
    onDateChange: (date: string) => void;
    onFilterChange: (filters: PlanningFilters) => void;
    onGeneratePlan: () => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBatchLaunchDateChange: (date: string) => void;
}

const STATUS_OPTIONS: { value: PublicationStatus; label: string; color: string }[] = [
    { value: 'not_started', label: 'Not Started', color: 'bg-gray-500' },
    { value: 'brief_ready', label: 'Brief Ready', color: 'bg-blue-500' },
    { value: 'draft_in_progress', label: 'Draft In Progress', color: 'bg-yellow-500' },
    { value: 'draft_ready', label: 'Draft Ready', color: 'bg-green-500' },
    { value: 'in_review', label: 'In Review', color: 'bg-purple-500' },
    { value: 'scheduled', label: 'Scheduled', color: 'bg-indigo-500' },
    { value: 'published', label: 'Published', color: 'bg-emerald-500' },
    { value: 'needs_update', label: 'Needs Update', color: 'bg-red-500' },
];

const PHASE_OPTIONS: { value: PublicationPhase; label: string }[] = [
    { value: 'phase_1_authority', label: 'Phase 1: Authority' },
    { value: 'phase_2_support', label: 'Phase 2: Support' },
    { value: 'phase_3_expansion', label: 'Phase 3: Expansion' },
    { value: 'phase_4_longtail', label: 'Phase 4: Long-tail' },
];

const PRIORITY_OPTIONS: { value: PublicationPriority; label: string; color: string }[] = [
    { value: 'critical', label: 'Critical', color: 'text-red-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'low', label: 'Low', color: 'text-gray-400' },
];

const PlanningHeader: React.FC<PlanningHeaderProps> = ({
    viewMode,
    calendarMode,
    currentDate,
    filters,
    selectedCount,
    totalCount,
    isGeneratingPlan,
    batchLaunchDate,
    onViewModeChange,
    onCalendarModeChange,
    onDateChange,
    onFilterChange,
    onGeneratePlan,
    onSelectAll,
    onClearSelection,
    onBatchLaunchDateChange,
}) => {
    const [showFilters, setShowFilters] = useState(false);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, search: e.target.value || undefined });
    };

    const handleStatusToggle = (status: PublicationStatus) => {
        const current = filters.status || [];
        const newStatuses = current.includes(status)
            ? current.filter(s => s !== status)
            : [...current, status];
        onFilterChange({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
    };

    const handlePhaseToggle = (phase: PublicationPhase) => {
        const current = filters.phase || [];
        const newPhases = current.includes(phase)
            ? current.filter(p => p !== phase)
            : [...current, phase];
        onFilterChange({ ...filters, phase: newPhases.length > 0 ? newPhases : undefined });
    };

    const handlePriorityToggle = (priority: PublicationPriority) => {
        const current = filters.priority || [];
        const newPriorities = current.includes(priority)
            ? current.filter(p => p !== priority)
            : [...current, priority];
        onFilterChange({ ...filters, priority: newPriorities.length > 0 ? newPriorities : undefined });
    };

    const handleClearFilters = () => {
        onFilterChange({});
    };

    const hasActiveFilters = filters.status?.length || filters.phase?.length ||
        filters.priority?.length || filters.search || filters.date_range;

    // Navigate to previous/next period
    const navigateDate = (direction: 'prev' | 'next') => {
        const current = new Date(currentDate);
        const days = viewMode === 'calendar' && calendarMode === 'week' ? 7 : 30;
        current.setDate(current.getDate() + (direction === 'next' ? days : -days));
        onDateChange(current.toISOString().split('T')[0]);
    };

    return (
        <div className="border-b border-gray-700 bg-gray-800/50">
            {/* Main toolbar */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                    {/* View mode toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-gray-600">
                        <button
                            onClick={() => onViewModeChange('list')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => onViewModeChange('calendar')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'calendar'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            Calendar
                        </button>
                    </div>

                    {/* Calendar mode toggle (only when in calendar view) */}
                    {viewMode === 'calendar' && (
                        <div className="flex rounded-lg overflow-hidden border border-gray-600">
                            <button
                                onClick={() => onCalendarModeChange('month')}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${calendarMode === 'month'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                Month
                            </button>
                            <button
                                onClick={() => onCalendarModeChange('week')}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${calendarMode === 'week'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                Week
                            </button>
                        </div>
                    )}

                    {/* Date navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigateDate('prev')}
                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <input
                            type="date"
                            value={currentDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                        <button
                            onClick={() => navigateDate('next')}
                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                        >
                            Today
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search topics..."
                            value={filters.search || ''}
                            onChange={handleSearchChange}
                            className="bg-gray-700 border border-gray-600 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-400 w-64"
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hasActiveFilters
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-600'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filters
                        {hasActiveFilters && (
                            <span className="bg-blue-600 text-white text-xs px-1.5 rounded-full">
                                {(filters.status?.length || 0) + (filters.phase?.length || 0) + (filters.priority?.length || 0)}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {/* Selection info */}
                    {selectedCount > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">{selectedCount} selected</span>
                            <button
                                onClick={onClearSelection}
                                className="text-gray-400 hover:text-white"
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Batch launch date */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Launch Date:</span>
                        <input
                            type="date"
                            value={batchLaunchDate || ''}
                            onChange={(e) => onBatchLaunchDateChange(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                    </div>

                    {/* Generate plan button */}
                    <Button
                        onClick={onGeneratePlan}
                        disabled={isGeneratingPlan}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isGeneratingPlan ? 'Generating...' : 'Generate Plan'}
                    </Button>
                </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/30">
                    <div className="flex flex-wrap gap-6">
                        {/* Status filters */}
                        <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Status</h4>
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleStatusToggle(opt.value)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${filters.status?.includes(opt.value)
                                            ? 'bg-gray-600 text-white'
                                            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Phase filters */}
                        <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Phase</h4>
                            <div className="flex flex-wrap gap-2">
                                {PHASE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handlePhaseToggle(opt.value)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filters.phase?.includes(opt.value)
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority filters */}
                        <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Priority</h4>
                            <div className="flex flex-wrap gap-2">
                                {PRIORITY_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handlePriorityToggle(opt.value)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filters.priority?.includes(opt.value)
                                            ? 'bg-gray-600 text-white'
                                            : `bg-gray-700/50 ${opt.color} hover:bg-gray-700`
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="self-end text-xs text-gray-400 hover:text-white"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanningHeader;
