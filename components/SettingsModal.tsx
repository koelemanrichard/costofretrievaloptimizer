// components/SettingsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../state/appState';
import { BusinessInfo } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select } from './ui/Select';
import { Loader } from './ui/Loader';
import * as modelDiscovery from '../services/modelDiscoveryService';

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
                    {validationStatus === 'loading' ? <Loader className="w-5 h-5"/> : 'Test Key'}
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
                        {isFetchingModels && <Loader className="w-5 h-5"/>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ServiceSettings: React.FC<{ settings: Partial<BusinessInfo>, handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ settings, handleChange }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-semibold text-purple-400">SERP & Crawling Credentials</h3>
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
    const [activeTab, setActiveTab] = useState<'ai' | 'services' | 'health'>('ai');

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

    const TabButton: React.FC<{ tab: 'ai' | 'services' | 'health', label: string }> = ({ tab, label }) => (
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === tab}
        onClick={() => setActiveTab(tab)}
        className={`w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
      >
        {label}
      </button>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <header className="flex-shrink-0 p-4 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Application Settings</h2>
                    </header>

                    <div className="flex flex-grow overflow-hidden">
                        <nav className="w-1/3 md:w-1/4 p-4 border-r border-gray-700 overflow-y-auto">
                            <div className="space-y-2" role="tablist">
                               <TabButton tab="ai" label="AI Providers" />
                               <TabButton tab="services" label="SERP & Services" />
                            </div>
                        </nav>
                        <main className="w-2/3 md:w-3/4 p-6 overflow-y-auto" role="tabpanel">
                             {activeTab === 'ai' && <AIProviderSettings settings={settings} setSettings={setSettings} />}
                             {activeTab === 'services' && <ServiceSettings settings={settings} handleChange={handleGeneralChange} />}
                        </main>
                    </div>

                    <footer className="flex-shrink-0 p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" disabled={isSaving || state.isLoading.settings}>
                            {(isSaving || state.isLoading.settings) ? <Loader className="w-5 h-5" /> : 'Save Settings'}
                        </Button>
                    </footer>
                </form>
            </Card>
        </div>
    );
};

export default SettingsModal;