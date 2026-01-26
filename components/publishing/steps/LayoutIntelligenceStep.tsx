/**
 * Layout Intelligence Step
 *
 * Step 2 of the 3-step publishing flow. Shows the AI's layout decisions
 * for each section of the article, making the intelligence visible and adjustable.
 *
 * Features:
 * - Summary stats (total sections, hero-level, suggestions applied)
 * - Scrollable list of SectionPreviewCards
 * - Global settings summary (fonts, spacing, color scheme)
 * - Collapsible suggestions detail section
 *
 * @module components/publishing/steps/LayoutIntelligenceStep
 */

import React, { useState } from 'react';
import { SectionPreviewCard } from '../SectionPreviewCard';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import type { LayoutBlueprint } from '../../../services/layout-engine/types';

// ============================================================================
// Types
// ============================================================================

interface LayoutIntelligenceStepProps {
  blueprint: LayoutBlueprint | null;
  isGenerating: boolean;
  error: string | null;
  onRegenerate?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const LayoutIntelligenceStep: React.FC<LayoutIntelligenceStepProps> = ({
  blueprint,
  isGenerating,
  error,
  onRegenerate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Calculate summary stats
  const heroCount = blueprint?.sections.filter((s) => s.emphasis.level === 'hero').length || 0;
  const featuredCount = blueprint?.sections.filter((s) => s.emphasis.level === 'featured').length || 0;
  const totalSections = blueprint?.sections.length || 0;
  const mainSectionCount = blueprint?.metadata.mainSectionCount || 0;
  const supplementaryCount = blueprint?.metadata.supplementarySectionCount || 0;

  // For now, suggestions applied is 0 until we have full suggestion system
  const suggestionsApplied = 0;

  // Build summary text
  const buildSummaryText = (): string => {
    const parts: string[] = [];
    parts.push(`${totalSections} sections analyzed`);
    if (heroCount > 0) parts.push(`${heroCount} hero-level`);
    if (featuredCount > 0) parts.push(`${featuredCount} featured`);
    if (suggestionsApplied > 0) parts.push(`${suggestionsApplied} suggestions applied`);
    return parts.join(' \u00B7 ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label="brain">
          &#129504;
        </span>
        <div>
          <h3 className="text-lg font-bold text-white">Layout Intelligence</h3>
          <p className="text-xs text-zinc-400">
            AI-powered layout decisions based on content analysis
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="p-8 bg-zinc-900/40 rounded-xl border border-zinc-700 flex flex-col items-center justify-center">
          <Loader size="lg" />
          <p className="mt-4 text-sm text-zinc-400">Analyzing content structure...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isGenerating && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
          {onRegenerate && (
            <Button variant="secondary" size="sm" onClick={onRegenerate} className="mt-2">
              Try Again
            </Button>
          )}
        </div>
      )}

      {/* No Blueprint Yet */}
      {!blueprint && !isGenerating && !error && (
        <div className="p-8 bg-zinc-900/40 rounded-xl border border-zinc-700 text-center">
          <p className="text-zinc-400">No layout generated yet.</p>
          <p className="text-xs text-zinc-500 mt-2">Complete brand detection first.</p>
        </div>
      )}

      {/* Blueprint Results */}
      {blueprint && !isGenerating && (
        <>
          {/* Summary Card */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-white">Summary</h4>
                <p className="text-xs text-zinc-400 mt-1">{buildSummaryText()}</p>
                {(mainSectionCount > 0 || supplementaryCount > 0) && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {mainSectionCount} main + {supplementaryCount} supplementary
                  </p>
                )}
              </div>
              {onRegenerate && (
                <Button variant="secondary" size="sm" onClick={onRegenerate}>
                  Regenerate
                </Button>
              )}
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            <h4 className="text-sm font-medium text-zinc-300 sticky top-0 bg-zinc-950 py-2 z-10">
              Sections ({totalSections})
            </h4>
            {blueprint.sections.map((section) => (
              <SectionPreviewCard
                key={section.id}
                section={section}
                isHighlighted={selectedSectionId === section.id}
                onClick={() =>
                  setSelectedSectionId(selectedSectionId === section.id ? null : section.id)
                }
              />
            ))}
          </div>

          {/* Suggestions Collapsible */}
          {suggestionsApplied > 0 && (
            <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-sm font-medium text-zinc-300">
                  Suggestions Applied ({suggestionsApplied})
                </span>
                <span
                  className={`text-zinc-400 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                >
                  &#9660;
                </span>
              </button>
              {isExpanded && (
                <div className="p-4 bg-zinc-950/50 text-xs text-zinc-400">
                  <p>
                    Suggestions detail will appear here when the full suggestion system is
                    integrated.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Global Settings Summary */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700/50">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Global Settings</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Default Width:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings.defaultWidth}</span>
              </div>
              <div>
                <span className="text-zinc-500">Spacing:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings.defaultSpacing}</span>
              </div>
              <div>
                <span className="text-zinc-500">Primary Font:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings.primaryFont}</span>
              </div>
              <div>
                <span className="text-zinc-500">Secondary Font:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings.secondaryFont}</span>
              </div>
              <div>
                <span className="text-zinc-500">Color Scheme:</span>
                <span className="ml-2 text-white capitalize">
                  {blueprint.globalSettings.colorScheme}
                </span>
              </div>
              {blueprint.metadata.heroSectionId && (
                <div>
                  <span className="text-zinc-500">Hero Section:</span>
                  <span className="ml-2 text-yellow-400">Detected</span>
                </div>
              )}
            </div>
          </div>

          {/* Average Semantic Weight */}
          {blueprint.metadata.averageSemanticWeight > 0 && (
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
              <span className="text-xs text-zinc-500">Average Semantic Weight</span>
              <span className="text-sm font-medium text-white">
                {blueprint.metadata.averageSemanticWeight.toFixed(1)} / 5.0
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LayoutIntelligenceStep;
