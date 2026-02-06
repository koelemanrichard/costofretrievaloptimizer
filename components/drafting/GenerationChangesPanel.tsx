// components/drafting/GenerationChangesPanel.tsx

import React, { useState } from 'react';
import { BriefChangeLogEntry, BriefGenerationSummary } from '../../types';
import { ChevronDown, ChevronRight, ImageIcon, Edit, AlertCircle } from 'lucide-react';

interface GenerationChangesPanelProps {
  changes: BriefChangeLogEntry[];
  summary: BriefGenerationSummary | null;
}

export const GenerationChangesPanel: React.FC<GenerationChangesPanelProps> = ({
  changes,
  summary
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!changes || changes.length === 0) {
    return null;
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'image_added':
        return <ImageIcon className="w-4 h-4 text-green-400" />;
      case 'image_modified':
        return <Edit className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatCriteria = (criteria: string[]) => {
    const labels: Record<string, string> = {
      'word_count_threshold': 'Long section',
      'process_content': 'Process content',
      'featured_snippet_target': 'FS target',
      'user_experience_value': 'UX value',
      'quality_improvement': 'Quality'
    };
    return criteria.map(c => labels[c] || c).join(', ');
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
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
        <div className="border-t border-gray-700 p-3 space-y-2 max-h-64 overflow-y-auto">
          {changes.map((change) => (
            <div
              key={change.id}
              className="flex items-start gap-2 p-2 bg-gray-900/50 rounded text-xs"
            >
              {getChangeIcon(change.change_type)}
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
