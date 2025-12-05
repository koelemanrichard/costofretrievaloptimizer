
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { SiteInventoryItem, ContentBrief } from '../../types';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';
import { getOriginalContent } from '../../services/migrationService';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { safeString } from '../../utils/parsers';
import { useChunking } from '../../hooks/useChunking';
import { ChunkList } from './ChunkList';
import { useSemanticAnalysis } from '../../hooks/useSemanticAnalysis';
import { CoreEntityBoxes } from '../ui/CoreEntityBoxes';
import { SmartFixButton } from '../ui/SmartFixButton';
import { SemanticActionItem, BusinessInfo } from '../../types';
import { AppAction } from '../../state/appState';

// Action Item Card Component with expandable details and SmartFix button
interface ActionItemCardProps {
    action: SemanticActionItem;
    pageContent: string;
    businessInfo: BusinessInfo;
    dispatch: React.Dispatch<AppAction>;
}

const ActionItemCard: React.FC<ActionItemCardProps> = ({ action, pageContent, businessInfo, dispatch }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
            {/* Header - Always visible */}
            <div
                className="p-3 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-300 text-xs">{isExpanded ? '▼' : '▶'}</span>
                            <h5 className="text-sm font-medium text-white">{action.title}</h5>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{action.description}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${impactColors[action.impact]}`}>
                            {action.impact} Impact
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
                    {/* Full Description */}
                    <div className="mb-3">
                        <p className="text-xs text-gray-300">{action.description}</p>
                        {action.ruleReference && (
                            <p className="text-[10px] text-gray-500 mt-1">Rule: {action.ruleReference}</p>
                        )}
                    </div>

                    {/* Smart Fix Button */}
                    <SmartFixButton
                        action={action}
                        pageContent={pageContent}
                        businessInfo={businessInfo}
                        dispatch={dispatch}
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
}

export const MigrationWorkbenchModal: React.FC<MigrationWorkbenchModalProps> = ({ 
    isOpen, 
    onClose, 
    inventoryItem, 
    linkedBrief,
    onMarkOptimized
}) => {
    const { state, dispatch } = useAppState();
    const { businessInfo, activeProjectId, topicalMaps, activeMapId } = state;

    // Get pillars from the active topical map for semantic alignment checking
    const activeMap = topicalMaps.find(m => m.id === activeMapId);
    const pillars = activeMap?.pillars;

    const [originalContent, setOriginalContent] = useState<string>('');
    const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');
    
    const [draftContent, setDraftContent] = useState<string>('');
    const [activeRightTab, setActiveRightTab] = useState<'edit' | 'preview'>('edit');
    const [activeLeftTab, setActiveLeftTab] = useState<'raw' | 'chunks' | 'semantic'>('raw');
    const [isSaving, setIsSaving] = useState(false);

    // Ref for the textarea to handle cursor insertion
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Chunking Hook
    const { chunks, isChunking, error: chunkError, analyzeContent } = useChunking(businessInfo);

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
    } = useSemanticAnalysis(businessInfo, dispatch);

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
            // If we have a linked brief with an existing draft, use it.
            // Otherwise, use the original content as the starting point.
            if (linkedBrief?.articleDraft) {
                setDraftContent(linkedBrief.articleDraft);
            } else if (!draftContent) { // Only set if draft is empty to avoid overwriting work
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
            // Reset states
            setLoadError(null);
            setManualInput('');
            setOriginalContent('');
            setDraftContent(''); // Will be populated by loadContent
            resetSemanticAnalysis(); // Clear previous semantic analysis results
            loadContent(false); // Don't force refetch on initial load
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, inventoryItem?.id]); // Use inventoryItem.id for more reliable change detection

    // Lazy load chunks when tab is switched
    useEffect(() => {
        if (activeLeftTab === 'chunks' && chunks.length === 0 && originalContent) {
            analyzeContent(originalContent);
        }
    }, [activeLeftTab, chunks.length, originalContent, analyzeContent]);

    // Try to load cached semantic analysis when switching to semantic tab
    useEffect(() => {
        if (activeLeftTab === 'semantic' && !semanticResult && !isAnalyzingSemantic && originalContent && inventoryItem) {
            loadCachedResult(inventoryItem.id, activeMapId || null, originalContent);
        }
    }, [activeLeftTab, semanticResult, isAnalyzingSemantic, originalContent, inventoryItem, activeMapId, loadCachedResult]);

    const handleManualContentSubmit = async () => {
        if (!manualInput.trim() || !inventoryItem) return;
        
        setOriginalContent(manualInput);
        if (!draftContent) setDraftContent(manualInput);
        setLoadError(null);
        
        // Persist as snapshot so it loads next time
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            await supabase.from('transition_snapshots').insert({
                inventory_id: inventoryItem.id,
                content_markdown: manualInput,
                snapshot_type: 'ORIGINAL_IMPORT', // Treat manual paste as the source of truth
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to save manual snapshot", e);
        }
        
        // If user immediately switches to chunks tab, this ensures analysis works
        if (activeLeftTab === 'chunks') {
            analyzeContent(manualInput);
        }
    };

    const handleSaveDraft = async () => {
        if (!inventoryItem || !activeProjectId) return;
        setIsSaving(true);
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            
            // If mapped to a topic/brief, save to content_briefs
            if (linkedBrief) {
                await supabase
                    .from('content_briefs')
                    .update({ article_draft: draftContent })
                    .eq('id', linkedBrief.id);
            }

            // Save a snapshot for history
            await supabase.from('transition_snapshots').insert({
                inventory_id: inventoryItem.id,
                content_markdown: draftContent,
                snapshot_type: 'IN_PROGRESS_SAVE',
                created_at: new Date().toISOString()
            });

            dispatch({ type: 'SET_NOTIFICATION', payload: "Draft saved." });
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: "Failed to save draft." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!inventoryItem) return;
        await handleSaveDraft(); // Ensure saved
        onMarkOptimized(inventoryItem.id);
        onClose();
    };

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
            
            // Insert text at cursor position
            const newText = draftContent.substring(0, start) + text + "\n" + draftContent.substring(end);
            setDraftContent(newText);
            
            // Restore focus and update cursor position
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + text.length + 1, start + text.length + 1);
            }, 0);
        } else if (text) {
            // Fallback if ref is missing
            setDraftContent(prev => prev + "\n\n" + text);
        }
    };

    if (!isOpen || !inventoryItem) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[90] flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white">Migration Workbench</h2>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="bg-gray-800 px-2 py-0.5 rounded">Source: {inventoryItem.url}</span>
                        <span>→</span>
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
                
                {/* LEFT: Original Content (Reference) */}
                <div className="w-1/2 border-r border-gray-700 flex flex-col bg-gray-900">
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 font-semibold text-gray-300 text-sm flex justify-between items-center">
                        <div className="flex bg-gray-700 rounded p-0.5">
                             <button
                                onClick={() => setActiveLeftTab('raw')}
                                className={`px-3 py-1 text-xs rounded ${activeLeftTab === 'raw' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                                disabled={!!loadError}
                             >
                                Raw Content
                             </button>
                             <button
                                onClick={() => setActiveLeftTab('chunks')}
                                className={`px-3 py-1 text-xs rounded ${activeLeftTab === 'chunks' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                                disabled={!!loadError}
                             >
                                Semantic Chunks
                             </button>
                             <button
                                onClick={() => setActiveLeftTab('semantic')}
                                className={`px-3 py-1 text-xs rounded ${activeLeftTab === 'semantic' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                                disabled={!!loadError}
                             >
                                Semantic Audit
                             </button>
                         </div>
                        <div className="flex items-center gap-2">
                            {!loadError && originalContent && !isLoadingOriginal && (
                                <button
                                    onClick={() => loadContent(true)}
                                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                    title="Re-fetch content from source URL"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Re-fetch
                                </button>
                            )}
                            {isLoadingOriginal && <Loader className="w-4 h-4" />}
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-6 text-gray-400 bg-gray-900/50">
                        {loadError ? (
                            <div className="flex flex-col gap-4 h-full max-w-lg mx-auto mt-10">
                                <div className="bg-red-900/20 border border-red-700/50 p-4 rounded text-red-200 text-center">
                                    <p className="font-bold mb-1">Extraction Failed</p>
                                    <p className="text-sm mb-3">{loadError}</p>
                                    <Button variant="secondary" onClick={() => loadContent(true)} className="text-xs !py-1">Retry Scrape</Button>
                                </div>
                                
                                <div className="flex-grow flex flex-col gap-2">
                                    <Label>Manual Content Fallback</Label>
                                    <p className="text-xs text-gray-500 mb-1">
                                        If the automated scraper is blocked (e.g., Cloudflare), copy and paste the page text/markdown here manually to continue.
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
                        ) : (
                             activeLeftTab === 'raw' ? (
                                 originalContent ? (
                                     <SimpleMarkdown content={originalContent} />
                                 ) : (
                                     !isLoadingOriginal && <p className="text-center mt-20">No content found.</p>
                                 )
                             ) : activeLeftTab === 'chunks' ? (
                                 <div className="h-full">
                                     {isChunking ? (
                                         <div className="flex flex-col items-center justify-center h-full">
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
                                 <div className="h-full flex flex-col">
                                     {isAnalyzingSemantic ? (
                                         <div className="flex flex-col items-center justify-center h-full">
                                             <Loader />
                                             <p className="text-xs text-gray-500 mt-2">Running semantic analysis...</p>
                                         </div>
                                     ) : semanticError ? (
                                         <div className="text-red-400 p-4 text-center">{semanticError}</div>
                                     ) : !semanticResult ? (
                                         <div className="flex flex-col items-center justify-center h-full gap-4">
                                             {pillars ? (
                                                 <div className="text-center">
                                                     <p className="text-green-400 text-sm font-medium mb-2">Alignment Check Available</p>
                                                     <p className="text-gray-500 text-xs mb-1">Comparing against your defined framework:</p>
                                                     <p className="text-gray-400 text-xs">CE: {pillars.centralEntity}</p>
                                                     <p className="text-gray-400 text-xs">SC: {pillars.sourceContext}</p>
                                                     <p className="text-gray-400 text-xs">CSI: {pillars.centralSearchIntent}</p>
                                                 </div>
                                             ) : (
                                                 <p className="text-yellow-400 text-sm">No pillars defined - running detection mode</p>
                                             )}
                                             <Button
                                                 onClick={() => runSemanticAnalysis(false)}
                                                 disabled={!originalContent || isLoadingCachedSemantic}
                                             >
                                                 {isLoadingCachedSemantic ? 'Loading cached...' : pillars ? 'Check Alignment' : 'Detect Semantics'}
                                             </Button>
                                         </div>
                                     ) : (
                                         <div className="flex-grow overflow-y-auto p-4 space-y-4">
                                             {/* Re-analyze button */}
                                             <div className="flex justify-end">
                                                 <button
                                                     onClick={() => runSemanticAnalysis(true)}
                                                     disabled={isAnalyzingSemantic}
                                                     className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                                     title="Force re-analysis (ignore cache)"
                                                 >
                                                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                     </svg>
                                                     Re-analyze
                                                 </button>
                                             </div>

                                             {/* Core Entities */}
                                             {semanticResult.coreEntities && (
                                                 <div>
                                                     <h3 className="text-sm font-semibold text-white mb-2">Detected CE/SC/CSI</h3>
                                                     <CoreEntityBoxes entities={semanticResult.coreEntities} />
                                                 </div>
                                             )}

                                             {/* Alignment Scores (only shown when pillars were provided) */}
                                             {semanticResult.alignmentScores && (
                                                 <div className="bg-gray-800 p-3 rounded border-l-4 border-green-500">
                                                     <h3 className="text-sm font-semibold text-white mb-3">Pillar Alignment Scores</h3>
                                                     <div className="space-y-3">
                                                         {/* CE Alignment */}
                                                         <div>
                                                             <div className="flex justify-between text-xs mb-1">
                                                                 <span className="text-gray-400">Central Entity</span>
                                                                 <span className={`font-bold ${semanticResult.alignmentScores.ceAlignment >= 70 ? 'text-green-400' : semanticResult.alignmentScores.ceAlignment >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                     {semanticResult.alignmentScores.ceAlignment}%
                                                                 </span>
                                                             </div>
                                                             <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                                                                 <div
                                                                     className={`h-full transition-all duration-300 ${semanticResult.alignmentScores.ceAlignment >= 70 ? 'bg-green-500' : semanticResult.alignmentScores.ceAlignment >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                     style={{ width: `${semanticResult.alignmentScores.ceAlignment}%` }}
                                                                 />
                                                             </div>
                                                             {semanticResult.alignmentScores.ceGap !== 'Aligned' && (
                                                                 <p className="text-xs text-gray-500 mt-1">{semanticResult.alignmentScores.ceGap}</p>
                                                             )}
                                                         </div>

                                                         {/* SC Alignment */}
                                                         <div>
                                                             <div className="flex justify-between text-xs mb-1">
                                                                 <span className="text-gray-400">Source Context</span>
                                                                 <span className={`font-bold ${semanticResult.alignmentScores.scAlignment >= 70 ? 'text-green-400' : semanticResult.alignmentScores.scAlignment >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                     {semanticResult.alignmentScores.scAlignment}%
                                                                 </span>
                                                             </div>
                                                             <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                                                                 <div
                                                                     className={`h-full transition-all duration-300 ${semanticResult.alignmentScores.scAlignment >= 70 ? 'bg-green-500' : semanticResult.alignmentScores.scAlignment >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                     style={{ width: `${semanticResult.alignmentScores.scAlignment}%` }}
                                                                 />
                                                             </div>
                                                             {semanticResult.alignmentScores.scGap !== 'Aligned' && (
                                                                 <p className="text-xs text-gray-500 mt-1">{semanticResult.alignmentScores.scGap}</p>
                                                             )}
                                                         </div>

                                                         {/* CSI Alignment */}
                                                         <div>
                                                             <div className="flex justify-between text-xs mb-1">
                                                                 <span className="text-gray-400">Central Search Intent</span>
                                                                 <span className={`font-bold ${semanticResult.alignmentScores.csiAlignment >= 70 ? 'text-green-400' : semanticResult.alignmentScores.csiAlignment >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                     {semanticResult.alignmentScores.csiAlignment}%
                                                                 </span>
                                                             </div>
                                                             <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                                                                 <div
                                                                     className={`h-full transition-all duration-300 ${semanticResult.alignmentScores.csiAlignment >= 70 ? 'bg-green-500' : semanticResult.alignmentScores.csiAlignment >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                     style={{ width: `${semanticResult.alignmentScores.csiAlignment}%` }}
                                                                 />
                                                             </div>
                                                             {semanticResult.alignmentScores.csiGap !== 'Aligned' && (
                                                                 <p className="text-xs text-gray-500 mt-1">{semanticResult.alignmentScores.csiGap}</p>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}

                                             {/* Semantic Score */}
                                             {semanticResult.overallScore !== undefined && (
                                                 <div className="bg-gray-800 p-3 rounded">
                                                     <h3 className="text-sm font-semibold text-white mb-1">Overall Score</h3>
                                                     <div className="flex items-center gap-2">
                                                         <div className={`text-2xl font-bold ${semanticResult.overallScore >= 70 ? 'text-green-400' : semanticResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                             {semanticResult.overallScore}/100
                                                         </div>
                                                         <div className="flex-grow bg-gray-700 h-2 rounded-full overflow-hidden">
                                                             <div
                                                                 className={`h-full transition-all duration-300 ${semanticResult.overallScore >= 70 ? 'bg-green-500' : semanticResult.overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                 style={{ width: `${semanticResult.overallScore}%` }}
                                                             />
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}

                                             {/* Summary */}
                                             {semanticResult.summary && (
                                                 <div className="bg-gray-800 p-3 rounded">
                                                     <h3 className="text-sm font-semibold text-white mb-1">Summary</h3>
                                                     <p className="text-sm text-gray-300">{semanticResult.summary}</p>
                                                 </div>
                                             )}

                                             {/* Macro & Micro Analysis Summaries */}
                                             {(semanticResult.macroAnalysis || semanticResult.microAnalysis) && (
                                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                     {/* Macro Semantics */}
                                                     {semanticResult.macroAnalysis && (
                                                         <div className="bg-gradient-to-br from-blue-900/20 to-gray-800/50 p-4 rounded-lg border border-blue-500/30 shadow-lg">
                                                             <h4 className="text-sm font-bold text-blue-300 mb-4 flex items-center gap-2 pb-2 border-b border-blue-500/20">
                                                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                                 </svg>
                                                                 Macro Semantics
                                                                 <span className="text-[10px] font-normal text-blue-400/70 ml-auto">Structure & Hierarchy</span>
                                                             </h4>
                                                             <div className="space-y-4">
                                                                 {semanticResult.macroAnalysis.contextualVector && (
                                                                     <div className="bg-gray-900/50 rounded-md p-3">
                                                                         <div className="flex items-center gap-2 mb-2">
                                                                             <span className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider">H-Tag Flow</span>
                                                                             <span className="flex-1 h-px bg-blue-500/20"></span>
                                                                         </div>
                                                                         <div className="text-sm text-gray-200 leading-relaxed [&_strong]:text-blue-300 [&_p]:mb-2 [&_p:last-child]:mb-0">
                                                                             <SimpleMarkdown content={semanticResult.macroAnalysis.contextualVector} />
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                                 {semanticResult.macroAnalysis.hierarchy && (
                                                                     <div className="bg-gray-900/50 rounded-md p-3">
                                                                         <div className="flex items-center gap-2 mb-2">
                                                                             <span className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider">Hierarchy</span>
                                                                             <span className="flex-1 h-px bg-blue-500/20"></span>
                                                                         </div>
                                                                         <div className="text-sm text-gray-200 leading-relaxed [&_strong]:text-blue-300 [&_p]:mb-2 [&_p:last-child]:mb-0">
                                                                             <SimpleMarkdown content={semanticResult.macroAnalysis.hierarchy} />
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                                 {semanticResult.macroAnalysis.sourceContext && (
                                                                     <div className="bg-gray-900/50 rounded-md p-3">
                                                                         <div className="flex items-center gap-2 mb-2">
                                                                             <span className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider">Source Context</span>
                                                                             <span className="flex-1 h-px bg-blue-500/20"></span>
                                                                         </div>
                                                                         <div className="text-sm text-gray-200 leading-relaxed [&_strong]:text-blue-300 [&_p]:mb-2 [&_p:last-child]:mb-0">
                                                                             <SimpleMarkdown content={semanticResult.macroAnalysis.sourceContext} />
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         </div>
                                                     )}
                                                     {/* Micro Semantics */}
                                                     {semanticResult.microAnalysis && (
                                                         <div className="bg-gradient-to-br from-purple-900/20 to-gray-800/50 p-4 rounded-lg border border-purple-500/30 shadow-lg">
                                                             <h4 className="text-sm font-bold text-purple-300 mb-4 flex items-center gap-2 pb-2 border-b border-purple-500/20">
                                                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                 </svg>
                                                                 Micro Semantics
                                                                 <span className="text-[10px] font-normal text-purple-400/70 ml-auto">Linguistics & Density</span>
                                                             </h4>
                                                             <div className="space-y-4">
                                                                 {semanticResult.microAnalysis.sentenceStructure && (
                                                                     <div className="bg-gray-900/50 rounded-md p-3">
                                                                         <div className="flex items-center gap-2 mb-2">
                                                                             <span className="text-purple-400 text-[10px] font-semibold uppercase tracking-wider">Sentence Structure</span>
                                                                             <span className="flex-1 h-px bg-purple-500/20"></span>
                                                                         </div>
                                                                         <div className="text-sm text-gray-200 leading-relaxed [&_strong]:text-purple-300 [&_p]:mb-2 [&_p:last-child]:mb-0">
                                                                             <SimpleMarkdown content={semanticResult.microAnalysis.sentenceStructure} />
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                                 {semanticResult.microAnalysis.informationDensity && (
                                                                     <div className="bg-gray-900/50 rounded-md p-3">
                                                                         <div className="flex items-center gap-2 mb-2">
                                                                             <span className="text-purple-400 text-[10px] font-semibold uppercase tracking-wider">Information Density</span>
                                                                             <span className="flex-1 h-px bg-purple-500/20"></span>
                                                                         </div>
                                                                         <div className="text-sm text-gray-200 leading-relaxed [&_strong]:text-purple-300 [&_p]:mb-2 [&_p:last-child]:mb-0">
                                                                             <SimpleMarkdown content={semanticResult.microAnalysis.informationDensity} />
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                                 {semanticResult.microAnalysis.htmlSemantics && (
                                                                     <div className="bg-gray-900/50 rounded-md p-3">
                                                                         <div className="flex items-center gap-2 mb-2">
                                                                             <span className="text-purple-400 text-[10px] font-semibold uppercase tracking-wider">HTML Semantics</span>
                                                                             <span className="flex-1 h-px bg-purple-500/20"></span>
                                                                         </div>
                                                                         <div className="text-sm text-gray-200 leading-relaxed [&_strong]:text-purple-300 [&_p]:mb-2 [&_p:last-child]:mb-0">
                                                                             <SimpleMarkdown content={semanticResult.microAnalysis.htmlSemantics} />
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         </div>
                                                     )}
                                                 </div>
                                             )}

                                             {/* Action Plan & Roadmap */}
                                             {semanticResult.actions && semanticResult.actions.length > 0 && (
                                                 <div className="bg-gray-800/30 p-4 rounded border border-gray-700">
                                                     <h3 className="text-sm font-semibold text-white mb-1">Action Plan & Roadmap</h3>
                                                     <p className="text-xs text-gray-500 mb-4">Organized by impact. Click "Get Smart Fix" for AI-generated solutions.</p>

                                                     {/* Phase 1: Low Hanging Fruit */}
                                                     {(() => {
                                                         const lowHangingFruit = semanticResult.actions.filter(a => a.category === 'Low Hanging Fruit');
                                                         if (lowHangingFruit.length === 0) return null;
                                                         return (
                                                             <div className="mb-6">
                                                                 <h4 className="text-xs font-bold text-green-400 mb-3 flex items-center gap-2">
                                                                     <span className="bg-green-500/20 px-2 py-0.5 rounded">Phase 1</span>
                                                                     Low Hanging Fruit (Immediate)
                                                                 </h4>
                                                                 <div className="grid grid-cols-1 gap-3">
                                                                     {lowHangingFruit.map((action) => (
                                                                         <ActionItemCard key={action.id} action={action} pageContent={originalContent} businessInfo={businessInfo} dispatch={dispatch} />
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         );
                                                     })()}

                                                     {/* Phase 2: Mid Term */}
                                                     {(() => {
                                                         const midTerm = semanticResult.actions.filter(a => a.category === 'Mid Term');
                                                         if (midTerm.length === 0) return null;
                                                         return (
                                                             <div className="mb-6">
                                                                 <h4 className="text-xs font-bold text-yellow-400 mb-3 flex items-center gap-2">
                                                                     <span className="bg-yellow-500/20 px-2 py-0.5 rounded">Phase 2</span>
                                                                     Mid Term
                                                                 </h4>
                                                                 <div className="grid grid-cols-1 gap-3">
                                                                     {midTerm.map((action) => (
                                                                         <ActionItemCard key={action.id} action={action} pageContent={originalContent} businessInfo={businessInfo} dispatch={dispatch} />
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         );
                                                     })()}

                                                     {/* Phase 3: Long Term */}
                                                     {(() => {
                                                         const longTerm = semanticResult.actions.filter(a => a.category === 'Long Term');
                                                         if (longTerm.length === 0) return null;
                                                         return (
                                                             <div className="mb-2">
                                                                 <h4 className="text-xs font-bold text-orange-400 mb-3 flex items-center gap-2">
                                                                     <span className="bg-orange-500/20 px-2 py-0.5 rounded">Phase 3</span>
                                                                     Long Term
                                                                 </h4>
                                                                 <div className="grid grid-cols-1 gap-3">
                                                                     {longTerm.map((action) => (
                                                                         <ActionItemCard key={action.id} action={action} pageContent={originalContent} businessInfo={businessInfo} dispatch={dispatch} />
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         );
                                                     })()}
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             )
                        )}
                    </div>
                </div>

                {/* RIGHT: New Draft (Editor) */}
                <div className="w-1/2 flex flex-col bg-gray-900">
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                         <span className="font-semibold text-white text-sm">New Content (Editor)</span>
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
                                {/* Add explicit id for easier targeting if needed */}
                                <textarea 
                                    ref={textareaRef as any}
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    className="w-full h-full min-h-full resize-none bg-gray-900 text-gray-200 border-none p-6 focus:ring-0 font-mono text-sm leading-relaxed absolute inset-0"
                                    placeholder="Start rewriting here... Drag & Drop chunks from the left to assemble content."
                                />
                                {activeLeftTab === 'chunks' && chunks.length > 0 && !draftContent && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-gray-600 bg-gray-900/80 p-2 rounded border border-gray-700 border-dashed">
                                            Drag semantic chunks here to start
                                        </p>
                                    </div>
                                )}
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
