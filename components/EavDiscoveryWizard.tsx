
// components/EavDiscoveryWizard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, SemanticTriple, BusinessInfo } from '../types';
// FIX: Corrected import path for aiService to be a relative path.
import * as aiService from '../services/aiService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

interface EavDiscoveryWizardProps {
  onFinalize: (eavs: SemanticTriple[]) => void;
  onBack: () => void;
}

const EavDiscoveryWizard: React.FC<EavDiscoveryWizardProps> = ({ onFinalize, onBack }) => {
    const { state, dispatch } = useAppState();
    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    
    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => ({
        ...state.businessInfo,
        ...(activeMap?.business_info as Partial<BusinessInfo> || {})
    }), [state.businessInfo, activeMap]);

    // Correctly typed EAVs from state
    const [eavs, setEavs] = useState<SemanticTriple[]>(activeMap?.eavs || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const handleExpand = async () => {
        if (!activeMap || !activeMap.pillars) return;
        setIsLoading(true);
        setError(null);
        try {
            const newEavs = await aiService.expandSemanticTriples(effectiveBusinessInfo, activeMap.pillars, eavs, dispatch);
            setEavs(prev => [...prev, ...newEavs]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to expand semantic triples.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="max-w-3xl w-full">
            <div className="p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Discover Semantic Triples (E-A-Vs)</h1>
                    <p className="text-gray-400 mt-2">The AI has extracted the core facts about your Central Entity. Review and expand them.</p>
                </header>
                {isLoading && eavs.length === 0 && <div className="flex justify-center"><Loader /></div>}
                {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-md text-center">{error}</div>}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-4">
                    {eavs.map((triple, index) => (
                        <div key={index} className="p-3 bg-gray-900/50 rounded-lg flex items-center text-sm">
                            <span className="font-semibold text-white">{triple.subject.label}</span>
                            <span className="mx-2 text-gray-400">{triple.predicate.relation}</span>
                            <span className="italic text-blue-300">{String(triple.object.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
            <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                <Button onClick={onBack} variant="secondary">Back</Button>
                <div className="flex gap-4">
                    <Button onClick={handleExpand} variant="secondary" disabled={isLoading}>{isLoading ? 'Expanding...' : 'Expand with AI'}</Button>
                    <Button onClick={() => onFinalize(eavs)} disabled={eavs.length === 0}>Next: Refine Competitors</Button>
                </div>
            </footer>
        </Card>
    );
};

export default EavDiscoveryWizard;
