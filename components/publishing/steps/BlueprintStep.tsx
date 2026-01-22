/**
 * Blueprint Step Component
 *
 * Step in the Style & Publish modal for viewing and editing layout blueprints.
 * Shows the AI-generated blueprint and allows refinement.
 *
 * @module components/publishing/steps/BlueprintStep
 */

import React, { useState, useCallback, useEffect } from 'react';
import { BlueprintInspector } from '../BlueprintInspector';
import { BlueprintEditorPanel } from '../BlueprintEditorPanel';
import type {
  LayoutBlueprint,
  ProjectBlueprint,
  TopicalMapBlueprint,
  BlueprintComponentType,
  ResolvedBlueprintSettings,
} from '../../../services/publishing';
import {
  swapComponent,
  changeEmphasis,
  changeSpacing,
  toggleBackground,
  applyComponentToAllArticles,
} from '../../../services/publishing/refinement';

// ============================================================================
// TYPES
// ============================================================================

export interface BlueprintQualityAnalysis {
  coherence: {
    score: number;
    issues: {
      type: 'spacing' | 'background' | 'emphasis' | 'weight' | 'divider';
      severity: 'warning' | 'error';
      message: string;
      sectionIndex: number;
    }[];
    suggestions: {
      sectionIndex: number;
      property: string;
      currentValue: unknown;
      suggestedValue: unknown;
      reason: string;
    }[];
  };
  report: string;
  overallScore: number;
}

export interface StylePreferenceSummary {
  hasPreferences: boolean;
  summary: string[];
  stats: {
    totalSwaps: number;
    preferredCount: number;
    avoidedCount: number;
  };
}

export interface BlueprintStepProps {
  // Current article blueprint
  blueprint: LayoutBlueprint | null;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;

  // Hierarchy blueprints (for editing)
  projectBlueprint?: ProjectBlueprint;
  topicalMapBlueprint?: TopicalMapBlueprint;
  topicalMapId?: string;

  // Resolved settings for inheritance display
  inheritanceInfo?: ResolvedBlueprintSettings['inheritanceInfo'];

  // Quality analysis from v2 engine
  qualityAnalysis?: BlueprintQualityAnalysis | null;

  // Apply My Style feature
  learnedPreferences?: unknown | null;
  stylePreferenceSummary?: StylePreferenceSummary | null;
  isLoadingPreferences?: boolean;
  isApplyingStyle?: boolean;
  onApplyMyStyle?: () => void;

  // Callbacks
  onBlueprintChange?: (blueprint: LayoutBlueprint) => void;
  onProjectChange?: (updates: Partial<ProjectBlueprint>) => void;
  onTopicalMapChange?: (updates: Partial<TopicalMapBlueprint>) => void;
  onSaveHierarchy?: () => Promise<void>;
  onRegenerateHierarchy?: (level: 'project' | 'topical_map') => Promise<void>;
}

type ViewMode = 'article' | 'project' | 'topical_map';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BlueprintStep({
  blueprint,
  isGenerating,
  onGenerate,
  projectBlueprint,
  topicalMapBlueprint,
  topicalMapId,
  inheritanceInfo,
  qualityAnalysis,
  learnedPreferences,
  stylePreferenceSummary,
  isLoadingPreferences,
  isApplyingStyle,
  onApplyMyStyle,
  onBlueprintChange,
  onProjectChange,
  onTopicalMapChange,
  onSaveHierarchy,
  onRegenerateHierarchy,
}: BlueprintStepProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('article');
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>();
  const [isApplyingToAll, setIsApplyingToAll] = useState(false);
  const [isSavingHierarchy, setIsSavingHierarchy] = useState(false);
  const [isRegeneratingHierarchy, setIsRegeneratingHierarchy] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle component change for a section
  const handleComponentChange = useCallback((sectionId: string, newComponent: BlueprintComponentType) => {
    if (!blueprint || !onBlueprintChange) return;

    const result = swapComponent(blueprint, sectionId, newComponent);
    if (result.success) {
      onBlueprintChange(result.updatedBlueprint);
    }
  }, [blueprint, onBlueprintChange]);

  // Handle emphasis change
  const handleEmphasisChange = useCallback((sectionId: string, emphasis: 'background' | 'normal' | 'featured' | 'hero-moment') => {
    if (!blueprint || !onBlueprintChange) return;

    const result = changeEmphasis(blueprint, sectionId, emphasis);
    if (result.success) {
      onBlueprintChange(result.updatedBlueprint);
    }
  }, [blueprint, onBlueprintChange]);

  // Handle spacing change
  const handleSpacingChange = useCallback((sectionId: string, spacing: 'tight' | 'normal' | 'breathe') => {
    if (!blueprint || !onBlueprintChange) return;

    const result = changeSpacing(blueprint, sectionId, spacing);
    if (result.success) {
      onBlueprintChange(result.updatedBlueprint);
    }
  }, [blueprint, onBlueprintChange]);

  // Handle background toggle
  const handleToggleBackground = useCallback((sectionId: string) => {
    if (!blueprint || !onBlueprintChange) return;

    const result = toggleBackground(blueprint, sectionId);
    if (result.success) {
      onBlueprintChange(result.updatedBlueprint);
    }
  }, [blueprint, onBlueprintChange]);

  // Handle apply to all articles
  const handleApplyToAll = useCallback(async (fromComponent: BlueprintComponentType, toComponent: BlueprintComponentType) => {
    if (!topicalMapId) return;

    setIsApplyingToAll(true);
    try {
      const result = await applyComponentToAllArticles(topicalMapId, fromComponent, toComponent);
      if (result.success) {
        setSuccessMessage(`Updated ${result.sectionsUpdated} sections across ${result.articlesUpdated} articles`);
      }
    } catch (error) {
      console.error('Failed to apply to all:', error);
    } finally {
      setIsApplyingToAll(false);
    }
  }, [topicalMapId]);

  // Handle save hierarchy
  const handleSaveHierarchy = useCallback(async () => {
    if (!onSaveHierarchy) return;

    setIsSavingHierarchy(true);
    try {
      await onSaveHierarchy();
      setSuccessMessage('Blueprint settings saved');
    } catch (error) {
      console.error('Failed to save hierarchy:', error);
    } finally {
      setIsSavingHierarchy(false);
    }
  }, [onSaveHierarchy]);

  // Handle regenerate hierarchy
  const handleRegenerateHierarchy = useCallback(async () => {
    if (!onRegenerateHierarchy) return;

    setIsRegeneratingHierarchy(true);
    try {
      await onRegenerateHierarchy(viewMode as 'project' | 'topical_map');
      setSuccessMessage(`${viewMode === 'project' ? 'Project' : 'Topical map'} blueprint regenerated`);
    } catch (error) {
      console.error('Failed to regenerate hierarchy:', error);
    } finally {
      setIsRegeneratingHierarchy(false);
    }
  }, [onRegenerateHierarchy, viewMode]);

  // No blueprint yet
  if (!blueprint && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Layout Blueprint
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
          The AI Layout Architect will analyze your content and create intelligent layout decisions
          for beautiful, context-aware styling.
        </p>
        <button
          onClick={onGenerate}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate Blueprint
        </button>
      </div>
    );
  }

  // Generating
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Analyzing Content...
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          The AI is analyzing your content structure, detecting patterns, and making intelligent
          layout decisions.
        </p>
      </div>
    );
  }

  return (
    <div className="blueprint-step">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-green-700 dark:text-green-300 text-sm">{successMessage}</span>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {[
            { id: 'article', label: 'This Article', icon: '📄' },
            { id: 'topical_map', label: 'Topical Map', icon: '🗺️' },
            { id: 'project', label: 'Project', icon: '📁' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors
                ${viewMode === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Regenerate button for article view */}
        {viewMode === 'article' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
            >
              <svg className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Apply My Style Card */}
      {viewMode === 'article' && blueprint && onApplyMyStyle && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  Apply My Style
                  {isLoadingPreferences && (
                    <span className="text-xs text-gray-500 animate-pulse">Loading preferences...</span>
                  )}
                </h4>
                {stylePreferenceSummary?.hasPreferences ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stylePreferenceSummary.summary.slice(0, 2).join(' • ')}
                  </p>
                ) : !isLoadingPreferences && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No learned preferences yet. Your style choices will be learned as you make changes.
                  </p>
                )}
              </div>
            </div>

            {stylePreferenceSummary?.hasPreferences && (
              <button
                onClick={onApplyMyStyle}
                disabled={isApplyingStyle || !learnedPreferences}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all
                  ${isApplyingStyle
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow'}
                `}
              >
                {isApplyingStyle ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Apply My Style
                  </>
                )}
              </button>
            )}
          </div>

          {/* Stats row */}
          {stylePreferenceSummary?.hasPreferences && (
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800/50 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                {stylePreferenceSummary.stats.totalSwaps} learned swaps
              </span>
              {stylePreferenceSummary.stats.preferredCount > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {stylePreferenceSummary.stats.preferredCount} preferred
                </span>
              )}
              {stylePreferenceSummary.stats.avoidedCount > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {stylePreferenceSummary.stats.avoidedCount} avoided
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quality Score Card (v2.0) */}
      {viewMode === 'article' && qualityAnalysis && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                ${qualityAnalysis.overallScore >= 80
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : qualityAnalysis.overallScore >= 60
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
              `}>
                {qualityAnalysis.overallScore}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Layout Quality Score</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {qualityAnalysis.overallScore >= 80
                    ? 'Excellent layout coherence'
                    : qualityAnalysis.overallScore >= 60
                      ? 'Good layout with minor improvements possible'
                      : 'Layout needs improvement'}
                </p>
              </div>
            </div>

            {/* Coherence breakdown */}
            <div className="text-right">
              <span className="text-sm text-gray-500 dark:text-gray-400">Coherence: </span>
              <span className="font-medium text-gray-900 dark:text-white">{qualityAnalysis.coherence.score}%</span>
            </div>
          </div>

          {/* Issues & Suggestions */}
          {(qualityAnalysis.coherence.issues.length > 0 || qualityAnalysis.coherence.suggestions.length > 0) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {qualityAnalysis.coherence.issues.length > 0 && (
                <div>
                  <h5 className="text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Issues ({qualityAnalysis.coherence.issues.length})
                  </h5>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                    {qualityAnalysis.coherence.issues.slice(0, 3).map((issue, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className={issue.severity === 'error' ? 'text-red-500 mt-0.5' : 'text-amber-500 mt-0.5'}>•</span>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {qualityAnalysis.coherence.suggestions.length > 0 && (
                <div>
                  <h5 className="text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Suggestions ({qualityAnalysis.coherence.suggestions.length})
                  </h5>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                    {qualityAnalysis.coherence.suggestions.slice(0, 3).map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {suggestion.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'article' && blueprint && (
        <BlueprintInspector
          blueprint={blueprint}
          inheritanceInfo={inheritanceInfo}
          selectedSectionId={selectedSectionId}
          onSectionSelect={setSelectedSectionId}
          onComponentChange={handleComponentChange}
          onEmphasisChange={handleEmphasisChange}
          onSpacingChange={handleSpacingChange}
          onToggleBackground={handleToggleBackground}
          onApplyToAll={topicalMapId ? handleApplyToAll : undefined}
          isApplyingToAll={isApplyingToAll}
        />
      )}

      {viewMode === 'topical_map' && (
        <BlueprintEditorPanel
          level="topical_map"
          topicalMapBlueprint={topicalMapBlueprint}
          onTopicalMapChange={onTopicalMapChange}
          onSave={handleSaveHierarchy}
          onRegenerate={handleRegenerateHierarchy}
          isSaving={isSavingHierarchy}
          isRegenerating={isRegeneratingHierarchy}
        />
      )}

      {viewMode === 'project' && (
        <BlueprintEditorPanel
          level="project"
          projectBlueprint={projectBlueprint}
          onProjectChange={onProjectChange}
          onSave={handleSaveHierarchy}
          onRegenerate={handleRegenerateHierarchy}
          isSaving={isSavingHierarchy}
          isRegenerating={isRegeneratingHierarchy}
        />
      )}
    </div>
  );
}

export default BlueprintStep;
