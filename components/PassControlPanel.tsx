// components/PassControlPanel.tsx
import React from 'react';
import { PassConfigMap, PassConfig } from '../types/contentGeneration';

interface Props {
  passes: PassConfigMap;
  onChange: (passes: PassConfigMap) => void;
  disabled?: boolean;
}

const PASS_INFO: Record<keyof PassConfigMap, { name: string; description: string }> = {
  pass_2_headers: { name: 'Header Optimization', description: 'Refine heading hierarchy and contextual overlap' },
  pass_3_lists: { name: 'Lists & Tables', description: 'Add structured data for featured snippets' },
  pass_4_discourse: { name: 'Discourse Integration', description: 'Add transitions and bridges' },
  pass_5_microsemantics: { name: 'Micro Semantics', description: 'Linguistic optimization and stop words' },
  pass_6_visuals: { name: 'Visual Semantics', description: 'Insert image placeholders with alt text' },
  pass_7_intro: { name: 'Introduction Synthesis', description: 'Rewrite introduction post-hoc' },
  pass_8_polish: { name: 'Final Polish', description: 'Publication-ready content refinement' },
  pass_9_audit: { name: 'Final Audit', description: 'Run algorithmic quality checks' }
};

// Default config when a pass isn't defined in the passes prop
const DEFAULT_PASS_CONFIG: PassConfig = { enabled: true, storeVersion: false };

export const PassControlPanel: React.FC<Props> = ({ passes, onChange, disabled = false }) => {
  const handleToggle = (passKey: keyof PassConfigMap, field: keyof PassConfig, value: boolean) => {
    const currentConfig = passes[passKey] || DEFAULT_PASS_CONFIG;
    onChange({
      ...passes,
      [passKey]: { ...currentConfig, [field]: value }
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <h4 className="text-xs font-semibold mb-2 text-gray-400 uppercase tracking-wide">Refinement Passes</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {(Object.keys(PASS_INFO) as Array<keyof PassConfigMap>).map(passKey => {
          const info = PASS_INFO[passKey];
          // Use default config if pass isn't defined in props
          const config = passes[passKey] || DEFAULT_PASS_CONFIG;
          return (
            <div key={passKey} className="flex items-center justify-between py-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => handleToggle(passKey, 'enabled', e.target.checked)}
                  disabled={disabled}
                  className="rounded bg-gray-700 border-gray-600 w-3.5 h-3.5"
                />
                <span className={`text-xs ${config.enabled ? 'text-gray-200' : 'text-gray-500'}`}>{info.name}</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer" title="Save version after this pass">
                <input
                  type="checkbox"
                  checked={config.storeVersion}
                  onChange={(e) => handleToggle(passKey, 'storeVersion', e.target.checked)}
                  disabled={disabled || !config.enabled}
                  className="rounded bg-gray-700 border-gray-600 w-3 h-3"
                />
                <span className="text-[10px] text-gray-500">v</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PassControlPanel;
