
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../state/appState';
import { BusinessInfo } from '../../types';
import { Select } from './Select';
import { Label } from './Label';
import * as modelDiscovery from '../../services/modelDiscoveryService';
import { Loader } from './Loader';

interface AIModelSelectorProps {
    currentConfig: BusinessInfo; // The project defaults (or currently active context)
    onConfigChange: (provider: string | null, model: string | null) => void;
    className?: string;
}

export const AIModelSelector: React.FC<AIModelSelectorProps> = ({ currentConfig, onConfigChange, className }) => {
    const { state } = useAppState();
    // Access global keys to see what's available. 
    // We use state.businessInfo for keys because it represents the user's global settings.
    const globalSettings = state.businessInfo;

    const [selectedProvider, setSelectedProvider] = useState<string>('default');
    const [selectedModel, setSelectedModel] = useState<string>('default');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Check availability of providers based on keys
    const providers = [
        { id: 'gemini', label: 'Google Gemini', hasKey: !!globalSettings.geminiApiKey },
        { id: 'openai', label: 'OpenAI', hasKey: !!globalSettings.openAiApiKey },
        { id: 'anthropic', label: 'Anthropic', hasKey: !!globalSettings.anthropicApiKey },
        { id: 'perplexity', label: 'Perplexity', hasKey: !!globalSettings.perplexityApiKey },
        { id: 'openrouter', label: 'OpenRouter', hasKey: !!globalSettings.openRouterApiKey },
    ];

    // Fetch models when provider changes
    useEffect(() => {
        const fetchModels = async () => {
            if (selectedProvider === 'default') {
                setAvailableModels([]);
                if (selectedModel !== 'default') {
                    onConfigChange(null, null);
                }
                return;
            }

            setIsLoadingModels(true);
            try {
                // Construct a temp config object to pass to discovery service
                // We need to ensure the correct API key is present for the selected provider
                const tempConfig: any = { aiProvider: selectedProvider };
                
                if (selectedProvider === 'openrouter') tempConfig.openRouterApiKey = globalSettings.openRouterApiKey;
                // Other providers use static lists currently, but we pass the config for consistency
                
                const models = await modelDiscovery.fetchModelsForProvider(tempConfig as BusinessInfo);
                setAvailableModels(models);
                
                // Default to first model if current selection is invalid for this provider
                if (models.length > 0) {
                    // GUARD CLAUSE: Only update if the model is actually different
                    if (selectedModel !== models[0]) {
                        setSelectedModel(models[0]);
                        onConfigChange(selectedProvider, models[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to load models for selector:", error);
                setAvailableModels([]);
            } finally {
                setIsLoadingModels(false);
            }
        };

        fetchModels();
    }, [selectedProvider, globalSettings, onConfigChange, selectedModel]);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProvider(e.target.value);
        // Reset model to loading state implicitly by effect
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const model = e.target.value;
        setSelectedModel(model);
        onConfigChange(selectedProvider, model);
    };

    return (
        <div className={`p-3 bg-gray-800/50 border border-gray-700 rounded-lg ${className}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <Label htmlFor="override-provider" className="text-xs uppercase text-gray-500 mb-1">AI Provider</Label>
                    <Select 
                        id="override-provider" 
                        value={selectedProvider} 
                        onChange={handleProviderChange}
                        className="!py-1.5 !text-sm"
                    >
                        <option value="default">Project Default ({currentConfig.aiProvider})</option>
                        {providers.map(p => (
                            <option key={p.id} value={p.id} disabled={!p.hasKey}>
                                {p.label} {!p.hasKey ? '(No Key)' : ''}
                            </option>
                        ))}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="override-model" className="text-xs uppercase text-gray-500 mb-1">Model</Label>
                    <div className="relative">
                        <Select 
                            id="override-model" 
                            value={selectedModel} 
                            onChange={handleModelChange}
                            className="!py-1.5 !text-sm"
                            disabled={selectedProvider === 'default' || isLoadingModels || availableModels.length === 0}
                        >
                            {selectedProvider === 'default' ? (
                                <option value="default">{currentConfig.aiModel}</option>
                            ) : (
                                availableModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))
                            )}
                        </Select>
                        {isLoadingModels && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                <Loader className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
