
import React, { useState, useEffect, useMemo } from 'react';
import { SiteInventoryItem, EnrichedTopic, ActionType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { AuditButton } from '../audit/AuditButton';

interface TriageViewProps {
    inventory: SiteInventoryItem[];
    targetTopics: EnrichedTopic[];
    onAction: (itemId: string, action: ActionType) => void;
    onMap: (inventoryId: string, topicId: string, action: ActionType) => void;
}

export const TriageView: React.FC<TriageViewProps> = ({ inventory, targetTopics, onAction, onMap }) => {
    // Filter for items that need triage (items without a set action, or in preliminary status)
    const todoItems = useMemo(() => {
        return inventory.filter(i => !i.action || i.status === 'AUDIT_PENDING' || i.status === 'GAP_ANALYSIS');
    }, [inventory]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [aiSuggestion, setAiSuggestion] = useState<{ topic: EnrichedTopic, reasoning: string } | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const currentItem = todoItems[currentIndex];

    // When current item changes, try to find a match if not mapped
    useEffect(() => {
        if (!currentItem) return;
        setAiSuggestion(null);

        // If already mapped, show that context
        if (currentItem.mapped_topic_id) {
            const topic = targetTopics.find(t => t.id === currentItem.mapped_topic_id);
            if (topic) {
                setAiSuggestion({ topic, reasoning: "Previously mapped to this topic." });
            }
            return;
        }

        // Simulate a quick local match heuristic (since real AI matchmaker is batch)
        const runMatch = async () => {
            setIsLoadingAI(true);
            try {
                // Simple string similarity heuristic for immediate feedback
                const matches = targetTopics.map(t => {
                    let score = 0;
                    if (currentItem.title && t.title.toLowerCase().includes(currentItem.title.toLowerCase())) score += 2;
                    if (currentItem.url.toLowerCase().includes(t.slug.toLowerCase())) score += 3;
                    return { topic: t, score };
                }).sort((a, b) => b.score - a.score);

                if (matches[0] && matches[0].score > 0) {
                    setAiSuggestion({ 
                        topic: matches[0].topic, 
                        reasoning: "High keyword similarity in URL or Title." 
                    });
                }
            } finally {
                setIsLoadingAI(false);
            }
        };
        runMatch();
    }, [currentItem, targetTopics]);

    const handleNext = () => {
        if (currentIndex < todoItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleDecision = (action: ActionType) => {
        if (!currentItem) return;
        
        if (aiSuggestion && !currentItem.mapped_topic_id) {
            // If we have a suggestion and haven't mapped it yet, map it now
            onMap(currentItem.id, aiSuggestion.topic.id, action);
        } else {
            // Otherwise just update the action (e.g. Prune doesn't need a map)
            onAction(currentItem.id, action);
        }
        // Auto advance
        handleNext();
    };

    if (!currentItem) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-xl font-bold text-white">Triage Complete!</p>
                <p className="max-w-md text-center mt-2">All items in the current view have been processed. Check the Matrix or Kanban board to review your strategy.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full">
            {/* Progress Bar */}
            <div className="w-full mb-6">
                <div className="flex justify-between items-end text-xs text-gray-400 mb-1">
                    <span>Processing {currentIndex + 1} of {todoItems.length}</span>
                    <span>{Math.round(((currentIndex + 1) / todoItems.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / todoItems.length) * 100}%` }}></div>
                </div>
            </div>

            {/* Main Triage Card */}
            <Card className="w-full p-0 relative overflow-hidden border-2 border-blue-500/30 shadow-2xl bg-gray-900/90 flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                
                <div className="p-6 md:p-8">
                    {/* Item Header */}
                    <div className="mb-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1 line-clamp-2" title={currentItem.title || 'Untitled'}>
                                    {currentItem.title || 'Untitled Page'}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <a href={currentItem.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm font-mono break-all">
                                        {currentItem.url}
                                    </a>
                                    <AuditButton url={currentItem.url} variant="icon" size="sm" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${currentItem.cor_score && currentItem.cor_score > 70 ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                                    CoR: {currentItem.cor_score || '?'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 mt-4 text-sm">
                             <div className="bg-gray-800 px-3 py-1.5 rounded border border-gray-700 flex items-center gap-2">
                                <span className="text-gray-400 text-xs uppercase font-bold">Traffic</span>
                                <span className="text-white font-mono">{currentItem.gsc_clicks} clicks</span>
                             </div>
                             <div className="bg-gray-800 px-3 py-1.5 rounded border border-gray-700 flex items-center gap-2">
                                <span className="text-gray-400 text-xs uppercase font-bold">Status</span>
                                <span className="text-gray-300">{currentItem.status.replace('_', ' ')}</span>
                             </div>
                        </div>
                    </div>

                    {/* AI Insight Box */}
                    <div className="mb-8 bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-lg flex items-start gap-4">
                        <div className="text-2xl mt-1">🤖</div>
                        <div className="flex-grow">
                            <h3 className="text-indigo-300 font-bold text-xs uppercase tracking-wide mb-1">AI Insight</h3>
                            {isLoadingAI ? (
                                <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader className="w-3 h-3" /> Analyzing...</div>
                            ) : aiSuggestion ? (
                                <>
                                    <p className="text-gray-200 text-sm">
                                        Suggested Match: <strong className="text-white">{aiSuggestion.topic.title}</strong>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{aiSuggestion.reasoning}</p>
                                </>
                            ) : (
                                <p className="text-gray-400 text-sm italic">No obvious direct match found in target strategy.</p>
                            )}
                        </div>
                    </div>

                    {/* Primary Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button 
                            onClick={() => handleDecision('REDIRECT_301')} 
                            className="bg-green-700 hover:bg-green-600 border border-green-500/50 h-auto py-4 flex flex-col items-center justify-center gap-1 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">↩️</span>
                            <span className="font-bold">Redirect (301)</span>
                            <span className="text-[10px] font-normal opacity-80">Pass equity to target</span>
                        </Button>

                        <Button 
                            onClick={() => handleDecision('REWRITE')} 
                            className="bg-blue-700 hover:bg-blue-600 border border-blue-500/50 h-auto py-4 flex flex-col items-center justify-center gap-1 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">✏️</span>
                            <span className="font-bold">Rewrite</span>
                            <span className="text-[10px] font-normal opacity-80">Optimize in workbench</span>
                        </Button>

                        <Button 
                            onClick={() => handleDecision('PRUNE_410')} 
                            variant="secondary" 
                            className="h-auto py-4 flex flex-col items-center justify-center gap-1 hover:text-red-400 hover:border-red-500/50 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">🗑️</span>
                            <span className="font-bold">Prune (410)</span>
                            <span className="text-[10px] font-normal opacity-70">Remove low value page</span>
                        </Button>
                    </div>
                    
                    <div className="mt-6 text-center">
                        <button onClick={handleNext} className="text-gray-500 hover:text-white text-xs underline decoration-dotted">
                            Skip this item for now
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
