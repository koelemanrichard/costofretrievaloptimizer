/**
 * useApiKeys Hook
 *
 * Hook for managing API keys at organization and project level.
 * Provides key status checking, configuration, and usage monitoring.
 *
 * Note: Actual key storage/retrieval uses Vault and must be done
 * through edge functions for security. This hook manages metadata only.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 3
 */

import { useCallback, useState, useMemo } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  OrganizationApiKey,
  ProjectApiKey,
  ApiKeyStatus,
  ResolvedApiKey,
  BusinessInfo,
} from '../types';

// Supported AI providers
export const AI_PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'perplexity',
  'openrouter',
] as const;

export type AIProvider = typeof AI_PROVIDERS[number];

// ============================================================================
// Hook
// ============================================================================

export function useApiKeys(businessInfo: BusinessInfo) {
  const supabase = useMemo(() => {
    if (!businessInfo.supabaseUrl || !businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get API key status for an organization
   */
  const getOrganizationKeyStatus = useCallback(async (
    organizationId: string
  ): Promise<ApiKeyStatus[]> => {
    if (!supabase) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('organization_api_keys')
        .select('provider, key_source, is_active, usage_this_month')
        .eq('organization_id', organizationId);

      if (queryError) throw queryError;

      // Map to status objects for all providers
      return AI_PROVIDERS.map((provider) => {
        const key = data?.find((k) => k.provider === provider);
        return {
          provider,
          hasKey: !!key?.is_active,
          keySource: key?.key_source || 'inherit',
          isActive: key?.is_active || false,
          usageThisMonth: key?.usage_this_month,
        };
      });
    } catch (err) {
      console.error('Failed to get organization key status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get key status');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Get API key status for a project
   */
  const getProjectKeyStatus = useCallback(async (
    projectId: string
  ): Promise<ApiKeyStatus[]> => {
    if (!supabase) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('project_api_keys')
        .select('provider, key_source, is_active, usage_this_month')
        .eq('project_id', projectId);

      if (queryError) throw queryError;

      return AI_PROVIDERS.map((provider) => {
        const key = data?.find((k) => k.provider === provider);
        return {
          provider,
          hasKey: key?.key_source === 'byok',
          keySource: key?.key_source || 'inherit',
          isActive: key?.is_active ?? true,
          usageThisMonth: key?.usage_this_month,
        };
      });
    } catch (err) {
      console.error('Failed to get project key status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get key status');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Check if a project has a valid API key for a provider
   */
  const hasApiKey = useCallback(async (
    projectId: string,
    provider: string
  ): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { data, error: rpcError } = await supabase
        .rpc('has_api_key', {
          p_project_id: projectId,
          p_provider: provider,
        });

      if (rpcError) throw rpcError;
      return data === true;
    } catch (err) {
      console.error('Failed to check API key:', err);
      return false;
    }
  }, [supabase]);

  /**
   * Get billable info for a project and provider
   */
  const getBillableInfo = useCallback(async (
    projectId: string,
    provider: string
  ): Promise<{ keySource: string; billableTo: string; billableId: string } | null> => {
    if (!supabase) return null;

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_billable_info', {
          p_project_id: projectId,
          p_provider: provider,
        });

      if (rpcError) throw rpcError;
      if (!data) return null;

      return {
        keySource: data.key_source,
        billableTo: data.billable_to,
        billableId: data.billable_id,
      };
    } catch (err) {
      console.error('Failed to get billable info:', err);
      return null;
    }
  }, [supabase]);

  /**
   * Set project API key mode (inherit or BYOK)
   * Note: Actual key storage must be done through edge function
   */
  const setProjectKeyMode = useCallback(async (
    projectId: string,
    provider: string,
    mode: 'inherit' | 'byok'
  ): Promise<boolean> => {
    if (!supabase) return false;

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'inherit') {
        // Remove project-level override
        const { error: deleteError } = await supabase
          .from('project_api_keys')
          .delete()
          .eq('project_id', projectId)
          .eq('provider', provider);

        if (deleteError) throw deleteError;
      } else {
        // Create placeholder for BYOK (actual key stored via edge function)
        const { error: upsertError } = await supabase
          .from('project_api_keys')
          .upsert(
            {
              project_id: projectId,
              provider,
              key_source: 'byok',
              is_active: false, // Will be activated when key is stored
            },
            { onConflict: 'project_id,provider' }
          );

        if (upsertError) throw upsertError;
      }

      return true;
    } catch (err) {
      console.error('Failed to set project key mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to update key mode');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Deactivate an organization API key
   */
  const deactivateOrganizationKey = useCallback(async (
    organizationId: string,
    provider: string
  ): Promise<boolean> => {
    if (!supabase) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('organization_api_keys')
        .update({ is_active: false })
        .eq('organization_id', organizationId)
        .eq('provider', provider);

      if (updateError) throw updateError;

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_org_id: organizationId,
        p_action: 'api_key.deactivated',
        p_target_type: 'api_key',
        p_new_value: { provider },
      });

      return true;
    } catch (err) {
      console.error('Failed to deactivate API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate key');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Get usage statistics for an organization
   */
  const getOrganizationUsage = useCallback(async (
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCost: number;
    totalTokens: number;
    byProvider: Record<string, { cost: number; tokens: number; requests: number }>;
    byProject: Record<string, { cost: number; tokens: number; requests: number }>;
  } | null> => {
    if (!supabase) return null;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('ai_usage_logs')
        .select('provider, project_id, tokens_in, tokens_out, cost_usd')
        .eq('organization_id', organizationId);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Aggregate results
      const byProvider: Record<string, { cost: number; tokens: number; requests: number }> = {};
      const byProject: Record<string, { cost: number; tokens: number; requests: number }> = {};
      let totalCost = 0;
      let totalTokens = 0;

      for (const log of data || []) {
        const tokens = (log.tokens_in || 0) + (log.tokens_out || 0);
        const cost = log.cost_usd || 0;

        totalCost += cost;
        totalTokens += tokens;

        // By provider
        if (!byProvider[log.provider]) {
          byProvider[log.provider] = { cost: 0, tokens: 0, requests: 0 };
        }
        byProvider[log.provider].cost += cost;
        byProvider[log.provider].tokens += tokens;
        byProvider[log.provider].requests += 1;

        // By project
        if (log.project_id) {
          if (!byProject[log.project_id]) {
            byProject[log.project_id] = { cost: 0, tokens: 0, requests: 0 };
          }
          byProject[log.project_id].cost += cost;
          byProject[log.project_id].tokens += tokens;
          byProject[log.project_id].requests += 1;
        }
      }

      return { totalCost, totalTokens, byProvider, byProject };
    } catch (err) {
      console.error('Failed to get usage statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to get usage');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return {
    // State
    isLoading,
    error,

    // Key status
    getOrganizationKeyStatus,
    getProjectKeyStatus,
    hasApiKey,
    getBillableInfo,

    // Key management
    setProjectKeyMode,
    deactivateOrganizationKey,

    // Usage
    getOrganizationUsage,

    // Constants
    AI_PROVIDERS,
  };
}
