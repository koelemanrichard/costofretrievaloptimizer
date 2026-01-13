// components/ContentGenerationSettingsPanel.tsx
import React, { useState, useMemo } from 'react';
import {
  ContentGenerationSettings,
  ContentGenerationPriorities,
  ContentTone,
  AudienceExpertise,
  ContentLengthPreset,
  LENGTH_PRESETS,
  DEFAULT_CONTENT_LENGTH_SETTINGS
} from '../types/contentGeneration';
import { PrioritySlider } from './ui/PrioritySlider';
import {
  ContentGenerationModeSelector,
  ContentGenerationSettings as ModeSettings,
  DEFAULT_GENERATION_SETTINGS,
} from './settings';

interface Props {
  settings: ContentGenerationSettings;
  onChange: (settings: ContentGenerationSettings) => void;
  presets: Record<string, ContentGenerationPriorities>;
  /** Quality mode settings (optional - shows mode selector when provided) */
  modeSettings?: ModeSettings;
  /** Callback when mode settings change */
  onModeSettingsChange?: (modeSettings: ModeSettings) => void;
  /** Whether to show the mode selector */
  showModeSelector?: boolean;
}

const formatPresetName = (key: string): string => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Detect which preset matches the current priorities (if any)
 * Returns null if priorities don't match any preset exactly
 */
const detectActivePreset = (
  priorities: ContentGenerationPriorities,
  presets: Record<string, ContentGenerationPriorities>
): string | null => {
  for (const [key, preset] of Object.entries(presets)) {
    if (
      priorities.humanReadability === preset.humanReadability &&
      priorities.businessConversion === preset.businessConversion &&
      priorities.machineOptimization === preset.machineOptimization &&
      priorities.factualDensity === preset.factualDensity
    ) {
      return key;
    }
  }
  return null;
};

export const ContentGenerationSettingsPanel: React.FC<Props> = ({
  settings,
  onChange,
  presets,
  modeSettings,
  onModeSettingsChange,
  showModeSelector = false,
}) => {
  // Derive active preset from actual settings - persists correctly across remounts
  const activePreset = useMemo(
    () => detectActivePreset(settings.priorities, presets),
    [settings.priorities, presets]
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLengthAdvanced, setShowLengthAdvanced] = useState(false);

  // Use default mode settings if not provided
  const currentModeSettings = modeSettings || DEFAULT_GENERATION_SETTINGS;

  // Content length settings with defaults
  const contentLength = settings.contentLength ?? DEFAULT_CONTENT_LENGTH_SETTINGS;

  const handlePriorityChange = (key: keyof ContentGenerationPriorities, value: number) => {
    // Active preset will be automatically recalculated via useMemo
    onChange({
      ...settings,
      priorities: { ...settings.priorities, [key]: value }
    });
  };

  const handlePresetSelect = (presetKey: string) => {
    // Active preset will be automatically detected from the new priorities
    onChange({
      ...settings,
      priorities: presets[presetKey]
    });
  };

  const handleLengthPresetSelect = (preset: ContentLengthPreset) => {
    onChange({
      ...settings,
      contentLength: {
        ...contentLength,
        preset,
        // Clear user overrides when switching presets
        targetWordCount: undefined,
        maxSections: undefined
      }
    });
  };

  const handleLengthSettingChange = (key: keyof typeof contentLength, value: number | boolean | undefined) => {
    onChange({
      ...settings,
      contentLength: {
        ...contentLength,
        [key]: value
      }
    });
  };

  // Get display info for current length preset
  const currentLengthPreset = LENGTH_PRESETS[contentLength.preset];
  const effectiveWordCount = contentLength.targetWordCount ??
    (currentLengthPreset.targetWords === 'serp' ? 'SERP-based' : currentLengthPreset.targetWords);

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      {/* Presets - compact row */}
      <div className="mb-3">
        <div className="flex gap-1.5 flex-wrap">
          {Object.keys(presets).map(key => (
            <button
              key={key}
              onClick={() => handlePresetSelect(key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                activePreset === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {formatPresetName(key)}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Sliders - more compact */}
      <div className="space-y-2 mb-3">
        <PrioritySlider
          label="Human Readability"
          description="Natural flow, engagement"
          value={settings.priorities.humanReadability}
          onChange={(v) => handlePriorityChange('humanReadability', v)}
          color="blue"
        />
        <PrioritySlider
          label="Business & Conversion"
          description="CTAs, value props"
          value={settings.priorities.businessConversion}
          onChange={(v) => handlePriorityChange('businessConversion', v)}
          color="green"
        />
        <PrioritySlider
          label="Machine Optimization"
          description="SEO signals, entities"
          value={settings.priorities.machineOptimization}
          onChange={(v) => handlePriorityChange('machineOptimization', v)}
          color="purple"
        />
        <PrioritySlider
          label="Factual Density"
          description="Info per sentence"
          value={settings.priorities.factualDensity}
          onChange={(v) => handlePriorityChange('factualDensity', v)}
          color="orange"
        />
      </div>

      {/* Tone & Audience - inline */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label htmlFor="tone" className="text-xs text-gray-400 mb-0.5 block">Tone</label>
          <select
            id="tone"
            value={settings.tone}
            onChange={(e) => onChange({ ...settings, tone: e.target.value as ContentTone })}
            className="w-full bg-gray-700 border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="conversational">Conversational</option>
            <option value="professional">Professional</option>
            <option value="academic">Academic</option>
            <option value="sales">Sales-focused</option>
          </select>
        </div>
        <div>
          <label htmlFor="audience" className="text-xs text-gray-400 mb-0.5 block">Audience</label>
          <select
            id="audience"
            value={settings.audienceExpertise}
            onChange={(e) => onChange({ ...settings, audienceExpertise: e.target.value as AudienceExpertise })}
            className="w-full bg-gray-700 border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      {/* Content Length Section */}
      <div className="border-t border-gray-700 pt-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">Content Length</span>
          <span className="text-xs text-gray-500">
            Target: {typeof effectiveWordCount === 'number' ? `~${effectiveWordCount} words` : effectiveWordCount}
          </span>
        </div>

        {/* Length Preset Buttons */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {(Object.keys(LENGTH_PRESETS) as ContentLengthPreset[]).map(preset => {
            const config = LENGTH_PRESETS[preset];
            const wordLabel = config.targetWords === 'serp'
              ? 'SERP'
              : config.targetWords >= 1000
                ? `${(config.targetWords / 1000).toFixed(1)}k`
                : config.targetWords;
            return (
              <button
                key={preset}
                onClick={() => handleLengthPresetSelect(preset)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  contentLength.preset === preset
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={config.description}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
                <span className="ml-1 text-[10px] opacity-75">({wordLabel})</span>
              </button>
            );
          })}
        </div>

        {/* Current preset description */}
        <p className="text-[10px] text-gray-500 mb-2">{currentLengthPreset.description}</p>

        {/* Auto-adjust for topic type */}
        <div className="flex items-center gap-1.5 mb-2">
          <input
            type="checkbox"
            id="respectTopicType"
            checked={contentLength.respectTopicType}
            onChange={(e) => handleLengthSettingChange('respectTopicType', e.target.checked)}
            className="rounded bg-gray-700 border-gray-600 w-3.5 h-3.5"
          />
          <label htmlFor="respectTopicType" className="text-xs text-gray-300">
            Auto-adjust for topic type
          </label>
          <span className="text-[10px] text-gray-500">(core vs outer)</span>
        </div>

        {/* Advanced length options (collapsible) */}
        <button
          onClick={() => setShowLengthAdvanced(!showLengthAdvanced)}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span className={`transform transition-transform ${showLengthAdvanced ? 'rotate-90' : ''}`}>
            {'\u25B6'}
          </span>
          Custom overrides
        </button>

        {showLengthAdvanced && (
          <div className="mt-2 pl-3 border-l border-gray-700 space-y-2">
            <div>
              <label htmlFor="targetWordCount" className="text-[10px] text-gray-400 block mb-0.5">
                Target word count (override)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  id="targetWordCount"
                  value={contentLength.targetWordCount ?? ''}
                  onChange={(e) => handleLengthSettingChange(
                    'targetWordCount',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )}
                  placeholder={currentLengthPreset.targetWords === 'serp' ? 'SERP-based' : String(currentLengthPreset.targetWords)}
                  className="w-24 bg-gray-700 border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
                  min="100"
                  max="10000"
                  step="100"
                />
                {contentLength.targetWordCount !== undefined && (
                  <button
                    onClick={() => handleLengthSettingChange('targetWordCount', undefined)}
                    className="text-[10px] text-gray-500 hover:text-red-400"
                    title="Clear override"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="maxSections" className="text-[10px] text-gray-400 block mb-0.5">
                Max sections (override)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  id="maxSections"
                  value={contentLength.maxSections ?? ''}
                  onChange={(e) => handleLengthSettingChange(
                    'maxSections',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )}
                  placeholder={String(currentLengthPreset.maxSections)}
                  className="w-24 bg-gray-700 border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
                  min="2"
                  max="20"
                />
                {contentLength.maxSections !== undefined && (
                  <button
                    onClick={() => handleLengthSettingChange('maxSections', undefined)}
                    className="text-[10px] text-gray-500 hover:text-red-400"
                    title="Clear override"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkpoint Setting */}
      <div className="flex items-center gap-1.5">
        <input
          type="checkbox"
          id="checkpoint"
          checked={settings.checkpointAfterPass1}
          onChange={(e) => onChange({ ...settings, checkpointAfterPass1: e.target.checked })}
          className="rounded bg-gray-700 border-gray-600 w-3.5 h-3.5"
        />
        <label htmlFor="checkpoint" className="text-xs text-gray-300">
          Pause after initial draft
        </label>
      </div>

      {/* Quality Mode Selector (optional) */}
      {showModeSelector && onModeSettingsChange && (
        <>
          <div className="my-3 border-t border-gray-700" />
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full"
          >
            <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
              {'\u25B6'}
            </span>
            Quality Enforcement Settings
          </button>
          {showAdvanced && (
            <div className="mt-3">
              <ContentGenerationModeSelector
                settings={currentModeSettings}
                onChange={onModeSettingsChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentGenerationSettingsPanel;
