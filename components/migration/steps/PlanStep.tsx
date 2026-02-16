import React, { useState, useMemo, useCallback } from 'react';
import type { SiteInventoryItem, EnrichedTopic, ActionType } from '../../../types';
import { useMigrationPlan, PlanStats } from '../../../hooks/useMigrationPlan';
import { AutoMatchService } from '../../../services/migration/AutoMatchService';
import type { PlannedAction } from '../../../services/migration/MigrationPlanEngine';
import { useAppState } from '../../../state/appState';

// ── Props ────────────────────────────────────────────────────────────────────

interface PlanStepProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  onComplete: () => void;
  onRefreshInventory: () => void;
}

// ── Action badge styling (mirrors InventoryMatrix) ───────────────────────────

const ACTION_BADGE_CLASSES: Record<ActionType, string> = {
  KEEP: 'bg-green-900/50 text-green-300 border-green-700',
  OPTIMIZE: 'bg-lime-900/50 text-lime-300 border-lime-700',
  REWRITE: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  MERGE: 'bg-blue-900/50 text-blue-300 border-blue-700',
  REDIRECT_301: 'bg-purple-900/50 text-purple-300 border-purple-700',
  PRUNE_410: 'bg-red-900/50 text-red-300 border-red-700',
  CANONICALIZE: 'bg-gray-800 text-gray-300 border-gray-600',
  CREATE_NEW: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
};

const ACTION_LABELS: Record<ActionType, string> = {
  KEEP: 'KEEP',
  OPTIMIZE: 'OPTIMIZE',
  REWRITE: 'REWRITE',
  MERGE: 'MERGE',
  REDIRECT_301: 'REDIRECT',
  PRUNE_410: 'PRUNE',
  CANONICALIZE: 'CANONICALIZE',
  CREATE_NEW: 'CREATE',
};

// ── Priority badge styling ───────────────────────────────────────────────────

const PRIORITY_BADGE_CLASSES: Record<PlannedAction['priority'], string> = {
  critical: 'bg-red-900/50 text-red-300 border-red-700',
  high: 'bg-orange-900/50 text-orange-300 border-orange-700',
  medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  low: 'bg-green-900/50 text-green-300 border-green-700',
};

const PRIORITY_DOT_COLORS: Record<PlannedAction['priority'], string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
};

// ── Effort indicator styling ─────────────────────────────────────────────────

const EFFORT_CLASSES: Record<PlannedAction['effort'], string> = {
  none: 'text-gray-500',
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

// ── Stat badge component ─────────────────────────────────────────────────────

const StatBadge: React.FC<{ label: string; count: number; classes: string }> = ({
  label,
  count,
  classes,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${classes}`}
  >
    {label}: {count}
  </span>
);

// ── Priority stat component ─────────────────────────────────────────────────

const PriorityStat: React.FC<{ label: string; count: number; dotColor: string }> = ({
  label,
  count,
  dotColor,
}) => (
  <span className="inline-flex items-center gap-1.5 text-sm text-gray-300">
    <span className={dotColor}>&#9679;</span>
    {label}: {count}
  </span>
);

// ── Compute priority breakdown from actions ──────────────────────────────────

interface PriorityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

function computePriorityBreakdown(actions: PlannedAction[]): PriorityBreakdown {
  const breakdown: PriorityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const action of actions) {
    breakdown[action.priority]++;
  }
  return breakdown;
}

// ── Get display label for URL/Topic ──────────────────────────────────────────

function getDisplayLabel(action: PlannedAction, topics: EnrichedTopic[]): string {
  if (action.action === 'CREATE_NEW' && action.topicId) {
    const topic = topics.find((t) => t.id === action.topicId);
    return topic?.title ?? 'New Topic';
  }
  return action.url || 'Unknown';
}

// ── Reconstruct stats from inventory items that already have plan data ───────

function computeStatsFromInventory(items: SiteInventoryItem[]): PlanStats {
  const stats: PlanStats = {
    total: items.length,
    keep: 0, optimize: 0, rewrite: 0, merge: 0,
    redirect: 0, prune: 0, create: 0, canonicalize: 0,
  };
  for (const item of items) {
    const action = item.action || item.recommended_action;
    switch (action) {
      case 'KEEP': stats.keep++; break;
      case 'OPTIMIZE': stats.optimize++; break;
      case 'REWRITE': stats.rewrite++; break;
      case 'MERGE': stats.merge++; break;
      case 'REDIRECT_301': stats.redirect++; break;
      case 'PRUNE_410': stats.prune++; break;
      case 'CREATE_NEW': stats.create++; break;
      case 'CANONICALIZE': stats.canonicalize++; break;
    }
  }
  return stats;
}

// ── Main component ───────────────────────────────────────────────────────────

export const PlanStep: React.FC<PlanStepProps> = ({
  projectId,
  mapId,
  inventory,
  topics,
  onComplete,
  onRefreshInventory,
}) => {
  const { state } = useAppState();
  const activeMap = state.topicalMaps.find(m => m.id === mapId);
  const pillars = activeMap?.pillars;

  const { plan, isGenerating, generatePlan, applyPlan, savePlan, stats, error } =
    useMigrationPlan(projectId, mapId, pillars);

  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Detect existing plan data in inventory (survives remount / navigation)
  const existingPlanStats = useMemo(() => {
    const withAction = inventory.filter(i => i.action || i.recommended_action);
    if (withAction.length === 0) return null;
    return computeStatsFromInventory(withAction);
  }, [inventory]);

  // Display stats: prefer freshly-generated stats, fall back to reconstructed stats
  const displayStats = stats || existingPlanStats;
  const hasPlan = !!plan || !!existingPlanStats;

  // Compute priority breakdown from plan actions
  const priorityBreakdown = useMemo<PriorityBreakdown | null>(
    () => (plan ? computePriorityBreakdown(plan) : null),
    [plan],
  );

  // Handle plan generation: run AutoMatchService inline then generate plan, then save immediately
  const handleGenerate = useCallback(async () => {
    const matcher = new AutoMatchService();
    const matchResult = matcher.match(inventory, topics);
    const generatedStats = generatePlan(inventory, topics, matchResult);
    // Save immediately with the returned stats — no setTimeout needed
    if (generatedStats) {
      try {
        await savePlan(generatedStats);
        setSaved(true);
      } catch {
        // Ignore auto-save failure
      }
    }
  }, [inventory, topics, generatePlan, savePlan]);

  // Handle applying plan to inventory
  const handleApply = useCallback(async () => {
    setIsApplying(true);
    try {
      await applyPlan();
      await onRefreshInventory();
      setApplied(true);
      onComplete();
    } finally {
      setIsApplying(false);
    }
  }, [applyPlan, onComplete, onRefreshInventory]);

  // Handle saving plan to migration_plans table
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await savePlan();
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  }, [savePlan]);

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Your migration roadmap</h2>
          <p className="text-sm text-gray-400 mt-1">
            Generate a prioritized action plan based on audit scores, traffic data, and topic
            matching.
          </p>
        </div>
      </div>

      {/* Primary action — single guided flow */}
      <div className="flex items-center gap-3">
        {!hasPlan ? (
          /* Before plan: single generate button */
          <button
            onClick={handleGenerate}
            disabled={isGenerating || inventory.length === 0}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isGenerating || inventory.length === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate Migration Plan'}
          </button>
        ) : (
          /* After plan: apply as primary CTA + regenerate as secondary */
          <>
            {plan && (
              <button
                onClick={handleApply}
                disabled={isApplying || applied}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isApplying || applied
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-green-700 text-white hover:bg-green-600 cursor-pointer'
                }`}
              >
                {isApplying ? 'Applying...' : applied ? 'Plan Applied' : 'Apply Plan to Inventory'}
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-gray-200 transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Plan Summary Stats */}
      {displayStats && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">
              Plan Summary
              {!plan && existingPlanStats && (
                <span className="text-xs text-gray-500 ml-2">(from applied plan)</span>
              )}
            </h3>
            <span className="text-xs text-gray-500">Total: {displayStats.total} actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="KEEP" count={displayStats.keep} classes={ACTION_BADGE_CLASSES.KEEP} />
            <StatBadge label="OPTIMIZE" count={displayStats.optimize} classes={ACTION_BADGE_CLASSES.OPTIMIZE} />
            <StatBadge label="REWRITE" count={displayStats.rewrite} classes={ACTION_BADGE_CLASSES.REWRITE} />
            <StatBadge label="MERGE" count={displayStats.merge} classes={ACTION_BADGE_CLASSES.MERGE} />
            <StatBadge label="REDIRECT" count={displayStats.redirect} classes={ACTION_BADGE_CLASSES.REDIRECT_301} />
            <StatBadge label="PRUNE" count={displayStats.prune} classes={ACTION_BADGE_CLASSES.PRUNE_410} />
            <StatBadge label="CREATE" count={displayStats.create} classes={ACTION_BADGE_CLASSES.CREATE_NEW} />
            {displayStats.canonicalize > 0 && (
              <StatBadge
                label="CANONICALIZE"
                count={displayStats.canonicalize}
                classes={ACTION_BADGE_CLASSES.CANONICALIZE}
              />
            )}
          </div>
        </div>
      )}

      {/* Priority Breakdown */}
      {priorityBreakdown && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Action Priority Breakdown</h3>
          <div className="flex flex-wrap gap-4">
            <PriorityStat label="Critical" count={priorityBreakdown.critical} dotColor={PRIORITY_DOT_COLORS.critical} />
            <PriorityStat label="High" count={priorityBreakdown.high} dotColor={PRIORITY_DOT_COLORS.high} />
            <PriorityStat label="Medium" count={priorityBreakdown.medium} dotColor={PRIORITY_DOT_COLORS.medium} />
            <PriorityStat label="Low" count={priorityBreakdown.low} dotColor={PRIORITY_DOT_COLORS.low} />
          </div>
        </div>
      )}

      {/* Planned Actions Table */}
      {plan && plan.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">
              Planned Actions
              <span className="text-gray-500 ml-2">(sorted by priority)</span>
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[45vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium px-4 py-2.5 w-10">#</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-2.5">URL / Topic</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-2.5 w-28">Action</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-2.5 w-24">Priority</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-2.5 w-20">Effort</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-2.5">Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((action, index) => (
                  <tr
                    key={action.inventoryId || `gap-${action.topicId}-${index}`}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    {/* Row number */}
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{index + 1}</td>

                    {/* URL or Topic title */}
                    <td className="px-4 py-2.5">
                      <span
                        className="text-gray-200 text-xs font-mono truncate block max-w-[300px]"
                        title={getDisplayLabel(action, topics)}
                      >
                        {getDisplayLabel(action, topics)}
                      </span>
                    </td>

                    {/* Action badge */}
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${
                          ACTION_BADGE_CLASSES[action.action]
                        }`}
                      >
                        {ACTION_LABELS[action.action]}
                      </span>
                    </td>

                    {/* Priority badge */}
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-xs font-medium capitalize ${
                          PRIORITY_BADGE_CLASSES[action.priority]
                        }`}
                      >
                        {action.priority}
                      </span>
                    </td>

                    {/* Effort */}
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium capitalize ${EFFORT_CLASSES[action.effort]}`}
                      >
                        {action.effort}
                      </span>
                    </td>

                    {/* Reasoning */}
                    <td className="px-4 py-2.5">
                      <span className="text-gray-400 text-xs line-clamp-2">{action.reasoning}</span>
                      {action.dataPoints.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {action.dataPoints.map((dp, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400" title={dp.impact}>
                              {dp.label}: {dp.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no plan is generated yet */}
      {!hasPlan && !isGenerating && (
        <div className="text-center py-6 text-gray-500">
          <p className="text-lg mb-2">No migration plan generated yet</p>
          <p className="text-sm">
            Click &ldquo;Generate Migration Plan&rdquo; to create a prioritized action plan for {inventory.length} URLs
            and {topics.length} topics.
          </p>
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="text-center py-6 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin mb-3" />
          <p className="text-sm">Generating migration plan...</p>
        </div>
      )}
    </div>
  );
};

export default PlanStep;
