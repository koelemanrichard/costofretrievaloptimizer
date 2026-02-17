import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { SiteInventoryItem, EnrichedTopic } from '../../types';
import { generateRedirectMap, generatePruneList } from '../../utils/migrationExportUtils';

// ── Overlay Export Types ───────────────────────────────────────────────────

export interface OverlayExportNode {
  topicTitle: string;
  status: string;
  statusColor: string;
  matchedPages: {
    url: string;
    alignmentScore?: number;
    gscClicks?: number;
    auditScore?: number;
    actionNeeded?: string;
  }[];
}

// ── Export Functions ────────────────────────────────────────────────────────

export function exportOverlayStatusCsv(nodes: OverlayExportNode[]): string {
  const headers = ['Topic', 'Status', 'Color', 'Matched URL', 'Alignment Score', 'GSC Clicks', 'Audit Score', 'Action'];
  const rows: string[] = [];

  for (const node of nodes) {
    if (node.matchedPages.length === 0) {
      rows.push(
        [
          node.topicTitle,
          node.status,
          node.statusColor,
          '',
          '',
          '',
          '',
          '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
    } else {
      for (const page of node.matchedPages) {
        rows.push(
          [
            node.topicTitle,
            node.status,
            node.statusColor,
            page.url || '',
            page.alignmentScore?.toString() || '',
            page.gscClicks?.toString() || '',
            page.auditScore?.toString() || '',
            page.actionNeeded || '',
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
        );
      }
    }
  }

  return [headers.join(','), ...rows].join('\n');
}

export function exportRedirectMapCsv(inventory: SiteInventoryItem[]): string {
  const headers = ['Source URL', 'Target URL', 'Action'];
  const rows = inventory
    .filter(i => i.recommended_action === 'REDIRECT_301' || i.recommended_action === 'MERGE')
    .map(i => [
      `"${(i.url || '').replace(/"/g, '""')}"`,
      '""',
      `"${(i.recommended_action || '').replace(/"/g, '""')}"`,
    ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────

interface ExportPanelProps {
    inventory: SiteInventoryItem[];
    topics: EnrichedTopic[];
    overlayNodes?: OverlayExportNode[];
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ inventory, topics, overlayNodes }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleExport = (type: 'csv' | 'htaccess' | 'nginx' | 'prune') => {
        if (type === 'prune') {
            generatePruneList(inventory);
        } else {
            generateRedirectMap(inventory, topics, type);
        }
        setIsOpen(false);
    };

    const handleExportOverlay = useCallback(() => {
        if (!overlayNodes || overlayNodes.length === 0) return;
        const csv = exportOverlayStatusCsv(overlayNodes);
        downloadCsv(csv, `overlay-status-${new Date().toISOString().slice(0, 10)}.csv`);
        setIsOpen(false);
    }, [overlayNodes]);

    const handleExportRecommendedRedirects = useCallback(() => {
        const csv = exportRedirectMapCsv(inventory);
        downloadCsv(csv, `redirect-map-${new Date().toISOString().slice(0, 10)}.csv`);
        setIsOpen(false);
    }, [inventory]);

    const redirectCount = inventory.filter(
        i => i.recommended_action === 'REDIRECT_301' || i.recommended_action === 'MERGE'
    ).length;

    return (
        <div className="relative inline-block text-left">
            <Button
                variant="secondary"
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs py-2 flex items-center gap-2"
            >
                <span>Export Plan</span>
            </Button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-gray-800 border border-gray-700 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu">
                        {/* Legacy redirect exports */}
                        <button
                            onClick={() => handleExport('csv')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                        >
                            Redirect Map (CSV)
                        </button>
                        <button
                            onClick={() => handleExport('htaccess')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                        >
                            Redirects (.htaccess)
                        </button>
                        <button
                            onClick={() => handleExport('nginx')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                        >
                            Redirects (Nginx)
                        </button>

                        <div className="border-t border-gray-700 my-1"></div>

                        {/* Recommended redirect map from migration plan */}
                        <button
                            onClick={handleExportRecommendedRedirects}
                            disabled={redirectCount === 0}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                            role="menuitem"
                        >
                            Redirect Map — Plan ({redirectCount} URLs)
                        </button>

                        {/* Overlay status export */}
                        {overlayNodes && overlayNodes.length > 0 && (
                            <button
                                onClick={handleExportOverlay}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                                role="menuitem"
                            >
                                Overlay Status CSV ({overlayNodes.length} topics)
                            </button>
                        )}

                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                            onClick={() => handleExport('prune')}
                            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
                            role="menuitem"
                        >
                            Prune List (410)
                        </button>
                    </div>
                </div>
            )}
             {/* Click outside to close overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}
        </div>
    );
};