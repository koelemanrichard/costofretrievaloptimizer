/**
 * Brand Style Step
 *
 * Step 1 of Style & Publish modal.
 * Configure design tokens: colors, fonts, spacing, etc.
 *
 * @module components/publishing/steps/BrandStyleStep
 */

import React, { useCallback, useState } from 'react';
import { Label } from '../../ui/Label';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import type { PublishingStyle, DesignTokens, StylePresetId } from '../../../types/publishing';
import type { BrandKit } from '../../../types/business';
import { stylePresets, applyPresetToTokens, defaultDesignTokens } from '../../../config/publishingTemplates';
import { brandKitToDesignTokens } from '../../../services/publishing/styleConfigService';
import { designPersonalities, type DesignPersonalityId } from '../../../config/designTokens/personalities';

// ============================================================================
// Types
// ============================================================================

interface BrandStyleStepProps {
  style: PublishingStyle;
  brandKit?: BrandKit;
  onChange: (updates: Partial<PublishingStyle>) => void;
  personalityId: DesignPersonalityId;
  onPersonalityChange: (id: DesignPersonalityId) => void;
  onAutoDetect: (url: string) => Promise<void>;
  isAnalyzing?: boolean;
  analysisError?: string | null;
  detectionSuccess?: string | null;
  defaultDomain?: string;
}

// ============================================================================
// Component
// ============================================================================

export const BrandStyleStep: React.FC<BrandStyleStepProps> = ({
  style,
  brandKit,
  onChange,
  personalityId,
  onPersonalityChange,
  onAutoDetect,
  isAnalyzing,
  analysisError,
  detectionSuccess,
  defaultDomain,
}) => {
  const [activeTab, setActiveTab] = useState<'design-style' | 'colors' | 'typography' | 'spacing'>('design-style');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState(defaultDomain || '');

  // Handle personality change - sync colors to designTokens
  const handlePersonalityChange = useCallback((id: DesignPersonalityId) => {
    const personality = designPersonalities[id];
    if (personality) {
      // Update the personality ID
      onPersonalityChange(id);
      // Also sync the personality's colors to the style's designTokens
      onChange({
        designTokens: {
          ...style.designTokens,
          colors: {
            ...style.designTokens.colors,
            primary: personality.colors.primary,
            secondary: personality.colors.secondary,
            accent: personality.colors.accent,
            background: personality.colors.background,
            surface: personality.colors.surface,
            text: personality.colors.text,
            textMuted: personality.colors.textMuted,
            border: personality.colors.border,
          },
          fonts: {
            ...style.designTokens.fonts,
            heading: personality.typography.displayFont,
            body: personality.typography.bodyFont,
          },
        },
      });
    }
  }, [onPersonalityChange, onChange, style.designTokens]);

  // Update design tokens
  const updateTokens = useCallback((tokenUpdates: Partial<DesignTokens>) => {
    onChange({
      designTokens: {
        ...style.designTokens,
        ...tokenUpdates,
        colors: {
          ...style.designTokens.colors,
          ...tokenUpdates.colors,
        },
        fonts: {
          ...style.designTokens.fonts,
          ...tokenUpdates.fonts,
        },
        spacing: {
          ...style.designTokens.spacing,
          ...tokenUpdates.spacing,
        },
        typography: {
          ...style.designTokens.typography,
          ...tokenUpdates.typography,
        },
      },
    });
  }, [style.designTokens, onChange]);

  // Apply preset
  const applyPreset = useCallback((presetId: string) => {
    const preset = stylePresets.find(p => p.id === presetId);
    if (preset) {
      const newTokens = applyPresetToTokens(style.designTokens, preset);
      onChange({ designTokens: newTokens });
      setSelectedPreset(presetId);
    }
  }, [style.designTokens, onChange]);

  // Use BrandKit
  const useBrandKit = useCallback(() => {
    if (brandKit) {
      const tokens = brandKitToDesignTokens(brandKit);
      onChange({ designTokens: tokens, name: 'Brand Style' });
      setSelectedPreset(null);
    }
  }, [brandKit, onChange]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    onChange({ designTokens: defaultDesignTokens });
    setSelectedPreset(null);
  }, [onChange]);

  // Color input handler
  const handleColorChange = useCallback((colorKey: keyof DesignTokens['colors'], value: string) => {
    updateTokens({
      colors: {
        ...style.designTokens.colors,
        [colorKey]: value,
      },
    });
  }, [style.designTokens.colors, updateTokens]);

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex border-b border-gray-700">
        {(['design-style', 'colors', 'typography', 'spacing'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {tab === 'design-style' ? 'Design Style' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Design Style Tab - NEW Design Personalities */}
      {activeTab === 'design-style' && (
        <div className="space-y-4">
          {/* AI Stylist / Auto-detect Section */}
          <div className="p-4 bg-blue-900/20 rounded-xl border border-blue-500/30 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">✨</span>
              <h3 className="text-sm font-semibold text-blue-300">AI Stylist: Auto-detect Branding</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Enter a website URL to automatically extract its color palette, typography, and design tokens.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="bg-gray-900/50 border-gray-700 h-9 text-xs"
                />
              </div>
              <Button
                size="sm"
                onClick={() => onAutoDetect(targetUrl)}
                disabled={isAnalyzing || !targetUrl}
                className="bg-blue-600 hover:bg-blue-500 min-w-[120px]"
              >
                {isAnalyzing ? 'Analyzing...' : 'Detect Design'}
              </Button>
            </div>
            {analysisError && (
              <p className="text-[10px] text-red-400 mt-2 bg-red-900/20 p-2 rounded border border-red-500/20">
                ⚠️ {analysisError}
              </p>
            )}
            {detectionSuccess && (
              <p className="text-[10px] text-green-400 mt-2 bg-green-900/20 p-2 rounded border border-green-500/20 flex items-center gap-2">
                <span className="text-sm">✅</span> {detectionSuccess}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-gray-700/50" />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Or select a personality</span>
            <div className="h-px flex-1 bg-gray-700/50" />
          </div>

          <p className="text-sm text-gray-400">
            Choose a design personality that matches your brand. Each style includes unique typography, colors, spacing, and component variants.
          </p>

          {/* Design Personality Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(designPersonalities).map(personality => (
              <button
                key={personality.id}
                type="button"
                onClick={() => handlePersonalityChange(personality.id as DesignPersonalityId)}
                className={`
                  p-4 rounded-xl border text-left transition-all
                  ${personalityId === personality.id
                    ? 'border-blue-500 bg-blue-900/30 ring-2 ring-blue-500/50'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
                  }
                `}
              >
                {/* Color preview */}
                <div className="flex gap-1 mb-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: personality.colors.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: personality.colors.accent }}
                  />
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: personality.colors.background }}
                  />
                </div>

                {/* Name and description */}
                <h4 className="font-semibold text-white mb-1">{personality.name}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{personality.description}</p>

                {/* Style indicators */}
                <div className="flex flex-wrap gap-1 mt-3">
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300">
                    {personality.typography.scaleRatio === 1.125 ? 'Subtle Scale' :
                      personality.typography.scaleRatio === 1.333 ? 'Dramatic Scale' : 'Balanced Scale'}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300">
                    {personality.layout.radiusScale.lg === '0' ? 'Sharp' :
                      personality.layout.radiusScale.lg.includes('16') ? 'Rounded' : 'Subtle'}
                  </span>
                </div>

                {/* Selected indicator */}
                {personalityId === personality.id && (
                  <div className="mt-3 flex items-center gap-1 text-blue-400 text-xs font-medium">
                    <span>✓</span> Selected
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* BrandKit option - secondary */}
          {brandKit && (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white text-sm">Override with Brand Kit Colors</h4>
                  <p className="text-xs text-gray-400">
                    Use your project's brand colors while keeping the selected design style
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={useBrandKit}>
                  Apply Colors
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Primary Colors */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Brand Colors</h4>

            <div>
              <Label htmlFor="color-primary">Primary</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color-primary"
                  value={style.designTokens.colors.primary}
                  onChange={e => handleColorChange('primary', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={style.designTokens.colors.primary}
                  onChange={e => handleColorChange('primary', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-secondary">Secondary</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color-secondary"
                  value={style.designTokens.colors.secondary}
                  onChange={e => handleColorChange('secondary', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={style.designTokens.colors.secondary}
                  onChange={e => handleColorChange('secondary', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-accent">Accent</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color-accent"
                  value={style.designTokens.colors.accent}
                  onChange={e => handleColorChange('accent', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={style.designTokens.colors.accent}
                  onChange={e => handleColorChange('accent', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Background Colors */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Backgrounds</h4>

            <div>
              <Label htmlFor="color-background">Background</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color-background"
                  value={style.designTokens.colors.background}
                  onChange={e => handleColorChange('background', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={style.designTokens.colors.background}
                  onChange={e => handleColorChange('background', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-surface">Surface</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color-surface"
                  value={style.designTokens.colors.surface}
                  onChange={e => handleColorChange('surface', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={style.designTokens.colors.surface}
                  onChange={e => handleColorChange('surface', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-text">Text</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color-text"
                  value={style.designTokens.colors.text}
                  onChange={e => handleColorChange('text', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={style.designTokens.colors.text}
                  onChange={e => handleColorChange('text', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="col-span-2 mt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Preview</h4>
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: style.designTokens.colors.background }}
            >
              <div
                className="p-4 rounded-lg mb-4"
                style={{ backgroundColor: style.designTokens.colors.surface }}
              >
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: style.designTokens.colors.text }}
                >
                  Sample Heading
                </h3>
                <p
                  className="text-sm"
                  style={{ color: style.designTokens.colors.textMuted }}
                >
                  This is sample text showing how your colors will look together.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: style.designTokens.colors.primary }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: style.designTokens.colors.secondary }}
                >
                  Secondary
                </button>
                <button
                  className="px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: style.designTokens.colors.accent }}
                >
                  Accent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="font-heading">Heading Font</Label>
              <Select
                value={style.designTokens.fonts.heading}
                onChange={e => updateTokens({ fonts: { ...style.designTokens.fonts, heading: e.target.value } })}
              >
                <option value="Inter, system-ui, sans-serif">Inter</option>
                <option value="Geist, Inter, system-ui, sans-serif">Geist</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Playfair Display', serif">Playfair Display</option>
                <option value="'Roboto', sans-serif">Roboto</option>
                <option value="'Open Sans', sans-serif">Open Sans</option>
                <option value="'Lato', sans-serif">Lato</option>
                <option value="'Montserrat', sans-serif">Montserrat</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="font-body">Body Font</Label>
              <Select
                value={style.designTokens.fonts.body}
                onChange={e => updateTokens({ fonts: { ...style.designTokens.fonts, body: e.target.value } })}
              >
                <option value="Inter, system-ui, sans-serif">Inter</option>
                <option value="Geist, Inter, system-ui, sans-serif">Geist</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Roboto', sans-serif">Roboto</option>
                <option value="'Open Sans', sans-serif">Open Sans</option>
                <option value="'Lato', sans-serif">Lato</option>
                <option value="'Source Sans Pro', sans-serif">Source Sans Pro</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="heading-weight">Heading Weight</Label>
              <Select
                value={style.designTokens.typography.headingWeight}
                onChange={e => updateTokens({
                  typography: {
                    ...style.designTokens.typography,
                    headingWeight: e.target.value as DesignTokens['typography']['headingWeight'],
                  },
                })}
              >
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="semibold">Semibold</option>
                <option value="bold">Bold</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="body-line-height">Body Line Height</Label>
              <Select
                value={style.designTokens.typography.bodyLineHeight}
                onChange={e => updateTokens({
                  typography: {
                    ...style.designTokens.typography,
                    bodyLineHeight: e.target.value as DesignTokens['typography']['bodyLineHeight'],
                  },
                })}
              >
                <option value="tight">Tight (1.4)</option>
                <option value="normal">Normal (1.6)</option>
                <option value="relaxed">Relaxed (1.8)</option>
              </Select>
            </div>
          </div>

          {/* Typography Preview */}
          <div className="p-6 bg-gray-800 rounded-lg mt-4">
            <h2
              className="text-2xl mb-2"
              style={{
                fontFamily: style.designTokens.fonts.heading,
                fontWeight: style.designTokens.typography.headingWeight === 'bold' ? 700
                  : style.designTokens.typography.headingWeight === 'semibold' ? 600
                    : style.designTokens.typography.headingWeight === 'medium' ? 500 : 400,
              }}
            >
              Heading Preview
            </h2>
            <p
              style={{
                fontFamily: style.designTokens.fonts.body,
                lineHeight: style.designTokens.typography.bodyLineHeight === 'relaxed' ? 1.8
                  : style.designTokens.typography.bodyLineHeight === 'tight' ? 1.4 : 1.6,
              }}
            >
              This is a preview of your body text. The quick brown fox jumps over the lazy dog.
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>
        </div>
      )}

      {/* Spacing Tab */}
      {activeTab === 'spacing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="section-gap">Section Gap</Label>
              <Select
                value={style.designTokens.spacing.sectionGap}
                onChange={e => updateTokens({
                  spacing: {
                    ...style.designTokens.spacing,
                    sectionGap: e.target.value as DesignTokens['spacing']['sectionGap'],
                  },
                })}
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="spacious">Spacious</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="content-width">Content Width</Label>
              <Select
                value={style.designTokens.spacing.contentWidth}
                onChange={e => updateTokens({
                  spacing: {
                    ...style.designTokens.spacing,
                    contentWidth: e.target.value as DesignTokens['spacing']['contentWidth'],
                  },
                })}
              >
                <option value="narrow">Narrow (640px)</option>
                <option value="standard">Standard (768px)</option>
                <option value="wide">Wide (1024px)</option>
                <option value="full">Full Width</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="border-radius">Border Radius</Label>
              <Select
                value={style.designTokens.borderRadius}
                onChange={e => updateTokens({
                  borderRadius: e.target.value as DesignTokens['borderRadius'],
                })}
              >
                <option value="none">None</option>
                <option value="subtle">Subtle</option>
                <option value="rounded">Rounded</option>
                <option value="pill">Pill</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="shadows">Shadows</Label>
              <Select
                value={style.designTokens.shadows}
                onChange={e => updateTokens({
                  shadows: e.target.value as DesignTokens['shadows'],
                })}
              >
                <option value="none">None</option>
                <option value="subtle">Subtle</option>
                <option value="medium">Medium</option>
                <option value="dramatic">Dramatic</option>
              </Select>
            </div>
          </div>

          {/* Spacing Preview */}
          <div className="p-6 bg-gray-800 rounded-lg mt-4">
            <div className="flex gap-4 items-start">
              <div
                className="w-24 h-24 bg-blue-600 flex items-center justify-center text-white text-sm"
                style={{
                  borderRadius: style.designTokens.borderRadius === 'none' ? 0
                    : style.designTokens.borderRadius === 'subtle' ? '0.25rem'
                      : style.designTokens.borderRadius === 'pill' ? '9999px' : '0.5rem',
                  boxShadow: style.designTokens.shadows === 'none' ? 'none'
                    : style.designTokens.shadows === 'subtle' ? '0 1px 2px rgba(0,0,0,0.1)'
                      : style.designTokens.shadows === 'dramatic' ? '0 10px 25px rgba(0,0,0,0.3)'
                        : '0 4px 6px rgba(0,0,0,0.15)',
                }}
              >
                Card
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">
                  <strong>Border Radius:</strong> {style.designTokens.borderRadius}
                </p>
                <p className="text-sm text-gray-300">
                  <strong>Shadow:</strong> {style.designTokens.shadows}
                </p>
                <p className="text-sm text-gray-300">
                  <strong>Content Width:</strong> {style.designTokens.spacing.contentWidth}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandStyleStep;
