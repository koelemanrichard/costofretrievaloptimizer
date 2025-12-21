// components/insights/widgets/TrendChart.tsx
// Sparkline and trend chart components

import React from 'react';
import type { TrendDirection, TrendDataPoint } from '../../../types/insights';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#3b82f6',
  width = 100,
  height = 30,
  className = '',
}) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

interface TrendIndicatorProps {
  trend: TrendDirection;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend,
  size = 'md',
  showPercentage = true,
  className = '',
}) => {
  const sizeConfig = {
    sm: { icon: 'w-3 h-3', text: 'text-xs' },
    md: { icon: 'w-4 h-4', text: 'text-sm' },
    lg: { icon: 'w-5 h-5', text: 'text-base' },
  };

  const config = sizeConfig[size];

  const colors = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-gray-400',
  };

  const icons = {
    up: (
      <svg className={config.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    ),
    down: (
      <svg className={config.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    ),
    stable: (
      <svg className={config.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <div className={`inline-flex items-center gap-1 ${colors[trend.direction]} ${className}`}>
      {icons[trend.direction]}
      {showPercentage && (
        <span className={config.text}>
          {trend.direction === 'stable' ? '0%' : `${trend.direction === 'up' ? '+' : ''}${trend.percentChange}%`}
        </span>
      )}
    </div>
  );
};

interface TrendChartProps {
  data: TrendDataPoint[];
  dataKeys: Array<{ key: keyof TrendDataPoint; label: string; color: string }>;
  height?: number;
  className?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  dataKeys,
  height = 150,
  className = '',
}) => {
  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-gray-500 ${className}`} style={{ height }}>
        Not enough data for trend chart
      </div>
    );
  }

  const width = 400;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get all values to calculate global min/max
  const allValues = dataKeys.flatMap(dk =>
    data.map(d => d[dk.key] as number).filter(v => typeof v === 'number')
  );
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const getPath = (key: keyof TrendDataPoint): string => {
    const values = data.map(d => d[key] as number);
    return values.map((value, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className={className}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = padding.top + (1 - pct / 100) * chartHeight;
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#374151"
                strokeDasharray="4"
              />
              <text
                x={padding.left - 5}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="fill-gray-500 text-xs"
              >
                {Math.round(min + (pct / 100) * range)}
              </text>
            </g>
          );
        })}

        {/* Data lines */}
        {dataKeys.map(dk => (
          <path
            key={dk.key}
            d={getPath(dk.key)}
            fill="none"
            stroke={dk.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* X-axis labels (first, middle, last) */}
        {[0, Math.floor(data.length / 2), data.length - 1].map(index => {
          const x = padding.left + (index / (data.length - 1)) * chartWidth;
          const date = new Date(data[index].date);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return (
            <text
              key={index}
              x={x}
              y={height - 5}
              textAnchor="middle"
              className="fill-gray-500 text-xs"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 justify-center">
        {dataKeys.map(dk => (
          <div key={dk.key} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dk.color }} />
            <span className="text-xs text-gray-400">{dk.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
