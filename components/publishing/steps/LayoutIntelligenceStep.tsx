/**
 * Layout Intelligence Step
 *
 * Step 2 of the 3-step publishing flow. Shows the AI's layout decisions
 * for each section of the article, making the intelligence visible and adjustable.
 *
 * Features:
 * - Summary stats (total sections, hero-level, featured)
 * - Expandable section cards with layout reasoning
 * - Editable section properties (component, emphasis, width, columns, accent)
 * - Global settings summary (fonts, spacing, color scheme)
 * - Clear guidance on what this step does and what happens next
 *
 * @module components/publishing/steps/LayoutIntelligenceStep
 */

import React, { useState } from 'react';
import { SectionPreviewCard } from '../SectionPreviewCard';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import type {
  LayoutBlueprint,
  BlueprintSection,
  ComponentType,
  EmphasisLevel,
  LayoutWidth,
  ColumnLayout,
} from '../../../services/layout-engine/types';

// ============================================================================
// Constants
// ============================================================================

const COMPONENT_TYPES: ComponentType[] = [
  'prose', 'card', 'hero', 'feature-grid', 'timeline', 'step-list',
  'checklist', 'stat-highlight', 'key-takeaways', 'faq-accordion',
  'accordion', 'comparison-table', 'testimonial-card', 'cta-banner',
  'blockquote', 'definition-box',
];

const EMPHASIS_LEVELS: EmphasisLevel[] = ['hero', 'featured', 'standard', 'supporting', 'minimal'];

const LAYOUT_WIDTHS: LayoutWidth[] = ['narrow', 'medium', 'wide', 'full'];

const COLUMN_LAYOUTS: ColumnLayout[] = ['1-column', '2-column', '3-column', 'asymmetric-left', 'asymmetric-right'];

const ACCENT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'top', label: 'Top' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface LayoutIntelligenceStepProps {
  blueprint: LayoutBlueprint | null;
  isGenerating: boolean;
  error: string | null;
  onRegenerate?: () => void;
  onBlueprintChange?: (blueprint: LayoutBlueprint) => void;
}

// ============================================================================
// Component
// ============================================================================

export const LayoutIntelligenceStep: React.FC<LayoutIntelligenceStepProps> = ({
  blueprint,
  isGenerating,
  error,
  onRegenerate,
  onBlueprintChange,
}) => {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  // Calculate summary stats with defensive checks
  const heroCount = blueprint?.sections?.filter((s) => s.emphasis?.level === 'hero').length || 0;
  const featuredCount = blueprint?.sections?.filter((s) => s.emphasis?.level === 'featured').length || 0;
  const totalSections = blueprint?.sections?.length || 0;
  const mainSectionCount = blueprint?.metadata?.mainSectionCount || 0;
  const supplementaryCount = blueprint?.metadata?.supplementarySectionCount || 0;

  // Count unique component types for the summary
  const componentTypes = new Set(
    (blueprint?.sections || []).map(s => s.component?.primaryComponent || 'prose')
  );

  // Build summary text
  const buildSummaryText = (): string => {
    const parts: string[] = [];
    parts.push(`${totalSections} sections analyzed`);
    if (heroCount > 0) parts.push(`${heroCount} hero`);
    if (featuredCount > 0) parts.push(`${featuredCount} featured`);
    return parts.join(' \u00B7 ');
  };

  // Update a single section in the blueprint
  const updateSection = (sectionId: string, updates: Partial<BlueprintSection>) => {
    if (!blueprint || !onBlueprintChange) return;
    const updatedSections = blueprint.sections.map(s => {
      const sid = s.id || `section-${s.order ?? 0}`;
      if (sid !== sectionId) return s;
      return {
        ...s,
        ...updates,
        component: updates.component ? { ...s.component, ...updates.component } : s.component,
        emphasis: updates.emphasis ? { ...s.emphasis, ...updates.emphasis } : s.emphasis,
        layout: updates.layout ? { ...s.layout, ...updates.layout } : s.layout,
      };
    });
    onBlueprintChange({ ...blueprint, sections: updatedSections });
  };

  // Shared dropdown styles
  const selectClass = 'w-full px-2 py-1 text-xs bg-zinc-800 text-zinc-200 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer';
  const labelClass = 'text-[10px] text-zinc-500 mb-0.5 block';

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
          {/* Explanation Banner */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-300">
              The AI analyzed your article's {totalSections} sections and assigned a visual component
              to each based on its content type and semantic importance.
              {onBlueprintChange
                ? ' Click a section to adjust its component, emphasis, width, and layout.'
                : ' Sections with higher weight get more visual emphasis in the final output.'}
            </p>
          </div>

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
                <div className="text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      console.log('[LayoutIntelligenceStep] Regenerate clicked');
                      onRegenerate();
                    }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Regenerating...' : 'Regenerate Layout'}
                  </Button>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Re-runs the layout analysis for different component choices
                  </p>
                </div>
              )}
            </div>

            {/* Component type distribution */}
            {componentTypes.size > 1 && (
              <div className="mt-3 pt-3 border-t border-zinc-700/50">
                <p className="text-[10px] text-zinc-500 mb-2">Component types used:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(componentTypes).map(type => {
                    const count = (blueprint.sections || []).filter(
                      s => (s.component?.primaryComponent || 'prose') === type
                    ).length;
                    return (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400"
                      >
                        {type} <span className="text-zinc-500">({count})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sections List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            <h4 className="text-sm font-medium text-zinc-300 sticky top-0 bg-zinc-950 py-2 z-10">
              Sections ({totalSections})
              <span className="text-[10px] text-zinc-500 ml-2 font-normal">
                Click a section to {onBlueprintChange ? 'edit' : 'see details'}
              </span>
            </h4>
            {(blueprint.sections || []).map((section) => {
              const sectionId = section.id || `section-${section.order ?? 0}`;
              const isExpanded = expandedSectionId === sectionId;
              return (
                <div key={sectionId}>
                  <SectionPreviewCard
                    section={section}
                    isHighlighted={isExpanded}
                    onClick={() =>
                      setExpandedSectionId(isExpanded ? null : sectionId)
                    }
                  />
                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="mx-2 p-3 bg-zinc-900/60 border-x border-b border-zinc-700 rounded-b-lg -mt-1 space-y-3 text-xs">
                      {section.component?.reasoning && (
                        <div>
                          <span className="text-zinc-500">AI Reasoning: </span>
                          <span className="text-zinc-300">{section.component.reasoning}</span>
                        </div>
                      )}

                      {/* Editable controls when onBlueprintChange is provided */}
                      {onBlueprintChange ? (
                        <div className="grid grid-cols-5 gap-2">
                          {/* Component type */}
                          <div>
                            <label className={labelClass}>Component</label>
                            <select
                              className={selectClass}
                              value={section.component?.primaryComponent || 'prose'}
                              onChange={(e) => updateSection(sectionId, {
                                component: { primaryComponent: e.target.value as ComponentType },
                              } as Partial<BlueprintSection>)}
                            >
                              {COMPONENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>

                          {/* Emphasis level */}
                          <div>
                            <label className={labelClass}>Emphasis</label>
                            <select
                              className={selectClass}
                              value={section.emphasis?.level || 'standard'}
                              onChange={(e) => updateSection(sectionId, {
                                emphasis: { level: e.target.value as EmphasisLevel },
                              } as Partial<BlueprintSection>)}
                            >
                              {EMPHASIS_LEVELS.map(level => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                          </div>

                          {/* Width */}
                          <div>
                            <label className={labelClass}>Width</label>
                            <select
                              className={selectClass}
                              value={section.layout?.width || 'medium'}
                              onChange={(e) => updateSection(sectionId, {
                                layout: { width: e.target.value as LayoutWidth },
                              } as Partial<BlueprintSection>)}
                            >
                              {LAYOUT_WIDTHS.map(w => (
                                <option key={w} value={w}>{w}</option>
                              ))}
                            </select>
                          </div>

                          {/* Columns */}
                          <div>
                            <label className={labelClass}>Columns</label>
                            <select
                              className={selectClass}
                              value={section.layout?.columns || '1-column'}
                              onChange={(e) => updateSection(sectionId, {
                                layout: { columns: e.target.value as ColumnLayout },
                              } as Partial<BlueprintSection>)}
                            >
                              {COLUMN_LAYOUTS.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          {/* Accent Border */}
                          <div>
                            <label className={labelClass}>Accent</label>
                            <select
                              className={selectClass}
                              value={
                                section.emphasis?.hasAccentBorder
                                  ? (section.emphasis.accentPosition || 'left')
                                  : 'none'
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'none') {
                                  updateSection(sectionId, {
                                    emphasis: { hasAccentBorder: false, accentPosition: undefined },
                                  } as Partial<BlueprintSection>);
                                } else {
                                  updateSection(sectionId, {
                                    emphasis: {
                                      hasAccentBorder: true,
                                      accentPosition: val as 'left' | 'top',
                                    },
                                  } as Partial<BlueprintSection>);
                                }
                              }}
                            >
                              {ACCENT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        /* Read-only display when no onBlueprintChange */
                        <div className="flex flex-wrap gap-3 text-zinc-400">
                          <div>
                            <span className="text-zinc-500">Weight: </span>
                            {section.semanticWeight || 3}/5
                          </div>
                          <div>
                            <span className="text-zinc-500">Width: </span>
                            {section.layout?.width || 'medium'}
                          </div>
                          <div>
                            <span className="text-zinc-500">Component: </span>
                            {section.component?.primaryComponent || 'prose'}
                          </div>
                          {section.component?.alternativeComponents && (
                            <div>
                              <span className="text-zinc-500">Alt: </span>
                              {section.component.alternativeComponents}
                            </div>
                          )}
                          <div>
                            <span className="text-zinc-500">Emphasis: </span>
                            {section.emphasis?.level || 'standard'}
                          </div>
                          {section.contentZone && (
                            <div>
                              <span className="text-zinc-500">Zone: </span>
                              {section.contentZone}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Always show weight and zone info */}
                      {onBlueprintChange && (
                        <div className="flex flex-wrap gap-3 text-zinc-400 pt-1 border-t border-zinc-800/50">
                          <div>
                            <span className="text-zinc-500">Weight: </span>
                            {section.semanticWeight || 3}/5
                          </div>
                          {section.contentZone && (
                            <div>
                              <span className="text-zinc-500">Zone: </span>
                              {section.contentZone}
                            </div>
                          )}
                          {section.component?.alternativeComponents && (
                            <div>
                              <span className="text-zinc-500">Alt: </span>
                              {section.component.alternativeComponents}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Global Settings Summary */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700/50">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Global Settings</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Default Width:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings?.defaultWidth || 'medium'}</span>
              </div>
              <div>
                <span className="text-zinc-500">Spacing:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings?.defaultSpacing || 'normal'}</span>
              </div>
              <div>
                <span className="text-zinc-500">Primary Font:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings?.primaryFont || 'system-ui'}</span>
              </div>
              <div>
                <span className="text-zinc-500">Secondary Font:</span>
                <span className="ml-2 text-white">{blueprint.globalSettings?.secondaryFont || 'system-ui'}</span>
              </div>
              <div>
                <span className="text-zinc-500">Color Scheme:</span>
                <span className="ml-2 text-white capitalize">
                  {blueprint.globalSettings?.colorScheme || 'auto'}
                </span>
              </div>
              {blueprint.metadata?.heroSectionId && (
                <div>
                  <span className="text-zinc-500">Hero Section:</span>
                  <span className="ml-2 text-yellow-400">Detected</span>
                </div>
              )}
            </div>
          </div>

          {/* Average Semantic Weight */}
          {(blueprint.metadata?.averageSemanticWeight || 0) > 0 && (
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
              <span className="text-xs text-zinc-500">Average Semantic Weight</span>
              <span className="text-sm font-medium text-white">
                {(blueprint.metadata?.averageSemanticWeight || 0).toFixed(1)} / 5.0
              </span>
            </div>
          )}

          {/* Next step guidance */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-300">
              The layout looks good. Click <span className="font-semibold">Next</span> to generate
              the live preview with your brand styling applied to each section.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default LayoutIntelligenceStep;
