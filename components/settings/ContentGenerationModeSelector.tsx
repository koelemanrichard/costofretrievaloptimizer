/**
 * ContentGenerationModeSelector Component
 *
 * Allows users to select their preferred content generation mode and configure
 * related settings for quality enforcement behavior.
 *
 * Features:
 * - Toggle between Autonomous and Supervised modes
 * - Configure auto-upgrade severity settings
 * - Enable/disable regression notifications
 * - Set critical failure pause behavior
 *
 * @module components/settings
 */

import React, { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export type GenerationMode = 'autonomous' | 'supervised';

export interface ContentGenerationSettings {
  /** Generation mode: autonomous (AI decides) or supervised (user approves) */
  mode: GenerationMode;
  /** Auto-upgrade WARNING severity to ERROR after grace period */
  autoUpgradeSeverity: boolean;
  /** Send notifications when regressions are detected */
  notifyOnRegression: boolean;
  /** Pause generation even in autonomous mode when critical rules fail */
  pauseOnCriticalFail: boolean;
  /** Maximum retry attempts per rule per pass */
  maxRetries: number;
}

export interface ContentGenerationModeSelectorProps {
  /** Current settings */
  settings: ContentGenerationSettings;
  /** Callback when settings change */
  onChange: (settings: ContentGenerationSettings) => void;
  /** Whether the form is in a saving state */
  isSaving?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SETTINGS: ContentGenerationSettings = {
  mode: 'autonomous',
  autoUpgradeSeverity: true,
  notifyOnRegression: true,
  pauseOnCriticalFail: true,
  maxRetries: 2,
};

const MODE_DESCRIPTIONS: Record<GenerationMode, { title: string; description: string; features: string[] }> = {
  autonomous: {
    title: 'Autonomous Mode',
    description: 'AI handles all decisions automatically. You\'ll be informed of progress but not required to approve each step.',
    features: [
      'Fastest generation time',
      'Smart retry logic prevents endless loops',
      'Auto-revert on critical regressions',
      'Best for bulk content generation',
    ],
  },
  supervised: {
    title: 'Supervised Mode',
    description: 'AI pauses after each pass for your review. You must approve, edit, or revert before continuing.',
    features: [
      'Full control over every change',
      'Review content at each stage',
      'Manual intervention at any point',
      'Best for high-stakes content',
    ],
  },
};

// =============================================================================
// Sub-Components
// =============================================================================

interface ModeCardProps {
  mode: GenerationMode;
  isSelected: boolean;
  onClick: () => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ mode, isSelected, onClick }) => {
  const info = MODE_DESCRIPTIONS[mode];

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border-2 text-left transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-900/20'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
            ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${isSelected ? 'text-blue-300' : 'text-white'}`}>
            {info.title}
          </h4>
          <p className="text-sm text-gray-400 mt-1">{info.description}</p>
          <ul className="mt-3 space-y-1">
            {info.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-green-400">{'\u2713'}</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  );
};

interface ToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="flex-1">
        <label
          htmlFor={id}
          className={`font-medium ${disabled ? 'text-gray-500' : 'text-white'}`}
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
          ${checked ? 'bg-blue-600' : 'bg-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};

interface NumberInputProps {
  id: string;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  id,
  label,
  description,
  value,
  min,
  max,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="flex-1">
        <label
          htmlFor={id}
          className={`font-medium ${disabled ? 'text-gray-500' : 'text-white'}`}
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
        disabled={disabled}
        className={`
          w-20 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center
          focus:border-blue-500 focus:outline-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const ContentGenerationModeSelector: React.FC<ContentGenerationModeSelectorProps> = ({
  settings,
  onChange,
  isSaving = false,
  className = '',
}) => {
  // Handle individual setting changes
  const handleModeChange = useCallback((mode: GenerationMode) => {
    onChange({ ...settings, mode });
  }, [settings, onChange]);

  const handleToggleChange = useCallback((key: keyof ContentGenerationSettings, value: boolean) => {
    onChange({ ...settings, [key]: value });
  }, [settings, onChange]);

  const handleNumberChange = useCallback((key: keyof ContentGenerationSettings, value: number) => {
    onChange({ ...settings, [key]: value });
  }, [settings, onChange]);

  return (
    <div className={`content-generation-mode-selector ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Content Generation Mode</h3>
        <p className="text-sm text-gray-400 mt-1">
          Configure how the AI handles quality enforcement during content generation.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ModeCard
          mode="autonomous"
          isSelected={settings.mode === 'autonomous'}
          onClick={() => handleModeChange('autonomous')}
        />
        <ModeCard
          mode="supervised"
          isSelected={settings.mode === 'supervised'}
          onClick={() => handleModeChange('supervised')}
        />
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-gray-700 pt-6">
        <h4 className="text-md font-semibold text-white mb-4">Advanced Settings</h4>

        <div className="space-y-1 divide-y divide-gray-700/50">
          <Toggle
            id="autoUpgradeSeverity"
            label="Auto-upgrade Severity"
            description="Automatically upgrade WARNING rules to ERROR after the grace period"
            checked={settings.autoUpgradeSeverity}
            onChange={checked => handleToggleChange('autoUpgradeSeverity', checked)}
          />

          <Toggle
            id="notifyOnRegression"
            label="Regression Notifications"
            description="Receive notifications when content quality regresses during generation"
            checked={settings.notifyOnRegression}
            onChange={checked => handleToggleChange('notifyOnRegression', checked)}
          />

          <Toggle
            id="pauseOnCriticalFail"
            label="Pause on Critical Failure"
            description="Pause generation when critical rules fail, even in autonomous mode"
            checked={settings.pauseOnCriticalFail}
            onChange={checked => handleToggleChange('pauseOnCriticalFail', checked)}
            disabled={settings.mode === 'supervised'} // Always pauses in supervised
          />

          <NumberInput
            id="maxRetries"
            label="Maximum Retries"
            description="Maximum retry attempts per rule per pass before giving up"
            value={settings.maxRetries}
            min={1}
            max={5}
            onChange={value => handleNumberChange('maxRetries', value)}
          />
        </div>
      </div>

      {/* Current Mode Summary */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-start gap-3">
          <span className="text-2xl">
            {settings.mode === 'autonomous' ? '\uD83E\uDD16' : '\uD83D\uDC64'}
          </span>
          <div>
            <h5 className="font-medium text-white">
              {settings.mode === 'autonomous' ? 'Autonomous Mode Active' : 'Supervised Mode Active'}
            </h5>
            <p className="text-sm text-gray-400 mt-1">
              {settings.mode === 'autonomous'
                ? 'The AI will handle most decisions automatically. You\'ll receive a report when generation completes.'
                : 'You\'ll be asked to review and approve each pass before the AI continues.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {settings.pauseOnCriticalFail && (
                <span className="px-2 py-1 text-xs bg-yellow-900/30 text-yellow-300 rounded">
                  Pause on Critical
                </span>
              )}
              {settings.notifyOnRegression && (
                <span className="px-2 py-1 text-xs bg-blue-900/30 text-blue-300 rounded">
                  Regression Alerts
                </span>
              )}
              {settings.autoUpgradeSeverity && (
                <span className="px-2 py-1 text-xs bg-purple-900/30 text-purple-300 rounded">
                  Auto-upgrade Severity
                </span>
              )}
              <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                {settings.maxRetries} max retries
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Saving indicator */}
      {isSaving && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <span className="animate-spin">{'\u23F3'}</span>
          Saving settings...
        </div>
      )}
    </div>
  );
};

export default ContentGenerationModeSelector;

// Export default settings for use elsewhere
export { DEFAULT_SETTINGS as DEFAULT_GENERATION_SETTINGS };
