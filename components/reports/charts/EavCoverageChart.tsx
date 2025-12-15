/**
 * EavCoverageChart
 *
 * Bar chart for displaying EAV category coverage
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChartData, CHART_COLORS } from '../../../types/reports';

interface EavCoverageChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  horizontal?: boolean;
  showValues?: boolean;
}

export const EavCoverageChart: React.FC<EavCoverageChartProps> = ({
  data,
  title,
  height = 300,
  horizontal = false,
  showValues = true
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Count: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (!showValues) return null;

    if (horizontal) {
      return (
        <text
          x={x + width + 5}
          y={y + height / 2}
          fill="#374151"
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={12}
        >
          {value}
        </text>
      );
    }

    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#374151"
        textAnchor="middle"
        fontSize={12}
      >
        {value}
      </text>
    );
  };

  if (horizontal) {
    return (
      <div className="w-full">
        {title && (
          <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              label={renderCustomBarLabel}
              radius={[0, 4, 4, 0]}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
            tick={{ fontSize: 11 }}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            label={renderCustomBarLabel}
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EavCoverageChart;
