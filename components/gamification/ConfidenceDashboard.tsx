/**
 * ConfidenceDashboard
 *
 * Main dashboard showing:
 * - Overall Semantic Authority Score
 * - Sub-score breakdown
 * - What's working vs what needs improvement
 * - Actionable next steps
 * - Progress over time
 */

import React, { useState, useMemo } from 'react';
import { TopicalMap, ContentBrief } from '../../types';
import { useSemanticScore } from '../../hooks/gamification/useSemanticScore';
import { SemanticScoreDisplay } from './SemanticScoreDisplay';
import { TierBadge, TierProgress } from './TierBadge';
import { SubScoreGrid } from './SubScoreBar';
import { ScoreHistory } from './ScoreChangeIndicator';
import { Card } from '../ui/Card';

interface ConfidenceDashboardProps {
  map: TopicalMap | null;
  briefs?: ContentBrief[];
  compact?: boolean;
  className?: string;
}

export const ConfidenceDashboard: React.FC<ConfidenceDashboardProps> = ({
  map,
  briefs = [],
  compact = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'actions'>('overview');
  const {
    score,
    currentTier,
    scoreHistory,
    isCalculating
  } = useSemanticScore(map, briefs);

  // Aggregate all improvements and details
  const { improvements, workingItems, prioritizedActions } = useMemo(() => {
    if (!score?.breakdown) {
      return { improvements: [], workingItems: [], prioritizedActions: [] };
    }

    const allImprovements: { category: string; text: string; priority: number }[] = [];
    const allWorking: { category: string; text: string }[] = [];

    const categories = [
      { key: 'entityClarity', name: 'Entity Clarity', priority: 1 },
      { key: 'topicalCoverage', name: 'Topical Coverage', priority: 2 },
      { key: 'intentAlignment', name: 'Intent Alignment', priority: 3 },
      { key: 'competitiveParity', name: 'Competitive Parity', priority: 4 },
      { key: 'contentReadiness', name: 'Content Readiness', priority: 5 }
    ] as const;

    categories.forEach(({ key, name, priority }) => {
      const subScore = score.breakdown[key];

      subScore.improvements.forEach(text => {
        allImprovements.push({ category: name, text, priority });
      });

      subScore.details.forEach(text => {
        allWorking.push({ category: name, text });
      });
    });

    // Sort improvements by priority and limit
    const sorted = allImprovements
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5);

    return {
      improvements: allImprovements,
      workingItems: allWorking,
      prioritizedActions: sorted
    };
  }, [score]);

  if (!map) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Select a map to see your Semantic Authority Score</p>
        </div>
      </Card>
    );
  }

  if (isCalculating) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Calculating score...</span>
        </div>
      </Card>
    );
  }

  // Compact version for sidebar/widget
  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-4">
          <SemanticScoreDisplay score={score} size="sm" />
          <div className="flex-1 min-w-0">
            {currentTier && (
              <TierProgress currentScore={score?.overall || 0} />
            )}
            {prioritizedActions.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 truncate">
                Next: {prioritizedActions[0].text}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Score */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Score Display */}
          <SemanticScoreDisplay
            score={score}
            size="lg"
            showBreakdown={false}
          />

          {/* Right side info */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-xl font-bold text-white mb-2">
              Semantic Authority Score
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {score?.message || 'Your score measures how well Google will understand and trust your content.'}
            </p>

            {/* Tier Progress */}
            {currentTier && (
              <TierProgress currentScore={score?.overall || 0} className="max-w-xs" />
            )}

            {/* Quick Stats */}
            <div className="flex gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-500">Topics:</span>{' '}
                <span className="text-white font-medium">{map.topics?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">E-A-Vs:</span>{' '}
                <span className="text-white font-medium">{map.eavs?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Briefs:</span>{' '}
                <span className="text-white font-medium">{briefs.length}</span>
              </div>
            </div>
          </div>

          {/* Score History */}
          {scoreHistory.length > 1 && (
            <div className="hidden lg:block">
              <p className="text-xs text-gray-500 mb-2">Recent Trend</p>
              <ScoreHistory scores={scoreHistory.map(h => h.score)} />
            </div>
          )}
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(['overview', 'details', 'actions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'details' && 'Score Breakdown'}
            {tab === 'actions' && `Actions (${prioritizedActions.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* What's Working */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <span>✓</span> What's Working
            </h3>
            {workingItems.length > 0 ? (
              <ul className="space-y-2">
                {workingItems.slice(0, 6).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span className="text-gray-300">{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Complete more steps to see what's working.</p>
            )}
          </Card>

          {/* Needs Improvement */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <span>→</span> Needs Improvement
            </h3>
            {improvements.length > 0 ? (
              <ul className="space-y-2">
                {improvements.slice(0, 6).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span className="text-gray-300">{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Great job! No major improvements needed.</p>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'details' && score?.breakdown && (
        <Card className="p-4">
          <SubScoreGrid breakdown={score.breakdown} showDetails />
        </Card>
      )}

      {activeTab === 'actions' && (
        <Card className="p-4">
          <ImprovementChecklist actions={prioritizedActions} />
        </Card>
      )}
    </div>
  );
};

/**
 * ImprovementChecklist - Actionable improvements with checkboxes
 */
interface ImprovementChecklistProps {
  actions: { category: string; text: string; priority: number }[];
}

const ImprovementChecklist: React.FC<ImprovementChecklistProps> = ({ actions }) => {
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const toggleComplete = (index: number) => {
    const newCompleted = new Set(completed);
    if (completed.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompleted(newCompleted);
  };

  if (actions.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">🎉</span>
        <p className="text-gray-400">No actions needed! Your score is looking great.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white">Priority Actions</h3>
        <span className="text-xs text-gray-500">
          {completed.size}/{actions.length} completed
        </span>
      </div>

      {actions.map((action, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
            completed.has(i)
              ? 'bg-green-900/20 border-green-700/50'
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}
          onClick={() => toggleComplete(i)}
        >
          {/* Checkbox */}
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              completed.has(i)
                ? 'bg-green-500 border-green-500'
                : 'border-gray-600'
            }`}
          >
            {completed.has(i) && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <p className={`text-sm ${completed.has(i) ? 'text-gray-500 line-through' : 'text-white'}`}>
              {action.text}
            </p>
            <span className="text-xs text-gray-500">{action.category}</span>
          </div>

          {/* Priority indicator */}
          <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            action.priority === 1 ? 'bg-red-900/50 text-red-400' :
            action.priority === 2 ? 'bg-amber-900/50 text-amber-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            P{action.priority}
          </div>
        </div>
      ))}

      {completed.size === actions.length && actions.length > 0 && (
        <div className="text-center py-4 text-green-400 text-sm">
          All actions completed! Recalculate your score to see improvements.
        </div>
      )}
    </div>
  );
};

export default ConfidenceDashboard;
