// components/insights/widgets/ScoreGauge.tsx
// Circular score gauge with grade indicator

import React from 'react';

interface ScoreGaugeProps {
  score: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showGrade?: boolean;
  className?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  grade,
  label,
  size = 'md',
  showGrade = true,
  className = '',
}) => {
  const sizeConfig = {
    sm: { width: 80, stroke: 6, fontSize: 'text-lg', gradeFontSize: 'text-xs' },
    md: { width: 120, stroke: 8, fontSize: 'text-2xl', gradeFontSize: 'text-sm' },
    lg: { width: 160, stroke: 10, fontSize: 'text-4xl', gradeFontSize: 'text-base' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 85) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10' };
    if (score >= 70) return { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    if (score >= 50) return { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const colors = getColor(score);

  const computedGrade = grade || (() => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  })();

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg
          width={config.width}
          height={config.width}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.fontSize} font-bold ${colors.text}`}>
            {Math.round(score)}
          </span>
          {showGrade && (
            <span className={`${config.gradeFontSize} font-medium text-gray-400`}>
              Grade: {computedGrade}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="mt-2 text-sm text-gray-400">{label}</span>
      )}
    </div>
  );
};
