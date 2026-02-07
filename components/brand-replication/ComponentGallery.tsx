/**
 * Component Gallery
 *
 * Displays discovered visual components from Phase 1-2 of the brand replication pipeline.
 * Shows source screenshots alongside generated previews with match scores.
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import type { BrandComponent, DiscoveredComponent } from '../../services/brand-replication/interfaces';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// ============================================================================
// Types
// ============================================================================

export interface ComponentGalleryProps {
  /** Discovered components from Phase 1 */
  discoveredComponents: DiscoveredComponent[];
  /** Generated brand components from Phase 2 */
  brandComponents: BrandComponent[];
  /** Screenshots from discovery */
  screenshots?: { url: string; path: string }[];
  /** Callback when component is edited */
  onEditComponent?: (componentId: string) => void;
  /** Callback when component is removed */
  onRemoveComponent?: (componentId: string) => void;
  /** Callback to add custom component */
  onAddComponent?: () => void;
  /** Currently selected component ID */
  selectedComponentId?: string;
  /** Callback when component is selected */
  onSelectComponent?: (componentId: string) => void;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const matchScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-400';
  if (score >= 80) return 'text-yellow-400';
  if (score >= 70) return 'text-orange-400';
  return 'text-red-400';
};

const matchScoreBg = (score: number): string => {
  if (score >= 90) return 'bg-green-900/30';
  if (score >= 80) return 'bg-yellow-900/30';
  if (score >= 70) return 'bg-orange-900/30';
  return 'bg-red-900/30';
};

// ============================================================================
// Component
// ============================================================================

export const ComponentGallery: React.FC<ComponentGalleryProps> = ({
  discoveredComponents,
  brandComponents,
  screenshots: _screenshots = [],
  onEditComponent,
  onRemoveComponent,
  onAddComponent,
  selectedComponentId,
  onSelectComponent,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewComponent, setPreviewComponent] = useState<string | null>(null);

  // Match discovered components to their brand components
  const componentPairs = discoveredComponents.map(discovered => {
    const brandComp = brandComponents.find(bc => bc.sourceComponent?.id === discovered.id);
    return { discovered, brand: brandComp };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p>Loading components...</p>
        </div>
      </div>
    );
  }

  if (componentPairs.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p className="text-lg mb-4">No components discovered yet</p>
        <p className="text-sm">Run Phase 1 Discovery to analyze the brand website</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">
            Component Library ({componentPairs.length})
          </h3>
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
        {onAddComponent && (
          <Button onClick={onAddComponent} variant="outline" size="sm">
            + Add Custom
          </Button>
        )}
      </div>

      {/* Component Grid/List */}
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        : 'space-y-3'
      }>
        {componentPairs.map(({ discovered, brand }) => (
          <ComponentCard
            key={discovered.id}
            discovered={discovered}
            brand={brand}
            isSelected={selectedComponentId === discovered.id}
            isExpanded={previewComponent === discovered.id}
            viewMode={viewMode}
            onSelect={() => onSelectComponent?.(discovered.id)}
            onToggleExpand={() => setPreviewComponent(
              previewComponent === discovered.id ? null : discovered.id
            )}
            onEdit={() => onEditComponent?.(discovered.id)}
            onRemove={() => onRemoveComponent?.(discovered.id)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-zinc-500 pt-4 border-t border-zinc-800">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-900/30" /> 90%+ match
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-900/30" /> 80-89% match
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-900/30" /> 70-79% match
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-900/30" /> &lt;70% match
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// ComponentCard Sub-component
// ============================================================================

interface ComponentCardProps {
  discovered: DiscoveredComponent;
  brand?: BrandComponent;
  isSelected: boolean;
  isExpanded: boolean;
  viewMode: 'grid' | 'list';
  onSelect: () => void;
  onToggleExpand: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  discovered,
  brand,
  isSelected,
  isExpanded,
  viewMode,
  onSelect,
  onToggleExpand,
  onEdit,
  onRemove,
}) => {
  const matchScore = brand?.matchScore ?? 0;
  const hasCode = !!brand?.css;

  return (
    <div
      onClick={onSelect}
      className={`
        border rounded-lg overflow-hidden transition-all cursor-pointer
        ${isSelected
          ? 'border-blue-500 ring-1 ring-blue-500/50'
          : 'border-zinc-700 hover:border-zinc-600'
        }
        ${viewMode === 'list' ? 'flex' : ''}
        bg-zinc-900/60
      `}
    >
      {/* Header */}
      <div className={`p-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white text-sm truncate">
              {discovered.name}
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
              {discovered.purpose}
            </p>
          </div>
          {hasCode && (
            <span className={`
              px-2 py-0.5 text-xs font-medium rounded
              ${matchScoreBg(matchScore)} ${matchScoreColor(matchScore)}
            `}>
              {matchScore}%
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          <span>{discovered.occurrences}x seen</span>
          <span>{Math.round(discovered.confidence * 100)}% confidence</span>
          {hasCode && <span className="text-green-400">Generated</span>}
        </div>

        {/* Usage Context */}
        <p className="text-xs text-zinc-400 mt-2 line-clamp-2 italic">
          &quot;{discovered.usageContext}&quot;
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {isExpanded ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Expanded Preview */}
      {isExpanded && brand && (
        <div className="border-t border-zinc-800 p-3 bg-zinc-950/50">
          <div className="text-xs text-zinc-500 mb-2">Live Preview:</div>
          <div
            className="bg-white rounded overflow-hidden"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(brand.previewHtml) }}
          />
        </div>
      )}
    </div>
  );
};

export default ComponentGallery;
