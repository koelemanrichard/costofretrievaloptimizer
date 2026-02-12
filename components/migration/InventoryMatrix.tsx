
import React, { useState, useMemo } from 'react';
import { SiteInventoryItem, ActionType } from '../../types';
import { AuditButton } from '../audit/AuditButton';

interface InventoryMatrixProps {
    inventory: SiteInventoryItem[];
    onSelect?: (item: SiteInventoryItem) => void;
    onAction?: (itemId: string, action: ActionType) => void;
    onPromote?: (itemId: string) => void;
}

type SortField = 'url' | 'gsc_clicks' | 'gsc_impressions' | 'cor_score' | 'status';
type SortDirection = 'asc' | 'desc';

export const InventoryMatrix: React.FC<InventoryMatrixProps> = ({ inventory, onSelect, onAction, onPromote }) => {
    const [sortField, setSortField] = useState<SortField>('gsc_clicks');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedInventory = useMemo(() => {
        return [...inventory].sort((a, b) => {
            const aVal = a[sortField] || 0;
            const bVal = b[sortField] || 0;

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' 
                    ? aVal.localeCompare(bVal) 
                    : bVal.localeCompare(aVal);
            }
            
            return sortDirection === 'asc' 
                ? (aVal as number) - (bVal as number) 
                : (bVal as number) - (aVal as number);
        });
    }, [inventory, sortField, sortDirection]);

    const getCoRColor = (score: number | undefined) => {
        if (score === undefined) return 'text-gray-500';
        if (score > 70) return 'text-red-400';
        if (score > 30) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'OPTIMIZED': return 'bg-green-900/50 text-green-300 border-green-700';
            case 'GAP_ANALYSIS': return 'bg-blue-900/50 text-blue-300 border-blue-700';
            case 'ACTION_REQUIRED': return 'bg-red-900/50 text-red-300 border-red-700';
            default: return 'bg-gray-800 text-gray-400 border-gray-700';
        }
    };

    const handleDragStart = (e: React.DragEvent, item: SiteInventoryItem) => {
        e.dataTransfer.setData('application/x-inventory-id', item.id);
        e.dataTransfer.effectAllowed = 'link';
    };

    return (
        <div className="h-full flex flex-col bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden" onClick={() => setOpenMenuId(null)}>
            <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-3 flex justify-between items-center">
                <h3 className="font-semibold text-white">Site Inventory ({inventory.length})</h3>
                <div className="text-xs text-gray-400 flex gap-4">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div> Low Cost</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> High Cost</span>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800/80 text-xs uppercase text-gray-400 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="p-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('url')}>
                                URL {sortField === 'url' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('gsc_clicks')}>
                                Clicks {sortField === 'gsc_clicks' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-3 font-medium text-center cursor-pointer hover:text-white" onClick={() => handleSort('cor_score')}>
                                CoR {sortField === 'cor_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-3 font-medium text-center cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm">
                        {sortedInventory.map(item => (
                            <tr 
                                key={item.id} 
                                className={`hover:bg-gray-800/50 cursor-pointer transition-colors ${item.mapped_topic_id ? 'bg-blue-900/10' : ''}`}
                                onClick={() => onSelect && onSelect(item)}
                                draggable={!item.mapped_topic_id} 
                                onDragStart={(e) => handleDragStart(e, item)}
                            >
                                <td className="p-3 max-w-[200px]" title={item.url}>
                                    <div className="flex items-center gap-2">
                                        {item.mapped_topic_id && <span title="Mapped">🔗</span>}
                                        <span className="truncate text-gray-300">{item.url.replace(/^https?:\/\/[^/]+/, '')}</span>
                                        <AuditButton url={item.url} variant="icon" size="sm" />
                                    </div>
                                </td>
                                <td className="p-3 text-right text-white font-mono">
                                    {item.gsc_clicks?.toLocaleString() || '-'}
                                </td>
                                <td className={`p-3 text-center font-bold ${getCoRColor(item.cor_score)}`}>
                                    {item.cor_score !== undefined ? item.cor_score : '?'}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${getStatusBadge(item.status)}`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-3 text-center relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === item.id ? null : item.id);
                                        }}
                                        className="text-gray-500 hover:text-white p-1"
                                    >
                                        ⋮
                                    </button>
                                    {openMenuId === item.id && onAction && (
                                        <div className="absolute right-8 top-2 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 w-48 py-1 flex flex-col text-left">
                                            <button className="px-4 py-2 text-xs text-red-400 hover:bg-gray-700" onClick={() => onAction(item.id, 'PRUNE_410')}>
                                                Mark as Prune (410)
                                            </button>
                                            <button className="px-4 py-2 text-xs text-gray-300 hover:bg-gray-700" onClick={() => onAction(item.id, 'KEEP')}>
                                                Mark as Keep (Orphan)
                                            </button>
                                            <div className="border-t border-gray-700 my-1"></div>
                                            <button 
                                                className="px-4 py-2 text-xs text-blue-400 hover:bg-gray-700" 
                                                onClick={() => onPromote && onPromote(item.id)}
                                                disabled={!onPromote}
                                            >
                                                Promote to New Core Topic
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {inventory.length === 0 && (
                     <div className="p-8 text-center text-gray-500">
                        No inventory items found. Import a sitemap to get started.
                    </div>
                )}
            </div>
        </div>
    );
};
