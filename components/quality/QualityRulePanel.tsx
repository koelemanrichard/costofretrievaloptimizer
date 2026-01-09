/**
 * QualityRulePanel Component
 *
 * Displays the full list of 113+ quality rules with their compliance status.
 * Used in the quality dashboard for rule-by-rule visibility.
 *
 * Features:
 * - Groups rules by category (18 categories)
 * - Expandable category sections
 * - Filter by severity (error/warning/info)
 * - Filter by status (passing/failing/all)
 * - Search by rule name/ID
 *
 * @module components/quality
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  RuleRegistry,
  QualityRule,
  RuleCategory,
  RuleSeverity,
} from '../../services/ai/contentGeneration/rulesEngine/ruleRegistry';
import { ValidationViolation } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface QualityRulePanelProps {
  /** Current violations to show status */
  violations?: ValidationViolation[];
  /** Click handler for rule details */
  onRuleClick?: (ruleId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

type RuleStatus = 'passing' | 'failing' | 'not-checked';
type StatusFilter = 'all' | 'passing' | 'failing' | 'not-checked';

interface RuleWithStatus extends QualityRule {
  status: RuleStatus;
  violation?: ValidationViolation;
}

interface CategoryStats {
  total: number;
  passing: number;
  failing: number;
  notChecked: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the status of a rule based on violations
 */
function getRuleStatus(rule: QualityRule, violations: ValidationViolation[]): RuleStatus {
  // Find if there's a violation for this rule
  const violation = violations.find(v => v.rule === rule.id || v.rule === rule.name);

  if (violation) {
    return 'failing';
  }

  // If no violations array provided or empty, mark as not-checked
  if (!violations || violations.length === 0) {
    return 'not-checked';
  }

  // If we have violations but this rule isn't in them, it's passing
  return 'passing';
}

/**
 * Get category statistics
 */
function getCategoryStats(rules: RuleWithStatus[]): CategoryStats {
  return rules.reduce(
    (acc, rule) => {
      acc.total++;
      if (rule.status === 'passing') acc.passing++;
      else if (rule.status === 'failing') acc.failing++;
      else acc.notChecked++;
      return acc;
    },
    { total: 0, passing: 0, failing: 0, notChecked: 0 }
  );
}

/**
 * Get severity badge styling
 */
function getSeverityBadgeClass(severity: RuleSeverity): string {
  switch (severity) {
    case 'error':
      return 'bg-red-900/50 text-red-300 border-red-700';
    case 'warning':
      return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    case 'info':
      return 'bg-blue-900/50 text-blue-300 border-blue-700';
    default:
      return 'bg-gray-700 text-gray-300 border-gray-600';
  }
}

/**
 * Get status icon and styling
 */
function getStatusDisplay(status: RuleStatus): { icon: string; className: string; label: string } {
  switch (status) {
    case 'passing':
      return { icon: '\u2713', className: 'text-green-400', label: 'Passing' };
    case 'failing':
      return { icon: '\u2717', className: 'text-red-400', label: 'Failing' };
    case 'not-checked':
      return { icon: '\u2014', className: 'text-gray-500', label: 'Not checked' };
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

interface CategoryHeaderProps {
  category: RuleCategory;
  stats: CategoryStats;
  isExpanded: boolean;
  onToggle: () => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  category,
  stats,
  isExpanded,
  onToggle,
}) => {
  const passingPercentage = stats.total > 0 ? Math.round((stats.passing / stats.total) * 100) : 0;

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 bg-gray-800/70 hover:bg-gray-800 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
          {'\u25B6'}
        </span>
        <span className="font-medium text-white">{category}</span>
        <span className="text-sm text-gray-400">
          ({stats.passing}/{stats.total} passing)
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Progress bar */}
        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              passingPercentage >= 80
                ? 'bg-green-500'
                : passingPercentage >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${passingPercentage}%` }}
          />
        </div>
        {/* Stats */}
        <div className="flex items-center gap-2 text-sm">
          {stats.failing > 0 && (
            <span className="text-red-400">{stats.failing} failing</span>
          )}
        </div>
      </div>
    </button>
  );
};

interface RuleItemProps {
  rule: RuleWithStatus;
  onClick?: (ruleId: string) => void;
}

const RuleItem: React.FC<RuleItemProps> = ({ rule, onClick }) => {
  const statusDisplay = getStatusDisplay(rule.status);

  return (
    <div
      className={`
        flex items-center gap-4 p-3 rounded-lg border border-gray-700/50
        hover:border-gray-600 hover:bg-gray-800/30 transition-all cursor-pointer
        ${rule.status === 'failing' ? 'bg-red-900/10' : ''}
      `}
      onClick={() => onClick?.(rule.id)}
    >
      {/* Status Icon */}
      <span className={`text-lg font-bold ${statusDisplay.className}`} title={statusDisplay.label}>
        {statusDisplay.icon}
      </span>

      {/* Rule ID */}
      <span className="font-mono text-sm text-gray-400 w-8">{rule.id}</span>

      {/* Rule Name */}
      <div className="flex-1 min-w-0">
        <p className="text-white truncate">{rule.name}</p>
        {rule.status === 'failing' && rule.violation && (
          <p className="text-red-400 text-sm truncate mt-0.5">
            {rule.violation.text}
          </p>
        )}
      </div>

      {/* Severity Badge */}
      <span
        className={`
          px-2 py-0.5 text-xs rounded border font-medium
          ${getSeverityBadgeClass(rule.severity)}
        `}
      >
        {rule.severity}
      </span>

      {/* Critical indicator */}
      {rule.isCritical && (
        <span className="text-amber-400 text-xs" title="Critical rule">
          !
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const QualityRulePanel: React.FC<QualityRulePanelProps> = ({
  violations = [],
  onRuleClick,
  className = '',
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<RuleSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<RuleCategory>>(new Set());

  // Get all rules with status
  const rulesWithStatus: RuleWithStatus[] = useMemo(() => {
    return RuleRegistry.getAllRules().map(rule => ({
      ...rule,
      status: getRuleStatus(rule, violations),
      violation: violations.find(v => v.rule === rule.id || v.rule === rule.name),
    }));
  }, [violations]);

  // Apply filters
  const filteredRules = useMemo(() => {
    return rulesWithStatus.filter(rule => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = rule.id.toLowerCase().includes(query);
        const matchesName = rule.name.toLowerCase().includes(query);
        const matchesDescription = rule.description.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesDescription) {
          return false;
        }
      }

      // Severity filter
      if (severityFilter !== 'all' && rule.severity !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && rule.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [rulesWithStatus, searchQuery, severityFilter, statusFilter]);

  // Group filtered rules by category
  const rulesByCategory = useMemo(() => {
    const grouped = new Map<RuleCategory, RuleWithStatus[]>();
    const categories = RuleRegistry.getCategories();

    // Initialize all categories (even empty ones get shown)
    categories.forEach(cat => grouped.set(cat, []));

    // Populate with filtered rules
    filteredRules.forEach(rule => {
      const existing = grouped.get(rule.category) || [];
      existing.push(rule);
      grouped.set(rule.category, existing);
    });

    return grouped;
  }, [filteredRules]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const stats = { passing: 0, failing: 0, notChecked: 0 };
    rulesWithStatus.forEach(rule => {
      if (rule.status === 'passing') stats.passing++;
      else if (rule.status === 'failing') stats.failing++;
      else stats.notChecked++;
    });
    return stats;
  }, [rulesWithStatus]);

  // Handlers
  const toggleCategory = useCallback((category: RuleCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(RuleRegistry.getCategories()));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  return (
    <div className={`quality-rule-panel ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Quality Rules</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Expand all
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search rules..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-800 text-white rounded-md px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
          />

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as RuleSeverity | 'all')}
            className="bg-gray-800 text-white rounded-md px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All severities</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-gray-800 text-white rounded-md px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="passing">Passing</option>
            <option value="failing">Failing</option>
            <option value="not-checked">Not checked</option>
          </select>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-400">
            <span className="font-bold">{'\u2713'}</span> {summaryStats.passing} passing
          </span>
          <span className="text-red-400">
            <span className="font-bold">{'\u2717'}</span> {summaryStats.failing} failing
          </span>
          <span className="text-gray-500">
            <span className="font-bold">{'\u2014'}</span> {summaryStats.notChecked} not checked
          </span>
          <span className="text-gray-400 ml-auto">
            {filteredRules.length} of {rulesWithStatus.length} rules shown
          </span>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {Array.from(rulesByCategory.entries()).map(([category, rules]) => {
          const stats = getCategoryStats(rules);
          const isExpanded = expandedCategories.has(category);

          // Skip empty categories when filtering
          if (rules.length === 0 && (searchQuery || severityFilter !== 'all' || statusFilter !== 'all')) {
            return null;
          }

          return (
            <div key={category} className="border border-gray-700/50 rounded-lg overflow-hidden">
              <CategoryHeader
                category={category}
                stats={stats}
                isExpanded={isExpanded}
                onToggle={() => toggleCategory(category)}
              />

              {isExpanded && rules.length > 0 && (
                <div className="p-2 space-y-1 bg-gray-900/30">
                  {rules.map(rule => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      onClick={onRuleClick}
                    />
                  ))}
                </div>
              )}

              {isExpanded && rules.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm bg-gray-900/30">
                  No rules match the current filters
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No rules match the current filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSeverityFilter('all');
              setStatusFilter('all');
            }}
            className="mt-2 text-blue-400 hover:text-blue-300"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default QualityRulePanel;
