// components/PillarDefinitionWizard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../state/appState';
import { AppStep, CandidateEntity, SourceContextOption, SEOPillars, BusinessInfo } from '../types';
// FIX: Corrected import path for aiService to be a relative path.
import * as aiService from '../services/aiService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { CandidateCard } from './ui/CandidateCard';
import { Textarea } from './ui/Textarea';

type WizardSubStep = 'entity' | 'context' | 'intent' | 'confirmation';

interface PillarDefinitionWizardProps {
  onFinalize: (pillars: SEOPillars) => void;
  onBack: () => void;
}

const PillarDefinitionWizard: React.FC<PillarDefinitionWizardProps> = ({ onFinalize, onBack }) => {
    const { state, dispatch } = useAppState();
    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);

    // --- DATA FLOW FIX ---
    // Merge global settings (with API keys) and map-specific strategic data
    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => ({
        ...state.businessInfo,
        ...(activeMap?.business_info as Partial<BusinessInfo> || {})
    }), [state.businessInfo, activeMap]);
    // --- END FIX ---

    const [subStep, setSubStep] = useState<WizardSubStep>('entity');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [entityCandidates, setEntityCandidates] = useState<CandidateEntity[]>([]);
    const [contextOptions, setContextOptions] = useState<SourceContextOption[]>([]);
    
    const [pillars, setPillars] = useState<Partial<SEOPillars>>(activeMap?.pillars as Partial<SEOPillars> || {});

    const fetchEntityCandidates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const candidates = await aiService.suggestCentralEntityCandidates(effectiveBusinessInfo, dispatch);
            setEntityCandidates(candidates);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to get suggestions.');
        } finally {
            setIsLoading(false);
        }
    }, [effectiveBusinessInfo, dispatch]);

    const fetchContextOptions = useCallback(async (entity: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const options = await aiService.suggestSourceContextOptions(effectiveBusinessInfo, entity, dispatch);
            setContextOptions(options);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to get suggestions.');
        } finally {
            setIsLoading(false);
        }
    }, [effectiveBusinessInfo, dispatch]);

    const fetchSearchIntent = useCallback(async (entity: string, context: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const { intent } = await aiService.suggestCentralSearchIntent(effectiveBusinessInfo, entity, context, dispatch);
            setPillars(p => ({ ...p, centralSearchIntent: intent }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to get suggestions.');
        } finally {
            setIsLoading(false);
        }
    }, [effectiveBusinessInfo, dispatch]);
    
    useEffect(() => {
        if (subStep === 'entity' && entityCandidates.length === 0) {
            fetchEntityCandidates();
        }
    }, [subStep, entityCandidates, fetchEntityCandidates]);

    const handleSelectEntity = (entity: string) => {
        setPillars({ centralEntity: entity });
        setSubStep('context');
        fetchContextOptions(entity);
    };

    const handleSelectContext = (context: string) => {
        setPillars(p => ({ ...p, sourceContext: context }));
        setSubStep('intent');
        fetchSearchIntent(pillars.centralEntity!, context);
    };
    
    const handleStepBack = () => {
        switch (subStep) {
            case 'confirmation': setSubStep('intent'); break;
            case 'intent': setSubStep('context'); break;
            case 'context': setSubStep('entity'); break;
            case 'entity': onBack(); break;
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center h-64 items-center"><Loader /></div>;
        if (error) return <p className="text-red-400 bg-red-900/20 p-4 rounded-md">{error}</p>;

        switch (subStep) {
            case 'entity': return (
                <div>
                    <h2 className="text-xl font-bold mb-4">Step 2.1: Select Your Central Entity</h2>
                    <div className="space-y-3">{entityCandidates.map(c => <CandidateCard key={c.entity} title={c.entity} reasoning={c.reasoning} score={c.score} onSelect={() => handleSelectEntity(c.entity)} isSelected={false}/>)}</div>
                </div>
            );
            case 'context': return (
                 <div>
                    <h2 className="text-xl font-bold mb-4">Step 2.2: Select Your Source Context</h2>
                    <div className="space-y-3">{contextOptions.map(c => <CandidateCard key={c.context} title={c.context} reasoning={c.reasoning} score={c.score} onSelect={() => handleSelectContext(c.context)} isSelected={false}/>)}</div>
                </div>
            );
            case 'intent': return (
                 <div>
                    <h2 className="text-xl font-bold mb-4">Step 2.3: Define Central Search Intent</h2>
                    <Textarea value={pillars.centralSearchIntent || ''} onChange={e => setPillars(p => ({ ...p, centralSearchIntent: e.target.value }))} rows={4} />
                    <div className="mt-4 text-right"><Button onClick={() => setSubStep('confirmation')}>Confirm Intent</Button></div>
                </div>
            );
             case 'confirmation': return (
                 <div>
                    <h2 className="text-xl font-bold mb-4">Step 2.4: Confirm Your SEO Pillars</h2>
                    <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg">
                        <div><h4 className="font-semibold text-gray-400">Central Entity:</h4><p className="text-white">{pillars.centralEntity}</p></div>
                        <div><h4 className="font-semibold text-gray-400">Source Context:</h4><p className="text-white">{pillars.sourceContext}</p></div>
                        <div><h4 className="font-semibold text-gray-400">Central Search Intent:</h4><p className="text-white">{pillars.centralSearchIntent}</p></div>
                    </div>
                </div>
            );
        }
    };
    
    return (
        <Card className="max-w-3xl w-full">
            <div className="p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Define SEO Pillars</h1>
                    <p className="text-gray-400 mt-2">Establish the strategic foundation of your content.</p>
                </header>
                {renderContent()}
            </div>
             <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                <Button onClick={handleStepBack} variant="secondary">Back</Button>
                {subStep === 'confirmation' && <Button onClick={() => onFinalize(pillars as SEOPillars)}>Finalize & Discover EAVs</Button>}
            </footer>
        </Card>
    );
};

export default PillarDefinitionWizard;
