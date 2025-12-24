/**
 * Editor Canvas Component
 *
 * Main canvas for the Hero Image Visual Editor.
 * Handles layer rendering, drag-drop interactions, and selection.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  HeroImageComposition,
  HeroLayerConfig,
  LayerPosition,
  BackgroundLayerConfig,
  CentralObjectLayerConfig,
  TextOverlayLayerConfig,
  LogoLayerConfig
} from '../../../types';

// ============================================
// TYPES
// ============================================

interface EditorCanvasProps {
  composition: HeroImageComposition;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayerPosition: (layerId: string, position: Partial<LayerPosition>) => void;
  showGrid?: boolean;
  showGuides?: boolean;
  zoom?: number;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  layerId: string | null;
  startX: number;
  startY: number;
  startLayerX: number;
  startLayerY: number;
  dragType: 'move' | 'resize';
  resizeHandle: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const HANDLE_SIZE = 8;
const SNAP_THRESHOLD = 5; // Snap when within 5% of guides

// ============================================
// COMPONENT
// ============================================

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  composition,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayerPosition,
  showGrid = false,
  showGuides = true,
  zoom = 1,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    layerId: null,
    startX: 0,
    startY: 0,
    startLayerX: 0,
    startLayerY: 0,
    dragType: 'move',
    resizeHandle: null
  });

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // ============================================
  // CANVAS SETUP
  // ============================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calculate size to fit while maintaining aspect ratio
      const aspectRatio = composition.canvasWidth / composition.canvasHeight;
      let width = containerWidth;
      let height = containerWidth / aspectRatio;

      if (height > containerHeight) {
        height = containerHeight;
        width = containerHeight * aspectRatio;
      }

      width *= zoom;
      height *= zoom;

      setCanvasSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [composition.canvasWidth, composition.canvasHeight, zoom]);

  // ============================================
  // LAYER RENDERING
  // ============================================

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Render each layer (simplified preview)
    const sortedLayers = [...composition.layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      drawLayerPreview(ctx, layer, canvas.width, canvas.height);
    }
  }, [composition, canvasSize, showGrid]);

  // ============================================
  // OVERLAY (SELECTION/GUIDES)
  // ============================================

  useEffect(() => {
    const overlay = overlayRef.current;
    const ctx = overlay?.getContext('2d');
    if (!overlay || !ctx) return;

    overlay.width = canvasSize.width;
    overlay.height = canvasSize.height;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw guides if enabled
    if (showGuides) {
      drawGuides(ctx, overlay.width, overlay.height);
    }

    // Draw selection for selected layer
    if (selectedLayerId) {
      const layer = composition.layers.find(l => l.id === selectedLayerId);
      if (layer) {
        drawSelection(ctx, layer, overlay.width, overlay.height);
      }
    }
  }, [composition, selectedLayerId, canvasSize, showGuides]);

  // ============================================
  // DRAWING HELPERS
  // ============================================

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    // Draw 10% grid lines
    for (let i = 1; i < 10; i++) {
      const x = (i / 10) * width;
      const y = (i / 10) * height;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawGuides = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;

    // Center lines
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Safe zones (top 25%, bottom 25%)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.25);
    ctx.lineTo(width, height * 0.25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.lineTo(width, height * 0.75);
    ctx.stroke();

    ctx.setLineDash([]);
  };

  // Cache for loaded images
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Helper to load and draw an image with caching
  const drawImageLayer = (
    ctx: CanvasRenderingContext2D,
    imageUrl: string,
    x: number, y: number, w: number, h: number,
    placeholderText: string,
    placeholderColor: string,
    preserveAspect: boolean = true
  ) => {
    const cachedImage = imageCache.current.get(imageUrl);

    if (cachedImage && cachedImage.complete && cachedImage.naturalWidth > 0) {
      if (preserveAspect) {
        // Calculate aspect-preserved dimensions
        const imgAspect = cachedImage.naturalWidth / cachedImage.naturalHeight;
        const boxAspect = w / h;
        let drawW = w, drawH = h, drawX = x, drawY = y;

        if (imgAspect > boxAspect) {
          drawW = w;
          drawH = w / imgAspect;
          drawY = y + (h - drawH) / 2;
        } else {
          drawH = h;
          drawW = h * imgAspect;
          drawX = x + (w - drawW) / 2;
        }
        ctx.drawImage(cachedImage, drawX, drawY, drawW, drawH);
      } else {
        ctx.drawImage(cachedImage, x, y, w, h);
      }
    } else if (!cachedImage) {
      // Load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (img.naturalWidth > 0) {
          imageCache.current.set(imageUrl, img);
          // Force re-render
          setCanvasSize(prev => ({ ...prev }));
        }
      };
      img.onerror = () => {
        console.warn('[EditorCanvas] Failed to load:', imageUrl?.substring(0, 50));
      };
      img.src = imageUrl;
      imageCache.current.set(imageUrl, img);
      // Draw placeholder
      ctx.fillStyle = placeholderColor + '40';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = placeholderColor;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', x + w/2, y + h/2);
    } else {
      // Image loading or failed
      ctx.fillStyle = placeholderColor + '40';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = placeholderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = placeholderColor;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(placeholderText, x + w/2, y + h/2);
    }
  };

  const drawLayerPreview = (
    ctx: CanvasRenderingContext2D,
    layer: HeroLayerConfig,
    width: number,
    height: number
  ) => {
    const x = (layer.position.x / 100) * width;
    const y = (layer.position.y / 100) * height;
    const w = (layer.position.width / 100) * width;
    const h = (layer.position.height / 100) * height;

    ctx.globalAlpha = layer.opacity / 100;

    switch (layer.type) {
      case 'background': {
        const bgLayer = layer as BackgroundLayerConfig;

        if (bgLayer.source === 'color' || (!bgLayer.imageUrl && bgLayer.source !== 'ai-generated')) {
          // Solid color background
          ctx.fillStyle = bgLayer.backgroundColor || '#374151';
          ctx.fillRect(x, y, w, h);
        } else if (bgLayer.imageUrl) {
          // Image background (user-upload or ai-generated with URL)
          drawImageLayer(ctx, bgLayer.imageUrl, x, y, w, h, 'Background', '#6b7280', false);
        } else {
          // No image yet - show placeholder
          ctx.fillStyle = '#374151';
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = '#6b7280';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('No background set', x + w/2, y + h/2);
        }
        break;
      }

      case 'centralObject': {
        const objLayer = layer as CentralObjectLayerConfig;

        if (objLayer.imageUrl) {
          // Draw the actual central object image
          drawImageLayer(ctx, objLayer.imageUrl, x, y, w, h, objLayer.entityName || 'Central Object', '#6366f1', true);
        } else {
          // No image - show placeholder with entity name
          ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          // Center indicator
          ctx.beginPath();
          ctx.arc(x + w/2, y + h/2, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#6366f1';
          ctx.fill();
          // Entity name
          ctx.fillStyle = '#a5b4fc';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(objLayer.entityName || 'Central Object', x + w/2, y + h/2 + 25);
        }
        break;
      }

      case 'textOverlay': {
        const textLayer = layer as TextOverlayLayerConfig;

        // Draw background if set
        if (textLayer.backgroundColor && textLayer.backgroundColor !== 'transparent') {
          ctx.fillStyle = textLayer.backgroundColor;
          ctx.fillRect(x, y, w, h);
        }

        // Draw the actual text
        if (textLayer.text) {
          // Scale font size relative to canvas
          const baseFontSize = textLayer.fontSize || 48;
          const referenceWidth = 1200;
          const scaledFontSize = baseFontSize * (width / referenceWidth);

          ctx.font = `${textLayer.fontWeight || 700} ${scaledFontSize}px ${textLayer.fontFamily || 'sans-serif'}`;
          ctx.fillStyle = textLayer.textColor || '#ffffff';
          ctx.textBaseline = 'middle';

          // Text alignment
          let textX: number;
          switch (textLayer.textAlign || 'center') {
            case 'left':
              ctx.textAlign = 'left';
              textX = x + 16;
              break;
            case 'right':
              ctx.textAlign = 'right';
              textX = x + w - 16;
              break;
            default:
              ctx.textAlign = 'center';
              textX = x + w / 2;
          }

          // Word wrap
          const maxWidth = w - 32;
          const lineHeight = scaledFontSize * 1.2;
          const words = textLayer.text.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);

          // Draw lines centered vertically
          const totalHeight = lines.length * lineHeight;
          let currentY = y + h/2 - totalHeight/2 + lineHeight/2;

          for (const line of lines) {
            ctx.fillText(line, textX, currentY);
            currentY += lineHeight;
          }
        } else {
          // No text - show placeholder
          ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          ctx.fillStyle = '#ec4899';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Add text content', x + w/2, y + h/2);
        }
        break;
      }

      case 'logo': {
        const logoLayer = layer as LogoLayerConfig;

        if (logoLayer.imageUrl) {
          // Draw the actual logo
          drawImageLayer(ctx, logoLayer.imageUrl, x, y, w, h, 'Logo', '#22c55e', true);
        } else {
          // No logo - show placeholder
          ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          ctx.fillStyle = '#22c55e';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Logo', x + w/2, y + h/2);
        }
        break;
      }
    }

    ctx.globalAlpha = 1;
  };

  const drawSelection = (
    ctx: CanvasRenderingContext2D,
    layer: HeroLayerConfig,
    width: number,
    height: number
  ) => {
    const x = (layer.position.x / 100) * width;
    const y = (layer.position.y / 100) * height;
    const w = (layer.position.width / 100) * width;
    const h = (layer.position.height / 100) * height;

    // Selection border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Resize handles
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;

    const handles = [
      { x: x - HANDLE_SIZE/2, y: y - HANDLE_SIZE/2 }, // top-left
      { x: x + w/2 - HANDLE_SIZE/2, y: y - HANDLE_SIZE/2 }, // top-center
      { x: x + w - HANDLE_SIZE/2, y: y - HANDLE_SIZE/2 }, // top-right
      { x: x + w - HANDLE_SIZE/2, y: y + h/2 - HANDLE_SIZE/2 }, // right-center
      { x: x + w - HANDLE_SIZE/2, y: y + h - HANDLE_SIZE/2 }, // bottom-right
      { x: x + w/2 - HANDLE_SIZE/2, y: y + h - HANDLE_SIZE/2 }, // bottom-center
      { x: x - HANDLE_SIZE/2, y: y + h - HANDLE_SIZE/2 }, // bottom-left
      { x: x - HANDLE_SIZE/2, y: y + h/2 - HANDLE_SIZE/2 }, // left-center
    ];

    for (const handle of handles) {
      ctx.fillRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
    }
  };

  // ============================================
  // MOUSE INTERACTIONS
  // ============================================

  const getMousePosition = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  }, []);

  const findLayerAtPosition = useCallback((x: number, y: number): HeroLayerConfig | null => {
    // Search from top to bottom (reverse zIndex order)
    const sortedLayers = [...composition.layers]
      .filter(l => l.visible)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const layer of sortedLayers) {
      const { position } = layer;
      if (
        x >= position.x &&
        x <= position.x + position.width &&
        y >= position.y &&
        y <= position.y + position.height
      ) {
        return layer;
      }
    }

    return null;
  }, [composition.layers]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePosition(e);
    const layer = findLayerAtPosition(pos.x, pos.y);

    if (layer) {
      onSelectLayer(layer.id);
      setDragState({
        isDragging: true,
        layerId: layer.id,
        startX: pos.x,
        startY: pos.y,
        startLayerX: layer.position.x,
        startLayerY: layer.position.y,
        dragType: 'move',
        resizeHandle: null
      });
    } else {
      onSelectLayer(null);
    }
  }, [getMousePosition, findLayerAtPosition, onSelectLayer]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.layerId) return;

    const pos = getMousePosition(e);
    const layer = composition.layers.find(l => l.id === dragState.layerId);
    if (!layer) return;

    const deltaX = pos.x - dragState.startX;
    const deltaY = pos.y - dragState.startY;

    let newX = dragState.startLayerX + deltaX;
    let newY = dragState.startLayerY + deltaY;

    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(100 - layer.position.width, newX));
    newY = Math.max(0, Math.min(100 - layer.position.height, newY));

    // Snap to guides
    if (showGuides) {
      const centerX = newX + layer.position.width / 2;
      const centerY = newY + layer.position.height / 2;

      if (Math.abs(centerX - 50) < SNAP_THRESHOLD) {
        newX = 50 - layer.position.width / 2;
      }
      if (Math.abs(centerY - 50) < SNAP_THRESHOLD) {
        newY = 50 - layer.position.height / 2;
      }
    }

    onUpdateLayerPosition(dragState.layerId, { x: newX, y: newY });
  }, [dragState, composition.layers, getMousePosition, showGuides, onUpdateLayerPosition]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center bg-gray-900 overflow-hidden ${className}`}
      style={{ minHeight: '400px' }}
    >
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="shadow-lg"
        style={{
          width: canvasSize.width,
          height: canvasSize.height
        }}
      />

      {/* Overlay Canvas for selection/guides */}
      <canvas
        ref={overlayRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute pointer-events-auto cursor-crosshair"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Canvas info */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {composition.canvasWidth} x {composition.canvasHeight}
      </div>
    </div>
  );
};

export default EditorCanvas;
