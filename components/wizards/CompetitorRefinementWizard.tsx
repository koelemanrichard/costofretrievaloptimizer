
// components/wizards/CompetitorRefinementWizard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import { AppStep, SEOPillars, SemanticTriple, SerpResult, BusinessInfo } from '../../types';
import * as serpApiService from '../../services/serpApiService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';

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

    const fetchCompetitors = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        setIsLoading(true);
        setError(null);
        try {
            const results = await serpApiService.discoverInitialCompetitors(
                activeMap.pillars.centralEntity, 
                effectiveBusinessInfo, 
                dispatch
            );
            setCompetitors(results);
            if(selectedCompetitorUrls.length === 0) {
              setSelectedCompetitorUrls(results.slice(0, 5).map(r => r.link)); // Pre-select top 5 if none selected
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to discover competitors.');
        } finally {
            setIsLoading(false);
        }
    }, [activeMap, effectiveBusinessInfo, dispatch, selectedCompetitorUrls.length]);

    useEffect(() => {
        fetchCompetitors();
    }, [fetchCompetitors]);

    const handleToggleCompetitor = (url: string) => {
        setSelectedCompetitorUrls(prev => 
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
    };

    return (
        <Card className="max-w-3xl w-full">
            <div className="p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Refine Competitors</h1>
                    <p className="text-gray-400 mt-2">Select relevant competitors to inform map generation.</p>
                </header>
                {isLoading && <div className="flex justify-center"><Loader /></div>}
                {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-md text-center">{error}</div>}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-4">
                    {/* Deduplicate competitors by URL to avoid duplicate keys */}
                    {competitors
                        .filter((c, index, self) => self.findIndex(x => x.link === c.link) === index)
                        .map((c, index) => (
                        <div key={`${c.link}-${index}`} className={`p-3 rounded-lg flex items-start gap-3 cursor-pointer border ${selectedCompetitorUrls.includes(c.link) ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-900/50 border-gray-700'}`} onClick={() => handleToggleCompetitor(c.link)}>
                            <input type="checkbox" checked={selectedCompetitorUrls.includes(c.link)} readOnly className="mt-1 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-white">{c.title}</p>
                                <p className="text-xs text-green-400 font-mono break-all">{c.link}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                <Button onClick={onBack} variant="secondary">Back</Button>
                <Button onClick={() => onFinalize(selectedCompetitorUrls)} disabled={isLoading || selectedCompetitorUrls.length === 0}>
                    {state.isLoading.map ? <Loader /> : `Finalize & Generate Map`}
                </Button>
            </footer>
        </Card>
    );
};

export default CompetitorRefinementWizard;
