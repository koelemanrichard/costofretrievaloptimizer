/**
 * ArticleQualityReport Component
 *
 * Displays a comprehensive quality report after content generation completes.
 * Shows overall score, category breakdowns, systemic checks, and actionable issues.
 *
 * Features:
 * - Overall quality score with visual indicator
 * - Category-by-category breakdown with compliance bars
 * - Systemic context checks (language, pillars, audience)
 * - List of issues requiring attention with fix actions
 * - Pass-by-pass change history timeline
 * - Export/share capabilities
 *
 * @module components/quality
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  RuleRegistry,
  QualityRule,
  RuleCategory,
} from '../../services/ai/contentGeneration/rulesEngine/ruleRegistry';
import type { PassDelta } from '../../services/ai/contentGeneration/tracking';
import { ValidationViolation } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface ArticleQualityReportProps {
  /** Unique identifier for the content generation job */
  jobId: string;
  /** Current violations from the generated content */
  violations: ValidationViolation[];
  /** Pass deltas from generation history */
  passDeltas: PassDelta[];
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Systemic checks results */
  systemicChecks?: SystemicCheckResult[];
  /** Callback when user approves the article */
  onApprove: () => void;
  /** Callback to request fixes for specific rules */
  onRequestFix: (ruleIds: string[]) => void;
  /** Callback to edit the article manually */
  onEdit: () => void;
  /** Callback to regenerate the article */
  onRegenerate: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface SystemicCheckResult {
  checkId: string;
  name: string;
  status: 'pass' | 'warning' | 'fail';
  value?: string | number;
  expected?: string | number;
  details?: string;
}

interface CategoryScore {
  category: RuleCategory;
  total: number;
  passing: number;
  failing: number;
  criticalFailing: number;
  score: number;
}

// =============================================================================
// Constants
// =============================================================================

const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  acceptable: 60,
  poor: 0,
} as const;

const DEFAULT_SYSTEMIC_CHECKS: SystemicCheckResult[] = [
  { checkId: 'S1', name: 'Output Language', status: 'pass', value: 'English', expected: 'English' },
  { checkId: 'S2', name: 'Regional Spelling', status: 'pass', value: 'US English', expected: 'US English' },
  { checkId: 'S3', name: 'Pillar Alignment', status: 'pass', value: '85%', expected: '70%+' },
  { checkId: 'S4', name: 'Readability Level', status: 'pass', value: 'Grade 8', expected: 'Grade 6-10' },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'text-green-400';
  if (score >= SCORE_THRESHOLDS.good) return 'text-blue-400';
  if (score >= SCORE_THRESHOLDS.acceptable) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get score background color
 */
function getScoreBgColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'bg-green-900/30 border-green-700/50';
  if (score >= SCORE_THRESHOLDS.good) return 'bg-blue-900/30 border-blue-700/50';
  if (score >= SCORE_THRESHOLDS.acceptable) return 'bg-yellow-900/30 border-yellow-700/50';
  return 'bg-red-900/30 border-red-700/50';
}

/**
 * Get score label
 */
function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'Excellent';
  if (score >= SCORE_THRESHOLDS.good) return 'Good';
  if (score >= SCORE_THRESHOLDS.acceptable) return 'Acceptable';
  return 'Needs Improvement';
}

/**
 * Get bar color based on score
 */
function getBarColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'bg-green-500';
  if (score >= SCORE_THRESHOLDS.good) return 'bg-blue-500';
  if (score >= SCORE_THRESHOLDS.acceptable) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Get systemic check status color
 */
function getCheckStatusColor(status: SystemicCheckResult['status']): string {
  switch (status) {
    case 'pass':
      return 'text-green-400';
    case 'warning':
      return 'text-yellow-400';
    case 'fail':
      return 'text-red-400';
  }
}

/**
 * Get systemic check status icon
 */
function getCheckStatusIcon(status: SystemicCheckResult['status']): string {
  switch (status) {
    case 'pass':
      return '\u2713';
    case 'warning':
      return '\u26A0';
    case 'fail':
      return '\u2717';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ScoreGaugeProps {
  score: number;
  className?: string;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, className = '' }) => {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          className="text-gray-700"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        {/* Progress circle */}
        <circle
          className={getScoreColor(score)}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  );
};

interface CategoryBarProps {
  category: CategoryScore;
  onClick?: () => void;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ category, onClick }) => {
  return (
    <div
      className="group cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white font-medium group-hover:text-blue-300 transition-colors">
          {category.category}
        </span>
        <div className="flex items-center gap-2">
          {category.criticalFailing > 0 && (
            <span className="text-xs text-red-400 font-medium">
              {category.criticalFailing} critical
            </span>
          )}
          <span className={`text-sm font-medium ${getScoreColor(category.score)}`}>
            {category.score}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getBarColor(category.score)}`}
          style={{ width: `${category.score}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {category.passing}/{category.total} rules passing
      </div>
    </div>
  );
};

interface SystemicCheckItemProps {
  check: SystemicCheckResult;
}

const SystemicCheckItem: React.FC<SystemicCheckItemProps> = ({ check }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${getCheckStatusColor(check.status)}`}>
          {getCheckStatusIcon(check.status)}
        </span>
        <div>
          <p className="text-white text-sm font-medium">{check.name}</p>
          {check.details && (
            <p className="text-gray-400 text-xs mt-0.5">{check.details}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-medium ${getCheckStatusColor(check.status)}`}>
          {check.value}
        </p>
        {check.expected && (
          <p className="text-xs text-gray-500">Expected: {check.expected}</p>
        )}
      </div>
    </div>
  );
};

interface IssueItemProps {
  violation: ValidationViolation;
  rule?: QualityRule;
  onRequestFix: (ruleId: string) => void;
}

const IssueItem: React.FC<IssueItemProps> = ({ violation, rule, onRequestFix }) => {
  return (
    <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-red-400">{violation.rule}</span>
            {rule?.isCritical && (
              <span className="px-1.5 py-0.5 text-xs bg-red-900/50 text-red-300 rounded">
                Critical
              </span>
            )}
          </div>
          <p className="text-white text-sm">{violation.text}</p>
          {violation.suggestion && (
            <p className="text-gray-400 text-xs mt-1">{violation.suggestion}</p>
          )}
        </div>
        <button
          onClick={() => onRequestFix(violation.rule)}
          className="px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded hover:bg-blue-900/50 transition-colors shrink-0"
        >
          Fix
        </button>
      </div>
    </div>
  );
};

interface PassHistoryItemProps {
  delta: PassDelta;
  passNumber: number;
}

const PassHistoryItem: React.FC<PassHistoryItemProps> = ({ delta, passNumber }) => {
  const netChangeColor = delta.netChange > 0
    ? 'text-green-400'
    : delta.netChange < 0
    ? 'text-red-400'
    : 'text-gray-400';

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
      <span className="text-sm text-gray-400 w-16">Pass {passNumber}</span>
      <div className="flex-1 flex items-center gap-3">
        {delta.rulesFixed.length > 0 && (
          <span className="text-xs text-green-400">+{delta.rulesFixed.length} fixed</span>
        )}
        {delta.rulesRegressed.length > 0 && (
          <span className="text-xs text-red-400">-{delta.rulesRegressed.length} regressed</span>
        )}
        {delta.rulesFixed.length === 0 && delta.rulesRegressed.length === 0 && (
          <span className="text-xs text-gray-500">No changes</span>
        )}
      </div>
      <span className={`text-sm font-medium ${netChangeColor}`}>
        Net: {delta.netChange > 0 ? '+' : ''}{delta.netChange}
      </span>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const ArticleQualityReport: React.FC<ArticleQualityReportProps> = ({
  jobId,
  violations,
  passDeltas: rawPassDeltas,
  overallScore,
  systemicChecks = DEFAULT_SYSTEMIC_CHECKS,
  onApprove,
  onRequestFix,
  onEdit,
  onRegenerate,
  className = '',
}) => {
  // Defensive guard: ensure passDeltas is always an array
  const passDeltas = Array.isArray(rawPassDeltas) ? rawPassDeltas : [];

  const [showPassHistory, setShowPassHistory] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());

  // Calculate category scores
  const categoryScores: CategoryScore[] = useMemo(() => {
    const allRules = RuleRegistry.getAllRules();
    const categories = RuleRegistry.getCategories();

    return categories.map(category => {
      const categoryRules = allRules.filter(r => r.category === category);
      const failingRuleIds = new Set(violations.map(v => v.rule));

      const failing = categoryRules.filter(r => failingRuleIds.has(r.id)).length;
      const criticalFailing = categoryRules.filter(
        r => r.isCritical && failingRuleIds.has(r.id)
      ).length;
      const passing = categoryRules.length - failing;
      const score = categoryRules.length > 0
        ? Math.round((passing / categoryRules.length) * 100)
        : 100;

      return {
        category,
        total: categoryRules.length,
        passing,
        failing,
        criticalFailing,
        score,
      };
    }).sort((a, b) => a.score - b.score); // Sort by score ascending (worst first)
  }, [violations]);

  // Get issues grouped by severity
  const criticalIssues = useMemo(() => {
    const allRules = RuleRegistry.getAllRules();
    return violations.filter(v => {
      const rule = allRules.find(r => r.id === v.rule);
      return rule?.isCritical;
    });
  }, [violations]);

  const otherIssues = useMemo(() => {
    const allRules = RuleRegistry.getAllRules();
    return violations.filter(v => {
      const rule = allRules.find(r => r.id === v.rule);
      return !rule?.isCritical;
    });
  }, [violations]);

  // Handlers
  const handleRequestFix = useCallback((ruleId: string) => {
    onRequestFix([ruleId]);
  }, [onRequestFix]);

  const handleFixSelected = useCallback(() => {
    onRequestFix(Array.from(selectedRuleIds));
  }, [onRequestFix, selectedRuleIds]);

  const toggleRuleSelection = useCallback((ruleId: string) => {
    setSelectedRuleIds(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  const allRules = useMemo(() => RuleRegistry.getAllRules(), []);

  return (
    <div className={`article-quality-report ${className}`}>
      {/* Header with score */}
      <div className={`p-6 rounded-xl border ${getScoreBgColor(overallScore)} mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Quality Report</h2>
            <p className={`text-lg font-medium ${getScoreColor(overallScore)}`}>
              {getScoreLabel(overallScore)}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {violations.length === 0
                ? 'All quality checks passed!'
                : `${violations.length} issue${violations.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <ScoreGauge score={overallScore} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onApprove}
            disabled={criticalIssues.length > 0}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${criticalIssues.length > 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-500'}
            `}
          >
            Approve Article
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-lg hover:bg-blue-900/50 transition-colors"
          >
            Edit Manually
          </button>
          <button
            onClick={onRegenerate}
            className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Category breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
          <div className="space-y-2">
            {categoryScores.map(category => (
              <CategoryBar key={category.category} category={category} />
            ))}
          </div>
        </div>

        {/* Right column: Systemic checks */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Systemic Checks</h3>
          <div className="space-y-2">
            {systemicChecks.map(check => (
              <SystemicCheckItem key={check.checkId} check={check} />
            ))}
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-red-400 mb-4">
            Critical Issues ({criticalIssues.length})
          </h3>
          <div className="space-y-2">
            {criticalIssues.map((violation, index) => (
              <IssueItem
                key={`${violation.rule}-${index}`}
                violation={violation}
                rule={allRules.find(r => r.id === violation.rule)}
                onRequestFix={handleRequestFix}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Issues */}
      {otherIssues.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-yellow-400">
              Other Issues ({otherIssues.length})
            </h3>
            {selectedRuleIds.size > 0 && (
              <button
                onClick={handleFixSelected}
                className="px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded hover:bg-blue-900/50 transition-colors"
              >
                Fix Selected ({selectedRuleIds.size})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {otherIssues.slice(0, 10).map((violation, index) => (
              <IssueItem
                key={`${violation.rule}-${index}`}
                violation={violation}
                rule={allRules.find(r => r.id === violation.rule)}
                onRequestFix={handleRequestFix}
              />
            ))}
            {otherIssues.length > 10 && (
              <p className="text-sm text-gray-500 text-center py-2">
                + {otherIssues.length - 10} more issues
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pass History */}
      {passDeltas.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowPassHistory(!showPassHistory)}
            className="flex items-center gap-2 text-lg font-semibold text-white mb-4 hover:text-blue-300 transition-colors"
          >
            <span className={`transform transition-transform ${showPassHistory ? 'rotate-90' : ''}`}>
              {'\u25B6'}
            </span>
            Pass History ({passDeltas.length} passes)
          </button>

          {showPassHistory && (
            <div className="space-y-2">
              {passDeltas.map((delta, index) => (
                <PassHistoryItem
                  key={delta.passNumber}
                  delta={delta}
                  passNumber={delta.passNumber}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">
          Job: {jobId.slice(0, 8)}...
        </span>
        <span className="text-xs text-gray-500">
          Report generated at {new Date().toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default ArticleQualityReport;
