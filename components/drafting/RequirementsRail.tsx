
import React, { useMemo } from 'react';
import { ContentBrief, SemanticTriple, ContextualBridgeLink } from '../../types';
import { ProgressCircle } from '../ui/ProgressCircle';
import { Card } from '../ui/Card';
import { safeString } from '../../utils/parsers';

interface RequirementsRailProps {
    brief: ContentBrief;
    draftContent: string;
    mapEavs?: SemanticTriple[];  // EAVs from the topical map (preferred source)
}

interface ChecklistItem {
    id: string;
    label: string;
    isMet: boolean;
    type: 'KEYWORD' | 'EAV' | 'LINK';
}

export const RequirementsRail: React.FC<RequirementsRailProps> = ({ brief, draftContent, mapEavs }) => {

    const analysis = useMemo(() => {
        const text = draftContent.toLowerCase();
        const items: ChecklistItem[] = [];
        let metCount = 0;

        // 1. Check Key Takeaways (Keywords)
        const takeaways = brief.keyTakeaways || [];
        takeaways.forEach((tk, idx) => {
            // Simple inclusion check. For long takeaways, checking for the whole string matches.
            // Ideally, takeaways should be concise.
            const isMet = text.includes(tk.toLowerCase());
            if (isMet) metCount++;
            items.push({
                id: `tk-${idx}`,
                label: tk,
                isMet,
                type: 'KEYWORD'
            });
        });

        // 2. Check Semantic Triples (EAVs)
        // Prefer map-level EAVs (from topical map), fall back to brief.contextualVectors
        const triples = mapEavs && mapEavs.length > 0 ? mapEavs : (brief.contextualVectors || []);
        // Limit to top 10 to avoid UI clutter
        triples.slice(0, 10).forEach((triple: SemanticTriple, idx) => {
            // Defensive: skip malformed triples
            if (!triple || !triple.object || !triple.subject) return;

            // Check if Object Value matches (most distinct part)
            const val = String(triple.object.value || '').toLowerCase();
            if (!val) return; // Skip if no value to check

            const isMet = text.includes(val);
            if (isMet) metCount++;
            items.push({
                id: `eav-${idx}`,
                label: `${triple.subject.label || 'Unknown'} → ${triple.object.value || 'Unknown'}`,
                isMet,
                type: 'EAV'
            });
        });

        // 3. Check Internal Links
        const bridge = brief.contextualBridge;
        let links: ContextualBridgeLink[] = [];
        if (Array.isArray(bridge)) links = bridge;
        else if (bridge && typeof bridge === 'object' && 'links' in bridge) links = bridge.links;

        links.forEach((link, idx) => {
            // Check if Anchor Text is present
            const anchor = link.anchorText.toLowerCase();
            const isMet = text.includes(anchor);
            if (isMet) metCount++;
            items.push({
                id: `link-${idx}`,
                label: `Link: ${link.anchorText}`,
                isMet,
                type: 'LINK'
            });
        });

        const total = items.length;
        const score = total > 0 ? Math.round((metCount / total) * 100) : 0;

        return { items, score };
    }, [brief, draftContent, mapEavs]);

    return (
        <div className="h-full flex flex-col bg-gray-800 border-l border-gray-700 w-80 flex-shrink-0">
            <div className="p-4 border-b border-gray-700 bg-gray-900/50">
                <h3 className="text-sm font-bold text-white mb-2">Content Requirements</h3>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Semantic Density</span>
                    <span className={`text-lg font-bold ${analysis.score > 80 ? 'text-green-400' : analysis.score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {analysis.score}%
                    </span>
                </div>
                <div className="mt-2 w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ${analysis.score > 80 ? 'bg-green-500' : analysis.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${analysis.score}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                
                {/* Keywords Section */}
                <div>
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Key Concepts</h4>
                    <div className="space-y-2">
                        {analysis.items.filter(i => i.type === 'KEYWORD').map(item => (
                            <div key={item.id} className={`text-sm flex items-start gap-2 ${item.isMet ? 'opacity-50' : 'opacity-100'}`}>
                                <span className={item.isMet ? 'text-green-400' : 'text-gray-600'}>
                                    {item.isMet ? '✓' : '○'}
                                </span>
                                <span className={item.isMet ? 'text-gray-400 line-through' : 'text-gray-200'}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                        {analysis.items.filter(i => i.type === 'KEYWORD').length === 0 && <p className="text-xs text-gray-500 italic">No keywords defined.</p>}
                    </div>
                </div>

                {/* Internal Links Section */}
                <div>
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Internal Links</h4>
                    <div className="space-y-2">
                        {analysis.items.filter(i => i.type === 'LINK').map(item => (
                            <div key={item.id} className={`text-sm flex items-start gap-2 ${item.isMet ? 'opacity-50' : 'opacity-100'}`}>
                                <span className={item.isMet ? 'text-green-400' : 'text-blue-500'}>
                                    {item.isMet ? '✓' : '🔗'}
                                </span>
                                <span className={item.isMet ? 'text-gray-400 line-through' : 'text-blue-200'}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                         {analysis.items.filter(i => i.type === 'LINK').length === 0 && <p className="text-xs text-gray-500 italic">No links required.</p>}
                    </div>
                </div>

                {/* EAV Section */}
                <div>
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Fact Inclusion (EAV)</h4>
                    <div className="space-y-2">
                        {analysis.items.filter(i => i.type === 'EAV').map(item => (
                            <div key={item.id} className={`text-xs flex items-start gap-2 ${item.isMet ? 'opacity-50' : 'opacity-100'}`}>
                                <span className={item.isMet ? 'text-green-400' : 'text-purple-500'}>
                                    {item.isMet ? '✓' : '•'}
                                </span>
                                <span className={item.isMet ? 'text-gray-400' : 'text-purple-200'}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                        {analysis.items.filter(i => i.type === 'EAV').length === 0 && <p className="text-xs text-gray-500 italic">No EAVs defined.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
};
