import { useState, useCallback } from 'react';
import { MigrationPlanEngine, PlannedAction } from '../services/migration/MigrationPlanEngine';
import type { AutoMatchResult } from '../services/migration/AutoMatchService';
import type { SiteInventoryItem, EnrichedTopic } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAppState } from '../state/appState';

// ── Stats interface ─────────────────────────────────────────────────────────

export interface PlanStats {
  total: number;
  keep: number;
  optimize: number;
  rewrite: number;
  merge: number;
  redirect: number;
  prune: number;
  create: number;
  canonicalize: number;
}

// ── Helper: compute stats from PlannedAction[] ──────────────────────────────

function computeStats(actions: PlannedAction[]): PlanStats {
  const stats: PlanStats = {
    total: actions.length,
    keep: 0,
    optimize: 0,
    rewrite: 0,
    merge: 0,
    redirect: 0,
    prune: 0,
    create: 0,
    canonicalize: 0,
  };

  for (const action of actions) {
    switch (action.action) {
      case 'KEEP':
        stats.keep++;
        break;
      case 'OPTIMIZE':
        stats.optimize++;
        break;
      case 'REWRITE':
        stats.rewrite++;
        break;
      case 'MERGE':
        stats.merge++;
        break;
      case 'REDIRECT_301':
        stats.redirect++;
        break;
      case 'PRUNE_410':
        stats.prune++;
        break;
      case 'CREATE_NEW':
        stats.create++;
        break;
      case 'CANONICALIZE':
        stats.canonicalize++;
        break;
    }
  }

  return stats;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for generating, applying, and persisting migration plans.
 *
 * - generatePlan: runs MigrationPlanEngine synchronously, stores result in state
 * - applyPlan: writes recommended_action, action_reasoning, action_priority,
 *   action_effort to each site_inventory row
 * - savePlan: persists a summary row to the migration_plans table
 */
export function useMigrationPlan(projectId: string, mapId: string) {
  const { state } = useAppState();
  const { businessInfo } = state;

  const [plan, setPlan] = useState<PlannedAction[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a migration plan from inventory, topics, and auto-match results.
   * Uses MigrationPlanEngine (pure synchronous computation -- no network calls).
   * Returns the computed stats so callers can pass them directly to savePlan.
   */
  const generatePlan = useCallback(
    (
      inventory: SiteInventoryItem[],
      topics: EnrichedTopic[],
      matchResult: AutoMatchResult,
    ): PlanStats | null => {
      setIsGenerating(true);
      setError(null);
      setPlan(null);
      setStats(null);

      try {
        const engine = new MigrationPlanEngine();
        const actions = engine.generatePlan({ inventory, topics, matchResult });

        const computed = computeStats(actions);
        setPlan(actions);
        setStats(computed);
        return computed;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Plan generation failed';
        setError(message);
        console.error('[useMigrationPlan] generatePlan error:', e);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  /**
   * Apply the current plan to the database: writes recommended_action,
   * action_reasoning, action_priority, and action_effort to each
   * site_inventory row that has an inventoryId.
   */
  const applyPlan = useCallback(async (): Promise<void> => {
    setError(null);

    if (!plan || plan.length === 0) {
      setError('No plan to apply. Generate a plan first.');
      return;
    }

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey) as any;

      // Filter to actions that have an existing inventory row (skip CREATE_NEW gaps)
      const applicableActions = plan.filter((a) => a.inventoryId);

      const updatePromises = applicableActions.map((action) =>
        supabase
          .from('site_inventory')
          .update({
            action: action.action,
            recommended_action: action.action,
            action_reasoning: action.reasoning,
            action_data_points: action.dataPoints,
            action_priority: action.priority,
            action_effort: action.effort,
            status: 'ACTION_REQUIRED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', action.inventoryId),
      );

      const results = await Promise.all(updatePromises);

      // Check for failures
      const failures = results.filter((r: { error: unknown }) => r.error);
      if (failures.length > 0) {
        throw new Error(
          `${failures.length} of ${applicableActions.length} inventory updates failed`,
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to apply plan';
      setError(message);
      console.error('[useMigrationPlan] applyPlan error:', e);
    }
  }, [plan, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  /**
   * Save a summary of the current plan to the migration_plans table.
   * Accepts optional planStats to avoid stale-closure race conditions.
   */
  const savePlan = useCallback(async (planStats?: PlanStats): Promise<void> => {
    setError(null);

    const effectiveStats = planStats || stats;
    if (!effectiveStats) {
      setError('No plan stats available. Generate a plan first.');
      return;
    }

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey) as any;

      const { error: insertError } = await supabase
        .from('migration_plans')
        .insert({
          project_id: projectId,
          map_id: mapId,
          name: 'Migration Plan',
          status: 'draft',
          total_urls: effectiveStats.total,
          keep_count: effectiveStats.keep,
          optimize_count: effectiveStats.optimize,
          rewrite_count: effectiveStats.rewrite,
          merge_count: effectiveStats.merge,
          redirect_count: effectiveStats.redirect,
          prune_count: effectiveStats.prune,
          create_count: effectiveStats.create,
        });

      if (insertError) {
        throw new Error(`Failed to save plan: ${insertError.message}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save plan';
      setError(message);
      console.error('[useMigrationPlan] savePlan error:', e);
    }
  }, [stats, projectId, mapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  return {
    plan,
    isGenerating,
    generatePlan,
    applyPlan,
    savePlan,
    stats,
    error,
  };
}
