
// components/BusinessInfoForm.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../state/appState';
import { AppStep, BusinessInfo, AuthorProfile, StylometryType, WebsiteType, WEBSITE_TYPE_CONFIG } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { InfoTooltip } from './ui/InfoTooltip';
import { Loader } from './ui/Loader';
import { SmartLoader } from './ui/FunLoaders';
import * as modelDiscovery from '../services/modelDiscoveryService';
import { useSmartWizard } from '../hooks/useSmartWizard';
import { detectInputType } from '../services/ai/businessResearch';
import BrandKitEditor from './BrandKitEditor';

const AIConfiguration = ({ localBusinessInfo, setLocalBusinessInfo, globalBusinessInfo, onProviderChange }: { localBusinessInfo: Partial<BusinessInfo>, setLocalBusinessInfo: React.Dispatch<React.SetStateAction<Partial<BusinessInfo>>>, globalBusinessInfo: BusinessInfo, onProviderChange?: (provider: string, model: string) => void }) => {
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
        const { name, value } = e.target;
        setLocalBusinessInfo(prev => ({...prev, [name]: value }));

        // Also update global state when AI settings change
        if (onProviderChange && (name === 'aiProvider' || name === 'aiModel')) {
            const newProvider = name === 'aiProvider' ? value : localBusinessInfo.aiProvider || 'gemini';
            const newModel = name === 'aiModel' ? value : localBusinessInfo.aiModel || '';
            onProviderChange(newProvider, newModel);
        }
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

// Smart Wizard Panel - AI-powered auto-fill
interface SmartWizardPanelProps {
    localBusinessInfo: Partial<BusinessInfo>;
    setLocalBusinessInfo: React.Dispatch<React.SetStateAction<Partial<BusinessInfo>>>;
    isFieldSuggested: (fieldName: string) => boolean;
    markFieldEdited: (fieldName: string) => void;
}

const SmartWizardPanel: React.FC<SmartWizardPanelProps> = ({
    localBusinessInfo,
    setLocalBusinessInfo,
    isFieldSuggested,
    markFieldEdited,
}) => {
    const smartWizard = useSmartWizard();
    const [showApplyButton, setShowApplyButton] = useState(false);

    const handleResearch = async () => {
        const result = await smartWizard.research();
        if (result && result.suggestions && Object.keys(result.suggestions).length > 0) {
            setShowApplyButton(true);
        }
    };

    const handleApply = () => {
        smartWizard.applySuggestions(localBusinessInfo, setLocalBusinessInfo);
        setShowApplyButton(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleResearch();
        }
    };

    const inputType = smartWizard.input ? detectInputType(smartWizard.input) : null;

    return (
        <div className="p-4 border border-emerald-700/50 rounded-lg bg-emerald-900/20 mb-6">
            <h3 className="text-lg font-semibold text-emerald-400 flex items-center mb-2">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Smart Auto-Fill
                <InfoTooltip text="Enter a business name, website URL, or description to automatically research and fill in the form fields. You can always edit the suggestions." />
            </h3>
            <p className="text-sm text-gray-400 mb-3">
                Save time by letting AI research and pre-fill the form. Enter a URL, business name, or description.
            </p>

            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Input
                        value={smartWizard.input}
                        onChange={(e) => smartWizard.setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., https://example.com or 'Acme Corp - B2B software company'"
                        className="pr-20"
                        disabled={smartWizard.isResearching}
                    />
                    {inputType && smartWizard.input && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                            {inputType === 'url' ? 'URL' : inputType === 'name' ? 'Name' : inputType === 'mixed' ? 'URL + Info' : 'Description'}
                        </span>
                    )}
                </div>
                <Button
                    type="button"
                    onClick={handleResearch}
                    disabled={!smartWizard.input.trim() || smartWizard.isResearching}
                    className="whitespace-nowrap"
                >
                    {smartWizard.isResearching ? (
                        <SmartLoader context="researching" size="sm" />
                    ) : (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Research
                        </>
                    )}
                </Button>
            </div>

            {/* Error message */}
            {smartWizard.error && (
                <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                    <p className="text-sm text-red-400">{smartWizard.error}</p>
                </div>
            )}

            {/* Success result with apply button */}
            {smartWizard.result && !smartWizard.error && (
                <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                    smartWizard.result.confidence === 'high' ? 'bg-green-700 text-green-200' :
                                    smartWizard.result.confidence === 'medium' ? 'bg-yellow-700 text-yellow-200' :
                                    'bg-orange-700 text-orange-200'
                                }`}>
                                    {smartWizard.result.confidence} confidence
                                </span>
                                <span className="text-xs text-gray-500">
                                    Source: {smartWizard.result.source}
                                </span>
                            </div>
                            <p className="text-sm text-gray-300">
                                Found {Object.values(smartWizard.result.suggestions).filter(v => v && String(v).trim()).length} field suggestions
                            </p>
                            {(smartWizard.result.warnings || []).length > 0 && (
                                <p className="text-xs text-yellow-400 mt-1">
                                    {smartWizard.result.warnings[0]}
                                </p>
                            )}
                        </div>
                        {showApplyButton && (
                            <Button
                                type="button"
                                onClick={handleApply}
                                variant="primary"
                                size="sm"
                            >
                                Apply Suggestions
                            </Button>
                        )}
                    </div>

                    {/* Preview of suggestions */}
                    {showApplyButton && smartWizard.result.suggestions && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-500 mb-2">Preview:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {smartWizard.result.suggestions.seedKeyword && (
                                    <div><span className="text-gray-500">Seed Keyword:</span> <span className="text-gray-300">{smartWizard.result.suggestions.seedKeyword}</span></div>
                                )}
                                {smartWizard.result.suggestions.industry && (
                                    <div><span className="text-gray-500">Industry:</span> <span className="text-gray-300">{smartWizard.result.suggestions.industry}</span></div>
                                )}
                                {smartWizard.result.suggestions.audience && (
                                    <div><span className="text-gray-500">Audience:</span> <span className="text-gray-300">{smartWizard.result.suggestions.audience}</span></div>
                                )}
                                {smartWizard.result.suggestions.targetMarket && (
                                    <div><span className="text-gray-500">Market:</span> <span className="text-gray-300">{smartWizard.result.suggestions.targetMarket}</span></div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Collapsible form section
const FormAccordion: React.FC<{
    title: string;
    defaultOpen?: boolean;
    isComplete?: boolean;
    children: React.ReactNode;
}> = ({ title, defaultOpen = false, isComplete = false, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
            >
                <span className="font-medium text-gray-200 flex items-center gap-2">
                    {title}
                    {isComplete && (
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </span>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && <div className="p-4 space-y-4">{children}</div>}
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
    const { state, dispatch } = useAppState();
    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);

    // Track which fields were auto-filled by Smart Wizard
    const [suggestedFields, setSuggestedFields] = useState<Set<string>>(new Set());

    const isFieldSuggested = useCallback((fieldName: string): boolean => {
        return suggestedFields.has(fieldName);
    }, [suggestedFields]);

    const markFieldEdited = useCallback((fieldName: string) => {
        setSuggestedFields(prev => {
            const newSet = new Set(prev);
            newSet.delete(fieldName);
            return newSet;
        });
    }, []);

    const [localBusinessInfo, setLocalBusinessInfo] = useState<Partial<BusinessInfo>>(() => {
        // Initialize with map's business context (NOT AI settings) merged with global state
        // AI settings (provider, model, API keys) ALWAYS come from global user_settings
        const mapData = activeMap?.business_info as Partial<BusinessInfo> || {};

        // Strip AI settings from map - they should come from global settings
        const {
            aiProvider: _mapAiProvider,
            aiModel: _mapAiModel,
            geminiApiKey: _gk,
            openAiApiKey: _ok,
            anthropicApiKey: _ak,
            perplexityApiKey: _pk,
            openRouterApiKey: _ork,
            ...mapBusinessContext
        } = mapData;

        const initialData: Partial<BusinessInfo> = {
            ...state.businessInfo,      // Global settings as base (includes correct AI settings)
            ...mapBusinessContext,      // Map's business context (domain, industry, etc.)
            // Ensure AI settings are always from global
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
      // Ensure AI settings are always synced with global state
      // This handles cases where global state loads after component mounts
      setLocalBusinessInfo(prev => ({
        ...prev,
        aiProvider: state.businessInfo.aiProvider,  // Always use global, not fallback
        aiModel: state.businessInfo.aiModel,
      }));
    }, [state.businessInfo.aiProvider, state.businessInfo.aiModel]);

    // Portal-based tooltip state for website types
    const [activeTooltip, setActiveTooltip] = useState<{ type: WebsiteType; rect: DOMRect } | null>(null);
    const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Website type category tabs
    const WEBSITE_CATEGORIES: { label: string; types: WebsiteType[] }[] = [
        { label: 'Commercial', types: ['ECOMMERCE', 'SAAS', 'MARKETPLACE', 'EVENTS'] },
        { label: 'Lead Gen / Local', types: ['SERVICE_B2B', 'LEAD_GENERATION', 'REAL_ESTATE', 'HEALTHCARE', 'HOSPITALITY'] },
        { label: 'Content / Media', types: ['INFORMATIONAL', 'AFFILIATE_REVIEW', 'NEWS_MEDIA', 'EDUCATION'] },
        { label: 'Specialized', types: ['RECRUITMENT', 'DIRECTORY', 'COMMUNITY', 'NONPROFIT'] },
    ];
    // Auto-select the category containing the currently selected type
    const [websiteCategory, setWebsiteCategory] = useState<number>(() => {
        if (!localBusinessInfo.websiteType) return 0;
        const idx = WEBSITE_CATEGORIES.findIndex(c => c.types.includes(localBusinessInfo.websiteType!));
        return idx >= 0 ? idx : 0;
    });

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

                    {/* Smart Wizard Panel */}
                    <SmartWizardPanel
                        localBusinessInfo={localBusinessInfo}
                        setLocalBusinessInfo={setLocalBusinessInfo}
                        isFieldSuggested={isFieldSuggested}
                        markFieldEdited={markFieldEdited}
                    />

                    <div className="space-y-6">
                        {/* Core Business - always visible */}
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

                        {/* Website Type Selector */}
                        <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-cyan-400 flex items-center">
                                    Website Type
                                    <InfoTooltip text="Select your website type to get optimized AI strategies for content structure, EAV priorities, and linking patterns. This affects how topical maps and briefs are generated." />
                                </h3>
                            </div>
                            {/* Category tabs */}
                            <div className="flex gap-1 mb-3 flex-wrap">
                                {WEBSITE_CATEGORIES.map((cat, idx) => (
                                    <button
                                        key={cat.label}
                                        type="button"
                                        onClick={() => setWebsiteCategory(idx)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            websiteCategory === idx
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            <div className="pr-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {WEBSITE_CATEGORIES[websiteCategory].types.map((type) => {
                                        const config = WEBSITE_TYPE_CONFIG[type];
                                        const isSelected = localBusinessInfo.websiteType === type;
                                        return (
                                            <div key={type} className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setLocalBusinessInfo(prev => ({ ...prev, websiteType: type }))}
                                                    onMouseEnter={(e) => {
                                                        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActiveTooltip({ type, rect });
                                                    }}
                                                    onMouseLeave={() => {
                                                        tooltipTimeoutRef.current = setTimeout(() => setActiveTooltip(null), 100);
                                                    }}
                                                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                                                        isSelected
                                                            ? 'border-cyan-500 bg-cyan-900/30 ring-1 ring-cyan-500'
                                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`font-medium text-sm ${isSelected ? 'text-cyan-300' : 'text-gray-200'}`}>
                                                            {config.label}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {isSelected && (
                                                                <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            <svg className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 line-clamp-2">{config.description}</p>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {localBusinessInfo.websiteType && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-gray-500">Core Focus:</span>
                                            <p className="text-gray-300">{WEBSITE_TYPE_CONFIG[localBusinessInfo.websiteType].coreSectionFocus}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Authority Focus:</span>
                                            <p className="text-gray-300">{WEBSITE_TYPE_CONFIG[localBusinessInfo.websiteType].authorSectionFocus}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="valueProp">Unique Value Proposition</Label>
                            <Textarea id="valueProp" name="valueProp" value={localBusinessInfo.valueProp || ''} onChange={handleChange} rows={4} required />
                        </div>
                        <div>
                            <Label htmlFor="audience">Target Audience</Label>
                            <Input id="audience" name="audience" value={localBusinessInfo.audience || ''} onChange={handleChange} required />
                        </div>

                        {/* Market & Language - collapsed if filled */}
                        <FormAccordion
                            title="Market & Language"
                            defaultOpen={!localBusinessInfo.language || !localBusinessInfo.targetMarket}
                            isComplete={!!(localBusinessInfo.language && localBusinessInfo.targetMarket)}
                        >
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
                        </FormAccordion>

                        {/* Author Identity - collapsed */}
                        <FormAccordion
                            title="Author Identity & Stylometry"
                            defaultOpen={false}
                            isComplete={!!(localBusinessInfo.authorProfile?.name)}
                        >
                            <AuthorConfiguration localBusinessInfo={localBusinessInfo} setLocalBusinessInfo={setLocalBusinessInfo} />
                        </FormAccordion>

                        {/* Brand Kit - collapsed */}
                        <FormAccordion
                            title="Brand Kit"
                            defaultOpen={false}
                            isComplete={!!(localBusinessInfo.brandKit?.colors?.length)}
                        >
                            <BrandKitEditor
                              brandKit={localBusinessInfo.brandKit}
                              onChange={(brandKit) => setLocalBusinessInfo(prev => ({ ...prev, brandKit }))}
                            />
                        </FormAccordion>

                        {/* AI Configuration - collapsed */}
                        <FormAccordion
                            title="AI Configuration"
                            defaultOpen={false}
                            isComplete={!!(localBusinessInfo.aiProvider)}
                        >
                            <AIConfiguration
                                localBusinessInfo={localBusinessInfo}
                                setLocalBusinessInfo={setLocalBusinessInfo}
                                globalBusinessInfo={state.businessInfo}
                                onProviderChange={(provider, model) => {
                                    dispatch({
                                        type: 'SET_BUSINESS_INFO',
                                        payload: {
                                            ...state.businessInfo,
                                            aiProvider: provider as BusinessInfo['aiProvider'],
                                            aiModel: model,
                                        }
                                    });
                                }}
                            />
                        </FormAccordion>
                    </div>
                </div>
                <footer className="sticky bottom-0 p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center z-10">
                    <Button type="button" onClick={onBack} variant="secondary">Back</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader className="w-5 h-5" /> : 'Save & Start Pillar Definition'}
                    </Button>
                </footer>
            </form>

            {/* Portal-rendered tooltip for website types - escapes overflow containers */}
            {activeTooltip && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        left: activeTooltip.rect.left + activeTooltip.rect.width / 2,
                        top: activeTooltip.rect.top - 8,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="bg-slate-950 border-2 border-cyan-500/50 rounded-lg p-3 shadow-2xl shadow-black/50 text-xs ring-1 ring-cyan-500/20 max-w-xs">
                        <div className="mb-2">
                            <span className="text-cyan-300 font-semibold">Key Attributes:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {WEBSITE_TYPE_CONFIG[activeTooltip.type].keyAttributes.slice(0, 6).map(attr => (
                                    <span key={attr} className="bg-cyan-900/50 text-cyan-100 px-1.5 py-0.5 rounded text-[10px] border border-cyan-700/50">
                                        {attr.replace(/_/g, ' ')}
                                    </span>
                                ))}
                                {WEBSITE_TYPE_CONFIG[activeTooltip.type].keyAttributes.length > 6 && (
                                    <span className="text-gray-400 text-[10px]">+{WEBSITE_TYPE_CONFIG[activeTooltip.type].keyAttributes.length - 6} more</span>
                                )}
                            </div>
                        </div>
                        <div className="mb-2">
                            <span className="text-emerald-400 font-semibold">Core Focus:</span>
                            <p className="text-gray-100 mt-0.5">{WEBSITE_TYPE_CONFIG[activeTooltip.type].coreSectionFocus}</p>
                        </div>
                        <div>
                            <span className="text-violet-400 font-semibold">Authority Focus:</span>
                            <p className="text-gray-100 mt-0.5">{WEBSITE_TYPE_CONFIG[activeTooltip.type].authorSectionFocus}</p>
                        </div>
                        {/* Arrow pointing down */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 bg-slate-950 border-r-2 border-b-2 border-cyan-500/50 transform rotate-45"></div>
                    </div>
                </div>,
                document.body
            )}
        </Card>
    );
};

export default BusinessInfoForm;
