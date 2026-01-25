/**
 * Design DNA Inline Editors
 *
 * Inline editor components for modifying Design DNA sections:
 * - Colors: Primary, secondary, accent, neutrals
 * - Typography: Fonts, weights, scale
 * - Shapes: Border radius, button/card styles
 * - Personality: Overall vibe, formality, energy, warmth
 *
 * @module components/publishing/editors/DesignDNAEditors
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import type { DesignDNA, ColorWithUsage } from '../../../types/designDna';

// ============================================================================
// Types
// ============================================================================

export type EditSection = 'colors' | 'typography' | 'shapes' | 'personality';

interface BaseEditorProps {
  dna: DesignDNA;
  onSave: (updatedDna: DesignDNA) => void;
  onCancel: () => void;
}

interface DesignDNAEditorsProps {
  dna: DesignDNA;
  editingSection: EditSection | null;
  onSave: (updatedDna: DesignDNA) => void;
  onCancel: () => void;
}

// ============================================================================
// Color Editor
// ============================================================================

const ColorInput: React.FC<{
  label: string;
  color: ColorWithUsage;
  onChange: (color: ColorWithUsage) => void;
}> = ({ label, color, onChange }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-400">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color.hex}
        onChange={(e) => onChange({ ...color, hex: e.target.value })}
        className="w-8 h-8 rounded cursor-pointer border border-gray-600"
      />
      <Input
        value={color.hex}
        onChange={(e) => onChange({ ...color, hex: e.target.value })}
        className="flex-1 text-xs bg-gray-800 border-gray-600"
        placeholder="#000000"
      />
    </div>
  </div>
);

const NeutralInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-6 h-6 rounded cursor-pointer border border-gray-600"
    />
    <span className="text-xs text-gray-400 w-16">{label}</span>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 text-xs bg-gray-800 border-gray-600"
      placeholder="#000000"
    />
  </div>
);

const ColorsEditor: React.FC<BaseEditorProps> = ({ dna, onSave, onCancel }) => {
  const [colors, setColors] = useState(dna.colors);

  const handleSave = () => {
    onSave({ ...dna, colors });
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/30 space-y-4">
      <h4 className="text-sm font-medium text-white flex items-center gap-2">
        <span>🎨</span> Edit Colors
      </h4>

      {/* Primary Colors */}
      <div className="grid grid-cols-3 gap-4">
        <ColorInput
          label="Primary"
          color={colors.primary}
          onChange={(c) => setColors({ ...colors, primary: c })}
        />
        <ColorInput
          label="Secondary"
          color={colors.secondary}
          onChange={(c) => setColors({ ...colors, secondary: c })}
        />
        <ColorInput
          label="Accent"
          color={colors.accent}
          onChange={(c) => setColors({ ...colors, accent: c })}
        />
      </div>

      {/* Neutrals */}
      <div className="pt-3 border-t border-gray-700">
        <label className="text-xs text-gray-400 mb-2 block">Neutrals</label>
        <div className="grid grid-cols-2 gap-2">
          <NeutralInput
            label="Darkest"
            value={colors.neutrals.darkest}
            onChange={(v) => setColors({ ...colors, neutrals: { ...colors.neutrals, darkest: v } })}
          />
          <NeutralInput
            label="Dark"
            value={colors.neutrals.dark}
            onChange={(v) => setColors({ ...colors, neutrals: { ...colors.neutrals, dark: v } })}
          />
          <NeutralInput
            label="Medium"
            value={colors.neutrals.medium}
            onChange={(v) => setColors({ ...colors, neutrals: { ...colors.neutrals, medium: v } })}
          />
          <NeutralInput
            label="Light"
            value={colors.neutrals.light}
            onChange={(v) => setColors({ ...colors, neutrals: { ...colors.neutrals, light: v } })}
          />
          <NeutralInput
            label="Lightest"
            value={colors.neutrals.lightest}
            onChange={(v) => setColors({ ...colors, neutrals: { ...colors.neutrals, lightest: v } })}
          />
        </div>
      </div>

      {/* Mood & Harmony */}
      <div className="pt-3 border-t border-gray-700 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Color Mood</label>
          <Select
            value={colors.dominantMood}
            onChange={(e) => setColors({ ...colors, dominantMood: e.target.value as typeof colors.dominantMood })}
            className="text-xs"
          >
            <option value="corporate">Corporate</option>
            <option value="creative">Creative</option>
            <option value="luxurious">Luxurious</option>
            <option value="friendly">Friendly</option>
            <option value="bold">Bold</option>
            <option value="minimal">Minimal</option>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Color Harmony</label>
          <Select
            value={colors.harmony}
            onChange={(e) => setColors({ ...colors, harmony: e.target.value as typeof colors.harmony })}
            className="text-xs"
          >
            <option value="monochromatic">Monochromatic</option>
            <option value="complementary">Complementary</option>
            <option value="analogous">Analogous</option>
            <option value="triadic">Triadic</option>
            <option value="split-complementary">Split Complementary</option>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-700">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Typography Editor
// ============================================================================

const COMMON_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Georgia', 'Times New Roman',
  'Source Sans Pro', 'Nunito', 'Raleway', 'Oswald', 'PT Sans',
];

const TypographyEditor: React.FC<BaseEditorProps> = ({ dna, onSave, onCancel }) => {
  const [typography, setTypography] = useState(dna.typography);

  const handleSave = () => {
    onSave({ ...dna, typography });
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/30 space-y-4">
      <h4 className="text-sm font-medium text-white flex items-center gap-2">
        <span>Aa</span> Edit Typography
      </h4>

      {/* Heading Font */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Heading Font</label>
          <Select
            value={typography.headingFont.family}
            onChange={(e) => setTypography({
              ...typography,
              headingFont: { ...typography.headingFont, family: e.target.value }
            })}
            className="text-xs"
          >
            {COMMON_FONTS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Heading Weight</label>
          <Select
            value={typography.headingFont.weight.toString()}
            onChange={(e) => setTypography({
              ...typography,
              headingFont: { ...typography.headingFont, weight: parseInt(e.target.value) }
            })}
            className="text-xs"
          >
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semibold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extrabold (800)</option>
          </Select>
        </div>
      </div>

      {/* Body Font */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Body Font</label>
          <Select
            value={typography.bodyFont.family}
            onChange={(e) => setTypography({
              ...typography,
              bodyFont: { ...typography.bodyFont, family: e.target.value }
            })}
            className="text-xs"
          >
            {COMMON_FONTS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Body Weight</label>
          <Select
            value={typography.bodyFont.weight.toString()}
            onChange={(e) => setTypography({
              ...typography,
              bodyFont: { ...typography.bodyFont, weight: parseInt(e.target.value) }
            })}
            className="text-xs"
          >
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
          </Select>
        </div>
      </div>

      {/* Scale & Size */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Scale Ratio</label>
          <Select
            value={typography.scaleRatio.toString()}
            onChange={(e) => setTypography({ ...typography, scaleRatio: parseFloat(e.target.value) })}
            className="text-xs"
          >
            <option value="1.125">Minor Second (1.125)</option>
            <option value="1.2">Minor Third (1.2)</option>
            <option value="1.25">Major Third (1.25)</option>
            <option value="1.333">Perfect Fourth (1.333)</option>
            <option value="1.5">Perfect Fifth (1.5)</option>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Base Size</label>
          <Input
            value={typography.baseSize}
            onChange={(e) => setTypography({ ...typography, baseSize: e.target.value })}
            className="text-xs bg-gray-800 border-gray-600"
            placeholder="16px"
          />
        </div>
      </div>

      {/* Heading Style */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Heading Case</label>
          <Select
            value={typography.headingCase}
            onChange={(e) => setTypography({ ...typography, headingCase: e.target.value as typeof typography.headingCase })}
            className="text-xs"
          >
            <option value="none">Normal</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="capitalize">Capitalize</option>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Link Style</label>
          <Select
            value={typography.linkStyle}
            onChange={(e) => setTypography({ ...typography, linkStyle: e.target.value as typeof typography.linkStyle })}
            className="text-xs"
          >
            <option value="underline">Underline</option>
            <option value="color-only">Color Only</option>
            <option value="animated-underline">Animated Underline</option>
            <option value="highlight">Highlight</option>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-700">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Shapes Editor
// ============================================================================

const ShapesEditor: React.FC<BaseEditorProps> = ({ dna, onSave, onCancel }) => {
  const [shapes, setShapes] = useState(dna.shapes);
  const [effects, setEffects] = useState(dna.effects);

  const handleSave = () => {
    onSave({ ...dna, shapes, effects });
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/30 space-y-4">
      <h4 className="text-sm font-medium text-white flex items-center gap-2">
        <span>&#9632;</span> Edit Shapes & Effects
      </h4>

      {/* Border Radius */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Corner Style</label>
          <Select
            value={shapes.borderRadius.style}
            onChange={(e) => setShapes({
              ...shapes,
              borderRadius: { ...shapes.borderRadius, style: e.target.value as typeof shapes.borderRadius.style }
            })}
            className="text-xs"
          >
            <option value="sharp">Sharp</option>
            <option value="subtle">Subtle</option>
            <option value="rounded">Rounded</option>
            <option value="pill">Pill</option>
            <option value="mixed">Mixed</option>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Button Style</label>
          <Select
            value={shapes.buttonStyle}
            onChange={(e) => setShapes({ ...shapes, buttonStyle: e.target.value as typeof shapes.buttonStyle })}
            className="text-xs"
          >
            <option value="sharp">Sharp</option>
            <option value="soft">Soft</option>
            <option value="rounded">Rounded</option>
            <option value="pill">Pill</option>
          </Select>
        </div>
      </div>

      {/* Card & Input Style */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Card Style</label>
          <Select
            value={shapes.cardStyle}
            onChange={(e) => setShapes({ ...shapes, cardStyle: e.target.value as typeof shapes.cardStyle })}
            className="text-xs"
          >
            <option value="flat">Flat</option>
            <option value="subtle-shadow">Subtle Shadow</option>
            <option value="elevated">Elevated</option>
            <option value="bordered">Bordered</option>
            <option value="glass">Glass</option>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Input Style</label>
          <Select
            value={shapes.inputStyle}
            onChange={(e) => setShapes({ ...shapes, inputStyle: e.target.value as typeof shapes.inputStyle })}
            className="text-xs"
          >
            <option value="minimal">Minimal</option>
            <option value="bordered">Bordered</option>
            <option value="filled">Filled</option>
            <option value="underlined">Underlined</option>
          </Select>
        </div>
      </div>

      {/* Shadow Style */}
      <div className="pt-3 border-t border-gray-700">
        <label className="text-xs text-gray-400 mb-1 block">Shadow Intensity</label>
        <Select
          value={effects.shadows.style}
          onChange={(e) => setEffects({
            ...effects,
            shadows: { ...effects.shadows, style: e.target.value as typeof effects.shadows.style }
          })}
          className="text-xs"
        >
          <option value="none">None</option>
          <option value="subtle">Subtle</option>
          <option value="medium">Medium</option>
          <option value="dramatic">Dramatic</option>
          <option value="colored">Colored</option>
        </Select>
      </div>

      {/* Gradient Usage */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Gradient Usage</label>
        <Select
          value={effects.gradients.usage}
          onChange={(e) => setEffects({
            ...effects,
            gradients: { ...effects.gradients, usage: e.target.value as typeof effects.gradients.usage }
          })}
          className="text-xs"
        >
          <option value="none">None</option>
          <option value="subtle">Subtle</option>
          <option value="prominent">Prominent</option>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-700">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Personality Editor
// ============================================================================

const PersonalitySlider: React.FC<{
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  color: string;
  lowLabel: string;
  highLabel: string;
}> = ({ label, value, onChange, color, lowLabel, highLabel }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-300">{value}/5</span>
    </div>
    <input
      type="range"
      min="1"
      max="5"
      step="1"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
      className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${color}-500`}
      style={{ accentColor: color === 'blue' ? '#3b82f6' : color === 'yellow' ? '#eab308' : '#f97316' }}
    />
    <div className="flex justify-between text-xs text-gray-500">
      <span>{lowLabel}</span>
      <span>{highLabel}</span>
    </div>
  </div>
);

const PersonalityEditor: React.FC<BaseEditorProps> = ({ dna, onSave, onCancel }) => {
  const [personality, setPersonality] = useState(dna.personality);

  const handleSave = () => {
    onSave({ ...dna, personality });
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/30 space-y-4">
      <h4 className="text-sm font-medium text-white flex items-center gap-2">
        <span>&#10024;</span> Edit Brand Personality
      </h4>

      {/* Overall Personality */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Overall Vibe</label>
        <Select
          value={personality.overall}
          onChange={(e) => setPersonality({ ...personality, overall: e.target.value as typeof personality.overall })}
          className="text-xs"
        >
          <option value="corporate">Corporate</option>
          <option value="creative">Creative</option>
          <option value="luxurious">Luxurious</option>
          <option value="friendly">Friendly</option>
          <option value="bold">Bold</option>
          <option value="minimal">Minimal</option>
          <option value="elegant">Elegant</option>
          <option value="playful">Playful</option>
        </Select>
      </div>

      {/* Personality Sliders */}
      <div className="space-y-4 pt-3 border-t border-gray-700">
        <PersonalitySlider
          label="Formality"
          value={personality.formality}
          onChange={(v) => setPersonality({ ...personality, formality: v })}
          color="blue"
          lowLabel="Casual"
          highLabel="Formal"
        />
        <PersonalitySlider
          label="Energy"
          value={personality.energy}
          onChange={(v) => setPersonality({ ...personality, energy: v })}
          color="yellow"
          lowLabel="Calm"
          highLabel="Energetic"
        />
        <PersonalitySlider
          label="Warmth"
          value={personality.warmth}
          onChange={(v) => setPersonality({ ...personality, warmth: v })}
          color="orange"
          lowLabel="Cool"
          highLabel="Warm"
        />
      </div>

      {/* Trust Signals */}
      <div className="pt-3 border-t border-gray-700">
        <label className="text-xs text-gray-400 mb-1 block">Trust Signals</label>
        <Select
          value={personality.trustSignals}
          onChange={(e) => setPersonality({ ...personality, trustSignals: e.target.value as typeof personality.trustSignals })}
          className="text-xs"
        >
          <option value="minimal">Minimal</option>
          <option value="moderate">Moderate</option>
          <option value="prominent">Prominent</option>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-700">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Export - Combined Editors
// ============================================================================

export const DesignDNAEditors: React.FC<DesignDNAEditorsProps> = ({
  dna,
  editingSection,
  onSave,
  onCancel,
}) => {
  if (!editingSection) return null;

  const editorProps = { dna, onSave, onCancel };

  switch (editingSection) {
    case 'colors':
      return <ColorsEditor {...editorProps} />;
    case 'typography':
      return <TypographyEditor {...editorProps} />;
    case 'shapes':
      return <ShapesEditor {...editorProps} />;
    case 'personality':
      return <PersonalityEditor {...editorProps} />;
    default:
      return null;
  }
};

export { ColorsEditor, TypographyEditor, ShapesEditor, PersonalityEditor };
