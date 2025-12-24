/**
 * Semantic Validation Panel Component
 *
 * Displays real-time validation results for the hero image composition
 * against semantic SEO rules. Shows errors, warnings, and auto-fix options.
 */

import React from 'react';
import {
  HeroValidationResult,
  HeroRuleResult
} from '../../../types';
import { ruleCategories } from '../../../config/heroImageRules';

// ============================================
// TYPES
// ============================================

interface SemanticValidationPanelProps {
  validation: HeroValidationResult | null;
  isValidating: boolean;
  onApplyFix: (ruleId: string) => void;
  onApplyAllFixes: () => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const SemanticValidationPanel: React.FC<SemanticValidationPanelProps> = ({
  validation,
  isValidating,
  onApplyFix,
  onApplyAllFixes,
  className = ''
}) => {
  // Calculate summary
  const errorCount = validation?.errors?.length || 0;
  const warningCount = validation?.warnings?.length || 0;
  const passedCount = validation?.ruleResults?.filter(r => r.passed).length || 0;
  const totalRules = validation?.ruleResults?.length || 0;
  const autoFixableCount = validation?.ruleResults?.filter(r => !r.passed && r.autoFixAvailable).length || 0;

  // Group results by category
  const categorizedResults = React.useMemo(() => {
    if (!validation?.ruleResults) return {};

    const grouped: Record<string, HeroRuleResult[]> = {};
    for (const result of validation.ruleResults) {
      if (!grouped[result.category]) {
        grouped[result.category] = [];
      }
      grouped[result.category].push(result);
    }
    return grouped;
  }, [validation?.ruleResults]);

  // Get status for summary
  const status = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'valid';

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header with Summary */}
      <div className={`px-3 py-2 border-b ${
        status === 'error' ? 'bg-red-900/30 border-red-800' :
        status === 'warning' ? 'bg-yellow-900/30 border-yellow-800' :
        'bg-green-900/30 border-green-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon status={status} isValidating={isValidating} />
            <div>
              <h3 className="text-sm font-medium text-white">
                Semantic Validation
              </h3>
              <p className={`text-xs ${
                status === 'error' ? 'text-red-400' :
                status === 'warning' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {isValidating ? 'Validating...' :
                 status === 'valid' ? 'All checks passed' :
                 `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Score Badge */}
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            status === 'error' ? 'bg-red-900/50 text-red-300' :
            status === 'warning' ? 'bg-yellow-900/50 text-yellow-300' :
            'bg-green-900/50 text-green-300'
          }`}>
            {totalRules > 0 ? Math.round((passedCount / totalRules) * 100) : 100}%
          </div>
        </div>

        {/* Auto-fix All Button */}
        {autoFixableCount > 0 && (
          <button
            onClick={onApplyAllFixes}
            className="mt-2 w-full px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Auto-fix {autoFixableCount} issue{autoFixableCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Validation Results by Category */}
      <div className="max-h-80 overflow-y-auto">
        {ruleCategories.map(category => {
          const results = categorizedResults[category.id] || [];
          if (results.length === 0) return null;

          const categoryErrors = results.filter(r => !r.passed && r.severity === 'error').length;
          const categoryWarnings = results.filter(r => !r.passed && r.severity === 'warning').length;
          const categoryPassed = results.filter(r => r.passed).length;

          return (
            <CategorySection
              key={category.id}
              category={category}
              results={results}
              errorCount={categoryErrors}
              warningCount={categoryWarnings}
              passedCount={categoryPassed}
              onApplyFix={onApplyFix}
            />
          );
        })}

        {totalRules === 0 && !isValidating && (
          <div className="p-4 text-center text-gray-400 text-sm">
            No validation rules applicable
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// STATUS ICON
// ============================================

interface StatusIconProps {
  status: 'valid' | 'warning' | 'error';
  isValidating: boolean;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status, isValidating }) => {
  if (isValidating) {
    return (
      <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    );
  }

  if (status === 'valid') {
    return (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (status === 'warning') {
    return (
      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }

  return (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

// ============================================
// CATEGORY SECTION
// ============================================

interface CategorySectionProps {
  category: typeof ruleCategories[number];
  results: HeroRuleResult[];
  errorCount: number;
  warningCount: number;
  passedCount: number;
  onApplyFix: (ruleId: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  results,
  errorCount,
  warningCount,
  passedCount,
  onApplyFix
}) => {
  const [isExpanded, setIsExpanded] = React.useState(errorCount > 0 || warningCount > 0);

  const categoryStatus = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'valid';

  return (
    <div className="border-b border-gray-700 last:border-0">
      {/* Category Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            categoryStatus === 'error' ? 'bg-red-500' :
            categoryStatus === 'warning' ? 'bg-yellow-500' :
            'bg-green-500'
          }`} />
          <span className="text-sm font-medium text-white">{category.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {passedCount}/{results.length}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Category Rules */}
      {isExpanded && (
        <div className="px-3 pb-2 space-y-2">
          {results.map(result => (
            <RuleResult
              key={result.ruleId}
              result={result}
              onApplyFix={() => onApplyFix(result.ruleId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// RULE RESULT
// ============================================

interface RuleResultProps {
  result: HeroRuleResult;
  onApplyFix: () => void;
}

const RuleResult: React.FC<RuleResultProps> = ({ result, onApplyFix }) => {
  return (
    <div className={`p-2 rounded text-xs ${
      result.passed
        ? 'bg-green-900/30 border border-green-800'
        : result.severity === 'error'
        ? 'bg-red-900/30 border border-red-800'
        : 'bg-yellow-900/30 border border-yellow-800'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {/* Status Icon */}
          {result.passed ? (
            <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : result.severity === 'error' ? (
            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          )}

          <div>
            <p className={`font-medium ${
              result.passed ? 'text-green-300' :
              result.severity === 'error' ? 'text-red-300' :
              'text-yellow-300'
            }`}>
              {result.ruleName}
            </p>
            <p className={`mt-0.5 ${
              result.passed ? 'text-green-400' :
              result.severity === 'error' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {result.message}
            </p>
          </div>
        </div>

        {/* Auto-fix Button */}
        {!result.passed && result.autoFixAvailable && (
          <button
            onClick={onApplyFix}
            className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${
              result.severity === 'error'
                ? 'bg-red-800 text-red-200 hover:bg-red-700'
                : 'bg-yellow-800 text-yellow-200 hover:bg-yellow-700'
            }`}
          >
            Fix
          </button>
        )}
      </div>
    </div>
  );
};

export default SemanticValidationPanel;
