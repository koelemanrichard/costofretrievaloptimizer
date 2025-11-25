
// components/ResponseCodeSelectionModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { EnrichedTopic, ResponseCode, BusinessInfo } from '../types';
// FIX: Corrected import path for aiService to be a relative path.
import * as aiService from '../services/ai/index';
import { useAppState } from '../state/appState';
import { InfoTooltip } from './ui/InfoTooltip';
import { AIModelSelector } from './ui/AIModelSelector';

interface ResponseCodeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: EnrichedTopic;
  onGenerate: (topic: EnrichedTopic, responseCode: ResponseCode, overrideSettings?: { provider: string, model: string }) => void;
  businessInfo: BusinessInfo;
}

const responseCodeDescriptions: Record<ResponseCode, string> = {
    [ResponseCode.DEFINITION]: "Explains a concept, answers 'What is X?'. Best for foundational knowledge.",
    [ResponseCode.PROCESS]: "Provides step-by-step instructions. Ideal for 'How-To' guides and tutorials.",
    [ResponseCode.COMPARISON]: "Compares two or more items (e.g., 'X vs Y'). Used for reviews and product showdowns.",
    [ResponseCode.LIST]: "Presents a list of items (e.g., 'Top 10...'). Great for scannable content like listicles.",
    [ResponseCode.INFORMATIONAL]: "A general-purpose template for explaining a broad concept or providing an overview.",
    [ResponseCode.PRODUCT_SERVICE]: "Focuses on describing a specific product or service, its features, and benefits.",
    [ResponseCode.CAUSE_EFFECT]: "Explains why something happens and its consequences. Good for analytical content.",
    [ResponseCode.BENEFIT_ADVANTAGE]: "Focuses on the positive outcomes or advantages of a product, service, or concept.",
};

const ResponseCodeSelectionModal: React.FC<ResponseCodeSelectionModalProps> = ({ isOpen, onClose, topic, onGenerate, businessInfo }) => {
    const { state, dispatch } = useAppState();
    const { isLoading: globalIsLoading, briefGenerationStatus } = state;
    const [selectedCode, setSelectedCode] = useState<ResponseCode>(ResponseCode.INFORMATIONAL);
    const [isLoading, setIsLoading] = useState(true);
    const [suggestion, setSuggestion] = useState<{ code: ResponseCode; reasoning: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Dynamic Model Selection State
    const [overrideSettings, setOverrideSettings] = useState<{ provider: string, model: string } | null>(null);

    useEffect(() => {
        if (isOpen && topic && businessInfo) {
            const fetchSuggestion = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const result = await aiService.suggestResponseCode(businessInfo, topic.title, dispatch);
                    setSuggestion({ code: result.responseCode, reasoning: result.reasoning });
                    setSelectedCode(result.responseCode);
                } catch (err) {
                    console.error("Failed to suggest response code:", err);
                    setError("Could not get AI suggestion. Please select a code manually.");
                    setSelectedCode(ResponseCode.INFORMATIONAL);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchSuggestion();
        }
    }, [isOpen, topic, businessInfo, dispatch]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        // Pass the explicit topic object back up, not relying on global state.
        onGenerate(topic, selectedCode, overrideSettings || undefined);
    };

    const handleConfigChange = useCallback((provider: string | null, model: string | null) => {
        if (provider && model) {
            setOverrideSettings({ provider, model });
        } else {
            setOverrideSettings(null);
        }
    }, []);

    const isProcessing = globalIsLoading.briefs || !!briefGenerationStatus;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Select Content Framework</h2>
                        <p className="text-sm text-gray-400">For topic: {topic.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
                </header>

                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader /></div>
                    ) : (
                        <div className="space-y-6">
                            {suggestion && (
                                <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700">
                                    <h3 className="font-semibold text-blue-300">AI Suggestion: {suggestion.code}</h3>
                                    <p className="text-sm text-gray-400 italic mt-1">Reasoning: {suggestion.reasoning}</p>
                                </div>
                            )}
                            {error && <p className="text-red-400 mb-4">{error}</p>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.values(ResponseCode).map(code => (
                                    <Card 
                                        key={code}
                                        onClick={() => setSelectedCode(code)}
                                        className={`p-4 cursor-pointer border-2 transition-all ${selectedCode === code ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-gray-600'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold text-white">{code}</h4>
                                            <InfoTooltip text={responseCodeDescriptions[code]} />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-4 bg-gray-800 border-t border-gray-700">
                    <div className="flex flex-col gap-4">
                        <AIModelSelector 
                            currentConfig={businessInfo} 
                            onConfigChange={handleConfigChange} 
                            className="w-full"
                        />
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                                {isProcessing ? briefGenerationStatus : ''}
                            </div>
                            <div className='flex gap-2'>
                                <Button onClick={onClose} variant="secondary" disabled={isProcessing}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={isProcessing}>
                                    {isProcessing ? <Loader className="w-5 h-5" /> : 'Generate Brief'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </footer>
            </Card>
        </div>
    );
};

export default ResponseCodeSelectionModal;
