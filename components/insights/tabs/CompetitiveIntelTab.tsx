// components/insights/tabs/CompetitiveIntelTab.tsx
// Competitive Intelligence - Query network analysis and content gaps

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ActionButton } from '../widgets';
import type { AggregatedInsights, ContentGap, Question, InsightActionType } from '../../../types/insights';

interface CompetitiveIntelTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onOpenQueryNetworkAudit?: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

export const CompetitiveIntelTab: React.FC<CompetitiveIntelTabProps> = ({
  insights,
  mapId,
  onRefresh,
  onOpenQueryNetworkAudit,
  onAction,
  actionLoading,
}) => {
  const { competitiveIntel } = insights;
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  const toggleGapSelection = (gapId: string) => {
    setSelectedGaps(prev => {
      const next = new Set(prev);
      if (next.has(gapId)) next.delete(gapId);
      else next.add(gapId);
      return next;
    });
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // Intent distribution chart
  const intents = Object.entries(competitiveIntel.queryNetworkSummary.intentDistribution);
  const maxIntent = Math.max(...intents.map(([, count]) => count), 1);

  // Check if no audit has been run yet
  const hasAuditData = competitiveIntel.queryNetworkSummary.totalQueries > 0 ||
    competitiveIntel.contentGaps.length > 0 ||
    competitiveIntel.competitorEavComparison.competitorEavCount > 0;

  return (
    <div className="space-y-6">
      {/* No Audit Data Banner */}
      {!hasAuditData && (
        <div className="p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-full">
              <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4m0-4h.01" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">No Competitive Data Yet</h3>
              <p className="text-gray-400">
                Run a Query Network Audit to analyze competitor content, discover content gaps, and find opportunities to strengthen your topical authority.
              </p>
            </div>
            <button
              onClick={onOpenQueryNetworkAudit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Run Audit
            </button>
          </div>
        </div>
      )}

      {/* Query Network Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Query Network Summary</h3>
            {competitiveIntel.queryNetworkSummary.lastUpdated && (
              <span className="text-xs text-gray-500">
                Last scan: {new Date(competitiveIntel.queryNetworkSummary.lastUpdated).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-gray-800/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-white">
                {competitiveIntel.queryNetworkSummary.totalQueries}
              </div>
              <div className="text-xs text-gray-400">Queries Analyzed</div>
            </div>
            <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">
                {competitiveIntel.queryNetworkSummary.yourCoverage}
              </div>
              <div className="text-xs text-gray-400">Your Coverage</div>
            </div>
            <div className="p-3 bg-orange-900/30 border border-orange-700/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">
                {competitiveIntel.queryNetworkSummary.competitorEavCount}
              </div>
              <div className="text-xs text-gray-400">Competitor EAVs</div>
            </div>
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">
                {competitiveIntel.contentGaps.length}
              </div>
              <div className="text-xs text-gray-400">Content Gaps</div>
            </div>
          </div>

          {/* Intent Distribution */}
          <h4 className="text-sm font-medium text-gray-300 mb-3">Search Intent Distribution</h4>
          <div className="space-y-2">
            {intents.map(([intent, count]) => (
              <div key={intent} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-32 capitalize">{intent}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${(count / maxIntent) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-white w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Run Analysis Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Analysis Tools</h3>
          <div className="space-y-3">
            <button
              onClick={onOpenQueryNetworkAudit}
              className="w-full p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-lg text-left transition-colors"
            >
              <div className="font-medium text-white mb-1">Run Query Network Audit</div>
              <div className="text-sm text-gray-400">Analyze competitor queries and find gaps</div>
            </button>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">
                <strong className="text-white">Tip:</strong> Run regular audits to track competitive changes
                and discover new opportunities.
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Competitor EAV Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Competitor EAV Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">
              {competitiveIntel.competitorEavComparison.yourEavCount}
            </div>
            <div className="text-sm text-gray-400">Your EAVs</div>
          </div>
          <div className="p-4 bg-orange-900/30 border border-orange-700/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-orange-400">
              {competitiveIntel.competitorEavComparison.competitorEavCount}
            </div>
            <div className="text-sm text-gray-400">Competitor EAVs</div>
          </div>
          <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-400">
              {competitiveIntel.competitorEavComparison.uniqueToCompetitors.length}
            </div>
            <div className="text-sm text-gray-400">EAV Gaps</div>
          </div>
        </div>

        {competitiveIntel.competitorEavComparison.uniqueToCompetitors.length > 0 && (
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-800/50 flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                EAVs Unique to Competitors ({competitiveIntel.competitorEavComparison.uniqueToCompetitors.length})
              </span>
              <ActionButton
                label={actionLoading === 'add_eavs_to_map' ? 'Adding...' : 'Add All to Map'}
                actionType="add_eavs_to_map"
                onClick={() => onAction?.('add_eavs_to_map', { eavs: competitiveIntel.competitorEavComparison.uniqueToCompetitors })}
                variant="success"
                size="sm"
                disabled={!!actionLoading}
              />
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-800">
              {competitiveIntel.competitorEavComparison.uniqueToCompetitors.slice(0, 20).map((eav, index) => (
                <div key={index} className="p-3 flex items-center gap-3 hover:bg-gray-800/30">
                  <input
                    type="checkbox"
                    className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1 text-sm">
                    <span className="text-white font-medium">{eav.subject.label}</span>
                    <span className="text-gray-400 mx-2">{eav.predicate.relation}</span>
                    <span className="text-blue-300">{String(eav.object.value)}</span>
                  </div>
                  {eav.predicate.category && (
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-400">
                      {eav.predicate.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Content Gaps */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Content Gaps</h3>
          {selectedGaps.size > 0 && (
            <ActionButton
              label={actionLoading === 'create_brief_from_gap' ? 'Creating...' : `Create ${selectedGaps.size} Brief${selectedGaps.size > 1 ? 's' : ''}`}
              actionType="create_brief_from_gap"
              onClick={() => {
                const gaps = competitiveIntel.contentGaps.filter(g => selectedGaps.has(g.id));
                onAction?.('create_brief_from_gap', { gaps });
              }}
              variant="success"
              size="sm"
              disabled={!!actionLoading}
            />
          )}
        </div>
        {competitiveIntel.contentGaps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No content gaps identified. Run a Query Network Audit to discover opportunities.
          </div>
        ) : (
          <div className="space-y-3">
            {competitiveIntel.contentGaps.map((gap) => (
              <div
                key={gap.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedGaps.has(gap.id)
                    ? 'bg-blue-900/30 border-blue-600'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => toggleGapSelection(gap.id)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedGaps.has(gap.id)}
                    onChange={() => {}}
                    className="mt-1 rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-white">{gap.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          gap.difficulty === 'low' ? 'bg-green-500/20 text-green-400' :
                          gap.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {gap.difficulty} effort
                        </span>
                        <span className="text-xs text-gray-500">
                          {gap.competitorCoverageCount} competitor{gap.competitorCoverageCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{gap.description}</p>
                    {gap.searchVolume && (
                      <div className="mt-2 text-xs text-gray-500">
                        Est. search volume: {gap.searchVolume.toLocaleString()}/mo
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Questions to Answer */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Questions to Answer ({competitiveIntel.questionsToAnswer.length})
          </h3>
          <div className="flex items-center gap-2">
            {selectedQuestions.size > 0 && (
              <ActionButton
                label={actionLoading === 'add_questions_as_faq' ? 'Adding...' : `Add ${selectedQuestions.size} as FAQ`}
                actionType="add_questions_as_faq"
                onClick={() => {
                  const questions = competitiveIntel.questionsToAnswer.filter(q => selectedQuestions.has(q.id));
                  onAction?.('add_questions_as_faq', { questions: questions.map(q => q.question) });
                }}
                variant="success"
                size="sm"
                disabled={!!actionLoading}
              />
            )}
            <button
              onClick={() => setShowAllQuestions(!showAllQuestions)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showAllQuestions ? 'Show Less' : 'Show All'}
            </button>
          </div>
        </div>
        {competitiveIntel.questionsToAnswer.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No questions discovered yet. Run a Query Network Audit to find user questions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {competitiveIntel.questionsToAnswer
              .slice(0, showAllQuestions ? undefined : 10)
              .map((question) => (
                <div
                  key={question.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedQuestions.has(question.id)
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => toggleQuestionSelection(question.id)}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(question.id)}
                      onChange={() => {}}
                      className="mt-1 rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm text-white">{question.question}</p>
                      <p className="text-xs text-gray-500 mt-1">Source: {question.source}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Strategic Recommendations</h3>
        {competitiveIntel.recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recommendations yet. Complete research audits to generate insights.
          </div>
        ) : (
          <div className="space-y-4">
            {competitiveIntel.recommendations.map((rec) => (
              <div key={rec.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-white">{rec.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      rec.effort === 'low' ? 'bg-green-500/20 text-green-400' :
                      rec.effort === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {rec.effort} effort
                    </span>
                    {rec.implementable && rec.actionType && (
                      <ActionButton
                        label={actionLoading === rec.actionType ? 'Working...' : 'Implement'}
                        actionType={rec.actionType}
                        onClick={() => onAction?.(rec.actionType!, rec.actionPayload)}
                        variant="primary"
                        size="sm"
                        disabled={!!actionLoading}
                      />
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-2">{rec.description}</p>
                <p className="text-xs text-blue-400">
                  <strong>Impact:</strong> {rec.businessImpact}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
