// components/brief/RegenerateBriefPanel.tsx
// Panel for regenerating the entire brief with user instructions

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import { BriefRegenerationProgress } from './BriefRegenerationProgress';
import { RegenerationProgress } from '../../hooks/useBriefEditor';

interface RegenerateBriefPanelProps {
    isRegenerating: boolean;
    regenerationProgress: RegenerationProgress | null;
    error: string | null;
    onRegenerate: (instruction: string) => void;
}

const HELPER_PROMPTS = [
    { label: 'More depth', text: 'Add more in-depth coverage of the main topic' },
    { label: 'Simpler structure', text: 'Simplify the structure with fewer sections' },
    { label: 'More practical', text: 'Focus more on practical, actionable advice' },
    { label: 'Add comparisons', text: 'Include more comparison sections' },
    { label: 'FAQ focus', text: 'Add more FAQ-style sections based on common questions' },
    { label: 'Technical depth', text: 'Add more technical details and specifications' },
];

export const RegenerateBriefPanel: React.FC<RegenerateBriefPanelProps> = ({
    isRegenerating,
    regenerationProgress,
    error,
    onRegenerate
}) => {
    const [instruction, setInstruction] = useState('');

    const handleSubmit = () => {
        if (instruction.trim()) {
            onRegenerate(instruction.trim());
        }
    };

    const handleHelperClick = (text: string) => {
        setInstruction(prev => prev ? `${prev}. ${text}` : text);
    };

    // Show progress UI when regenerating with multi-pass
    if (isRegenerating && regenerationProgress) {
        return (
            <div className="space-y-6">
                <BriefRegenerationProgress
                    progress={regenerationProgress}
                    error={error}
                />
                <div className="text-center text-sm text-slate-400">
                    Please wait while the brief is being regenerated...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Warning banner */}
            <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <h4 className="text-amber-400 font-medium">This will replace your entire brief</h4>
                        <p className="text-amber-200/70 text-sm mt-1">
                            The AI will regenerate all sections based on your instructions.
                            You'll be able to preview the changes before applying them.
                        </p>
                    </div>
                </div>
            </div>

            {/* Instruction input */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    What changes would you like to make?
                </label>
                <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                    placeholder="Describe the changes you want. For example: 'Focus more on beginner-friendly content' or 'Remove sections about advanced techniques and add more examples'"
                    disabled={isRegenerating}
                />
            </div>

            {/* Helper prompts */}
            <div>
                <p className="text-sm text-slate-400 mb-2">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                    {HELPER_PROMPTS.map((prompt, i) => (
                        <button
                            key={i}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                            onClick={() => handleHelperClick(prompt.text)}
                            disabled={isRegenerating}
                        >
                            {prompt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Context info */}
            <div className="bg-slate-700/30 rounded-lg p-4 text-sm text-slate-400">
                <h4 className="text-slate-300 font-medium mb-2">The AI will consider:</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Your business context and target audience</li>
                    <li>SEO pillars and topic relevance</li>
                    <li>Holistic SEO framework rules</li>
                    <li>Language and regional settings</li>
                    <li>Your existing content structure as a reference</li>
                </ul>
            </div>

            {/* Error display */}
            {error && !isRegenerating && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end">
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!instruction.trim() || isRegenerating}
                    className="min-w-[160px]"
                >
                    {isRegenerating ? (
                        <>
                            <SmartLoader context="generating" size="sm" showText={false} />
                            <span className="ml-2">Regenerating...</span>
                        </>
                    ) : (
                        'Regenerate Brief'
                    )}
                </Button>
            </div>
        </div>
    );
};
