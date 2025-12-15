// components/BrandKitEditor.tsx
import React from 'react';
import { BrandKit } from '../types';
import { DEFAULT_HERO_TEMPLATES, DEFAULT_MARKUPGO_TEMPLATE_ID } from '../config/imageTemplates';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { InfoTooltip } from './ui/InfoTooltip';

interface BrandKitEditorProps {
  brandKit: BrandKit | undefined;
  onChange: (brandKit: BrandKit) => void;
}

const defaultBrandKit: BrandKit = {
  logoPlacement: 'bottom-right',
  logoOpacity: 0.3,
  colors: {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    textOnImage: '#FFFFFF',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  copyright: {
    holder: '',
  },
  heroTemplates: DEFAULT_HERO_TEMPLATES,
};

export const BrandKitEditor: React.FC<BrandKitEditorProps> = ({ brandKit, onChange }) => {
  const kit = brandKit || defaultBrandKit;

  const updateKit = (updates: Partial<BrandKit>) => {
    onChange({ ...kit, ...updates });
  };

  const updateColors = (colorUpdates: Partial<BrandKit['colors']>) => {
    onChange({ ...kit, colors: { ...kit.colors, ...colorUpdates } });
  };

  const updateCopyright = (copyrightUpdates: Partial<BrandKit['copyright']>) => {
    onChange({ ...kit, copyright: { ...kit.copyright, ...copyrightUpdates } });
  };

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
      <h3 className="text-lg font-semibold text-amber-400 flex items-center mb-4">
        Brand Kit
        <InfoTooltip text="Configure your brand assets for consistent image generation. Logo, colors, and text styles will be applied to generated images." />
      </h3>

      <div className="space-y-4">
        {/* Logo Section */}
        <div>
          <Label>Logo URL</Label>
          <Input
            value={kit.logo?.url || ''}
            onChange={(e) => updateKit({ logo: { url: e.target.value } })}
            placeholder="https://... (Cloudinary or direct URL)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Logo Position</Label>
            <Select
              value={kit.logoPlacement}
              onChange={(e) => updateKit({ logoPlacement: e.target.value as BrandKit['logoPlacement'] })}
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </Select>
          </div>
          <div>
            <Label>Logo Opacity</Label>
            <Input
              type="number"
              min="0.1"
              max="1"
              step="0.1"
              value={kit.logoOpacity}
              onChange={(e) => updateKit({ logoOpacity: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        {/* Colors Section */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={kit.colors.primary}
                onChange={(e) => updateColors({ primary: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={kit.colors.primary}
                onChange={(e) => updateColors({ primary: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={kit.colors.secondary}
                onChange={(e) => updateColors({ secondary: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={kit.colors.secondary}
                onChange={(e) => updateColors({ secondary: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Text on Image</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={kit.colors.textOnImage}
                onChange={(e) => updateColors({ textOnImage: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={kit.colors.textOnImage}
                onChange={(e) => updateColors({ textOnImage: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* MarkupGo Template Section */}
        <div>
          <Label className="flex items-center gap-1">
            MarkupGo Default Template ID
            <InfoTooltip text="Default template ID for hero images generated with MarkupGo. You can override this per image when generating." />
          </Label>
          <Input
            value={kit.markupGoDefaultTemplateId || ''}
            onChange={(e) => updateKit({ markupGoDefaultTemplateId: e.target.value || undefined })}
            placeholder={DEFAULT_MARKUPGO_TEMPLATE_ID}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use default: {DEFAULT_MARKUPGO_TEMPLATE_ID}
          </p>
        </div>

        {/* Copyright Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Copyright Holder</Label>
            <Input
              value={kit.copyright.holder}
              onChange={(e) => updateCopyright({ holder: e.target.value })}
              placeholder="e.g., Kjenmarks SEO"
            />
          </div>
          <div>
            <Label>License URL (optional)</Label>
            <Input
              value={kit.copyright.licenseUrl || ''}
              onChange={(e) => updateCopyright({ licenseUrl: e.target.value })}
              placeholder="https://yoursite.com/license"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandKitEditor;
