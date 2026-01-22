/**
 * Blueprint Editor Panel
 *
 * Allows users to edit project-level and topical map-level blueprint settings.
 * Changes here cascade down to all articles in the hierarchy.
 *
 * @module components/publishing/BlueprintEditorPanel
 */

import React, { useState, useCallback } from 'react';
import type {
  ProjectBlueprint,
  TopicalMapBlueprint,
  VisualStyle,
  ContentPacing,
  ColorIntensity,
  BlueprintComponentType,
} from '../../services/publishing';
import { VISUAL_STYLE_DESCRIPTIONS } from '../../services/publishing';

// ============================================================================
// TYPES
// ============================================================================

export interface BlueprintEditorPanelProps {
  level: 'project' | 'topical_map';
  projectBlueprint?: ProjectBlueprint;
  topicalMapBlueprint?: TopicalMapBlueprint;
  onProjectChange?: (updates: Partial<ProjectBlueprint>) => void;
  onTopicalMapChange?: (updates: Partial<TopicalMapBlueprint>) => void;
  onSave?: () => Promise<void>;
  onRegenerate?: () => Promise<void>;
  isSaving?: boolean;
  isRegenerating?: boolean;
}

interface SettingCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  inheritedFrom?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VISUAL_STYLES: VisualStyle[] = ['editorial', 'marketing', 'minimal', 'bold', 'warm-modern'];
const PACING_OPTIONS: ContentPacing[] = ['dense', 'balanced', 'spacious'];
const COLOR_INTENSITIES: ColorIntensity[] = ['subtle', 'moderate', 'vibrant'];

const AVOID_COMPONENT_OPTIONS: BlueprintComponentType[] = [
  'prose', 'lead-paragraph', 'highlight-box', 'callout',
  'bullet-list', 'numbered-list', 'checklist', 'icon-list', 'card-grid',
  'timeline-vertical', 'timeline-zigzag', 'steps-numbered',
  'faq-accordion', 'faq-cards',
  'cta-banner', 'cta-inline',
  'key-takeaways', 'summary-box',
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SettingCard({ title, description, children }: SettingCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="mt-3">
        {children}
      </div>
    </div>
  );
}

function RadioOption({
  value,
  label,
  description,
  selected,
  onChange,
}: {
  value: string;
  label: string;
  description?: string;
  selected: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`
        flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
        ${selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onChange}
        className="mt-0.5 text-blue-600 focus:ring-blue-500"
      />
      <div>
        <span className={`text-sm font-medium ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
          {label}
        </span>
        {description && (
          <p className={`text-xs mt-0.5 ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {description}
          </p>
        )}
      </div>
    </label>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BlueprintEditorPanel({
  level,
  projectBlueprint,
  topicalMapBlueprint,
  onProjectChange,
  onTopicalMapChange,
  onSave,
  onRegenerate,
  isSaving = false,
  isRegenerating = false,
}: BlueprintEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'components' | 'cta'>('visual');

  // Get current values based on level
  const currentDefaults = level === 'project'
    ? projectBlueprint?.defaults
    : topicalMapBlueprint?.defaults;

  const avoidComponents = level === 'project'
    ? projectBlueprint?.avoidComponents || []
    : [];

  const handleVisualStyleChange = useCallback((value: VisualStyle) => {
    if (level === 'project' && onProjectChange && projectBlueprint) {
      onProjectChange({
        defaults: { ...projectBlueprint.defaults, visualStyle: value },
      });
    } else if (level === 'topical_map' && onTopicalMapChange && topicalMapBlueprint) {
      onTopicalMapChange({
        defaults: { ...topicalMapBlueprint.defaults, visualStyle: value },
      });
    }
  }, [level, onProjectChange, onTopicalMapChange, projectBlueprint, topicalMapBlueprint]);

  const handlePacingChange = useCallback((value: ContentPacing) => {
    if (level === 'project' && onProjectChange && projectBlueprint) {
      onProjectChange({
        defaults: { ...projectBlueprint.defaults, pacing: value },
      });
    } else if (level === 'topical_map' && onTopicalMapChange && topicalMapBlueprint) {
      onTopicalMapChange({
        defaults: { ...topicalMapBlueprint.defaults, pacing: value },
      });
    }
  }, [level, onProjectChange, onTopicalMapChange, projectBlueprint, topicalMapBlueprint]);

  const handleColorIntensityChange = useCallback((value: ColorIntensity) => {
    if (level === 'project' && onProjectChange && projectBlueprint) {
      onProjectChange({
        defaults: { ...projectBlueprint.defaults, colorIntensity: value },
      });
    } else if (level === 'topical_map' && onTopicalMapChange && topicalMapBlueprint) {
      onTopicalMapChange({
        defaults: { ...topicalMapBlueprint.defaults, colorIntensity: value },
      });
    }
  }, [level, onProjectChange, onTopicalMapChange, projectBlueprint, topicalMapBlueprint]);

  const handleAvoidComponentToggle = useCallback((component: BlueprintComponentType) => {
    if (level === 'project' && onProjectChange && projectBlueprint) {
      const currentAvoid = projectBlueprint.avoidComponents || [];
      const newAvoid = currentAvoid.includes(component)
        ? currentAvoid.filter(c => c !== component)
        : [...currentAvoid, component];
      onProjectChange({ avoidComponents: newAvoid });
    }
  }, [level, onProjectChange, projectBlueprint]);

  const handleCtaIntensityChange = useCallback((value: 'subtle' | 'moderate' | 'prominent') => {
    if (level === 'project' && onProjectChange && projectBlueprint) {
      onProjectChange({
        defaults: {
          ...projectBlueprint.defaults,
          ctaStrategy: { ...projectBlueprint.defaults.ctaStrategy, intensity: value },
        },
      });
    } else if (level === 'topical_map' && onTopicalMapChange && topicalMapBlueprint) {
      const currentCta = topicalMapBlueprint.defaults?.ctaStrategy || projectBlueprint?.defaults?.ctaStrategy;
      if (currentCta) {
        onTopicalMapChange({
          defaults: {
            ...topicalMapBlueprint.defaults,
            ctaStrategy: { ...currentCta, intensity: value },
          },
        });
      }
    }
  }, [level, onProjectChange, onTopicalMapChange, projectBlueprint, topicalMapBlueprint]);

  if (!currentDefaults) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No blueprint found for this {level === 'project' ? 'project' : 'topical map'}.
        </p>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRegenerating ? 'Generating...' : 'Generate Blueprint'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="blueprint-editor-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {level === 'project' ? 'Project' : 'Topical Map'} Blueprint Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {level === 'project'
              ? 'These settings apply to all content in this project'
              : 'These settings apply to all articles in this topical map'
            }
          </p>
        </div>
        <div className="flex gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
            >
              <svg className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {[
          { id: 'visual', label: 'Visual Style', icon: '🎨' },
          { id: 'components', label: 'Components', icon: '🧩' },
          { id: 'cta', label: 'CTA Settings', icon: '📣' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'visual' | 'components' | 'cta')}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'visual' && (
          <>
            {/* Visual Style */}
            <SettingCard
              title="Visual Style"
              description="The overall design personality for your content"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {VISUAL_STYLES.map(style => (
                  <RadioOption
                    key={style}
                    value={style}
                    label={style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' ')}
                    description={VISUAL_STYLE_DESCRIPTIONS[style]}
                    selected={currentDefaults.visualStyle === style}
                    onChange={() => handleVisualStyleChange(style)}
                  />
                ))}
              </div>
            </SettingCard>

            {/* Pacing */}
            <SettingCard
              title="Content Pacing"
              description="How much whitespace and breathing room between sections"
            >
              <div className="grid grid-cols-3 gap-2">
                {PACING_OPTIONS.map(pacing => (
                  <RadioOption
                    key={pacing}
                    value={pacing}
                    label={pacing.charAt(0).toUpperCase() + pacing.slice(1)}
                    description={
                      pacing === 'dense' ? 'Compact, information-rich'
                        : pacing === 'balanced' ? 'Comfortable reading'
                        : 'Generous whitespace'
                    }
                    selected={currentDefaults.pacing === pacing}
                    onChange={() => handlePacingChange(pacing)}
                  />
                ))}
              </div>
            </SettingCard>

            {/* Color Intensity */}
            <SettingCard
              title="Color Intensity"
              description="How bold and vibrant the colors appear"
            >
              <div className="grid grid-cols-3 gap-2">
                {COLOR_INTENSITIES.map(intensity => (
                  <RadioOption
                    key={intensity}
                    value={intensity}
                    label={intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                    description={
                      intensity === 'subtle' ? 'Muted, professional'
                        : intensity === 'moderate' ? 'Balanced color use'
                        : 'Bold, eye-catching'
                    }
                    selected={currentDefaults.colorIntensity === intensity}
                    onChange={() => handleColorIntensityChange(intensity)}
                  />
                ))}
              </div>
            </SettingCard>
          </>
        )}

        {activeTab === 'components' && level === 'project' && (
          <SettingCard
            title="Avoided Components"
            description="Components the AI should not use when generating layouts"
          >
            <div className="flex flex-wrap gap-2">
              {AVOID_COMPONENT_OPTIONS.map(comp => {
                const isAvoided = avoidComponents.includes(comp);
                return (
                  <button
                    key={comp}
                    onClick={() => handleAvoidComponentToggle(comp)}
                    className={`
                      px-2 py-1 text-xs rounded transition-all
                      ${isAvoided
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-500'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    {isAvoided && <span className="mr-1">✕</span>}
                    {comp}
                  </button>
                );
              })}
            </div>
          </SettingCard>
        )}

        {activeTab === 'components' && level === 'topical_map' && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>Component preferences are managed at the project level.</p>
            <p className="text-sm mt-2">Topical maps inherit component settings from their parent project.</p>
          </div>
        )}

        {activeTab === 'cta' && (
          <SettingCard
            title="CTA Intensity"
            description="How prominently calls-to-action appear throughout content"
          >
            <div className="grid grid-cols-3 gap-2">
              {(['subtle', 'moderate', 'prominent'] as const).map(intensity => (
                <RadioOption
                  key={intensity}
                  value={intensity}
                  label={intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                  description={
                    intensity === 'subtle' ? 'Minimal, end-of-content only'
                      : intensity === 'moderate' ? 'Strategic placement'
                      : 'Multiple prominent CTAs'
                  }
                  selected={currentDefaults.ctaStrategy?.intensity === intensity}
                  onChange={() => handleCtaIntensityChange(intensity)}
                />
              ))}
            </div>
          </SettingCard>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            <p className="text-blue-700 dark:text-blue-300 font-medium">How inheritance works</p>
            <p className="text-blue-600 dark:text-blue-400 mt-1">
              {level === 'project'
                ? 'Project settings are inherited by all topical maps and articles. Individual maps or articles can override these defaults.'
                : 'Topical map settings override project defaults and apply to all articles in this map. Individual articles can still make their own overrides.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlueprintEditorPanel;
