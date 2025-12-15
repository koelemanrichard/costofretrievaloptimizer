/**
 * AuditScoreGauge
 *
 * Gauge/radial chart for displaying quality scores
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '../../../types/reports';

interface AuditScoreGaugeProps {
  score: number;
  maxScore?: number;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return CHART_COLORS.semantic.success;
  if (score >= 60) return CHART_COLORS.semantic.warning;
  return CHART_COLORS.semantic.error;
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
};

export const AuditScoreGauge: React.FC<AuditScoreGaugeProps> = ({
  score,
  maxScore = 100,
  title,
  size = 'md',
  showLabel = true
}) => {
  const normalizedScore = Math.min(Math.max(score, 0), maxScore);
  const percentage = (normalizedScore / maxScore) * 100;
  const scoreColor = getScoreColor(percentage);

  const sizeConfig = {
    sm: { width: 120, height: 80, innerRadius: 35, outerRadius: 45, fontSize: 'text-xl' },
    md: { width: 180, height: 120, innerRadius: 55, outerRadius: 70, fontSize: 'text-3xl' },
    lg: { width: 240, height: 160, innerRadius: 75, outerRadius: 95, fontSize: 'text-4xl' }
  };

  const config = sizeConfig[size];

  const data = [
    { name: 'Score', value: percentage },
    { name: 'Remaining', value: 100 - percentage }
  ];

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-1">{title}</h4>
      )}
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={config.innerRadius}
              outerRadius={config.outerRadius}
              paddingAngle={0}
              dataKey="value"
            >
              <Cell fill={scoreColor} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Score display */}
        <div
          className="absolute inset-x-0 flex flex-col items-center"
          style={{ bottom: '5px' }}
        >
          <span className={`font-bold ${config.fontSize}`} style={{ color: scoreColor }}>
            {Math.round(percentage)}%
          </span>
          {showLabel && (
            <span className="text-xs text-gray-500 mt-0.5">
              {getScoreLabel(percentage)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Simple progress bar alternative for inline use
 */
export const ScoreBar: React.FC<{
  score: number;
  maxScore?: number;
  label?: string;
  showPercentage?: boolean;
}> = ({ score, maxScore = 100, label, showPercentage = true }) => {
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  const scoreColor = getScoreColor(percentage);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          {showPercentage && (
            <span className="text-sm font-medium" style={{ color: scoreColor }}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: scoreColor
          }}
        />
      </div>
    </div>
  );
};

export default AuditScoreGauge;
