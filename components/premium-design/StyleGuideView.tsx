// =============================================================================
// StyleGuideView — Main review UI for extracted style guide elements
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import type { StyleGuide, StyleGuideCategory, StyleGuideElement, StyleGuideColor } from '../../types/styleGuide';
import { StyleGuideElementCard } from './StyleGuideElementCard';
import { ColorPaletteView } from './ColorPaletteView';

// =============================================================================
// Types
// =============================================================================

interface StyleGuideViewProps {
  styleGuide: StyleGuide;
  onApprove: (guide: StyleGuide) => void;
  onReextract: () => void;
  onExport: () => void;
  onRefineElement?: (elementId: string) => void;
  isRefining?: boolean;
  onChange?: (guide: StyleGuide) => void;
}

const CATEGORY_TABS: { key: StyleGuideCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'typography', label: 'Typography' },
  { key: 'buttons', label: 'Buttons' },
  { key: 'cards', label: 'Cards' },
  { key: 'navigation', label: 'Nav' },
  { key: 'accordions', label: 'Acc.' },
  { key: 'backgrounds', label: 'Bg' },
  { key: 'section-breaks', label: 'Div.' },
  { key: 'images', label: 'Img' },
  { key: 'tables', label: 'Tbl' },
  { key: 'forms', label: 'Forms' },
  { key: 'colors', label: 'Colors' },
];

// =============================================================================
// Component
// =============================================================================

export const StyleGuideView: React.FC<StyleGuideViewProps> = ({
  styleGuide,
  onApprove,
  onReextract,
  onExport,
  onRefineElement,
  isRefining,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<StyleGuideCategory | 'all'>('all');
  const [guide, setGuide] = useState<StyleGuide>(styleGuide);

  // Update local state and notify parent
  const updateGuide = useCallback((updated: StyleGuide) => {
    setGuide(updated);
    onChange?.(updated);
  }, [onChange]);

  // Filter elements by category
  const filteredElements = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'colors') return guide.elements;
    return guide.elements.filter(el => el.category === activeTab);
  }, [guide.elements, activeTab]);

  // Count elements per category (for tab badges)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: guide.elements.length };
    for (const el of guide.elements) {
      counts[el.category] = (counts[el.category] || 0) + 1;
    }
    counts['colors'] = guide.colors.length;
    return counts;
  }, [guide.elements, guide.colors]);

  // Approval stats
  const approvedCount = guide.elements.filter(e => e.approvalStatus === 'approved').length;
  const rejectedCount = guide.elements.filter(e => e.approvalStatus === 'rejected').length;
  const totalCount = guide.elements.length;

  // Element approval handlers
  const handleElementApprove = useCallback((id: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, approvalStatus: 'approved' as const } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleElementReject = useCallback((id: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, approvalStatus: 'rejected' as const } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleElementComment = useCallback((id: string, comment: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, userComment: comment } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleReferenceImage = useCallback((id: string, base64: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, referenceImageBase64: base64 } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleReferenceUrl = useCallback((id: string, url: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, referenceUrl: url } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  // Color approval handlers
  const handleColorApprove = useCallback((hex: string) => {
    const updated = {
      ...guide,
      colors: guide.colors.map(c =>
        c.hex === hex ? { ...c, approvalStatus: 'approved' as const } : c
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleColorReject = useCallback((hex: string) => {
    const updated = {
      ...guide,
      colors: guide.colors.map(c =>
        c.hex === hex ? { ...c, approvalStatus: 'rejected' as const } : c
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  // Approve all handler
  const handleApproveAll = useCallback(() => {
    const finalGuide: StyleGuide = {
      ...guide,
      isApproved: true,
      approvedAt: new Date().toISOString(),
    };
    onApprove(finalGuide);
  }, [guide, onApprove]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">
            Style Guide for {guide.hostname}
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {guide.elementCount} elements extracted &middot; {guide.colors.length} colors detected
            &middot; {Math.round(guide.extractionDurationMs / 1000)}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReextract}
            className="px-2.5 py-1 text-[11px] bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
            disabled={isRefining}
          >
            Re-extract
          </button>
          <button
            onClick={onExport}
            className="px-2.5 py-1 text-[11px] bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto py-2 border-b border-zinc-800">
        {CATEGORY_TABS.map(tab => {
          const count = categoryCounts[tab.key] || 0;
          if (count === 0 && tab.key !== 'all') return null;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-2.5 py-1 text-[11px] rounded whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {activeTab === 'colors' ? (
          <ColorPaletteView
            colors={guide.colors}
            onApprove={handleColorApprove}
            onReject={handleColorReject}
          />
        ) : (
          filteredElements.length > 0 ? (
            filteredElements.map(element => (
              <StyleGuideElementCard
                key={element.id}
                element={element}
                onApprove={handleElementApprove}
                onReject={handleElementReject}
                onComment={handleElementComment}
                onRefine={onRefineElement}
                onReferenceImage={handleReferenceImage}
                onReferenceUrl={handleReferenceUrl}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">No elements in this category</p>
            </div>
          )
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <p className="text-[11px] text-zinc-500">
          {approvedCount}/{totalCount} approved
          {rejectedCount > 0 && <span> &middot; {rejectedCount} rejected</span>}
        </p>
        <button
          onClick={handleApproveAll}
          disabled={isRefining}
          className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
        >
          {isRefining ? 'Refining...' : 'Approve Style Guide & Continue \u2192'}
        </button>
      </div>
    </div>
  );
};

export default StyleGuideView;
