// components/brief/BriefEditModal.tsx
// Main modal for editing content briefs with drag-and-drop section reordering

import React, { useState, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { ContentBrief, BriefSection, EnrichedTopic, SEOPillars, BusinessInfo } from '../../types';
import { useBriefEditor } from '../../hooks/useBriefEditor';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import { SectionEditor } from './SectionEditor';
import { AIPreviewModal } from './AIPreviewModal';
import { AddSectionModal } from './AddSectionModal';
import { RegenerateBriefPanel } from './RegenerateBriefPanel';
import { BriefHealthOverview } from './BriefHealthOverview';

interface BriefEditModalProps {
    isOpen: boolean;
    brief: ContentBrief;
    topic: EnrichedTopic;
    pillars: SEOPillars;
    allTopics: EnrichedTopic[];
    mapId: string;
    businessInfo?: BusinessInfo;
    onClose: () => void;
    onSaved?: () => void;
    onRepairMissing?: (missingFields: string[]) => Promise<void>;
    isRepairing?: boolean;
}

type TabType = 'sections' | 'meta' | 'strategy' | 'regenerate';

export const BriefEditModal: React.FC<BriefEditModalProps> = ({
    isOpen,
    brief,
    topic,
    pillars,
    allTopics,
    mapId,
    businessInfo,
    onClose,
    onSaved,
    onRepairMissing,
    isRepairing = false
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('sections');
    const [showAddSection, setShowAddSection] = useState<{ index: number } | null>(null);
    const [aiPreview, setAiPreview] = useState<{
        type: 'refine' | 'generate' | 'regenerate';
        index?: number;
        original?: BriefSection | ContentBrief;
        preview: BriefSection | ContentBrief;
    } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const {
        editedBrief,
        hasUnsavedChanges,
        isSaving,
        isRegenerating,
        isRefiningSection,
        isGeneratingSection,
        error,
        regenerationProgress,
        updateSection,
        deleteSection,
        addSection,
        reorderSections,
        aiRefineSection,
        aiGenerateSection,
        updateBriefField,
        regenerateBrief,
        saveToDB,
        discardChanges,
        setEditedBrief,
        initializeBrief,
        clearError
    } = useBriefEditor(brief, mapId, brief.topic_id);

    // Initialize edited brief when modal opens (use initializeBrief to sync original)
    React.useEffect(() => {
        if (isOpen && brief) {
            initializeBrief(brief);
        }
    }, [isOpen, brief, initializeBrief]);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end for section reordering
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id && editedBrief?.structured_outline) {
            const oldIndex = editedBrief.structured_outline.findIndex(s => s.key === active.id);
            const newIndex = editedBrief.structured_outline.findIndex(s => s.key === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newSections = arrayMove(editedBrief.structured_outline, oldIndex, newIndex);
                reorderSections(newSections);
            }
        }
    }, [editedBrief, reorderSections]);

    // Handle AI section refinement
    const handleAIRefine = useCallback(async (index: number, instruction: string) => {
        const refined = await aiRefineSection(index, instruction);
        if (refined && editedBrief?.structured_outline) {
            setAiPreview({
                type: 'refine',
                index,
                original: editedBrief.structured_outline[index],
                preview: refined
            });
        }
    }, [aiRefineSection, editedBrief]);

    // Handle AI section generation
    const handleAIGenerate = useCallback(async (index: number, instruction: string, parentHeading: string | null) => {
        const generated = await aiGenerateSection(index, instruction, parentHeading);
        if (generated) {
            setAiPreview({
                type: 'generate',
                index,
                preview: generated
            });
        }
    }, [aiGenerateSection]);

    // Handle AI brief regeneration
    const handleRegenerate = useCallback(async (instruction: string) => {
        const regenerated = await regenerateBrief(instruction, topic, pillars, allTopics);
        if (regenerated && editedBrief) {
            setAiPreview({
                type: 'regenerate',
                original: editedBrief,
                preview: regenerated
            });
        }
    }, [regenerateBrief, topic, pillars, allTopics, editedBrief]);

    // Apply AI preview
    const handleApplyPreview = useCallback(() => {
        if (!aiPreview || !editedBrief) return;

        if (aiPreview.type === 'refine' && aiPreview.index !== undefined) {
            updateSection(aiPreview.index, aiPreview.preview as BriefSection);
        } else if (aiPreview.type === 'generate' && aiPreview.index !== undefined) {
            addSection(aiPreview.index, aiPreview.preview as BriefSection);
        } else if (aiPreview.type === 'regenerate') {
            setEditedBrief(aiPreview.preview as ContentBrief);
        }

        setAiPreview(null);
    }, [aiPreview, editedBrief, updateSection, addSection, setEditedBrief]);

    // Handle save
    const handleSave = useCallback(async () => {
        const success = await saveToDB();
        if (success) {
            onSaved?.();
        }
    }, [saveToDB, onSaved]);

    // Handle close with unsaved changes check
    const handleClose = useCallback(() => {
        if (hasUnsavedChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                discardChanges();
                onClose();
            }
        } else {
            onClose();
        }
    }, [hasUnsavedChanges, discardChanges, onClose]);

    // Handle section delete
    const handleDeleteSection = useCallback((index: number) => {
        deleteSection(index);
        setConfirmDelete(null);
    }, [deleteSection]);

    if (!isOpen || !editedBrief) return null;

    const sections = editedBrief.structured_outline || [];
    const sectionIds = sections.map(s => s.key || `section-${sections.indexOf(s)}`);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div
                className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Edit Content Brief</h2>
                        <p className="text-sm text-slate-400">{editedBrief.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasUnsavedChanges && (
                            <span className="text-xs text-amber-400">Unsaved changes</span>
                        )}
                        <Button variant="secondary" onClick={handleClose} className="bg-transparent hover:bg-slate-700">
                            Close
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    {(['sections', 'meta', 'strategy', 'regenerate'] as TabType[]).map(tab => (
                        <button
                            key={tab}
                            className={`px-4 py-2 text-sm font-medium capitalize ${
                                activeTab === tab
                                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            onClick={() => {
                                setActiveTab(tab);
                                clearError(); // Clear errors when switching tabs
                            }}
                        >
                            {tab === 'regenerate' ? 'Regenerate Brief' : tab}
                        </button>
                    ))}
                </div>

                {/* Error display */}
                {error && (
                    <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Brief Health Overview - Always visible at top */}
                    {editedBrief && (
                        <div className="mb-6">
                            <BriefHealthOverview
                                brief={editedBrief}
                                onRepairMissing={onRepairMissing}
                                onRegenerateBrief={() => setActiveTab('regenerate')}
                                isRepairing={isRepairing}
                                isRegenerating={isRegenerating}
                            />
                        </div>
                    )}

                    {activeTab === 'sections' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-white">
                                    Sections ({sections.length})
                                </h3>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowAddSection({ index: 0 })}
                                >
                                    + Add Section at Start
                                </Button>
                            </div>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={sectionIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {sections.map((section, index) => (
                                        <div key={section.key || `section-${index}`} className="relative">
                                            <SectionEditor
                                                section={section}
                                                index={index}
                                                allTopics={allTopics}
                                                isRefining={isRefiningSection === index}
                                                onUpdate={(updates) => updateSection(index, updates)}
                                                onDelete={() => setConfirmDelete(index)}
                                                onAIRefine={(instruction) => handleAIRefine(index, instruction)}
                                                onAddBelow={() => setShowAddSection({ index: index + 1 })}
                                            />

                                            {/* Delete confirmation */}
                                            {confirmDelete === index && (
                                                <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center rounded-lg">
                                                    <div className="text-center">
                                                        <p className="text-white mb-4">Delete this section?</p>
                                                        <div className="flex gap-2 justify-center">
                                                            <Button
                                                                variant="primary"
                                                                onClick={() => handleDeleteSection(index)}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                Delete
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                onClick={() => setConfirmDelete(null)}
                                                                className="bg-transparent hover:bg-slate-700"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </SortableContext>
                            </DndContext>

                            {sections.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p>No sections yet.</p>
                                    <Button
                                        variant="secondary"
                                        className="mt-4"
                                        onClick={() => setShowAddSection({ index: 0 })}
                                    >
                                        Add First Section
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'meta' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editedBrief.title || ''}
                                    onChange={(e) => updateBriefField('title', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Meta Description
                                </label>
                                <textarea
                                    value={editedBrief.metaDescription || ''}
                                    onChange={(e) => updateBriefField('metaDescription', e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    {(editedBrief.metaDescription || '').length}/160 characters
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Query Type Format
                                </label>
                                <input
                                    type="text"
                                    value={editedBrief.query_type_format || ''}
                                    onChange={(e) => updateBriefField('query_type_format', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="e.g., informational, transactional"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Key Takeaways
                                </label>
                                <textarea
                                    value={(editedBrief.keyTakeaways || []).join('\n')}
                                    onChange={(e) => updateBriefField('keyTakeaways', e.target.value.split('\n').filter(Boolean))}
                                    rows={4}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="One takeaway per line"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'strategy' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Methodology Note
                                </label>
                                <textarea
                                    value={editedBrief.methodology_note || ''}
                                    onChange={(e) => updateBriefField('methodology_note', e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Overall methodology and approach notes"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Predicted User Journey
                                </label>
                                <textarea
                                    value={editedBrief.predicted_user_journey || ''}
                                    onChange={(e) => updateBriefField('predicted_user_journey', e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Expected reader journey through the content"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Featured Snippet Target
                                </label>
                                <textarea
                                    value={
                                        editedBrief.featured_snippet_target
                                            ? JSON.stringify(editedBrief.featured_snippet_target, null, 2)
                                            : ''
                                    }
                                    onChange={(e) => {
                                        try {
                                            const parsed = JSON.parse(e.target.value);
                                            updateBriefField('featured_snippet_target', parsed);
                                        } catch {
                                            // Allow invalid JSON while typing
                                        }
                                    }}
                                    rows={4}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                                    placeholder='{"type": "paragraph", "query": "..."}'
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'regenerate' && (
                        <RegenerateBriefPanel
                            isRegenerating={isRegenerating}
                            regenerationProgress={regenerationProgress}
                            error={error}
                            onRegenerate={handleRegenerate}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-700">
                    <div>
                        {hasUnsavedChanges && (
                            <Button variant="secondary" onClick={discardChanges} className="bg-transparent hover:bg-slate-700">
                                Discard Changes
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleClose} className="bg-transparent hover:bg-slate-700">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                        >
                            {isSaving ? (
                                <>
                                    <SmartLoader context="saving" size="sm" showText={false} />
                                    <span className="ml-2">Saving...</span>
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* AI Preview Modal */}
            {aiPreview && (
                <AIPreviewModal
                    type={aiPreview.type}
                    original={aiPreview.original}
                    preview={aiPreview.preview}
                    onApply={handleApplyPreview}
                    onCancel={() => setAiPreview(null)}
                />
            )}

            {/* Add Section Modal */}
            {showAddSection && (
                <AddSectionModal
                    insertIndex={showAddSection.index}
                    existingSections={sections}
                    isGenerating={isGeneratingSection !== null}
                    onAddManual={(section) => {
                        addSection(showAddSection.index, section);
                        setShowAddSection(null);
                    }}
                    onAIGenerate={(instruction, parentHeading) => {
                        handleAIGenerate(showAddSection.index, instruction, parentHeading);
                        setShowAddSection(null);
                    }}
                    onCancel={() => setShowAddSection(null)}
                />
            )}
        </div>
    );
};
