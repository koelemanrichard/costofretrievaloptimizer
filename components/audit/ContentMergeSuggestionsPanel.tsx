import React from 'react';
import type {
  ContentMergeSuggestion,
  CannibalizationRisk,
} from '../../services/audit/types';

export interface ContentMergeSuggestionsPanelProps {
  suggestions: ContentMergeSuggestion[];
  cannibalizationRisks: CannibalizationRisk[];
}

const ACTION_BADGE_STYLES: Record<ContentMergeSuggestion['suggestedAction'], string> = {
  merge: 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
  differentiate: 'bg-green-900/30 text-green-400 border border-green-800/50',
  redirect: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
};

const SEVERITY_BADGE_STYLES: Record<CannibalizationRisk['severity'], string> = {
  high: 'bg-red-900/30 text-red-400 border border-red-800/50',
  medium: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
  low: 'bg-gray-700 text-gray-400 border border-gray-600',
};

export const ContentMergeSuggestionsPanel: React.FC<ContentMergeSuggestionsPanelProps> = ({
  suggestions,
  cannibalizationRisks,
}) => {
  return (
    <div className="space-y-8" data-testid="content-merge-suggestions-panel">
      {/* === Content Merge Suggestions === */}
      <section>
        <h2
          className="text-lg font-semibold text-orange-400 mb-4"
          data-testid="merge-suggestions-heading"
        >
          Content Merge Suggestions
        </h2>

        {suggestions.length === 0 ? (
          <p
            className="text-gray-500 text-sm py-4"
            data-testid="no-merge-suggestions"
          >
            No merge suggestions
          </p>
        ) : (
          <div className="space-y-3" data-testid="merge-suggestions-list">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                data-testid="merge-suggestion-card"
              >
                {/* URL row with arrow */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className="text-sm text-gray-300 font-mono truncate max-w-xs"
                    title={suggestion.sourceUrl}
                    data-testid="source-url"
                  >
                    {suggestion.sourceUrl}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    data-testid="arrow-icon"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  <span
                    className="text-sm text-gray-300 font-mono truncate max-w-xs"
                    title={suggestion.targetUrl}
                    data-testid="target-url"
                  >
                    {suggestion.targetUrl}
                  </span>
                </div>

                {/* Overlap progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Overlap</span>
                    <span
                      className="text-xs text-gray-400 font-medium"
                      data-testid="overlap-percentage"
                    >
                      {suggestion.overlapPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(suggestion.overlapPercentage, 100)}%` }}
                      data-testid="overlap-bar"
                    />
                  </div>
                </div>

                {/* Action badge + Reason */}
                <div className="flex items-start gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${
                      ACTION_BADGE_STYLES[suggestion.suggestedAction]
                    }`}
                    data-testid="action-badge"
                  >
                    {suggestion.suggestedAction}
                  </span>
                  <p
                    className="text-sm text-gray-400"
                    data-testid="suggestion-reason"
                  >
                    {suggestion.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === Cannibalization Risks === */}
      <section>
        <h2
          className="text-lg font-semibold text-orange-400 mb-4"
          data-testid="cannibalization-heading"
        >
          Cannibalization Risks
        </h2>

        {cannibalizationRisks.length === 0 ? (
          <p
            className="text-gray-500 text-sm py-4"
            data-testid="no-cannibalization-risks"
          >
            No cannibalization risks detected
          </p>
        ) : (
          <div className="space-y-3" data-testid="cannibalization-risks-list">
            {cannibalizationRisks.map((risk, idx) => (
              <div
                key={idx}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                data-testid="cannibalization-risk-card"
              >
                {/* Severity badge + Shared entity */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      SEVERITY_BADGE_STYLES[risk.severity]
                    }`}
                    data-testid="severity-badge"
                  >
                    {risk.severity}
                  </span>
                  <span
                    className="text-sm font-medium text-gray-200"
                    data-testid="shared-entity"
                  >
                    {risk.sharedEntity}
                  </span>
                </div>

                {/* URLs list */}
                <div className="mb-2" data-testid="risk-urls">
                  {risk.urls.map((url) => (
                    <div
                      key={url}
                      className="text-xs text-gray-500 font-mono truncate"
                      title={url}
                    >
                      {url}
                    </div>
                  ))}
                </div>

                {/* Shared keywords as tags */}
                <div className="flex flex-wrap gap-1 mb-2" data-testid="shared-keywords">
                  {risk.sharedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300"
                      data-testid="keyword-tag"
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                {/* Recommendation */}
                <p
                  className="text-sm text-gray-400"
                  data-testid="recommendation-text"
                >
                  {risk.recommendation}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ContentMergeSuggestionsPanel;
