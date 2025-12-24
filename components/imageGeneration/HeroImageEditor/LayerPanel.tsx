/**
 * Layer Panel Component
 *
 * Displays and manages the layer list with drag-drop reordering,
 * visibility toggles, and layer selection.
 */

import React, { useCallback } from 'react';
import {
  HeroLayerConfig,
  HeroLayerType
} from '../../../types';

// ============================================
// TYPES
// ============================================

interface LayerPanelProps {
  layers: HeroLayerConfig[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onAddLayer: (type: HeroLayerType) => void;
  className?: string;
}

// ============================================
// LAYER TYPE CONFIG
// ============================================

const layerTypeConfig: Record<HeroLayerType, { icon: string; color: string; label: string }> = {
  background: { icon: 'M4 4h16v16H4z', color: '#9ca3af', label: 'Background' },
  centralObject: { icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', color: '#6366f1', label: 'Central Object' },
  textOverlay: { icon: 'M4 6h16M4 12h16M4 18h10', color: '#ec4899', label: 'Text' },
  logo: { icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', color: '#22c55e', label: 'Logo' }
};

// ============================================
// COMPONENT
// ============================================

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayers,
  onAddLayer,
  className = ''
}) => {
  // Sort layers by zIndex (descending for visual order)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== dropIndex) {
      // Convert from visual order to actual zIndex order
      const actualFromIndex = layers.length - 1 - fromIndex;
      const actualToIndex = layers.length - 1 - dropIndex;
      onReorderLayers(actualFromIndex, actualToIndex);
    }
  }, [layers.length, onReorderLayers]);

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Layers</h3>
        <div className="flex items-center gap-1">
          <AddLayerDropdown onAddLayer={onAddLayer} />
        </div>
      </div>

      {/* Layer List */}
      <div className="max-h-64 overflow-y-auto">
        {sortedLayers.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No layers yet. Add a layer to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {sortedLayers.map((layer, index) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                index={index}
                isSelected={layer.id === selectedLayerId}
                onSelect={() => onSelectLayer(layer.id)}
                onToggleVisibility={() => onToggleVisibility(layer.id)}
                onToggleLock={() => onToggleLock(layer.id)}
                onDelete={() => onDeleteLayer(layer.id)}
                onDuplicate={() => onDuplicateLayer(layer.id)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ============================================
// LAYER ITEM
// ============================================

interface LayerItemProps {
  layer: HeroLayerConfig;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  index,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const config = layerTypeConfig[layer.type];

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      className={`
        px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-900/50' : 'hover:bg-gray-700'}
        ${!layer.visible ? 'opacity-50' : ''}
      `}
    >
      {/* Drag Handle */}
      <div className="text-gray-500 cursor-grab active:cursor-grabbing">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </div>

      {/* Layer Type Icon */}
      <div
        className="w-6 h-6 rounded flex items-center justify-center"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke={config.color}
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
        </svg>
      </div>

      {/* Layer Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {layer.name || config.label}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {config.label}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Visibility Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          className="p-1 text-gray-400 hover:text-white rounded"
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>

        {/* Lock Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          className="p-1 text-gray-400 hover:text-white rounded"
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {layer.locked ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        {/* More Options */}
        <div className="relative group">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
            >
              Duplicate
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/30"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

// ============================================
// ADD LAYER DROPDOWN
// ============================================

interface AddLayerDropdownProps {
  onAddLayer: (type: HeroLayerType) => void;
}

const AddLayerDropdown: React.FC<AddLayerDropdownProps> = ({ onAddLayer }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
        title="Add layer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-44 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {(Object.entries(layerTypeConfig) as [HeroLayerType, typeof layerTypeConfig[HeroLayerType]][]).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => { onAddLayer(type); setIsOpen(false); }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke={config.color}
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                    </svg>
                  </div>
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LayerPanel;
