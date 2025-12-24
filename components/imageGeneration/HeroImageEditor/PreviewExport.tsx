/**
 * Preview Export Component
 *
 * Final preview of the hero image and export options.
 * Supports multiple formats (AVIF, WebP, JPEG) with quality settings.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  HeroImageComposition,
  HeroImageMetadata
} from '../../../types';
import {
  exportFormats,
  exportQualityDefaults,
  canvasPresets
} from '../../../config/heroImageDefaults';
import { useImageComposition } from '../../../hooks/useImageComposition';

// ============================================
// TYPES
// ============================================

interface PreviewExportProps {
  composition: HeroImageComposition;
  canExport: boolean;
  onExport: (blob: Blob, format: string, metadata: HeroImageMetadata) => void;
  onClose: () => void;
  className?: string;
}

type ExportFormat = typeof exportFormats[number]['id'];

// ============================================
// COMPONENT
// ============================================

export const PreviewExport: React.FC<PreviewExportProps> = ({
  composition,
  canExport,
  onExport,
  onClose,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositionState, compositionActions] = useImageComposition(composition);

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('avif');
  const [quality, setQuality] = useState<number>(exportQualityDefaults.avif);
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null);

  // Render composition on mount and when it changes
  useEffect(() => {
    if (canvasRef.current) {
      compositionActions.render(canvasRef.current).then(() => {
        updatePreview();
      });
    }
  }, [composition, compositionActions]);

  // Update preview when format/quality changes
  useEffect(() => {
    updatePreview();
  }, [selectedFormat, quality]);

  const updatePreview = useCallback(async () => {
    if (!canvasRef.current) return;

    const formatInfo = exportFormats.find(f => f.id === selectedFormat);
    if (!formatInfo) return;

    try {
      const blob = await compositionActions.exportToBlob(
        canvasRef.current,
        formatInfo.mimeType,
        quality / 100
      );

      // Revoke previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Create new preview URL
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      // Calculate estimated size
      const sizeKB = blob.size / 1024;
      setEstimatedSize(
        sizeKB > 1024
          ? `${(sizeKB / 1024).toFixed(2)} MB`
          : `${sizeKB.toFixed(2)} KB`
      );
    } catch (error) {
      console.error('[PreviewExport] Failed to update preview:', error);
    }
  }, [selectedFormat, quality, previewUrl, compositionActions]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!canvasRef.current || !canExport) return;

    setIsExporting(true);

    try {
      const formatInfo = exportFormats.find(f => f.id === selectedFormat);
      if (!formatInfo) throw new Error('Invalid format');

      const blob = await compositionActions.exportToBlob(
        canvasRef.current,
        formatInfo.mimeType,
        quality / 100
      );

      onExport(blob, selectedFormat, composition.metadata);
    } catch (error) {
      console.error('[PreviewExport] Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [canExport, selectedFormat, quality, compositionActions, onExport, composition.metadata]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsExporting(true);

    try {
      const formatInfo = exportFormats.find(f => f.id === selectedFormat);
      if (!formatInfo) throw new Error('Invalid format');

      const blob = await compositionActions.exportToBlob(
        canvasRef.current,
        formatInfo.mimeType,
        quality / 100
      );

      // Create download link with correct extension
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Strip any existing extension from filename and add the correct one
      const baseFileName = (composition.metadata.fileName || 'hero-image').replace(/\.(avif|webp|png|jpg|jpeg)$/i, '');
      a.download = `${baseFileName}${formatInfo.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[PreviewExport] Download failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, quality, compositionActions, composition.metadata.fileName]);

  // Update quality when format changes
  useEffect(() => {
    setQuality(exportQualityDefaults[selectedFormat as keyof typeof exportQualityDefaults] || 85);
  }, [selectedFormat]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 ${className}`}>
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Preview & Export</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Preview */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Preview</h3>
                <div className="relative bg-gray-700 rounded overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
                  {/* Off-screen canvas for rendering (display:none prevents proper canvas rendering) */}
                  <canvas
                    ref={canvasRef}
                    className="absolute -z-10 opacity-0 pointer-events-none"
                    width={composition.canvasWidth}
                    height={composition.canvasHeight}
                  />

                  {/* Preview image */}
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-[400px] object-contain"
                    />
                  ) : (
                    <div className="text-gray-500">Loading preview...</div>
                  )}
                </div>

                {/* Image Info */}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{composition.canvasWidth} x {composition.canvasHeight}px</span>
                  <span>{estimatedSize || 'Calculating...'}</span>
                </div>
              </div>

              {/* Export Warnings */}
              {!canExport && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-300">Cannot Export</p>
                      <p className="text-xs text-red-400 mt-1">
                        Please fix all validation errors before exporting.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Options */}
            <div className="space-y-4">
              {/* Format Selection */}
              <div className="bg-gray-900 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Format</h3>
                <div className="space-y-2">
                  {exportFormats.map(format => (
                    <label
                      key={format.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                        selectedFormat === format.id
                          ? 'bg-blue-900/40 border border-blue-700'
                          : 'hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={format.id}
                        checked={selectedFormat === format.id}
                        onChange={() => setSelectedFormat(format.id as ExportFormat)}
                        className="text-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {format.name}
                          </span>
                          {format.recommended && (
                            <span className="text-xs bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{format.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quality */}
              {selectedFormat !== 'png' && (
                <div className="bg-gray-900 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    Quality: {quality}%
                  </h3>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </div>
              )}

              {/* Metadata Summary */}
              <div className="bg-gray-900 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Metadata</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">File name:</span>
                    <span className="text-gray-200 truncate max-w-32">
                      {composition.metadata.fileName || 'hero-image'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Alt text:</span>
                    <span className={`truncate max-w-32 ${composition.metadata.altText ? 'text-gray-200' : 'text-red-400'}`}>
                      {composition.metadata.altText ? 'Set' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Creator:</span>
                    <span className={`truncate max-w-32 ${composition.metadata.iptc?.creator ? 'text-gray-200' : 'text-gray-500'}`}>
                      {composition.metadata.iptc?.creator || 'Not set'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleExport}
                  disabled={!canExport || isExporting}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    canExport && !isExporting
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isExporting ? 'Exporting...' : 'Insert into Draft'}
                </button>

                <button
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-200 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Download Only
                </button>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewExport;
