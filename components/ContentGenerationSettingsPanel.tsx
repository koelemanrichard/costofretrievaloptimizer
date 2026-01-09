// components/ContentGenerationSettingsPanel.tsx
import React, { useState } from 'react';
import {
  ContentGenerationSettings,
  ContentGenerationPriorities,
  ContentTone,
  AudienceExpertise
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

export const ContentGenerationSettingsPanel: React.FC<Props> = ({
  settings,
  onChange,
  presets,
  modeSettings,
  onModeSettingsChange,
  showModeSelector = false,
}) => {
  const [activePreset, setActivePreset] = useState<string | null>('balanced');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Use default mode settings if not provided
  const currentModeSettings = modeSettings || DEFAULT_GENERATION_SETTINGS;

  const handlePriorityChange = (key: keyof ContentGenerationPriorities, value: number) => {
    setActivePreset(null);
    onChange({
      ...settings,
      priorities: { ...settings.priorities, [key]: value }
    });
  };

  const handlePresetSelect = (presetKey: string) => {
    setActivePreset(presetKey);
    onChange({
      ...settings,
      priorities: presets[presetKey]
    });
  };

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
      <div className="grid grid-cols-2 gap-2 mb-2">
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
