// components/brief/SectionEditor.tsx
// Editable section component with drag-and-drop handle and AI assist

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BriefSection, FormatCode, AttributeCategory, ContentZone, EnrichedTopic } from '../../types';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';

interface SectionEditorProps {
    section: BriefSection;
    index: number;
    allTopics: EnrichedTopic[];
    isRefining: boolean;
    onUpdate: (updates: Partial<BriefSection>) => void;
    onDelete: () => void;
    onAIRefine: (instruction: string) => void;
    onAddBelow: () => void;
}

const FORMAT_CODES: FormatCode[] = ['FS', 'PAA', 'LISTING', 'DEFINITIVE', 'TABLE', 'PROSE'];
const ATTRIBUTE_CATEGORIES: AttributeCategory[] = ['ROOT', 'UNIQUE', 'RARE', 'COMMON'];
const CONTENT_ZONES: ContentZone[] = ['MAIN', 'SUPPLEMENTARY'];
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

export const SectionEditor: React.FC<SectionEditorProps> = ({
    section,
    index,
    allTopics,
    isRefining,
    onUpdate,
    onDelete,
    onAIRefine,
    onAddBelow
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAIInput, setShowAIInput] = useState(false);
    const [aiInstruction, setAiInstruction] = useState('');
    const [editingAnchorIndex, setEditingAnchorIndex] = useState<number | null>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.key || `section-${index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleAISubmit = () => {
        if (aiInstruction.trim()) {
            onAIRefine(aiInstruction);
            setAiInstruction('');
            setShowAIInput(false);
        }
    };

    const handleAddAnchor = () => {
        const currentAnchors = section.anchor_texts || [];
        onUpdate({
            anchor_texts: [...currentAnchors, { phrase: '', target_topic_id: undefined }]
        });
        setEditingAnchorIndex(currentAnchors.length);
    };

    const handleUpdateAnchor = (anchorIndex: number, updates: Partial<{ phrase: string; target_topic_id?: string }>) => {
        const currentAnchors = section.anchor_texts || [];
        const newAnchors = currentAnchors.map((a, i) =>
            i === anchorIndex ? { ...a, ...updates } : a
        );
        onUpdate({ anchor_texts: newAnchors });
    };

    const handleDeleteAnchor = (anchorIndex: number) => {
        const currentAnchors = section.anchor_texts || [];
        onUpdate({
            anchor_texts: currentAnchors.filter((_, i) => i !== anchorIndex)
        });
    };

    const handleAddRequiredPhrase = () => {
        const current = section.required_phrases || [];
        onUpdate({ required_phrases: [...current, ''] });
    };

    const handleUpdateRequiredPhrase = (phraseIndex: number, value: string) => {
        const current = section.required_phrases || [];
        const updated = current.map((p, i) => i === phraseIndex ? value : p);
        onUpdate({ required_phrases: updated });
    };

    const handleDeleteRequiredPhrase = (phraseIndex: number) => {
        const current = section.required_phrases || [];
        onUpdate({ required_phrases: current.filter((_, i) => i !== phraseIndex) });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-slate-700/50 rounded-lg border border-slate-600 mb-3 ${
                isDragging ? 'ring-2 ring-emerald-400' : ''
            }`}
        >
            {/* Header - always visible */}
            <div className="flex items-center gap-2 p-3">
                {/* Drag handle */}
                <button
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-600 rounded"
                    {...attributes}
                    {...listeners}
                >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                </button>

                {/* Section heading */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">H{section.level}</span>
                        <span className="text-white font-medium">{section.heading || 'Untitled Section'}</span>
                        {section.format_code && (
                            <span className="text-xs bg-emerald-600/30 text-emerald-300 px-1.5 py-0.5 rounded">
                                {section.format_code}
                            </span>
                        )}
                        {section.attribute_category && (
                            <span className="text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded">
                                {section.attribute_category}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {isRefining && <SmartLoader context="generating" size="sm" showText={false} />}
                    <button
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                        onClick={() => setShowAIInput(!showAIInput)}
                        title="AI Assist"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </button>
                    <button
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title="Edit Details"
                    >
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-emerald-400"
                        onClick={onAddBelow}
                        title="Add Section Below"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <button
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400"
                        onClick={onDelete}
                        title="Delete Section"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* AI Input */}
            {showAIInput && (
                <div className="px-3 pb-3 border-t border-slate-600/50 pt-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={aiInstruction}
                            onChange={(e) => setAiInstruction(e.target.value)}
                            placeholder="Tell AI how to improve this section..."
                            className="flex-1 bg-slate-600 border border-slate-500 rounded px-3 py-1.5 text-white text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleAISubmit()}
                            disabled={isRefining}
                        />
                        <Button
                            variant="primary"
                            onClick={handleAISubmit}
                            disabled={!aiInstruction.trim() || isRefining}
                        >
                            {isRefining ? 'Working...' : 'Refine'}
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Examples: "Make more concise", "Add focus on benefits", "Include comparison table"
                    </p>
                </div>
            )}

            {/* Expanded editor */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-slate-600/50 pt-3">
                    {/* Basic fields row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Heading</label>
                            <input
                                type="text"
                                value={section.heading || ''}
                                onChange={(e) => onUpdate({ heading: e.target.value })}
                                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Level</label>
                            <select
                                value={section.level || 2}
                                onChange={(e) => onUpdate({ level: parseInt(e.target.value) })}
                                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                            >
                                {HEADING_LEVELS.map(l => (
                                    <option key={l} value={l}>H{l}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Format Code</label>
                            <select
                                value={section.format_code || ''}
                                onChange={(e) => onUpdate({ format_code: e.target.value as FormatCode || undefined })}
                                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                            >
                                <option value="">None</option>
                                {FORMAT_CODES.map(fc => (
                                    <option key={fc} value={fc}>{fc}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Attribute Category</label>
                            <select
                                value={section.attribute_category || ''}
                                onChange={(e) => onUpdate({ attribute_category: e.target.value as AttributeCategory || undefined })}
                                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                            >
                                <option value="">None</option>
                                {ATTRIBUTE_CATEGORIES.map(ac => (
                                    <option key={ac} value={ac}>{ac}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Content Zone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Content Zone</label>
                            <select
                                value={section.content_zone || ''}
                                onChange={(e) => onUpdate({ content_zone: e.target.value as ContentZone || undefined })}
                                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                            >
                                <option value="">Not set</option>
                                {CONTENT_ZONES.map(cz => (
                                    <option key={cz} value={cz}>{cz}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Query Priority</label>
                            <input
                                type="number"
                                value={section.query_priority || ''}
                                onChange={(e) => onUpdate({ query_priority: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                                placeholder="1-100"
                                min={1}
                                max={100}
                            />
                        </div>
                    </div>

                    {/* Text areas */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Subordinate Text Hint</label>
                        <textarea
                            value={section.subordinate_text_hint || ''}
                            onChange={(e) => onUpdate({ subordinate_text_hint: e.target.value })}
                            rows={2}
                            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                            placeholder="Instructions for the first sentence..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Methodology Note</label>
                        <textarea
                            value={section.methodology_note || ''}
                            onChange={(e) => onUpdate({ methodology_note: e.target.value })}
                            rows={2}
                            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                            placeholder="Formatting instructions for this section..."
                        />
                    </div>

                    {/* Required Phrases */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs text-slate-400">Required Phrases</label>
                            <button
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                                onClick={handleAddRequiredPhrase}
                            >
                                + Add
                            </button>
                        </div>
                        <div className="space-y-1">
                            {(section.required_phrases || []).map((phrase, i) => (
                                <div key={i} className="flex gap-1">
                                    <input
                                        type="text"
                                        value={phrase}
                                        onChange={(e) => handleUpdateRequiredPhrase(i, e.target.value)}
                                        className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                                        placeholder="Required phrase..."
                                    />
                                    <button
                                        className="p-1 text-slate-400 hover:text-red-400"
                                        onClick={() => handleDeleteRequiredPhrase(i)}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Anchor Texts */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs text-slate-400">Anchor Texts (Internal Links)</label>
                            <button
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                                onClick={handleAddAnchor}
                            >
                                + Add Link
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(section.anchor_texts || []).map((anchor, i) => (
                                <div key={i} className="flex gap-2 items-start bg-slate-600/50 p-2 rounded">
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="text"
                                            value={anchor.phrase}
                                            onChange={(e) => handleUpdateAnchor(i, { phrase: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                                            placeholder="Anchor text..."
                                        />
                                        <select
                                            value={anchor.target_topic_id || ''}
                                            onChange={(e) => handleUpdateAnchor(i, { target_topic_id: e.target.value || undefined })}
                                            className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                                        >
                                            <option value="">Select target topic...</option>
                                            {allTopics.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        className="p-1 text-slate-400 hover:text-red-400"
                                        onClick={() => handleDeleteAnchor(i)}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
