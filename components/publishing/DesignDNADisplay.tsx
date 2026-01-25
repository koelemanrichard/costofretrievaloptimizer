// components/publishing/DesignDNADisplay.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { DesignDNA } from '../../types/designDna';
import { DesignDNAEditors, type EditSection } from './editors/DesignDNAEditors';

interface DesignDNADisplayProps {
  dna: DesignDNA;
  screenshotBase64?: string;
  sourceUrl: string;
  confidence: number;
  onDnaChange?: (updatedDna: DesignDNA) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

// Helper to safely get color hex value
const getColorHex = (color: { hex?: string } | string | undefined, fallback: string): string => {
  if (!color) return fallback;
  if (typeof color === 'string') return color;
  return color.hex || fallback;
};

// Helper to safely get color usage
const getColorUsage = (color: { usage?: string } | undefined, fallback: string): string => {
  if (!color || typeof color === 'string') return fallback;
  return color.usage || fallback;
};

export const DesignDNADisplay: React.FC<DesignDNADisplayProps> = ({
  dna,
  screenshotBase64,
  sourceUrl,
  confidence,
  onDnaChange,
  isExpanded,
  onToggleExpand,
}) => {
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection | null>(null);

  // Safely extract values with fallbacks
  const safeValues = useMemo(() => {
    const colors = dna?.colors as DesignDNA['colors'] | undefined;
    const typography = dna?.typography as DesignDNA['typography'] | undefined;
    const shapes = dna?.shapes as DesignDNA['shapes'] | undefined;
    const effects = dna?.effects as DesignDNA['effects'] | undefined;
    const personality = dna?.personality as DesignDNA['personality'] | undefined;
    const neutrals = colors?.neutrals || {} as Record<string, string>;

    return {
      primaryHex: getColorHex(colors?.primary, '#3b82f6'),
      primaryUsage: getColorUsage(colors?.primary, 'buttons'),
      secondaryHex: getColorHex(colors?.secondary, '#1f2937'),
      secondaryUsage: getColorUsage(colors?.secondary, 'text'),
      accentHex: getColorHex(colors?.accent, '#f59e0b'),
      accentUsage: getColorUsage(colors?.accent, 'highlights'),
      neutralDark: neutrals?.dark || '#374151',
      neutralLight: neutrals?.light || '#f3f4f6',
      neutrals: neutrals,
      headingFont: typography?.headingFont?.family || 'system-ui',
      headingWeight: typography?.headingFont?.weight || 700,
      bodyFont: typography?.bodyFont?.family || 'system-ui',
      bodyWeight: typography?.bodyFont?.weight || 400,
      scaleRatio: typography?.scaleRatio || 1.25,
      baseSize: typography?.baseSize || '16px',
      borderRadiusStyle: shapes?.borderRadius?.style || 'rounded',
      buttonStyle: shapes?.buttonStyle || 'rounded',
      cardStyle: shapes?.cardStyle || 'elevated',
      shadowStyle: effects?.shadows?.style || 'subtle',
      personalityOverall: personality?.overall || 'modern',
      formality: personality?.formality ?? 3,
      energy: personality?.energy ?? 3,
      warmth: personality?.warmth ?? 3,
    };
  }, [dna]);

  const handleEdit = useCallback((section: EditSection) => {
    setEditingSection(section);
  }, []);

  const handleSaveEdit = useCallback((updatedDna: DesignDNA) => {
    onDnaChange?.(updatedDna);
    setEditingSection(null);
  }, [onDnaChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
  }, []);

  // Extract domain for display
  const domain = sourceUrl.replace(/^https?:\/\//, '').split('/')[0];

  return (
    <div className="space-y-4">
      {/* Collapsed View - Always visible */}
      <div className="flex gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        {/* Screenshot thumbnail */}
        {screenshotBase64 && (
          <button
            onClick={() => setShowFullScreenshot(true)}
            className="w-24 h-24 rounded-lg overflow-hidden border border-gray-600 hover:border-blue-500 transition-colors flex-shrink-0"
          >
            <img
              src={`data:image/jpeg;base64,${screenshotBase64}`}
              alt="Website screenshot"
              className="w-full h-full object-cover object-top"
            />
          </button>
        )}

        {/* Summary info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-400 mb-1">{domain}</div>

          {/* Color palette dots */}
          <div className="flex items-center gap-1 mb-2">
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: safeValues.primaryHex }}
              title={`Primary: ${safeValues.primaryHex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: safeValues.secondaryHex }}
              title={`Secondary: ${safeValues.secondaryHex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: safeValues.accentHex }}
              title={`Accent: ${safeValues.accentHex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: safeValues.neutralDark }}
              title={`Neutral: ${safeValues.neutralDark}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: safeValues.neutralLight }}
              title={`Light: ${safeValues.neutralLight}`}
            />
            <span className="text-xs text-gray-500 ml-2">
              {safeValues.headingFont} + {safeValues.bodyFont}
            </span>
          </div>

          {/* Personality & confidence */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-300 capitalize">{safeValues.personalityOverall} vibe</span>
            <span className="text-gray-500">•</span>
            <span className="text-green-400">{confidence}% confidence</span>
          </div>
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={onToggleExpand}
          className="text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap"
        >
          {isExpanded ? 'Hide Details ▲' : 'Show Details ▼'}
        </button>
      </div>

      {/* Expanded View - Power User Details */}
      {isExpanded && (
        <div className="space-y-4 pl-4 border-l-2 border-gray-700">
          {/* Colors Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Colors</h4>
              {onDnaChange && (
                <button
                  onClick={() => handleEdit('colors')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: safeValues.primaryHex }} />
                  <span className="text-gray-300">{safeValues.primaryHex}</span>
                </div>
                <span className="text-gray-500">Primary • {safeValues.primaryUsage}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: safeValues.secondaryHex }} />
                  <span className="text-gray-300">{safeValues.secondaryHex}</span>
                </div>
                <span className="text-gray-500">Secondary • {safeValues.secondaryUsage}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: safeValues.accentHex }} />
                  <span className="text-gray-300">{safeValues.accentHex}</span>
                </div>
                <span className="text-gray-500">Accent • {safeValues.accentUsage}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Neutrals</div>
              <div className="flex gap-1">
                {Object.entries(safeValues.neutrals).map(([key, value]) => (
                  <div
                    key={key}
                    className="w-6 h-6 rounded border border-white/10"
                    style={{ backgroundColor: typeof value === 'string' ? value : '#888' }}
                    title={`${key}: ${typeof value === 'string' ? value : 'N/A'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Typography Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Typography</h4>
              {onDnaChange && (
                <button
                  onClick={() => handleEdit('typography')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Headings:</span>
                <span className="text-gray-300 ml-2">
                  {safeValues.headingFont} {safeValues.headingWeight}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Body:</span>
                <span className="text-gray-300 ml-2">
                  {safeValues.bodyFont} {safeValues.bodyWeight}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Scale:</span>
                <span className="text-gray-300 ml-2">{safeValues.scaleRatio}</span>
              </div>
              <div>
                <span className="text-gray-500">Base size:</span>
                <span className="text-gray-300 ml-2">{safeValues.baseSize}</span>
              </div>
            </div>
          </div>

          {/* Shapes & Effects Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Shapes & Effects</h4>
              {onDnaChange && (
                <button
                  onClick={() => handleEdit('shapes')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Corners:</span>
                <span className="text-gray-300 ml-2 capitalize">{safeValues.borderRadiusStyle}</span>
              </div>
              <div>
                <span className="text-gray-500">Shadows:</span>
                <span className="text-gray-300 ml-2 capitalize">{safeValues.shadowStyle}</span>
              </div>
              <div>
                <span className="text-gray-500">Buttons:</span>
                <span className="text-gray-300 ml-2 capitalize">{safeValues.buttonStyle}</span>
              </div>
              <div>
                <span className="text-gray-500">Cards:</span>
                <span className="text-gray-300 ml-2 capitalize">{safeValues.cardStyle}</span>
              </div>
            </div>
          </div>

          {/* Personality Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Brand Personality</h4>
              {onDnaChange && (
                <button
                  onClick={() => handleEdit('personality')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-300 capitalize mb-3">
                Overall: {safeValues.personalityOverall}
              </div>
              {/* Formality bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Formality</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(safeValues.formality / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{safeValues.formality}/5</span>
              </div>
              {/* Energy bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Energy</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${(safeValues.energy / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{safeValues.energy}/5</span>
              </div>
              {/* Warmth bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Warmth</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${(safeValues.warmth / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{safeValues.warmth}/5</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Editor */}
      {editingSection && (
        <DesignDNAEditors
          dna={dna}
          editingSection={editingSection}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Full screenshot modal */}
      {showFullScreenshot && screenshotBase64 && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowFullScreenshot(false)}
        >
          <div className="max-w-4xl max-h-full overflow-auto rounded-lg">
            <img
              src={`data:image/jpeg;base64,${screenshotBase64}`}
              alt="Website screenshot"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
