// components/navigation/ContextualBridgeEditor.tsx
// Editor for contextual bridge text on navigation links

import React, { useState, useMemo } from 'react';
import {
  NavigationLink,
  EnrichedTopic,
  SemanticTriple,
} from '../../types';
import {
  identifyLinksNeedingBridge,
  LinkBridgeAnalysis,
  GeneratedNavigation,
} from '../../services/navigationService';

interface ContextualBridgeEditorProps {
  navigation: GeneratedNavigation;
  currentTopic?: EnrichedTopic;
  topics: EnrichedTopic[];
  eavs?: SemanticTriple[];
  onBridgeUpdate: (linkId: string, bridgeText: string) => void;
  bridgeTexts: Record<string, string>;
}

const ContextualBridgeEditor: React.FC<ContextualBridgeEditorProps> = ({
  navigation,
  currentTopic,
  topics,
  eavs,
  onBridgeUpdate,
  bridgeTexts,
}) => {
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs_bridge' | 'has_bridge'>('all');

  // Analyze links for bridge requirements
  const bridgeAnalysis = useMemo(() => {
    return identifyLinksNeedingBridge(navigation, currentTopic, topics, eavs);
  }, [navigation, currentTopic, topics, eavs]);

  // Filter links based on selection
  const filteredAnalysis = useMemo(() => {
    switch (filter) {
      case 'needs_bridge':
        return bridgeAnalysis.filter(a => a.needsBridge && !bridgeTexts[a.linkId]);
      case 'has_bridge':
        return bridgeAnalysis.filter(a => bridgeTexts[a.linkId]);
      default:
        return bridgeAnalysis;
    }
  }, [bridgeAnalysis, filter, bridgeTexts]);

  // Count stats
  const stats = useMemo(() => {
    const needsBridge = bridgeAnalysis.filter(a => a.needsBridge).length;
    const hasBridge = bridgeAnalysis.filter(a => bridgeTexts[a.linkId]).length;
    return { total: bridgeAnalysis.length, needsBridge, hasBridge };
  }, [bridgeAnalysis, bridgeTexts]);

  const getRelevanceColor = (score: number) => {
    if (score >= 50) return 'text-green-400';
    if (score >= 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRelevanceBadge = (score: number) => {
    if (score >= 50) return { label: 'High', bg: 'bg-green-900/50 border-green-700' };
    if (score >= 20) return { label: 'Medium', bg: 'bg-yellow-900/50 border-yellow-700' };
    return { label: 'Low', bg: 'bg-red-900/50 border-red-700' };
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Contextual Bridge Editor</h3>
          <p className="text-sm text-gray-400 mt-1">
            Add bridge text to low-relevance links to justify the connection
          </p>
        </div>

        {/* Stats badges */}
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-300">
            {stats.total} links
          </span>
          <span className="px-3 py-1.5 bg-red-900/30 border border-red-700 rounded-lg text-xs text-red-400">
            {stats.needsBridge} need bridges
          </span>
          <span className="px-3 py-1.5 bg-green-900/30 border border-green-700 rounded-lg text-xs text-green-400">
            {stats.hasBridge} configured
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'needs_bridge', 'has_bridge'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' && 'All Links'}
            {f === 'needs_bridge' && 'Needs Bridge'}
            {f === 'has_bridge' && 'Has Bridge'}
          </button>
        ))}
      </div>

      {/* Links list */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredAnalysis.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'needs_bridge' && 'All links have sufficient relevance or bridges configured.'}
            {filter === 'has_bridge' && 'No bridges configured yet.'}
            {filter === 'all' && 'No links to analyze.'}
          </div>
        ) : (
          filteredAnalysis.map((analysis) => {
            const isExpanded = expandedLink === analysis.linkId;
            const hasBridge = !!bridgeTexts[analysis.linkId];
            const relevanceBadge = getRelevanceBadge(analysis.relevanceScore);

            return (
              <div
                key={analysis.linkId}
                className={`bg-gray-800 rounded-lg border transition-colors ${
                  analysis.needsBridge && !hasBridge
                    ? 'border-red-700/50'
                    : hasBridge
                    ? 'border-green-700/50'
                    : 'border-gray-700'
                }`}
              >
                {/* Link header */}
                <button
                  onClick={() => setExpandedLink(isExpanded ? null : analysis.linkId)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Needs bridge indicator */}
                    {analysis.needsBridge && !hasBridge && (
                      <span className="text-red-400" title="Needs contextual bridge">
                        ⚠️
                      </span>
                    )}
                    {hasBridge && (
                      <span className="text-green-400" title="Bridge configured">
                        ✓
                      </span>
                    )}

                    <div>
                      <span className="text-white font-medium">{analysis.targetTitle}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${getRelevanceColor(analysis.relevanceScore)}`}>
                          Relevance: {analysis.relevanceScore}%
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${relevanceBadge.bg}`}>
                          {relevanceBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-700">
                    {/* Relevance reasons */}
                    {analysis.reasons.length > 0 && (
                      <div className="mt-3 mb-4">
                        <div className="text-xs text-gray-500 mb-1">Relevance factors:</div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.reasons.map((reason, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                            >
                              {reason.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bridge text input */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        Contextual Bridge Text
                        {analysis.needsBridge && (
                          <span className="text-red-400 ml-1">(recommended)</span>
                        )}
                      </label>
                      <textarea
                        value={bridgeTexts[analysis.linkId] || ''}
                        onChange={(e) => onBridgeUpdate(analysis.linkId, e.target.value)}
                        placeholder={analysis.suggestedBridge || 'Add context for this link...'}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />

                      {/* Suggested bridge */}
                      {analysis.suggestedBridge && !bridgeTexts[analysis.linkId] && (
                        <button
                          onClick={() => onBridgeUpdate(analysis.linkId, analysis.suggestedBridge!)}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <span>💡</span>
                          Use suggestion: "{analysis.suggestedBridge}"
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-white mb-2">About Contextual Bridges</h4>
        <p className="text-xs text-gray-400">
          Contextual bridge text explains <em>why</em> a link is relevant, improving semantic understanding.
          Links with low relevance scores (&lt;20%) benefit most from bridges. Example: "For insights on pricing
          strategies in different markets, see our guide on..."
        </p>
      </div>
    </div>
  );
};

export default ContextualBridgeEditor;
