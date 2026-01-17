// components/brief/AddSectionModal.tsx
// Modal for adding a new section - manually or via AI generation

import React, { useState } from 'react';
import { BriefSection, FormatCode, AttributeCategory, ContentZone } from '../../types';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';

interface AddSectionModalProps {
    insertIndex: number;
    existingSections: BriefSection[];
    isGenerating: boolean;
    onAddManual: (section: BriefSection) => void;
    onAIGenerate: (instruction: string, parentHeading: string | null) => void;
    onCancel: () => void;
}

type TabType = 'manual' | 'ai';

const FORMAT_CODES: FormatCode[] = ['FS', 'PAA', 'LISTING', 'DEFINITIVE', 'TABLE', 'PROSE'];
const ATTRIBUTE_CATEGORIES: AttributeCategory[] = ['ROOT', 'UNIQUE', 'RARE', 'COMMON'];
const CONTENT_ZONES: ContentZone[] = ['MAIN', 'SUPPLEMENTARY'];

export const AddSectionModal: React.FC<AddSectionModalProps> = ({
    insertIndex,
    existingSections,
    isGenerating,
    onAddManual,
    onAIGenerate,
    onCancel
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('manual');

    // Manual form state
    const [heading, setHeading] = useState('');
    const [level, setLevel] = useState(2);
    const [formatCode, setFormatCode] = useState<FormatCode | ''>('');
    const [attributeCategory, setAttributeCategory] = useState<AttributeCategory | ''>('');
    const [contentZone, setContentZone] = useState<ContentZone | ''>('');
    const [subordinateTextHint, setSubordinateTextHint] = useState('');
    const [methodologyNote, setMethodologyNote] = useState('');

    // AI generation state
    const [aiInstruction, setAiInstruction] = useState('');
    const [parentHeading, setParentHeading] = useState<string | null>(null);

    // Determine nearby sections for context
    const previousSection = insertIndex > 0 ? existingSections[insertIndex - 1] : null;
    const nextSection = insertIndex < existingSections.length ? existingSections[insertIndex] : null;

    const handleManualAdd = () => {
        if (!heading.trim()) return;

        const newSection: BriefSection = {
            key: `section-${Date.now()}`,
            heading: heading.trim(),
            level,
            format_code: formatCode || undefined,
            attribute_category: attributeCategory || undefined,
            content_zone: contentZone || undefined,
            subordinate_text_hint: subordinateTextHint.trim() || undefined,
            methodology_note: methodologyNote.trim() || undefined,
        };

        onAddManual(newSection);
    };

    const handleAIGenerate = () => {
        if (!aiInstruction.trim()) return;
        onAIGenerate(aiInstruction.trim(), parentHeading);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4">
            <div
                className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700">
                    <h3 className="text-lg font-medium text-white">Add New Section</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Insert at position {insertIndex + 1}
                        {previousSection && (
                            <span> (after "{previousSection.heading}")</span>
                        )}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    <button
                        className={`px-4 py-2 text-sm font-medium ${
                            activeTab === 'manual'
                                ? 'text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        onClick={() => setActiveTab('manual')}
                    >
                        Manual
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium ${
                            activeTab === 'ai'
                                ? 'text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        onClick={() => setActiveTab('ai')}
                    >
                        AI Generate
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'manual' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Heading *</label>
                                <input
                                    type="text"
                                    value={heading}
                                    onChange={(e) => setHeading(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Section heading..."
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Level</label>
                                    <select
                                        value={level}
                                        onChange={(e) => setLevel(parseInt(e.target.value))}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(l => (
                                            <option key={l} value={l}>H{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Format Code</label>
                                    <select
                                        value={formatCode}
                                        onChange={(e) => setFormatCode(e.target.value as FormatCode | '')}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    >
                                        <option value="">None</option>
                                        {FORMAT_CODES.map(fc => (
                                            <option key={fc} value={fc}>{fc}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Attribute Category</label>
                                    <select
                                        value={attributeCategory}
                                        onChange={(e) => setAttributeCategory(e.target.value as AttributeCategory | '')}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    >
                                        <option value="">None</option>
                                        {ATTRIBUTE_CATEGORIES.map(ac => (
                                            <option key={ac} value={ac}>{ac}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Content Zone</label>
                                    <select
                                        value={contentZone}
                                        onChange={(e) => setContentZone(e.target.value as ContentZone | '')}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    >
                                        <option value="">Not set</option>
                                        {CONTENT_ZONES.map(cz => (
                                            <option key={cz} value={cz}>{cz}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Subordinate Text Hint</label>
                                <textarea
                                    value={subordinateTextHint}
                                    onChange={(e) => setSubordinateTextHint(e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Instructions for the first sentence..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Methodology Note</label>
                                <textarea
                                    value={methodologyNote}
                                    onChange={(e) => setMethodologyNote(e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Formatting instructions..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">
                                    What should this section cover?
                                </label>
                                <textarea
                                    value={aiInstruction}
                                    onChange={(e) => setAiInstruction(e.target.value)}
                                    rows={4}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Describe the section you want to add. For example: 'Add a section about common mistakes to avoid' or 'Create a comparison table for the main options'"
                                    autoFocus
                                />
                            </div>

                            {existingSections.length > 0 && (
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">
                                        Parent Section (optional)
                                    </label>
                                    <select
                                        value={parentHeading || ''}
                                        onChange={(e) => setParentHeading(e.target.value || null)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    >
                                        <option value="">No parent (top-level section)</option>
                                        {existingSections.map((s, i) => (
                                            <option key={s.key || i} value={s.heading}>
                                                {'  '.repeat(s.level - 1)}H{s.level}: {s.heading}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-400 mt-1">
                                        If selected, the new section will be contextually related to this parent.
                                    </p>
                                </div>
                            )}

                            {/* Context info */}
                            <div className="bg-slate-700/50 rounded p-3 text-xs text-slate-400">
                                <p className="font-medium text-slate-300 mb-1">Context:</p>
                                {previousSection && (
                                    <p>Previous section: "{previousSection.heading}"</p>
                                )}
                                {nextSection && (
                                    <p>Next section: "{nextSection.heading}"</p>
                                )}
                                <p className="mt-1">
                                    The AI will use the full brief context to generate a coherent section.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
                    <Button variant="secondary" onClick={onCancel} className="bg-transparent hover:bg-slate-700">
                        Cancel
                    </Button>
                    {activeTab === 'manual' ? (
                        <Button
                            variant="primary"
                            onClick={handleManualAdd}
                            disabled={!heading.trim()}
                        >
                            Add Section
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleAIGenerate}
                            disabled={!aiInstruction.trim() || isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <SmartLoader context="generating" size="sm" showText={false} />
                                    <span className="ml-2">Generating...</span>
                                </>
                            ) : (
                                'Generate Section'
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
