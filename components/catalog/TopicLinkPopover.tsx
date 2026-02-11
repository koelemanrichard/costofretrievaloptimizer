/**
 * TopicLinkPopover - Lightweight popover to link/unlink a category to a topic
 *
 * Shows searchable topic list with type badges. Positioned near the clicked element.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { EnrichedTopic } from '../../types';

interface TopicLinkPopoverProps {
  categoryId: string;
  currentTopicId: string | null;
  topics: EnrichedTopic[];
  anchorPosition: { top: number; left: number };
  onLink: (categoryId: string, topicId: string | null) => void;
  onClose: () => void;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  core: { label: 'Core', className: 'bg-blue-900/40 text-blue-300' },
  outer: { label: 'Outer', className: 'bg-purple-900/40 text-purple-300' },
  child: { label: 'Child', className: 'bg-gray-800 text-gray-400' },
};

const TopicLinkPopover: React.FC<TopicLinkPopoverProps> = ({
  categoryId,
  currentTopicId,
  topics,
  anchorPosition,
  onLink,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : topics;

  const currentTopic = currentTopicId
    ? topics.find(t => t.id === currentTopicId)
    : null;

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing immediately from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Keep popover within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(anchorPosition.top, window.innerHeight - 340),
    left: Math.min(anchorPosition.left, window.innerWidth - 280),
    zIndex: 60,
  };

  return (
    <div ref={popoverRef} style={style} className="w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-xs font-medium text-gray-400 mb-1.5">
          {currentTopic ? `Linked to: ${currentTopic.title}` : 'Not linked'}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Topic list */}
      <div className="max-h-[200px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-500 text-center">No topics found</div>
        ) : (
          filtered.map(topic => {
            const badge = TYPE_BADGES[topic.type] || TYPE_BADGES.child;
            const isLinked = topic.id === currentTopicId;
            return (
              <button
                key={topic.id}
                onClick={() => { onLink(categoryId, topic.id); onClose(); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                  isLinked
                    ? 'bg-blue-900/30 text-blue-300'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="flex-1 truncate">{topic.title}</span>
                <span className={`px-1 py-0.5 rounded text-[10px] ${badge.className}`}>
                  {badge.label}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Unlink button */}
      {currentTopicId && (
        <div className="border-t border-gray-700 px-3 py-2">
          <button
            onClick={() => { onLink(categoryId, null); onClose(); }}
            className="w-full text-xs text-red-400 hover:text-red-300 py-1 rounded hover:bg-red-900/20 transition-colors"
          >
            Unlink from topic
          </button>
        </div>
      )}
    </div>
  );
};

export default TopicLinkPopover;
