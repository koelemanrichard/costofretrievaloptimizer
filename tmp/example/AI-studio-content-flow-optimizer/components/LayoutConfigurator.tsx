import React from 'react';
import { LayoutConfig } from '../types';
import { 
  Layout, 
  AlignLeft, 
  AlignRight, 
  Megaphone, 
  ListChecks, 
  HelpCircle,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Star,
  GitMerge,
  Award
} from 'lucide-react';

interface LayoutConfiguratorProps {
  config: LayoutConfig;
  onChange: (config: LayoutConfig) => void;
}

const LayoutConfigurator: React.FC<LayoutConfiguratorProps> = ({ config, onChange }) => {
  
  const toggle = (key: keyof LayoutConfig) => {
    // @ts-ignore - simple boolean toggle
    onChange({ ...config, [key]: !config[key] });
  };

  const update = (key: keyof LayoutConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const ToggleButton = ({ 
    active, 
    onClick, 
    icon: Icon, 
    label 
  }: { 
    active: boolean; 
    onClick: () => void; 
    icon: any; 
    label: string 
  }) => (
    <button
      onClick={onClick}
      className={`px-3 py-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 shadow-sm ${
        active 
          ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-500' 
          : 'border-gray-200 hover:bg-gray-50 text-gray-500'
      }`}
    >
      <div className="flex items-center justify-between w-full mb-1">
        <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-gray-400'}`} />
        {active && <div className="w-2 h-2 rounded-full bg-brand-500"></div>}
      </div>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-8">
      <div className="flex items-center space-x-2 border-b border-gray-100 pb-4">
        <Layout className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Page Blueprint</h3>
      </div>

      <div className="space-y-6">
        
        {/* Table of Contents Configuration */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Navigation</label>
          <div className="flex gap-2">
            <button
               onClick={() => update('showTOC', !config.showTOC)}
               className={`p-2 rounded-lg border flex items-center gap-2 text-sm transition-colors ${
                 !config.showTOC ? 'bg-gray-50 text-gray-400' : 'bg-white border-brand-500 text-brand-700 shadow-sm'
               }`}
            >
               {config.showTOC ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
               {config.showTOC ? 'On' : 'Off'}
            </button>
            
            {config.showTOC && (
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => update('tocPosition', 'left')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                    config.tocPosition === 'left' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <AlignLeft className="w-3 h-3" /> Left
                </button>
                <button 
                  onClick={() => update('tocPosition', 'right')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                    config.tocPosition === 'right' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Right <AlignRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Element Toggles */}
        <div>
           <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Content Blocks</label>
           <div className="grid grid-cols-3 gap-3">
             <ToggleButton 
               active={config.showHero} 
               onClick={() => toggle('showHero')} 
               icon={ImageIcon} 
               label="Hero Image" 
             />
             <ToggleButton 
               active={config.showKeyTakeaways} 
               onClick={() => toggle('showKeyTakeaways')} 
               icon={ListChecks} 
               label="Key Points" 
             />
             <ToggleButton 
               active={config.showBenefits} 
               onClick={() => toggle('showBenefits')} 
               icon={Award} 
               label="Benefits" 
             />
             <ToggleButton 
               active={config.showProcess} 
               onClick={() => toggle('showProcess')} 
               icon={GitMerge} 
               label="Process Steps" 
             />
             <ToggleButton 
               active={config.showTestimonials} 
               onClick={() => toggle('showTestimonials')} 
               icon={Star} 
               label="Reviews" 
             />
             <ToggleButton 
               active={config.showFAQ} 
               onClick={() => toggle('showFAQ')} 
               icon={HelpCircle} 
               label="FAQ" 
             />
           </div>
        </div>

        {/* CTA Configuration */}
        <div>
           <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center">
             <Megaphone className="w-4 h-4 mr-2" /> Call to Action Logic
           </label>
           <div className="grid grid-cols-4 gap-2">
              {['none', 'low', 'medium', 'high'].map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => update('ctaIntensity', intensity)}
                  className={`py-2 text-xs font-medium border rounded-lg capitalize transition-all ${
                    config.ctaIntensity === intensity 
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md' 
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {intensity}
                </button>
              ))}
           </div>
           <p className="text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
             {config.ctaIntensity === 'high' 
               ? 'Frequent: Between every 2 text sections.' 
               : config.ctaIntensity === 'medium'
               ? 'Balanced: Middle of content & end.'
               : config.ctaIntensity === 'low' 
               ? 'Minimal: Bottom of page only.' 
               : 'Hidden: No buttons.'}
           </p>
        </div>

      </div>
    </div>
  );
};

export default LayoutConfigurator;