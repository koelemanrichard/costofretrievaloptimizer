
// components/ContentBriefModal.tsx
import React, { useState, useCallback } from 'react';
import { useAppState } from '../state/appState';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { EnrichedTopic, ContentBrief, ContextualBridgeLink, BriefSection, EnhancedSchemaResult } from '../types';
import { safeString } from '../utils/parsers';
import { useContentGeneration } from '../hooks/useContentGeneration';
import ContentGenerationProgress from './ContentGenerationProgress';
import { ContentGenerationSettingsPanel } from './ContentGenerationSettingsPanel';
import { PassControlPanel } from './PassControlPanel';
import { BriefEditModal } from './brief/BriefEditModal';
import { ReportExportButton, ReportModal } from './reports';
import { useContentBriefReport } from '../hooks/useReportGeneration';
import {
  ContentGenerationSettings,
  PRIORITY_PRESETS,
  DEFAULT_CONTENT_GENERATION_SETTINGS
} from '../types/contentGeneration';
import { BriefHealthOverview } from './brief/BriefHealthOverview';
import { getSupabaseClient } from '../services/supabaseClient';

interface ContentBriefModalProps {
  allTopics: EnrichedTopic[];
  onGenerateDraft: (brief: ContentBrief) => void;
}

const ContentBriefModal: React.FC<ContentBriefModalProps> = ({ allTopics, onGenerateDraft }) => {
    const { state, dispatch } = useAppState();
    const { activeBriefTopic, topicalMaps, activeMapId, isLoading, businessInfo, user } = state;

    const activeMap = topicalMaps.find(m => m.id === activeMapId);
    const brief = activeBriefTopic ? activeMap?.briefs?.[activeBriefTopic.id] : null;

    const isOpen = !!(state.modals.contentBrief && brief);
    const isDrafting = !!isLoading.audit; // 'audit' key is currently reused for drafting in container

    // Multi-pass generation state
    const [useMultiPass, setUseMultiPass] = useState(true);
    const [generationLogs, setGenerationLogs] = useState<Array<{ message: string; status: string; timestamp: number }>>([]);
    const [isStartingGeneration, setIsStartingGeneration] = useState(false);

    // Settings panel state
    const [showSettings, setShowSettings] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [contentSettings, setContentSettings] = useState<ContentGenerationSettings>({
        ...DEFAULT_CONTENT_GENERATION_SETTINGS,
        id: 'temp',
        userId: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    // Report generation hook
    const reportHook = useContentBriefReport(brief, activeBriefTopic || undefined);

    // Brief repair state
    const [isRepairingBrief, setIsRepairingBrief] = useState(false);

    // Handle repair missing fields
    const handleRepairMissing = useCallback(async (missingFields: string[]) => {
        if (!brief || !activeMapId || !activeBriefTopic || !activeMap?.pillars) return;

        setIsRepairingBrief(true);
        try {
            // Import the repair service dynamically to avoid circular dependencies
            const { repairBriefMissingFields } = await import('../services/ai/briefRepair');
            const repairedBrief = await repairBriefMissingFields(
                brief,
                missingFields,
                activeBriefTopic,
                activeMap.pillars,
                businessInfo,
                allTopics,
                dispatch
            );

            if (repairedBrief) {
                // Build update payload for Supabase (snake_case)
                // Note: targetKeyword and searchIntent exist in TypeScript interface but NOT in database schema
                const dbUpdates: Record<string, any> = {};
                if (repairedBrief.metaDescription !== undefined) dbUpdates.meta_description = repairedBrief.metaDescription;
                if (repairedBrief.structured_outline !== undefined) dbUpdates.structured_outline = repairedBrief.structured_outline;
                if (repairedBrief.serpAnalysis !== undefined) dbUpdates.serp_analysis = repairedBrief.serpAnalysis;
                if (repairedBrief.contextualBridge !== undefined) dbUpdates.contextual_bridge = repairedBrief.contextualBridge;
                if (repairedBrief.visuals !== undefined) dbUpdates.visuals = repairedBrief.visuals;

                // Persist to Supabase
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                const { error: dbError } = await supabase
                    .from('content_briefs')
                    .update(dbUpdates)
                    .eq('id', brief.id);

                if (dbError) {
                    console.error('[ContentBriefModal] Failed to persist repaired brief:', dbError);
                    throw new Error(`Database error: ${dbError.message}`);
                }

                // Update local state
                dispatch({
                    type: 'UPDATE_BRIEF',
                    payload: {
                        mapId: activeMapId,
                        topicId: activeBriefTopic.id,
                        updates: repairedBrief
                    }
                });
                dispatch({ type: 'SET_NOTIFICATION', payload: `Repaired ${missingFields.length} missing field(s) successfully.` });
            }
        } catch (error) {
            console.error('Brief repair failed:', error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to repair brief' });
        } finally {
            setIsRepairingBrief(false);
        }
    }, [brief, activeMapId, activeBriefTopic, activeMap?.pillars, businessInfo, allTopics, dispatch]);

    const handleLog = useCallback((message: string, status: 'info' | 'success' | 'failure' | 'warning') => {
        setGenerationLogs(prev => [...prev, { message, status, timestamp: Date.now() }]);
        dispatch({ type: 'LOG_EVENT', payload: { service: 'MultiPass', message, status, timestamp: Date.now() }});
    }, [dispatch]);

    // Handle completion - update local state with the generated draft and schema
    const handleGenerationComplete = useCallback((draft: string, auditScore: number, schemaResult?: EnhancedSchemaResult) => {
        console.log('[ContentBriefModal] handleGenerationComplete called:', {
            draftLength: draft?.length || 0,
            auditScore,
            hasSchema: !!schemaResult,
            activeBriefTopic: activeBriefTopic?.id,
            activeMapId
        });

        if (!draft) {
            console.warn('[ContentBriefModal] Empty draft received, not updating');
            return;
        }

        if (activeBriefTopic && activeMapId) {
            dispatch({
                type: 'UPDATE_BRIEF',
                payload: {
                    mapId: activeMapId,
                    topicId: activeBriefTopic.id,
                    updates: { articleDraft: draft }
                }
            });
            handleLog(`Draft synced to workspace (${draft.length} chars)`, 'success');

            if (schemaResult) {
                handleLog(`Schema generated: ${schemaResult.pageType} with ${schemaResult.resolvedEntities.length} entities`, 'success');
            }
        }
    }, [activeBriefTopic, activeMapId, dispatch, handleLog]);

    // Multi-pass generation hook
    const {
        job,
        sections,
        isGenerating,
        isPaused,
        isComplete,
        isFailed,
        progress,
        currentPassName,
        startGeneration,
        pauseGeneration,
        resumeGeneration,
        cancelGeneration,
        retryGeneration,
        triggerJobRefresh,
        error
    } = useContentGeneration({
        briefId: brief?.id || '',
        mapId: activeMapId || '',
        userId: user?.id || '',
        businessInfo,
        brief: brief || {} as ContentBrief,
        pillars: activeMap?.pillars,
        topic: activeBriefTopic || undefined,
        onLog: handleLog,
        onComplete: handleGenerationComplete,
        externalRefreshTrigger: state.jobRefreshTrigger // Listen for re-run triggers from DraftingModal
    });

    const handleClose = () => {
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: false } });
        dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: null });
    };

    const handleGenerateDraft = async () => {
      if (brief) {
        if (useMultiPass) {
          setIsStartingGeneration(true);
          setGenerationLogs([]);
          try {
            await startGeneration();
          } finally {
            setIsStartingGeneration(false);
          }
        } else {
          onGenerateDraft(brief);
        }
      }
    };

    const handleViewDraft = () => {
        if (brief) {
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'drafting', visible: true } });
        }
    }

    if (!isOpen || !brief) {
        return null;
    }

    // Helper to safely extract links whether bridge is array or section object
    const bridgeLinks: ContextualBridgeLink[] = Array.isArray(brief.contextualBridge)
        ? brief.contextualBridge
        : brief.contextualBridge?.links || [];

    // Show progress UI when actively generating, paused, or failed (to show pass status and allow retry)
    const showProgressUI = isGenerating || isPaused || isFailed || (job && !isComplete);

    // Allow settings when: multi-pass enabled and NOT actively generating
    // Settings should be accessible even when there's an existing draft (for regeneration)
    const canShowSettings = useMultiPass && !isGenerating;

    // Highlight settings when there's an error to encourage switching providers
    const highlightSettings = isFailed && !showSettings;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={handleClose}>
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Content Brief</h2>
                        <p className="text-sm text-gray-400">{safeString(brief.title) || 'Untitled Topic'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Edit Brief button */}
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="text-xs px-3 py-1.5 rounded border transition-colors bg-emerald-900/50 border-emerald-600 text-emerald-200 hover:bg-emerald-900/70"
                            title="Edit brief sections and settings"
                        >
                            Edit Brief
                        </button>
                        {/* Settings toggle in header - show when multi-pass and no draft */}
                        {canShowSettings && (
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                    showSettings
                                        ? 'bg-blue-900/50 border-blue-600 text-blue-200'
                                        : highlightSettings
                                            ? 'bg-amber-900/50 border-amber-500 text-amber-200 animate-pulse'
                                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {showSettings ? '▲ Hide Settings' : highlightSettings ? '⚠ Change AI Provider' : '▼ Show Settings'}
                            </button>
                        )}
                        <button onClick={handleClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
                    </div>
                </header>

                {/* Collapsible Settings Panel - visible when settings toggled on */}
                {canShowSettings && showSettings && (
                    <div className="border-b border-gray-700 bg-gray-850 p-4 flex-shrink-0">
                        <div className="grid md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                            <ContentGenerationSettingsPanel
                                settings={contentSettings}
                                onChange={setContentSettings}
                                presets={PRIORITY_PRESETS}
                            />
                            <PassControlPanel
                                passes={contentSettings.passes}
                                onChange={(passes) => setContentSettings(prev => ({ ...prev, passes }))}
                                disabled={isGenerating}
                            />
                        </div>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-grow">
                    {/* Multi-Pass Progress UI */}
                    {showProgressUI && job && (
                        <div className="mb-6">
                            <ContentGenerationProgress
                                job={job}
                                sections={sections}
                                progress={progress}
                                currentPassName={currentPassName}
                                onPause={pauseGeneration}
                                onResume={resumeGeneration}
                                onCancel={cancelGeneration}
                                onRetry={retryGeneration}
                                error={error}
                            />
                        </div>
                    )}

                    {/* Completion Message */}
                    {isComplete && job && (
                        <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded">
                            <h3 className="text-green-300 font-semibold mb-2">Generation Complete!</h3>
                            <p className="text-gray-300 text-sm">
                                Your article has been generated through 9 optimization passes including schema generation.
                                Final audit score: <strong className="text-green-400">{job.final_audit_score}%</strong>
                                {job.schema_data && (
                                    <span className="ml-2">| Schema: <strong className="text-blue-400">{(job.schema_data as EnhancedSchemaResult).pageType}</strong></span>
                                )}
                            </p>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={handleViewDraft} variant="primary">
                                    View Generated Draft
                                </Button>
                                {job.schema_data && (
                                    <Button
                                        onClick={() => {
                                            const schemaResult = job.schema_data as EnhancedSchemaResult;
                                            dispatch({ type: 'SET_SCHEMA_RESULT', payload: schemaResult });
                                            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
                                        }}
                                        variant="secondary"
                                        className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                                    >
                                        View Schema
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Brief Health Overview */}
                        <BriefHealthOverview
                            brief={brief}
                            onRepairMissing={handleRepairMissing}
                            onRegenerateBrief={() => setShowEditModal(true)}
                            isRepairing={isRepairingBrief}
                        />

                        {/* Meta Info */}
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

                        {/* Strategic Context (New) */}
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

                         {/* Internal Links */}
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

                <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {brief.articleDraft && <span className="text-sm text-green-400">Article draft is ready.</span>}
                        {/* Show multi-pass toggle when not actively generating */}
                        {!isGenerating && (
                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useMultiPass}
                                    onChange={(e) => setUseMultiPass(e.target.checked)}
                                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                />
                                <span>Use Multi-Pass Generation (9 passes)</span>
                            </label>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* View All Resources button */}
                        <Button
                            onClick={() => {
                                dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicResources', visible: true } });
                            }}
                            variant="secondary"
                            className="text-xs border-gray-600"
                        >
                            All Resources
                        </Button>
                        {/* Show generate/view buttons when not actively generating */}
                        {!isGenerating && (
                            <>
                                {/* Show Regenerate button when there's an existing draft */}
                                {brief.articleDraft && (
                                    <Button
                                        onClick={handleGenerateDraft}
                                        variant="secondary"
                                        disabled={isDrafting || isStartingGeneration}
                                        className="text-xs border-amber-600 text-amber-300 hover:bg-amber-900/30"
                                        title="Regenerate the article draft based on the current brief"
                                    >
                                        {isStartingGeneration ? (
                                            <div className="flex items-center gap-2"><Loader className="w-3 h-3" /> <span>Starting...</span></div>
                                        ) : (
                                            'Regenerate Draft'
                                        )}
                                    </Button>
                                )}
                                <Button
                                    onClick={brief.articleDraft ? handleViewDraft : handleGenerateDraft}
                                    variant="primary"
                                    disabled={isDrafting || isGenerating}
                                >
                                    {isDrafting ? (
                                        <div className="flex items-center gap-2"><Loader className="w-4 h-4" /> <span>Generating...</span></div>
                                    ) : (
                                        brief.articleDraft ? 'View Draft' : (useMultiPass ? 'Generate (Multi-Pass)' : 'Generate Article Draft')
                                    )}
                                </Button>
                            </>
                        )}
                        {reportHook.canGenerate && (
                            <ReportExportButton
                                reportType="content-brief"
                                onClick={reportHook.open}
                                variant="secondary"
                                size="sm"
                            />
                        )}
                        <Button onClick={handleClose} variant="secondary">Close</Button>
                    </div>
                </footer>
            </Card>

            {/* Brief Edit Modal */}
            {showEditModal && brief && activeBriefTopic && activeMap && activeMapId && (
                <BriefEditModal
                    isOpen={showEditModal}
                    brief={brief}
                    topic={activeBriefTopic}
                    pillars={activeMap.pillars || { centralEntity: '', sourceContext: '', centralSearchIntent: '' }}
                    allTopics={allTopics}
                    mapId={activeMapId}
                    businessInfo={businessInfo}
                    onClose={() => setShowEditModal(false)}
                    onSaved={() => setShowEditModal(false)}
                    onRepairMissing={handleRepairMissing}
                    isRepairing={isRepairingBrief}
                />
            )}

            {/* Report Modal */}
            {reportHook.data && (
                <ReportModal
                    isOpen={reportHook.isOpen}
                    onClose={reportHook.close}
                    reportType="content-brief"
                    data={reportHook.data}
                    projectName={activeMap?.name || businessInfo?.projectName}
                />
            )}
        </div>
    );
};

export default ContentBriefModal;
