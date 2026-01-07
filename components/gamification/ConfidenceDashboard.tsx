/**
 * ConfidenceDashboard
 *
 * Main dashboard showing:
 * - Overall Semantic Authority Score
 * - Sub-score breakdown
 * - What's working vs what needs improvement
 * - Actionable next steps with AI-powered Auto-Fix
 * - Progress over time
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TopicalMap, ContentBrief, BusinessInfo, SEOPillars, SemanticTriple, EnrichedTopic } from '../../types';
import { useSemanticScore } from '../../hooks/gamification/useSemanticScore';
import { SemanticScoreDisplay } from './SemanticScoreDisplay';
import { TierBadge, TierProgress } from './TierBadge';
import { SubScoreGrid } from './SubScoreBar';
import { ScoreHistory } from './ScoreChangeIndicator';
import { Card } from '../ui/Card';
import AutoFixButton from './AutoFixButton';
import AutoFixPreviewModal from './AutoFixPreviewModal';
import { AutoFixType, ImprovementSuggestion } from '../../utils/gamification/scoreCalculations';
import {
  generateFixPreview,
  AutoFixPreview,
  AutoFixContext,
  applyEavFix,
  applyIntentFix,
  applyTopicsFix,
  TopicIntentUpdate,
  TopicSuggestion
} from '../../services/ai/autoFixService';
import { AppAction } from '../../state/appState';

interface ConfidenceDashboardProps {
  map: TopicalMap | null;
  briefs?: ContentBrief[];
  compact?: boolean;
  className?: string;
  // Props needed for Auto-Fix functionality
  dispatch?: React.Dispatch<AppAction>;
  onSaveEavs?: (eavs: SemanticTriple[]) => Promise<void>;
  onSaveTopics?: (topics: EnrichedTopic[]) => Promise<void>;
  onAddTopic?: (topic: { title: string; type: 'core' | 'outer'; search_intent?: string; parentId?: string }) => Promise<void>;
}

export const ConfidenceDashboard: React.FC<ConfidenceDashboardProps> = ({
  map,
  briefs = [],
  compact = false,
  className = '',
  dispatch,
  onSaveEavs,
  onSaveTopics,
  onAddTopic
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'actions'>('overview');
  const {
    score,
    currentTier,
    scoreHistory,
    isCalculating
  } = useSemanticScore(map, briefs);

  // Auto-Fix state
  const [autoFixModalOpen, setAutoFixModalOpen] = useState(false);
  const [autoFixPreview, setAutoFixPreview] = useState<AutoFixPreview | null>(null);
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [currentFixType, setCurrentFixType] = useState<AutoFixType>(null);

  // Check if auto-fix is available (needs dispatch and save handlers)
  const canAutoFix = Boolean(dispatch && (onSaveEavs || onSaveTopics || onAddTopic));

  // Aggregate all improvements and details
  const { improvements, workingItems, prioritizedActions } = useMemo(() => {
    if (!score?.breakdown) {
      return { improvements: [], workingItems: [], prioritizedActions: [] };
    }

    const allImprovements: { category: string; text: string; priority: number; autoFixType: AutoFixType }[] = [];
    const allWorking: { category: string; text: string }[] = [];

    const categories = [
      { key: 'entityClarity', name: 'Entity Clarity', basePriority: 1 },
      { key: 'topicalCoverage', name: 'Topical Coverage', basePriority: 2 },
      { key: 'intentAlignment', name: 'Intent Alignment', basePriority: 3 },
      { key: 'competitiveParity', name: 'Competitive Parity', basePriority: 4 },
      { key: 'contentReadiness', name: 'Content Readiness', basePriority: 5 }
    ] as const;

    categories.forEach(({ key, name, basePriority }) => {
      const subScore = score.breakdown[key];

      // Improvements are now ImprovementSuggestion objects
      subScore.improvements.forEach((improvement: ImprovementSuggestion) => {
        allImprovements.push({
          category: name,
          text: improvement.text,
          priority: improvement.priority ?? basePriority,
          autoFixType: improvement.autoFixType
        });
      });

      subScore.details.forEach((text: string) => {
        allWorking.push({ category: name, text });
      });
    });

    // Sort improvements by priority and limit
    const sorted = allImprovements
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 8);

    return {
      improvements: allImprovements,
      workingItems: allWorking,
      prioritizedActions: sorted
    };
  }, [score]);

  // Handle auto-fix button click
  const handleAutoFix = useCallback(async (fixType: AutoFixType) => {
    if (!fixType || !map || !dispatch) return;

    setCurrentFixType(fixType);
    setAutoFixModalOpen(true);
    setIsLoadingFix(true);
    setAutoFixPreview(null);

    try {
      const context: AutoFixContext = {
        map,
        businessInfo: (map.business_info || {}) as BusinessInfo,
        pillars: (map.pillars || {}) as SEOPillars,
        dispatch
      };

      const preview = await generateFixPreview(fixType, context);
      setAutoFixPreview(preview);
    } catch (error) {
      console.error('[ConfidenceDashboard] Auto-fix preview generation failed:', error);
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'AutoFix',
          message: `Failed to generate fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failure',
          timestamp: Date.now()
        }
      });
    } finally {
      setIsLoadingFix(false);
    }
  }, [map, dispatch]);

  // Handle applying the fix
  const handleApplyFix = useCallback(async (selectedItems: unknown[]) => {
    if (!autoFixPreview || !map || !dispatch) return;

    setIsApplyingFix(true);

    try {
      const context: AutoFixContext = {
        map,
        businessInfo: (map.business_info || {}) as BusinessInfo,
        pillars: (map.pillars || {}) as SEOPillars,
        dispatch
      };

      if (currentFixType === 'add_unique_eavs' || currentFixType === 'expand_eavs' || currentFixType === 'add_root_eavs' || currentFixType === 'add_common_eavs') {
        if (onSaveEavs) {
          const preview = { ...autoFixPreview, items: selectedItems as SemanticTriple[] };
          const result = await applyEavFix(preview as AutoFixPreview<SemanticTriple>, context, onSaveEavs);
          if (result.success) {
            dispatch({
              type: 'LOG_EVENT',
              payload: {
                service: 'AutoFix',
                message: result.message,
                status: 'success',
                timestamp: Date.now()
              }
            });
          }
        }
      } else if (currentFixType === 'analyze_intents') {
        if (onSaveTopics) {
          const preview = { ...autoFixPreview, items: selectedItems as TopicIntentUpdate[] };
          const result = await applyIntentFix(preview as AutoFixPreview<TopicIntentUpdate>, context, onSaveTopics);
          if (result.success) {
            dispatch({
              type: 'LOG_EVENT',
              payload: {
                service: 'AutoFix',
                message: result.message,
                status: 'success',
                timestamp: Date.now()
              }
            });
          }
        }
      } else if (currentFixType === 'add_buyer_topics' || currentFixType === 'add_supporting_topics') {
        if (onAddTopic) {
          const preview = { ...autoFixPreview, items: selectedItems as TopicSuggestion[] };
          // Helper to find parent topic ID by title
          const getParentIdByTitle = (parentTitle: string): string | undefined => {
            const topics = (map.topics || []) as EnrichedTopic[];
            const parent = topics.find(t => t.title.toLowerCase() === parentTitle.toLowerCase());
            return parent?.id;
          };
          const result = await applyTopicsFix(preview as AutoFixPreview<TopicSuggestion>, context, onAddTopic, getParentIdByTitle);
          if (result.success) {
            dispatch({
              type: 'LOG_EVENT',
              payload: {
                service: 'AutoFix',
                message: result.message,
                status: 'success',
                timestamp: Date.now()
              }
            });
          }
        }
      }

      setAutoFixModalOpen(false);
    } catch (error) {
      console.error('[ConfidenceDashboard] Auto-fix apply failed:', error);
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'AutoFix',
          message: `Failed to apply fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failure',
          timestamp: Date.now()
        }
      });
    } finally {
      setIsApplyingFix(false);
    }
  }, [autoFixPreview, currentFixType, map, dispatch, onSaveEavs, onSaveTopics]);

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
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="text-gray-300 flex-1">{item.text}</span>
                    {canAutoFix && item.autoFixType && (
                      <AutoFixButton
                        fixType={item.autoFixType}
                        onFix={() => handleAutoFix(item.autoFixType)}
                        size="sm"
                      />
                    )}
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
          <ImprovementChecklist
            actions={prioritizedActions}
            canAutoFix={canAutoFix}
            onAutoFix={handleAutoFix}
          />
        </Card>
      )}

      {/* Auto-Fix Preview Modal */}
      <AutoFixPreviewModal
        isOpen={autoFixModalOpen}
        onClose={() => setAutoFixModalOpen(false)}
        preview={autoFixPreview}
        isLoading={isLoadingFix}
        isApplying={isApplyingFix}
        onApply={handleApplyFix}
      />
    </div>
  );
};

/**
 * ImprovementChecklist - Actionable improvements with checkboxes and auto-fix
 */
interface ImprovementChecklistProps {
  actions: { category: string; text: string; priority: number; autoFixType: AutoFixType }[];
  canAutoFix?: boolean;
  onAutoFix?: (fixType: AutoFixType) => void;
}

const ImprovementChecklist: React.FC<ImprovementChecklistProps> = ({
  actions,
  canAutoFix = false,
  onAutoFix
}) => {
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

          {/* Auto-Fix button */}
          {canAutoFix && action.autoFixType && onAutoFix && !completed.has(i) && (
            <AutoFixButton
              fixType={action.autoFixType}
              onFix={() => onAutoFix(action.autoFixType)}
              size="sm"
            />
          )}

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
