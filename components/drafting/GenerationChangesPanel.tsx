// components/drafting/GenerationChangesPanel.tsx

import React, { useState } from 'react';
import { BriefChangeLogEntry, BriefGenerationSummary } from '../../types';

interface GenerationChangesPanelProps {
  changes: BriefChangeLogEntry[];
  summary: BriefGenerationSummary | null;
}

// Criteria label mapping (extracted for consistency)
const CRITERIA_LABELS: Record<string, string> = {
  'word_count_threshold': 'Long section',
  'process_content': 'Process content',
  'featured_snippet_target': 'FS target',
  'user_experience_value': 'UX value',
  'quality_improvement': 'Quality'
};

// Inline SVG icons (project uses inline SVGs, not lucide-react)
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const AlertCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Icon component for change types (extracted to avoid re-creation on render)
const ChangeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'image_added':
      return <ImageIcon className="w-4 h-4 text-green-400" />;
    case 'image_modified':
      return <EditIcon className="w-4 h-4 text-amber-400" />;
    default:
      return <AlertCircleIcon className="w-4 h-4 text-blue-400" />;
  }
};

const formatCriteria = (criteria: string[]): string => {
  return criteria.map(c => CRITERIA_LABELS[c] || c).join(', ');
};

export const GenerationChangesPanel: React.FC<GenerationChangesPanelProps> = ({
  changes,
  summary
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = 'generation-changes-content';

  if (!changes || changes.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden mt-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-200">
            Generation Changes
          </span>
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
            {summary?.total_changes || changes.length} changes
          </span>
        </div>

        {summary && (
          <div className="flex items-center gap-3 text-xs">
            {summary.images_added > 0 && (
              <span className="text-green-400">+{summary.images_added} images</span>
            )}
            {summary.images_modified > 0 && (
              <span className="text-amber-400">{summary.images_modified} modified</span>
            )}
          </div>
        )}
      </button>

      {isExpanded && (
        <div id={panelId} className="border-t border-gray-700 p-3 space-y-2 max-h-64 overflow-y-auto">
          {changes.map((change) => (
            <div
              key={change.id}
              className="flex items-start gap-2 p-2 bg-gray-900/50 rounded text-xs"
            >
              <ChangeIcon type={change.change_type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-300">
                    {change.section_key}
                  </span>
                  <span className="text-gray-500">Pass {change.pass}</span>
                  {change.criteria_met.length > 0 && (
                    <span className="text-gray-600">
                      ({formatCriteria(change.criteria_met)})
                    </span>
                  )}
                </div>
                <p className="text-gray-400 mt-1 line-clamp-2">
                  {change.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
