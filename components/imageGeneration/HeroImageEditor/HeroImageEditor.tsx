/**
 * Hero Image Editor Component
 *
 * Main visual editor for creating semantically optimized hero images.
 * Combines all sub-components for a complete editing experience.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  HeroImageComposition,
  HeroLayerConfig,
  HeroLayerType,
  HeroImageMetadata,
  LayerPosition,
  BusinessInfo,
  BackgroundLayerConfig
} from '../../../types';
import {
  createBlankComposition,
  createStandardComposition,
  compositionTemplates,
  canvasPresets
} from '../../../config/heroImageDefaults';

// Hooks
import { useHeroEditorState, loadAutoSavedComposition, hasAutoSavedComposition, clearAutoSavedComposition } from '../../../hooks/useHeroEditorState';
import { useLayerManagement } from '../../../hooks/useLayerManagement';
import { useSemanticValidation } from '../../../hooks/useSemanticValidation';

// Components
import { EditorCanvas } from './EditorCanvas';
import { LayerPanel } from './LayerPanel';
import { LayerControls } from './LayerControls';
import { SemanticValidationPanel } from './SemanticValidationPanel';
import { MetadataPanel } from './MetadataPanel';
import { PreviewExport } from './PreviewExport';

// ============================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'red' | 'green' | 'yellow' | 'blue';
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  badge,
  badgeColor = 'blue',
  defaultOpen = false,
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const badgeColors = {
    red: 'bg-red-600 text-red-100',
    green: 'bg-green-600 text-green-100',
    yellow: 'bg-yellow-600 text-yellow-100',
    blue: 'bg-blue-600 text-blue-100'
  };

  return (
    <div className="border-b border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 flex items-center justify-between bg-gray-900/80 hover:bg-gray-900 transition-colors border-b border-gray-600"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium text-white">{title}</span>
            {badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColors[badgeColor]}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate ml-5">{subtitle}</p>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-3 py-3 bg-gray-800">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================
// TYPES
// ============================================

interface HeroImageEditorProps {
  /**
   * Initial composition to edit (optional)
   */
  initialComposition?: HeroImageComposition;

  /**
   * Business info for auto-filling metadata
   */
  businessInfo?: BusinessInfo;

  /**
   * H1 text for the page (used for text overlay)
   */
  h1Text?: string;

  /**
   * Entity name for the central object
   */
  entityName?: string;

  /**
   * Initial background image URL (e.g., from a generated image)
   */
  initialBackgroundImage?: string;

  /**
   * Initial alt text suggestion from content brief
   */
  initialAltText?: string;

  /**
   * Callback when export is complete
   */
  onExport?: (blob: Blob, format: string, metadata: HeroImageMetadata) => void;

  /**
   * Callback to close the editor
   */
  onClose?: () => void;

  /**
   * Callback to generate background image (triggers Quick Generate flow)
   */
  onGenerateBackground?: () => void;

  /**
   * Whether background generation is in progress
   */
  isGeneratingBackground?: boolean;

  /**
   * Additional class name
   */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const HeroImageEditor: React.FC<HeroImageEditorProps> = ({
  initialComposition,
  businessInfo,
  h1Text,
  entityName,
  initialBackgroundImage,
  initialAltText,
  onExport,
  onClose,
  onGenerateBackground,
  isGeneratingBackground = false,
  className = ''
}) => {
  // Check for auto-saved composition
  const [showRecovery, setShowRecovery] = useState(hasAutoSavedComposition() && !initialComposition);

  // Determine initial composition
  const startingComposition = useMemo(() => {
    let composition: HeroImageComposition;

    if (initialComposition) {
      composition = initialComposition;
    } else if (h1Text && entityName && businessInfo?.projectName) {
      composition = createStandardComposition(h1Text, entityName, businessInfo.projectName);
    } else {
      composition = createBlankComposition();
    }

    // If we have an initial background image, update the background layer
    if (initialBackgroundImage && composition.layers.length > 0) {
      const backgroundLayer = composition.layers.find(l => l.type === 'background');
      if (backgroundLayer) {
        composition = {
          ...composition,
          layers: composition.layers.map(layer =>
            layer.type === 'background'
              ? { ...layer, source: 'user-upload' as const, imageUrl: initialBackgroundImage }
              : layer
          )
        };
      }
    }

    // Pre-fill text layer with h1Text
    if (h1Text && composition.layers.length > 0) {
      composition = {
        ...composition,
        layers: composition.layers.map(layer =>
          layer.type === 'textOverlay'
            ? { ...layer, text: h1Text }
            : layer
        )
      };
    }

    // Load logo from BrandKit if available
    const brandKit = businessInfo?.brandKit;
    if (brandKit?.logo?.url && composition.layers.length > 0) {
      const logoPosition = brandKit.logoPlacement || 'bottom-right';
      composition = {
        ...composition,
        layers: composition.layers.map(layer =>
          layer.type === 'logo'
            ? {
                ...layer,
                imageUrl: brandKit.logo!.url,
                cornerPosition: logoPosition,
                opacity: brandKit.logoOpacity || 80,
                visible: true
              }
            : layer
        )
      };
    }

    // Apply BrandKit colors to text layer if available
    if (brandKit?.colors && composition.layers.length > 0) {
      composition = {
        ...composition,
        layers: composition.layers.map(layer =>
          layer.type === 'textOverlay'
            ? {
                ...layer,
                textColor: brandKit.colors.textOnImage || layer.textColor,
                backgroundColor: brandKit.colors.overlayGradient || layer.backgroundColor
              }
            : layer
        )
      };
    }

    // Pre-fill metadata with initialAltText and businessInfo
    if (initialAltText || businessInfo?.projectName) {
      const year = new Date().getFullYear();
      const businessName = businessInfo?.projectName || '';
      const altText = initialAltText || composition.metadata.altText;

      // Generate semantic filename: entity-attribute.avif (per SEO best practices)
      // Remove stop words and create clean hyphenated name
      const stopWords = ['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'];
      const generateSemanticFilename = (title: string, entity?: string): string => {
        // Use entity name if provided, otherwise extract from title
        const words = title.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 0 && !stopWords.includes(w));

        // Take first 3-4 meaningful words
        const significantWords = words.slice(0, 4);
        if (significantWords.length === 0) return 'hero-image.avif';

        return significantWords.join('-') + '.avif';
      };

      const fileName = h1Text
        ? generateSemanticFilename(h1Text, entityName)
        : composition.metadata.fileName;

      composition = {
        ...composition,
        metadata: {
          ...composition.metadata,
          altText,
          fileName,
          iptc: {
            ...composition.metadata.iptc,
            creator: businessName || composition.metadata.iptc?.creator || '',
            copyright: businessName
              ? `Copyright ${year} ${businessName}`
              : composition.metadata.iptc?.copyright || '',
            caption: altText,
            headline: h1Text?.substring(0, 64) || composition.metadata.iptc?.headline || ''
          },
          exif: {
            ...composition.metadata.exif,
            artist: businessName || composition.metadata.exif?.artist || '',
            copyright: businessName
              ? `Copyright ${year} ${businessName}`
              : composition.metadata.exif?.copyright || '',
            imageDescription: altText
          },
          schemaOrg: {
            ...composition.metadata.schemaOrg,
            name: h1Text || composition.metadata.schemaOrg?.name || '',
            description: altText,
            author: businessName
              ? { '@type': 'Organization', name: businessName }
              : composition.metadata.schemaOrg?.author,
            copyrightHolder: businessName
              ? { '@type': 'Organization', name: businessName }
              : composition.metadata.schemaOrg?.copyrightHolder
          }
        }
      };
    }

    return composition;
  }, [initialComposition, h1Text, entityName, businessInfo?.projectName, businessInfo?.brandKit, initialBackgroundImage, initialAltText]);

  // State management
  const [editorState, editorActions] = useHeroEditorState(startingComposition, {
    autoSave: true,
    autoValidate: true
  });

  // Layer management
  const layerManagement = useLayerManagement();

  // Validation
  const [validationState, validationActions] = useSemanticValidation(editorState.composition);

  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);

  // Resizable right panel state
  const [rightPanelWidth, setRightPanelWidth] = useState(320); // Default width in pixels
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Min/max constraints for panel width
  const MIN_PANEL_WIDTH = 280;
  const MAX_PANEL_WIDTH = 500;

  // Floating panel state
  const [isFloating, setIsFloating] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState({ x: 100, y: 100 });
  const [floatingSize, setFloatingSize] = useState({ width: 420, height: 600 });
  const isDraggingPanelRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panelStartPosRef = useRef({ x: 0, y: 0 });

  // Floating panel drag handlers
  const handleFloatingDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingPanelRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panelStartPosRef.current = { ...floatingPosition };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, [floatingPosition]);

  useEffect(() => {
    const handleFloatingMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanelRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      setFloatingPosition({
        x: Math.max(0, panelStartPosRef.current.x + deltaX),
        y: Math.max(0, panelStartPosRef.current.y + deltaY)
      });
    };

    const handleFloatingMouseUp = () => {
      if (isDraggingPanelRef.current) {
        isDraggingPanelRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleFloatingMouseMove);
    document.addEventListener('mouseup', handleFloatingMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleFloatingMouseMove);
      document.removeEventListener('mouseup', handleFloatingMouseUp);
    };
  }, []);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = rightPanelWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      // Calculate new width (drag left = wider panel)
      const deltaX = startXRef.current - e.clientX;
      const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidthRef.current + deltaX));
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Track the last applied background to avoid re-applying the same one
  const lastAppliedBackgroundRef = React.useRef<string | null>(null);

  // Update background layer when initialBackgroundImage changes (e.g., after generation)
  useEffect(() => {
    if (initialBackgroundImage && initialBackgroundImage !== lastAppliedBackgroundRef.current) {
      const bgLayer = editorState.composition.layers.find(l => l.type === 'background');
      if (bgLayer) {
        // Update the background layer with the new image
        editorActions.updateLayer(bgLayer.id, {
          source: 'user-upload',
          imageUrl: initialBackgroundImage
        });
        lastAppliedBackgroundRef.current = initialBackgroundImage;
      }
    }
  }, [initialBackgroundImage, editorState.composition.layers, editorActions]);

  // ============================================
  // HANDLERS
  // ============================================

  // Layer handlers
  const handleSelectLayer = useCallback((layerId: string | null) => {
    editorActions.selectLayer(layerId);
  }, [editorActions]);

  const handleUpdateLayerPosition = useCallback((layerId: string, position: Partial<LayerPosition>) => {
    const layer = editorState.composition.layers.find(l => l.id === layerId);
    if (layer) {
      editorActions.updateLayer(layerId, {
        position: { ...layer.position, ...position }
      });
    }
  }, [editorState.composition.layers, editorActions]);

  const handleToggleVisibility = useCallback((layerId: string) => {
    const layer = editorState.composition.layers.find(l => l.id === layerId);
    if (layer) {
      editorActions.updateLayer(layerId, { visible: !layer.visible });
    }
  }, [editorState.composition.layers, editorActions]);

  const handleToggleLock = useCallback((layerId: string) => {
    const layer = editorState.composition.layers.find(l => l.id === layerId);
    if (layer) {
      editorActions.updateLayer(layerId, { locked: !layer.locked });
    }
  }, [editorState.composition.layers, editorActions]);

  const handleAddLayer = useCallback((type: HeroLayerType) => {
    const newLayer = layerManagement.createLayer(type, {
      entityName: entityName || 'Entity',
      text: h1Text || 'Your Text Here'
    });
    editorActions.addLayer(newLayer);
  }, [layerManagement, entityName, h1Text, editorActions]);

  const handleDeleteLayer = useCallback((layerId: string) => {
    editorActions.removeLayer(layerId);
  }, [editorActions]);

  const handleDuplicateLayer = useCallback((layerId: string) => {
    editorActions.duplicateLayer(layerId);
  }, [editorActions]);

  // Layer update handler
  const handleUpdateLayer = useCallback((updates: Partial<HeroLayerConfig>) => {
    if (editorState.selectedLayerId) {
      editorActions.updateLayer(editorState.selectedLayerId, updates);
    }
  }, [editorState.selectedLayerId, editorActions]);

  // Position update handler
  const handleUpdatePosition = useCallback((position: Partial<LayerPosition>) => {
    if (editorState.selectedLayerId) {
      handleUpdateLayerPosition(editorState.selectedLayerId, position);
    }
  }, [editorState.selectedLayerId, handleUpdateLayerPosition]);

  // Validation handlers
  const handleApplyFix = useCallback((ruleId: string) => {
    const fixed = validationActions.applyFix(ruleId);
    if (fixed) {
      editorActions.setComposition(fixed);
    }
  }, [validationActions, editorActions]);

  const handleApplyAllFixes = useCallback(() => {
    const result = validationActions.applyAllFixes();
    editorActions.setComposition(result.composition);
  }, [validationActions, editorActions]);

  // Export handler
  const handleExport = useCallback((blob: Blob, format: string, metadata: HeroImageMetadata) => {
    onExport?.(blob, format, metadata);
    setShowPreview(false);
  }, [onExport]);

  // Template handler
  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = compositionTemplates[templateId as keyof typeof compositionTemplates];
    if (template) {
      const newComposition = template.create(
        h1Text || 'Your Title',
        entityName || 'Entity',
        businessInfo?.projectName || 'Company'
      );
      editorActions.setComposition(newComposition);
      setShowTemplates(false);
    }
  }, [h1Text, entityName, businessInfo?.projectName, editorActions]);

  // Recovery handler
  const handleRecoverAutoSave = useCallback(() => {
    const saved = loadAutoSavedComposition();
    if (saved) {
      editorActions.loadComposition(saved);
    }
    setShowRecovery(false);
  }, [editorActions]);

  const handleDismissRecovery = useCallback(() => {
    clearAutoSavedComposition();
    setShowRecovery(false);
  }, []);

  // Canvas preset handler
  const handleApplyCanvasPreset = useCallback((presetId: keyof typeof canvasPresets) => {
    editorActions.applyCanvasPreset(presetId);
    setShowCanvasSettings(false);
  }, [editorActions]);

  // Get selected layer
  const selectedLayer = useMemo(() => {
    return editorState.composition.layers.find(l => l.id === editorState.selectedLayerId) || null;
  }, [editorState.composition.layers, editorState.selectedLayerId]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className={`fixed inset-0 z-[70] bg-gray-900 flex flex-col ${className}`}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from reaching parent modal
    >
      {/* Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">
              Recover Previous Work?
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              We found an auto-saved composition. Would you like to continue where you left off?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRecoverAutoSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Recover
              </button>
              <button
                onClick={handleDismissRecovery}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">Hero Image Editor</h1>
          {editorState.isDirty && (
            <span className="text-xs text-gray-400">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Templates Button */}
          <button
            onClick={() => setShowTemplates(true)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          >
            Templates
          </button>

          {/* Canvas Settings */}
          <button
            onClick={() => setShowCanvasSettings(true)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          >
            Canvas
          </button>

          {/* Toggle Floating Panel */}
          <button
            onClick={() => setIsFloating(!isFloating)}
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
              isFloating
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title={isFloating ? 'Dock panel to side' : 'Float panel (drag anywhere)'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFloating ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              )}
            </svg>
            {isFloating ? 'Dock' : 'Float'}
          </button>

          {/* Undo/Redo */}
          <div className="flex items-center border-l border-gray-600 pl-2 ml-2">
            <button
              onClick={editorActions.undo}
              disabled={!editorActions.canUndo}
              className="p-1.5 text-gray-500 hover:text-gray-300 disabled:opacity-30"
              title="Undo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={editorActions.redo}
              disabled={!editorActions.canRedo}
              className="p-1.5 text-gray-500 hover:text-gray-300 disabled:opacity-30"
              title="Redo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          {/* Preview Button */}
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Preview & Export
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Layers */}
        <div className="w-64 border-r border-gray-700 flex flex-col bg-gray-800">
          <LayerPanel
            layers={editorState.composition.layers}
            selectedLayerId={editorState.selectedLayerId}
            onSelectLayer={handleSelectLayer}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onReorderLayers={editorActions.reorderLayers}
            onAddLayer={handleAddLayer}
            className="flex-1"
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col bg-gray-800 relative">
          <EditorCanvas
            composition={editorState.composition}
            selectedLayerId={editorState.selectedLayerId}
            onSelectLayer={handleSelectLayer}
            onUpdateLayerPosition={handleUpdateLayerPosition}
            showGrid={false}
            showGuides={true}
            className="flex-1"
          />

          {/* Generate Background Overlay - shown when no background image */}
          {(() => {
            const bgLayer = editorState.composition.layers.find(l => l.type === 'background') as BackgroundLayerConfig | undefined;
            const hasBackground = bgLayer?.imageUrl || bgLayer?.source === 'color';

            if (!hasBackground && onGenerateBackground) {
              return (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-gray-900/90 border border-gray-600 rounded-lg p-6 text-center max-w-sm pointer-events-auto">
                    <h3 className="text-white font-medium mb-2">No Background Image</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Generate an AI background or upload your own image to get started.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={onGenerateBackground}
                        disabled={isGeneratingBackground}
                        className={`px-4 py-2 rounded font-medium ${
                          isGeneratingBackground
                            ? 'bg-gray-600 text-gray-400 cursor-wait'
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        {isGeneratingBackground ? 'Generating...' : 'Generate Background'}
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">
                      Or select the Background layer and upload an image
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Right Panel - Controls & Validation (Docked mode) */}
        {!isFloating && (
          <div
            className="border-l border-gray-700 flex flex-col bg-gray-800 overflow-y-auto relative"
            style={{ width: rightPanelWidth, minWidth: MIN_PANEL_WIDTH, maxWidth: MAX_PANEL_WIDTH }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={handleResizeMouseDown}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50 transition-colors z-10 group"
              title="Drag to resize"
            >
              {/* Visual indicator on hover */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-500 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Layer Controls - Accordion */}
            <CollapsibleSection
              title="Layer Properties"
              subtitle={selectedLayer?.name || selectedLayer?.type || 'Select a layer'}
              defaultOpen={true}
            >
              <LayerControls
                layer={selectedLayer}
                onUpdateLayer={handleUpdateLayer}
                onUpdatePosition={handleUpdatePosition}
              />
            </CollapsibleSection>

            {/* Validation Panel - Accordion */}
            <CollapsibleSection
              title="Semantic Validation"
              subtitle={validationState.result ? `${validationState.result.score}%` : 'Validating...'}
              badge={validationState.result?.errors?.length ? `${validationState.result.errors.length} errors` : undefined}
              badgeColor={validationState.result?.errors?.length ? 'red' : 'green'}
            >
              <SemanticValidationPanel
                validation={validationState.result}
                isValidating={validationState.isValidating}
                onApplyFix={handleApplyFix}
                onApplyAllFixes={handleApplyAllFixes}
              />
            </CollapsibleSection>

            {/* Metadata Panel - Accordion */}
            <CollapsibleSection
              title="Image Metadata"
              subtitle="IPTC, EXIF, Schema"
            >
              <MetadataPanel
                metadata={editorState.composition.metadata}
                onUpdateMetadata={editorActions.updateMetadata}
                businessName={businessInfo?.projectName}
              />
            </CollapsibleSection>
          </div>
        )}
      </div>

      {/* Floating Panel - Controls & Validation (Floating mode) */}
      {isFloating && (
        <div
          className="fixed z-[75] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl flex flex-col"
          style={{
            left: floatingPosition.x,
            top: floatingPosition.y,
            width: floatingSize.width,
            height: floatingSize.height,
            minWidth: 320,
            minHeight: 300,
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}
        >
          {/* Resize handles - all edges */}
          {/* Left edge */}
          <div
            className="absolute left-0 top-2 bottom-2 w-2 cursor-ew-resize hover:bg-blue-500/30 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = floatingSize.width;
              const startLeft = floatingPosition.x;
              document.body.style.cursor = 'ew-resize';
              const onMove = (ev: MouseEvent) => {
                const delta = startX - ev.clientX;
                const newWidth = Math.max(320, startW + delta);
                setFloatingSize(s => ({ ...s, width: newWidth }));
                setFloatingPosition(p => ({ ...p, x: startLeft - (newWidth - startW) }));
              };
              const onUp = () => {
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          />
          {/* Right edge */}
          <div
            className="absolute right-0 top-2 bottom-2 w-2 cursor-ew-resize hover:bg-blue-500/30 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = floatingSize.width;
              document.body.style.cursor = 'ew-resize';
              const onMove = (ev: MouseEvent) => {
                setFloatingSize(s => ({ ...s, width: Math.max(320, startW + ev.clientX - startX) }));
              };
              const onUp = () => {
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          />
          {/* Bottom edge */}
          <div
            className="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize hover:bg-blue-500/30 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startH = floatingSize.height;
              document.body.style.cursor = 'ns-resize';
              const onMove = (ev: MouseEvent) => {
                setFloatingSize(s => ({ ...s, height: Math.max(300, startH + ev.clientY - startY) }));
              };
              const onUp = () => {
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          />
          {/* Bottom-right corner */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = floatingSize.width;
              const startH = floatingSize.height;
              document.body.style.cursor = 'se-resize';
              const onMove = (ev: MouseEvent) => {
                setFloatingSize({
                  width: Math.max(320, startW + ev.clientX - startX),
                  height: Math.max(300, startH + ev.clientY - startY)
                });
              };
              const onUp = () => {
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          >
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>
          {/* Bottom-left corner */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-blue-500/30 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = floatingSize.width;
              const startH = floatingSize.height;
              const startLeft = floatingPosition.x;
              document.body.style.cursor = 'sw-resize';
              const onMove = (ev: MouseEvent) => {
                const deltaX = startX - ev.clientX;
                const newWidth = Math.max(320, startW + deltaX);
                setFloatingSize({
                  width: newWidth,
                  height: Math.max(300, startH + ev.clientY - startY)
                });
                setFloatingPosition(p => ({ ...p, x: startLeft - (newWidth - startW) }));
              };
              const onUp = () => {
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          />

          {/* Floating Panel Header - Drag Handle */}
          <div
            onMouseDown={handleFloatingDragStart}
            className="px-3 py-2 bg-gray-900 border-b border-gray-600 flex items-center justify-between cursor-grab active:cursor-grabbing flex-shrink-0 rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
              <span className="text-sm font-medium text-white">Properties Panel</span>
              <span className="text-xs text-gray-500">({Math.round(floatingSize.width)}x{Math.round(floatingSize.height)})</span>
            </div>
            <button
              onClick={() => setIsFloating(false)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Dock panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Floating Panel Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Layer Controls - Accordion */}
            <CollapsibleSection
              title="Layer Properties"
              subtitle={selectedLayer?.name || selectedLayer?.type || 'Select a layer'}
              defaultOpen={true}
            >
              <LayerControls
                layer={selectedLayer}
                onUpdateLayer={handleUpdateLayer}
                onUpdatePosition={handleUpdatePosition}
              />
            </CollapsibleSection>

            {/* Validation Panel - Accordion */}
            <CollapsibleSection
              title="Semantic Validation"
              subtitle={validationState.result ? `${validationState.result.score}%` : 'Validating...'}
              badge={validationState.result?.errors?.length ? `${validationState.result.errors.length} errors` : undefined}
              badgeColor={validationState.result?.errors?.length ? 'red' : 'green'}
            >
              <SemanticValidationPanel
                validation={validationState.result}
                isValidating={validationState.isValidating}
                onApplyFix={handleApplyFix}
                onApplyAllFixes={handleApplyAllFixes}
              />
            </CollapsibleSection>

            {/* Metadata Panel - Accordion */}
            <CollapsibleSection
              title="Image Metadata"
              subtitle="IPTC, EXIF, Schema"
            >
              <MetadataPanel
                metadata={editorState.composition.metadata}
                onUpdateMetadata={editorActions.updateMetadata}
                businessName={businessInfo?.projectName}
              />
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <PreviewExport
          composition={editorState.composition}
          canExport={validationState.canExport}
          onExport={handleExport}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          onApply={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Canvas Settings Modal */}
      {showCanvasSettings && (
        <CanvasSettingsModal
          currentWidth={editorState.composition.canvasWidth}
          currentHeight={editorState.composition.canvasHeight}
          onApplyPreset={handleApplyCanvasPreset}
          onSetSize={editorActions.setCanvasSize}
          onClose={() => setShowCanvasSettings(false)}
        />
      )}
    </div>
  );
};

// ============================================
// TEMPLATES MODAL
// ============================================

interface TemplatesModalProps {
  onApply: (templateId: string) => void;
  onClose: () => void;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ onApply, onClose }) => {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Choose a Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto max-h-96">
          {Object.entries(compositionTemplates).map(([id, template]) => (
            <button
              key={id}
              onClick={() => onApply(id)}
              className="p-4 border border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-900/30 text-left transition-colors"
            >
              <div className="h-24 bg-gray-700 rounded mb-2 flex items-center justify-center text-gray-500">
                Preview
              </div>
              <h3 className="font-medium text-white">{template.name}</h3>
              <p className="text-xs text-gray-400">{template.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// CANVAS SETTINGS MODAL
// ============================================

interface CanvasSettingsModalProps {
  currentWidth: number;
  currentHeight: number;
  onApplyPreset: (presetId: keyof typeof canvasPresets) => void;
  onSetSize: (width: number, height: number) => void;
  onClose: () => void;
}

const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  currentWidth,
  currentHeight,
  onApplyPreset,
  onSetSize,
  onClose
}) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Canvas Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Presets */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(canvasPresets).map(([id, preset]) => (
                <button
                  key={id}
                  onClick={() => { onApplyPreset(id as keyof typeof canvasPresets); onClose(); }}
                  className="p-2 text-xs border border-gray-600 rounded hover:border-blue-500 hover:bg-blue-900/30 text-left"
                >
                  <div className="font-medium text-white">{preset.name}</div>
                  <div className="text-gray-400">{preset.width}x{preset.height}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Size */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Custom Size</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>
            <button
              onClick={() => { onSetSize(width, height); onClose(); }}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Custom Size
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroImageEditor;
