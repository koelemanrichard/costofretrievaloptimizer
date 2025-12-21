// components/insights/widgets/MetricCard.tsx
// Metric cards with trends and tooltips

import React, { useState } from 'react';
import type { MetricCard as MetricCardType, TrendDirection } from '../../../types/insights';
import { TrendIndicator } from './TrendChart';

interface MetricCardProps {
  metric: MetricCardType;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onClick,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorConfig = {
    green: { bg: 'from-green-900/40 to-green-800/20', border: 'border-green-700', text: 'text-green-300' },
    yellow: { bg: 'from-yellow-900/40 to-yellow-800/20', border: 'border-yellow-700', text: 'text-yellow-300' },
    orange: { bg: 'from-orange-900/40 to-orange-800/20', border: 'border-orange-700', text: 'text-orange-300' },
    red: { bg: 'from-red-900/40 to-red-800/20', border: 'border-red-700', text: 'text-red-300' },
    blue: { bg: 'from-blue-900/40 to-blue-800/20', border: 'border-blue-700', text: 'text-blue-300' },
    gray: { bg: 'from-gray-900/40 to-gray-800/20', border: 'border-gray-700', text: 'text-gray-300' },
  };

  const colors = colorConfig[metric.color];

  return (
    <div
      className={`relative p-4 rounded-lg border bg-gradient-to-br ${colors.bg} ${colors.border}
        ${onClick ? 'cursor-pointer hover:border-opacity-80 transition-colors' : ''} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold text-white">
            {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
          </div>
          <div className={`text-sm ${colors.text}`}>{metric.label}</div>
          <div className="text-xs text-gray-500 mt-1">{metric.description}</div>
        </div>
        {metric.trend && (
          <TrendIndicator trend={metric.trend} size="md" />
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && metric.tooltipExplanation && (
        <div className="absolute z-10 bottom-full left-0 mb-2 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-xs">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4m0-4h.01" />
            </svg>
            <div className="text-sm text-gray-300">{metric.tooltipExplanation}</div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricGridProps {
  metrics: MetricCardType[];
  columns?: 2 | 3 | 4;
  onMetricClick?: (metric: MetricCardType) => void;
  className?: string;
}

export const MetricGrid: React.FC<MetricGridProps> = ({
  metrics,
  columns = 4,
  onMetricClick,
  className = '',
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]} ${className}`}>
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.label + index}
          metric={metric}
          onClick={onMetricClick ? () => onMetricClick(metric) : undefined}
        />
      ))}
    </div>
  );
};
