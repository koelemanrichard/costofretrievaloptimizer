
// components/EavDiscoveryWizard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, SemanticTriple, BusinessInfo } from '../types';
// FIX: Corrected import path for aiService to be a relative path.
import * as aiService from '../services/aiService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { EavCompletenessCard, EavCompletenessBadge } from './eav/EavCompletenessCard';
import { EavCategoryChartInline } from './eav/EavCategoryChart';
import { calculateEavCompleteness, meetsMinimumRequirements } from '../utils/eavAnalytics';

interface EavDiscoveryWizardProps {
  onFinalize: (eavs: SemanticTriple[]) => void;
  onBack: () => void;
}

const EavDiscoveryWizard: React.FC<EavDiscoveryWizardProps> = ({ onFinalize, onBack }) => {
    const { state, dispatch } = useAppState();
    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);

    // Build effective business info with project domain fallback
    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
        const mapBusinessInfo = activeMap?.business_info as Partial<BusinessInfo> || {};
        return {
            ...state.businessInfo,
            domain: mapBusinessInfo.domain || activeProject?.domain || state.businessInfo.domain,
            projectName: mapBusinessInfo.projectName || activeProject?.project_name || state.businessInfo.projectName,
            ...mapBusinessInfo,
            ...(mapBusinessInfo.domain ? {} : { domain: activeProject?.domain || state.businessInfo.domain }),
        };
    }, [state.businessInfo, activeMap, activeProject]);

    // Correctly typed EAVs from state
    const [eavs, setEavs] = useState<SemanticTriple[]>(activeMap?.eavs || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expansionCount, setExpansionCount] = useState<number>(15);
    const [showExpansionConfig, setShowExpansionConfig] = useState(false);

    const fetchInitialEavs = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        setIsLoading(true);
        setError(null);
        try {
            const initialEavs = await aiService.discoverCoreSemanticTriples(effectiveBusinessInfo, activeMap.pillars, dispatch);
            setEavs(initialEavs);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to discover semantic triples.');
        } finally {
            setIsLoading(false);
        }
    }, [activeMap, effectiveBusinessInfo, dispatch]);

    useEffect(() => {
        if (activeMap && (!activeMap.eavs || activeMap.eavs.length === 0)) {
            fetchInitialEavs();
        }
    }, [activeMap, fetchInitialEavs]);

    const handleExpand = async (count?: number) => {
        if (!activeMap || !activeMap.pillars) return;
        setIsLoading(true);
        setError(null);
        setShowExpansionConfig(false);
        try {
            const targetCount = count ?? expansionCount;
            const newEavs = await aiService.expandSemanticTriples(effectiveBusinessInfo, activeMap.pillars, eavs, dispatch, targetCount);
            setEavs(prev => [...prev, ...newEavs]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to expand semantic triples.');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate completeness for display
    const completeness = useMemo(() => calculateEavCompleteness(eavs), [eavs]);
    const isComplete = meetsMinimumRequirements(eavs);

    return (
        <Card className="max-w-4xl w-full">
            <div className="p-8">
                <header className="mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Discover Semantic Triples (E-A-Vs)</h1>
                            <p className="text-gray-400 mt-2">The AI has extracted the core facts about your Central Entity. Review and expand them.</p>
                        </div>
                        {eavs.length > 0 && <EavCompletenessBadge eavs={eavs} showLabel />}
                    </div>
                </header>

                {/* Completeness Analysis Card */}
                {eavs.length > 0 && (
                    <div className="mb-6">
                        <EavCompletenessCard
                            eavs={eavs}
                            entityType={activeMap?.pillars?.centralEntity}
                            showChart={true}
                            showRecommendations={true}
                            className="bg-gray-800/50 border-gray-700"
                        />
                    </div>
                )}

                {isLoading && eavs.length === 0 && <div className="flex justify-center py-8"><Loader /></div>}
                {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-md text-center mb-4">{error}</div>}

                {/* EAV List */}
                {eavs.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-300">Semantic Triples ({eavs.length})</h3>
                            <EavCategoryChartInline eavs={eavs} />
                        </div>
                        {eavs.map((triple, index) => (
                            <div key={index} className="p-3 bg-gray-900/50 rounded-lg flex items-center text-sm group hover:bg-gray-900/70 transition-colors">
                                <span className="font-semibold text-white">{triple.subject.label}</span>
                                <span className="mx-2 text-gray-400">{triple.predicate.relation}</span>
                                <span className="italic text-blue-300">{String(triple.object.value)}</span>
                                {triple.predicate.category && (
                                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                        {triple.predicate.category}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Completeness warning */}
                {eavs.length > 0 && !isComplete && (
                    <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-md">
                        <p className="text-sm text-amber-200">
                            <strong>Tip:</strong> Your EAV coverage is incomplete. Click "Expand with AI" to add more semantic triples
                            for better topical authority.
                        </p>
                    </div>
                )}
            </div>
            <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                <Button onClick={onBack} variant="secondary">Back</Button>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                        Score: {completeness.overall}%
                    </span>
                    <div className="relative">
                        <div className="flex items-center gap-1">
                            <Button onClick={() => handleExpand()} variant="secondary" disabled={isLoading}>
                                {isLoading ? 'Expanding...' : `Expand +${expansionCount}`}
                            </Button>
                            <button
                                onClick={() => setShowExpansionConfig(!showExpansionConfig)}
                                disabled={isLoading}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                                title="Configure expansion count"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        </div>
                        {showExpansionConfig && (
                            <div className="absolute bottom-full right-0 mb-2 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                                <label className="block text-xs text-gray-400 mb-2">Number of EAVs to generate:</label>
                                <input
                                    type="number"
                                    value={expansionCount}
                                    onChange={(e) => setExpansionCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 15)))}
                                    min={1}
                                    max={500}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {[15, 50, 100, 200].map(preset => (
                                        <button
                                            key={preset}
                                            onClick={() => setExpansionCount(preset)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${expansionCount === preset ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Larger counts may take longer and use more API tokens.
                                </p>
                            </div>
                        )}
                    </div>
                    <Button onClick={() => onFinalize(eavs)} disabled={eavs.length === 0}>
                        Next: Refine Competitors
                    </Button>
                </div>
            </footer>
        </Card>
    );
};

export default EavDiscoveryWizard;
