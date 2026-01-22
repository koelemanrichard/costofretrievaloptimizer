/**
 * Preview Step
 *
 * Step 3 of Style & Publish modal.
 * Live preview with device frames and SEO validation.
 *
 * @module components/publishing/steps/PreviewStep
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../../ui/Button';
import type {
  StyledContentOutput,
  DevicePreview,
  SeoWarning,
} from '../../../types/publishing';

// ============================================================================
// Types
// ============================================================================

interface PreviewStepProps {
  preview: StyledContentOutput | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  seoWarnings: SeoWarning[];
}

interface DeviceFrameProps {
  device: DevicePreview;
  children: React.ReactNode;
}

// ============================================================================
// Device Frame Component
// ============================================================================

const DEVICE_SIZES: Record<DevicePreview, { width: number; height: number; label: string }> = {
  desktop: { width: 1200, height: 800, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 667, label: 'Mobile' },
};

const DeviceFrame: React.FC<DeviceFrameProps> = ({ device, children }) => {
  const size = DEVICE_SIZES[device];
  const scale = device === 'desktop' ? 0.6 : device === 'tablet' ? 0.5 : 0.7;

  return (
    <div
      className="relative mx-auto"
      style={{
        width: size.width * scale,
        height: size.height * scale,
      }}
    >
      {/* Device frame */}
      <div
        className={`
          absolute inset-0 rounded-lg border-4 border-gray-700 bg-gray-900 overflow-hidden
          ${device === 'mobile' ? 'rounded-3xl' : ''}
        `}
      >
        {/* Browser chrome for desktop/tablet */}
        {device !== 'mobile' && (
          <div className="h-6 bg-gray-800 border-b border-gray-700 flex items-center px-2 gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div className="flex-1 mx-2">
              <div className="h-3 bg-gray-700 rounded text-[8px] text-gray-500 flex items-center justify-center">
                preview.example.com
              </div>
            </div>
          </div>
        )}

        {/* Mobile notch */}
        {device === 'mobile' && (
          <div className="h-5 bg-gray-900 flex items-center justify-center">
            <div className="w-16 h-2 bg-gray-800 rounded-full" />
          </div>
        )}

        {/* Content iframe */}
        <div
          className="overflow-auto bg-white"
          style={{
            height: device === 'mobile'
              ? size.height * scale - 20 - 16
              : size.height * scale - 24 - 8,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: size.width,
            maxHeight: device === 'mobile'
              ? (size.height - 36) / scale
              : (size.height - 32) / scale,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

export const PreviewStep: React.FC<PreviewStepProps> = ({
  preview,
  isGenerating,
  onRegenerate,
  seoWarnings,
}) => {
  const [device, setDevice] = useState<DevicePreview>('desktop');
  const [showRawHtml, setShowRawHtml] = useState(false);

  // SEO warning counts
  const warningCounts = useMemo(() => ({
    error: seoWarnings.filter(w => w.severity === 'error').length,
    warning: seoWarnings.filter(w => w.severity === 'warning').length,
    info: seoWarnings.filter(w => w.severity === 'info').length,
  }), [seoWarnings]);

  // Render loading state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p>Generating styled preview...</p>
      </div>
    );
  }

  // Render empty state
  if (!preview) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <p className="mb-4">No preview available</p>
        <Button variant="secondary" onClick={onRegenerate}>
          Generate Preview
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Device selector */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {(Object.keys(DEVICE_SIZES) as DevicePreview[]).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-colors
                ${device === d
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              {d === 'desktop' ? '💻' : d === 'tablet' ? '📱' : '📱'}
              <span className="ml-1 hidden sm:inline">{DEVICE_SIZES[d].label}</span>
            </button>
          ))}
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRawHtml(!showRawHtml)}
            className={`
              px-3 py-1.5 text-sm rounded-md transition-colors
              ${showRawHtml
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {showRawHtml ? '👁️ Preview' : '</> HTML'}
          </button>

          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            Regenerate
          </Button>
        </div>
      </div>

      {/* SEO Validation */}
      {seoWarnings.length > 0 && (
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm font-medium text-white">SEO Validation</span>
            {warningCounts.error > 0 && (
              <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">
                {warningCounts.error} error{warningCounts.error > 1 ? 's' : ''}
              </span>
            )}
            {warningCounts.warning > 0 && (
              <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                {warningCounts.warning} warning{warningCounts.warning > 1 ? 's' : ''}
              </span>
            )}
            {warningCounts.info > 0 && (
              <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded">
                {warningCounts.info} info
              </span>
            )}
          </div>

          <ul className="space-y-1">
            {seoWarnings.slice(0, 3).map((warning, index) => (
              <li
                key={index}
                className={`text-xs flex items-start gap-2 ${
                  warning.severity === 'error' ? 'text-red-400' :
                  warning.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                }`}
              >
                <span>
                  {warning.severity === 'error' ? '❌' :
                   warning.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span>
                  {warning.message}
                  {warning.suggestion && (
                    <span className="text-gray-500 ml-1">— {warning.suggestion}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview / HTML View */}
      <div className="bg-gray-900 rounded-lg p-4 overflow-hidden" style={{ minHeight: '500px' }}>
        {showRawHtml ? (
          <div className="space-y-4">
            {/* HTML Code */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">HTML</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-x-auto text-xs text-gray-300 max-h-60">
                <code>{preview.html}</code>
              </pre>
            </div>

            {/* CSS Code */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSS</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-x-auto text-xs text-gray-300 max-h-60">
                <code>{preview.css}</code>
              </pre>
            </div>

            {/* CSS Variables */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSS Variables</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-x-auto text-xs text-gray-300 max-h-40">
                <code>{JSON.stringify(preview.cssVariables, null, 2)}</code>
              </pre>
            </div>
          </div>
        ) : (
          <DeviceFrame device={device}>
            <style dangerouslySetInnerHTML={{ __html: preview.css }} />
            <div dangerouslySetInnerHTML={{ __html: preview.html }} />
          </DeviceFrame>
        )}
      </div>

      {/* Component Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {preview.components.length} components detected •
          Template: {preview.template}
        </span>
        <span>
          {preview.seoValidation.headingStructure.hasH1 ? '✓' : '✗'} H1 •
          {preview.seoValidation.schemaPreserved ? '✓' : '✗'} Schema
        </span>
      </div>
    </div>
  );
};

export default PreviewStep;
