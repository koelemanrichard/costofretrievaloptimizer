/**
 * SubscriptionBillingTab Component
 *
 * Displays organization subscription status, available modules, and billing management.
 * Shows current plan, available upgrades, and subscription management options.
 *
 * Created: 2026-01-11 - Multi-tenancy UI Integration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOrganizationContext } from './OrganizationProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { getSupabaseClient } from '../../services/supabaseClient';
import { useAppState } from '../../state/appState';

// ============================================================================
// Types
// ============================================================================

interface Module {
  id: string;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  priceYearlyUsd: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

interface Subscription {
  id: string;
  moduleId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionBillingTabProps {
  onClose?: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

function ModuleCard({
  module,
  subscription,
  canManage,
  onSubscribe,
  onCancel,
}: {
  module: Module;
  subscription: Subscription | null;
  canManage: boolean;
  onSubscribe: (moduleId: string) => void;
  onCancel: (moduleId: string) => void;
}) {
  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled';
  const willCancel = subscription?.cancelAtPeriodEnd;

  const statusBadge = () => {
    if (isPastDue) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded">
          Past Due
        </span>
      );
    }
    if (isCanceled) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded">
          Canceled
        </span>
      );
    }
    if (willCancel) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded">
          Canceling
        </span>
      );
    }
    if (isSubscribed) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
          Active
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={`relative p-4 rounded-lg border transition-all ${
        isSubscribed
          ? 'border-green-500/50 bg-green-500/5'
          : isPastDue
          ? 'border-red-500/50 bg-red-500/5'
          : 'border-gray-700 bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-200">{module.name}</h4>
          <p className="text-sm text-gray-400 mt-1">{module.description}</p>
        </div>
        {statusBadge()}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          {module.priceMonthlyUsd === 0 ? (
            <span className="text-2xl font-bold text-gray-200">Free</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-200">
                ${module.priceMonthlyUsd}
              </span>
              <span className="text-sm text-gray-400">/month</span>
            </>
          )}
        </div>
        {module.priceYearlyUsd > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            ${module.priceYearlyUsd}/year (save{' '}
            {Math.round((1 - module.priceYearlyUsd / (module.priceMonthlyUsd * 12)) * 100)}%)
          </p>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Features</p>
        <ul className="space-y-1">
          {module.features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      </div>

      {canManage && module.id !== 'core' && (
        <div className="pt-3 border-t border-gray-700">
          {isSubscribed && !willCancel ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(module.id)}
              className="text-red-400 hover:text-red-300"
            >
              Cancel Subscription
            </Button>
          ) : willCancel ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSubscribe(module.id)}
            >
              Reactivate
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSubscribe(module.id)}
            >
              Subscribe
            </Button>
          )}
        </div>
      )}

      {module.id === 'core' && (
        <div className="pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">Included with all organizations</span>
        </div>
      )}

      {subscription?.currentPeriodEnd && isSubscribed && (
        <p className="text-xs text-gray-500 mt-2">
          {willCancel ? 'Access until: ' : 'Renews: '}
          {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SubscriptionBillingTab({ onClose }: SubscriptionBillingTabProps) {
  const { state } = useAppState();
  const { current: organization } = useOrganizationContext();
  const { can } = usePermissions();

  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [modules, setModules] = useState<Module[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const canManage = can('canManageBilling');

  // Load modules and subscriptions
  const loadData = useCallback(async () => {
    if (!supabase || !organization) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load all available modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (modulesError) throw modulesError;

      setModules(
        (modulesData || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description || '',
          priceMonthlyUsd: parseFloat(m.price_monthly_usd) || 0,
          priceYearlyUsd: parseFloat(m.price_yearly_usd) || 0,
          features: m.features || [],
          isActive: m.is_active,
          sortOrder: m.sort_order,
        }))
      );

      // Load organization's subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', organization.id);

      if (subsError) throw subsError;

      setSubscriptions(
        (subsData || []).map((s: any) => ({
          id: s.id,
          moduleId: s.module_id,
          status: s.status,
          currentPeriodEnd: s.current_period_end,
          cancelAtPeriodEnd: s.cancel_at_period_end,
        }))
      );
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, organization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle subscription action (this would normally redirect to Stripe Checkout)
  const handleSubscribe = useCallback(async (moduleId: string) => {
    if (!supabase || !organization) return;

    setActionInProgress(moduleId);
    setError(null);

    try {
      // In production, this would:
      // 1. Call an edge function to create a Stripe Checkout session
      // 2. Redirect to Stripe Checkout
      // For now, we'll just create/update the subscription directly

      const { error: upsertError } = await supabase
        .from('organization_subscriptions')
        .upsert({
          organization_id: organization.id,
          module_id: moduleId,
          status: 'active',
          cancel_at_period_end: false,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'organization_id,module_id',
        });

      if (upsertError) throw upsertError;

      // Reload data
      await loadData();
    } catch (err) {
      console.error('Failed to subscribe:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setActionInProgress(null);
    }
  }, [supabase, organization, loadData]);

  // Handle cancellation
  const handleCancel = useCallback(async (moduleId: string) => {
    if (!supabase || !organization) return;

    setActionInProgress(moduleId);
    setError(null);

    try {
      // Mark for cancellation at period end
      const { error: updateError } = await supabase
        .from('organization_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('organization_id', organization.id)
        .eq('module_id', moduleId);

      if (updateError) throw updateError;

      await loadData();
    } catch (err) {
      console.error('Failed to cancel:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setActionInProgress(null);
    }
  }, [supabase, organization, loadData]);

  // Get subscription for a module
  const getSubscription = (moduleId: string): Subscription | null => {
    return subscriptions.find((s) => s.moduleId === moduleId) || null;
  };

  if (!supabase) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Database connection not configured.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">Subscription & Billing</h3>
          <p className="text-sm text-gray-400 mt-1">
            Manage your organization's modules and subscriptions
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Current Plan Summary */}
      <section className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Current Plan
        </h4>
        <div className="flex flex-wrap gap-2">
          {subscriptions
            .filter((s) => s.status === 'active')
            .map((sub) => {
              const module = modules.find((m) => m.id === sub.moduleId);
              return (
                <span
                  key={sub.id}
                  className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full"
                >
                  {module?.name || sub.moduleId}
                </span>
              );
            })}
          {subscriptions.filter((s) => s.status === 'active').length === 0 && (
            <span className="text-gray-500 text-sm">No active subscriptions</span>
          )}
        </div>
      </section>

      {/* Available Modules */}
      <section>
        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Available Modules
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              subscription={getSubscription(module.id)}
              canManage={canManage && actionInProgress !== module.id}
              onSubscribe={handleSubscribe}
              onCancel={handleCancel}
            />
          ))}
        </div>
      </section>

      {/* Billing Info */}
      {canManage && (
        <section className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Billing Information
          </h4>
          <p className="text-sm text-gray-400 mb-4">
            Configure payment methods and view invoices in the Stripe Customer Portal.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              // In production, this would redirect to Stripe Customer Portal
              alert('Stripe Customer Portal integration coming soon');
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Manage Billing
            </span>
          </Button>
        </section>
      )}
    </div>
  );
}

export default SubscriptionBillingTab;
