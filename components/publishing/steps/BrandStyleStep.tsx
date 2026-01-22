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

// ============================================================================
// Types
// ============================================================================

interface BrandStyleStepProps {
  style: PublishingStyle;
  brandKit?: BrandKit;
  onChange: (updates: Partial<PublishingStyle>) => void;
}

// ============================================================================
// Component
// ============================================================================

export const BrandStyleStep: React.FC<BrandStyleStepProps> = ({
  style,
  brandKit,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'typography' | 'spacing'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

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
        {(['presets', 'colors', 'typography', 'spacing'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium capitalize transition-colors
              ${activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Presets Tab */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          {/* BrandKit option */}
          {brandKit && (
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">Use Project Brand Kit</h4>
                  <p className="text-sm text-gray-400">
                    Apply colors and fonts from your project settings
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={useBrandKit}>
                  Apply
                </Button>
              </div>
              {/* Preview colors */}
              <div className="flex gap-2 mt-3">
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: brandKit.colors?.primary || '#3B82F6' }}
                  title="Primary"
                />
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: brandKit.colors?.secondary || '#1E40AF' }}
                  title="Secondary"
                />
              </div>
            </div>
          )}

          {/* Preset grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stylePresets.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`
                  p-4 rounded-lg border text-left transition-all
                  ${selectedPreset === preset.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex gap-1 mb-2">
                  {preset.designTokens.colors && (
                    <>
                      <div
                        className="w-5 h-5 rounded"
                        style={{ backgroundColor: preset.designTokens.colors.primary }}
                      />
                      <div
                        className="w-5 h-5 rounded"
                        style={{ backgroundColor: preset.designTokens.colors.secondary }}
                      />
                      <div
                        className="w-5 h-5 rounded"
                        style={{ backgroundColor: preset.designTokens.colors.accent }}
                      />
                    </>
                  )}
                </div>
                <h4 className="font-medium text-white text-sm">{preset.name}</h4>
                <p className="text-xs text-gray-400 mt-1">{preset.description}</p>
              </button>
            ))}
          </div>

          {/* Reset button */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
          </div>
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
