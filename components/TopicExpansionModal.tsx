
// components/TopicExpansionModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { EnrichedTopic, ExpansionMode } from '../types';
import { useAppState } from '../state/appState';
import { Loader } from './ui/Loader';
import { AIModelSelector } from './ui/AIModelSelector';

interface TopicExpansionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpand: (topic: EnrichedTopic, mode: ExpansionMode, context?: string, overrideSettings?: { provider: string, model: string }) => void;
}

const expansionModes: { id: ExpansionMode; label: string; description: string }[] = [
    { 
        id: 'ATTRIBUTE', 
        label: 'Deep Dive (Attributes)', 
        description: 'Explore specific features, specifications, components, and technical details.' 
    },
    { 
        id: 'ENTITY', 
        label: 'Compare (Entities)', 
        description: 'Find competitors, alternatives, and related solutions for comparison.' 
    },
    { 
        id: 'CONTEXT', 
        label: 'Background (Context)', 
        description: 'Cover history, trends, future outlook, and broader industry context.' 
    }
];

const TopicExpansionModal: React.FC<TopicExpansionModalProps> = ({ isOpen, onClose, onExpand }) => {
    const { state } = useAppState();
    const { activeExpansionTopic, activeExpansionMode, isLoading, businessInfo } = state;
    
    const [selectedMode, setSelectedMode] = useState<ExpansionMode>('CONTEXT');
    const [userContext, setUserContext] = useState('');
    
    // Dynamic Model Selection State
    const [overrideSettings, setOverrideSettings] = useState<{ provider: string, model: string } | null>(null);

    useEffect(() => {
        if (isOpen && activeExpansionMode) {
            setSelectedMode(activeExpansionMode);
        }
        if (isOpen) {
            setUserContext('');
        }
    }, [isOpen, activeExpansionMode]);

    const handleExpand = () => {
        if (activeExpansionTopic) {
            onExpand(activeExpansionTopic, selectedMode, userContext, overrideSettings || undefined);
        }
    };

    const handleConfigChange = useCallback((provider: string | null, model: string | null) => {
        if (provider && model) {
            setOverrideSettings({ provider, model });
        } else {
            setOverrideSettings(null);
        }
    }, []);

    const isProcessing = activeExpansionTopic && isLoading[`expand_${activeExpansionTopic.id}`];

    if (!isOpen || !activeExpansionTopic) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Expand Topic</h2>
                        <p className="text-sm text-gray-400">{activeExpansionTopic.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={!!isProcessing}>&times;</button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    <div>
                        <Label className="mb-3 block">Expansion Strategy</Label>
                        <div className="space-y-3">
                            {expansionModes.map(mode => (
                                <div 
                                    key={mode.id}
                                    className={`p-3 rounded border cursor-pointer transition-all ${selectedMode === mode.id ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}
                                    onClick={() => !isProcessing && setSelectedMode(mode.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`font-semibold ${selectedMode === mode.id ? 'text-blue-300' : 'text-gray-300'}`}>{mode.label}</span>
                                        {selectedMode === mode.id && <span className="text-blue-400 text-lg">✓</span>}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{mode.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="user-context">Additional Instructions (Optional)</Label>
                        <p className="text-xs text-gray-400 mb-2">Guide the AI with specific focus areas or constraints.</p>
                        <Textarea 
                            id="user-context"
                            value={userContext}
                            onChange={(e) => setUserContext(e.target.value)}
                            placeholder="e.g., Focus on enterprise pricing models only."
                            rows={3}
                            disabled={!!isProcessing}
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-800 border-t border-gray-700">
                    <div className="flex flex-col gap-4">
                        <AIModelSelector 
                            currentConfig={businessInfo} 
                            onConfigChange={handleConfigChange} 
                        />
                        <div className="flex justify-end gap-4">
                            <Button variant="secondary" onClick={onClose} disabled={!!isProcessing}>Cancel</Button>
                            <Button onClick={handleExpand} disabled={!!isProcessing}>
                                {isProcessing ? <div className="flex items-center gap-2"><Loader className="w-4 h-4" /> <span>Expanding...</span></div> : 'Expand Topic'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default TopicExpansionModal;
