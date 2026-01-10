// components/AuditHistoryPanel.tsx
// Displays fix history with undo capability

import React from 'react';
import { AuditFixHistoryEntry } from '../types';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

interface AuditHistoryPanelProps {
  entries: AuditFixHistoryEntry[];
  onUndo?: (historyId: string) => Promise<void>;
  isLoading: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFixTypeIcon = (category: string): string => {
  // Map category to icon
  if (category.includes('link')) return '🔗';
  if (category.includes('content')) return '📝';
  if (category.includes('nav')) return '🧭';
  if (category.includes('foundation')) return '🏗️';
  if (category.includes('semantic')) return '🔤';
  return '🔧';
};

const AuditHistoryPanel: React.FC<AuditHistoryPanelProps> = ({
  entries,
  onUndo,
  isLoading,
}) => {
  const [undoingId, setUndoingId] = React.useState<string | null>(null);

  const handleUndo = async (historyId: string) => {
    if (!onUndo) return;
    setUndoingId(historyId);
    try {
      await onUndo(historyId);
    } finally {
      setUndoingId(null);
    }
  };

  // Ensure entries is always an array
  const safeEntries = entries || [];

  if (safeEntries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-white mb-2">No Fix History</h3>
        <p className="text-gray-400 text-sm">
          Fixes you apply will appear here, allowing you to undo them if needed.
        </p>
      </div>
    );
  }

  // Group entries by date
  const groupedEntries: Record<string, AuditFixHistoryEntry[]> = {};
  for (const entry of safeEntries) {
    const dateKey = new Date(entry.applied_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!groupedEntries[dateKey]) {
      groupedEntries[dateKey] = [];
    }
    groupedEntries[dateKey].push(entry);
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([date, dateEntries]) => (
        <div key={date}>
          <h4 className="text-sm font-medium text-gray-400 mb-3">{date}</h4>
          <div className="space-y-2">
            {dateEntries.map(entry => (
              <div
                key={entry.id}
                className={`bg-gray-800/50 rounded-lg p-4 border ${
                  entry.undone_at ? 'border-gray-700 opacity-60' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {getFixTypeIcon(entry.category)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white">
                          {entry.fix_description || `Fixed: ${entry.issue_id}`}
                        </span>
                        {entry.undone_at && (
                          <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
                            Undone
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        <span className="inline-block mr-3">
                          {formatDate(entry.applied_at)}
                        </span>
                        <span className="inline-block text-gray-500">
                          {entry.category}
                        </span>
                      </div>

                      {/* Value Change Preview */}
                      {entry.changes && entry.changes.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 line-through truncate max-w-[150px]">
                              {typeof entry.changes[0].oldValue === 'object'
                                ? JSON.stringify(entry.changes[0].oldValue).slice(0, 30)
                                : String(entry.changes[0].oldValue).slice(0, 30)}
                            </span>
                            <span className="text-gray-500">→</span>
                            <span className="text-green-400 truncate max-w-[150px]">
                              {typeof entry.changes[0].newValue === 'object'
                                ? JSON.stringify(entry.changes[0].newValue).slice(0, 30)
                                : String(entry.changes[0].newValue).slice(0, 30)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Undo Button */}
                  {!entry.undone_at && onUndo && (
                    <Button
                      onClick={() => handleUndo(entry.id)}
                      disabled={isLoading || undoingId === entry.id}
                      className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 ml-4 flex-shrink-0"
                    >
                      {undoingId === entry.id ? (
                        <Loader className="w-3 h-3" />
                      ) : (
                        <>
                          <svg
                            className="w-3 h-3 mr-1 inline"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                            />
                          </svg>
                          Undo
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="bg-gray-800/30 rounded-lg p-4 text-center text-sm text-gray-400">
        {entries.filter(e => !e.undone_at).length} active fixes •{' '}
        {entries.filter(e => e.undone_at).length} undone
      </div>
    </div>
  );
};

export default AuditHistoryPanel;
