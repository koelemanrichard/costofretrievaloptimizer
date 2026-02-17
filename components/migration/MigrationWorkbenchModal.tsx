
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { SiteInventoryItem, ContentBrief, SmartFixResult, EnrichedTopic } from '../../types';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';
import { getOriginalContent } from '../../services/migrationService';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { verifiedUpdate, verifiedInsert } from '../../services/verifiedDatabaseService';
import { safeString } from '../../utils/parsers';
import { useChunking } from '../../hooks/useChunking';
import { ChunkList } from './ChunkList';
import { useSemanticAnalysis } from '../../hooks/useSemanticAnalysis';
import { CoreEntityBoxes } from '../ui/CoreEntityBoxes';
import { SmartFixButton } from '../ui/SmartFixButton';
import { SemanticActionItem, BusinessInfo, SEOPillars } from '../../types';
import { AppAction } from '../../state/appState';
import { generateStructuredFix } from '../../services/ai/semanticAnalysis';

/**
 * Maps a position in a whitespace-normalized string back to the corresponding
 * position in the original string. Used for fuzzy fix matching when prior fixes
 * have shifted whitespace.
 */
function mapNormalizedPosToOriginal(original: string, normalizedPos: number): number {
    let nPos = 0;
    let oPos = 0;

    // Skip leading whitespace (normalize trims leading spaces)
    while (oPos < original.length && /\s/.test(original[oPos])) {
        oPos++;
    }

    while (nPos < normalizedPos && oPos < original.length) {
        if (/\s/.test(original[oPos])) {
            // Consume all consecutive whitespace in original (= 1 space in normalized)
            nPos++;
            while (oPos < original.length && /\s/.test(original[oPos])) {
                oPos++;
            }
        } else {
            nPos++;
            oPos++;
        }
    }

    return oPos;
}

// Action Item Card Component with inline fix preview and apply button
interface ActionItemCardProps {
    action: SemanticActionItem;
    pageContent: string;
    businessInfo: BusinessInfo;
    dispatch: React.Dispatch<AppAction>;
    pillars?: SEOPillars;
    onApplyFix: (fix: SmartFixResult, actionId: string) => boolean | void;
    onStoreGeneratedFix: (actionId: string, fix: SmartFixResult) => void;
    isAutoGenerating: boolean;
}

const ActionItemCard: React.FC<ActionItemCardProps> = ({ action, pageContent, businessInfo, dispatch, pillars, onApplyFix, onStoreGeneratedFix, isAutoGenerating }) => {
    const hasFix = !!action.structuredFix;
    const isApplied = !!action.structuredFix?.applied;
    // Auto-expand items that have a ready fix
    const [isExpanded, setIsExpanded] = useState(false);

    // Expand when fix becomes available
    useEffect(() => {
        if (hasFix && !isApplied) {
            setIsExpanded(true);
        }
    }, [hasFix, isApplied]);

    const impactColors = {
        High: 'bg-red-500/20 text-red-400 border-red-500/30',
        Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        Low: 'bg-green-500/20 text-green-400 border-green-500/30'
    };

    const typeColors = {
        'Macro-Semantics': 'bg-blue-500/20 text-blue-400',
        'Micro-Semantics': 'bg-purple-500/20 text-purple-400'
    };

    return (
        <div className={`bg-gray-800 rounded border overflow-hidden ${isApplied ? 'border-green-700/30 opacity-70' : 'border-gray-700'}`}>
            {/* Header - Always visible */}
            <div
                className="p-3 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-300 text-xs">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                            {isApplied && (
                                <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            <h5 className="text-sm font-medium text-white">{action.title}</h5>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{action.description}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${impactColors[action.impact]}`}>
                            {action.impact}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${typeColors[action.type]}`}>
                            {action.type}
                        </span>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-700 pt-3">
                    {action.ruleReference && (
                        <p className="text-[10px] text-gray-500 mb-2">Rule: {action.ruleReference}</p>
                    )}

                    {/* Smart Fix Button with apply capability */}
                    <SmartFixButton
                        action={action}
                        pageContent={pageContent}
                        businessInfo={businessInfo}
                        dispatch={dispatch}
                        pillars={pillars}
                        onApplyFix={onApplyFix}
                        onStoreGeneratedFix={onStoreGeneratedFix}
                        isAutoGenerating={isAutoGenerating}
                    />
                </div>
            )}
        </div>
    );
};

interface MigrationWorkbenchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventoryItem: SiteInventoryItem | null;
    linkedBrief: ContentBrief | null; // The brief for the "New" topic if mapped
    onMarkOptimized: (itemId: string) => void;
    mappedTopic?: EnrichedTopic | null;
    competingPages?: SiteInventoryItem[];
}

export const MigrationWorkbenchModal: React.FC<MigrationWorkbenchModalProps> = ({
    isOpen,
    onClose,
    inventoryItem,
    linkedBrief,
    onMarkOptimized,
    mappedTopic,
    competingPages
}) => {
    const { state, dispatch } = useAppState();
    const { businessInfo, activeProjectId, topicalMaps, activeMapId } = state;

    // Get pillars from the active topical map for semantic alignment checking
    const activeMap = topicalMaps.find(m => m.id === activeMapId);
    const pillars = activeMap?.pillars;

    // Merge per-map language/region into global businessInfo so AI prompts use the correct language
    const effectiveBusinessInfo = useMemo(() => {
        const mapBi = activeMap?.business_info;
        if (!mapBi) return businessInfo;
        return {
            ...businessInfo,
            language: mapBi.language || businessInfo.language,
            region: mapBi.region || businessInfo.region,
            targetMarket: mapBi.targetMarket || businessInfo.targetMarket,
            industry: mapBi.industry || businessInfo.industry,
            audience: mapBi.audience || businessInfo.audience,
            projectName: mapBi.projectName || businessInfo.projectName,
        };
    }, [businessInfo, activeMap?.business_info]);

    const [originalContent, setOriginalContent] = useState<string>('');
    const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');

    const [draftContent, setDraftContent] = useState<string>('');
    const [activeRightTab, setActiveRightTab] = useState<'edit' | 'preview'>('edit');
    const [showOriginal, setShowOriginal] = useState(false);
    const [showChunks, setShowChunks] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);

    // Ref for the textarea to handle cursor insertion
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Ref that always mirrors the latest draftContent — used in applyFix
    // to avoid stale closure issues when multiple fixes are applied in sequence.
    const draftContentRef = useRef(draftContent);
    draftContentRef.current = draftContent;

    // Chunking Hook
    const { chunks, isChunking, error: chunkError, analyzeContent } = useChunking(effectiveBusinessInfo);

    // Semantic Analysis Hook (with persistence)
    const {
        result: semanticResult,
        isAnalyzing: isAnalyzingSemantic,
        isLoadingCached: isLoadingCachedSemantic,
        error: semanticError,
        analyzeWithPersistence,
        loadCachedResult,
        reset: resetSemanticAnalysis,
        updateActionFix,
        updateActionStructuredFix,
        isGeneratingFixes,
        fixProgress,
        generateAllFixes,
    } = useSemanticAnalysis(effectiveBusinessInfo, dispatch);

    // Error state for fix application failures
    const [fixError, setFixError] = useState<string | null>(null);
    // Loading state for "Apply All" operation
    const [isApplyingAll, setIsApplyingAll] = useState(false);

    // Count fixes ready and applied
    const fixStats = useMemo(() => {
        if (!semanticResult) return { ready: 0, applied: 0, total: 0 };
        const total = semanticResult.actions.length;
        const ready = semanticResult.actions.filter(a => a.structuredFix && !a.structuredFix.applied).length;
        const applied = semanticResult.actions.filter(a => a.structuredFix?.applied).length;
        return { ready, applied, total };
    }, [semanticResult]);

    // Helper function to run semantic analysis with persistence
    const runSemanticAnalysis = async (forceRefresh: boolean = false) => {
        if (!originalContent || !inventoryItem) return;

        await analyzeWithPersistence({
            content: originalContent,
            url: inventoryItem.url,
            inventoryId: inventoryItem.id,
            mapId: activeMapId || null,
            pillars: pillars || null,
            forceRefresh
        });
    };

    const loadContent = useCallback(async (forceRefetch: boolean = false) => {
        if (!inventoryItem) return;

        setIsLoadingOriginal(true);
        setLoadError(null);
        try {
            const content = await getOriginalContent(
                inventoryItem,
                businessInfo,
                businessInfo.supabaseUrl,
                businessInfo.supabaseAnonKey,
                forceRefetch
            );
            setOriginalContent(content);

            // Initialize Draft
            if (linkedBrief?.articleDraft) {
                setDraftContent(linkedBrief.articleDraft);
            } else if (!draftContent) {
                setDraftContent(content);
            }
        } catch (e) {
            console.error("Failed to load workbench content:", e);
            const message = e instanceof Error ? e.message : "Failed to fetch page content.";
            setLoadError(message);
        } finally {
            setIsLoadingOriginal(false);
        }
    }, [inventoryItem, linkedBrief, businessInfo, draftContent]);

    // Load Data on Open
    useEffect(() => {
        if (isOpen && inventoryItem) {
            setLoadError(null);
            setFixError(null);
            setManualInput('');
            setOriginalContent('');
            setDraftContent('');
            setAppliedCount(0);
            setShowOriginal(false);
            setShowChunks(false);
            resetSemanticAnalysis();
            loadContent(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, inventoryItem?.id]);

    // Auto-run semantic analysis when content loads successfully
    useEffect(() => {
        if (originalContent && inventoryItem && !semanticResult && !isAnalyzingSemantic && !isLoadingCachedSemantic && !loadError) {
            analyzeWithPersistence({
                content: originalContent,
                url: inventoryItem.url,
                inventoryId: inventoryItem.id,
                mapId: activeMapId || null,
                pillars: pillars || null,
                forceRefresh: false
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [originalContent, inventoryItem?.id, loadError]);

    // Auto-generate fixes when semantic analysis completes
    useEffect(() => {
        if (semanticResult && semanticResult.actions.length > 0 && !isGeneratingFixes && originalContent) {
            const hasAnyFix = semanticResult.actions.some(a => a.structuredFix);
            if (!hasAnyFix) {
                generateAllFixes(() => draftContentRef.current, pillars);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [semanticResult?.actions.length, originalContent]);

    // Lazy load chunks when toggled
    useEffect(() => {
        if (showChunks && chunks.length === 0 && originalContent) {
            analyzeContent(originalContent);
        }
    }, [showChunks, chunks.length, originalContent, analyzeContent]);

    const handleManualContentSubmit = async () => {
        if (!manualInput.trim() || !inventoryItem) return;

        setOriginalContent(manualInput);
        if (!draftContent) setDraftContent(manualInput);
        setLoadError(null);

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const snapshotResult = await verifiedInsert(
                supabase,
                { table: 'transition_snapshots', operationDescription: 'save manual paste snapshot' },
                {
                    inventory_id: inventoryItem.id,
                    content_markdown: manualInput,
                    snapshot_type: 'ORIGINAL_IMPORT',
                    created_at: new Date().toISOString()
                },
                'id'
            );
            if (!snapshotResult.success) {
                console.warn("Failed to save manual snapshot:", snapshotResult.error);
            }
        } catch (e) {
            console.error("Failed to save manual snapshot", e);
        }
    };

    const handleSaveDraft = async () => {
        if (!inventoryItem || !activeProjectId) return;
        setIsSaving(true);
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            if (linkedBrief) {
                const result = await verifiedUpdate(
                    supabase,
                    { table: 'content_briefs', operationDescription: `save draft for "${linkedBrief.title}"` },
                    linkedBrief.id,
                    { article_draft: draftContent },
                    'id'
                );
                if (!result.success) {
                    throw new Error(result.error || 'Draft save verification failed');
                }
            }

            const historyResult = await verifiedInsert(
                supabase,
                { table: 'transition_snapshots', operationDescription: 'save in-progress snapshot' },
                {
                    inventory_id: inventoryItem.id,
                    content_markdown: draftContent,
                    snapshot_type: 'IN_PROGRESS_SAVE',
                    created_at: new Date().toISOString()
                },
                'id'
            );
            if (!historyResult.success) {
                console.warn("Failed to save history snapshot:", historyResult.error);
            }

            dispatch({ type: 'SET_NOTIFICATION', payload: "Draft saved." });
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save draft." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!inventoryItem) return;
        await handleSaveDraft();
        onMarkOptimized(inventoryItem.id);
        onClose();
    };

    // Apply a single structured fix to the draft with normalized whitespace fallback.
    // Uses draftContentRef to always read the latest content (avoids stale closure).
    // Returns false if the fix could not be applied (text not found).
    const applyFix = useCallback((fix: SmartFixResult, actionId: string): boolean => {
        if (!fix.searchText) return false;
        setFixError(null);
        const content = draftContentRef.current;

        // Try exact match first
        const idx = content.indexOf(fix.searchText);
        if (idx !== -1) {
            const newContent = content.slice(0, idx) + fix.replacementText + content.slice(idx + fix.searchText.length);
            setDraftContent(newContent);
            updateActionStructuredFix(actionId, { ...fix, applied: true });
            setAppliedCount(prev => prev + 1);
            return true;
        }

        // Fallback: normalized whitespace matching (handles shifts from prior fixes)
        const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
        const normalizedDraft = normalize(content);
        const normalizedSearch = normalize(fix.searchText);
        const normIdx = normalizedDraft.indexOf(normalizedSearch);

        if (normIdx !== -1) {
            const origStart = mapNormalizedPosToOriginal(content, normIdx);
            const origEnd = mapNormalizedPosToOriginal(content, normIdx + normalizedSearch.length);
            const newContent = content.slice(0, origStart) + fix.replacementText + content.slice(origEnd);
            setDraftContent(newContent);
            updateActionStructuredFix(actionId, { ...fix, applied: true });
            setAppliedCount(prev => prev + 1);
            return true;
        }

        // Both strategies failed — show visible feedback (global banner + inline return)
        setFixError(`Could not apply fix: "${(fix.explanation || fix.searchText).substring(0, 80)}..." — the target text was modified by a previous fix. Try regenerating fixes.`);
        return false;
    }, [updateActionStructuredFix]);

    // Apply all fixes (all impact levels) sequentially with normalized whitespace fallback and auto-retry
    const applyAllFixes = useCallback(async () => {
        if (!semanticResult) return;
        setFixError(null);
        setIsApplyingAll(true);

        let content = draftContentRef.current;
        let appliedCount = 0;
        const failedActions: SemanticActionItem[] = [];

        // All fixable actions, sorted by impact (High first)
        const allFixableActions = semanticResult.actions.filter(
            a => a.structuredFix && !a.structuredFix.applied
        );
        allFixableActions.sort((a, b) => {
            const impactOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
            return (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2);
        });

        // Pass 1: Apply all fixes that match
        for (const action of allFixableActions) {
            const fix = action.structuredFix!;
            if (!fix.searchText || !fix.replacementText) continue;

            // Try exact match first
            const idx = content.indexOf(fix.searchText);
            if (idx !== -1) {
                content = content.slice(0, idx) + fix.replacementText + content.slice(idx + fix.searchText.length);
                updateActionStructuredFix(action.id, { ...fix, applied: true });
                appliedCount++;
                continue;
            }

            // Fallback: normalized whitespace matching
            const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
            const normContent = normalize(content);
            const normSearch = normalize(fix.searchText);
            const normIdx = normContent.indexOf(normSearch);

            if (normIdx !== -1) {
                const origStart = mapNormalizedPosToOriginal(content, normIdx);
                const origEnd = mapNormalizedPosToOriginal(content, normIdx + normSearch.length);
                content = content.slice(0, origStart) + fix.replacementText + content.slice(origEnd);
                updateActionStructuredFix(action.id, { ...fix, applied: true });
                appliedCount++;
            } else {
                failedActions.push(action);
            }
        }

        // Commit Pass 1 results
        if (appliedCount > 0) {
            setDraftContent(content);
            setAppliedCount(prev => prev + appliedCount);
        }

        // Pass 2: Regenerate failed fixes against updated content and retry
        if (failedActions.length > 0) {
            let retryApplied = 0;
            for (const action of failedActions) {
                try {
                    const newFix = await generateStructuredFix(
                        action, content, effectiveBusinessInfo, dispatch, pillars || undefined
                    );
                    // Try applying the regenerated fix
                    const idx = content.indexOf(newFix.searchText);
                    if (idx !== -1) {
                        content = content.slice(0, idx) + newFix.replacementText + content.slice(idx + newFix.searchText.length);
                        updateActionStructuredFix(action.id, { ...newFix, applied: true });
                        retryApplied++;
                    } else {
                        // Store the new fix so user can try manually
                        updateActionStructuredFix(action.id, newFix);
                    }
                } catch (err) {
                    console.warn(`[ApplyAll] Retry failed for "${action.title}":`, err);
                }
            }
            if (retryApplied > 0) {
                setDraftContent(content);
                setAppliedCount(prev => prev + retryApplied);
            }
            const stillFailed = failedActions.length - retryApplied;
            if (stillFailed > 0) {
                setFixError(`${stillFailed} fix(es) could not be applied after retry. Their fixes have been regenerated — try applying them individually.`);
            }
        }

        setIsApplyingAll(false);
    }, [semanticResult, updateActionStructuredFix, effectiveBusinessInfo, dispatch, pillars]);

    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const text = e.dataTransfer.getData('text/plain');

        if (text && textareaRef.current) {
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            const newText = draftContent.substring(0, start) + text + "\n" + draftContent.substring(end);
            setDraftContent(newText);

            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + text.length + 1, start + text.length + 1);
            }, 0);
        } else if (text) {
            setDraftContent(prev => prev + "\n\n" + text);
        }
    };

    if (!isOpen || !inventoryItem) return null;

    const allReadyCount = semanticResult?.actions.filter(
        a => a.structuredFix && !a.structuredFix.applied
    ).length ?? 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[90] flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white">Migration Workbench</h2>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="bg-gray-800 px-2 py-0.5 rounded">Source: {inventoryItem.url}</span>
                        <span>&rarr;</span>
                        <span className="text-green-400">{linkedBrief ? safeString(linkedBrief.title) : 'Unmapped (Standalone Optimization)'}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
                        {isSaving ? <Loader className="w-4 h-4"/> : 'Save Draft'}
                    </Button>
                    <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                        Mark as Optimized
                    </Button>
                    <button onClick={onClose} className="ml-4 text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
            </header>

            {/* Main Workspace (Split View) */}
            <div className="flex-grow flex overflow-hidden">

                {/* LEFT: Guided Analysis & Fixes Panel */}
                <div className="w-1/2 border-r border-gray-700 flex flex-col bg-gray-900">
                    {/* Left panel header with view toggles */}
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 font-semibold text-gray-300 text-sm flex justify-between items-center">
                        <span>Analysis & Fixes</span>
                        <div className="flex items-center gap-2">
                            {/* View Original toggle */}
                            {!loadError && originalContent && (
                                <button
                                    onClick={() => { setShowOriginal(!showOriginal); setShowChunks(false); }}
                                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${showOriginal ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    title="View Original Content"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Original
                                </button>
                            )}
                            {/* Re-fetch button */}
                            {!loadError && originalContent && !isLoadingOriginal && (
                                <button
                                    onClick={() => loadContent(true)}
                                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                    title="Re-fetch content from source URL"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            )}
                            {isLoadingOriginal && <Loader className="w-4 h-4" />}
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 bg-gray-900/50 space-y-4">
                        {/* Error / Manual Input state */}
                        {loadError ? (
                            <div className="flex flex-col gap-4 max-w-lg mx-auto mt-6">
                                <div className="bg-red-900/20 border border-red-700/50 p-4 rounded text-red-200 text-center">
                                    <p className="font-bold mb-1">Extraction Failed</p>
                                    <p className="text-sm mb-3">{loadError}</p>
                                    <Button variant="secondary" onClick={() => loadContent(true)} className="text-xs !py-1">Retry Scrape</Button>
                                </div>
                                <div className="flex-grow flex flex-col gap-2">
                                    <Label>Manual Content Fallback</Label>
                                    <p className="text-xs text-gray-500 mb-1">
                                        If the automated scraper is blocked, paste the page content here.
                                    </p>
                                    <Textarea
                                        value={manualInput}
                                        onChange={e => setManualInput(e.target.value)}
                                        className="flex-grow font-mono text-xs bg-gray-800 border-gray-700 min-h-[200px]"
                                        placeholder="# Paste content here..."
                                    />
                                    <Button onClick={handleManualContentSubmit} disabled={!manualInput.trim()} className="w-full">
                                        Use Pasted Content
                                    </Button>
                                </div>
                            </div>
                        ) : showOriginal ? (
                            /* Original Content View */
                            originalContent ? (
                                <SimpleMarkdown content={originalContent} />
                            ) : (
                                !isLoadingOriginal && <p className="text-center mt-20 text-gray-500">No content found.</p>
                            )
                        ) : showChunks ? (
                            /* Semantic Chunks View */
                            <div className="h-full">
                                {isChunking ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <Loader />
                                        <p className="text-xs text-gray-500 mt-2">Analyzing semantic structure...</p>
                                    </div>
                                ) : chunkError ? (
                                    <div className="text-red-400 p-4 text-center">{chunkError}</div>
                                ) : (
                                    <ChunkList chunks={chunks} />
                                )}
                            </div>
                        ) : (
                            /* Main guided view: Summary Bar + Analysis + Fixes */
                            <>
                                {/* Strategic Context */}
                                {mappedTopic && (
                                  <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg space-y-2">
                                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                      Target Topic
                                      <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 border border-blue-700 rounded">
                                        {mappedTopic.type}
                                      </span>
                                    </h4>
                                    <p className="text-sm text-gray-300">{mappedTopic.title}</p>
                                    {mappedTopic.canonical_query && (
                                      <p className="text-xs text-gray-500">Target query: {mappedTopic.canonical_query}</p>
                                    )}
                                    {(() => {
                                      const topQueries = (inventoryItem as SiteInventoryItem & { gsc_top_queries?: string[] })?.gsc_top_queries;
                                      return topQueries && Array.isArray(topQueries) && topQueries.length > 0 ? (
                                        <div className="text-xs text-gray-500">
                                          Ranking for: {topQueries.slice(0, 5).join(', ')}
                                        </div>
                                      ) : null;
                                    })()}
                                    {competingPages && competingPages.length > 0 && (
                                      <div className="text-xs text-orange-400">
                                        Cannibalization risk: {competingPages.length} other page(s) compete for this topic
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Summary Bar */}
                                {(isAnalyzingSemantic || isLoadingCachedSemantic) && (
                                    <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                                        <Loader className="w-5 h-5" />
                                        <span className="text-sm text-gray-300">Analyzing content...</span>
                                    </div>
                                )}

                                {semanticError && (
                                    <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-red-300 text-sm">
                                        Analysis error: {semanticError}
                                        <button onClick={() => runSemanticAnalysis(true)} className="ml-2 underline text-red-400">Retry</button>
                                    </div>
                                )}

                                {semanticResult && (
                                    <>
                                        {/* Score & Fix Summary Bar */}
                                        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`text-2xl font-bold ${semanticResult.overallScore >= 70 ? 'text-green-400' : semanticResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                        {semanticResult.overallScore}/100
                                                    </div>
                                                    <div className="text-sm text-gray-400">
                                                        {isGeneratingFixes ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="animate-spin inline-block text-xs">&#9881;</span>
                                                                Generating fixes ({fixProgress.completed}/{fixProgress.total})
                                                            </span>
                                                        ) : fixStats.ready > 0 ? (
                                                            <span className="text-green-400">{fixStats.ready} fixes ready</span>
                                                        ) : fixStats.applied > 0 ? (
                                                            <span className="text-green-400">{fixStats.applied} fixes applied</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {allReadyCount > 0 && (
                                                        <button
                                                            onClick={applyAllFixes}
                                                            disabled={isApplyingAll}
                                                            className="bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded text-xs font-medium hover:bg-green-600/30 transition-colors disabled:opacity-50"
                                                        >
                                                            {isApplyingAll ? (
                                                                <><span className="animate-spin inline-block mr-1">&#9881;</span> Applying...</>
                                                            ) : (
                                                                <>Apply All Fixes ({allReadyCount})</>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => runSemanticAnalysis(true)}
                                                        disabled={isAnalyzingSemantic}
                                                        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                                        title="Re-analyze"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${semanticResult.overallScore >= 70 ? 'bg-green-500' : semanticResult.overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${semanticResult.overallScore}%` }}
                                                />
                                            </div>

                                            {/* Summary text */}
                                            {semanticResult.summary && (
                                                <p className="text-xs text-gray-400">{semanticResult.summary}</p>
                                            )}
                                        </div>

                                        {/* Fix application error banner */}
                                        {fixError && (
                                            <div className="bg-red-900/20 border border-red-500/30 rounded p-3 flex items-center justify-between">
                                                <span className="text-red-400 text-xs">{fixError}</span>
                                                <button onClick={() => setFixError(null)} className="text-red-400 hover:text-red-300 ml-2 text-sm flex-shrink-0">&times;</button>
                                            </div>
                                        )}

                                        {/* Core Entities (collapsible) */}
                                        {semanticResult.coreEntities && (
                                            <CoreEntityBoxes entities={semanticResult.coreEntities} />
                                        )}

                                        {/* Alignment Scores (compact) */}
                                        {semanticResult.alignmentScores && (
                                            <div className="bg-gray-800 p-3 rounded border-l-4 border-green-500">
                                                <div className="space-y-2">
                                                    {[
                                                        { label: 'CE', value: semanticResult.alignmentScores.ceAlignment, gap: semanticResult.alignmentScores.ceGap },
                                                        { label: 'SC', value: semanticResult.alignmentScores.scAlignment, gap: semanticResult.alignmentScores.scGap },
                                                        { label: 'CSI', value: semanticResult.alignmentScores.csiAlignment, gap: semanticResult.alignmentScores.csiGap },
                                                    ].map(({ label, value, gap }) => (
                                                        <div key={label} className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400 w-8">{label}</span>
                                                            <div className="flex-grow bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all ${value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${value}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-xs font-bold w-10 text-right ${value >= 70 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                {value}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Items with Inline Fixes */}
                                        {semanticResult.actions && semanticResult.actions.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-semibold text-white">Fixes ({semanticResult.actions.length})</h3>

                                                {/* Group by category */}
                                                {(['Low Hanging Fruit', 'Mid Term', 'Long Term'] as const).map(category => {
                                                    const items = semanticResult.actions.filter(a => a.category === category);
                                                    if (items.length === 0) return null;
                                                    const categoryColors = {
                                                        'Low Hanging Fruit': 'text-green-400',
                                                        'Mid Term': 'text-yellow-400',
                                                        'Long Term': 'text-orange-400'
                                                    };
                                                    return (
                                                        <div key={category}>
                                                            <h4 className={`text-xs font-bold ${categoryColors[category]} mb-2`}>
                                                                {category}
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {items.map(action => (
                                                                    <ActionItemCard
                                                                        key={action.id}
                                                                        action={action}
                                                                        pageContent={draftContent}
                                                                        businessInfo={effectiveBusinessInfo}
                                                                        dispatch={dispatch}
                                                                        pillars={pillars || undefined}
                                                                        onApplyFix={applyFix}
                                                                        onStoreGeneratedFix={updateActionStructuredFix}
                                                                        isAutoGenerating={isGeneratingFixes}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Advanced: Chunks link at bottom */}
                                {originalContent && !isAnalyzingSemantic && (
                                    <div className="pt-2 border-t border-gray-800">
                                        <button
                                            onClick={() => { setShowChunks(true); setShowOriginal(false); }}
                                            className="text-xs text-gray-600 hover:text-gray-400 underline"
                                        >
                                            Advanced: View Semantic Chunks
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* RIGHT: New Draft (Editor) */}
                <div className="w-1/2 flex flex-col bg-gray-900">
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                             <span className="font-semibold text-white text-sm">New Content (Editor)</span>
                             {appliedCount > 0 && (
                                 <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
                                     {appliedCount} {appliedCount === 1 ? 'change' : 'changes'} applied
                                 </span>
                             )}
                         </div>
                         <div className="flex bg-gray-700 rounded p-0.5">
                             <button
                                onClick={() => setActiveRightTab('edit')}
                                className={`px-3 py-1 text-xs rounded ${activeRightTab === 'edit' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                             >
                                Edit
                             </button>
                             <button
                                onClick={() => setActiveRightTab('preview')}
                                className={`px-3 py-1 text-xs rounded ${activeRightTab === 'preview' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                             >
                                Preview
                             </button>
                         </div>
                    </div>

                    <div className="flex-grow overflow-y-auto relative">
                        {activeRightTab === 'edit' ? (
                            <div className="relative w-full h-full">
                                <textarea
                                    ref={textareaRef as any}
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    className="w-full h-full min-h-full resize-none bg-gray-900 text-gray-200 border-none p-6 focus:ring-0 font-mono text-sm leading-relaxed absolute inset-0"
                                    placeholder="Start rewriting here... Drag & Drop chunks from the left to assemble content."
                                />
                            </div>
                        ) : (
                            <div className="p-6 text-gray-200">
                                <SimpleMarkdown content={draftContent} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
