// components/insights/TopicSuggestionModal.tsx
// Modal for selecting which suggested topics to add to the map

import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';

interface TopicSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  existingTopicTitles?: string[]; // Titles of topics that already exist
  onConfirm: (selectedTopics: string[]) => Promise<void>;
  isLoading?: boolean;
}

export const TopicSuggestionModal: React.FC<TopicSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  existingTopicTitles = [],
  onConfirm,
  isLoading = false,
}) => {
  // Create a set of existing titles (lowercase for comparison)
  const existingTitlesSet = useMemo(() => {
    return new Set(existingTopicTitles.map(t => t.toLowerCase()));
  }, [existingTopicTitles]);

  // Check if a topic already exists
  const topicExists = (topic: string) => existingTitlesSet.has(topic.toLowerCase());

  const [selections, setSelections] = useState<Record<string, boolean>>(() => {
    // Initialize: select new topics, deselect existing ones
    const initial: Record<string, boolean> = {};
    suggestions.forEach(s => {
      initial[s] = !topicExists(s); // Don't select if already exists
    });
    return initial;
  });

  // Reset selections when suggestions change
  React.useEffect(() => {
    const initial: Record<string, boolean> = {};
    suggestions.forEach(s => {
      initial[s] = !topicExists(s); // Don't select if already exists
    });
    setSelections(initial);
  }, [suggestions, existingTitlesSet]);

  // Count new topics (not existing)
  const newTopicsCount = useMemo(() => {
    return suggestions.filter(s => !topicExists(s)).length;
  }, [suggestions, existingTitlesSet]);

  const existingCount = suggestions.length - newTopicsCount;

  const selectedCount = useMemo(() => {
    return suggestions.filter(s => selections[s] && !topicExists(s)).length;
  }, [selections, suggestions, existingTitlesSet]);

  const handleToggle = (topic: string) => {
    // Don't allow toggling existing topics
    if (topicExists(topic)) return;

    setSelections(prev => ({
      ...prev,
      [topic]: !prev[topic]
    }));
  };

  const handleSelectAll = () => {
    const newSelections: Record<string, boolean> = {};
    suggestions.forEach(s => {
      newSelections[s] = !topicExists(s); // Only select new topics
    });
    setSelections(newSelections);
  };

  const handleDeselectAll = () => {
    const newSelections: Record<string, boolean> = {};
    suggestions.forEach(s => { newSelections[s] = false; });
    setSelections(newSelections);
  };

  const handleConfirm = async () => {
    // Only pass topics that are selected AND don't already exist
    const selectedTopics = suggestions.filter(s => selections[s] && !topicExists(s));
    if (selectedTopics.length > 0) {
      await onConfirm(selectedTopics);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Add Suggested Topics</h2>
              <p className="text-sm text-gray-400 mt-1">
                {newTopicsCount > 0 ? (
                  <>
                    {selectedCount} of {newTopicsCount} new topic{newTopicsCount !== 1 ? 's' : ''} selected
                    {existingCount > 0 && (
                      <span className="text-yellow-500 ml-1">
                        ({existingCount} already exist)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-yellow-500">All topics already exist in your map</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="px-6 py-2 border-b border-gray-700/50 flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="text-xs text-blue-400 hover:text-blue-300"
            disabled={isLoading || newTopicsCount === 0}
          >
            Select All New
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={handleDeselectAll}
            className="text-xs text-blue-400 hover:text-blue-300"
            disabled={isLoading}
          >
            Deselect All
          </button>
        </div>

        {/* Info banner about orphan topics */}
        <div className="px-6 py-2 bg-blue-900/30 border-b border-blue-700/30">
          <p className="text-xs text-blue-300">
            Topics will be added as "orphan topics" without a parent. You can assign parents later in the Topic Manager.
          </p>
        </div>

        {/* Topic List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {suggestions.map((topic) => {
              const exists = topicExists(topic);
              return (
                <label
                  key={topic}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-colors
                    ${exists
                      ? 'bg-gray-700/20 border border-gray-700/50 cursor-not-allowed opacity-60'
                      : selections[topic]
                        ? 'bg-blue-500/20 border border-blue-500/30 cursor-pointer'
                        : 'bg-gray-700/30 border border-gray-700 hover:bg-gray-700/50 cursor-pointer'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selections[topic] || false}
                    onChange={() => handleToggle(topic)}
                    disabled={isLoading || exists}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
                  />
                  <span className={`text-sm flex-1 ${exists ? 'text-gray-500' : selections[topic] ? 'text-white' : 'text-gray-300'}`}>
                    {topic}
                  </span>
                  {exists && (
                    <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                      Already exists
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {selectedCount === 0
              ? newTopicsCount === 0
                ? 'No new topics to add'
                : 'No topics selected'
              : `${selectedCount} new topic${selectedCount !== 1 ? 's' : ''} will be added as orphans`
            }
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add {selectedCount} Topic{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicSuggestionModal;
