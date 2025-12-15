/**
 * EavCompletenessCard Component
 *
 * Dashboard widget showing EAV completeness score with breakdown
 * and actionable recommendations.
 */

import React, { useMemo } from 'react';
import { SemanticTriple } from '../../types';
import {
  calculateEavCompleteness,
  getCompletenessGrade,
  EavCompletenessScore
} from '../../utils/eavAnalytics';
import { EavCategoryChart, EavCategoryBreakdown } from './EavCategoryChart';

interface EavCompletenessCardProps {
  eavs: SemanticTriple[];
  entityType?: string;
  compact?: boolean;
  showRecommendations?: boolean;
  showChart?: boolean;
  className?: string;
}

/**
 * Circular progress indicator for the main score
 */
const ScoreCircle: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({
  score,
  size = 'md'
}) => {
  const grade = getCompletenessGrade(score);

  const dimensions = {
    sm: { size: 64, stroke: 6, fontSize: 'text-lg' },
    md: { size: 96, stroke: 8, fontSize: 'text-2xl' },
    lg: { size: 128, stroke: 10, fontSize: 'text-4xl' }
  };

  const { size: dim, stroke, fontSize } = dimensions[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} className="transform -rotate-90">
        {/* Background circle - dark theme */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={grade.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${fontSize} font-bold`} style={{ color: grade.color }}>
          {score}
        </span>
        <span className="text-xs text-gray-400">{grade.label}</span>
      </div>
    </div>
  );
};

/**
 * Progress bar for individual metrics
 */
const MetricBar: React.FC<{
  label: string;
  value: number;
  color?: string;
  tooltip?: string;
}> = ({ label, value, color, tooltip }) => {
  const barColor = color || (value >= 80 ? '#22c55e' : value >= 50 ? '#eab308' : '#ef4444');

  return (
    <div className="space-y-1" title={tooltip}>
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium" style={{ color: barColor }}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
};

/**
 * Main EAV Completeness Card component
 */
export const EavCompletenessCard: React.FC<EavCompletenessCardProps> = ({
  eavs,
  entityType,
  compact = false,
  showRecommendations = true,
  showChart = true,
  className = ''
}) => {
  const completeness = useMemo(
    () => calculateEavCompleteness(eavs, entityType),
    [eavs, entityType]
  );

  const grade = getCompletenessGrade(completeness.overall);

  if (eavs.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No EAVs to analyze</p>
          <p className="text-xs mt-1 text-gray-500">Add semantic triples to see completeness score</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-3 ${className}`}>
        <div className="flex items-center gap-3">
          <ScoreCircle score={completeness.overall} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white">
              EAV Completeness
            </div>
            <div className="text-xs text-gray-400">
              {eavs.length} triples • {grade.label}
            </div>
            {completeness.missing.length > 0 && (
              <div className="text-xs text-amber-400 mt-1">
                Missing: {completeness.missing.map(m => m.category).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="font-medium text-white">EAV Completeness</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Semantic coverage analysis • {eavs.length} triples
        </p>
      </div>

      {/* Main content */}
      <div className="p-4">
        <div className="flex gap-6">
          {/* Score circle */}
          <div className="flex-shrink-0">
            <ScoreCircle score={completeness.overall} size="md" />
          </div>

          {/* Breakdown metrics */}
          <div className="flex-1 space-y-3">
            <MetricBar
              label="ROOT Coverage"
              value={completeness.breakdown.rootCoverage}
              tooltip="Core defining attributes that establish entity identity"
            />
            <MetricBar
              label="UNIQUE Coverage"
              value={completeness.breakdown.uniqueCoverage}
              tooltip="Differentiating attributes for competitive advantage"
            />
            <MetricBar
              label="RARE Coverage"
              value={completeness.breakdown.rareCoverage}
              tooltip="Detailed attributes demonstrating deep expertise"
            />
            <MetricBar
              label="Category Balance"
              value={completeness.breakdown.categoryBalance}
              tooltip="How well-distributed attributes are across categories"
            />
          </div>
        </div>

        {/* Category distribution chart */}
        {showChart && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Category Distribution
            </h4>
            <EavCategoryChart eavs={eavs} showLegend={true} />
          </div>
        )}

        {/* Recommendations */}
        {showRecommendations && completeness.recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Recommendations
            </h4>
            <ul className="space-y-2">
              {completeness.recommendations.slice(0, 3).map((rec, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-gray-400">
                  <span className="text-amber-400 flex-shrink-0">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing categories warning */}
        {completeness.missing.length > 0 && (
          <div className="mt-4 p-3 bg-amber-900/30 rounded-md border border-amber-700/50">
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-amber-200">
                  Missing Categories: {completeness.missing.map(m => m.category).join(', ')}
                </p>
                <p className="text-xs text-amber-300/80 mt-1">
                  Add more attributes in these categories to improve authority.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Inline badge version for headers/lists
 */
export const EavCompletenessBadge: React.FC<{
  eavs: SemanticTriple[];
  showLabel?: boolean;
}> = ({ eavs, showLabel = false }) => {
  const completeness = useMemo(() => calculateEavCompleteness(eavs), [eavs]);
  const grade = getCompletenessGrade(completeness.overall);

  if (eavs.length === 0) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${grade.color}20`,
        color: grade.color
      }}
      title={`EAV Completeness: ${completeness.overall}% (${grade.label})`}
    >
      <span className="font-bold">{grade.grade}</span>
      {showLabel && <span>{completeness.overall}%</span>}
    </div>
  );
};

export default EavCompletenessCard;
