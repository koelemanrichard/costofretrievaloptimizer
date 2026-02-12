// components/SettingsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../state/appState';
import { BusinessInfo } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { SmartLoader } from '../ui/FunLoaders';
import { Modal } from '../ui/Modal';
import * as modelDiscovery from '../../services/modelDiscoveryService';
import { WordPressConnectionManager } from '../wordpress';
import { OrganizationSettingsTab, MemberManagementModal, CostDashboardModal, OrganizationApiKeysModal, SubscriptionBillingModal } from '../organization';
import { ProjectSettingsModal } from '../project';
import { SearchConsoleConnection } from '../settings/SearchConsoleConnection';
import { GscApiAdapter } from '../../services/audit/adapters/GscApiAdapter';

// --- Sub-components for better organization ---

const AIProviderSettings: React.FC<{ settings: Partial<BusinessInfo>, setSettings: React.Dispatch<React.SetStateAction<Partial<BusinessInfo>>> }> = ({ settings, setSettings }) => {
    const [models, setModels] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
        // If provider changes, reset the model
        if(name === 'aiProvider') {
            setSettings(prev => ({...prev, aiModel: ''}));
            setModels([]);
        }
    };
    
    const keyMap: Record<string, keyof BusinessInfo> = {
        gemini: 'geminiApiKey',
        openai: 'openAiApiKey',
        anthropic: 'anthropicApiKey',
        perplexity: 'perplexityApiKey',
        openrouter: 'openRouterApiKey',
    };

    const currentApiKeyName = settings.aiProvider ? keyMap[settings.aiProvider] : undefined;

    const handleTestKey = useCallback(async () => {
        if (!settings.aiProvider || !currentApiKeyName || !(settings as any)[currentApiKeyName]) {
            setValidationError("Please select a provider and enter an API key first.");
            setValidationStatus('error');
            return;
        }

        setValidationStatus('loading');
        setIsFetchingModels(true);
        setError(null);
        setValidationError(null);
        setModels([]);

        try {
            // We use the current state of settings for the test
            const fetchedModels = await modelDiscovery.fetchModelsForProvider(settings as BusinessInfo);
            setModels(fetchedModels);
            setValidationStatus('success');
            // If the current model isn't in the new list, select the first one.
            if (fetchedModels.length > 0 && !fetchedModels.includes(settings.aiModel || '')) {
                setSettings(prev => ({ ...prev, aiModel: fetchedModels[0] }));
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to validate key and fetch models.';
            setError(message);
            setValidationStatus('error');
            setValidationError(message);
        } finally {
            setIsFetchingModels(false);
        }
    }, [settings, currentApiKeyName, setSettings]);
    
    useEffect(() => {
        // Automatically fetch models if a provider and key are already present on load
        if(settings.aiProvider && currentApiKeyName && (settings as any)[currentApiKeyName]) {
            handleTestKey();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.aiProvider]); // Only run when provider changes initially

    const renderApiKeyInput = () => {
        if (!currentApiKeyName) return null;

        return (
            <div className="flex items-end gap-2">
                <div className="flex-grow">
                     <Input
                        id={currentApiKeyName}
                        name={currentApiKeyName}
                        value={(settings as any)[currentApiKeyName] || ''}
                        onChange={handleChange}
                        type="password"
                        placeholder={`Enter ${settings.aiProvider} API Key`}
                    />
                </div>
                <Button type="button" onClick={handleTestKey} variant="secondary" className="!py-2 !px-3" disabled={validationStatus === 'loading'}>
                    {validationStatus === 'loading' ? <SmartLoader context="validating" size="sm" showText={false} /> : 'Test Key'}
                </Button>
                <div className="w-6 h-6 flex items-center justify-center">
                    {validationStatus === 'success' && <span title="Valid Key">✅</span>}
                    {validationStatus === 'error' && <span title={validationError || 'Invalid Key'}>❌</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-blue-400">Default AI Configuration</h3>
            <p className="text-sm text-gray-400 -mt-3">This is the global default AI provider. You can override this for specific topical maps in the Business Info step.</p>
             {error && <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded-md">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="aiProvider">Default AI Provider</Label>
                    <Select id="aiProvider" name="aiProvider" value={settings.aiProvider || 'gemini'} onChange={handleChange}>
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="perplexity">Perplexity</option>
                        <option value="openrouter">OpenRouter</option>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="apiKey">Provider API Key</Label>
                    {renderApiKeyInput()}
                </div>
                 <div className="md:col-span-2">
                    <Label htmlFor="aiModel">Default AI Model</Label>
                    <div className="flex items-center gap-2">
                         <Select id="aiModel" name="aiModel" value={settings.aiModel || ''} onChange={handleChange} disabled={isFetchingModels || models.length === 0}>
                            {models.length > 0 ? models.map(m => <option key={m} value={m}>{m}</option>) : <option>Test a valid key to populate models</option>}
                        </Select>
                        {isFetchingModels && <SmartLoader context="loading" size="sm" showText={false} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ServiceSettings: React.FC<{ settings: Partial<BusinessInfo>, handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void, setSettings: React.Dispatch<React.SetStateAction<Partial<BusinessInfo>>> }> = ({ settings, handleChange, setSettings }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-semibold text-cyan-400">Research & Smart Auto-Fill</h3>
        <p className="text-sm text-gray-400 -mt-3">Used by Smart Auto-Fill to research businesses via web search.</p>
        <div className="grid grid-cols-1 gap-6">
            <div>
                <Label htmlFor="perplexityApiKey">Perplexity API Key <span className="text-xs text-gray-500">(Required for Smart Auto-Fill)</span></Label>
                <Input id="perplexityApiKey" name="perplexityApiKey" value={settings.perplexityApiKey || ''} onChange={handleChange} type="password" placeholder="pplx-..." />
            </div>
        </div>

        <h3 className="text-lg font-semibold text-purple-400 pt-4 border-t border-gray-700">SERP & Crawling Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="dataforseoLogin">DataForSEO Login</Label>
                <Input id="dataforseoLogin" name="dataforseoLogin" value={settings.dataforseoLogin || ''} onChange={handleChange} placeholder="user@example.com" />
            </div>
            <div>
                <Label htmlFor="dataforseoPassword">DataForSEO Password</Label>
                <Input id="dataforseoPassword" name="dataforseoPassword" value={settings.dataforseoPassword || ''} onChange={handleChange} type="password" placeholder="API Password" />
            </div>
            <div>
                <Label htmlFor="apifyToken">Apify Token</Label>
                <Input id="apifyToken" name="apifyToken" value={settings.apifyToken || ''} onChange={handleChange} type="password" placeholder="Apify API Token" />
            </div>
             <div>
                <Label htmlFor="firecrawlApiKey">Firecrawl API Key</Label>
                <Input id="firecrawlApiKey" name="firecrawlApiKey" value={settings.firecrawlApiKey || ''} onChange={handleChange} type="password" placeholder="Firecrawl API Key" />
            </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
            <SearchConsoleConnection
                supabaseUrl={settings.supabaseUrl || ''}
                onConnect={() => {
                    const adapter = new GscApiAdapter();
                    const authUrl = adapter.getAuthorizationUrl(
                        'settings',
                        `${window.location.origin}/settings/oauth/callback`
                    );
                    window.open(authUrl, '_blank', 'width=600,height=700');
                }}
                onDisconnect={() => {
                    // TODO: Implement disconnect
                    console.log('Disconnect GSC');
                }}
            />
        </div>

        <h3 className="text-lg font-semibold text-green-400 pt-4 border-t border-gray-700">Knowledge Graph & Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <Label htmlFor="infranodusApiKey">Infranodus API Key</Label>
                <Input id="infranodusApiKey" name="infranodusApiKey" value={settings.infranodusApiKey || ''} onChange={handleChange} type="password" placeholder="Infranodus API Key" />
            </div>
             <div>
                <Label htmlFor="jinaApiKey">Jina API Key</Label>
                <Input id="jinaApiKey" name="jinaApiKey" value={settings.jinaApiKey || ''} onChange={handleChange} type="password" placeholder="Jina API Key" />
            </div>
            <div>
                <Label htmlFor="apitemplateApiKey">APITemplate.io API Key</Label>
                <Input id="apitemplateApiKey" name="apitemplateApiKey" value={settings.apitemplateApiKey || ''} onChange={handleChange} type="password" placeholder="APITemplate.io API Key" />
            </div>
        </div>
        
        <h3 className="text-lg font-semibold text-teal-400 pt-4 border-t border-gray-700">Content Fetching (Audit)</h3>
        <p className="text-sm text-gray-400 -mt-3">Configure how the audit system fetches external page content for analysis.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="auditScrapingProvider">Preferred Scraping Provider</Label>
                <Select id="auditScrapingProvider" name="auditScrapingProvider" value={settings.auditScrapingProvider || 'jina'} onChange={(e) => setSettings(prev => ({ ...prev, auditScrapingProvider: e.target.value as any }))}>
                    <option value="jina">Jina AI (Default)</option>
                    <option value="firecrawl">Firecrawl</option>
                    <option value="direct">Direct Fetch (No API key needed)</option>
                </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
                <input
                    type="checkbox"
                    id="auditScrapingFallback"
                    name="auditScrapingFallback"
                    checked={settings.auditScrapingFallback !== false}
                    onChange={(e) => setSettings(prev => ({ ...prev, auditScrapingFallback: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <Label htmlFor="auditScrapingFallback" className="!mb-0">Enable automatic fallback</Label>
            </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-400 pt-4 border-t border-gray-700">Neo4j Database (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <Label htmlFor="neo4jUri">Neo4j URI</Label>
                <Input id="neo4jUri" name="neo4jUri" value={settings.neo4jUri || ''} onChange={handleChange} placeholder="neo4j+s://instance.databases.neo4j.io" />
            </div>
            <div>
                <Label htmlFor="neo4jUser">Neo4j User</Label>
                <Input id="neo4jUser" name="neo4jUser" value={settings.neo4jUser || ''} onChange={handleChange} placeholder="neo4j" />
            </div>
             <div>
                <Label htmlFor="neo4jPassword">Neo4j Password</Label>
                <Input id="neo4jPassword" name="neo4jPassword" value={settings.neo4jPassword || ''} onChange={handleChange} type="password" placeholder="Database Password" />
            </div>
        </div>

        <h3 className="text-lg font-semibold text-amber-400 pt-4 border-t border-gray-700">Image Generation</h3>
        <p className="text-sm text-gray-400 -mt-3">Configure API credentials for hero image generation and optimization.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="cloudinaryCloudName">Cloudinary Cloud Name</Label>
                <Input id="cloudinaryCloudName" name="cloudinaryCloudName" value={settings.cloudinaryCloudName || ''} onChange={handleChange} placeholder="your-cloud-name" />
            </div>
            <div>
                <Label htmlFor="cloudinaryApiKey">Cloudinary API Key</Label>
                <Input id="cloudinaryApiKey" name="cloudinaryApiKey" value={settings.cloudinaryApiKey || ''} onChange={handleChange} type="password" placeholder="Cloudinary API Key" />
            </div>
            <div>
                <Label htmlFor="cloudinaryUploadPreset">Cloudinary Upload Preset</Label>
                <Input id="cloudinaryUploadPreset" name="cloudinaryUploadPreset" value={settings.cloudinaryUploadPreset || ''} onChange={handleChange} placeholder="ml_default (create unsigned preset in Cloudinary)" />
                <p className="text-xs text-gray-500 mt-1">Create an unsigned upload preset in your Cloudinary dashboard</p>
            </div>
            <div>
                <Label htmlFor="markupGoApiKey">MarkupGo API Key</Label>
                <Input id="markupGoApiKey" name="markupGoApiKey" value={settings.markupGoApiKey || ''} onChange={handleChange} type="password" placeholder="MarkupGo API Key for image generation" />
            </div>
        </div>
    </div>
);


// --- Main Modal Component ---

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Partial<BusinessInfo>) => Promise<void>;
  initialSettings: BusinessInfo;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialSettings }) => {
    const { state } = useAppState();
    const [settings, setSettings] = useState<Partial<BusinessInfo>>(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'ai' | 'services' | 'wordpress' | 'organization' | 'project' | 'health'>('ai');
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);

    // Get active project info for project-specific settings
    const activeProject = state.activeProjectId
      ? state.projects?.find(p => p.id === state.activeProjectId)
      : null;

    useEffect(() => {
        if (isOpen) {
            // When modal opens, sync its state with the latest global state
            setSettings(initialSettings);
        }
    }, [isOpen, initialSettings]);

    const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(settings);
            // Parent handles closing on success
        } catch (e) {
            // Parent handles displaying error
        } finally {
            setIsSaving(false);
        }
    };

    const TabButton: React.FC<{ tab: 'ai' | 'services' | 'wordpress' | 'organization' | 'project' | 'health', label: string, id: string, disabled?: boolean }> = ({ tab, label, id, disabled }) => (
      <button
        type="button"
        role="tab"
        id={id}
        aria-selected={activeTab === tab}
        aria-controls={`${tab}-panel`}
        onClick={() => !disabled && setActiveTab(tab)}
        disabled={disabled}
        className={`w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-colors ${
          disabled
            ? 'text-gray-500 cursor-not-allowed opacity-50'
            : activeTab === tab
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        {label}
      </button>
    );

    // Footer content with form buttons
    const footerContent = (
        <div className="flex justify-end gap-4 w-full">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" form="settings-form" disabled={isSaving || state.isLoading.settings}>
                {(isSaving || state.isLoading.settings) ? <SmartLoader context="saving" size="sm" showText={false} /> : 'Save Settings'}
            </Button>
        </div>
    );

    return (
    <>
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Application Settings"
            description="Configure AI providers, API keys, and service settings"
            maxWidth="max-w-4xl"
            zIndex="z-[60]"
            footer={footerContent}
            className="max-h-[90vh] flex flex-col"
        >
            <form id="settings-form" onSubmit={handleSubmit} className="flex flex-grow overflow-hidden -m-6">
                <nav className="w-1/3 md:w-1/4 p-4 border-r border-gray-700 overflow-y-auto" aria-label="Settings categories">
                    <div className="space-y-2" role="tablist" aria-label="Settings tabs">
                       <TabButton tab="ai" label="AI Providers" id="tab-ai" />
                       <TabButton tab="services" label="SERP & Services" id="tab-services" />
                       <TabButton tab="wordpress" label="WordPress" id="tab-wordpress" />
                       <TabButton tab="organization" label="Organization" id="tab-organization" />
                       <TabButton
                         tab="project"
                         label={activeProject?.project_name ? `Project: ${activeProject.project_name.slice(0, 15)}${activeProject.project_name.length > 15 ? '...' : ''}` : 'Project'}
                         id="tab-project"
                         disabled={!activeProject}
                       />
                    </div>
                </nav>
                <main
                    id={`${activeTab}-panel`}
                    role="tabpanel"
                    aria-labelledby={`tab-${activeTab}`}
                    className="w-2/3 md:w-3/4 p-6 overflow-y-auto"
                >
                     {activeTab === 'ai' && <AIProviderSettings settings={settings} setSettings={setSettings} />}
                     {activeTab === 'services' && <ServiceSettings settings={settings} handleChange={handleGeneralChange} setSettings={setSettings} />}
                     {activeTab === 'wordpress' && (
                       <div className="space-y-4">
                         <h3 className="text-lg font-semibold text-blue-400">WordPress Connections</h3>
                         <p className="text-sm text-gray-400 -mt-2">Connect your WordPress sites to publish content directly from the app.</p>
                         <WordPressConnectionManager projectId={state.activeProjectId || undefined} />
                       </div>
                     )}
                     {activeTab === 'organization' && (
                       <OrganizationSettingsTab
                         onOpenMemberManagement={() => setIsMemberModalOpen(true)}
                         onOpenCosts={() => setIsCostModalOpen(true)}
                         onOpenApiKeys={() => setIsApiKeysModalOpen(true)}
                         onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
                       />
                     )}
                     {activeTab === 'project' && activeProject && (
                       <div className="space-y-4">
                         <div className="flex items-center justify-between">
                           <div>
                             <h3 className="text-lg font-semibold text-blue-400">Project Settings</h3>
                             <p className="text-sm text-gray-400">Configure settings for: {activeProject.project_name}</p>
                           </div>
                           <Button
                             variant="secondary"
                             onClick={() => setIsProjectSettingsOpen(true)}
                           >
                             <span className="flex items-center gap-2">
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                               </svg>
                               Manage External Collaborators
                             </span>
                           </Button>
                         </div>
                         <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                           <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                             Project Information
                           </h4>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                               <span className="text-gray-500">Name:</span>
                               <span className="ml-2 text-gray-200">{activeProject.project_name}</span>
                             </div>
                             <div>
                               <span className="text-gray-500">ID:</span>
                               <span className="ml-2 text-gray-400 font-mono text-xs">{activeProject.id}</span>
                             </div>
                           </div>
                         </div>
                         <p className="text-sm text-gray-500">
                           External collaborators are users added directly to this project (not via organization membership).
                           You can set monthly cost limits to control AI usage costs.
                         </p>
                       </div>
                     )}
                </main>
            </form>
        </Modal>
        <MemberManagementModal
          isOpen={isMemberModalOpen}
          onClose={() => setIsMemberModalOpen(false)}
        />
        <CostDashboardModal
          isOpen={isCostModalOpen}
          onClose={() => setIsCostModalOpen(false)}
        />
        <OrganizationApiKeysModal
          isOpen={isApiKeysModalOpen}
          onClose={() => setIsApiKeysModalOpen(false)}
        />
        <SubscriptionBillingModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
        />
        {activeProject && (
          <ProjectSettingsModal
            isOpen={isProjectSettingsOpen}
            onClose={() => setIsProjectSettingsOpen(false)}
            projectId={activeProject.id}
            projectName={activeProject.project_name}
          />
        )}
    </>
    );
};

export default SettingsModal;

// Named exports for sub-components used by other modules
export { AIProviderSettings, ServiceSettings };