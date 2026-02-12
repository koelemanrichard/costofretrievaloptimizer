import React from 'react';

export interface KnowledgeGraphGapsPanelProps {
  missingTopics: string[];
  onAddTopic?: (topic: string) => void;
}

export const KnowledgeGraphGapsPanel: React.FC<KnowledgeGraphGapsPanelProps> = ({
  missingTopics,
  onAddTopic,
}) => {
  if (missingTopics.length === 0) {
    return (
      <section data-testid="knowledge-graph-gaps-panel">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-orange-400">
            Missing Knowledge Graph Topics
          </h2>
          <span
            className="px-2 py-0.5 text-xs rounded-full bg-green-900/30 text-green-400 font-medium"
            data-testid="topic-count-badge"
          >
            0
          </span>
        </div>
        <p className="text-sm text-gray-400" data-testid="empty-state-message">
          No knowledge graph gaps detected — your coverage is comprehensive.
        </p>
      </section>
    );
  }

  return (
    <section data-testid="knowledge-graph-gaps-panel">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-orange-400">
          Missing Knowledge Graph Topics
        </h2>
        <span
          className="px-2 py-0.5 text-xs rounded-full bg-orange-900/30 text-orange-400 font-medium"
          data-testid="topic-count-badge"
        >
          {missingTopics.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2" data-testid="topics-list">
        {missingTopics.map((topic) => (
          <div
            key={topic}
            className="inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 hover:border-gray-600 transition-colors"
            data-testid="topic-card"
          >
            <span data-testid="topic-name">{topic}</span>
            {onAddTopic && (
              <button
                type="button"
                onClick={() => onAddTopic(topic)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-gray-700 hover:bg-orange-600 text-gray-400 hover:text-white transition-colors"
                aria-label={`Add ${topic} to content plan`}
                data-testid="add-topic-button"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default KnowledgeGraphGapsPanel;
