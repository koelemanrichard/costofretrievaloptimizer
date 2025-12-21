
// components/TopicExpansionModal.tsx
import React, { useState, useEffect, useCallback, useId } from 'react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { EnrichedTopic, ExpansionMode } from '../../types';
import { useAppState } from '../../state/appState';
import { Loader } from '../ui/Loader';
import { AIModelSelector } from '../ui/AIModelSelector';
import { Modal } from '../ui/Modal';

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
    const radioGroupId = useId();

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

    if (!activeExpansionTopic) return null;

    const customHeader = (
        <div className="flex-1">
            <h2 id={`${radioGroupId}-title`} className="text-xl font-bold text-white">Expand Topic</h2>
            <p className="text-sm text-gray-400">{activeExpansionTopic.title}</p>
        </div>
    );

    const footer = (
        <div className="flex flex-col gap-4 w-full">
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
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Expand Topic"
            description={`Expand the topic "${activeExpansionTopic.title}" using an AI-powered strategy`}
            maxWidth="max-w-lg"
            customHeader={customHeader}
            footer={footer}
            closeOnEscape={!isProcessing}
            closeOnBackdropClick={!isProcessing}
        >
            <div className="space-y-6">
                <div>
                    <Label id={`${radioGroupId}-label`} className="mb-3 block">Expansion Strategy</Label>
                    <div
                        className="space-y-3"
                        role="radiogroup"
                        aria-labelledby={`${radioGroupId}-label`}
                    >
                        {expansionModes.map(mode => (
                            <div
                                key={mode.id}
                                role="radio"
                                aria-checked={selectedMode === mode.id}
                                tabIndex={selectedMode === mode.id ? 0 : -1}
                                className={`p-3 rounded border cursor-pointer transition-all ${selectedMode === mode.id ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}
                                onClick={() => !isProcessing && setSelectedMode(mode.id)}
                                onKeyDown={(e) => {
                                    if (isProcessing) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedMode(mode.id);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`font-semibold ${selectedMode === mode.id ? 'text-blue-300' : 'text-gray-300'}`}>{mode.label}</span>
                                    {selectedMode === mode.id && <span className="text-blue-400 text-lg" aria-hidden="true">✓</span>}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{mode.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <Label htmlFor="user-context">Additional Instructions (Optional)</Label>
                    <p id="user-context-hint" className="text-xs text-gray-400 mb-2">Guide the AI with specific focus areas or constraints.</p>
                    <Textarea
                        id="user-context"
                        aria-describedby="user-context-hint"
                        value={userContext}
                        onChange={(e) => setUserContext(e.target.value)}
                        placeholder="e.g., Focus on enterprise pricing models only."
                        rows={3}
                        disabled={!!isProcessing}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default TopicExpansionModal;
