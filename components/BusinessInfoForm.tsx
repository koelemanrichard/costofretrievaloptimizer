
// components/BusinessInfoForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../state/appState';
import { AppStep, BusinessInfo, AuthorProfile, StylometryType } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { InfoTooltip } from './ui/InfoTooltip';
import { Loader } from './ui/Loader';
import * as modelDiscovery from '../services/modelDiscoveryService';

const AIConfiguration = ({ localBusinessInfo, setLocalBusinessInfo, globalBusinessInfo }: { localBusinessInfo: Partial<BusinessInfo>, setLocalBusinessInfo: React.Dispatch<React.SetStateAction<Partial<BusinessInfo>>>, globalBusinessInfo: BusinessInfo }) => {
    const [models, setModels] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchModels = useCallback(async () => {
        if (!localBusinessInfo.aiProvider) return;
        
        setIsFetchingModels(true);
        setError(null);
        setModels([]);
        
        // Use the global keys for fetching, but local provider selection
        const settingsForDiscovery: BusinessInfo = {
            ...globalBusinessInfo,
            aiProvider: localBusinessInfo.aiProvider,
        };

        try {
            const fetchedModels = await modelDiscovery.fetchModelsForProvider(settingsForDiscovery);
            setModels(fetchedModels);
             if (fetchedModels.length > 0 && !fetchedModels.includes(localBusinessInfo.aiModel || '')) {
                setLocalBusinessInfo(prev => ({...prev, aiModel: fetchedModels[0]}));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch models.');
        } finally {
            setIsFetchingModels(false);
        }
    }, [localBusinessInfo.aiProvider, localBusinessInfo.aiModel, globalBusinessInfo, setLocalBusinessInfo]);
    
     useEffect(() => {
        handleFetchModels();
    }, [handleFetchModels]);


    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalBusinessInfo(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center">
                AI Configuration
                <InfoTooltip text="Select the AI provider and model for this specific topical map. This will override your global default setting." />
            </h3>
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div>
                    <Label htmlFor="map-aiProvider">AI Provider</Label>
                    <Select id="map-aiProvider" name="aiProvider" value={localBusinessInfo.aiProvider} onChange={handleChange}>
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="perplexity">Perplexity</option>
                        <option value="openrouter">OpenRouter</option>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="map-aiModel">AI Model</Label>
                    <div className="flex items-center gap-2">
                        <Select id="map-aiModel" name="aiModel" value={localBusinessInfo.aiModel} onChange={handleChange} disabled={isFetchingModels || models.length === 0}>
                            {models.length > 0 ? models.map(m => <option key={m} value={m}>{m}</option>) : <option>Select a provider</option>}
                        </Select>
                        {isFetchingModels && <Loader className="w-5 h-5" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AuthorConfiguration = ({ localBusinessInfo, setLocalBusinessInfo }: { localBusinessInfo: Partial<BusinessInfo>, setLocalBusinessInfo: React.Dispatch<React.SetStateAction<Partial<BusinessInfo>>> }) => {
    const profile = localBusinessInfo.authorProfile || {
        name: '',
        bio: '',
        credentials: '',
        socialUrls: [],
        stylometry: 'INSTRUCTIONAL_CLEAR',
        customStylometryRules: []
    };

    const updateProfile = (updates: Partial<AuthorProfile>) => {
        setLocalBusinessInfo(prev => ({
            ...prev,
            authorProfile: { ...profile, ...updates }
        }));
    };

    const handleSocialsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const urls = e.target.value.split('\n').map(s => s.trim()).filter(s => s);
        updateProfile({ socialUrls: urls });
    };

    const handleRulesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const rules = e.target.value.split('\n').map(s => s.trim()).filter(s => s);
        updateProfile({ customStylometryRules: rules });
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
            <h3 className="text-lg font-semibold text-purple-400 flex items-center mb-4">
                Author Identity & Stylometry
                <InfoTooltip text="Define the expert persona and writing style for the content. This helps establish E-E-A-T and ensures a consistent voice." />
            </h3>
            
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="authorName">Author Name</Label>
                        <Input 
                            id="authorName" 
                            value={profile.name} 
                            onChange={e => updateProfile({ name: e.target.value })} 
                            placeholder="e.g. Dr. Sarah Connor" 
                        />
                    </div>
                    <div>
                        <Label htmlFor="authorCredentials">Credentials / Title</Label>
                        <Input 
                            id="authorCredentials" 
                            value={profile.credentials} 
                            onChange={e => updateProfile({ credentials: e.target.value })} 
                            placeholder="e.g. PhD in Robotics" 
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="authorBio">Short Bio (E-E-A-T Context)</Label>
                    <Textarea 
                        id="authorBio" 
                        value={profile.bio} 
                        onChange={e => updateProfile({ bio: e.target.value })} 
                        placeholder="Briefly describe the author's expertise and experience..."
                        rows={2} 
                    />
                </div>

                <div>
                    <Label htmlFor="stylometry">Writing Style (Stylometry)</Label>
                    <Select 
                        id="stylometry" 
                        value={profile.stylometry} 
                        onChange={e => updateProfile({ stylometry: e.target.value as StylometryType })}
                    >
                        <option value="INSTRUCTIONAL_CLEAR">Instructional & Clear (Default)</option>
                        <option value="ACADEMIC_FORMAL">Academic & Formal</option>
                        <option value="DIRECT_TECHNICAL">Direct & Technical</option>
                        <option value="PERSUASIVE_SALES">Persuasive & Sales-Oriented</option>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="socialUrls">Social / Verification URLs</Label>
                        <p className="text-xs text-gray-400 mb-1">One URL per line (LinkedIn, Twitter, Website About Page)</p>
                        <Textarea 
                            id="socialUrls" 
                            value={profile.socialUrls.join('\n')} 
                            onChange={handleSocialsChange} 
                            rows={3} 
                            placeholder="https://linkedin.com/in/..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="customRules">Negative Constraints (Custom Rules)</Label>
                        <p className="text-xs text-gray-400 mb-1">One rule per line. Words/phrases to NEVER use.</p>
                        <Textarea 
                            id="customRules" 
                            value={profile.customStylometryRules?.join('\n') || ''} 
                            onChange={handleRulesChange} 
                            rows={3} 
                            placeholder="Do not use 'delve'&#10;Do not use 'in conclusion'&#10;Avoid passive voice"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Added a strongly-typed props interface to ensure type safety and resolve compiler errors in parent components.
interface BusinessInfoFormProps {
  onSave: (formData: Partial<BusinessInfo>) => void;
  onBack: () => void;
  isLoading: boolean;
}

const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({ onSave, onBack, isLoading }) => {
    const { state } = useAppState();
    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);

    const [localBusinessInfo, setLocalBusinessInfo] = useState<Partial<BusinessInfo>>(() => {
        // Initialize with map data if it exists, otherwise fall back to global state
        const initialData = activeMap?.business_info 
            ? activeMap.business_info as Partial<BusinessInfo>
            : {
                ...state.businessInfo,
                aiProvider: state.businessInfo.aiProvider,
                aiModel: state.businessInfo.aiModel,
            };

        // Backward compatibility: If legacy author fields exist but profile doesn't, migrate them conceptually in the UI state
        if (!initialData.authorProfile && (initialData.authorName || initialData.authorBio)) {
            initialData.authorProfile = {
                name: initialData.authorName || '',
                bio: initialData.authorBio || '',
                credentials: initialData.authorCredentials || '',
                socialUrls: initialData.socialProfileUrls || [],
                stylometry: 'INSTRUCTIONAL_CLEAR',
                customStylometryRules: []
            };
        }

        return initialData;
    });
    
    useEffect(() => {
      // This ensures that if the global state is loaded *after* the component mounts,
      // the local state is updated with the correct AI provider defaults.
      setLocalBusinessInfo(prev => ({
        ...prev,
        aiProvider: prev.aiProvider || state.businessInfo.aiProvider,
        aiModel: prev.aiModel || state.businessInfo.aiModel,
      }));
    }, [state.businessInfo.aiProvider, state.businessInfo.aiModel]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setLocalBusinessInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(localBusinessInfo);
    };

    return (
        <Card className="max-w-3xl w-full">
            <form onSubmit={handleSubmit}>
                <div className="p-8">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Define Business Context</h1>
                        <p className="text-gray-400 mt-2">Provide core details about the business. This context is crucial for the AI to generate a relevant topical map.</p>
                    </header>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="seedKeyword">Main Topic / Seed Keyword</Label>
                                <Input id="seedKeyword" name="seedKeyword" value={localBusinessInfo.seedKeyword || ''} onChange={handleChange} required />
                            </div>
                             <div>
                                <Label htmlFor="industry">Industry</Label>
                                <Input id="industry" name="industry" value={localBusinessInfo.industry || ''} onChange={handleChange} required />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="valueProp">Unique Value Proposition</Label>
                            <Textarea id="valueProp" name="valueProp" value={localBusinessInfo.valueProp || ''} onChange={handleChange} rows={6} required />
                        </div>
                        <div>
                            <Label htmlFor="audience">Target Audience</Label>
                            <Input id="audience" name="audience" value={localBusinessInfo.audience || ''} onChange={handleChange} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="language">Language Code</Label>
                                <Input id="language" name="language" value={localBusinessInfo.language || ''} onChange={handleChange} placeholder="e.g., en, nl, es" required />
                            </div>
                            <div>
                                <Label htmlFor="targetMarket">Target Market (Country)</Label>
                                <Input id="targetMarket" name="targetMarket" value={localBusinessInfo.targetMarket || ''} onChange={handleChange} placeholder="e.g., United States" required />
                            </div>
                        </div>
                        
                        {/* New Author Configuration Section */}
                        <AuthorConfiguration localBusinessInfo={localBusinessInfo} setLocalBusinessInfo={setLocalBusinessInfo} />

                        <AIConfiguration localBusinessInfo={localBusinessInfo} setLocalBusinessInfo={setLocalBusinessInfo} globalBusinessInfo={state.businessInfo} />
                    </div>
                </div>
                <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                    <Button type="button" onClick={onBack} variant="secondary">Back</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader className="w-5 h-5" /> : 'Save & Start Pillar Definition'}
                    </Button>
                </footer>
            </form>
        </Card>
    );
};

export default BusinessInfoForm;
