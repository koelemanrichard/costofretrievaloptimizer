
// components/BriefReviewModal.tsx
import React, { useState } from 'react';
import { useAppState } from '../state/appState';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { safeString } from '../utils/parsers';
import { getSupabaseClient } from '../services/supabaseClient';
import { Loader } from './ui/Loader';
import { BriefSection, ContextualBridgeLink } from '../types';

interface BriefReviewModalProps {
  isOpen: boolean;
}

const BriefReviewModal: React.FC<BriefReviewModalProps> = ({ isOpen }) => {
    const { state, dispatch } = useAppState();
    const { briefGenerationResult: brief, activeMapId, businessInfo } = state;
    const [isSaving, setIsSaving] = useState(false);

    const handleClose = () => {
        if (isSaving) return;
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'briefReview', visible: false } });
        dispatch({ type: 'SET_BRIEF_GENERATION_RESULT', payload: null });
    };

    const handleSave = async () => {
        if (!brief || !activeMapId) return;

        setIsSaving(true);
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Ensure key takeaways are safe for JSONB storage
            const sanitizedTakeaways = Array.isArray(brief.keyTakeaways) 
                ? brief.keyTakeaways.map(k => typeof k === 'string' ? k : JSON.stringify(k))
                : [];

            // Upsert the brief to the database
            // We use upsert to handle cases where a brief might already exist for this topic
            const { error } = await supabase.from('content_briefs').upsert({
                id: brief.id, // Ensure we use the ID generated during creation
                topic_id: brief.topic_id,
                user_id: state.user?.id, // Enforce user ownership
                title: brief.title,
                meta_description: brief.metaDescription,
                key_takeaways: sanitizedTakeaways as any,
                outline: brief.outline,
                serp_analysis: brief.serpAnalysis as any,
                visuals: brief.visuals as any,
                contextual_vectors: brief.contextualVectors as any,
                contextual_bridge: brief.contextualBridge as any,
                
                // New Holistic SEO Fields persistence
                perspectives: brief.perspectives as any,
                methodology_note: brief.methodology_note,
                structured_outline: brief.structured_outline as any,
                structural_template_hash: brief.structural_template_hash,
                predicted_user_journey: brief.predicted_user_journey,
                
                // New Fields
                query_type_format: brief.query_type_format,
                featured_snippet_target: brief.featured_snippet_target as any,
                visual_semantics: brief.visual_semantics as any,
                discourse_anchors: brief.discourse_anchors as any,

                created_at: new Date().toISOString()
            }, { onConflict: 'topic_id' });

            if (error) throw error;

            // Update local state
            // We reconstruct the object to ensure the state matches exactly what we just saved
            const savedBrief = {
                ...brief,
                keyTakeaways: sanitizedTakeaways
            };

            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: savedBrief } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Brief for "${brief.title}" saved successfully.` });
            
            // Close modal
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'briefReview', visible: false } });
            dispatch({ type: 'SET_BRIEF_GENERATION_RESULT', payload: null });

        } catch (error) {
            console.error("Failed to save brief:", error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : "Failed to save brief to database." });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isOpen || !brief) {
        return null;
    }

    // Helper to safely extract links whether bridge is array or section object
    const bridgeLinks: ContextualBridgeLink[] = Array.isArray(brief.contextualBridge) 
        ? brief.contextualBridge 
        : brief.contextualBridge?.links || [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={handleClose}>
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Review Generated Brief</h2>
                        <p className="text-sm text-gray-400">{safeString(brief.title) || 'Untitled Topic'}</p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 text-2xl leading-none hover:text-white" disabled={isSaving}>&times;</button>
                </header>
                
                <div className="p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {brief.predicted_user_journey && (
                            <Card className="p-4 bg-purple-900/20 border border-purple-600">
                                <h3 className="font-semibold text-lg text-purple-300 mb-2">Predicted User Journey (Uncertain Inference)</h3>
                                <p className="text-purple-100 italic">{safeString(brief.predicted_user_journey)}</p>
                            </Card>
                        )}

                        <Card className="p-4 bg-gray-900/50">
                            <h3 className="font-semibold text-lg text-blue-300 mb-2">Meta Information</h3>
                            <p><strong>Meta Description:</strong> {safeString(brief.metaDescription) || 'No description available.'}</p>
                            <p><strong>Slug:</strong> <span className="font-mono text-green-400">/{safeString(brief.slug)}</span></p>
                        </Card>

                        {/* Search & Retrieval Strategy (Holistic SEO) */}
                        {(brief.featured_snippet_target || brief.query_type_format || (brief.discourse_anchors && brief.discourse_anchors.length > 0)) && (
                            <Card className="p-4 bg-indigo-900/20 border border-indigo-700/50">
                                <h3 className="font-semibold text-lg text-indigo-300 mb-3">Search & Retrieval Strategy</h3>
                                
                                {brief.query_type_format && (
                                    <div className="mb-3">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Target Query Format:</span>
                                        <span className="ml-2 text-white text-sm font-mono bg-black/30 px-2 py-1 rounded">{safeString(brief.query_type_format)}</span>
                                    </div>
                                )}

                                {brief.featured_snippet_target && (
                                    <div className="mb-3 p-3 bg-black/20 rounded border border-indigo-500/30">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-indigo-400 text-xs font-bold uppercase">Featured Snippet Target</span>
                                            <span className="text-xs text-gray-500">{safeString(brief.featured_snippet_target.target_type)} | &lt; {brief.featured_snippet_target.answer_target_length} words</span>
                                        </div>
                                        <p className="text-white font-medium mb-1">"{safeString(brief.featured_snippet_target.question)}"</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {brief.featured_snippet_target.required_predicates.map((pred, i) => (
                                                <span key={i} className="text-[10px] bg-indigo-600/40 text-indigo-200 px-1.5 py-0.5 rounded">
                                                    Must use: "{safeString(pred)}"
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {brief.discourse_anchors && brief.discourse_anchors.length > 0 && (
                                    <div>
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Discourse Anchors (Transitions)</span>
                                        <div className="flex flex-wrap gap-2">
                                            {brief.discourse_anchors.map((anchor, i) => (
                                                <span key={i} className="text-xs text-gray-300 italic bg-gray-800 px-2 py-1 rounded border border-gray-700">
                                                    "{safeString(anchor)}"
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Strategic Context */}
                        {((brief.perspectives && brief.perspectives.length > 0) || brief.methodology_note) && (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Strategic Context</h3>
                                {brief.methodology_note && (
                                    <div className="mb-3">
                                        <span className="text-gray-400 text-sm font-bold block mb-1">Methodology:</span>
                                        <span className="text-gray-300 text-sm">{safeString(brief.methodology_note)}</span>
                                    </div>
                                )}
                                {brief.perspectives && brief.perspectives.length > 0 && (
                                    <div>
                                        <span className="text-gray-400 text-sm font-bold block mb-1">Perspectives:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {brief.perspectives.map((p, i) => (
                                                <span key={i} className="text-xs bg-purple-900/40 text-purple-200 px-2 py-1 rounded border border-purple-800/50">
                                                    {safeString(p)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Detailed Section Guidance (New) */}
                        {brief.structured_outline && brief.structured_outline.length > 0 ? (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-4">Detailed Section Guidance</h3>
                                <div className="space-y-4">
                                    {brief.structured_outline.map((section: BriefSection, idx) => (
                                        <div key={idx} className={`border-l-2 border-gray-700 pl-3 ${section.level > 2 ? 'ml-4' : ''}`}>
                                            <h4 className={`text-white font-medium ${section.level === 2 ? 'text-base' : 'text-sm'}`}>
                                                {safeString(section.heading)}
                                            </h4>
                                            {section.subordinate_text_hint && (
                                                <p className="text-xs text-gray-400 italic mt-1 bg-black/20 p-2 rounded">
                                                    <span className="text-yellow-500 font-bold">Hint:</span> {safeString(section.subordinate_text_hint)}
                                                </p>
                                            )}
                                            {section.methodology_note && (
                                                <p className="text-[10px] text-cyan-400 mt-1 uppercase font-bold tracking-wide">
                                                    Format: {safeString(section.methodology_note)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ) : (
                            /* Fallback to Legacy Markdown Outline if structured data is missing */
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Article Outline</h3>
                                <div className="whitespace-pre-wrap font-mono text-sm text-gray-300">
                                    {safeString(brief.outline)}
                                </div>
                            </Card>
                        )}
                        
                         {/* Key Takeaways */}
                         {brief.keyTakeaways && brief.keyTakeaways.length > 0 && (
                             <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Key Takeaways</h3>
                                <ul className="list-disc list-inside space-y-1">
                                    {brief.keyTakeaways.map((item, index) => (
                                        <li key={index}>{safeString(item)}</li>
                                    ))}
                                </ul>
                            </Card>
                        )}

                        {/* Visual Semantics */}
                        {brief.visual_semantics && brief.visual_semantics.length > 0 && (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-3">Visual Semantics</h3>
                                <div className="space-y-3">
                                    {brief.visual_semantics.map((visual, i) => (
                                        <div key={i} className="p-3 bg-black/20 rounded border border-gray-700 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-700/50">
                                                    {safeString(visual.type)}
                                                </span>
                                                {(visual.width_hint || visual.height_hint) && (
                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                        {safeString(visual.width_hint || '?')} x {safeString(visual.height_hint || '?')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-200">{safeString(visual.description)}</p>
                                            {visual.caption_data && (
                                                <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded border-l-2 border-gray-600">
                                                    <span className="font-bold">Data/Caption:</span> {safeString(visual.caption_data)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Internal Links with Hints */}
                        {bridgeLinks.length > 0 && (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Internal Linking Plan</h3>
                                { !Array.isArray(brief.contextualBridge) && brief.contextualBridge?.content && (
                                    <div className="mb-4 p-3 bg-gray-800/50 rounded border border-gray-700">
                                        <p className="text-sm text-gray-300 italic">{safeString(brief.contextualBridge.content)}</p>
                                    </div>
                                )}
                                <ul className="space-y-3">
                                    {bridgeLinks.map((link, index) => (
                                        <li key={index} className="bg-black/20 p-2 rounded border border-gray-700/50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p>Link to: <strong className="text-white">{safeString(link.targetTopic)}</strong></p>
                                                    <p className="text-sm mt-1">Anchor: <em className="text-cyan-300">"{safeString(link.anchorText)}"</em></p>
                                                </div>
                                            </div>
                                            {link.annotation_text_hint && (
                                                <p className="text-xs text-gray-400 mt-2 pl-2 border-l-2 border-gray-600">
                                                    <span className="font-bold text-gray-500">Context Hint:</span> "{safeString(link.annotation_text_hint)}"
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </div>
                </div>

                <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end items-center gap-4">
                    <Button onClick={handleClose} variant="secondary" disabled={isSaving}>Discard</Button>
                    <Button onClick={handleSave} variant="primary" disabled={isSaving}>
                        {isSaving ? <Loader className="w-5 h-5" /> : 'Save to Map'}
                    </Button>
                </footer>
            </Card>
        </div>
    );
};

export default BriefReviewModal;
