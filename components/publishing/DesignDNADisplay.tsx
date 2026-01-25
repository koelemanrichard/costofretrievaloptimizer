// components/publishing/DesignDNADisplay.tsx
import React, { useState, useCallback } from 'react';
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
              style={{ backgroundColor: dna.colors.primary.hex }}
              title={`Primary: ${dna.colors.primary.hex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.secondary.hex }}
              title={`Secondary: ${dna.colors.secondary.hex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.accent.hex }}
              title={`Accent: ${dna.colors.accent.hex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.neutrals.dark }}
              title={`Neutral: ${dna.colors.neutrals.dark}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.neutrals.light }}
              title={`Light: ${dna.colors.neutrals.light}`}
            />
            <span className="text-xs text-gray-500 ml-2">
              {dna.typography.headingFont.family} + {dna.typography.bodyFont.family}
            </span>
          </div>

          {/* Personality & confidence */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-300 capitalize">{dna.personality.overall} vibe</span>
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
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: dna.colors.primary.hex }} />
                  <span className="text-gray-300">{dna.colors.primary.hex}</span>
                </div>
                <span className="text-gray-500">Primary • {dna.colors.primary.usage}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: dna.colors.secondary.hex }} />
                  <span className="text-gray-300">{dna.colors.secondary.hex}</span>
                </div>
                <span className="text-gray-500">Secondary • {dna.colors.secondary.usage}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: dna.colors.accent.hex }} />
                  <span className="text-gray-300">{dna.colors.accent.hex}</span>
                </div>
                <span className="text-gray-500">Accent • {dna.colors.accent.usage}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Neutrals</div>
              <div className="flex gap-1">
                {Object.entries(dna.colors.neutrals).map(([key, value]) => (
                  <div
                    key={key}
                    className="w-6 h-6 rounded border border-white/10"
                    style={{ backgroundColor: value }}
                    title={`${key}: ${value}`}
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
                  {dna.typography.headingFont.family} {dna.typography.headingFont.weight}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Body:</span>
                <span className="text-gray-300 ml-2">
                  {dna.typography.bodyFont.family} {dna.typography.bodyFont.weight}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Scale:</span>
                <span className="text-gray-300 ml-2">{dna.typography.scaleRatio}</span>
              </div>
              <div>
                <span className="text-gray-500">Base size:</span>
                <span className="text-gray-300 ml-2">{dna.typography.baseSize}</span>
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
                <span className="text-gray-300 ml-2 capitalize">{dna.shapes.borderRadius.style}</span>
              </div>
              <div>
                <span className="text-gray-500">Shadows:</span>
                <span className="text-gray-300 ml-2 capitalize">{dna.effects.shadows.style}</span>
              </div>
              <div>
                <span className="text-gray-500">Buttons:</span>
                <span className="text-gray-300 ml-2 capitalize">{dna.shapes.buttonStyle}</span>
              </div>
              <div>
                <span className="text-gray-500">Cards:</span>
                <span className="text-gray-300 ml-2 capitalize">{dna.shapes.cardStyle}</span>
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
                Overall: {dna.personality.overall}
              </div>
              {/* Formality bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Formality</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(dna.personality.formality / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{dna.personality.formality}/5</span>
              </div>
              {/* Energy bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Energy</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${(dna.personality.energy / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{dna.personality.energy}/5</span>
              </div>
              {/* Warmth bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Warmth</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${(dna.personality.warmth / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{dna.personality.warmth}/5</span>
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
