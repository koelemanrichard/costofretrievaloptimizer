/**
 * Blueprint Inspector Component
 *
 * Displays the AI Layout Architect's blueprint decisions with reasoning.
 * Allows users to view, refine, and understand the layout choices.
 * Shows inheritance information (project → topical map → article).
 *
 * @module components/publishing/BlueprintInspector
 */

import React, { useState } from 'react';
import type {
  LayoutBlueprint,
  SectionDesign,
  BlueprintComponentType,
  ResolvedBlueprintSettings,
} from '../../services/publishing';
import { COMPONENT_DESCRIPTIONS, VISUAL_STYLE_DESCRIPTIONS } from '../../services/publishing';
import {
  suggestAlternativeComponents,
  getComponentCompatibility,
} from '../../services/publishing/refinement';

// ============================================================================
// TYPES
// ============================================================================

interface BlueprintInspectorProps {
  blueprint: LayoutBlueprint;
  inheritanceInfo?: ResolvedBlueprintSettings['inheritanceInfo'];
  onSectionSelect?: (sectionId: string) => void;
  onComponentChange?: (sectionId: string, newComponent: BlueprintComponentType) => void;
  onRefineRequest?: (sectionId: string, instruction: string) => void;
  onApplyToAll?: (fromComponent: BlueprintComponentType, toComponent: BlueprintComponentType) => void;
  onEmphasisChange?: (sectionId: string, emphasis: 'background' | 'normal' | 'featured' | 'hero-moment') => void;
  onSpacingChange?: (sectionId: string, spacing: 'tight' | 'normal' | 'breathe') => void;
  onToggleBackground?: (sectionId: string) => void;
  selectedSectionId?: string;
  isReadOnly?: boolean;
  isApplyingToAll?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InheritanceBadge({ from }: { from: string }) {
  const colors: Record<string, string> = {
    project: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    topical_map: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    article: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    default: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  const labels: Record<string, string> = {
    project: 'Project',
    topical_map: 'Map',
    article: 'Article',
    default: 'Default',
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[from] || colors.default}`}>
      {labels[from] || from}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BlueprintInspector({
  blueprint,
  inheritanceInfo,
  onSectionSelect,
  onComponentChange,
  onRefineRequest,
  onApplyToAll,
  onEmphasisChange,
  onSpacingChange,
  onToggleBackground,
  selectedSectionId,
  isReadOnly = false,
  isApplyingToAll = false,
}: BlueprintInspectorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [refineInput, setRefineInput] = useState<Record<string, string>>({});
  const [applyToAllComponent, setApplyToAllComponent] = useState<{
    from: BlueprintComponentType;
    to: BlueprintComponentType;
  } | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleRefine = (sectionId: string) => {
    const instruction = refineInput[sectionId];
    if (instruction && onRefineRequest) {
      onRefineRequest(sectionId, instruction);
      setRefineInput(prev => ({ ...prev, [sectionId]: '' }));
    }
  };

  const handleApplyToAll = () => {
    if (applyToAllComponent && onApplyToAll) {
      onApplyToAll(applyToAllComponent.from, applyToAllComponent.to);
      setApplyToAllComponent(null);
    }
  };

  // Count component usage
  const componentCounts = blueprint.sections.reduce((acc, s) => {
    const comp = s.presentation.component;
    acc[comp] = (acc[comp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="blueprint-inspector bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Layout Blueprint
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI-generated layout decisions for your content
            </p>
          </div>
          {inheritanceInfo && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hover badges to see inheritance
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Page Strategy */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Page Strategy</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Visual Style</span>
              {inheritanceInfo && <InheritanceBadge from={inheritanceInfo.visualStyleFrom} />}
            </div>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {blueprint.pageStrategy.visualStyle}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Pacing</span>
              {inheritanceInfo && <InheritanceBadge from={inheritanceInfo.pacingFrom} />}
            </div>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {blueprint.pageStrategy.pacing}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Color Intensity</span>
              {inheritanceInfo && <InheritanceBadge from={inheritanceInfo.colorIntensityFrom} />}
            </div>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {blueprint.pageStrategy.colorIntensity}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Journey Stage</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {blueprint.pageStrategy.buyerJourneyStage}
            </span>
          </div>
        </div>
        {blueprint.pageStrategy.reasoning && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mb-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              AI Reasoning
            </span>
            <p className="text-sm text-blue-700 dark:text-blue-300">{blueprint.pageStrategy.reasoning}</p>
          </div>
        )}
      </div>

      {/* Global Elements */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Global Elements</h4>
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded text-xs ${blueprint.globalElements.showToc ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            ToC: {blueprint.globalElements.showToc ? blueprint.globalElements.tocPosition : 'Off'}
          </span>
          <span className={`px-2 py-1 rounded text-xs ${blueprint.globalElements.showAuthorBox ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            Author: {blueprint.globalElements.showAuthorBox ? blueprint.globalElements.authorBoxPosition : 'Off'}
          </span>
          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            CTA: {blueprint.globalElements.ctaStrategy.intensity}
            {inheritanceInfo && (
              <span className="ml-1">
                <InheritanceBadge from={inheritanceInfo.ctaStrategyFrom} />
              </span>
            )}
          </span>
          <span className={`px-2 py-1 rounded text-xs ${blueprint.globalElements.showSources ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            Sources: {blueprint.globalElements.showSources ? 'On' : 'Off'}
          </span>
        </div>
      </div>

      {/* Component Summary */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Components Used</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(componentCounts).map(([comp, count]) => (
            <span
              key={comp}
              className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {comp} <span className="font-medium">({count})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Apply to All Dialog */}
      {applyToAllComponent && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Apply change to all articles?
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                Change all <strong>{applyToAllComponent.from}</strong> components to{' '}
                <strong>{applyToAllComponent.to}</strong> across this topical map.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setApplyToAllComponent(null)}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyToAll}
                disabled={isApplyingToAll}
                className="px-3 py-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {isApplyingToAll ? 'Applying...' : 'Apply to All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Sections ({blueprint.sections.length})
        </h4>
        <div className="space-y-2">
          {blueprint.sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              isExpanded={expandedSections.has(section.id)}
              isSelected={selectedSectionId === section.id}
              isReadOnly={isReadOnly}
              refineInput={refineInput[section.id] || ''}
              onToggle={() => toggleSection(section.id)}
              onSelect={() => onSectionSelect?.(section.id)}
              onComponentChange={(newComponent) => {
                onComponentChange?.(section.id, newComponent);
                // Offer to apply to all if component is used multiple times
                const currentComp = section.presentation.component;
                if (componentCounts[currentComp] > 1 && onApplyToAll) {
                  setApplyToAllComponent({ from: currentComp, to: newComponent });
                }
              }}
              onEmphasisChange={(emphasis) => onEmphasisChange?.(section.id, emphasis)}
              onSpacingChange={(spacing) => onSpacingChange?.(section.id, spacing)}
              onToggleBackground={() => onToggleBackground?.(section.id)}
              onRefineInputChange={(value) => setRefineInput(prev => ({ ...prev, [section.id]: value }))}
              onRefine={() => handleRefine(section.id)}
            />
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Generated: {new Date(blueprint.metadata.generatedAt).toLocaleString()}</span>
          <span>Model: {blueprint.metadata.modelUsed}</span>
          <span>Duration: {blueprint.metadata.generationDurationMs}ms</span>
          <span>Words: {blueprint.metadata.wordCount}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION CARD SUB-COMPONENT
// ============================================================================

interface SectionCardProps {
  section: SectionDesign;
  index: number;
  isExpanded: boolean;
  isSelected: boolean;
  isReadOnly: boolean;
  refineInput: string;
  onToggle: () => void;
  onSelect: () => void;
  onComponentChange: (newComponent: BlueprintComponentType) => void;
  onEmphasisChange?: (emphasis: 'background' | 'normal' | 'featured' | 'hero-moment') => void;
  onSpacingChange?: (spacing: 'tight' | 'normal' | 'breathe') => void;
  onToggleBackground?: () => void;
  onRefineInputChange: (value: string) => void;
  onRefine: () => void;
}

function SectionCard({
  section,
  index,
  isExpanded,
  isSelected,
  isReadOnly,
  refineInput,
  onToggle,
  onSelect,
  onComponentChange,
  onEmphasisChange,
  onSpacingChange,
  onToggleBackground,
  onRefineInputChange,
  onRefine,
}: SectionCardProps) {
  const emphasisColors: Record<string, string> = {
    background: 'border-gray-300 bg-gray-50',
    normal: 'border-gray-200 bg-white',
    featured: 'border-blue-300 bg-blue-50',
    'hero-moment': 'border-purple-300 bg-purple-50',
  };

  const componentOptions: BlueprintComponentType[] = [
    'prose', 'lead-paragraph', 'highlight-box', 'callout',
    'bullet-list', 'numbered-list', 'checklist', 'icon-list', 'card-grid',
    'timeline-vertical', 'timeline-zigzag', 'steps-numbered',
    'faq-accordion', 'faq-cards',
    'cta-banner', 'cta-inline',
    'key-takeaways', 'summary-box',
  ];

  // Get suggested alternatives
  const suggestions = suggestAlternativeComponents(section);
  const compatibility = getComponentCompatibility(section.presentation.component);

  return (
    <div
      className={`rounded-lg border-2 transition-all ${emphasisColors[section.presentation.emphasis] || emphasisColors.normal} ${isSelected ? 'ring-2 ring-blue-500' : ''} dark:bg-gray-800 dark:border-gray-600`}
    >
      {/* Section Header */}
      <button
        onClick={() => { onToggle(); onSelect(); }}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs flex items-center justify-center font-medium">
            {index + 1}
          </span>
          <div>
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {section.heading || '(No heading)'}
            </span>
            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {section.presentation.component}
            </span>
            <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
              {compatibility.category}
            </span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Presentation Details */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white dark:bg-gray-900 p-2 rounded">
              <span className="text-gray-500 dark:text-gray-400 block">Emphasis</span>
              {!isReadOnly && onEmphasisChange ? (
                <select
                  value={section.presentation.emphasis}
                  onChange={(e) => onEmphasisChange(e.target.value as any)}
                  className="mt-1 w-full text-xs border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0"
                >
                  <option value="background">Background</option>
                  <option value="normal">Normal</option>
                  <option value="featured">Featured</option>
                  <option value="hero-moment">Hero Moment</option>
                </select>
              ) : (
                <span className="text-gray-900 dark:text-white capitalize">{section.presentation.emphasis}</span>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 p-2 rounded">
              <span className="text-gray-500 dark:text-gray-400 block">Spacing</span>
              {!isReadOnly && onSpacingChange ? (
                <select
                  value={section.presentation.spacing}
                  onChange={(e) => onSpacingChange(e.target.value as any)}
                  className="mt-1 w-full text-xs border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0"
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="breathe">Breathe</option>
                </select>
              ) : (
                <span className="text-gray-900 dark:text-white capitalize">{section.presentation.spacing}</span>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 p-2 rounded">
              <span className="text-gray-500 dark:text-gray-400 block">Background</span>
              {!isReadOnly && onToggleBackground ? (
                <button
                  onClick={onToggleBackground}
                  className={`mt-1 text-xs px-2 py-0.5 rounded ${
                    section.presentation.hasBackground
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {section.presentation.hasBackground ? 'On' : 'Off'}
                </button>
              ) : (
                <span className="text-gray-900 dark:text-white">{section.presentation.hasBackground ? 'Yes' : 'No'}</span>
              )}
            </div>
          </div>

          {/* Reasoning */}
          {section.reasoning && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-medium">Why this component:</span>
              <p className="text-blue-700 dark:text-blue-300 mt-1">{section.reasoning}</p>
            </div>
          )}

          {/* Suggested Alternatives */}
          {!isReadOnly && suggestions.length > 0 && (
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-medium">Suggested alternatives:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestions.slice(0, 4).map(alt => (
                  <button
                    key={alt}
                    onClick={() => onComponentChange(alt)}
                    className="px-2 py-0.5 bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800/50"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Component Selector */}
          {!isReadOnly && (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Change Component:</label>
              <select
                value={section.presentation.component}
                onChange={(e) => onComponentChange(e.target.value as BlueprintComponentType)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {componentOptions.map(comp => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            </div>
          )}

          {/* Refine Input */}
          {!isReadOnly && (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Refine with AI instruction:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refineInput}
                  onChange={(e) => onRefineInputChange(e.target.value)}
                  placeholder="e.g., Make it more compact, add icons..."
                  className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button
                  onClick={onRefine}
                  disabled={!refineInput}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Refine
                </button>
              </div>
            </div>
          )}

          {/* Content Preview */}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Content Preview:</span>
            <p className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded max-h-20 overflow-y-auto">
              {section.sourceContent?.slice(0, 200) || '(No content)'}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BlueprintInspector;
