/**
 * TopicPieChart
 *
 * Pie/donut chart for displaying topic distribution (core vs outer)
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChartData, CHART_COLORS } from '../../../types/reports';

interface TopicPieChartProps {
  data: PieChartData[];
  title?: string;
  showLegend?: boolean;
  showPercentage?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
}

export const TopicPieChart: React.FC<TopicPieChartProps> = ({
  data,
  title,
  showLegend = true,
  showPercentage = true,
  innerRadius = 60,
  outerRadius = 80,
  height = 250
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name
  }: any) => {
    if (!showPercentage) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            {item.value} topics ({item.percentage || Math.round((item.value / total) * 100)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-2 text-center">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-sm text-gray-600">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {/* Center label for donut chart */}
      {innerRadius > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicPieChart;
