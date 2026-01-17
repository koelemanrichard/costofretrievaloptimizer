
// components/wizards/CompetitorRefinementWizard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import { AppStep, SEOPillars, SemanticTriple, SerpResult, BusinessInfo } from '../../types';
import * as serpApiService from '../../services/serpApiService';
import { discoverCompetitorsWithAI } from '../../services/perplexityService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { SmartLoader } from '../ui/FunLoaders';

type DiscoveryMethod = 'idle' | 'serp' | 'ai' | 'done';

interface CompetitorRefinementWizardProps {
  onFinalize: (competitors: string[]) => void;
  onBack: () => void;
}

const CompetitorRefinementWizard: React.FC<CompetitorRefinementWizardProps> = ({ onFinalize, onBack }) => {
    const { state, dispatch } = useAppState();
    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);

    // Build effective business info with project domain fallback
    // AI settings (provider, model, API keys) always come from global state, not map's business_info
    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
        const mapBusinessInfo = activeMap?.business_info as Partial<BusinessInfo> || {};
        // Strip AI settings from map - they should come from global user_settings
        const { aiProvider: _, aiModel: __, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
        return {
            ...state.businessInfo,
            domain: mapBusinessContext.domain || activeProject?.domain || state.businessInfo.domain,
            projectName: mapBusinessContext.projectName || activeProject?.project_name || state.businessInfo.projectName,
            ...mapBusinessContext,
            ...(mapBusinessContext.domain ? {} : { domain: activeProject?.domain || state.businessInfo.domain }),
            // AI settings ALWAYS from global
            aiProvider: state.businessInfo.aiProvider,
            aiModel: state.businessInfo.aiModel,
        };
    }, [state.businessInfo, activeMap, activeProject]);

    const [competitors, setCompetitors] = useState<SerpResult[]>([]);
    const [selectedCompetitorUrls, setSelectedCompetitorUrls] = useState<string[]>(activeMap?.competitors || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualUrl, setManualUrl] = useState('');
    const [manualCompetitors, setManualCompetitors] = useState<SerpResult[]>([]);
    const [discoveryMethod, setDiscoveryMethod] = useState<DiscoveryMethod>('idle');
    const [discoveredViaAI, setDiscoveredViaAI] = useState(false);

    const fetchCompetitors = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        setIsLoading(true);
        setError(null);
        setDiscoveryMethod('serp');
        setDiscoveredViaAI(false);

        let results: SerpResult[] = [];

        // Step 1: Try DataForSEO/SERP-based discovery
        try {
            results = await serpApiService.discoverInitialCompetitors(
                activeMap.pillars.centralEntity,
                effectiveBusinessInfo,
                dispatch
            );
        } catch (e) {
            console.warn('[CompetitorWizard] SERP discovery failed:', e);
            // Don't set error yet - we'll try AI fallback
        }

        // Step 2: If SERP returns empty and Perplexity is configured, try AI discovery
        if (results.length === 0 && effectiveBusinessInfo.perplexityApiKey) {
            setDiscoveryMethod('ai');
            try {
                console.log('[CompetitorWizard] SERP returned empty, falling back to AI discovery...');
                results = await discoverCompetitorsWithAI(
                    activeMap.pillars,
                    effectiveBusinessInfo,
                    dispatch
                );
                console.log(`[CompetitorWizard] AI discovery found ${results.length} competitors`);
                if (results.length > 0) {
                    setDiscoveredViaAI(true);
                }
            } catch (e) {
                console.warn('[CompetitorWizard] AI discovery also failed:', e);
                setError(e instanceof Error ? e.message : 'Failed to discover competitors via AI.');
            }
        }

        setDiscoveryMethod('done');
        setCompetitors(results);

        if (results.length > 0 && selectedCompetitorUrls.length === 0) {
            setSelectedCompetitorUrls(results.slice(0, 5).map(r => r.link)); // Pre-select top 5 if none selected
        }

        setIsLoading(false);
    }, [activeMap, effectiveBusinessInfo, dispatch, selectedCompetitorUrls.length]);

    useEffect(() => {
        fetchCompetitors();
    }, [fetchCompetitors]);

    const handleToggleCompetitor = (url: string) => {
        setSelectedCompetitorUrls(prev =>
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
    };

    const handleAddManualCompetitor = () => {
        if (!manualUrl.trim()) return;

        // Normalize URL - add https:// if missing
        let normalizedUrl = manualUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        // Check if already exists
        const allUrls = [...competitors.map(c => c.link), ...manualCompetitors.map(c => c.link)];
        if (allUrls.includes(normalizedUrl)) {
            setManualUrl('');
            return;
        }

        // Extract domain for title
        let domain = normalizedUrl;
        try {
            domain = new URL(normalizedUrl).hostname;
        } catch {}

        const newCompetitor: SerpResult = {
            position: 0,
            title: domain,
            link: normalizedUrl,
            snippet: 'Manually added competitor'
        };

        setManualCompetitors(prev => [...prev, newCompetitor]);
        setSelectedCompetitorUrls(prev => [...prev, normalizedUrl]);
        setManualUrl('');
    };

    const handleRemoveManualCompetitor = (url: string) => {
        setManualCompetitors(prev => prev.filter(c => c.link !== url));
        setSelectedCompetitorUrls(prev => prev.filter(u => u !== url));
    };

    // Combine discovered and manual competitors
    const allCompetitors = [...competitors, ...manualCompetitors];

    return (
        <Card className="max-w-3xl w-full">
            <div className="p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Refine Competitors</h1>
                    <p className="text-gray-400 mt-2">Select relevant competitors to inform map generation.</p>
                </header>
                {isLoading && (
                    <div className="flex flex-col items-center gap-3 py-8">
                        <SmartLoader
                            context="discovering"
                            size="lg"
                            customText={
                                discoveryMethod === 'serp' ? 'Discovering competitors via SERP...' :
                                discoveryMethod === 'ai' ? 'Discovering via AI...' :
                                'Initializing...'
                            }
                        />
                    </div>
                )}
                {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-md text-center">{error}</div>}
                {!isLoading && !error && competitors.length === 0 && manualCompetitors.length === 0 && (
                    <div className="text-yellow-400 bg-yellow-900/20 p-4 rounded-md text-center mb-4">
                        <p className="font-semibold mb-2">No competitors discovered automatically</p>
                        <p className="text-sm text-gray-400">
                            {effectiveBusinessInfo.perplexityApiKey
                                ? 'Both SERP and AI-based discovery found no competitors.'
                                : 'SERP-based discovery found no competitors. Configure Perplexity API key for AI-based fallback.'}
                            {' '}Add competitors manually below, or proceed without them if your topic is unique.
                        </p>
                    </div>
                )}

                {/* Manual competitor input */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Add competitor manually</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualUrl}
                            onChange={(e) => setManualUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddManualCompetitor()}
                            placeholder="https://competitor-website.com"
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        <Button onClick={handleAddManualCompetitor} variant="secondary" disabled={!manualUrl.trim()}>
                            Add
                        </Button>
                    </div>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-4">
                    {/* Deduplicate competitors by URL to avoid duplicate keys */}
                    {allCompetitors
                        .filter((c, index, self) => self.findIndex(x => x.link === c.link) === index)
                        .map((c, index) => {
                            const isManual = manualCompetitors.some(mc => mc.link === c.link);
                            const isFromAI = !isManual && discoveredViaAI;
                            return (
                                <div
                                    key={`${c.link}-${index}`}
                                    className={`p-3 rounded-lg flex items-start gap-3 cursor-pointer border ${selectedCompetitorUrls.includes(c.link) ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-900/50 border-gray-700'}`}
                                    onClick={() => handleToggleCompetitor(c.link)}
                                >
                                    <input type="checkbox" checked={selectedCompetitorUrls.includes(c.link)} readOnly className="mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-white">{c.title}</p>
                                            {isManual && (
                                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Manual</span>
                                            )}
                                            {isFromAI && (
                                                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">AI</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-green-400 font-mono break-all">{c.link}</p>
                                        {c.snippet && !isManual && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.snippet}</p>
                                        )}
                                    </div>
                                    {isManual && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveManualCompetitor(c.link);
                                            }}
                                            className="text-gray-500 hover:text-red-400 text-sm"
                                            title="Remove"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
            <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                <Button onClick={onBack} variant="secondary">Back</Button>
                <Button
                    onClick={() => onFinalize(selectedCompetitorUrls)}
                    disabled={isLoading}
                    title={selectedCompetitorUrls.length === 0 ? "Proceeding without competitor data" : undefined}
                >
                    {state.isLoading.map ? <Loader /> : (
                        selectedCompetitorUrls.length === 0
                            ? 'Skip & Generate Map'
                            : `Finalize & Generate Map (${selectedCompetitorUrls.length})`
                    )}
                </Button>
            </footer>
        </Card>
    );
};

export default CompetitorRefinementWizard;
