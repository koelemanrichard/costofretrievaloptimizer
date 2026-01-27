import React from 'react';
import { DesignSystem } from '../types';
import { Palette, Type, BoxSelect } from 'lucide-react';

interface StyleConfiguratorProps {
  designSystem: DesignSystem;
  onChange: (ds: DesignSystem) => void;
}

const StyleConfigurator: React.FC<StyleConfiguratorProps> = ({ designSystem, onChange }) => {
  
  const update = (key: keyof DesignSystem, value: string) => {
    onChange({ ...designSystem, [key]: value });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center space-x-2 border-b border-gray-100 pb-4">
        <Palette className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Visual Identity Configuration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Brand Colors</label>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center">
              <input 
                type="color" 
                value={designSystem.primaryColor}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="w-12 h-12 rounded-full cursor-pointer border-2 border-gray-100 p-1"
              />
              <span className="text-xs text-gray-500 mt-1">Primary</span>
            </div>
            <div className="flex flex-col items-center">
              <input 
                type="color" 
                value={designSystem.secondaryColor}
                onChange={(e) => update('secondaryColor', e.target.value)}
                className="w-12 h-12 rounded-full cursor-pointer border-2 border-gray-100 p-1"
              />
              <span className="text-xs text-gray-500 mt-1">Accent</span>
            </div>
            <div className="flex flex-col items-center">
              <input 
                type="color" 
                value={designSystem.backgroundColor}
                onChange={(e) => update('backgroundColor', e.target.value)}
                className="w-12 h-12 rounded-full cursor-pointer border-2 border-gray-100 p-1"
              />
              <span className="text-xs text-gray-500 mt-1">Background</span>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <Type className="w-4 h-4 mr-2" /> Typography
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['sans', 'serif', 'mono'].map((font) => (
              <button
                key={font}
                onClick={() => update('fontFamily', font)}
                className={`px-3 py-2 text-sm border rounded-lg capitalize ${
                  designSystem.fontFamily === font 
                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {font}
              </button>
            ))}
          </div>
        </div>

        {/* Shapes */}
        <div className="space-y-4">
           <label className="block text-sm font-medium text-gray-700 flex items-center">
            <BoxSelect className="w-4 h-4 mr-2" /> Shapes
          </label>
           <div className="grid grid-cols-4 gap-2">
            {['none', 'small', 'large', 'full'].map((radius) => (
              <button
                key={radius}
                onClick={() => update('borderRadius', radius)}
                className={`px-2 py-2 text-xs border rounded-lg capitalize ${
                  designSystem.borderRadius === radius 
                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {radius}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div className="space-y-4">
           <label className="block text-sm font-medium text-gray-700">Vibe Description</label>
           <input 
             type="text" 
             value={designSystem.mood}
             onChange={(e) => update('mood', e.target.value)}
             className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
           />
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Live Preview</label>
        <div 
          className="p-6 border shadow-sm transition-all duration-300"
          style={{
            backgroundColor: designSystem.backgroundColor,
            borderColor: designSystem.primaryColor + '40', // 25% opacity
            borderRadius: designSystem.borderRadius === 'full' ? '1.5rem' : 
                          designSystem.borderRadius === 'large' ? '0.75rem' :
                          designSystem.borderRadius === 'small' ? '0.25rem' : '0'
          }}
        >
          <div className={`
             ${designSystem.fontFamily === 'serif' ? 'font-serif' : designSystem.fontFamily === 'mono' ? 'font-mono' : 'font-sans'}
          `}>
             <h4 className="text-xl font-bold mb-2" style={{ color: designSystem.secondaryColor }}>Example Heading</h4>
             <p className="text-gray-600 mb-4 text-sm leading-relaxed">
               This is how your content will look. The AI will apply these style rules to all generated sections.
             </p>
             <button 
               className="text-white px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
               style={{ 
                 backgroundColor: designSystem.primaryColor,
                 borderRadius: designSystem.borderRadius === 'full' ? '9999px' : 
                               designSystem.borderRadius === 'large' ? '0.5rem' :
                               designSystem.borderRadius === 'small' ? '0.25rem' : '0'
               }}
             >
               Call to Action
             </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StyleConfigurator;