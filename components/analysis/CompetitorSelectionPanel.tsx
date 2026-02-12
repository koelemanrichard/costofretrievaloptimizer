/**
 * Competitor Selection Panel Component
 *
 * Displays a list of competitors found from SERP analysis with checkbox selection.
 * Pre-selects first 5 competitors by default (like CompetitorRefinementWizard).
 * User can add/remove competitors before running deep analysis.
 *
 * Created: January 13, 2026
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SmartLoader } from '../ui/FunLoaders';
import { AuditButton } from '../audit/AuditButton';

// =============================================================================
// Types
// =============================================================================

export interface CompetitorItem {
  url: string;
  domain: string;
  title: string;
  position: number;
  snippet?: string;
}

export interface CompetitorSelectionPanelProps {
  /** List of competitors found from SERP */
  competitors: CompetitorItem[];
  /** Currently selected competitor URLs */
  selectedUrls: string[];
  /** Callback when selection changes */
  onSelectionChange: (urls: string[]) => void;
  /** Callback when user confirms selection and wants to analyze */
  onConfirm: () => void;
  /** Whether analysis is in progress */
  isLoading: boolean;
  /** Optional: Whether to auto-select first N competitors on mount */
  autoSelectCount?: number;
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Label for the confirm button */
  confirmButtonLabel?: string;
}

// =============================================================================
// Component
// =============================================================================

export const CompetitorSelectionPanel: React.FC<CompetitorSelectionPanelProps> = ({
  competitors,
  selectedUrls,
  onSelectionChange,
  onConfirm,
  isLoading,
  autoSelectCount = 5,
  className = '',
  confirmButtonLabel = 'Analyze Selected Competitors',
}) => {
  // Auto-select first N competitors on mount if nothing selected
  useEffect(() => {
    if (competitors.length > 0 && selectedUrls.length === 0) {
      const autoSelected = competitors
        .slice(0, autoSelectCount)
        .map(c => c.url);
      onSelectionChange(autoSelected);
    }
  }, [competitors, selectedUrls.length, autoSelectCount, onSelectionChange]);

  // Toggle single competitor selection
  const handleToggle = useCallback((url: string) => {
    if (selectedUrls.includes(url)) {
      onSelectionChange(selectedUrls.filter(u => u !== url));
    } else {
      onSelectionChange([...selectedUrls, url]);
    }
  }, [selectedUrls, onSelectionChange]);

  // Select all competitors
  const handleSelectAll = useCallback(() => {
    onSelectionChange(competitors.map(c => c.url));
  }, [competitors, onSelectionChange]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Deduplicate competitors by URL
  const uniqueCompetitors = competitors.filter(
    (c, index, self) => self.findIndex(x => x.url === c.url) === index
  );

  // Empty state
  if (competitors.length === 0 && !isLoading) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-6 ${className}`}>
        <p className="text-gray-400 text-center">
          No competitors found. Try searching for a different topic.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">
              Select Competitors to Analyze
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {selectedUrls.length} of {uniqueCompetitors.length} selected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              disabled={isLoading || selectedUrls.length === 0}
              className="px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Competitor List */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {isLoading && competitors.length === 0 ? (
          <div className="flex justify-center py-8">
            <SmartLoader context="analyzing" size="sm" showText={false} />
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueCompetitors.map((competitor, index) => {
              const isSelected = selectedUrls.includes(competitor.url);
              return (
                <div
                  key={`${competitor.url}-${index}`}
                  onClick={() => !isLoading && handleToggle(competitor.url)}
                  className={`
                    p-3 rounded-lg flex items-start gap-3 cursor-pointer border transition-colors
                    ${isSelected
                      ? 'bg-blue-900/20 border-blue-700 hover:bg-blue-900/30'
                      : 'bg-gray-900/50 border-gray-700 hover:bg-gray-800/50'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    disabled={isLoading}
                    className="mt-1 flex-shrink-0 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-mono">#{competitor.position}</span>
                      <span className="text-sm font-medium text-gray-300 truncate">
                        {competitor.domain}
                      </span>
                    </div>
                    <p className="text-sm text-white mt-0.5 line-clamp-1">
                      {competitor.title}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-green-400 font-mono truncate">
                        {competitor.url}
                      </p>
                      <AuditButton url={competitor.url} variant="icon" size="sm" />
                    </div>
                    {competitor.snippet && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {competitor.snippet}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with Action Button */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Analysis will fetch content from selected URLs to extract word counts, headings, schema, and attributes.
          </p>
          <button
            onClick={onConfirm}
            disabled={isLoading || selectedUrls.length === 0}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${isLoading || selectedUrls.length === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <SmartLoader context="analyzing" size="sm" showText={false} />
                Analyzing...
              </span>
            ) : (
              confirmButtonLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitorSelectionPanel;
