/**
 * Preview Step
 *
 * Step 3 of Style & Publish modal.
 * Live preview with device frames and SEO validation.
 * Includes collapsible panels for layout and blueprint adjustments.
 *
 * @module components/publishing/steps/PreviewStep
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../../ui/Button';
import { LayoutPanel } from '../panels/LayoutPanel';
import { BlueprintPanel } from '../panels/BlueprintPanel';
import { BrandMatchIndicator } from '../BrandMatchIndicator';
import type {
  StyledContentOutput,
  DevicePreview,
  SeoWarning,
  LayoutConfiguration,
  ContentTypeTemplate,
} from '../../../types/publishing';
import type { LayoutBlueprint } from '../../../services/publishing';

// ============================================================================
// Types
// ============================================================================

interface PreviewStepProps {
  preview: StyledContentOutput | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  seoWarnings: SeoWarning[];
  onCopyHtml?: (html: string) => void;
  onCopyCss?: (css: string) => void;
  // Layout configuration
  layout?: LayoutConfiguration;
  onLayoutChange?: (updates: Partial<LayoutConfiguration>) => void;
  onTemplateChange?: (template: ContentTypeTemplate) => void;
  // Blueprint configuration
  blueprint?: LayoutBlueprint | null;
  onBlueprintChange?: (blueprint: LayoutBlueprint) => void;
  isBlueprintGenerating?: boolean;
  onRegenerateBlueprint?: () => void;
  // Brand validation
  brandMatchScore?: number;
  brandAssessment?: string;
  onShowBrandDetails?: () => void;
}

interface DeviceFrameProps {
  device: DevicePreview;
  children: React.ReactNode;
}

// ============================================================================
// Device Frame Component
// ============================================================================

const DEVICE_SIZES: Record<DevicePreview, { width: number; height: number; label: string; scale: number }> = {
  desktop: { width: 1200, height: 900, label: 'Desktop', scale: 0.85 },
  tablet: { width: 768, height: 1024, label: 'Tablet', scale: 0.65 },
  mobile: { width: 375, height: 700, label: 'Mobile', scale: 0.85 },
};

const DeviceFrame: React.FC<DeviceFrameProps> = ({ device, children }) => {
  const size = DEVICE_SIZES[device];
  const scale = size.scale;

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
          absolute inset-0 rounded-xl border-2 border-gray-600 bg-gray-900 overflow-hidden shadow-2xl
          ${device === 'mobile' ? 'rounded-3xl border-4 border-gray-700' : ''}
        `}
      >
        {/* Browser chrome for desktop/tablet */}
        {device !== 'mobile' && (
          <div className="h-8 bg-gradient-to-b from-gray-750 to-gray-800 border-b border-gray-700 flex items-center px-3 gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
            <div className="flex-1 mx-4">
              <div className="h-5 bg-gray-700/80 rounded-md text-xs text-gray-400 flex items-center justify-center px-4">
                preview.yoursite.com
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

        {/* Content area with scaled content */}
        <div
          className="overflow-auto"
          style={{
            height: device === 'mobile'
              ? size.height * scale - 20 - 16
              : size.height * scale - 32 - 8,
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: size.width,
              minHeight: size.height - (device === 'mobile' ? 36 : 40),
            }}
          >
            {children}
          </div>
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
  onCopyHtml,
  onCopyCss,
  // Layout props
  layout,
  onLayoutChange,
  onTemplateChange,
  // Blueprint props
  blueprint,
  onBlueprintChange,
  isBlueprintGenerating,
  onRegenerateBlueprint,
  // Brand validation props
  brandMatchScore,
  brandAssessment,
  onShowBrandDetails,
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
      <div className="flex flex-col items-center justify-center h-96 text-zinc-400">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full mb-4" />
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
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
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

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (preview) {
                const bundle = `<style>\n${preview.css}\n</style>\n${preview.html}`;
                navigator.clipboard.writeText(bundle);
                if (onCopyHtml) onCopyHtml(bundle);
              }
            }}
          >
            📋 Copy Bundle
          </Button>

          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            Regenerate
          </Button>
        </div>
      </div>

      {/* Brand Match Indicator */}
      {brandMatchScore !== undefined && (
        <BrandMatchIndicator
          score={brandMatchScore}
          assessmentText={brandAssessment}
          onShowDetails={onShowBrandDetails}
        />
      )}

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
                className={`text-xs flex items-start gap-2 ${warning.severity === 'error' ? 'text-red-400' :
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
      <div className="bg-gray-900 rounded-xl p-6 overflow-auto shadow-2xl" style={{ minHeight: '650px', maxHeight: '80vh' }}>
        {showRawHtml ? (
          <div className="space-y-4">
            {/* HTML Code */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">HTML</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-[50vh]">
                <code>{preview.html}</code>
              </pre>
            </div>

            {/* CSS Code */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSS</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-[50vh]">
                <code>{preview.css}</code>
              </pre>
            </div>

            {/* CSS Variables */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSS Variables</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-[50vh]">
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

      {/* Adjustment Panels - collapsed by default */}
      {(layout || blueprint) && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 italic">
            Preview looks good? Click "Next" to publish. Want changes? Expand panels below.
          </p>

          {layout && onLayoutChange && onTemplateChange && (
            <LayoutPanel
              layout={layout}
              onChange={onLayoutChange}
              onTemplateChange={onTemplateChange}
            />
          )}

          {blueprint && onBlueprintChange && (
            <BlueprintPanel
              blueprint={blueprint}
              onBlueprintChange={onBlueprintChange}
              isGenerating={isBlueprintGenerating}
              onRegenerate={onRegenerateBlueprint}
            />
          )}
        </div>
      )}

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
