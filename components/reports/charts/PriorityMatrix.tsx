/**
 * PriorityMatrix
 *
 * Impact vs Effort matrix for task prioritization
 */

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { PriorityMatrixItem, CHART_COLORS, DECISION_COLORS } from '../../../types/reports';
import { ActionType } from '../../../types';

interface PriorityMatrixProps {
  data: PriorityMatrixItem[];
  title?: string;
  height?: number;
  showQuadrants?: boolean;
}

const getQuadrant = (impact: number, effort: number): string => {
  if (impact >= 50 && effort < 50) return 'Quick Wins';
  if (impact >= 50 && effort >= 50) return 'Major Projects';
  if (impact < 50 && effort < 50) return 'Fill-Ins';
  return 'Time Sinks';
};

const getQuadrantColor = (quadrant: string): string => {
  switch (quadrant) {
    case 'Quick Wins':
      return CHART_COLORS.semantic.success;
    case 'Major Projects':
      return CHART_COLORS.semantic.info;
    case 'Fill-Ins':
      return CHART_COLORS.semantic.warning;
    case 'Time Sinks':
      return CHART_COLORS.semantic.error;
    default:
      return CHART_COLORS.semantic.neutral;
  }
};

export const PriorityMatrix: React.FC<PriorityMatrixProps> = ({
  data,
  title,
  height = 400,
  showQuadrants = true
}) => {
  // Transform data for scatter chart
  const chartData = data.map(item => ({
    ...item,
    x: item.effort,
    y: item.impact,
    quadrant: getQuadrant(item.impact, item.effort)
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <p className="font-medium text-gray-900 truncate">{item.label}</p>
          <div className="mt-1 space-y-0.5 text-sm text-gray-600">
            <p>Impact: {item.impact}%</p>
            <p>Effort: {item.effort}%</p>
            <p className="font-medium" style={{ color: getQuadrantColor(item.quadrant) }}>
              {item.quadrant}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />

          {/* Quadrant backgrounds */}
          {showQuadrants && (
            <>
              {/* Quick Wins (high impact, low effort) */}
              <ReferenceArea
                x1={0}
                x2={50}
                y1={50}
                y2={100}
                fill={CHART_COLORS.semantic.success}
                fillOpacity={0.1}
              />
              {/* Major Projects (high impact, high effort) */}
              <ReferenceArea
                x1={50}
                x2={100}
                y1={50}
                y2={100}
                fill={CHART_COLORS.semantic.info}
                fillOpacity={0.1}
              />
              {/* Fill-Ins (low impact, low effort) */}
              <ReferenceArea
                x1={0}
                x2={50}
                y1={0}
                y2={50}
                fill={CHART_COLORS.semantic.warning}
                fillOpacity={0.1}
              />
              {/* Time Sinks (low impact, high effort) */}
              <ReferenceArea
                x1={50}
                x2={100}
                y1={0}
                y2={50}
                fill={CHART_COLORS.semantic.error}
                fillOpacity={0.1}
              />
            </>
          )}

          {/* Center lines */}
          <ReferenceLine x={50} stroke="#9CA3AF" strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="#9CA3AF" strokeDasharray="3 3" />

          <XAxis
            type="number"
            dataKey="x"
            name="Effort"
            domain={[0, 100]}
            label={{ value: 'Effort', position: 'bottom', offset: 20 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Impact"
            domain={[0, 100]}
            label={{ value: 'Impact', angle: -90, position: 'left', offset: 10 }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={chartData} fill={CHART_COLORS.primary[0]}>
            {chartData.map((item, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  item.category && DECISION_COLORS[item.category as ActionType]
                    ? DECISION_COLORS[item.category as ActionType]
                    : getQuadrantColor(item.quadrant)
                }
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      {showQuadrants && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {['Quick Wins', 'Major Projects', 'Fill-Ins', 'Time Sinks'].map(quadrant => (
            <div key={quadrant} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getQuadrantColor(quadrant) }}
              />
              <span className="text-xs text-gray-600">{quadrant}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Priority list component (alternative to matrix)
 */
export const PriorityList: React.FC<{
  data: PriorityMatrixItem[];
  title?: string;
  maxItems?: number;
}> = ({ data, title, maxItems = 10 }) => {
  // Sort by quick wins first (high impact, low effort)
  const sorted = [...data].sort((a, b) => {
    const scoreA = a.impact - a.effort;
    const scoreB = b.impact - b.effort;
    return scoreB - scoreA;
  }).slice(0, maxItems);

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
      )}
      <div className="space-y-2">
        {sorted.map((item, index) => {
          const quadrant = getQuadrant(item.impact, item.effort);
          const color = getQuadrantColor(quadrant);

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
            >
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: color }}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">
                  Impact: {item.impact}% | Effort: {item.effort}%
                </p>
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  backgroundColor: color + '20',
                  color: color
                }}
              >
                {quadrant}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriorityMatrix;
