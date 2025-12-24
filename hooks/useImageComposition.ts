/**
 * Image Composition Hook for Hero Image Editor
 *
 * Handles HTML5 Canvas rendering of hero image compositions.
 * Provides rendering, image loading, and export functionality.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  HeroImageComposition,
  HeroLayerConfig,
  BackgroundLayerConfig,
  CentralObjectLayerConfig,
  TextOverlayLayerConfig,
  LogoLayerConfig
} from '../types';

// ============================================
// TYPES
// ============================================

export interface CompositionState {
  isRendering: boolean;
  lastRendered: Date | null;
  loadedImages: Map<string, HTMLImageElement>;
  renderError: string | null;
}

export interface CompositionActions {
  // Rendering
  render: (canvas: HTMLCanvasElement) => Promise<void>;
  renderLayer: (canvas: HTMLCanvasElement, layer: HeroLayerConfig) => Promise<void>;

  // Image loading
  loadImage: (url: string) => Promise<HTMLImageElement>;
  preloadImages: (urls: string[]) => Promise<void>;
  clearImageCache: () => void;

  // Export
  exportToDataUrl: (canvas: HTMLCanvasElement, format?: string, quality?: number) => string;
  exportToBlob: (canvas: HTMLCanvasElement, format?: string, quality?: number) => Promise<Blob>;

  // Canvas utilities
  clearCanvas: (canvas: HTMLCanvasElement) => void;
  getCanvasContext: (canvas: HTMLCanvasElement) => CanvasRenderingContext2D | null;
  setCanvasSize: (canvas: HTMLCanvasElement, width: number, height: number) => void;
}

export interface UseImageCompositionOptions {
  /**
   * Default image quality for exports (0-1)
   */
  defaultQuality?: number;

  /**
   * Enable image caching
   */
  enableCache?: boolean;

  /**
   * Max cached images before cleanup
   */
  maxCacheSize?: number;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useImageComposition(
  composition: HeroImageComposition,
  options?: UseImageCompositionOptions
): [CompositionState, CompositionActions] {
  const {
    defaultQuality = 0.92,
    enableCache = true,
    maxCacheSize = 20
  } = options || {};

  // ============================================
  // STATE
  // ============================================

  const [isRendering, setIsRendering] = useState(false);
  const [lastRendered, setLastRendered] = useState<Date | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // ============================================
  // IMAGE LOADING
  // ============================================

  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (enableCache && imageCache.current.has(url)) {
        resolve(imageCache.current.get(url)!);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (enableCache) {
          // Manage cache size
          if (imageCache.current.size >= maxCacheSize) {
            const firstKey = imageCache.current.keys().next().value;
            if (firstKey) imageCache.current.delete(firstKey);
          }
          imageCache.current.set(url, img);
        }
        resolve(img);
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }, [enableCache, maxCacheSize]);

  const preloadImages = useCallback(async (urls: string[]): Promise<void> => {
    await Promise.all(urls.map(url => loadImage(url).catch(() => null)));
  }, [loadImage]);

  const clearImageCache = useCallback(() => {
    imageCache.current.clear();
  }, []);

  // ============================================
  // CANVAS UTILITIES
  // ============================================

  const getCanvasContext = useCallback((
    canvas: HTMLCanvasElement
  ): CanvasRenderingContext2D | null => {
    return canvas.getContext('2d');
  }, []);

  const clearCanvas = useCallback((canvas: HTMLCanvasElement): void => {
    const ctx = getCanvasContext(canvas);
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [getCanvasContext]);

  const setCanvasSize = useCallback((
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): void => {
    canvas.width = width;
    canvas.height = height;
  }, []);

  // ============================================
  // LAYER RENDERING
  // ============================================

  const renderBackgroundLayer = useCallback(async (
    ctx: CanvasRenderingContext2D,
    layer: BackgroundLayerConfig,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    if (!layer.visible) return;

    ctx.globalAlpha = layer.opacity / 100;

    if (layer.source === 'color' && !layer.imageUrl) {
      // Solid color or gradient background
      ctx.fillStyle = '#f0f0f0'; // Default gray
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else if (layer.imageUrl) {
      try {
        const img = await loadImage(layer.imageUrl);
        // Cover the entire canvas
        const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvasWidth - scaledWidth) / 2;
        const y = (canvasHeight - scaledHeight) / 2;
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      } catch (error) {
        console.warn('[ImageComposition] Failed to load background image:', error);
        // Fill with placeholder color
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    }

    ctx.globalAlpha = 1;
  }, [loadImage]);

  const renderCentralObjectLayer = useCallback(async (
    ctx: CanvasRenderingContext2D,
    layer: CentralObjectLayerConfig,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    if (!layer.visible || !layer.imageUrl) return;

    ctx.globalAlpha = layer.opacity / 100;

    try {
      const img = await loadImage(layer.imageUrl);

      // Calculate position in pixels
      const x = (layer.position.x / 100) * canvasWidth;
      const y = (layer.position.y / 100) * canvasHeight;
      const width = (layer.position.width / 100) * canvasWidth;
      const height = (layer.position.height / 100) * canvasHeight;

      // Draw with aspect ratio preservation
      const imgAspect = img.width / img.height;
      const boxAspect = width / height;

      let drawWidth: number;
      let drawHeight: number;
      let drawX: number;
      let drawY: number;

      if (imgAspect > boxAspect) {
        // Image is wider - fit to width
        drawWidth = width;
        drawHeight = width / imgAspect;
        drawX = x;
        drawY = y + (height - drawHeight) / 2;
      } else {
        // Image is taller - fit to height
        drawHeight = height;
        drawWidth = height * imgAspect;
        drawX = x + (width - drawWidth) / 2;
        drawY = y;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    } catch (error) {
      console.warn('[ImageComposition] Failed to load central object image:', error);
      // Draw placeholder
      const x = (layer.position.x / 100) * canvasWidth;
      const y = (layer.position.y / 100) * canvasHeight;
      const width = (layer.position.width / 100) * canvasWidth;
      const height = (layer.position.height / 100) * canvasHeight;

      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#999';
      ctx.strokeRect(x, y, width, height);

      // Draw X
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.moveTo(x + width, y);
      ctx.lineTo(x, y + height);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }, [loadImage]);

  const renderTextOverlayLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: TextOverlayLayerConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void => {
    if (!layer.visible || !layer.text) return;

    ctx.globalAlpha = layer.opacity / 100;

    // Calculate position in pixels
    const x = (layer.position.x / 100) * canvasWidth;
    const y = (layer.position.y / 100) * canvasHeight;
    const width = (layer.position.width / 100) * canvasWidth;
    const height = (layer.position.height / 100) * canvasHeight;

    // Draw background if set
    if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
      ctx.fillStyle = layer.backgroundColor;
      ctx.fillRect(x, y, width, height);
    }

    // Setup text style
    // fontSize is the actual pixel size at 1200px canvas width, scaled proportionally
    const baseFontSize = layer.fontSize || 48;
    const referenceWidth = 1200; // Base canvas width for font scaling
    const scaledFontSize = baseFontSize * (canvasWidth / referenceWidth);
    ctx.font = `${layer.fontWeight || 700} ${scaledFontSize}px ${layer.fontFamily || 'sans-serif'}`;
    ctx.fillStyle = layer.textColor || '#ffffff';
    ctx.textBaseline = 'middle';

    // Text alignment
    let textX: number;
    switch (layer.textAlign || 'center') {
      case 'left':
        ctx.textAlign = 'left';
        textX = x + (layer.padding || 16);
        break;
      case 'right':
        ctx.textAlign = 'right';
        textX = x + width - (layer.padding || 16);
        break;
      case 'center':
      default:
        ctx.textAlign = 'center';
        textX = x + width / 2;
        break;
    }

    const textY = y + height / 2;

    // Draw text with word wrapping
    const words = layer.text.split(' ');
    const maxWidth = width - (layer.padding || 16) * 2;
    const lineHeight = scaledFontSize * 1.2;
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

    // Center lines vertically
    const totalTextHeight = lines.length * lineHeight;
    let currentY = textY - totalTextHeight / 2 + lineHeight / 2;

    for (const line of lines) {
      ctx.fillText(line, textX, currentY);
      currentY += lineHeight;
    }

    ctx.globalAlpha = 1;
  }, []);

  const renderLogoLayer = useCallback(async (
    ctx: CanvasRenderingContext2D,
    layer: LogoLayerConfig,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    if (!layer.visible || !layer.imageUrl) return;

    ctx.globalAlpha = layer.opacity / 100;

    try {
      const img = await loadImage(layer.imageUrl);

      // Calculate position in pixels
      const x = (layer.position.x / 100) * canvasWidth;
      const y = (layer.position.y / 100) * canvasHeight;
      const width = (layer.position.width / 100) * canvasWidth;
      const height = (layer.position.height / 100) * canvasHeight;

      // Preserve aspect ratio
      const imgAspect = img.width / img.height;
      const boxAspect = width / height;

      let drawWidth: number;
      let drawHeight: number;
      let drawX: number;
      let drawY: number;

      if (imgAspect > boxAspect) {
        drawWidth = width;
        drawHeight = width / imgAspect;
        drawX = x;
        drawY = y + (height - drawHeight) / 2;
      } else {
        drawHeight = height;
        drawWidth = height * imgAspect;
        drawX = x + (width - drawWidth) / 2;
        drawY = y;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    } catch (error) {
      console.warn('[ImageComposition] Failed to load logo image:', error);
    }

    ctx.globalAlpha = 1;
  }, [loadImage]);

  const renderLayer = useCallback(async (
    canvas: HTMLCanvasElement,
    layer: HeroLayerConfig
  ): Promise<void> => {
    const ctx = getCanvasContext(canvas);
    if (!ctx) return;

    switch (layer.type) {
      case 'background':
        await renderBackgroundLayer(ctx, layer, canvas.width, canvas.height);
        break;
      case 'centralObject':
        await renderCentralObjectLayer(ctx, layer, canvas.width, canvas.height);
        break;
      case 'textOverlay':
        renderTextOverlayLayer(ctx, layer, canvas.width, canvas.height);
        break;
      case 'logo':
        await renderLogoLayer(ctx, layer, canvas.width, canvas.height);
        break;
    }
  }, [getCanvasContext, renderBackgroundLayer, renderCentralObjectLayer, renderTextOverlayLayer, renderLogoLayer]);

  // ============================================
  // FULL RENDER
  // ============================================

  const render = useCallback(async (canvas: HTMLCanvasElement): Promise<void> => {
    setIsRendering(true);
    setRenderError(null);

    try {
      const ctx = getCanvasContext(canvas);
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size from composition
      setCanvasSize(canvas, composition.canvasWidth, composition.canvasHeight);

      // Clear canvas
      clearCanvas(canvas);

      // Sort layers by zIndex
      const sortedLayers = [...composition.layers].sort((a, b) => a.zIndex - b.zIndex);

      // Render each layer
      for (const layer of sortedLayers) {
        await renderLayer(canvas, layer);
      }

      setLastRendered(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown render error';
      setRenderError(message);
      console.error('[ImageComposition] Render failed:', error);
    } finally {
      setIsRendering(false);
    }
  }, [composition, getCanvasContext, setCanvasSize, clearCanvas, renderLayer]);

  // ============================================
  // EXPORT
  // ============================================

  const exportToDataUrl = useCallback((
    canvas: HTMLCanvasElement,
    format: string = 'image/jpeg',
    quality: number = defaultQuality
  ): string => {
    return canvas.toDataURL(format, quality);
  }, [defaultQuality]);

  const exportToBlob = useCallback((
    canvas: HTMLCanvasElement,
    format: string = 'image/jpeg',
    quality: number = defaultQuality
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        format,
        quality
      );
    });
  }, [defaultQuality]);

  // ============================================
  // RETURN
  // ============================================

  const state: CompositionState = useMemo(() => ({
    isRendering,
    lastRendered,
    loadedImages: imageCache.current,
    renderError
  }), [isRendering, lastRendered, renderError]);

  const actions: CompositionActions = useMemo(() => ({
    render,
    renderLayer,
    loadImage,
    preloadImages,
    clearImageCache,
    exportToDataUrl,
    exportToBlob,
    clearCanvas,
    getCanvasContext,
    setCanvasSize
  }), [
    render, renderLayer, loadImage, preloadImages, clearImageCache,
    exportToDataUrl, exportToBlob, clearCanvas, getCanvasContext, setCanvasSize
  ]);

  return [state, actions];
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook for using a canvas ref with automatic rendering
 */
export function useCanvasRenderer(
  composition: HeroImageComposition,
  options?: UseImageCompositionOptions & { autoRender?: boolean }
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, actions] = useImageComposition(composition, options);

  const { autoRender = true } = options || {};

  useEffect(() => {
    if (autoRender && canvasRef.current) {
      actions.render(canvasRef.current);
    }
  }, [autoRender, actions, composition]);

  return { canvasRef, state, actions };
}

export default useImageComposition;
