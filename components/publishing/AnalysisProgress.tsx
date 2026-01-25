// components/publishing/AnalysisProgress.tsx
import React from 'react';

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  progress: number; // 0-100
  error?: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  steps,
  progress,
  error,
}) => {
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map(step => (
          <div key={step.id} className="flex items-center gap-2 text-sm">
            {step.status === 'complete' && (
              <span className="text-green-400">✓</span>
            )}
            {step.status === 'active' && (
              <span className="text-blue-400 animate-pulse">●</span>
            )}
            {step.status === 'pending' && (
              <span className="text-gray-500">○</span>
            )}
            {step.status === 'error' && (
              <span className="text-red-400">✕</span>
            )}
            <span className={
              step.status === 'complete' ? 'text-gray-300' :
              step.status === 'active' ? 'text-white' :
              step.status === 'error' ? 'text-red-400' :
              'text-gray-500'
            }>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};
