// components/organization/OrganizationApiKeysModal.tsx
/**
 * OrganizationApiKeysModal
 *
 * Modal for managing organization-level API keys.
 * Shows which providers have keys configured (platform vs BYOK),
 * allows admins to configure their own keys, and displays usage stats.
 *
 * Created: 2026-01-10 - Multi-tenancy API Key Management
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { SmartLoader } from '../ui/FunLoaders';
import { useOrganizationContext } from './OrganizationProvider';
import { useAppState } from '../../state/appState';
import { useApiKeys, AI_PROVIDERS, AIProvider } from '../../hooks/useApiKeys';
import { ApiKeyStatus } from '../../types';
import { getSupabaseClient } from '../../services/supabaseClient';

// ============================================================================
// Types
// ============================================================================

interface OrganizationApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderConfig {
  name: string;
  icon: React.ReactNode;
  description: string;
  placeholder: string;
  keyPrefix: string;
}

// ============================================================================
// Provider Configuration
// ============================================================================

const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
  anthropic: {
    name: 'Anthropic (Claude)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 19.5h20L12 2zm0 4l6.5 11.5h-13L12 6z" />
      </svg>
    ),
    description: 'Claude models for content generation and analysis',
    placeholder: 'sk-ant-...',
    keyPrefix: 'sk-ant-',
  },
  openai: {
    name: 'OpenAI (GPT)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.1408 1.6465 4.4708 4.4708 0 0 1 .5765 3.0278zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    ),
    description: 'GPT models for various AI tasks',
    placeholder: 'sk-proj-...',
    keyPrefix: 'sk-',
  },
  google: {
    name: 'Google (Gemini)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 11.807A9.002 9.002 0 0 1 10.049 2a9.942 9.942 0 0 1 1.951-.001c-.001 3.094.001 6.188-.001 9.282-.005.267-.102.5-.315.678a.908.908 0 0 1-.715.159.898.898 0 0 1-.969-.311zm2.172 1.857c.299-.049.61-.004.875.165a8.997 8.997 0 0 1 8.041 5.202 9.002 9.002 0 0 1-.668 8.083 8.993 8.993 0 0 1-6.442 3.855 8.967 8.967 0 0 1-7.231-2.396.898.898 0 0 1-.283-1.029c.133-.367.5-.605.885-.593a.895.895 0 0 1 .455.162 7.2 7.2 0 0 0 5.69 1.767 7.198 7.198 0 0 0 5.052-3.018 7.199 7.199 0 0 0 .677-6.467 7.194 7.194 0 0 0-6.355-4.262 7.2 7.2 0 0 0-4.808 1.466.879.879 0 0 1-.977.071.885.885 0 0 1-.422-.906c.055-.397.352-.7.744-.794z" />
      </svg>
    ),
    description: 'Gemini models for content and analysis',
    placeholder: 'AIza...',
    keyPrefix: 'AIza',
  },
  perplexity: {
    name: 'Perplexity',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="none" />
        <path d="M12 6v12M6 12h12" strokeWidth="2" stroke="currentColor" />
      </svg>
    ),
    description: 'Perplexity for real-time web research',
    placeholder: 'pplx-...',
    keyPrefix: 'pplx-',
  },
  openrouter: {
    name: 'OpenRouter',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />
      </svg>
    ),
    description: 'Access multiple models through OpenRouter',
    placeholder: 'sk-or-...',
    keyPrefix: 'sk-or-',
  },
};

// ============================================================================
// Helper Components
// ============================================================================

interface KeyStatusBadgeProps {
  status: ApiKeyStatus;
}

function KeyStatusBadge({ status }: KeyStatusBadgeProps) {
  if (!status.hasKey && status.keySource === 'inherit') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Platform Key
      </span>
    );
  }

  if (status.hasKey && status.keySource === 'byok' && status.isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Your Key (Active)
      </span>
    );
  }

  if (status.hasKey && status.keySource === 'byok' && !status.isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Your Key (Inactive)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      Not Configured
    </span>
  );
}

interface ProviderCardProps {
  provider: AIProvider;
  status: ApiKeyStatus | undefined;
  onConfigure: (provider: AIProvider) => void;
  onRemove: (provider: AIProvider) => void;
}

function ProviderCard({ provider, status, onConfigure, onRemove }: ProviderCardProps) {
  const config = PROVIDER_CONFIG[provider];
  const defaultStatus: ApiKeyStatus = {
    provider,
    hasKey: false,
    keySource: 'inherit',
    isActive: false,
  };
  const currentStatus = status || defaultStatus;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700/50 rounded-lg text-gray-300">
            {config.icon}
          </div>
          <div>
            <h4 className="font-medium text-gray-200">{config.name}</h4>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
        <KeyStatusBadge status={currentStatus} />
      </div>

      {/* Usage Stats */}
      {currentStatus.usageThisMonth && (
        <div className="mb-3 p-2 bg-gray-900/50 rounded text-xs">
          <div className="flex justify-between text-gray-400">
            <span>This Month:</span>
            <span className="text-gray-300">
              {currentStatus.usageThisMonth.requests.toLocaleString()} requests
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Cost:</span>
            <span className="text-gray-300">
              ${currentStatus.usageThisMonth.cost_usd.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onConfigure(provider)}
          className="flex-1"
        >
          {currentStatus.hasKey && currentStatus.keySource === 'byok'
            ? 'Update Key'
            : 'Use Your Key'}
        </Button>
        {currentStatus.hasKey && currentStatus.keySource === 'byok' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(provider)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Key Configuration Modal
// ============================================================================

interface ConfigureKeyModalProps {
  isOpen: boolean;
  provider: AIProvider | null;
  onClose: () => void;
  onSave: (provider: AIProvider, key: string) => Promise<void>;
  isSaving: boolean;
}

function ConfigureKeyModal({ isOpen, provider, onClose, onSave, isSaving }: ConfigureKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const config = provider ? PROVIDER_CONFIG[provider] : null;

  const handleSave = async () => {
    if (!provider || !apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation
    if (config && !apiKey.startsWith(config.keyPrefix)) {
      setError(`${config.name} keys typically start with "${config.keyPrefix}"`);
      return;
    }

    setError(null);
    await onSave(provider, apiKey.trim());
    setApiKey('');
  };

  const handleClose = () => {
    setApiKey('');
    setError(null);
    onClose();
  };

  if (!isOpen || !provider || !config) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Configure ${config.name} API Key`}
      size="md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Bring Your Own Key (BYOK):</strong> Your API key will be encrypted
            and stored securely. Usage will be billed directly to your {config.name} account
            instead of the platform.
          </p>
        </div>

        <div>
          <Label htmlFor="apiKey" className="text-gray-300">
            API Key
          </Label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config.placeholder}
            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500
                       focus:border-transparent"
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !apiKey.trim()}>
            {isSaving ? (
              <span className="flex items-center gap-2">
                <SmartLoader context="validating" size="sm" showText={false} />
                Saving...
              </span>
            ) : (
              'Save Key'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OrganizationApiKeysModal({ isOpen, onClose }: OrganizationApiKeysModalProps) {
  const { state } = useAppState();
  const { current: organization } = useOrganizationContext();
  const { getOrganizationKeyStatus, isLoading, error } = useApiKeys(state.businessInfo);

  const [keyStatuses, setKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [configuringProvider, setConfiguringProvider] = useState<AIProvider | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // Load key statuses when modal opens
  useEffect(() => {
    async function loadStatuses() {
      if (!isOpen || !organization) return;

      setStatusLoading(true);
      try {
        const statuses = await getOrganizationKeyStatus(organization.id);
        setKeyStatuses(statuses);
      } catch (err) {
        console.error('Failed to load key statuses:', err);
      } finally {
        setStatusLoading(false);
      }
    }

    loadStatuses();
  }, [isOpen, organization, getOrganizationKeyStatus]);

  const handleConfigureKey = useCallback((provider: AIProvider) => {
    setConfiguringProvider(provider);
  }, []);

  const handleRemoveKey = useCallback(async (provider: AIProvider) => {
    if (!organization) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove your ${PROVIDER_CONFIG[provider].name} API key? ` +
      `The organization will fall back to using platform keys.`
    );

    if (!confirmed) return;

    setIsSaving(true);
    try {
      // Call edge function to remove key from Vault
      const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        `${state.businessInfo.supabaseUrl}/functions/v1/manage-org-api-keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'delete',
            organization_id: organization.id,
            provider,
          }),
        }
      );

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to remove API key');
      }

      // Refresh statuses
      const statuses = await getOrganizationKeyStatus(organization.id);
      setKeyStatuses(statuses);
    } catch (err) {
      console.error('Failed to remove key:', err);
      alert(`Failed to remove API key: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [organization, getOrganizationKeyStatus, state.businessInfo]);

  const handleSaveKey = useCallback(async (provider: AIProvider, key: string) => {
    if (!organization) return;

    setIsSaving(true);
    try {
      // Call edge function to store key in Vault
      const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        `${state.businessInfo.supabaseUrl}/functions/v1/manage-org-api-keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'store',
            organization_id: organization.id,
            provider,
            api_key: key,
          }),
        }
      );

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to save API key');
      }

      setConfiguringProvider(null);

      // Refresh statuses
      const statuses = await getOrganizationKeyStatus(organization.id);
      setKeyStatuses(statuses);
    } catch (err) {
      console.error('Failed to save key:', err);
      alert(`Failed to save API key: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [organization, getOrganizationKeyStatus, state.businessInfo]);

  const getStatusForProvider = useCallback(
    (provider: AIProvider) => keyStatuses.find((s) => s.provider === provider),
    [keyStatuses]
  );

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Organization API Keys"
        size="lg"
      >
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <h3 className="font-medium text-gray-200 mb-2">API Key Management</h3>
            <p className="text-sm text-gray-400">
              Configure which API keys your organization uses. You can use platform-provided
              keys (included in your plan) or bring your own keys (BYOK) for direct billing
              to your provider accounts.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-gray-400">Platform Key = Included in plan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-gray-400">Your Key = Billed to your account</span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {statusLoading && (
            <div className="flex items-center justify-center py-8">
              <SmartLoader context="loading" size="lg" showText={false} />
            </div>
          )}

          {/* Error State */}
          {error && !statusLoading && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Provider Cards */}
          {!statusLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AI_PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider}
                  provider={provider}
                  status={getStatusForProvider(provider)}
                  onConfigure={handleConfigureKey}
                  onRemove={handleRemoveKey}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              API keys are encrypted at rest using Supabase Vault
            </p>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Configure Key Sub-Modal */}
      <ConfigureKeyModal
        isOpen={configuringProvider !== null}
        provider={configuringProvider}
        onClose={() => setConfiguringProvider(null)}
        onSave={handleSaveKey}
        isSaving={isSaving}
      />
    </>
  );
}

export default OrganizationApiKeysModal;
