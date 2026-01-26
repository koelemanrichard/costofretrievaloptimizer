/**
 * Brand Intelligence Step
 *
 * Consolidated brand detection experience that combines AI brand detection
 * with inline personality adjustments. This replaces the separate BrandStep
 * and BrandStyleStep tabs for a cleaner single-step experience.
 *
 * Features:
 * - URL input for brand detection
 * - Screenshot display (prominent at top)
 * - Color palette summary (horizontal palette)
 * - Font summary (heading and body fonts)
 * - Personality sliders (formality, energy, warmth) - VISIBLE inline
 * - Expandable Design DNA details for advanced users
 *
 * @module components/publishing/steps/BrandIntelligenceStep
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { AnalysisProgress } from '../AnalysisProgress';
import { useBrandDetection } from '../../../hooks/useBrandDetection';
import type { DesignDNA, BrandDesignSystem } from '../../../types/designDna';

// ============================================================================
// Types
// ============================================================================

interface BrandIntelligenceStepProps {
  // Detection inputs
  defaultDomain?: string;
  apifyToken: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId?: string;

  // Detection results (passed in when already detected)
  designDna: DesignDNA | null;
  brandDesignSystem: BrandDesignSystem | null;
  screenshotBase64: string | null;

  // Saved brand data info (for showing when data was last analyzed)
  savedSourceUrl?: string | null;
  savedExtractedAt?: string | null;
  isLoadingSavedData?: boolean;

  // Callbacks
  onDetectionComplete: (result: {
    designDna: DesignDNA;
    designSystem: BrandDesignSystem;
    screenshotBase64: string;
  }) => void;
  onDesignDnaChange?: (dna: DesignDNA) => void;
  onRegenerate?: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

interface ColorSwatchProps {
  label: string;
  color: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ label, color }) => (
  <div className="text-center">
    <div
      className="w-12 h-12 rounded-lg border border-zinc-600 mb-1 transition-transform hover:scale-110"
      style={{ backgroundColor: color }}
      title={color}
    />
    <span className="text-[10px] text-zinc-400">{label}</span>
  </div>
);

interface PersonalitySliderProps {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  lowLabel: string;
  highLabel: string;
  currentLabel: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const PersonalitySlider: React.FC<PersonalitySliderProps> = ({
  value,
  lowLabel,
  highLabel,
  currentLabel,
  onChange,
  disabled = false,
}) => (
  <div>
    <div className="flex justify-between text-xs text-zinc-400 mb-1">
      <span>{lowLabel}</span>
      <span className="text-white font-medium">{currentLabel}</span>
      <span>{highLabel}</span>
    </div>
    <input
      type="range"
      min="1"
      max="5"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      disabled={disabled}
      className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const BrandIntelligenceStep: React.FC<BrandIntelligenceStepProps> = ({
  defaultDomain,
  apifyToken,
  geminiApiKey,
  anthropicApiKey,
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  designDna,
  brandDesignSystem,
  screenshotBase64,
  savedSourceUrl,
  savedExtractedAt,
  isLoadingSavedData,
  onDetectionComplete,
  onDesignDnaChange,
  onRegenerate,
}) => {
  const [targetUrl, setTargetUrl] = useState(defaultDomain || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const detection = useBrandDetection({
    apifyToken,
    geminiApiKey,
    anthropicApiKey,
    supabaseUrl,
    supabaseAnonKey,
    projectId,
  });

  const handleDetect = useCallback(() => {
    if (!targetUrl) return;
    detection.detect(targetUrl);
  }, [targetUrl, detection]);

  // Track which detection result we've already notified parent about (prevents infinite loop)
  // The loop happened because onDetectionComplete was in the dependency array,
  // and every time the parent updated state, the callback reference changed,
  // triggering this effect again even though the detection.result was the same.
  const lastNotifiedResultRef = useRef<typeof detection.result>(null);

  // Notify parent when detection completes (only once per unique result)
  useEffect(() => {
    if (detection.result && detection.result !== lastNotifiedResultRef.current) {
      lastNotifiedResultRef.current = detection.result;
      onDetectionComplete({
        designDna: detection.result.designDna,
        designSystem: detection.result.designSystem,
        screenshotBase64: detection.result.screenshotBase64,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDetectionComplete intentionally excluded to prevent infinite loops
  }, [detection.result]);

  // Personality slider handler
  const handlePersonalityChange = useCallback(
    (field: 'formality' | 'energy' | 'warmth', value: number) => {
      if (!onDesignDnaChange) return;

      // Use current DNA from props or detection result
      const currentDna = designDna || detection.result?.designDna;
      if (!currentDna) return;

      onDesignDnaChange({
        ...currentDna,
        personality: {
          overall: currentDna.personality?.overall || 'corporate',
          formality: currentDna.personality?.formality || 3,
          energy: currentDna.personality?.energy || 3,
          warmth: currentDna.personality?.warmth || 3,
          ...currentDna.personality,
          [field]: value as 1 | 2 | 3 | 4 | 5,
        },
      });
    },
    [designDna, detection.result, onDesignDnaChange]
  );

  // Get label for personality value
  const getPersonalityLabel = (
    field: 'formality' | 'energy' | 'warmth',
    value: number
  ): string => {
    const labels: Record<string, Record<number, string>> = {
      formality: { 1: 'Very Casual', 2: 'Casual', 3: 'Balanced', 4: 'Formal', 5: 'Corporate' },
      energy: { 1: 'Very Calm', 2: 'Calm', 3: 'Moderate', 4: 'Energetic', 5: 'Bold' },
      warmth: { 1: 'Very Cool', 2: 'Cool', 3: 'Neutral', 4: 'Warm', 5: 'Very Warm' },
    };
    return labels[field][value] || 'Unknown';
  };

  // Handle regenerate request - clears saved data and triggers new detection
  const handleRegenerate = useCallback(() => {
    setIsRegenerating(true);
    // Reset detection state
    detection.reset();
    // Notify parent to clear saved data
    if (onRegenerate) {
      onRegenerate();
    }
    setIsRegenerating(false);
  }, [detection, onRegenerate]);

  // Format the saved date for display
  const formatSavedDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Use the current state from props (if already detected) or detection result
  const currentDna = designDna || detection.result?.designDna;
  const currentScreenshot = screenshotBase64 || detection.result?.screenshotBase64;
  const hasDetection = Boolean(currentDna);
  const hasSavedData = Boolean(savedSourceUrl && savedExtractedAt && hasDetection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">&#127912;</span>
        <div>
          <h3 className="text-lg font-bold text-white">Brand Intelligence</h3>
          <p className="text-xs text-zinc-400">
            AI-powered design extraction from your website
          </p>
        </div>
      </div>

      {/* Loading saved data indicator */}
      {isLoadingSavedData && (
        <div className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-600/30 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm text-zinc-300">Loading saved brand data...</span>
        </div>
      )}

      {/* Saved data banner - show when using previously saved detection */}
      {hasSavedData && !detection.isAnalyzing && (
        <div className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-lg border border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">&#9989;</span>
              <div>
                <p className="text-sm text-green-300 font-medium">Using saved brand profile</p>
                <p className="text-xs text-zinc-400">
                  Analyzed from <span className="text-zinc-300">{savedSourceUrl}</span>
                  {savedExtractedAt && (
                    <> on <span className="text-zinc-300">{formatSavedDate(savedExtractedAt)}</span></>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating || !apifyToken}
              className="text-xs"
            >
              {isRegenerating ? 'Clearing...' : '↻ Re-analyze'}
            </Button>
          </div>
        </div>
      )}

      {/* Detection Input - show when no detection and not analyzing */}
      {!hasDetection && !detection.isAnalyzing && !isLoadingSavedData && (
        <div className="p-6 bg-gradient-to-br from-zinc-900/40 to-stone-900/20 rounded-2xl border border-zinc-500/30">
          <div className="flex gap-2">
            <Input
              placeholder="https://your-website.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="flex-1 bg-gray-900/80 border-zinc-600/30"
            />
            <Button
              onClick={handleDetect}
              disabled={!targetUrl || !apifyToken}
              className="min-w-[140px] bg-blue-600 hover:bg-blue-500"
            >
              Detect Brand
            </Button>
          </div>
          {!apifyToken && (
            <p className="text-xs text-yellow-400 mt-3">
              &#9888; Add an Apify API token in Settings to enable brand detection
            </p>
          )}
        </div>
      )}

      {/* Progress */}
      {detection.isAnalyzing && (
        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-500/30">
          <AnalysisProgress
            steps={detection.steps}
            progress={detection.progress}
            error={detection.error || undefined}
          />
        </div>
      )}

      {/* Error */}
      {detection.error && !detection.isAnalyzing && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{detection.error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => detection.reset()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Results - Brand Summary */}
      {currentDna && (
        <>
          {/* Screenshot + Summary Row */}
          <div className="flex gap-6">
            {/* Screenshot */}
            {currentScreenshot && (
              <div className="flex-shrink-0">
                <div className="w-48 h-36 rounded-lg overflow-hidden border border-zinc-700 shadow-lg">
                  <img
                    src={`data:image/png;base64,${currentScreenshot}`}
                    alt="Brand screenshot"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">Brand Summary</h4>
                <Button variant="secondary" size="sm" onClick={() => detection.reset()}>
                  Re-detect
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Heading Font:</span>
                  <span className="ml-2 text-white font-medium">
                    {currentDna.typography?.headingFont?.family || 'System UI'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Body Font:</span>
                  <span className="ml-2 text-white font-medium">
                    {currentDna.typography?.bodyFont?.family || 'System UI'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Style:</span>
                  <span className="ml-2 text-white capitalize">
                    {currentDna.personality?.overall || 'corporate'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Confidence:</span>
                  <span className="ml-2 text-green-400 font-medium">
                    {Math.round((currentDna.confidence?.overall || 0.5) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700/50">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Color Palette</h4>
            <div className="flex gap-3 flex-wrap">
              <ColorSwatch label="Primary" color={currentDna.colors?.primary?.hex || '#3b82f6'} />
              <ColorSwatch label="Secondary" color={currentDna.colors?.secondary?.hex || '#1f2937'} />
              <ColorSwatch label="Accent" color={currentDna.colors?.accent?.hex || '#f59e0b'} />
              <ColorSwatch label="Background" color={currentDna.colors?.neutrals?.lightest || '#f9fafb'} />
              <ColorSwatch label="Surface" color={currentDna.colors?.neutrals?.light || '#f3f4f6'} />
              <ColorSwatch label="Text" color={currentDna.colors?.neutrals?.darkest || '#111827'} />
            </div>
          </div>

          {/* Personality Sliders - VISIBLE INLINE */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700/50">
            <h4 className="text-sm font-medium text-zinc-300 mb-4">Personality Adjustments</h4>
            <div className="space-y-5">
              {/* Formality Slider */}
              <PersonalitySlider
                label="Formality"
                value={currentDna.personality?.formality || 3}
                lowLabel="Casual"
                highLabel="Formal"
                currentLabel={getPersonalityLabel('formality', currentDna.personality?.formality || 3)}
                onChange={(value) => handlePersonalityChange('formality', value)}
                disabled={!onDesignDnaChange}
              />

              {/* Energy Slider */}
              <PersonalitySlider
                label="Energy"
                value={currentDna.personality?.energy || 3}
                lowLabel="Calm"
                highLabel="Bold"
                currentLabel={getPersonalityLabel('energy', currentDna.personality?.energy || 3)}
                onChange={(value) => handlePersonalityChange('energy', value)}
                disabled={!onDesignDnaChange}
              />

              {/* Warmth Slider */}
              <PersonalitySlider
                label="Warmth"
                value={currentDna.personality?.warmth || 3}
                lowLabel="Cool"
                highLabel="Warm"
                currentLabel={getPersonalityLabel('warmth', currentDna.personality?.warmth || 3)}
                onChange={(value) => handlePersonalityChange('warmth', value)}
                disabled={!onDesignDnaChange}
              />
            </div>
          </div>

          {/* Expandable Design DNA Details */}
          <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-4 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors"
            >
              <span className="text-sm font-medium text-zinc-300">
                Design DNA Details
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
              <div className="p-4 bg-zinc-950/50 text-xs font-mono text-zinc-400 max-h-96 overflow-auto">
                <pre>{JSON.stringify(currentDna, null, 2)}</pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BrandIntelligenceStep;
