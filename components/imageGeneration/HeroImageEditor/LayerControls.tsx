/**
 * Layer Controls Component
 *
 * Controls for editing the selected layer's properties:
 * position, size, opacity, and type-specific settings.
 */

import React from 'react';
import {
  HeroLayerConfig,
  BackgroundLayerConfig,
  CentralObjectLayerConfig,
  TextOverlayLayerConfig,
  LogoLayerConfig,
  LayerPosition
} from '../../../types';
import {
  fontFamilyPresets,
  fontSizePresets,
  fontWeightPresets,
  textColorPresets,
  textBackgroundPresets
} from '../../../config/heroImageDefaults';

// ============================================
// TYPES
// ============================================

interface LayerControlsProps {
  layer: HeroLayerConfig | null;
  onUpdateLayer: (updates: Partial<HeroLayerConfig>) => void;
  onUpdatePosition: (position: Partial<LayerPosition>) => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const LayerControls: React.FC<LayerControlsProps> = ({
  layer,
  onUpdateLayer,
  onUpdatePosition,
  className = ''
}) => {
  if (!layer) {
    return (
      <div className={`text-center py-2 ${className}`}>
        <p className="text-gray-400 text-sm">
          Select a layer to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
        {/* Common Controls */}
        <CommonControls
          layer={layer}
          onUpdateLayer={onUpdateLayer}
          onUpdatePosition={onUpdatePosition}
        />

        {/* Type-Specific Controls */}
        {layer.type === 'background' && (
          <BackgroundControls
            layer={layer as BackgroundLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
        {layer.type === 'centralObject' && (
          <CentralObjectControls
            layer={layer as CentralObjectLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
        {layer.type === 'textOverlay' && (
          <TextOverlayControls
            layer={layer as TextOverlayLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
        {layer.type === 'logo' && (
          <LogoControls
            layer={layer as LogoLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
    </div>
  );
};

// ============================================
// COMMON CONTROLS
// ============================================

interface CommonControlsProps {
  layer: HeroLayerConfig;
  onUpdateLayer: (updates: Partial<HeroLayerConfig>) => void;
  onUpdatePosition: (position: Partial<LayerPosition>) => void;
}

const CommonControls: React.FC<CommonControlsProps> = ({
  layer,
  onUpdateLayer,
  onUpdatePosition
}) => {
  return (
    <>
      {/* Position */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-300">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400">X (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.x)}
              onChange={(e) => onUpdatePosition({ x: parseFloat(e.target.value) || 0 })}
              min={0}
              max={100}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Y (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.y)}
              onChange={(e) => onUpdatePosition({ y: parseFloat(e.target.value) || 0 })}
              min={0}
              max={100}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-300">Size</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400">Width (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.width)}
              onChange={(e) => onUpdatePosition({ width: parseFloat(e.target.value) || 10 })}
              min={5}
              max={100}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Height (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.height)}
              onChange={(e) => onUpdatePosition({ height: parseFloat(e.target.value) || 10 })}
              min={5}
              max={100}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-300">
          Opacity: {layer.opacity}%
        </label>
        <input
          type="range"
          value={layer.opacity}
          onChange={(e) => onUpdateLayer({ opacity: parseInt(e.target.value) })}
          min={0}
          max={100}
          className="w-full"
        />
      </div>

      {/* Layer Name */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-300">Layer Name</label>
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdateLayer({ name: e.target.value })}
          placeholder="Layer name"
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>
    </>
  );
};

// ============================================
// BACKGROUND CONTROLS
// ============================================

interface BackgroundControlsProps {
  layer: BackgroundLayerConfig;
  onUpdateLayer: (updates: Partial<BackgroundLayerConfig>) => void;
}

const BackgroundControls: React.FC<BackgroundControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateLayer({ imageUrl: reader.result as string, source: 'user-upload' });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-gray-700">
      <label className="text-xs font-medium text-gray-300">Background</label>

      {/* Instructions */}
      <div className="p-2 bg-blue-900/30 border border-blue-700/50 rounded text-xs text-blue-300">
        <strong>Background options:</strong> Use an AI-generated background, upload your own image, or use a solid color.
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">Source</label>
        <select
          value={layer.source}
          onChange={(e) => onUpdateLayer({ source: e.target.value as BackgroundLayerConfig['source'] })}
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
        >
          <option value="ai-generated">AI Generated</option>
          <option value="user-upload">Upload Image</option>
          <option value="color">Solid Color</option>
        </select>
      </div>

      {layer.source === 'ai-generated' && (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">AI Prompt</label>
          <textarea
            value={layer.aiPrompt || ''}
            onChange={(e) => onUpdateLayer({ aiPrompt: e.target.value })}
            placeholder="Describe the background..."
            rows={3}
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
          />
          <select
            value={layer.aiProvider || 'gemini'}
            onChange={(e) => onUpdateLayer({ aiProvider: e.target.value as 'gemini' | 'dalle' })}
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value="gemini">Gemini</option>
            <option value="dalle">DALL-E</option>
          </select>
        </div>
      )}

      {layer.source === 'user-upload' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {layer.imageUrl ? 'Change Background' : 'Upload Background Image'}
          </button>
          {layer.imageUrl && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-16 h-10 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                <img src={layer.imageUrl} alt="Background preview" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs text-green-400">Background loaded</span>
            </div>
          )}
          <p className="text-xs text-gray-500">Or paste an image URL:</p>
          <input
            type="text"
            value={layer.imageUrl || ''}
            onChange={(e) => onUpdateLayer({ imageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
          />
        </div>
      )}

      {layer.source === 'color' && (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer.backgroundColor || '#374151'}
              onChange={(e) => onUpdateLayer({ backgroundColor: e.target.value })}
              className="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={layer.backgroundColor || '#374151'}
              onChange={(e) => onUpdateLayer({ backgroundColor: e.target.value })}
              placeholder="#374151"
              className="flex-1 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 font-mono"
            />
          </div>
          {/* Color presets */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Quick colors:</label>
            <div className="flex gap-1 flex-wrap">
              {[
                { color: '#1a1a2e', name: 'Dark Navy' },
                { color: '#16213e', name: 'Deep Blue' },
                { color: '#0f3460', name: 'Ocean' },
                { color: '#374151', name: 'Gray' },
                { color: '#1f2937', name: 'Dark Gray' },
                { color: '#111827', name: 'Near Black' },
                { color: '#7c3aed', name: 'Purple' },
                { color: '#2563eb', name: 'Blue' },
                { color: '#059669', name: 'Green' },
                { color: '#dc2626', name: 'Red' },
                { color: '#d97706', name: 'Amber' },
                { color: '#ffffff', name: 'White' },
              ].map(({ color, name }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdateLayer({ backgroundColor: color })}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    layer.backgroundColor === color
                      ? 'border-blue-500 scale-110'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// CENTRAL OBJECT CONTROLS
// ============================================

interface CentralObjectControlsProps {
  layer: CentralObjectLayerConfig;
  onUpdateLayer: (updates: Partial<CentralObjectLayerConfig>) => void;
}

const CentralObjectControls: React.FC<CentralObjectControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateLayer({ imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-gray-700">
      <label className="text-xs font-medium text-gray-300">Central Object</label>

      {/* Instructions */}
      <div className="p-2 bg-blue-900/30 border border-blue-700/50 rounded text-xs text-blue-300">
        <strong>How to add a central object:</strong> Upload an image of your main entity (product, person, logo). The object will be centered in the hero image.
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">Entity Name</label>
        <input
          type="text"
          value={layer.entityName}
          onChange={(e) => onUpdateLayer({ entityName: e.target.value })}
          placeholder="e.g., Product Name"
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
        <p className="text-xs text-gray-500">This name will be included in alt text for SEO.</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">Object Image</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {layer.imageUrl ? 'Change Image' : 'Upload Object Image'}
        </button>
        {layer.imageUrl && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
              <img src={layer.imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs text-green-400">Image loaded</span>
          </div>
        )}
        <p className="text-xs text-gray-500">Or paste an image URL:</p>
        <input
          type="text"
          value={layer.imageUrl || ''}
          onChange={(e) => onUpdateLayer({ imageUrl: e.target.value })}
          placeholder="https://..."
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      <div className="p-2 bg-indigo-900/30 border border-indigo-700/50 rounded text-xs text-indigo-300">
        Central object must remain centered and fully visible. Position is auto-enforced.
      </div>
    </div>
  );
};

// ============================================
// TEXT OVERLAY CONTROLS
// ============================================

interface TextOverlayControlsProps {
  layer: TextOverlayLayerConfig;
  onUpdateLayer: (updates: Partial<TextOverlayLayerConfig>) => void;
}

const TextOverlayControls: React.FC<TextOverlayControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-700">
      <label className="text-xs font-medium text-gray-300">Text Overlay</label>

      {/* Instructions */}
      <div className="p-2 bg-blue-900/30 border border-blue-700/50 rounded text-xs text-blue-300">
        <strong>How to add text:</strong> Type your H1 or headline below. Choose placement (top/bottom) and style it with font, size, and color options.
      </div>

      {/* Text Content */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Text Content</label>
        <textarea
          value={layer.text}
          onChange={(e) => onUpdateLayer({ text: e.target.value })}
          placeholder="Enter your headline text here..."
          rows={2}
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
        <p className="text-xs text-gray-500">Keep it short and impactful - this appears on your hero image.</p>
      </div>

      {/* Placement */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Placement</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdateLayer({ placement: 'top' })}
            className={`flex-1 px-2 py-1 text-sm rounded ${
              layer.placement === 'top'
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-gray-700 text-gray-300 border border-gray-600'
            }`}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => onUpdateLayer({ placement: 'bottom' })}
            className={`flex-1 px-2 py-1 text-sm rounded ${
              layer.placement === 'bottom'
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-gray-700 text-gray-300 border border-gray-600'
            }`}
          >
            Bottom
          </button>
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Font</label>
        <select
          value={layer.fontFamily}
          onChange={(e) => onUpdateLayer({ fontFamily: e.target.value })}
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
        >
          {fontFamilyPresets.map(font => (
            <option key={font.id} value={font.value}>{font.name}</option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Size</label>
        <select
          value={layer.fontSize}
          onChange={(e) => onUpdateLayer({ fontSize: parseInt(e.target.value) })}
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
        >
          {fontSizePresets.map(size => (
            <option key={size.id} value={size.value}>{size.name} ({size.value}px)</option>
          ))}
        </select>
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Weight</label>
        <select
          value={layer.fontWeight}
          onChange={(e) => onUpdateLayer({ fontWeight: parseInt(e.target.value) })}
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
        >
          {fontWeightPresets.map(weight => (
            <option key={weight.id} value={weight.value}>{weight.name}</option>
          ))}
        </select>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Text Color</label>
        <div className="flex gap-1 flex-wrap">
          {textColorPresets.map(color => (
            <button
              key={color.id}
              type="button"
              onClick={() => onUpdateLayer({ textColor: color.value })}
              className={`w-6 h-6 rounded border-2 ${
                layer.textColor === color.value ? 'border-blue-500' : 'border-gray-600'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Background</label>
        <select
          value={layer.backgroundColor}
          onChange={(e) => onUpdateLayer({ backgroundColor: e.target.value })}
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
        >
          {textBackgroundPresets.map(bg => (
            <option key={bg.id} value={bg.value}>{bg.name}</option>
          ))}
        </select>
      </div>

      {/* Text Align */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Alignment</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              type="button"
              onClick={() => onUpdateLayer({ textAlign: align })}
              className={`flex-1 px-2 py-1 text-sm rounded ${
                layer.textAlign === align
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// LOGO CONTROLS
// ============================================

interface LogoControlsProps {
  layer: LogoLayerConfig;
  onUpdateLayer: (updates: Partial<LogoLayerConfig>) => void;
}

const LogoControls: React.FC<LogoControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateLayer({ imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-gray-700">
      <label className="text-xs font-medium text-gray-300">Logo</label>

      {/* Instructions */}
      <div className="p-2 bg-blue-900/30 border border-blue-700/50 rounded text-xs text-blue-300">
        <strong>How to add a logo:</strong> Upload your company logo (PNG with transparency works best). Choose which corner it should appear in.
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">Logo Image</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-3 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {layer.imageUrl ? 'Change Logo' : 'Upload Logo'}
        </button>
        {layer.imageUrl && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
              <img src={layer.imageUrl} alt="Logo preview" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs text-green-400">Logo loaded</span>
          </div>
        )}
        <p className="text-xs text-gray-500">Or paste a logo URL:</p>
        <input
          type="text"
          value={layer.imageUrl || ''}
          onChange={(e) => onUpdateLayer({ imageUrl: e.target.value })}
          placeholder="https://..."
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">Corner Position</label>
        <div className="grid grid-cols-2 gap-2">
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(corner => (
            <button
              key={corner}
              type="button"
              onClick={() => onUpdateLayer({ cornerPosition: corner })}
              className={`px-2 py-1.5 text-xs rounded ${
                layer.cornerPosition === corner
                  ? 'bg-green-600 text-white border border-green-500'
                  : 'bg-gray-700 text-gray-300 border border-gray-600'
              }`}
            >
              {corner.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 bg-green-900/30 border border-green-700/50 rounded text-xs text-green-300">
        Logo will snap to the selected corner. Use opacity slider above to make it more subtle.
      </div>
    </div>
  );
};

export default LayerControls;
