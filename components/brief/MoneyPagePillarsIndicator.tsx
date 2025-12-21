/**
 * Money Page 4 Pillars Indicator Component
 * Displays the 4 Pillars analysis for monetization topics
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { ContentBrief, MoneyPagePillarsResult, MoneyPagePillar, MoneyPagePillarScore, BusinessInfo, SEOPillars } from '../../types';
import { calculateMoneyPagePillarsScore, shouldAnalyze4Pillars, getPillarSummary } from '../../utils/moneyPagePillarScore';
import { PILLAR_DESCRIPTIONS, GRADE_THRESHOLDS } from '../../config/moneyPagePillars';
import {
  generateMinimalFixes,
  applyMinimalFixes,
} from '../../services/aiService';
import type { MinimalFixResult } from '../../services/aiService';
import { AppAction } from '../../state/appState';

interface MoneyPagePillarsIndicatorProps {
  brief: ContentBrief;
  topicClass?: string;
  compact?: boolean;
  // Optional props for AI fix functionality
  businessInfo?: BusinessInfo;
  pillars?: SEOPillars;
  dispatch?: React.Dispatch<AppAction>;
  onApplyFixes?: (updates: Partial<ContentBrief>) => Promise<void>;
}

/**
 * Circular progress indicator for a single pillar
 */
const PillarCircle: React.FC<{
  pillar: MoneyPagePillarScore;
  size?: number;
  onClick?: () => void;
}> = ({ pillar, size = 48, onClick }) => {
  const { score, pillar: pillarName } = pillar;
  const description = PILLAR_DESCRIPTIONS[pillarName];

  // Calculate circle properties
  const strokeWidth = size < 40 ? 3 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const color = getColor(score);

  return (
    <div
      className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
      onClick={onClick}
      title={`${description.title}: ${score}%`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg">{description.icon}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-400 mt-1">{score}%</span>
    </div>
  );
};

/**
 * Expanded checklist panel for a pillar
 */
const PillarChecklist: React.FC<{
  pillar: MoneyPagePillarScore;
  onClose: () => void;
}> = ({ pillar, onClose }) => {
  const description = PILLAR_DESCRIPTIONS[pillar.pillar];

  return (
    <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700 animate-fade-in">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{description.icon}</span>
            {description.title}
          </h4>
          <p className="text-xs text-gray-400">{description.description}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">&times;</button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {pillar.checklist.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-2 p-2 rounded text-xs ${
              item.checked ? 'bg-green-900/20' : 'bg-gray-900/50'
            }`}
          >
            <span className={item.checked ? 'text-green-400' : 'text-gray-500'}>
              {item.checked ? '✓' : '○'}
            </span>
            <div className="flex-1">
              <span className={item.checked ? 'text-gray-300' : 'text-gray-400'}>
                {item.label}
              </span>
              {item.description && (
                <p className="text-gray-500 text-[10px] mt-0.5">{item.description}</p>
              )}
            </div>
            <span className="text-gray-500 text-[10px]">+{item.weight}</span>
          </div>
        ))}
      </div>

      {pillar.suggestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Suggestions</p>
          <ul className="space-y-1">
            {pillar.suggestions.map((suggestion, i) => (
              <li key={i} className="text-xs text-amber-300 flex items-start gap-1">
                <span>💡</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Overall grade badge
 */
const GradeBadge: React.FC<{ grade: string; score: number }> = ({ grade, score }) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'B': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'C': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'D': return 'bg-orange-900/50 text-orange-300 border-orange-700';
      default: return 'bg-red-900/50 text-red-300 border-red-700';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getGradeColor(grade)}`}>
      <span className="text-lg font-bold">{grade}</span>
      <span className="text-sm">{score}%</span>
    </div>
  );
};

/**
 * Main component
 */
export const MoneyPagePillarsIndicator: React.FC<MoneyPagePillarsIndicatorProps> = ({
  brief,
  topicClass,
  compact = false,
  businessInfo,
  pillars,
  dispatch,
  onApplyFixes,
}) => {
  const [expandedPillar, setExpandedPillar] = useState<MoneyPagePillar | null>(null);
  const [isGeneratingFixes, setIsGeneratingFixes] = useState(false);
  const [generatedFixes, setGeneratedFixes] = useState<MinimalFixResult | null>(null);
  const [showFixesPanel, setShowFixesPanel] = useState(false);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);

  // Only show for monetization topics
  if (!shouldAnalyze4Pillars(topicClass)) {
    return null;
  }

  // Calculate scores
  const result = useMemo(() => calculateMoneyPagePillarsScore(brief), [brief]);

  // Check if AI fix is available
  const canUsAIFix = businessInfo && pillars && dispatch && onApplyFixes && result.overall_score < 80;

  // Handle generating AI fixes using the new smart fix system
  const handleGenerateFixes = useCallback(async () => {
    if (!businessInfo || !dispatch) return;

    setIsGeneratingFixes(true);
    try {
      // Use the new minimal fix system with modify-first strategy
      const fixes = await generateMinimalFixes(brief, result, businessInfo, dispatch);
      setGeneratedFixes(fixes);
      setShowFixesPanel(true);
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Failed to generate fixes: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsGeneratingFixes(false);
    }
  }, [brief, result, businessInfo, dispatch]);

  // Handle applying fixes using the new minimal fix system
  const handleApplyFixes = useCallback(async () => {
    if (!generatedFixes || !onApplyFixes) return;

    setIsApplyingFixes(true);
    try {
      // The updates are already computed by generateMinimalFixes
      await onApplyFixes(generatedFixes.updates);
      setShowFixesPanel(false);
      setGeneratedFixes(null);
      dispatch?.({
        type: 'SET_NOTIFICATION',
        payload: `${generatedFixes.summary}`
      });
    } catch (error) {
      dispatch?.({
        type: 'SET_ERROR',
        payload: `Failed to apply fixes: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplyingFixes(false);
    }
  }, [generatedFixes, onApplyFixes, dispatch]);

  if (compact) {
    // Compact mode - just show circles
    return (
      <div className="flex items-center gap-2">
        <GradeBadge grade={result.overall_grade} score={result.overall_score} />
        <div className="flex gap-1">
          {result.pillars.map(pillar => (
            <PillarCircle
              key={pillar.pillar}
              pillar={pillar}
              size={32}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Money Page 4 Pillars</h3>
          <p className="text-xs text-gray-400">Commercial page optimization score</p>
        </div>
        <GradeBadge grade={result.overall_grade} score={result.overall_score} />
      </div>

      {/* Pillar circles */}
      <div className="flex justify-around mb-4">
        {result.pillars.map(pillar => (
          <PillarCircle
            key={pillar.pillar}
            pillar={pillar}
            size={56}
            onClick={() => setExpandedPillar(
              expandedPillar === pillar.pillar ? null : pillar.pillar
            )}
          />
        ))}
      </div>

      {/* Pillar labels */}
      <div className="flex justify-around text-center mb-2">
        {result.pillars.map(pillar => (
          <div key={pillar.pillar} className="w-14">
            <p className="text-[10px] text-gray-400 leading-tight">
              {PILLAR_DESCRIPTIONS[pillar.pillar].title}
            </p>
          </div>
        ))}
      </div>

      {/* Critical missing warning with AI Fix button */}
      {result.missing_critical.length > 0 && (
        <div className="mt-3 p-2 bg-red-900/20 rounded border border-red-800/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs text-red-300 font-bold">⚠️ Critical Missing Elements</p>
              <p className="text-xs text-red-400 mt-1">
                {result.missing_critical.slice(0, 2).join(', ')}
                {result.missing_critical.length > 2 && ` +${result.missing_critical.length - 2} more`}
              </p>
            </div>
            {canUsAIFix && (
              <button
                onClick={handleGenerateFixes}
                disabled={isGeneratingFixes}
                className="flex-shrink-0 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isGeneratingFixes ? (
                  <>
                    <span className="animate-spin">⚙</span>
                    <span>Fixing...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI Fix</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Fixes Panel - New Smart Fix System */}
      {showFixesPanel && generatedFixes && (
        <div className="mt-3 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <span>✨</span>
              Smart AI Fixes
            </h4>
            <button
              onClick={() => setShowFixesPanel(false)}
              className="text-gray-400 hover:text-white text-lg"
            >
              &times;
            </button>
          </div>

          {/* Summary with stats */}
          <div className="mb-3 pb-2 border-b border-purple-500/20">
            <p className="text-xs text-gray-300">{generatedFixes.summary}</p>
            <div className="flex gap-4 mt-2 text-[10px]">
              <span className="text-green-400">
                ✓ {generatedFixes.fixedGaps.length} fixed
              </span>
              <span className="text-blue-400">
                📝 {generatedFixes.keywordsInjected} keywords injected
              </span>
              <span className="text-yellow-400">
                📊 Est. score: {generatedFixes.estimatedNewScore}%
              </span>
            </div>
          </div>

          {/* Fix details */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Title update */}
            {generatedFixes.updates.title && (
              <div className="p-2 bg-green-900/30 rounded text-xs border border-green-700/50">
                <span className="text-green-400 font-medium">Title (modified):</span>
                <p className="text-gray-200 mt-1">{generatedFixes.updates.title}</p>
              </div>
            )}

            {/* Meta description update */}
            {generatedFixes.updates.metaDescription && (
              <div className="p-2 bg-green-900/30 rounded text-xs border border-green-700/50">
                <span className="text-green-400 font-medium">Meta Description (modified):</span>
                <p className="text-gray-200 mt-1 text-[11px]">{generatedFixes.updates.metaDescription}</p>
              </div>
            )}

            {/* CTA */}
            {generatedFixes.updates.cta && (
              <div className="p-2 bg-orange-900/30 rounded text-xs border border-orange-700/50">
                <span className="text-orange-400 font-medium">CTA:</span>
                <span className="text-gray-200 ml-2">{generatedFixes.updates.cta}</span>
              </div>
            )}

            {/* Visuals */}
            {generatedFixes.updates.visuals?.featuredImagePrompt && (
              <div className="p-2 bg-blue-900/30 rounded text-xs border border-blue-700/50">
                <span className="text-blue-400 font-medium">Hero Image Prompt:</span>
                <p className="text-gray-200 mt-1 text-[10px]">{generatedFixes.updates.visuals.featuredImagePrompt}</p>
              </div>
            )}

            {/* Sections added (max 2 with new system) */}
            {generatedFixes.sectionsAdded > 0 && generatedFixes.updates.structured_outline && (
              <div className="p-2 bg-gray-800/50 rounded text-xs">
                <span className="text-blue-400 font-medium">
                  + {generatedFixes.sectionsAdded} new section{generatedFixes.sectionsAdded > 1 ? 's' : ''}
                </span>
                <div className="mt-1 space-y-1">
                  {generatedFixes.updates.structured_outline.slice(-generatedFixes.sectionsAdded).map((section, i) => (
                    <p key={i} className="text-gray-300 text-[10px]">• {section.heading}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Unfixed gaps warning */}
            {generatedFixes.unfixedGaps.length > 0 && (
              <div className="p-2 bg-yellow-900/20 rounded text-xs border border-yellow-700/30">
                <span className="text-yellow-400 font-medium">
                  ⚠ {generatedFixes.unfixedGaps.length} items need manual attention
                </span>
                <p className="text-gray-400 text-[10px] mt-1">
                  Some issues couldn't be auto-fixed without adding bloat.
                </p>
              </div>
            )}
          </div>

          {/* Apply button */}
          <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-purple-500/20">
            <button
              onClick={() => setShowFixesPanel(false)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFixes}
              disabled={isApplyingFixes || generatedFixes.fixedGaps.length === 0}
              className="px-4 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isApplyingFixes ? (
                <>
                  <span className="animate-spin">⚙</span>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Apply {generatedFixes.fixedGaps.length} Fixes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Expanded pillar checklist */}
      {expandedPillar && (
        <PillarChecklist
          pillar={result.pillars.find(p => p.pillar === expandedPillar)!}
          onClose={() => setExpandedPillar(null)}
        />
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && !expandedPillar && !showFixesPanel && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Top Recommendations</p>
            {canUsAIFix && result.missing_critical.length === 0 && (
              <button
                onClick={handleGenerateFixes}
                disabled={isGeneratingFixes}
                className="px-2 py-1 text-[10px] bg-purple-600/50 hover:bg-purple-500/50 text-purple-200 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isGeneratingFixes ? (
                  <span className="animate-spin">⚙</span>
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI Fix All</span>
                  </>
                )}
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {result.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-amber-400">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default MoneyPagePillarsIndicator;
