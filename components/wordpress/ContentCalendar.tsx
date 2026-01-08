// components/wordpress/ContentCalendar.tsx
// Calendar view for content publication scheduling and tracking

import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import { useAppState } from '../../state/appState';
import { Loader } from '../ui/Loader';
import {
  CalendarEntry,
  PublicationStatus,
  WordPressPublication
} from '../../types/wordpress';
import { EnrichedTopic } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface ContentCalendarProps {
  projectId: string;
  topics: EnrichedTopic[];
  onTopicClick?: (topicId: string) => void;
  onPublicationClick?: (publication: WordPressPublication) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
}

// ============================================================================
// Component
// ============================================================================

export const ContentCalendar: React.FC<ContentCalendarProps> = ({
  projectId,
  topics,
  onTopicClick,
  onPublicationClick
}) => {
  const { state } = useAppState();

  // Get supabase client - memoized to prevent unnecessary re-renders
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [publications, setPublications] = useState<WordPressPublication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week'>('month');

  // Load publications
  useEffect(() => {
    if (!supabase || !projectId) return;

    const loadPublications = async () => {
      setIsLoading(true);
      try {
        // Get topic IDs for this project
        const topicIds = topics.map(t => t.id);

        if (topicIds.length === 0) {
          setPublications([]);
          return;
        }

        // Note: wordpress_publications table may not be in the generated types yet
        // Using type assertion since the table exists in the database
        const { data } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { in: (col: string, values: string[]) => Promise<{ data: WordPressPublication[] | null }> } } })
          .from('wordpress_publications')
          .select('*')
          .in('topic_id', topicIds);

        setPublications(data || []);
      } catch (error) {
        console.error('[Calendar] Failed to load publications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPublications();
  }, [supabase, projectId, topics]);

  // Build calendar entries
  const entries = useMemo((): CalendarEntry[] => {
    const result: CalendarEntry[] = [];

    // Add publications
    publications.forEach(pub => {
      const topic = topics.find(t => t.id === pub.topic_id);
      if (!topic) return;

      const date = pub.published_at || pub.scheduled_at || pub.created_at;
      if (!date) return;

      let type: CalendarEntry['type'] = 'draft';
      if (pub.status === 'published') type = 'published';
      else if (pub.status === 'scheduled') type = 'scheduled';
      else if (pub.status === 'draft') type = 'draft';

      result.push({
        topic_id: pub.topic_id,
        topic_title: topic.title,
        date: date.split('T')[0],
        type,
        publication: {
          connection_id: pub.connection_id,
          site_url: '', // Would need to join with connections
          wp_post_url: pub.wp_post_url,
          status: pub.status
        }
      });
    });

    // Add planned topics (topics with planned_publication_date but no publication)
    topics.forEach(topic => {
      const hasPublication = publications.some(p => p.topic_id === topic.id);
      const plannedDate = (topic.metadata as { planned_publication_date?: string } | undefined)?.planned_publication_date;

      if (!hasPublication && plannedDate) {
        result.push({
          topic_id: topic.id,
          topic_title: topic.title,
          date: plannedDate,
          type: 'planned'
        });
      }
    });

    return result;
  }, [topics, publications]);

  // Build calendar grid
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the Sunday before the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on the Saturday after the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEntries = entries.filter(e => e.date === dateStr);

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.getTime() === today.getTime(),
        entries: dayEntries
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, entries]);

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format month/year
  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Stats
  const stats = useMemo(() => {
    const thisMonth = entries.filter(e => {
      const date = new Date(e.date);
      return date.getMonth() === currentDate.getMonth() &&
             date.getFullYear() === currentDate.getFullYear();
    });

    return {
      published: thisMonth.filter(e => e.type === 'published').length,
      scheduled: thisMonth.filter(e => e.type === 'scheduled').length,
      drafts: thisMonth.filter(e => e.type === 'draft').length,
      planned: thisMonth.filter(e => e.type === 'planned').length
    };
  }, [entries, currentDate]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            Content Calendar
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm rounded ${view === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm rounded ${view === 'week' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Week
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
            </button>
            <h3 className="text-lg font-medium text-white min-w-[180px] text-center">
              {monthYear}
            </h3>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded hover:border-gray-600"
            >
              Today
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <StatusDot status="published" />
              <span className="text-gray-400">{stats.published} published</span>
            </div>
            <div className="flex items-center gap-1">
              <StatusDot status="scheduled" />
              <span className="text-gray-400">{stats.scheduled} scheduled</span>
            </div>
            <div className="flex items-center gap-1">
              <StatusDot status="draft" />
              <span className="text-gray-400">{stats.drafts} drafts</span>
            </div>
            <div className="flex items-center gap-1">
              <StatusDot status="planned" />
              <span className="text-gray-400">{stats.planned} planned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6" />
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && (
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <CalendarDayCell
                key={index}
                day={day}
                onEntryClick={(entry) => {
                  if (entry.publication) {
                    // Find full publication
                    const pub = publications.find(p => p.topic_id === entry.topic_id);
                    if (pub) onPublicationClick?.(pub);
                  } else {
                    onTopicClick?.(entry.topic_id);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <StatusDot status="published" />
            <span>Published</span>
          </div>
          <div className="flex items-center gap-1">
            <StatusDot status="scheduled" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <StatusDot status="draft" />
            <span>Draft</span>
          </div>
          <div className="flex items-center gap-1">
            <StatusDot status="planned" />
            <span>Planned</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Calendar Day Cell
// ============================================================================

interface CalendarDayCellProps {
  day: CalendarDay;
  onEntryClick: (entry: CalendarEntry) => void;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ day, onEntryClick }) => {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 2;
  const hasMore = day.entries.length > maxVisible;

  return (
    <div
      className={`min-h-[100px] p-1 border rounded ${
        day.isCurrentMonth
          ? day.isToday
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-800 bg-gray-800/30'
          : 'border-gray-800/50 bg-gray-900/50'
      }`}
    >
      {/* Date number */}
      <div className={`text-sm font-medium mb-1 px-1 ${
        day.isToday
          ? 'text-blue-400'
          : day.isCurrentMonth
            ? 'text-gray-300'
            : 'text-gray-600'
      }`}>
        {day.date.getDate()}
      </div>

      {/* Entries */}
      <div className="space-y-0.5">
        {(showAll ? day.entries : day.entries.slice(0, maxVisible)).map((entry, idx) => (
          <button
            key={idx}
            onClick={() => onEntryClick(entry)}
            className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-colors ${getEntryClasses(entry.type)}`}
            title={entry.topic_title}
          >
            <StatusDot status={entry.type} className="inline-block mr-1" />
            {entry.topic_title}
          </button>
        ))}

        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-left px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-400"
          >
            +{day.entries.length - maxVisible} more
          </button>
        )}

        {hasMore && showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full text-left px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-400"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

interface StatusDotProps {
  status: CalendarEntry['type'] | PublicationStatus;
  className?: string;
}

const StatusDot: React.FC<StatusDotProps> = ({ status, className = '' }) => {
  const colorMap: Record<string, string> = {
    published: 'bg-green-400',
    scheduled: 'bg-yellow-400',
    draft: 'bg-gray-400',
    planned: 'bg-blue-400',
    pending_review: 'bg-orange-400',
    unpublished: 'bg-red-400',
    trashed: 'bg-red-600'
  };

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colorMap[status] || 'bg-gray-400'} ${className}`} />
  );
};

function getEntryClasses(type: CalendarEntry['type']): string {
  switch (type) {
    case 'published':
      return 'bg-green-500/20 text-green-300 hover:bg-green-500/30';
    case 'scheduled':
      return 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30';
    case 'draft':
      return 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30';
    case 'planned':
      return 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30';
  }
}

// ============================================================================
// Icons
// ============================================================================

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

export default ContentCalendar;
