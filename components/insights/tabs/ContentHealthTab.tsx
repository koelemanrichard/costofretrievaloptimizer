// components/insights/tabs/ContentHealthTab.tsx
// Content Health - Corpus analysis and cannibalization detection

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ActionButton } from '../widgets';
import type { AggregatedInsights, CannibalizationRisk, InsightActionType } from '../../../types/insights';

interface ContentHealthTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onOpenCorpusAudit?: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

export const ContentHealthTab: React.FC<ContentHealthTabProps> = ({
  insights,
  mapId,
  onRefresh,
  onOpenCorpusAudit,
  onAction,
  actionLoading,
}) => {
  const { contentHealth } = insights;
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(new Set());

  const toggleRiskSelection = (riskId: string) => {
    setSelectedRisks(prev => {
      const next = new Set(prev);
      if (next.has(riskId)) next.delete(riskId);
      else next.add(riskId);
      return next;
    });
  };

  // Check if there's any corpus audit data
  const hasCorpusData = contentHealth.corpusOverview.totalPages > 0 ||
    contentHealth.cannibalizationRisks.length > 0;

  return (
    <div className="space-y-6">
      {/* No Corpus Data Banner */}
      {!hasCorpusData && (
        <div className="p-6 bg-gradient-to-r from-orange-900/30 to-green-900/30 border border-orange-700/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-full">
              <svg className="w-8 h-8 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">No Content Health Data Yet</h3>
              <p className="text-gray-400">
                Run a Corpus Audit to analyze your existing content for overlaps, cannibalization risks, and content freshness issues.
              </p>
            </div>
            <button
              onClick={onOpenCorpusAudit}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              Run Corpus Audit
            </button>
          </div>
        </div>
      )}

      {/* Corpus Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-white">
            {contentHealth.corpusOverview.totalPages}
          </div>
          <div className="text-sm text-gray-400">Pages Analyzed</div>
        </Card>
        <Card className="p-6 text-center">
          <div className={`text-3xl font-bold ${
            contentHealth.corpusOverview.semanticCoverage >= 80 ? 'text-green-400' :
            contentHealth.corpusOverview.semanticCoverage >= 60 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {contentHealth.corpusOverview.semanticCoverage}%
          </div>
          <div className="text-sm text-gray-400">Semantic Coverage</div>
        </Card>
        <Card className="p-6 text-center">
          <div className={`text-3xl font-bold ${
            contentHealth.corpusOverview.overlapCount === 0 ? 'text-green-400' :
            contentHealth.corpusOverview.overlapCount <= 3 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {contentHealth.corpusOverview.overlapCount}
          </div>
          <div className="text-sm text-gray-400">Overlap Issues</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {contentHealth.corpusOverview.averagePageScore}%
          </div>
          <div className="text-sm text-gray-400">Avg Page Score</div>
        </Card>
      </div>

      {/* Run Analysis */}
      <Card className="p-6 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Corpus Analysis</h3>
            <p className="text-sm text-gray-400">
              Analyze your content for overlaps, cannibalization, and optimization opportunities.
            </p>
          </div>
          <Button onClick={onOpenCorpusAudit} variant="primary">
            Run Corpus Audit
          </Button>
        </div>
      </Card>

      {/* Cannibalization Risks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Cannibalization Risks</h3>
          {selectedRisks.size > 0 && (
            <div className="flex items-center gap-2">
              <ActionButton
                label={actionLoading === 'merge_topics' ? 'Processing...' : 'Merge Selected'}
                actionType="merge_topics"
                onClick={() => {
                  const selectedRiskIds = Array.from(selectedRisks);
                  const risks = contentHealth.cannibalizationRisks.filter(r => selectedRiskIds.includes(r.id));
                  onAction?.('merge_topics', { risks, topicIds: risks.flatMap(r => r.topicIds) });
                }}
                variant="warning"
                size="sm"
                disabled={!!actionLoading}
              />
              <ActionButton
                label={actionLoading === 'differentiate_topics' ? 'Processing...' : 'Differentiate'}
                actionType="differentiate_topics"
                onClick={() => {
                  const selectedRiskIds = Array.from(selectedRisks);
                  const risks = contentHealth.cannibalizationRisks.filter(r => selectedRiskIds.includes(r.id));
                  onAction?.('differentiate_topics', { risks, topicIds: risks.flatMap(r => r.topicIds) });
                }}
                variant="secondary"
                size="sm"
                disabled={!!actionLoading}
              />
            </div>
          )}
        </div>

        {contentHealth.cannibalizationRisks.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-green-400 font-medium">No cannibalization issues detected</p>
            <p className="text-sm text-gray-500 mt-1">Your content topics are well differentiated.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contentHealth.cannibalizationRisks.map((risk) => (
              <div
                key={risk.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedRisks.has(risk.id)
                    ? 'bg-orange-900/30 border-orange-600'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => toggleRiskSelection(risk.id)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRisks.has(risk.id)}
                    onChange={() => {}}
                    className="mt-1 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{risk.topics[0]}</span>
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="font-medium text-white">{risk.topics[1]}</span>
                      </div>
                      <span className={`text-sm px-2 py-0.5 rounded-full ${
                        risk.similarityScore >= 80 ? 'bg-red-500/20 text-red-400' :
                        risk.similarityScore >= 60 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {Math.round(risk.similarityScore)}% similar
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-0.5 rounded ${
                        risk.recommendation === 'merge'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        Recommended: {risk.recommendation === 'merge' ? 'Merge into one' : 'Differentiate angles'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Anchor Text Audit */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Anchor Text Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-gray-800/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-white">
              {contentHealth.anchorTextAudit.totalAnchors}
            </div>
            <div className="text-sm text-gray-400">Total Anchors</div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            contentHealth.anchorTextAudit.genericAnchors > 10
              ? 'bg-yellow-900/30 border border-yellow-700/50'
              : 'bg-gray-800/50'
          }`}>
            <div className={`text-2xl font-bold ${
              contentHealth.anchorTextAudit.genericAnchors > 10 ? 'text-yellow-400' : 'text-white'
            }`}>
              {contentHealth.anchorTextAudit.genericAnchors}
            </div>
            <div className="text-sm text-gray-400">Generic Anchors</div>
            <div className="text-xs text-gray-500 mt-1">"click here", "learn more", etc.</div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            contentHealth.anchorTextAudit.overOptimizedAnchors > 5
              ? 'bg-red-900/30 border border-red-700/50'
              : 'bg-gray-800/50'
          }`}>
            <div className={`text-2xl font-bold ${
              contentHealth.anchorTextAudit.overOptimizedAnchors > 5 ? 'text-red-400' : 'text-white'
            }`}>
              {contentHealth.anchorTextAudit.overOptimizedAnchors}
            </div>
            <div className="text-sm text-gray-400">Over-Optimized</div>
            <div className="text-xs text-gray-500 mt-1">Exact match keyword spam</div>
          </div>
        </div>

        {contentHealth.anchorTextAudit.suggestions.length > 0 && (
          <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-300 mb-2">Suggestions</h4>
            <ul className="space-y-1">
              {contentHealth.anchorTextAudit.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-blue-200 flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Content Freshness */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Content Freshness</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stale Topics */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Stale Topics ({contentHealth.contentFreshness.staleTopics.length})
            </h4>
            {contentHealth.contentFreshness.staleTopics.length === 0 ? (
              <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-center">
                <p className="text-green-400">All topics are fresh!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contentHealth.contentFreshness.staleTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-sm text-white">{topic.topic}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {topic.daysOld} days old
                      </span>
                      <button className="text-xs text-blue-400 hover:text-blue-300">
                        Schedule Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decay Risk */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Decay Risk Topics ({contentHealth.contentFreshness.decayRiskTopics.length})
            </h4>
            {contentHealth.contentFreshness.decayRiskTopics.length === 0 ? (
              <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-center">
                <p className="text-green-400">No decay risks detected!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contentHealth.contentFreshness.decayRiskTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-sm text-white">{topic.topic}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            topic.decayScore >= 80 ? 'bg-red-500' :
                            topic.decayScore >= 60 ? 'bg-orange-500' :
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${topic.decayScore}%` }}
                        />
                      </div>
                      <span className={`text-xs ${
                        topic.decayScore >= 80 ? 'text-red-400' :
                        topic.decayScore >= 60 ? 'text-orange-400' :
                        'text-yellow-400'
                      }`}>
                        {topic.decayScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* AI Actions */}
      <Card className="p-6 bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">AI-Powered Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              // Auto-differentiate all cannibalization risks
              const allRisks = contentHealth.cannibalizationRisks;
              onAction?.('differentiate_topics', { risks: allRisks, topicIds: allRisks.flatMap(r => r.topicIds) });
            }}
            disabled={!!actionLoading || contentHealth.cannibalizationRisks.length === 0}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded">
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <span className="font-medium text-white">Auto-Differentiate</span>
            </div>
            <p className="text-sm text-gray-400">Let AI suggest unique angles for overlapping topics</p>
          </button>

          <button
            onClick={() => onAction?.('expand_eavs', { focus: 'unique_angles' })}
            disabled={!!actionLoading}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded">
                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="font-medium text-white">Generate Unique Angles</span>
            </div>
            <p className="text-sm text-gray-400">Create fresh perspectives for stale content</p>
          </button>

          <button
            onClick={() => onAction?.('schedule_update', { topics: contentHealth.contentFreshness.staleTopics })}
            disabled={!!actionLoading || contentHealth.contentFreshness.staleTopics.length === 0}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded">
                <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="font-medium text-white">Suggest Content Refresh</span>
            </div>
            <p className="text-sm text-gray-400">AI recommendations for updating old content</p>
          </button>
        </div>
      </Card>
    </div>
  );
};
