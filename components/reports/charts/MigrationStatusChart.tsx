/**
 * MigrationStatusChart
 *
 * Charts for displaying migration decision and status distributions
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { PieChartData, DECISION_COLORS, STATUS_COLORS, getBusinessTerm } from '../../../types/reports';
import { ActionType, TransitionStatus } from '../../../types';

interface MigrationStatusChartProps {
  data: PieChartData[];
  title?: string;
  variant?: 'pie' | 'bar' | 'stacked';
  height?: number;
  showLegend?: boolean;
}

export const MigrationStatusChart: React.FC<MigrationStatusChartProps> = ({
  data,
  title,
  variant = 'pie',
  height = 250,
  showLegend = true
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            {item.value} pages ({item.percentage || Math.round((item.value / total) * 100)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (variant === 'bar') {
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
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
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
        <h4 className="text-sm font-medium text-gray-700 mb-2 text-center">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Decision summary cards
 */
interface DecisionSummaryProps {
  summary: {
    keep: number;
    rewrite: number;
    merge: number;
    redirect: number;
    prune: number;
    canonicalize: number;
  };
}

export const DecisionSummary: React.FC<DecisionSummaryProps> = ({ summary }) => {
  const allItems: { key: ActionType; label: string; count: number }[] = [
    { key: 'KEEP', label: getBusinessTerm('KEEP'), count: summary.keep },
    { key: 'REWRITE', label: getBusinessTerm('REWRITE'), count: summary.rewrite },
    { key: 'MERGE', label: getBusinessTerm('MERGE'), count: summary.merge },
    { key: 'REDIRECT_301', label: getBusinessTerm('REDIRECT_301'), count: summary.redirect },
    { key: 'PRUNE_410', label: getBusinessTerm('PRUNE_410'), count: summary.prune },
    { key: 'CANONICALIZE', label: getBusinessTerm('CANONICALIZE'), count: summary.canonicalize }
  ];
  const items = allItems.filter(item => item.count > 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(item => (
        <div
          key={item.key}
          className="p-3 rounded-lg border"
          style={{ borderColor: DECISION_COLORS[item.key] + '40', backgroundColor: DECISION_COLORS[item.key] + '10' }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: DECISION_COLORS[item.key] }}
          >
            {item.count}
          </div>
          <div className="text-xs text-gray-600 mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

/**
 * Status badge component
 */
export const StatusBadge: React.FC<{ status: TransitionStatus }> = ({ status }) => {
  const color = STATUS_COLORS[status];
  const label = getBusinessTerm(status);

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: color + '20',
        color: color
      }}
    >
      {label}
    </span>
  );
};

/**
 * Action badge component
 */
export const ActionBadge: React.FC<{ action: ActionType }> = ({ action }) => {
  const color = DECISION_COLORS[action];
  const label = getBusinessTerm(action);

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: color + '20',
        color: color
      }}
    >
      {label}
    </span>
  );
};

export default MigrationStatusChart;
